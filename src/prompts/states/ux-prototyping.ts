/**
 * UX-MVP PROTOTYPING state prompt.
 */

export interface UxPrototypingVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string;
  ITERATION: number;
  PREVIOUS_FEEDBACK?: string;
}

export function uxPrototypingPrompt(vars: UxPrototypingVars): string {
  const version = vars.ITERATION + 1;
  const feedbackSection = vars.PREVIOUS_FEEDBACK
    ? `## Previous Feedback\n${vars.PREVIOUS_FEEDBACK}\n\n`
    : "";

  return `You are in **PROTOTYPING** state (UX MVP mode, iteration ${version}).

## Task
Create or revise a UX mockup as a concrete reference for later V-Model design and implementation.

## Journey Context
${vars.JOURNEY_CONTENT}

${feedbackSection}## User Input & Feedback
- **Check "## User Hints"** for explicit UX requirements and constraints
- Incorporate user feedback from the latest iteration before generating changes

## Output Requirements
1. Create mockup file: \`vibe-model/prototypes/mockup-v${version}.html\`
2. Include:
   - Clear visual layout aligned to requirements
   - Key interactive elements (forms/buttons/links)
   - Main user flow represented on screen
   - Realistic placeholder copy where needed

## Constraints
- Pure HTML/CSS (no backend)
- Keep structure and usability clear over polish
- Ensure responsive layout for mobile and desktop
- Keep file simple and inspectable

After creation, summarize:
- What was changed in this iteration
- Which requirements are covered
- Any UX tradeoffs or open questions
`;
}
