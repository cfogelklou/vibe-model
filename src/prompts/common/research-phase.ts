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
 * Research phase instructions for design phases
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

2. **External AI Consultation** (optional, for complex decisions):
   - Use external AI (Gemini CLI) to "talk through" your design reasoning
   - Ask: "What are the tradeoffs between X and Y?"
   - Ask: "What edge cases might I be missing?"
   - Command: \`echo "your question" | gemini --yolo\`
   - **Workflow**:
     * Output appears in terminal - read it and incorporate insights
     * Add key findings to journey/epic Research Notes section
     * No need to save the output separately - research notes are the record
   - Note: \`gemini\` is the Gemini CLI tool; \`--yolo\` bypasses confirmation prompts
   - See vibe-model.md section 7.2 for more details on external AI consultation

3. **Codebase Research**:
   - Search for existing implementations of similar functionality
   - Check memory.md for anti-patterns and successful patterns
   - Review test_data/ for relevant test cases

4. **Document Findings**:
   - Add key findings to journey file under "## Research Notes"
   - Cite sources (URLs, file paths, memory entries)

**IMPORTANT**: When working on an epic, write research notes to the epic file, not journey.md:
- ARCH_DESIGN research → epic file's "### ARCH_DESIGN Phase Research" section
- MODULE_DESIGN research → epic file's "### MODULE_DESIGN Phase Research" section

**Journey-level research** (affects entire journey) still goes to journey.md:
- REQUIREMENTS phase research
- SYSTEM_DESIGN phase research
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
  - Agent 3: Memory patterns and anti-patterns
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

/**
 * Get research instructions for a specific phase
 */
export function getResearchInstructions(phase: "REQUIREMENTS" | "SYSTEM_DESIGN" | "ARCH_DESIGN" | "MODULE_DESIGN"): string {
  const phaseInstructions: Record<string, string> = {
    REQUIREMENTS: `**RESEARCH**: Before finalizing requirements:
  - Web search for similar systems/libraries
  - Consult memory.md for past learnings
  - Use external AI (gemini --yolo) for complex tradeoffs (see research section above)
- Document research in "## Research Notes > ### REQUIREMENTS Phase Research"`,
    SYSTEM_DESIGN: `**RESEARCH**: Before finalizing architecture:
  - Web search for architectural patterns for the domain
  - Search codebase for similar implementations
  - Use external AI (gemini --yolo): "What architectural tradeoffs exist?"
- Document research in "## Research Notes > ### SYSTEM_DESIGN Phase Research"`,
    ARCH_DESIGN: `**RESEARCH**: Before finalizing component design:
  - Search for existing interfaces/APIs in codebase
  - Web search for component design patterns
  - Use external AI (gemini --yolo) for interface decisions
- **Write epic-specific research to epic file's Research Notes section**`,
    MODULE_DESIGN: `**RESEARCH**: Before finalizing module design:
  - Search codebase for similar functions/classes
  - Web search for algorithm implementations
  - Use external AI (gemini --yolo) for edge cases
- **Write story-specific research to epic file's Research Notes > MODULE_DESIGN section**`,
  };

  return phaseInstructions[phase] || "";
}
