/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * PRD review system.
 * Runs specialist reviews (UX, Architecture, Testability) on generated PRDs.
 */

import { promises as fs } from "fs";
import path from "path";
import type { PRDReview, PRDReviewResult } from "./types";
import { runReview } from "./ai-provider";
import { readPRD } from "./prd";
import { logInfo, logSuccess, logWarning } from "./logger";
import { PRD_REVIEWERS, type ReviewerType } from "./constants";

/**
 * Runs PRD review with all specialist reviewers.
 */
export async function runPRDReview(
  projectDir: string,
  prdContent: string,
  iteration: number
): Promise<PRDReview> {
  const results: PRDReviewResult[] = [];

  logInfo(`Running PRD review iteration ${iteration}...`);

  for (const reviewerType of PRD_REVIEWERS) {
    logInfo(`Running ${reviewerType} review...`);

    const prompt = await generatePRDReviewPrompt(
      projectDir,
      
      reviewerType as "architecture" | "testability" | "ux",
      prdContent,
      iteration
    );

    const result = await runReview(reviewerType as ReviewerType, prompt);

    // Convert ReviewResult to PRDReviewResult with scoring
    const score = result.pass ? 2 : -1;
    results.push({
      reviewer: reviewerType as "architecture" | "testability" | "ux",
      score,
      findings: result.findings,
    });

    if (score === -1) {
      logWarning(`${reviewerType} review: BLOCKING issues found`);
    } else {
      logSuccess(`${reviewerType} review: APPROVED`);
    }
  }

  const overallApproved = results.every((r) => r.score === 2);

  return {
    results,
    overallApproved,
    iteration,
  };
}

/**
 * Generates PRD review prompt for a specific reviewer.
 */
async function generatePRDReviewPrompt(
  projectDir: string,
  reviewerType: "architecture" | "testability" | "ux",
  prdContent: string,
  iteration: number
): Promise<string> {
  const prd = await readPRD(projectDir);

  const reviewerPrompts: Record<
    "architecture" | "testability" | "ux",
    string
  > = {
    architecture: `You are an architecture reviewer evaluating a PRD. Review for:
- Tech stack appropriateness
- Architecture clarity and soundness
- Milestone decomposition logic
- Dependency ordering between milestones

Score +2 if approved, -1 if blocking issues found.`,

    testability: `You are a testability reviewer evaluating a PRD. Review for:
- Are milestones verifiable and testable?
- Is the first milestone an MVP with testing infrastructure?
- Can acceptance criteria be defined for each milestone?
- Is there a clear testing strategy progression?

Score +2 if approved, -1 if blocking issues found.`,

    ux: `You are a UX reviewer evaluating a PRD. Review for:
- User journey clarity (for user-facing goals)
- Accessibility considerations
- Error handling and edge cases
- Overall user experience quality

Score +2 if approved, -1 if blocking issues found.`,
  };

  return `${reviewerPrompts[reviewerType]}

## PRD Under Review

**Goal:** ${prd.goal}

**Tech Stack:**
${prd.techStack}

**Architecture Overview:**
${prd.architectureOverview}

**Milestones:**
${prd.milestones.map((m) => `- ${m.id}: ${m.name} - ${m.description}`).join("\n")}

## Review Instructions

This is review iteration ${iteration}.

1. Evaluate the PRD against your review criteria (see system prompt above).
2. List specific findings with severity (BLOCKER, MAJOR, MINOR).
3. Return your verdict with score:
   - SCORE: +2 (approve — no blockers or majors. Minor findings are acceptable and do not block approval.)
   - SCORE: -1 (block — one or more BLOCKER or MAJOR issues that must be fixed before proceeding)

   **IMPORTANT**: If all findings are MINOR severity, you MUST score +2 (approve). Only BLOCKER or MAJOR findings justify a -1 score.

### Output Format:

\`\`\`
SCORE: +2 or -1

## Findings
- [BLOCKER/MAJOR/MINOR] Description of finding with specific reference.
- [BLOCKER/MAJOR/MINOR] Another finding.
\`\`\`

Be thorough but concise. Focus on your specialty area.
`;
}

/**
 * Writes PRD review findings to prd-review.md.
 */
export async function writePRDReviewFindings(
  projectDir: string,
  review: PRDReview
): Promise<void> {
  const reviewPath = path.join(projectDir, "vibe-model", "prd-review.md");

  let content = `# PRD Review - Iteration ${review.iteration}\n\n`;
  content += `**Overall Status:** ${
    review.overallApproved ? "✅ APPROVED" : "❌ NEEDS REVISION"
  }\n\n`;
  content += `**Timestamp:** ${new Date().toISOString()}\n\n`;

  for (const result of review.results) {
    const emoji = result.score === 2 ? "✅" : "❌";
    content += `## ${result.reviewer.toUpperCase()} Review ${emoji}\n\n`;
    content += `**Score:** ${result.score > 0 ? "+" : ""}${result.score}\n\n`;

    if (result.findings.length > 0) {
      content += `### Findings\n\n`;
      for (const finding of result.findings) {
        content += `- ${finding}\n`;
      }
      content += `\n`;
    } else {
      content += `No findings.\n\n`;
    }
  }

  await fs.writeFile(reviewPath, content);
  logSuccess(`PRD review findings written to ${reviewPath}`);
}
