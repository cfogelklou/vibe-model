/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Journey file operations and state management.
 * Handles journey creation, state transitions, and metadata tracking.
 */

import { promises as fs } from "fs";
import path from "path";
import { VModelState, Journey, isValidState } from "./types";
import { config } from "./config";
import { appendToFile, sedInplace, insertAfterLine, findLineNumber, stripAnsi } from "./file-utils";
import { logWarning } from "./logger";
import { readJourneyFile, getJourneyField } from "./journey-reader";

/**
 * Get journey file path from journey name
 */
export function getJourneyPath(name: string): string {
  const journeyDir = path.join(config.projectDir, "vibe-model", "journey");
  return path.join(journeyDir, `${name}.journey.md`);
}

/**
 * Get journey directory path
 */
export function getJourneyDir(): string {
  return path.join(config.projectDir, "vibe-model", "journey");
}

/**
 * Generate a safe journey name from goal
 * Converts to lowercase, replaces spaces with hyphens, removes special chars
 */
export function sanitizeJourneyName(goal: string): string {
  return goal
    .toLowerCase()
    .replace(/\s+/g, "-")  // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, "-")  // Replace special chars with hyphens
    .replace(/-+/g, "-")  // Collapse multiple consecutive hyphens
    .replace(/^-+|-+$/g, "")  // Trim leading/trailing hyphens
    .substring(0, 50);
}

/**
 * Create a new journey file with template
 */
export async function createJourneyFile(goal: string): Promise<string> {
  const name = sanitizeJourneyName(goal);
  const journeyPath = getJourneyPath(name);

  // Ensure journey directory exists
  await fs.mkdir(getJourneyDir(), { recursive: true });

  // Check if journey already exists
  try {
    await fs.access(journeyPath);
    // File exists - throw error
    throw new Error(`Journey already exists: ${name}`);
  } catch (error) {
    // Only ignore ENOENT (file not found) error
    // eslint-disable-next-line no-undef
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error; // Re-throw if it's not a "file not found" error
    }
    // File doesn't exist, continue
  }

  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

  const journeyTemplate = `# Journey: ${goal}

## Meta

- Goal: ${goal}
- State: REQUIREMENTS
- Previous Phase: TBD
- Previous State: TBD
- Current Epic: TBD
- Started: ${timestamp}
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

## Design Spec

*(Design spec will be created during REQUIREMENTS phase)*

## Generated Artifacts

*(No artifacts yet)*

## Learnings Log

*(Learnings will be added as the journey progresses)*

## Dead Ends

*(Dead ends and failed approaches will be documented here)*

## Anti-Patterns

*(Anti-patterns to avoid will be documented here)*

## Pending Questions

*(No pending questions)*

## Checkpoints

| ID | Tag                | Date       | Description |
| -- | ------------------ | ---------- | ----------- |
`;

  await fs.writeFile(journeyPath, journeyTemplate);
  return journeyPath;
}

/**
 * Parse journey state from journey file
 * Handles missing or corrupted state fields gracefully
 */
export async function getJourneyState(journeyFile: string): Promise<VModelState> {
  try {
    const content = await readJourneyFile(journeyFile);
    const match = content.match(/^- State:\s*(\w+)$/m);

    if (match) {
      const state = match[1].toUpperCase();
      if (isValidState(state)) {
        return state as VModelState;
      }
      logWarning(`Unrecognized state: ${state}, defaulting to REQUIREMENTS`);
    }

    // If state field missing: default to REQUIREMENTS with warning
    logWarning("State field missing from journey file, assuming REQUIREMENTS");
    return VModelState.REQUIREMENTS;
  } catch (error) {
    throw new Error(`Failed to read journey state: ${error}`);
  }
}

/**
 * Update journey state
 */
export async function setJourneyState(
  journeyFile: string,
  state: VModelState | string
): Promise<void> {
  await sedInplace(journeyFile, /^- State: .*$/m, `- State: ${state}`);
}

/**
 * Parse journey goal from journey file
 */
export async function getJourneyGoal(journeyFile: string): Promise<string> {
  const goal = await getJourneyField(journeyFile, "Goal");
  return goal || "";
}

/**
 * Parse journey progress from journey file
 */
export async function getJourneyProgress(journeyFile: string): Promise<number> {
  const progressStr = await getJourneyField(journeyFile, "Progress");
  const match = progressStr.match(/^(\d+)%$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Update journey progress
 */
export async function setJourneyProgress(
  journeyFile: string,
  progress: number
): Promise<void> {
  await sedInplace(journeyFile, /^- Progress: .*%$/m, `- Progress: ${progress}%`);
}

/**
 * Get current approach from journey file
 */
export async function getCurrentApproach(journeyFile: string): Promise<string> {
  const approach = await getJourneyField(journeyFile, "Current Approach");
  return approach || "TBD";
}

/**
 * Update current approach
 */
export async function setCurrentApproach(
  journeyFile: string,
  approach: string
): Promise<void> {
  await sedInplace(journeyFile, /^- Current Approach: .*$/m, `- Current Approach: ${approach}`);
}

/**
 * Get current epic from journey file
 */
export async function getCurrentEpic(journeyFile: string): Promise<string> {
  const epic = await getJourneyField(journeyFile, "Current Epic");
  return epic || "TBD";
}

/**
 * Set current epic
 */
export async function setCurrentEpic(
  journeyFile: string,
  epic: string
): Promise<void> {
  await sedInplace(journeyFile, /^- Current Epic: .*$/m, `- Current Epic: ${epic}`);
}

/**
 * Get previous phase from journey file
 */
export async function getPreviousPhase(journeyFile: string): Promise<string> {
  const phase = await getJourneyField(journeyFile, "Previous Phase");
  return phase || "TBD";
}

/**
 * Set previous phase
 */
export async function setPreviousPhase(
  journeyFile: string,
  phase: string
): Promise<void> {
  await sedInplace(journeyFile, /^- Previous Phase: .*$/m, `- Previous Phase: ${phase}`);
}

/**
 * Get previous state from journey file
 */
export async function getPreviousState(journeyFile: string): Promise<string> {
  const state = await getJourneyField(journeyFile, "Previous State");
  return state || "BLOCKED";
}

/**
 * Set previous state
 */
export async function setPreviousState(
  journeyFile: string,
  state: string
): Promise<void> {
  const content = await readJourneyFile(journeyFile);

  if (content.match(/^- Previous State:/m)) {
    await sedInplace(journeyFile, /^- Previous State: .*$/m, `- Previous State: ${state}`);
  } else {
    // Add after Previous Phase line if marker missing
    // Match any line starting with "- Previous Phase:" (with or without a value)
    const lineNum = await findLineNumber(journeyFile, /^- Previous Phase:/m);
    if (lineNum > 0) {
      await insertAfterLine(journeyFile, lineNum, `- Previous State: ${state}`);
    }
  }
}

/**
 * Find active journey (first non-complete journey)
 */
export async function findActiveJourney(): Promise<string | null> {
  const journeyDir = getJourneyDir();

  try {
    const files = await fs.readdir(journeyDir);
    const journeys = files
      .filter((f) => f.endsWith(".journey.md"))
      .map((f) => path.join(journeyDir, f));

    // Sort by modification time (most recent first)
    const journeysWithStats = await Promise.all(
      journeys.map(async (j) => ({
        path: j,
        mtime: (await fs.stat(j)).mtime.getTime(),
      }))
    );

    journeysWithStats.sort((a, b) => b.mtime - a.mtime);

    for (const journey of journeysWithStats) {
      const state = await getJourneyState(journey.path);
      if (state !== VModelState.COMPLETE) {
        return journey.path;
      }
    }
  } catch {
    // Journey directory doesn't exist or is empty
  }

  return null;
}

/**
 * List all journeys with metadata
 */
export async function listJourneys(): Promise<Journey[]> {
  const journeyDir = getJourneyDir();
  const journeys: Journey[] = [];

  try {
    const files = await fs.readdir(journeyDir);
    const journeyFiles = files.filter((f) => f.endsWith(".journey.md"));

    for (const file of journeyFiles) {
      const journeyPath = path.join(journeyDir, file);
      const goal = await getJourneyGoal(journeyPath);
      const state = await getJourneyState(journeyPath);
      const progress = await getJourneyProgress(journeyPath);
      const currentEpic = await getCurrentEpic(journeyPath);
      const previousPhase = await getPreviousPhase(journeyPath);
      const previousState = await getPreviousState(journeyPath);
      const currentApproach = await getCurrentApproach(journeyPath);

      // Extract started date from file content
      const started = await getJourneyField(journeyPath, "Started");

      journeys.push({
        goal,
        state,
        progress,
        currentEpic,
        previousPhase,
        previousState,
        started,
        currentApproach,
      });
    }
  } catch {
    // Journey directory doesn't exist
  }

  return journeys;
}

/**
 * Add learning to journey file
 */
export async function addLearning(journeyFile: string, learning: string): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const cleanLearning = stripAnsi(learning);
  await appendToFile(journeyFile, `\n- ${timestamp}: ${cleanLearning}`);
}

/**
 * Add dead end to journey file
 */
export async function addDeadEnd(
  journeyFile: string,
  approach: string,
  reason: string,
  learnings: string
): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const section = `
### Dead End: ${approach} (${timestamp})
- Reason: ${stripAnsi(reason)}
- Learnings: ${stripAnsi(learnings)}
`;
  await appendToFile(journeyFile, section);
}

/**
 * Add anti-pattern to journey file
 */
export async function addAntiPattern(
  journeyFile: string,
  pattern: string,
  description: string
): Promise<void> {
  const cleanPattern = stripAnsi(pattern);
  const cleanDescription = stripAnsi(description);
  await appendToFile(journeyFile, `\n- **${cleanPattern}**: ${cleanDescription}`);
}

/**
 * Add user hint to journey file
 */
export async function addUserHint(journeyFile: string, hint: string): Promise<void> {
  const cleanHint = stripAnsi(hint);
  await appendToFile(journeyFile, `\n- ${new Date().toISOString().split("T")[0]}: ${cleanHint}`);
}

/**
 * Add pending question to journey file
 */
export async function addPendingQuestion(journeyFile: string, question: string): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const cleanQuestion = stripAnsi(question);
  const content = await readJourneyFile(journeyFile);

  // Check if there are any unchecked questions
  const hasUncheckedQuestions = /- \[ \] .+/.test(content);

  if (!hasUncheckedQuestions) {
    // Replace the placeholder
    await sedInplace(
      journeyFile,
      /^\*\(No pending questions\)\*$/m,
      `- [ ] ${timestamp}: ${cleanQuestion}`
    );
  } else {
    // Find the Pending Questions section and add the question
    const lineNum = await findLineNumber(journeyFile, /^\*\(?No pending questions\)?\*$/m);
    if (lineNum > 0) {
      await sedInplace(
        journeyFile,
        /^\*\(No pending questions\)\*$/m,
        `- [ ] ${timestamp}: ${cleanQuestion}`
      );
    } else {
      // Find the last unchecked question and insert after it
      const lastQuestionLineNum = await findLineNumber(journeyFile, /^- \[ \] .+$/m);
      if (lastQuestionLineNum > 0) {
        const nextLineContent = (await readJourneyFile(journeyFile)).split("\n")[lastQuestionLineNum];
        if (nextLineContent?.includes("*(No pending questions)*")) {
          await sedInplace(
            journeyFile,
            /^\*\(No pending questions\)\*$/m,
            `- [ ] ${timestamp}: ${cleanQuestion}`
          );
        } else {
          await insertAfterLine(journeyFile, lastQuestionLineNum, `- [ ] ${timestamp}: ${cleanQuestion}`);
        }
      }
    }
  }
}

/**
 * Add checkpoint to journey file
 */
export async function addCheckpoint(
  journeyFile: string,
  tag: string,
  description: string
): Promise<void> {
  const content = await readJourneyFile(journeyFile);
  const checkpointMatch = content.match(/^## Checkpoints$/m);

  if (!checkpointMatch) {
    throw new Error("Checkpoints section not found in journey file");
  }

  // Count existing checkpoints
  const checkpointSection = content.substring(checkpointMatch.index ?? 0);
  const existingCheckpoints = checkpointSection.match(/^\| \d+ \|/gm) || [];
  const id = existingCheckpoints.length;

  const timestamp = new Date().toISOString().split("T")[0];
  const lineNum = await findLineNumber(journeyFile, /^## Checkpoints$/m);

  if (lineNum > 0) {
    await insertAfterLine(
      journeyFile,
      lineNum + 2,
      `| ${id} | ${tag} | ${timestamp} | ${description} |`
    );
  }
}

/**
 * Migrate memory.md content to journey file
 */
export async function migrateMemoryToJourney(
  memoryPath: string,
  journeyPath: string
): Promise<void> {
  try {
    if (!(await fs.stat(memoryPath)).isFile()) {
      return; // Memory file doesn't exist
    }

    const memoryContent = await fs.readFile(memoryPath, "utf-8");
    const journeyContent = await readJourneyFile(journeyPath);

    // Extract learnings from both files
    const journeyLearnings = extractLearnings(journeyContent);
    const memoryLearnings = parseMemoryLearnings(memoryContent);

    // Merge without duplicates
    const mergedLearnings = mergeLearningsChronological(journeyLearnings, memoryLearnings);

    // Update journey file with merged learnings
    await updateLearningsSection(journeyPath, mergedLearnings);

    // Rename memory.md to memory.md.bak
    await fs.rename(memoryPath, `${memoryPath}.bak`);
  } catch {
    // Memory file doesn't exist or migration failed
  }
}

/**
 * Extract learnings from journey file
 */
function extractLearnings(content: string): string[] {
  const learnings: string[] = [];
  const learningsSection = content.match(/## Learnings Log\n([\s\S]+?)\n## /);

  if (learningsSection) {
    const lines = learningsSection[1].split("\n");
    for (const line of lines) {
      if (line.match(/^- \d{4}-\d{2}-\d{2}: /)) {
        learnings.push(line);
      }
    }
  }

  return learnings;
}

/**
 * Parse learnings from memory.md
 */
function parseMemoryLearnings(content: string): string[] {
  const learnings: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    if (line.match(/^- \d{4}-\d{2}-\d{2}: /)) {
      learnings.push(line);
    }
  }

  return learnings;
}

/**
 * Merge learnings chronologically without duplicates
 */
function mergeLearningsChronological(journey: string[], memory: string[]): string[] {
  const all = [...journey, ...memory];
  const unique = Array.from(new Set(all));
  return unique.sort((a, b) => {
    const dateA = a.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    const dateB = b.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    return dateA.localeCompare(dateB);
  });
}

/**
 * Update learnings section in journey file
 */
async function updateLearningsSection(journeyPath: string, learnings: string[]): Promise<void> {
  const content = await readJourneyFile(journeyPath);
  const learningsSection = content.match(/## Learnings Log\n([\s\S]+?)\n## /);

  if (!learningsSection) {
    return;
  }

  const beforeLearnings = content.substring(0, learningsSection.index!);
  const afterLearnings = content.substring(learningsSection.index! + learningsSection[0].length);

  const newLearningsContent = "## Learnings Log\n\n" + learnings.join("\n") + "\n\n## ";

  const newContent = beforeLearnings + newLearningsContent + afterLearnings;
  await fs.writeFile(journeyPath, newContent);
}
