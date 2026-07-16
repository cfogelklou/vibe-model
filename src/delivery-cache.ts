/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Delivery summary caching system.
 * Extracts, caches, and loads milestone delivery summaries.
 */

import { promises as fs, mkdirSync } from "fs";
import path from "path";
import type { DeliverySummary } from "./types";
import { VIBE_MODEL_DIR, sanitizeName, DELIVERY_CACHE_DIR } from "./constants";

/**
 * Escape special regex characters in a string so it can be used literally
 * inside a RegExp constructor.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract bullet ("- " / "* ") list items from a "## {section}" block.
 * Returns trimmed items (with their bullet marker preserved), empty if the
 * section is absent. Uses the same heading-aware pattern as milestone.ts so it
 * captures the full multi-line section (not just the first line).
 */
function parseBulletSection(content: string, sectionName: string): string[] {
  const regex = new RegExp(
    `(?:^|\\n)## ${escapeRegex(sectionName)}\\n?([\\s\\S]*?)(?=\\n## |$)`
  );
  const match = regex.exec(content);
  if (!match) return [];
  const items: string[] = [];
  for (const raw of match[1].split("\n")) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      items.push(trimmed);
    }
  }
  return items;
}

/**
 * Returns the full path to a delivery summary file.
 */
export function getDeliverySummaryPath(
  projectDir: string,
  milestoneId: number,
  milestoneName: string
): string {
  const fileName = `${milestoneId}-${sanitizeName(milestoneName)}-delivery-summary.md`;
  return path.join(projectDir, VIBE_MODEL_DIR, DELIVERY_CACHE_DIR, fileName);
}

/**
 * Extracts delivery summary from a completed milestone file.
 * Uses multi-strategy extraction to handle different AI formats.
 */
export async function extractDeliverySummary(
  projectDir: string,
  milestoneId: number,
  milestoneName: string
): Promise<DeliverySummary> {
  const milestonePath = path.join(
    projectDir,
    "vibe-model",
    "milestones",
    `${String(milestoneId).padStart(2, "0")}-${sanitizeName(milestoneName)}.md`
  );

  const content = await fs.readFile(milestonePath, "utf-8");

  // Strategy 1: Extract "## Delivery" section for bullet items
  const deliverablesMatch = content.match(
    /## Delivery\s*\n((?:\s*[-*]\s+.+\n?)+)/i
  );
  let deliverables: string[] = [];
  if (deliverablesMatch) {
    const lines = deliverablesMatch[1].split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && (trimmed.startsWith("-") || trimmed.startsWith("*"))) {
        deliverables.push(trimmed);
      }
    }
  }

  // Strategy 2: Look for "- Deliverable:" format
  if (deliverables.length === 0) {
    const deliverableRegex = /-\s*Deliverable:\s*.+/gi;
    const matches = content.matchAll(deliverableRegex);
    for (const match of matches) {
      deliverables.push(match[0]);
    }
  }

  // Strategy 3: Extract entire Delivery section as fallback
  if (deliverables.length === 0) {
    const deliveryMatch = content.match(/## Delivery\s*\n([\s\S]+?)(?=\n## |$)/i);
    if (deliveryMatch) {
      deliverables = [deliveryMatch[1].trim()];
    }
  }

  // Extract Learnings section
  const learningsMatch = content.match(/## Learnings\s*\n([\s\S]+?)(?=\n## |$)/i);
  const learningsText = learningsMatch ? learningsMatch[1].trim() : "";

  // Parse key learnings
  const keyLearnings: string[] = [];
  const learningLines = learningsText.split("\n");
  for (const line of learningLines) {
    const trimmed = line.trim();
    if (trimmed && (trimmed.startsWith("-") || trimmed.startsWith("*"))) {
      keyLearnings.push(trimmed);
    }
  }

  return {
    milestoneId,
    milestoneName,
    deliverables,
    timestamp: new Date().toISOString(),
    keyLearnings,
  };
}

/**
 * Caches a delivery summary to disk.
 * Creates the delivery-summaries directory if needed.
 */
export async function cacheDeliverySummary(
  projectDir: string,
  milestoneId: number,
  milestoneName: string
): Promise<void> {
  const summary = await extractDeliverySummary(
    projectDir,
    milestoneId,
    milestoneName
  );
  const summaryPath = getDeliverySummaryPath(
    projectDir,
    milestoneId,
    milestoneName
  );

  // Ensure directory exists
  const dir = path.dirname(summaryPath);
  mkdirSync(dir, { recursive: true });

  // Write summary as markdown
  let content = `# Delivery Summary: Milestone ${milestoneId} - ${milestoneName}\n\n`;
  content += `**Timestamp:** ${summary.timestamp}\n\n`;
  content += `## Deliverables\n\n`;
  for (const item of summary.deliverables) {
    content += `${item}\n`;
  }
  content += `\n## Key Learnings\n\n`;
  for (const learning of summary.keyLearnings) {
    content += `${learning}\n`;
  }

  await fs.writeFile(summaryPath, content);
}

/**
 * Loads all cached delivery summaries for previous milestones.
 * Filters by milestone ID and sorts by ID.
 */
export async function loadDeliverySummaries(
  projectDir: string,
  currentMilestoneId: number
): Promise<DeliverySummary[]> {
  const cacheDir = path.join(projectDir, VIBE_MODEL_DIR, DELIVERY_CACHE_DIR);

  try {
    const files = await fs.readdir(cacheDir);
    const summaries: DeliverySummary[] = [];

    for (const file of files) {
      if (!file.endsWith("-delivery-summary.md")) continue;

      const match = file.match(/^(\d+)-(.+)-delivery-summary\.md$/);
      if (!match) continue;

      const id = parseInt(match[1], 10);
      // Only load previous milestones
      if (id >= currentMilestoneId) continue;

      const summaryPath = path.join(cacheDir, file);
      const content = await fs.readFile(summaryPath, "utf-8");

      // Parse the title, cached timestamp, and the actual Deliverables +
      // Key Learnings content (previously discarded as empty arrays, which
      // silently dropped all cross-milestone knowledge transfer).
      const titleMatch = content.match(
        /^# Delivery Summary: Milestone (\d+) - (.+)$/m
      );
      if (!titleMatch) continue;

      const tsMatch = content.match(/^\*\*Timestamp:\*\*\s*(.+)$/m);
      summaries.push({
        milestoneId: parseInt(titleMatch[1], 10),
        milestoneName: titleMatch[2].trim(),
        deliverables: parseBulletSection(content, "Deliverables"),
        timestamp: tsMatch ? tsMatch[1].trim() : new Date().toISOString(),
        keyLearnings: parseBulletSection(content, "Key Learnings"),
      });
    }

    // Sort by milestone ID
    return summaries.sort((a, b) => a.milestoneId - b.milestoneId);
  } catch {
    // Cache directory doesn't exist yet
    return [];
  }
}

/**
 * Formats delivery summaries for prompt injection.
 */
export function formatDeliverySummariesForPrompt(
  summaries: DeliverySummary[]
): string {
  if (summaries.length === 0) {
    return "";
  }

  return summaries
    .map((s) => {
      let block = `### Milestone ${s.milestoneId}: ${s.milestoneName}`;
      if (s.deliverables.length > 0) {
        const items = s.deliverables
          .map((d) => `- ${d.replace(/^[-*]\s+/, "")}`)
          .join("\n");
        block += `\n**Deliverables:**\n${items}`;
      }
      if (s.keyLearnings.length > 0) {
        const items = s.keyLearnings
          .map((l) => `- ${l.replace(/^[-*]\s+/, "")}`)
          .join("\n");
        block += `\n**Key Learnings:**\n${items}`;
      }
      return block;
    })
    .join("\n\n");
}
