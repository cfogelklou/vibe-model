#!/usr/bin/env bun
/**
 * CLI entry point for V-Model autonomous R&D agent.
 * Handles command-line argument parsing and command routing.
 */

import { Command } from "commander";
import { promises as fs } from "fs";
import path from "path";
import { VModelError } from "./types.js";
import { config, initializeConfig } from "./config.js";
import {
  logInfo,
  logSuccess,
  logWarning,
  logError,
} from "./logger.js";
import {
  createJourneyFile,
  findActiveJourney,
  listJourneys,
  addUserHint,
  getJourneyState,
  setJourneyState,
  getCurrentApproach,
  setPreviousState,
} from "./journey.js";
import { mainLoop } from "./main-loop.js";
import {
  rollbackToCheckpoint,
  listCheckpoints,
} from "./checkpoint.js";
import { killAllChildProcesses } from "./ai-provider.js";


/**
 * Ensure required directories exist
 */
async function ensureDirectories(): Promise<void> {
  const vModelDir = path.join(config.projectDir, "v_model");
  const journeyDir = path.join(vModelDir, "journey");
  const prototypesDir = path.join(vModelDir, "prototypes");

  await fs.mkdir(journeyDir, { recursive: true });
  await fs.mkdir(prototypesDir, { recursive: true });
}

/**
 * Handle hint command
 */
async function handleHint(hint: string): Promise<void> {
  const activeJourney = await findActiveJourney();

  if (!activeJourney) {
    logError("No active journey found");
    logInfo("Create one with: v-model \"your goal\"");
    throw new VModelError("No active journey found", 1);
  }

  await addUserHint(activeJourney, hint);
  logSuccess("Hint added to journey");

  // If journey was waiting, unpause it
  const state = await getJourneyState(activeJourney);
  if (state === "WAITING_FOR_USER") {
    logInfo("Journey was waiting - resuming...");
    await setJourneyState(activeJourney, "REQUIREMENTS");
  }
}

/**
 * Handle pivot command
 */
async function handlePivot(): Promise<void> {
  const activeJourney = await findActiveJourney();

  if (!activeJourney) {
    logError("No active journey found");
    throw new VModelError("No active journey found", 1);
  }

  logInfo("Forcing pivot for active journey");
  await setJourneyState(activeJourney, "PIVOTING");
  logSuccess("Journey state set to PIVOTING");
}

/**
 * Handle reflect command
 */
async function handleReflect(): Promise<void> {
  const activeJourney = await findActiveJourney();

  if (!activeJourney) {
    logError("No active journey found");
    throw new VModelError("No active journey found", 1);
  }

  logInfo("Forcing reflection for active journey");
  await setJourneyState(activeJourney, "REFLECTING");
  logSuccess("Journey state set to REFLECTING");
}

/**
 * Handle archive command
 */
async function handleArchive(): Promise<void> {
  const activeJourney = await findActiveJourney();

  if (!activeJourney) {
    logError("No active journey found");
    throw new VModelError("No active journey found", 1);
  }

  logInfo("Archiving completed epics for active journey");

  const currentState = await getJourneyState(activeJourney);
  await setPreviousState(activeJourney, currentState);
  await setJourneyState(activeJourney, "ARCHIVING");
}

/**
 * Handle rollback command
 */
async function handleRollback(checkpointId?: string): Promise<void> {
  const activeJourney = await findActiveJourney();

  if (!activeJourney) {
    logError("No active journey found");
    throw new VModelError("No active journey found", 1);
  }

  const id = checkpointId ? parseInt(checkpointId, 10) : undefined;
  await rollbackToCheckpoint(activeJourney, id);
}

/**
 * Handle list-checkpoints command
 */
async function handleListCheckpoints(): Promise<void> {
  const activeJourney = await findActiveJourney();

  if (!activeJourney) {
    logError("No active journey found");
    throw new VModelError("No active journey found", 1);
  }

  const checkpoints = await listCheckpoints(activeJourney);

  console.log("\n\x1b[36m=== Checkpoints ===\x1b[0m\n");
  console.log("| ID | Tag                | Date       | Description |");
  console.log("| -- | ------------------ | ---------- | ----------- |");

  for (const checkpoint of checkpoints) {
    console.log(
      `| ${checkpoint.id} | ${checkpoint.tag} | ${checkpoint.date} | ${checkpoint.description} |`
    );
  }

  console.log();
}

/**
 * Handle status command
 */
async function handleStatus(): Promise<void> {
  await ensureDirectories();

  const journeys = await listJourneys();

  if (journeys.length === 0) {
    logInfo("No journeys found");
    logInfo("Start a new journey with: v-model \"your goal\"");
    return;
  }

  console.log("\n\x1b[36m=== Journeys ===\x1b[0m\n");

  for (const journey of journeys) {
    const isActive = journey.state !== "COMPLETE";
    const statusIcon = isActive ? "🔄" : "✅";
    console.log(`${statusIcon} ${journey.goal}`);
    console.log(`   State: ${journey.state}`);
    console.log(`   Progress: ${journey.progress}%`);

    if (isActive) {
      console.log(`   Current Epic: ${journey.currentEpic}`);
      console.log(`   Started: ${journey.started}`);
    }

    console.log();
  }

  // Show details for active journey
  const activeJourney = await findActiveJourney();

  if (activeJourney) {
    console.log("\x1b[33m=== Active Journey Details ===\x1b[0m");

    // Meta section
    console.log("\n\x1b[33mMeta:\x1b[0m");
    const content = await fs.readFile(activeJourney, "utf-8");
    const metaLines = content.match(/^- .+$/gm);
    if (metaLines) {
      for (const line of metaLines) {
        console.log(`  ${line.replace(/^- /, "")}`);
      }
    }

    // Checkpoints
    console.log("\n\x1b[33mCheckpoints:\x1b[0m");
    const checkpoints = await listCheckpoints(activeJourney);
    if (checkpoints.length > 0) {
      console.log("| ID | Tag | Date | Description |");
      console.log("| -- | --- | ---- | ----------- |");
      for (const checkpoint of checkpoints) {
        console.log(
          `| ${checkpoint.id} | ${checkpoint.tag} | ${checkpoint.date} | ${checkpoint.description} |`
        );
      }
    } else {
      console.log("  No checkpoints yet");
    }

    // Current approach
    console.log("\n\x1b[33mCurrent Approach:\x1b[0m");
    const approach = await getCurrentApproach(activeJourney);
    console.log(`  ${approach}`);

    // Pending questions
    const pendingQuestionsMatch = content.match(
      /## Pending Questions\n([\s\S]+?)\n## /
    );
    const pendingQuestions = pendingQuestionsMatch?.[1]
      .split("\n")
      .filter((line) => line.match(/^- \[ \] /))
      .join("\n");

    if (pendingQuestions) {
      console.log("\n\x1b[33mPending Questions:\x1b[0m");
      console.log(pendingQuestions);
    }
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

  // Remove any temp prompt files (would be done in actual implementation)
  // For now, just ensure journey file is in consistent state
}

/**
 * Main entry point
 */
async function main(): Promise<number> {
  // Parse command line arguments
  const program = new Command();

  program
    .name("v-model")
    .description("Autonomous R&D agent using V-Model methodology")
    .version("1.0.0");

  program
    .argument("[goal]", "Start a new journey with this goal")
    .option("-v, --verbose", "Enable verbose output")
    .option("-g, --gemini", "Use Gemini as primary AI")
    .option("--no-consult", "Disable Gemini consultation")
    .option("--project-dir <path>", "Specify project directory")
    .option("--config <path>", "Specify config file")
    .option("--no-push", "Disable auto-push after iterations")
    .option("--commit-interval <n>", "Commit every N iterations", "1")
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
        }, options.config);

        // Setup signal handlers
        setupSignalHandlers();

        // Ensure directories exist
        await ensureDirectories();

        // If no goal provided, continue active journey
        if (!goal) {
          const activeJourney = await findActiveJourney();

          if (!activeJourney) {
            logError("No active journey found");
            logInfo("Start a new journey with: v-model \"your goal\"");
            logInfo("Or check status with: v-model status");
            process.exitCode = 1;
            return;
          }

          await mainLoop(activeJourney);
          return;
        }

        // Create new journey
        logInfo(`Creating new journey for goal: ${goal}`);
        const journeyFile = await createJourneyFile(goal);

        if (!journeyFile) {
          logError("Failed to create journey file");
          process.exitCode = 1;
          return;
        }

        logSuccess("Journey created! Starting loop...");
        await mainLoop(journeyFile);
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
    .description("Show status of all journeys")
    .action(async () => {
      await initializeConfig();
      await handleStatus();
    });

  program
    .command("hint <message>")
    .description("Add a user hint to the journey")
    .action(async (message) => {
      await initializeConfig();
      await handleHint(message);
    });

  program
    .command("pivot")
    .description("Force pivot to next approach")
    .action(async () => {
      await initializeConfig();
      await handlePivot();
    });

  program
    .command("reflect")
    .description("Force reflection phase")
    .action(async () => {
      await initializeConfig();
      await handleReflect();
    });

  program
    .command("archive")
    .description("Archive completed epics")
    .action(async () => {
      await initializeConfig();
      await handleArchive();
    });

  program
    .command("rollback [id]")
    .description("Rollback to checkpoint")
    .action(async (id) => {
      await initializeConfig();
      await handleRollback(id);
    });

  program
    .command("list-checkpoints")
    .description("List all checkpoints")
    .action(async () => {
      await initializeConfig();
      await handleListCheckpoints();
    });

  await program.parseAsync(process.argv);

  return 0;
}

// Run main
main().then(
  (exitCode) => {
    process.exit(exitCode);
  },
  (error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  }
);
