#!/bin/bash
# Cross-platform build script for vibe-model
# Builds standalone binaries for different platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_ROOT/dist"

echo -e "${GREEN}=== vibe-model Cross-Platform Build Script ===${NC}"
echo ""

# Create dist directory
mkdir -p "$DIST_DIR"

# Detect current platform
CURRENT_OS=$(uname -s)
CURRENT_ARCH=$(uname -m)

echo -e "${YELLOW}Current platform: $CURRENT_OS $CURRENT_ARCH${NC}"
echo ""

# Function to build for a specific target
build_target() {
    local target=$1
    local output_name=$2

    echo -e "${GREEN}Building for $target...${NC}"
    cd "$PROJECT_ROOT"

    if bun build --compile --outfile "$DIST_DIR/vibe-model-$output_name" src/index.ts --target "$target"; then
        echo -e "${GREEN}✓ Successfully built: vibe-model-$output_name${NC}"

        # Get file size
        if [[ "$CURRENT_OS" == "Darwin" ]]; then
            size=$(du -h "$DIST_DIR/vibe-model-$output_name" | cut -f1)
            echo -e "  Size: $size"
        fi

        # Make executable on Unix-like systems
        chmod +x "$DIST_DIR/vibe-model-$output_name" 2>/dev/null || true
    else
        echo -e "${RED}✗ Failed to build for $target${NC}"
        return 1
    fi
    echo ""
}

# Build matrix
# Format: "bun-target:output-suffix"

# macOS targets
if [[ "$CURRENT_OS" == "Darwin" ]]; then
    echo -e "${YELLOW}Building macOS binaries...${NC}"

    # Apple Silicon (arm64)
    if [[ "$CURRENT_ARCH" == "arm64" ]]; then
        build_target "bun-darwin-aarch64" "macos-arm64"
    fi

    # Intel (x64)
    # Note: Cross-compilation from ARM to Intel may not work
    # You need an Intel Mac or use a CI runner
    if [[ "$CURRENT_ARCH" == "x86_64" ]]; then
        build_target "bun-darwin-x64" "macos-x64"
    fi

    # Universal binary (requires both architectures)
    # This would need lipo to combine the two binaries
fi

# Linux targets
echo -e "${YELLOW}Building Linux binaries...${NC}"

# Linux ARM64
build_target "bun-linux-aarch64" "linux-arm64"

# Linux x64
build_target "bun-linux-x64" "linux-x64"

# Windows targets
echo -e "${YELLOW}Building Windows binaries...${NC}"

# Windows x64
build_target "bun-windows-x64" "windows-x64.exe"

# Summary
echo -e "${GREEN}=== Build Summary ===${NC}"
echo -e "Binaries created in: ${YELLOW}$DIST_DIR${NC}"
echo ""
ls -lh "$DIST_DIR" | grep "vibe-model-" || echo "No binaries found"
echo ""

echo -e "${GREEN}Build complete!${NC}"
echo ""
echo -e "To use a binary:"
echo -e "  ${YELLOW}./dist/vibe-model-macos-arm64 \"your goal here\"${NC}"
echo ""
echo -e "To install globally:"
echo -e "  ${YELLOW}sudo cp ./dist/vibe-model-macos-arm64 /usr/local/bin/vibe-model${NC}"
echo ""
