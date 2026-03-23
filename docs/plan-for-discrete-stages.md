# Plan: Add Phase-Specific Context to State Names

## Context

The current V-Model state machine uses generic state names (like `DESIGN_REVIEW`) that run during multiple phases. This creates ambiguity in prompts because the AI agent must use metadata (like "Previous Phase" markers) to determine which phase it's in. By making states explicitly phase-specific, we eliminate this ambiguity and make the state machine more self-documenting.

## Current Problem

- `DESIGN_REVIEW` runs after 4 different design phases (REQUIREMENTS, SYSTEM_DESIGN, ARCH_DESIGN, MODULE_DESIGN)
- The system uses a "Previous Phase" marker in journey files to determine transitions
- Prompts must be dynamically adjusted based on which phase just completed
- This adds complexity to `autoTransitionFromReview()` and prompt generation

## Solution: Split DESIGN_REVIEW into Phase-Specific States

### New States (in `src/types.ts`)

```typescript
export enum VModelState {
  // ... existing states ...

  // Replace DESIGN_REVIEW with these 4 explicit states:
  REQUIREMENTS_REVIEW = "REQUIREMENTS_REVIEW",
  SYSTEM_DESIGN_REVIEW = "SYSTEM_DESIGN_REVIEW",
  ARCH_DESIGN_REVIEW = "ARCH_DESIGN_REVIEW",
  MODULE_DESIGN_REVIEW = "MODULE_DESIGN_REVIEW",

  // DESIGN_REVIEW removed entirely (not released, no backward compat needed)
}
```

### Updated State Transitions (in `src/state-machine.ts`)

**Normal Mode:**
```
REQUIREMENTS → REQUIREMENTS_REVIEW → SYSTEM_DESIGN
SYSTEM_DESIGN → SYSTEM_DESIGN_REVIEW → ARCH_DESIGN
ARCH_DESIGN → ARCH_DESIGN_REVIEW → MODULE_DESIGN
MODULE_DESIGN → MODULE_DESIGN_REVIEW → IMPLEMENTATION
IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → SYSTEM_TEST → ACCEPTANCE_TEST → CONSOLIDATING → COMPLETE
```

**MVP Mode (skip all review states):**
```
REQUIREMENTS → SYSTEM_DESIGN → ARCH_DESIGN → MODULE_DESIGN → IMPLEMENTATION → SYSTEM_TEST → COMPLETE
```

**GO Mode (skip all review and test states):**
```
REQUIREMENTS → SYSTEM_DESIGN → ARCH_DESIGN → MODULE_DESIGN → IMPLEMENTATION → COMPLETE
```

**Changes:**
1. Replace `autoTransitionFromReview()` with direct state transitions (each review state → its next phase)
2. Remove `getPreviousDesignPhase()` (phase extracted from state name)
3. Remove `ensurePreviousPhaseMarker()` (dead code, never called)
4. Update `getNextStateNormal()` with direct transitions for 4 new review states
5. Update `getNextStateForMvp()` to skip all 4 review states
6. Update `getNextStateForGo()` to skip all 4 review states

### New Prompt File (in `src/prompts/states/`)

Create a single shared handler file:
- `design-reviews.ts` - Shared handler for all 4 review states

**Interface sketch:**
```typescript
export interface DesignReviewsVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string;
  CONSULT_GEMINI: boolean;
  PHASE: "REQUIREMENTS" | "SYSTEM_DESIGN" | "ARCH_DESIGN" | "MODULE_DESIGN";
}

export function designReviewsPrompt(vars: DesignReviewsVars): string {
  // Generate phase-specific prompt
  // Phase is extracted from state name by caller
}
```

The handler takes a `phase` parameter and generates phase-appropriate prompts. This keeps code DRY while allowing phase-specific content injection.

**Key simplification**: The phase is extracted directly from the state name (e.g., `SYSTEM_DESIGN_REVIEW` → `SYSTEM_DESIGN`), eliminating the need for `getPreviousDesignPhase()`.

### Update Prompt Router (in `src/prompts/states/index.ts`)

Add cases for the 4 new states, all mapping to the shared `design-reviews.ts` handler:
```typescript
case VModelState.REQUIREMENTS_REVIEW:
case VModelState.SYSTEM_DESIGN_REVIEW:
case VModelState.ARCH_DESIGN_REVIEW:
case VModelState.MODULE_DESIGN_REVIEW:
  // Use shared handler with phase parameter
```

### Update Context Filters (in `src/prompts/context/journey-context.ts`)

Replace `DESIGN_REVIEW` case with 4 specific cases that can provide phase-appropriate context.

## Files to Modify

1. **src/types.ts** - Add 4 new states, remove DESIGN_REVIEW, remove previousPhase field from Journey interface
2. **src/state-machine.ts** - Update transitions, remove helper functions
3. **src/prompts/states/index.ts** - Add prompt routing for new states
4. **src/prompts/states/design-reviews.ts** - NEW (shared handler for 4 review states)
5. **src/prompts/states/design-review.ts** - DELETE (replaced by design-reviews.ts)
6. **src/prompts/context/journey-context.ts** - Update context filtering
7. **src/prompts/context/epic-context.ts** - Update epic context if needed
8. **src/main-loop.ts** - Rename handleDesignReview → handleDesignReviews, extract phase from state instead of lookup
9. **src/journey.ts** - Remove getPreviousPhase(), setPreviousPhase(), and "Previous Phase:" from template

## NEW: Test File to Create

10. **src/__tests__/unit/state-machine.test.ts** - NEW (unit tests for state transitions)

## Research Findings

### Existing Journey Files
- **9 test fixture files** found in `example/src/vibe-model/journey/`
- **3 contain "Previous Phase:" markers** (all test fixtures, not production data)
- **No DESIGN_REVIEW references** found in any journey files
- **Recommendation**: Manual cleanup of 3 test fixture files is acceptable

### Function Removal Safety
- **`autoTransitionFromReview()`**: ACTIVELY USED in main-loop.ts (3 call sites) - will be replaced by phase-specific logic
- **`getPreviousDesignPhase()`**: ACTIVELY USED in main-loop.ts (2 call sites) - will be replaced by state name extraction
- **`ensurePreviousPhaseMarker()`**: DEAD CODE (never called) - safe to remove

### "Previous Phase" Marker
- **Dead code** - `ensurePreviousPhaseMarker()` is never called
- **Not enforced** - No automatic synchronization, purely manual
- **Recommendation**: Remove now while touching journey.ts (low complexity)

## Verification

1. Run `bun run typecheck` - Ensure all state references are valid
2. Run `bun run build` - Verify compilation
3. Run `bun run lint` - Check code quality
4. Create and run `src/__tests__/unit/state-machine.test.ts` - Test all 3 mode transitions
5. **End-to-end test** with GO mode (prevents recursive AI calls):
   ```bash
   cd example/src
   ../../bin/vibe-model -g -v "Build a pig latinifier CLI in C++ using CMake"
   ```
   - Verify all state transitions work through the new review states
   - Confirm the journey completes successfully
6. Manual cleanup: Remove "- Previous Phase:" from 3 test fixture journey files

## Notes

- This is a breaking change to the state machine
- Since this isn't released yet, no backward compatibility is needed for existing journey files
- The "Previous Phase" marker will be removed now (not deferred) since it's dead code
