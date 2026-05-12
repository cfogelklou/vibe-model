# AI V-Model

> **Autonomous R&D agent that decomposes goals into milestones and builds them with AI.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

You describe what you want. Vibe-model decomposes it into milestones, then drives Claude Code or Gemini through a full development lifecycle for each one — requirements, design, implementation, testing, delivery — committing working code at every step.

Implemented in TypeScript. Works on macOS, Linux, Windows.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Installation](#installation)
- [Tutorial: Building a Workout App](#tutorial-building-a-workout-app-with-ai-exercise-generation)
- [Iterative Development](#iterative-development)
- [Commands Reference](#commands-reference)
- [Configuration](#configuration)
- [What Gets Generated](#what-gets-generated)
- [Tips for Good Goals](#tips-for-good-goals)
- [Development](#development)
- [Documentation](#documentation)

---

## How It Works

```
You: "Build a workout app with AI-generated exercises"
                    │
                    ▼
            ┌──────────────┐
            │  PRD Phase   │  AI writes a lean PRD: tech stack, architecture,
            │  (one-shot)  │  and a milestones table of deliverable chunks
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │ PRD Review   │  Specialist reviewers (UX, Architecture, Testability)
            │   Loop       │  evaluate PRD quality. Max 5 iterations of fixes.
            │ (author vs   │  LeanUX MVP enforced: Milestone 1 must be deployable.
            │  reviewers)  │
            └──────┬───────┘
                   │
      ┌────────────┼────────────────────────────────┐
      ▼            ▼                                ▼
┌──────────┐ ┌──────────┐                    ┌──────────────┐
│Milestone 1│ │Milestone 2│  ... 3, 4, 5... │Milestone N   │
│ Foundation│ │ Exercise  │                   │ Polish       │
│   & DB    │ │ Generator │                   │ & Ship       │
└────┬─────┘ └────┬─────┘                    └──────┬───────┘
     │             │                                  │
     │  For each milestone, the AI runs:             │
     │  REQUIREMENTS → DESIGN → IMPLEMENTATION       │
     │  → UNIT_TEST → INTEGRATION_TEST → DELIVERY    │
     │             │                                  │
     └─────────────┴──────────────────────────────────┘
                         │
                         ▼
                   ✅ Working app
```

Each state transition gets its own git commit. Each milestone produces a testable increment. Delivery summaries are cached after each milestone and injected into subsequent milestones for context. Auto-commit intentionally skips common generated artifacts such as `node_modules/`, `dist/`, `coverage/`, `.vite/`, `.vitest/`, and `*.tsbuildinfo` so new repos do not accidentally commit build junk. You can watch it build, pause to review, or let it run fully autonomously.

---

## Installation

### Prerequisites

- **Bun** — `curl -fsSL https://bun.sh/install | bash`
- **Git** — for auto-committing after each phase
- **Claude Code CLI** (`claude`) or **Gemini CLI** (`gemini`) — installed and authenticated

### Build

```bash
git clone https://github.com/cfogelklou/vibe-model.git
cd vibe-model
bun install
bun run build       # creates a standalone bin/vibe-model executable
```

### Install Globally

```bash
cp bin/vibe-model ~/.bin/
# or another directory on your PATH
```

### Verify

```bash
./bin/vibe-model --help
vibe-model --help   # if installed on PATH
```

### Project Detection

Run `vibe-model` from anywhere inside the target repository and it will detect the nearest git root automatically. If needed, override detection explicitly:

```bash
vibe-model --project-dir /path/to/project "your goal here"
```

---

## Tutorial: Building a Workout App with AI Exercise Generation

This tutorial walks through using vibe-model to build a real app — a fully-featured workout application where an AI generates personalized exercises. We'll use the iterative workflow: start small, verify, then extend.

### Step 1: Create the Project

```bash
mkdir workout-app && cd workout-app
git init
git config user.name "You"
git config user.email "you@example.com"
echo "# Workout App" > README.md
git add . && git commit -m "Initial commit"
```

### Step 2: Run Vibe-Model with a Focused Goal

Start with a clear, specific goal. The more concrete you are, the better the PRD:

```bash
/path/to/vibe-model/bin/vibe-model --autonomous -v \
  "Build a workout app in TypeScript using React Native and Expo.
   The app should have:
   - An exercise database with categories (strength, cardio, flexibility, balance)
   - An AI exercise generator that creates personalized workouts based on:
     user's fitness level, available equipment, target muscle groups, and time available
   - A workout timer with rest periods
   - Workout history tracking with local storage (SQLite via expo-sqlite)
   - Clean UI following Material Design principles
   Use Bun as the test runner. All exercise generation logic must be testable
   pure functions that don't depend on external APIs."
```

**What happens next:**

1. **PRD Phase** (~$0.15-0.50, ~30-90 seconds) — The AI reads your goal, picks the tech stack (React Native + Expo + SQLite), writes a 3-5 sentence architecture overview, and decomposes the work into milestones.

2. **PRD Review Loop** (~$0.30-1.50, ~1-3 minutes) — Specialist reviewers (UX, Architecture, Testability) evaluate the PRD. The AI author addresses findings. Max 5 iterations. LeanUX MVP is enforced: Milestone 1 must be a minimal viable product with testing infrastructure.

   Example PRD output:
   ```
   ## Milestones
   | ID | Name | Description | Status | Mode |
   | 1  | Project scaffold | Expo init, navigation, theme | PENDING | |
   | 2  | Exercise database | Data models, seed data, SQLite layer | PENDING | |
   | 3  | AI exercise generator | Pure functions for workout generation | PENDING | |
   | 4  | Workout timer | Timer component with rest periods | PENDING | |
   | 5  | Workout history | Track and display past workouts | PENDING | |
   | 6  | UI polish | Material Design, animations, edge cases | PENDING | |
   ```

3. **Milestone Loop** — For each milestone, vibe-model runs through 6 phases:
   - **REQUIREMENTS** — AI researches best practices, writes numbered testable requirements (R1, R2, R3...)
   - **DESIGN** — AI creates technical design + natural-language test specifications (TS-1, TS-2...)
   - **IMPLEMENTATION** — AI writes the actual code + unit tests
   - **UNIT_TEST** — AI runs tests, fixes failures, documents results
   - **INTEGRATION_TEST** — AI runs full test suite, checks for regressions
   - **DELIVERY** — AI reviews the milestone, writes a summary commit

   Each phase is a separate Claude Code call (~$0.10-0.80 each). Git auto-commits after every phase.

### Step 3: Monitor Progress

While it's running (or after), check status:

```bash
# See all milestones and current progress
vibe-model status

# View the PRD
cat vibe-model/prd.md

# Check a specific milestone's state
head -5 vibe-model/milestones/03-ai-exercise-generator.md

# Watch git history
git log --oneline
```

Typical output:
```
a1b2c3d milestone(delivery): complete milestone 3 — AI exercise generator
f4e5d6 milestone(integration_test): AI completed INTEGRATION_TEST phase
c7b8a9 milestone(implementation): AI completed IMPLEMENTATION phase
...
```

### Step 4: Verify the Built Artifact

After all milestones complete, the AI will have built the actual app:

```bash
# Run all tests
bun test

# Check the exercise generator works
bun run src/exercise-generator.test.ts

# Verify the app structure
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v vibe-model
```

### Step 5: Iterate — Add Features

Vibe-model is designed for iterative development. To add the AI exercise generation feature or any new capability, run it again with a more specific goal on the existing codebase:

```bash
# Add a new feature
vibe-model --autonomous -v \
  "Add AI-powered exercise generation to the existing workout app.
   The generator should:
   - Accept user profile (fitness level: beginner/intermediate/advanced,
     equipment: bodyweight/dumbbells/full-gym, duration: 15-60 minutes)
   - Generate a balanced workout targeting specified muscle groups
   - Include warm-up and cool-down exercises
   - Vary exercises across sessions to prevent plateau
   - Use the existing exercise database in src/data/exercises.ts
   Write pure functions in src/exercise-generator.ts with full test coverage
   in src/exercise-generator.test.ts using Bun's test runner."
```

Since the codebase already exists, the AI will read existing code during the REQUIREMENTS phase and build on top of it.

To extend further:

```bash
# Add progress tracking
vibe-model --autonomous "Add workout progress charts showing volume, frequency, and personal records over time using react-native-chart-kit"

# Add social features
vibe-model --autonomous "Add the ability to share workouts via deep links and import workouts shared by others"

# Fix a specific issue
vibe-model --autonomous "The workout timer doesn't pause when the app goes to background. Fix this using expo-background-fetch and add tests."
```

### Step 6: Use Human-in-the-Loop for Critical Milestones

For milestones where you want to review before proceeding, use HIL mode (the default):

```bash
# Run with pauses between each phase
vibe-model -v "Add AI exercise generation with progressive overload tracking"
```

At each pause:
```
[INFO] HIL pause — milestone paused before DESIGN. Run `continue` to resume.
```

You can review what the AI did, then continue:
```bash
# Review the milestone file
cat vibe-model/milestones/01-*.md

# Continue to the next phase
vibe-model continue

# Or add a hint to guide the AI
vibe-model hint "Use a weighted random selection algorithm for exercise variety"
vibe-model continue
```

### What the AI Actually Builds

Here's a realistic file structure after running the workout app goal:

```
workout-app/
├── vibe-model/
│   ├── prd.md                              # PRD with 6 milestones
│   ├── prd-review.md                       # PRD review findings (after PRD phase)
│   ├── delivery-summaries/                 # Cached delivery summaries
│   │   ├── 01-project-scaffold-delivery-summary.md
│   │   ├── 02-exercise-database-delivery-summary.md
│   │   └── ...
│   └── milestones/
│       ├── 01-project-scaffold.md          # Each tracks full lifecycle
│       ├── 02-exercise-database.md
│       ├── 03-ai-exercise-generator.md
│       ├── 04-workout-timer.md
│       ├── 05-workout-history.md
│       └── 06-ui-polish.md
├── src/
│   ├── data/
│   │   ├── exercises.ts                    # Exercise database (seed data)
│   │   └── categories.ts                  # Category definitions
│   ├── generator/
│   │   ├── exercise-generator.ts           # Pure generation logic
│   │   ├── workout-builder.ts              # Workout composition
│   │   └── progressive-overload.ts         # Difficulty progression
│   ├── storage/
│   │   ├── database.ts                     # SQLite layer
│   │   └── workout-history.ts              # CRUD for history
│   ├── components/
│   │   ├── Timer.tsx                       # Workout timer
│   │   ├── ExerciseCard.tsx                # Exercise display
│   │   └── WorkoutSummary.tsx              # Session summary
│   └── screens/
│       ├── HomeScreen.tsx
│       ├── WorkoutScreen.tsx
│       └── HistoryScreen.tsx
├── tests/
│   ├── exercise-generator.test.ts          # Unit tests
│   ├── workout-builder.test.ts
│   ├── progressive-overload.test.ts
│   └── integration.test.ts                 # Cross-component tests
├── package.json
├── tsconfig.json
├── app.json                                # Expo config
└── README.md
```

---

## Iterative Development

Vibe-model supports multiple development patterns:

### Pattern 1: Big Bang (autonomous)

Build the entire app in one run. Best for prototypes and MVPs.

```bash
vibe-model --autonomous "Build a full workout app with React Native, SQLite, and AI exercise generation"
```

**Cost**: ~$8-25 depending on complexity (includes PRD review). **Time**: 45-120 minutes.

### Pattern 2: Incremental (one milestone at a time)

Build the foundation first, then add features. Best for production apps.

```bash
# Session 1: Foundation
vibe-model --autonomous "Set up a React Native + Expo project with TypeScript, navigation skeleton, and SQLite database for workout data"

# Session 2: Core feature
vibe-model --autonomous "Add an exercise database and AI exercise generator that creates personalized workouts based on user profile"

# Session 3: UI
vibe-model --autonomous "Build the workout execution screen with a timer, exercise cards, and rest period notifications"

# Session 4: Polish
vibe-model --autonomous "Add workout history, progress charts, and fix any remaining issues"
```

Each session picks up where the last left off — the AI reads existing code during REQUIREMENTS.

### Pattern 3: Review-Driven (HIL mode)

Pause between phases for human review. Best for high-stakes code.

```bash
vibe-model "Build the AI exercise generator with progressive overload algorithms"
```

The AI pauses at each state transition. You review, add hints, then continue:

```bash
vibe-model status        # See what phase it's on
cat vibe-model/milestones/01-*.md  # Read the milestone file
vibe-model hint "ensure the generator avoids exercises that use unavailable equipment"
vibe-model continue      # Resume
```

### Pattern 4: Fix and Extend

Use vibe-model to fix issues or extend existing code:

```bash
# Fix a bug
vibe-model --autonomous "The exercise generator sometimes recommends exercises that require equipment the user doesn't have. Fix the filtering logic and add tests."

# Extend a feature
vibe-model --autonomous "Add supersets and circuit training modes to the exercise generator. A superset pairs two exercises back-to-back. A circuit cycles through 3+ exercises with minimal rest."
```

---

## Commands Reference

### Starting a Project

```bash
# New project, fully autonomous
vibe-model --autonomous "your goal"

# New project, pause for review between phases
vibe-model "your goal"

# With verbose logging (shows AI prompts, costs)
vibe-model -v --autonomous "your goal"
```

### Continuing

```bash
# Resume after interruption (Ctrl+C, timeout)
vibe-model --autonomous

# Resume from WAITING_FOR_USER
vibe-model continue
```

### Monitoring

```bash
# Show PRD, milestones, active milestone state
vibe-model status

# View the PRD
cat vibe-model/prd.md

# View a milestone's full lifecycle
cat vibe-model/milestones/01-project-setup.md

# See commit history
git log --oneline | head -30
```

### Guiding the AI

```bash
# Add a hint to the active milestone
vibe-model hint "use a weighted random selection for exercise variety"

# Hints are appended to the milestone's Learnings section
# and included in the AI's context for the next phase
```

### All CLI Options

| Option | Description |
|--------|-------------|
| `"goal"` | Start a new project with this goal |
| *(no args)* | Continue the active milestone loop |
| `continue` | Resume from WAITING_FOR_USER |
| `status` | Show PRD and milestone status |
| `hint <msg>` | Add guidance to the active milestone |
| `-v, --verbose` | Show AI prompts and cost per call |
| `-g, --gemini` | Use Gemini instead of Claude |
| `--autonomous` | Skip all human-in-the-loop pauses |
| `--review` | Enable sub-agent reviews (architecture, code, testability, UX) |
| `--no-consult` | Disable Gemini design consultation |
| `--project-dir <path>` | Specify project directory |

---

## Configuration

### Environment Variables

```bash
export AI_PROVIDER="claude"       # claude or gemini
export HIL_MODE="false"           # = --autonomous
export REVIEW_ENABLED="true"      # = --review
export VERBOSE="true"             # = -v
export MAX_ITERATIONS="100"       # max loop iterations
```

### Config File (`.vibe-modelrc`)

Place in your project root or home directory:

```json
{
  "aiProvider": "claude",
  "autonomous": true,
  "reviewEnabled": false,
  "verbose": false
}
```

### Priority

CLI arguments → Environment variables → `.vibe-modelrc` → Defaults

---

## What Gets Generated

### PRD (`vibe-model/prd.md`)

A lean requirements document with tech stack, architecture overview, and a milestones table:

```markdown
# PRD: Workout App

## Goal
Build a workout app with AI exercise generation...

## Tech Stack
- TypeScript, React Native, Expo
- SQLite (expo-sqlite)
- Bun test runner

## Architecture Overview
Three-layer architecture: data layer (exercise database + SQLite)...
```

### PRD Review (`vibe-model/prd-review.md`)

Generated after PRD phase. Contains specialist review findings:

```markdown
# PRD Review - Iteration 1

**Overall Status:** ✅ APPROVED

## ARCHITECTURE Review ✅
**Score:** +2
No findings.

## TESTABILITY Review ✅
**Score:** +2
- [MINOR] Consider adding integration test strategy for SQLite layer

## UX Review ✅
**Score:** +2
No findings.
```

### Delivery Summaries (`vibe-model/delivery-summaries/`)

Cached after each milestone delivery. Injected into subsequent milestones for context:

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

### Milestone Files (`vibe-model/milestones/01-*.md`)

Each milestone file tracks the full development lifecycle:

```markdown
# Milestone 3: AI Exercise Generator

## Status
- State: COMPLETE
- Progress: 100%

## Requirements
- R1: Generator accepts user profile (level, equipment, duration, targets)
- R2: Generator returns a balanced workout with warm-up and cool-down
- R3: Exercises vary across sessions using weighted random selection

## Design
Algorithm: weighted random selection from filtered exercise pool...

### Test Specifications
- TS-1: Given beginner profile with bodyweight only, generate workout
- TS-2: Verify no exercise requires unavailable equipment

## Implementation Notes
- Created src/generator/exercise-generator.ts (pure functions)
- Created src/generator/workout-builder.ts (composition logic)

## Unit Test Results
42 tests pass, 0 fail. All test specifications covered.

## Learnings
- Weighted random with decay factor prevents exercise repetition
```

### Git History

Clean, descriptive commits at every phase:

```
a1b2c3d milestone(delivery): complete milestone 3 — AI exercise generator
f4e5d6 milestone(integration_test): AI completed INTEGRATION_TEST phase
c7b8a9 milestone(implementation): AI completed IMPLEMENTATION phase
d0e1f2 milestone(design): AI completed DESIGN phase
b3c4d5 milestone(requirements): AI completed REQUIREMENTS phase
...
```

---

## Tips for Good Goals

### ✅ Good Goals

```bash
# Specific about tech stack
"Build a REST API in TypeScript using Hono and Bun with SQLite storage"

# Specific about features
"Build a workout timer that supports intervals, rest periods, and custom sounds"

# Specific about testing
"Build an exercise generator with pure functions and 100% test coverage using Bun"

# Specific about constraints
"Build a React Native workout app that works offline-first using SQLite"
```

### ❌ Vague Goals

```bash
# Too vague — AI will guess tech stack
"Build an app"

# No boundaries — AI might use external APIs you don't want
"Generate workouts"  # Might try to call OpenAI API

# No test requirements
"Build a calculator"  # Might skip tests
```

### Structuring Multi-Feature Projects

For complex apps, break into sequential vibe-model sessions:

```
Session 1: "Set up the project with navigation, theme, and database layer"
Session 2: "Build the core exercise generator with testable pure functions"
Session 3: "Build the workout execution screen with timer"
Session 4: "Add workout history and progress tracking"
Session 5: "Polish UI, add animations, fix edge cases"
```

Each session builds on the previous one — the AI reads existing code during its REQUIREMENTS phase.

---

## Development

### Building Vibe-Model Itself

```bash
bun install
bun run typecheck   # TypeScript type checking
bun run build       # Build bin/vibe-model
bun run lint        # ESLint
bun test            # Run tests
```

### E2E Testing

```bash
./scripts/e2e-test.sh              # Full end-to-end test
./scripts/e2e-test.sh --skip-run   # Validate only
./scripts/sanity_checks.sh         # All pre-commit checks
```

---

## Requirements

- **Bun** (https://bun.sh)
- **Git**
- **Claude Code CLI** or **Gemini CLI**

---

## Documentation

| Document | Description |
|----------|-------------|
| **[USER_GUIDE.md](USER_GUIDE.md)** | Complete user manual with troubleshooting |
| **[AGENTS.md](AGENTS.md)** | AI agent quick reference (synced to CLAUDE.md, GEMINI.md) |
| **[vibe-model.md](vibe-model.md)** | Protocol specification |
| **[docs/e2e-harness.md](docs/e2e-harness.md)** | E2E test design and results |

---

## License

MIT License - See [LICENSE](LICENSE) for details.
