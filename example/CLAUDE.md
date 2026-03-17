# V-Model Test Fixture

This repository serves as a **test fixture** for validating the executable `vibe-model` tool located at `../` (one directory up).

## Purpose

The `.github/workflows/ci.yml` workflow uses this example to:
1. Build and test a simple application using the V-Model lifecycle
2. Verify the vibe-model executable works end-to-end
3. Catch regressions before they affect users

## Structure

```
example/
├── remote/       # Bare git repository (acts as origin)
└── src/          # Working repository that vibe-model operates on
    ├── README.md # Initial test content
    └── CLAUDE.md # This file
```

The `remote/` directory is a bare git repository initialized by `scripts/setup_example_repo.sh`. The `src/` directory is a working clone that the vibe-model tool modifies during V-Model execution.

## V-Model Executable

The vibe-model CLI is invoked from:
```
../bin/vibe-model
```

This is the production build of the vibe-model tool, not a development copy.

## Expected Lifecycle

When CI runs, vibe-model should:
1. Read the goal from CI configuration
2. Initialize a new journey in this codebase
3. Progress through V-Model states: REQUIREMENTS → SYSTEM_DESIGN → ARCH_DESIGN → MODULE_DESIGN → IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → SYSTEM_TEST → ACCEPTANCE_TEST
4. Produce working code with tests
5. Commit changes to git

## Setup

The test fixture is created by:
```bash
../scripts/setup_example_repo.sh
```

This script:
- Creates `example/remote/` as a bare git repository
- Creates `example/src/` as a working repository
- Configures git user (CI Bot)
- Creates initial README.md and commits
- Sets up origin remote pointing to ../remote
