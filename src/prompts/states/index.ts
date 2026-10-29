/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * State-specific prompt generators for the milestone-based lifecycle.
 */

// Export milestone phase prompt generators
export { prdPhasePrompt } from "./prd-phase";
export { requirementsPhasePrompt } from "./requirements-phase";
export { designPhasePrompt } from "./design-phase";
export { implementationPhasePrompt } from "./implementation-phase";
export { unitTestPhasePrompt } from "./unit-test-phase";
export { integrationTestPhasePrompt } from "./integration-test-phase";
export { deliveryPhasePrompt } from "./delivery-phase";
export { getReviewerPrompt, type ReviewerPromptVars } from "./review";
