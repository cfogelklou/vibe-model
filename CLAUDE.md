# AI V-Model - Quick Reference

**Quick reference for Claude Code agents using the V-Model submodule.**

**For comprehensive user documentation**, see [USER_GUIDE.md](USER_GUIDE.md).

**For complete protocol specification**, see [v_model.md](v_model.md).

---

## Project Overview

The **ai-v-model** submodule provides an autonomous R&D agent that implements the V-Model development lifecycle with formal verification. Now implemented in TypeScript for better maintainability and cross-platform compatibility.

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
cd ai-v-model && bun install

# Start a new journey
./ai-v-model/bin/v-model "your goal here"

# Continue active journey
./ai-v-model/bin/v-model

# Check status
./ai-v-model/bin/v-model status

# Add a hint
./ai-v-model/bin/v-model hint "try using X first"

# Force pivot
./ai-v-model/bin/v-model pivot

# Rollback to last checkpoint
./ai-v-model/bin/v-model rollback
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
├── v_model/                    # V-Model outputs (created by CLI)
│   ├── journey/                # Journey tracking files
│   ├── prototypes/             # Experimental code
│   └── memory.md               # Knowledge persistence
└── ai-v-model/                 # This submodule
    ├── src/                    # TypeScript source
    │   ├── index.ts            # CLI entry point
    │   ├── config.ts           # Configuration
    │   ├── journey.ts          # Journey operations
    │   ├── state-machine.ts    # State transitions
    │   └── ...                 # Other modules
    ├── bin/
    │   └── v-model             # Executable CLI
    ├── prompts/                # AI prompt templates
    ├── package.json            # Dependencies
    ├── USER_GUIDE.md           # Complete user manual
    ├── v_model.md              # Protocol specification
    └── CLAUDE.md               # This file
```

---

## Git Workflow

**All commits happen in the parent project**, not the submodule.

```bash
# Run V-Model loop
./ai-v-model/bin/v-model "goal"

# Commit changes (from parent project root)
git add v_model/journey/your-journey.md
git add src/changed_file.cpp
git commit -m "feat: description"
```

---

## Important Reminder

**NEVER run `./ai-v-model/bin/v-model` directly from within a Claude Code session.**

This CLI calls Claude Code agents and can cause dangerous recursion. Always ask the user to run the CLI manually and report the results back to you.

## Code Contribution Guidelines

**Keep all modifications project-agnostic.**

When fixing bugs or adding features to the ai-v-model submodule:

This ensures the submodule remains portable and reusable across all projects that depend on it.

---

## Documentation Links

- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete user manual with all commands and configuration
- **[v_model.md](v_model.md)** - Formal V-Model protocol specification
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
