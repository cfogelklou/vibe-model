/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Phase-specific design review state prompts
 *
 * Shared handler for all 4 review states:
 * - REQUIREMENTS_REVIEW
 * - SYSTEM_DESIGN_REVIEW
 * - ARCH_DESIGN_REVIEW
 * - MODULE_DESIGN_REVIEW
 */

import { VModelState } from "../../types";

export interface DesignReviewsVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string;
  CONSULT_GEMINI: boolean;
  PHASE: "REQUIREMENTS" | "SYSTEM_DESIGN" | "ARCH_DESIGN" | "MODULE_DESIGN";
}

/**
 * Extract phase from a review state name
 */
export function extractPhaseFromReviewState(state: VModelState): "REQUIREMENTS" | "SYSTEM_DESIGN" | "ARCH_DESIGN" | "MODULE_DESIGN" | null {
  switch (state) {
    case VModelState.REQUIREMENTS_REVIEW:
      return "REQUIREMENTS";
    case VModelState.SYSTEM_DESIGN_REVIEW:
      return "SYSTEM_DESIGN";
    case VModelState.ARCH_DESIGN_REVIEW:
      return "ARCH_DESIGN";
    case VModelState.MODULE_DESIGN_REVIEW:
      return "MODULE_DESIGN";
    default:
      return null;
  }
}

/**
 * Generate phase-specific design review prompt
 */
export function designReviewsPrompt(vars: DesignReviewsVars): string {
  const { PHASE, CONSULT_GEMINI } = vars;

  if (!CONSULT_GEMINI) {
    return `You are in **${PHASE}_REVIEW** state with Gemini consultation disabled.

The system will auto-approve the ${PHASE} design and transition to the next phase.
No action is required from you.

Wait for the system to process the auto-approval and transition.
`;
  }

  return `You are in **${PHASE}_REVIEW** state.

The system is consulting Gemini for ${PHASE} design review (including research quality).
This is an automatic state - do NOT write any content.

The system will:
1. Extract the ${PHASE} design content from the previous phase
2. Extract research notes for review
3. Consult Gemini for feedback
4. Either:
   - **APPROVE**: Transition to the next phase
   - **ITERATE**: Return to ${PHASE} for revisions

Wait for the system to process the Gemini consultation and transition.
`;
}
