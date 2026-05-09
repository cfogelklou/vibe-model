/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * IMPLEMENTATION phase prompt for the milestone-based lifecycle.
 */

import type { MilestonePromptVars } from "../types";

/**
 * Generate IMPLEMENTATION phase prompt.
 * Input: milestone context (Status + Design + Test Specifications).
 * Task: Implement code that satisfies the design and test specs.
 */
export function implementationPhasePrompt(vars: MilestonePromptVars): string {
  return `You are an autonomous development agent working through a milestone lifecycle.
AI Provider: ${vars.AI_PROVIDER}

## Milestone File

${vars.MILESTONE_FILE}

## Context

${vars.MILESTONE_CONTENT}

## Your Task: IMPLEMENTATION Phase

Implement the code for milestone **#${vars.MILESTONE_ID}: ${vars.MILESTONE_NAME}**.

### Instructions:

1. **Review the Design and Test Specifications**:
   - Understand the required components, interfaces, and data flows.
   - Note the test specifications that must be satisfiable after implementation.

2. **Implement the code**:
   - Follow the approved design exactly.
   - Create or modify files in the project as needed.
   - Add appropriate error handling and edge-case coverage.
   - Include comments only for non-obvious logic.

3. **Write unit tests**:
   - Write tests that cover the Test Specifications.
   - Use the project's existing test framework.
   - Each test should map to one or more test specs (TS-N).

4. **Run the build**:
   - Ensure the project compiles/builds with no errors.
   - Run the unit tests and verify they pass.

5. **Document**:
   - In the Implementation Notes section, record:
     - Files created or modified (with brief purpose).
     - Any deviations from the design and why.
     - Any known limitations.

### Rules:

- Implement exactly what the design specifies. Do not add unscoped features.
- If you discover a design flaw, note it in Implementation Notes but continue implementing.
- Tests must pass before transitioning.

### State Transition:

When implementation is complete and unit tests pass, update the milestone file:
- Set \`- State:\` to \`UNIT_TEST\`
- Set \`- Progress:\` to \`60%\`
- Update the Implementation Notes section with your work
`;
}
