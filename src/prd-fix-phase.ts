/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * PRD fix phase — author agent responds to PRD review feedback.
 */

import { promises as fs } from "fs";
import path from "path";
import { runAIWithPrompt } from "./ai-provider";
import { config } from "./config";
import { readPRD } from "./prd";
import { logInfo, logSuccess } from "./logger";

/**
 * Generates the PRD fix prompt.
 * Includes review findings and asks the author to respond.
 */
export async function generatePRDFixPrompt(
  projectDir: string,
  iteration: number
): Promise<string> {
  const prd = await readPRD(projectDir);
  const reviewPath = path.join(projectDir, "vibe-model", "prd-review.md");
  const reviewContent = await fs.readFile(reviewPath, "utf-8");

  return `You are the author of the PRD. This is PRD review iteration ${iteration}.

## Current PRD

**Goal:** ${prd.goal}

**Tech Stack:**
${prd.techStack}

**Architecture Overview:**
${prd.architectureOverview}

**Milestones:**
${prd.milestones.map((m) => `- ${m.id}: ${m.name} - ${m.description}`).join("\n")}

## PRD Review Findings

${reviewContent}

## Your Task

Address the review findings above. For each finding:

1. **Implement valid suggestions** — update the PRD accordingly
2. **Add \`## Review Response\` section** to prd.md for any items you defer or disagree with
3. **Commit your changes** after addressing the findings

### Rules:

- Be respectful of the reviewer's expertise
- If you disagree with a finding, explain why in the Review Response section
- Focus on resolving BLOCKER and MAJOR issues first
- Minor issues can be deferred if they don't affect the core architecture

### Output:

After addressing the findings, write the updated PRD to \`prd.md\`.
`;
}

/**
 * Runs the PRD fix phase — author responds to review feedback.
 */
export async function runPRDFixPhase(
  projectDir: string,
  iteration: number
): Promise<void> {
  logInfo("Running PRD fix phase...");

  const prompt = await generatePRDFixPrompt(projectDir, iteration);

  // Write prompt to temp file
  const tempPrompt = path.join(
    config.projectDir,
    "vibe-model",
    `prd-fix-iteration-${iteration}.md`
  );

  await fs.writeFile(tempPrompt, prompt);

  if (config.verbose) {
    logInfo("--- PRD Fix Prompt ---");
    process.stderr.write(prompt);
    logInfo("--- End of prompt ---");
  }

  // Run AI with the fix prompt
  try {
    const exitCode = await runAIWithPrompt(tempPrompt);

    // Re-raise SIGINT
    if (exitCode === 130) {
      process.exit(130);
    }

    logSuccess(`PRD fix iteration ${iteration} completed`);
  } finally {
    try {
      await fs.unlink(tempPrompt);
    } catch {
      // Temp file cleanup failed, ignore
    }
  }
}
