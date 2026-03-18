/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * WAITING_FOR_USER state prompt
 */


export interface WaitingForUserVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + Pending Questions
}

/**
 * Generate WAITING_FOR_USER state prompt
 */
export function waitingForUserPrompt(vars: WaitingForUserVars): string {
  return `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to vibe-model.md for the Master Protocol.

AI Provider: ${vars.AI_PROVIDER}

## Important File Paths

**Journey File:** ${vars.JOURNEY_FILE}
**Working Directory:** (provided separately)

## Your Journey

${vars.JOURNEY_CONTENT}

## Your Task: WAITING_FOR_USER State

You are in the **WAITING_FOR_USER** state. The journey is awaiting user input or sign-off.

### Possible Scenarios:

1. **Pending Questions exist**: User needs to answer questions before you can proceed
   - Wait for user to provide hints
   - Process user input when received
   - Resume work based on user feedback

2. **Epic Complete**: Current epic is finished, ready to transition to next epic
   - System will auto-transition to the next epic's ARCH_DESIGN phase
   - No user action required

3. **No Real Questions**: In-progress epic with continuation expected
   - System may auto-resume implementation
   - Continue with current story work

### Your Role:

If there are genuine pending questions requiring user input:
- Wait for user to run \`vibe-model hint "message"\`
- Process the hint and incorporate user feedback
- Update journey.md with the user's response
- Continue with the next appropriate phase

If there are no pending questions (all checked or auto-continuation):
- The system will auto-transition appropriately
- No action needed from you

### Important Rules:

- **DO NOT** write content in WAITING_FOR_USER state
- Wait for user input or auto-transition
- Incorporate ALL user feedback when provided
- Update journey.md with user responses

### Note:

This state is primarily managed by the main loop logic.
If you see this prompt, the system is waiting for an external trigger
(user hint or epic completion) to continue.
`;
}
