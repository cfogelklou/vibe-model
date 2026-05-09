/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Milestone context filtering for milestone-based lifecycle prompts.
 * Extracts only the relevant sections from a milestone file based on current state.
 */

import { MilestoneState } from "../types";
import { MILESTONE_SECTIONS, type MilestoneSection } from "../constants";

/**
 * Sections of a milestone file that can be extracted.
 */
interface MilestoneSections {
  status: string;
  requirements: string;
  design: string;
  testSpecifications: string;
  researchNotes: string;
  implementationNotes: string;
  unitTestResults: string;
  integrationTestResults: string;
  delivery: string;
  learnings: string;
}

/**
 * Map from MILESTONE_SECTIONS const values to our interface keys.
 */
const SECTION_KEY_MAP: Record<MilestoneSection, keyof MilestoneSections> = {
  Status: "status",
  Requirements: "requirements",
  Design: "design",
  "Test Specifications": "testSpecifications",
  "Research Notes": "researchNotes",
  "Implementation Notes": "implementationNotes",
  "Unit Test Results": "unitTestResults",
  "Integration Test Results": "integrationTestResults",
  Delivery: "delivery",
  Learnings: "learnings",
};

/**
 * Parse a milestone file into structured sections.
 * Sections are delimited by `## SectionName` headers.
 */
function parseMilestoneSections(content: string): MilestoneSections {
  const sections: MilestoneSections = {
    status: "",
    requirements: "",
    design: "",
    testSpecifications: "",
    researchNotes: "",
    implementationNotes: "",
    unitTestResults: "",
    integrationTestResults: "",
    delivery: "",
    learnings: "",
  };

  for (const sectionName of MILESTONE_SECTIONS) {
    const key = SECTION_KEY_MAP[sectionName];
    // Match `## SectionName` followed by content until the next `## ` or end of string.
    const regex = new RegExp(
      `^## ${escapeRegex(sectionName)}\\n([\\s\\S]+?)(?=\\n## |$)`,
      "m"
    );
    const match = content.match(regex);
    if (match) {
      sections[key] = match[1].trim();
    }
  }

  return sections;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build filtered context by including only the specified sections.
 */
function buildFilteredContext(
  sections: MilestoneSections,
  includeKeys: (keyof MilestoneSections)[]
): string {
  const parts: string[] = [];

  for (const key of includeKeys) {
    const content = sections[key];
    if (content) {
      // Find the section name for display
      const sectionName = Object.entries(SECTION_KEY_MAP).find(
        ([, v]) => v === key
      )?.[0];
      if (sectionName) {
        parts.push(`## ${sectionName}\n${content}`);
      }
    }
  }

  return parts.join("\n\n");
}

/**
 * Filter milestone file content based on the current state.
 *
 * Context requirements per state:
 * - PRD: (none -- uses prd.md directly)
 * - REQUIREMENTS: Status + Requirements + Research Notes
 * - DESIGN: Status + Requirements + Design + Research Notes
 * - IMPLEMENTATION: Status + Design + Test Specifications
 * - UNIT_TEST: Status + Implementation Notes + Test Specifications
 * - INTEGRATION_TEST: Status + Design + Unit Test Results
 * - DELIVERY: Status + all sections (summary)
 * - WAITING_FOR_USER: Status + Pending Transition info
 */
export function filterMilestoneContext(
  content: string,
  state: MilestoneState
): string {
  if (!content) {
    return "";
  }

  const sections = parseMilestoneSections(content);

  switch (state) {
    case MilestoneState.PRD:
      // PRD phase does not use milestone context; prd.md is used directly.
      return "";

    case MilestoneState.REQUIREMENTS:
      return buildFilteredContext(sections, [
        "status",
        "requirements",
        "researchNotes",
      ]);

    case MilestoneState.DESIGN:
      return buildFilteredContext(sections, [
        "status",
        "requirements",
        "design",
        "researchNotes",
      ]);

    case MilestoneState.IMPLEMENTATION:
      return buildFilteredContext(sections, [
        "status",
        "design",
        "testSpecifications",
      ]);

    case MilestoneState.UNIT_TEST:
      return buildFilteredContext(sections, [
        "status",
        "implementationNotes",
        "testSpecifications",
      ]);

    case MilestoneState.INTEGRATION_TEST:
      return buildFilteredContext(sections, [
        "status",
        "design",
        "unitTestResults",
      ]);

    case MilestoneState.DELIVERY:
      // All sections for a full summary.
      return buildFilteredContext(sections, [
        "status",
        "requirements",
        "design",
        "testSpecifications",
        "implementationNotes",
        "unitTestResults",
        "integrationTestResults",
        "delivery",
        "learnings",
        "researchNotes",
      ]);

    case MilestoneState.WAITING_FOR_USER:
      // Just status section (contains pending transition info).
      return buildFilteredContext(sections, ["status"]);

    case MilestoneState.COMPLETE:
      return buildFilteredContext(sections, ["status", "delivery", "learnings"]);

    default:
      return buildFilteredContext(sections, ["status"]);
  }
}
