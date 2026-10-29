# vibe-model

A requirements-first V-model skill for AI coding agents. It guides features, fixes, and multi-milestone epics from discovery to verified delivery, keeping requirements and executable evidence durable while design artifacts stay lean.

> **Canonical copy:** `~/.agents/skills/vibe-model` is canonical; this repository is the published mirror. Content changes happen in the canonical copy first, then are synced here byte-identical.

## What it does

Instead of separating planning from implementation, vibe-model runs two nested loops:

- **Inner V-loop (per milestone):** Phase 0 skills-inventory gate, then Phase 1 discovery & grilling, Phase 2 intent & design, Phase 3 build, and Phase 4 verify & close. Each phase can loop back to the earliest phase it invalidates.
- **Outer loop (multi-milestone epics):** the epic plan (`docs/plan-for-<feature>.md`) acts as an active checklist. It coordinates three working files under `docs/vibe-model/`: a `<epic>-handoff.md` state pointer, an append-only `<epic>-learnings.md` guardrails ledger, and per-milestone `<epic>-m<N>-notes.md` evidence files. Every milestone ends with a docs sync, repo gates, an iteration review, and a commit; the epic ends with a plan sweep before merge.

Use this workflow instead of separating planning from implementation. Keep behavior easy to change: requirements and executable evidence are durable, while design artifacts stay lean.

For jobs spanning multiple milestones, an **Outer Loop** coordinates progressive spins of the **Inner V-Loop** via the epic plan as an **active checklist** (`docs/plan-for-<feature>.md`) plus three per-epic working files under `docs/vibe-model/` (`<epic>-handoff.md`, `<epic>-learnings.md`, `<epic>-m<N>-notes.md`). Each V-loop pass dynamically gathers requirements, loads skills, and delegates. Deeper mechanics (outer loop protocol, plan-as-checklist contract, file contracts, iteration review, phase maps, gate tables, discovery fan-out, context briefs, review gates, test levels) live in `REFERENCE.md`.

```text
                  OUTER LOOP (Multi-Milestone Epic)
  [Epic Plan: Active Checklist] -> [Handoff | Learnings | Milestone Notes]
                    |                               ^
                    |                               |
    +================ INNER V-LOOP (Per Milestone) =================+
    |           Phase 0: Skills Inventory Gate (mandatory)          |
    |                               |                               |
    |           Phase 1: Discovery & Grilling                       |
    |                               v                               |
    | Phase 2: Intent & Design                    Phase 4: Verify   |
    |  \    requirements   <-------------------->  acceptance test  |
    |   \    BDD journeys  <-------------------->  integration/unit |
    |    \    prototype    <-------------------->  review + checks  |
    |     \                                       /                 |
    |      \             Phase 3: Build          /                  |
    |       \         (TDD logic, BDD journeys) /                   |
    |        \_________________________________/                    |
    +===============================================================+
                    |
                    v
       Milestone Wrap-up: Docs Sync -> Repo Gates -> Iteration Review -> Commit
                    |
                    v
       Compact -> Re-read plan -> Next milestone Phase 0
```

## How it loads

The skill uses progressive disclosure:

- `skills/vibe-model/SKILL.md`: the workflow. Agents load it automatically when a trigger matches.
- `skills/vibe-model/REFERENCE.md`: deeper mechanics, read on demand (outer-loop protocol, plan-as-checklist contract, file contracts, gate tables, discovery fan-out, context briefs, review gates, test levels).

## When to use it

- Planning or implementing a feature, user-visible fix, or behavior change
- Multi-milestone epics
- BDD journeys and requirements updates
- Any work where "when in doubt, grill" beats just doing

## Repo layout

| Path | Purpose |
|---|---|
| `skills/vibe-model/SKILL.md` | The workflow (auto-loaded by agents) |
| `skills/vibe-model/REFERENCE.md` | Deep reference (read on demand) |
| `scripts/check.sh` | Static validation: files present, frontmatter valid, links resolve |
| `.github/workflows/ci.yml` | Static validation on pushes to `main`/PRs, plus a real `/vibe-model` loop on a seeded project when the `Z_AI_KEY` secret is set (skipped otherwise; also manual-dispatch) |

## Legacy CLI

This repository previously held a TypeScript CLI implementation of the same V-model process (~6k LOC, Bun-built standalone binary). It is superseded by this skill and preserved on the [`cli-legacy`](../../tree/cli-legacy) branch; `git checkout cli-legacy` restores it.

## License

[MIT](LICENSE)
