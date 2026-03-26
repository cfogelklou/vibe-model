/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * MODULE_DESIGN state prompt
 */

import { RESEARCH_PHASE_INSTRUCTIONS, getResearchInstructions } from "../common/research-phase";

export interface ModuleDesignVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + Current Epic Summary
  EPIC_CONTENT: string; // Full epic file
  EPIC_NAME: string; // Current epic name
  EPIC_NUMBER: string; // Current epic number (e.g., "E1")
  CURRENT_STORY: string; // Current story title
  STORY_CONTENT: string; // Current story section from epic
}

/**
 * Generate MODULE_DESIGN state prompt
 */
export function moduleDesignPrompt(vars: ModuleDesignVars): string {
  return `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to ./vibe-model/vibe-model.md for the complete V-Model protocol specification.

AI Provider: ${vars.AI_PROVIDER}

## Important File Paths

**Journey File:** ${vars.JOURNEY_FILE}
**Epic File:** (journey directory).${vars.JOURNEY_NAME}.journey.${vars.EPIC_NUMBER}.md
**Working Directory:** (provided separately)

You MUST edit the **epic file** for detailed story work.

## Your Journey

${vars.JOURNEY_CONTENT}

## Current Epic: ${vars.EPIC_NAME} (${vars.EPIC_NUMBER})

${vars.EPIC_CONTENT}

${RESEARCH_PHASE_INSTRUCTIONS}

## Your Task: MODULE_DESIGN Phase

You are in the **MODULE_DESIGN** phase for **Story: ${vars.CURRENT_STORY}**. Design the detailed implementation for this Story.

### Steps:

1. ${getResearchInstructions("MODULE_DESIGN")}

2. **Design the Story** in the epic file:
   - Add detailed story design to the story's section
   - Technical details: function signatures, state changes, error handling
   - Define input/output interfaces
   - Consider edge cases and error conditions

3. **Write story-specific research** to epic file's "### MODULE_DESIGN Phase Research" section

4. **Update Implementation Progress table** in epic file:
   - Set Story phase to "MODULE_DESIGN"
   - Set Status to "IN_PROGRESS"

5. **Perform Design Review**:
   - Review the design for completeness
   - Check that all technical details are specified
   - Verify acceptance criteria are defined

6. **Update journey.md Meta section**:
   - Set \`- Previous Phase: MODULE_DESIGN\`
   - Transition to MODULE_DESIGN_REVIEW

### Story Design Template:

\`\`\`markdown
### Story S${vars.STORY_CONTENT.match(/S(\d+)/)?.[1] || "N"}: ${vars.CURRENT_STORY}
**Description**: [Brief description]
**Dependencies**: [List of dependent stories]
**Status**: IN_PROGRESS

#### Design

**Function/Module**: [Name]
**Inputs**: [Parameter types and descriptions]
**Outputs**: [Return type and description]
**State Changes**: [What state is modified]

**Algorithm**:
1. [Step 1]
2. [Step 2]
...

**Error Handling**:
- [Error condition 1] → [Recovery action]
- [Error condition 2] → [Recovery action]

**Edge Cases**:
- [Edge case 1]: [How it's handled]
- [Edge case 2]: [How it's handled]

#### Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

#### Test Plan
- [ ] Unit test: [Description]
- [ ] Integration test: [Description]
\`\`\`

### Important Rules:

- **CRITICAL**: Write detailed story design to epic file, NOT journey.md
- **Check "## User Hints"** and incorporate ALL user feedback
- Write story-specific research to epic file's Research Notes
- Update Implementation Progress table after design complete

### Implementation Progress Table Updates:

Update the epic file's Implementation Progress table at these trigger points:
- After completing story design: Set Phase to "MODULE_DESIGN", Status to "IN_PROGRESS"
- After passing MODULE_DESIGN_REVIEW: Set Phase to "IMPLEMENTATION"
- After passing UNIT_TEST: Set Tests to "PASS" with count
- After passing INTEGRATION_TEST: Set Status to "COMPLETE", move to next story

### State Transition:

When complete, update journey.md Meta section:
- Set \`- Previous Phase: MODULE_DESIGN\`
- Transition to MODULE_DESIGN_REVIEW
`;
}
