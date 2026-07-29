/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Configuration management with flexible path resolution.
 * Supports running as an installed binary or directly from source.
 */

import { existsSync } from "fs";
import os from "os";
import path from "path";
import type { Config, AIProvider } from "./types";

/**
 * Walk upward from a starting directory and return the nearest git root.
 * Handles both normal repositories (.git directory) and submodules/worktrees (.git file).
 */
function findNearestGitRoot(startDir: string): string | null {
  let current = path.resolve(startDir);

  while (true) {
    if (existsSync(path.join(current, ".git"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

/**
 * Detect the target project directory.
 *
 * Priority order:
 * 1. Explicit --project-dir argument (highest priority)
 * 2. Nearest git root from the current working directory
 * 3. Fallback to the current working directory
 */
export async function detectProjectDirectory(
  explicitProjectDir?: string
): Promise<string> {
  if (explicitProjectDir) {
    if (!existsSync(explicitProjectDir)) {
      throw new Error(`Project directory not found: ${explicitProjectDir}`);
    }
    return path.resolve(explicitProjectDir);
  }

  const cwd = process.cwd();
  const gitRoot = findNearestGitRoot(cwd);

  if (gitRoot) {
    return gitRoot;
  }

  console.warn("Could not detect git root, using current directory");
  return cwd;
}

/**
 * Load optional .vibe-modelrc config file
 * Supports plain JSON (not JSON5 for Bun compatibility)
 */
export async function loadConfigFile(configPath?: string): Promise<Partial<Config>> {
  const candidates = configPath
    ? [configPath]
    : [
        path.join(process.cwd(), ".vibe-modelrc"),
        path.join(os.homedir(), ".vibe-modelrc"),
      ];

  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        const content = await Bun.file(candidate).text();
        return JSON.parse(content) as Partial<Config>;
      }
    } catch (error) {
      console.warn(`Failed to load config from ${candidate}:`, error);
    }
  }

  return {};
}

/**
 * Merge configuration from multiple sources with proper priority.
 *
 * Priority order (lowest to highest):
 * 1. Defaults
 * 2. Config file (.vibe-modelrc)
 * 3. Environment variables
 * 4. CLI arguments (highest priority)
 */
export function mergeConfig(
  cliArgs: Partial<Config>,
  envVars: Partial<Config>,
  configFile: Partial<Config>,
  defaults: Config
): Config {
  return {
    ...defaults,
    ...configFile,
    ...envVars,
    ...cliArgs,
  };
}

/**
 * Parse environment variables into config object
 */
export function parseEnvironmentVars(): Partial<Config> {
  const env: Partial<Config> = {};

  if (process.env.AI_PROVIDER === "claude" || process.env.AI_PROVIDER === "gemini") {
    env.aiProvider = process.env.AI_PROVIDER as AIProvider;
  }

  if (process.env.MAX_ITERATIONS) {
    env.maxIterations = parseInt(process.env.MAX_ITERATIONS, 10);
  }

  if (process.env.CONSULT_GEMINI === "true" || process.env.CONSULT_GEMINI === "false") {
    env.consultGemini = process.env.CONSULT_GEMINI === "true";
  }

  if (process.env.VERBOSE === "true") {
    env.verbose = true;
  }

  // Milestone system env vars
  if (process.env.HIL_MODE === "false") {
    env.hilMode = false;
    env.autonomous = true;
  }
  if (process.env.REVIEW_ENABLED === "true") {
    env.reviewEnabled = true;
  }

  return env;
}

/**
 * Default configuration values
 */
export const defaultConfig: Config = {
  aiProvider: "claude" as AIProvider,
  maxIterations: 100,
  consultGemini: true,
  projectDir: "", // Will be set by detectProjectDirectory
  verbose: false,
  noPush: false,
  commitInterval: 1,
  hilMode: true,
  reviewEnabled: false,
  autonomous: false,
};

/**
 * Global configuration instance (set after initialization)
 */
export let config: Config;

/**
 * Initialize configuration from all sources
 */
export async function initializeConfig(
  cliArgs: Partial<Config> = {},
  configFilePath?: string
): Promise<Config> {
  // Detect project directory first (CLI arg takes priority)
  const projectDir = await detectProjectDirectory(cliArgs.projectDir);
  cliArgs.projectDir = projectDir;

  // Load config file
  const configFile = await loadConfigFile(configFilePath);

  // Parse environment variables
  const envVars = parseEnvironmentVars();

  // Merge all sources
  config = mergeConfig(cliArgs, envVars, configFile, defaultConfig);

  return config;
}
