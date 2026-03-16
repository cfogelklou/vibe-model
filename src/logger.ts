/**
 * Logging utilities with ANSI color support.
 * Preserves existing color scheme from bash version.
 */

import { config } from "./config.js";

// ANSI color codes
const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  purple: "\x1b[0;35m",
  cyan: "\x1b[0;36m",
  gray: "\x1b[0;90m",
};

/**
 * Log informational message (blue)
 */
export function logInfo(message: string): void {
  console.error(`${COLORS.blue}[INFO]${COLORS.reset} ${message}`);
}

/**
 * Log success message (green)
 */
export function logSuccess(message: string): void {
  console.error(`${COLORS.green}[SUCCESS]${COLORS.reset} ${message}`);
}

/**
 * Log warning message (yellow)
 */
export function logWarning(message: string): void {
  console.error(`${COLORS.yellow}[WARNING]${COLORS.reset} ${message}`);
}

/**
 * Log error message (red)
 */
export function logError(message: string): void {
  console.error(`${COLORS.red}[ERROR]${COLORS.reset} ${message}`);
}

/**
 * Log phase message (purple)
 */
export function logPhase(message: string): void {
  console.error(`${COLORS.purple}[PHASE]${COLORS.reset} ${message}`);
}

/**
 * Log state message (cyan)
 */
export function logState(message: string): void {
  console.error(`${COLORS.cyan}[STATE]${COLORS.reset} ${message}`);
}

/**
 * Log debug message (gray) - only shown in verbose mode
 */
export function logDebug(message: string): void {
  if (config?.verbose) {
    console.error(`${COLORS.gray}[DEBUG]${COLORS.reset} ${message}`);
  }
}

/**
 * Enable or disable verbose mode
 */
export function setVerbose(enabled: boolean): void {
  if (config) {
    config.verbose = enabled;
  }
}
