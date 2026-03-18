/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Type-safe prompt system for V-Model.
 * Public API for generating prompts with compile-time type checking.
 *
 * NEW: State-specific prompt system for reduced token usage and better determinism.
 *
 * @example
 * ```typescript
 * import { getStatePrompt } from './prompts/index.js';
 *
 * const { prompt, filteredJourney, filteredEpic } = await getStatePrompt(
 *   VModelState.REQUIREMENTS,
 *   journeyFile,
 *   journeyContent,
 *   epicFile
 * );
 * ```
 */

// Export the new state-specific prompt system (primary API)
export { getStatePrompt, type StateVars, type BaseStateVars } from './states/index';

// Export context filters (for use by other modules)
export { filterJourneyContext } from './context/journey-context';
export { filterEpicContext, extractCurrentStoryTitle, getEpicSummary } from './context/epic-context';

// Export the old monolithic prompt (deprecated, for backward compatibility)
export { mainIterationPrompt } from './main-iteration';
export { geminiReviewPrompt } from './gemini-review';

// Export types for consumers who need them
export type {
  MainIterationVars,
  GeminiReviewVars,
  TemplateVariable,
} from './types';
