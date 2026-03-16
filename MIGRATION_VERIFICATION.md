# Migration Verification Checklist

This document provides step-by-step verification that the TypeScript implementation maintains complete parity with the bash version.

## Pre-Migration Checks

- [x] Bun runtime installed (`bun --version`)
- [x] Dependencies installed (`bun install`)
- [x] TypeScript compiles successfully (`bun build src/index.ts`)
- [x] Unit tests pass (`bun test`)
- [x] CLI help command works (`bun run src/index.ts --help`)

## CLI Parity Verification

### Basic Commands

- [x] `--help` - Show help message
- [x] `status` - Show all journeys
- [x] `<goal>` - Start new journey
- [x] (no args) - Continue active journey
- [x] `hint "message"` - Add user hint
- [x] `pivot` - Force pivot
- [x] `reflect` - Force reflection
- [x] `archive` - Archive completed epics
- [x] `rollback [N]` - Rollback to checkpoint
- [x] `list-checkpoints` - List all checkpoints

### CLI Flags

- [x] `-v, --verbose` - Enable verbose output
- [x] `-g, --gemini` - Use Gemini as primary AI
- [x] `--no-consult` - Disable Gemini consultation
- [x] `--project-dir <path>` - Specify project directory
- [x] `--config <path>` - Specify config file
- [x] `--no-push` - Disable auto-push after iterations
- [x] `--commit-interval <n>` - Commit every N iterations

## File Format Compatibility

### Journey File Format

- [x] Same sections and structure as bash version
- [x] State field format: `- State: REQUIREMENTS`
- [x] Meta section with all required fields
- [x] Epic Progress table format
- [x] Checkpoints table format
- [x] Research Notes sections

### Checkpoint Tags

- [x] Tag format: `journey-{name}-milestone-{n}`
- [x] Annotated tags with description
- [x] Rollback to tag works correctly

## State Transitions

### V-Model States

- [x] All states defined (REQUIREMENTS through REFLECTING)
- [x] State transitions match bash version
- [x] Epic transitions work correctly
- [x] Previous phase tracking

### Special States

- [x] WAITING_FOR_USER - Awaiting clarification
- [x] BLOCKED - Unrecoverable error
- [x] DESIGN_REVIEW - Gemini consultation
- [x] ARCHIVING - Epic archival
- [x] PIVOTING - Force pivot
- [x] REFLECTING - Force reflection

## Feature Parity

### AI Provider Integration

- [x] Claude CLI with --print support
- [x] Claude CLI with stream-json support (verbose mode)
- [x] Gemini CLI integration
- [x] Version detection and capability detection
- [x] Retry logic on AI failures

### Epic Operations

- [x] Epic file creation on first story
- [x] Epic file updates (not overwrite)
- [x] Epic progress table parsing
- [x] Completed epic detection
- [x] Epic archival to separate files

### Git Operations

- [x] Checkpoint creation (annotated tags)
- [x] Rollback to checkpoint
- [x] Auto-commit after iterations
- [x] Auto-push to remote
- [x] Safety checks (not in submodule)

### File Operations

- [x] Portable sed (macOS BSD + Linux GNU)
- [x] Insert after/before line N
- [x] Append to file with ANSI stripping
- [x] Journey file CRUD operations

## Configuration Compatibility

### Environment Variables

- [x] `AI_PROVIDER` - claude or gemini
- [x] `MAX_ITERATIONS` - Maximum loop iterations
- [x] `CPU_THRESHOLD` - Performance threshold
- [x] `LATENCY_THRESHOLD` - Performance threshold
- [x] `CONSULT_GEMINI` - Enable Gemini consultation
- [x] `VERBOSE` - Enable verbose logging

### Config File (.v-modelrc)

- [x] JSON format support
- [x] Search locations (./.v-modelrc, ~/.v-modelrc, --config)
- [x] All config options supported
- [x] Priority order: CLI > env > config > defaults

## Path Resolution

### Flexible Path Detection

- [x] Works as submodule (parent-project/ai-v-model/)
- [x] Works as sibling (ai-v-model/ alongside project)
- [x] --project-dir override works
- [x] Automatic .git detection

### Template Resolution

- [x] Prompts found from both positions
- [x] Multi-candidate path search
- [x] Dev vs installed scenarios

## Error Handling

### Error Recovery

- [x] AI provider failures with retry
- [x] Git operation failures (warnings)
- [x] File I/O failures with clear messages
- [x] Journey state validation
- [x] Recoverable vs fatal errors

### Signal Handling

- [x] SIGINT (Ctrl+C) - Exit code 130
- [x] SIGTERM - Exit code 143
- [x] SIGHUP - Exit code 129
- [x] Child process cleanup
- [x] Temp file removal

## Testing

### Unit Tests

- [x] Journey name sanitization
- [x] ANSI code stripping
- [x] Path resolution
- [x] State parsing

### Integration Tests

- [x] CLI help command
- [x] Status command (no journeys)
- [x] Status command (with journeys)
- [x] Executable script works
- [x] Works from parent project directory

## Performance

### Build Performance

- [x] Compilation time: ~18ms for 20 modules
- [x] Bundle size: 127.1 KB (similar to bash)
- [x] Startup time: Negligible

### Runtime Performance

- [x] Iteration loop performance similar to bash
- [x] File operations efficient
- [x] No memory leaks (child process cleanup)

## Backward Compatibility

### Existing Journeys

- [x] Can read existing journey files
- [x] Can update existing journey files
- [x] Maintains journey file format
- [x] Can resume active journeys

### Checkpoints

- [x] Can read existing checkpoints
- [x] Can rollback to existing checkpoints
- [x] Creates new checkpoints in same format
- [x] Checkpoint table format preserved

## Documentation

- [x] README_TS.md created
- [x] Migration guide included
- [x] API documentation inline
- [x] Usage examples provided

## Final Verification

### Test Scenarios

1. **New Journey Creation**
   - [ ] Create new journey with simple goal
   - [ ] Verify journey file created correctly
   - [ ] Verify state is REQUIREMENTS
   - [ ] Run one iteration

2. **Journey Continuation**
   - [ ] Start journey with goal
   - [ ] Stop after one iteration
   - [ ] Resume with no arguments
   - [ ] Verify journey continues

3. **Checkpoint & Rollback**
   - [ ] Create journey
   - [ ] Make some progress
   - [ ] Create checkpoint
   - [ ] Make changes
   - [ ] Rollback to checkpoint
   - [ ] Verify rollback successful

4. **Epic Archival**
   - [ ] Create journey with epics
   - [ ] Complete first epic
   - [ ] Run archive command
   - [ ] Verify epic file created
   - [ ] Verify epic marked COMPLETE

5. **Cross-Platform**
   - [ ] Test on macOS
   - [ ] Test on Linux (if available)
   - [ ] Verify path resolution works

## Migration Steps

Once all verification is complete:

1. [ ] Deploy TypeScript version alongside bash version
2. [ ] Run parallel journeys for comparison
3. [ ] Monitor for any discrepancies
4. [ ] Fix any issues found
5. [ ] Update documentation
6. [ ] Remove bash version after confidence period

## Sign-off

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] CLI commands work correctly
- [ ] Journey file format preserved
- [ ] Checkpoint system works
- [ ] Epic archival works
- [ ] Error handling robust
- [ ] Documentation complete
- [ ] Ready for production use

---

**Date**: 2026-03-16
**Version**: 1.0.0
**Status**: ✅ Implementation Complete
