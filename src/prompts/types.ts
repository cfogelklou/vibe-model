/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Type-safe prompt template system for V-Model.
 * Provides strongly-typed interfaces for all template variables.
 */

/**
 * Template variables for Gemini design review prompts.
 * Used in src/ai-provider.ts consultGemini()
 */
export interface GeminiReviewVars {
  /** Design content to review (extracted from spec or journey) */
  DESIGN_CONTENT: string;
  /** Research notes for the phase (optional) */
  RESEARCH_CONTENT?: string;
  /** Current V-Model phase being reviewed */
  PHASE: string;
}

/**
 * Template variables for milestone-based lifecycle prompts.
 * Used by the milestone prompt system.
 */
export interface MilestonePromptVars {
  /** AI provider name ("claude" or "gemini") */
  AI_PROVIDER: string;
  /** Path to the milestone file */
  MILESTONE_FILE: string;
  /** Human-readable milestone name */
  MILESTONE_NAME: string;
  /** Milestone ID (1-based) */
  MILESTONE_ID: number;
  /** Milestone file content, filtered by current state */
  MILESTONE_CONTENT: string;
  /** PRD content (for PRD phase only) */
  PRD_CONTENT?: string;
}
