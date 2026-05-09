/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Reviewer-specific prompt generation for sub-agent reviews.
 * Produces focused prompts for each reviewer type (architecture, code, testability, ux).
 */

import type { MilestonePromptVars } from "../types";
import { REVIEWER_PROMPTS, type ReviewerType } from "../../constants";

/**
 * Variables for reviewer prompts.
 */
export interface ReviewerPromptVars extends MilestonePromptVars {
  /** Which reviewer specialist to invoke */
  REVIEWER_TYPE: ReviewerType;
}

/**
 * Generate a reviewer-specific prompt.
 * Input: milestone content + reviewer type.
 * Output: reviewer-specific prompt that asks for PASS/FAIL with findings.
 */
export function getReviewerPrompt(vars: ReviewerPromptVars): string {
  const systemPrompt = REVIEWER_PROMPTS[vars.REVIEWER_TYPE];

  return `${systemPrompt}

## Milestone Under Review

**#${vars.MILESTONE_ID}: ${vars.MILESTONE_NAME}**

${vars.MILESTONE_CONTENT}

## Review Instructions

You are reviewing milestone **#${vars.MILESTONE_ID}: ${vars.MILESTONE_NAME}** as the **${vars.REVIEWER_TYPE}** reviewer.

1. **Evaluate** the milestone content against your review criteria (see system prompt above).
2. **List findings** — each finding must be:
   - Specific (reference a section, requirement, or code pattern).
   - Actionable (state what should change, if anything).
   - Severity: BLOCKER (must fix), MAJOR (should fix), MINOR (nice to fix).
3. **Return your verdict**:
   - \`PASS\` — no blockers or majors.
   - \`FAIL\` — one or more blockers or majors found.

### Output Format:

\`\`\`
VERDICT: PASS or FAIL

## Findings
- [BLOCKER/MAJOR/MINOR] Description of finding with specific reference.
- [BLOCKER/MAJOR/MINOR] Another finding.
\`\`\`

Be thorough but concise. Focus on your specialty area.
`;
}
