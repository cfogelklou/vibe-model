# Learnings: skill-repo-replacement

- `~/.agents/README.md` is skills-library infra (symlink docs), NOT vibe-model content — original user premise wrong; README authored fresh (user confirmed).
- Canonical skill copy = `~/.agents/skills/vibe-model` (user decision). Repo = published mirror; never edit repo copy without editing canonical first.
- `bin/vibe-model` (61MB) and `bin/index.js` are gitignored — NOT in `cli-legacy` tree; blob reachable in history from `b0f9425`. `dist/` (358MB) never committed; rebuild from tag via old `scripts/build-all.sh`.
- Old `ci.yml` carries Z.AI env (`ANTHROPIC_BASE_URL`, `Z_AI_KEY`, glm vars) + owner-gating `if:` — new workflow must be written fresh, not derived.
- `~/.codex/skills` is a directory symlink to `~/.agents/skills` (the `~/.agents/README.md` "one link per skill" Codex row is stale).
- SKILL.md contains zero markdown links (references REFERENCE.md via backticks only) — link checker must include backtick-mention rule or it validates nothing.
- `origin/HEAD` was stale (→ deleted `firstcommit`); fixed via `git remote set-head origin -a`. Local-only branches (`bun`, `refact-prompts`, `fix/ai-retry-no-gemini`, `fixup-prompts`, `firstcommit`) pushed to origin as safety net.
- `.github/copilot-instructions.md` existed and was generated from `scripts/copy-ai-instructions.sh` alongside CLAUDE.md/GEMINI.md/AGENTS.md — all deleted; sync pattern retired, single AGENTS.md.
