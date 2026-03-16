# AI V-Model User Guide

**Complete user manual for the autonomous R&D agent using V-Model development lifecycle.**

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Commands](#commands)
- [Configuration](#configuration)
- [Journey Files](#journey-files)
- [Design Specs](#design-specs)
- [Memory System](#memory-system)
- [Prototyping](#prototyping)
- [Checkpoint System](#checkpoint-system)
- [Compile & Debug](#compile--debug)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Two Ways to Start a Journey

**Option 1: Formal Q&A (recommended for complex goals)**

Start a conversational spec-gathering session before the loop:

```bash
claude
> Let's determine specifications for my goal according to ./ai-v-model/v_model.md
```

The AI follows the Spec Initiation Protocol, asks clarifying questions, creates a `.spec.md` file, and waits for your sign-off.

**Option 2: Direct Loop (faster, for simpler goals)**

Jump straight into the loop - questions happen during REQUIREMENTS phase:

```bash
./ai-v-model/bin/v-model "your goal here"
```

---

## Installation

### Adding to Your Project

```bash
# Add the submodule to your project
cd your-project
git submodule add https://github.com/cfogelklou/ai-v-model.git ai-v-model

# Initialize the submodule
git submodule update --init --recursive
```

### Installing Bun

```bash
# Install Bun runtime (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

### Installing Dependencies

```bash
# Install npm dependencies
cd ai-v-model && bun install
```

### Directory Structure

When integrated, the submodule creates this structure:

```
your-project/                    # Parent project (git repository)
├── v_model/                    # V-Model outputs (created by script)
│   ├── journey/                # Journey tracking files
│   ├── prototypes/             # Experimental code (Python, etc.)
│   └── memory.md               # Knowledge persistence
├── ai-v-model/                 # This submodule (separate git tracking)
│   ├── src/                    # TypeScript source code
│   │   ├── index.ts            # Main entry point
│   │   ├── config.ts           # Configuration
│   │   ├── journey.ts          # Journey operations
│   │   └── ...                 # Other modules
│   ├── bin/
│   │   └── v-model             # Executable CLI
│   ├── prompts/                # AI prompt templates
│   ├── package.json            # Dependencies
│   ├── USER_GUIDE.md           # This file
│   ├── v_model.md              # Protocol specification
│   └── CLAUDE.md               # Quick reference for Claude Code
└── ... (your project files)
```

**Important**:
- The `v_model/` directory is created in the **parent project root**, not inside the submodule.
- Prototyping directory `v_model/prototypes/` is user-managed for experimental code.

---

## Basic Usage

### Running the CLI

**Recommended**: Run from the parent project root for clarity:

```bash
# From parent project root
./ai-v-model/bin/v-model "reduce latency to under 10ms"
```

Alternative (also works):

```bash
# From inside submodule
cd ai-v-model && ./bin/v-model "reduce latency to under 10ms"
```

The CLI automatically resolves paths regardless of where you run it from.

### Starting a New Journey

```bash
# Start a new journey
./ai-v-model/bin/v-model "reduce latency to under 10ms"

# With options
./ai-v-model/bin/v-model -g "implement feature X"      # Use Gemini
./ai-v-model/bin/v-model --no-consult "fix bug Y"      # Disable Gemini consultation
./ai-v-model/bin/v-model -v "add feature Z"            # Verbose logging
```

---

## Commands

| Command | Description |
|--------|-------------|
| `./bin/v-model "goal"` | Start a new journey with the given goal |
| `./bin/v-model` | Continue the active journey |
| `./bin/v-model status` | Show status of all journeys |
| `./bin/v-model hint "message"` | Add a user hint to the journey |
| `./bin/v-model pivot` | Force pivot to next approach |
| `./bin/v-model reflect` | Force reflection phase |
| `./bin/v-model archive` | Archive completed epics |
| `./bin/v-model rollback [N]` | Rollback to checkpoint N (default: last) |
| `./bin/v-model list-checkpoints` | List all checkpoints for current journey |

### Command Options

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Enable verbose logging |
| `-g, --gemini` | Use Gemini as primary AI provider |
| `--no-consult` | Disable Gemini consultation during design |
| `--project-dir <path>` | Specify project directory |
| `--config <path>` | Specify config file |
| `--no-push` | Disable auto-push after iterations |
| `--commit-interval <n>` | Commit every N iterations (default: 1) |
| `-h, --help` | Show help message |

---

## Configuration

### Environment Variables

Use environment variables to configure behavior:

```bash
export BUILD_COMMAND="npm run build"
export TEST_COMMAND="npm test"
export AI_PROVIDER="claude"
./ai-v-model/bin/v-model "add feature X"
```

### Config File (.v-modelrc)

Create a `.v-modelrc` file in your project directory or home directory:

```json
{
  "aiProvider": "claude",
  "maxIterations": 100,
  "cpuThreshold": 80,
  "latencyThreshold": 100,
  "consultGemini": true,
  "projectDir": "./my-project",
  "verbose": false,
  "noPush": false,
  "commitInterval": 1,
  "buildCommand": "npm run build",
  "testCommand": "npm test"
}
```

**Configuration Priority**: CLI arguments → Environment variables → Config file → Defaults

### Build and Test Commands

| Variable | Default | Description |
|----------|---------|-------------|
| `BUILD_COMMAND` | `cd build && ninja -j4` | Command to build the project |
| `TEST_COMMAND` | `./sau_src/motuner/test/motunit` | Command to run primary tests |
| `ALL_TESTS_COMMAND` | `cd build && ctest -j8` | Command to run all tests |
| `GUARDRAIL_TESTS` | `motunit fft_multi_tests strobe_tests` | Space-separated list of critical tests |
| `BENCHMARK_COMMAND` | *(empty)* | Command to run performance benchmarks |

### Performance Thresholds

| Variable | Default | Description |
|----------|---------|-------------|
| `CPU_THRESHOLD` | `+20%` | Maximum allowable CPU increase |
| `LATENCY_THRESHOLD` | `+10ms` | Maximum allowable latency increase |
| `ACCURACY_THRESHOLD` | `0%` | Minimum allowable accuracy (no decrease) |

### AI Provider Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `claude` | Primary AI provider (claude/gemini) |
| `CONSULT_GEMINI` | `true` | Enable Gemini consultation during design |
| `CLAUDE_MODEL` | `claude-opus-4-6` | Claude model to use |
| `CLAUDE_API_BASE` | `https://api.anthropic.com` | Claude API endpoint |

### Project Metadata

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_NAME` | `SAU` | Project name for journey tracking |
| `KEY_FILES` | `CLAUDE.md README.md` | Key documentation files |

### Dead-End Detection

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_STALE_ITERATIONS` | `3` | Maximum iterations without progress before pivot |
| `MIN_PROGRESS_PERCENT` | `5` | Minimum progress percentage to avoid "stale" status |

### Loop Limits

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_ITERATIONS` | `100` | Maximum total iterations before giving up |

### Checkpoint System

| Variable | Default | Description |
|----------|---------|-------------|
| `CHECKPOINT_PREFIX` | `journey` | Prefix for git checkpoint tags |

---

## Journey Files

Journey files track the progress of each R&D effort. They are stored in `{PROJ_ROOT}/v_model/journey/`.

### Journey File Format

Each journey file contains:

- **Meta**: Goal, state, current epic, progress tracking
- **Approaches**: List of attempted approaches with status
- **Guardrails**: Quality constraints (linting, testing, performance)
- **Baseline Metrics**: Starting point for comparisons
- **User Hints**: Feedback and guidance from the user
- **Research Notes**: Phase-specific research findings
- **Epic Progress**: Tracking of epics and stories
- **Generated Artifacts**: Files created during the journey
- **Learnings Log**: Timestamped progress updates
- **Dead Ends**: Abandoned approaches and reasons
- **Anti-Patterns**: Patterns to avoid (semantic constraints)
- **Pending Questions**: Questions waiting for user input
- **Design Spec**: Link to the design specification
- **Checkpoints**: Git checkpoint history

### Journey States

| State | Description |
|-------|-------------|
| `REQUIREMENTS` | Formalizing User Requirements into System Requirements |
| `SYSTEM_DESIGN` | High-level architectural planning (Epics) |
| `ARCH_DESIGN` | Component-level design (Sub-systems/Interfaces) |
| `MODULE_DESIGN` | Low-level logic design for a single Story |
| `PROTOTYPING` | Optional experimental phase |
| `IMPLEMENTATION` | Coding the specific module/story |
| `UNIT_TEST` | Verifying the specific module logic |
| `INTEGRATION_TEST` | Verifying interaction with the system |
| `SYSTEM_TEST` | Verifying against original Spec |
| `ACCEPTANCE_TEST` | Final validation against User Requirements |
| `CONSOLIDATING` | Cleaning up, syncing to memory.md, final verification |
| `WAITING_FOR_USER` | Awaiting clarification or sign-off |
| `COMPLETE` | Goal achieved, journey finished |
| `BLOCKED` | Blocked by external dependency or error |
| `PIVOTING` | Force pivot to next approach |
| `REFLECTING` | Forced reflection phase |
| `DESIGN_REVIEW` | Automatic Gemini consultation for design quality |

---

## Design Specs

Design specs are formal specifications created during the REQUIREMENTS phase. They are stored as `{JOURNEY_NAME}.spec.md` in the journey directory.

### Spec File Format

Each design spec contains:

- **User Requirements**: Human-readable goals and value proposition
- **System Requirements**: Technical, measurable specifications
- **Acceptance Criteria**: Exact tests or benchmarks that must pass
- **Epics**: High-level milestones needed to reach the goal
- **Architecture**: High-level system design
- **Implementation Plan**: Phases from research to consolidation
- **Success Criteria**: Checklist for completion
- **Changes Made**: List of actual changes (updated during CONSOLIDATING)
- **Documentation Updates**: Documentation changes (updated during CONSOLIDATING)
- **References**: Links to relevant docs, papers, or code

---

## Memory System

Memory is stored in **markdown format** at `{PROJ_ROOT}/v_model/memory.md`:

```
your-project/
└── v_model/
    └── memory.md    # Persistent knowledge storage
```

### Memory Format

```markdown
# Project Memory

## Anti-Patterns
- **Approach X**: Failed because [reason]
- **Using Y for Z**: Causes performance issues

## Successful Patterns
- **Pattern A**: Works well for [use case]
- **Library B**: Good performance, easy integration

## Configuration Notes
- Optimal FFT size for this project: 4096
- Thread pool size: 4 works best on ARM

## Research Findings
- [2026-03-15] Discovered that X doesn't work with Y
```

### Memory Usage

- **Automatic**: The agent reads memory at journey start
- **Updates**: Agent adds learnings during journey
- **Format**: Plain markdown, human-editable

---

## Prototyping

The V-Model agent can use Python or other languages for rapid prototyping before production implementation.

### Prototyping Directory

**Location**: `{PROJ_ROOT}/v_model/prototypes/`

```bash
# Create prototype in v_model/prototypes/
# Agent will create files like: v_model/prototypes/fft_experiment.py
```

### Prototype Workflow

```bash
# 1. Create prototype in v_model/prototypes/
# Agent will create files like: v_model/prototypes/fft_experiment.py

# 2. Run prototype
python v_model/prototypes/fft_experiment.py
```

### .gitignore

The CLI automatically creates `v_model/.gitignore` to exclude generated artifacts:

```
# V-Model artifact exclusions
# Journey files and specs should be committed
# These entries exclude only generated/cache artifacts

prototypes/__pycache__/
prototypes/*.pyc
prototypes/node_modules/
```

**Note**: Journey files (`.journey.md`) and spec files (`.spec.md`) are **committed** as they are part of your project's documentation. Only cache files and build artifacts are ignored.

---

## Checkpoint System

The V-Model uses git tags as checkpoints for safe rollback.

### Creating Checkpoints

Checkpoints are automatically created at key milestones during the journey. Each checkpoint includes:

- **ID**: Sequential number (0, 1, 2, ...)
- **Tag**: Git tag in format `journey-{name}-milestone-{N}`
- **Date**: UTC timestamp
- **Description**: Human-readable milestone description

### Rolling Back

```bash
# Rollback to last checkpoint
./ai-v-model/bin/v-model rollback

# Rollback to specific checkpoint ID
./ai-v-model/bin/v-model rollback 3

# List all checkpoints
./ai-v-model/bin/v-model list-checkpoints
```

**Warning**: Rollback uses `git reset --hard` and will discard uncommitted changes.

---

## Compile & Debug

### Building Standalone Executable

```bash
# Compile standalone executable (includes Bun runtime)
cd ai-v-model
bun run compile

# Output: dist/v-model (56MB, works on macOS arm64/x64, Linux, Windows)
# Can be copied to any system without requiring Bun installation
```

### Development Tools

```bash
# Type checking
bun run typecheck

# Run tests
bun test

# Linting
bun run lint
bun run lint:fix

# Build for production
bun run build
```

### Debug Mode

```bash
# Verbose mode for debugging
./ai-v-model/bin/v-model -v "your goal"

# Enable verbose environment variable
export VERBOSE=true
./ai-v-model/bin/v-model "your goal"
```

### Common Issues

**TypeScript errors**:
```bash
bun run typecheck
```

**Test failures**:
```bash
bun test
```

**Lint errors**:
```bash
bun run lint
bun run lint:fix
```

---

## Advanced Features

### User Hints

Provide guidance to the agent during a journey:

```bash
./ai-v-model/bin/v-model hint "Try using FFT interpolation"
```

Hints are added to the journey file and incorporated into the next iteration.

### Forced Pivot

When the current approach is stuck, force a pivot to the next approach:

```bash
./ai-v-model/bin/v-model pivot
```

This sets the journey state to `PIVOTING`, causing the agent to abandon the current approach and try a new one.

### Forced Reflection

Trigger a reflection phase to analyze progress:

```bash
./ai-v-model/bin/v-model reflect
```

This sets the journey state to `REFLECTING`, causing the agent to analyze what has been learned and adjust strategy.

### Epic Archival

Archive completed epics to reduce journey file size:

```bash
./ai-v-model/bin/v-model archive
```

This moves completed epic details to separate files, keeping the main journey file focused on current work.

### Dead-End Detection

The agent automatically detects dead ends using:

- **MAX_STALE_ITERATIONS**: Maximum iterations without progress (default: 3)
- **MIN_PROGRESS_PERCENT**: Minimum progress to avoid "stale" status (default: 5%)

When a dead end is detected, the agent:
1. Logs the dead end in the journey file
2. Extracts learnings to memory.md
3. Pivots to the next approach

### Guardrails

Guardrails are quality constraints enforced during the journey:

**Performance Constraints**:
- CPU Budget
- Latency limits
- Memory limits

**Quality Assurance**:
- Linters (clang-tidy, eslint, shellcheck)
- Static type checkers (mypy, flow)
- Dynamic checkers (ASan, UBSan, Valgrind)
- Code coverage targets

**Dependency Guidelines**:
- Allowed/prohibited libraries
- Version constraints
- License compatibility

### Spec Initiation Protocol

Before starting a journey, the agent executes a Q&A protocol:

1. **Metric-Driven Goals**: Current baseline and target values
2. **Scope and Boundaries**: What's in scope and what must not be touched
3. **Constraint Identification**: Memory, threading, standards requirements
4. **Verification Strategy**: How to prove the goal is achieved
5. **Anti-Pattern Mining**: Failed approaches and known gotchas

After gathering this information, the agent creates a spec file and waits for user sign-off before proceeding.

---

## Troubleshooting

### CLI Can't Find Parent Project

Make sure you're running from the correct directory:

```bash
# From parent project root (recommended)
./ai-v-model/bin/v-model "goal"

# Or specify project directory explicitly
./ai-v-model/bin/v-model --project-dir /path/to/project "goal"
```

### Journey Files in Wrong Location

Check that `v_model/` directory exists in parent project root:

```bash
ls ../v_model/
```

If missing, the CLI will create it automatically.

### Tests Not Running

Configure `TEST_COMMAND` as an environment variable or in `.v-modelrc`:

```bash
export TEST_COMMAND="npm test"
./ai-v-model/bin/v-model "fix tests"
```

Or in `.v-modelrc`:
```json
{
  "testCommand": "npm test"
}
```

### Gemini Consultation Issues

To disable Gemini consultation during design phases:

```bash
./ai-v-model/bin/v-model --no-consult "your goal"
```

Or set the environment variable:

```bash
export CONSULT_GEMINI=false
./ai-v-model/bin/v-model "your goal"
```

Or in `.v-modelrc`:
```json
{
  "consultGemini": false
}
```

### Verbose Logging

Enable verbose output for debugging:

```bash
./ai-v-model/bin/v-model -v "your goal"
```

Or set the environment variable:

```bash
export VERBOSE=true
./ai-v-model/bin/v-model "your goal"
```

Or in `.v-modelrc`:
```json
{
  "verbose": true
}
```

### Using Gemini as Primary AI

Use Gemini instead of Claude for the main loop:

```bash
./ai-v-model/bin/v-model -g "your goal"
```

Or set the environment variable:

```bash
export AI_PROVIDER=gemini
./ai-v-model/bin/v-model "your goal"
```

Or in `.v-modelrc`:
```json
{
  "aiProvider": "gemini"
}
```

### Bun Installation Issues

If Bun is not installed:

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version

# If still not found, add to PATH (add to ~/.zshrc or ~/.bashrc)
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

### Git Workflow

All code changes, V-Model outputs, and journey files are committed to the **parent project repository**.

```bash
# Run V-Model loop from parent project root
./ai-v-model/bin/v-model "improve performance"

# When ready to commit (from parent project root):
git add v_model/journey/your-journey.md
git add src/changed_file.cpp
git commit -m "feat: improve performance"
```

---

## Additional Resources

- **[Protocol Specification](v_model.md)** - Complete V-Model protocol definition
- **[Claude Code Quick Reference](CLAUDE.md)** - Quick reference for AI agents
- **[README](README.md)** - Project overview and links
- **[TypeScript Implementation](README_TS.md)** - TypeScript architecture details

---

## When to Use V-Model

**Use V-Model when**:
- Complex R&D tasks with uncertain solutions
- Tasks requiring formal verification
- Architecture changes affecting multiple components
- Performance optimization with specific targets

**Use simpler approaches when**:
- Simple bug fixes
- Well-defined feature additions
- Documentation updates
- Routine maintenance
