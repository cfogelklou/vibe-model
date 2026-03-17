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
 * Available template variable names for type checking and autocomplete.
 * This union type represents all possible template variables used across prompts.
 */
export type TemplateVariable =
  | 'AI_PROVIDER'
  | 'JOURNEY_CONTENT'
  | 'EPIC_CONTENT'
  | 'EPIC_FILE_INSTRUCTIONS'
  | 'PHASE'
  | 'DESIGN_CONTENT'
  | 'RESEARCH_CONTENT';

/**
 * Template variables for main-iteration prompt.
 * Used in src/main-loop.ts generateIterationPrompt()
 */
export interface MainIterationVars {
  /** AI provider name ("claude" or "gemini") */
  AI_PROVIDER: string;
  /** Full journey file content */
  JOURNEY_CONTENT: string;
  /** Epic file content (optional) */
  EPIC_CONTENT?: string;
  /** Instructions for epic-specific work (optional) */
  EPIC_FILE_INSTRUCTIONS?: string;
  /** Current V-Model phase (NOTE: not actually used in template, but passed for consistency) */
  PHASE?: string;
  /** Journey file path */
  JOURNEY_FILE: string;
  /** Journey name (without .journey.md extension) */
  JOURNEY_NAME: string;
}

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
