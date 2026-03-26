/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * ACCEPTANCE_TEST state prompt
 */


export interface AcceptanceTestVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + learnings
  SPEC_CONTENT: string; // Design spec with user requirements and acceptance criteria
}

/**
 * Generate ACCEPTANCE_TEST state prompt
 */
export function acceptanceTestPrompt(vars: AcceptanceTestVars): string {
  return `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to ./vibe-model/vibe-model.md for the complete V-Model protocol specification.

AI Provider: ${vars.AI_PROVIDER}

## Important File Paths

**Journey File:** ${vars.JOURNEY_FILE}
**Working Directory:** (provided separately)

## Your Journey

${vars.JOURNEY_CONTENT}

## Design Spec (User Requirements & Acceptance Criteria)

${vars.SPEC_CONTENT}

## Your Task: ACCEPTANCE_TEST Phase

You are in the **ACCEPTANCE_TEST** phase. Verify the system against the User Requirements and final Acceptance Criteria.

### Steps:

1. **Review User Requirements**:
   - Read the User Requirements section of the spec
   - Identify the original goal and user needs
   - Review Acceptance Criteria

2. **Run acceptance tests**:
   - Verify all User Requirements are met
   - Check all Acceptance Criteria are satisfied
   - Test from the user's perspective

3. **Verify user experience**:
   - Walk through typical user workflows
   - Check usability and intuitiveness
   - Verify documentation is adequate

4. **Document results**:
   - Add acceptance test results to journey.md
   - Note any issues or concerns
   - Record user-facing bugs

5. **Update journey.md Learnings Log** with acceptance test results

6. **Mark checkboxes in journey.md**:
   - Mark completed items as \`[x]\`
   - Mark items that won't be done as \`[-]\` with brief explanation

### State Transitions:

- **If everything passes**: Transition to CONSOLIDATING
- **If tests fail**:
  - Add learning to journey.md explaining the failure
  - Transition back to REQUIREMENTS to address the issue

### Important Rules:

- Acceptance tests verify against User Requirements (not System Requirements)
- Focus on user-facing functionality and experience
- This is the final verification before completion
- **Check "## User Hints"** for any user-specified test requirements
- Mark acceptance criteria checkboxes as complete

### Acceptance Test Checklist:

- [ ] All User Requirements verified
- [ ] All Acceptance Criteria met
- [ ] User workflows functional
- [ ] Documentation complete
- [ ] No user-facing bugs
- [ ] Ready for delivery
`;
}
