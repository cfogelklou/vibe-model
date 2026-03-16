# AI V-Model - TypeScript Implementation

An autonomous R&D agent that implements the V-Model development lifecycle with formal verification, now rewritten in TypeScript for better maintainability, type safety, and cross-platform compatibility.

## Overview

The TypeScript implementation provides a complete rewrite of the original `loop_v_model.sh` bash script, maintaining full feature parity while adding:

- **Type Safety**: Catch errors at compile time with TypeScript's strict mode
- **Better Maintainability**: Easier to refactor and extend with modular architecture
- **Cross-platform**: Works consistently on macOS and Linux with portable file operations
- **Modern Tooling**: Access to npm ecosystem, better testing, and IDE support
- **Flexible Path Resolution**: Works as submodule OR sibling to project directory

## Installation

```bash
# Install dependencies
bun install

# Build the executable (optional, CLI works directly from source)
bun run build
```

## Usage

### Starting a New Journey

```bash
# From parent project directory (submodule case)
./ai-v-model/bin/v-model "Improve low-frequency detection using ML"

# Or using bun run
bun run ai-v-model/src/index.ts "Add feature X"

# From sibling directory
cd /path/to/project
/path/to/ai-v-model/bin/v-model "Add feature Y"
```

### Continuing an Active Journey

```bash
# Continue the active journey
./ai-v-model/bin/v-model

# Or using bun run
bun run ai-v-model/src/index.ts
```

### Commands

```bash
# Show status of all journeys
./ai-v-model/bin/v-model status

# Add user hint to journey
./ai-v-model/bin/v-model hint "Try using X first"

# Force pivot to next approach
./ai-v-model/bin/v-model pivot

# Force reflection phase
./ai-v-model/bin/v-model reflect

# Archive completed epics
./ai-v-model/bin/v-model archive

# Rollback to checkpoint
./ai-v-model/bin/v-model rollback [checkpoint_id]

# List all checkpoints
./ai-v-model/bin/v-model list-checkpoints
```

### Options

```bash
-v, --verbose             Enable verbose output
-g, --gemini              Use Gemini AI instead of Claude
--no-consult              Disable Gemini consultation
--project-dir <path>      Specify project directory
--config <path>           Specify config file
--no-push                 Disable auto-push after iterations
--commit-interval <n>     Commit every N iterations (default: 1)
```

## Configuration

### Environment Variables

```bash
export AI_PROVIDER="claude"  # or "gemini"
export MAX_ITERATIONS="100"
export CPU_THRESHOLD="+20%"
export LATENCY_THRESHOLD="+10ms"
export CONSULT_GEMINI="true"
export VERBOSE="false"
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

### Configuration Priority

1. **CLI arguments** (highest priority)
2. **Environment variables**
3. **Config file** (.v-modelrc)
4. **Defaults** (lowest priority)

## Architecture

### Project Structure

```
ai-v-model/
├── package.json           # Bun project config
├── tsconfig.json          # TypeScript config
├── src/
│   ├── index.ts          # Main entry point (CLI)
│   ├── config.ts         # Configuration and environment
│   ├── logger.ts         # Logging utilities
│   ├── journey.ts        # Journey file operations
│   ├── design-spec.ts    # Design spec operations
│   ├── checkpoint.ts     # Git checkpoint operations
│   ├── ai-provider.ts    # AI provider abstraction
│   ├── state-machine.ts  # V-Model state transitions
│   ├── main-loop.ts      # Main iteration loop
│   ├── epic-archival.ts  # Epic archival logic
│   ├── file-utils.ts     # Portable file operations
│   ├── types.ts          # TypeScript types/interfaces
│   └── __tests__/unit/   # Unit tests
├── bin/
│   └── v-model           # Executable script
└── prompts/              # Prompt templates (unchanged from bash)
```

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

## Migration from Bash Version

The TypeScript implementation maintains **complete compatibility** with the bash version:

- **Journey file format**: Identical structure
- **Checkpoint tags**: Same format
- **CLI commands**: Same commands and flags
- **Environment variables**: Same variable names
- **Prompt templates**: Unchanged, work as-is

### Migration Steps

1. Install dependencies: `bun install`
2. Test CLI: `./ai-v-model/bin/v-model status`
3. Continue using existing journeys
4. Optional: Remove `loop_v_model.sh` after verification

## Testing Verification

All unit tests pass:
```
7 pass
0 fail
7 expect() calls
Ran 7 tests across 1 file.
```

## Technical Features

### Stream JSON Parsing

Robust streaming JSON parser for Claude CLI `--output-format stream-json`:
- Handles partial messages and delta chunks
- Proper chunk reassembly at buffer boundaries
- Multi-line JSON object support
- Tool use extraction

### Portable File Operations

Cross-platform file operations that work on macOS (BSD sed) and Linux (GNU sed):
- `sedInplace()`: Portable in-place sed replacement
- `insertAfterLine()`: Insert text after line N
- `insertBeforeLine()`: Insert text before line N
- `appendToFile()`: Append with ANSI code stripping
- `stripAnsi()`: Remove ANSI escape sequences

### Flexible Path Resolution

Works from either position:
- **Submodule**: `parent-project/ai-v-model/`
- **Sibling**: `ai-v-model/` alongside project directory

Automatic detection with `--project-dir` override support.

### Signal Handling

Proper cleanup on signals:
- SIGINT (Ctrl+C): Exit code 130
- SIGTERM: Exit code 143
- SIGHUP: Exit code 129
- Child process cleanup
- Temp file removal

### Error Recovery

- AI provider failures with retry logic
- Git operation failures (warnings, not errors)
- File I/O failures with clear error messages
- Journey state validation

## Contributing

See [CLAUDE.md](CLAUDE.md) for contribution guidelines.

## Documentation

- **[USER_GUIDE.md](USER_GUIDE.md)**: Complete user manual
- **[v_model.md](v_model.md)**: Protocol specification
- **[CLAUDE.md](CLAUDE.md)**: Quick reference for agents

## License

Same as parent project.
