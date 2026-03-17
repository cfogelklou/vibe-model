/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou)
 * Licensed under the MIT License
 */

/**
 * Type-safe prompt system for V-Model.
 * Public API for generating prompts with compile-time type checking.
 *
 * This replaces the old markdown-based template system with TypeScript functions
 * that provide type safety, better IDE support, and eliminate file I/O overhead.
 *
 * @example
 * ```typescript
 * import { mainIterationPrompt } from './prompts/index.js';
 *
 * const prompt = mainIterationPrompt({
 *   AI_PROVIDER: 'claude',
 *   JOURNEY_CONTENT: journeyContent,
 *   JOURNEY_FILE: '/path/to/journey.md',
 *   JOURNEY_NAME: 'my-journey',
 *   // EPIC_CONTENT and EPIC_FILE_INSTRUCTIONS are optional
 * });
 * ```
 */

// Export all prompt generator functions
export { mainIterationPrompt } from './main-iteration';
export { geminiReviewPrompt } from './gemini-review';

// Export types for consumers who need them
export type {
  MainIterationVars,
  GeminiReviewVars,
  TemplateVariable,
} from './types';
