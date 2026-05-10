/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * DELIVERY phase prompt for the milestone-based lifecycle.
 */

import type { MilestonePromptVars } from "../types";
import { getLifecycleOverview } from "../common/lifecycle-context";

/**
 * Generate DELIVERY phase prompt.
 * Input: milestone context (all sections summary).
 * Task: Create a PR, update Delivery section with PR link.
 */
export function deliveryPhasePrompt(vars: MilestonePromptVars): string {
  return `You are an autonomous development agent working through a milestone lifecycle.
AI Provider: ${vars.AI_PROVIDER}

${getLifecycleOverview("DELIVERY", "INTEGRATION_TEST", "COMPLETE")}

## Milestone File

${vars.MILESTONE_FILE}

## Context

${vars.MILESTONE_CONTENT}

${vars.MILESTONE_POSITION ? `
## Project Status

**Milestone position:** ${vars.MILESTONE_POSITION.current} of ${vars.MILESTONE_POSITION.total}
**Remaining milestones:** ${vars.MILESTONE_POSITION.total - vars.MILESTONE_POSITION.current}

${vars.MILESTONE_POSITION.isLast ? "⚠️ This is the FINAL milestone. Ensure complete system delivery." : "Additional milestones will build on this work."}

---
` : ""}

## Your Task: DELIVERY Phase

Deliver milestone **#${vars.MILESTONE_ID}: ${vars.MILESTONE_NAME}**.

### Instructions:

1. **Run the final build** (MANDATORY — do NOT skip):
   - Execute the project's actual build command (e.g., cmake --build build, make, bun build, etc.).
   - Verify the build completes with zero errors and zero warnings.
   - Verify all expected build artifacts (executables, libraries) actually exist on disk.
   - Run the full test suite and verify all tests pass.

2. **Review the milestone**:
   - Verify all requirements are satisfied (trace R-N to implementation).
   - Verify all test specifications passed (trace TS-N to test results).

3. **Create a pull request**:
   - Stage all changes for this milestone.
   - Write a clear commit message summarizing the milestone.
   - Create a PR with:
     - **Title**: milestone name and ID.
     - **Body**: summary of changes, test results, any known limitations.

4. **Update the Delivery section**:
   - Record the PR URL or reference.
   - List key deliverables (files added/modified).
   - Note any caveats or follow-up items.

5. **Update the Learnings section**:
   - Record any notable findings from this milestone.
   - Patterns to reuse, pitfalls to avoid, performance notes.

### Rules:

- Only deliver what was scoped in this milestone.
- If any requirement is not met, do NOT transition — fix it first.
- Keep the PR description concise and self-contained.

### State Transition:

When the PR is created, update the milestone file:
- Set \`- State:\` to \`COMPLETE\`
- Set \`- Progress:\` to \`100%\`
- Update the Delivery and Learnings sections with your work
`;
}
