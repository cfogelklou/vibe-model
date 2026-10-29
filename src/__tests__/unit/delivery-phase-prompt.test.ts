import { describe, expect, it } from "bun:test";
import { deliveryPhasePrompt } from "../../prompts/states/delivery-phase";

const prompt = deliveryPhasePrompt({
  AI_PROVIDER: "claude",
  MILESTONE_FILE: "/tmp/01-example.md",
  MILESTONE_NAME: "Example Milestone",
  MILESTONE_ID: 1,
  MILESTONE_CONTENT: "## Status\n- State: DELIVERY",
});

describe("deliveryPhasePrompt", () => {
  it("defaults to local-only delivery", () => {
    expect(prompt).toContain("Do not push, publish, or open a pull request");
    expect(prompt).toContain("privacy-preserving local-only delivery");
  });

  it("does not instruct the agent to create a PR", () => {
    expect(prompt).not.toContain("Create a pull request");
    expect(prompt).not.toContain("Record the PR URL or reference");
    expect(prompt).not.toContain("When the PR is created");
  });

  it("records local branch delivery metadata instead", () => {
    expect(prompt).toContain("Record that delivery remains local to the current branch");
    expect(prompt).toContain("Record the latest local commit hash if known");
    expect(prompt).toContain("When local delivery is complete");
  });
});
