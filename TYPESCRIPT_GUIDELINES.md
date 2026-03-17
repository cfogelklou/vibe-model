# TypeScript Guidelines

**Coding standards and best practices for the vibe-model autonomous R&D agent.**

---

## 1. Core Principles

### 1.1 Project-Agnostic Design

**Principle:** All code in the vibe-model submodule must remain **project-agnostic** and portable.

The vibe-model CLI is designed to run from **within any target project directory**. It must not make assumptions about:
- The parent project's structure
- The parent project's dependencies
- The parent project's build system
- Specific file paths outside the `vibe-model/` directory it creates

```typescript
// ✅ GOOD: Project-agnostic
export function createVibeModelDirectory(projectDir: string): string {
  return path.join(projectDir, "vibe-model");
}

// ❌ BAD: Assumes parent project structure
export function createVibeModelDirectory(): string {
  return path.join(process.cwd(), "src/components"); // Wrong!
}
```

---

## 2. TypeScript-Specific Patterns

### 2.1 Record Types for State Mappings

Use `Record` type for defining state transitions and mappings:

```typescript
// ✅ GOOD: Record type for state transitions
export function getNextState(current: VModelState): VModelState {
  const stateTransitions: Record<VModelState, VModelState> = {
    [VModelState.REQUIREMENTS]: VModelState.DESIGN_REVIEW,
    [VModelState.SYSTEM_DESIGN]: VModelState.DESIGN_REVIEW,
    [VModelState.ARCH_DESIGN]: VModelState.MODULE_DESIGN,
    // ...
  };
  return stateTransitions[current] || VModelState.REQUIREMENTS;
}
```

### 2.2 Template String Types

Use template literal types for file naming conventions:

```typescript
// ✅ GOOD: Template string type for journey files
export type JourneyFileName = `${string}.journey.md`;
export type EpicFileName = `.journey.E${number}.md`;

export function isJourneyFile(fileName: string): fileName is JourneyFileName {
  return fileName.endsWith(".journey.md");
}
```

### 2.3 Utility Types

Leverage TypeScript's built-in utility types:

```typescript
// ✅ GOOD: Partial for updates
export function updateJourney(
  journey: Journey,
  updates: Partial<Journey>
): Journey {
  return { ...journey, ...updates };
}

// ✅ GOOD: Pick for selecting fields
export type JourneyMeta = Pick<Journey, "goal" | "state" | "progress">;

// ✅ GOOD: Omit for excluding fields
export type CreateJourney = Omit<Journey, "started" | "currentApproach">;

// ✅ GOOD: Readonly for immutable data
export function freezeConfig(config: Config): Readonly<Config> {
  return Object.freeze({ ...config });
}
```

### 2.4 Readonly and Immutability

Prefer readonly arrays and immutable data structures:

```typescript
// ✅ GOOD: Readonly array for constants
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

// ✅ GOOD: Readonly interface
export interface ReadonlyJourney {
  readonly goal: string;
  readonly state: VModelState;
  readonly progress: number;
}

// ❌ BAD: Mutable array
export const V_MODEL_PHASES = [ /* ... */ ];
V_MODEL_PHASES.push("NEW_STATE"); // Shouldn't be allowed
```

### 2.5 Function Overloads

Use overloads for functions with multiple signatures:

```typescript
// ✅ GOOD: Function overloads
export function parseState(input: VModelState): VModelState;
export function parseState(input: string): VModelState | null;
export function parseState(input: string): VModelState | null {
  if (isValidState(input)) {
    return input as VModelState;
  }
  return null;
}
```

### 2.6 Generic Type Constraints

Use generics with constraints for reusable utilities:

```typescript
// ✅ GOOD: Generic with constraint
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

### 2.7 Const Assertions

Use `as const` for literal types:

```typescript
// ✅ GOOD: Const assertion
export const DEFAULT_CONFIG = {
  aiProvider: "claude" as const,
  maxIterations: 100,
  consultGemini: true,
} as const;

// Type is: { aiProvider: "claude"; maxIterations: number; consultGemini: true }

// ❌ BAD: Wider types
export const DEFAULT_CONFIG = {
  aiProvider: "claude", // Type is string
  maxIterations: 100,
};
```

### 2.8 Null vs Undefined

Be explicit about `null` vs `undefined`:

```typescript
// ✅ GOOD: Explicit nullable types
export function findJourney(name: string): Journey | undefined {
  // May return undefined if not found
}

export function getJourneyOrThrow(name: string): Journey {
  const journey = findJourney(name);
  if (!journey) {
    throw new VModelError(`Journey not found: ${name}`);
  }
  return journey;
}

// ❌ BAD: Ambiguous null/undefined
export function findJourney(name: string): Journey | null {
  // Mixing null and undefined causes confusion
}
```

---

## 3. Type Safety

### 2.1 Strict Mode Compliance

This project uses `strict: true` in `tsconfig.json`. Always:

- Use proper type annotations for function parameters and return values
- Avoid `any` - use `unknown` with type guards if truly necessary
- Handle all union type cases properly

```typescript
// ✅ GOOD: Explicit types
export function getNextState(current: VModelState): VModelState {
  const transitions: Record<VModelState, VModelState> = {
    [VModelState.REQUIREMENTS]: VModelState.DESIGN_REVIEW,
    // ...
  };
  return transitions[current] || VModelState.REQUIREMENTS;
}

// ❌ BAD: Implicit any
export function getNextState(current) {
  // What is current? What does it return?
}
```

### 2.2 Use Enums for Fixed Sets

When values represent a fixed set of states or options, use `enum`:

```typescript
// ✅ GOOD: Enum for V-Model states
export enum VModelState {
  REQUIREMENTS = "REQUIREMENTS",
  SYSTEM_DESIGN = "SYSTEM_DESIGN",
  ARCH_DESIGN = "ARCH_DESIGN",
  // ...
}

// ❌ BAD: Magic strings
if (state === "REQUIREMENTS") { ... }
```

### 2.3 Discriminated Unions for State-Specific Data

When different states have different associated data, use discriminated unions:

```typescript
// ✅ GOOD: Discriminated union
export type StreamEvent =
  | { type: "content_block_start"; content_block: { type: string; name: string } }
  | { type: "text_delta"; delta: { type: string; text: string } }
  | { type: "result"; total_cost_usd?: number; num_turns?: number };

function handleEvent(event: StreamEvent) {
  switch (event.type) {
    case "content_block_start":
      // TypeScript knows event.content_block exists here
      return event.content_block.name;
    // ...
  }
}
```

---

## 3. No Magic Strings or Numbers

**Principle:** Do not scatter string literals or magic numbers throughout the codebase.

### 3.1 Bad Practice

```typescript
// ❌ BAD: Magic strings for state
if (journey.state === "COMPLETE") { ... }

// ❌ BAD: Magic number
if (iteration > 100) { ... }

// ❌ BAD: Repeated literal
const fileName = ".journey." + epicId + ".md";
```

### 3.2 Good Practice

```typescript
// ✅ GOOD: Use enum
import { VModelState } from "./types";
if (journey.state === VModelState.COMPLETE) { ... }

// ✅ GOOD: Named constant
const DEFAULT_MAX_ITERATIONS = 100;
if (iteration > DEFAULT_MAX_ITERATIONS) { ... }

// ✅ GOOD: Helper function
export function getEpicFileName(journeyName: string, epicId: number): string {
  return `.journey.E${epicId}.md`;
}
```

---

## 4. Error Handling

### 4.1 Custom Error Types

Create domain-specific error classes:

```typescript
// ✅ GOOD: Custom error with additional properties
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

// Usage
throw new VModelError("Journey file not found", 1, true);
```

### 4.2 Try-Catch with Proper Type Narrowing

```typescript
// ✅ GOOD: Type guard for error handling
function isVModelError(error: unknown): error is VModelError {
  return error instanceof VModelError;
}

try {
  await processJourney(journeyFile);
} catch (error) {
  if (isVModelError(error)) {
    if (error.recoverable) {
      logWarning(`Recoverable error: ${error.message}`);
    } else {
      process.exit(error.exitCode);
    }
  } else if (error instanceof Error) {
    logError(`Unexpected error: ${error.message}`);
  }
}
```

---

## 5. File I/O Operations

### 5.1 Use Promises, Not Callbacks

```typescript
// ✅ GOOD: Async/await with promises
import { promises as fs } from "fs";

export async function readJourneyFile(path: string): Promise<string> {
  try {
    return await fs.readFile(path, "utf-8");
  } catch (error) {
    throw new VModelError(`Failed to read journey file: ${path}`, 1, true);
  }
}

// ❌ BAD: Callbacks
fs.readFile(path, "utf-8", (err, data) => { ... });
```

### 5.2 Path Manipulation

Always use the `path` module for cross-platform compatibility:

```typescript
// ✅ GOOD: Cross-platform
import path from "path";

const journeyFile = path.join(projectDir, "vibe-model", "journey", `${name}.journey.md`);
const epicDir = path.dirname(journeyFile);

// ❌ BAD: Platform-specific
const journeyFile = `${projectDir}/vibe-model/journey/${name}.journey.md`;
```

---

## 6. Type Guards and Validation

### 6.1 Runtime Type Guards

When dealing with external data (files, CLI output, API responses), use type guards:

```typescript
// ✅ GOOD: Runtime validation
export function isValidState(state: string): state is VModelState {
  return Object.values(VModelState).includes(state as VModelState);
}

// Usage
const state = parseStateFromJourney(content);
if (!isValidState(state)) {
  throw new VModelError(`Invalid state: ${state}`);
}
// TypeScript now knows `state` is VModelState
```

### 6.2 Zod or Similar for Complex Validation

For complex data structures, consider using a validation library:

```typescript
// Example for future use
import { z } from "zod";

const JourneySchema = z.object({
  goal: z.string(),
  state: z.nativeEnum(VModelState),
  progress: z.number().min(0).max(100),
});

export function parseJourney(data: unknown): Journey {
  return JourneySchema.parse(data);
}
```

---

## 7. Function Design

### 7.1 Single Responsibility

Each function should do one thing well:

```typescript
// ✅ GOOD: Single responsibility
export function getNextState(current: VModelState): VModelState {
  // Only determines next state
}

export async function transitionToState(
  journeyFile: string,
  newState: VModelState
): Promise<void> {
  // Only handles the transition side effects
}

// ❌ BAD: Mixed concerns
export async function transitionToNext(journeyFile: string): Promise<void> {
  // Determines state, updates file, commits to git, logs, etc.
}
```

### 7.2 Pure Functions Where Possible

Prefer pure functions that don't have side effects:

```typescript
// ✅ GOOD: Pure function
export function getEpicFileName(journeyName: string, epicId: number): string {
  return `.journey.E${epicId}.md`;
}

// ❌ BAD: Side effect in what should be pure
export function getEpicFileName(journeyName: string, epicId: number): string {
  fs.writeFileSync(...); // Side effect!
  return `.journey.E${epicId}.md`;
}
```

### 7.3 Named vs Anonymous Functions

Use named functions for better stack traces:

```typescript
// ✅ GOOD: Named function
export async function processJourneyIteration(
  journeyFile: string,
  config: Config
): Promise<void> {
  // ...
}

// ❌ BAD: Anonymous
export const processJourneyIteration = async (
  journeyFile: string,
  config: Config
): Promise<void> => {
  // ...
};
```

---

## 8. Import Organization

### 8.1 Import Order

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

### 8.2 Type-Only Imports

Use type-only imports when only types are needed:

```typescript
// ✅ GOOD: Type-only import
import type { Config, Journey } from "./types";
import { VModelState } from "./types";

// ✅ GOOD: Inline type import
import { getNextState } from "./state-machine";
import type { VModelError } from "./types";
```

---

## 9. Testing Guidelines

### 9.1 Test File Organization

```typescript
// Test file: src/__tests__/unit/journey.test.ts
import { describe, it, expect } from "bun:test";
import { parseJourneyMetadata } from "../../journey";

describe("parseJourneyMetadata", () => {
  it("should parse valid journey metadata", () => {
    const content = `
    # Test Journey
    - Goal: Test goal
    - State: REQUIREMENTS
    `;
    const result = parseJourneyMetadata(content);
    expect(result.goal).toBe("Test goal");
  });
});
```

### 9.2 Arrange-Act-Assert Pattern

```typescript
// ✅ GOOD: Clear test structure
it("should transition to next state", () => {
  // Arrange
  const currentState = VModelState.REQUIREMENTS;

  // Act
  const nextState = getNextState(currentState);

  // Assert
  expect(nextState).toBe(VModelState.DESIGN_REVIEW);
});
```

---

## 10. Documentation

### 10.1 JSDoc Comments

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

### 10.2 File Headers

Each source file should include the project header:

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

---

## 11. Cross-Platform Compatibility

### 11.1 No Platform-Specific Code

The vibe-model CLI must work on macOS, Linux, and Windows:

```typescript
// ✅ GOOD: Cross-platform
import path from "path";

const filePath = path.join("vibe-model", "journey", "test.journey.md");

// ❌ BAD: Unix-specific
const filePath = "vibe-model/journey/test.journey.md";
```

### 11.2 Use Bun APIs Carefully

When using Bun-specific APIs, ensure they're available on all platforms:

```typescript
// ✅ GOOD: Check for availability
if (typeof Bun !== "undefined") {
  // Bun-specific code
}

// ✅ GOOD: Use standard APIs when possible
import { text } from "node:stream/consumers"; // Works everywhere
```

---

## 12. Performance Considerations

### 12.1 Avoid Synchronous File Operations

```typescript
// ✅ GOOD: Async
const content = await fs.readFile(path, "utf-8");

// ❌ BAD: Blocks event loop
const content = fs.readFileSync(path, "utf-8");
```

### 12.2 Stream Large Files

For large files, use streaming:

```typescript
// ✅ GOOD: Stream for large files
import { createReadStream } from "fs";

const stream = createReadStream(largeFilePath);
```

---

## Pre-Commit Checklist

Before committing any TypeScript code:

1. ✅ `bun run typecheck` - No type errors
2. ✅ `bun run lint` - No ESLint warnings (or justify exceptions)
3. ✅ `bun run build` - Builds successfully
4. ✅ `bun test` - All tests pass
5. ✅ No `any` types (unless absolutely necessary)
6. ✅ No magic strings/numbers for business logic
7. ✅ All exported functions have JSDoc comments
8. ✅ Cross-platform compatibility verified

---

## Resources

- **[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)**
- **[Bun Documentation](https://bun.sh/docs)**
- **[tsconfig.json Reference](https://www.typescriptlang.org/tsconfig)**
