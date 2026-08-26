# AI V-Model - Quick Reference

**Quick reference for AI agents using the V-Model CLI.**

**This is the SINGLE SOURCE OF TRUTH for all AI agents.** When this file is updated, run `./scripts/copy-ai-instructions.sh` to synchronize changes to GEMINI.md, .github/copilot-instructions.md, and CLAUDE.md.

**For comprehensive user documentation**, see [USER_GUIDE.md](USER_GUIDE.md).

**For complete protocol specification**, see [vibe-model.md](vibe-model.md).

---

## Project Overview

The **vibe-model** CLI provides an autonomous R&D agent that implements the V-Model development lifecycle with formal verification. It is implemented in TypeScript and distributed as a standalone executable for better maintainability and cross-platform compatibility.

**Key Features**:
- Goal-driven development (no pre-defined plans)
- Formal V-Model lifecycle (Requirements → Design → Implementation → Verification)
- Gemini consultation during design phases
- Research integration (web search, codebase exploration)
- Git checkpointing with phase-by-phase commit history
- Memory persistence across sessions
- Type-safe TypeScript implementation
- Cross-platform support (macOS, Linux, Windows)

---

## Quick Start

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies and build the standalone executable
cd vibe-model && bun install && bun run build

# Optional: install globally
cp bin/vibe-model ~/.bin/
```

### Running Vibe-Model in Your Project

**IMPORTANT**: Run vibe-model from anywhere inside the target repository, or pass `--project-dir` explicitly. It detects the nearest git root and writes outputs there.

```bash
# 1. Navigate to YOUR project directory (where you want to build something)
cd /path/to/your/project

# 2. Run vibe-model
vibe-model -g -v "your goal here"
# or: /path/to/vibe-model/bin/vibe-model -g -v "your goal here"

# This creates a `vibe-model/` directory in your project with:
# - prd.md
# - prd-review.md
# - milestones/
# - delivery-summaries/
```

### Example: Using the Test Fixture

```bash
# From the vibe-model repository root:
./scripts/setup_example_repo.sh  # Creates example/src/ test fixture
bun run build                    # Build bin/vibe-model

cd example/src                   # Navigate INTO the target project
../../bin/vibe-model -g -v "Build a pig latinifier CLI in C++ using CMake and CTest"
```

### Vibe-Model Commands

```bash
# Start a new project
vibe-model -g -v "your goal here"

# Continue active milestone loop
vibe-model

# Check status
vibe-model status

# Add a hint to the active milestone
vibe-model hint "proceed with the approach"

# Resume after WAITING_FOR_USER
vibe-model continue
```

---

## V-Model States (Milestone-Based System)

| State | Description |
|:------|:-------------|
| `PRD` | PRD generation — tech stack, architecture, milestones |
| `REQUIREMENTS` | Formalize requirements for current milestone |
| `DESIGN` | Technical design for current milestone |
| `IMPLEMENTATION` | Code implementation for current milestone |
| `UNIT_TEST` | Unit testing for current milestone |
| `INTEGRATION_TEST` | Integration testing for current milestone |
| `DELIVERY` | Delivery summary and milestone completion |
| `COMPLETE` | Milestone complete (or all milestones complete) |
| `WAITING_FOR_USER` | Awaiting human input or sign-off |

---

## Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `claude` | Primary AI (claude/gemini) |
| `CONSULT_GEMINI` | `true` | Enable Gemini design review |
| `MAX_ITERATIONS` | `100` | Maximum loop iterations |

---

## Directory Structure

```
your-project/
├── vibe-model/                    # V-Model outputs (created by CLI)
│   ├── prd.md                     # PRD with milestones table
│   ├── prd-review.md              # PRD review findings
│   ├── delivery-summaries/        # Cached delivery summaries
│   │   ├── 01-*-delivery-summary.md
│   │   └── ...
│   └── milestones/                # Milestone tracking files
│       ├── 01-*.md
│       └── ...
└── ...your source files...

vibe-model-repo/
├── src/                           # TypeScript source
├── bin/
│   └── vibe-model                 # Standalone executable CLI
├── prompts/                       # AI prompt templates
├── package.json                   # Dependencies
├── USER_GUIDE.md                  # Complete user manual
├── vibe-model.md                  # Protocol specification
└── AGENTS.md                      # This file
```

---

## Git Workflow

**All commits happen in the target project repository detected from the current working directory (nearest git root, unless `--project-dir` is provided).**

Vibe-model auto-commits after each phase. During auto-commit it intentionally skips common generated artifacts even if the target project forgot to ignore them, including:
- `node_modules/`
- `dist/`
- `coverage/`
- `.vite/`
- `.vitest/`
- `*.tsbuildinfo`

```bash
# Run V-Model loop from inside the target repo
vibe-model "goal"

# Review the resulting commits in that same repo
git log --oneline
```

---

## Important Reminder

**NEVER run `./vibe-model/bin/vibe-model` directly from within a Claude Code session.**

This CLI calls Claude Code agents and can cause dangerous recursion. Always ask the user to run the CLI manually and report the results back to you.

## Code Contribution Guidelines

**Keep all modifications project-agnostic.**

When fixing bugs or adding features to the vibe-model CLI:

This ensures the tool remains portable and reusable across all projects that depend on it.

---

## Prompt Engineering Guidelines

All AI prompts live in `src/prompts/states/`. When modifying them:

### 1. Orchestrator owns file creation, not the AI

Never tell the AI agent to create, rename, or delete milestone files, PRD files, or any file whose path is derived from PRD data. The orchestrator (`milestone-loop.ts`) creates files programmatically from the PRD table. If the AI also creates them, you get duplicates with mismatched names.

```diff
- When prd.md is written, create the first milestone file
+ Write **only** the prd.md file. Do NOT create any milestone files.
```

### 2. Never put the AI in a loop it can't exit

Review loops (PRD review, sub-agent review) must have:
- A hard iteration cap (e.g., `maxIterations: 5`)
- A degradation path: approve-with-warnings, defer-to-human, or autonomous proceed-with-warning behavior
- Clear, achievable acceptance criteria — not subjective standards like "thoroughly reviewed"

The PRD review loop should approve a PRD that is *good enough*, not *perfect*. A 5-iteration loop that never approves is a bug in the review prompt, not the PRD.

### 3. Keep prompts scoped to one phase

Each phase prompt should only instruct the AI to do work for that phase:
- REQUIREMENTS: define what, not how
- DESIGN: specify how, don't implement
- IMPLEMENTATION: write code, don't change requirements
- UNIT_TEST: verify isolated logic, don't redesign
- INTEGRATION_TEST: verify cross-component behavior
- DELIVERY: package and summarize, don't add features

Cross-phase instructions confuse the AI and produce bloated outputs.

### 4. Prefer programmatic context over prompt instructions

If the AI needs information (previous milestones, PRD goal, tech stack), inject it via `MilestonePromptVars` — don't tell the AI to "check prd.md" or "look at previous milestones." Programmatic injection is reliable; instruction-based discovery is not.

```typescript
// Good: injected by orchestrator
vars.PRD_CONTEXT = `## Original Goal\n${prd.goal}`;

// Bad: AI has to find and read the file itself
// "Read prd.md to understand the project goal"
```

### 5. Test prompts with simple goals first

A prompt that fails on "build a calculator" will fail on everything. Test with the E2E harness before testing with complex goals.

---

## Pre-Completion Sanity Checks

**Before marking any AI-driven development on the AI tools themselves as complete, ALWAYS run:**

```bash
./scripts/sanity_checks.sh
```

This script runs:
1. `bun run typecheck` - TypeScript type checking
2. `bun run build` - Build verification
3. `bun run lint` - ESLint checking

This ensures code quality and catches regressions early.

---

## Review Skill Routing

Reviews (self-review before reporting done, "review this" requests, and pre-commit reviews) MUST load the skill(s) matching the changed surface. Skills live in `~/.agents/skills/` (invoke by name). Pick by change type; combine when several apply:

| Change type (diff touches...) | Skill to load |
|---|---|
| Session/state-machine code, async dependencies, error handling, catch blocks | `typescript-static-guards` |
| TypeScript contracts, boundaries, invariants, assertion build modes, domain types | `typescript-defensive-programming` |
| Structure/refactoring, module consolidation, coupling, testability, cross-cutting changes | `improve-codebase-architecture` |
| Any non-trivial diff, as a complement to the above: dead code, hand-rolled stdlib, speculative abstraction, unneeded deps | `ponytail-review` (over-engineering only; hunts what to delete) |

Routing rule: classify the diff first (files + nature of change), then load every matching skill BEFORE writing review findings. If no row matches, no skill needed; say so rather than force-fitting one.

---

## Documentation Links

- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete user manual with all commands and configuration
- **[vibe-model.md](vibe-model.md)** - Formal V-Model protocol specification
- **[README.md](README.md)** - Project overview and installation
- **[README_TS.md](README_TS.md)** - TypeScript implementation details
- **[TypeScript Guidelines](docs/guidelines-typescript.md)** - TypeScript coding standards and best practices

---

## TypeScript Development Guidelines

When contributing to the vibe-model TypeScript codebase:

1. **Follow the TypeScript Guidelines** - See [TypeScript Guidelines](docs/guidelines-typescript.md) for comprehensive coding standards
2. **Strict Mode Compliance** - All code must pass `bun run typecheck` with no errors
3. **No Magic Strings/Numbers** - Use enums and constants from `src/types.ts`
4. **Project-Agnostic Design** - Keep all code portable and reusable across any target project repository
5. **Pre-Commit Checklist** - Run `./scripts/sanity_checks.sh` before marking work complete

---

## When to Use V-Model

**Use for**:
- Complex R&D tasks with uncertain solutions
- Architecture changes affecting multiple components
- Performance optimization with specific targets

**Use simpler approaches for**:
- Simple bug fixes
- Well-defined feature additions
- Documentation updates
