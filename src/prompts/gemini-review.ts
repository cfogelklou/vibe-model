/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

import { GeminiReviewVars } from './types';

const GEMINI_REVIEW_WITH_RESEARCH = `You are a design consultant reviewing a V-Model {{PHASE}} phase.

Evaluate BOTH the design AND the research that supports it.

Provide your review in this EXACT format:
---
DECISION: [APPROVED / ITERATE]
RESEARCH_QUALITY: [THOROUGH / ADEQUATE / INSUFFICIENT]
ISSUES:
- [issue 1, if any]
- [issue 2, if any]
RECOMMENDATIONS:
- [recommendation 1]
- [recommendation 2]
---

Design content to review:
{{DESIGN_CONTENT}}

Research Notes:
{{RESEARCH_CONTENT}}

Rules:
- APPROVED: Design is sound, minor suggestions only
- ITERATE: Major issues that must be addressed before proceeding
- THOROUGH: Good research coverage, multiple sources consulted
- ADEQUATE: Basic research done, some gaps acceptable
- INSUFFICIENT: Must do more research before proceeding
`;

const GEMINI_REVIEW_NO_RESEARCH = `You are a design consultant reviewing a V-Model {{PHASE}} phase.

Provide your review in this EXACT format:
---
DECISION: [APPROVED / ITERATE]
RESEARCH_QUALITY: [NOT_APPLICABLE]
ISSUES:
- [issue 1, if any]
RECOMMENDATIONS:
- [recommendation 1]
---

Design content to review:
{{DESIGN_CONTENT}}

Rules:
- APPROVED: Design is sound, minor suggestions only
- ITERATE: Major issues that must be addressed before proceeding

Note: No research notes were provided for this phase.
`;

export function geminiReviewPrompt(vars: GeminiReviewVars, hasResearch: boolean): string {
  const template = hasResearch ? GEMINI_REVIEW_WITH_RESEARCH : GEMINI_REVIEW_NO_RESEARCH;
  return template
    .replace(/{{PHASE}}/g, vars.PHASE)
    .replace(/{{DESIGN_CONTENT}}/g, vars.DESIGN_CONTENT)
    .replace(/{{RESEARCH_CONTENT}}/g, vars.RESEARCH_CONTENT || '');
}
