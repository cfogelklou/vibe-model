/**
 * Lightweight UX evaluator for generated HTML mockups.
 * Uses deterministic heuristics to provide "fresh eyes" feedback.
 */

import { promises as fs } from "fs";
import { appendToFile } from "./file-utils";
import { logWarning } from "./logger";

export interface DumbUserResult {
  success: boolean;
  confusionPoints: string[];
  suggestions: string[];
  screenshots: string[];
}

export async function runDumbUserTest(
  mockupPath: string,
  userGoal: string
): Promise<DumbUserResult> {
  let html = "";
  try {
    html = await fs.readFile(mockupPath, "utf-8");
  } catch {
    return {
      success: false,
      confusionPoints: [`Mockup file not found: ${mockupPath}`],
      suggestions: ["Generate the mockup HTML file before running UX evaluation."],
      screenshots: [],
    };
  }

  const lower = html.toLowerCase();
  const confusionPoints: string[] = [];
  const suggestions: string[] = [];

  const hasHeading = /<h1[\s>]|<h2[\s>]/i.test(html);
  const hasButton = /<button[\s>]/i.test(html);
  const hasFormControl = /<input[\s>]|<textarea[\s>]|<select[\s>]/i.test(html);
  const hasLandmarks = /<main[\s>]|<nav[\s>]|<header[\s>]/i.test(html);
  const hasTodoSemantics = /todo|task|add item|add task|complete/i.test(lower);

  if (!hasHeading) {
    confusionPoints.push("No obvious page heading found.");
    suggestions.push("Add a clear primary heading so users understand the screen purpose.");
  }

  if (!hasButton) {
    confusionPoints.push("No button detected, primary action may be unclear.");
    suggestions.push("Add a visible call-to-action button for key user flows.");
  }

  if (!hasFormControl) {
    confusionPoints.push("No form fields found; input flow may be incomplete.");
    suggestions.push("Include at least one form control for user interaction.");
  }

  if (!hasLandmarks) {
    suggestions.push("Consider semantic landmarks (`main`, `nav`, `header`) for structure.");
  }

  if (/todo|task list|todolist/i.test(userGoal) && !hasTodoSemantics) {
    confusionPoints.push("Todo/task language is not visible in the UI.");
    suggestions.push("Use explicit todo/task labels so the app intent is obvious.");
  }

  return {
    success: confusionPoints.length === 0,
    confusionPoints,
    suggestions,
    screenshots: [],
  };
}

export async function writeDumbUserFeedback(
  journeyFile: string,
  result: DumbUserResult
): Promise<void> {
  const lines: string[] = [];
  lines.push("\n## UX Dumb User Feedback");
  lines.push(`- Success: ${result.success ? "yes" : "no"}`);

  if (result.confusionPoints.length > 0) {
    lines.push("- Confusion Points:");
    for (const point of result.confusionPoints) {
      lines.push(`  - ${point}`);
    }
  }

  if (result.suggestions.length > 0) {
    lines.push("- Suggestions:");
    for (const suggestion of result.suggestions) {
      lines.push(`  - ${suggestion}`);
    }
  }

  if (result.screenshots.length > 0) {
    lines.push("- Screenshots:");
    for (const shot of result.screenshots) {
      lines.push(`  - ${shot}`);
    }
  } else {
    logWarning("Playwright screenshots are not available; stored textual UX feedback only.");
  }

  await appendToFile(journeyFile, `${lines.join("\n")}\n`);
}
