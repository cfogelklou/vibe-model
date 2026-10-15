# Plan: skill-repo-replacement

Replace legacy TypeScript CLI in cfogelklou/vibe-model with the markdown skill version
(canonical: `~/.agents/skills/vibe-model`; this repo becomes the published mirror).

- Branch: `feat/skill-repo-replacement` (off `main` @ `ed414f8`)
- Legacy preservation: annotated tag `cli-legacy` (pushed + verified on origin)
- 61MB `bin/vibe-model` binary: gitignored (not in tag tree); blob recoverable from commit `b0f9425`
- Waiver: archive-before-merge hard gate replaced by user-directed deletion of workflow artifacts pre-squash-merge
- Approved plan: `/Users/chris/.claude/plans/optimized-yawning-spindle.md`

## Milestone Progression

- [x] M1 — Teardown, import skill, docs, CI, audit, PR

## M1 — Down the V

- [x] Safety net: set-head, push local branches, annotated tag `cli-legacy` pushed + verified
- [x] Phase 0 gate table output; scope ruling recorded (teardown — no BDD/TDD/prototypes)
- [x] Phase 1/2 satisfied via plan review (3 review subagents, findings folded in, plan approved)
- [x] Delete legacy CLI (code, scripts, tests, docs, workflows, configs) — one commit
- [x] Remove empty untracked dirs (`journey/`, `examples/`, nested `vibe-model/`)
- [x] Rewrite `.gitignore` (drop bin/dist/example/e2e entries)
- [x] Import `SKILL.md` + `REFERENCE.md` byte-identical → `skills/vibe-model/`
- [x] Write fresh `README.md` (no symlink section; canonical note; `cli-legacy` pointer)
- [x] Write minimal `AGENTS.md`
- [x] Write `scripts/check.sh` (existence, frontmatter name/description, backtick-mention, relative .md links) — green incl. negative test
- [x] Write `.github/workflows/ci.yml` (static check on push/PR — no Z.AI env, no owner gate)
- [x] Write `.github/workflows/smoke-test.yml` (workflow_dispatch only; agent runs /vibe-model on seeded task)
- [ ] Implementation gate: fresh review subagent on full branch diff → GO
- [ ] Run `bash scripts/check.sh` → green
- [ ] `/write-a-skill` audit → apply findings to canonical first, re-sync, commit
- [ ] Readability pass on README.md + AGENTS.md
- [ ] Push branch, open PR (description: binary recovery SHA, dist/ rebuild note)
- [ ] Pre-merge sweep: zero unchecked boxes, artifacts deleted (per waiver), squash merge

## Learnings promotion (end of epic)

- [ ] Candidate AGENTS.md invariants → propose to user, then commit
