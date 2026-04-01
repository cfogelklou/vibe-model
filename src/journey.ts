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
import {
  VModelState,
  Journey,
  isValidState,
  PROTOTYPING_ITERATION_HEADER,
} from "./types";
import { config } from "./config";
import { appendToFile, sedInplace, insertAfterLine, findLineNumber, stripAnsi } from "./file-utils";
import { logWarning } from "./logger";
import { readJourneyFile, getJourneyField, clearJourneyCache } from "./journey-reader";
import { VIBE_MODEL_MD } from "./bundled-assets";

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
 * Get project-level self-improvement notes path
 */
export function getSelfImprovementNotesPath(): string {
  return path.join(config.projectDir, "self-improvement-notes.md");
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
export async function createJourneyFile(
  goal: string,
  options?: { executionMode?: string; playwrightEnabled?: boolean }
): Promise<string> {
  const name = sanitizeJourneyName(goal);
  const journeyPath = getJourneyPath(name);

  // Ensure journey directory exists
  await fs.mkdir(getJourneyDir(), { recursive: true });

  // Extract bundled vibe-model.md to project's vibe-model directory
  const vibeModelDir = path.join(config.projectDir, "vibe-model");
  await fs.mkdir(vibeModelDir, { recursive: true });
  const vibeModelPath = path.join(vibeModelDir, "vibe-model.md");

  // Always update vibe-model.md if it differs from bundled version
  // This ensures the protocol stays in sync with the tool version
  try {
    const existingContent = await fs.readFile(vibeModelPath, "utf-8");
    if (existingContent !== VIBE_MODEL_MD) {
      logWarning("Updating vibe-model.md to match tool version (content differs)");
      await fs.writeFile(vibeModelPath, VIBE_MODEL_MD, "utf-8");
    }
  } catch {
    // File doesn't exist, write bundled content
    await fs.writeFile(vibeModelPath, VIBE_MODEL_MD, "utf-8");
  }

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
- Previous State: TBD
- Current Epic: TBD
- Started: ${timestamp}
- Current Approach: TBD
- Progress: 0%
- Execution Mode: ${options?.executionMode || "normal"}
- Playwright Enabled: ${options?.playwrightEnabled ? "true" : "false"}

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
    // Accept both "- State:" and "- Current State:" for backwards compatibility
    const stateStr =
      (await getJourneyField(journeyFile, "Current State")) ||
      (await getJourneyField(journeyFile, "State"));

    if (stateStr) {
      const state = stateStr.toUpperCase();
      if (isValidState(state)) {
        return state as VModelState;
      }
      logWarning(`Unrecognized state: ${state}, defaulting to REQUIREMENTS`);
    } else {
      // If state field missing: default to REQUIREMENTS with warning
      logWarning("State field missing from journey file, assuming REQUIREMENTS");
    }

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
  // Handle both "- Current State:" and "- State:" field names
  const content = await readJourneyFile(journeyFile);
  if (/^- Current State: /m.test(content)) {
    await sedInplace(journeyFile, /^- Current State: .*$/m, `- Current State: ${state}`);
  } else {
    await sedInplace(journeyFile, /^- State: .*$/m, `- State: ${state}`);
  }
}

/**
 * Parse journey goal from journey file
 */
export async function getJourneyGoal(journeyFile: string): Promise<string> {
  const goal = await getJourneyField(journeyFile, "Goal");
  return goal || "";
}

/**
 * Read a metadata field from journey file.
 */
export async function getJourneyMetaField(journeyFile: string, field: string): Promise<string> {
  return getJourneyField(journeyFile, field);
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
    // Add after Current Epic line if marker missing
    const lineNum = await findLineNumber(journeyFile, /^- Current Epic:/m);
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
      const previousState = await getPreviousState(journeyPath);
      const currentApproach = await getCurrentApproach(journeyPath);

      // Extract started date from file content
      const started = await getJourneyField(journeyPath, "Started");

      journeys.push({
        goal,
        state,
        progress,
        currentEpic,
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
  const timestamp = new Date().toISOString().split("T")[0];
  const content = await readJourneyFile(journeyFile);

  // Check if there's a placeholder "*(No user hints yet)*"
  const placeholderMatch = content.match(/\*\(No user hints yet\)\*/);
  if (placeholderMatch) {
    // Replace placeholder with the new hint
    await sedInplace(journeyFile, /\*\(No user hints yet\)\*/, `- ${timestamp}: ${cleanHint}`);
    return;
  }

  // Find the User Hints section and add after it
  const userHintsMatch = content.match(/^## User Hints\n/m);
  if (userHintsMatch) {
    // Find the line number of the User Hints header
    const lineNum = await findLineNumber(journeyFile, /^## User Hints$/m);
    if (lineNum > 0) {
      // Insert after the header (and any existing hints)
      // Find the next ## header after User Hints
      const afterHints = content.substring(content.indexOf("## User Hints") + "## User Hints".length);
      const nextSectionMatch = afterHints.match(/^## /m);
      if (nextSectionMatch) {
        // Insert before the next section
        const insertPosition = content.indexOf("## User Hints") + "## User Hints".length + afterHints.indexOf("## ");
        const before = content.substring(0, insertPosition);
        const after = content.substring(insertPosition);
        await fs.writeFile(journeyFile, `${before}\n- ${timestamp}: ${cleanHint}\n${after}`);
        return;
      }
    }
  }

  // Fallback: append to end of file
  await appendToFile(journeyFile, `\n- ${timestamp}: ${cleanHint}`);
}

/**
 * Append a runtime self-improvement note to the project-level notes file.
 * Notes are stored for future runs and are not consumed during active execution.
 */
export async function appendSelfImprovementNote(
  journeyFile: string,
  iteration: number,
  startState: VModelState,
  endState: VModelState
): Promise<void> {
  const notesPath = getSelfImprovementNotesPath();
  const journeyName = path.basename(journeyFile, ".journey.md");
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

  try {
    await fs.access(notesPath);
  } catch (error) {
    // eslint-disable-next-line no-undef
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    await fs.writeFile(
      notesPath,
      "# Self Improvement Notes\n\nThis file is generated while vibe-model runs and is intended for future execution feedback.\n"
    );
  }

  const existingNotes = await fs.readFile(notesPath, "utf-8");
  const improvementNote = buildImprovementNote(existingNotes, journeyName, startState, endState);

  const note = `
## ${timestamp}
- Journey: ${journeyName}
- Iteration: ${iteration}
- Start State: ${startState}
- End State: ${endState}
- Improvement Note: ${improvementNote}
`;

  await appendToFile(notesPath, note);
}

interface ParsedImprovementEntry {
  journey: string;
  startState: string;
  endState: string;
}

function parseImprovementEntries(notesContent: string): ParsedImprovementEntry[] {
  const entries: ParsedImprovementEntry[] = [];
  const pattern =
    /## [^\n]+\n- Journey: (.+)\n- Iteration: .+\n- Start State: (.+)\n- End State: (.+)\n- Improvement Note: [\s\S]*?(?=\n## |\s*$)/g;

  for (const match of notesContent.matchAll(pattern)) {
    entries.push({
      journey: match[1].trim(),
      startState: match[2].trim(),
      endState: match[3].trim(),
    });
  }

  return entries;
}

function countConsecutiveStalls(
  notesContent: string,
  journeyName: string,
  state: VModelState
): number {
  const entries = parseImprovementEntries(notesContent).filter(
    (entry) => entry.journey === journeyName
  );

  let count = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.startState === state && entry.endState === state) {
      count++;
      continue;
    }
    break;
  }
  return count;
}

function getStateSpecificSuggestion(state: VModelState): string {
  switch (state) {
    case VModelState.UNIT_TEST:
      return "If tests pass, explicitly set journey state to INTEGRATION_TEST. If tests fail, record failing test names and set state to MODULE_DESIGN.";
    case VModelState.INTEGRATION_TEST:
      return "Require a deterministic branch: MODULE_DESIGN (more stories), WAITING_FOR_USER (next epic), or SYSTEM_TEST (all epics done).";
    case VModelState.IMPLEMENTATION:
      return "After build success, force state change to UNIT_TEST and include the command output summary used for the decision.";
    case VModelState.MODULE_DESIGN:
      return "Require a concrete design review result (approved or iterate) and set next state accordingly.";
    default:
      return "Add explicit pass/fail transition rules in the phase prompt and verify the journey state line was actually updated.";
  }
}

function buildImprovementNote(
  notesContent: string,
  journeyName: string,
  startState: VModelState,
  endState: VModelState
): string {
  if (startState === endState) {
    const priorConsecutive = countConsecutiveStalls(notesContent, journeyName, startState);
    const consecutive = priorConsecutive + 1;
    const severity =
      consecutive >= 3
        ? `Stall detected: ${consecutive} consecutive iterations remained in ${startState}.`
        : `No transition observed: state remained ${startState}.`;
    return `${severity} ${getStateSpecificSuggestion(startState)}`;
  }

  return `Transition progressed (${startState} -> ${endState}). Preserve the exact evidence used for this transition (tests/build outputs) so future runs can reproduce it deterministically.`;
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
 * Get current UX prototyping iteration number.
 */
export async function getPrototypingIteration(journeyFile: string): Promise<number> {
  const content = await readJourneyFile(journeyFile);
  const match = content.match(/^## Prototyping Iteration: (\d+)$/m);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Initialize UX prototyping iteration metadata in journey file.
 */
export async function initializePrototypingIteration(journeyFile: string): Promise<void> {
  const content = await readJourneyFile(journeyFile);
  if (content.includes(PROTOTYPING_ITERATION_HEADER)) {
    return;
  }

  const marker = "\n## Approaches";
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) {
    await appendToFile(journeyFile, `\n${PROTOTYPING_ITERATION_HEADER}: 0\n`);
    return;
  }

  const before = content.substring(0, markerIndex);
  const after = content.substring(markerIndex);
  await fs.writeFile(journeyFile, `${before}\n\n${PROTOTYPING_ITERATION_HEADER}: 0${after}`);
  clearJourneyCache(journeyFile);
}

/**
 * Increment UX prototyping iteration counter and return the next value.
 */
export async function incrementPrototypingIteration(journeyFile: string): Promise<number> {
  const content = await readJourneyFile(journeyFile);
  const current = await getPrototypingIteration(journeyFile);
  const next = current + 1;

  if (content.includes(PROTOTYPING_ITERATION_HEADER)) {
    await sedInplace(
      journeyFile,
      /^## Prototyping Iteration: \d+$/m,
      `${PROTOTYPING_ITERATION_HEADER}: ${next}`
    );
    return next;
  }

  await initializePrototypingIteration(journeyFile);
  await sedInplace(
    journeyFile,
    /^## Prototyping Iteration: \d+$/m,
    `${PROTOTYPING_ITERATION_HEADER}: ${next}`
  );
  return next;
}

/**
 * Get the last prototyping iteration that has consumed feedback.
 */
export async function getLastProcessedFeedbackIteration(
  journeyFile: string
): Promise<number> {
  const content = await readJourneyFile(journeyFile);
  const match = content.match(/^## Processed Feedback Iteration: (\d+)$/m);
  return match ? parseInt(match[1], 10) : -1;
}

/**
 * Mark feedback as processed for the given prototyping iteration.
 */
export async function markFeedbackAsProcessed(
  journeyFile: string,
  iteration: number
): Promise<void> {
  const content = await readJourneyFile(journeyFile);
  const header = "## Processed Feedback Iteration";
  const line = `${header}: ${iteration}`;

  if (content.match(/^## Processed Feedback Iteration: \d+$/m)) {
    await sedInplace(journeyFile, /^## Processed Feedback Iteration: \d+$/m, line);
    return;
  }

  if (content.includes(PROTOTYPING_ITERATION_HEADER)) {
    const updated = content.replace(/^## Prototyping Iteration: \d+$/m, (match) => `${match}\n${line}`);
    await fs.writeFile(journeyFile, updated);
    clearJourneyCache(journeyFile);
    return;
  }

  await initializePrototypingIteration(journeyFile);
  await appendToFile(journeyFile, `\n${line}\n`);
}

/**
 * Return non-approval user hints not yet consumed by current prototyping iteration.
 */
export async function getUnprocessedFeedback(
  journeyFile: string,
  lastProcessedIteration: number
): Promise<string[]> {
  const currentIteration = await getPrototypingIteration(journeyFile);
  if (currentIteration <= lastProcessedIteration) {
    return [];
  }

  const hints = await getUserHints(journeyFile);
  return hints.filter((line) => !line.includes("APPROVED:"));
}

/**
 * Get latest non-approval user feedback hint, if present.
 */
export async function getLatestFeedback(journeyFile: string): Promise<string | undefined> {
  const hints = await getUserHints(journeyFile);
  const filtered = hints.filter((line) => !line.includes("APPROVED:"));
  return filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
}

/**
 * Add approval entry in User Hints section.
 */
export async function addApproval(journeyFile: string): Promise<void> {
  await addUserHint(journeyFile, "APPROVED: Mockup ready for next phase");
}

async function getUserHints(journeyFile: string): Promise<string[]> {
  const content = await readJourneyFile(journeyFile);
  const userHintsSection = content.match(/## User Hints\n([\s\S]+?)(\n## |\s*$)/);

  const source = userHintsSection ? userHintsSection[1] : content;
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^-\s\d{4}-\d{2}-\d{2}:\s.+/.test(line));
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
