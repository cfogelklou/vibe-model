/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * REQUIREMENTS state prompt
 */

import { RESEARCH_PHASE_INSTRUCTIONS, getResearchInstructions } from "../common/research-phase";
import { getStateTransitionInstructions } from "../common/state-transitions";

export interface RequirementsVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + User Hints + Recent Research
  SPEC_CONTENT?: string; // Design spec content if exists
}

/**
 * Generate REQUIREMENTS state prompt
 */
export function requirementsPrompt(vars: RequirementsVars): string {
  return `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to ./vibe-model/vibe-model.md for the complete V-Model protocol specification.

AI Provider: ${vars.AI_PROVIDER}

## Important File Paths

**Journey File:** ${vars.JOURNEY_FILE}
**Working Directory:** (provided separately)

You MUST edit the journey file directly to update state and progress.

## Your Journey

${vars.JOURNEY_CONTENT}

${vars.SPEC_CONTENT ? `## Current Spec\n${vars.SPEC_CONTENT}\n` : ""}

${RESEARCH_PHASE_INSTRUCTIONS}

## Your Task: REQUIREMENTS Phase

You are in the **REQUIREMENTS** phase. Execute the Spec Initiation Protocol (see vibe-model.md).

### Steps:

1. ${getResearchInstructions("REQUIREMENTS")}

2. **Check for existing spec**:
   - If \`${vars.JOURNEY_NAME}.spec.md\` exists, review it for completeness
   - Ensure User Requirements, System Requirements, and Acceptance Criteria are defined

3. **If spec does not exist or is incomplete**:
   - Ask clarifying questions to establish goals, metrics, and constraints
   - Add questions to journey.md under "## Pending Questions"
   - Transition to WAITING_FOR_USER for sign-off

4. **If spec exists and is complete**:
   - Review "## User Hints" section and incorporate ALL user feedback
   - Update the Meta section:
     * Change \`- Previous Phase: TBD\` to \`- Previous Phase: REQUIREMENTS\`
   - Transition to REQUIREMENTS_REVIEW

### Important Rules:

- **CRITICAL**: Always check the "## User Hints" section and incorporate ALL user feedback
- User hints represent explicit requirements or preferences that MUST be followed
- Requirements MUST be measurable and testable
- Document research in "## Research Notes > ### REQUIREMENTS Phase Research"

${getStateTransitionInstructions("journey", "REQUIREMENTS", "REQUIREMENTS_REVIEW")}
`;
}
