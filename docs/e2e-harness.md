# E2E Test Harness for vibe-model

## Overview

Automated end-to-end validation that vibe-model works correctly: creates a clean project, runs vibe-model against it, and checks that PRD, milestones, git history, and the built artifact are all correct.

## Test Script

**Location**: `scripts/e2e-test.sh`

### Usage

```bash
./scripts/e2e-test.sh              # Full run (creates project, runs vibe-model, validates)
./scripts/e2e-test.sh --skip-run   # Validate only (after a previous run)
./scripts/e2e-test.sh --verbose    # Verbose vibe-model output
```

### What It Validates

| Phase | Checks |
|-------|--------|
| **Build** | `bun run build` succeeds |
| **PRD** | File exists with Goal, Tech Stack, Architecture Overview, Milestones table; sections are filled in; 2-8 milestones |
| **Milestone files** | All files exist with required sections (Status, Requirements, Design, Implementation Notes, Unit Test Results, Learnings); Requirements sections are filled |
| **Built artifact** | Source files and test files exist; `package.json` has test script; `bun test` passes; the artifact actually works |
| **Git history** | Commits with "milestone" in message exist |
| **Status command** | `vibe-model status` shows PRD and milestones correctly |

### Test Goal

The harness asks vibe-model to build a CLI calculator — self-contained, objectively verifiable, small enough to complete in reasonable time:

```
Build a CLI calculator in TypeScript using Bun that supports add, subtract,
multiply, and divide. Each operation must be a separate testable function.
Use Bun's built-in test runner (bun test). The calculator should read
expressions from stdin and print results.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | One or more checks failed |

## Extending the Harness

To add new checks, add `pass`/`fail`/`warn` calls in the appropriate phase section of `scripts/e2e-test.sh`. Each check is a standalone assertion — no framework dependency.
