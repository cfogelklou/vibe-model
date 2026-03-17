# AI V-Model

> **Autonomous R&D agent using the V-Model development lifecycle with formal verification.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/cfogelklou/vibe-model/workflows/Build/badge.svg)](https://github.com/cfogelklou/vibe-model/actions)

An autonomous R&D agent using the V-Model protocol. Works with any project (C++, JavaScript, PWA, etc.) using Claude Code or Gemini.

Implemented in TypeScript for better maintainability, type safety, and cross-platform compatibility.

---

## Features

- **Goal-driven development**: Works toward ambitious goals without pre-defined plans
- **Formal V-Model lifecycle**: Requirements → Design → Implementation → Verification
- **Design review**: Automatic Gemini consultation for design quality
- **Research integration**: Web search, codebase exploration, external consultation
- **Safe rollback**: Git checkpointing at key milestones
- **Memory persistence**: Learnings persist across sessions
- **Dead-end detection**: Automatic pivot when approaches stagnate
- **Quality guardrails**: Linting, static analysis, performance thresholds
- **Type-safe implementation**: TypeScript with strict mode for reliability
- **Cross-platform support**: Works on macOS, Linux, and Windows

---

## Quick Start

### Installation

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Clone or download this repository
git clone https://github.com/cfogelklou/vibe-model.git
cd vibe-model

# 3. Install dependencies
bun install

# 4. Build the binary for your platform
bun run build

# 5. Add the compiled binary to your PATH
# For example, on macOS/Linux:
export PATH="$PATH:$(pwd)/bin"
# Or copy it to a directory in your PATH:
cp bin/vibe-model /usr/local/bin/

# 6. Start a new journey
vibe-model "your goal here"
```

**Note**: You can also run the binary directly from the `bin/` directory without adding it to your PATH:
```bash
./bin/vibe-model "your goal here"
```

---

## Basic Usage

```bash
# Start a new journey
vibe-model "reduce latency to under 10ms"

# Continue active journey
vibe-model

# Check status of all journeys
vibe-model status

# Add a hint to guide the agent
vibe-model hint "try using FFT interpolation"

# Force pivot to next approach
vibe-model pivot

# Force reflection phase
vibe-model reflect

# Archive completed epics
vibe-model archive

# Rollback to last checkpoint
vibe-model rollback [checkpoint_id]

# List all checkpoints
vibe-model list-checkpoints
```

### CLI Options

```bash
-v, --verbose             Enable verbose output
-g, --gemini              Use Gemini AI instead of Claude
--no-consult              Disable Gemini consultation
--project-dir <path>      Specify project directory
--config <path>           Specify config file
--no-push                 Disable auto-push after iterations
--commit-interval <n>     Commit every N iterations (default: 1)
```

---

## V-Model Workflow

```
REQUIREMENTS ───────────────→ ACCEPTANCE_TEST
     ↓                             ↑
[DESIGN_REVIEW]                    |
     ↓                             |
  SYSTEM_DESIGN ──────────→ SYSTEM_TEST
       ↓                         ↑
  [DESIGN_REVIEW]                |
       ↓                         |
    ARCH_DESIGN ────────→ INTEGRATION_TEST
         ↓                       ↑
  [DESIGN_REVIEW]                |
         ↓                       |
    MODULE_DESIGN ───────→ UNIT_TEST
          ↓                    ↑
          └── IMPLEMENTATION ──┘
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
| `PROTOTYPING` | Optional experimental phase |
| `WAITING_FOR_USER` | Awaiting clarification or sign-off |
| `CONSOLIDATING` | Cleaning up, syncing to memory.md, final verification |
| `COMPLETE` | Goal achieved, journey finished |
| `BLOCKED` | Blocked by external dependency or error |
| `DESIGN_REVIEW` | Automatic state for Gemini consultation |
| `REVIEWING` | Code quality review phase |
| `ARCHIVING` | Archiving completed epics |
| `PIVOTING` | Forced pivot to next approach |
| `REFLECTING` | Forced reflection phase |

---

## Configuration

Configure via environment variables or `.vibe-modelrc` config file:

### Environment Variables

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

---

## Directory Structure

```
your-project/
├── vibe-model/                 # V-Model outputs (created by script)
│   ├── journey/                # Journey tracking files
│   ├── prototypes/             # Experimental code (user-managed)
│   └── memory.md               # Knowledge persistence
└── vibe-model/                 # This repository
    ├── package.json            # Bun project config
    ├── tsconfig.json           # TypeScript config
    ├── src/
    │   ├── index.ts            # Main entry point (CLI)
    │   ├── <etc.>
    │   └── __tests__/unit/     # Unit tests
    ├── bin/
    │   └── vibe-model          # Executable script, after bun run compile
    ├── prompts/                # AI prompt templates
    ├── USER_GUIDE.md           # Complete user manual
    ├── vibe-model.md           # Protocol specification
    ├── CLAUDE.md               # Quick reference
    └── README.md               # This file
```

---

## Architecture

### Key Modules

- **types.ts**: Core types (VModelState, Journey, Epic, Checkpoint, VModelError)
- **config.ts**: Flexible path resolution, config loading, environment parsing
- **logger.ts**: ANSI color logging with verbose mode support
- **file-utils.ts**: Portable file operations (sed, insert, append, strip ANSI)
- **journey.ts**: Journey file CRUD, state management, learning tracking
- **design-spec.ts**: Design spec operations, prompt template resolution
- **epic-archival.ts**: Epic file creation/updates, archival logic
- **checkpoint.ts**: Git checkpoint operations, rollback, safety checks
- **ai-provider.ts**: Claude/Gemini CLI execution, stream JSON parsing
- **state-machine.ts**: State transitions, epic transitions, previous phase tracking
- **main-loop.ts**: Main iteration loop, state-specific handlers
- **index.ts**: CLI entry point with commander.js

### Technical Features

**Stream JSON Parsing**
- Robust streaming JSON parser for Claude CLI `--output-format stream-json`
- Handles partial messages and delta chunks
- Proper chunk reassembly at buffer boundaries
- Multi-line JSON object support
- Tool use extraction

**Portable File Operations**
- Cross-platform file operations that work on macOS (BSD sed) and Linux (GNU sed)
- `sedInplace()`: Portable in-place sed replacement
- `insertAfterLine()`: Insert text after line N
- `insertBeforeLine()`: Insert text before line N
- `appendToFile()`: Append with ANSI code stripping
- `stripAnsi()`: Remove ANSI escape sequences

**Flexible Path Resolution**
- Works in same directory as project
- Automatic detection with `--project-dir` override support

**Signal Handling**
- SIGINT (Ctrl+C): Exit code 130
- SIGTERM: Exit code 143
- SIGHUP: Exit code 129
- Child process cleanup
- Temp file removal

---

## GitHub Actions Integration

You can integrate V-Model into your CI/CD pipeline using GitHub Actions:

```yaml
name: V-Model Journey
on:
  workflow_dispatch:
    inputs:
      goal:
        description: 'Development goal'
        required: true
        default: 'improve performance'

jobs:
  vmodel-journey:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Bun
        run: curl -fsSL https://bun.sh/install | bash

      - name: Install V-Model dependencies
        run: cd vibe-model && bun install

      - name: Build V-Model binary
        run: cd vibe-model && bun run build

      - name: Run V-Model journey
        run: ./vibe-model/bin/vibe-model "${{ github.event.inputs.goal }}"
        env:
          AI_PROVIDER: claude
          MAX_ITERATIONS: 50
```

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

---

## Development

### Running Tests

```bash
# Run all tests
bun test

# Run unit tests only
bun test src/__tests__/unit

# Run specific test file
bun test src/__tests__/unit/utils.test.ts
```

### Building

```bash
# Build for production
bun run build

# Output will be in bin/index.js
```

### Type Checking

```bash
# Run TypeScript compiler
bun --type-check
```

### Linting

```bash
# Run ESLint
bun run lint

# Fix linting issues
bun run lint:fix
```

---

## Requirements

- **Bun runtime** (https://bun.sh)
- **Git**
- **Claude Code CLI** or **Gemini CLI**

---

## Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| **[USER_GUIDE.md](USER_GUIDE.md)** | Users | Complete user manual with commands, configuration, troubleshooting |
| **[vibe-model.md](vibe-model.md)** | AI Agents | Formal V-Model protocol specification |
| **[CLAUDE.md](CLAUDE.md)** | AI Agents | Quick reference for Claude Code agents |
| **[README.md](README.md)** | All | Project overview and architecture |

---

## Contributing

Contributions are welcome! When contributing to vibe-model, keep all modifications **project-agnostic** to ensure the tool remains portable and reusable across all projects that depend on it.

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Links

- **GitHub Repository**: https://github.com/cfogelklou/vibe-model
