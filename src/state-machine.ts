/**
 * V-Model state machine and transition logic.
 * Handles state transitions, epic transitions, and previous phase tracking.
 */

import { VModelState } from "./types.js";
import { getNextEpicId, shouldContinueToNextEpic, getEpicNameFromTable } from "./epic-archival.js";
import { setJourneyState, setCurrentEpic, addLearning } from "./journey.js";
import { appendToFile } from "./file-utils.js";
import { createCheckpoint } from "./checkpoint.js";
import { logInfo } from "./logger.js";

/**
 * Get the next state in the V-Model lifecycle
 */
export function getNextState(current: VModelState): VModelState {
  const stateTransitions: Record<VModelState, VModelState> = {
    [VModelState.REQUIREMENTS]: VModelState.DESIGN_REVIEW,
    [VModelState.DESIGN_REVIEW]: VModelState.SYSTEM_DESIGN,
    [VModelState.SYSTEM_DESIGN]: VModelState.DESIGN_REVIEW,
    [VModelState.ARCH_DESIGN]: VModelState.MODULE_DESIGN,
    [VModelState.MODULE_DESIGN]: VModelState.IMPLEMENTATION,
    [VModelState.IMPLEMENTATION]: VModelState.UNIT_TEST,
    [VModelState.UNIT_TEST]: VModelState.INTEGRATION_TEST,
    [VModelState.INTEGRATION_TEST]: VModelState.SYSTEM_TEST,
    [VModelState.SYSTEM_TEST]: VModelState.ACCEPTANCE_TEST,
    [VModelState.ACCEPTANCE_TEST]: VModelState.CONSOLIDATING,
    [VModelState.CONSOLIDATING]: VModelState.COMPLETE,
    [VModelState.PROTOTYPING]: VModelState.MODULE_DESIGN,
    [VModelState.WAITING_FOR_USER]: VModelState.REQUIREMENTS,
    [VModelState.COMPLETE]: VModelState.COMPLETE,
    [VModelState.BLOCKED]: VModelState.BLOCKED,
    [VModelState.REVIEWING]: VModelState.REQUIREMENTS,
    [VModelState.ARCHIVING]: VModelState.REQUIREMENTS,
    [VModelState.PIVOTING]: VModelState.REQUIREMENTS,
    [VModelState.REFLECTING]: VModelState.REQUIREMENTS,
  };

  return stateTransitions[current] || VModelState.REQUIREMENTS;
}

/**
 * Get the previous design phase for review
 */
export async function getPreviousDesignPhase(
  journeyFile: string
): Promise<string> {
  const content = await Bun.file(journeyFile).text();

  // Check journey metadata for Previous Phase marker
  const prevPhaseMatch = content.match(/^- Previous Phase:\s*(.+)$/m);
  if (prevPhaseMatch) {
    return prevPhaseMatch[1].trim().replace(/\s+/g, "");
  }

  // Fallback: try to infer from recent learnings log (transition history)
  if (content.includes("Transitioned to SYSTEM_DESIGN")) {
    return "REQUIREMENTS";
  } else if (content.includes("Transitioned to ARCH_DESIGN")) {
    return "SYSTEM_DESIGN";
  } else if (content.includes("Transitioned to MODULE_DESIGN")) {
    return "ARCH_DESIGN";
  } else if (content.includes("Transitioned to IMPLEMENTATION")) {
    return "MODULE_DESIGN";
  }

  return "UNKNOWN";
}

/**
 * Ensure the Previous Phase marker is set in the Meta section
 */
export async function ensurePreviousPhaseMarker(
  journeyFile: string,
  phase: string
): Promise<void> {
  const content = await Bun.file(journeyFile).text();

  if (!content.match(/^- Previous Phase:/m)) {
    // Add Previous Phase marker after Previous State line
    const lines = content.split("\n");
    const insertIndex = lines.findIndex((line) =>
      line.match(/^- Previous State:/)
    );

    if (insertIndex >= 0) {
      lines.splice(insertIndex + 1, 0, `- Previous Phase: ${phase}`);
      await Bun.write(journeyFile, lines.join("\n"));
    }
  } else {
    // Update existing Previous Phase marker
    const updatedContent = content.replace(
      /^- Previous Phase: .*$/m,
      `- Previous Phase: ${phase}`
    );
    await Bun.write(journeyFile, updatedContent);
  }
}

/**
 * Auto-transition from design review to next phase
 */
export async function autoTransitionFromReview(
  journeyFile: string,
  previousPhase: string
): Promise<void> {
  const content = await Bun.file(journeyFile).text();
  const stateMatch = content.match(/^- State:\s*(\w+)$/m);

  if (!stateMatch) {
    return;
  }

  const _currentState = stateMatch[1].toUpperCase() as VModelState;

  let nextState: VModelState;

  switch (previousPhase) {
    case "REQUIREMENTS":
      nextState = VModelState.SYSTEM_DESIGN;
      break;
    case "SYSTEM_DESIGN":
      nextState = VModelState.ARCH_DESIGN;
      break;
    case "ARCH_DESIGN":
      nextState = VModelState.MODULE_DESIGN;
      break;
    case "MODULE_DESIGN":
      nextState = VModelState.IMPLEMENTATION;
      break;
    default:
      nextState = VModelState.REQUIREMENTS;
  }

  await setJourneyState(journeyFile, nextState);
  await addLearning(
    journeyFile,
    `Design review approved: ${previousPhase} → ${nextState}`
  );
  await appendToFile(
    journeyFile,
    `\n**Design Review Approved: ${previousPhase} → ${nextState}**\n`
  );
}

/**
 * Transition to the next epic's ARCH_DESIGN phase
 */
export async function transitionToNextEpic(
  journeyFile: string,
  completedEpic: string
): Promise<void> {
  // Extract next epic from journey file epic decomposition
  const nextEpic = await getNextEpicId(journeyFile, completedEpic);

  if (nextEpic === "NONE") {
    logInfo("All epics complete - transitioning to SYSTEM_TEST");
    await setJourneyState(journeyFile, VModelState.SYSTEM_TEST);
    await createCheckpoint(
      journeyFile,
      Date.now(),
      "All epics completed, transitioning to SYSTEM_TEST"
    );
  } else {
    logInfo(`Transitioning to ${nextEpic} ARCH_DESIGN phase`);

    // PROACTIVE: Create epic file immediately for the next epic
    const nextEpicNum = parseInt(nextEpic.replace(/\D/g, ""), 10);
    const nextEpicName = await getEpicNameFromTable(journeyFile, nextEpic);

    const { createOrUpdateEpicFile } = await import("./epic-archival.js");
    const _journeyName = journeyFile.split("/").pop()?.replace(".journey.md", "") || "";
    const epicFile = await createOrUpdateEpicFile(
      journeyFile,
      nextEpicNum,
      nextEpicName
    );

    // Verify epic file was created
    const { existsSync } = await import("fs");
    if (!existsSync(epicFile)) {
      console.error(`Failed to create epic file: ${epicFile}`);
      // Fallback: continue without epic file (journey.md only)
      await setJourneyState(journeyFile, VModelState.ARCH_DESIGN);
      return;
    }

    logInfo(`Epic file created: ${epicFile}`);

    // Update main journey with epic summary only
    await appendToFile(
      journeyFile,
      `\n**Epic ${nextEpic}: ${nextEpicName}** - See \`.journey.E${nextEpicNum}.md\` for detailed work.\n`
    );

    await setCurrentEpic(journeyFile, nextEpic);
    await setJourneyState(journeyFile, VModelState.ARCH_DESIGN);
    await addLearning(
      journeyFile,
      `Auto-transition: Epic ${completedEpic} → ${nextEpic}`
    );
    await appendToFile(
      journeyFile,
      `\n**Auto-Transition: Epic ${completedEpic} → ${nextEpic}**\n`
    );
  }
}

/**
 * Check if we should continue to next epic
 */
export async function checkContinueToNextEpic(
  journeyFile: string,
  currentEpic: string
): Promise<boolean> {
  return shouldContinueToNextEpic(journeyFile, currentEpic);
}
