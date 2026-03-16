import { EpicArchivalVars } from './types.js';

// Static sections
const EPIC_ARCHIVAL_TASK = `## Task

Mark the completed Epic {{EPIC_NUM}} as COMPLETE in the epic file.

### Context

Epic content is written directly to the epic file during work. The archival process simply marks the epic as COMPLETE and updates journey.md with a completion summary.

### Prerequisites

The epic file MUST exist at \`{{EPIC_FILE}}\`. If it doesn't, this is an error in the workflow.

### Steps

1. **Read the epic file** at \`{{EPIC_FILE}}\`
2. **Update the epic file**:
   - Change Status from "IN_PROGRESS" to "COMPLETE ({current_date})"
   - Add completion summary to Epic Summary section
   - Update Implementation Progress table: all stories should show COMPLETE with test results
3. **Update the main journey file** at \`{{JOURNEY_FILE}}\`:
   - In Epic Progress table: mark epic as COMPLETE
   - Add brief completion entry in Learnings Log
   - Ensure link to epic file is present

### Epic File Update

Update the epic file header:
\`\`\`markdown
# Epic E{{EPIC_NUM}}: {Epic Name}

> **Journey**: {{JOURNEY_NAME}}
> **Created**: {original_date}
> **Status**: COMPLETE ({current_date})
\`\`\`

### Main Journey Update

Update the Epic Progress table row with exact format (must match \`extractEpicProgressTable()\` regex in epic-archival.ts:114):
\`\`\`markdown
| E{{EPIC_NUM}} | {Epic Name} | COMPLETE | {N} | {N} |
\`\`\`

**Note**: The Status column should be "COMPLETE" (not "COMPLETE (date)") to match the regex \`/^\\| E(\\d+) \\| (.+?) \\| (\\w+) /\`. The date can be added in the Learnings Log entry instead.

Add to Learnings Log:
\`\`\`markdown
**Epic E{{EPIC_NUM}} ({Epic Name}) COMPLETED**. All N stories implemented with X tests passing.
See \`{{JOURNEY_NAME}}.journey.E{{EPIC_NUM}}.md\` for full documentation.
\`\`\`

### Important Constraints

- **DO NOT extract content from journey.md** - it's already in the epic file
- **DO preserve all epic content** - research, designs, learnings
- **DO NOT modify User Hints** - these stay in journey.md
- **DO preserve the Epic Progress table** in journey.md

### Execution

Use the Edit tool to:
1. Update the epic file status and add completion summary
2. Update the main journey file's Epic Progress table and Learnings Log`;

// Dynamic sections
function renderEpicArchivalHeader(vars: EpicArchivalVars): string {
  return `# Epic Archival Task

## Archival Mode
${vars.EPIC_ARCHIVAL_MODE}

## Journey File
${vars.JOURNEY_FILE}

## Epic to Archive
Epic ${vars.EPIC_NUM}

## Output File
${vars.EPIC_FILE}

## Journey Name
${vars.JOURNEY_NAME}

`;
}

// Main export function
export function epicArchivalPrompt(vars: EpicArchivalVars): string {
  const header = renderEpicArchivalHeader(vars);
  const task = EPIC_ARCHIVAL_TASK
    .replaceAll('{{EPIC_NUM}}', vars.EPIC_NUM)
    .replaceAll('{{JOURNEY_FILE}}', vars.JOURNEY_FILE)
    .replaceAll('{{EPIC_FILE}}', vars.EPIC_FILE)
    .replaceAll('{{JOURNEY_NAME}}', vars.JOURNEY_NAME);

  return header + task;
}
