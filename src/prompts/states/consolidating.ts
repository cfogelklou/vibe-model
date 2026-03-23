/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * CONSOLIDATING state prompt
 */


export interface ConsolidatingVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + Learnings
  SPEC_CONTENT?: string; // Design spec for finalization
}

/**
 * Generate CONSOLIDATING state prompt
 */
export function consolidatingPrompt(vars: ConsolidatingVars): string {
  return `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to vibe-model.md for the Master Protocol.

AI Provider: ${vars.AI_PROVIDER}

## Important File Paths

**Journey File:** ${vars.JOURNEY_FILE}
**Spec File:** ${vars.JOURNEY_NAME}.spec.md (if exists)
**Working Directory:** (provided separately)

## Your Journey

${vars.JOURNEY_CONTENT}

${vars.SPEC_CONTENT ? `## Design Spec\n${vars.SPEC_CONTENT}\n` : ""}

## Your Task: CONSOLIDATING Phase

You are in the **CONSOLIDATING** phase. The journey is complete - finalize documentation and prepare for delivery.

### Steps:

1. **Finalize the Design Spec** (if exists):
   - Ensure all sections are complete
   - Add final implementation summary
   - Document any deviations from the original design
   - Update version or date

2. **Update journey.md**:
   - Review and organize Learnings Log
   - Ensure all checkboxes are marked appropriately:
     * \`[x]\` for completed items
     * \`[-]\` for items not done (with explanation)
   - Add a completion summary

3. **Document the journey**:
   - Summarize the approach taken
   - Highlight key learnings and patterns used
   - Note any anti-patterns discovered
   - Record final system metrics

4. **Create final checkpoint**:
   - Ensure all changes are committed
   - Tag the final state

5. **Transition to COMPLETE**

### Completion Summary Template:

\`\`\`markdown
## Journey Complete

**Goal**: [Original goal]
**Approach**: [Brief description of approach taken]
**Duration**: [Start date to end date]

**Key Achievements**:
- [Achievement 1]
- [Achievement 2]
- [Achievement 3]

**Learnings**:
- [Key learning 1]
- [Key learning 2]

**Final Metrics**:
- Stories completed: N
- Tests passing: M
- Performance: [Any relevant metrics]
\`\`\`

### Important Rules:

- This is the final phase before COMPLETE
- Focus on documentation and cleanup
- Ensure future developers can understand the journey
- **Check "## User Hints"** for any final user requests

### State Transition:

When consolidation is complete:
- Update journey.md Meta section
- Transition to COMPLETE
`;
}
