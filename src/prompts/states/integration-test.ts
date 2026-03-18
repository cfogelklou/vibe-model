/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * INTEGRATION_TEST state prompt
 */


export interface IntegrationTestVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + learnings
  EPIC_NAME: string; // Current epic name
  EPIC_NUMBER: string; // Current epic number
  CURRENT_STORY: string; // Current story title
  STORY_DESIGN: string; // Story design
  EPIC_CONTENT: string; // Full epic file for context
}

/**
 * Generate INTEGRATION_TEST state prompt
 */
export function integrationTestPrompt(vars: IntegrationTestVars): string {
  return `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to vibe-model.md for the Master Protocol.

AI Provider: ${vars.AI_PROVIDER}

## Important File Paths

**Journey File:** ${vars.JOURNEY_FILE}
**Epic File:** (journey directory).${vars.JOURNEY_NAME}.journey.${vars.EPIC_NUMBER}.md
**Working Directory:** (provided separately)

## Your Journey

${vars.JOURNEY_CONTENT}

## Current Epic: ${vars.EPIC_NAME} (${vars.EPIC_NUMBER})

${vars.EPIC_CONTENT}

## Your Task: INTEGRATION_TEST Phase

You are in the **INTEGRATION_TEST** phase for **Story: ${vars.CURRENT_STORY}**. Verify the new module interacts correctly with the existing system.

### Steps:

1. **Run system-wide tests**:
   - Execute integration tests or all_tests
   - Verify the new module integrates with existing components
   - Check for regressions in other parts of the system

2. **Verify system integration**:
   - Check that interfaces are called correctly
   - Verify data flows between components
   - Ensure no breaking changes to existing functionality

3. **Update epic file Implementation Progress table**:
   - If tests pass: Set Status to "COMPLETE"
   - If tests fail: Note the failure and reason

4. **Determine next action**:

   **If this was the last story in the epic:**
   - Mark the Epic as COMPLETE in journey.md Learnings Log
   - Format: "**Epic ${vars.EPIC_NUMBER} (${vars.EPIC_NAME}) COMPLETED**. All N stories implemented with X tests passing."
   - Check if there are more epics in the epic decomposition table
   - If yes: Transition to WAITING_FOR_USER (will auto-transition to next epic)
   - If no: Transition to SYSTEM_TEST

   **If there are more stories in this epic:**
   - Transition back to MODULE_DESIGN for the next story
   - Update the Implementation Progress table to reflect the next story

5. **Update journey.md Learnings Log** with integration results

### State Transitions:

- **If tests pass and more stories remain**: Transition to MODULE_DESIGN (next story)
- **If tests pass and epic is complete**:
  - If more epics exist: Transition to WAITING_FOR_USER
  - If all epics complete: Transition to SYSTEM_TEST
- **If tests fail**: Transition back to ARCH_DESIGN (integration issue)

### Important Rules:

- Integration tests verify system-wide interactions
- Check for regressions in existing functionality
- Document all integration issues with root cause analysis
- **Check "## User Hints"** for any user-specified test requirements
- Update Implementation Progress table accurately

### Integration Checklist:

- [ ] New module integrates with existing components
- [ ] No regressions in existing functionality
- [ ] System-wide tests pass
- [ ] Data flows correctly between components
- [ ] Interfaces are stable and well-defined
`;
}
