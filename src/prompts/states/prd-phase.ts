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
   - Use at least 2 milestones.
   - Prefer fewer milestones. Simple projects (single CLI, single library) should be 2-3 milestones.
   - Only use many milestones (5+) for truly complex, multi-component systems.
   - Each milestone must be independently deliverable and produce a testable increment.
   - Each milestone will run through the full V-Model lifecycle (REQUIREMENTS → DESIGN → IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → DELIVERY).
   - Order by dependency (earlier milestones are foundations).
   - Use concise names and one-line descriptions.

4. **Write prd.md** with these sections in this exact order:
   - \`# PRD: {goal title}\`
   - \`## Goal\` — restate the goal in 1-3 sentences.
   - \`## Tech Stack\` — language, framework, build tool, test runner.
   - \`## Architecture Overview\` — the 3-5 sentence summary.
   - \`## Milestones\` — a markdown table with this exact header row:
     - \`| ID | Name | Description | Status | Mode |\`
     - followed by this separator row:
     - \`|----|------|-------------|--------|------|\`
     - **ID must be a plain integer** (1, 2, 3...) — do NOT prefix with letters like M1 or MS-1.
     - Status is always PENDING initially.
     - Mode is empty (defaults to project settings).

### Rules:

- Keep the PRD lean — no implementation details, no acceptance criteria here.
- Each milestone will go through full V-Model phases (REQUIREMENTS → DESIGN → IMPLEMENTATION → TEST).
- Milestones are ordered; later ones may depend on earlier ones.
- Preserve the markdown table format exactly so the orchestrator can parse milestone rows programmatically.

### LeanUX MVP Requirement:

**IMPORTANT:** vibe-model follows LeanUX principles. Milestone 1 must be a minimal viable product that:
  - Implements core user interaction
  - Includes basic testing infrastructure
  - Is deployable and testable
  - Provides immediate user value

Milestones are ordered by user value delivery. Earlier milestones provide working software to users as quickly as possible.

### Output:

Write **only** the file at: ${vars.PRD_FILE_PATH ?? "vibe-model/prd.md"}

Do NOT create any milestone files — the orchestrator will create them automatically from the milestones table.
Do NOT write a prd.md anywhere else — write to the exact path above.
`;
}
