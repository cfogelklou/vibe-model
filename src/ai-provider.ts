/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou)
 * Licensed under the MIT License
 */

/**
 * AI provider integration (Claude and Gemini).
 * Handles CLI execution, stream JSON parsing, and retry logic.
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { config } from "./config";
import { logDebug, logInfo } from "./logger";
import { geminiReviewPrompt } from "./prompts/index";
import type { ClaudeCapabilities, StreamEvent } from "./types";

// Track child processes for cleanup
export const childProcesses: Array<ReturnType<typeof spawn>> = [];

/**
 * Detect Claude CLI version and capabilities
 */
export async function detectClaudeCapabilities(): Promise<ClaudeCapabilities> {
  return new Promise((resolve) => {
    const proc = spawn("claude", ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", () => {
      // Parse version from output
      const versionMatch = stdout.match(/version (\d+\.\d+\.\d+)/i);
      const version = versionMatch ? versionMatch[1] : "unknown";

      // Check for --print flag (basic feature)
      const hasPrint = stdout.includes("--print") || stderr.includes("--print");

      // Check for stream-json support (newer feature)
      const hasStreamJson =
        stdout.includes("stream-json") || stderr.includes("stream-json");

      // Check for --verbose flag
      const hasVerbose =
        stdout.includes("--verbose") || stderr.includes("--verbose");

      resolve({
        hasPrint,
        hasStreamJson,
        hasVerbose,
        version,
      });
    });

    proc.on("error", () => {
      // Claude CLI not found or not executable
      resolve({
        hasPrint: false,
        hasStreamJson: false,
        hasVerbose: false,
        version: "not found",
      });
    });
  });
}

/**
 * Setup AI provider command based on configuration
 */
export async function setupAI(): Promise<void> {
  const capabilities = await detectClaudeCapabilities();

  if (config.aiProvider === "gemini") {
    logDebug("Using Gemini CLI");
  } else {
    logDebug("Using Claude CLI");
    if (capabilities.version !== "unknown") {
      logDebug(`Claude version: ${capabilities.version}`);
    }
    if (!capabilities.hasPrint) {
      logInfo("Claude CLI does not support --print flag, using stdin pipe");
    }
    if (!capabilities.hasStreamJson) {
      logInfo("Claude CLI does not support stream-json, verbose mode disabled");
    }
  }
}

/**
 * Stream buffer for handling multi-line JSON objects
 */
class StreamBuffer {
  private buffer = "";

  add(chunk: string): void {
    this.buffer += chunk;
  }

  tryExtract(): StreamEvent | null {
    // Try to parse complete JSON objects from buffer
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || ""; // Keep incomplete last line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        return JSON.parse(line) as StreamEvent;
      } catch {
        // Skip invalid JSON, try next line
        continue;
      }
    }
    return null; // No complete JSON object found
  }

  reset(): void {
    this.buffer = "";
  }
}

/**
 * Parse stream JSON chunk and handle events
 */
function parseStreamChunk(chunk: string): void {
  const buffer = new StreamBuffer();
  buffer.add(chunk);

  const event = buffer.tryExtract();
  if (!event) return;

  switch (event.type) {
    case "content_block_start":
      if (event.content_block?.type === "tool_use") {
        process.stderr.write(`\x1b[36m[AI] → ${event.content_block.name}\x1b[0m`);
      }
      break;

    case "text_delta":
      if (event.delta?.type === "text_delta") {
        // Strip ANSI escape sequences from text deltas
        const cleanText = event.delta.text.replace(/\x1b\[[0-9;]*m/g, "");
        process.stderr.write(cleanText);
      }
      break;

    case "result":
      if (event.total_cost_usd !== undefined && event.num_turns !== undefined) {
        process.stderr.write("\n");
        logDebug(
          `AI finished: ${event.num_turns} turn(s), $${event.total_cost_usd.toFixed(4)}`
        );
      }
      break;
  }
}

/**
 * Run AI with prompt file, printing status to stderr when VERBOSE=true.
 * In verbose mode (Claude only): uses stream-json to show tool calls and thinking live.
 *
 * Returns the AI exit code.
 */
export async function runAIWithPrompt(promptFile: string): Promise<number> {
  const isGemini = config.aiProvider === "gemini";
  const capabilities = isGemini
    ? null
    : await detectClaudeCapabilities();

  // Build AI command
  const aiCmd = isGemini ? ["gemini", "--yolo"] : ["claude"];

  // Add flags for Claude
  if (!isGemini && capabilities) {
    if (capabilities.hasPrint) {
      aiCmd.push("--print");
    }
    if (config.verbose && capabilities.hasStreamJson && capabilities.hasVerbose) {
      aiCmd.push("--output-format", "stream-json");
      aiCmd.push("--include-partial-messages");
      aiCmd.push("--verbose");
    }
  }

  logDebug(`Running AI command: ${aiCmd.join(" ")}`);

  return new Promise((resolve, reject) => {
    const proc = spawn(aiCmd[0], aiCmd.slice(1), {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Track for cleanup
    childProcesses.push(proc);

    // Read prompt file and write to stdin
    fs.readFile(promptFile, "utf-8")
      .then((prompt) => {
        proc.stdin?.write(prompt);
        proc.stdin?.end();
      })
      .catch((error) => {
        logDebug(`Failed to read prompt file: ${error}`);
        proc.kill();
        reject(error);
      });

    // Handle verbose mode streaming
    if (
      config.verbose &&
      !isGemini &&
      capabilities?.hasStreamJson &&
      capabilities?.hasVerbose
    ) {
      // Stream JSON parsing mode
      proc.stdout?.on("data", (chunk) => {
        const text = chunk.toString();
        parseStreamChunk(text);
      });

      proc.stderr?.on("data", (chunk) => {
        process.stderr.write(chunk); // Pass through stderr output
      });
    } else {
      // Non-streaming mode - pass through output
      proc.stdout?.on("data", (chunk) => {
        process.stdout.write(chunk);
      });

      proc.stderr?.on("data", (chunk) => {
        process.stderr.write(chunk);
      });
    }

    proc.on("close", (code) => {
      // Remove from tracking
      const index = childProcesses.indexOf(proc);
      if (index > -1) {
        childProcesses.splice(index, 1);
      }

      resolve(code || 0);
    });

    proc.on("error", (error) => {
      // Remove from tracking
      const index = childProcesses.indexOf(proc);
      if (index > -1) {
        childProcesses.splice(index, 1);
      }

      reject(error);
    });
  });
}

/**
 * Consult Gemini for design review
 */
export async function consultGemini(
  phase: string,
  designContent: string,
  researchContent?: string
): Promise<string> {
  // Use the new type-safe prompt system
  const hasResearch = Boolean(researchContent?.trim());
  const reviewPrompt = geminiReviewPrompt({
    PHASE: phase,
    DESIGN_CONTENT: designContent,
    RESEARCH_CONTENT: researchContent || '',
  }, hasResearch);

  // Write review prompt to temp file
  const tempPrompt = join(tmpdir(), `vibe-model-gemini-review-${Date.now()}.md`);
  await fs.writeFile(tempPrompt, reviewPrompt);

  try {
    // Run Gemini with review prompt
    const proc = spawn("gemini", ["--yolo"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Track for cleanup
    childProcesses.push(proc);

    proc.stdin?.write(reviewPrompt);
    proc.stdin?.end();

    let output = "";

    proc.stdout?.on("data", (chunk) => {
      output += chunk.toString();
    });

    proc.on("close", (_code) => {
      // Remove from tracking
      const index = childProcesses.indexOf(proc);
      if (index > -1) {
        childProcesses.splice(index, 1);
      }
    });

    await new Promise<void>((resolve, reject) => {
      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Gemini exited with code ${code}`));
        }
      });

      proc.on("error", reject);
    });

    return output;
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempPrompt);
    } catch {
      // Temp file cleanup failed, ignore
    }
  }
}

/**
 * Kill all tracked child processes (for signal handling)
 */
export function killAllChildProcesses(): void {
  for (const proc of childProcesses) {
    try {
      proc.kill();
    } catch {
      // Process may have already exited
    }
  }
  childProcesses.length = 0;
}
