# Prompt & Lifecycle Consistency Audit

This document captures canonical lifecycle metadata (states, transitions, naming, file names) and the prompt consistency audit outcomes.

## Canonical V-Model States

Source: `src/types.ts`

- `REQUIREMENTS`
- `REQUIREMENTS_REVIEW`
- `SYSTEM_DESIGN`
- `SYSTEM_DESIGN_REVIEW`
- `ARCH_DESIGN`
- `ARCH_DESIGN_REVIEW`
- `MODULE_DESIGN`
- `MODULE_DESIGN_REVIEW`
- `IMPLEMENTATION`
- `UNIT_TEST`
- `INTEGRATION_TEST`
- `SYSTEM_TEST`
- `ACCEPTANCE_TEST`
- `PROTOTYPING`
- `WAITING_FOR_USER`
- `CONSOLIDATING`
- `COMPLETE`
- `BLOCKED`
- `REVIEWING`
- `ARCHIVING`
- `PIVOTING`
- `REFLECTING`

## Expected State Transitions

Source: `src/state-machine.ts` (`getNextStateNormal`)

Normal mode sequence:

1. `REQUIREMENTS -> REQUIREMENTS_REVIEW`
2. `REQUIREMENTS_REVIEW -> SYSTEM_DESIGN`
3. `SYSTEM_DESIGN -> SYSTEM_DESIGN_REVIEW`
4. `SYSTEM_DESIGN_REVIEW -> ARCH_DESIGN`
5. `ARCH_DESIGN -> ARCH_DESIGN_REVIEW`
6. `ARCH_DESIGN_REVIEW -> MODULE_DESIGN`
7. `MODULE_DESIGN -> MODULE_DESIGN_REVIEW`
8. `MODULE_DESIGN_REVIEW -> IMPLEMENTATION`
9. `IMPLEMENTATION -> UNIT_TEST`
10. `UNIT_TEST -> INTEGRATION_TEST`
11. `INTEGRATION_TEST -> SYSTEM_TEST`
12. `SYSTEM_TEST -> ACCEPTANCE_TEST`
13. `ACCEPTANCE_TEST -> CONSOLIDATING`
14. `CONSOLIDATING -> COMPLETE`

Other canonical transitions:

- `PROTOTYPING -> MODULE_DESIGN`
- `WAITING_FOR_USER -> REQUIREMENTS`
- `REVIEWING -> REQUIREMENTS`
- `ARCHIVING -> REQUIREMENTS`
- `PIVOTING -> REQUIREMENTS`
- `REFLECTING -> REQUIREMENTS`
- `COMPLETE -> COMPLETE`
- `BLOCKED -> BLOCKED`

## Canonical Metadata Field Names

Source: `src/journey.ts`

Journey Meta uses:

- `- State: ...` (or legacy `- Current State: ...`)
- `- Previous State: ...`
- `- Current Epic: ...`

Note: Prompts should use **Previous State** terminology to match runtime behavior.

## Epic Naming and Story Naming

Sources: `src/epic-archival.ts`, `vibe-model.md`

- Epic IDs: `E1`, `E2`, `E3`, ...
- Story IDs: `S1`, `S2`, `S3`, ...
- Epic names and story names are dynamic, domain-specific labels.

## Canonical File Names / Patterns

Sources: `src/journey.ts`, `src/epic-archival.ts`

- Journey file: `vibe-model/journey/{journey}.journey.md`
- Spec file: `vibe-model/journey/{journey}.spec.md`
- Epic file: `vibe-model/journey/{journey}.journey.E{N}.md`
- Protocol file: `vibe-model/vibe-model.md`
- Self-improvement notes: `self-improvement-notes.md` at project root

## Prompt Audit Scope

Reviewed prompt files in:

- `src/prompts/states/*.ts`
- `src/prompts/common/state-transitions.ts`
- `src/prompts/main-iteration.ts`

Performed via multiple independent sub-agents and direct source verification.

## Findings and Fixes Applied

### 1) Story variable naming consistency

Issue:

- `module-design.ts` used `STORY_CONTENT` while neighboring states use `STORY_DESIGN`.

Fix:

- Renamed `STORY_CONTENT` to `STORY_DESIGN` in `module-design.ts`.
- Updated wiring in `src/prompts/states/index.ts`.

### 2) Story template robustness in module design prompt

Issue:

- Prompt attempted to extract story number via regex from story content and could emit `S N`.

Fix:

- Replaced with stable header: `### Story: ${vars.CURRENT_STORY}`.

### 3) Unit-test failure transition ambiguity

Issue:

- Contradictory guidance between rolling back to module design and implementation.

Fix:

- Clarified failure routing:
  - code bug -> `IMPLEMENTATION`
  - design flaw -> `MODULE_DESIGN`
  - test issue -> remain `UNIT_TEST`

### 4) Integration-test rollback overly coarse

Issue:

- Prompt always sent failures to `ARCH_DESIGN`.

Fix:

- Added conditional rollback guidance:
  - code bug -> `IMPLEMENTATION`
  - module design flaw -> `MODULE_DESIGN`
  - architecture boundary issue -> `ARCH_DESIGN`

### 5) Missing spec file path hints in test prompts

Issue:

- `SYSTEM_TEST` and `ACCEPTANCE_TEST` lacked explicit spec-file path hint in "Important File Paths".

Fix:

- Added `**Spec File:** ${vars.JOURNEY_NAME}.spec.md (if exists)` to both.

### 6) UX/review prompts missing explicit user-hints reminder

Issue:

- `ux-prototyping.ts` and `reviewing.ts` did not explicitly require checking User Hints.

Fix:

- Added explicit "Check ## User Hints" guidance in both prompts.

### 7) Previous field name mismatch (Phase vs State)

Issue:

- Multiple prompts referenced `Previous Phase` while runtime metadata is `Previous State`.

Fix:

- Updated wording in:
  - `requirements.ts`
  - `system-design.ts`
  - `arch-design.ts`
  - `module-design.ts`
  - `consolidating.ts`
  - `main-iteration.ts`
  - `common/state-transitions.ts` (now explicitly instructs updating `Previous State` before state transition)

## Remaining Notes

- `main-iteration.ts` remains a legacy/general prompt and still contains intentionally generic examples (for example `{journey}.journey.E{N}.md`), but wording now better aligns with metadata semantics.
- The runtime source of truth for transitions remains `src/state-machine.ts`; prompt guidance should not diverge from it.

## Validation

Ran baseline sanity checks before edits and after edits:

- `./scripts/sanity_checks.sh`

Result: pass (no errors; one pre-existing lint warning for duplicate import in `src/prompts/states/index.ts`).
