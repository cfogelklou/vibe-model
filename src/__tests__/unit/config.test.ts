/**
 * Unit tests for project directory detection
 */

import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { detectProjectDirectory } from "../../config";

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "vibe-model-config-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  process.chdir(originalCwd);

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("detectProjectDirectory", () => {
  it("returns the explicit project directory when provided", async () => {
    const projectDir = makeTempDir();

    const result = await detectProjectDirectory(projectDir);

    expect(result).toBe(path.resolve(projectDir));
  });

  it("finds the nearest git root from a nested working directory", async () => {
    const projectDir = makeTempDir();
    mkdirSync(path.join(projectDir, ".git"));
    const nestedDir = path.join(projectDir, "src", "components");
    mkdirSync(nestedDir, { recursive: true });
    process.chdir(nestedDir);

    const result = await detectProjectDirectory();

    expect(result).toBe(realpathSync(projectDir));
  });

  it("treats a .git file as a valid repository root", async () => {
    const projectDir = makeTempDir();
    writeFileSync(path.join(projectDir, ".git"), "gitdir: ../.git/modules/example\n");
    const nestedDir = path.join(projectDir, "app");
    mkdirSync(nestedDir, { recursive: true });
    process.chdir(nestedDir);

    const result = await detectProjectDirectory();

    expect(result).toBe(realpathSync(projectDir));
  });

  it("falls back to the current working directory when no git root exists", async () => {
    const workingDir = makeTempDir();
    const nestedDir = path.join(workingDir, "nested");
    mkdirSync(nestedDir, { recursive: true });
    process.chdir(nestedDir);

    const result = await detectProjectDirectory();

    expect(result).toBe(realpathSync(nestedDir));
  });
});
