/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Shared state transition instructions.
 * Used by state phase prompts to provide explicit guidance on how to transition states.
 */

/**
 * Generate state transition instructions
 * @param fileType - Which file to update ("journey" or "epic")
 * @param currentState - Current V-Model state
 * @param nextState - Target V-Model state to transition to
 */
export function getStateTransitionInstructions(
  fileType: "journey" | "epic",
  currentState: string,
  nextState: string
): string {
  const fileName = fileType === "journey" ? "journey.md" : "epic file";

  return `### State Transition

When complete:
1. Open the ${fileName}
2. Find the Meta section (near the top)
3. Update the line: \`- Current State: ${currentState}\`
4. Change to: \`- Current State: ${nextState}\`

Example: Change \`- Current State: ${currentState}\` to \`- Current State: ${nextState}\`

This triggers automatic state transition on the next iteration.`;
}
