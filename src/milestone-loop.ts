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
import { MilestoneState } from "./types";
import type { SubAgentReview, MilestoneFile } from "./types";
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
} from "./milestone";
import {
  getNextMilestoneState,
  shouldRunReview,
  shouldPauseForHIL,
  isTerminalState,
  isLastMilestone,
} from "./milestone-state-machine";
import { runAIWithPrompt, runReview } from "./ai-provider";
import { commitChanges } from "./checkpoint";
import { filterMilestoneContext } from "./prompts/milestone-context";
import { REVIEWER_TYPES } from "./constants";
import type { ReviewerType } from "./constants";
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

  // Loop until we hit a terminal state, WAITING_FOR_USER, or a review failure.
  while (!isTerminalState(currentState)) {
    logState(`Milestone state: ${currentState}`);

    // 1. WAITING_FOR_USER — should not normally be hit here (continueMilestone
    //    resolves the pending transition before entering), but guard anyway.
    if (currentState === MilestoneState.WAITING_FOR_USER) {
      logInfo("Milestone is WAITING_FOR_USER. Resume with `continue`.");
      return;
    }

    // 2. Generate prompt and run AI
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
    } finally {
      try {
        await fs.unlink(tempPrompt);
      } catch {
        // Temp file cleanup failed, ignore
      }
    }

    // 3. Auto-commit after each state
    await commitChanges(
      `milestone(${currentState.toLowerCase()}): AI completed ${currentState} phase`,
    );

    // 4. Re-read state (the AI may have updated it directly)
    currentState = await getMilestoneState(milestonePath);

    // If the AI already advanced to a terminal/WAITING state, respect it.
    if (
      isTerminalState(currentState) ||
      currentState === MilestoneState.WAITING_FOR_USER
    ) {
      break;
    }

    // 5. Run review sub-phase if enabled
    if (shouldRunReview(config)) {
      logInfo("Running review sub-phase...");
      const reviewResult = await handleReviewSubPhase(
        currentState,
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

        const milestone = await readMilestoneFile(milestonePath);
        const { addLearning } = await import("./milestone");
        await addLearning(
          milestonePath,
          `Review failed during ${currentState}: ${failedReviewers}`,
        );

        // If HIL active, pause for user to review; otherwise just continue
        if (shouldPauseForHIL(config, modeOverride)) {
          const nextState = getNextMilestoneState(currentState);
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

        // Not in HIL mode — continue loop (AI should fix issues on next pass)
        continue;
      }

      logSuccess("All reviews passed");
    }

    // 6. Advance state
    const nextState = getNextMilestoneState(currentState);
    if (nextState === null) {
      // DELIVERY reached completion — let the AI's own transition handle it,
      // or break if the AI already set COMPLETE.
      break;
    }

    // 7. HIL pause check
    if (shouldPauseForHIL(config, modeOverride)) {
      await setPendingTransition(milestonePath, nextState);
      await setMilestoneState(milestonePath, MilestoneState.WAITING_FOR_USER);
      logInfo(
        `HIL pause — milestone paused before ${nextState}. ` +
          `Run \`continue\` to resume.`,
      );
      return;
    }

    // 8. Advance and update progress
    await setMilestoneState(milestonePath, nextState);
    const progress = STATE_PROGRESS[nextState];
    if (progress !== undefined) {
      await setMilestoneProgress(milestonePath, progress);
    }

    logSuccess(`State advanced: ${currentState} -> ${nextState}`);

    currentState = nextState;
  }
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
  if (prd.milestones.length === 0) {
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

    // Commit the PRD changes
    await commitChanges("milestone(prd): PRD generated with milestones");

    // Re-read the PRD (AI should have filled in milestones)
    prdContent = await fs.readFile(prdPath, "utf-8");
    prd = await readPRD(projectDir);

    if (prd.milestones.length === 0) {
      logError("PRD phase completed but no milestones were generated. Check prd.md.");
      return;
    }

    logSuccess(`PRD generated with ${prd.milestones.length} milestone(s)`);
  }

  const activeMilestone = getActiveMilestone(prd);

  if (!activeMilestone) {
    logSuccess("All milestones complete!");
    return;
  }

  // Mark the milestone as IN_PROGRESS in the PRD
  if (activeMilestone.status === "PENDING") {
    await setMilestoneStatus(projectDir, activeMilestone.id, "IN_PROGRESS");
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

  // After the state loop, check if the milestone is COMPLETE
  const finalState = await getMilestoneState(milestonePath);
  if (isTerminalState(finalState)) {
    logSuccess(`Milestone #${activeMilestone.id} complete!`);

    await commitChanges(
      `milestone(complete): milestone #${activeMilestone.id} — ${activeMilestone.name}`,
    );

    // Update PRD status
    await setMilestoneStatus(
      projectDir,
      activeMilestone.id,
      "COMPLETE",
    );

    // Check if there are more milestones
    const updatedPrd = await readPRD(projectDir);
    if (isLastMilestone(updatedPrd)) {
      logSuccess("All milestones complete — project done!");
      return;
    }

    // Recurse to start the next milestone
    logInfo("Advancing to next milestone...");
    await milestoneLoop(prdPath);
  }
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
  const { updateSection } = await import("./milestone");
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

  // After the state loop, check if the milestone is COMPLETE
  const finalState = await getMilestoneState(milestonePath);
  if (isTerminalState(finalState)) {
    logSuccess(`Milestone #${activeMilestone.id} complete!`);

    await commitChanges(
      `milestone(complete): milestone #${activeMilestone.id} — ${activeMilestone.name}`,
    );

    await setMilestoneStatus(projectDir, activeMilestone.id, "COMPLETE");

    const updatedPrd = await readPRD(projectDir);
    if (isLastMilestone(updatedPrd)) {
      logSuccess("All milestones complete — project done!");
      return;
    }

    logInfo("Advancing to next milestone...");
    await milestoneLoop(prdPath);
  }
}
