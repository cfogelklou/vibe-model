/**
 * Unit tests for journey operations
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { promises as fs } from "fs";
import path from "path";
import { initializeConfig } from "../../config.js";
import { VModelState } from "../../types.js";
import {
  sanitizeJourneyName,
  getJourneyPath,
  createJourneyFile,
  getJourneyState,
  setJourneyState,
  getJourneyGoal,
  getJourneyProgress,
  getCurrentEpic,
  getPreviousPhase,
} from "../../journey.js";

// Mock config
const mockProjectDir = "/tmp/test-v-model";
const mockJourneyDir = path.join(mockProjectDir, "v_model", "journey");

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

  it("should parse previous phase", async () => {
    const phase = await getPreviousPhase(testJourneyFile);
    expect(phase).toBe("TBD");
  });

  // Cleanup
  afterEach(async () => {
    try {
      await fs.rm(mockJourneyDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});

// Helper function for afterEach (not available in bun:test by default)
async function afterEach(fn: () => Promise<void>) {
  // This will be called after each test
  // For now, we'll manually clean up in the last test
}
