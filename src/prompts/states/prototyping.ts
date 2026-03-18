/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * PROTOTYPING state prompt
 */


export interface PrototypingVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
  JOURNEY_CONTENT: string; // Filtered: Meta + recent learnings
  EPIC_NAME: string; // Current epic name
  EPIC_NUMBER: string; // Current epic number
  CURRENT_STORY: string; // Current story title
  STORY_DESIGN: string; // Story design
}

/**
 * Generate PROTOTYPING state prompt
 */
export function prototypingPrompt(vars: PrototypingVars): string {
  return `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to vibe-model.md for the Master Protocol.

AI Provider: ${vars.AI_PROVIDER}

## Important File Paths

**Journey File:** ${vars.JOURNEY_FILE}
**Epic File:** (journey directory).${vars.JOURNEY_NAME}.journey.${vars.EPIC_NUMBER}.md
**Working Directory:** (provided separately)

## Your Journey

${vars.JOURNEY_CONTENT}

## Current Story: ${vars.CURRENT_STORY}

${vars.STORY_DESIGN}

## Your Task: PROTOTYPING Phase (Optional)

You are in the **PROTOTYPING** phase for **Story: ${vars.CURRENT_STORY}**.
Use prototyping to validate complex algorithms before production implementation.

### When to Use Prototyping:

- Complex algorithms that need validation
- Performance-critical code that needs benchmarking
- Uncertain technical approaches
- Proof-of-concept for novel solutions

### Steps:

1. **Choose prototype language**:
   - Python for rapid prototyping and algorithm validation
   - C++ for performance-critical algorithms
   - Any appropriate language for the problem

2. **Create prototype**:
   - Implement the core algorithm or approach
   - Add test cases to validate correctness
   - Measure performance if relevant

3. **Validate the approach**:
   - Run tests to verify correctness
   - Compare alternatives if applicable
   - Document findings

4. **Document results**:
   - Add prototype findings to journey.md Learnings
   - Note which approach was selected and why
   - Record any performance metrics

5. **Transition**:
   - If successful: Transition back to MODULE_DESIGN or IMPLEMENTATION
   - If failed: Document findings and consider alternative approaches

### Important Rules:

- Prototypes are for exploration, not production code
- Keep prototypes simple and focused
- Document what you learned
- **Check "## User Hints"** for any user-specified prototyping requirements
- Production implementation should happen in IMPLEMENTATION phase

### State Transitions:

- **If prototype successful**: Transition to MODULE_DESIGN (to refine design) or IMPLEMENTATION
- **If prototype failed**: Document findings and stay in PROTOTYPING to try alternatives, or pivot to different approach

### Prototype Checklist:

- [ ] Core algorithm implemented
- [ ] Test cases validate correctness
- [ ] Performance measured (if applicable)
- [ ] Findings documented
- [ ] Ready for production implementation
`;
}
