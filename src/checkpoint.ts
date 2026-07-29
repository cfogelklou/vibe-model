/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Checkpoint and git operations.
 * Handles git command execution and commit/push operations in the target project.
 */

import { spawn } from "child_process";
import path from "path";
import { config } from "./config";
import { logInfo, logSuccess, logWarning } from "./logger";

/**
 * Execute git command in the target project directory.
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
 * Generated paths that should never be auto-committed by vibe-model,
 * even if the target project forgot to add them to .gitignore.
 */
const AUTO_COMMIT_EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".vite",
  ".vitest",
]);

/**
 * Parse `git status --porcelain` output into changed paths.
 * For rename entries, returns both old and new paths so staging can capture the move.
 */
export function parsePorcelainPaths(output: string): string[] {
  const paths: string[] = [];

  for (const rawLine of output.split("\n")) {
    if (!rawLine.trim()) {
      continue;
    }

    const pathPart = rawLine.slice(3);
    if (!pathPart) {
      continue;
    }

    if (pathPart.includes(" -> ")) {
      const [from, to] = pathPart.split(" -> ");
      if (from) {
        paths.push(from.trim());
      }
      if (to) {
        paths.push(to.trim());
      }
      continue;
    }

    paths.push(pathPart.trim());
  }

  return paths;
}

/**
 * Whether a path should be excluded from vibe-model's auto-commit staging.
 */
export function shouldExcludeFromAutoCommit(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  const baseName = path.posix.basename(normalized);

  if (segments.some((segment) => AUTO_COMMIT_EXCLUDED_DIRS.has(segment))) {
    return true;
  }

  return baseName.endsWith(".tsbuildinfo");
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
 * Return all changed paths in the repository.
 */
export async function getChangedPaths(cwd?: string): Promise<string[]> {
  const result = await gitCommand(["status", "--porcelain"], cwd);
  return parsePorcelainPaths(result.stdout);
}

/**
 * Check if there are staged changes ready to commit.
 */
export async function hasStagedChanges(cwd?: string): Promise<boolean> {
  try {
    const result = await gitCommand(["diff", "--cached", "--name-only"], cwd);
    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Commit all changes with message.
 * Stages only non-generated paths so installs/builds do not accidentally commit
 * node_modules, dist output, or tool caches into new repositories.
 */
export async function commitChanges(message: string): Promise<void> {
  try {
    const changedPaths = await getChangedPaths(config.projectDir);
    const uniquePaths = [...new Set(changedPaths)];
    const pathsToStage = uniquePaths.filter((filePath) => !shouldExcludeFromAutoCommit(filePath));
    const excludedPaths = uniquePaths.filter((filePath) => shouldExcludeFromAutoCommit(filePath));

    if (excludedPaths.length > 0) {
      logInfo(
        `Skipping generated paths from auto-commit: ${excludedPaths.slice(0, 5).join(", ")}${excludedPaths.length > 5 ? " ..." : ""}`,
      );
    }

    if (pathsToStage.length === 0) {
      logInfo("No commit-worthy changes to stage");
      return;
    }

    const chunkSize = 100;
    for (let i = 0; i < pathsToStage.length; i += chunkSize) {
      const chunk = pathsToStage.slice(i, i + chunkSize);
      await gitCommand(["add", "-A", "--", ...chunk], config.projectDir);
    }

    const hasChanges = await hasStagedChanges(config.projectDir);
    if (!hasChanges) {
      logInfo("No changes to commit");
      return;
    }

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
