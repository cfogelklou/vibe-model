/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * SYSTEM_DESIGN state prompt
 */

import { RESEARCH_PHASE_INSTRUCTIONS, getResearchInstructions } from "../common/research-phase";

export interface SystemDesignVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + Architecture + Approaches + Epic Table
  SPEC_CONTENT?: string; // Design spec content
}

/**
 * Generate SYSTEM_DESIGN state prompt
 */
export function systemDesignPrompt(vars: SystemDesignVars): string {
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

## Your Task: SYSTEM_DESIGN Phase

You are in the **SYSTEM_DESIGN** phase. Define the high-level architecture and decompose the goal into Epics.

### Steps:

1. ${getResearchInstructions("SYSTEM_DESIGN")}

2. **Define high-level architecture**:
   - Identify major components and their relationships
   - Define system boundaries and interfaces
   - Consider data flow and control flow

3. **Decompose into Epics**:
   - Break down the goal into 2-6 Epics
   - Each Epic should be independently implementable
   - Define dependencies between Epics
   - Create Epic Decomposition table in journey.md

4. **Update Design Spec**:
   - Document architecture decisions
   - Record tradeoffs and rationale
   - Include Epic list with descriptions

5. **Update journey.md**:
   - Add architecture section
   - Create Epic Decomposition table
   - Update Meta section: \`- Previous State: SYSTEM_DESIGN\`

6. **Transition to SYSTEM_DESIGN_REVIEW**

### Epic Decomposition Format:

\`\`\`markdown
## Epic Decomposition

| Epic | Name | Description | Dependencies | Status |
|------|------|-------------|--------------|--------|
| E1 | Authentication | User login/logout | None | PENDING |
| E2 | Data Storage | Database layer | None | PENDING |
| E3 | API Layer | REST endpoints | E1, E2 | PENDING |
\`\`\`

### Important Rules:

- **CRITICAL**: Always check "## User Hints" and incorporate ALL user feedback
- Each Epic should be testable independently
- Epics should have clear completion criteria
- Document architectural tradeoffs in research notes

### State Transition:

When complete, update journey.md Meta section:
- Set \`- Previous State: SYSTEM_DESIGN\`
- Transition to SYSTEM_DESIGN_REVIEW
`;
}
