/**
 * Unit tests for journey operations
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { promises as fs } from "fs";
import path from "path";
import { initializeConfig } from "../../config";
import { VModelState } from "../../types";
import {
  sanitizeJourneyName,
  getJourneyPath,
  createJourneyFile,
  getJourneyState,
  setJourneyState,
  getJourneyGoal,
  getJourneyProgress,
  getCurrentEpic,
  initializePrototypingIteration,
  getPrototypingIteration,
  incrementPrototypingIteration,
  addUserHint,
  getLatestFeedback,
  addApproval,
  appendSelfImprovementNote,
} from "../../journey";

// Mock config
const mockProjectDir = "/tmp/test-vibe-model";
const mockJourneyDir = path.join(mockProjectDir, "vibe-model", "journey");

describe("sanitizeJourneyName", () => {
  it("should convert to lowercase and replace spaces with hyphens", () => {
    const result = sanitizeJourneyName("Test Goal Name");
    expect(result).toBe("test-goal-name");
  });

  it("should replace special characters with hyphens", () => {
    const result = sanitizeJourneyName("Test@Goal#Name$!");
    expect(result).toBe("test-goal-name");
  });

  it("should limit to 50 characters", () => {
    const longGoal = "a".repeat(100);
    const result = sanitizeJourneyName(longGoal);
    expect(result.length).toBe(50);
  });

  it("should handle multiple consecutive hyphens", () => {
    const result = sanitizeJourneyName("Test---Goal");
    expect(result).toBe("test-goal");
  });
});

describe("getJourneyPath", () => {
  beforeEach(async () => {
    await fs.mkdir(mockProjectDir, { recursive: true });
    await initializeConfig({ projectDir: mockProjectDir });
  });

  it("should return correct journey file path", () => {
    const result = getJourneyPath("test-journey");
    expect(result).toContain("test-journey.journey.md");
  });
});

describe("journey file operations", () => {
  let testJourneyFile: string;

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(mockJourneyDir, { recursive: true });

    // Create a test journey file
    testJourneyFile = path.join(mockJourneyDir, "test.journey.md");
    await fs.writeFile(
      testJourneyFile,
      `# Journey: Test Goal

## Meta

- Goal: Test Goal
- State: REQUIREMENTS
- Previous Phase: TBD
- Previous State: TBD
- Current Epic: TBD
- Started: 2025-01-01 12:00:00 UTC
- Current Approach: TBD
- Progress: 0%

## Epic Progress

| Epic ID | Name             | Status      | Stories Complete | Total Stories |
| ------- | ---------------- | ----------- | ---------------- | ------------- |
| TBD     | TBD              | PENDING     | 0                | TBD           |
`
    );
  });

  it("should parse journey state", async () => {
    const state = await getJourneyState(testJourneyFile);
    expect(state).toBe(VModelState.REQUIREMENTS);
  });

  it("should set journey state", async () => {
    await setJourneyState(testJourneyFile, VModelState.SYSTEM_DESIGN);
    const state = await getJourneyState(testJourneyFile);
    expect(state).toBe(VModelState.SYSTEM_DESIGN);
  });

  it("should parse journey goal", async () => {
    const goal = await getJourneyGoal(testJourneyFile);
    expect(goal).toBe("Test Goal");
  });

  it("should parse journey progress", async () => {
    const progress = await getJourneyProgress(testJourneyFile);
    expect(progress).toBe(0);
  });

  it("should parse current epic", async () => {
    const epic = await getCurrentEpic(testJourneyFile);
    expect(epic).toBe("TBD");
  });

  it("should initialize and increment prototyping iteration", async () => {
    await initializePrototypingIteration(testJourneyFile);
    const start = await getPrototypingIteration(testJourneyFile);
    expect(start).toBe(0);

    const next = await incrementPrototypingIteration(testJourneyFile);
    expect(next).toBe(1);
    expect(await getPrototypingIteration(testJourneyFile)).toBe(1);
  });

  it("should return latest non-approval feedback", async () => {
    await addUserHint(testJourneyFile, "make add button bigger");
    await addApproval(testJourneyFile);
    await addUserHint(testJourneyFile, "show completed tasks at bottom");

    const latest = await getLatestFeedback(testJourneyFile);
    expect(latest).toContain("show completed tasks at bottom");
  });

  it("should write actionable stall guidance to self-improvement notes", async () => {
    await appendSelfImprovementNote(
      testJourneyFile,
      1,
      VModelState.UNIT_TEST,
      VModelState.UNIT_TEST
    );

    const notesPath = path.join(mockProjectDir, "self-improvement-notes.md");
    const notes = await fs.readFile(notesPath, "utf-8");

    expect(notes).toContain("No transition observed: state remained UNIT_TEST.");
    expect(notes).toContain("explicitly set journey state to INTEGRATION_TEST");
  });

  it("should escalate repeated stalls with consecutive count", async () => {
    await appendSelfImprovementNote(
      testJourneyFile,
      1,
      VModelState.UNIT_TEST,
      VModelState.UNIT_TEST
    );
    await appendSelfImprovementNote(
      testJourneyFile,
      2,
      VModelState.UNIT_TEST,
      VModelState.UNIT_TEST
    );
    await appendSelfImprovementNote(
      testJourneyFile,
      3,
      VModelState.UNIT_TEST,
      VModelState.UNIT_TEST
    );

    const notesPath = path.join(mockProjectDir, "self-improvement-notes.md");
    const notes = await fs.readFile(notesPath, "utf-8");

    expect(notes).toContain("Stall detected: 3 consecutive iterations remained in UNIT_TEST.");
  });

  // Cleanup
  afterEach(async () => {
    try {
      await fs.rm(mockJourneyDir, { recursive: true, force: true });
      await fs.rm(mockProjectDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});
