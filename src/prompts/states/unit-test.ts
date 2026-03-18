/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * UNIT_TEST state prompt
 */


export interface UnitTestVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + learnings
  EPIC_NAME: string; // Current epic name
  EPIC_NUMBER: string; // Current epic number
  CURRENT_STORY: string; // Current story title
  STORY_DESIGN: string; // Story design with acceptance criteria
}

/**
 * Generate UNIT_TEST state prompt
 */
export function unitTestPrompt(vars: UnitTestVars): string {
  return `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to vibe-model.md for the Master Protocol.

AI Provider: ${vars.AI_PROVIDER}

## Important File Paths

**Journey File:** ${vars.JOURNEY_FILE}
**Epic File:** (journey directory).${vars.JOURNEY_NAME}.journey.${vars.EPIC_NUMBER}.md
**Working Directory:** (provided separately)

## Your Journey

${vars.JOURNEY_CONTENT}

## Current Story: ${vars.CURRENT_STORY}

${vars.STORY_DESIGN}

## Your Task: UNIT_TEST Phase

You are in the **UNIT_TEST** phase for **Story: ${vars.CURRENT_STORY}**. Verify the specific module logic against the approved design.

### Steps:

1. **Run story-specific tests**:
   - Execute unit tests for the module/story
   - Analyze test results and logs
   - Check edge cases and error conditions

2. **Verify against acceptance criteria**:
   - Review the acceptance criteria in the story design
   - Ensure all criteria are met
   - Document any failures

3. **Update epic file Implementation Progress table**:
   - If tests pass: Set Tests to "PASS" with test count
   - If tests fail: Note the failure and transition back to MODULE_DESIGN

4. **Add test results to epic file**:
   - Document test coverage
   - Note any edge cases discovered
   - Record performance metrics if applicable

5. **Update journey.md Learnings Log** with test results

### State Transitions:

- **If tests pass**: Transition to INTEGRATION_TEST
- **If tests fail**:
  - Add learning to journey.md explaining the failure
  - Transition back to MODULE_DESIGN to fix the design
  - Note: Only transition back to IMPLEMENTATION if the issue is a simple bug

### Important Rules:

- Unit tests verify the specific module logic in isolation
- Focus on the story's acceptance criteria
- Document all failures with root cause analysis
- **Check "## User Hints"** for any user-specified test requirements

### Test Checklist:

- [ ] All acceptance criteria met
- [ ] Edge cases handled correctly
- [ ] Error conditions tested
- [ ] No regressions in existing functionality
`;
}
