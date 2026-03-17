/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

import { promises as fs } from "fs";

// Simple cache for journey file contents
const journeyCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export async function readJourneyFile(journeyFile: string): Promise<string> {
  const now = Date.now();
  const cached = journeyCache.get(journeyFile);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }

  const content = await fs.readFile(journeyFile, "utf-8");
  journeyCache.set(journeyFile, { content, timestamp: now });
  return content;
}

export async function getJourneyField(journeyFile: string, field: string): Promise<string> {
  const content = await readJourneyFile(journeyFile);
  const match = content.match(new RegExp(`^- ${field}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : "";
}

export async function getJourneySection(journeyFile: string, section: string): Promise<string> {
  const content = await readJourneyFile(journeyFile);
  const sectionPattern = new RegExp(`## ${section}\\n([\\s\\S]+?)\\n## `);
  const match = content.match(sectionPattern);
  return match ? match[1].trim() : "";
}

export function clearJourneyCache(journeyFile?: string): void {
  if (journeyFile) {
    journeyCache.delete(journeyFile);
  } else {
    journeyCache.clear();
  }
}
