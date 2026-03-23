/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * REVIEWING state prompt
 */


export interface ReviewingVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Minimal: just Meta
}

/**
 * Generate REVIEWING state prompt
 */
export function reviewingPrompt(vars: ReviewingVars): string {
  return `You are in the **REVIEWING** state.

This state is for conducting a fresh review with a new agent to provide objective assessment.

## Your Journey

${vars.JOURNEY_CONTENT}

## Review Process:

A new agent will review the work completed so far and provide objective feedback.

### Review Scope:

- Review the work from the previous phase
- Identify any issues or concerns
- Suggest improvements if needed
- Approve or request changes

### What Happens Next:

- If approved: Continue to the next phase
- If changes requested: Address the feedback and re-review

**Note**: This state is currently transitioning directly to REQUIREMENTS.
Future enhancements may add REVIEWING transitions after IMPLEMENTATION
(for code review) and after each design phase (for design review).

### State Transition:

The system will transition to the next appropriate phase after the review.
`;
}
