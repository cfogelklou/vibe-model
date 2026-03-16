/**
 * Main V-Model iteration loop and state-specific handlers.
 * Handles the core iteration logic for each V-Model state.
 */

import { promises as fs } from "fs";
import path from "path";
import { VModelState } from "./types.js";
import { config } from "./config.js";
import {
  getJourneyState,
  getCurrentEpic,
  setJourneyState,
  getPreviousState,
  setPreviousState,
} from "./journey.js";
import { appendToFile } from "./file-utils.js";
import { logPhase, logState, logInfo, logSuccess, logWarning, logError, logDebug } from "./logger.js";
import { extractDesignContent, extractResearchContent } from "./design-spec.js";
import { mainIterationPrompt, type MainIterationVars } from "./prompts/index.js";
import { runAIWithPrompt, consultGemini } from "./ai-provider.js";
import {
  transitionToNextEpic,
  checkContinueToNextEpic,
  getPreviousDesignPhase,
  autoTransitionFromReview,
} from "./state-machine.js";
import { commitChanges, pushChanges, hasUncommittedChanges } from "./checkpoint.js";

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
## Epic-Specific Work

You are currently working on **${getCurrentEpic(journeyFile)}**.

The epic file contains the detailed design and progress tracking for this epic.
Focus your work on the stories and tasks defined in the epic file.

Key epic context:
${epicContent.split("\n").slice(0, 50).join("\n")}
...
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
  const tempPrompt = `/tmp/v-model-iteration-${Date.now()}.md`;

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
    logWarning("Could not determine previous phase - defaulting to SYSTEM_DESIGN");
    prevPhase = "REQUIREMENTS";
  }

  logInfo(`Reviewing design from phase: ${prevPhase}`);

  // Extract BOTH design content AND research notes
  const designContent = await extractDesignContent(journeyFile, prevPhase as VModelState);
  const researchContent = await extractResearchContent(journeyFile, prevPhase as VModelState);

  // Consult Gemini with research context
  logInfo(`Consulting Gemini for ${prevPhase} phase review...`);

  try {
    const geminiFeedback = await consultGemini(prevPhase, designContent, researchContent);

    // Parse decision
    if (geminiFeedback.includes("DECISION: ITERATE")) {
      logWarning("Gemini identified major issues. Iterating...");
      await appendToFile(
        journeyFile,
        `\n## Gemini Review: ITERATE\n\n${geminiFeedback}\n`
      );
      await setJourneyState(journeyFile, prevPhase as VModelState);
    } else {
      logSuccess("Gemini approved design. Proceeding...");
      await appendToFile(
        journeyFile,
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
 */
async function handleWaitingForUser(journeyFile: string): Promise<void> {
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
      return;
    }

    // No real questions and epic is in-progress - run iteration to process hints/continue
    logInfo("No pending questions found - resuming iteration (hints or in-progress epic)");
    await setJourneyState(journeyFile, VModelState.IMPLEMENTATION);
    await runIteration(journeyFile);
    return;
  }

  // Only stop if there are genuine unchecked questions
  logWarning("Journey is WAITING_FOR_USER. Use 'v-model hint \"message\"' to provide input.");
  logInfo("Current pending questions:");
  console.error(pendingQuestions);
}

/**
 * Handle ARCHIVING state
 */
async function handleArchiving(journeyFile: string): Promise<void> {
  logInfo("Archiving completed epics...");

  const preArchiveState = await getPreviousState(journeyFile);

  // Archive completed epics
  const epicArchival = await import("./epic-archival.js");
  const completedUnarchivedEpics = await epicArchival.getCompletedUnarchivedEpics(journeyFile);

  for (const epicNum of completedUnarchivedEpics) {
    await epicArchival.archiveEpicDetails(journeyFile, epicNum);
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

  let iteration = 0;

  while (iteration < config.maxIterations) {
    iteration++;

    const state = await getJourneyState(journeyFile);

    logDebug(`Iteration ${iteration}, state: ${state}`);

    // Handle special states
    switch (state) {
      case VModelState.COMPLETE:
        logSuccess("Journey complete!");
        return;

      case VModelState.BLOCKED:
        logWarning("Journey is blocked. Use 'v-model hint \"message\"' to unblock.");
        return;

      case VModelState.WAITING_FOR_USER:
        await handleWaitingForUser(journeyFile);
        break;

      case VModelState.DESIGN_REVIEW:
        await handleDesignReview(journeyFile);
        break;

      case VModelState.ARCHIVING:
        await handleArchiving(journeyFile);
        break;

      default: {
        // Run iteration for all other states
        await runIteration(journeyFile);

        // Ensure any changes are committed and pushed
        const currentBranch = await (await import("./checkpoint.js"))
          .getCurrentBranch();

        if (currentBranch) {
          const hasChanges = await hasUncommittedChanges();
          if (hasChanges) {
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

  if (iteration >= config.maxIterations) {
    logWarning(`Maximum iterations reached (${config.maxIterations})`);
  }
}

/**
 * Archive completed epics if needed (set state to ARCHIVING)
 */
async function archive_completed_epics_if_needed(journeyFile: string): Promise<void> {
  const completedUnarchivedEpics = await (await import("./epic-archival.js"))
    .getCompletedUnarchivedEpics(journeyFile);

  if (completedUnarchivedEpics.length === 0) {
    return;
  }

  logInfo(`📦 ${completedUnarchivedEpics.length} completed epic(s) need archiving — setting state to ARCHIVING`);

  const currentState = await getJourneyState(journeyFile);
  await setPreviousState(journeyFile, currentState);
  await setJourneyState(journeyFile, VModelState.ARCHIVING);
}
