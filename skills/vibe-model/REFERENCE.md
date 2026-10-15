# Vibe Model Reference

Read this reference when defining multi-milestone epics, behavior scenarios, adapting the workflow to a repository, or selecting verification evidence.

## Multi-milestone outer loop & epic planning

When a feature or migration is larger than a single self-contained milestone (e.g. multi-step data models, full wizards, complex workflows), establish the **Outer Loop** before diving into implementation:

1. **Epic Plan (`docs/plan-for-<feature>.md`) — the active checklist**:
   - Establish product intent, architectural boundaries, and a coarse **milestone progression checklist** (e.g. M0: schema/rules/lifecycle, M1: solver/algorithms, M2: setup UI, M3: wizard flow, M4: public reviewer interface, M5: AI synthesis).
   - **Granularity rule**: Keep future milestone definitions coarse and boundary-focused. Avoid prematurely locking down function names, UI widget trees, or internal state shapes in the epic plan. Expand the active milestone's section into detailed **"Down the V" / "Back up the V" checklists** only when that milestone starts; each milestone spins its own inner V-loop where dynamic Phase 0/1 discovery, grilling, and subagent delegation establish those details when context is fresh.
   - **Living artifact rule**: the plan is read AND written continuously; after every landed slice, discovery correction, review finding, deferral, and status flip, not retroactively at wrap-up. No decision recorded in the plan may rely on chat history; an agent resuming after a context compaction, model change, or handoff must be able to reconstruct the mission and status from the plan and working files alone.
   - **Plan-as-checklist contract** (required governance sections; adapt to the repository):
     - **Restart protocol** after any context reset: locate the epic via `grep -H 'Active:' docs/vibe-model/*-handoff.md`; read the handoff (state pointer), then the plan end-to-end, then the learnings ledger; open the active `m<N>-notes` only when evidence lookup is needed. Then read governing instruction files and guidelines, inspect `git status` and preserve unrelated changes, check project memory/graph, confirm the active milestone and first unchecked item, run the milestone's Phase 0 gate before changing code, and record new decisions immediately rather than at session end.
     - **Checklist conventions**: `[ ]` not started; `[~]` in progress with owner, date, and current evidence or blocker; `[x]` complete with evidence recorded in the milestone notes; `[!]` blocked with the exact blocker, attempts, and next safe action. A parent item is complete only when every required child item and its verification evidence are complete.
     - **Continuous update rules**: mark exactly one active milestone and one concrete item `[~]` at a time; record slice outcomes (changed behavior, files, focused tests, risks, next action) as they land; track every deliberate deferral in the repository's tech-debt db; never silently change product scope or recorded facts.
     - **Handoff file** (`docs/vibe-model/<epic>-handoff.md`) rewritten in place before any compaction or handoff — never appended (git history keeps the past): active milestone/phase, active checklist item, last completed item and evidence, changed files, checks run, decisions/corrections, blockers, user authority still required, exact next safe action, and a do-not-redo list. First line is greppable: `Active: M<N> Phase <P> | Item: <item>`.
   - **Working-file map and routing (next-action test)**: the plan is the checklist SSOT and decision record — the Epic Milestone Progression checklist lives ONLY there. Working memory is split across three `<epic>-` prefixed files in flat `docs/vibe-model/`: `<epic>-handoff.md` (state pointer; ~30 lines; rewritten on every item flip, gate verdict, blocker change, and mandatorily before compaction), `<epic>-learnings.md` (guardrails ledger — do-not-redo, constraints, corrections — appended as found, read at every resume, consolidated at each wrap-up), and `<epic>-m<N>-notes.md` (one evidence file per milestone — gate tables, discovery reports, review findings — frozen at milestone close). Route a fact by the **next-action test**: needed for the NEXT action → handoff; needed by any future milestone → learnings; only for re-opening/auditing this slice → its m<N>-notes; deferred beyond the epic → the repository's tech-debt db. Newest-notes discovery: `ls docs/vibe-model/<epic>-m*-notes.md | sort -V | tail -1`. Older epics that used a single `milestone-notes-<feature>.md` tracker are grandfathered; migrate them to this layout when next touched.

2. **Working files (flat `docs/vibe-model/`, `<epic>-` prefixed)**:
   - Live in a predictable, flat directory (`docs/vibe-model/` by default, or repository planning directory) to avoid documentation root clutter; the `<epic>-` prefix keeps parallel epics' files grouped in one listing.
   - Serve as the persistent working scratchpad and memory anchor across context resets and milestone passes, split by the next-action test into handoff (state), learnings (guardrails), and per-milestone notes (evidence).
   - The **Epic Milestone Progression** checklist (M0..MN) lives ONLY in the epic plan; working files never duplicate it.
   - Handoff and learnings live for the whole epic; notes files are frozen at milestone close; the whole set is archived (after the learnings promotion pass) when the epic ships.

3. **Inner V-Loop per Milestone**:
   - Run the full V-Model (Phases 0 through 4) for each milestone independently.
   - Update the plan's active-milestone checklist and the working files continuously as work lands.
   - Maintain strict traceability (requirements catalog rows and scenarios) as work progresses.

4. **Milestone Wrap-up & Loop Transition**:
   - Follow the full 6-step wrap-up protocol detailed in `## Milestone wrap-up & loop transition` below (sync docs, run gates, execute iteration review, commit, compact).

## Architecture Decision Records (ADRs) & architectural baselines

An **Architecture Decision Record (ADR)** captures *why* an architectural choice was made, the context, trade-offs, and alternatives rejected (SWE.2/3). It is distinct from the **Requirement Catalog** (SWE.1), which captures *what* observable behavior the system must exhibit right now.

### ADR detection & opt-in contract
Do not force ADRs unconditionally:
1. **Repository convention check**: Check agent instruction files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, etc.) and detect whether an ADR directory exists (e.g. `docs/adr/`, `doc/adr/`, `architecture/decisions/`). Default authoring location is `docs/adr/NNNN-<slug>.md` unless an existing repo structure dictates otherwise.
2. **Developer confirmation**: If absent or ambiguous, ask the developer whether the project uses ADRs.
3. **Capability guard**: If the repository does not use ADRs or the agent model lacks ADR capability, do not force them.

### Pre-epic Outer Loop authoring (`grill-with-docs`)
When a project uses ADRs and an upcoming epic introduces architectural shifts, new components, cross-surface boundaries, or technology/vendor selections:
- **Prerequisite to Milestone 1**: The ADR must be drafted, reviewed, and accepted in the Outer Loop *before* starting Milestone 1 Phase 0.
- **Designated skill**: Invoke `grill-with-docs` to interview the design, weigh alternatives, and generate both the ADR and any new domain terms.
- **Traceability to requirements**: The epic plan (`docs/plan-for-<feature>.md`) cites the ADR as its architectural baseline. Observable requirements derived from the ADR are drafted in the plan or requirements catalog (`Impl ❌`), citing `Source: adr/NNNN-<slug>.md`.

### In-flight mid-epic pivots vs. immutable shipped ADRs
- **In-flight revisions**: If implementation during an active epic discovers that an architectural assumption in its ADR is invalidated, re-invoke `grill-with-docs` to revise the current in-flight ADR in-place, adding an updated decision and a timestamped amendment note (e.g. `## Amendments: YYYY-MM-DD: <rationale>`).
- **Past shipped ADRs**: ADRs from past, shipped epics remain immutable historical records. Subsequent epics modify previous architectures by creating a new ADR that explicitly amends or supersedes the prior ADR (e.g. `Amends: [0003 - unified entitlement](0003-unified-premium-entitlement.md)`).

### Review gate checks
- **Phase 2 Planning Gate**: The reviewer verifies that planned requirements trace back to and conform with the ADR.
- **Milestone Wrap-up**: Step 1 verifies that any architectural pivots discovered during implementation were recorded in the ADR.

## Working-file templates

Create all three working files at the start of an epic. The Epic Milestone
Progression checklist lives ONLY in the epic plan — never duplicate it here.

### Handoff template (`docs/vibe-model/<epic>-handoff.md`)

~30 lines, rewritten in place (never appended). Rewrite on every checklist item
flip, gate verdict, blocker change, and mandatorily before any compaction.

```markdown
# Handoff: <Feature Name>

Active: M<N> Phase <P> | Item: <active checklist item>

- Epic plan: docs/plan-for-<epic>.md | Learnings: docs/vibe-model/<epic>-learnings.md
- Last completed: <item> — <one-line evidence + test path>
- Next safe action: <exact action>
- Blockers: <none | blocker + owner>
- Changed files (uncommitted): <paths>
- Checks run: <gates + results>
- Decisions/corrections since last write: <one-liners>
- User authority still required: <none | what>
- Do-not-redo: <learned-the-hard-way items not yet in the learnings ledger>
Updated: <date time>
```

### Learnings template (`docs/vibe-model/<epic>-learnings.md`)

Append as found; read at every resume; consolidate (dedupe/merge) at each
milestone wrap-up; promotion pass at epic close routes durable entries to
repository-local durable homes (tech-debt db, agent-instruction invariants,
guidelines docs). No external memory tool is assumed.

```markdown
# Learnings: <Feature Name>

Guardrails for any agent working anywhere in this epic. One entry per fact.
Format: `- [<date>] <rule/constraint/correction> — <why/source>`.

- [2026-01-01] Do not <action> — <symptom it caused, file:line>.
- [2026-01-01] Constraint: <hard limit> — <source/decision>.
```

### Milestone notes template (`docs/vibe-model/<epic>-m<N>-notes.md`)

One file per milestone; evidence only (gate tables, discovery, review
findings). Frozen at milestone close; archived with the epic.

```markdown
# <Feature Name> — Milestone <N> (<Slice Name>): Execution Notes

Evidence file for milestone M<N> of `docs/plan-for-<epic>.md`.
State pointer lives in `docs/vibe-model/<epic>-handoff.md`.

### Phase 0 gate table
| Surface | Skill / rules | Status |
|---|---|---|
| <Boundary / Surface 1> | <skill-name> | read |
| <Boundary / Surface 2> | <skill-name> | scheduled |
| UI | none in this slice | not applicable |

### Phase 1 discovery (<Date>, fan-out reports merged)
- Key architecture constraints, existing precedents, file paths.
- Instruction sweeps, CI gates, and validator requirements.

### Phase 2 decisions & planning gate
- Concrete domain models, collection paths, transition invariants.
- Planning gate verdict: `GO` / `FIX-FIRST` / `NO-GO` (requirements + BDD + prototype).
- Requirement IDs (`REQ-<AREA>-NNN`) added or updated with `Impl ❌/⚠️`.
- BDD scenarios (`SCN-<AREA>-NNN`) linked to tests.

### Phase 3 build & implementation gate
- Summary of landed modules, tests, and evidence.
- Implementation gate verdict: `GO` / `FIX-FIRST` / `NO-GO` (changed-file diff + test coverage).
- Lessons learned, test environment gotchas, and E2E insights.

### Phase 4 verify & closing gates
- Review subagents (security when triggered, verification checks, repo gates).
- Sanity checks and gate runs (`sanity_check_build_typescript.sh`, `lintall.sh`, `testall.sh`).
- Acceptance evidence and updated requirement statuses.

### Iteration review (retrospective before the next milestone)
- Review subagents and the skills each loaded; findings with severity.
- Triage: fixed now (with re-run evidence) / plan amendments written into the
  next milestone's checklist / learnings-ledger entries / `TD-NNN` entries /
  requirement or doc corrections.
```

## Milestone wrap-up & loop transition

After completing Phase 4 of an inner V-loop:

1. **Checklist & Documentation Sync**:
   - Check off the completed milestone in the plan's `## Epic Milestone Progression` checklist (the only copy).
   - Consolidate `<epic>-learnings.md`: dedupe/merge overlapping entries; promote anything already durable to its repository-local home (tech-debt db, agent-instruction invariants) so the ledger stays a working layer, not a second SSOT.
   - Update requirements catalog (`docs/requirements.md`): flip status to `Impl ✅` (or repository-specific partial status such as `Impl ⚠️` with dated notes for intermediate milestones), record test paths and evidence.
   - Update architecture docs, style guides, or API docs if new patterns were established; update in-flight ADR in-place via `grill-with-docs` if architectural assumptions shifted (with timestamped amendment note).
   - Track deferred items outliving the epic in `docs/tech-debt-db.md` (in-epic follow-ups belong in the plan's milestone checklist per the Discovery debt rule).
2. **Scratch & Subagent Cleanup**:
   - Remove temporary scratch scripts, transient benchmark files, or debug artifacts.
3. **Repository Quality Gates (Orchestrator Ownership)**:
   - The orchestrator runs the full required repository sanity/lint/test suite (e.g. `./scripts/sanity_check_build_typescript.sh`, `./scripts/lintall.sh`, `./scripts/testall.sh`).
   - Subagents must never run full minutes-long suites; the orchestrator run is the single source of truth.
4. **Iteration Review (mandatory before the next milestone)**:
   - Run the retrospective described in "Iteration review between milestones" below.
   - Triage findings: resolve "Fix now" blocking corrections and doc drifts immediately; record deferred items into the next milestone plan checklist or tech-debt db.
5. **Milestone Commit**:
   - Review the completed diff against repo guidelines (including any iteration review "Fix now" resolutions).
   - Propose a clean milestone commit message following repository rules (no AI co-author trailers, explicit user approval).
   - When all milestones are finished and shipped: run the learnings **promotion pass** (route durable learnings to repository-local durable homes — tech-debt db entries, agent-instruction invariants, guidelines docs), then move the epic's whole working-file set (`<epic>-handoff.md`, `<epic>-learnings.md`, all `<epic>-m<N>-notes.md`) to the archive subfolder (`docs/vibe-model/archive/` by default) via `git mv`.
6. **Context Compaction & Clean Re-entry**:
   - Rewrite `<epic>-handoff.md` (state pointer) so it captures all essential state and clearly marks the next active milestone; freeze the completed `m<N>-notes` file.
   - Compact conversation context (or note state for session continuation).
   - Take a deep breath (Canadianization).
   - Resume per the restart protocol: grep the handoffs, read handoff → plan → learnings (active notes on demand), and spin up Phase 0 of the next milestone.

## Iteration review between milestones

Phase 4 review gates judge the milestone's diff against its specs. The
**iteration review** is different: a retrospective over the completed V-loop as
a whole, run after wrap-up and before the next milestone's Phase 0. Its purpose
is to capture corrections while the iteration's context is still recoverable,
and to amend the next milestone's plan checklist before any work starts, so
lessons survive the context compaction that follows.

1. **Prepare**: confirm the plan and the milestone's notes file reflect the completed milestone
   truthfully (checklist checked off, evidence recorded). List the milestone's
   changed surfaces and the skills that govern them (from the phase map).
2. **Fan out fresh retrospective subagents** (no investment in the artifacts
   they judge; at least as capable as the implementers), each loading the
   matching skill from the repository's review routing before reviewing:
   - **Code/architecture retrospective** over the milestone diff: structure,
     seams, duplication, dead ends, missed reuse, contracts that drifted.
   - **Surface-specific reviews** per the repository's routing: security for
     trust boundaries, UI/UX for user-visible slices, testing for evidence
     quality, and so on.
   - **Process retrospective**: did the plan checklist, requirement statuses,
     and notes stay truthful; which loop-backs, rework, or blocked time
     occurred and why; which epic-plan assumptions proved wrong.
3. **Output contract**: code findings as `file:line: severity: problem. fix.`;
   process findings as `plan|notes|requirements: section: problem. fix.`; each
   reviewer ends with an explicit pass/fail verdict against its loaded skill.
4. **Triage (orchestrator-owned)**, recorded as an iteration-review entry in
   the plan (and mirrored in the milestone's notes file):
   - **Fix now**: blocking findings corrected before the next milestone starts,
     with affected evidence re-run.
   - **Plan amendments**: non-blocking fixes, guardrails, constraints, and
     do-not-redo lessons written directly into the next milestone's checklist
     section and, where durable, the plan's boundary/context sections.
   - **Tech debt**: deferred items get `TD-NNN` entries in the repository's
     tech-debt db; a comment or unchecked box is not sufficient.
   - **Requirement/doc corrections**: statuses or wording that drifted from
     shipped behavior are corrected immediately.
5. **Close the loop**: check off the iteration review in the plan, rewrite the
   handoff file with the next milestone as active, compact context, re-read
   handoff → plan → learnings, then spin Phase 0 of the next milestone.

**Scaling**: full fan-out for trust-boundary or multi-surface milestones; a
single retrospective reviewer for low-risk slices. Never skip the review
entirely: the minimum is one reviewer plus the plan/notes truthfulness check.


## Feature-branch phase map & Skills Inventory

Use the dynamic skills inventories before requirements gathering for every task or feature branch:
1. **Global Skills Inventory**: `~/.agents/skills-inventory.md` (all machine-installed capabilities and their explicit triggers).
2. **Workspace Skills Inventory**: `./.agents/skills-inventory.md` (project-specific guidelines, architecture, and constraints).

Refresh either inventory if absent or stale.

```text
Project: <name/root>
Branch and scope: <branch> | <requested outcome> | <explicit exclusions>
Inventories: ~/.agents/skills-inventory.md + ./.agents/skills-inventory.md
Phase 1 (Discovery & Grilling): <skills + threat model / auth triggers>
Phase 2 (Intent & Design): <skills + layout / styling / architecture triggers>
Phase 3 (Build & Defense): <skills + DbC / TDD / state triggers>
Phase 4 (Verify & Close): <skills + test tiers / CI gates>
Gates: <commands + required evidence>
Delivery: <tracker/catalog/docs + approval points>
Constraints: <scope, access, secrets, deploy, and authority boundaries>
```

Populate `Gates` from what the repository actually runs — CI workflow, package scripts, `Makefile`/`justfile`, pre-commit hooks, or documented validators — not from assumptions. Typical gate classes: build/compile, lint/static analysis, type or contract checks, test suites, and any requirements-catalog validator.

Derive the branch phase map from the inventories and surface analysis. It should answer:

- Which files are authoritative, and which copies must never be edited directly?
- Which skills are available in `~/.agents/skills-inventory.md` and `./.agents/skills-inventory.md`, which ones govern the expected change surfaces, and when must each be loaded?
- Which security, authorization, or database boundary rules apply?
- Which instructions and architecture, requirements, quality, security, and delivery documents govern discovery, design, build, review, verification, and delivery?
- Which checks and approval points are mandatory before work can close?

Mark each skill or guideline as `read`, `scheduled`, `not applicable`, or `blocked`. Never treat `scheduled` as permission to skip it: read it before the mapped phase begins.

A populated example:

```text
Project: acme/app
Branch and scope: feature/notes-delete | delete flows durable | exclude sharing
Phase 1 (Discovery & Grilling): vibe-security (read) — user document boundaries
Phase 2 (Intent & Design): frontend-design (scheduled) — confirmation UX
Phase 3 (Build & Defense): typescript-defensive-programming (scheduled)
Phase 4 (Verify & Close): testing-strategy (scheduled) | sanity, lintall, testall
Gates: guidelines-review (prompt-requested) after Phase 3 slice
```

## Phase 0 gate table

Phase 0 produces the **initial** gate table from the task request plus the skills inventories; the Phase 1 discovery fan-out then amends it to the **final** map before grilling concludes.

Populate the union of changed surfaces from: the task request (defines scope), the inventories, and the repository's guidelines and architecture docs. Record conflicts between sources in the table; do not silently resolve them. A row is complete only when each applicable skill or rule has an owner phase and a status (`read`, `scheduled`, `not applicable`, `blocked`).

**Guidelines documents belong in the table.** For every changed surface, the `Mapped Available Skills / Rules` cell names BOTH the governing skill(s) AND the governing guidelines documents — style guides, coding standards, architecture docs, ADRs, language guidelines (e.g. `docs/typescript-guidelines.md`, `docs/style-guide.md`, `sau/C_CODING_GUIDELINES.md`). These are the same documents the review-gate reviewers load at their gates: Phase 0 is where the reviewer's reading list is established, so no gate reviewer is ever assembled from a blank page. If a guideline doc for a surface exists in the repo but is missing from the row, the row is incomplete.

**Scaling**: full 4-row table for trust-boundary or multi-surface work; compact one-line map for low-risk slices (isolated fix, refactor, docs) — e.g. `Phase 0 (compact): surface = single file, no governing skills beyond lint → proceed.` Scaling never drops the security trigger check.

```markdown
### 🛡️ Phase 0: Dynamic Skills & Phase Map Gate

| Phase                             | Domain Surface                                               | Mapped Available Skills / Rules | Assessment & Trigger                      |
| --------------------------------- | ------------------------------------------------------------ | ------------------------------- | ----------------------------------------- |
| **Phase 1: Discovery & Grilling** | Requirements, guidelines, threats, trust boundaries          | `<discovered skills/rules>`     | `<applicable risk / constraints>`         |
| **Phase 2: Intent & Design**      | User- or system-visible surfaces, module seams, architecture | `<discovered skills/rules>`     | `<layout, contracts, structure>`          |
| **Phase 3: Build & Defense**      | Code, contracts, state, test-first patterns                  | `<discovered skills/rules>`     | `<implementation patterns & constraints>` |
| **Phase 4: Verify & Close**       | Test levels, review, required checks                         | `<discovered skills/rules>`     | `<acceptance & regression criteria>`      |
```

Fallbacks: treat the two inventories as the single source of truth for specialized capabilities. Skip the global inventory in a sandboxed environment without host access, fall back to the workspace inventory, and if neither exists derive a minimal map from repo-local instruction files, recording the gap in the table.

**Trust-boundary security triggers** — when the slice touches any of these, load the mapped security skill and follow its workflow, status `read`, before Phase 1 questions:

- Security rules or policies (e.g. `firestore.rules`, firewall configs), including secure boot
- Authentication or authorization
- Untrusted external input
- Update or boot paths (e.g. OTA, bootloaders)
- Key or credential storage
- Memory-unsafe code
- Concurrency-critical code (e.g. RTOS tasks, shared memory, ISRs)

Cross-check changed surfaces against the skills assessment checklist below.

## Skills assessment checklist

During Phase 0, evaluate the task surface against the skills in `~/.agents/skills-inventory.md` and `./.agents/skills-inventory.md`:

The following examples show how a changed surface can reveal a relevant skill.
They are prompts for broader assessment, not a routing taxonomy or a complete
list.

| Changed surface | Look for guidance covering | Typical phase |
| --- | --- | --- |
| User-facing screens, interaction, visual hierarchy, accessibility, or responsive behavior | Frontend, UX, design, or platform UI skills | Design, implementation, review |
| Authentication, authorization, payments, secrets, user data, API boundaries, database rules, update or boot paths (OTA, bootloaders), secure boot, key storage, or untrusted external input | Security and defensive-programming skills | Requirements, design, implementation, review |
| Module boundaries, cross-platform structure, dependency design, or refactoring | Architecture or codebase-design skills | Discovery, design, review |
| State machines, parsers, contracts, untrusted data, or language-specific implementation | Defensive-programming and language-specific skills | Design, implementation, review |
| Unit, integration, acceptance, mobile, browser, or E2E coverage | TDD or testing-strategy skills | Design, implementation, verification |
| Releases, deployed configuration, CI, migrations, or operational workflows | Static-guard, deployment, or platform-operation skills | Requirements, implementation, verification, delivery |
| Peripheral drivers, hardware registers, interrupt handlers, or HAL / board-support boundaries | Platform, driver, or hardware-interface skills | Design, implementation, review |
| RTOS tasks, scheduling priorities, timing budgets, shared memory, or concurrency between ISRs and main loops | Concurrency and defensive-programming skills | Design, implementation, review |
| Linker scripts, memory maps, stack / heap / code-size budgets, or toolchain and static-analysis rules (e.g. MISRA, CERT-C) | Toolchain, coding-standard, or build-system skills | Design, implementation, verification |
| Flashing, hardware-in-the-loop rigs, simulators or emulators (QEMU, Renode), or on-target tests | Test-infrastructure or platform-operation skills | Verification |

When a skill is applicable, put it in the phase map and read it before the
first phase it governs. Reassess all available skills whenever the branch scope
or risk profile materially changes.

## Delegated exploration

All exploration — discovery, sweeps, research — is performed by subagents, not
the orchestrator directly. Split read-only work into independent assignments,
such as repository and guideline discovery, skill enumeration and relevance
assessment, related-code and test analysis, external research, and risk-surface
review. Ask every agent to report sources, applicable skills, phase
recommendations, constraints, and open questions.

Each agent's output is summarized, targeted context for the next agent in the
chain, never a raw dump of what was read. The orchestrator passes this context
forward — into the phase map, context briefs, coding-subagent prompts, and
review-gate prompts. A handoff may take the form of a temporary file (scratch
or branch-local, not committed unless the repository wants it durable), but
equally can be passed inline in the prompt; choose whatever keeps the receiving
agent's context small and focused.

Match the subagent to the task class: discovery and inventory → cheaper,
faster models; diagnosis → capable but bounded; review gates → at least the
capability of the code author (see Delegated review).

Keep the orchestrator accountable for combining reports into the phase map,
making product and technical decisions, reading skills before their governed
phase, integrating implementation slices, and running the repository's final
required checks. Do not give subagents overlapping edits or work that local
rules reserve for the orchestrator.

## Discovery fan-out

Before any code is written, split rule discovery across read-only subagents:

- **Instructions sweep**: find and read the instruction-file hierarchy — `AGENTS.md`, `CLAUDE.md`, and nested copies (repo root, packages, app modules). Report which files are authoritative, which paths each governs, and any overriding or conflicting rules.
- **Guidelines sweep**: locate the style guides, coding standards, lint configs, and architecture docs that govern the changed surfaces. Report the rules that will bind implementation, each with its source file.
- **Tooling sweep**: read the CI workflow, package scripts, `Makefile`/`justfile`, and pre-commit hooks to identify the repository's required gates (build, lint/static analysis, type or contract checks, test suites, catalog validators). Gates must land in the final gate table before grilling concludes — Phase 3 test choices and Phase 4 evidence depend on them.
- **Skills sweep**: for each phase-map entry, confirm the skill exists, its trigger, and what it governs in this slice.

Each agent reports sources, applicable rules, constraints, and open questions. Discovery agents report; they do not propose designs or edit anything. The orchestrator merges results into the phase map.

## Prototyping formats and hierarchy

During Phase 2 (Intent & Design), choose the prototyping medium that best communicates design hierarchy, spacing, density, and interactions:

1. **Interactive HTML (`prototypes/<topic>.html` - Default for App & UI Design)**:
   - Zero-dependency, single-file HTML/CSS/JS.
   - Uses project color tokens, typography scales, responsive containers, and mocked state reducers (tabs, dropdowns, modal overlays).
   - Allows hands-on user review in browser and automated inspection by `/unslop-ui` / `/frontend-design` subagents before writing production state plumbing.
2. **SVG / Mermaid Diagrams (`.svg` or fenced code blocks - Flows & Lifecycle)**:
   - For state machines, lifecycle transitions, entity relationships (ERD), architecture boundaries, and sequence diagrams.
   - Embeds directly into Markdown plans and PR descriptions.
3. **Low-Fidelity Wireframes (Excalidraw / Balsamiq)**:
   - For early conceptual exploration where visual design must remain explicitly open/loose.
4. **Terminal ASCII**:
   - Strictly reserved for CLI tool output formatting or trivial single-line text layout confirmation.

## Context briefs

A context brief is the summarized context a specialized subagent produces so each coding subagent does not re-derive it.

Author each brief with a subagent loaded with the governing skill (frontend design, backend, security, platform, language), asked to distill that skill plus the discovered guidelines into:

```text
Brief: <surface> | sources: <skill + guideline files>
Hard rules: <must-follow constraints, each with source>
Patterns: <approved structures, naming, idioms for this slice>
Pitfalls: <known traps on this surface>
Open questions: <anything needing a user decision>
```

Keep each brief compact — working context, not documentation. A coding subagent starts only after receiving the brief for its surface; if none exists, create it first. Briefs live for the slice. Rules that must outlive it belong in the requirements, guidelines, or phase map instead.

## Delegated implementation

Delegate implementation when the work can be divided into independent slices.
Match each slice to the most relevant available skill or specialist subagent,
such as a frontend, security, platform, testing, or domain specialist. Give the
subagent its ownership boundary, applicable phase-map entries, requirement and
acceptance evidence, affected files, and explicit non-goals.

Keep cross-slice contracts, shared files, migrations, integration, and final
verification under orchestrator ownership unless local instructions explicitly
assign them elsewhere. Use one owner per file at a time and integrate completed
slices before cross-slice review.

## Delegated diagnosis

When a bug, failed check, or performance regression needs trial and error,
assign a lower-cost subagent with applicable diagnostic or domain guidance to a
bounded investigation. Ask it to report:

- A reliable reproduction or the limits of reproduction.
- The smallest failing case and relevant code path.
- Hypotheses, experiments, and observed results.
- Instrumentation or logs that support the conclusion.
- The proposed correction, risks, and regression evidence.

Allow a contained fix only when the slice has clear ownership. Keep the
orchestrator responsible for deciding whether the evidence supports the root
cause, integrating the change, and running final regression and required
repository checks. Return to requirements or design when the investigation
invalidates an earlier assumption.

## Review plan and gates

Two **stage go/no-go gates are always on** (not optional): a **planning gate** after Phase 2 and an **implementation gate** after Phase 3. Each is a fresh review subagent that returns an explicit verdict, and the next phase does not start until the verdict is **GO**:

- **Planning gate (after Phase 2)** — reviews requirements + BDD scenarios + design/prototype against the phase map. Verdict GO opens Phase 3 (Build).
- **Implementation gate (after Phase 3)** — reviews the changed-file diff (correctness, regressions, spec adherence, test coverage). Verdict GO opens Phase 4 (Verify & Close).

On **FIX-FIRST** (blockers found): fix the blockers, re-run the same gate, and only proceed on GO. On **NO-GO** (design/requirements invalidated): return to the earliest invalidated phase for re-approval. Record the verdict and the gate outcome in the plan checklist and milestone notes.

**Discovery debt rule (applies to every phase and reviewer):** a discovery correction or follow-up surfaced mid-build goes to the repository's tech-debt db (`docs/tech-debt-db.md`; follow its entry format; create it if absent) **only when no future milestone in the same epic can close it** — it outlives the current autonomous run. In-epic follow-ups live in the epic plan's owning-milestone checklist line; the db is for what the epic won't fix. A discovery recorded only in milestone notes or chat is lost at compaction. Link the entry id (e.g. `TD-071`) from the plan/notes line where the discovery was made.

Other review gates are **off by default**, with one exception: whenever the Phase 0 trust-boundary security trigger fired, a security-review gate is scheduled automatically — it is not optional. Enable other gates when the prompt requests review, or during Phase 1 grilling when warranted. Record prompt-requested gates in the Phase 0 gate output; add grilling-warranted gates in Phase 1, before Phase 2 starts.

```markdown
| Review gate                      | Runs after | Verdict gates                                 | Reviewer subagent loads                      | Reviews                                 |
| -------------------------------- | ---------- | --------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| planning-gate (design-review)    | Phase 2    | Phase 3 start (GO / FIX-FIRST / NO-GO)        | architecture skill or `docs/architecture.md` | requirement + BDD scenarios + prototype |
| implementation-gate (diff-review)| Phase 3    | Phase 4 start (GO / FIX-FIRST / NO-GO)        | `docs/style-guide.md` + architecture doc     | changed-file diff + test coverage       |
| guidelines-review                | Phase 3    | (advisory unless promoted)                    | `docs/style-guide.md`                        | changed-file diff                       |
| security-review                  | Phase 4    | milestone close (mandatory when trigger fired)| security skill from the phase map            | trust-boundary diff                     |
```

Mechanics — fresh-subagent reviewers, output contract, triage, and failure handling — are in Delegated review below.

Review gates judge artifacts inside one V-loop. The iteration review between milestones is a separate, always-on retrospective over the completed loop; see Iteration review between milestones above.

## Delegated review

Run each review gate as a fresh subagent so the reviewer has no investment in the artifact it judges. Use a reviewer at least as capable as the code author — a weaker reviewer rubber-stamps.

Give the reviewer:

- The skills and guidelines documents to load into the reviewer — every reviewer subagent must load the relevant skills AND the relevant guidelines documents (style guides, coding standards, architecture docs, ADRs) for the surface it judges. The authoritative source for both is the milestone's Phase 0 gate/phase map, whose `Mapped Available Skills / Rules` cells pair each surface with its skills and its guidelines documents (established during Phase 0). Load them via the Skill tool where available, otherwise as named files, plus any spec document the gate table names. Never run a reviewer bare: an unloaded reviewer judges from generic instinct and rubber-stamps.
- The exact review scope: the changed-file diff, the requirement + BDD scenarios, or a design artifact.
- A required output contract: findings as `file:line: severity: problem. fix.` plus an explicit **go/no-go verdict** — `GO` (proceed to the next phase), `FIX-FIRST` (named blockers must be fixed and the gate re-run before proceeding), or `NO-GO` (an earlier phase's output is invalidated; return there for re-approval). For the two always-on stage gates (planning, implementation) the verdict is mandatory and blocks the phase transition; for advisory gates pass/fail against the loaded spec is enough.

The orchestrator stays accountable for triage: fix blocking findings and re-run the gate; record deferred findings truthfully instead of silently dropping them. A failed review gate counts as failed evidence — return to the earliest invalidated stage.

Do not let a reviewer edit the artifact it reviewed unless the review plan explicitly grants it ownership of the fix.

## Behavior scenarios

For repositories with a requirements catalog, keep high-level scenarios close to the requirements rather than creating a separate BDD document. Use a `Behavior scenarios` section with one compact entry per changed journey:

```text
SCN-<AREA>-<NNN> | REQ-AREA-001, REQ-AREA-002 | Given <context>, when <action>, then <durable observable outcome> | <unit|integration|acceptance> | <test path or planned evidence>
```

Guidance:

- A scenario describes a meaningful journey or system boundary, not every branch or UI control.
- One scenario can cover multiple requirements. Avoid one scenario per requirement when users experience them as one flow.
- Keep requirements independently meaningful. Scenario linkage explains grouped verification, not requirement ownership.
- A scenario becomes executable evidence through its linked test. The test description should retain the same observable intent; requirement annotations remain the repository's traceability mechanism.
- Do not add Gherkin files unless the project already uses them or they provide real executable value.

## Choosing test level

Use the narrowest evidence that truthfully verifies the risk.

- Unit and TDD: pure logic, deterministic state transitions, parsers, sorters, validators, value objects, and small adapters. Test contracts and meaningful edge cases.
- Integration and BDD: persistence, API or callable boundaries, module coordination, cross-boundary coordination, lifecycle effects, and durable outcomes.
- Acceptance and BDD: a reachable user journey whose changed behavior is important, destructive, security-sensitive, or crosses a supported platform boundary. Use the repository's platform tooling, such as browser or mobile acceptance tests.

Existing coverage may be extended rather than duplicated. Do not label indirect or unfinished coverage as acceptance evidence.

## Approval and loop rules

- Acceptance failure returns to the earliest invalidated point: intent, design, implementation, or verification. Re-run all affected evidence after correction.
- Re-approval is required only when the loop-back changes the working contract: a return to requirements or design re-enters grilling and needs explicit re-approval before coding resumes; a fix contained in implementation or verification proceeds without user re-approval.
- Grilling posture and mechanics live in the skill (Core Posture and Phase 1); they are not restated here.

## Repository adaptation

First discover local instructions and source of truth.

- Existing mini-ASPICE: use its requirement IDs, status meanings, annotation syntax, test tiers, and validator. Add the scenario section only if the repository format permits it; otherwise record equivalent high-level BDD intent in the accepted local artifact.
- Existing plan-file policy: comply with it. Propose a policy change separately if requirements and scenarios should become the durable plan.
- No catalog: propose a small catalog with stable requirement IDs, current behavior, target surface, implementation state, and test state. Do not create it without approval.

## Requirement catalog

Default shape for repositories with no existing catalog. **An existing repository catalog (e.g. mini-ASPICE) always overrides this shape** — never run both formats in one repository.

Catalogs may split per area (e.g. `docs/requirements-ui.md`, `docs/requirements-api.md`); IDs stay `REQ-<AREA>-NNN` across files. The Phase 0 gate table records which catalog files govern the slice.

Requirement kinds:

- **behavior** — a user- or system-observable journey outcome; carries acceptance criteria, each of which translates mechanically into one Given/When/Then step — no design interpretation between criterion and test. Pairs with acceptance/integration evidence.
- **constraint** — a hard limit the implementation must respect: platform, memory/stack/size budget, no-heap, toolchain. Verified by targeted tests or static analysis, not journeys.
- **quality** — a measurable attribute: performance, accessibility, timing, responsiveness. Verified by measurement or component tests.
- **security** — a trust-boundary obligation surfaced by the Phase 0 security trigger list.

Entry format — one line per requirement, kept next to the behavior scenarios:

```text
REQ-<AREA>-<NNN> | <kind> | <area> | <one durable, observable statement> | <criteria: each mechanically testable> | Impl ❌/⚠️/✅ | <test path or planned evidence>
```

Guidance:

- One requirement states one observable outcome; split compound statements.
- Every criterion is phrased so it becomes one testable assertion (Given/When/Then for behavior kinds; a direct check for constraint/quality/security). If a criterion cannot be phrased testably, it is design rationale, not a requirement.
- `Impl ❌` before coding; `Impl ⚠️` may be used during multi-milestone epics for intermediate landed slices with notes; flips to `Impl ✅` only after all linked acceptance evidence actually verifies. Constraint and security requirements carry evidence even when satisfied by review or static analysis rather than a test.
- Stable IDs never change when wording evolves; supersede instead of renumber.
- For larger catalogs, expand entries into statement + rationale + numbered acceptance criteria + a status vocabulary (e.g. `Impl ❌/⚠️/✅`) + a traceability table; criteria keep the same 1:1 testability rule.

Worked example:

```text
REQ-NOTE-004 | behavior | notes | deleting a saved note removes the durable record | given a saved note, when the owner deletes it and confirms, then the durable record is gone and the list no longer shows it | Impl ✅ | e2e/notes.spec.ts
REQ-NOTE-011 | constraint | notes | note bodies ≤ 10 KB on all platforms | validator rejects bodies > 10 KB | Impl ✅ | src/notes/validator_test.ts
```

## Behavior scenario: compact example

```text
SCN-NOTE-003 | REQ-NOTE-004, REQ-NOTE-008 | Given a manager edits a saved note, when they delete it and confirm, then the durable record is removed and the refreshed list no longer shows it | acceptance | e2e/notes.spec.ts
```

The delete path is a BDD journey. The debounce helper or delete-state reducer may still be built with TDD and focused unit tests.
