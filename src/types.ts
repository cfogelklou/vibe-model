/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Core types and interfaces for the V-Model autonomous R&D agent.
 */

/**
 * V-Model states representing the development lifecycle.
 * Each state corresponds to a specific phase in the V-Model methodology.
 */
export enum VModelState {
  REQUIREMENTS = "REQUIREMENTS",
  SYSTEM_DESIGN = "SYSTEM_DESIGN",
  ARCH_DESIGN = "ARCH_DESIGN",
  MODULE_DESIGN = "MODULE_DESIGN",
  IMPLEMENTATION = "IMPLEMENTATION",
  UNIT_TEST = "UNIT_TEST",
  INTEGRATION_TEST = "INTEGRATION_TEST",
  SYSTEM_TEST = "SYSTEM_TEST",
  ACCEPTANCE_TEST = "ACCEPTANCE_TEST",
  PROTOTYPING = "PROTOTYPING",
  WAITING_FOR_USER = "WAITING_FOR_USER",
  CONSOLIDATING = "CONSOLIDATING",
  COMPLETE = "COMPLETE",
  BLOCKED = "BLOCKED",
  DESIGN_REVIEW = "DESIGN_REVIEW",
  REVIEWING = "REVIEWING",
  ARCHIVING = "ARCHIVING",
  PIVOTING = "PIVOTING",
  REFLECTING = "REFLECTING"
}

/**
 * AI provider options (Claude or Gemini)
 */
export type AIProvider = "claude" | "gemini";

/**
 * Journey metadata and progress tracking
 */
export interface Journey {
  goal: string;
  state: VModelState;
  progress: number;
  currentEpic: string;
  previousPhase: string;
  previousState: string;
  started: string;
  currentApproach: string;
}

/**
 * Epic tracking within a journey
 */
export interface Epic {
  id: string;
  name: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETE";
  storiesComplete: number;
  totalStories: number;
}

/**
 * Git checkpoint for journey rollback
 */
export interface Checkpoint {
  id: number;
  tag: string;
  date: string;
  description: string;
  gitSha: string;
}

/**
 * Configuration for the V-Model agent
 */
export interface Config {
  aiProvider: AIProvider;
  maxIterations: number;
  consultGemini: boolean;
  projectDir: string;
  verbose: boolean;
  noPush: boolean;
  commitInterval: number;
}

/**
 * Custom error class for V-Model specific errors
 */
export class VModelError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = "VModelError";
  }
}

/**
 * Claude CLI capabilities detection result
 */
export interface ClaudeCapabilities {
  hasPrint: boolean;
  hasStreamJson: boolean;
  hasVerbose: boolean;
  version: string;
}

/**
 * Stream event from Claude CLI --output-format stream-json
 */
export interface StreamEvent {
  type: "content_block_start" | "text_delta" | "result";
  content_block?: {
    type: string;
    name: string;
  };
  delta?: {
    type: string;
    text: string;
  };
  total_cost_usd?: number;
  num_turns?: number;
}

/**
 * Type guard for valid VModelState values
 */
export function isValidState(state: string): boolean {
  return Object.values(VModelState).includes(state as VModelState);
}
