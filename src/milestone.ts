/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Milestone file operations: create, read, and update individual milestone
 * files under vibe-model/milestones/.
 */

import { promises as fs, mkdirSync, writeFileSync } from "fs";
import path from "path";
import {
  MilestoneState,
  type MilestoneFile,
} from "./types";
import {
  VIBE_MODEL_DIR,
  MILESTONES_DIR,
  milestoneFileName,
} from "./constants";
import { sedInplace } from "./file-utils";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Returns the full path to a milestone file.
 */
export function getMilestoneFilePath(
  projectDir: string,
  id: number,
  name: string
): string {
  return path.join(
    projectDir,
    VIBE_MODEL_DIR,
    MILESTONES_DIR,
    milestoneFileName(id, name)
  );
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Generates a milestone template and writes it to
 * `vibe-model/milestones/{NN}-{name}.md`.  Ensures the directory exists.
 * Returns the file path.
 */
export function createMilestoneFile(
  projectDir: string,
  id: number,
  name: string
): string {
  const filePath = getMilestoneFilePath(projectDir, id, name);
  const dir = path.dirname(filePath);

  mkdirSync(dir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace("T", " ")
    .substring(0, 19) + " UTC";

  const template = `# Milestone ${id}: ${name}

## Status
- State: REQUIREMENTS
- Progress: 0%
- Started: ${timestamp}
- Pending Transition: NONE

## Requirements
*(To be filled during REQUIREMENTS phase)*

## Design
*(To be filled during DESIGN phase)*

## Test Specifications
*(NL test cases written during DESIGN)*

## Research Notes
*(Research findings for this milestone)*

## Implementation Notes
*(To be filled during IMPLEMENTATION phase)*

## Unit Test Results
*(To be filled during UNIT_TEST phase)*

## Integration Test Results
*(To be filled during INTEGRATION_TEST phase)*

## Delivery
*(Local branch/commit summary, deliverables, and caveats — to be filled during DELIVERY phase)*

## Learnings
*(Learnings captured from this milestone)*
`;

  writeFileSync(filePath, template, "utf-8");

  return filePath;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Parses a milestone file into a structured MilestoneFile object.
 */
export async function readMilestoneFile(filePath: string): Promise<MilestoneFile> {
  const content = await fs.readFile(filePath, "utf-8");

  // Extract ID and name from the H1 title: "# Milestone {id}: {name}"
  const titleMatch = content.match(/^# Milestone (\d+): (.+)$/m);
  const id = titleMatch ? parseInt(titleMatch[1], 10) : 0;
  const name = titleMatch ? titleMatch[2].trim() : "";

  // State
  const stateMatch = content.match(/^- State:\s*(\w+)$/m);
  const state = (stateMatch && Object.values(MilestoneState).includes(stateMatch[1] as MilestoneState))
    ? (stateMatch[1] as MilestoneState)
    : MilestoneState.REQUIREMENTS;

  // Progress
  const progressMatch = content.match(/^- Progress:\s*(\d+)%$/m);
  const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0;

  // Started
  const startedMatch = content.match(/^- Started:\s*(.+)$/m);
  const started = startedMatch ? startedMatch[1].trim() : "";

  // Pending Transition
  const pendingMatch = content.match(/^- Pending Transition:\s*(\w+)$/m);
  const pendingTransition = (pendingMatch && Object.values(MilestoneState).includes(pendingMatch[1] as MilestoneState))
    ? (pendingMatch[1] as MilestoneState)
    : undefined;

  // Extract sections by name
  const requirements = extractSectionContent(content, "Requirements");
  const design = extractSectionContent(content, "Design");
  const testSpecifications = extractSectionContent(content, "Test Specifications");
  const researchNotes = extractSectionContent(content, "Research Notes");
  const implementationNotes = extractSectionContent(content, "Implementation Notes");
  const unitTestResults = extractSectionContent(content, "Unit Test Results");
  const integrationTestResults = extractSectionContent(content, "Integration Test Results");
  const delivery = extractSectionContent(content, "Delivery");
  const learnings = extractSectionContent(content, "Learnings");

  return {
    id,
    name,
    state,
    progress,
    started,
    pendingTransition,
    requirements,
    design,
    testSpecifications,
    implementationNotes,
    unitTestResults,
    integrationTestResults,
    delivery,
    learnings,
    researchNotes,
  };
}

/**
 * Reads and returns just the current MilestoneState from the file.
 */
export async function getMilestoneState(filePath: string): Promise<MilestoneState> {
  const content = await fs.readFile(filePath, "utf-8");
  const match = content.match(/^- State:\s*(\w+)$/m);

  if (match && Object.values(MilestoneState).includes(match[1] as MilestoneState)) {
    return match[1] as MilestoneState;
  }

  return MilestoneState.REQUIREMENTS;
}

// ---------------------------------------------------------------------------
// Update helpers
// ---------------------------------------------------------------------------

/**
 * Updates the State line in the Status section.
 */
export async function setMilestoneState(
  filePath: string,
  state: MilestoneState
): Promise<void> {
  await sedInplace(filePath, /^- State: .*$/m, `- State: ${state}`);
}

/**
 * Updates the Pending Transition line in the Status section.
 * Pass null to clear the pending transition (writes "NONE").
 */
export async function setPendingTransition(
  filePath: string,
  state: MilestoneState | null
): Promise<void> {
  const value = state === null ? "NONE" : state;
  await sedInplace(
    filePath,
    /^- Pending Transition: .*$/m,
    `- Pending Transition: ${value}`
  );
}

/**
 * Updates the Progress line in the Status section.
 */
export async function setMilestoneProgress(
  filePath: string,
  progress: number
): Promise<void> {
  await sedInplace(
    filePath,
    /^- Progress: .*%$/m,
    `- Progress: ${progress}%`
  );
}

/**
 * Replaces the content between `## {sectionName}` and the next `## ` heading.
 * If the section is not found the file is left unchanged.
 */
export async function updateSection(
  filePath: string,
  sectionName: string,
  content: string
): Promise<void> {
  const fileContent = await fs.readFile(filePath, "utf-8");

  // Match "## {sectionName}" through to the next "## " or end-of-file.
  // No "m" flag — see extractSectionContent(). Group 1 = heading (+ leading
  // newline if mid-file) and its trailing newline; group 2 = content.
  const sectionRegex = new RegExp(
    `((?:^|\\n)## ${escapeRegex(sectionName)}\\n?)([\\s\\S]*?)(?=\\n## |$)`
  );

  if (!sectionRegex.test(fileContent)) {
    return; // Section not found — do nothing.
  }

  // Use a function replacement so `content` is inserted literally (a string
  // replacement would interpret "$" inside content as backreferences).
  const updated = fileContent.replace(
    sectionRegex,
    (_match, heading) => `${heading}${content}\n`
  );

  await fs.writeFile(filePath, updated);
}

/**
 * Appends a learning entry to the Learnings section.
 */
const fileWriteLocks = new Map<string, Promise<unknown>>();

/**
 * Serialize async read-modify-write operations on the same file so concurrent
 * callers (e.g. multiple `vibe-model hint` invocations) don't clobber each other.
 *
 * NOTE: this does NOT guard against the AI editing the milestone file
 * concurrently — claude writes the file directly with its own tools, outside
 * this process. For reliable application, add hints between phases (they take
 * effect on the next prompt generation). See README_AGENTIC_DEVS.md.
 */
async function withFileLock<T>(
  filePath: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = fileWriteLocks.get(filePath) ?? Promise.resolve();
  const result = prev.then(() => fn());
  // Keep the chain alive even if this op rejects, so later queued ops still run.
  fileWriteLocks.set(filePath, result.then(() => undefined, () => undefined));
  return result;
}

/**
 * Appends a learning entry to the Learnings section.
 *
 * Creates the section (with a proper header) if absent, and always places the
 * entry on its own line directly under the header — so it is visible to every
 * section reader (readMilestoneFile, prompt filtering, delivery-summary
 * extraction). Previously a missing or empty section could orphan or mangle it.
 */
export async function addLearning(
  filePath: string,
  learning: string,
): Promise<void> {
  await withFileLock(filePath, async () => {
    const fileContent = await fs.readFile(filePath, "utf-8");

    const timestamp = new Date().toISOString().split("T")[0];
    const line = `- ${timestamp}: ${learning}`;

    // Locate the top-level "## Learnings" heading.
    const headingRegex = /(?:^|\n)## Learnings\b/;
    const match = headingRegex.exec(fileContent);

    if (match) {
      // Insert the entry on its own line right after the heading line.
      const headingEnd = match.index + match[0].length;
      const trailingNewline = fileContent.indexOf("\n", headingEnd);
      if (trailingNewline === -1) {
        // Heading is the last line with no trailing newline.
        await fs.writeFile(filePath, `${fileContent}\n${line}\n`);
        return;
      }
      const insertPos = trailingNewline + 1;
      const newContent =
        fileContent.substring(0, insertPos) +
        `${line}\n` +
        fileContent.substring(insertPos);
      await fs.writeFile(filePath, newContent);
    } else {
      // No Learnings section — append a properly-formed one.
      const sep = fileContent.endsWith("\n") ? "" : "\n";
      await fs.writeFile(
        filePath,
        `${fileContent}${sep}\n## Learnings\n${line}\n`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the text content of a top-level `## {name}` section (stops at the
 * next `## ` heading or end-of-file).  Returns the trimmed text, empty string
 * if the section is not found.
 */
function extractSectionContent(content: string, sectionName: string): string {
  // NOTE: no "m" flag. Under "m", "$" matches at every line end, which would
  // truncate the capture to the first content line. Anchor the heading with
  // (?:^|\n) and terminate at the next "\n## " heading or true end-of-string.
  const regex = new RegExp(
    `(?:^|\\n)## ${escapeRegex(sectionName)}\\n?([\\s\\S]*?)(?=\\n## |$)`
  );
  const match = regex.exec(content);
  return match ? match[1].trim() : "";
}

/**
 * Escapes special regex characters in a string so it can be used literally
 * inside a RegExp constructor.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
