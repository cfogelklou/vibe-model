/**
 * Design spec operations.
 * Handles design spec creation, content extraction, and updates.
 *
 * Note: Prompt template management has been migrated to src/prompts/
 * for type safety. Use the functions in src/prompts/index.js instead.
 */

import { promises as fs, existsSync } from "fs";
import path from "path";
import { VModelState } from "./types.js";
import { config } from "./config.js";
import { getJourneyGoal } from "./journey.js";

/**
 * Get design spec file path from journey name
 */
export function getDesignSpecPath(journeyName: string): string {
  const journeyDir = path.join(config.projectDir, "v_model", "journey");
  return path.join(journeyDir, `${journeyName}.spec.md`);
}

/**
 * Get design spec path from journey file
 */
export function getDesignSpecPathFromJourney(journeyFile: string): string {
  const journeyName = path.basename(journeyFile, ".journey.md");
  return getDesignSpecPath(journeyName);
}

/**
 * Create design spec file
 */
export async function createDesignSpec(journeyFile: string): Promise<string> {
  const specPath = getDesignSpecPathFromJourney(journeyFile);
  const goal = await getJourneyGoal(journeyFile);
  const journeyName = path.basename(journeyFile, ".journey.md");

  // Extract journey information
  const journeyContent = await fs.readFile(journeyFile, "utf-8");

  // Get current approach details
  const approachDetailMatch = journeyContent.match(
    /## Current Approach Detail\n([\s\S]+?)\n## /
  );
  const approachDetails = approachDetailMatch
    ? approachDetailMatch[1].trim()
    : "Not yet defined";

  // Get baseline metrics
  const baselineMetricsMatch = journeyContent.match(
    /## Baseline Metrics\n([\s\S]+?)\n## /
  );
  const baselineMetrics = baselineMetricsMatch ? baselineMetricsMatch[1].trim() : "";

  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

  const specTemplate = `# Design Spec: ${goal}

> **Journey**: ${journeyName}
> **Created**: ${timestamp}
> **Status**: DRAFT

---

## Overview

**Goal**: ${goal}

This document describes the design and implementation plan for achieving the stated goal.

---

## Approach

${approachDetails}

---

## Baseline Metrics

${baselineMetrics}

---

## Files to Modify

*(To be populated during implementation)*

---

## Implementation Plan

### Phase 1: Research and Planning
- [ ] Research complete
- [ ] Approach selected
- [ ] Design spec created

### Phase 2: Prototyping (if applicable)
- [ ] Prototype implementation
- [ ] Prototype validation
- [ ] Results documented

### Phase 3: Implementation
- [ ] Production code changes
- [ ] Tests passing
- [ ] Code review complete

### Phase 4: Consolidation
- [ ] Documentation updated
- [ ] Design spec finalized
- [ ] Tests validated

---

## Success Criteria

- [ ] Goal achieved
- [ ] All tests pass (no regression)
- [ ] Documentation complete
- [ ] Design spec finalized

---

## Changes Made

*(To be populated during CONSOLIDATING phase)*

---

## Documentation Updates

*(To be populated during CONSOLIDATING phase)*

---

## References

*(Add links to relevant docs, papers, or code)*
`;

  await fs.writeFile(specPath, specTemplate);

  // Update journey file to reference the spec
  const designSpecSectionMatch = journeyContent.match(/^## Design Spec$/m);
  if (designSpecSectionMatch) {
    const lineNum = journeyContent
      .substring(0, designSpecSectionMatch.index)
      .split("\n").length;
    const journeyLines = journeyContent.split("\n");
    journeyLines.splice(
      lineNum + 1,
      0,
      `See [${journeyName}.spec.md](${journeyName}.spec.md) for detailed design specification.`
    );
    await fs.writeFile(journeyFile, journeyLines.join("\n"));
  }

  return specPath;
}

/**
 * Update design spec with implementation details
 */
export async function updateDesignSpec(journeyFile: string): Promise<void> {
  const specPath = getDesignSpecPathFromJourney(journeyFile);

  if (!existsSync(specPath)) {
    console.warn(`Design spec not found: ${specPath}`);
    return;
  }

  // Update status to COMPLETE
  let specContent = await fs.readFile(specPath, "utf-8");
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

  specContent = specContent.replace(/\*\*Status\*\*: DRAFT/, `**Status**: COMPLETE`);
  specContent = specContent.replace(
    /\*\*Created\*\*: .+/,
    `**Updated**: ${timestamp}`
  );

  await fs.writeFile(specPath, specContent);
}

/**
 * Extract design content for consultation
 * NOW: Checks epic file for ARCH_DESIGN and MODULE_DESIGN content
 */
export async function extractDesignContent(
  journeyFile: string,
  phase: VModelState
): Promise<string> {
  // For epic phases, try epic file first
  if (phase === VModelState.ARCH_DESIGN || phase === VModelState.MODULE_DESIGN) {
    const currentEpic = await import("./journey.js").then(m => m.getCurrentEpic(journeyFile));
    if (currentEpic && currentEpic !== "TBD") {
      const epicNum = currentEpic.replace(/\D/g, "");
      const journeyDir = path.dirname(journeyFile);
      const journeyName = path.basename(journeyFile, ".journey.md");
      const epicFilePath = path.join(journeyDir, `${journeyName}.journey.E${epicNum}.md`);

      if (existsSync(epicFilePath)) {
        const epicContent = await fs.readFile(epicFilePath, "utf-8");

        if (phase === VModelState.ARCH_DESIGN) {
          // Get Epic Decomposition from epic file
          const epicDecompMatch = epicContent.match(/## Epic Decomposition\n([\s\S]+?)\n(?=##)/);
          if (epicDecompMatch) {
            return epicDecompMatch[1].trim();
          }
        } else if (phase === VModelState.MODULE_DESIGN) {
          // Get current Story design from epic file
          // Stories are under "## Epic Decomposition" as "### Story S#:"
          const storyMatch = epicContent.match(/### Story S\d+:.*?\n([\s\S]+?)(?=### Story|\n##)/);
          if (storyMatch) {
            return storyMatch[1].trim();
          }
        }
      }
    }
  }

  // Fallback: Extract from spec or journey (for REQUIREMENTS, SYSTEM_DESIGN)
  const specPath = getDesignSpecPathFromJourney(journeyFile);
  let content = "";

  switch (phase) {
    case VModelState.REQUIREMENTS:
      if (existsSync(specPath)) {
        const specContent = await fs.readFile(specPath, "utf-8");
        const userReqMatch = specContent.match(/## User Requirements\n([\s\S]+?)\n## /);
        const sysReqMatch = specContent.match(/## System Requirements\n([\s\S]+?)\n## /);
        content = (userReqMatch?.[1] || "") + "\n\n" + (sysReqMatch?.[1] || "");
      }
      break;

    case VModelState.SYSTEM_DESIGN:
      if (existsSync(specPath)) {
        const specContent = await fs.readFile(specPath, "utf-8");
        const epicsMatch = specContent.match(/## Epics\n([\s\S]+?)\n## /);
        const archMatch = specContent.match(/## Architecture\n([\s\S]+?)\n## /);
        content = (epicsMatch?.[1] || "") + "\n\n" + (archMatch?.[1] || "");
      }
      break;

    case VModelState.ARCH_DESIGN:
    case VModelState.MODULE_DESIGN: {
      // Final fallback to journey file (legacy format)
      const journeyContent = await fs.readFile(journeyFile, "utf-8");
      const epicMatch = journeyContent.match(/## Current Epic\n([\s\S]+?)\n## /);
      const storyMatch = journeyContent.match(/## Current Story\n([\s\S]+?)\n## /);
      content = (epicMatch?.[1] || storyMatch?.[1] || "");
      break;
    }
  }

  // Fallback to entire journey if nothing specific found
  if (!content.trim()) {
    content = await fs.readFile(journeyFile, "utf-8");
  }

  return content;
}

/**
 * Extract research notes for a specific phase
 * NOW: Checks epic file for ARCH_DESIGN and MODULE_DESIGN research
 */
export async function extractResearchContent(
  journeyFile: string,
  phase: VModelState
): Promise<string> {
  // For epic phases, try epic file first
  if (phase === VModelState.ARCH_DESIGN || phase === VModelState.MODULE_DESIGN) {
    const currentEpic = await import("./journey.js").then(m => m.getCurrentEpic(journeyFile));
    if (currentEpic && currentEpic !== "TBD") {
      const epicNum = currentEpic.replace(/\D/g, "");
      const journeyDir = path.dirname(journeyFile);
      const journeyName = path.basename(journeyFile, ".journey.md");
      const epicFilePath = path.join(journeyDir, `${journeyName}.journey.E${epicNum}.md`);

      if (existsSync(epicFilePath)) {
        const epicContent = await fs.readFile(epicFilePath, "utf-8");
        // Pattern matches: "### ARCH_DESIGN Phase Research" until next "##" section
        const sectionPattern = phase === VModelState.ARCH_DESIGN
          ? /### ARCH_DESIGN Phase Research\n([\s\S]+?)\n(?=##)/
          : /### MODULE_DESIGN Phase Research\n([\s\S]+?)\n(?=##)/;

        const researchMatch = epicContent.match(sectionPattern);
        if (researchMatch && !researchMatch[1].includes("To be populated")) {
          return researchMatch[1].trim();
        }
      }
    }
  }

  // Fallback: Extract from journey file (for REQUIREMENTS, SYSTEM_DESIGN)
  const journeyContent = await fs.readFile(journeyFile, "utf-8");
  const sectionPattern = `### ${phase} Phase Research`;
  const researchMatch = journeyContent.match(
    new RegExp(`${sectionPattern}\\n([\\s\\S]+?)\\n### `)
  );

  if (!researchMatch) {
    return "";
  }

  if (researchMatch[1].includes("To be populated")) {
    return "";
  }

  return researchMatch[1].trim();
}
