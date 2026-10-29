/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Milestone-based orchestration loop.
 * Replaces the legacy mainLoop with a cleaner milestone-driven lifecycle.
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { MilestoneState, VModelError, type MilestoneFile, type SubAgentReview } from "./types";
import { config } from "./config";
import {
  readPRD,
  getActiveMilestone,
  setMilestoneStatus,
  getPRDPath,
} from "./prd";
import {
  createMilestoneFile,
  readMilestoneFile,
  getMilestoneState,
  setMilestoneState,
  setPendingTransition,
  setMilestoneProgress,
  getMilestoneFilePath,
  updateSection,
} from "./milestone";
import {
  getNextMilestoneState,
  shouldRunReview,
  shouldPauseForHIL,
  isTerminalState,
  isLastMilestone,
} from "./milestone-state-machine";
import { ensureSuccessfulAIExit, runAIWithPrompt, runReview } from "./ai-provider";
import { runPRDReview, writePRDReviewFindings } from "./prd-review";
import { runPRDFixPhase } from "./prd-fix-phase";
import { createInitialPRDReviewState, writePRDReviewState } from "./prd-review-state";
import { commitChanges, getChangedPaths } from "./checkpoint";
import { filterMilestoneContext } from "./prompts/milestone-context";
import { loadDeliverySummaries, cacheDeliverySummary, formatDeliverySummariesForPrompt } from "./delivery-cache";
import { REVIEWER_TYPES, type ReviewerType } from "./constants";
import type { MilestonePromptVars } from "./prompts/types";
import { getReviewerPrompt } from "./prompts/states/review";
import { prdPhasePrompt } from "./prompts/states/prd-phase";
import { requirementsPhasePrompt } from "./prompts/states/requirements-phase";
import { designPhasePrompt } from "./prompts/states/design-phase";
import { implementationPhasePrompt } from "./prompts/states/implementation-phase";
import { unitTestPhasePrompt } from "./prompts/states/unit-test-phase";
import { integrationTestPhasePrompt } from "./prompts/states/integration-test-phase";
import { deliveryPhasePrompt } from "./prompts/states/delivery-phase";
import { logInfo, logSuccess, logWarning, logError, logDebug, logState, logPhase } from "./logger";

// ---------------------------------------------------------------------------
// Progress mapping
// ---------------------------------------------------------------------------

const STATE_PROGRESS: Partial<Record<MilestoneState, number>> = {
  [MilestoneState.REQUIREMENTS]: 10,
  [MilestoneState.DESIGN]: 25,
  [MilestoneState.IMPLEMENTATION]: 50,
  [MilestoneState.UNIT_TEST]: 70,
  [MilestoneState.INTEGRATION_TEST]: 85,
  [MilestoneState.DELIVERY]: 95,
  [MilestoneState.COMPLETE]: 100,
};

export const MAX_AUTONOMOUS_REVIEW_RETRIES = 3;

const DEFAULT_PHASE_SECTION_CONTENT = {
  requirements: "*(To be filled during REQUIREMENTS phase)*",
  design: "*(To be filled during DESIGN phase)*",
  testSpecifications: "*(NL test cases written during DESIGN)*",
  implementationNotes: "*(To be filled during IMPLEMENTATION phase)*",
  unitTestResults: "*(To be filled during UNIT_TEST phase)*",
  integrationTestResults: "*(To be filled during INTEGRATION_TEST phase)*",
  delivery: "*(Local branch/commit summary, deliverables, and caveats — to be filled during DELIVERY phase)*",
} as const;

function isDefaultSectionContent(value: string, placeholder: string): boolean {
  return value.trim() === placeholder;
}

export function getMissingPhaseArtifacts(
  phaseState: MilestoneState,
  milestone: MilestoneFile,
): string[] {
  switch (phaseState) {
    case MilestoneState.REQUIREMENTS:
      return isDefaultSectionContent(milestone.requirements, DEFAULT_PHASE_SECTION_CONTENT.requirements)
        ? ["Requirements"]
        : [];
    case MilestoneState.DESIGN: {
      const missing: string[] = [];
      if (isDefaultSectionContent(milestone.design, DEFAULT_PHASE_SECTION_CONTENT.design)) {
        missing.push("Design");
      }
      if (isDefaultSectionContent(milestone.testSpecifications, DEFAULT_PHASE_SECTION_CONTENT.testSpecifications)) {
        missing.push("Test Specifications");
      }
      return missing;
    }
    case MilestoneState.IMPLEMENTATION:
      return isDefaultSectionContent(milestone.implementationNotes, DEFAULT_PHASE_SECTION_CONTENT.implementationNotes)
        ? ["Implementation Notes"]
        : [];
    case MilestoneState.UNIT_TEST:
      return isDefaultSectionContent(milestone.unitTestResults, DEFAULT_PHASE_SECTION_CONTENT.unitTestResults)
        ? ["Unit Test Results"]
        : [];
    case MilestoneState.INTEGRATION_TEST:
      return isDefaultSectionContent(milestone.integrationTestResults, DEFAULT_PHASE_SECTION_CONTENT.integrationTestResults)
        ? ["Integration Test Results"]
        : [];
    case MilestoneState.DELIVERY:
      return isDefaultSectionContent(milestone.delivery, DEFAULT_PHASE_SECTION_CONTENT.delivery)
        ? ["Delivery"]
        : [];
    default:
      return [];
  }
}

async function ensurePhaseArtifactsPresent(
  phaseState: MilestoneState,
  milestone: MilestoneFile,
  milestonePath: string,
): Promise<void> {
  const missingArtifacts = getMissingPhaseArtifacts(phaseState, milestone);
  if (missingArtifacts.length === 0) {
    return;
  }

  // Safety net: autonomous agents sometimes do the real work but forget the
  // milestone-doc bookkeeping. If there ARE file changes this phase, auto-fill the
  // missing section(s) with a stub referencing the changed files and continue — so
  // the work gets committed and state advances. Only hard-fail on a true no-op
  // (zero changes AND missing sections), which genuinely advanced nothing.
  const changedPaths = (await getChangedPaths(config.projectDir))
    .map((p) => p.replace(/\\/g, "/"))
    .filter((p) => !p.startsWith("vibe-model/"));

  if (changedPaths.length === 0) {
    throw new VModelError(
      `AI ${phaseState} phase did no work and did not update required milestone sections: ${missingArtifacts.join(", ")}. No orchestrator state was advanced.`,
    );
  }

  logWarning(
    `AI ${phaseState} phase changed ${changedPaths.length} file(s) but did not update required section(s): ${missingArtifacts.join(", ")}. Auto-filling so the work is not discarded.`,
  );
  const shown = changedPaths.slice(0, 30).map((p) => `- ${p}`).join("\n");
  const more = changedPaths.length > 30 ? `\n- ... (${changedPaths.length - 30} more)` : "";
  const stub = `*(Auto-filled by orchestrator — the AI completed this phase but did not write this section. Changed files this phase:)*\n${shown}${more}`;
  for (const section of missingArtifacts) {
    await updateSection(milestonePath, section, stub);
  }
}

/**
 * Decide how autonomous mode should recover when phase reviews keep failing.
 *
 * Prefer the AI-written file state when it already moved forward. Otherwise,
 * advance one lifecycle step programmatically so autonomous runs cannot get
 * trapped retrying the same phase forever.
 */
export function getAutonomousReviewFailureRecoveryState(
  phaseState: MilestoneState,
  resultingState: MilestoneState,
): MilestoneState {
  if (resultingState !== phaseState) {
    return resultingState;
  }

  return getNextMilestoneState(phaseState) ?? resultingState;
}

// ---------------------------------------------------------------------------
// Prompt generation
// ---------------------------------------------------------------------------

/**
 * Generate the appropriate prompt for the current milestone state.
 *
 * Writes the prompt to a temp file and returns the path.
 */
async function generatePrompt(
  state: MilestoneState,
  milestonePath: string,
  projectDir: string,
  prdContent?: string,
): Promise<string> {
  const milestoneContent = await fs.readFile(milestonePath, "utf-8");
  const filtered = filterMilestoneContext(milestoneContent, state);

  const milestone = await readMilestoneFile(milestonePath);

  const vars: MilestonePromptVars = {
    AI_PROVIDER: config.aiProvider,
    MILESTONE_FILE: milestonePath,
    MILESTONE_NAME: milestone.name,
    MILESTONE_ID: milestone.id,
    MILESTONE_CONTENT: filtered,
    PRD_CONTENT: prdContent,
  };

  // Add PRD file path for PRD phase so AI knows where to write
  if (state === MilestoneState.PRD) {
    vars.PRD_FILE_PATH = getPRDPath(projectDir);
  }

  // Add milestone-specific context (NOT for PRD phase)
  if (state !== MilestoneState.PRD) {
    const prd = await readPRD(projectDir);
    const summaries = await loadDeliverySummaries(projectDir, milestone.id);

    const previousSummariesText = formatDeliverySummariesForPrompt(summaries);
    vars.PRD_CONTEXT =
      `## Original Goal\n${prd.goal}\n\n## Tech Stack\n${prd.techStack}\n\n## Architecture Overview\n${prd.architectureOverview}` +
      (previousSummariesText
        ? `\n\n## Previous Milestones (deliverables & learnings — build on these, do not redo them)\n${previousSummariesText}`
        : "");
    vars.MILESTONE_DEPENDENCIES = {
      previous: summaries.map(s => `Milestone ${s.milestoneId}: ${s.milestoneName}`),
      next: prd.milestones.filter(m => m.id > milestone.id).map(m => `Milestone ${m.id}: ${m.name}`)
    };
    vars.MILESTONE_POSITION = {
      current: milestone.id,
      total: prd.milestones.length,
      isLast: milestone.id === prd.milestones.length
    };
  }

  let prompt: string;

  switch (state) {
    case MilestoneState.PRD:
      prompt = prdPhasePrompt(vars);
      break;
    case MilestoneState.REQUIREMENTS:
      prompt = requirementsPhasePrompt(vars);
      break;
    case MilestoneState.DESIGN:
      prompt = designPhasePrompt(vars);
      break;
    case MilestoneState.IMPLEMENTATION:
      prompt = implementationPhasePrompt(vars);
      break;
    case MilestoneState.UNIT_TEST:
      prompt = unitTestPhasePrompt(vars);
      break;
    case MilestoneState.INTEGRATION_TEST:
      prompt = integrationTestPhasePrompt(vars);
      break;
    case MilestoneState.DELIVERY:
      prompt = deliveryPhasePrompt(vars);
      break;
    default:
      logWarning(`No prompt defined for state ${state}, using REQUIREMENTS`);
      prompt = requirementsPhasePrompt(vars);
      break;
  }

  // Write to temp file (same pattern as main-loop.ts)
  const tempPrompt = path.join(
    os.tmpdir(),
    `vibe-model-milestone-${Date.now()}.md`,
  );

  await fs.writeFile(
    tempPrompt,
    `${prompt}\n\nCurrent working directory: ${projectDir}\n`,
  );

  if (config.verbose) {
    logDebug("--- Milestone prompt ---");
    process.stderr.write(await fs.readFile(tempPrompt, "utf-8"));
    logDebug("--- End of prompt ---");
  }

  return tempPrompt;
}

// ---------------------------------------------------------------------------
// Review sub-phase
// ---------------------------------------------------------------------------

/**
 * Run sequential specialist reviews over the current milestone content.
 *
 * Stops at the first FAIL and returns the aggregated results.
 */
export async function handleReviewSubPhase(
  state: MilestoneState,
  milestonePath: string,
): Promise<SubAgentReview> {
  const milestone = await readMilestoneFile(milestonePath);
  const milestoneContent = await fs.readFile(milestonePath, "utf-8");
  const filtered = filterMilestoneContext(milestoneContent, state);

  const results: SubAgentReview["results"] = [];

  for (const reviewerType of REVIEWER_TYPES as readonly ReviewerType[]) {
    logInfo(`Running ${reviewerType} review...`);

    const vars = {
      AI_PROVIDER: config.aiProvider,
      MILESTONE_FILE: milestonePath,
      MILESTONE_NAME: milestone.name,
      MILESTONE_ID: milestone.id,
      MILESTONE_CONTENT: filtered,
      REVIEWER_TYPE: reviewerType,
    };

    const prompt = getReviewerPrompt(vars);

    const result = await runReview(reviewerType, prompt);
    results.push(result);

    if (!result.pass) {
      logWarning(`${reviewerType} review FAILED — stopping reviews early`);
      break;
    }

    logSuccess(`${reviewerType} review PASSED`);
  }

  const overallPass = results.every((r) => r.pass);

  return { results, overallPass };
}

// ---------------------------------------------------------------------------
// State loop (shared by milestoneLoop and continueMilestone)
// ---------------------------------------------------------------------------

/**
 * Run the state loop starting from the current state of the milestone file.
 *
 * The loop advances through milestone states until it either:
 * - Reaches WAITING_FOR_USER (HIL pause)
 * - Reaches COMPLETE
 * - Encounters a review failure
 */
async function runStateLoop(
  prdPath: string,
  milestonePath: string,
  prdContent: string,
  modeOverride?: string | null,
): Promise<void> {
  let currentState = await getMilestoneState(milestonePath);
  const reviewFailureCounts = new Map<MilestoneState, number>();

  // Loop until we hit a terminal state, WAITING_FOR_USER, or a review failure.
  while (!isTerminalState(currentState)) {
    logState(`Milestone state: ${currentState}`);

    // 1. WAITING_FOR_USER — should not normally be hit here (continueMilestone
    //    resolves the pending transition before entering), but guard anyway.
    if (currentState === MilestoneState.WAITING_FOR_USER) {
      logInfo("Milestone is WAITING_FOR_USER. Resume with `continue`.");
      return;
    }

    // 2. Generate prompt, run AI, and validate — with phase-level retry for
    //    compliance misses (AI exits clean but produces no required artifact).
    const phaseState = currentState;
    const MAX_PHASE_ATTEMPTS = 3;
    let phaseAttempt = 0;
    for (;;) {
      logPhase(`Running ${currentState} phase...`);
      const tempPrompt = await generatePrompt(
        currentState,
        milestonePath,
        config.projectDir,
        prdContent,
      );

      try {
        const exitCode = await runAIWithPrompt(tempPrompt);

        // Re-raise SIGINT
        if (exitCode === 130) {
          process.exit(130);
        }

        ensureSuccessfulAIExit(exitCode, `${currentState} phase`);
      } finally {
        try {
          await fs.unlink(tempPrompt);
        } catch {
          // Temp file cleanup failed, ignore
        }
      }

      // 3. Validate required milestone artifacts before any orchestrator state changes.
      const milestoneAfterPhase = await readMilestoneFile(milestonePath);
      try {
        await ensurePhaseArtifactsPresent(phaseState, milestoneAfterPhase, milestonePath);
        break; // phase produced its required artifact(s)
      } catch (error) {
        phaseAttempt++;
        if (phaseAttempt >= MAX_PHASE_ATTEMPTS || !(error instanceof VModelError)) {
          throw error;
        }
        logWarning(
          `${currentState} phase produced no required artifact (attempt ${phaseAttempt}/${MAX_PHASE_ATTEMPTS}); re-running the phase...`,
        );
      }
    }

    // 4. Auto-commit after each successful state
    await commitChanges(
      `milestone(${phaseState.toLowerCase()}): AI completed ${phaseState} phase`,
    );

    // 5. Re-read state (the AI may have updated it directly)
    const resultingState = await getMilestoneState(milestonePath);

    // If the AI already advanced to a terminal/WAITING state, respect it.
    if (
      isTerminalState(resultingState) ||
      resultingState === MilestoneState.WAITING_FOR_USER
    ) {
      currentState = resultingState;
      break;
    }

    // 6. Run review sub-phase if enabled.
    // Review the phase that just completed, not whatever state the AI may have moved to.
    if (shouldRunReview(config)) {
      logInfo("Running review sub-phase...");
      const reviewResult = await handleReviewSubPhase(
        phaseState,
        milestonePath,
      );

      if (!reviewResult.overallPass) {
        logWarning(
          "Review failed — recording findings and pausing for HIL review",
        );

        // Record findings as a learning
        const failedReviewers = reviewResult.results
          .filter((r) => !r.pass)
          .map((r) => `${r.reviewer}: ${r.findings.join("; ")}`)
          .join(" | ");

        const { addLearning } = await import("./milestone");
        await addLearning(
          milestonePath,
          `Review failed during ${phaseState}: ${failedReviewers}`,
        );

        // If HIL active, pause for user to review; otherwise just continue
        if (shouldPauseForHIL(config, modeOverride)) {
          const nextState = getNextMilestoneState(phaseState);
          if (nextState) {
            await setPendingTransition(milestonePath, nextState);
          }
          await setMilestoneState(milestonePath, MilestoneState.WAITING_FOR_USER);
          logWarning(
            "Review failed — milestone paused in WAITING_FOR_USER. " +
              "Review findings and run `continue` when ready.",
          );
          return;
        }

        const failureCount = (reviewFailureCounts.get(phaseState) ?? 0) + 1;
        reviewFailureCounts.set(phaseState, failureCount);

        if (failureCount < MAX_AUTONOMOUS_REVIEW_RETRIES) {
          logWarning(
            `Autonomous mode retrying ${phaseState} after review failure ` +
              `(${failureCount}/${MAX_AUTONOMOUS_REVIEW_RETRIES - 1} retries used).`,
          );
          currentState = phaseState;
          continue;
        }

        const recoveryState = getAutonomousReviewFailureRecoveryState(
          phaseState,
          resultingState,
        );
        logWarning(
          `Review failed ${failureCount} time(s) in ${phaseState}. ` +
            `Autonomous mode proceeding with latest artifact at ${recoveryState}.`,
        );
        reviewFailureCounts.delete(phaseState);
        await setPendingTransition(milestonePath, null);

        if (recoveryState !== resultingState) {
          await setMilestoneState(milestonePath, recoveryState);
          const recoveryProgress = STATE_PROGRESS[recoveryState];
          if (recoveryProgress !== undefined) {
            await setMilestoneProgress(milestonePath, recoveryProgress);
          }
        }

        currentState = recoveryState;
        continue;
      }

      reviewFailureCounts.delete(phaseState);
      logSuccess("All reviews passed");
    }

    // 7. Determine the next state for this phase.
    const nextState = getNextMilestoneState(phaseState);

    // DELIVERY is the final actionable phase. If the AI left the milestone in
    // DELIVERY, finalize it to COMPLETE programmatically.
    if (nextState === null) {
      if (phaseState === MilestoneState.DELIVERY && resultingState === MilestoneState.DELIVERY) {
        await setMilestoneState(milestonePath, MilestoneState.COMPLETE);
        await setMilestoneProgress(milestonePath, STATE_PROGRESS[MilestoneState.COMPLETE] ?? 100);
        logSuccess(`State advanced: ${phaseState} -> ${MilestoneState.COMPLETE}`);
        currentState = MilestoneState.COMPLETE;
        break;
      }

      currentState = resultingState;
      break;
    }

    // 8. If the AI already advanced exactly one phase, respect it and continue
    // without double-advancing.
    if (resultingState === nextState) {
      const progress = STATE_PROGRESS[nextState];
      if (progress !== undefined) {
        await setMilestoneProgress(milestonePath, progress);
      }

      logSuccess(`AI advanced state: ${phaseState} -> ${nextState}`);
      currentState = nextState;
      continue;
    }

    // If the AI changed the state unexpectedly, trust the file and continue from it.
    if (resultingState !== phaseState) {
      logWarning(
        `AI changed state unexpectedly: ${phaseState} -> ${resultingState}. Continuing from file state.`,
      );
      currentState = resultingState;
      continue;
    }

    // 9. HIL pause check
    if (shouldPauseForHIL(config, modeOverride)) {
      await setPendingTransition(milestonePath, nextState);
      await setMilestoneState(milestonePath, MilestoneState.WAITING_FOR_USER);
      logInfo(
        `HIL pause — milestone paused before ${nextState}. ` +
          `Run \`continue\` to resume.`,
      );
      return;
    }

    // 9. Advance and update progress
    await setMilestoneState(milestonePath, nextState);
    const progress = STATE_PROGRESS[nextState];
    if (progress !== undefined) {
      await setMilestoneProgress(milestonePath, progress);
    }

    logSuccess(`State advanced: ${phaseState} -> ${nextState}`);

    currentState = nextState;
  }
}

// ---------------------------------------------------------------------------
// PRD Review Loop
// ---------------------------------------------------------------------------

/**
 * Run PRD review loop after PRD generation.
 * Max 5 iterations of author-reviewer arm-wrestle before deferring to human.
 */
async function runPRDReviewLoop(
  prdPath: string,
  projectDir: string,
  _originalMilestoneCount: number
): Promise<void> {
  logInfo("Starting PRD review loop...");

  // Initialize review state
  const reviewState = await createInitialPRDReviewState(projectDir);

  while (reviewState.iteration < reviewState.maxIterations &&
         reviewState.overallStatus === "pending") {

    logInfo(`PRD review iteration ${reviewState.iteration + 1}...`);

    // Run review
    const review = await runPRDReview(
      projectDir,
      reviewState.iteration + 1
    );

    // Write findings
    await writePRDReviewFindings(projectDir, review);

    // Update state
    reviewState.iteration = review.iteration;
    reviewState.reviewResults = review.results;

    if (review.overallApproved) {
      reviewState.overallStatus = "approved";
      await writePRDReviewState(projectDir, reviewState);
      logSuccess("PRD review approved! Advancing to Milestone 1.");
      break;
    }

    // Check if we should defer to human
    if (reviewState.iteration >= reviewState.maxIterations) {
      reviewState.overallStatus = "deferred";
      await writePRDReviewState(projectDir, reviewState);
      logWarning("PRD review reached max iterations. Deferring to human review.");

      if (!config.autonomous) {
        logInfo("Please review prd-review.md and run 'continue' when ready.");
        return;
      }

      // Autonomous mode: proceed anyway with a warning
      if (!config.autonomous) {
        logInfo("Please review prd-review.md and run 'continue' when ready.");
        return;
      }

      logWarning("Max iterations reached in autonomous mode. Proceeding with current PRD.");
      break;
    }

    // Run fix phase
    await runPRDFixPhase(projectDir, reviewState.iteration + 1);

    // Commit the fixes
    await commitChanges(
      `milestone(prd): PRD fix iteration ${reviewState.iteration + 1}`
    );

    // Update state for next iteration
    reviewState.iteration++;
    await writePRDReviewState(projectDir, reviewState);
  }

  // Clean up review state file after approval
  try {
    const statePath = path.join(projectDir, "vibe-model", "prd-review-state.json");
    await fs.unlink(statePath);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Milestone completion handler (shared by milestoneLoop and continueMilestone)
// ---------------------------------------------------------------------------

/**
 * After the state loop finishes, check milestone state and handle completion.
 * Caches delivery summary after DELIVERY phase and recurses to next milestone.
 */
async function handleMilestoneCompletion(
  projectDir: string,
  prdPath: string,
  activeMilestone: { id: number; name: string; modeOverride?: string | null },
  milestonePath: string,
): Promise<void> {
  const finalState = await getMilestoneState(milestonePath);

  // Cache delivery summary after DELIVERY phase (even if not COMPLETE yet)
  if (finalState === MilestoneState.DELIVERY || finalState === MilestoneState.COMPLETE) {
    try {
      await cacheDeliverySummary(projectDir, activeMilestone.id, activeMilestone.name);
      logInfo(`Delivery summary cached for milestone #${activeMilestone.id}`);
    } catch (err) {
      logWarning(`Failed to cache delivery summary: ${err}`);
    }
  }

  if (!isTerminalState(finalState)) {
    // Not COMPLETE — state loop paused (HIL) or stopped after a successful phase.
    await setMilestoneStatus(projectDir, activeMilestone.id, "IN_PROGRESS");
    logInfo(`Milestone #${activeMilestone.id} ended at ${finalState}`);
    return;
  }

  logSuccess(`Milestone #${activeMilestone.id} complete!`);

  await setMilestoneStatus(projectDir, activeMilestone.id, "COMPLETE");

  await commitChanges(
    `milestone(complete): milestone #${activeMilestone.id} — ${activeMilestone.name}`,
  );

  const updatedPrd = await readPRD(projectDir);
  if (isLastMilestone(updatedPrd)) {
    logSuccess("All milestones complete — project done!");
    return;
  }

  logInfo("Advancing to next milestone...");
  await milestoneLoop(prdPath);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main milestone loop entry point.
 *
 * Reads the PRD, finds the active milestone, and runs the state loop until
 * the milestone completes or the loop pauses (WAITING_FOR_USER).
 *
 * When a milestone completes, it updates the PRD and commits, then checks
 * for the next milestone. If all milestones are complete, it exits.
 */
export async function milestoneLoop(prdPath: string): Promise<void> {
  const projectDir = config.projectDir;
  let prdContent = await fs.readFile(prdPath, "utf-8");
  let prd = await readPRD(projectDir);

  // If the PRD has no milestones yet, run the PRD phase first.
  // This happens on fresh projects where createPRD() wrote an empty template.
  const initialMilestoneCount = prd.milestones.length;
  if (initialMilestoneCount === 0) {
    logInfo("PRD has no milestones — running PRD phase to generate them...");

    // Create a temporary milestone file for the PRD phase prompt context.
    const prdMilestonePath = createMilestoneFile(
      projectDir,
      0, // sentinel ID for PRD phase
      "prd-generation",
    );
    await setMilestoneState(prdMilestonePath, MilestoneState.PRD);

    // Generate and run the PRD phase prompt (single AI call)
    const tempPrompt = await generatePrompt(
      MilestoneState.PRD,
      prdMilestonePath,
      projectDir,
      prdContent,
    );

    try {
      const exitCode = await runAIWithPrompt(tempPrompt);
      if (exitCode === 130) {
        process.exit(130);
      }
      ensureSuccessfulAIExit(exitCode, "PRD phase");
    } finally {
      try {
        await fs.unlink(tempPrompt);
      } catch {
        // Temp file cleanup failed, ignore
      }
    }

    // Clean up the temporary PRD milestone file
    try {
      await fs.unlink(prdMilestonePath);
    } catch {
      // ignore
    }

    // Re-read the PRD (AI should have filled in milestones) before committing.
    prdContent = await fs.readFile(prdPath, "utf-8");
    prd = await readPRD(projectDir);

    if (prd.milestones.length === 0) {
      throw new VModelError("AI PRD phase did not generate any milestones. No orchestrator state was advanced.");
    }

    // Commit the PRD changes
    await commitChanges("milestone(prd): PRD generated with milestones");

    logSuccess(`PRD generated with ${prd.milestones.length} milestone(s)`);

    // Run PRD review loop (only if PRD was just generated)
    if (initialMilestoneCount === 0 && prd.milestones.length > 0) {
      await runPRDReviewLoop(prdPath, projectDir, 0);
    }
  }

  const activeMilestone = getActiveMilestone(prd);

  if (!activeMilestone) {
    logSuccess("All milestones complete!");
    return;
  }

  logInfo(
    `Active milestone: #${activeMilestone.id} — ${activeMilestone.name}`,
  );

  // Create or get milestone file
  const milestonePath = getMilestoneFilePath(
    projectDir,
    activeMilestone.id,
    activeMilestone.name,
  );

  // Ensure the milestone file exists
  try {
    await fs.access(milestonePath);
  } catch {
    logInfo(`Creating milestone file: ${path.basename(milestonePath)}`);
    createMilestoneFile(projectDir, activeMilestone.id, activeMilestone.name);

    // For the first milestone, start at PRD state so the AI generates the PRD
    // content and milestone files. Otherwise start at REQUIREMENTS.
    if (activeMilestone.id === 1 && prd.milestones.length === 0) {
      await setMilestoneState(milestonePath, MilestoneState.PRD);
    }
  }

  // Get mode override for this milestone
  const modeOverride = activeMilestone.modeOverride;

  // Run the state loop
  await runStateLoop(prdPath, milestonePath, prdContent, modeOverride);

  // After the state loop, cache delivery summary and handle completion
  await handleMilestoneCompletion(projectDir, prdPath, activeMilestone, milestonePath);
}

/**
 * Resume a milestone from WAITING_FOR_USER.
 *
 * Reads the pending transition, applies it, and re-enters the state loop.
 */
export async function continueMilestone(prdPath: string): Promise<void> {
  const projectDir = config.projectDir;
  const prdContent = await fs.readFile(prdPath, "utf-8");
  const prd = await readPRD(projectDir);
  const activeMilestone = getActiveMilestone(prd);

  if (!activeMilestone) {
    logSuccess("All milestones complete — nothing to continue.");
    return;
  }

  const milestonePath = getMilestoneFilePath(
    projectDir,
    activeMilestone.id,
    activeMilestone.name,
  );

  // Read current state — should be WAITING_FOR_USER
  const currentState = await getMilestoneState(milestonePath);
  if (currentState !== MilestoneState.WAITING_FOR_USER) {
    logWarning(
      `Milestone is not in WAITING_FOR_USER (current: ${currentState}). ` +
        `Use the normal loop to proceed.`,
    );
    return;
  }

  // Read the milestone file to get pendingTransition
  const milestone = await readMilestoneFile(milestonePath);
  if (!milestone.pendingTransition) {
    logError("No pending transition recorded — cannot continue.");
    return;
  }

  logInfo(
    `Resuming milestone #${activeMilestone.id} -> ${milestone.pendingTransition}`,
  );

  // Apply the pending transition and clear it
  await setMilestoneState(milestonePath, milestone.pendingTransition);
  await setPendingTransition(milestonePath, MilestoneState.WAITING_FOR_USER); // Sentinel clear

  // Re-write the Pending Transition line to NONE
  const content = await fs.readFile(milestonePath, "utf-8");
  const updated = content.replace(
    /^- Pending Transition: .*$/m,
    "- Pending Transition: NONE",
  );
  await fs.writeFile(milestonePath, updated);

  // Get mode override
  const modeOverride = activeMilestone.modeOverride;

  // Run the state loop from the new state
  await runStateLoop(prdPath, milestonePath, prdContent, modeOverride);

  // After the state loop, cache delivery summary and handle completion
  await handleMilestoneCompletion(projectDir, prdPath, activeMilestone, milestonePath);
}

