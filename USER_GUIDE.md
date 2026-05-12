# AI V-Model User Guide

**Complete user manual for the autonomous R&D agent using milestone-based development lifecycle.**

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Commands](#commands)
- [Configuration](#configuration)
- [Milestone Lifecycle](#milestone-lifecycle)
- [PRD Files](#prd-files)
- [Milestone Files](#milestone-files)
- [Sub-Agent Reviews](#sub-agent-reviews)
- [Human-in-the-Loop](#human-in-the-loop)
- [E2E Testing](#e2e-testing)
- [Debugging with AI](#debugging-with-ai)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Build vibe-model and optionally install it on PATH
cd vibe-model && bun install && bun run build
cp bin/vibe-model ~/.bin/

# 3. Create a target project
mkdir /tmp/my-project && cd /tmp/my-project
git init && git config user.name "You" && git config user.email "you@example.com"
echo "# My Project" > README.md && git add . && git commit -m "init"

# 4. Run vibe-model from inside the target repo
vibe-model --autonomous "Build a CLI calculator in TypeScript using Bun"
# or: /path/to/vibe-model/bin/vibe-model --autonomous "Build a CLI calculator in TypeScript using Bun"

# 5. Check results
ls vibe-model/prd.md
ls vibe-model/milestones/
vibe-model status
```

---

## Installation

### Prerequisites

- **Bun** runtime (https://bun.sh)
- **Git**
- **Claude Code CLI** or **Gemini CLI** (installed and authenticated)

### Building

```bash
cd vibe-model
bun install
bun run build      # Output: standalone bin/vibe-model executable
```

### Global Install (Optional)

```bash
cp bin/vibe-model ~/.bin/
# or another directory on your PATH
```

### Verify Installation

```bash
./bin/vibe-model --help
vibe-model --help
```

---

## Basic Usage

### Starting a New Project

```bash
cd /path/to/your/project

# Autonomous mode (no human-in-the-loop pauses)
vibe-model --autonomous "your goal here"

# HIL mode (pauses between states for review)
vibe-model "your goal here"

# Verbose mode (shows AI prompts and costs)
vibe-model -v --autonomous "your goal here"
```

Vibe-model detects the nearest git root from your current working directory and uses that as the target project. If that is not what you want, pass `--project-dir` explicitly.

### Continuing After Interruption

If vibe-model is interrupted (Ctrl+C, timeout, crash), it can resume:

```bash
# Resume from current state
vibe-model --autonomous

# Or explicitly continue from WAITING_FOR_USER
vibe-model continue
```

### Checking Status

```bash
vibe-model status
```

Shows the PRD goal, tech stack, architecture, milestones table, and active milestone state.

---

## Commands

| Command | Description |
|--------|-------------|
| `vibe-model "goal"` | Start a new project with this goal |
| `vibe-model` | Continue the active milestone loop |
| `vibe-model continue` | Resume from WAITING_FOR_USER state |
| `vibe-model status` | Show PRD and milestone status |
| `vibe-model hint "msg"` | Add a hint to the active milestone |

### CLI Options

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Enable verbose logging (shows AI prompts) |
| `-g, --gemini` | Use Gemini as primary AI provider |
| `--autonomous` | Skip all human-in-the-loop pauses |
| `--review` | Enable sub-agent reviews after each phase |
| `--no-consult` | Disable Gemini consultation |
| `--project-dir <path>` | Specify project directory |
| `--config <path>` | Specify config file |
| `--no-push` | Disable auto-push |
| `--commit-interval <n>` | Commit every N iterations (default: 1) |

---

## Configuration

### Environment Variables

```bash
export AI_PROVIDER="claude"        # Primary AI provider (claude|gemini)
export MAX_ITERATIONS="100"        # Maximum loop iterations
export CONSULT_GEMINI="true"       # Enable Gemini design review
export HIL_MODE="false"            # Disable human-in-the-loop (= --autonomous)
export REVIEW_ENABLED="true"       # Enable sub-agent reviews (= --review)
export VERBOSE="true"              # Verbose output (= -v)
```

### Config File (.vibe-modelrc)

Create `.vibe-modelrc` in your project directory or home directory:

```json
{
  "aiProvider": "claude",
  "maxIterations": 100,
  "consultGemini": true,
  "hilMode": true,
  "reviewEnabled": false,
  "autonomous": false,
  "verbose": false,
  "noPush": false,
  "commitInterval": 1
}
```

### Configuration Priority

CLI arguments → Environment variables → Config file → Defaults

---

## Milestone Lifecycle

### States

| State | Description | Progress |
|:------|:-------------|:---------|
| `PRD` | Generate PRD with milestones (one-shot) | 0% |
| `REQUIREMENTS` | Formalize requirements for the milestone | 10% |
| `DESIGN` | Technical design and test specifications | 25% |
| `IMPLEMENTATION` | Code the milestone | 50% |
| `UNIT_TEST` | Verify module-level logic | 70% |
| `INTEGRATION_TEST` | Verify cross-component behavior | 85% |
| `DELIVERY` | Create PR, finalize documentation | 95% |
| `COMPLETE` | Milestone done | 100% |
| `WAITING_FOR_USER` | Paused for human input | — |

### Transition Flow

```
PRD (one-shot)
  → REQUIREMENTS → DESIGN → IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → DELIVERY
  → (next milestone: REQUIREMENTS → ... → DELIVERY)
  → ... → COMPLETE
```

`WAITING_FOR_USER` can pause at any transition when HIL mode is active.

### How It Works

1. **PRD Phase**: AI generates a lean PRD with tech stack, architecture overview, and a milestones table. Each milestone is independently deliverable and runs through the full V-Model lifecycle.

2. **PRD Review Loop**: Specialist reviewers (UX, Architecture, Testability) evaluate the PRD quality. The AI author addresses findings in up to 5 iterations. LeanUX MVP is enforced: Milestone 1 must be a minimal viable product with testing infrastructure.

3. **Milestone Loop**: For each milestone:
   - Create a milestone tracking file
   - Run through REQUIREMENTS → DESIGN → IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → DELIVERY
   - Each state runs a single AI call with a phase-specific prompt
   - Receive PRD context (goal, tech stack, architecture) and milestone dependencies (previous deliverables, upcoming milestones)
   - Auto-commit to git after each state transition
   - Auto-commit skips common generated artifacts such as `node_modules/`, `dist/`, `coverage/`, `.vite/`, `.vitest/`, and `*.tsbuildinfo`
   - If `--review` is enabled, sub-agent reviews run after each state
   - After DELIVERY, cache delivery summary for context injection

4. **Completion**: When all milestones are COMPLETE, the project is done.

---

## PRD Files

The PRD (`vibe-model/prd.md`) is a lean document generated by the AI:

```markdown
# PRD: {goal title}

## Goal
{goal}

## Tech Stack
{language, framework, build tool, test runner}

## Architecture Overview
{3-5 sentence summary}

## Milestones
| ID | Name | Description | Status | Mode |
|----|------|-------------|--------|------|
| 1  | ...  | ...         | PENDING|      |
| 2  | ...  | ...         | PENDING|      |
```

### Milestone ID Format

IDs must be **plain integers** (1, 2, 3...). The parser handles prefixed formats (M1, M-1) as a fallback.

### Status Values

| Status | Meaning |
|--------|---------|
| `PENDING` | Not started yet |
| `IN_PROGRESS` | Currently being worked on |
| `COMPLETE` | Finished and delivered |

### Mode Column

Optional per-milestone override:
- Empty: Use project default
- `hil`: Force human-in-the-loop for this milestone
- `autonomous`: Skip HIL for this milestone

---

## PRD Review

After PRD generation, vibe-model runs an automated review loop:

### Review Process

1. **Run Reviews**: Three specialist reviewers evaluate the PRD:
   - **Architecture**: Tech stack appropriateness, architecture clarity, milestone decomposition logic
   - **Testability**: Milestones verifiable, first milestone includes testing infrastructure, clear acceptance criteria
   - **UX**: User journey clarity, accessibility, error handling

2. **Score**: Each reviewer scores +2 (approve) or -1 (block)

3. **Approve or Fix**:
   - All +2? → PRD approved, proceed to Milestone 1
   - Any -1? → AI author addresses findings, loop repeats
   - Max 5 iterations, then defer to human; in autonomous mode the loop may proceed with a warning

### PRD Review File

Review findings are written to `vibe-model/prd-review.md`:

```markdown
# PRD Review - Iteration 1

**Overall Status:** ❌ NEEDS REVISION

**Timestamp:** 2025-01-15T10:30:00Z

## ARCHITECTURE Review ❌
**Score:** -1

### Findings
- [BLOCKER] Milestone dependencies unclear — milestone 3 depends on milestone 2 but ordering doesn't reflect this
- [MAJOR] Tech stack missing testing framework specification

## TESTABILITY Review ✅
**Score:** +2

No findings.

## UX Review ❌
**Score:** -1

### Findings
- [MAJOR] Error handling strategy not defined
- [MINOR] Consider edge cases for user input validation
```

### LeanUX MVP Requirement

Vibe-model enforces LeanUX principles: **Milestone 1 must be a minimal viable product** that:
- Implements core user interaction
- Includes basic testing infrastructure
- Is deployable and testable
- Provides immediate user value

Milestones are ordered by user value delivery — earlier milestones provide working software to users as quickly as possible.

### Resolving PRD Review Issues

If PRD review defers to human (max iterations reached):

```bash
# Review the findings
cat vibe-model/prd-review.md

# Edit the PRD if needed
vim vibe-model/prd.md

# Continue when ready
vibe-model continue
```

In autonomous mode, vibe-model may proceed with unresolved PRD review issues after the iteration cap is reached. Review the generated PRD carefully before relying on it for production work.

---

## Milestone Files

Each milestone has a tracking file at `vibe-model/milestones/{NN}-{name}.md`:

```markdown
# Milestone {id}: {name}

## Status
- State: REQUIREMENTS
- Progress: 0%
- Started: {timestamp}
- Pending Transition: NONE

## Requirements
{R1, R2, R3... — numbered, testable requirements}

## Design
{Technical approach, components, interfaces}

### Test Specifications
{NL test cases: TS-1, TS-2...}

## Research Notes
{Findings from web search, codebase exploration}

## Implementation Notes
{Files created/modified, deviations from design}

## Unit Test Results
{Tests run, passed, failed, coverage of TS-N}

## Integration Test Results
{Cross-component verification, regressions}

## Delivery
{PR link, deliverables, caveats}

## Learnings
{Patterns, pitfalls, performance notes}
```

### Context Filtering

The milestone loop filters sections sent to the AI based on the current state:

| State | Sections Included |
|-------|------------------|
| REQUIREMENTS | Status + Requirements + Research Notes |
| DESIGN | Status + Requirements + Design + Research Notes |
| IMPLEMENTATION | Status + Design + Test Specifications |
| UNIT_TEST | Status + Implementation Notes + Test Specifications |
| INTEGRATION_TEST | Status + Design + Unit Test Results |
| DELIVERY | All sections (full summary) |

### Milestone Dependencies

Each milestone (after the first) receives context from previously completed milestones:

- **PRD Context**: Original goal, tech stack, architecture overview
- **Previous Deliverables**: What was built in earlier milestones
- **Upcoming Milestones**: What's planned next (for dependency awareness)

This context helps the AI maintain consistency and avoid re-implementing existing work.

---

## Delivery Summaries

After each milestone completes, a delivery summary is cached:

### Location

`vibe-model/delivery-summaries/{N}-{name}-delivery-summary.md`

### Content

```markdown
# Delivery Summary: Milestone 2 - Exercise Database

**Timestamp:** 2025-01-15T10:30:00Z

## Deliverables
- Deliverable: Exercise data models with TypeScript interfaces
- Deliverable: Seed data with 50+ exercises across 4 categories
- Deliverable: SQLite layer with CRUD operations
- Deliverable: Unit tests for all database operations (32 passing)

## Key Learnings
- SQLite async operations require proper error handling
- Seed data loading should be idempotent
```

### Purpose

- **Traceability**: Track what each milestone delivered
- **Context Injection**: Previous milestones' deliverables are available to subsequent milestones
- **Knowledge Transfer**: Learnings inform future work

### Extraction

Delivery summaries are extracted automatically using multi-strategy regex:
1. `## Deliverables:` section with list items
2. `- Deliverable:` format lines
3. Fallback: entire `## Delivery` section

---

## Sub-Agent Reviews

When enabled with `--review`, vibe-model runs four sequential specialist reviews after each phase:

| Reviewer | Focus |
|----------|-------|
| **Architecture** | Separation of concerns, abstractions, scalability |
| **Code** | Correctness, error handling, security, readability |
| **Testability** | Test spec clarity, unit/integration coverage |
| **UX** | User-facing behavior, accessibility, error messages |

Each review is a separate `claude --print` call with a specialist prompt. Reviews stop on first failure. If a review fails in HIL mode, the milestone pauses for human intervention.

---

## Human-in-the-Loop

### Default Behavior (HIL Mode)

By default, vibe-model pauses at each state transition:

```
REQUIREMENTS → [pause] → DESIGN → [pause] → IMPLEMENTATION → ...
```

At each pause:
- The milestone state is set to `WAITING_FOR_USER`
- The pending transition is recorded
- Resume with `vibe-model continue`

### Autonomous Mode

With `--autonomous`, all pauses are skipped:

```bash
vibe-model --autonomous "your goal"
```

### Per-Milestone Override

Set the Mode column in the PRD milestones table to `autonomous` or `hil` to override the project default for specific milestones.

---

## E2E Testing

### Automated Test Harness

```bash
# Full E2E test (creates project, runs vibe-model, validates everything)
./scripts/e2e-test.sh

# Validate existing output (skip the run)
./scripts/e2e-test.sh --skip-run

# Verbose mode
./scripts/e2e-test.sh --verbose
```

### What the E2E Harness Validates

1. **PRD**: Exists with goal, tech stack, architecture overview, milestones table
2. **Milestone files**: All sections present, requirements filled in
3. **Built artifact**: Source files exist, tests pass, the thing actually works
4. **Git history**: Proper commit messages at each state transition
5. **Status command**: Shows correct milestone status

### Manual E2E Test

```bash
# Clean test project
mkdir -p /tmp/e2e-test && cd /tmp/e2e-test
git init && git config user.name "Test" && git config user.email "t@t.com"
echo "# Test" > README.md && git add . && git commit -m "init"

# Run
/path/to/vibe-model/bin/vibe-model --autonomous -v "Build a CLI calculator in TypeScript using Bun"

# Validate
cat vibe-model/prd.md          # Check PRD
ls vibe-model/milestones/       # Check milestone files
bun test                        # Run tests
echo "add 2 3" | bun run cli.ts # Test the calculator
```

---

## Debugging with AI

When vibe-model doesn't behave correctly, you can use an AI coding agent (Claude Code, Pi, etc.) to diagnose and fix issues.

### Using Verbose Mode

Always use `-v` when debugging. It shows:
- Full AI prompts (with context filtering)
- AI command being executed
- Token count and cost per call
- State transitions

```bash
vibe-model -v --autonomous "goal" 2>&1 | tee debug.log
```

### Common Issues

#### "All milestones complete!" immediately

**Cause**: PRD template has empty milestones table → loop exits before running AI.

**Debug**:
```bash
cat vibe-model/prd.md  # Check if milestones table is empty
```

**Fix**: Check `src/milestone-loop.ts` — the PRD phase should trigger when `milestones.length === 0`.

#### Milestone IDs not parsed

**Cause**: AI used `M1` instead of `1` in the PRD table.

**Debug**:
```bash
grep '^\|' vibe-model/prd.md  # Check ID format
```

**Fix**: Parser in `src/prd.ts` handles `M`/`M-` prefixes. PRD prompt says "plain integer".

#### Process interrupted mid-milestone

**Debug**:
```bash
vibe-model status  # Check current state
head -5 vibe-model/milestones/*.md  # Check milestone state
```

**Fix**: Run `vibe-model --autonomous` to resume.

#### AI not filling in sections

**Debug**: Check verbose output for what context the AI received.

**Fix**: Strengthen prompts in `src/prompts/states/`.

### Fixing Issues

```bash
# 1. Edit the source
vim src/milestone-loop.ts

# 2. Rebuild
bun run typecheck && bun run build

# 3. Clean test
rm -rf e2e-test-project
./scripts/e2e-test.sh
```

---

## Troubleshooting

### CLI Can't Find Project

```bash
# Specify project directory explicitly
vibe-model --project-dir /path/to/project "goal"
```

### Git Commits Failing

Ensure git is configured:
```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

Vibe-model auto-commits after each state transition. If git is not configured, commits silently fail (non-fatal).

It also intentionally skips common generated artifacts during auto-commit, even if the target repo forgot to ignore them:
- `node_modules/`
- `dist/`
- `coverage/`
- `.vite/`
- `.vitest/`
- `*.tsbuildinfo`

### PRD Review Issues

#### PRD Review Exceeds Max Iterations

**Cause**: Reviewers and author cannot agree on PRD quality.

**Debug**:
```bash
cat vibe-model/prd-review.md  # Check review findings
```

**Fix**:
- **HIL mode**: Review findings manually, edit PRD if needed, run `vibe-model continue`
- **Autonomous mode**: Review the generated `prd-review.md` and `prd.md`; current behavior may proceed with a warning after the review iteration cap is reached

#### Milestone 1 Not an MVP

**Cause**: AI didn't follow LeanUX principles.

**Debug**:
```bash
cat vibe-model/prd.md  # Check milestone 1 description
```

**Fix**: The PRD prompt enforces LeanUX, but if the AI ignores it, add a hint before running:
```bash
vibe-model hint "Milestone 1 must be a minimal viable product that I can deploy and test immediately"
```

#### Delivery Summary Missing

**Cause**: Milestone didn't complete DELIVERY phase, or extraction failed.

**Debug**:
```bash
ls vibe-model/delivery-summaries/  # Check what's cached
```

**Fix**: If extraction failed, check the milestone file's `## Delivery` section format. Should contain deliverables as list items.

#### PRD Context Not Injected

**Cause**: PRD file missing required sections.

**Debug**:
```bash
grep -E "^(Goal|Tech Stack| Architecture Overview):" vibe-model/prd.md
```

**Fix**: Ensure PRD has these sections populated. The PRD phase prompt should generate them.

### Claude CLI Not Found

```bash
which claude  # Should return a path
claude --version  # Should return a version
```

### Gemini Consultation Issues

```bash
# Disable Gemini consultation
vibe-model --no-consult "goal"
```

### Build Failures

```bash
bun run typecheck  # Check for type errors
bun run build      # Rebuild
bun run lint       # Check for lint errors
```

---

## Directory Structure

```
your-project/
├── vibe-model/
│   ├── prd.md                        # PRD with milestones table
│   ├── prd-review.md                 # PRD review findings (after PRD phase)
│   ├── delivery-summaries/           # Cached delivery summaries
│   │   ├── 01-project-setup-delivery-summary.md
│   │   └── ...
│   └── milestones/
│       ├── 01-project-setup.md       # Milestone tracking files
│       ├── 02-core-logic.md
│       └── ...
└── (source code created by AI agent)

vibe-model/  (this repository)
├── src/
│   ├── index.ts                      # CLI entry point
│   ├── config.ts                     # Configuration
│   ├── types.ts                      # MilestoneState enum, interfaces
│   ├── constants.ts                  # Path constants, templates
│   ├── prd.ts                        # PRD file operations
│   ├── milestone.ts                  # Milestone file operations
│   ├── milestone-state-machine.ts    # State transitions
│   ├── milestone-loop.ts             # Main orchestration loop
│   ├── ai-provider.ts                # Claude/Gemini execution
│   ├── checkpoint.ts                 # Git commit operations
│   └── prompts/
│       ├── milestone-context.ts      # Section filtering
│       └── states/                   # Phase-specific prompts
├── bin/
│   └── vibe-model                    # Executable CLI
├── scripts/
│   ├── e2e-test.sh                   # E2E test harness
│   ├── sanity_checks.sh              # Pre-commit checks
│   └── copy-ai-instructions.sh       # Sync AI instruction files
├── USER_GUIDE.md                     # This file
├── AGENTS.md                         # AI agent quick reference
├── vibe-model.md                     # Protocol specification
└── README.md                         # Project overview
```

---

## Additional Resources

- **[AGENTS.md](AGENTS.md)** - Quick reference for AI agents (synced to CLAUDE.md, GEMINI.md)
- **[vibe-model.md](vibe-model.md)** - Protocol specification
- **[README.md](README.md)** - Project overview
- **[docs/e2e-harness.md](docs/e2e-harness.md)** - E2E test design document
