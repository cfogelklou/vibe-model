/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * AI provider integration (Claude and Gemini).
 * Handles CLI execution, stream JSON parsing, and retry logic.
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { config } from "./config";
import { logDebug, logInfo, logWarning } from "./logger";
import { geminiReviewPrompt } from "./prompts/index";
import { VModelError, type ClaudeCapabilities, type StreamEvent, type ReviewResult } from "./types";
import type { ReviewerType } from "./constants";
import { requires } from "./contracts";

// Track child processes for cleanup
export const childProcesses: Array<ReturnType<typeof spawn>> = [];

/**
 * Detect Claude CLI version and capabilities
 *
 * Uses claude --help to detect available flags since --version output
 * doesn't include flag information.
 */
export async function detectClaudeCapabilities(): Promise<ClaudeCapabilities> {
  return new Promise((resolve) => {
    const proc = spawn("claude", ["--help"], {
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
      const helpOutput = stdout + stderr;

      // Parse version from help output if available
      const versionMatch = helpOutput.match(/version (\d+\.\d+\.\d+)/i);
      const version = versionMatch ? versionMatch[1] : "unknown";

      // Check for --print flag (basic feature)
      const hasPrint = helpOutput.includes("--print");

      // Check for stream-json support (newer feature)
      const hasStreamJson = helpOutput.includes("stream-json");

      // Check for --verbose flag
      const hasVerbose = helpOutput.includes("--verbose");

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
    const lastLine = lines.pop() || ""; // Keep incomplete last line separate

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const event = JSON.parse(line) as StreamEvent;
        // Keep unprocessed lines in buffer for next call (slice from i + 1 to avoid duplicate issues)
        this.buffer = [...lines.slice(i + 1), lastLine].join("\n");
        return event;
      } catch {
        // Skip invalid JSON, try next line
        continue;
      }
    }
    // No valid JSON found, keep last line in buffer
    this.buffer = lastLine;
    return null;
  }

  reset(): void {
    this.buffer = "";
  }
}

/**
 * Persistent buffer for stream JSON parsing
 * Must be reset before starting a new stream
 */
let streamBuffer = new StreamBuffer();

/**
 * Parse stream JSON chunk and handle events
 */
function parseStreamChunk(chunk: string): void {
  streamBuffer.add(chunk);

  // Process all complete events from this chunk
  while (true) {
    const event = streamBuffer.tryExtract();
    if (!event) break;

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
}

/**
 * Reset the stream buffer before starting a new stream
 */
function resetStreamBuffer(): void {
  streamBuffer = new StreamBuffer();
}

/**
 * Run AI with prompt file, printing status to stderr when VERBOSE=true.
 * In verbose mode (Claude only): uses stream-json to show tool calls and thinking live.
 *
 * Returns the AI exit code.
 */
export function ensureSuccessfulAIExit(exitCode: number, operation: string): void {
  requires(operation.trim().length > 0, "ensureSuccessfulAIExit: operation must be non-empty");
  if (exitCode !== 0) {
    throw new VModelError(
      `AI ${operation} failed with exit code ${exitCode}. No orchestrator state was advanced.`,
      exitCode,
    );
  }
}

const AI_MAX_ATTEMPTS = 5;
const AI_BACKOFF_MS = [60_000, 120_000, 240_000, 300_000]; // 1,2,4,5 min backoff (ride through sustained gateway outages; each 529 attempt itself eats ~3 min)
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Spawn ONE claude invocation: stream output live AND capture it for diagnostics.
 * Returns { code, output } where output is the merged stdout+stderr captured this run.
 *
 * Always claude: external CLI consultation was removed in favour of claude
 * subagent reviewers.
 */
async function runAIOnce(
  aiCmd: string[],
  promptFile: string,
  capabilities: ClaudeCapabilities | null,
): Promise<{ code: number; output: string }> {
  let captured = "";

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

    const useStreamJson =
      config.verbose &&
      !!capabilities?.hasStreamJson &&
      !!capabilities?.hasVerbose;

    // Handle verbose mode streaming (live passthrough + capture for diagnostics)
    if (useStreamJson) {
      // Stream JSON parsing mode
      proc.stdout?.on("data", (chunk) => {
        const text = chunk.toString();
        captured += text;
        parseStreamChunk(text);
      });

      proc.stderr?.on("data", (chunk) => {
        const text = chunk.toString();
        captured += text;
        process.stderr.write(text); // Pass through stderr output
      });
    } else {
      // Non-streaming mode - pass through output
      proc.stdout?.on("data", (chunk) => {
        const text = chunk.toString();
        captured += text;
        process.stdout.write(text);
      });

      proc.stderr?.on("data", (chunk) => {
        const text = chunk.toString();
        captured += text;
        process.stderr.write(text);
      });
    }

    proc.on("close", (code) => {
      // Remove from tracking
      const index = childProcesses.indexOf(proc);
      if (index > -1) {
        childProcesses.splice(index, 1);
      }

      resolve({ code: code ?? 0, output: captured });
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
 * Run AI with prompt file, with retry+backoff for transient failures (429 / API hiccups).
 * In verbose mode (Claude only): uses stream-json to show tool calls and thinking live.
 *
 * Returns the AI exit code (0 = success). On failure, logs the captured output tail so
 * the cause is diagnosable (previously the error was swallowed).
 *
 * Always claude — external CLI consultation is replaced by claude subagents.
 */
export async function runAIWithPrompt(promptFile: string): Promise<number> {
  requires(promptFile.trim().length > 0, "runAIWithPrompt: promptFile must be non-empty");

  // Always claude (external CLI consultation removed).
  const capabilities = await detectClaudeCapabilities();

  // Build AI command (claude only)
  const aiCmd = ["claude"];
  if (capabilities) {
    if (capabilities.hasPrint) {
      aiCmd.push("--print");
    }
    aiCmd.push("--dangerously-skip-permissions");
    if (config.verbose && capabilities.hasStreamJson && capabilities.hasVerbose) {
      aiCmd.push("--output-format", "stream-json");
      aiCmd.push("--include-partial-messages");
      aiCmd.push("--verbose");
    }
  }

  logDebug(`Running AI command: ${aiCmd.join(" ")}`);

  for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt++) {
    // Reset stream buffer before each attempt
    resetStreamBuffer();

    const { code, output } = await runAIOnce(aiCmd, promptFile, capabilities);
    if (code === 0) {
      return 0;
    }

    // Failure — log the captured output tail so failures are diagnosable, then retry.
    const tail = output.trimEnd().slice(-1500);
    logWarning(
      `AI attempt ${attempt}/${AI_MAX_ATTEMPTS} exited ${code}. ` +
        `Likely transient (429 / API error). Captured output tail:\n${tail || "(no output)"}`,
    );

    if (attempt < AI_MAX_ATTEMPTS) {
      const wait = AI_BACKOFF_MS[attempt - 1] ?? 60_000;
      logInfo(`Retrying AI in ${Math.round(wait / 1000)}s...`);
      await sleep(wait);
    } else {
      logWarning(`AI failed after ${AI_MAX_ATTEMPTS} attempts.`);
    }
  }

  return 1;
}

/**
 * Consult a claude subagent reviewer for design review.
 * (Always claude — the old external-CLI path is gone; this spawns a claude reviewer
 * with the same role-based review prompt.)
 */
export async function consultGemini(
  phase: string,
  designContent: string,
  researchContent?: string
): Promise<string> {
  requires(phase.trim().length > 0, "consultGemini: phase must be non-empty");
  requires(
    designContent.trim().length > 0,
    "consultGemini: designContent must be non-empty"
  );

  // Use the new type-safe prompt system
  const hasResearch = Boolean(researchContent?.trim());
  const reviewPrompt = geminiReviewPrompt({
    PHASE: phase,
    DESIGN_CONTENT: designContent,
    RESEARCH_CONTENT: researchContent || '',
  }, hasResearch);

  // Run a claude subagent reviewer with the review prompt
  const proc = spawn("claude", ["--print", "--dangerously-skip-permissions"], {
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
        reject(new Error(`Reviewer (claude) exited with code ${code}`));
      }
    });

    proc.on("error", reject);
  });

  return output;
}

/**
 * Run a single specialist review using Claude --print.
 *
 * Writes the review prompt to a temp file, spawns `claude --print`,
 * captures the output, and parses PASS/FAIL + findings.
 */
export async function runReview(
  reviewerType: ReviewerType,
  prompt: string,
): Promise<ReviewResult> {
  const capabilities = await detectClaudeCapabilities();

  // Build command — always use --print for reviews (no interactive session)
  const args = ["claude", "--print", "--dangerously-skip-permissions"];
  if (config.verbose && capabilities.hasVerbose) {
    args.push("--verbose");
  }

  // Write prompt to temp file and feed via stdin (same pattern as runAIWithPrompt)
  const tempFile = path.join(
    os.tmpdir(),
    `vibe-model-review-${reviewerType}-${Date.now()}.md`,
  );

  await fs.writeFile(tempFile, prompt);

  try {
    return await new Promise<ReviewResult>((resolve, reject) => {
      const proc = spawn(args[0], args.slice(1), {
        stdio: ["pipe", "pipe", "pipe"],
      });

      childProcesses.push(proc);

      // Feed prompt via stdin
      fs.readFile(tempFile, "utf-8")
        .then((content) => {
          proc.stdin?.write(content);
          proc.stdin?.end();
        })
        .catch((error) => {
          logDebug(`Failed to read review prompt file: ${error}`);
          proc.kill();
          reject(error);
        });

      let output = "";

      proc.stdout?.on("data", (chunk) => {
        output += chunk.toString();
      });

      proc.stderr?.on("data", (chunk) => {
        // Pass through stderr for visibility in verbose mode
        if (config.verbose) {
          process.stderr.write(chunk);
        }
      });

      proc.on("close", (code) => {
        // Remove from tracking
        const index = childProcesses.indexOf(proc);
        if (index > -1) {
          childProcesses.splice(index, 1);
        }

        if (code === 130) {
          process.exit(130);
        }

        // Parse output for PASS/FAIL
        const result = parseReviewOutput(reviewerType, output);
        resolve(result);
      });

      proc.on("error", (error) => {
        const index = childProcesses.indexOf(proc);
        if (index > -1) {
          childProcesses.splice(index, 1);
        }

        logWarning(`Review process error (${reviewerType}): ${error}`);
        resolve({
          pass: false,
          reviewer: reviewerType,
          findings: [`Review process failed: ${error}`],
        });
      });
    });
  } finally {
    try {
      await fs.unlink(tempFile);
    } catch {
      // Temp file cleanup failed, ignore
    }
  }
}

/**
 * Parse the raw review output into a structured ReviewResult.
 *
 * Looks for "VERDICT: PASS" or "VERDICT: FAIL" in the output text,
 * or "SCORE: +2" (pass) / "SCORE: -1" (fail) for PRD reviews.
 * Then extracts individual findings (BLOCKER/MAJOR/MINOR lines).
 */
function parseReviewOutput(
  reviewerType: ReviewerType,
  output: string,
): ReviewResult {
  const upper = output.toUpperCase();

  // Check for VERDICT markers
  const hasVerdictPass = upper.includes("VERDICT: PASS");
  const hasVerdictFail = upper.includes("VERDICT: FAIL");

  // Check for SCORE markers (used by PRD reviews)
  const hasScorePass = upper.includes("SCORE: +2") || upper.includes("SCORE:+2");
  const hasScoreFail = upper.includes("SCORE: -1") || upper.includes("SCORE:-1");

  // Legacy fallback: look for PASS/FAIL words (broad, can cause false positives)
  const hasPassWord = upper.includes("PASS");
  const hasFailWord = upper.includes("FAIL");

  // Determine pass/fail: explicit markers take priority, score markers next, then words
  const hasPassMarker = hasVerdictPass || hasScorePass;
  const hasFailMarker = hasVerdictFail || hasScoreFail;
  const isPass = hasFailMarker ? false : hasPassMarker ? true : hasFailWord ? false : hasPassWord ? true : true;

  // Extract findings from lines like "- [BLOCKER] ..." or "- [MAJOR] ..."
  const findings: string[] = [];
  const findingPattern = /^[-*]\s*\[(BLOCKER|MAJOR|MINOR)\]\s*(.+)$/gim;
  let match: RegExpExecArray | null;
  while ((match = findingPattern.exec(output)) !== null) {
    findings.push(`[${match[1]}] ${match[2].trim()}`);
  }

  // If no structured findings found but the review failed, include the raw output snippet
  if (!isPass && findings.length === 0) {
    const snippet = output.slice(0, 500).trim();
    if (snippet) {
      findings.push(snippet);
    } else {
      findings.push("Review failed with no detailed findings.");
    }
  }

  return {
    pass: isPass,
    reviewer: reviewerType,
    findings,
  };
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
