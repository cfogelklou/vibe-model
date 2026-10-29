import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { readMilestoneFile, addLearning, updateSection } from "../../milestone";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vm-milestone-"));
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

async function writeMilestone(content: string): Promise<string> {
  const p = path.join(tmp, "01-test.md");
  await fs.writeFile(p, content);
  return p;
}

const MULTILINE = `# Milestone 1: Test

## Status
- State: IMPLEMENTATION
- Progress: 50%
- Started: 2026-01-01 00:00:00 UTC
- Pending Transition: NONE

## Requirements
R1 — First requirement.
R2 — Second requirement.
R3 — Third requirement with
a continuation line.

## Learnings
- first learning
- second learning
- third learning
`;

describe("readMilestoneFile — multi-line sections (regression: was truncated to first line)", () => {
  it("captures every requirement line", async () => {
    const m = await readMilestoneFile(await writeMilestone(MULTILINE));
    expect(m.requirements).toContain("R1 — First requirement.");
    expect(m.requirements).toContain("R2 — Second requirement.");
    expect(m.requirements).toContain("R3 — Third requirement");
    expect(m.requirements).toContain("a continuation line.");
  });

  it("captures every learning line", async () => {
    const m = await readMilestoneFile(await writeMilestone(MULTILINE));
    expect(m.learnings).toContain("first learning");
    expect(m.learnings).toContain("second learning");
    expect(m.learnings).toContain("third learning");
  });
});

describe("addLearning", () => {
  // addLearning writes "- <YYYY-MM-DD>: <learning>" — assertions check the
  // learning text + structural properties, not the exact prefixed line.
  it("inserts into an existing Learnings section on its own line", async () => {
    const p = await writeMilestone(MULTILINE);
    await addLearning(p, "a fresh hint");
    const after = await fs.readFile(p, "utf-8");
    expect(after).toContain("a fresh hint");
    expect(after).toContain("## Learnings");
    expect(after).not.toContain("## Learnings- ");
    expect(after).toContain("first learning");
  });

  it("creates the Learnings section (with header) when absent", async () => {
    const noLearnings = `# Milestone 1: Test

## Status
- State: REQUIREMENTS
- Progress: 0%

## Requirements
R1 — only requirement
`;
    const p = await writeMilestone(noLearnings);
    await addLearning(p, "orphan-safe hint");
    const after = await fs.readFile(p, "utf-8");
    expect(after).toContain("## Learnings");
    expect(after).toContain("orphan-safe hint");
    expect(after).not.toContain("## Learnings- ");
  });

  it("inserts cleanly into an empty section immediately followed by another heading", async () => {
    const emptySection = `# Milestone 1: Test

## Status
- State: REQUIREMENTS

## Learnings

## Delivery
delivery text
`;
    const p = await writeMilestone(emptySection);
    await addLearning(p, "edge hint");
    const after = await fs.readFile(p, "utf-8");
    expect(after).toContain("## Learnings");
    expect(after).toContain("edge hint");
    expect(after).not.toContain("## Learnings- ");
    expect(after).toContain("## Delivery");
    expect(after).toContain("delivery text");
  });

  it("handles a Learnings heading as the last line with no trailing newline", async () => {
    const eofHeading = `# Milestone 1: Test

## Status
- State: REQUIREMENTS

## Learnings`;
    const p = await writeMilestone(eofHeading);
    await addLearning(p, "eof hint");
    const after = await fs.readFile(p, "utf-8");
    expect(after).toContain("eof hint");
    expect(after).toContain("## Learnings");
    expect(after).not.toContain("## Learningseof hint");
  });

  it("serializes concurrent writes to the same file (no lost updates)", async () => {
    const p = await writeMilestone(MULTILINE);
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => addLearning(p, `concurrent hint ${i}`)),
    );
    const after = await fs.readFile(p, "utf-8");
    for (let i = 0; i < 20; i++) {
      expect(after).toContain(`concurrent hint ${i}`);
    }
  });
});

describe("updateSection", () => {
  it("replaces full multi-line section content (regression: only first line)", async () => {
    const p = await writeMilestone(MULTILINE);
    await updateSection(
      p,
      "Requirements",
      `R1 — replaced
R2 — also replaced
R3 — third replaced`,
    );
    const after = await fs.readFile(p, "utf-8");
    expect(after).toContain("R1 — replaced");
    expect(after).toContain("R2 — also replaced");
    expect(after).toContain("R3 — third replaced");
    // Old content fully removed (not just the first line).
    expect(after).not.toContain("First requirement");
    // Other sections untouched.
    expect(after).toContain("first learning");
  });

  it("updates a section whose heading is at EOF with no trailing newline", async () => {
    const eofHeading = `# Milestone 1: Test

## Status
- State: REQUIREMENTS

## Learnings`;
    const p = await writeMilestone(eofHeading);
    await updateSection(
      p,
      "Learnings",
      `- eof learning one
- eof learning two`,
    );
    const after = await fs.readFile(p, "utf-8");
    expect(after).toContain("eof learning one");
    expect(after).toContain("eof learning two");
    expect(after).toContain("## Learnings");
  });

  it("does not match a ### subsection as a ## section", async () => {
    const withSub = `# Milestone 1: Test

## Design
D1

### Subsection
sub content
`;
    const p = await writeMilestone(withSub);
    // "Subsection" exists only as a ### subsection — updateSection must no-op.
    await updateSection(p, "Subsection", "SHOULD NOT BE WRITTEN");
    const after = await fs.readFile(p, "utf-8");
    expect(after).not.toContain("SHOULD NOT BE WRITTEN");
    expect(after).toContain("sub content");
  });

  it("inserts content containing $ literally (no backreference interpretation)", async () => {
    const p = await writeMilestone(MULTILINE);
    await updateSection(p, "Requirements", "Price is $1 then $2 each");
    const after = await fs.readFile(p, "utf-8");
    expect(after).toContain("Price is $1 then $2 each");
  });
});
