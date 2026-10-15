# M1 Notes: skill-repo-replacement (frozen at milestone close)

## Phase 0 — Gate evidence
- Gate table output in session; `./.agents/skills-inventory.md` absent (expected, waived in plan). `~/.agents/skills-inventory.md` read.
- Security trigger: not applicable (no trust boundaries touched).
- SSOT instruction file: new minimal AGENTS.md (this milestone). No propagation script.

## Phase 1/2 — Discovery & design (pre-satisfied)
- 3 parallel review subagents during planning: git-safety, repo-design, intent-fidelity. 8+6+8 findings, majors folded into approved plan.
- User decisions: ~/.agents canonical; CI = static + dispatch smoke test; push local branches; tag before delete; fresh README; single AGENTS.md; symlink content dropped.
- Planning gate: GO (plan approved by user after review round).
- BDD/TDD/prototypes ruled out (teardown task — no behavior change).

## Phase 3/4 — Build & verify evidence

### Build
- `1e53aea` removal (74 files, +7/−13894; clean redo after bin/-ignore trap), `9b96901` skill import (byte-identical, diff-verified), `3e8d776` README+AGENTS+check.sh, `197cc1c` CI workflows, `e16e58d` audit sync, `5356b7e` gate findings + readability.
- Trap: rewriting `.gitignore` before `git add -A` committed the 61MB binary into the first removal attempt (unpushed → commits rebuilt with path-scoped staging). See learnings.

### Implementation gate (fresh cavecrew-reviewer subagent)
- Verdict: **GO**. 0 blockers, 8 minor + 2 nits — all fixed in `5356b7e`: smoke-test permissions/context-bleed/glob, check.sh delimiter+greedy-link+identity checks, README canonical link + CI wording, AGENTS.md wording, working-file commit.

### Verification
- `bash scripts/check.sh` → OK (incl. negative tests: broken link fails, missing frontmatter delimiter fails, drift from canonical fails).
- `diff` mirror vs canonical → identical.
- `/write-a-skill` audit: PASS on structure; 3 MINOR wording fixes applied to canonical first (`~/.agents` commit `f1a2a9a`), re-synced byte-identical.
- readability-check: PASS on voice/buzzwords/openers; residual "failures" are table-row and enumeration false positives (checker concatenates table rows; splitting phase-list harms clarity) — accepted.
- Binary recovery: `git checkout cli-legacy -- bin/vibe-model` (binary IS tracked in tag; earlier reviewer claim it was gitignored was wrong — ignore rules post-dated the commits).

### Iteration review (single-milestone epic; compact)
- Process: plan/notes stayed truthful; one rework event (commit rebuild) root-caused to blanket `git add -A` after gitignore rewrite → learnings entry written.
- No deferred code findings; no tech-debt db entries (repo has no db; nothing outlives the epic).
