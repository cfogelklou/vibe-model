---
name: vibe-model
description: Guides features, fixes, and multi-milestone epics through a requirements-first V-model from discovery to verified delivery. Use when planning or implementing a feature, multi-milestone epic, user-visible fix, behavior change, BDD journey, requirements update, or Vibe Model workflow.
---

# Vibe Model

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

> **Core Posture: Prefer grilling over just doing: "When in doubt, grill."**
> Default to consulting relevant skills and interviewing the user one decision at a time before touching code.

> **Canadianization:** Before planning, implementing, or delegating, take a deep breath. Be polite; remind yourself and delegated agents that they are excellent at their jobs and careful in how they work, and that the user appreciates that care; communicate respectfully and treat colleagues well.

## Outer Loop: Multi-Milestone Epics

When a task exceeds a single slice, establish the outer loop before coding:
1. **Architectural Baseline (ADR, conditional):** If the repo uses ADRs (check repo instructions like `AGENTS.md`, existing `docs/adr/`, or ask developer) and the epic introduces new architecture or cross-surface boundaries, invoke `grill-with-docs` to draft and accept an ADR before Milestone 1 begins. If the repo does not use ADRs or the model lacks capability, do not force them.
2. **Epic Plan as Active Checklist:** Create `docs/plan-for-<feature>.md` as the durable, read/write source of truth for the entire epic; not a draft-and-forget document. It links the ADR (if any), carries the coarse milestone progression checklist plus, once a milestone starts, its "Down the V" / "Back up the V" checklists that agents update continuously as work lands. It must let any agent resume after a context reset with zero chat history (see the plan-as-checklist contract in `REFERENCE.md`: restart protocol, checklist conventions, continuous update rules, handoff file, working-file routing). Keep future milestones coarse; expand a milestone's section into its detailed checklist only when that milestone starts.
3. **Working Files (flat `docs/vibe-model/`, `<epic>-` prefixed):** three per-epic working files retain working context, decisions, and review outcomes across loops. The plan is the checklist SSOT — the Epic Milestone Progression checklist lives ONLY in the plan, never duplicated in the working files. The working files are the working memory behind it, split by the **next-action test**: needed for the NEXT action → handoff; needed by any future milestone in the epic → learnings; only for re-opening/auditing this slice → its milestone notes; deferred beyond the epic → the repository's tech-debt db.
   - `<epic>-handoff.md` — state pointer, ~30 lines, **rewritten in place** (never appended; git history keeps the past). First line: `Active: M<N> Phase <P> | Item: <item>`. Rewrite on every checklist item flip, gate verdict, and blocker change, and mandatorily before any context compaction. Current-state discovery across epics: `grep -H 'Active:' docs/vibe-model/*-handoff.md`.
   - `<epic>-learnings.md` — guardrails ledger (do-not-redo, constraints, corrections, symptom→cause mappings), appended as found, read at every resume; consolidated/deduped at each milestone wrap-up. No external memory tool is assumed.
   - `<epic>-m<N>-notes.md` — one evidence file per milestone (gate tables, discovery reports, evidence, review findings); frozen at milestone close.
4. **Execute Inner V-Loop:** Run Phases 0–4 for the current milestone, updating the plan's active checklist and the working files as work lands, never only at wrap-up.
5. **Milestone Wrap-up:** Check off the milestone in the plan, update in-flight ADR in-place via `grill-with-docs` if architectural assumptions shifted, consolidate `<epic>-learnings.md` (dedupe/merge), sync documentation/requirements, run full repo gates (orchestrator-owned), execute iteration review, resolve findings, propose and commit milestone with user approval.
6. **Iteration Review (before every new milestone):** Before spinning the next V-loop, review the just-completed full iteration with fresh retrospective subagents loaded with the skills matching the milestone's changed surfaces. Triage findings into: fixes or guardrails written into the plan's next-milestone checklist or the learnings ledger, tech-debt db entries, or requirement/doc corrections. Record the outcome in plan + the milestone's notes. Only then rewrite the handoff, compact, re-read, and start the next Phase 0. Mechanics in `REFERENCE.md`.
   - **Discovery debt rule (always on):** Log follow-ups in the epic plan checklist if in-epic; log in the project's tech-debt db (`docs/tech-debt-db.md`) only if outliving the epic. Link entry ID (e.g. `TD-071`) from the plan/notes line (details in `REFERENCE.md`).
7. **Plan sweep BEFORE the merge (hard gate):** the epic's paper trail must be complete and clean BEFORE the final PR is opened/merged — never after. Concretely: (a) verify the epic plan has ZERO unchecked boxes (tick any box whose work is verifiably landed — verify against code with evidence, don't assume); (b) fix stale status lines and stale `Impl ❌` markers; (c) run the learnings **promotion pass** (route durable learnings to repository-local durable homes — tech-debt-db entries, agent-instruction invariants, guidelines docs); (d) move the epic's whole working-file set (handoff, learnings, all `m<N>-notes`) to the archive subfolder (`docs/vibe-model/archive/` by default) via `git mv`; (e) move the completed plan itself to the repo's archived-plans home (`docs/archive/plans/` by default) via `git mv`. An epic that reaches a merge with unchecked boxes or un-archived working files is a process defect, not a follow-up — context compaction during long epics loses ticks, so do this sweep with the full plan file re-read end-to-end, immediately before opening the final PR.
   - Post-merge archive (if the sweep was still somehow skipped): do the same steps as the first action after merge, before anything else.

## Inner Loop: The V-Model Phases

### Phase 0: Skills Inventory Gate (mandatory)
- Output the **Phase 0 Gate Table** from `~/.agents/skills-inventory.md` and `./.agents/skills-inventory.md`.
- Map surfaces to skills/rules AND guidelines documents (style guides, coding standards, architecture docs — these form the review gates' required reading list) with status (`read`, `scheduled`, `not applicable`, `blocked`).
- **Security trigger:** If touching trust boundaries (auth, rules, input, secrets), load security skill as `read` before Phase 1.
- **Post-compaction resume:** if this Phase 0 follows a context compaction (or a session resumed mid-epic), first locate the epic via `grep -H 'Active:' docs/vibe-model/*-handoff.md`, then read in order: the handoff (state pointer) → the epic plan end-to-end → the learnings ledger; open the active `m<N>-notes` only when evidence lookup is needed. State the current phase + next un-run gate aloud before touching code.
- **Durable-invariant sync:** identify the project's SSOT agent-instructions file (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, ... — ask the user which file is the SSOT if unclear). Propose durable process invariants learned from recent work (corrections, skipped-step failures) as candidate additions; ask the user before editing, then run the project's instruction-propagation script if one exists (e.g. `scripts/copy-ai-instructions.sh`).

### Phase 1: Discovery & Grilling
- Run discovery fan-out via read-only subagents (instructions, guidelines, tooling, skills); merge into phase map.
- **Grill ONE question / decision branch at a time** with concrete options and one explicit recommendation. Wait for answers.

### Phase 2: Intent & Design
- Update behavior requirements (mark `Impl ❌` before code); get explicit design approval.
- Prototype user-visible surfaces (interactive `.html` prototypes by default for app design; SVG/Mermaid for flows; ASCII only for CLI/terminal output); write high-level BDD scenarios.
- Author **context briefs** for delegated coding surfaces; run any scheduled design-review gate before Phase 3.
- **Planning gate (always on):** a fresh review subagent reviews requirements (tracing to ADR if applicable) + BDD + design and returns GO / FIX-FIRST / NO-GO. No Phase 3 until GO.

### Phase 3: Build & Defense
- Build behavior and tests together (BDD for observable journeys, TDD for isolated logic).
- Delegate independent slices with clear ownership and context briefs; run slice/guidelines review gates via fresh subagents.
- **Implementation gate (always on):** a fresh review subagent reviews the changed-file diff + test coverage and returns GO / FIX-FIRST / NO-GO. No Phase 4 until GO.

### Phase 4: Verify & Close
- Run test suites proportionate to risk; execute routed review-gate subagents.
- Present acceptance evidence; update requirement statuses (`Impl ✅` when fully verified, `Impl ⚠️` for partial milestone slices); run repo quality gates.
- On failure: return to earliest invalidated phase (requirements/design loop-backs require re-approval).

## Repository Rules
- Existing local instructions and validators override this skill.
- If no catalog exists, propose a lightweight catalog before creating it.
