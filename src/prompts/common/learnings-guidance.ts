/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Shared learnings guidance for prompts.
 * Clarifies where to write different types of learnings (epic vs journey).
 */

export const LEARNINGS_GUIDANCE = `## Learnings - Where to Write Them

**Epic-specific learnings** (mentions specific story names, epic-only context):
- Write to epic file \`## Learnings\` section
- Example: "Story S2 Login Form: std::optional worked well for nullable user fields"
- Example: "Epic E1 CLI implementation: std::print from C++23 is efficient for output"

**Cross-epic learnings** (applies to entire journey, architectural decisions, patterns):
- Write to journey.md \`## Learnings Log\` section
- Example: "Always use async/await pattern for DB calls - reduces callback hell"
- Example: "CMake find_package() is more reliable than manual linking for dependencies"

**When unsure**: If a learning might help future epics or affects project-wide decisions, write to journey file. If it's specific to the current epic/story implementation, write to epic file.`;
