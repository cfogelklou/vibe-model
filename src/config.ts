/**
 * Configuration management with flexible path resolution.
 * Supports running from submodule position (parent-project/ai-v-model/) or sibling position.
 */

import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Config, AIProvider } from "./types.js";

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);

/**
 * Detect the project directory based on script location.
 * Works from both submodule position (parent-project/ai-v-model/) and sibling position.
 *
 * Priority order:
 * 1. Explicit --project-dir argument (highest priority)
 * 2. Submodule detection (ai-v-model directory with parent .git)
 * 3. Current directory has .git (sibling case)
 * 4. Parent directory has .git (nested case)
 * 5. Fallback to current directory
 */
export async function detectProjectDirectory(
  explicitProjectDir?: string
): Promise<string> {
  // 1. Explicit --project-dir argument (highest priority)
  if (explicitProjectDir) {
    if (!existsSync(explicitProjectDir)) {
      throw new Error(`Project directory not found: ${explicitProjectDir}`);
    }
    return path.resolve(explicitProjectDir);
  }

  // 2. Check if we're in ai-v-model directory (submodule case)
  const dirName = path.basename(SCRIPT_DIR);
  if (dirName === "ai-v-model") {
    const parentDir = path.dirname(SCRIPT_DIR);
    if (existsSync(path.join(parentDir, ".git"))) {
      return parentDir; // Parent is the project
    }
    // Parent might not have .git yet, assume it's the project
    return parentDir;
  }

  // Check if we're in src directory (dev mode)
  if (dirName === "src") {
    const aiVModelDir = path.dirname(SCRIPT_DIR);
    const parentDir = path.dirname(aiVModelDir);
    if (existsSync(path.join(parentDir, ".git"))) {
      return parentDir;
    }
    return parentDir;
  }

  // 3. Check for .git in current directory (sibling case)
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, ".git"))) {
    return cwd;
  }

  // 4. Check for .git in parent directory (nested case)
  const parentDir = path.dirname(cwd);
  if (existsSync(path.join(parentDir, ".git"))) {
    return parentDir;
  }

  // 5. Fallback: use current directory
  console.warn("Could not detect project directory, using current directory");
  return cwd;
}

/**
 * Load optional .v-modelrc config file
 * Supports plain JSON (not JSON5 for Bun compatibility)
 */
export async function loadConfigFile(configPath?: string): Promise<Partial<Config>> {
  const candidates = configPath
    ? [configPath]
    : [
        path.join(process.cwd(), ".v-modelrc"),
        path.join(process.env.HOME || "", ".v-modelrc"),
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
 * 2. Config file (.v-modelrc)
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

  if (process.env.CPU_THRESHOLD) {
    env.cpuThreshold = parseInt(process.env.CPU_THRESHOLD, 10);
  }

  if (process.env.LATENCY_THRESHOLD) {
    env.latencyThreshold = parseInt(process.env.LATENCY_THRESHOLD, 10);
  }

  if (process.env.CONSULT_GEMINI === "true" || process.env.CONSULT_GEMINI === "false") {
    env.consultGemini = process.env.CONSULT_GEMINI === "true";
  }

  if (process.env.VERBOSE === "true") {
    env.verbose = true;
  }

  return env;
}

/**
 * Default configuration values
 */
export const defaultConfig: Config = {
  aiProvider: "claude" as AIProvider,
  maxIterations: 100,
  cpuThreshold: 80,
  latencyThreshold: 100,
  consultGemini: true,
  projectDir: "", // Will be set by detectProjectDirectory
  verbose: false,
  noPush: false,
  commitInterval: 1,
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
