/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Core types and interfaces for the V-Model autonomous R&D agent.
 */

/**
 * AI provider options (Claude or Gemini)
 */
export type AIProvider = "claude" | "gemini";

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
  hilMode: boolean;
  reviewEnabled: boolean;
  autonomous: boolean;
}

/**
 * Milestone-based lifecycle states (new system).
 * 9 states, down from 22 in the legacy VModelState.
 */
export enum MilestoneState {
  PRD = "PRD",
  REQUIREMENTS = "REQUIREMENTS",
  DESIGN = "DESIGN",
  IMPLEMENTATION = "IMPLEMENTATION",
  UNIT_TEST = "UNIT_TEST",
  INTEGRATION_TEST = "INTEGRATION_TEST",
  DELIVERY = "DELIVERY",
  COMPLETE = "COMPLETE",
  WAITING_FOR_USER = "WAITING_FOR_USER",
}

/**
 * A single milestone from the PRD milestones table.
 */
export interface Milestone {
  id: number;
  name: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETE";
  modeOverride?: "hil" | "autonomous" | null;
}

/**
 * Parsed representation of prd.md.
 */
export interface PRDFile {
  goal: string;
  techStack: string;
  architectureOverview: string;
  milestones: Milestone[];
}

/**
 * Parsed representation of a milestone/{NN}-{name}.md file.
 */
export interface MilestoneFile {
  id: number;
  name: string;
  state: MilestoneState;
  progress: number;
  started: string;
  pendingTransition?: MilestoneState;
  requirements: string;
  design: string;
  testSpecifications: string;
  implementationNotes: string;
  unitTestResults: string;
  integrationTestResults: string;
  delivery: string;
  learnings: string;
  researchNotes: string;
}

/**
 * Result from a single sub-agent reviewer.
 */
export interface ReviewResult {
  pass: boolean;
  reviewer: "architecture" | "code" | "testability" | "ux";
  findings: string[];
}

/**
 * Aggregated result from all sub-agent reviewers.
 */
export interface SubAgentReview {
  results: ReviewResult[];
  overallPass: boolean;
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

