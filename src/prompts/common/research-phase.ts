/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Shared research phase instructions.
 * Used by design phase prompts to include consistent research guidance.
 */

/**
 * Research phase instructions for milestone phases
 */
export const RESEARCH_PHASE_INSTRUCTIONS = `## Research Phase

Before finalizing any design, conduct research:

**For complex research questions, use parallel explore agents:**
1. Identify 2-3 distinct research areas (e.g., existing implementations, external research, memory patterns)
2. Launch Explore agents IN PARALLEL (single message, multiple tool calls)
3. Each agent focuses on one area and reports back
4. You consolidate findings into Research Notes

**For simple research, proceed sequentially:**
1. **Web Search** (if applicable):
   - Search for existing libraries that solve this problem
   - Look for best practices, design patterns, anti-patterns
   - Use the WebSearch tool with current year (2026)

2. **Codebase Research**:
   - Search for existing implementations of similar functionality
   - Review prior milestone learnings provided in the context for anti-patterns and successful patterns
   - Review test_data/ for relevant test cases

3. **Document Findings**:
   - Add key findings to the milestone file's "## Research Notes" section
   - Cite sources (URLs, file paths, prior learnings)
`;

/**
 * Parallel agent orchestration instructions
 */
export const PARALLEL_AGENT_INSTRUCTIONS = `## Parallel Agent Orchestration (For Complex Tasks)

When dealing with complex research or implementation, you can spawn multiple sub-agents:

**During Research Phase:**
- Launch up to 3 Explore agents IN PARALLEL with different focus areas:
  - Agent 1: Existing implementations in codebase
  - Agent 2: External research (web search, best practices)
  - Agent 3: Prior milestone learnings and anti-patterns
- Each agent reports back findings
- You consolidate findings into Research Notes

**During Planning/Design:**
- Structure your plan as discrete, independent tasks
- Each task should have clear inputs and outputs
- Include dependency information (which tasks must complete first)

**At Implementation Time:**
- If tasks are independent, note: "These can be executed in parallel by sub-agents"
- If tasks have dependencies, note: "Execute A before B, then C and D can run in parallel"
- The orchestrator (you or vibe-model tool) will handle delegation
`;
