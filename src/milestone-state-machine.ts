/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Milestone-based state machine and transition logic.
 * This is the new lifecycle system that replaces the legacy VModelState state machine.
 * The legacy state-machine.ts remains until Phase 7.
 */

import { MilestoneState, type Config, type PRDFile } from "./types";

/**
 * Hardcoded transition map for milestone states.
 * Each state maps to exactly one successor, or null for terminal/external states.
 */
const MILESTONE_TRANSITIONS: Record<MilestoneState, MilestoneState | null> = {
  [MilestoneState.PRD]: MilestoneState.REQUIREMENTS,
  [MilestoneState.REQUIREMENTS]: MilestoneState.DESIGN,
  [MilestoneState.DESIGN]: MilestoneState.IMPLEMENTATION,
  [MilestoneState.IMPLEMENTATION]: MilestoneState.UNIT_TEST,
  [MilestoneState.UNIT_TEST]: MilestoneState.INTEGRATION_TEST,
  [MilestoneState.INTEGRATION_TEST]: MilestoneState.DELIVERY,
  [MilestoneState.DELIVERY]: null,
  [MilestoneState.COMPLETE]: null,
  [MilestoneState.WAITING_FOR_USER]: null,
};

/**
 * Get the next state for a milestone in the lifecycle.
 *
 * Returns null for:
 * - DELIVERY: caller must decide (next milestone or COMPLETE)
 * - WAITING_FOR_USER: caller must resolve from pendingTransition
 * - COMPLETE: terminal state
 */
export function getNextMilestoneState(
  current: MilestoneState
): MilestoneState | null {
  return MILESTONE_TRANSITIONS[current] ?? null;
}

/**
 * Whether sub-agent reviews should run for the current milestone.
 */
export function shouldRunReview(config: Config): boolean {
  return config.reviewEnabled;
}

/**
 * Whether the loop should pause for human-in-the-loop approval.
 *
 * A per-milestone mode override takes precedence over the global config:
 * - "autonomous" → never pause
 * - "hil"        → always pause
 * - no override  → defer to config.hilMode && !config.autonomous
 */
export function shouldPauseForHIL(
  config: Config,
  milestoneModeOverride?: string | null
): boolean {
  if (milestoneModeOverride === "autonomous") {
    return false;
  }
  if (milestoneModeOverride === "hil") {
    return true;
  }
  return config.hilMode && !config.autonomous;
}

/**
 * Returns true if the given state is the terminal milestone state.
 */
export function isTerminalState(state: MilestoneState): boolean {
  return state === MilestoneState.COMPLETE;
}

/**
 * Returns true when every milestone in the PRD is COMPLETE,
 * meaning there are no remaining active milestones.
 */
export function isLastMilestone(prd: PRDFile): boolean {
  return prd.milestones.every((m) => m.status === "COMPLETE");
}
