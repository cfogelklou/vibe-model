#!/bin/bash
#
# loop_v_model.sh - Autonomous Goal-Driven Development Loop
#
# An enhanced R&D agent that works toward ambitious goals without pre-defined plans.
# Unlike Ralph (task executor), V-Model is a research and development agent.
#
# Usage:
#   ./loop_v_model.sh "goal description"     # Start new journey
#   ./loop_v_model.sh                        # Continue active journey
#   ./loop_v_model.sh status                 # Show all journeys
#   ./loop_v_model.sh pivot                  # Force pivot to next approach
#   ./loop_v_model.sh reflect                # Force reflection phase
#   ./loop_v_model.sh hint "message"         # Add user hint to journey
#   ./loop_v_model.sh rollback [N]           # Rollback to checkpoint N (default: last)
#
# Options:
#   -g, --gemini       Use Gemini as the primary AI provider
#   --no-consult       Disable Gemini consultation during design phases
#   -v, --verbose      Enable verbose logging
#   -h, --help         Show this help message
#

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parent project is one directory up from submodule
# (this submodule lives in parent-project/ai-v-model/)
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

# V-Model output directory (in parent project root, not submodule)
V_MODEL_DIR="${PROJECT_ROOT}/v_model"
JOURNEY_DIR="${V_MODEL_DIR}/journey"
PROTOTYPES_DIR="${V_MODEL_DIR}/prototypes"
VENV_DIR="${V_MODEL_DIR}/.venv"

# Memory file (markdown format, no MCP server required)
MEMORY_MD="${V_MODEL_DIR}/memory.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# ============================================================================
# DEFAULT CONFIGURATION
# ============================================================================

BUILD_COMMAND="${BUILD_COMMAND:-cd build && ninja -j4}"
TEST_COMMAND="${TEST_COMMAND:-./sau_src/motuner/test/motunit}"
ALL_TESTS_COMMAND="${ALL_TESTS_COMMAND:-cd build && ctest -j8}"
GUARDRAIL_TESTS="${GUARDRAIL_TESTS:-motunit fft_multi_tests strobe_tests}"
BENCHMARK_COMMAND="${BENCHMARK_COMMAND:-}"

# Performance thresholds
CPU_THRESHOLD="${CPU_THRESHOLD:-+20%}"
LATENCY_THRESHOLD="${LATENCY_THRESHOLD:-+10ms}"
ACCURACY_THRESHOLD="${ACCURACY_THRESHOLD:-0%}"

# Project metadata
PROJECT_NAME="${PROJECT_NAME:-SAU}"
KEY_FILES="${KEY_FILES:-CLAUDE.md README.md}"

# Dead-end detection thresholds
MAX_STALE_ITERATIONS="${MAX_STALE_ITERATIONS:-3}"
MIN_PROGRESS_PERCENT="${MIN_PROGRESS_PERCENT:-5}"

# AI provider (claude or gemini)
AI_PROVIDER="${AI_PROVIDER:-claude}"

# AI command (set by setup_ai)
AI_CMD=""
AI_FLAG=""

# Consultation settings (default: enabled)
CONSULT_GEMINI="${CONSULT_GEMINI:-true}"
GEMINI_CONSULT_CMD="gemini"
GEMINI_CONSULT_FLAGS="--yolo"

# Git checkpointing
CHECKPOINT_PREFIX="${CHECKPOINT_PREFIX:-journey}"

# Maximum iterations before giving up
MAX_ITERATIONS="${MAX_ITERATIONS:-100}"

# Verbose mode
VERBOSE="${VERBOSE:-false}"

# ============================================================================
# PORTABLE SED HELPERS (macOS BSD sed + Linux GNU sed compatibility)
# ============================================================================

# Portable in-place sed - works on both macOS (BSD) and Linux (GNU)
# Usage: sed_inplace "s/pattern/replacement/" "file"
sed_inplace() {
    local script="$1"
    local file="$2"
    local tmpfile
    tmpfile=$(mktemp)
    sed "$script" "$file" > "$tmpfile" && mv "$tmpfile" "$file"
}

# Insert text after line N in file (portable, avoids BSD/GNU sed differences)
# Usage: insert_after_line N "text to insert" "file"
insert_after_line() {
    local line_num="$1"
    local text="$2"
    local file="$3"
    local tmpfile
    tmpfile=$(mktemp)
    awk -v n="$line_num" -v txt="$text" 'NR==n{print; print txt; next}1' "$file" > "$tmpfile" && mv "$tmpfile" "$file"
}

# Insert text before line N in file (portable)
# Usage: insert_before_line N "text to insert" "file"
insert_before_line() {
    local line_num="$1"
    local text="$2"
    local file="$3"
    local tmpfile
    tmpfile=$(mktemp)
    awk -v n="$line_num" -v txt="$text" 'NR==n{print txt}1' "$file" > "$tmpfile" && mv "$tmpfile" "$file"
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_phase() {
    echo -e "${PURPLE}[PHASE]${NC} $*" >&2
}

log_state() {
    echo -e "${CYAN}[STATE]${NC} $*" >&2
}

log_debug() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo -e "${GRAY}[DEBUG]${NC} $*" >&2
    fi
}

# Print usage information
usage() {
    cat << EOF
Usage: $0 [COMMAND] [ARGUMENTS]

An autonomous R&D agent that works toward ambitious goals without pre-defined plans.

Commands:
  $0 "goal description"     Start a new journey with the given goal
  $0                        Continue the active journey
  $0 status                 Show status of all journeys
  $0 pivot                  Force pivot to next approach
  $0 reflect                Force reflection phase
  $0 archive                Archive completed epics that haven't been archived yet
  $0 hint "message"         Add a user hint to the journey
  $0 rollback [N]           Rollback to checkpoint N (default: last checkpoint)
  $0 list-checkpoints       List all checkpoints for current journey

Options:
  -v, --verbose             Enable verbose output
  -g, --gemini              Use Gemini AI instead of Claude
  -h, --help                Show this help message

States:
  REQUIREMENTS     - Formalizing User Requirements into System Requirements
  SYSTEM_DESIGN    - High-level architectural planning (Epics)
  ARCH_DESIGN      - Component-level design (Sub-systems/Interfaces)
  MODULE_DESIGN    - Low-level logic design for a single Story
  IMPLEMENTATION   - Coding the specific module/story
  UNIT_TEST        - Verifying the specific module logic
  INTEGRATION_TEST - Verifying interaction with the system
  SYSTEM_TEST      - Verifying against original Spec
  ACCEPTANCE_TEST  - Final validation against User Requirements
  PROTOTYPING      - Optional experimental phase
  WAITING_FOR_USER - Awaiting clarification or sign-off
  CONSOLIDATING    - Cleaning up, syncing to memory.md, final verification
  COMPLETE         - Goal achieved, journey finished
  BLOCKED          - Blocked by external dependency or error

Environment:
  JOURNEY_DIR    Directory for journey files (default: ./v_model/journey)
  PROTOTYPES_DIR Directory for prototype files (default: ./v_model/prototypes)

Examples:
  $0 "Improve low-frequency detection using ML"
  $0 hint "Try harmonic product spectrum first"
  $0 rollback 3

EOF
}

# Ensure required directories exist
ensure_directories() {
    mkdir -p "${JOURNEY_DIR}"
    mkdir -p "${PROTOTYPES_DIR}"
}

# Ensure .gitignore is properly configured for V-Model artifacts
ensure_gitignore() {
    local gitignore_file="${V_MODEL_DIR}/.gitignore"
    local venv_entry=".venv/"
    local pycache_entry="prototypes/__pycache__/"
    local pyc_entry="prototypes/*.pyc"

    # Create .gitignore if it doesn't exist
    if [[ ! -f "${gitignore_file}" ]]; then
        cat > "${gitignore_file}" << 'EOF'
# V-Model artifact exclusions
# Journey files and specs should be committed
# These entries exclude only generated/cache artifacts

.venv/
prototypes/__pycache__/
prototypes/*.pyc
EOF
        log_debug "Created ${gitignore_file}"
    else
        # Check if entries exist, add them if missing
        local needs_update=false

        for entry in "${venv_entry}" "${pycache_entry}" "${pyc_entry}"; do
            if ! grep -q "^${entry}" "${gitignore_file}" 2>/dev/null; then
                needs_update=true
                break
            fi
        done

        if [[ "${needs_update}" == "true" ]]; then
            # Backup existing content
            local backup_content
            backup_content=$(cat "${gitignore_file}")

            # Write updated content
            cat > "${gitignore_file}" << 'EOF'
# V-Model artifact exclusions
# Journey files and specs should be committed
# These entries exclude only generated/cache artifacts

.venv/
prototypes/__pycache__/
prototypes/*.pyc
EOF

            # Append any custom entries that weren't duplicates
            echo "" >> "${gitignore_file}"
            echo "${backup_content}" | while IFS= read -r line; do
                case "${line}" in
                    .venv/|prototypes/__pycache__/|prototypes/*.pyc|"# V-Model"*|"# Journey files"*|"# These entries"*)
                        # Skip - already included in standard header
                        ;;
                    "# "*|"")
                        # Keep other comments and blank lines
                        echo "${line}" >> "${gitignore_file}"
                        ;;
                    *)
                        # Keep other custom entries
                        echo "${line}" >> "${gitignore_file}"
                        ;;
                esac
            done

            log_debug "Updated ${gitignore_file}"
        fi
    fi
}

# ============================================================================
# JOURNEY FILE FUNCTIONS
# ============================================================================

# Get journey file path from name
journey_file() {
    local name="$1"
    echo "${JOURNEY_DIR}/${name}.journey.md"
}

# Generate a safe journey name from goal
sanitize_journey_name() {
    local goal="$1"
    # Convert to lowercase, replace spaces with hyphens, remove special chars
    echo "${goal}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | head -c 50
}

# Create a new journey file
create_journey_file() {
    local goal="$1"
    local name
    name=$(sanitize_journey_name "${goal}")
    local journey_path
    journey_path=$(journey_file "${name}")

    if [[ -f "${journey_path}" ]]; then
        log_error "Journey already exists: ${name}" >&2
        log_info "Use '$0 status' to see existing journeys" >&2
        exit 1
    fi

    cat > "${journey_path}" << EOF
# Journey: ${goal}

## Meta

- Goal: ${goal}
- State: REQUIREMENTS
- Previous Phase: TBD
- Previous State: TBD
- Current Epic: TBD
- Started: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- Current Approach: TBD
- Progress: 0%

## Approaches

### Approach 1: TBD

- Status: PENDING
- Reason: TBD
- Iterations: 0

## Current Approach Detail

### Approach 1: TBD

- Hypothesis: TBD
- Milestones:
  - [ ] Research and identify viable approaches

## Guardrails

- [PENDING] All baseline tests must pass (no regression)
- [PENDING] Build must succeed after each commit

## Baseline Metrics

| Metric            | Baseline | Current | Threshold   |
| ----------------- | -------- | ------- | ----------- |
| CPU Usage         | TBD      | TBD     | ${CPU_THRESHOLD} |
| Latency           | TBD      | TBD     | ${LATENCY_THRESHOLD} |
| Test Pass Rate    | TBD      | TBD     | No decrease |

## User Hints

*(No user hints yet)*

## Research Notes

*(Research findings documented during design phases)*

### REQUIREMENTS Phase Research
*(To be populated)*

### SYSTEM_DESIGN Phase Research
*(To be populated)*

### ARCH_DESIGN Phase Research
*(To be populated)*

### MODULE_DESIGN Phase Research
*(To be populated)*

## Epic Progress

| Epic ID | Name             | Status      | Stories Complete | Total Stories |
| ------- | ---------------- | ----------- | ---------------- | ------------- |
| TBD     | TBD              | PENDING     | 0                | TBD           |

*(Epic progress will be tracked during SYSTEM_DESIGN phase)*

## Generated Artifacts

*(No artifacts yet)*

## Learnings Log

*(Journey started)*

## Dead Ends

*(No dead ends yet)*

## Anti-Patterns (Semantic Constraints)

*(No anti-patterns identified yet)*

## Pending Questions (WAITING_FOR_USER)

*(No pending questions)*

## Design Spec

*(Design spec will be generated in REQUIREMENTS phase)*
> **Note**: After creation, a link to the design spec will appear here.

## Next Steps (Auto-Generated)

1. Execute Spec Initiation Protocol (Q&A with user)
2. Formalize System Requirements in {journey_name}.spec.md
3. Get user sign-off on requirements

## Checkpoints

| ID | Tag                | Date       | Description                    |
| -- | ------------------ | ---------- | ------------------------------ |
| 0  | initial            | $(date -u +"%Y-%m-%d") | Journey start point |
EOF

    log_success "Created journey: ${name}" >&2
    echo "${journey_path}"
}

# Parse journey state
get_journey_state() {
    local journey_file="$1"
    grep "^- State:" "${journey_file}" | sed 's/.*State: //'
}

# Parse journey goal
get_journey_goal() {
    local journey_file="$1"
    grep "^- Goal:" "${journey_file}" | sed 's/.*Goal: //'
}

# Parse journey progress
get_journey_progress() {
    local journey_file="$1"
    grep "^- Progress:" "${journey_file}" | sed 's/.*Progress: //'
}

# Update journey state
set_journey_state() {
    local journey_file="$1"
    local new_state="$2"
    sed_inplace "s/^- State: .*/- State: ${new_state}/" "${journey_file}"
}

# Update journey progress
set_journey_progress() {
    local journey_file="$1"
    local progress="$2"
    sed_inplace "s/^- Progress: .*/- Progress: ${progress}%/" "${journey_file}"
}

# Update current approach
set_current_approach() {
    local journey_file="$1"
    local approach="$2"
    sed_inplace "s/^- Current Approach: .*/- Current Approach: ${approach}/" "${journey_file}"
}

# Get current epic from journey
get_current_epic() {
    local journey_file="$1"
    grep "^- Current Epic:" "${journey_file}" | sed 's/.*: //'
}

# Set current epic
set_current_epic() {
    local journey_file="$1"
    local epic="$2"
    sed_inplace "s/^- Current Epic: .*/- Current Epic: ${epic}/" "${journey_file}"
}

# Set previous phase
set_previous_phase() {
    local journey_file="$1"
    local phase="$2"
    sed_inplace "s/^- Previous Phase: .*/- Previous Phase: ${phase}/" "${journey_file}"
}

# Get previous state (saved before entering ARCHIVING)
get_previous_state() {
    local journey_file="$1"
    if grep -q "^- Previous State:" "${journey_file}" 2>/dev/null; then
        grep "^- Previous State:" "${journey_file}" | head -1 | sed 's/^- Previous State: //' | tr -d ' '
    else
        echo "BLOCKED"
    fi
}

# Set previous state
set_previous_state() {
    local journey_file="$1"
    local state="$2"
    if grep -q "^- Previous State:" "${journey_file}" 2>/dev/null; then
        sed_inplace "s/^- Previous State: .*/- Previous State: ${state}/" "${journey_file}"
    else
        # Add after Previous Phase line if marker missing
        local previous_phase_line
        previous_phase_line=$(grep -n "^- Previous Phase:" "${journey_file}" | cut -d: -f1)
        if [[ -n "${previous_phase_line}" ]]; then
            insert_after_line "${previous_phase_line}" "- Previous State: ${state}" "${journey_file}"
        fi
    fi
}

# Get epic status from epic table
get_epic_status() {
    local journey_file="$1"
    local epic_id="$2"
    awk "/^| ${epic_id} / {print \$4}" "${journey_file}"
}

# Get the next epic ID from epic progress table
get_next_epic_id() {
    local journey_file="$1"
    local current_epic="$2"

    # Parse epic progress table to find next epic
    # Returns E2, E3, E4, or NONE if no more epics
    local current_num
    current_num=$(echo "${current_epic}" | sed 's/E//')

    local next_num=$((current_num + 1))

    # Check if E${next_num} exists in epic progress table
    if grep -q "^| E${next_num} " "${journey_file}"; then
        echo "E${next_num}"
    else
        echo "NONE"
    fi
}

# Check if we should continue to next epic
should_continue_to_next_epic() {
    local journey_file="$1"
    local current_epic="$2"

    # Check if current epic is marked COMPLETE in the Epic Progress table
    local epic_status=$(get_epic_status "${journey_file}" "${current_epic}")
    if [[ "${epic_status}" =~ COMPLETE ]]; then
        return 0
    fi
    return 1
}

# Transition to the next epic's ARCH_DESIGN phase
transition_to_next_epic() {
    local journey_file="$1"
    local completed_epic="$2"

    # Extract next epic from journey file epic decomposition
    local next_epic
    next_epic=$(get_next_epic_id "${journey_file}" "${completed_epic}")

    if [[ "${next_epic}" == "NONE" ]]; then
        log_info "All epics complete - transitioning to SYSTEM_TEST"
        set_journey_state "${journey_file}" "SYSTEM_TEST"
        add_checkpoint "${journey_file}" "all-epics-complete" "All epics completed, transitioning to SYSTEM_TEST"
    else
        log_info "Transitioning to ${next_epic} ARCH_DESIGN phase"
        set_current_epic "${journey_file}" "${next_epic}"
        set_journey_state "${journey_file}" "ARCH_DESIGN"
        add_learning "${journey_file}" "Auto-transition: Epic ${completed_epic} → ${next_epic}"
        append_to_journey "${journey_file}" "\n**Auto-Transition: Epic ${completed_epic} → ${next_epic}**\n"
    fi
}

# Add learning to journey
add_learning() {
    local journey_file="$1"
    local learning="$2"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%d")
    local section_line
    section_line=$(grep -n "^## Learnings Log" "${journey_file}" | cut -d: -f1)

    if [[ -n "${section_line}" ]]; then
        # Insert after the section header
        local insert_line=$((section_line + 2))
        insert_before_line "${insert_line}" "- ${timestamp}: ${learning}" "${journey_file}"
    fi
}

# Log state transition for debugging
log_state_transition() {
    local journey_file="$1"
    local from_state="$2"
    local to_state="$3"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    append_to_journey "${journey_file}" "\n**[${timestamp}] State Transition: ${from_state} → ${to_state}**\n"
}

# Add dead end to journey
add_dead_end() {
    local journey_file="$1"
    local approach="$2"
    local reason="$3"
    local learnings="$4"

    # Find the Dead Ends section
    local section_line
    section_line=$(grep -n "^## Dead Ends" "${journey_file}" | cut -d: -f1)

    if [[ -n "${section_line}" ]]; then
        local insert_line=$((section_line + 2))
        local entry="### ${approach}\n\n- Status: ABANDONED\n- Reason: ${reason}\n- Learnings: ${learnings}\n- Abandoned: $(date -u +"%Y-%m-%d")\n"
        # Use a temp file for multi-line insert
        local temp_file
        temp_file=$(mktemp)
        head -n "${insert_line}" "${journey_file}" > "${temp_file}"
        echo -e "${entry}" >> "${temp_file}"
        tail -n +$((insert_line + 1)) "${journey_file}" >> "${temp_file}"
        mv "${temp_file}" "${journey_file}"
    fi
}

# Add anti-pattern to journey
add_anti_pattern() {
    local journey_file="$1"
    local pattern="$2"
    local description="$3"

    local section_line
    section_line=$(grep -n "^## Anti-Patterns" "${journey_file}" | cut -d: -f1)

    if [[ -n "${section_line}" ]]; then
        local insert_line=$((section_line + 2))
        insert_before_line "${insert_line}" "- **${pattern}**: ${description}" "${journey_file}"
    fi
}

# Add user hint to journey
add_user_hint() {
    local journey_file="$1"
    local hint="$2"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

    local section_line
    section_line=$(grep -n "^## User Hints" "${journey_file}" | cut -d: -f1)

    if [[ -n "${section_line}" ]]; then
        local insert_line=$((section_line + 1))

        # Check if hints section is empty
        local next_line
        next_line=$(sed -n "$((insert_line + 1))p" "${journey_file}")
        if [[ "${next_line}" == *"*(No user hints yet)"* ]]; then
            # Replace the placeholder
            sed_inplace "$((insert_line + 1))s@.*@- ${timestamp}: \"${hint}\"@" "${journey_file}"
        else
            # Add new hint
            insert_after_line "${insert_line}" "- ${timestamp}: \"${hint}\"" "${journey_file}"
        fi
    fi
}

# Add pending question
add_pending_question() {
    local journey_file="$1"
    local question="$2"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%d")

    local section_line
    section_line=$(grep -n "^## Pending Questions" "${journey_file}" | cut -d: -f1)

    if [[ -n "${section_line}" ]]; then
        local insert_line=$((section_line + 1))

        # Check if section is empty
        local next_line
        next_line=$(sed -n "$((insert_line + 1))p" "${journey_file}")
        if [[ "${next_line}" == *"*(No pending questions)"* ]]; then
            sed_inplace "$((insert_line + 1))s@.*@- [ ] ${timestamp}: ${question}@" "${journey_file}"
        else
            insert_after_line "${insert_line}" "- [ ] ${timestamp}: ${question}" "${journey_file}"
        fi
    fi
}

# Add checkpoint to journey
add_checkpoint() {
    local journey_file="$1"
    local tag="$2"
    local description="$3"
    local id
    id=$(grep "^## Checkpoints" -A 20 "${journey_file}" | grep -c "^|" || echo 0)

    local section_line
    section_line=$(grep -n "^## Checkpoints" "${journey_file}" | cut -d: -f1)

    if [[ -n "${section_line}" ]]; then
        local insert_line=$((section_line + 3))
        local timestamp
        timestamp=$(date -u +"%Y-%m-%d")
        insert_after_line "${insert_line}" "| ${id} | ${tag} | ${timestamp} | ${description} |" "${journey_file}"
    fi
}

# ============================================================================
# DESIGN SPEC FUNCTIONS
# ============================================================================

# Get design spec file path from journey name
get_design_spec_path() {
    local name="$1"
    echo "${JOURNEY_DIR}/${name}.spec.md"
}

# Get design spec path from journey file
get_design_spec_path_from_journey() {
    local journey_file="$1"
    local journey_name
    journey_name=$(basename "${journey_file}" .journey.md)
    get_design_spec_path "${journey_name}"
}

# Create design spec file
create_design_spec() {
    local journey_file="$1"
    local spec_path
    spec_path=$(get_design_spec_path_from_journey "${journey_file}")

    # Extract journey information
    local goal
    goal=$(get_journey_goal "${journey_file}")
    local journey_name
    journey_name=$(basename "${journey_file}" .journey.md)

    # Get current approach details
    local approach_details
    approach_details=$(sed -n '/^## Current Approach Detail/,/^## [A-Z]/p' "${journey_file}" | sed '$d')

    # Get baseline metrics
    local baseline_metrics
    baseline_metrics=$(sed -n '/^## Baseline Metrics/,/^## /p' "${journey_file}" | sed '$d')

    # Create the design spec
    cat > "${spec_path}" << EOF
# Design Spec: ${goal}

> **Journey**: ${journey_name}
> **Created**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
> **Status**: DRAFT

---

## Overview

**Goal**: ${goal}

This document describes the design and implementation plan for achieving the stated goal.

---

## Approach

${approach_details}

---

## Baseline Metrics

${baseline_metrics}

---

## Files to Modify

*(To be populated during implementation)*

---

## Implementation Plan

### Phase 1: Research and Planning
- [ ] Research complete
- [ ] Approach selected
- [ ] Design spec created

### Phase 2: Prototyping (if applicable)
- [ ] Prototype implementation
- [ ] Prototype validation
- [ ] Results documented

### Phase 3: Implementation
- [ ] Production code changes
- [ ] Tests passing
- [ ] Code review complete

### Phase 4: Consolidation
- [ ] Documentation updated
- [ ] Design spec finalized
- [ ] Tests validated

---

## Success Criteria

- [ ] Goal achieved
- [ ] All tests pass (no regression)
- [ ] Documentation complete
- [ ] Design spec finalized

---

## Changes Made

*(To be populated during CONSOLIDATING phase)*

---

## Documentation Updates

*(To be populated during CONSOLIDATING phase)*

---

## References

*(Add links to relevant docs, papers, or code)*
EOF

    log_success "Created design spec: ${spec_path}"

    # Update journey file to reference the spec
    local section_line
    section_line=$(grep -n "^## Design Spec" "${journey_file}" | cut -d: -f1)

    if [[ -n "${section_line}" ]]; then
        local insert_line=$((section_line + 2))
        insert_before_line "${insert_line}" "See [${journey_name}.spec.md](${journey_name}.spec.md) for detailed design specification." "${journey_file}"
    fi

    echo "${spec_path}"
}

# Update design spec with implementation details
update_design_spec() {
    local journey_file="$1"
    local spec_path
    spec_path=$(get_design_spec_path_from_journey "${journey_file}")

    if [[ ! -f "${spec_path}" ]]; then
        log_warning "Design spec not found: ${spec_path}"
        return 1
    fi

    # Extract learnings from journey
    local learnings
    learnings=$(sed -n '/^## Learnings Log/,/^## Dead Ends/p' "${journey_file}" | sed '$d')

    # Extract artifacts
    local artifacts
    artifacts=$(sed -n '/^## Generated Artifacts/,/^## Learnings Log/p' "${journey_file}" | sed '$d')

    # Update status to COMPLETE
    sed_inplace 's/\*\*Status\*\*: DRAFT/\*\*Status\*\*: COMPLETE/' "${spec_path}"
    sed_inplace "s/\*\*Created\*\*: .*/\*\*Updated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")/" "${spec_path}"

    # Append or update sections
    # This is a simplified version - the AI will handle detailed updates
    log_info "Design spec ready for finalization: ${spec_path}"
}

# ============================================================================
# JOURNEY FILE FUNCTIONS
# ============================================================================

# Get list of all journeys
list_journeys() {
    local journeys=()
    while IFS= read -r -d '' file; do
        journeys+=("${file}")
    done < <(find "${JOURNEY_DIR}" -name "*.journey.md" -print0 2>/dev/null)

    if [[ ${#journeys[@]} -eq 0 ]]; then
        log_info "No journeys found in ${JOURNEY_DIR}"
        return
    fi

    echo -e "\n${CYAN}=== Active Journeys ===${NC}\n"

    # Use a for loop with proper handling
    local journey
    for journey in "${journeys[@]:-}"; do
        local name
        name=$(basename "${journey}" .journey.md)
        local state
        state=$(get_journey_state "${journey}")
        local goal
        goal=$(get_journey_goal "${journey}")
        local progress
        progress=$(get_journey_progress "${journey}")

        # Color code by state
        local state_color="${NC}"
        case "${state}" in
            COMPLETE) state_color="${GREEN}" ;;
            BLOCKED|WAITING_FOR_USER) state_color="${YELLOW}" ;;
            PIVOTING) state_color="${RED}" ;;
            *) state_color="${CYAN}" ;;
        esac

        printf "${BLUE}${name}${NC} [${state_color}${state}${NC}] ${progress}%\n"
        printf "  Goal: ${goal}\n\n"
    done
}

# Find active journey (first non-complete journey)
find_active_journey() {
    local journeys=()
    while IFS= read -r -d '' file; do
        journeys+=("${file}")
    done < <(find "${JOURNEY_DIR}" -name "*.journey.md" -print0 2>/dev/null)

    # Check if journeys array is empty
    if [[ ${#journeys[@]} -eq 0 ]]; then
        return 1
    fi

    # Sort by modification time (most recent first)
    local sorted_journeys
    sorted_journeys=$(printf '%s\n' "${journeys[@]}" | xargs ls -t 2>/dev/null)

    for journey in ${sorted_journeys}; do
        local state
        state=$(get_journey_state "${journey}")
        if [[ "${state}" != "COMPLETE" ]]; then
            echo "${journey}"
            return 0
        fi
    done

    return 1
}

# Show detailed status of a journey
show_journey_status() {
    local journey_file="$1"

    if [[ ! -f "${journey_file}" ]]; then
        log_error "Journey file not found: ${journey_file}"
        return 1
    fi

    local name
    name=$(basename "${journey_file}" .journey.md)

    echo -e "\n${CYAN}=== Journey: ${name} ===${NC}\n"

    # Meta section
    echo -e "${YELLOW}Meta:${NC}"
    grep "^- " "${journey_file}" | sed 's/^-/  /'

    # Checkpoints
    echo -e "\n${YELLOW}Checkpoints:${NC}"
    grep -A 20 "^## Checkpoints" "${journey_file}" | grep "^|" | tail -n +2

    # Current approach
    echo -e "\n${YELLOW}Current Approach:${NC}"
    grep -A 10 "^## Current Approach Detail" "${journey_file}" | head -n 10

    # Pending questions
    local pending
    pending=$(grep -A 20 "^## Pending Questions" "${journey_file}" | grep "^- \[ \]")
    if [[ -n "${pending}" ]]; then
        echo -e "\n${YELLOW}Pending Questions:${NC}"
        echo "${pending}"
    fi

    # Anti-patterns
    local anti_patterns
    anti_patterns=$(grep -A 20 "^## Anti-Patterns" "${journey_file}" | grep "^- \*\*")
    if [[ -n "${anti_patterns}" ]]; then
        echo -e "\n${YELLOW}Anti-Patterns:${NC}"
        echo "${anti_patterns}"
    fi
}

# ============================================================================
# CHECKPOINT FUNCTIONS
# ============================================================================

# Create a git checkpoint
create_checkpoint() {
    local journey_name="$1"
    local milestone_number="$2"
    local description="$3"

    local tag="${CHECKPOINT_PREFIX}-${journey_name}-milestone-${milestone_number}"

    # Check if tag already exists
    if git rev-parse "${tag}" >/dev/null 2>&1; then
        log_warning "Tag ${tag} already exists, skipping"
        return
    fi

    # Create annotated tag
    git tag -a "${tag}" -m "Journey checkpoint: ${description}" HEAD

    log_success "Created checkpoint: ${tag}"
}

# Rollback to a checkpoint
rollback_to_checkpoint() {
    local journey_file="$1"
    local checkpoint_id="${2:-}"

    if [[ -z "${checkpoint_id}" ]]; then
        # Get the latest checkpoint (highest ID)
        checkpoint_id=$(grep -A 20 "^## Checkpoints" "${journey_file}" | grep "^|" | tail -n +2 | tail -n 1 | cut -d'|' -f1 | tr -d ' ')
        if [[ -z "${checkpoint_id}" ]]; then
            log_error "No checkpoints found"
            return 1
        fi
    fi

    # Get the tag for this checkpoint
    local tag
    tag=$(grep -A 20 "^## Checkpoints" "${journey_file}" | grep "^| ${checkpoint_id} " | cut -d'|' -f2 | tr -d ' ')

    if [[ -z "${tag}" ]]; then
        log_error "Checkpoint ID ${checkpoint_id} not found"
        return 1
    fi

    log_warning "Rolling back to checkpoint: ${tag}"
    log_info "This will reset your working directory to the state at ${tag}"
    echo -n "Continue? [y/N] "
    read -r response

    if [[ "${response}" =~ ^[Yy]$ ]]; then
        git reset --hard "${tag}"
        log_success "Rolled back to ${tag}"
    else
        log_info "Rollback cancelled"
    fi
}

# List checkpoints for a journey
list_checkpoints() {
    local journey_file="$1"

    echo -e "\n${CYAN}=== Checkpoints ===${NC}\n"

    grep -A 50 "^## Checkpoints" "${journey_file}" | grep "^|" | while read -r line; do
        if [[ "${line}" != *"---"* ]]; then
            echo "${line}"
        fi
    done
}

# ============================================================================
# BASELINE AND GUARDRAIL FUNCTIONS
# ============================================================================

# Establish baseline metrics
establish_baselines() {
    local journey_file="$1"

    log_phase "Establishing baseline metrics..."

    # Run tests to get baseline
    log_info "Running baseline tests..."

    # Store baseline in journey file
    local baseline_date
    baseline_date=$(date -u +"%Y-%m-%d")

    # Update baselines section
    sed_inplace "s/| Test Pass Rate    | TBD      | TBD     | No decrease |/| Test Pass Rate    | TBD      | TBD     | No decrease |/; s/^|.*|$/| Test Pass Rate    | ${baseline_date}      | ${baseline_date}     | No decrease |/" "${journey_file}"

    # Count tests
    local test_count=0
    local passed_count=0

    if eval "${ALL_TESTS_COMMAND} 2>&1" | grep -q "tests passed"; then
        passed_count=$(eval "${ALL_TESTS_COMMAND} 2>&1" | grep -oE "[0-9]+ tests passed" | grep -oE "[0-9]+")
    fi

    log_success "Baseline established: ${passed_count} tests passing"
    add_learning "${journey_file}" "Baseline: ${passed_count} tests passing"
}

# Run guardrails
run_guardrails() {
    local journey_file="$1"

    log_debug "Running guardrails..."

    # Build
    log_debug "Building..."
    if ! eval "${BUILD_COMMAND} >/dev/null 2>&1"; then
        log_error "Build failed"
        return 1
    fi

    # Run tests
    log_debug "Running guardrail tests..."
    for test in ${GUARDRAIL_TESTS}; do
        if ! eval "${TEST_COMMAND} >/dev/null 2>&1"; then
            log_error "Test ${test} failed"
            return 1
        fi
    done

    return 0
}

# ============================================================================
# AI API FUNCTIONS
# ============================================================================

# Setup AI command (Claude or Gemini)
setup_ai() {
    if [[ "${AI_PROVIDER}" == "gemini" ]]; then
        AI_CMD="gemini"
        AI_FLAG="--yolo"
        log_debug "Using Gemini CLI"
    else
        AI_CMD="claude --dangerously-skip-permissions"
        AI_FLAG="--print"
        log_debug "Using Claude CLI"
    fi
}

# Run AI with a prompt file, printing status to stderr when VERBOSE=true.
# In verbose mode (Claude only): uses stream-json to show tool calls and thinking live.
# Usage: run_ai_with_prompt <temp_prompt_file>
# Returns the AI exit code.
run_ai_with_prompt() {
    local temp_prompt="$1"

    if [[ "${VERBOSE}" == "true" && "${AI_PROVIDER}" != "gemini" ]]; then
        # Stream JSON and parse interesting events to stderr, pass full output to stdout
        cat "$temp_prompt" | $AI_CMD --print \
            --output-format stream-json \
            --include-partial-messages \
            --verbose 2>&1 | tee >(
                while IFS= read -r line; do
                    # Tool use starting
                    if echo "$line" | grep -q '"type":"content_block_start"'; then
                        local tool_name
                        tool_name=$(echo "$line" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    cb = d.get('event',{}).get('content_block',{})
    if cb.get('type') == 'tool_use':
        print(cb.get('name','?'))
except: pass
" 2>/dev/null)
                        if [[ -n "$tool_name" ]]; then
                            echo -e "\033[36m[AI] → ${tool_name}\033[0m" >&2
                        fi
                    # Streaming text (thinking/response)
                    elif echo "$line" | grep -q '"type":"text_delta"'; then
                        local chunk
                        chunk=$(echo "$line" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    delta = d.get('event',{}).get('delta',{})
    if delta.get('type') == 'text_delta':
        print(delta.get('text',''), end='')
except: pass
" 2>/dev/null)
                        if [[ -n "$chunk" ]]; then
                            printf '%s' "$chunk" >&2
                        fi
                    # Final result summary
                    elif echo "$line" | grep -q '"type":"result"'; then
                        local cost turns
                        cost=$(echo "$line" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(f\"\${d.get('total_cost_usd',0):.4f}\")
except: pass
" 2>/dev/null)
                        turns=$(echo "$line" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('num_turns',0))
except: pass
" 2>/dev/null)
                        echo >&2
                        log_debug "AI finished: ${turns} turn(s), \$${cost}"
                    fi
                done
            )
        return ${PIPESTATUS[0]}
    else
        cat "$temp_prompt" | $AI_CMD $AI_FLAG 2>&1
        return $?
    fi
}

# ============================================================================
# MAIN LOOP FUNCTIONS
# ============================================================================

# Get the previous design phase for review
get_previous_design_phase() {
    local journey_file="$1"
    # Check journey metadata for Previous Phase marker (Meta section format)
    if grep -q "^- Previous Phase:" "${journey_file}" 2>/dev/null; then
        grep "^- Previous Phase:" "${journey_file}" | head -1 | sed 's/^- Previous Phase: //' | tr -d ' '
    else
        # Fallback: try to infer from recent learnings log (transition history)
        if grep -q "Transitioned to.*SYSTEM_DESIGN" "${journey_file}" 2>/dev/null; then
            echo "REQUIREMENTS"
        elif grep -q "Transitioned to.*ARCH_DESIGN" "${journey_file}" 2>/dev/null; then
            echo "SYSTEM_DESIGN"
        elif grep -q "Transitioned to.*MODULE_DESIGN" "${journey_file}" 2>/dev/null; then
            echo "ARCH_DESIGN"
        elif grep -q "Transitioned to.*IMPLEMENTATION" "${journey_file}" 2>/dev/null; then
            echo "MODULE_DESIGN"
        else
            echo "UNKNOWN"
        fi
    fi
}

# Extract design content from journey/spec files for consultation
extract_design_content() {
    local journey_file="$1"
    local phase="$2"

    # Get the spec file path
    local spec_file
    spec_file=$(get_design_spec_path_from_journey "${journey_file}")

    local content=""

    # Extract phase-specific content
    case "$phase" in
        REQUIREMENTS)
            # Get User Requirements and System Requirements from spec
            if [[ -f "${spec_file}" ]]; then
                content=$(sed -n '/^## User Requirements/,/^## /p' "${spec_file}" | sed '$d')
                content+="\n\n"
                content+=$(sed -n '/^## System Requirements/,/^## /p' "${spec_file}" | sed '$d')
            fi
            ;;
        SYSTEM_DESIGN)
            # Get Epics and Architecture from spec
            if [[ -f "${spec_file}" ]]; then
                content=$(sed -n '/^## Epics/,/^## /p' "${spec_file}" | sed '$d')
                content+="\n\n"
                content+=$(sed -n '/^## Architecture/,/^## /p' "${spec_file}" | sed '$d')
            fi
            ;;
        ARCH_DESIGN)
            # Get current Epic and Stories from journey
            content=$(sed -n '/^## Current Epic/,/^## /p' "${journey_file}" | sed '$d')
            ;;
        MODULE_DESIGN)
            # Get current Story design from journey
            content=$(sed -n '/^## Current Story/,/^## /p' "${journey_file}" | sed '$d')
            ;;
    esac

    # Fallback to entire journey if nothing specific found
    if [[ -z "${content}" || "${content}" == "\n\n" ]]; then
        content=$(cat "${journey_file}")
    fi

    echo "${content}"
}

# Extract research notes for a specific phase
extract_research_content() {
    local journey_file="$1"
    local phase="$2"

    # Look for phase-specific research section
    local section_pattern="### ${phase} Phase Research"
    local content
    content=$(sed -n "/^${section_pattern}/,/^### /p" "${journey_file}" | sed '$d')

    # If empty or just placeholder, return empty
    if [[ -z "${content}" || "${content}" == *"To be populated"* ]]; then
        echo ""
        return
    fi

    echo "${content}"
}

# Append content to journey file (strips ANSI escape codes)
append_to_journey() {
    local journey_file="$1"
    local content="$2"
    # Strip ANSI escape sequences before writing
    echo -e "${content}" | sed 's/\x1b\[[0-9;]*m//g' >> "${journey_file}"
}

# Load a prompt template and substitute placeholders
# Usage: load_prompt <prompt_file> <placeholder1> <value1> <placeholder2> <value2> ...
load_prompt() {
    local prompt_file="$1"
    shift
    local content
    content=$(cat "$prompt_file")

    # Substitute placeholders in key-value pairs
    while [[ $# -ge 2 ]]; do
        local placeholder="$1"
        local value="$2"
        shift 2
        content="${content//${placeholder}/${value}}"
    done

    echo "$content"
}

# Ensure the Previous Phase marker is set in the Meta section
ensure_previous_phase_marker() {
    local journey_file="$1"
    local phase="$2"

    # Check if marker exists in Meta section
    if ! grep -q "^- Previous Phase:" "${journey_file}" 2>/dev/null; then
        # Add it to Meta section (after the State line)
        local state_line
        state_line=$(grep -n "^- State:" "${journey_file}" | cut -d: -f1)
        if [[ -n "${state_line}" ]]; then
            insert_after_line "${state_line}" "- Previous Phase: ${phase}" "${journey_file}"
        fi
    else
        # Update existing marker
        sed_inplace "s/^- Previous Phase: .*/- Previous Phase: ${phase}/" "${journey_file}"
    fi
}

# Transition to the next phase after successful design review
auto_transition_from_review() {
    local journey_file="$1"
    local prev_phase="$2"
    local next_state=""

    # Store that we just completed review to prevent infinite loop
    append_to_journey "${journey_file}" "\n**Design Review: PASSED** (${prev_phase})\n"

    # Determine next state
    case "$prev_phase" in
        REQUIREMENTS)   next_state="SYSTEM_DESIGN" ;;
        SYSTEM_DESIGN)  next_state="ARCH_DESIGN" ;;
        ARCH_DESIGN)    next_state="MODULE_DESIGN" ;;
        MODULE_DESIGN)  next_state="IMPLEMENTATION" ;;
        *)              next_state="SYSTEM_DESIGN" ;; # Safe fallback
    esac

    # Set the Previous Phase marker BEFORE transitioning
    ensure_previous_phase_marker "${journey_file}" "${prev_phase}"

    # Log the transition for debugging
    append_to_journey "${journey_file}" "\n**State Transition: DESIGN_REVIEW → ${next_state}**\n"

    # Perform the transition
    set_journey_state "${journey_file}" "${next_state}"
}

# Consult Gemini for design review
consult_gemini() {
    local phase="$1"
    local design_content="$2"
    local research_content="${3:-}"

    local consult_prompt
    if [[ -n "${research_content}" && "${research_content}" != *"To be populated"* ]]; then
        consult_prompt=$(load_prompt "${SCRIPT_DIR}/prompts/gemini-design-review-with-research.md" \
            "{{PHASE}}" "${phase}" \
            "{{DESIGN_CONTENT}}" "${design_content}" \
            "{{RESEARCH_CONTENT}}" "${research_content}")
    else
        consult_prompt=$(load_prompt "${SCRIPT_DIR}/prompts/gemini-design-review-no-research.md" \
            "{{PHASE}}" "${phase}" \
            "{{DESIGN_CONTENT}}" "${design_content}")
    fi

    echo "$consult_prompt" | $GEMINI_CONSULT_CMD $GEMINI_CONSULT_FLAGS 2>/dev/null
}

# Generate the prompt for the current iteration
generate_iteration_prompt() {
    local journey_file="$1"
    local journey_content
    journey_content=$(cat "${journey_file}")

    # Load and substitute placeholders in main iteration prompt
    load_prompt "${SCRIPT_DIR}/prompts/main-iteration.md" \
        "{{AI_PROVIDER}}" "${AI_PROVIDER}" \
        "{{JOURNEY_CONTENT}}" "${journey_content}"
}

# ============================================================================
# EPIC ARCHIVAL FUNCTIONS
# ============================================================================

# Extract the epic progress table from journey file
extract_epic_progress_table() {
    local journey_file="$1"
    awk '/^## Epic Progress/{found=1} found && /^## / && !/^## Epic Progress/{exit} found{print}' "${journey_file}" | grep '^| E[0-9]'
}

# Get list of completed epics that haven't been archived yet
get_completed_unarchived_epics() {
    local journey_file="$1"
    local journey_dir="$(dirname "${journey_file}")"
    local journey_name="$(basename "${journey_file}" .journey.md)"

    # Get current epic ID
    local current_epic=$(get_current_epic "${journey_file}" | grep -oE 'E[0-9]+' | sed 's/^E//' || echo "0")

    # Find completed epics without archival files
    while IFS='|' read -r _ epic_id _ epic_status _; do
        # Skip non-matching lines
        [[ ! "$epic_id" =~ ^[[:space:]]*E[0-9]+[[:space:]]*$ ]] && continue

        # Extract epic number
        local epic_num=$(echo "$epic_id" | tr -d '[:space:]' | grep -oE 'E[0-9]+' | sed 's/^E//')

        # Skip if not complete
        [[ ! "$epic_status" =~ COMPLETE ]] && continue

        # Skip if this is the current epic
        [[ "$epic_num" == "$current_epic" ]] && continue

        # Skip if already archived
        [[ -f "${journey_dir}/${journey_name}.journey.E${epic_num}.md" ]] && continue

        echo "$epic_num"
    done < <(extract_epic_progress_table "${journey_file}")
}

# Archive a single epic's details to separate file
archive_epic_details() {
    local journey_file="$1"
    local epic_num="$2"
    local journey_dir="$(dirname "${journey_file}")"
    local journey_name="$(basename "${journey_file}" .journey.md)"
    local epic_file="${journey_dir}/${journey_name}.journey.E${epic_num}.md"

    log_info "Archiving Epic E${epic_num} to ${epic_file}..."

    # Create archival prompt
    local archival_prompt=$(load_prompt "${SCRIPT_DIR}/prompts/epic-archival.md" \
        "{{JOURNEY_FILE}}" "${journey_file}" \
        "{{EPIC_NUM}}" "${epic_num}" \
        "{{EPIC_FILE}}" "${epic_file}" \
        "{{JOURNEY_NAME}}" "${journey_name}")

    # Create temp file with prompt
    local temp_prompt=$(mktemp)
    {
        echo "$archival_prompt"
        echo ""
        echo "Current working directory: $(pwd)"
        echo ""
    } > "$temp_prompt"

    # Run AI with the prompt
    local exit_code=0
    if [[ "${VERBOSE}" == "true" ]]; then
        log_debug "--- Archival prompt ---"
        cat "$temp_prompt" >&2
        log_debug "--- End of prompt ---"
    fi
    run_ai_with_prompt "$temp_prompt"
    exit_code=$?

    rm -f "$temp_prompt"

    # Re-raise SIGINT if user interrupted (exit code 130 = 128+SIGINT)
    if [[ $exit_code -eq 130 ]]; then
        kill -INT $$
    fi

    if [ $exit_code -ne 0 ]; then
        log_error "Archival failed with exit code $exit_code"
        return 1
    fi

    # Verify the epic file was created
    if [[ -f "${epic_file}" ]]; then
        log_success "✅ Epic E${epic_num} archived to ${epic_file}"
        return 0
    else
        log_warning "Epic file not created, archival may have failed"
        return 1
    fi
}

# Archive completed epics that haven't been archived yet (direct/inline version)
# Only safe to call from within main_loop (i.e. from the ARCHIVING case)
archive_completed_epics_if_needed_now() {
    local journey_file="$1"

    # Get list of completed but unarchived epics
    local epics_to_archive=($(get_completed_unarchived_epics "${journey_file}"))

    # If no epics to archive, return early
    if [[ ${#epics_to_archive[@]} -eq 0 ]]; then
        return 0
    fi

    log_info "📦 Found ${#epics_to_archive[@]} completed epic(s) to archive..."

    # Archive each epic
    for epic_num in "${epics_to_archive[@]}"; do
        archive_epic_details "${journey_file}" "${epic_num}"
    done
}

# Set state to ARCHIVING so main_loop handles archiving via run_iteration path.
# This avoids spawning an AI process inline (which hangs inside Claude Code sessions).
archive_completed_epics_if_needed() {
    local journey_file="$1"

    # Get list of completed but unarchived epics
    local epics_to_archive=($(get_completed_unarchived_epics "${journey_file}"))

    # Nothing to do
    if [[ ${#epics_to_archive[@]} -eq 0 ]]; then
        return 0
    fi

    log_info "📦 ${#epics_to_archive[@]} completed epic(s) need archiving — setting state to ARCHIVING"

    # Save current state so we can restore it after archiving
    local current_state
    current_state=$(get_journey_state "${journey_file}")
    set_previous_state "${journey_file}" "${current_state}"

    set_journey_state "${journey_file}" "ARCHIVING"
}

run_iteration() {
    local journey_file="$1"
    local journey_name
    journey_name=$(basename "${journey_file}" .journey.md)

    local state
    state=$(get_journey_state "${journey_file}")

    log_state "Current state: ${state}"

    log_phase "Running iteration for ${journey_name}..."

    # Get design spec path for reference
    local design_spec_path
    design_spec_path=$(get_design_spec_path_from_journey "${journey_file}")

    # Create temp file with prompt + journey context
    local temp_prompt=$(mktemp)
    {
        generate_iteration_prompt "${journey_file}"
        echo ""
        echo "---"
        echo ""
        echo "JOURNEY_FILE=${journey_file}"
        echo "DESIGN_SPEC_PATH=${design_spec_path}"
        echo ""
        echo "Current working directory: $(pwd)"
        echo ""
    } > "$temp_prompt"

    # Run AI with the prompt
    local exit_code=0
    log_info "Calling ${AI_PROVIDER} to perform iteration..."
    if [[ "${VERBOSE}" == "true" ]]; then
        log_debug "--- Iteration prompt ---"
        cat "$temp_prompt" >&2
        log_debug "--- End of prompt ---"
    fi

    run_ai_with_prompt "$temp_prompt"
    exit_code=$?

    rm -f "$temp_prompt"

    # Re-raise SIGINT if user interrupted (exit code 130 = 128+SIGINT)
    if [[ $exit_code -eq 130 ]]; then
        kill -INT $$
    fi

    if [ $exit_code -ne 0 ]; then
        log_error "${AI_PROVIDER} returned exit code $exit_code"
        set_journey_state "${journey_file}" "BLOCKED"
        return 1
    fi

    # Re-read journey state after Claude's updates
    local new_state
    new_state=$(get_journey_state "${journey_file}")
    log_state "New state: ${new_state}"

    log_info "Iteration complete"
}

# Main loop
main_loop() {
    local journey_file="$1"
    local journey_name
    journey_name=$(basename "${journey_file}" .journey.md)
    local iteration=0

    # Set up AI command
    setup_ai

    log_info "Starting V-Model loop for: ${journey_name}"
    log_info "Journey file: ${journey_file}"

    # Establish baselines if not already done
    if grep -q "| Baseline | TBD" "${journey_file}"; then
        establish_baselines "${journey_file}"
    fi

    while [[ ${iteration} -lt ${MAX_ITERATIONS} ]]; do
        iteration=$((iteration + 1))
        log_phase "Iteration ${iteration}/${MAX_ITERATIONS}"

        local state
        state=$(get_journey_state "${journey_file}")
        local progress
        progress=$(get_journey_progress "${journey_file}")
        log_info "Progress: ${progress} | State: ${state}"

        case "${state}" in
            COMPLETE)
                log_success "Journey complete!"
                break
                ;;
            BLOCKED|WAITING_FOR_USER)
                # Check if there are actual pending questions
                local pending_questions
                pending_questions=$(grep -A 20 "^## Pending Questions" "${journey_file}" | grep "^- \[ \]" | grep -v "^\*")

                if [[ -z "${pending_questions}" ]]; then
                    # No real questions - check if we can auto-continue
                    local current_epic
                    current_epic=$(get_current_epic "${journey_file}")

                    # Check if epic is complete and we have a next epic
                    if [[ "${current_epic}" != "TBD" ]] && should_continue_to_next_epic "${journey_file}" "${current_epic}"; then
                        log_info "Epic ${current_epic} complete - auto-transitioning to next epic..."
                        transition_to_next_epic "${journey_file}" "${current_epic}"

                        # Archive the completed epic
                        archive_completed_epics_if_needed "${journey_file}"
                        continue
                    fi
                fi

                # Only stop if there are genuine questions or we can't auto-transition
                log_warning "Journey is ${state}. Use '$0 hint \"message\"' to provide input."
                if [[ -n "${pending_questions}" ]]; then
                    log_info "Current pending questions:"
                    echo "${pending_questions}"
                fi
                break
                ;;
            DESIGN_REVIEW)
                if [[ "$CONSULT_GEMINI" != "true" ]]; then
                    # Skip consultation, proceed to next phase
                    log_info "Gemini consultation disabled - auto-approving design..."
                    local prev_phase
                    prev_phase=$(get_previous_design_phase "${journey_file}")
                    auto_transition_from_review "${journey_file}" "${prev_phase}"
                    continue
                fi

                log_info "Running design review with Gemini consultation..."

                # Get the previous design phase
                local prev_phase
                prev_phase=$(get_previous_design_phase "${journey_file}")

                if [[ "${prev_phase}" == "UNKNOWN" ]]; then
                    log_warning "Could not determine previous phase - defaulting to SYSTEM_DESIGN"
                    prev_phase="REQUIREMENTS"
                fi

                log_info "Reviewing design from phase: ${prev_phase}"

                # Extract BOTH design content AND research notes
                local design_content
                design_content=$(extract_design_content "${journey_file}" "${prev_phase}")

                local research_content
                research_content=$(extract_research_content "${journey_file}" "${prev_phase}")

                # Consult Gemini with research context
                log_info "Consulting Gemini for ${prev_phase} phase review..."
                local gemini_feedback
                gemini_feedback=$(consult_gemini "${prev_phase}" "${design_content}" "${research_content}")

                # Parse decision
                if echo "$gemini_feedback" | grep -q "DECISION: ITERATE"; then
                    log_warning "Gemini identified major issues. Iterating..."
                    # Strip ANSI codes from Gemini output before appending
                    local clean_feedback
                    clean_feedback=$(echo "$gemini_feedback" | sed 's/\x1b\[[0-9;]*m//g')
                    append_to_journey "${journey_file}" "\n## Gemini Review: ITERATE\n\n${clean_feedback}\n"
                    set_journey_state "${journey_file}" "${prev_phase}"
                else
                    log_success "Gemini approved design. Proceeding..."
                    # Strip ANSI codes from Gemini output before appending
                    local clean_feedback
                    clean_feedback=$(echo "$gemini_feedback" | sed 's/\x1b\[[0-9;]*m//g')
                    append_to_journey "${journey_file}" "\n## Gemini Review: APPROVED\n\n${clean_feedback}\n"
                    auto_transition_from_review "${journey_file}" "${prev_phase}"
                fi
                ;;
            REVIEWING)
                log_info "Review phase: checking code quality..."
                run_iteration "${journey_file}"

                # Ensure any changes Claude made are committed and pushed
                local current_branch
                current_branch=$(git branch --show-current)
                if [[ -n "${current_branch}" ]]; then
                    if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
                        log_warning "Uncommitted changes detected after iteration - committing now"
                        git add -A
                        git commit -m "chore(journey): auto-commit changes from iteration ${iteration} [${journey_name}]" || true
                    fi
                    log_info "Pushing to origin/${current_branch}..."
                    git push origin "${current_branch}" || log_warning "Git push failed (may be no changes)"
                fi

                # Archive completed epics after state transition
                archive_completed_epics_if_needed "${journey_file}"
                ;;
            ARCHIVING)
                log_info "Archiving completed epics..."
                local pre_archive_state
                pre_archive_state=$(get_previous_state "${journey_file}")
                archive_completed_epics_if_needed_now "${journey_file}"
                # Restore previous state (or BLOCKED if unknown)
                set_journey_state "${journey_file}" "${pre_archive_state:-BLOCKED}"
                ;;
            *)
                run_iteration "${journey_file}"

                # Ensure any changes Claude made are committed and pushed
                local current_branch
                current_branch=$(git branch --show-current)
                if [[ -n "${current_branch}" ]]; then
                    if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
                        log_warning "Uncommitted changes detected after iteration - committing now"
                        git add -A
                        git commit -m "chore(journey): auto-commit changes from iteration ${iteration} [${journey_name}]" || true
                    fi
                    log_info "Pushing to origin/${current_branch}..."
                    git push origin "${current_branch}" || log_warning "Git push failed (may be no changes)"
                fi

                # Archive completed epics after state transition
                archive_completed_epics_if_needed "${journey_file}"
                ;;
        esac

        # Small delay to prevent overwhelming the API
        sleep 1
    done

    if [[ ${iteration} -ge ${MAX_ITERATIONS} ]]; then
        log_warning "Maximum iterations reached (${MAX_ITERATIONS})"
    fi
}

# ============================================================================
# COMMAND HANDLERS
# ============================================================================

# Handle hint command
handle_hint() {
    local hint="$1"

    local active_journey
    active_journey=$(find_active_journey)

    if [[ -z "${active_journey}" ]]; then
        log_error "No active journey found"
        log_info "Create one with: $0 \"your goal\""
        exit 1
    fi

    add_user_hint "${active_journey}" "${hint}"
    log_success "Hint added to journey"

    # If journey was waiting, unpause it
    local state
    state=$(get_journey_state "${active_journey}")
    if [[ "${state}" == "WAITING_FOR_USER" ]]; then
        log_info "Journey was waiting - resuming..."
        set_journey_state "${active_journey}" "REQUIREMENTS"
    fi
}

# Handle pivot command
handle_pivot() {
    local active_journey
    active_journey=$(find_active_journey)

    if [[ -z "${active_journey}" ]]; then
        log_error "No active journey found"
        exit 1
    fi

    log_info "Forcing pivot for active journey"
    set_journey_state "${active_journey}" "PIVOTING"
    log_success "Journey state set to PIVOTING"
}

# Handle archive command
handle_archive() {
    local active_journey
    active_journey=$(find_active_journey)

    if [[ -z "${active_journey}" ]]; then
        log_error "No active journey found"
        exit 1
    fi

    log_info "Archiving completed epics for active journey"

    local current_state
    current_state=$(get_journey_state "${active_journey}")
    set_previous_state "${active_journey}" "${current_state}"
    set_journey_state "${active_journey}" "ARCHIVING"

    main_loop "${active_journey}"
}

# Handle reflect command
handle_reflect() {
    local active_journey
    active_journey=$(find_active_journey)

    if [[ -z "${active_journey}" ]]; then
        log_error "No active journey found"
        exit 1
    fi

    log_info "Forcing reflection for active journey"
    set_journey_state "${active_journey}" "REFLECTING"
    log_success "Journey state set to REFLECTING"
}

# Handle rollback command
handle_rollback() {
    local checkpoint_id="$1"

    local active_journey
    active_journey=$(find_active_journey)

    if [[ -z "${active_journey}" ]]; then
        log_error "No active journey found"
        exit 1
    fi

    rollback_to_checkpoint "${active_journey}" "${checkpoint_id}"
}

# Handle list-checkpoints command
handle_list_checkpoints() {
    local active_journey
    active_journey=$(find_active_journey)

    if [[ -z "${active_journey}" ]]; then
        log_error "No active journey found"
        exit 1
    fi

    list_checkpoints "${active_journey}"
}

# Handle status command
handle_status() {
    ensure_directories
    ensure_gitignore
    list_journeys

    # Show details for active journey
    local active_journey
    active_journey=$(find_active_journey)

    if [[ -n "${active_journey}" ]]; then
        show_journey_status "${active_journey}"
    fi
}

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

main() {
    # Parse command line arguments
    local command=""
    local goal=""
    local hint=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -g|--gemini)
                AI_PROVIDER="gemini"
                shift
                ;;
            --no-consult)
                CONSULT_GEMINI=false
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            status|pivot|reflect|archive|rollback|list-checkpoints)
                command="$1"
                shift
                ;;
            hint)
                command="hint"
                hint="$2"
                shift 2
                ;;
            -*)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                if [[ -z "${command}" ]]; then
                    if [[ -z "${goal}" ]]; then
                        goal="$1"
                    fi
                elif [[ "${command}" == "rollback" ]]; then
                    # The argument is the checkpoint ID
                    set -- "$1" "${@:2}"
                    break
                fi
                shift
                ;;
        esac
    done

    # Ensure directories exist
    ensure_directories
    ensure_gitignore

    # Handle commands
    case "${command}" in
        status)
            handle_status
            exit 0
            ;;
        hint)
            handle_hint "${hint}"
            exit 0
            ;;
        pivot)
            handle_pivot
            exit 0
            ;;
        reflect)
            handle_reflect
            exit 0
            ;;
        archive)
            handle_archive
            exit 0
            ;;
        rollback)
            handle_rollback "$1"
            exit 0
            ;;
        list-checkpoints)
            handle_list_checkpoints
            exit 0
            ;;
    esac

    # If no goal provided, continue active journey
    if [[ -z "${goal}" ]]; then
        local active_journey
        active_journey=$(find_active_journey)

        if [[ -z "${active_journey}" ]]; then
            log_error "No active journey found"
            log_info "Start a new journey with: $0 \"your goal\""
            log_info "Or check status with: $0 status"
            exit 1
        fi

        main_loop "${active_journey}"
        exit 0
    fi

    # Create new journey
    log_info "Creating new journey for goal: ${goal}"
    local journey_file
    journey_file=$(create_journey_file "${goal}")

    if [[ ! -f "${journey_file}" ]]; then
        log_error "Failed to create journey file"
        exit 1
    fi

    log_success "Journey created! Starting loop..."
    main_loop "${journey_file}"
}

# Run main
main "$@"
