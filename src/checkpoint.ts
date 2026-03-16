/**
 * Checkpoint and git operations.
 * Handles git checkpoint creation, rollback, and git command execution from parent project.
 */

import { spawn } from "child_process";
import { promises as fs, existsSync } from "fs";
import path from "path";
import { VModelError } from "./types.js";
import { config } from "./config.js";
import { logInfo, logSuccess, logWarning, logError } from "./logger.js";

/**
 * Execute git command from parent project directory.
 * NEVER run git from ai-v-model directory - the parent project is where all commits/tags happen.
 */
export async function gitCommand(
  args: string[],
  cwd?: string
): Promise<{ stdout: string; exitCode: number }> {
  const workingDir = cwd || config.projectDir;

  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, {
      cwd: workingDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0 || (code !== null && code !== 128)) {
        resolve({ stdout, exitCode: code || 0 });
      } else {
        reject(new Error(`Git command failed: ${args.join(" ")}\n${stderr}`));
      }
    });

    proc.on("error", (error) => {
      reject(new Error(`Failed to execute git command: ${error}`));
    });
  });
}

/**
 * Assert we're not in ai-v-model submodule directory.
 * This prevents accidental git operations in the wrong directory.
 */
export function assertInParentProject(cwd: string): void {
  // Check if we're in a submodule by looking for .git/modules
  const modulesPath = path.join(cwd, ".git", "modules");
  if (existsSync(modulesPath)) {
    throw new VModelError(
      "Git operation attempted from submodule. Must use parent project directory.",
      1,
      false
    );
  }

  // Check if we're in ai-v-model directory by name (with false positive check)
  const dirName = path.basename(cwd);
  if (dirName === "ai-v-model") {
    // Additional check: see if parent has .git or v_model directory
    const parentDir = path.dirname(cwd);
    const hasParentGit = existsSync(path.join(parentDir, ".git"));
    const hasVModelDir = existsSync(path.join(parentDir, "v_model"));

    if (hasParentGit || hasVModelDir) {
      throw new VModelError(
        "Git operation attempted from ai-v-model directory. Must use parent project directory.",
        1,
        false
      );
    }
  }
}

/**
 * Get current git branch
 */
export async function getCurrentBranch(cwd?: string): Promise<string> {
  try {
    const result = await gitCommand(["branch", "--show-current"], cwd);
    return result.stdout.trim();
  } catch {
    return "";
  }
}

/**
 * Check if there are uncommitted changes
 */
export async function hasUncommittedChanges(cwd?: string): Promise<boolean> {
  try {
    const result = await gitCommand(["status", "--porcelain"], cwd);
    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Create git checkpoint (annotated tag)
 */
export async function createCheckpoint(
  journeyName: string,
  milestoneNumber: number,
  description: string
): Promise<void> {
  const tag = `journey-${journeyName}-milestone-${milestoneNumber}`;

  // Check if tag already exists
  try {
    await gitCommand(["rev-parse", tag]);
    logWarning(`Tag ${tag} already exists, skipping`);
    return;
  } catch {
    // Tag doesn't exist, continue
  }

  // Assert we're in parent project directory
  assertInParentProject(config.projectDir);

  // Create annotated tag
  try {
    await gitCommand(
      ["tag", "-a", tag, "-m", `Journey checkpoint: ${description}`, "HEAD"],
      config.projectDir
    );
    logSuccess(`Created checkpoint: ${tag}`);
  } catch (error) {
    logWarning(`Failed to create checkpoint: ${error}`);
  }
}

/**
 * Rollback to checkpoint
 */
export async function rollbackToCheckpoint(
  journeyFile: string,
  checkpointId?: number
): Promise<void> {
  // Get checkpoints from journey file
  const content = await fs.readFile(journeyFile, "utf-8");
  const checkpointsSection = content.match(
    /## Checkpoints\n([\s\S]+?)\n## /
  );

  if (!checkpointsSection) {
    logError("No checkpoints section found in journey file");
    return;
  }

  // Parse checkpoint table
  const checkpoints: Array<{ id: number; tag: string }> = [];
  for (const line of checkpointsSection[1].split("\n")) {
    const match = line.match(/^\| (\d+) \| ([\w-]+) \|/);
    if (match) {
      checkpoints.push({ id: parseInt(match[1], 10), tag: match[2] });
    }
  }

  // Determine which checkpoint to use
  let targetCheckpoint: { id: number; tag: string } | undefined;

  if (checkpointId !== undefined) {
    targetCheckpoint = checkpoints.find((c) => c.id === checkpointId);
  } else {
    // Get the latest checkpoint (highest ID)
    targetCheckpoint = checkpoints[checkpoints.length - 1];
  }

  if (!targetCheckpoint) {
    logError(`Checkpoint ID ${checkpointId || "latest"} not found`);
    return;
  }

  logWarning(`Rolling back to checkpoint: ${targetCheckpoint.tag}`);
  logInfo(
    "This will reset your working directory to the state at " +
      targetCheckpoint.tag
  );

  // TODO: Add user confirmation prompt here
  // For now, proceed with rollback

  // Assert we're in parent project directory
  assertInParentProject(config.projectDir);

  try {
    await gitCommand(["reset", "--hard", targetCheckpoint.tag], config.projectDir);
    logSuccess(`Rolled back to ${targetCheckpoint.tag}`);
  } catch (error) {
    logError(`Rollback failed: ${error}`);
  }
}

/**
 * List checkpoints for a journey
 */
export async function listCheckpoints(journeyFile: string): Promise<
  Array<{
    id: number;
    tag: string;
    date: string;
    description: string;
  }>
> {
  const content = await fs.readFile(journeyFile, "utf-8");
  const checkpointsSection = content.match(
    /## Checkpoints\n([\s\S]+?)\n## /
  );

  if (!checkpointsSection) {
    return [];
  }

  const checkpoints: Array<{
    id: number;
    tag: string;
    date: string;
    description: string;
  }> = [];

  for (const line of checkpointsSection[1].split("\n")) {
    const match = line.match(
      /^\| (\d+) \| ([\w-]+) \| (\d{4}-\d{2}-\d{2}) \| (.+?) \|/
    );
    if (match) {
      checkpoints.push({
        id: parseInt(match[1], 10),
        tag: match[2],
        date: match[3],
        description: match[4].trim(),
      });
    }
  }

  return checkpoints;
}

/**
 * Commit all changes with message
 */
export async function commitChanges(message: string): Promise<void> {
  // Assert we're in parent project directory
  assertInParentProject(config.projectDir);

  try {
    // Stage all changes
    await gitCommand(["add", "-A"], config.projectDir);

    // Check if there are changes to commit
    const hasChanges = await hasUncommittedChanges(config.projectDir);
    if (!hasChanges) {
      logInfo("No changes to commit");
      return;
    }

    // Commit with message
    await gitCommand(["commit", "-m", message], config.projectDir);
    logSuccess("Changes committed");
  } catch (error) {
    logWarning(`Commit failed: ${error}`);
  }
}

/**
 * Push to remote repository
 */
export async function pushChanges(branch?: string): Promise<void> {
  // Assert we're in parent project directory
  assertInParentProject(config.projectDir);

  try {
    const targetBranch = branch || (await getCurrentBranch(config.projectDir));
    if (!targetBranch) {
      logWarning("No branch detected, skipping push");
      return;
    }

    await gitCommand(["push", "origin", targetBranch], config.projectDir);
    logSuccess(`Pushed to origin/${targetBranch}`);
  } catch (error) {
    logWarning(`Git push failed: ${error}`);
  }
}
