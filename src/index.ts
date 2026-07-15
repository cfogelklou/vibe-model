#!/usr/bin/env bun
/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * CLI entry point for V-Model autonomous R&D agent.
 * Handles command-line argument parsing and command routing.
 */

import { Command } from "commander";
import { existsSync, promises as fs } from "fs";
import path from "path";
import { VModelError, MilestoneState } from "./types";
import { config, initializeConfig } from "./config";
import {
  logInfo,
  logSuccess,
  logWarning,
  logError,
} from "./logger";
import { killAllChildProcesses } from "./ai-provider";
import { getPRDPath, createPRD, readPRD, getActiveMilestone } from "./prd";
import { getMilestoneFilePath, createMilestoneFile, addLearning, getMilestoneState } from "./milestone";
import { milestoneLoop, continueMilestone } from "./milestone-loop";
import { VIBE_MODEL_DIR, MILESTONES_DIR } from "./constants";


/**
 * Ensure required directories exist
 */
async function ensureDirectories(): Promise<void> {
  const vModelDir = path.join(config.projectDir, VIBE_MODEL_DIR);
  await fs.mkdir(vModelDir, { recursive: true });
  await fs.mkdir(path.join(vModelDir, MILESTONES_DIR), { recursive: true });
}

/**
 * Handle milestone status command
 */
async function handleMilestoneStatus(): Promise<void> {
  const prdPath = getPRDPath(config.projectDir);

  if (!existsSync(prdPath)) {
    logInfo("No PRD found");
    return;
  }

  const prd = await readPRD(config.projectDir);

  console.log("\n\x1b[36m=== PRD ===\x1b[0m\n");
  console.log(`Goal: ${prd.goal}`);
  console.log(`Tech Stack: ${prd.techStack}`);
  console.log(`Architecture: ${prd.architectureOverview}`);

  if (prd.milestones.length === 0) {
    console.log("\nNo milestones defined yet");
    return;
  }

  console.log("\n\x1b[36m=== Milestones ===\x1b[0m\n");
  console.log("| ID | Name | Description | Status | Mode |");
  console.log("|----|------|-------------|--------|------|");

  for (const m of prd.milestones) {
    const mode = m.modeOverride || "-";
    console.log(`| ${m.id} | ${m.name} | ${m.description} | ${m.status} | ${mode} |`);
  }

  // Show active milestone details
  const active = getActiveMilestone(prd);
  if (active) {
    const milestonePath = getMilestoneFilePath(config.projectDir, active.id, active.name);
    if (existsSync(milestonePath)) {
      const state = await getMilestoneState(milestonePath);
      console.log(`\n\x1b[33mActive: #${active.id} ${active.name}\x1b[0m`);
      console.log(`  State: ${state}`);
    }
  } else {
    console.log("\n\x1b[32mAll milestones complete!\x1b[0m");
  }

  console.log();
}

/**
 * Handle milestone hint command
 */
async function handleMilestoneHint(hint: string): Promise<void> {
  const prd = await readPRD(config.projectDir);
  const active = getActiveMilestone(prd);

  if (!active) {
    logError("No active milestone found");
    process.exitCode = 1;
    return;
  }

  const milestonePath = getMilestoneFilePath(config.projectDir, active.id, active.name);
  if (!existsSync(milestonePath)) {
    createMilestoneFile(config.projectDir, active.id, active.name);
  }

  await addLearning(milestonePath, `User hint: ${hint}`);
  logSuccess("Hint added to milestone");

  // If milestone was waiting, log hint but don't auto-resume
  const state = await getMilestoneState(milestonePath);
  if (state === MilestoneState.WAITING_FOR_USER) {
    logInfo("Milestone is WAITING_FOR_USER. Run `continue` to resume.");
  }
}

/**
 * Setup signal handlers for graceful cleanup
 */
function setupSignalHandlers(): void {
  // Handle SIGINT (Ctrl+C)
  process.on("SIGINT", () => {
    logInfo("\nInterrupted by user");
    cleanup();
    process.exit(130); // Bash convention: 128 + 2 = 130
  });

  // Handle SIGTERM
  process.on("SIGTERM", () => {
    logInfo("Received SIGTERM, cleaning up...");
    cleanup();
    process.exit(143); // Bash convention: 128 + 15 = 143
  });

  // Handle SIGHUP (terminal disconnect)
  process.on("SIGHUP", () => {
    logInfo("Terminal disconnected, cleaning up...");
    cleanup();
    process.exit(129); // Bash convention: 128 + 1 = 129
  });
}

/**
 * Cleanup function for signal handlers
 */
function cleanup(): void {
  // Kill all child processes
  killAllChildProcesses();
}

/**
 * Main entry point
 */
async function main(): Promise<number> {
  // Parse command line arguments
  const program = new Command();

  program
    .name("vibe-model")
    .description("Autonomous R&D agent using V-Model methodology")
    .version("1.0.0");

  program
    .argument("[goal]", "Start a new journey with this goal")
    .option("-v, --verbose", "Enable verbose output")
    .option("-g, --gemini", "Use Gemini as primary AI")
    .option("--no-consult", "Disable Gemini consultation")
    .option("--project-dir <path>", "Specify project directory")
    .option("--config <path>", "Specify config file")
    .option("--no-push", "Keep delivery local-only; do not perform any orchestrator-level push")
    .option("--commit-interval <n>", "Commit every N iterations", "1")
    .option("--autonomous", "Run without human-in-the-loop pauses")
    .option("--review", "Enable sub-agent reviews after each phase")
    .option("--new", "Overwrite an existing prd.md that already has milestones (discard the in-progress plan)")
    .action(async (goal, options) => {
      try {
        // Initialize configuration
        await initializeConfig({
          verbose: options.verbose,
          aiProvider: options.gemini ? "gemini" : "claude",
          consultGemini: options.consult !== false,
          projectDir: options.projectDir,
          noPush: options.noPush || false,
          commitInterval: parseInt(options.commitInterval, 10),
          autonomous: options.autonomous || false,
          hilMode: !options.autonomous,
          reviewEnabled: options.review || false,
        }, options.config);

        // Setup signal handlers
        setupSignalHandlers();

        // Ensure required directories
        await ensureDirectories();

        if (!goal) {
          // Continue active milestone
          const prdPath = getPRDPath(config.projectDir);
          if (!existsSync(prdPath)) {
            logError("No active PRD found");
            logInfo("Start a new project with: vibe-model \"your goal\"");
            process.exitCode = 1;
            return;
          }
          await milestoneLoop(prdPath);
          return;
        }

        // Footgun guard: createPRD unconditionally overwrites prd.md. Refuse to clobber an
        // existing plan that already has milestones unless --new is passed. To RESUME an
        // existing plan, run `vibe-model` with NO goal argument.
        {
          const existingPrdPath = getPRDPath(config.projectDir);
          if (existsSync(existingPrdPath)) {
            const existing = await readPRD(config.projectDir);
            if (existing.milestones.length > 0) {
              if (!options.new) {
                logError(
                  `Refusing to overwrite ${existingPrdPath} (already has ${existing.milestones.length} milestone(s)).`,
                );
                logInfo("To RESUME the existing plan, run:  vibe-model   (no goal)");
                logInfo("To DISCARD it and start fresh, add: --new");
                process.exitCode = 1;
                return;
              }
              logWarning(
                `--new: overwriting existing prd.md (${existing.milestones.length} milestone(s) will be discarded).`,
              );
            }
          }
        }

        // Create new PRD and start milestone loop
        logInfo(`Creating PRD for goal: ${goal}`);
        const prdPath = createPRD(config.projectDir, goal);
        logSuccess("PRD created! Starting loop...");
        await milestoneLoop(prdPath);
        return;
      } catch (error) {
        if (error instanceof VModelError) {
          if (error.recoverable) {
            logWarning(`Recoverable error: ${error.message}`);
          } else {
            logError(error.message);
            process.exitCode = error.exitCode;
          }
        } else if (error instanceof Error) {
          logError(error.message);
          process.exitCode = 1;
        } else {
          process.exitCode = 1;
        }
      }
    });

  // Add subcommands
  program
    .command("status")
    .description("Show status of milestones")
    .action(async () => {
      await initializeConfig();
      await handleMilestoneStatus();
    });

  program
    .command("continue")
    .description("Resume milestone from WAITING_FOR_USER")
    .action(async () => {
      await initializeConfig();
      const prdPath = getPRDPath(config.projectDir);

      if (!existsSync(prdPath)) {
        logError("No active milestone system found");
        logInfo("Start a new project with: vibe-model \"your goal\"");
        process.exitCode = 1;
        return;
      }

      await continueMilestone(prdPath);
    });

  program
    .command("hint <message>")
    .description("Add a hint to the active milestone")
    .action(async (message) => {
      await initializeConfig();
      await handleMilestoneHint(message);
    });

  await program.parseAsync(process.argv);

  return 0;
}

// Run main
main().then(
  () => {
    // Exit with the code set by process.exitCode during command execution
    process.exit(process.exitCode ?? 0);
  },
  (error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  }
);
