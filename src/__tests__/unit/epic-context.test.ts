/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

import { describe, expect, it } from "bun:test";
import { extractCurrentStoryTitle, extractCurrentStorySection } from "../../prompts/context/epic-context";

describe("epic-context story parsing", () => {
  it("extracts in-progress story title from canonical story headings", () => {
    const epicContent = `# Epic E1: Demo

## Epic Decomposition

### Story S1: First story
**Status**: PENDING

### Story S2: Active story
**Status**: IN_PROGRESS
`;

    expect(extractCurrentStoryTitle(epicContent)).toBe("Active story");
    expect(extractCurrentStorySection(epicContent)).toContain("### Story S2: Active story");
  });

  it("extracts in-progress story title when S-prefix is omitted", () => {
    const epicContent = `# Epic E1: Demo

## Epic Decomposition

### Story 1: First story
**Status**: PENDING

### Story 2: Active story without S
**Status**: IN_PROGRESS
`;

    expect(extractCurrentStoryTitle(epicContent)).toBe("Active story without S");
    expect(extractCurrentStorySection(epicContent)).toContain("### Story 2: Active story without S");
  });
});
