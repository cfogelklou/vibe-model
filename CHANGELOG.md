# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Milestone-based lifecycle**: Replaced the 22-state V-Model journey system with a streamlined 9-state milestone system (PRD, REQUIREMENTS, DESIGN, IMPLEMENTATION, UNIT_TEST, INTEGRATION_TEST, DELIVERY, COMPLETE, WAITING_FOR_USER)
- **PRD phase**: One-shot AI PRD generation with tech stack, architecture overview, and milestone decomposition
- **Milestone files**: Per-milestone tracking files under `vibe-model/milestones/` with sections for requirements, design, test specs, implementation notes, test results, delivery, and learnings
- **Context filtering**: Milestone sections are filtered per state so the AI only sees relevant context
- **Sub-agent reviews**: Optional sequential specialist reviews (architecture, code, testability, UX) after each phase via `--review` flag
- **Human-in-the-loop (HIL)**: Default mode pauses at each state transition; `--autonomous` flag skips all pauses
- **`continue` command**: Resume from WAITING_FOR_USER state
- **`--autonomous` flag**: Run without HIL pauses
- **`--review` flag**: Enable sub-agent reviews
- **E2E test harness** (`scripts/e2e-test.sh`): Automated end-to-end testing that runs vibe-model against a toy project and validates all outputs
- **Phase-specific prompts**: 8 state prompts (PRD, requirements, design, implementation, unit-test, integration-test, delivery, review) plus milestone context filtering
- **Robust PRD parsing**: Milestone IDs handle prefixed formats (M1, M-1) in addition to plain integers
- **Per-milestone mode override**: Mode column in PRD milestones table allows `hil` or `autonomous` per milestone

### Changed
- **Simplified state machine**: 22 states → 9 states, milestone-based instead of epic/story-based
- **File structure**: `vibe-model/journey/` → `vibe-model/milestones/`, `journey.md` → per-milestone files
- **PRD replaces journey**: The PRD (`prd.md`) is now the top-level tracking document with a milestones table
- **Memory system removed**: Learnings are now per-milestone (in milestone files) instead of a separate `memory.md`
- **Rollback system removed**: No checkpoint/rollback; auto-commit after each state transition using `commitChanges()` utility
- **Git auto-commit**: Commits happen after every state transition with descriptive messages
- **Sync script**: `copy-ai-instructions.sh` now syncs from AGENTS.md (single source of truth) to CLAUDE.md, GEMINI.md, and copilot-instructions.md

### Fixed
- **PRD phase never running on fresh projects**: Added guard in `milestoneLoop()` to detect empty milestones table and run PRD phase before entering the state loop
- **Milestone IDs not parsed from PRD**: Parser now strips optional M/M- prefix from milestone IDs in the PRD table
- **State loop running all phases on PRD sentinel**: Changed PRD phase to single AI call instead of full `runStateLoop()`
- **E2E test script bash arithmetic**: `((PASS_COUNT++))` returns exit 1 from 0; changed to `PASS_COUNT=$((PASS_COUNT + 1))`
- **E2E test script path filtering**: Absolute path exclusion instead of glob pattern that matched parent directory

### Removed
- Legacy journey/epic system (`journey.ts`, `journey-reader.ts`, `epic-archival.ts`, `design-spec.ts`, `state-machine.ts`, `main-loop.ts`)
- Old prompt files (18 files replaced by 8 state prompts + 1 context filter)
- `pivot`, `reflect`, `archive`, `rollback`, `list-checkpoints` commands
- `VModelState` enum (replaced by `MilestoneState`)
- `ExecutionMode` type
- `memory.md` persistence

## [1.0.0] - 2026-03-16

### Added
- Initial release of vibe-model
- V-Model state machine implementation
- Journey tracking and persistence
- Git checkpointing and rollback
- Memory persistence across sessions
- Design review with Gemini integration
- Epic archival system
- CLI interface with commander.js
- Comprehensive documentation
- Configuration management
- Logging with ANSI colors

[Unreleased]: https://github.com/cfogelklou/vibe-model/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/cfogelklou/vibe-model/releases/tag/v1.0.0
