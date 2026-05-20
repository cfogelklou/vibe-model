/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Shared lifecycle context for all phase prompts.
 * Shows agents their position in the V-Model lifecycle.
 */

/**
 * Get lifecycle overview for a specific state.
 * Returns a formatted string showing the agent's current position and the full lifecycle.
 */
export function getLifecycleOverview(
  currentState: string,
  previousState: string | null,
  nextState: string | null
): string {
  const lifecycle = "PRD → REQUIREMENTS → DESIGN → IMPLEMENTATION → UNIT_TEST → INTEGRATION_TEST → DELIVERY → COMPLETE";

  return `## V-Model Lifecycle Context

**You are in:** **${currentState}** phase

**Full lifecycle:** ${lifecycle}

${previousState ? `**Previous phase:** ${previousState}` : ""}
${nextState ? `**Next phase:** ${nextState}` : ""}

### General Guardrails
- Prefer the simplest solution that satisfies the explicit milestone requirements.
- Do **not** introduce proactive performance work, bundle-size work, caching, memoization, scalability work, or refactors for their own sake unless they are explicitly required by the PRD/milestone or a concrete regression has been observed.
- When a possible optimization is merely hypothetical, note it briefly only if useful and continue with scoped delivery.
---
`;
}
