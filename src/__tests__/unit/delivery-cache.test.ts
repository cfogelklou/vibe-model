import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  loadDeliverySummaries,
  formatDeliverySummariesForPrompt,
} from "../../delivery-cache";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vm-delivery-"));
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

async function writeSummary(
  id: number,
  name: string,
  deliverables: string[],
  learnings: string[],
  timestamp: string,
): Promise<void> {
  const dir = path.join(tmp, "vibe-model", "delivery-summaries");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${id}-${name}-delivery-summary.md`);
  let c = `# Delivery Summary: Milestone ${id} - ${name}\n\n**Timestamp:** ${timestamp}\n\n## Deliverables\n\n`;
  for (const d of deliverables) c += `- ${d}\n`;
  c += `\n## Key Learnings\n\n`;
  for (const l of learnings) c += `- ${l}\n`;
  await fs.writeFile(file, c);
}

describe("loadDeliverySummaries — parses real content (regression: returned empty arrays)", () => {
  it("returns deliverables, key learnings, and the cached timestamp", async () => {
    await writeSummary(
      1,
      "alpha",
      ["Plugin scaffold", "CI workflow"],
      ["Use a lock-free queue", "RT path must not allocate"],
      "2026-01-01T00:00:00.000Z",
    );
    const summaries = await loadDeliverySummaries(tmp, 2);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].milestoneName).toBe("alpha");
    expect(summaries[0].deliverables).toEqual([
      "- Plugin scaffold",
      "- CI workflow",
    ]);
    expect(summaries[0].keyLearnings).toEqual([
      "- Use a lock-free queue",
      "- RT path must not allocate",
    ]);
    expect(summaries[0].timestamp).toBe("2026-01-01T00:00:00.000Z");
  });

  it("only loads milestones with id < current", async () => {
    await writeSummary(1, "alpha", ["d"], [], "2026-01-01T00:00:00.000Z");
    await writeSummary(2, "beta", ["d2"], [], "2026-01-02T00:00:00.000Z");
    const summaries = await loadDeliverySummaries(tmp, 2);
    expect(summaries.map((s) => s.milestoneId)).toEqual([1]);
  });

  it("returns empty when the cache dir does not exist", async () => {
    const summaries = await loadDeliverySummaries(tmp, 1);
    expect(summaries).toEqual([]);
  });
});

describe("formatDeliverySummariesForPrompt — renders actual content", () => {
  it("includes deliverables and learnings text (not just counts)", () => {
    const text = formatDeliverySummariesForPrompt([
      {
        milestoneId: 1,
        milestoneName: "alpha",
        deliverables: ["- Scaffold", "- CI"],
        timestamp: "t",
        keyLearnings: ["- Use queue", "- No alloc"],
      },
    ]);
    expect(text).toContain("Milestone 1: alpha");
    expect(text).toContain("Scaffold");
    // No double bullet: input "- Scaffold" (already bulleted) renders once.
    expect(text).not.toContain("- - Scaffold");
    expect(text).toContain("CI");
    expect(text).toContain("Use queue");
    expect(text).toContain("No alloc");
  });

  it("returns empty string when there are no summaries", () => {
    expect(formatDeliverySummariesForPrompt([])).toBe("");
  });
});
