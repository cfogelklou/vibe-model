/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Type-safe prompt system for V-Model.
 * Public API for generating prompts with compile-time type checking.
 */

// Export the milestone context filter
export { filterMilestoneContext } from './milestone-context';

// Export Gemini review prompt (used by ai-provider.ts)
export { geminiReviewPrompt } from './gemini-review';

// Export milestone state-specific prompt generators
export { prdPhasePrompt } from './states/prd-phase';
export { requirementsPhasePrompt } from './states/requirements-phase';
export { designPhasePrompt } from './states/design-phase';
export { implementationPhasePrompt } from './states/implementation-phase';
export { unitTestPhasePrompt } from './states/unit-test-phase';
export { integrationTestPhasePrompt } from './states/integration-test-phase';
export { deliveryPhasePrompt } from './states/delivery-phase';
export { getReviewerPrompt, type ReviewerPromptVars } from './states/review';

// Export types
export type {
  GeminiReviewVars,
  MilestonePromptVars,
} from './types';
