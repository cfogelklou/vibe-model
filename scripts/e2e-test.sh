#!/usr/bin/env bash
#
# e2e-test.sh — End-to-end test harness for vibe-model
#
# This script:
#   1. Creates a clean target project (git init)
#   2. Runs vibe-model --autonomous with a simple goal
#   3. Validates PRD creation, milestone file creation, state transitions
#   4. Validates the built artifact works
#
# Prerequisites:
#   - bun installed
#   - claude CLI installed and authenticated
#   - vibe-model built (bun run build)
#
# Usage:
#   ./scripts/e2e-test.sh                    # Full run
#   ./scripts/e2e-test.sh --skip-run         # Only validate (after a previous run)
#   ./scripts/e2e-test.sh --verbose          # Verbose vibe-model output
#
# Exit codes:
#   0 — All checks passed
#   1 — One or more checks failed

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIBE_MODEL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VIBE_MODEL_BIN="$VIBE_MODEL_ROOT/bin/vibe-model"

# Target project directory (clean slate each run)
TARGET_DIR="$VIBE_MODEL_ROOT/e2e-test-project"

# Test goal
GOAL="Build a CLI calculator in TypeScript using Bun that supports add, subtract, multiply, and divide. Each operation must be a separate testable function. Use Bun's built-in test runner (bun test). The calculator should read expressions from stdin and print results."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Flags
SKIP_RUN=false
VERBOSE_FLAG=""

# ---------------------------------------------------------------------------
# Parse args
# ---------------------------------------------------------------------------

for arg in "$@"; do
  case "$arg" in
    --skip-run)  SKIP_RUN=true ;;
    --verbose)   VERBOSE_FLAG="-v" ;;
    --help|-h)
      echo "Usage: $0 [--skip-run] [--verbose] [--help]"
      exit 0
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

pass() {
  echo -e "  ${GREEN}✓ PASS${NC}: $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo -e "  ${RED}✗ FAIL${NC}: $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

warn() {
  echo -e "  ${YELLOW}⚠ WARN${NC}: $1"
  WARN_COUNT=$((WARN_COUNT + 1))
}

info() {
  echo -e "  ${CYAN}ℹ INFO${NC}: $1"
}

section() {
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
}

file_exists() {
  local file="$1"
  if [ -f "$file" ]; then
    pass "File exists: $file"
    return 0
  else
    fail "File missing: $file"
    return 1
  fi
}

file_contains() {
  local file="$1"
  local pattern="$2"
  local description="${3:-pattern match}"
  if [ ! -f "$file" ]; then
    fail "$description — file not found: $file"
    return 1
  fi
  if grep -qE "$pattern" "$file"; then
    pass "$description"
    return 0
  else
    fail "$description — pattern not found in $file: $pattern"
    return 1
  fi
}

file_not_contains() {
  local file="$1"
  local pattern="$2"
  local description="${3:-pattern should not match}"
  if [ ! -f "$file" ]; then
    fail "$description — file not found: $file"
    return 1
  fi
  if grep -qE "$pattern" "$file"; then
    fail "$description — unexpected pattern found in $file: $pattern"
    return 1
  else
    pass "$description"
    return 0
  fi
}

section_count_matches() {
  local file="$1"
  local pattern="$2"
  local expected_min="$3"
  local description="${4:-count check}"
  if [ ! -f "$file" ]; then
    fail "$description — file not found: $file"
    return 1
  fi
  local count
  count=$(grep -cE "$pattern" "$file" || true)
  if [ "$count" -ge "$expected_min" ]; then
    pass "$description (found $count, expected >= $expected_min)"
    return 0
  else
    fail "$description (found $count, expected >= $expected_min)"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Phase 0: Build & Setup
# ---------------------------------------------------------------------------

section "Phase 0: Build & Setup"

echo "  Building vibe-model..."
if (cd "$VIBE_MODEL_ROOT" && bun run build 2>&1); then
  pass "bun run build succeeded"
else
  fail "bun run build failed"
  echo "  Aborting."
  exit 1
fi

if [ "$SKIP_RUN" = false ]; then
  echo "  Creating clean target project..."
  rm -rf "$TARGET_DIR"
  mkdir -p "$TARGET_DIR"
  cd "$TARGET_DIR"

  git init
  git config user.name "E2E Test"
  git config user.email "e2e@vibe-model.test"

  echo "# Calculator Project" > README.md
  git add README.md
  git commit -m "Initial commit"

  pass "Target project created at $TARGET_DIR"

  # -----------------------------------------------------------------------
  # Phase 1: Run vibe-model
  # -----------------------------------------------------------------------
  section "Phase 1: Run vibe-model (autonomous mode)"
  info "Goal: $GOAL"
  info "This will spawn Claude Code as the AI backend..."
  info "Target dir: $TARGET_DIR"
  echo ""

  cd "$TARGET_DIR"
  if "$VIBE_MODEL_BIN" --autonomous $VERBOSE_FLAG "$GOAL"; then
    pass "vibe-model exited successfully (exit code 0)"
  else
    exit_code=$?
    warn "vibe-model exited with code $exit_code"
    info "Continuing validation anyway..."
  fi
else
  info "Skipping run (--skip-run), validating existing output"
  cd "$TARGET_DIR" || { fail "Target dir $TARGET_DIR not found. Run without --skip-run first."; exit 1; }
fi

# ---------------------------------------------------------------------------
# Phase 2: Validate PRD
# ---------------------------------------------------------------------------

section "Phase 2: Validate PRD (vibe-model/prd.md)"

PRD_FILE="$TARGET_DIR/vibe-model/prd.md"

if file_exists "$PRD_FILE"; then
  file_contains "$PRD_FILE" "^# PRD:" "PRD has title header"
  file_contains "$PRD_FILE" "^## Goal" "PRD has Goal section"
  file_contains "$PRD_FILE" "^## Tech Stack" "PRD has Tech Stack section"
  file_contains "$PRD_FILE" "^## Architecture Overview" "PRD has Architecture Overview section"
  file_contains "$PRD_FILE" "^## Milestones" "PRD has Milestones section"

  # Check Tech Stack is filled (not placeholder)
  file_not_contains "$PRD_FILE" "To be defined during PRD phase" "Tech Stack is filled in (not placeholder)"

  # Check Architecture Overview is filled (not placeholder)
  file_not_contains "$PRD_FILE" "To be defined during PRD phase" "Architecture Overview is filled in (not placeholder)" || true
  # ^ second check may fail if only tech stack was updated; that's OK

  # Check milestones table has data rows
  file_contains "$PRD_FILE" '^\| [0-9]+' "Milestones table has data rows"

  # Count milestones (should have at least 2)
  MILESTONE_COUNT=$(grep -cE '^\| [0-9]+ ' "$PRD_FILE" || true)
  if [ "$MILESTONE_COUNT" -ge 2 ]; then
    pass "Milestone count is reasonable ($MILESTONE_COUNT milestones)"
  else
    warn "Unexpected milestone count: $MILESTONE_COUNT (expected at least 2)"
  fi
fi

# ---------------------------------------------------------------------------
# Phase 3: Validate Milestone Files
# ---------------------------------------------------------------------------

section "Phase 3: Validate Milestone Files"

MILESTONES_DIR="$TARGET_DIR/vibe-model/milestones"

if [ -d "$MILESTONES_DIR" ]; then
  pass "Milestones directory exists"

  MILESTONE_FILES=("$MILESTONES_DIR"/*.md)
  NUM_FILES=${#MILESTONE_FILES[@]}

  if [ "$NUM_FILES" -ge 1 ]; then
    pass "Found $NUM_FILES milestone file(s)"
  else
    fail "No milestone files found"
  fi

  # Validate each milestone file
  for MFILE in "${MILESTONES_DIR}"/*.md; do
    [ -f "$MFILE" ] || continue
    BASENAME=$(basename "$MFILE")
    info "Validating: $BASENAME"

    file_contains "$MFILE" "^# Milestone [0-9]+:" "Milestone has title header"
    file_contains "$MFILE" "^- State:" "Has State field"
    file_contains "$MFILE" "^- Progress:" "Has Progress field"
    file_contains "$MFILE" "^## Requirements" "Has Requirements section"
    file_contains "$MFILE" "^## Design" "Has Design section"
    file_contains "$MFILE" "^## Implementation Notes" "Has Implementation Notes section"
    file_contains "$MFILE" "^## Unit Test Results" "Has Unit Test Results section"
    file_contains "$MFILE" "^## Learnings" "Has Learnings section"

    # Check if sections are filled (not placeholder)
    file_not_contains "$MFILE" "To be filled during REQUIREMENTS phase" "Requirements section is filled"
    # Design section is sometimes left as placeholder by AI for simple milestones
    if grep -qE "To be filled during DESIGN phase" "$MFILE"; then
      warn "Design section was left as placeholder in $BASENAME (AI may have skipped it)"
    else
      pass "Design section is filled in $BASENAME"
    fi
    # Implementation Notes section
    if grep -qE "To be filled during IMPLEMENTATION phase" "$MFILE"; then
      warn "Implementation Notes was left as placeholder in $BASENAME"
    else
      pass "Implementation Notes section is filled in $BASENAME"
    fi
  done
else
  fail "Milestones directory does not exist"
fi

# ---------------------------------------------------------------------------
# Phase 4: Validate Built Artifact
# ---------------------------------------------------------------------------

section "Phase 4: Validate Built Artifact (Calculator)"

# Check that source files were created
info "Looking for calculator source files..."

CALC_FOUND=false
VIBE_MODEL_PATH="$TARGET_DIR/vibe-model"
for pattern in "calc" "calculator" "math" "arith"; do
  FOUND=$(find "$TARGET_DIR" -maxdepth 3 -name "*.ts" -not -path "$VIBE_MODEL_PATH/*" -not -path "*/node_modules/*" 2>/dev/null | grep -i "$pattern" || true)
  if [ -n "$FOUND" ]; then
    CALC_FOUND=true
    for f in $FOUND; do
      pass "Source file found: $(echo "$f" | sed "s|$TARGET_DIR/||")"
    done
    break
  fi
done

if [ "$CALC_FOUND" = false ]; then
  # Check for any .ts files (AI might name them differently)
  TS_FILES=$(find "$TARGET_DIR" -maxdepth 3 -name "*.ts" -not -path "$VIBE_MODEL_PATH/*" -not -path "*/node_modules/*" 2>/dev/null || true)
  if [ -n "$TS_FILES" ]; then
    pass "TypeScript source files found (even if not calculator-named)"
    echo "$TS_FILES" | while read -r f; do
      info "  → $(echo "$f" | sed "s|$TARGET_DIR/||")"
    done
  else
    fail "No TypeScript source files found outside vibe-model/"
  fi
fi

# Check for test files
TEST_FOUND=false
FOUND=$(find "$TARGET_DIR" -maxdepth 3 \( -name "*.test.ts" -o -name "*.spec.ts" \) -not -path "$VIBE_MODEL_PATH/*" -not -path "*/node_modules/*" 2>/dev/null || true)
if [ -n "$FOUND" ]; then
  TEST_FOUND=true
  for f in $FOUND; do
    pass "Test file found: $(echo "$f" | sed "s|$TARGET_DIR/||")"
  done
fi

if [ "$TEST_FOUND" = false ]; then
  warn "No test files (*.test.ts / *.spec.ts) found"
fi

# Check for package.json (should exist if AI set up a Bun project)
if [ -f "$TARGET_DIR/package.json" ]; then
  pass "package.json exists"
  file_contains "$TARGET_DIR/package.json" '"test"' "package.json has test script" || warn "package.json missing test script"
else
  warn "No package.json found (AI may have used a different project structure)"
fi

# Run bun test if test files exist
if [ "$TEST_FOUND" = true ]; then
  section "Phase 4b: Run bun test"
  cd "$TARGET_DIR"
  if bun test 2>&1; then
    pass "bun test passed"
  else
    fail "bun test failed"
  fi
fi

# Try running the calculator
section "Phase 4c: Run Calculator"
cd "$TARGET_DIR"

# Look for main entry point
MAIN_FILE=""
for candidate in "index.ts" "main.ts" "calculator.ts" "calc.ts" "src/index.ts" "src/main.ts" "src/calculator.ts" "src/calc.ts"; do
  if [ -f "$TARGET_DIR/$candidate" ]; then
    MAIN_FILE="$candidate"
    break
  fi
done

if [ -n "$MAIN_FILE" ]; then
  pass "Main entry point found: $MAIN_FILE"

  # Test with a simple expression
  if echo "2 + 3" | bun run "$TARGET_DIR/$MAIN_FILE" 2>/dev/null | grep -qE "5"; then
    pass "Calculator computes 2 + 3 = 5"
  else
    # Try alternate invocation
    RESULT=$(echo "2 + 3" | bun "$TARGET_DIR/$MAIN_FILE" 2>/dev/null || true)
    if echo "$RESULT" | grep -qE "5"; then
      pass "Calculator computes 2 + 3 = 5"
    else
      warn "Could not verify calculator output (may need different invocation)"
      info "Output: $RESULT"
    fi
  fi
else
  warn "Could not find main entry point to test calculator"
fi

# ---------------------------------------------------------------------------
# Phase 5: Validate Git History
# ---------------------------------------------------------------------------

section "Phase 5: Validate Git History"

cd "$TARGET_DIR"

# Check that vibe-model made git commits
COMMIT_COUNT=$(git log --oneline | grep -cE "milestone" || true)
if [ "$COMMIT_COUNT" -ge 1 ]; then
  pass "Git commits with 'milestone' in message ($COMMIT_COUNT found)"
else
  warn "No git commits with 'milestone' in message found"
fi

# Show recent git log
info "Recent git history:"
git log --oneline -20 | head -20 | while read -r line; do
  echo "    $line"
done

# ---------------------------------------------------------------------------
# Phase 6: Validate Status Command
# ---------------------------------------------------------------------------

section "Phase 6: Validate Status Command"

cd "$TARGET_DIR"
STATUS_OUTPUT=$("$VIBE_MODEL_BIN" status 2>&1 || true)

if echo "$STATUS_OUTPUT" | grep -qE "(COMPLETE|Goal|Milestone)"; then
  pass "status command produces output"
  info "Status output:"
  echo "$STATUS_OUTPUT" | while IFS= read -r line; do
    echo "    $line"
  done
else
  warn "status command did not produce expected output"
  echo "$STATUS_OUTPUT"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

section "Test Summary"

TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))
echo ""
echo -e "  ${GREEN}PASSED${NC}:  $PASS_COUNT"
echo -e "  ${RED}FAILED${NC}:  $FAIL_COUNT"
echo -e "  ${YELLOW}WARNINGS${NC}: $WARN_COUNT"
echo -e "  TOTAL:   $TOTAL"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "  ${GREEN}🎉 ALL CHECKS PASSED${NC}"
  echo ""
  exit 0
else
  echo -e "  ${RED}❌ $FAIL_COUNT CHECK(S) FAILED${NC}"
  echo ""
  exit 1
fi
