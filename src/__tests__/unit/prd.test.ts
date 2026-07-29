/**
 * Unit tests for PRD parsing helpers
 */

import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { parseMilestonesTable, readPRD } from "../../prd";

describe("parseMilestonesTable", () => {
  it("parses the canonical 5-column milestone table", () => {
    const content = `
| ID | Name | Description | Status | Mode |
|----|------|-------------|--------|------|
| 1 | Foundation | Set up project | PENDING | |
| 2 | Polish | Ship it | COMPLETE | autonomous |
`;

    const milestones = parseMilestonesTable(content);

    expect(milestones).toHaveLength(2);
    expect(milestones[0]).toEqual({
      id: 1,
      name: "Foundation",
      description: "Set up project",
      status: "PENDING",
      modeOverride: null,
    });
    expect(milestones[1]).toEqual({
      id: 2,
      name: "Polish",
      description: "Ship it",
      status: "COMPLETE",
      modeOverride: "autonomous",
    });
  });

  it("parses the legacy 4-column milestone table without mode", () => {
    const content = `
| ID | Name | Description | Status |
|---|---|---|---|
| 1 | Foundation | Set up project | IN_PROGRESS |
| 2 | Polish | Ship it | COMPLETE |
`;

    const milestones = parseMilestonesTable(content);

    expect(milestones).toHaveLength(2);
    expect(milestones[0]?.modeOverride).toBeNull();
    expect(milestones[0]?.status).toBe("IN_PROGRESS");
    expect(milestones[1]?.modeOverride).toBeNull();
    expect(milestones[1]?.status).toBe("COMPLETE");
  });
});

describe("readPRD", () => {
  it("falls back to the PRD title when the Goal section is missing", async () => {
    const projectDir = mkdtempSync(path.join(os.tmpdir(), "vibe-model-prd-test-"));

    try {
      const vibeModelDir = path.join(projectDir, "vibe-model");
      mkdirSync(vibeModelDir, { recursive: true });
      writeFileSync(
        path.join(vibeModelDir, "prd.md"),
        `# PRD: LooPPT\n\n## Tech Stack\nTypeScript\n\n## Architecture Overview\nOffline-first.\n\n## Milestones\n\n| ID | Name | Description | Status |\n|---|---|---|---|\n| 1 | MVP | Build it | PENDING |\n`,
      );

      const prd = await readPRD(projectDir);

      expect(prd.goal).toBe("LooPPT");
      expect(prd.milestones).toHaveLength(1);
      expect(prd.milestones[0]?.id).toBe(1);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
