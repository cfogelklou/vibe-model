/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * PRD phase prompt — generates a lean PRD with milestones from a goal.
 */

import type { MilestonePromptVars } from "../types";
import { getLifecycleOverview } from "../common/lifecycle-context";

/**
 * Generate PRD phase prompt.
 * Input: goal string (passed via MILESTONE_CONTENT or PRD_CONTENT).
 * Output: AI fills in tech stack, architecture overview, and milestone table.
 */
export function prdPhasePrompt(vars: MilestonePromptVars): string {
  return `You are an autonomous development agent working through a milestone lifecycle.
AI Provider: ${vars.AI_PROVIDER}

${getLifecycleOverview("PRD", null, "REQUIREMENTS")}

## Goal

${vars.PRD_CONTENT ?? vars.MILESTONE_CONTENT ?? "No goal provided."}

## Your Task: PRD Phase

Generate a lean Product Requirements Document (prd.md) for this goal.

### Instructions:

1. **Determine the tech stack** based on the goal and any existing project files.
   - Check for package.json, Cargo.toml, CMakeLists.txt, go.mod, etc.
   - Prefer the existing stack; only propose changes if the goal demands it.

2. **Write a concise Architecture Overview** (3-5 sentences):
   - Major components and their responsibilities.
   - How they interact (data flow, dependencies).
   - Key design decisions and rationale.

3. **Decompose the goal into milestones**:
   - Decompose into as many milestones as needed. Complex projects may have 50+.
   - Each milestone must be independently deliverable and produce a testable increment.
   - Each milestone should be completable in one agent session.
   - Order by dependency (earlier milestones are foundations).
   - Use concise names and one-line descriptions.

4. **Write prd.md** with these sections:
   - \`# PRD: {goal title}\`
   - \`## Tech Stack\` — language, framework, build tool, test runner.
   - \`## Architecture Overview\` — the 3-5 sentence summary.
   - \`## Milestones\` — a table with columns: ID | Name | Description | Status | Mode
     - **ID must be a plain integer** (1, 2, 3...) — do NOT prefix with letters like M1 or MS-1.
     - Status is always PENDING initially.
     - Mode is empty (defaults to project settings).

### Rules:

- Keep the PRD lean — no implementation details, no acceptance criteria here.
- Each milestone will go through full V-Model phases (REQUIREMENTS → DESIGN → IMPLEMENTATION → TEST).
- Milestones are ordered; later ones may depend on earlier ones.

### State Transition:

When prd.md is written, create the first milestone file:
- Set \`- State: REQUIREMENTS\`
- Set \`- Progress: 0%\`
- Leave all content sections empty.
`;
}
