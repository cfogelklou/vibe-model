/**
 * Unit tests for utility functions
 */

import { describe, it, expect } from "bun:test";
import { stripAnsi } from "../../file-utils.js";
import { sanitizeJourneyName } from "../../journey.js";

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
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("should handle multiple consecutive hyphens", () => {
    const result = sanitizeJourneyName("Test---Goal");
    expect(result).toBe("test-goal");
  });
});

describe("stripAnsi", () => {
  it("should remove ANSI escape sequences", () => {
    const input = "\x1b[31mError message\x1b[0m";
    const result = stripAnsi(input);
    expect(result).toBe("Error message");
  });

  it("should handle multiple ANSI codes", () => {
    const input = "\x1b[31m\x1b[1mBold error\x1b[0m";
    const result = stripAnsi(input);
    expect(result).toBe("Bold error");
  });

  it("should pass through text without ANSI codes", () => {
    const input = "Plain text message";
    const result = stripAnsi(input);
    expect(result).toBe("Plain text message");
  });
});
