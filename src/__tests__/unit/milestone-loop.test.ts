import { describe, expect, it } from "bun:test";
import { ensureSuccessfulAIExit } from "../../ai-provider";
import {
  MAX_AUTONOMOUS_REVIEW_RETRIES,
  getAutonomousReviewFailureRecoveryState,
  getMissingPhaseArtifacts,
} from "../../milestone-loop";
import { MilestoneState, type MilestoneFile } from "../../types";

function makeMilestone(overrides: Partial<MilestoneFile> = {}): MilestoneFile {
  return {
    id: 1,
    name: "Test Milestone",
    state: MilestoneState.REQUIREMENTS,
    progress: 0,
    started: "2026-05-20 00:00:00 UTC",
    pendingTransition: undefined,
    requirements: "Filled requirements",
    design: "Filled design",
    testSpecifications: "Filled test specs",
    implementationNotes: "Filled implementation notes",
    unitTestResults: "Filled unit test results",
    integrationTestResults: "Filled integration test results",
    delivery: "Filled delivery",
    learnings: "",
    researchNotes: "",
    ...overrides,
  };
}

describe("autonomous review failure recovery", () => {
  it("exports a finite retry cap", () => {
    expect(MAX_AUTONOMOUS_REVIEW_RETRIES).toBeGreaterThan(0);
  });

  it("prefers the AI-written resulting state when it already advanced", () => {
    expect(
      getAutonomousReviewFailureRecoveryState(
        MilestoneState.REQUIREMENTS,
        MilestoneState.DESIGN,
      ),
    ).toBe(MilestoneState.DESIGN);
  });

  it("advances one lifecycle step when the file state did not move", () => {
    expect(
      getAutonomousReviewFailureRecoveryState(
        MilestoneState.REQUIREMENTS,
        MilestoneState.REQUIREMENTS,
      ),
    ).toBe(MilestoneState.DESIGN);
  });

  it("stays in DELIVERY when there is no next actionable state", () => {
    expect(
      getAutonomousReviewFailureRecoveryState(
        MilestoneState.DELIVERY,
        MilestoneState.DELIVERY,
      ),
    ).toBe(MilestoneState.DELIVERY);
  });
});

describe("phase artifact validation", () => {
  it("flags placeholder requirements content as missing", () => {
    const milestone = makeMilestone({
      requirements: "*(To be filled during REQUIREMENTS phase)*",
    });

    expect(getMissingPhaseArtifacts(MilestoneState.REQUIREMENTS, milestone)).toEqual([
      "Requirements",
    ]);
  });

  it("flags both design and test specifications when both remain placeholders", () => {
    const milestone = makeMilestone({
      design: "*(To be filled during DESIGN phase)*",
      testSpecifications: "*(NL test cases written during DESIGN)*",
    });

    expect(getMissingPhaseArtifacts(MilestoneState.DESIGN, milestone)).toEqual([
      "Design",
      "Test Specifications",
    ]);
  });

  it("accepts populated delivery content", () => {
    const milestone = makeMilestone({
      delivery: "Branch: feat/test\nCommit: abc123",
    });

    expect(getMissingPhaseArtifacts(MilestoneState.DELIVERY, milestone)).toEqual([]);
  });
});

describe("AI exit handling", () => {
  it("allows successful AI exits", () => {
    expect(() => ensureSuccessfulAIExit(0, "requirements phase")).not.toThrow();
  });

  it("throws on failed AI exits so the orchestrator cannot advance state", () => {
    expect(() => ensureSuccessfulAIExit(1, "requirements phase")).toThrow(
      /No orchestrator state was advanced/,
    );
  });
});
