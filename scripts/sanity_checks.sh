#!/bin/bash
# Pre-completion sanity checks for vibe-model
# This script runs typecheck, build, and lint to ensure code quality

set -e

echo "Running sanity checks..."
echo ""

echo "1. Running TypeScript type check..."
bun run typecheck

echo ""
echo "2. Building vibe-model..."
bun run build

echo ""
echo "3. Running ESLint..."
bun run lint

echo ""
echo "✅ All sanity checks passed!"
