#!/bin/bash

# Script to copy CLAUDE.md to GEMINI.md, .github/copilot-instructions.md, and AGENTS.md
# This ensures all AI instruction files stay in sync
#
# If .github/copilot-instructions-addendum.md exists, it will be appended
# to the copilot-instructions.md file after copying from CLAUDE.md.
# This allows for Copilot-specific content to be maintained separately.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_FILE="$PROJECT_ROOT/CLAUDE.md"
GEMINI_FILE="$PROJECT_ROOT/GEMINI.md"
COPILOT_FILE="$PROJECT_ROOT/.github/copilot-instructions.md"
AGENTS_FILE="$PROJECT_ROOT/AGENTS.md"
COPILOT_ADDENDUM="$PROJECT_ROOT/.github/copilot-instructions-addendum.md"

if [ ! -f "$SOURCE_FILE" ]; then
    echo "Error: Source file $SOURCE_FILE does not exist"
    exit 1
fi

# Create .github directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/.github"

# Copy CLAUDE.md to GEMINI.md
echo "Copying $SOURCE_FILE to $GEMINI_FILE..."
cp "$SOURCE_FILE" "$GEMINI_FILE"

# Copy CLAUDE.md to .github/copilot-instructions.md
# Note: This overwrites any existing content, preventing duplicates
echo "Copying $SOURCE_FILE to $COPILOT_FILE..."
cp "$SOURCE_FILE" "$COPILOT_FILE"

# Copy CLAUDE.md to AGENTS.md (for opencode-ai support)
echo "Copying $SOURCE_FILE to $AGENTS_FILE..."
cp "$SOURCE_FILE" "$AGENTS_FILE"

# If Copilot-specific addendum exists, append it to copilot-instructions.md
if [ -f "$COPILOT_ADDENDUM" ]; then
    echo "Appending Copilot-specific content from $COPILOT_ADDENDUM..."
    # Add markdown horizontal rule separator before addendum content
    printf "\n---\n\n" >> "$COPILOT_FILE"
    cat "$COPILOT_ADDENDUM" >> "$COPILOT_FILE"
    echo "✓ Copilot-specific addendum appended"
fi

echo "✓ AI instruction files synchronized successfully!"
echo "  - GEMINI.md updated"
echo "  - .github/copilot-instructions.md updated"
echo "  - AGENTS.md updated"
