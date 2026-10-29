# TypeScript & Code Quality Guidelines

Coding standards for the **vibe-model** autonomous R&D agent.

---

## 1. The "No Magic Strings/Numbers" Rule

**Principle:** Do not scatter string literals or magic numbers throughout the codebase.

```typescript
// BAD: Magic strings for state
if (journey.state === "COMPLETE") { ... }

// BAD: Magic number
if (iteration > 100) { ... }

// BAD: Repeated literal
const fileName = ".journey." + epicId + ".md";
```

```typescript
// GOOD: Use enum
import { VModelState } from "./types";
if (journey.state === VModelState.COMPLETE) { ... }

// GOOD: Named constant
const DEFAULT_MAX_ITERATIONS = 100;
if (iteration > DEFAULT_MAX_ITERATIONS) { ... }

// GOOD: Helper function
export function getEpicFileName(journeyName: string, epicId: number): string {
  return `.journey.E${epicId}.md`;
}
```

**Exception:** User-facing strings (log messages, CLI output) may use inline literals.

### 1a. No Magic Numbers in Tests

Test files MUST use the same constants defined in source code. When a constant changes, tests using hardcoded values will NOT update automatically.

```typescript
// BAD: Hardcoded value in test - breaks when constant changes
it("should use default max iterations", () => {
  expect(config.maxIterations).toBe(100); // Wrong if DEFAULT_MAX_ITERATIONS changes
});

// GOOD: Import and use the constant
import { DEFAULT_MAX_ITERATIONS } from "../../config";

it("should use default max iterations", () => {
  expect(config.maxIterations).toBe(DEFAULT_MAX_ITERATIONS);
});
```

---

## 2. Enums and Constants (The "C++ Enum" Model)

Define standard values **in one place** (`src/types.ts`) and refer to them everywhere.

### Locations for Definitions

| Category | File | Example |
|----------|------|---------|
| States & lifecycle | `src/types.ts` | `VModelState`, `ExecutionMode` |
| Configuration | `src/config.ts` | `defaultConfig`, `DEFAULT_MAX_ITERATIONS` |
| Error types | `src/types.ts` | `VModelError` |
| Journey file ops | `src/journey.ts` | `sanitizeJourneyName()`, section headers |
| Prompt templates | `src/prompts/types.ts` | `TemplateVariable` |

### Defining Enums

```typescript
// src/types.ts - Single source of truth
export enum VModelState {
  REQUIREMENTS = "REQUIREMENTS",
  SYSTEM_DESIGN = "SYSTEM_DESIGN",
  ARCH_DESIGN = "ARCH_DESIGN",
  IMPLEMENTATION = "IMPLEMENTATION",
  // ...
}
```

### Derived Types from Enums

```typescript
// Use Record for state mappings
const stateTransitions: Record<VModelState, VModelState> = {
  [VModelState.REQUIREMENTS]: VModelState.REQUIREMENTS_REVIEW,
  [VModelState.SYSTEM_DESIGN]: VModelState.SYSTEM_DESIGN_REVIEW,
  // ...
};

// Type guard for validation
export function isValidState(state: string): state is VModelState {
  return Object.values(VModelState).includes(state as VModelState);
}
```

---

## 3. Import Patterns

### Import Order

```typescript
// 1. Node.js built-ins
import { promises as fs } from "fs";
import path from "path";

// 2. External dependencies
import { Command } from "commander";

// 3. Internal modules (alphabetical)
import { VModelState, VModelError } from "./types";
import { logInfo, logSuccess } from "./logger";
```

### Type-Only Imports

```typescript
// GOOD: Type-only import
import type { Config, Journey } from "./types";
import { VModelState } from "./types";

// GOOD: Inline type import
import { getNextState } from "./state-machine";
import type { VModelError } from "./types";
```

### No Inline Imports

```typescript
// BAD: Inline import in type definition
function process(event: import("./types").StreamEvent) { ... }

// GOOD: Top-level import
import type { StreamEvent } from "./types";
function process(event: StreamEvent) { ... }
```

---

## 4. Type Safety

### Strict Mode Compliance

This project uses `strict: true` in `tsconfig.json`. Always:
- Use proper type annotations for function parameters and return values
- Avoid `any` - use `unknown` with type guards if truly necessary
- Handle all union type cases properly

```typescript
// BAD: Implicit any
export function getNextState(current) {
  // What is current? What does it return?
}

// GOOD: Explicit types
export function getNextState(current: VModelState): VModelState {
  const transitions: Record<VModelState, VModelState> = {
    [VModelState.REQUIREMENTS]: VModelState.REQUIREMENTS_REVIEW,
    // ...
  };
  return transitions[current] || VModelState.REQUIREMENTS;
}
```

### No `any`

Avoid `any`. Use `unknown` with type guards.

```typescript
// BAD
function handleOutput(data: any) { ... }

// GOOD
function handleOutput(data: unknown) {
  if (typeof data === "string") { ... }
}
```

### Strict Null Checks

Handle `null` and `undefined` explicitly. Prefer `undefined` over `null` for "not found" semantics.

```typescript
// GOOD: Explicit nullable return
export function findJourney(name: string): Journey | undefined {
  // Returns undefined if not found
}

// GOOD: Throw pattern
export function getJourneyOrThrow(name: string): Journey {
  const journey = findJourney(name);
  if (!journey) {
    throw new VModelError(`Journey not found: ${name}`);
  }
  return journey;
}
```

### Discriminated Unions

Use discriminated unions for state-specific data:

```typescript
export type StreamEvent =
  | { type: "content_block_start"; content_block: { type: string; name: string } }
  | { type: "text_delta"; delta: { type: string; text: string } }
  | { type: "result"; total_cost_usd?: number; num_turns?: number };

function handleEvent(event: StreamEvent) {
  switch (event.type) {
    case "content_block_start":
      return event.content_block.name; // TS knows content_block exists
    case "text_delta":
      return event.delta.text;
    case "result":
      return event.total_cost_usd ?? 0;
  }
}
```

### Utility Types

Leverage TypeScript's built-in utility types:

```typescript
// GOOD: Partial for updates
export function updateJourney(
  journey: Journey,
  updates: Partial<Journey>
): Journey {
  return { ...journey, ...updates };
}

// GOOD: Pick for selecting fields
export type JourneyMeta = Pick<Journey, "goal" | "state" | "progress">;

// GOOD: Omit for excluding fields
export type CreateJourney = Omit<Journey, "started" | "currentApproach">;

// GOOD: Readonly for immutable data
export function freezeConfig(config: Config): Readonly<Config> {
  return Object.freeze({ ...config });
}
```

### Readonly and Immutability

Prefer readonly arrays and immutable data structures:

```typescript
// GOOD: Readonly array for constants
export const V_MODEL_PHASES: readonly VModelState[] = [
  VModelState.REQUIREMENTS,
  VModelState.SYSTEM_DESIGN,
  VModelState.ARCH_DESIGN,
  VModelState.MODULE_DESIGN,
  VModelState.IMPLEMENTATION,
  VModelState.UNIT_TEST,
  VModelState.INTEGRATION_TEST,
  VModelState.SYSTEM_TEST,
  VModelState.ACCEPTANCE_TEST,
] as const;

// GOOD: Readonly interface
export interface ReadonlyJourney {
  readonly goal: string;
  readonly state: VModelState;
  readonly progress: number;
}

// BAD: Mutable array
export const V_MODEL_PHASES = [ /* ... */ ];
V_MODEL_PHASES.push("NEW_STATE"); // Shouldn't be allowed
```

### Function Overloads

Use overloads for functions with multiple signatures:

```typescript
// GOOD: Function overloads
export function parseState(input: VModelState): VModelState;
export function parseState(input: string): VModelState | null;
export function parseState(input: string): VModelState | null {
  if (isValidState(input)) {
    return input as VModelState;
  }
  return null;
}
```

### Generic Type Constraints

Use generics with constraints for reusable utilities:

```typescript
// GOOD: Generic with constraint
export function ensureKey<T extends object>(
  obj: T,
  key: string
): key is keyof T {
  return key in obj;
}

// Usage
const journey = { goal: "...", state: VModelState.REQUIREMENTS };
if (ensureKey(journey, "state")) {
  // TypeScript knows journey.state exists
  console.log(journey.state);
}
```

### Const Assertions

Use `as const` for literal types:

```typescript
// GOOD: Const assertion
export const DEFAULT_CONFIG = {
  aiProvider: "claude" as const,
  maxIterations: 100,
  consultGemini: true,
} as const;

// Type is: { aiProvider: "claude"; maxIterations: number; consultGemini: true }

// BAD: Wider types
export const DEFAULT_CONFIG = {
  aiProvider: "claude", // Type is string
  maxIterations: 100,
};
```

---

## 5. Error Handling

### Custom Error Class

```typescript
export class VModelError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = "VModelError";
  }
}
```

### Type Guard for Errors

```typescript
function isVModelError(error: unknown): error is VModelError {
  return error instanceof VModelError;
}

try {
  await processJourney(journeyFile);
} catch (error: unknown) {
  if (isVModelError(error)) {
    if (error.recoverable) {
      logWarning(`Recoverable: ${error.message}`);
    } else {
      process.exit(error.exitCode);
    }
  } else if (error instanceof Error) {
    logError(`Unexpected: ${error.message}`);
  }
}
```

---

## 6. File I/O Operations

### Always Use Async

```typescript
import { promises as fs } from "fs";

// GOOD: Async/await
export async function readJourneyFile(path: string): Promise<string> {
  return await fs.readFile(path, "utf-8");
}

// BAD: Callbacks
fs.readFile(path, "utf-8", (err, data) => { ... });

// BAD: Sync (blocks event loop)
fs.readFileSync(path, "utf-8");
```

### Cross-Platform Paths

```typescript
import path from "path";

// GOOD: Cross-platform
const journeyFile = path.join(projectDir, "vibe-model", "journey", `${name}.journey.md`);

// BAD: Unix-specific
const journeyFile = `${projectDir}/vibe-model/journey/${name}.journey.md`;
```

---

## 7. Project-Agnostic Design

The vibe-model CLI runs from **within any target project directory**. All code must remain portable.

```typescript
// GOOD: Takes projectDir as parameter
export function createVibeModelDirectory(projectDir: string): string {
  return path.join(projectDir, "vibe-model");
}

// BAD: Assumes parent project structure
export function createVibeModelDirectory(): string {
  return path.join(process.cwd(), "src/components");
}
```

Never assume:
- Parent project's structure
- Parent project's dependencies
- Parent project's build system
- Specific paths outside the `vibe-model/` working directory

---

## 8. Control Flow: Switch vs If/Else

Prefer `switch` for enum-based branching:

```typescript
// GOOD: Switch with default
export function getNextStateForMode(
  current: VModelState,
  mode: ExecutionMode
): VModelState | null {
  switch (mode) {
    case ExecutionMode.GO:
      return getNextStateForGo(current);
    case ExecutionMode.MVP:
      return getNextStateForMvp(current);
    default:
      return getNextStateNormal(current);
  }
}
```

---

## 9. Function Design

### Single Responsibility

Each function should do one thing well:

```typescript
// GOOD: Single responsibility
export function getNextState(current: VModelState): VModelState {
  // Only determines next state
}

export async function transitionToState(
  journeyFile: string,
  newState: VModelState
): Promise<void> {
  // Only handles the transition side effects
}

// BAD: Mixed concerns
export async function transitionToNext(journeyFile: string): Promise<void> {
  // Determines state, updates file, commits to git, logs, etc.
}
```

### Pure Functions Where Possible

Prefer pure functions that don't have side effects:

```typescript
// GOOD: Pure function
export function getEpicFileName(journeyName: string, epicId: number): string {
  return `.journey.E${epicId}.md`;
}

// BAD: Side effect in what should be pure
export function getEpicFileName(journeyName: string, epicId: number): string {
  fs.writeFileSync(...); // Side effect!
  return `.journey.E${epicId}.md`;
}
```

### Named vs Anonymous Functions

Use named functions for better stack traces:

```typescript
// GOOD: Named function
export async function processJourneyIteration(
  journeyFile: string,
  config: Config
): Promise<void> {
  // ...
}

// BAD: Anonymous
export const processJourneyIteration = async (
  journeyFile: string,
  config: Config
): Promise<void> => {
  // ...
};
```

---

## 10. File Headers & Documentation

### File Headers

Each source file includes:

```typescript
/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Brief description of what this file does.
 */
```

### JSDoc Comments

Use JSDoc for exported functions and types:

```typescript
/**
 * Get the next state in the V-Model lifecycle
 * @param current - The current VModelState
 * @returns The next VModelState in the sequence
 * @throws {VModelError} If current state is invalid
 */
export function getNextState(current: VModelState): VModelState {
  // ...
}
```

---

## 11. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Enums | `PascalCase` | `VModelState`, `ExecutionMode` |
| Interfaces | `PascalCase` | `Journey`, `Config`, `Checkpoint` |
| Functions | `camelCase` | `getNextState()`, `parseJourneyMetadata()` |
| Constants | `camelCase` (objects) / `UPPER_CASE` (primitives) | `defaultConfig`, `DEFAULT_MAX_ITERATIONS` |
| Type guards | `is` + `Noun` | `isValidState()`, `isVModelError()` |
| Files | `kebab-case` | `state-machine.ts`, `main-loop.ts` |

---

## 12. Testing

### Framework

Bun's built-in test runner (`bun:test`).

### File Location

`src/__tests__/unit/`

### Pattern: Arrange-Act-Assert

```typescript
import { describe, it, expect } from "bun:test";
import { getNextStateNormal } from "../../state-machine";
import { VModelState } from "../../types";

describe("State Machine - Normal Mode", () => {
  it("should transition from REQUIREMENTS to REQUIREMENTS_REVIEW", () => {
    // Arrange
    const current = VModelState.REQUIREMENTS;

    // Act
    const result = getNextStateNormal(current);

    // Assert
    expect(result).toBe(VModelState.REQUIREMENTS_REVIEW);
  });
});
```

---

## 13. Logging

All logging goes to **stderr** (keeps stdout clean for AI responses).

```typescript
import { logInfo, logSuccess, logWarning, logError, logPhase, logDebug } from "./logger";

logInfo("Processing journey...");
logSuccess("Journey completed!");
logWarning("Recoverable error occurred");
logError("Fatal error");
logPhase("REQUIREMENTS"); // Phase-specific formatting
logDebug("Verbose output"); // Only shown in verbose mode
```

---

## 14. Cross-Platform Compatibility

### No Platform-Specific Code

The vibe-model CLI must work on macOS, Linux, and Windows:

```typescript
// GOOD: Cross-platform
import path from "path";
const filePath = path.join("vibe-model", "journey", "test.journey.md");

// BAD: Unix-specific
const filePath = "vibe-model/journey/test.journey.md";
```

### Use Bun APIs Carefully

When using Bun-specific APIs, ensure they're available on all platforms:

```typescript
// GOOD: Check for availability
if (typeof Bun !== "undefined") {
  // Bun-specific code
}

// GOOD: Use standard APIs when possible
import { text } from "node:stream/consumers"; // Works everywhere
```

---

## 15. Performance Considerations

### Avoid Synchronous File Operations

```typescript
// GOOD: Async
const content = await fs.readFile(path, "utf-8");

// BAD: Blocks event loop
const content = fs.readFileSync(path, "utf-8");
```

### Stream Large Files

For large files, use streaming:

```typescript
// GOOD: Stream for large files
import { createReadStream } from "fs";
const stream = createReadStream(largeFilePath);
```

---

## Pre-Commit Checklist

Before committing any TypeScript code:

1. `bun run typecheck` - No type errors
2. `bun run lint` - No ESLint warnings
3. `bun run build` - Builds successfully
4. `bun test` - All tests pass
5. No `any` types (unless absolutely necessary)
6. No magic strings/numbers for business logic
7. All exported functions have JSDoc comments
8. Cross-platform compatibility verified
