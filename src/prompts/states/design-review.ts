/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * DESIGN_REVIEW state prompt
 */


export interface DesignReviewVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta (contains Previous Phase)
  CONSULT_GEMINI: boolean; // Whether Gemini consultation is enabled
}

/**
 * Generate DESIGN_REVIEW state prompt
 */
export function designReviewPrompt(vars: DesignReviewVars): string {
  if (!vars.CONSULT_GEMINI) {
    return `You are in **DESIGN_REVIEW** state with Gemini consultation disabled.

The system will auto-approve the design and transition to the next phase.
No action is required from you.

Wait for the system to process the auto-approval and transition.
`;
  }

  return `You are in **DESIGN_REVIEW** state.

The system is consulting Gemini for design review (including research quality).
This is an automatic state - do NOT write any content.

The system will:
1. Extract the design content from the previous phase
2. Extract research notes for review
3. Consult Gemini for feedback
4. Either:
   - **APPROVE**: Transition to the next phase
   - **ITERATE**: Return to the previous phase for revisions

Wait for the system to process the Gemini consultation and transition.
`;
}
