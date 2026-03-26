/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * IMPLEMENTATION state prompt
 */

import { getStateTransitionInstructions } from "../common/state-transitions";
import { LEARNINGS_GUIDANCE } from "../common/learnings-guidance";
export interface ImplementationVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + recent learnings
  EPIC_CONTENT: string; // Full epic file
  EPIC_NAME: string; // Current epic name
  EPIC_NUMBER: string; // Current epic number (e.g., "E1")
  CURRENT_STORY: string; // Current story title
  STORY_DESIGN: string; // Story design from epic file
}

/**
 * Generate IMPLEMENTATION state prompt
 */
export function implementationPrompt(vars: ImplementationVars): string {
  return `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to ./vibe-model/vibe-model.md for the complete V-Model protocol specification.

AI Provider: ${vars.AI_PROVIDER}

## Important File Paths

**Journey File:** ${vars.JOURNEY_FILE}
**Epic File:** (journey directory).${vars.JOURNEY_NAME}.journey.${vars.EPIC_NUMBER}.md
**Working Directory:** (provided separately)

## Your Journey

${vars.JOURNEY_CONTENT}

## Current Story: ${vars.CURRENT_STORY}

${vars.STORY_DESIGN}

## Your Task: IMPLEMENTATION Phase

You are in the **IMPLEMENTATION** phase for **Story: ${vars.CURRENT_STORY}**. Code the story based on the approved MODULE_DESIGN.

### Steps:

1. **Review the Story Design**:
   - Understand the inputs, outputs, and state changes
   - Review error handling and edge cases
   - Check acceptance criteria

2. **Check for sub-tasks**:
   - If the Story decomposes into independent sub-tasks:
     * Document each sub-task with clear inputs/outputs
     * Mark which can be executed in parallel
     * Example format:
       \`\`\`
       ## Implementation Plan
       - [ ] Sub-task A (can run in parallel)
       - [ ] Sub-task B (can run in parallel)
       - [ ] Sub-task C (depends on A and B)
       \`\`\`
   - If the Story is simple/unitary: Implement directly

3. **Implement the code**:
   - Follow the approved design exactly
   - Add appropriate error handling
   - Include comments for complex logic

4. **Run basic guardrails**:
   - Build the project (run build command)
   - Fix any compilation errors
   - Verify no obvious runtime errors

5. **Update Implementation Progress table** in epic file:
   - Set Story Status to "IN_PROGRESS" if not already
   - Add implementation notes

${LEARNINGS_GUIDANCE}

6. **Check "## User Hints"** and incorporate ALL user feedback

### Important Rules:

- **CRITICAL**: Implement exactly one Story per iteration
- Follow the approved MODULE_DESIGN - don't deviate without revisiting design
- If you discover design issues during implementation:
  1. Note the issue in journey.md Learnings
  2. Transition back to MODULE_DESIGN to fix
- **Check "## User Hints"** and incorporate ALL user feedback

### Parallel Execution Note:

If you documented independent sub-tasks, you can note:
"These can be executed in parallel by sub-agents"
For dependent tasks, note: "Execute A before B, then C and D can run in parallel"

${getStateTransitionInstructions("epic", "IMPLEMENTATION", "UNIT_TEST")}
`;
}
