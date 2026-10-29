/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * PRD review iteration state management.
 * Tracks review iterations, results, and overall status.
 */

import { promises as fs } from "fs";
import path from "path";
import type { PRDReviewState, PRDReviewResult } from "./types";
import { VIBE_MODEL_DIR } from "./constants";

const PRD_REVIEW_STATE_FILE = "prd-review-state.json";

/**
 * Returns the full path to the PRD review state file.
 */
export function getPRDReviewStatePath(projectDir: string): string {
  return path.join(projectDir, VIBE_MODEL_DIR, PRD_REVIEW_STATE_FILE);
}

/**
 * Reads the PRD review state from disk.
 * Returns null if the file doesn't exist (no review in progress).
 */
export async function readPRDReviewState(
  projectDir: string
): Promise<PRDReviewState | null> {
  const statePath = getPRDReviewStatePath(projectDir);
  try {
    const content = await fs.readFile(statePath, "utf-8");
    return JSON.parse(content) as PRDReviewState;
  } catch {
    return null;
  }
}

/**
 * Writes the PRD review state to disk.
 */
export async function writePRDReviewState(
  projectDir: string,
  state: PRDReviewState
): Promise<void> {
  const statePath = getPRDReviewStatePath(projectDir);
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

/**
 * Creates an initial PRD review state for a new project.
 */
export async function createInitialPRDReviewState(
  projectDir: string,
  maxIterations: number = 5
): Promise<PRDReviewState> {
  const state: PRDReviewState = {
    iteration: 0,
    maxIterations,
    reviewResults: [],
    overallStatus: "pending",
  };
  await writePRDReviewState(projectDir, state);
  return state;
}

/**
 * Calculates whether the PRD review is approved.
 * All reviewers must score +2 (approve).
 */
export function calculateOverallApproved(
  results: PRDReviewResult[]
): boolean {
  return results.length > 0 && results.every((r) => r.score === 2);
}
