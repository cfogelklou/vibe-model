# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- TypeScript implementation with full type safety
- Cross-platform support (macOS, Linux, Windows)
- Stream JSON parsing for Claude CLI `--output-format stream-json`
- Portable file operations (sed, insert, append, ANSI stripping)
- Flexible path resolution for submodule and sibling configurations
- Signal handling (SIGINT, SIGTERM, SIGHUP)
- Comprehensive unit test suite
- ESLint configuration with TypeScript rules
- `--gemini` flag for using Gemini AI instead of Claude
- `hint` command for providing guidance to the agent
- `pivot` command for forcing a pivot to the next approach
- `reflect` command for forcing reflection phase
- `status` command for checking journey status
- `archive` command for archiving completed epics
- `rollback` command for reverting to previous checkpoints
- `list-checkpoints` command for viewing checkpoint history
- Configuration file support (`.vibe-modelrc`)
- Environment variable configuration
- CLI options: `--verbose`, `--no-consult`, `--project-dir`, `--no-push`, `--commit-interval`

### Changed
- Migrated from Bash to TypeScript for better maintainability
- Improved error handling with custom VModelError types
- Enhanced state machine with epic transition tracking
- Better logging with ANSI colors and verbose mode

### Fixed
- Fixed `fs.statSync` error in checkpoint.ts (import issue)
- Fixed infinite loop in WAITING_FOR_USER state
- Design reviews now properly write to epic files during ARCH_DESIGN and later phases
- Git commits now happen on epic transitions
- Proper handling of partial JSON chunks in stream parsing
- Portable sed operations for both BSD and GNU sed
- Buffer boundary handling in stream JSON parser

### Removed
- Previous Bash implementation (replaced by TypeScript)

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
- Comprehensive documentation (USER_GUIDE.md, vibe-model.md, CLAUDE.md)
- Configuration management
- Logging with ANSI colors

[Unreleased]: https://github.com/cfogelklou/vibe-model/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/cfogelklou/vibe-model/releases/tag/v1.0.0
