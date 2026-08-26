# Tech Debt Database

Tracked, accepted trade-offs. Each entry: what we skipped, why, and the upgrade path.

## TBD-001: Release assertions not fully compiled out (call + branch remain)

- **Date**: 2026-08-26
- **Area**: DbC contracts (`src/contracts/`), build scripts
- **Status**: Open
- **What**: Production builds disable the assertion *throw path* via
  `bun build --define process.env.ASSERT_LEVEL='"none"'`, but each `requires()`
  call still executes (call + branch + condition evaluation). Measured in the
  Bun release-overhead ladder (see `typescript-defensive-programming` skill):
  `--define` + `--minify` + `/*#__PURE__*/` call-site annotations eliminate
  the calls entirely; only the pure condition expressions remain.
- **Why accepted**: This CLI is I/O-bound on AI calls measured in minutes; a
  handful of boolean compares per phase transition is unmeasurable. Builds
  don't minify, and PURE annotations at every call site hurt readability.
- **Upgrade path**: Add `--minify` to `build`/`compile` scripts and annotate
  contract call sites with `/*#__PURE__*/` — only worth it if a hot loop ever
  adopts contracts. Verify with the ladder test in the skill docs.
