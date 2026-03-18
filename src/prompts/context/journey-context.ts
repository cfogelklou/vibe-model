/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Journey context filtering for state-specific prompts.
 * Extracts only the relevant sections from the journey file based on current state.
 */

import { VModelState } from "../../types";

/**
 * Journey sections that can be extracted
 */
interface JourneySections {
  meta: string;
  userHints: string;
  architecture: string;
  approaches: string;
  epicDecomposition: string;
  researchNotes: string;
  learnings: string;
  pendingQuestions: string;
  checkpoints: string;
  fullContent: string;
}

/**
 * Parse journey file into structured sections
 */
function parseJourneySections(content: string): JourneySections {
  const sections: JourneySections = {
    meta: "",
    userHints: "",
    architecture: "",
    approaches: "",
    epicDecomposition: "",
    researchNotes: "",
    learnings: "",
    pendingQuestions: "",
    checkpoints: "",
    fullContent: content,
  };

  // Extract Meta section
  const metaMatch = content.match(/## Meta\n([\s\S]+?)\n## /);
  if (metaMatch) {
    sections.meta = metaMatch[1].trim();
  }

  // Extract User Hints section
  const hintsMatch = content.match(/## User Hints\n([\s\S]+?)\n## /);
  if (hintsMatch) {
    sections.userHints = hintsMatch[1].trim();
  }

  // Extract Architecture section
  const archMatch = content.match(/## Architecture\n([\s\S]+?)\n## /);
  if (archMatch) {
    sections.architecture = archMatch[1].trim();
  }

  // Extract Approaches section
  const approachesMatch = content.match(/## Approaches\n([\s\S]+?)\n## /);
  if (approachesMatch) {
    sections.approaches = approachesMatch[1].trim();
  }

  // Extract Epic Decomposition section
  const epicMatch = content.match(/## Epic Decomposition\n([\s\S]+?)\n## /);
  if (epicMatch) {
    sections.epicDecomposition = epicMatch[1].trim();
  }

  // Extract Research Notes section
  const researchMatch = content.match(/## Research Notes\n([\s\S]+?)\n## /);
  if (researchMatch) {
    sections.researchNotes = researchMatch[1].trim();
  }

  // Extract Learnings Log section
  const learningsMatch = content.match(/## Learnings Log\n([\s\S]+?)\n## /);
  if (learningsMatch) {
    sections.learnings = learningsMatch[1].trim();
  }

  // Extract Pending Questions section
  const questionsMatch = content.match(/## Pending Questions\n([\s\S]+?)\n## /);
  if (questionsMatch) {
    sections.pendingQuestions = questionsMatch[1].trim();
  }

  // Extract Checkpoints section
  const checkpointsMatch = content.match(/## Checkpoints\n([\s\S]+?)$/);
  if (checkpointsMatch) {
    sections.checkpoints = checkpointsMatch[1].trim();
  }

  return sections;
}

/**
 * Truncate learnings to most recent N entries
 */
function truncateLearnings(learnings: string, maxEntries: number = 5): string {
  const entries = learnings.split(/\n(?=-)/).filter((e) => e.trim());
  if (entries.length <= maxEntries) {
    return learnings;
  }
  const recent = entries.slice(-maxEntries);
  return `... (truncated, showing ${maxEntries} most recent)\n\n` + recent.join("\n");
}

/**
 * Filter research notes to only show recent/relevant entries
 */
function filterResearchNotes(researchNotes: string, currentState: VModelState): string {
  // For REQUIREMENTS and SYSTEM_DESIGN, show all research notes
  if (
    currentState === VModelState.REQUIREMENTS ||
    currentState === VModelState.SYSTEM_DESIGN
  ) {
    return researchNotes;
  }

  // For other states, show only headings to save space
  const lines = researchNotes.split("\n");
  const headings: string[] = [];
  for (const line of lines) {
    if (line.startsWith("###")) {
      headings.push(line);
    }
  }
  return headings.length > 0
    ? headings.join("\n") + "\n\n(Use journey.md for full research notes)"
    : "(No research notes available)";
}

/**
 * Filter journey context based on current state
 *
 * Context requirements per state:
 * - REQUIREMENTS: Meta + User Hints + Recent Research (last 5)
 * - SYSTEM_DESIGN: Meta + Architecture + Approaches + Epic Decomposition Table
 * - ARCH_DESIGN: Meta + Current Epic Summary
 * - MODULE_DESIGN: Meta + Current Epic Summary
 * - IMPLEMENTATION: Meta + Current Story
 * - TESTING: Meta + Test Requirements
 * - PROTOTYPING: Meta + Current Story
 * - DESIGN_REVIEW: Meta + Previous Phase marker
 * - WAITING_FOR_USER: Meta + Pending Questions
 * - CONSOLIDATING: Meta + Learnings Summary
 * - PIVOTING: Meta + All Approaches
 * - REFLECTING: Meta + Learnings + Checkpoints
 * - ARCHIVING: Minimal (code-driven)
 * - REVIEWING: Meta
 */
export function filterJourneyContext(
  journeyContent: string,
  state: VModelState,
  _currentEpic?: string
): string {
  const sections = parseJourneySections(journeyContent);

  // Always include Meta section (contains state, epic, phase info)
  let filtered = `## Meta\n${sections.meta}\n\n`;

  switch (state) {
    case VModelState.REQUIREMENTS:
      // REQUIREMENTS: Meta + User Hints + Recent Research
      if (sections.userHints) {
        filtered += `## User Hints\n${sections.userHints}\n\n`;
      }
      if (sections.researchNotes) {
        const research = filterResearchNotes(sections.researchNotes, state);
        filtered += `## Research Notes\n${research}\n\n`;
      }
      break;

    case VModelState.SYSTEM_DESIGN:
      // SYSTEM_DESIGN: Meta + Architecture + Approaches + Epic Decomposition
      if (sections.architecture) {
        filtered += `## Architecture\n${sections.architecture}\n\n`;
      }
      if (sections.approaches) {
        filtered += `## Approaches\n${sections.approaches}\n\n`;
      }
      if (sections.epicDecomposition) {
        filtered += `## Epic Decomposition\n${sections.epicDecomposition}\n\n`;
      }
      // Include recent research notes for architecture decisions
      if (sections.researchNotes) {
        const research = filterResearchNotes(sections.researchNotes, state);
        filtered += `## Research Notes\n${research}\n\n`;
      }
      break;

    case VModelState.ARCH_DESIGN:
    case VModelState.MODULE_DESIGN:
      // ARCH_DESIGN/MODULE_DESIGN: Meta + brief context
      // Full epic content will be provided separately
      if (sections.userHints) {
        filtered += `## User Hints\n${sections.userHints}\n\n`;
      }
      if (sections.learnings) {
        filtered += `## Learnings Log\n${truncateLearnings(sections.learnings, 5)}\n\n`;
      }
      break;

    case VModelState.IMPLEMENTATION:
    case VModelState.PROTOTYPING:
      // IMPLEMENTATION/PROTOTYPING: Meta + recent learnings
      // Full story details from epic file
      if (sections.learnings) {
        filtered += `## Learnings Log\n${truncateLearnings(sections.learnings, 5)}\n\n`;
      }
      break;

    case VModelState.UNIT_TEST:
    case VModelState.INTEGRATION_TEST:
    case VModelState.SYSTEM_TEST:
    case VModelState.ACCEPTANCE_TEST:
      // TESTING states: Meta + learnings
      if (sections.learnings) {
        filtered += `## Learnings Log\n${truncateLearnings(sections.learnings, 5)}\n\n`;
      }
      break;

    case VModelState.DESIGN_REVIEW:
      // DESIGN_REVIEW: Meta (contains Previous Phase marker)
      // Content will be extracted separately via extractDesignContent()
      break;

    case VModelState.WAITING_FOR_USER:
      // WAITING_FOR_USER: Meta + Pending Questions
      if (sections.pendingQuestions) {
        filtered += `## Pending Questions\n${sections.pendingQuestions}\n\n`;
      }
      break;

    case VModelState.CONSOLIDATING:
      // CONSOLIDATING: Meta + Learnings
      if (sections.learnings) {
        filtered += `## Learnings Log\n${sections.learnings}\n\n`;
      }
      break;

    case VModelState.PIVOTING:
      // PIVOTING: Meta + All Approaches
      if (sections.approaches) {
        filtered += `## Approaches\n${sections.approaches}\n\n`;
      }
      if (sections.learnings) {
        filtered += `## Learnings Log\n${truncateLearnings(sections.learnings, 5)}\n\n`;
      }
      break;

    case VModelState.REFLECTING:
      // REFLECTING: Meta + Learnings + Checkpoints
      if (sections.learnings) {
        filtered += `## Learnings Log\n${sections.learnings}\n\n`;
      }
      if (sections.checkpoints) {
        filtered += `## Checkpoints\n${sections.checkpoints}\n\n`;
      }
      break;

    case VModelState.ARCHIVING:
    case VModelState.REVIEWING:
      // ARCHIVING/REVIEWING: Minimal - mostly code-driven
      // Just meta section is sufficient
      break;

    case VModelState.COMPLETE:
    case VModelState.BLOCKED:
      // Terminal states: just meta
      break;

    default:
      // Unknown state: include meta only
      break;
  }

  return filtered;
}
