# AGENTS.md

This repository is the published mirror of the **vibe-model** skill, a requirements-first V-model workflow for AI coding agents.

- **Canonical copy:** `~/.agents/skills/vibe-model` (kept in the `~/.agents` repo). Edit there first, then sync byte-identical into `skills/vibe-model/` here. Never edit the mirror ahead of the canonical copy.
- **Source of truth for the workflow:** `skills/vibe-model/SKILL.md` and `skills/vibe-model/REFERENCE.md`. There is no build step and no runtime code.
- **Before committing:** run `bash scripts/check.sh`. It validates that the skill files exist, the frontmatter is well-formed (`name` matches the directory, `description` under 1024 chars), that `REFERENCE.md` exists whenever `SKILL.md` mentions it, and that relative `.md` links resolve.
- **CI:** `.github/workflows/ci.yml` runs `check.sh` on pushes to `main` and on PRs, and additionally drives a real `/vibe-model` loop on a seeded scratch project when the `ANTHROPIC_API_KEY` secret is set (skipped when absent).
- **Docs:** `README.md` covers what the skill is and the repo layout.
