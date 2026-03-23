/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * REFLECTING state prompt
 */


export interface ReflectingVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + Learnings + Checkpoints
}

/**
 * Generate REFLECTING state prompt
 */
export function reflectingPrompt(vars: ReflectingVars): string {
  return `You are in the **REFLECTING** state.

Take time to reflect on the journey progress and determine next steps.

## Your Journey

${vars.JOURNEY_CONTENT}

## Your Task: REFLECTING

Review the journey's progress and decide whether to:
1. Continue with the current approach
2. Pivot to a different approach
3. Make adjustments to the current path

### Reflection Questions:

1. **Progress Review**:
   - What has been accomplished so far?
   - Are we making meaningful progress toward the goal?
   - What blockers or issues have emerged?

2. **Approach Evaluation**:
   - Is the current approach working?
   - Are there better alternatives?
   - Should we pivot?

3. **Next Steps**:
   - What's the immediate next action?
   - Are there any dependencies to address?
   - Do we need user input?

### Steps:

1. **Review the Learnings Log** for patterns and issues
2. **Review Checkpoints** to understand progress
3. **Make a decision** on how to proceed
4. **Update journey.md** with reflection findings
5. **Transition** to the appropriate next state

### State Transitions:

- **If continuing**: Transition to the next V-Model phase
- **If pivoting**: Transition to PIVOTING
- **If blocked**: Transition to WAITING_FOR_USER
- **If complete**: Transition to CONSOLIDATING

### Important Rules:

- Be honest about progress and issues
- Don't continue with a clearly failing approach
- Document reflection findings in Learnings
- **Check "## User Hints"** for any guidance
`;
}
