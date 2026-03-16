/**
 * Epic archival operations.
 * Handles epic file creation, progress tracking, and archival of completed epics.
 */

import { promises as fs, existsSync } from "fs";
import path from "path";
import { getCurrentEpic, sanitizeJourneyName } from "./journey";
import { logInfo, logSuccess, logWarning } from "./logger";
import { epicArchivalPrompt, type EpicArchivalVars } from "./prompts/index";
import { runAIWithPrompt } from "./ai-provider";

/**
 * Get epic file path for a given journey and epic number
 */
export function getEpicFilePath(journeyFile: string, epicNum: number): string {
  const journeyDir = path.dirname(journeyFile);
  const journeyName = path.basename(journeyFile, ".journey.md");
  const sanitizedJourneyName = sanitizeJourneyName(journeyName);
  return path.join(journeyDir, `${sanitizedJourneyName}.journey.E${epicNum}.md`);
}

/**
 * Create or update epic file.
 * If epic file exists, update it; otherwise create new one.
 */
export async function createOrUpdateEpicFile(
  journeyFile: string,
  epicNum: number,
  epicName: string
): Promise<string> {
  const epicFilePath = getEpicFilePath(journeyFile, epicNum);
  const journeyName = path.basename(journeyFile, ".journey.md");

  if (existsSync(epicFilePath)) {
    // File exists: will be updated, don't overwrite
    logInfo(`Epic file exists, will update: ${epicFilePath}`);
    return epicFilePath;
  }

  // File doesn't exist: create new epic file
  logInfo(`Creating new epic file: ${epicFilePath}`);

  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

  const epicTemplate = `# Epic E${epicNum}: ${epicName}

> **Journey**: ${journeyName}
> **Created**: ${timestamp}
> **Status**: IN_PROGRESS

## Epic Summary
{Brief description of what this epic accomplishes}

## Epic Decomposition

### Story S1: {Story Name}
**Status**: PENDING
**Description**: {What this story does}
**Dependencies**: {None or other stories}

### Story S2: {Story Name}
...

## Research Notes

### ARCH_DESIGN Phase Research
{Component-level research, API/interface designs}

### MODULE_DESIGN Phase Research
{Algorithm research, edge cases, implementation details}

## Implementation Progress
| Story | Phase | Status | Tests | Notes |
|-------|-------|--------|-------|-------|
| S1 | MODULE_DESIGN | IN_PROGRESS | - | Working on detailed design |
| S2 | PENDING | PENDING | - | Not started |

## Learnings
{Epic-specific learnings added during work}

## Dead Ends (if any)
{Anti-patterns or approaches that didn't work}
`;

  await fs.writeFile(epicFilePath, epicTemplate);
  logSuccess(`Created epic file: ${epicFilePath}`);
  return epicFilePath;
}

/**
 * Extract epic progress table from journey file
 */
export async function extractEpicProgressTable(
  journeyFile: string
): Promise<string> {
  const content = await fs.readFile(journeyFile, "utf-8");

  // Find Epic Progress section
  const epicProgressMatch = content.match(
    /## Epic Progress\n([\s\S]+?)\n## /
  );

  if (!epicProgressMatch) {
    return "";
  }

  const epicProgressSection = epicProgressMatch[1];

  // Extract only epic rows (lines starting with | E<digit>)
  const epicRows = epicProgressSection
    .split("\n")
    .filter((line) => line.match(/^\| E\d+ /))
    .join("\n");

  return epicRows;
}

/**
 * Get list of completed epics that haven't been archived yet
 */
export async function getCompletedUnarchivedEpics(
  journeyFile: string
): Promise<number[]> {
  const journeyDir = path.dirname(journeyFile);
  const journeyName = path.basename(journeyFile, ".journey.md");
  const currentEpic = await getCurrentEpic(journeyFile);
  const currentEpicNum = parseInt(currentEpic.replace(/\D/g, ""), 10) || 0;

  const epicProgressTable = await extractEpicProgressTable(journeyFile);
  const completedUnarchivedEpics: number[] = [];

  for (const line of epicProgressTable.split("\n")) {
    const match = line.match(/^\| E(\d+) \| (.+?) \| (\w+) /);
    if (!match) continue;

    const [, epicNumStr, _epicName, epicStatus] = match;
    const epicNum = parseInt(epicNumStr, 10);

    // Skip if not complete
    if (epicStatus !== "COMPLETE") continue;

    // Skip if this is the current epic
    if (epicNum === currentEpicNum) continue;

    // Skip if already archived
    const epicFilePath = path.join(
      journeyDir,
      `${sanitizeJourneyName(journeyName)}.journey.E${epicNum}.md`
    );
    if (existsSync(epicFilePath)) continue;

    completedUnarchivedEpics.push(epicNum);
  }

  return completedUnarchivedEpics;
}

/**
 * Archive a single epic's details to separate file
 */
export async function archiveEpicDetails(
  journeyFile: string,
  epicNum: number
): Promise<void> {
  const journeyName = path.basename(journeyFile, ".journey.md");
  const epicFilePath = getEpicFilePath(journeyFile, epicNum);

  logInfo(`Archiving Epic E${epicNum} to ${epicFilePath}...`);

  // Pre-compute archival mode based on whether epic file exists
  const currentDate = new Date().toISOString().split("T")[0];
  const archivalMode = existsSync(epicFilePath)
    ? `The epic file already exists at \`${epicFilePath}\`.

Your task is to mark this epic as COMPLETE by:
1. Updating the **Status** field in the header to "COMPLETE (${currentDate})"
2. Adding completion summary to Epic Summary section
3. DO NOT recreate the file or modify existing structure
4. Add a link to the archived epic from the main journey file`
    : `Create a new epic archive file at \`${epicFilePath}\` with the epic's complete content.`;

  // Create archival prompt
  const archivalVars: EpicArchivalVars = {
    EPIC_ARCHIVAL_MODE: archivalMode,
    JOURNEY_FILE: journeyFile,
    EPIC_NUM: epicNum.toString(),
    EPIC_FILE: epicFilePath,
    JOURNEY_NAME: journeyName,
  };
  const archivalPrompt = epicArchivalPrompt(archivalVars);

  // Create temp file with prompt
  const tempPrompt = `/tmp/v-model-archival-${epicNum}-${Date.now()}.md`;
  await fs.writeFile(
    tempPrompt,
    `${archivalPrompt}

Current working directory: ${process.cwd()}
`
  );

  try {
    // Run AI with the prompt
    const exitCode = await runAIWithPrompt(tempPrompt);

    // Re-raise SIGINT if user interrupted (exit code 130 = 128+SIGINT)
    if (exitCode === 130) {
      process.exit(130);
    }

    if (exitCode !== 0) {
      throw new Error(`Archival failed with exit code ${exitCode}`);
    }

    // Verify the epic file was created or updated
    if (existsSync(epicFilePath)) {
      logSuccess(`✅ Epic E${epicNum} archived to ${epicFilePath}`);
    } else {
      logWarning("Epic file not created, archival may have failed");
    }
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempPrompt);
    } catch {
      // Temp file cleanup failed, ignore
    }
  }
}

/**
 * Get epic status from epic progress table
 */
export async function getEpicStatus(
  journeyFile: string,
  epicId: string
): Promise<string> {
  const epicProgressTable = await extractEpicProgressTable(journeyFile);

  for (const line of epicProgressTable.split("\n")) {
    if (line.includes(` ${epicId} `)) {
      const match = line.match(/^\| E\d+ \| (.+?) \| (\w+) /);
      if (match) {
        return match[2];
      }
    }
  }

  return "UNKNOWN";
}

/**
 * Get epic name from epic progress table
 */
export async function getEpicNameFromTable(
  journeyFile: string,
  epicId: string
): Promise<string> {
  const epicProgressTable = await extractEpicProgressTable(journeyFile);

  for (const line of epicProgressTable.split("\n")) {
    if (line.includes(` ${epicId} `)) {
      const match = line.match(/^\| E\d+ \| (.+?) \| /);
      if (match) {
        return match[1].trim();
      }
    }
  }

  return "Unknown Epic";
}

/**
 * Get the next epic ID from epic progress table
 */
export async function getNextEpicId(
  journeyFile: string,
  currentEpic: string
): Promise<string> {
  const epicProgressTable = await extractEpicProgressTable(journeyFile);
  const currentNum = parseInt(currentEpic.replace(/\D/g, ""), 10) || 0;
  const nextNum = currentNum + 1;

  // Check if E{nextNum} exists in epic progress table
  const nextEpicId = `E${nextNum}`;
  if (epicProgressTable.includes(` ${nextEpicId} `)) {
    return nextEpicId;
  }

  return "NONE";
}

/**
 * Check if we should continue to next epic
 */
export async function shouldContinueToNextEpic(
  journeyFile: string,
  currentEpic: string
): Promise<boolean> {
  const epicStatus = await getEpicStatus(journeyFile, currentEpic);
  return epicStatus.includes("COMPLETE");
}
