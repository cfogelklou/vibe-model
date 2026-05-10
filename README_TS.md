# Vibe-Model TypeScript Implementation

**TypeScript implementation details for the V-Model autonomous R&D agent.**

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Types](#core-types)
- [Type System](#type-system)
- [Module Structure](#module-structure)
- [Key Interfaces](#key-interfaces)
- [Error Handling](#error-handling)
- [Testing](#testing)

---

## Architecture Overview

The TypeScript implementation follows a layered architecture:

```
┌─────────────────────────────────────────┐
│          CLI Layer (index.ts)           │
├─────────────────────────────────────────┤
│     Orchestration (milestone-loop.ts)   │
├─────────────────────────────────────────┤
│   State Machine (milestone-state-       │
│   machine.ts) + AI Provider (ai-        │
│   provider.ts)                           │
├─────────────────────────────────────────┤
│  File Operations (prd.ts, milestone.ts)  │
├─────────────────────────────────────────┤
│     Prompts (prompts/states/*.ts)       │
└─────────────────────────────────────────┘
```

---

## Core Types

### MilestoneState Enum

```typescript
export enum MilestoneState {
  PRD = "PRD",
  REQUIREMENTS = "REQUIREMENTS",
  DESIGN = "DESIGN",
  IMPLEMENTATION = "IMPLEMENTATION",
  UNIT_TEST = "UNIT_TEST",
  INTEGRATION_TEST = "INTEGRATION_TEST",
  DELIVERY = "DELIVERY",
  COMPLETE = "COMPLETE",
  WAITING_FOR_USER = "WAITING_FOR_USER",
}
```

**Usage**: Represents the current state of a milestone in the V-Model lifecycle.

### AIProvider Type

```typescript
export type AIProvider = "claude" | "gemini";
```

**Usage**: Specifies which AI provider to use for code generation and reviews.

---

## Type System

### PRD Review Types

#### PRDReviewState

```typescript
export interface PRDReviewState {
  iteration: number;           // Current review iteration (0-indexed)
  maxIterations: number;       // Maximum iterations before deferral
  reviewResults: PRDReviewResult[];  // Results from all reviewers
  overallStatus: "pending" | "approved" | "deferred";
}
```

**Purpose**: Tracks the state of the PRD review loop.

**Lifecycle**:
1. Created with `iteration: 0` and `overallStatus: "pending"`
2. Updated after each review iteration
3. Cleaned up after approval (file deleted)

#### PRDReviewResult

```typescript
export interface PRDReviewResult {
  reviewer: "architecture" | "testability" | "ux";
  score: number;  // +2 (approve) or -1 (block)
  findings: string[];  // List of findings with severity
}
```

**Purpose**: Represents the result from a single PRD reviewer.

**Scoring**:
- `+2`: Approve (no blockers or majors)
- `-1`: Block (one or more blockers/majors)

#### PRDReview

```typescript
export interface PRDReview {
  results: PRDReviewResult[];
  overallApproved: boolean;
  iteration: number;
}
```

**Purpose**: Aggregated result from all PRD reviewers.

### Delivery Summary Types

#### DeliverySummary

```typescript
export interface DeliverySummary {
  milestoneId: number;
  milestoneName: string;
  deliverables: string[];
  timestamp: string;
  keyLearnings: string[];
}
```

**Purpose**: Cached summary of a completed milestone's deliverables.

**Usage**: Injected into subsequent milestones as dependency context.

### Milestone Types

#### Milestone

```typescript
export interface Milestone {
  id: number;
  name: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETE";
  modeOverride?: "hil" | "autonomous" | null;
}
```

**Purpose**: Represents a single milestone from the PRD milestones table.

#### PRDFile

```typescript
export interface PRDFile {
  goal: string;
  techStack: string;
  architectureOverview: string;
  milestones: Milestone[];
}
```

**Purpose**: Parsed representation of `prd.md`.

#### MilestoneFile

```typescript
export interface MilestoneFile {
  id: number;
  name: string;
  state: MilestoneState;
  progress: number;
  started: string;
  pendingTransition?: MilestoneState;
  requirements: string;
  design: string;
  testSpecifications: string;
  implementationNotes: string;
  unitTestResults: string;
  integrationTestResults: string;
  delivery: string;
  learnings: string;
  researchNotes: string;
}
```

**Purpose**: Parsed representation of a milestone tracking file.

### Configuration Type

```typescript
export interface Config {
  aiProvider: AIProvider;
  maxIterations: number;
  consultGemini: boolean;
  projectDir: string;
  verbose: boolean;
  noPush: boolean;
  commitInterval: number;
  hilMode: boolean;
  reviewEnabled: boolean;
  autonomous: boolean;
  force?: boolean;  // Bypass PRD review max-iteration check
}
```

**Purpose**: Configuration for the V-Model agent.

---

## Module Structure

### Core Modules

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `index.ts` | CLI entry point | Command parsing, initialization |
| `config.ts` | Configuration management | `initializeConfig()`, `detectProjectDirectory()` |
| `types.ts` | Type definitions | All core interfaces |
| `constants.ts` | Hardcoded constants | Path templates, reviewer prompts |
| `milestone-loop.ts` | Main orchestration | `milestoneLoop()`, `continueMilestone()` |
| `milestone-state-machine.ts` | State transitions | `getNextMilestoneState()`, `isTerminalState()` |

### File Operations

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `prd.ts` | PRD file operations | `readPRD()`, `setMilestoneStatus()` |
| `milestone.ts` | Milestone file operations | `createMilestoneFile()`, `readMilestoneFile()` |
| `prd-review-state.ts` | PRD review state | `createInitialPRDReviewState()`, `writePRDReviewState()` |
| `delivery-cache.ts` | Delivery summaries | `cacheDeliverySummary()`, `loadDeliverySummaries()` |

### AI Integration

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `ai-provider.ts` | AI execution | `runAIWithPrompt()`, `runReview()` |
| `prd-review.ts` | PRD review execution | `runPRDReview()`, `writePRDReviewFindings()` |
| `prd-fix-phase.ts` | PRD fix execution | `runPRDFixPhase()` |

### Prompt System

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `prompts/milestone-context.ts` | Context filtering | `filterMilestoneContext()` |
| `prompts/common/lifecycle-context.ts` | Lifecycle overview | `getLifecycleOverview()` |
| `prompts/states/*.ts` | Phase-specific prompts | `requirementsPhasePrompt()`, `designPhasePrompt()`, etc. |

---

## Key Interfaces

### MilestonePromptVars

```typescript
export interface MilestonePromptVars {
  AI_PROVIDER: string;
  MILESTONE_FILE: string;
  MILESTONE_NAME: string;
  MILESTONE_ID: number;
  MILESTONE_CONTENT: string;
  PRD_CONTENT?: string;
  PRD_CONTEXT?: string;
  MILESTONE_DEPENDENCIES?: {
    previous: string[];
    next: string[];
  };
  MILESTONE_POSITION?: {
    current: number;
    total: number;
    isLast: boolean;
  };
}
```

**Purpose**: Template variables for milestone prompts.

**Context Injection**:
- `PRD_CONTENT`: Raw PRD for PRD phase only
- `PRD_CONTEXT`: Goal + tech stack + architecture (for milestone phases)
- `MILESTONE_DEPENDENCIES`: Previous and upcoming milestones
- `MILESTONE_POSITION`: Current milestone's position in the sequence

### ReviewResult

```typescript
export interface ReviewResult {
  pass: boolean;
  reviewer: "architecture" | "code" | "testability" | "ux";
  findings: string[];
}
```

**Purpose**: Result from a single sub-agent reviewer (milestone phase reviews).

---

## Error Handling

### File Operations

File operations use `try/catch` with graceful degradation:

```typescript
try {
  await fs.unlink(tempPrompt);
} catch {
  // Temp file cleanup failed, ignore
}
```

### State Machine

Invalid state transitions return `null`:

```typescript
export function getNextMilestoneState(
  currentState: MilestoneState
): MilestoneState | null {
  // Returns null if no next state (e.g., DELIVERY)
}
```

---

## Testing

### Type Checking

```bash
bun run typecheck  # tsc --noEmit
```

### Linting

```bash
bun run lint  # eslint src --ext .ts
```

### Building

```bash
bun run build  # bun build src/index.ts --outdir bin --target bun
```

### E2E Testing

```bash
./scripts/e2e-test.sh
```

---

## Type Safety Guarantees

1. **No Magic Strings**: All states and reviewer types use enums or union types
2. **Exhaustive Switches**: TypeScript ensures all enum values are handled
3. **Strict Null Checks**: Optional fields explicitly marked with `?`
4. **Type Guards**: `isTerminalState()` function provides type narrowing

---

## Extension Points

### Adding a New Reviewer Type

1. Add to `ReviewerType` union in `types.ts`
2. Add prompt to `REVIEWER_PROMPTS` in `constants.ts`
3. Add to `REVIEWER_TYPES` array if needed for milestone reviews
4. Add to `PRD_REVIEWERS` array if needed for PRD reviews

### Adding a New Milestone State

1. Add to `MilestoneState` enum in `types.ts`
2. Add state handler in `milestone-state-machine.ts`
3. Add prompt template in `prompts/states/*.ts`
4. Update `filterMilestoneContext()` if needed

---

**For user documentation**, see [USER_GUIDE.md](USER_GUIDE.md).

**For protocol specification**, see [vibe-model.md](vibe-model.md).
