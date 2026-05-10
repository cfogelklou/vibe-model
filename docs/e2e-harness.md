# E2E Test Harness for vibe-model

## Overview

The E2E test harness validates that vibe-model works end-to-end by:
1. Creating a clean target project
2. Running vibe-model with a simple goal
3. Validating PRD creation, milestone files, state transitions, and the built artifact

## Test Script

**Location**: `scripts/e2e-test.sh`

### Usage

```bash
# Full E2E test (creates project, runs vibe-model, validates everything)
./scripts/e2e-test.sh

# Validate existing output (skip the run, just check files)
./scripts/e2e-test.sh --skip-run

# Verbose mode
./scripts/e2e-test.sh --verbose
```

### What It Tests

| Phase | Checks |
|-------|--------|
| **Build** | `bun run build` succeeds |
| **PRD** | File exists, has Goal, Tech Stack, Architecture Overview, Milestones table; sections are filled in; 2-8 milestones |
| **Milestone files** | All 5 files exist, each has Status, Requirements, Design, Implementation Notes, Unit Test Results, Learnings sections; Requirements section is filled |
| **Built artifact** | TypeScript source files exist, test files exist, `package.json` has test script, `bun test` passes, calculator actually works |
| **Git history** | Commits with "milestone" in message exist |
| **Status command** | Shows PRD and milestones table correctly |

### Test Goal

```
Build a CLI calculator in TypeScript using Bun that supports add, subtract,
multiply, and divide. Each operation must be a separate testable function.
Use Bun's built-in test runner (bun test). The calculator should read
expressions from stdin and print results.
```

This goal is ideal because:
- Self-contained (no external deps beyond Bun)
- Objectively verifiable (`bun test` and running the calculator)
- Small enough to complete in reasonable time
- Requires real code, real tests, real files

## E2E Test Results (2026-05-09)

### Run Summary

| Metric | Result |
|--------|--------|
| Milestones | 5 (Project setup, Arithmetic functions, Unit tests, CLI entrypoint, Integration & delivery) |
| Git commits | 21 milestone commits |
| Tests | 72 tests, 0 failures |
| Calculator | Works: `echo "add 2 3" \| bun run cli.ts` → `5` |
| Total cost | ~$8.50 in Claude API calls |

### Bugs Found and Fixed

#### 1. PRD phase never ran on fresh projects

**Symptom**: `vibe-model "goal"` printed "All milestones complete!" without running any AI.

**Root cause**: `milestoneLoop()` checked for active milestones before running the PRD phase. With an empty milestones table, `getActiveMilestone()` returned `null`, and the loop exited immediately.

**Fix**: Added a guard in `milestoneLoop()` that detects `milestones.length === 0` and runs a single PRD phase AI call before entering the milestone loop.

**File**: `src/milestone-loop.ts`

#### 2. Milestone IDs not parsed from PRD table

**Symptom**: PRD had milestones (`| M1 | Name | ...`) but `vibe-model status` showed none.

**Root cause**: AI generated milestone IDs with a prefix (`M1`, `M-1`) instead of plain integers. The parser regex `^\|\s*(\d+)\s*\|` didn't match `| M1 |`.

**Fix**: 
- Parser regex changed to `(?:M[-]?)?(\d+)` to strip optional prefix
- PRD phase prompt updated to explicitly state "ID must be a plain integer"

**Files**: `src/prd.ts`, `src/prompts/states/prd-phase.ts`

#### 3. State loop ran all phases on PRD sentinel milestone

**Symptom**: The initial fix used `runStateLoop()` for the PRD phase, which ran REQUIREMENTS → DESIGN → IMPLEMENTATION → etc. on the sentinel milestone file.

**Root cause**: `runStateLoop()` is designed to iterate through all states. The PRD phase only needs a single AI call.

**Fix**: Changed PRD phase from `runStateLoop()` to a direct `generatePrompt()` + `runAIWithPrompt()` call.

**File**: `src/milestone-loop.ts`

#### 4. E2E test script bash arithmetic bug

**Symptom**: Script exited after first `pass()` call.

**Root cause**: `((PASS_COUNT++))` returns exit code 1 when incrementing from 0 (bash evaluates `0` as falsy). With `set -e`, this kills the script.

**Fix**: Changed to `PASS_COUNT=$((PASS_COUNT + 1))`.

**File**: `scripts/e2e-test.sh`

#### 5. E2E test script path filtering bug

**Symptom**: `find` with `-not -path "*/vibe-model/*"` excluded all files because the parent repo directory is named `vibe-model`.

**Root cause**: The glob `*/vibe-model/*` matched any path segment containing `vibe-model`, including the parent directory name.

**Fix**: Changed to absolute path: `-not -path "$TARGET_DIR/vibe-model/*"`.

**File**: `scripts/e2e-test.sh`

### Observations

1. **AI skips Design section**: The AI sometimes skips filling in the Design section for simple milestones, leaving the placeholder text. This is an AI behavior issue, not a code bug.

2. **Timeout handling**: The test required multiple `vibe-model` invocations due to the 15-minute bash timeout. The no-argument invocation (`vibe-model --autonomous`) correctly resumed from the current state.

3. **Cost**: ~$8.50 for a 5-milestone calculator project. Each state transition is one Claude Code call (~$0.15-$0.80 depending on complexity).

## Future Improvements

- **CI integration**: Run E2E tests in GitHub Actions with API key secrets
- **Timeout handling**: Add `--max-cost` or `--max-time` limits to vibe-model
- **Retry logic**: Auto-retry failed AI calls with exponential backoff
- **Parallel milestones**: Run independent milestones concurrently
- **Snapshot testing**: Compare milestone file contents against expected templates
