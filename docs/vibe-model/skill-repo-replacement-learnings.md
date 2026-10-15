# Learnings: skill-repo-replacement

- `~/.agents/README.md` is skills-library infra (symlink docs), NOT vibe-model content — original user premise wrong; README authored fresh (user confirmed).
- Canonical skill copy = `~/.agents/skills/vibe-model` (user decision). Repo = published mirror; never edit repo copy without editing canonical first.
- **WRONG reviewer claim, corrected by execution:** `bin/vibe-model` (61MB) and `bin/index.js` WERE tracked (in `cli-legacy` tree) despite gitignore entries — ignore rules added after they were committed. Recovery: `git checkout cli-legacy -- bin/vibe-model`. `dist/` (358MB) truly never committed; rebuild from tag via old `scripts/build-all.sh`.
- **Trap hit:** rewriting `.gitignore` before `git add -A` un-ignored on-disk `bin/` and silently committed the 61MB binary into the removal commit. Unpushed branch → rebuilt commits with precise path-scoped staging. Rule: when un-ignoring during teardown, stage deletions explicitly, never blanket `git add -A`.
- Old `ci.yml` carries Z.AI env (`ANTHROPIC_BASE_URL`, `Z_AI_KEY`, glm vars) + owner-gating `if:` — new workflow must be written fresh, not derived.
- `~/.codex/skills` is a directory symlink to `~/.agents/skills` (the `~/.agents/README.md` "one link per skill" Codex row is stale).
- SKILL.md contains zero markdown links (references REFERENCE.md via backticks only) — link checker must include backtick-mention rule or it validates nothing.
- `origin/HEAD` was stale (→ deleted `firstcommit`); fixed via `git remote set-head origin -a`. Local-only branches (`bun`, `refact-prompts`, `fix/ai-retry-no-gemini`, `fixup-prompts`, `firstcommit`) pushed to origin as safety net.
- `.github/copilot-instructions.md` existed and was generated from `scripts/copy-ai-instructions.sh` alongside CLAUDE.md/GEMINI.md/AGENTS.md — all deleted; sync pattern retired, single AGENTS.md.
