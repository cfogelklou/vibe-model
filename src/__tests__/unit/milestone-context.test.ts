import { describe, expect, it } from "bun:test";
import { filterMilestoneContext } from "../../prompts/milestone-context";
import { MilestoneState } from "../../types";

const milestoneContent = `# Milestone 1: Example

## Status
- State: IMPLEMENTATION
- Progress: 50%
- Started: 2026-05-20 00:00:00 UTC
- Pending Transition: NONE

## Requirements
R1 — Requirement text

## Design
D1 — Design text

## Test Specifications
TS-1 — Test text

## Research Notes
Research text

## Implementation Notes
Implementation text

## Unit Test Results
Unit test text

## Integration Test Results
Integration text

## Delivery
Delivery text

## Learnings
Learning text
`;

describe("filterMilestoneContext", () => {
  it("includes requirements in implementation context", () => {
    const context = filterMilestoneContext(milestoneContent, MilestoneState.IMPLEMENTATION);

    expect(context).toContain("## Requirements\nR1 — Requirement text");
    expect(context).toContain("## Design\nD1 — Design text");
    expect(context).toContain("## Test Specifications\nTS-1 — Test text");
  });

  it("includes full prior journey context in unit test phase", () => {
    const context = filterMilestoneContext(milestoneContent, MilestoneState.UNIT_TEST);

    expect(context).toContain("## Requirements\nR1 — Requirement text");
    expect(context).toContain("## Design\nD1 — Design text");
    expect(context).toContain("## Implementation Notes\nImplementation text");
    expect(context).toContain("## Research Notes\nResearch text");
  });

  it("includes requirements, test specs, and implementation notes in integration phase", () => {
    const context = filterMilestoneContext(milestoneContent, MilestoneState.INTEGRATION_TEST);

    expect(context).toContain("## Requirements\nR1 — Requirement text");
    expect(context).toContain("## Test Specifications\nTS-1 — Test text");
    expect(context).toContain("## Implementation Notes\nImplementation text");
    expect(context).toContain("## Unit Test Results\nUnit test text");
  });
});
