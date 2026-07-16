# README_AGENTIC_DEVS.md — For Agents Working On (and With) vibe-model

> Read this first. This is the operating manual for **you** — an autonomous coding
> agent (pi.dev / similar harness) assigned to this repo. It exists so the next agent
> doesn't relearn everything the hard way.
>
> vibe-model = **vibe coding + V-model.** Modus operandi: *"give into the vibes and
> just let the agent code"* / *"move fast and break stuff."* We use git; **cleanup
> happens before merging to important branches.** Stray artifacts are not a big deal.
> **Stop worrying about git hygiene. Just work.**

---

## 0. The two jobs (read twice)

You have **two jobs**, and confusing them is the #1 way to screw this up.

### Job 1 — Build the tool: vibe-model itself (YOUR primary job)
vibe-model is meant to be a **self-contained, full-product development tool** —
something anyone can point at any goal and get a milestone-driven, V-model,
AI-executed product out the other side. **Your job is to make that real and keep it
healthy:** fix bugs, harden it, improve its autonomy, keep it running. This is the
work you do *in this repo* (`src/`, tests, prompts, the `bin/vibe-model` CLI).

### Job 2 — Keep its run alive on whatever it's building (YOUR secondary job)
When vibe-model is running against some **target product** (its own `prd.md` in some
project), your job is narrow: **monitor the run, and fix the tool when it goes off
the rails.** You do **NOT** do the target product's work. vibe-model owns that.

> **Litmus test:** if you are thinking about PRDs, milestone plans, product scope, or
> feature decisions for the *target product*, you are immediately overstepping.
> Those belong to vibe-model (execution) and the human (scope). Your lane is the tool.

This separation is the whole point: two products emerge in parallel —
**(1)** vibe-model the tool, and **(2)** whatever vibe-model is building. You are
responsible/accountable for #1; you only *support* #2.

---

## 1. What vibe-model is

An autonomous R&D agent. Give it a goal/PRD → it decomposes into milestones → drives
each through a V-model lifecycle:

```
REQUIREMENTS → DESIGN → IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → DELIVERY → COMPLETE
```

It commits working code after each phase. TypeScript-implemented (`src/`), compiled
with `bun` to `bin/vibe-model` (on PATH), and it **drives the `claude` CLI**
(`claude --print --dangerously-skip-permissions …`) as its execution engine.

---

## 2. Mental model: you build the tool, not the product

| | vibe-model (the tool/agent) | You (the harness agent) |
|---|---|---|
| **Responsible for** | Product scope of the *target*; PRD/milestone content; implementation; tests; delivery; per-phase commits | **vibe-model's own health & correctness**; monitoring runs; fixing the tool when it breaks; provider/toolchain setup |
| **Accountable for** | The product work it produces | vibe-model the tool |
| **Supports** | — | vibe-model's run (by fixing the tool) |
| **Informed by** | — (it just runs) | vibe-model's logs (`/tmp/vibe-*.log`) + the target repo's git log |
| **Consults** | — | **The human — for product-scope decisions. NEVER decide those yourself.** |

**Your scope = ONLY "fix vibe-model when it goes off the rails + keep it running."**
Everything else is out of bounds.

---

## 3. How to work with the human (hard-won lessons)

These matter more than any code detail.

- **Listen. The human is smarter than you about this domain.** When they say do X
  then Y, do X then Y. Don't invent a "better" order and don't agonize — execute.
- **Ask when genuinely unsure; don't prognosticate.** If a real decision branches,
  surface it in one line and ask. Do **not** spend five turns reasoning about what
  they *might* want. Either act decisively or ask — never stew.
- **Don't take instructions literally to the point of absurdity.** "Set a cron job"
  → they want *periodic monitoring*; a timer loop is fine, and on macOS cron fails
  anyway (see §9). Match intent, not wording.
- **If something is "by design," say so — immediately.** Don't re-derive obvious
  conclusions at length. Lead with the answer, then evidence only if asked.
- **Make the PR first.** Commits are editable after a PR exists, the PR takes seconds,
  and walking-through changes is independent of PR state. There is no reason to gate a
  PR on a review.
- **Don't do trivial work the human can do faster.** If they can click "make PR" in
  two seconds, don't turn it into a multi-step production.
- **Be direct. Default to low thinking budget.** Verbosity isn't thoroughness. Tables
  and bullets beat paragraphs. Say what's true, then stop.
- **Do the obvious next action.** Don't ask permission for the low-risk, clearly-
  intended step. Reserve questions for genuine forks.

---

## 4. vibe-model internals you must know

### 4.1 Launch modes (memorize — mistakes here destroy work)

| Command | Behavior |
|---|---|
| `vibe-model "<goal>"` | **OVERWRITES** `vibe-model/prd.md` (empty template) and **REGENERATES** everything from the goal. Footgun — guard exists (§7). |
| `vibe-model` (no args) | **RESUME** the active milestone loop from `prd.md`. This is how you continue work. |
| `vibe-model continue` | Resume ONLY from `WAITING_FOR_USER`. No-ops otherwise. |
| `vibe-model status` | Read-only: goal/tech/arch + milestones table + active milestone state. |
| `vibe-model hint "<msg>"` | Append a hint to the active milestone file. |

**Golden rule:** to resume, **NEVER pass a goal.** Run `vibe-model` bare
(`+ --autonomous -v` as needed).

### 4.2 How the plan works

- Source of truth = `vibe-model/prd.md`. Milestones are a markdown table
  `| ID | Name | Description | Status | Mode |`, regex-parsed.
- Status: `PENDING` / `IN_PROGRESS` / `COMPLETE`. Mode override: `hil` / `autonomous`.
- **To change the plan:** edit the milestones table in `prd.md` directly, then resume
  (no args). There is **no `--plan` flag.**
- `getActiveMilestone` = first non-`COMPLETE` row.
- **Milestone file path is DERIVED from the PRD name** (`milestoneFileName(id, name)`
  → sanitized). **If you rename a milestone in `prd.md`, ALSO rename its milestone
  file** — otherwise resume computes a path that doesn't exist → creates an empty file
  → silently **restarts that milestone from REQUIREMENTS**, orphaning prior work.
  (This has bitten us.)
- **Resume reads only the `State:` field** (under a `## Status` block, as a bulleted
  `- State: <STATE>` line; `- Progress: <N>%` is cosmetic). Phases as in §1.

### 4.3 ⚠️ Milestone numbering gotcha (do not get fooled)

vibe-model decomposes the goal you gave it into **its own** milestones inside `prd.md`.
**Those are NOT the same as the target project's real roadmap.** "All milestones
COMPLETE" means *vibe-model finished the PRD you handed it* — nothing more. Before you
ever tell the human "the product is done," map vibe-model's milestones back to the
target project's actual plan and confirm what's really been delivered. (We once had
three "complete" milestones that turned out to be a subset of the target's Milestone 1.)

---

## 5. How the tool can go off the rails (known failure modes)

- **Doc-centric phases produce no output.** REQUIREMENTS/DESIGN/etc. whose *deliverable
  is the milestone doc section* can finish with the AI writing nothing. Handled now by
  **phase-level retry** (§7) — but recognize the pattern: doc phases → retry (don't
  stub garbage); code phases (IMPLEMENTATION) where real code exists → stub the missing
  doc section and advance (don't discard the code).
- **Provider outages.** Transient 529s/timeouts mid-run. Handled by retry/backoff, but
  note each held-connection retry eats ~3 min, so a "10-min budget" ≈ only 3 attempts.
  Budget wide (§7).
- **Submodule edits go uncommitted.** `commitChanges` only touches the parent
  `projectDir`; it does **not** recurse into nested submodules. When the target repo
  has submodules, watch for the first edit inside one — that's where vibe-model needs a
  hand (or a real fix making `commitChanges` submodule-aware). When you do step in:
  branch the submodule, commit, and **push innermost-first** (deepest submodule → … →
  parent). Never commit on a detached HEAD.
- **Renamed milestone → silent restart** (see §4.2).
- **Resume with a goal** → overwrites `prd.md` (see §4.1). The guard stops a populated
  PRD from being clobbered without `--new`.

---

## 6. AI provider (this environment)

- Engine: `claude` CLI. On this machine it routes to **z.ai / GLM** via an
  Anthropic-compatible proxy (`ANTHROPIC_BASE_URL`, token set). **Do NOT assume
  Anthropic.**
- **`gemini`/`agy` is DISABLED.** Google renamed `gemini`→`agy`; it 429s (weekly token
  limit). vibe-model must be **claude-only, everywhere.**
- "External" second opinions = **claude subagent reviewers** (a specialist role prompt
  run through `claude --print` — e.g. "Code Reviewer", "Architecture"), **never** an
  external CLI.
- **pi subagents** (`.md` agent files) MUST omit `model:` to inherit the parent
  (z.ai) provider. A hardcoded `model:` → "No API key found for anthropic". Use a
  model-less read-only investigator agent to keep your own context clean.

---

## 7. Fixes already applied (don't redo these)

On the tool's fix branch (claude-only, retry-hardened). Verify with `git log` before
re-implementing any of:

1. **retry/backoff in `runAIWithPrompt`** — wide budget: 5 attempts, backoff
   `~[60,120,240,300]s` (~25–30 min ride-through for sustained provider outages).
   Captures + logs the output tail on failure (was previously swallowed).
2. **claude-only** — dropped the gemini branch; the "consult" path now spawns a claude
   subagent reviewer; research-phase prompts no longer shell out to `gemini --yolo`.
3. **footgun guard** — `vibe-model "<goal>"` refuses to overwrite a `prd.md` that
   already has milestones unless `--new` is passed.
4. **safety net (`ensurePhaseArtifactsPresent`)** — when a phase produced *real work*
   but the AI forgot to fill the required doc section, auto-stub the section
   (referencing the changed files) and advance, instead of discarding the work.
   Hard-fails only on a *true no-op*. (Excludes `vibe-model/` internal files from the
   "did work" check — the legitimate work of code phases is elsewhere.)
5. **phase-level retry** — if a phase produces *no* required artifact (true no-op),
   re-run the phase up to **3×** before hard-failing. This is what recovers doc-centric
   phases (REQUIREMENTS/DESIGN) from transient compliance misses, instead of stubbing
   garbage requirements.

---

## 8. When vibe-model goes off the rails — operating checklist

1. **Confirm it actually stopped / misbehaved** (read the run log tail; check the
   milestone `State:`; check git log for the last phase commit).
2. **Diagnose the root cause** — is it the *tool* (a bug here) or a *provider/transient*
   issue? Only the former is yours to fix.
3. **Fix the tool** (build + `bun test` + commit + push the fix branch).
4. **Re-resume** with `vibe-model` (no args) — **never** pass a goal. Use a stable log
   path (e.g. `/tmp/vibe-model.log`) so your monitor can find it.
5. **Do not** "help" by doing the product work yourself. Fix the tool, restart the run,
   get out of the way.

---

## 9. Monitoring an autonomous run

You want hands-off visibility without babysitting. The trap: **you (the agent) are not
a persistent daemon.** A monitor can only *write to a log*; it cannot wake you or
notify the human. You surface things only when invoked.

- Use a **detached background timer loop**, not cron:
  ```bash
  nohup bash -c 'while true; do ~/.vibe-monitor.sh; sleep 1800; done' >/dev/null 2>&1 &
  ```
  A monitor script appends timestamped status (alive/stopped, current phase, last
  error, recent commits, submodule-edit watch flag) to e.g. `/tmp/vibe-monitor.log`.
- **Don't use cron on macOS** — `crontab -` fails with `Interrupted system call`. A
  `while/sleep` loop is the reliable equivalent. (Don't take "set a cron job" literally
  — the human wants *periodic monitoring*, however it's implemented.)
- If proactive alerting is actually wanted, have the monitor script fire a **desktop
  notification** (`osascript`) on the transition to STOPPED/error. Otherwise it's
  passive; read the log when invoked.

---

## 10. Repo mechanics (this repo — vibe-model itself)

- TypeScript; compiled with **bun** → `bin/vibe-model` (on PATH).
- Build: `bun run build`. Tests: `bun test` (suite of unit tests — keep them green;
  every tool fix ships with passing tests).
- Key sources:
  - `src/index.ts` — CLI entry, arg parsing, launch-mode dispatch.
  - `src/milestone-loop.ts` — the state machine (the retry/phase-retry/safety-net
    logic lives here).
  - `src/prd.ts`, `src/milestone.ts` — `prd.md` + milestone-file parse/write,
    `milestoneFileName` derivation, `State:` read.
  - `src/ai-provider.ts` — `runAIWithPrompt`, retry/backoff, the claude invocation.
  - `src/checkpoint.ts` — run persistence/resume.
  - `src/prompts/` — phase + research + review prompt builders.
- Ship fixes as: build → `bun test` → commit (clear message) → push. Don't break the
  test suite. Don't leave the `bin/vibe-model` binary stale after a `src/` change.

---

## 11. Do / Don't cheat-sheet

- ✅ Resume: `vibe-model` (no goal) `+ --autonomous -v`.
- ✅ Change the plan: edit `prd.md` milestones table → resume (no goal).
- ✅ Start fresh: `vibe-model --new "<goal>"` (or `rm -rf vibe-model/` in the target).
- ✅ Check: `vibe-model status`.
- ✅ Keep it claude-only; no gemini/agy. Make pi subagents model-less.
- ✅ Fix the tool, build+test+push, then re-resume (no goal).
- ✅ Map vibe-model's milestones to the target's real roadmap before declaring "done."
- ❌ Never pass a goal to resume (overwrites work).
- ❌ Never rename a milestone in `prd.md` without renaming its milestone file.
- ❌ Never decide the target product's scope/milestones yourself.
- ❌ Never do the target product's implementation work for vibe-model.
- ❌ Never block on git hygiene — move fast; clean up before important merges.
- ❌ Never use cron on macOS for monitoring — use a `while/sleep` timer loop.

---

*Keep this file accurate. When you learn something new about the tool or about working
with the human on this project, update it — that's the whole point.*
