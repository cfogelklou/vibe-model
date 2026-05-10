/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * IMPLEMENTATION phase prompt for the milestone-based lifecycle.
 */

import type { MilestonePromptVars } from "../types";
import { getLifecycleOverview } from "../common/lifecycle-context";

/**
 * Generate IMPLEMENTATION phase prompt.
 * Input: milestone context (Status + Design + Test Specifications).
 * Task: Implement code that satisfies the design and test specs.
 */
export function implementationPhasePrompt(vars: MilestonePromptVars): string {
  return `You are an autonomous development agent working through a milestone lifecycle.
AI Provider: ${vars.AI_PROVIDER}

${getLifecycleOverview("IMPLEMENTATION", "DESIGN", "UNIT_TEST")}

## Milestone File

${vars.MILESTONE_FILE}

## Context

${vars.MILESTONE_CONTENT}

${vars.PRD_CONTEXT ? `
## Original Goal & Context

${vars.PRD_CONTEXT}

---
` : ""}

${vars.MILESTONE_DEPENDENCIES ? `
## Milestone Dependencies

**Previous milestones completed:**
${vars.MILESTONE_DEPENDENCIES.previous.length > 0 ? vars.MILESTONE_DEPENDENCIES.previous.map(m => `- ${m}`).join('\n') : "None (this is the first milestone)"}

**Upcoming milestones:**
${vars.MILESTONE_DEPENDENCIES.next.length > 0 ? vars.MILESTONE_DEPENDENCIES.next.map(m => `- ${m}`).join('\n') : "None (this is the last milestone)"}

---
` : ""}

## Your Task: IMPLEMENTATION Phase

Implement the code for milestone **#${vars.MILESTONE_ID}: ${vars.MILESTONE_NAME}**.

### Instructions:

1. **Review the Design and Test Specifications**:
   - Understand the required components, interfaces, and data flows.
   - Note the test specifications that must be satisfiable after implementation.

### Traceability Reminder

Each test you write MUST map to a Test Specification (TS-N):
- Before writing code, verify: "Which TS-N does this satisfy?"
- Comment each test with: "// Satisfies TS-N: [description]"
- If you discover a TS-N is ambiguous, note it in Implementation Notes

2. **Implement the code**:
   - Follow the approved design exactly.
   - Create or modify files in the project as needed.
   - Add appropriate error handling and edge-case coverage.
   - Include comments only for non-obvious logic.

3. **Write unit tests**:
   - Write tests that cover the Test Specifications.
   - Use the project's existing test framework.
   - Each test should map to one or more test specs (TS-N).

4. **Run the build** (MANDATORY — do NOT skip):
   - Execute the project's actual build command (e.g., cmake --build build, make, bun build, etc.).
   - Ensure the project compiles/builds with zero errors.
   - If the build fails, fix the errors and rebuild. Repeat until clean.
   - Verify the expected build artifacts (executables, libraries) actually exist on disk after the build.
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
