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
import { sedInplace, appendToFile } from "./file-utils";

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
*(PR link, to be filled during DELIVERY phase)*

## Learnings
*(Replaces memory.md — learnings from this milestone)*
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
  const sectionRegex = new RegExp(
    `(^## ${escapeRegex(sectionName)}$\\n)([\\s\\S]*?)(?=^## |$)`,
    "m"
  );

  if (!sectionRegex.test(fileContent)) {
    return; // Section not found — do nothing.
  }

  const updated = fileContent.replace(
    sectionRegex,
    `$1${content}\n`
  );

  await fs.writeFile(filePath, updated);
}

/**
 * Appends a learning entry to the Learnings section.
 */
export async function addLearning(
  filePath: string,
  learning: string
): Promise<void> {
  // Find the Learnings section and append before the next ## heading or EOF.
  const fileContent = await fs.readFile(filePath, "utf-8");

  const timestamp = new Date().toISOString().split("T")[0];
  const line = `- ${timestamp}: ${learning}`;

  // Locate the Learnings section
  const learningsRegex = /^## Learnings$/m;
  const match = learningsRegex.exec(fileContent);

  if (match?.index !== undefined) {
    // Find the next ## heading after Learnings, or end of file
    const afterSection = fileContent.substring(match.index + match[0].length);
    const nextHeading = afterSection.match(/\n^## /m);

    if (nextHeading?.index !== undefined) {
      // Insert before the next heading
      const insertPos =
        match.index + match[0].length + nextHeading.index;
      const newContent =
        fileContent.substring(0, insertPos) +
        `${line}\n` +
        fileContent.substring(insertPos);
      await fs.writeFile(filePath, newContent);
    } else {
      // No next heading — append to end of file
      await appendToFile(filePath, `\n${line}`);
    }
  } else {
    // Learnings section not found — append to end
    await appendToFile(filePath, `\n${line}`);
  }
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
  const regex = new RegExp(
    `^## ${escapeRegex(sectionName)}$\\n([\\s\\S]*?)(?=^## |$)`,
    "m"
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
