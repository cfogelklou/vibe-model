# Epic Archival Task

## Archival Mode
{{EPIC_ARCHIVAL_MODE}}

## Journey File
{{JOURNEY_FILE}}

## Epic to Archive
Epic {{EPIC_NUM}}

## Output File
{{EPIC_FILE}}

## Journey Name
{{JOURNEY_NAME}}

## Task

Archive the completed Epic {{EPIC_NUM}} to a separate file to reduce context bloat in the main journey file.

### Context

As V-Model journeys progress through multiple epics, the journey.md file accumulates large amounts of detailed content:
- Research notes for each design phase (SYSTEM_DESIGN, ARCH_DESIGN, MODULE_DESIGN)
- Epic Decomposition sections with detailed story designs
- Learnings Log with timestamped entries
- Dead Ends and Anti-Patterns

This creates context bloat where the main journey file becomes very large, injecting unnecessary context into each AI iteration. The goal is to move completed epic details to separate files that the AI can still open and read when needed, but aren't auto-injected.

### Steps

1. **Read the journey file** at `{{JOURNEY_FILE}}`
2. **Identify Epic {{EPIC_NUM}}'s content**:
   - Epic Summary (from Epic Decomposition section)
   - Epic Decomposition (all story designs for this epic)
   - Research Notes for SYSTEM_DESIGN, ARCH_DESIGN, and MODULE_DESIGN phases related to this epic
   - Learnings Log entries related to this epic
   - Any Dead Ends encountered during this epic
3. **Create the epic file** at `{{EPIC_FILE}}` with the epic's content
4. **Update the main journey file** to replace epic details with a brief summary, then provide a link to the new `{{EPIC_FILE}}`

### Epic File Structure

Create the epic file with this structure:

```markdown
# Epic E{{EPIC_NUM}}: {Epic Name} - Archive

> **Journey**: {{JOURNEY_NAME}}
> **Archived**: {current_date}
> **Reason**: Epic completed - reducing main journey file size

## Epic Summary
{Brief 2-3 sentence summary of what this epic accomplished}

## Epic Decomposition
{Full epic decomposition with all story designs - copy from main journey}

## Research Notes

### SYSTEM_DESIGN Phase Research (Epic {{EPIC_NUM}})
{Relevant research from SYSTEM_DESIGN phase that relates to this epic}

### ARCH_DESIGN Phase Research (Epic {{EPIC_NUM}})
{Relevant research from ARCH_DESIGN phase that relates to this epic}

### MODULE_DESIGN Phase Research (Epic {{EPIC_NUM}})
{Relevant research from MODULE_DESIGN phase that relates to this epic}

## Learnings
{Learnings Log entries for this epic - filter for entries mentioning E{{EPIC_NUM}} or this epic's name}

## Dead Ends (if any)
{Any dead ends or anti-patterns specific to this epic}
```

### Main Journey Update

After creating the epic file, update the main journey file:

1. **Replace the Epic Decomposition** for this epic with a brief summary:
```markdown
### Epic E{{EPIC_NUM}}: {Epic Name}
**Status**: COMPLETE ({date})
**Stories**: {N} stories implemented
**Details**: See `{{JOURNEY_NAME}}.journey.E{{EPIC_NUM}}.md` for full documentation
```

2. **Remove or summarize** the research notes for this epic (keep only high-level findings)

3. **Update the Epic Progress table** to remain unchanged (it must stay in the main journey)

4. **Remove** detailed learnings related to this epic from the Learnings Log (keep only journey-level learnings)

### Important Constraints

- **DO NOT archive User Hints** - these must stay in the main journey file
- **DO NOT archive REQUIREMENTS Phase Research** - this is needed throughout the journey
- **DO NOT archive Anti-Patterns** - these are journey-wide and must stay accessible
- **DO preserve the Epic Progress table** in the main journey
- **DO preserve all Meta section data**
- **DO preserve Guardrails & Baseline Metrics**
- **DO preserve Pending Questions**
- **DO preserve Checkpoints**
- **DO preserve Design Spec link**

### Execution

Use the Edit tool to:
1. Create the new epic file at `{{EPIC_FILE}}`
2. Update the main journey file to replace epic details with brief summary

Ensure the main journey file remains valid and functional after archival.
