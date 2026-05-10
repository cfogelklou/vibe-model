# AI V-Model

> **Autonomous R&D agent using a milestone-based development lifecycle.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An autonomous R&D agent that decomposes goals into milestones and builds them using Claude Code or Gemini. Implemented in TypeScript for type safety and cross-platform compatibility.

---

## Features

- **Goal-driven development**: Describe what you want, the AI builds it
- **Milestone decomposition**: Goals split into 3-8 independently deliverable milestones
- **Milestone lifecycle**: PRD → REQUIREMENTS → DESIGN → IMPLEMENTATION → TESTING → DELIVERY
- **Sub-agent reviews**: Optional architecture, code, testability, and UX reviews
- **Human-in-the-loop**: Pause between phases for review, or run fully autonomous
- **Research integration**: Web search, codebase exploration, external consultation
- **Git auto-commit**: Checkpoint after every state transition
- **Type-safe TypeScript**: Strict mode, portable file operations
- **Cross-platform**: macOS, Linux, Windows

---

## Quick Start

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Build vibe-model
cd vibe-model && bun install && bun run build

# 3. Create a target project
mkdir /tmp/my-project && cd /tmp/my-project
git init && echo "# My Project" > README.md
git add . && git commit -m "init"

# 4. Run vibe-model
/path/to/vibe-model/bin/vibe-model --autonomous "Build a CLI calculator in TypeScript using Bun"
```

---

## Usage

```bash
# Start a new project (autonomous mode)
vibe-model --autonomous "your goal here"

# Start with human-in-the-loop pauses
vibe-model "your goal here"

# Continue after interruption
vibe-model --autonomous

# Check status
vibe-model status

# Add a hint
vibe-model hint "use requestAnimationFrame"
```

### CLI Options

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Show AI prompts and costs |
| `-g, --gemini` | Use Gemini instead of Claude |
| `--autonomous` | Skip human-in-the-loop pauses |
| `--review` | Enable sub-agent reviews |
| `--no-consult` | Disable Gemini consultation |
| `--project-dir <path>` | Specify project directory |

---

## Milestone Lifecycle

```
PRD (generate milestones)
  │
  ├── Milestone 1: REQUIREMENTS → DESIGN → IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → DELIVERY
  ├── Milestone 2: REQUIREMENTS → DESIGN → IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → DELIVERY
  └── ...
      │
      └── COMPLETE
```

Each milestone produces a testable increment. The AI generates requirements, designs, implements code, runs tests, and delivers — all autonomously.

---

## File Structure

```
your-project/
├── vibe-model/
│   ├── prd.md                     # PRD with milestones table
│   └── milestones/
│       ├── 01-project-setup.md    # Milestone tracking
│       ├── 02-core-logic.md
│       └── ...
└── (source code created by AI)
```

---

## Configuration

```bash
# Environment variables
export AI_PROVIDER="claude"       # claude or gemini
export HIL_MODE="false"           # autonomous mode
export REVIEW_ENABLED="true"      # sub-agent reviews

# Or .vibe-modelrc file
{
  "aiProvider": "claude",
  "autonomous": true,
  "reviewEnabled": false
}
```

Priority: CLI args → Environment → Config file → Defaults

---

## E2E Testing

```bash
# Run the full E2E test harness
./scripts/e2e-test.sh

# Validate existing output only
./scripts/e2e-test.sh --skip-run
```

---

## Development

```bash
bun run typecheck   # TypeScript type checking
bun run build       # Build bin/vibe-model
bun run lint        # ESLint
bun test            # Run tests
./scripts/sanity_checks.sh  # All checks
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
| **[USER_GUIDE.md](USER_GUIDE.md)** | Complete user manual |
| **[AGENTS.md](AGENTS.md)** | AI agent quick reference |
| **[vibe-model.md](vibe-model.md)** | Protocol specification |
| **[docs/e2e-harness.md](docs/e2e-harness.md)** | E2E test design |

---

## License

MIT License - See [LICENSE](LICENSE) for details.
