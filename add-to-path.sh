#!/bin/bash

BIN_DIR="${PWD}/bin"

if [ ! -d "${BIN_DIR}" ]; then
  echo "Error: ${BIN_DIR} does not exist." >&2
  echo "Run this from the vibe-model project root." >&2
  return 1 2>/dev/null || exit 1
fi

# Detect whether script is sourced (works in bash and zsh)
if [ "${BASH_SOURCE[0]:-}" = "$0" ] 2>/dev/null; then
  echo "This script must be sourced to update your current shell PATH." >&2
  echo "Use: source ./add-to-path.sh" >&2
  exit 1
fi

case ":$PATH:" in
  *":${BIN_DIR}:"*)
    echo "Already in PATH: ${BIN_DIR}"
    ;;
  *)
    export PATH="${BIN_DIR}:$PATH"
    echo "Added to PATH: ${BIN_DIR}"
    ;;
esac

echo "You can now run: vibe-model"
