/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * ARCHIVING state prompt (Minimal - mostly code-driven)
 */


export interface ArchivingVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Minimal: just Meta
}

/**
 * Generate ARCHIVING state prompt
 */
export function archivingPrompt(vars: ArchivingVars): string {
  return `You are in the **ARCHIVING** state.

The system is archiving completed epics. This is primarily a code-driven operation.

## Your Journey

${vars.JOURNEY_CONTENT}

## What's Happening:

The system is:
1. Identifying completed epics
2. Marking them as archived in the journey
3. Updating the epic decomposition table
4. Restoring the previous state

No action is required from you. The system will automatically:
- Archive completed epics
- Restore the previous state
- Continue the journey

Wait for the system to complete the archiving process and transition.
`;
}
