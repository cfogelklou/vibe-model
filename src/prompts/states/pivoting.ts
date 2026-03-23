/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * PIVOTING state prompt
 */


export interface PivotingVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + All Approaches
}

/**
 * Generate PIVOTING state prompt
 */
export function pivotingPrompt(vars: PivotingVars): string {
  return `You are in the **PIVOTING** state.

The current approach has been abandoned. You are selecting a new approach from the alternatives documented in the journey.

## Your Journey

${vars.JOURNEY_CONTENT}

## Your Task: PIVOTING

Review the Approaches section in your journey and select the next best approach.

### Steps:

1. **Review previous approaches**:
   - Understand why the current approach failed
   - Review the documented alternative approaches
   - Select the most promising alternative

2. **Update journey.md**:
   - Mark the failed approach as abandoned
   - Set the new approach as current
   - Document the pivot reason in Learnings

3. **Reset state**:
   - Transition back to REQUIREMENTS to begin with the new approach
   - Preserve learnings from the failed approach

### Important Rules:

- Learn from the failed approach
- Don't repeat the same mistakes
- Update the Approaches section to reflect the pivot
- **Check "## User Hints"** for any guidance on approach selection

### State Transition:

After selecting the new approach:
- Transition to REQUIREMENTS to restart with the new approach
`;
}
