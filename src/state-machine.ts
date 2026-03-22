/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * V-Model state machine and transition logic.
 * Handles state transitions, epic transitions, and previous phase tracking.
 */

import { VModelState, ExecutionMode } from "./types";
import { getNextEpicId, shouldContinueToNextEpic, getEpicNameFromTable, createOrUpdateEpicFile } from "./epic-archival";
import { setJourneyState, setCurrentEpic, addLearning } from "./journey";
import { appendToFile } from "./file-utils";
import { createCheckpoint, commitChanges } from "./checkpoint";
import { logInfo, logSuccess, logWarning } from "./logger";
import { existsSync } from "fs";
import path from "path";

/**
 * Get the next state in the V-Model lifecycle
 */
export function getNextState(current: VModelState): VModelState {
  return getNextStateNormal(current);
}

/**
 * Get next state based on execution mode
 */
export function getNextStateForMode(
  current: VModelState,
  mode: ExecutionMode
): VModelState | null {
  switch (mode) {
    case ExecutionMode.GO:
      return getNextStateForGo(current);
    case ExecutionMode.MVP:
      return getNextStateForMvp(current);
    default:
      return getNextStateNormal(current);
  }
}

/**
 * GO mode - For testing vibe-model itself (AI agent calls vibe-model)
 *
 * IMPORTANT: GO mode is for validating the tool works, not for building real products.
 * It should run quickly (few minutes) without spawning nested AI agents.
 *
 * State flow: REQUIREMENTS → SYSTEM_DESIGN → ARCH_DESIGN → MODULE_DESIGN → IMPLEMENTATION → COMPLETE
 * (Skips: all review states, all testing phases, WAITING_FOR_USER)
 */
export function getNextStateForGo(currentState: VModelState): VModelState | null {
  const goTransitions: Record<VModelState, VModelState | null> = {
    // Quick design pass - keep design states for validation
    [VModelState.REQUIREMENTS]: VModelState.SYSTEM_DESIGN,
    [VModelState.REQUIREMENTS_REVIEW]: VModelState.SYSTEM_DESIGN,
    [VModelState.SYSTEM_DESIGN]: VModelState.ARCH_DESIGN,
    [VModelState.SYSTEM_DESIGN_REVIEW]: VModelState.ARCH_DESIGN,
    [VModelState.ARCH_DESIGN]: VModelState.MODULE_DESIGN,
    [VModelState.ARCH_DESIGN_REVIEW]: VModelState.MODULE_DESIGN,
    [VModelState.MODULE_DESIGN]: VModelState.IMPLEMENTATION,
    [VModelState.MODULE_DESIGN_REVIEW]: VModelState.IMPLEMENTATION,

    // Skip testing in GO mode
    [VModelState.IMPLEMENTATION]: VModelState.COMPLETE,
    [VModelState.UNIT_TEST]: VModelState.COMPLETE,
    [VModelState.INTEGRATION_TEST]: VModelState.COMPLETE,
    [VModelState.SYSTEM_TEST]: VModelState.COMPLETE,
    [VModelState.ACCEPTANCE_TEST]: VModelState.COMPLETE,

    // Skip special states
    [VModelState.WAITING_FOR_USER]: VModelState.MODULE_DESIGN,

    // Terminal states
    [VModelState.COMPLETE]: null,
    [VModelState.BLOCKED]: null,

    // Other states → COMPLETE
    [VModelState.CONSOLIDATING]: VModelState.COMPLETE,
    [VModelState.PROTOTYPING]: VModelState.MODULE_DESIGN,
    [VModelState.REVIEWING]: VModelState.COMPLETE,
    [VModelState.ARCHIVING]: VModelState.COMPLETE,
    [VModelState.PIVOTING]: VModelState.REQUIREMENTS,
    [VModelState.REFLECTING]: VModelState.COMPLETE,
  };
  // Use 'in' check to properly handle null values (terminal states)
  return currentState in goTransitions ? goTransitions[currentState] : VModelState.COMPLETE;
}

/**
 * MVP mode - Fast CI execution with aggressive skipping
 *
 * Design phases: Skip all review states (for speed)
 * Testing: Go directly to SYSTEM_TEST after IMPLEMENTATION, then COMPLETE
 * State flow: REQUIREMENTS → SYSTEM_DESIGN → ARCH_DESIGN → MODULE_DESIGN → IMPLEMENTATION → SYSTEM_TEST → COMPLETE
 */
export function getNextStateForMvp(currentState: VModelState): VModelState | null {
  const mvpTransitions: Record<VModelState, VModelState | null> = {
    // Design phases - SKIP all review states for speed
    [VModelState.REQUIREMENTS]: VModelState.SYSTEM_DESIGN,
    [VModelState.REQUIREMENTS_REVIEW]: VModelState.SYSTEM_DESIGN,
    [VModelState.SYSTEM_DESIGN]: VModelState.ARCH_DESIGN,
    [VModelState.SYSTEM_DESIGN_REVIEW]: VModelState.ARCH_DESIGN,
    [VModelState.ARCH_DESIGN]: VModelState.MODULE_DESIGN,
    [VModelState.ARCH_DESIGN_REVIEW]: VModelState.MODULE_DESIGN,
    [VModelState.MODULE_DESIGN]: VModelState.IMPLEMENTATION,
    [VModelState.MODULE_DESIGN_REVIEW]: VModelState.IMPLEMENTATION,

    // After IMPLEMENTATION, go directly to SYSTEM_TEST (which goes to COMPLETE)
    [VModelState.IMPLEMENTATION]: VModelState.SYSTEM_TEST,
    [VModelState.UNIT_TEST]: VModelState.SYSTEM_TEST,
    [VModelState.INTEGRATION_TEST]: VModelState.SYSTEM_TEST,
    [VModelState.SYSTEM_TEST]: VModelState.COMPLETE,
    [VModelState.ACCEPTANCE_TEST]: VModelState.COMPLETE,

    // Terminal/special states
    [VModelState.CONSOLIDATING]: VModelState.COMPLETE,
    [VModelState.COMPLETE]: null,
    [VModelState.BLOCKED]: null,
    [VModelState.WAITING_FOR_USER]: VModelState.IMPLEMENTATION,  // Skip waiting in MVP

    // Other states
    [VModelState.ARCHIVING]: VModelState.MODULE_DESIGN,
    [VModelState.PROTOTYPING]: VModelState.MODULE_DESIGN,
    [VModelState.REVIEWING]: VModelState.MODULE_DESIGN,
    [VModelState.PIVOTING]: VModelState.REQUIREMENTS,
    [VModelState.REFLECTING]: VModelState.MODULE_DESIGN,
  };
  return mvpTransitions[currentState] ?? null;
}

/**
 * Normal mode - Full V-Model lifecycle
 *
 * Each design phase transitions to its phase-specific review state,
 * which then transitions to the next design phase.
 */
export function getNextStateNormal(current: VModelState): VModelState {
  const stateTransitions: Record<VModelState, VModelState> = {
    [VModelState.REQUIREMENTS]: VModelState.REQUIREMENTS_REVIEW,
    [VModelState.REQUIREMENTS_REVIEW]: VModelState.SYSTEM_DESIGN,
    [VModelState.SYSTEM_DESIGN]: VModelState.SYSTEM_DESIGN_REVIEW,
    [VModelState.SYSTEM_DESIGN_REVIEW]: VModelState.ARCH_DESIGN,
    [VModelState.ARCH_DESIGN]: VModelState.ARCH_DESIGN_REVIEW,
    [VModelState.ARCH_DESIGN_REVIEW]: VModelState.MODULE_DESIGN,
    [VModelState.MODULE_DESIGN]: VModelState.MODULE_DESIGN_REVIEW,
    [VModelState.MODULE_DESIGN_REVIEW]: VModelState.IMPLEMENTATION,
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
 * Transition to the next epic's ARCH_DESIGN phase
 */
export async function transitionToNextEpic(
  journeyFile: string,
  completedEpic: string
): Promise<void> {
  // Extract next epic from journey file epic decomposition
  const nextEpic = await getNextEpicId(journeyFile, completedEpic);

  // Commit the completed epic before transitioning
  const journeyName = journeyFile.split("/").pop()?.replace(".journey.md", "") || "";
  try {
    logInfo(`Committing completed epic ${completedEpic}...`);
    await commitChanges(`feat(journey): Epic ${completedEpic} complete [${journeyName}]`);
    logSuccess(`Epic ${completedEpic} committed`);
  } catch (error) {
    logWarning(`Failed to commit epic ${completedEpic}: ${error}`);
  }

  if (nextEpic === "NONE") {
    logInfo("All epics complete - transitioning to SYSTEM_TEST");
    await setJourneyState(journeyFile, VModelState.SYSTEM_TEST);

    // Get journey name from file path for checkpoint tag
    const journeyName = path.basename(journeyFile).replace(".journey.md", "");

    await createCheckpoint(
      journeyName,
      999, // Special milestone number for "all epics complete"
      "All epics completed, transitioning to SYSTEM_TEST"
    );
  } else {
    logInfo(`Transitioning to ${nextEpic} ARCH_DESIGN phase`);

    // PROACTIVE: Create epic file immediately for the next epic
    const nextEpicNum = parseInt(nextEpic.replace(/\D/g, ""), 10);
    const nextEpicName = await getEpicNameFromTable(journeyFile, nextEpic);

    const _journeyName = journeyFile.split("/").pop()?.replace(".journey.md", "") || "";
    const epicFile = await createOrUpdateEpicFile(
      journeyFile,
      nextEpicNum,
      nextEpicName
    );

    // Verify epic file was created
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
