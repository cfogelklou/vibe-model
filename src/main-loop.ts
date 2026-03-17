/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Main V-Model iteration loop and state-specific handlers.
 * Handles the core iteration logic for each V-Model state.
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { VModelState, ExecutionMode } from "./types";
import { config } from "./config";
import {
  getJourneyState,
  getCurrentEpic,
  setJourneyState,
  getPreviousState,
  setPreviousState,
} from "./journey";
import { appendToFile } from "./file-utils";
import { logPhase, logState, logInfo, logSuccess, logWarning, logError, logDebug } from "./logger";
import { extractDesignContent, extractResearchContent } from "./design-spec";
import { mainIterationPrompt, type MainIterationVars } from "./prompts/index";
import { runAIWithPrompt, consultGemini } from "./ai-provider";
import {
  transitionToNextEpic,
  checkContinueToNextEpic,
  getPreviousDesignPhase,
  autoTransitionFromReview,
  getNextStateForMode,
} from "./state-machine";
import { commitChanges, pushChanges, hasUncommittedChanges, getCurrentBranch } from "./checkpoint";
import { getCompletedUnarchivedEpics, markEpicComplete } from "./epic-archival";

/**
 * Check if a state should be skipped in MVP mode
 */
function shouldSkipInMvp(state: VModelState): boolean {
  return [
    VModelState.DESIGN_REVIEW,
    VModelState.UNIT_TEST,
    VModelState.INTEGRATION_TEST,
    VModelState.ACCEPTANCE_TEST,
  ].includes(state);
}

/**
 * Generate iteration prompt for current state
 */
async function generateIterationPrompt(
  journeyFile: string,
  state: VModelState,
  epicFile?: string
): Promise<string> {
  const journeyContent = await fs.readFile(journeyFile, "utf-8");
  const journeyName = path.basename(journeyFile, ".journey.md");

  // Extract epic content if epic file exists
  let epicContent = "";
  let epicInstructions = "";

  if (epicFile) {
    try {
      epicContent = await fs.readFile(epicFile, "utf-8");
      epicInstructions = `
## Epic File Content (PRIMARY location for epic work)

The following is the FULL content of the epic file. This is where epic work happens:
---
${epicContent}
---

**CRITICAL**: When working on this epic, update the epic file directly:
- Story designs go in the epic file
- Epic research goes in the epic file
- Implementation progress goes in the epic file
- Only summaries go in journey.md
`;
    } catch {
      // Epic file doesn't exist yet
    }
  }

  // Load main iteration prompt template using type-safe system
  const vars: MainIterationVars = {
    AI_PROVIDER: config.aiProvider,
    JOURNEY_CONTENT: journeyContent,
    EPIC_CONTENT: epicContent || undefined,
    EPIC_FILE_INSTRUCTIONS: epicInstructions || undefined,
    JOURNEY_FILE: journeyFile,
    JOURNEY_NAME: journeyName,
  };

  const prompt = mainIterationPrompt(vars);

  return prompt;
}

/**
 * Run a single AI iteration
 */
export async function runIteration(journeyFile: string): Promise<number> {
  const journeyName = path.basename(journeyFile, ".journey.md");
  const state = await getJourneyState(journeyFile);

  logState(`Current state: ${state}`);
  logPhase(`Running iteration for ${journeyName}...`);

  // Dynamic epic file path for template injection (empty when not in epic phase)
  const currentEpic = await getCurrentEpic(journeyFile);
  let epicFile = "";

  if (
    currentEpic &&
    currentEpic !== "TBD" &&
    state !== VModelState.SYSTEM_DESIGN &&
    state !== VModelState.REQUIREMENTS
  ) {
    const journeyDir = path.dirname(journeyFile);
    const epicNum = currentEpic.replace(/\D/g, "");
    epicFile = path.join(journeyDir, `${journeyName}.journey.E${epicNum}.md`);

    // Only set epicFile if the epic file actually exists
    try {
      await fs.access(epicFile);
    } catch {
      logWarning(`Epic file not found: ${epicFile} - using main journey only`);
      epicFile = "";
    }
  }

  // Create temp file with prompt + journey context
  const prompt = await generateIterationPrompt(journeyFile, state, epicFile);
  const tempPrompt = path.join(os.tmpdir(), `vibe-model-iteration-${Date.now()}.md`);

  await fs.writeFile(
    tempPrompt,
    `${prompt}

Current working directory: ${process.cwd()}
`
  );

  if (config.verbose) {
    logDebug("--- Iteration prompt ---");
    process.stderr.write(await fs.readFile(tempPrompt, "utf-8"));
    logDebug("--- End of prompt ---");
  }

  try {
    // Run AI with the prompt
    const exitCode = await runAIWithPrompt(tempPrompt);

    // Re-raise SIGINT if user interrupted (exit code 130 = 128+SIGINT)
    if (exitCode === 130) {
      process.exit(130);
    }

    return exitCode;
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempPrompt);
    } catch {
      // Temp file cleanup failed, ignore
    }
  }
}

/**
 * Handle DESIGN_REVIEW state
 */
async function handleDesignReview(journeyFile: string): Promise<void> {
  if (!config.consultGemini) {
    // Skip consultation, proceed to next phase
    logInfo("Gemini consultation disabled - auto-approving design...");
    const prevPhase = await getPreviousDesignPhase(journeyFile);
    await autoTransitionFromReview(journeyFile, prevPhase);
    return;
  }

  logInfo("Running design review with Gemini consultation...");

  // Get the previous design phase
  let prevPhase = await getPreviousDesignPhase(journeyFile);

  if (prevPhase === "UNKNOWN") {
    logWarning("Could not determine previous phase - defaulting to REQUIREMENTS");
    prevPhase = "REQUIREMENTS";
  }

  logInfo(`Reviewing design from phase: ${prevPhase}`);

  // Extract BOTH design content AND research notes
  const designContent = await extractDesignContent(journeyFile, prevPhase as VModelState);
  const researchContent = await extractResearchContent(journeyFile, prevPhase as VModelState);

  // Consult Gemini with research context
  logInfo(`Consulting Gemini for ${prevPhase} phase review...`);

  // Determine where to write the review - prefer epic file if we have an active epic
  const currentEpic = await getCurrentEpic(journeyFile);
  const journeyDir = path.dirname(journeyFile);
  const journeyName = path.basename(journeyFile, ".journey.md");
  let reviewTargetFile = journeyFile;

  if (currentEpic && currentEpic !== "TBD") {
    const epicNum = currentEpic.replace(/\D/g, "");
    const epicFile = path.join(journeyDir, `${journeyName}.journey.E${epicNum}.md`);
    try {
      await fs.access(epicFile);
      reviewTargetFile = epicFile;
      logInfo(`Writing design review to epic file: ${epicFile}`);
    } catch {
      // Epic file doesn't exist, use journey file
    }
  }

  try {
    const geminiFeedback = await consultGemini(prevPhase, designContent, researchContent);

    // Parse decision
    if (geminiFeedback.includes("DECISION: ITERATE")) {
      logWarning("Gemini identified major issues. Iterating...");
      await appendToFile(
        reviewTargetFile,
        `\n## Gemini Review: ITERATE\n\n${geminiFeedback}\n`
      );
      await setJourneyState(journeyFile, prevPhase as VModelState);
    } else {
      logSuccess("Gemini approved design. Proceeding...");
      await appendToFile(
        reviewTargetFile,
        `\n## Gemini Review: APPROVED\n\n${geminiFeedback}\n`
      );
      await autoTransitionFromReview(journeyFile, prevPhase);
    }
  } catch (error) {
    logError(`Gemini consultation failed: ${error}`);
    // Fall back to auto-approval
    logWarning("Falling back to auto-approval");
    await autoTransitionFromReview(journeyFile, prevPhase);
  }
}

/**
 * Handle WAITING_FOR_USER state
 * Returns true if the loop should continue, false if it should exit
 */
async function handleWaitingForUser(journeyFile: string): Promise<boolean> {
  const content = await fs.readFile(journeyFile, "utf-8");

  // Check for pending questions
  const pendingQuestionsMatch = content.match(
    /## Pending Questions\n([\s\S]+?)\n## /
  );

  const pendingQuestions =
    pendingQuestionsMatch?.[1]
      .split("\n")
      .filter((line) => line.match(/^- \[ \] /))
      .join("\n") || "";

  if (!pendingQuestions) {
    // No real questions - check if we can auto-continue
    const currentEpic = await getCurrentEpic(journeyFile);

    // Check if epic is complete and we have a next epic
    if (currentEpic !== "TBD" && (await checkContinueToNextEpic(journeyFile, currentEpic))) {
      logInfo(`Epic ${currentEpic} complete - auto-transitioning to next epic...`);
      await transitionToNextEpic(journeyFile, currentEpic);

      // Archive the completed epic
      await archive_completed_epics_if_needed(journeyFile);
      return true; // Continue loop after transition
    }

    // No real questions and epic is in-progress - run iteration to process hints/continue
    logInfo("No pending questions found - resuming iteration (hints or in-progress epic)");
    await setJourneyState(journeyFile, VModelState.IMPLEMENTATION);
    await runIteration(journeyFile);
    return true; // Continue loop
  }

  // Only stop if there are genuine unchecked questions
  logWarning("Journey is WAITING_FOR_USER. Use 'vibe-model hint \"message\"' to provide input.");
  logInfo("Current pending questions:");
  console.error(pendingQuestions);
  return false; // Exit loop - waiting for user
}

/**
 * Handle ARCHIVING state
 */
async function handleArchiving(journeyFile: string): Promise<void> {
  logInfo("Archiving completed epics...");

  const preArchiveState = await getPreviousState(journeyFile);

  // Archive completed epics
  const completedUnarchivedEpics = await getCompletedUnarchivedEpics(journeyFile);

  for (const epicNum of completedUnarchivedEpics) {
    await markEpicComplete(journeyFile, epicNum);
  }

  // Restore previous state (or BLOCKED if unknown)
  await setJourneyState(journeyFile, (preArchiveState || "BLOCKED") as VModelState);
}

/**
 * Main V-Model iteration loop
 */
export async function mainLoop(journeyFile: string): Promise<void> {
  const journeyName = path.basename(journeyFile, ".journey.md");

  logInfo(`Starting main loop for journey: ${journeyName}`);
  if (config.verbose) {
    logDebug(`Execution mode: ${config.executionMode}`);
  }

  // Adjust max iterations based on mode
  const maxIterations = config.executionMode === ExecutionMode.GO
    ? 5  // GO mode: very few iterations
    : config.executionMode === ExecutionMode.MVP
    ? 20  // MVP mode: reduced iterations
    : config.maxIterations;  // Normal mode: default (100)

  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    const state = await getJourneyState(journeyFile);

    logDebug(`Iteration ${iteration}, state: ${state}`);

    // Handle terminal states
    if (state === VModelState.COMPLETE) {
      logSuccess("Journey complete!");
      return;
    }

    if (state === VModelState.BLOCKED) {
      logWarning("Journey is blocked. Use 'vibe-model hint \"message\"' to unblock.");
      return;
    }

    // GO mode: Auto-transition all states without AI calls
    if (config.executionMode === ExecutionMode.GO) {
      const nextState = getNextStateForMode(state, ExecutionMode.GO);
      if (nextState) {
        logDebug(`[GO] Auto-transitioning ${state} -> ${nextState}`);
        await setJourneyState(journeyFile, nextState);
      } else {
        logSuccess("[GO] Journey complete (no next state)");
        return;
      }
      continue;
    }

    // MVP mode: Skip test states without AI calls
    if (config.executionMode === ExecutionMode.MVP && shouldSkipInMvp(state)) {
      const nextState = getNextStateForMode(state, ExecutionMode.MVP);
      if (nextState) {
        logDebug(`[MVP] Skipping ${state} -> ${nextState}`);
        await setJourneyState(journeyFile, nextState);
        continue;
      }
    }

    // Handle special states
    switch (state) {
      case VModelState.WAITING_FOR_USER: {
        const shouldContinue = await handleWaitingForUser(journeyFile);
        if (!shouldContinue) {
          return; // Exit loop - waiting for user input
        }
        break;
      }

      case VModelState.DESIGN_REVIEW:
        // Skip DESIGN_REVIEW in MVP/GO modes (GO already handled above)
        if (config.executionMode === ExecutionMode.MVP) {
          logDebug("[MVP] Skipping DESIGN_REVIEW");
          const nextState = getNextStateForMode(state, ExecutionMode.MVP);
          if (nextState) {
            await setJourneyState(journeyFile, nextState);
          }
        } else {
          await handleDesignReview(journeyFile);
        }
        break;

      case VModelState.ARCHIVING:
        await handleArchiving(journeyFile);
        break;

      default: {
        // Run iteration for all other states
        await runIteration(journeyFile);

        // Ensure any changes are committed and pushed
        const currentBranch = await getCurrentBranch();

        if (currentBranch) {
          const hasChanges = await hasUncommittedChanges();
          if (hasChanges && iteration % config.commitInterval === 0) {
            logWarning("Uncommitted changes detected after iteration - committing now");
            await commitChanges(
              `chore(journey): auto-commit changes from iteration ${iteration} [${journeyName}]`
            );
          }

          if (!config.noPush) {
            logInfo(`Pushing to origin/${currentBranch}...`);
            await pushChanges(currentBranch);
          }
        }

        // Archive completed epics after state transition
        await archive_completed_epics_if_needed(journeyFile);
        break;
      }
    }

    // Small delay to prevent overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (iteration >= maxIterations) {
    logWarning(`Maximum iterations reached (${maxIterations})`);
  }
}

/**
 * Archive completed epics if needed (set state to ARCHIVING)
 */
async function archive_completed_epics_if_needed(journeyFile: string): Promise<void> {
  const completedUnarchivedEpics = await getCompletedUnarchivedEpics(journeyFile);

  if (completedUnarchivedEpics.length === 0) {
    return;
  }

  logInfo(`📦 ${completedUnarchivedEpics.length} completed epic(s) need archiving — setting state to ARCHIVING`);

  const currentState = await getJourneyState(journeyFile);
  await setPreviousState(journeyFile, currentState);
  await setJourneyState(journeyFile, VModelState.ARCHIVING);
}
