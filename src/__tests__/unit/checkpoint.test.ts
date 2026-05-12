/**
 * Unit tests for git checkpoint helpers
 */

import { describe, expect, it } from "bun:test";
import {
  parsePorcelainPaths,
  shouldExcludeFromAutoCommit,
} from "../../checkpoint";

describe("parsePorcelainPaths", () => {
  it("extracts simple modified and untracked paths", () => {
    const output = [
      " M src/App.tsx",
      "?? package.json",
      "A  vibe-model/prd.md",
    ].join("\n");

    expect(parsePorcelainPaths(output)).toEqual([
      "src/App.tsx",
      "package.json",
      "vibe-model/prd.md",
    ]);
  });

  it("returns both sides of rename entries", () => {
    const output = "R  old-name.ts -> new-name.ts";

    expect(parsePorcelainPaths(output)).toEqual([
      "old-name.ts",
      "new-name.ts",
    ]);
  });
});

describe("shouldExcludeFromAutoCommit", () => {
  it("excludes dependency and build artifact directories", () => {
    expect(shouldExcludeFromAutoCommit("node_modules/react/index.js")).toBe(true);
    expect(shouldExcludeFromAutoCommit("apps/demo/dist/index.html")).toBe(true);
    expect(shouldExcludeFromAutoCommit("apps/demo/.vite/cache.json")).toBe(true);
    expect(shouldExcludeFromAutoCommit("apps/demo/.vitest/results.json")).toBe(true);
    expect(shouldExcludeFromAutoCommit("coverage/index.html")).toBe(true);
  });

  it("excludes TypeScript incremental build artifacts", () => {
    expect(shouldExcludeFromAutoCommit("tsconfig.tsbuildinfo")).toBe(true);
    expect(shouldExcludeFromAutoCommit("apps/demo/tmp/project.tsbuildinfo")).toBe(true);
  });

  it("does not exclude normal source files", () => {
    expect(shouldExcludeFromAutoCommit("src/App.tsx")).toBe(false);
    expect(shouldExcludeFromAutoCommit("vite.config.ts")).toBe(false);
    expect(shouldExcludeFromAutoCommit("docs/build-pipeline.md")).toBe(false);
  });
});
