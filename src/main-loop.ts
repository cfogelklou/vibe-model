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
import { VModelState, ExecutionMode, MAX_UX_ITERATIONS } from "./types";
import { config } from "./config";
import {
  getJourneyState,
  getCurrentEpic,
  setJourneyState,
  getPreviousState,
  setPreviousState,
  addLearning,
  appendSelfImprovementNote,
  getPrototypingIteration,
  incrementPrototypingIteration,
  initializePrototypingIteration,
  getLastProcessedFeedbackIteration,
  getUnprocessedFeedback,
  markFeedbackAsProcessed,
} from "./journey";
import { appendToFile } from "./file-utils";
import { logPhase, logState, logInfo, logSuccess, logWarning, logError, logDebug } from "./logger";
import { extractDesignContent, extractResearchContent } from "./design-spec";
import { getStatePrompt } from "./prompts/index";
import { runAIWithPrompt, consultGemini, getLastAiStderr, isAiUsageLimitError } from "./ai-provider";
import {
  transitionToNextEpic,
  checkContinueToNextEpic,
  getNextStateForMode,
} from "./state-machine";
import { commitChanges, pushChanges, hasUncommittedChanges, getCurrentBranch } from "./checkpoint";
import { getCompletedUnarchivedEpics, markEpicComplete } from "./epic-archival";
import { runDumbUserTest, writeDumbUserFeedback } from "./playwright-dumb-user";

/**
 * Check if a state should be skipped in MVP mode
 */
function shouldSkipInMvp(state: VModelState): boolean {
  return [
    VModelState.REQUIREMENTS_REVIEW,
    VModelState.SYSTEM_DESIGN_REVIEW,
    VModelState.ARCH_DESIGN_REVIEW,
    VModelState.MODULE_DESIGN_REVIEW,
    VModelState.UNIT_TEST,
    VModelState.INTEGRATION_TEST,
    VModelState.ACCEPTANCE_TEST,
  ].includes(state);
}

/**
 * Generate iteration prompt for current state using state-specific prompt system
 */
async function generateIterationPrompt(
  journeyFile: string,
  state: VModelState,
  epicFile?: string
): Promise<string> {
  const journeyContent = await fs.readFile(journeyFile, "utf-8");

  // Use the new state-specific prompt system
  const result = await getStatePrompt(
    state,
    journeyFile,
    journeyContent,
    epicFile
  );

  return result.prompt;
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

    // Try multiple epic file naming conventions
    const possibleEpicFiles = [
      // New convention: epic-e{N}-{name}.epic.md
      path.join(journeyDir, `epic-e${epicNum.toLowerCase()}-*.epic.md`),
      // Old convention: {journey}.journey.E{N}.md
      path.join(journeyDir, `${journeyName}.journey.E${epicNum}.md`),
    ];

    // Find the first matching epic file
    for (const pattern of possibleEpicFiles) {
      if (pattern.includes("*")) {
        // Glob pattern - search for matching files
        const dir = path.dirname(pattern);
        const basePattern = path.basename(pattern);
        // Extract prefix (part before *) and suffix (part after *)
        const starIndex = basePattern.indexOf("*");
        const prefix = basePattern.substring(0, starIndex);
        const suffix = basePattern.substring(starIndex + 1);
        try {
          const files = await fs.readdir(dir);
          if (config.verbose) {
            logDebug(`Searching for epic file in ${dir} with prefix "${prefix}" and suffix "${suffix}"`);
            logDebug(`Files found: ${files.filter(f => f.endsWith(".epic.md")).join(", ")}`);
          }
          const match = files.find(f => f.startsWith(prefix) && f.endsWith(suffix));
          if (match) {
            epicFile = path.join(dir, match);
            if (config.verbose) {
              logDebug(`Found epic file: ${epicFile}`);
            }
            break;
          }
        } catch (err) {
          // Directory doesn't exist or can't be read
          if (config.verbose) {
            logDebug(`Failed to read directory ${dir}: ${err}`);
          }
        }
      } else {
        // Exact path
        try {
          await fs.access(pattern);
          epicFile = pattern;
          break;
        } catch {
          // File doesn't exist
        }
      }
    }

    if (!epicFile) {
      logWarning(`Epic file not found for ${currentEpic} (tried: ${possibleEpicFiles.join(", ")})`);
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

    if (exitCode !== 0 && isAiUsageLimitError(getLastAiStderr())) {
      throw new Error("AI_USAGE_LIMIT_REACHED");
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
 * Handle phase-specific design review states
 * Extracts phase from state name and processes review accordingly
 */
async function handleDesignReviews(journeyFile: string, reviewState: VModelState): Promise<void> {
  // Extract phase from state name (e.g., "SYSTEM_DESIGN_REVIEW" → "SYSTEM_DESIGN")
  const phase = reviewState.replace("_REVIEW", "") as "REQUIREMENTS" | "SYSTEM_DESIGN" | "ARCH_DESIGN" | "MODULE_DESIGN";

  if (!config.consultGemini) {
    // Skip consultation, proceed to next phase
    logInfo(`Gemini consultation disabled - auto-approving ${phase} design...`);
    const nextState = getNextStateForMode(reviewState, ExecutionMode.NORMAL);
    if (nextState) {
      await setJourneyState(journeyFile, nextState);
      await addLearning(
        journeyFile,
        `Design review approved: ${phase} → ${nextState}`
      );
      await appendToFile(
        journeyFile,
        `\n**Design Review Approved: ${phase} → ${nextState}**\n`
      );
    }
    return;
  }

  logInfo(`Running ${phase} design review with Gemini consultation...`);

  // Extract BOTH design content AND research notes
  const designContent = await extractDesignContent(journeyFile, phase as VModelState);
  const researchContent = await extractResearchContent(journeyFile, phase as VModelState);

  // Consult Gemini with research context
  logInfo(`Consulting Gemini for ${phase} phase review...`);

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
    const geminiFeedback = await consultGemini(phase, designContent, researchContent);

    // Parse decision
    if (geminiFeedback.includes("DECISION: ITERATE")) {
      logWarning("Gemini identified major issues. Iterating...");
      await appendToFile(
        reviewTargetFile,
        `\n## Gemini Review: ITERATE\n\n${geminiFeedback}\n`
      );
      await setJourneyState(journeyFile, phase as VModelState);
    } else {
      logSuccess("Gemini approved design. Proceeding...");
      await appendToFile(
        reviewTargetFile,
        `\n## Gemini Review: APPROVED\n\n${geminiFeedback}\n`
      );
      const nextState = getNextStateForMode(reviewState, ExecutionMode.NORMAL);
      if (nextState) {
        await setJourneyState(journeyFile, nextState);
        await addLearning(
          journeyFile,
          `Design review approved: ${phase} → ${nextState}`
        );
        await appendToFile(
          journeyFile,
          `\n**Design Review Approved: ${phase} → ${nextState}**\n`
        );
      }
    }
  } catch (error) {
    logError(`Gemini consultation failed: ${error}`);
    // Fall back to auto-approval
    logWarning("Falling back to auto-approval");
    const nextState = getNextStateForMode(reviewState, ExecutionMode.NORMAL);
    if (nextState) {
      await setJourneyState(journeyFile, nextState);
      await addLearning(
        journeyFile,
        `Design review approved: ${phase} → ${nextState}`
      );
      await appendToFile(
        journeyFile,
        `\n**Design Review Approved: ${phase} → ${nextState}**\n`
      );
    }
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

async function handlePrototypingForUxMvp(journeyFile: string): Promise<void> {
  const iteration = await getPrototypingIteration(journeyFile);
  if (iteration === 0) {
    await initializePrototypingIteration(journeyFile);
  }

  if (iteration >= MAX_UX_ITERATIONS) {
    logWarning(`Max UX iterations (${MAX_UX_ITERATIONS}) reached, advancing to REQUIREMENTS_REVIEW`);
    await setJourneyState(journeyFile, VModelState.REQUIREMENTS_REVIEW);
    return;
  }

  await runIteration(journeyFile);

  if (config.playwrightEnabled) {
    const mockupPath = path.join(
      config.projectDir,
      "vibe-model",
      "prototypes",
      `mockup-v${iteration + 1}.html`
    );
    const result = await runDumbUserTest(mockupPath, await fs.readFile(journeyFile, "utf-8"));
    await writeDumbUserFeedback(journeyFile, result);
  }

  await setJourneyState(journeyFile, VModelState.WAITING_FOR_USER);
  logInfo(`Mockup v${iteration + 1} ready for review.`);
  logInfo("Provide feedback with: vibe-model hint \"...\" or approve with: vibe-model approve");
}

async function handleWaitingForUxMvp(journeyFile: string): Promise<boolean> {
  const content = await fs.readFile(journeyFile, "utf-8");
  if (content.match(/^- \d{4}-\d{2}-\d{2}: APPROVED:/m)) {
    logSuccess("Mockup approved, proceeding to REQUIREMENTS_REVIEW");
    await setJourneyState(journeyFile, VModelState.REQUIREMENTS_REVIEW);
    return true;
  }

  const currentIteration = await getPrototypingIteration(journeyFile);
  const lastProcessedIteration = await getLastProcessedFeedbackIteration(journeyFile);
  const newFeedback = await getUnprocessedFeedback(journeyFile, lastProcessedIteration);

  if (newFeedback.length > 0) {
    await markFeedbackAsProcessed(journeyFile, currentIteration);
    await incrementPrototypingIteration(journeyFile);
    await setJourneyState(journeyFile, VModelState.PROTOTYPING);
    logInfo("Feedback received, returning to PROTOTYPING");
    return true;
  }

  logInfo("Waiting for feedback or approval...");
  return false;
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
    : config.executionMode === ExecutionMode.UX_MVP
    ? 30  // UX mode: bounded loop with user feedback
    : config.maxIterations;  // Normal mode: default (100)

  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    const state = await getJourneyState(journeyFile);
    const startState = state;

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
      const endState = await getJourneyState(journeyFile);
      await appendSelfImprovementNote(journeyFile, iteration, startState, endState);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    // MVP mode: Skip test states without AI calls
    if (config.executionMode === ExecutionMode.MVP && shouldSkipInMvp(state)) {
      const nextState = getNextStateForMode(state, ExecutionMode.MVP);
      if (nextState) {
        logDebug(`[MVP] Skipping ${state} -> ${nextState}`);
        await setJourneyState(journeyFile, nextState);
        const endState = await getJourneyState(journeyFile);
        await appendSelfImprovementNote(journeyFile, iteration, startState, endState);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
    }

    // Handle special states
    switch (state) {
      case VModelState.WAITING_FOR_USER: {
        const shouldContinue = config.executionMode === ExecutionMode.UX_MVP
          ? await handleWaitingForUxMvp(journeyFile)
          : await handleWaitingForUser(journeyFile);
        if (!shouldContinue) {
          return; // Exit loop - waiting for user input
        }
        break;
      }

      case VModelState.REQUIREMENTS_REVIEW:
      case VModelState.SYSTEM_DESIGN_REVIEW:
      case VModelState.ARCH_DESIGN_REVIEW:
      case VModelState.MODULE_DESIGN_REVIEW:
        // Skip review states in MVP/GO modes (GO already handled above)
        if (config.executionMode === ExecutionMode.MVP) {
          logDebug(`[MVP] Skipping ${state}`);
          const nextState = getNextStateForMode(state, ExecutionMode.MVP);
          if (nextState) {
            await setJourneyState(journeyFile, nextState);
          }
        } else {
          await handleDesignReviews(journeyFile, state);
        }
        break;

      case VModelState.ARCHIVING:
        await handleArchiving(journeyFile);
        break;

      default: {
        if (state === VModelState.PROTOTYPING && config.executionMode === ExecutionMode.UX_MVP) {
          await handlePrototypingForUxMvp(journeyFile);
          break;
        }

        // Run iteration for all other states
        try {
          await runIteration(journeyFile);
        } catch (error) {
          if (error instanceof Error && error.message === "AI_USAGE_LIMIT_REACHED") {
            logError("AI usage limit reached. Exiting so you can retry later.");
            await addLearning(journeyFile, "Paused: AI usage limit reached; user should rerun later.");
            await setJourneyState(journeyFile, VModelState.WAITING_FOR_USER);
            process.exitCode = 2;
            return;
          }
          throw error;
        }

        // Ensure any changes are committed and pushed
        // Wrap in try-catch to prevent loop from exiting on git errors
        try {
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
        } catch (error) {
          logWarning(`Git operations failed (non-blocking): ${error}`);
          logInfo("Continuing journey despite git errors...");
        }

        // Archive completed epics after state transition
        await archive_completed_epics_if_needed(journeyFile);
        break;
      }
    }

    // Record iteration note for future-run feedback (store-only)
    const endState = await getJourneyState(journeyFile);
    await appendSelfImprovementNote(journeyFile, iteration, startState, endState);

    // Small delay to prevent overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (iteration >= maxIterations) {
    const finalState = await getJourneyState(journeyFile);
    if (finalState !== VModelState.COMPLETE) {
      logWarning(`Maximum iterations reached (${maxIterations})`);
    }
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
