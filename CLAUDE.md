# AI V-Model - Quick Reference

**Quick reference for Claude Code agents using the V-Model submodule.**

**For comprehensive user documentation**, see [USER_GUIDE.md](USER_GUIDE.md).

**For complete protocol specification**, see [vibe-model.md](vibe-model.md).

---

## Project Overview

The **vibe-model** submodule provides an autonomous R&D agent that implements the V-Model development lifecycle with formal verification. Now implemented in TypeScript for better maintainability and cross-platform compatibility.

**Key Features**:
- Goal-driven development (no pre-defined plans)
- Formal V-Model lifecycle (Requirements → Design → Implementation → Verification)
- Gemini consultation during design phases
- Research integration (web search, codebase exploration)
- Git checkpointing for safe rollback
- Memory persistence across sessions
- Type-safe TypeScript implementation
- Cross-platform support (macOS, Linux, Windows)

---

## Quick Start

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
cd vibe-model && bun install

# Start a new journey
./vibe-model/bin/vibe-model "your goal here"

# Continue active journey
./vibe-model/bin/vibe-model

# Check status
./vibe-model/bin/vibe-model status

# Add a hint
./vibe-model/bin/vibe-model hint "try using X first"

# Force pivot
./vibe-model/bin/vibe-model pivot

# Rollback to last checkpoint
./vibe-model/bin/vibe-model rollback
```

---

## V-Model States

| State | Description |
|:------|:-------------|
| `REQUIREMENTS` | Formalizing User Requirements into System Requirements |
| `SYSTEM_DESIGN` | High-level architectural planning (Epics) |
| `ARCH_DESIGN` | Component-level design (Sub-systems/Interfaces) |
| `MODULE_DESIGN` | Low-level logic design for a single Story |
| `IMPLEMENTATION` | Coding the specific module/story |
| `UNIT_TEST` | Verifying the specific module logic |
| `INTEGRATION_TEST` | Verifying interaction with the system |
| `SYSTEM_TEST` | Verifying against original Spec |
| `ACCEPTANCE_TEST` | Final validation against User Requirements |
| `WAITING_FOR_USER` | Awaiting clarification or sign-off |
| `COMPLETE` | Goal achieved, journey finished |

---

## Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BUILD_COMMAND` | `cd build && ninja -j4` | Build command |
| `TEST_COMMAND` | `./sau_src/motuner/test/motunit` | Test command |
| `ALL_TESTS_COMMAND` | `cd build && ctest -j8` | All tests command |
| `AI_PROVIDER` | `claude` | Primary AI (claude/gemini) |
| `CONSULT_GEMINI` | `true` | Enable Gemini design review |
| `MAX_ITERATIONS` | `100` | Maximum loop iterations |

---

## Directory Structure

```
your-project/
├── vibe-model/                    # V-Model outputs (created by CLI)
│   ├── journey/                # Journey tracking files
│   ├── prototypes/             # Experimental code
│   └── memory.md               # Knowledge persistence
└── vibe-model/                 # This submodule
    ├── src/                    # TypeScript source
    │   ├── index.ts            # CLI entry point
    │   ├── config.ts           # Configuration
    │   ├── journey.ts          # Journey operations
    │   ├── state-machine.ts    # State transitions
    │   └── ...                 # Other modules
    ├── bin/
    │   └── vibe-model             # Executable CLI
    ├── prompts/                # AI prompt templates
    ├── package.json            # Dependencies
    ├── USER_GUIDE.md           # Complete user manual
    ├── vibe-model.md              # Protocol specification
    └── CLAUDE.md               # This file
```

---

## Git Workflow

**All commits happen in the parent project**, not the submodule.

```bash
# Run V-Model loop
./vibe-model/bin/vibe-model "goal"

# Commit changes (from parent project root)
git add vibe-model/journey/your-journey.md
git add src/changed_file.cpp
git commit -m "feat: description"
```

---

## Important Reminder

**NEVER run `./vibe-model/bin/vibe-model` directly from within a Claude Code session.**

This CLI calls Claude Code agents and can cause dangerous recursion. Always ask the user to run the CLI manually and report the results back to you.

## Code Contribution Guidelines

**Keep all modifications project-agnostic.**

When fixing bugs or adding features to the vibe-model submodule:

This ensures the submodule remains portable and reusable across all projects that depend on it.

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

## Documentation Links

- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete user manual with all commands and configuration
- **[vibe-model.md](vibe-model.md)** - Formal V-Model protocol specification
- **[README.md](README.md)** - Project overview and installation
- **[README_TS.md](README_TS.md)** - TypeScript implementation details

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
