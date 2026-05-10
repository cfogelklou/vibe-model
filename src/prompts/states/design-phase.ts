/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * DESIGN phase prompt for the milestone-based lifecycle.
 */

import type { MilestonePromptVars } from "../types";
import { RESEARCH_PHASE_INSTRUCTIONS } from "../common/research-phase";
import { getLifecycleOverview } from "../common/lifecycle-context";

/**
 * Generate DESIGN phase prompt.
 * Input: milestone context (Status + Requirements + Design + Research Notes).
 * Task: Create technical design AND write natural-language test specifications.
 */
export function designPhasePrompt(vars: MilestonePromptVars): string {
  return `You are an autonomous development agent working through a milestone lifecycle.
AI Provider: ${vars.AI_PROVIDER}

${getLifecycleOverview("DESIGN", "REQUIREMENTS", "IMPLEMENTATION")}

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

${RESEARCH_PHASE_INSTRUCTIONS}

## Your Task: DESIGN Phase

Create the technical design and test specifications for milestone **#${vars.MILESTONE_ID}: ${vars.MILESTONE_NAME}**.

### Instructions:

1. **Research** (if not already done):
   - Search for architectural patterns, existing APIs, and conventions.
   - Check the codebase for similar designs.
   - Document findings in the Research Notes section.

2. **Write the Design section**:
   - Describe the technical approach (components, data structures, algorithms).
   - Define interfaces and contracts between modules.
   - List key decisions and tradeoffs.
   - Reference specific requirements by number (R1, R2, ...) that each design element satisfies.

3. **Write the Test Specifications section**:
   - Define test cases in natural language, NOT code.
   - Each test spec maps to one or more requirements.
   - Include: what is tested, expected input/output, edge cases.
   - Cover both unit-level (isolated logic) and integration-level (component interaction) scenarios.
   - Use this format per spec:
     - **TS-N**: Description → Given [context], When [action], Then [expected result].

### Rules:

- Design must trace back to requirements. Every requirement must be covered.
- Test specs are natural language — no code, no framework specifics.
- Keep the design proportional to the milestone scope. Do not over-engineer.

### State Transition:

When design and test specs are written, update the milestone file:
- Set \`- State:\` to \`IMPLEMENTATION\`
- Set \`- Progress:\` to \`40%\`
- Update the Design and Test Specifications sections with your work
`;
}
