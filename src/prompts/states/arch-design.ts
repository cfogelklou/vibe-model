/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * ARCH_DESIGN state prompt
 */

import { RESEARCH_PHASE_INSTRUCTIONS, getResearchInstructions } from "../common/research-phase";

export interface ArchDesignVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + Current Epic Summary
  EPIC_CONTENT: string; // Full epic file
  EPIC_NAME: string; // Current epic name
  EPIC_NUMBER: string; // Current epic number (e.g., "E1")
}

/**
 * Generate ARCH_DESIGN state prompt
 */
export function archDesignPrompt(vars: ArchDesignVars): string {
  return `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to ./vibe-model/vibe-model.md for the complete V-Model protocol specification.

AI Provider: ${vars.AI_PROVIDER}

## Important File Paths

**Journey File:** ${vars.JOURNEY_FILE}
**Epic File:** (journey directory).${vars.JOURNEY_NAME}.journey.${vars.EPIC_NUMBER}.md
**Working Directory:** (provided separately)

You MUST edit the **epic file** for detailed work. Only summaries go in journey.md.

## Your Journey

${vars.JOURNEY_CONTENT}

## Current Epic: ${vars.EPIC_NAME} (${vars.EPIC_NUMBER})

${vars.EPIC_CONTENT}

${RESEARCH_PHASE_INSTRUCTIONS}

## Your Task: ARCH_DESIGN Phase

You are in the **ARCH_DESIGN** phase for **${vars.EPIC_NAME}**. Design the component-level architecture for this Epic.

### Steps:

1. ${getResearchInstructions("ARCH_DESIGN")}

2. **Decompose Epic into Stories**:
   - Break the Epic into 3-8 Stories
   - Each Story should be independently testable
   - Define dependencies between Stories

3. **Write to epic file** (NOT journey.md):
   - Epic Decomposition section with:
     * Story names and descriptions
     * Dependencies between stories
     * Implementation Progress table
   - Research notes in "### ARCH_DESIGN Phase Research" section

4. **Update journey.md with brief summary**:
\`\`\`markdown
### Epic ${vars.EPIC_NUMBER}: ${vars.EPIC_NAME}
**Status**: IN_PROGRESS
**Stories**: N stories planned
**Details**: See \`${vars.JOURNEY_NAME}.journey.${vars.EPIC_NUMBER}.md\`
\`\`\`

5. **Update journey.md Meta section**:
   - Set \`- Previous Phase: ARCH_DESIGN\`
   - Transition to ARCH_DESIGN_REVIEW

### Epic File Structure:

\`\`\`markdown
# Epic ${vars.EPIC_NUMBER}: ${vars.EPIC_NAME}

## Overview
[Brief epic description]

## Epic Decomposition

| Story | Name | Description | Dependencies | Phase | Status | Tests |
|-------|------|-------------|--------------|-------|--------|-------|
| S1 | Story Name | Description | None | ARCH_DESIGN | IN_PROGRESS | - |

## ARCH_DESIGN Phase Research
[Research notes specific to this epic]

## Stories

### Story S1: Story Name
**Description**: [Detailed description]
**Dependencies**: None
**Status**: IN_PROGRESS

#### Design Considerations
[Technical details]

#### Implementation Notes
[Any implementation guidance]

## Learnings
[Epic-specific learnings]
\`\`\`

### Important Rules:

- **CRITICAL**: Write detailed work to epic file, NOT journey.md
- Journey.md should only have epic summaries
- **Check "## User Hints"** and incorporate ALL user feedback
- Write epic-specific research to epic file's Research Notes
- Each Story should have clear acceptance criteria

### State Transition:

When complete, update journey.md Meta section:
- Set \`- Previous Phase: ARCH_DESIGN\`
- Transition to ARCH_DESIGN_REVIEW
`;
}
