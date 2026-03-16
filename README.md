# AI V-Model

> **Autonomous R&D agent using the V-Model development lifecycle with formal verification.**

A **generic git submodule** for autonomous R&D using the V-Model protocol. Works with any parent project (C++, JavaScript, PWA, etc.) using Claude Code or Gemini.

**Now implemented in TypeScript** for better maintainability, type safety, and cross-platform compatibility.

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
- **Cross-platform**: Works on macOS, Linux, and Windows

---

## Quick Start

```bash
# Add the submodule to your project
git submodule add https://github.com/cfogelklou/ai-v-model.git ai-v-model

# Initialize the submodule
git submodule update --init --recursive

# Install Bun runtime (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
cd ai-v-model && bun install

# Start a new journey
./ai-v-model/bin/v-model "your goal here"
```

---

## Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| **[USER_GUIDE.md](USER_GUIDE.md)** | Users | Complete user manual with commands, configuration, troubleshooting |
| **[v_model.md](v_model.md)** | AI Agents | Formal V-Model protocol specification |
| **[CLAUDE.md](CLAUDE.md)** | AI Agents | Quick reference for Claude Code agents |
| **[README_TS.md](README_TS.md)** | Developers | TypeScript implementation details and architecture |

---

## Basic Usage

```bash
# Start a new journey
./ai-v-model/bin/v-model "reduce latency to under 10ms"

# Continue active journey
./ai-v-model/bin/v-model

# Check status of all journeys
./ai-v-model/bin/v-model status

# Add a hint to guide the agent
./ai-v-model/bin/v-model hint "try using FFT interpolation"

# Force pivot to next approach
./ai-v-model/bin/v-model pivot

# Rollback to last checkpoint
./ai-v-model/bin/v-model rollback
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
     ↓                              ↑
[DESIGN_REVIEW]                    |
     ↓                              |
SYSTEM_DESIGN ──────────────→ SYSTEM_TEST
     ↓                              ↑
[DESIGN_REVIEW]                    |
     ↓                              |
ARCH_DESIGN ────────────→ INTEGRATION_TEST
     ↓                              ↑
[DESIGN_REVIEW]                    |
     ↓                              |
MODULE_DESIGN ──────────→ UNIT_TEST
     ↓                              ↑
     └────────── IMPLEMENTATION ────┘
```

---

## Configuration

Configure via environment variables or `.v-modelrc` config file:

```bash
# Environment variables
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
  "commitInterval": 1
}
```

**Configuration Priority**: CLI arguments → Environment variables → Config file → Defaults

See [USER_GUIDE.md](USER_GUIDE.md#configuration) for all configuration options.

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

---

## Directory Structure

```
your-project/
├── v_model/                    # V-Model outputs (created by script)
│   ├── journey/                # Journey tracking files
│   ├── prototypes/             # Experimental code (user-managed)
│   └── memory.md               # Knowledge persistence
└── ai-v-model/                 # This submodule
    ├── package.json            # Bun project config
    ├── tsconfig.json           # TypeScript config
    ├── src/
    │   ├── index.ts            # Main entry point (CLI)
    │   ├── config.ts           # Configuration and environment
    │   ├── logger.ts           # Logging utilities
    │   ├── journey.ts          # Journey file operations
    │   ├── design-spec.ts      # Design spec operations
    │   ├── checkpoint.ts       # Git checkpoint operations
    │   ├── ai-provider.ts      # AI provider abstraction
    │   ├── state-machine.ts    # V-Model state transitions
    │   ├── main-loop.ts        # Main iteration loop
    │   ├── epic-archival.ts    # Epic archival logic
    │   ├── file-utils.ts       # Portable file operations
    │   ├── types.ts            # TypeScript types/interfaces
    │   └── __tests__/unit/     # Unit tests
    ├── bin/
    │   └── v-model             # Executable script
    ├── prompts/                # AI prompt templates
    ├── USER_GUIDE.md           # Complete user manual
    ├── v_model.md              # Protocol specification
    ├── CLAUDE.md               # Quick reference
    ├── README.md               # This file
    └── README_TS.md            # TypeScript implementation details
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

## Requirements

- **Bun runtime** (https://bun.sh)
- **Git**
- **Claude Code CLI** or **Gemini CLI**
- (Optional) Python for prototyping

### Installing Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

---

## TypeScript Implementation

The V-Model is now implemented in TypeScript, providing:

- **Type Safety**: Catch errors at compile time with strict mode
- **Better Maintainability**: Modular architecture with clear interfaces
- **Cross-platform**: Works consistently on macOS, Linux, and Windows
- **Modern Tooling**: Access to npm ecosystem, better testing, IDE support
- **Flexible Path Resolution**: Works as submodule OR sibling to project directory

For detailed architecture information, see [README_TS.md](README_TS.md).

---

## Migration from Bash Version

The TypeScript implementation maintains **complete compatibility** with the bash version:

- **Journey file format**: Identical structure
- **Checkpoint tags**: Same format
- **CLI commands**: Same commands and flags
- **Environment variables**: Same variable names
- **Prompt templates**: Unchanged, work as-is

### Migration Steps

1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Install dependencies: `cd ai-v-model && bun install`
3. Test CLI: `./ai-v-model/bin/v-model status`
4. Continue using existing journeys
5. Optional: Remove `loop_v_model.sh` after verification

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

**Important**: When contributing to this submodule, keep all modifications **project-agnostic**:

This ensures the submodule remains portable and reusable across all projects that depend on it.

---

## Links

- **Documentation**: [USER_GUIDE.md](USER_GUIDE.md)
- **Protocol Specification**: [v_model.md](v_model.md)
- **Quick Reference**: [CLAUDE.md](CLAUDE.md)
- **TypeScript Details**: [README_TS.md](README_TS.md)
- **GitHub Repository**: https://github.com/cfogelklou/ai-v-model
