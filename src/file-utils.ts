/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Portable file utilities that work consistently across macOS and Linux.
 * Replaces bash sed helpers with TypeScript implementations.
 */

import { promises as fs, existsSync } from "fs";
import { clearJourneyCache } from "./journey-reader";

/**
 * Strip ANSI escape sequences from text.
 * Used before writing content to journey/spec files.
 */
export function stripAnsi(text: string): string {
  // Remove ANSI escape codes
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Portable in-place sed replacement.
 * Works on both macOS (BSD sed) and Linux (GNU sed).
 *
 * @param file - Path to the file to modify
 * @param pattern - Regular expression pattern to search for
 * @param replacement - Replacement string (supports $1, $2, etc. for capture groups)
 */
export async function sedInplace(
  file: string,
  pattern: RegExp | string,
  replacement: string
): Promise<void> {
  const content = await fs.readFile(file, "utf-8");
  const regex = typeof pattern === "string" ? new RegExp(pattern, "g") : pattern;
  const updated = content.replace(regex, replacement);
  await fs.writeFile(file, updated);
  clearJourneyCache(file);
}

/**
 * Insert text after line N (1-indexed).
 *
 * @param file - Path to the file to modify
 * @param lineNum - Line number after which to insert (1-indexed)
 * @param text - Text to insert
 */
export async function insertAfterLine(
  file: string,
  lineNum: number,
  text: string
): Promise<void> {
  const content = await fs.readFile(file, "utf-8");
  const lines = content.split("\n");
  lines.splice(lineNum, 0, text); // Insert after lineNum (0-indexed)
  await fs.writeFile(file, lines.join("\n"));
  clearJourneyCache(file);
}

/**
 * Insert text before line N (1-indexed).
 *
 * @param file - Path to the file to modify
 * @param lineNum - Line number before which to insert (1-indexed)
 * @param text - Text to insert
 */
export async function insertBeforeLine(
  file: string,
  lineNum: number,
  text: string
): Promise<void> {
  const content = await fs.readFile(file, "utf-8");
  const lines = content.split("\n");
  lines.splice(lineNum - 1, 0, text); // Insert before lineNum (convert to 0-indexed)
  await fs.writeFile(file, lines.join("\n"));
  clearJourneyCache(file);
}

/**
 * Append content to file, stripping ANSI codes first.
 * This ensures journey files have clean text without terminal formatting.
 *
 * @param file - Path to the file to append to
 * @param content - Content to append (ANSI codes will be stripped)
 */
export async function appendToFile(file: string, content: string): Promise<void> {
  const cleanContent = stripAnsi(content);
  await fs.appendFile(file, cleanContent);
  clearJourneyCache(file);
}

/**
 * Find line number of first occurrence of pattern.
 * Returns -1 if pattern not found.
 *
 * @param file - Path to the file to search
 * @param pattern - Regular expression pattern to search for
 */
export async function findLineNumber(
  file: string,
  pattern: RegExp
): Promise<number> {
  const content = await fs.readFile(file, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return i + 1; // Return 1-indexed line number
    }
  }

  return -1; // Not found
}

/**
 * Extract section content between two markers.
 *
 * @param file - Path to the file to read
 * @param startPattern - Pattern that marks the start of the section
 * @param endPattern - Pattern that marks the end of the section (or end of file if not found)
 */
export async function extractSection(
  file: string,
  startPattern: RegExp,
  endPattern: RegExp
): Promise<string> {
  const content = await fs.readFile(file, "utf-8");
  const lines = content.split("\n");

  let startLine = -1;
  let endLine = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (startLine === -1 && startPattern.test(lines[i])) {
      startLine = i;
    } else if (startLine !== -1 && endPattern.test(lines[i])) {
      endLine = i;
      break;
    }
  }

  if (startLine === -1) {
    return ""; // Section not found
  }

  return lines.slice(startLine, endLine).join("\n");
}

/**
 * Check if a file exists.
 * Synchronous version for convenience.
 */
export function exists(file: string): boolean {
  try {
    return existsSync(file);
  } catch {
    return false;
  }
}
