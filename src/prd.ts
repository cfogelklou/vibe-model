/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * PRD file operations: create, read, and update prd.md.
 * Manages the PRD document and its embedded milestones table.
 */

import { promises as fs, mkdirSync, writeFileSync } from "fs";
import path from "path";
import type { PRDFile, Milestone } from "./types";
import {
  VIBE_MODEL_DIR,
  PRD_FILE,
  MILESTONE_TABLE_HEADER,
  MILESTONE_TABLE_SEPARATOR,
} from "./constants";
import { sedInplace } from "./file-utils";

/**
 * Returns the full path to prd.md within the project.
 */
export function getPRDPath(projectDir: string): string {
  return path.join(projectDir, VIBE_MODEL_DIR, PRD_FILE);
}

/**
 * Creates vibe-model/prd.md with a TypeScript-generated template.
 * Ensures the vibe-model directory exists before writing.
 * Returns the file path.
 */
export function createPRD(projectDir: string, goal: string): string {
  const prdPath = getPRDPath(projectDir);
  const dir = path.dirname(prdPath);

  mkdirSync(dir, { recursive: true });

  const template = `# PRD: ${goal}

## Goal
${goal}

## Tech Stack
*(To be defined during PRD phase)*

## Architecture Overview
*(To be defined during PRD phase)*

## Milestones

${MILESTONE_TABLE_HEADER}
${MILESTONE_TABLE_SEPARATOR}
`;

  writeFileSync(prdPath, template, "utf-8");

  return prdPath;
}

/**
 * Parses prd.md into a structured PRDFile object.
 */
export async function readPRD(projectDir: string): Promise<PRDFile> {
  const prdPath = getPRDPath(projectDir);
  const content = await fs.readFile(prdPath, "utf-8");

  // Extract Goal section
  const goalMatch = content.match(
    /## Goal\s*\n([\s\S]*?)(?=\n## )/
  );
  const goal = goalMatch ? goalMatch[1].trim() : "";

  // Extract Tech Stack section
  const techMatch = content.match(
    /## Tech Stack\s*\n([\s\S]*?)(?=\n## )/
  );
  const techStack = techMatch ? techMatch[1].trim() : "";

  // Extract Architecture Overview section
  const archMatch = content.match(
    /## Architecture Overview\s*\n([\s\S]*?)(?=\n## )/
  );
  const architectureOverview = archMatch ? archMatch[1].trim() : "";

  // Parse milestones table
  const milestones = parseMilestonesTable(content);

  return {
    goal,
    techStack,
    architectureOverview,
    milestones,
  };
}

/**
 * Regex-parses the markdown milestones table.
 * Extracts ID (number), name, description, status, and optional mode override
 * from each data row.  Skips header and separator lines.
 * Returns an empty array when the table has no data rows.
 */
export function parseMilestonesTable(content: string): Milestone[] {
  const milestones: Milestone[] = [];

  // Match table data rows: | <number> | <text> | <text> | <text> | <text> |
  // The mode column may be empty.
  const rowPattern = /^\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|$/gm;

  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(content)) !== null) {
    const id = parseInt(match[1], 10);
    const name = match[2].trim();
    const description = match[3].trim();
    const rawStatus = match[4].trim().toUpperCase();
    const rawMode = match[5].trim().toLowerCase();

    // Validate status — only recognise the three allowed values.
    const status = (rawStatus === "PENDING" || rawStatus === "IN_PROGRESS" || rawStatus === "COMPLETE")
      ? rawStatus
      : "PENDING";

    // Mode override — only recognise specific values.
    let modeOverride: Milestone["modeOverride"] = null;
    if (rawMode === "hil" || rawMode === "autonomous") {
      modeOverride = rawMode;
    }

    milestones.push({ id, name, description, status, modeOverride });
  }

  return milestones;
}

/**
 * Finds the first non-COMPLETE milestone in the PRD, or null if all are complete.
 */
export function getActiveMilestone(prd: PRDFile): Milestone | null {
  return prd.milestones.find((m) => m.status !== "COMPLETE") ?? null;
}

/**
 * Updates the status column of a specific milestone row in the prd.md file.
 * Uses sedInplace to perform an in-place regex replacement on the matching row.
 */
export async function setMilestoneStatus(
  projectDir: string,
  id: number,
  status: string
): Promise<void> {
  const prdPath = getPRDPath(projectDir);
  // Build a regex that matches the exact row for this milestone ID.
  // We replace only the status column (4th column).
  const rowRegex = new RegExp(
    `^(\\|\\s*${id}\\s*\\|\\s*[^|]+\\|\\s*[^|]+\\|\\s*)[^|]+(\\|.*)$`,
    "m"
  );
  await sedInplace(prdPath, rowRegex, `$1${status} $2`);
}

/**
 * Reads the mode override for a specific milestone from the PRD.
 * Returns null if no override is set or the milestone doesn't exist.
 */
export function getMilestoneModeOverride(
  prd: PRDFile,
  id: number
): string | null {
  const milestone = prd.milestones.find((m) => m.id === id);
  return milestone?.modeOverride ?? null;
}
