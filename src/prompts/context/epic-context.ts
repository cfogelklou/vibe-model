/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Epic context filtering for state-specific prompts.
 * Extracts only the relevant sections from the epic file based on current state.
 */

import { VModelState } from "../../types";

/**
 * Story information extracted from epic
 */
interface StoryInfo {
  title: string;
  section: string;
}

/**
 * Parse epic file to extract story information
 */
function parseEpicStories(epicContent: string): StoryInfo[] {
  const stories: StoryInfo[] = [];
  const storyRegex = /### Story S(\d+): ([^\n]+)\n([\s\S]+?)(?=\n### Story S|\n##[^#]|$)/g;
  let match;

  while ((match = storyRegex.exec(epicContent)) !== null) {
    stories.push({
      title: match[2],
      section: match[0],
    });
  }

  return stories;
}

/**
 * Extract current story from epic based on journey state
 */
function extractCurrentStory(epicContent: string): string {
  const stories = parseEpicStories(epicContent);

  if (stories.length === 0) {
    return "";
  }

  // Find the first IN_PROGRESS story, or the first story if none are in progress
  const inProgressStory = stories.find((s) =>
    s.section.includes("Status: IN_PROGRESS")
  );

  const storyToExtract = inProgressStory || stories[0];

  return `### Story ${storyToExtract.title}\n${storyToExtract.section}`;
}

/**
 * Extract epic summary (header and decomposition table)
 */
function extractEpicSummary(epicContent: string): string {
  const lines = epicContent.split("\n");
  const summaryLines: string[] = [];

  for (const line of lines) {
    summaryLines.push(line);
    // Stop after the Implementation Progress table
    if (line.includes("## Learnings")) {
      break;
    }
  }

  return summaryLines.join("\n");
}

/**
 * Extract research notes from epic file (unused but kept for future use)
 */
function _extractEpicResearch(epicContent: string, phase: VModelState): string {
  const phaseMap: Record<VModelState, string> = {
    [VModelState.ARCH_DESIGN]: "ARCH_DESIGN",
    [VModelState.MODULE_DESIGN]: "MODULE_DESIGN",
    [VModelState.IMPLEMENTATION]: "MODULE_DESIGN",
    [VModelState.UNIT_TEST]: "MODULE_DESIGN",
    [VModelState.INTEGRATION_TEST]: "MODULE_DESIGN",
    [VModelState.REQUIREMENTS]: "",
    [VModelState.SYSTEM_DESIGN]: "",
    [VModelState.SYSTEM_TEST]: "",
    [VModelState.ACCEPTANCE_TEST]: "",
    [VModelState.PROTOTYPING]: "MODULE_DESIGN",
    [VModelState.WAITING_FOR_USER]: "",
    [VModelState.CONSOLIDATING]: "",
    [VModelState.DESIGN_REVIEW]: "",
    [VModelState.COMPLETE]: "",
    [VModelState.BLOCKED]: "",
    [VModelState.REVIEWING]: "",
    [VModelState.ARCHIVING]: "",
    [VModelState.PIVOTING]: "",
    [VModelState.REFLECTING]: "",
  };

  const phaseName = phaseMap[phase];
  if (!phaseName) {
    return "";
  }

  const regex = new RegExp(
    `### ${phaseName} Phase Research\\n([\\s\\S]+?)(?=\\n### |\\n##|$)`,
    "m"
  );
  const match = epicContent.match(regex);

  return match ? match[1].trim() : "";
}

/**
 * Filter epic context based on current state
 *
 * Context requirements per state:
 * - REQUIREMENTS: None
 * - SYSTEM_DESIGN: Epic list only (table, not full content)
 * - ARCH_DESIGN: Full epic file
 * - MODULE_DESIGN: Full epic file
 * - IMPLEMENTATION: Current story section only
 * - TESTING: Current story + test results
 * - PROTOTYPING: Current story section only
 * - DESIGN_REVIEW: Epic file (if epic-related phase)
 * - WAITING_FOR_USER: None
 * - CONSOLIDATING: None
 * - PIVOTING: None
 * - REFLECTING: None
 * - ARCHIVING: None
 * - REVIEWING: None
 */
export function filterEpicContext(
  epicContent: string,
  state: VModelState,
  currentStory?: string
): string {
  if (!epicContent) {
    return "";
  }

  switch (state) {
    case VModelState.REQUIREMENTS:
    case VModelState.WAITING_FOR_USER:
    case VModelState.CONSOLIDATING:
    case VModelState.PIVOTING:
    case VModelState.REFLECTING:
    case VModelState.ARCHIVING:
    case VModelState.REVIEWING:
    case VModelState.COMPLETE:
    case VModelState.BLOCKED:
      // These states don't need epic context
      return "";

    case VModelState.SYSTEM_DESIGN:
      // SYSTEM_DESIGN: Epic list only (table)
      return extractEpicSummary(epicContent);

    case VModelState.ARCH_DESIGN:
    case VModelState.MODULE_DESIGN:
      // ARCH_DESIGN/MODULE_DESIGN: Full epic file
      return epicContent;

    case VModelState.IMPLEMENTATION:
    case VModelState.PROTOTYPING:
      // IMPLEMENTATION/PROTOTYPING: Current story only
      if (currentStory) {
        return `## Current Story\n${currentStory}`;
      }
      return `## Current Story\n${extractCurrentStory(epicContent)}`;

    case VModelState.UNIT_TEST:
    case VModelState.INTEGRATION_TEST:
    case VModelState.SYSTEM_TEST:
    case VModelState.ACCEPTANCE_TEST: {
      // TESTING: Current story + test results
      const currentStorySection = currentStory || extractCurrentStory(epicContent);
      return `## Current Story\n${currentStorySection}`;
    }

    case VModelState.DESIGN_REVIEW:
      // DESIGN_REVIEW: Epic file if we're reviewing epic phases
      // (The actual design content is extracted separately)
      return epicContent;

    default:
      return "";
  }
}

/**
 * Extract current story title from epic file
 */
export function extractCurrentStoryTitle(epicContent: string): string {
  const stories = parseEpicStories(epicContent);

  const inProgressStory = stories.find((s) =>
    s.section.includes("Status: IN_PROGRESS")
  );

  return inProgressStory?.title || stories[0]?.title || "";
}

/**
 * Get epic summary for state transitions
 */
export function getEpicSummary(epicContent: string): string {
  const epicMatch = epicContent.match(/# Epic E\d+: ([^\n]+)/);
  const epicTitle = epicMatch ? epicMatch[1] : "Unknown Epic";

  const stories = parseEpicStories(epicContent);
  const totalStories = stories.length;
  const completedStories = stories.filter((s) =>
    s.section.includes("Status: COMPLETE")
  ).length;

  return `Epic: ${epicTitle} (${completedStories}/${totalStories} stories complete)`;
}
