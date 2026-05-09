/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Checkpoint and git operations.
 * Handles git command execution and commit/push operations from parent project.
 */

import { spawn } from "child_process";
import { existsSync, statSync } from "fs";
import path from "path";
import { VModelError } from "./types";
import { config } from "./config";
import { logInfo, logSuccess, logWarning } from "./logger";

/**
 * Execute git command from parent project directory.
 * NEVER run git from vibe-model directory - the parent project is where all commits/tags happen.
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
      if (code === 0) {
        resolve({ stdout, exitCode: 0 });
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
 * Assert we're not in vibe-model submodule directory.
 * This prevents accidental git operations in the wrong directory.
 */
export function assertInParentProject(cwd: string): void {
  // A directory is a submodule if .git is a FILE (pointing to parent's .git/modules/...),
  // not if .git/modules EXISTS (that's normal for a parent project with submodules)
  const gitPath = path.join(cwd, ".git");
  if (existsSync(gitPath)) {
    const gitStat = statSync(gitPath);
    if (gitStat.isFile()) {
      throw new VModelError(
        "Git operation attempted from submodule. Must use parent project directory.",
        1,
        false
      );
    }
  }

  // Check if we're in vibe-model directory by name (with false positive check)
  const dirName = path.basename(cwd);
  if (dirName === "vibe-model") {
    // Additional check: see if parent has .git or vibe-model directory
    const parentDir = path.dirname(cwd);
    const hasParentGit = existsSync(path.join(parentDir, ".git"));
    const hasVModelDir = existsSync(path.join(parentDir, "vibe-model"));

    if (hasParentGit || hasVModelDir) {
      throw new VModelError(
        "Git operation attempted from vibe-model directory. Must use parent project directory.",
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
