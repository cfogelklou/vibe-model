#!/bin/bash
# Sanity checks for vibe-model
# Runs typecheck, build, and lint in sequence
# ALWAYS run this before marking AI-driven development as complete

set -e  # Exit on error

echo "Running sanity checks..."
echo ""

echo "1. Type checking..."
bun run typecheck

echo ""
echo "2. Building..."
bun run build

echo ""
echo "3. Linting..."
bun run lint

echo ""
echo "✅ All sanity checks passed!"
