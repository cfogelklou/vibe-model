# Plan: E2E Test Harness for vibe-model using Claude Agent SDK

## Context

vibe-model was just refactored (22 states → 9, milestone-based lifecycle). Zero real-world testing done — the AI runs the loop but nobody's validated that PRD creation, state transitions, file parsing, HIL pauses, or reviews actually work end-to-end. Goal: build a test harness using `@anthropic-ai/claude-agent-sdk` that spawns Claude Code to exercise vibe-model against a toy project, inspecting outputs after each phase.

## Target Design

### States (9, down from 22)
`PRD` | `REQUIREMENTS` | `DESIGN` | `IMPLEMENTATION` | `UNIT_TEST` | `INTEGRATION_TEST` | `DELIVERY` | `COMPLETE` | `WAITING_FOR_USER`

Transition: `PRD → REQUIREMENTS → DESIGN → IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → DELIVERY → (next milestone REQUIREMENTS | COMPLETE)`. WAITING_FOR_USER pauses at any transition.

### Lifecycle
1. **PRD phase** (outside loop) — `vibe-model "goal"` triggers one-shot AI PRD generation with milestones. Uses /grill-me skill if present. Human + sub-agents review.
2. **Milestone loop** — For each milestone: REQUIREMENTS → DESIGN → IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → DELIVERY
3. **COMPLETE** — All milestones done

### File Structure (hardcoded)
```
vibe-model/
├── prd.md                    # Lean PRD with milestones table
└── milestones/
    ├── 01-{name}.md          # TypeScript-generated template per milestone
    └── ...
```

### Key Decisions (from grilling session)
- PRD: Lean (goal, milestones list, tech stack, arch overview). Living doc, updated as milestones complete.
- Reviews: Sequential specialist sub-agents (arch, code, testability, UX). UX called even without Gemini. Each reviewer is a separate `claude --print` call with a specialist prompt.
- TDD: Spec-first — NL test cases written during DESIGN, implementation must satisfy them.
- Pivoting: Dropped. If stuck, human intervenes via HIL or hint.
- HIL: Default `--hil` (human-in-the-loop). Override per-milestone in PRD table. `--autonomous` to skip pauses.
- Delivery: PR only. Human merges.
- Git: Auto-commit after each state transition using `commitChanges()` from `checkpoint.ts`. No rollback system — keep checkpoint.ts for commit utility only.
- Memory: Learnings in milestone files, not separate memory.md.
- Research: Keep web search, codebase exploration, Gemini consultation.

### Delegation Summary

| Phase | Autonomy | Notes |
|-------|----------|-------|
| 1 Types & Constants | Full | Enum values, interfaces provided. Coexistence rule: keep old types until Phase 7. |
| 2 File Operations | Full | Templates provided below. Follow journey.ts patterns for parsing. |
| 3 State Machine | Full | Transition map provided. HIL write lives in Phase 5 loop, not here. |
| 4 Prompts | Scaffold + human review | Agent creates file structure and skeleton. Human reviews prompt text content. |
| 5 Main Loop | Partial | Sub-agent review execution model specified below. Commit strategy: reuse `commitChanges()`. |
| 6 CLI | Partial | Coexistence detection specified below. Goal arg → PRD creation. |
| 7 Cleanup | Full | File list provided. Delete + fix type errors. |

---

## Phase 1: Types & Constants

**Autonomy: Full.** Enum values and interfaces specified below.

**Files to CREATE:**
- `src/constants.ts` — Hardcoded path constants, state name strings, template strings
  - `VIBE_MODEL_DIR = "vibe-model"`
  - `PRD_FILE = "prd.md"`
  - `MILESTONES_DIR = "milestones"`
  - `MILESTONE_ID_FORMAT = "{NN}-{name}"` (zero-padded 2-digit ID)

**Files to MODIFY:**
- `src/types.ts` — Add alongside existing types (old types stay until Phase 7):

```typescript
export enum MilestoneState {
  PRD = "PRD",
  REQUIREMENTS = "REQUIREMENTS",
  DESIGN = "DESIGN",
  IMPLEMENTATION = "IMPLEMENTATION",
  UNIT_TEST = "UNIT_TEST",
  INTEGRATION_TEST = "INTEGRATION_TEST",
  DELIVERY = "DELIVERY",
  COMPLETE = "COMPLETE",
  WAITING_FOR_USER = "WAITING_FOR_USER",
}

export interface Milestone {
  id: number;
  name: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETE";
  modeOverride?: "hil" | "autonomous" | null;
}

export interface PRDFile {
  goal: string;
  techStack: string;
  architectureOverview: string;
  milestones: Milestone[];
}

export interface MilestoneFile {
  id: number;
  name: string;
  state: MilestoneState;
  progress: number;
  started: string;
  pendingTransition?: MilestoneState;  // For WAITING_FOR_USER resume
  requirements: string;
  design: string;
  testSpecifications: string;
  implementationNotes: string;
  unitTestResults: string;
  integrationTestResults: string;
  delivery: string;
  learnings: string;
  researchNotes: string;  // Per-milestone research
}

export interface ReviewResult {
  pass: boolean;
  reviewer: "architecture" | "code" | "testability" | "ux";
  findings: string[];
}

export interface SubAgentReview {
  results: ReviewResult[];
  overallPass: boolean;
}
```

- Update `Config` interface — add fields, keep `executionMode` until Phase 7:
```typescript
// Add to Config:
hilMode: boolean;       // default: true
reviewEnabled: boolean; // default: false
autonomous: boolean;    // default: false (convenience: autonomous = !hilMode)
```

**Verification:** `bun run typecheck` passes. Existing tests pass.

---

## Phase 2: File Operations — PRD & Milestones

**Autonomy: Full.** Templates provided. Follow `journey.ts` patterns for regex parsing (`sedInplace` from `file-utils.ts`, read-modify-write).

**Files to CREATE:**
- `src/prd.ts` — TypeScript generates PRD template, parses milestones table
- `src/milestone.ts` — TypeScript generates milestone template, section CRUD

**PRD template** (TypeScript-generated):
```markdown
# PRD: {goal}

## Goal
{goal}

## Tech Stack
*(To be defined during PRD phase)*

## Architecture Overview
*(To be defined during PRD phase)*

## Milestones

| ID | Name | Description | Status | Mode |
|----|------|-------------|--------|------|
```

**Milestone template** (TypeScript-generated):
```markdown
# Milestone {id}: {name}

## Status
- State: REQUIREMENTS
- Progress: 0%
- Started: {timestamp}
- Pending Transition: NONE

## Requirements
*(To be filled during REQUIREMENTS phase)*

## Design
*(To be filled during DESIGN phase)*

### Test Specifications
*(NL test cases written during DESIGN)*

## Research Notes
*(Research findings for this milestone)*

## Implementation Notes
*(To be filled during IMPLEMENTATION phase)*

## Unit Test Results
*(To be filled during UNIT_TEST phase)*

## Integration Test Results
*(To be filled during INTEGRATION_TEST phase)*

## Delivery
*(PR link, to be filled during DELIVERY phase)*

## Learnings
*(Replaces memory.md — learnings from this milestone)*
```

**Key functions:**
- `parseMilestonesTable(content: string): Milestone[]` — Regex parse markdown table rows. Extract ID (number), name, description, status, mode. Skip header/separator lines. Handle empty table gracefully (return `[]`).
- `setMilestoneStatus(prdPath: string, id: number, status: string)` — Update specific row in table
- `createMilestoneFile(id: number, name: string): string` — Generate template, write to `milestones/{NN}-{sanitized-name}.md`
- `setMilestoneState(path: string, state: MilestoneState)` — Update `State:` line in Status section
- `setPendingTransition(path: string, state: MilestoneState)` — Update `Pending Transition:` line
- `updateSection(path: string, sectionName: string, content: string)` — Replace section between `## {name}` and next `##`
- Reuse `sanitizeJourneyName()` logic — extract to shared `sanitizeName()` in `file-utils.ts`

**Verification:** Unit tests for template generation, markdown table parsing, section updates, edge cases (empty table, malformed rows).

---

## Phase 3: State Machine

**Autonomy: Full.** Transition map provided below. HIL write logic lives in Phase 5 (milestone-loop), not here.

**Files to CREATE:**
- `src/milestone-state-machine.ts`

**Transition map** (hardcoded Record):
```typescript
const transitions: Record<MilestoneState, MilestoneState | null> = {
  [MilestoneState.PRD]: MilestoneState.REQUIREMENTS,  // or COMPLETE if no milestones (checked by caller)
  [MilestoneState.REQUIREMENTS]: MilestoneState.DESIGN,
  [MilestoneState.DESIGN]: MilestoneState.IMPLEMENTATION,
  [MilestoneState.IMPLEMENTATION]: MilestoneState.UNIT_TEST,
  [MilestoneState.UNIT_TEST]: MilestoneState.INTEGRATION_TEST,
  [MilestoneState.INTEGRATION_TEST]: MilestoneState.DELIVERY,
  [MilestoneState.DELIVERY]: null,  // Handled by caller: next milestone or COMPLETE
  [MilestoneState.WAITING_FOR_USER]: null,  // Resolved by caller from pendingTransition
  [MilestoneState.COMPLETE]: null,
};
```

**Functions:**
- `getNextMilestoneState(current: MilestoneState): MilestoneState | null` — Lookup in map
- `shouldRunReview(config: Config): boolean` — `config.reviewEnabled`
- `shouldPauseForHIL(config: Config, milestoneModeOverride?: string | null): boolean` — Per-milestone override takes precedence. Returns true when HIL mode active.
- `isTerminalState(state: MilestoneState): boolean` — state === COMPLETE
- `isLastMilestone(prd: PRDFile): boolean` — Check if all milestones COMPLETE or current is last non-complete

**Files to MODIFY:**
- `src/config.ts` — Add to defaults: `hilMode: true`, `reviewEnabled: false`, `autonomous: false`. Parse env vars `HIL_MODE`, `REVIEW_ENABLED`. Keep `ExecutionMode` parsing until Phase 7.

**Verification:** Unit tests for all 9 transition paths, HIL pause logic with mode overrides, terminal state detection, last milestone detection.

---

## Phase 4: Prompt System

**Autonomy: Scaffold + human review.** Agent creates file structure, imports, variable interfaces, and prompt skeleton. Human reviews actual prompt text content for behavioral correctness.

**Files to CREATE** (replacing 18 prompt files with 8 + 1 context filter):
- `src/prompts/states/prd-phase.ts`
- `src/prompts/states/requirements-phase.ts`
- `src/prompts/states/design-phase.ts`
- `src/prompts/states/implementation-phase.ts`
- `src/prompts/states/unit-test-phase.ts`
- `src/prompts/states/integration-test-phase.ts`
- `src/prompts/states/delivery-phase.ts`
- `src/prompts/states/review.ts`
- `src/prompts/milestone-context.ts` — Replaces `context/journey-context.ts` + `context/epic-context.ts`

**Files to MODIFY:**
- `src/prompts/index.ts` — Add new exports alongside old
- `src/prompts/types.ts` — Add `MilestonePromptVars` interface

**Context filtering** (milestone-context.ts):
| State | Sections included |
|-------|------------------|
| PRD | (none — uses prd.md) |
| REQUIREMENTS | Status + Requirements + Research Notes |
| DESIGN | Status + Requirements + Design + Research Notes |
| IMPLEMENTATION | Status + Design + Test Specs |
| UNIT_TEST | Status + Implementation Notes + Test Specs |
| INTEGRATION_TEST | Status + Design + Unit Test Results |
| DELIVERY | Status + all sections (summary) |

**Prompt structure** (each prompt follows this pattern):
```
Role: autonomous dev agent using milestone lifecycle
AI Provider: {provider}

## Milestone File
{milestone_file_path}

## Context
{filtered milestone content}

## Task: {STATE} Phase
{state-specific instructions — 10-20 lines}

## State Transition
{how to advance to next state}
```

**Prompt content guidance** (for human review):
- No file templates in prompts (TypeScript generates those)
- Research instructions: reuse from `common/research-phase.ts`
- Each prompt tells AI what to READ (milestone file sections) and what to WRITE (which sections to update)
- State transition: explicit instruction to update `State:` field in milestone file
- TDD flow: DESIGN prompt must instruct AI to write NL test cases; IMPLEMENTATION prompt must instruct AI to write code that satisfies test specs

**Files KEPT unchanged:**
- `src/prompts/common/research-phase.ts`
- `src/prompts/gemini-review.ts`

**Verification:** Unit tests for prompt variable substitution, context filtering per state.

---

## Phase 5: Main Loop

**Autonomy: Partial.** Sub-agent review execution model specified below.

**Files to CREATE:**
- `src/milestone-loop.ts`

**Files to MODIFY:**
- `src/ai-provider.ts` — Add `runReview(type: ReviewerType, content: string): Promise<ReviewResult>`. Implementation: spawn separate `claude --print` call with specialist prompt for each reviewer type. Four calls, sequential. Each call gets the milestone content + a reviewer-specific system prompt.

**Loop flow:**
```
milestoneLoop(prdPath):
  prd = readPRD(prdPath)
  while activeMilestone = getActiveMilestone(prd):
    milestoneFile = createOrGetMilestoneFile(activeMilestone)
    state = getMilestoneState(milestoneFile)
    if state == COMPLETE: continue to next milestone

    while state != COMPLETE:
      if state == WAITING_FOR_USER:
        exit loop (user resumes with `continue` command)

      // Run main phase
      prompt = generatePrompt(state, milestoneFile)
      exitCode = runAIWithPrompt(prompt)
      commitChanges("milestone {id}: {state} complete")

      // Optional review sub-phase
      if shouldRunReview(config):
        reviewResult = handleReviewSubPhase(state, milestoneFile)
        if !reviewResult.overallPass:
          continue (stay in same state, AI re-works)

      // HIL pause
      nextState = getNextMilestoneState(state)
      if shouldPauseForHIL(config, milestone.modeOverride):
        setPendingTransition(milestoneFile, nextState)
        setMilestoneState(milestoneFile, WAITING_FOR_USER)
        exit loop
      else:
        setMilestoneState(milestoneFile, nextState)

      state = nextState

    // Milestone complete
    setMilestoneStatus(prdPath, activeMilestone.id, "COMPLETE")
    commitChanges("milestone {id}: delivered")
    prd = readPRD(prdPath) // Refresh

  // All milestones done
  log("All milestones complete")
```

**Sub-agent review execution model:**
```
handleReviewSubPhase(state, milestoneFile):
  content = readMilestoneFile(milestoneFile)
  results = []
  for reviewer in ["architecture", "code", "testability", "ux"]:
    result = runReview(reviewer, content)  // Separate claude --print call
    results.push(result)
    if !result.pass: break  // Stop on first failure
  return { results, overallPass: results.all(r => r.pass) }
```

- `runReview()` spawns: `claude --print --system-prompt "You are a {reviewer} reviewer..." < content`
- Each reviewer prompt is stored in `src/prompts/states/review.ts` (specialist prompt variants)
- Review results written to milestone file (append to relevant section)

**Auto-commit:** Reuse `commitChanges()` from `checkpoint.ts` (keep this file for commit utility only).

**Milestone boundary:** On DELIVERY → next milestone, commit with `"milestone {N} delivered, starting {N+1}"`.

**Verification:** Unit tests with mocked AI provider. Test: state transitions, HIL pause + resume, review pass/fail branching, milestone-to-milestone handoff.

---

## Phase 6: CLI Integration

**Autonomy: Partial.** Coexistence detection specified below.

**Files to MODIFY:**
- `src/index.ts`

**Coexistence detection logic:**
```typescript
async function detectMode(projectDir: string): Promise<"old" | "new" | "fresh"> {
  const vibeDir = path.join(projectDir, "vibe-model");
  const hasJourney = existsSync(path.join(vibeDir, "journey"));
  const hasPRD = existsSync(path.join(vibeDir, "prd.md"));

  if (hasPRD) return "new";              // PRD exists → new system
  if (hasJourney) return "old";           // Journey dir exists → old system
  return "fresh";                         // Neither → create new system
}
```

Precedence: PRD wins over journey if both exist (migration scenario).

**New CLI flags:**
- `--autonomous` — Set `autonomous: true, hilMode: false` (skip all HIL pauses)
- `--review` — Set `reviewEnabled: true` (enable sub-agent reviews)
- Default behavior: `--hil` implied (HIL mode active)

**New commands:**
- `vibe-model continue` — Resume from WAITING_FOR_USER. Reads pendingTransition from milestone file, sets that state, runs loop.
- `vibe-model status` — If new system: show PRD milestones table + active milestone state. If old: existing behavior.

**Modified commands:**
- `vibe-model "goal"` — If fresh: create PRD, run PRD phase (AI generates lean PRD with milestones). If old: existing behavior.
- `vibe-model hint <msg>` — If new: append to active milestone Learnings. If old: existing behavior.

**Removed commands** (Phase 6 removes from help, Phase 7 removes code):
- `pivot`, `reflect`, `archive`, `rollback`, `list-checkpoints`

**`ensureDirectories` update:**
```typescript
// New system: creates milestones/
// Old system: creates journey/, prototypes/
// Both: creates vibe-model/
```

**Verification:** Integration test: `vibe-model "Build timer PWA"` → creates PRD + first milestone file. `vibe-model continue` resumes. `vibe-model status` shows progress. Old journey files still work.

---

## Phase 7: Cleanup

**Autonomy: Full.** Delete files, fix type errors, run typecheck.

**Files to DELETE:**
- `src/journey.ts`
- `src/journey-reader.ts`
- `src/epic-archival.ts`
- `src/design-spec.ts`
- `src/state-machine.ts`
- `src/main-loop.ts`
- `src/prompts/main-iteration.ts`
- `src/prompts/context/journey-context.ts`
- `src/prompts/context/epic-context.ts`
- All old state prompt files in `src/prompts/states/` (requirements.ts, system-design.ts, arch-design.ts, module-design.ts, implementation.ts, prototyping.ts, unit-test.ts, integration-test.ts, system-test.ts, acceptance-test.ts, consolidating.ts, waiting-for-user.ts, design-reviews.ts, reflecting.ts, pivoting.ts, archiving.ts, reviewing.ts)

**Files to MODIFY:**
- `src/types.ts` — Remove `VModelState`, `ExecutionMode`, `Journey`, `Epic`, `Checkpoint` interfaces
- `src/config.ts` — Remove `ExecutionMode` parsing, remove `executionMode` from `Config` interface
- `src/index.ts` — Remove old system imports, old commands, old mode detection. Simplify to new-only.
- `src/prompts/states/index.ts` — Export only 8 new prompt functions
- `src/prompts/index.ts` — Remove old exports
- `src/prompts/types.ts` — Remove old var types
- `src/checkpoint.ts` — Strip rollback functions, keep only `commitChanges()` (rename file? or keep name)
- `src/__tests__/` — Replace journey.test.ts with milestone.test.ts + prd.test.ts. Replace state-machine.test.ts with milestone-state-machine.test.ts.

**Expected reduction:** ~7,128 → ~3,500 lines. Prompts: ~2,600 → ~800 lines.

---

## Dependency Graph

```
Phase 1 (types/constants)
    |
    +--→ Phase 2 (prd.ts + milestone.ts)
    |         |
    +--→ Phase 3 (state machine) --+
    |                               |
    +--→ Phase 4 (prompts) --------+
                                    |
                                    v
                              Phase 5 (milestone loop)
                                    |
                                    v
                              Phase 6 (CLI)
                                    |
                                    v
                              Phase 7 (cleanup)
```

Phases 2-4 can run in parallel after Phase 1.

## Verification (End-to-End)

```bash
bun run build && bun run typecheck && bun test

# Integration test
cd example/src
../../bin/vibe-model --autonomous "Build a timer PWA with start/stop/reset"

# Verify
ls vibe-model/prd.md
ls vibe-model/milestones/01-*.md
../../bin/vibe-model status
../../bin/vibe-model hint "use requestAnimationFrame"

./scripts/sanity_checks.sh
```
