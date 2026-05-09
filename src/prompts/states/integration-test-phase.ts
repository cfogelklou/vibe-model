/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * INTEGRATION_TEST phase prompt for the milestone-based lifecycle.
 */

import type { MilestonePromptVars } from "../types";

/**
 * Generate INTEGRATION_TEST phase prompt.
 * Input: milestone context (Status + Design + Unit Test Results).
 * Task: Run integration tests, verify system behavior.
 */
export function integrationTestPhasePrompt(vars: MilestonePromptVars): string {
  return `You are an autonomous development agent working through a milestone lifecycle.
AI Provider: ${vars.AI_PROVIDER}

## Milestone File

${vars.MILESTONE_FILE}

## Context

${vars.MILESTONE_CONTENT}

## Your Task: INTEGRATION_TEST Phase

Run integration tests for milestone **#${vars.MILESTONE_ID}: ${vars.MILESTONE_NAME}**.

### Instructions:

1. **Run integration / system-wide tests**:
   - Execute the project's integration test command (or full test suite).
   - Verify the new code integrates with existing components.
   - Check for regressions in other parts of the system.

2. **Verify interactions**:
   - Interfaces between modules are called correctly.
   - Data flows match the design specification.
   - Error handling works across component boundaries.

3. **Fix failures**:
   - If integration tests fail, diagnose and fix.
   - Distinguish between:
     - **Integration issue**: Fix the glue code.
     - **Regression**: Fix the regression without breaking the new feature.
   - Re-run the full suite after each fix.

4. **Document results**:
   - In the Integration Test Results section, record:
     - Tests run, passed, failed.
     - Any regressions found and fixed.
     - Integration points verified.

### Rules:

- Integration tests verify cross-component behavior, not isolated logic.
- Do NOT merge or skip failing tests.
- If the milestone breaks existing functionality, fix it before transitioning.

### State Transition:

When integration tests pass, update the milestone file:
- Set \`- State:\` to \`DELIVERY\`
- Set \`- Progress:\` to \`90%\`
- Update the Integration Test Results section with your findings
`;
}
