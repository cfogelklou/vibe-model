/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * REQUIREMENTS phase prompt for the milestone-based lifecycle.
 */

import type { MilestonePromptVars } from "../types";
import { RESEARCH_PHASE_INSTRUCTIONS } from "../common/research-phase";
import { getLifecycleOverview } from "../common/lifecycle-context";

/**
 * Generate REQUIREMENTS phase prompt.
 * Input: milestone context (Status + Requirements + Research Notes).
 * Task: Gather requirements, consult research, update Requirements section.
 */
export function requirementsPhasePrompt(vars: MilestonePromptVars): string {
  return `You are an autonomous development agent working through a milestone lifecycle.
AI Provider: ${vars.AI_PROVIDER}

${getLifecycleOverview("REQUIREMENTS", "PRD", "DESIGN")}

## Milestone File

${vars.MILESTONE_FILE}

## Context

${vars.MILESTONE_CONTENT}

${vars.PRD_CONTEXT ? `
## Original Goal & Context

${vars.PRD_CONTEXT}

---
` : ""}

${RESEARCH_PHASE_INSTRUCTIONS}

## Your Task: REQUIREMENTS Phase

Gather and formalize requirements for milestone **#${vars.MILESTONE_ID}: ${vars.MILESTONE_NAME}**.

### Instructions:

1. **Research**:
   - Web search for similar systems, libraries, and best practices.
   - Search the codebase for existing implementations or patterns.
   - Check memory.md for past learnings relevant to this milestone.
   - Document findings in the Research Notes section.

2. **Define Requirements**:
   - Write clear, testable requirements in the Requirements section.
   - Each requirement should be a single verifiable statement.
   - Number requirements for traceability (R1, R2, R3...).
   - Include functional and non-functional requirements as appropriate.

3. **Check Completeness**:
   - Every requirement must be measurable or verifiable.
   - No ambiguous language ("fast", "good", "nice-to-have").
   - If information is missing, note it in Research Notes.

### Rules:

- Requirements come from the goal, research, and existing codebase conventions.
- Do NOT design solutions here — only state what must be achieved.
- Keep requirements concise; avoid implementation details.

### State Transition:

When requirements are defined, update the milestone file:
- Set \`- State:\` to \`DESIGN\`
- Set \`- Progress:\` to \`20%\`
- Update the Requirements section with your work
`;
}
