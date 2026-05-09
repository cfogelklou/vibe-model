/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * UNIT_TEST phase prompt for the milestone-based lifecycle.
 */

import type { MilestonePromptVars } from "../types";

/**
 * Generate UNIT_TEST phase prompt.
 * Input: milestone context (Status + Implementation Notes + Test Specifications).
 * Task: Run unit tests, verify they pass, fix failures.
 */
export function unitTestPhasePrompt(vars: MilestonePromptVars): string {
  return `You are an autonomous development agent working through a milestone lifecycle.
AI Provider: ${vars.AI_PROVIDER}

## Milestone File

${vars.MILESTONE_FILE}

## Context

${vars.MILESTONE_CONTENT}

## Your Task: UNIT_TEST Phase

Run and verify unit tests for milestone **#${vars.MILESTONE_ID}: ${vars.MILESTONE_NAME}**.

### Instructions:

1. **Run unit tests**:
   - Execute the project's unit test command.
   - Capture the full test output (pass/fail counts, failure details).

2. **Analyze results against Test Specifications**:
   - Verify each Test Specification (TS-N) is covered by at least one passing test.
   - For any failing tests, determine root cause:
     - **Test bug**: Fix the test.
     - **Implementation bug**: Fix the code.
     - **Design issue**: Note it in the Unit Test Results section.

3. **Fix failures**:
   - Fix all test failures.
   - Re-run the full test suite after each fix.
   - Do NOT skip or comment out failing tests.

4. **Document results**:
   - In the Unit Test Results section, record:
     - Total tests run, passed, failed.
     - Coverage of Test Specifications (which TS-N each test covers).
     - Any edge cases discovered during testing.

### Rules:

- All unit tests must pass before transitioning.
- Do not weaken tests to make them pass — fix the code instead.
- If a design flaw is found that blocks testing, note it and transition to DESIGN.

### State Transition:

When all unit tests pass, update the milestone file:
- Set \`- State:\` to \`INTEGRATION_TEST\`
- Set \`- Progress:\` to \`75%\`
- Update the Unit Test Results section with your findings
`;
}
