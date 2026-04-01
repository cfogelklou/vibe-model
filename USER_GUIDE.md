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
> Let's determine specifications for my goal according to ./vibe-model/vibe-model.md
```

The AI follows the Spec Initiation Protocol, asks clarifying questions, creates a `.spec.md` file, and waits for your sign-off.

**Option 2: Direct Loop (faster, for simpler goals)**

Jump straight into the loop - questions happen during REQUIREMENTS phase:

```bash
./vibe-model/bin/vibe-model "your goal here"
```

---

## Installation

### Prerequisites

Install Bun from https://bun.sh/install

### Building the Executable

```bash
# Clone or download the vibe-model repository
cd vibe-model

# Install dependencies
bun install

# Build the standalone executable for your platform
bun run compile

# The binary will be created at: dist/vibe-model
```

### Adding to Your PATH

After building, add the compiled binary to your PATH:

```bash
# Copy the binary to a directory in your PATH
# Example:
sudo cp dist/vibe-model /usr/local/bin/

# Or create a symlink
ln -s $(pwd)/dist/vibe-model /usr/local/bin/vibe-model

# Verify installation
vibe-model --version
```

### Directory Structure

When integrated, the tool creates this structure:

```
your-project/                    # Parent project (git repository)
├── vibe-model/                    # V-Model outputs (created by script)
│   ├── journey/                # Journey tracking files
│   ├── prototypes/             # Experimental code (Python, etc.)
│   └── memory.md               # Knowledge persistence
├── self-improvement-notes.md      # Project-level runtime notes for future runs
└── vibe-model/                 # Vibe-model source code
    ├── src/                    # TypeScript source code
    ├── bin/                    # Development CLI scripts
    ├── dist/                   # Compiled binaries (after bun run compile)
    ├── prompts/                # AI prompt templates
    ├── package.json            # Dependencies
    ├── USER_GUIDE.md           # This file
    ├── vibe-model.md           # Protocol specification
    └── CLAUDE.md               # Quick reference for Claude Code
```

**Important**:
- The `vibe-model/` directory (for outputs) is created in the **parent project root**
- Prototyping directory `vibe-model/prototypes/` is user-managed for experimental code
- The standalone binary in `dist/vibe-model` can be run from any directory

---

## Basic Usage

### Running the CLI

**Recommended**: Run from the parent project root for clarity:

```bash
# From parent project root
./vibe-model/bin/vibe-model "reduce latency to under 10ms"
```

Alternative (also works):

```bash
# From vibe-model directory
cd vibe-model && ./bin/vibe-model "reduce latency to under 10ms"
```

The CLI automatically resolves paths regardless of where you run it from.

### Starting a New Journey

```bash
# Start a new journey
./vibe-model/bin/vibe-model "reduce latency to under 10ms"

# With options
./vibe-model/bin/vibe-model -g "implement feature X"      # Use Gemini
./vibe-model/bin/vibe-model --no-consult "fix bug Y"      # Disable Gemini consultation
./vibe-model/bin/vibe-model -v "add feature Z"            # Verbose logging
```

---

## Commands

| Command | Description |
|--------|-------------|
| `./bin/vibe-model "goal"` | Start a new journey with the given goal |
| `./bin/vibe-model` | Continue the active journey |
| `./bin/vibe-model status` | Show status of all journeys |
| `./bin/vibe-model hint "message"` | Add a user hint to the journey |
| `./bin/vibe-model approve` | Approve current UX mockup (UX-MVP mode) |
| `./bin/vibe-model pivot` | Force pivot to next approach |
| `./bin/vibe-model reflect` | Force reflection phase |
| `./bin/vibe-model archive` | Archive completed epics |
| `./bin/vibe-model rollback [N]` | Rollback to checkpoint N (default: last) |
| `./bin/vibe-model list-checkpoints` | List all checkpoints for current journey |

### Command Options

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Enable verbose logging |
| `-g, --gemini` | Use Gemini as primary AI provider |
| `-m, --mvp` | Enable MVP mode (skip most test phases) |
| `--go` | Enable GO mode (fast self-test mode) |
| `--ux-mvp` | Enable iterative UX mockup loop after REQUIREMENTS |
| `--playwright` | Enable UX "dumb user" evaluator in UX-MVP mode |
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
export AI_PROVIDER="claude"        # Primary AI provider (claude|gemini)
export MAX_ITERATIONS="100"        # Maximum loop iterations
export CONSULT_GEMINI="true"       # Enable Gemini design review
./vibe-model/bin/vibe-model "add feature X"
```

### Config File (.vibe-modelrc)

Create a `.vibe-modelrc` file in your project directory or home directory:

```json
{
  "aiProvider": "claude",
  "maxIterations": 100,
  "consultGemini": true,
  "projectDir": "./my-project",
  "verbose": false,
  "noPush": false,
  "commitInterval": 1
}
```

**Configuration Priority**: CLI arguments → Environment variables → Config file → Defaults

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
| `PROJECT_NAME` | `my-project` | Project name for journey tracking |
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

Journey files track the progress of each R&D effort. They are stored in `{PROJ_ROOT}/vibe-model/journey/`.

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
| `REQUIREMENTS_REVIEW` | Automatic Gemini consultation for REQUIREMENTS quality |
| `SYSTEM_DESIGN` | High-level architectural planning (Epics) |
| `SYSTEM_DESIGN_REVIEW` | Automatic Gemini consultation for SYSTEM_DESIGN quality |
| `ARCH_DESIGN` | Component-level design (Sub-systems/Interfaces) |
| `ARCH_DESIGN_REVIEW` | Automatic Gemini consultation for ARCH_DESIGN quality |
| `MODULE_DESIGN` | Low-level logic design for a single Story |
| `MODULE_DESIGN_REVIEW` | Automatic Gemini consultation for MODULE_DESIGN quality |
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

Memory is stored in **markdown format** at `{PROJ_ROOT}/vibe-model/memory.md`:

```
your-project/
└── vibe-model/
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

## Self-Improvement Notes

During execution, vibe-model appends runtime self-improvement notes to:

`{PROJ_ROOT}/self-improvement-notes.md`

- **Write cadence**: After each loop iteration
- **Purpose**: Persist feedback for future executions/rebuild workflows
- **Runtime behavior**: Store-only (not injected into current prompt context)

---

## Prototyping

The V-Model agent can use Python or other languages for rapid prototyping before production implementation.

### Prototyping Directory

**Location**: `{PROJ_ROOT}/vibe-model/prototypes/`

```bash
# Create prototype in vibe-model/prototypes/
# Agent will create files like: vibe-model/prototypes/fft_experiment.py
```

### Prototype Workflow

```bash
# 1. Create prototype in vibe-model/prototypes/
# Agent will create files like: vibe-model/prototypes/fft_experiment.py

# 2. Run prototype
python vibe-model/prototypes/fft_experiment.py
```

### .gitignore

The CLI automatically creates `vibe-model/.gitignore` to exclude generated artifacts:

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
./vibe-model/bin/vibe-model rollback

# Rollback to specific checkpoint ID
./vibe-model/bin/vibe-model rollback 3

# List all checkpoints
./vibe-model/bin/vibe-model list-checkpoints
```

**Warning**: Rollback uses `git reset --hard` and will discard uncommitted changes.

---

## Compile & Debug

### Building Standalone Executable

```bash
# Compile standalone executable (includes Bun runtime)
cd vibe-model
bun run compile

# Output: dist/vibe-model (56MB, works on macOS arm64/x64, Linux, Windows)
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
./vibe-model/bin/vibe-model -v "your goal"

# Enable verbose environment variable
export VERBOSE=true
./vibe-model/bin/vibe-model "your goal"
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
./vibe-model/bin/vibe-model hint "Try using FFT interpolation"
```

Hints are added to the journey file and incorporated into the next iteration.

### UX-MVP Prototyping Mode

Use UX-MVP to iterate on mockups before continuing the full V-Model:

```bash
./bin/vibe-model --ux-mvp --playwright -v "create todo app"
```

Typical flow:

```bash
./bin/vibe-model hint "increase button contrast and simplify layout"
./bin/vibe-model
./bin/vibe-model approve
./bin/vibe-model
```

Behavior notes:
- UX-MVP starts with `REQUIREMENTS -> PROTOTYPING`.
- After each mockup, journey moves to `WAITING_FOR_USER`.
- `approve` transitions the UX loop forward to normal review/design phases.
- If no explicit mode flags are passed when continuing, vibe-model restores mode from journey metadata.
- If provider quota/capacity limits are hit, vibe-model exits non-zero and parks at `WAITING_FOR_USER` with guidance (no infinite retry loop).

### Forced Pivot

When the current approach is stuck, force a pivot to the next approach:

```bash
./vibe-model/bin/vibe-model pivot
```

This sets the journey state to `PIVOTING`, causing the agent to abandon the current approach and try a new one.

### Forced Reflection

Trigger a reflection phase to analyze progress:

```bash
./vibe-model/bin/vibe-model reflect
```

This sets the journey state to `REFLECTING`, causing the agent to analyze what has been learned and adjust strategy.

### Epic Archival

Archive completed epics to reduce journey file size:

```bash
./vibe-model/bin/vibe-model archive
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
./vibe-model/bin/vibe-model "goal"

# Or specify project directory explicitly
./vibe-model/bin/vibe-model --project-dir /path/to/project "goal"
```

### Journey Files in Wrong Location

Check that `vibe-model/` directory exists in parent project root:

```bash
ls ../vibe-model/
```

If missing, the CLI will create it automatically.

### Tests Not Running

Configure your test commands in `.vibe-modelrc`:

```json
{
  "aiProvider": "claude"
}
```

### Gemini Consultation Issues

To disable Gemini consultation during design phases:

```bash
./vibe-model/bin/vibe-model --no-consult "your goal"
```

Or set the environment variable:

```bash
export CONSULT_GEMINI=false
./vibe-model/bin/vibe-model "your goal"
```

Or in `.vibe-modelrc`:
```json
{
  "consultGemini": false
}
```

### Verbose Logging

Enable verbose output for debugging:

```bash
./vibe-model/bin/vibe-model -v "your goal"
```

Or set the environment variable:

```bash
export VERBOSE=true
./vibe-model/bin/vibe-model "your goal"
```

Or in `.vibe-modelrc`:
```json
{
  "verbose": true
}
```

### Using Gemini as Primary AI

Use Gemini instead of Claude for the main loop:

```bash
./vibe-model/bin/vibe-model -g "your goal"
```

Or set the environment variable:

```bash
export AI_PROVIDER=gemini
./vibe-model/bin/vibe-model "your goal"
```

Or in `.vibe-modelrc`:
```json
{
  "aiProvider": "gemini"
}
```

### Bun Installation Issues

If Bun is not installed, visit https://bun.sh/install for installation instructions.

### Binary Not Found

If the vibe-model binary is not found after building:

```bash
# Rebuild the executable
cd vibe-model
bun run compile

# Verify the binary exists
ls -la dist/vibe-model

# Add to PATH (temporary)
export PATH="$(pwd)/dist:$PATH"

# Add to PATH (permanent - add to ~/.zshrc or ~/.bashrc)
echo 'export PATH="/path/to/vibe-model/dist:$PATH"' >> ~/.zshrc
```

### Git Workflow

All code changes, V-Model outputs, and journey files are committed to the **parent project repository**.

```bash
# Run V-Model loop from parent project root
./vibe-model/bin/vibe-model "improve performance"

# When ready to commit (from parent project root):
git add vibe-model/journey/your-journey.md
git add src/changed_file.ts
git commit -m "feat: improve performance"
```

---

## Cross-Platform Considerations

### Platform-Specific Notes

**Windows (PowerShell/CMD)**

- Use the compiled `vibe-model.exe` from the `dist` directory
- Git Bash or WSL recommended for best compatibility
- Some build/test commands may need Windows-specific syntax:
  ```json
  {
    "buildCommand": "npm run build",
    "testCommand": "npm test",
    "allTestsCommand": "npm run test:all"
  }
  ```

**macOS and Linux**

- Direct CLI execution works as documented
- Bash/zsh shell syntax assumed in examples
- GNU/BSD sed differences handled automatically by file-utils.ts

### Path Handling

The V-Model CLI automatically handles path resolution across platforms:

- **Unix (macOS/Linux)**: Uses `/` path separator
- **Windows**: Converts to `\` path separator automatically
- **Mixed environments**: Automatic detection and conversion

### Line Endings

- Journey files use platform-native line endings
- Git auto-conversion recommended: `git config --global core.autocrlf true`
- `.gitattributes` in the project ensures consistency

### Executable Permissions

**macOS/Linux**: The compiled binary should already be executable. If not:
```bash
chmod +x vibe-model/dist/vibe-model
```

**Windows**: Executable permissions not required (handled by file extension)

---

## Additional Resources

- **[Protocol Specification](vibe-model.md)** - Complete V-Model protocol definition
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
