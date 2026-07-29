# E2E Test Prompt Updates: Todo List Web App (AI-Decides Everything)

## Introduction

Reviewers: This has nothing to do with the rest of the code in this branch. Please ignore the disconnect. I just don't want to lose this plan.

## Context

Update E2E test to build Todo List Web App. **Let AI decide everything:**
- Number of milestones (not 5 — could be 3, 7, whatever)
- Milestone content and scope
- Tech stack (framework, build tool, etc.)
- E2E testing approach (Playwright/Cypress/none)
- Testing framework and setup

## Changes Required

### 1. Update E2E Test Goal

**File:** `scripts/e2e-test.sh`

**Line 39: Replace calculator goal with todo app**

```bash
GOAL="Build a Todo List Web App. Users should be able to add todo items, mark them as complete, and delete them. The app should persist data so todos survive page refresh. Follow LeanUX principles: each milestone must be independently deployable and provide immediate user value. Earlier milestones should deliver working software, but not fulfilling all requirements, to users as quickly as possible. Choose appropriate tech stack and implement comprehensive E2E tests."
```

### 2. Enhance PRD Prompt with LeanUX Principles

**File:** `src/prompts/states/prd-phase.ts`

**Current LeanUX section (lines 66-74):** Only mentions Milestone 1 MVP requirement.

**Enhanced section:**
```typescript
### LeanUX Principles:

**IMPORTANT:** vibe-model follows LeanUX principles. Each milestone must be independently valuable and deliverable.

**Milestone Decomposition:**
- Each milestone represents a vertical slice through the system (user-facing feature, not infrastructure)
- Earlier milestones deliver core user value as quickly as possible
- Later milestones build on earlier ones (dependency ordering)
- Avoid "infrastructure milestones" that don't ship user-facing features

**Milestone 1 (MVP):** Must be a minimal viable product that:
  - Implements core user interaction
  - Includes basic testing infrastructure
  - Is deployable and testable
  - Provides immediate user value
  - Need not provide full functionality

**Subsequent Milestones:** Each must:
  - Add user-visible features or improvements
  - Be independently deployable
  - Include appropriate tests
  - Build on previous milestones

**Ordering:** By user value delivery — users get working software with milestone 1, not after milestone N.

**Examples:**
- ✅ Good: M1=Static list + toggle, M2=Add items, M3=Delete items, M4=Filter
- ❌ Bad: M1=Project setup, M2=Database layer, M3=UI components (no user value until M4)

### Output:

Write **only** the prd.md file. Do NOT create any milestone files — the orchestrator will create them automatically from the milestones table.
```

### 3. Minor: Update README Text

**File:** `scripts/e2e-test.sh`

**Line 192:** Update README text
```bash
echo "# Todo List Web App" > README.md
```

**Why:** Avoid confusing AI with "Calculator Project" when goal is todo app.

**Note:** Leave calculator examples in USER_GUIDE.md, CLAUDE.md, AGENTS.md — they remain good tutorial examples.

**File:** `docs/e2e-harness.md`

**Current section:** "What Gets Built" (describes CLI calculator)

**New section:**
```markdown
## What Gets Built: Todo List Web App

The E2E test builds a Todo List Web App. The AI agent autonomously decomposes this into milestones following LeanUX principles:

**Core functionality:**
- Add new todo items
- Mark items as complete/incomplete
- Delete items
- Persist data (survives page refresh)

**LeanUX principles:**
- Each milestone is independently deployable
- Each milestone provides immediate user value
- Earlier milestones deliver working software quickly
- Milestones are ordered by user value delivery

**Tech stack:** AI-selected (any modern web framework + build tool)

**E2E testing:** AI-selected framework with comprehensive coverage

**Milestone breakdown:** AI-decided (could be 3, 5, 7+ milestones based on complexity)
```

**Why this works:**
- Describes what to build, not how many milestones
- Explains LeanUX principles for AI reference
- Sets expectations without dictating structure
- Shows example: AI might do 3 milestones (simple) or 7 (thorough)

**Optional:** Add LeanUX summary if AI needs context:
```markdown
## LeanUX Principles Summary

LeanUX emphasizes:
1. **MVP First:** Milestone 1 must be a minimal viable product that real users can interact with
2. **Incremental Value:** Each milestone delivers working features, not just infrastructure
3. **User-Driven Order:** Prioritize features by user value, not technical convenience
4. **Testable:** Each milestone includes testing infrastructure from the start
5. **Deployable:** Each milestone can be shipped independently
```

### 4. Update E2E Validation Phases

**File:** `scripts/e2e-test.sh`

**Phase 4: Validate Built Artifact** (lines ~309-407)

**Current:** Calculator-specific validation

**New:** Generic web app validation

Add to Phase 4 (after current artifact detection):
```bash
# Detect if web app was built (broad file search)
WEB_APP_DETECTED=false

# Check for common web app entry points
WEB_APP_INDICATORS=(
  "index.html"
  "src/App.tsx"
  "src/App.vue"
  "src/App.svelte"
  "src/main.tsx"
  "src/main.ts"
  "src/main.jsx"
  "src/main.js"
  "app.html"
  "frontend/index.html"
  "frontend/src/App.tsx"
)

for indicator in "${WEB_APP_INDICATORS[@]}"; do
  if [ -f "$TARGET_DIR/$indicator" ]; then
    pass "Web app file detected: $indicator"
    WEB_APP_DETECTED=true
    break
  fi
done

# Also check for any .tsx/.vue/.svelte files (broad search)
if [ "$WEB_APP_DETECTED" = false ]; then
  WEB_FRAMEWORK_FILES=$(find "$TARGET_DIR" -maxdepth 3 -name "*.tsx" -o -name "*.vue" -o -name "*.svelte" 2>/dev/null | grep -v node_modules | grep -v vibe-model || true)
  if [ -n "$WEB_FRAMEWORK_FILES" ]; then
    pass "Web framework files detected"
    WEB_APP_DETECTED=true
  fi
fi

if [ "$WEB_APP_DETECTED" = true ]; then
  # Check for package.json
  if [ -f "$TARGET_DIR/package.json" ]; then
    file_contains "$TARGET_DIR/package.json" '"test"' "Test script exists"
    file_contains "$TARGET_DIR/package.json" '"dev"' "Dev script exists"
  fi
  
  # Check for E2E test setup (flexible detection)
  if [ -f "$TARGET_DIR/playwright.config.ts" ] || [ -f "$TARGET_DIR/playwright.config.js" ]; then
    pass "Playwright config detected"
  elif [ -f "$TARGET_DIR/cypress.config.ts" ] || [ -f "$TARGET_DIR/cypress.config.js" ]; then
    pass "Cypress config detected"
  elif [ -f "$TARGET_DIR/puppeteer.config.ts" ] || [ -f "$TARGET_DIR/puppeteer.config.js" ]; then
    pass "Puppeteer config detected"
  elif [ -d "$TARGET_DIR/e2e" ] || [ -d "$TARGET_DIR/tests/e2e" ] || [ -d "$TARGET_DIR/cypress" ]; then
    pass "E2E test directory detected"
  else
    warn "No E2E test config detected (may use manual tests)"
  fi
else
  warn "No web app detected, falling back to generic validation"
fi
```

**Why broad search:** AI might use `frontend/` subdirectory, or plain JS files, or unexpected structure. Don't fail on valid but different choices.

**Phase 4c:** Replace "Run Calculator" with generic validation:
```bash
section "Phase 4c: Validate App Can Run"

cd "$TARGET_DIR"

# Check for dev server or build capability
if grep -q '"dev"' "$TARGET_DIR/package.json" 2>/dev/null; then
  pass "Dev server script exists (can run with: cd e2e-test-project && bun run dev)"
elif grep -q '"build"' "$TARGET_DIR/package.json" 2>/dev/null; then
  pass "Build script exists (can run with: cd e2e-test-project && bun run build)"
fi

# Note: We don't actually run it (would block E2E test)
# Just validate that AI set up the infrastructure correctly
info "To manually test: cd $TARGET_DIR && bun run dev (or bun run build && open dist/index.html)"
```

## Critical Files

| File | Change |
|------|--------|
| `src/prompts/states/prd-phase.ts` | Replace LeanUX section (lines 66-74) with comprehensive principles + good/bad examples. |
| `scripts/e2e-test.sh` | Line 39: Update goal. Line 192: Update README text. Phase 4: Add broad web detection + E2E config check. Phase 4c: Generic validation. |
| `docs/e2e-harness.md` | Update "What Gets Built" section (flexible milestone description, LeanUX explanation). |

## Verification

1. **Update goal:** Change `GOAL` variable in e2e-test.sh
2. **Update docs:** Edit e2e-harness.md with flexible description
3. **Run E2E:** `./scripts/e2e-test.sh`
4. **Observe:** Check how many milestones AI created
5. **Validate:** AI followed LeanUX (Milestone 1 is deployable MVP)

## Expected AI Decisions

**Milestone count:** Could be 3 (simple) to 7+ (thorough). Not our choice.

**Typical breakdown might be:**
- M1: Static list + toggle (MVP)
- M2: Add items
- M3: Delete items
- M4: Persistence
- M5: Filtering
- M6: Polish features

But AI might combine differently (e.g., Add+Delete together, or skip filtering).

**Tech stack:** Any modern web framework. We validate flexibly.

**E2E tests:** Playwright, Cypress, or even manual test instructions. We validate presence, not specific choice.

## What We Don't Specify

❌ Number of milestones
❌ What each milestone contains
❌ Framework choice (React vs Vue vs Svelte)
❌ Build tool (Vite vs webpack)
❌ Testing framework (Playwright vs Cypress)
❌ Directory structure
❌ State management approach

## What We Do Specify

✅ Core functionality (todos, complete, delete, persist)
✅ LeanUX principles (MVP, incremental value, deployable)
✅ E2E testing required (framework AI's choice)
✅ Each milestone independently valuable

## Edge Cases

1. **AI creates 2 milestones:** Acceptable if they follow LeanUX
2. **AI creates 10 milestones:** Acceptable if each has value
3. **AI chooses no E2E framework:** Manual tests OK if documented
4. **AI chooses vanilla JS:** Perfectly valid
5. **Unexpected directory structure:** Flexible validation handles this

## Timeline

**Phase 1:** Update e2e-test.sh goal (5 min)
**Phase 2:** Update e2e-harness.md (10 min)
**Phase 3:** Run E2E test, observe (30 min)
**Phase 4:** Analyze results, iterate prompt if needed (optional)

**Total:** 45 min - 1 hour
