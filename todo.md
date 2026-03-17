# TODO

## Ubuntu Testing Task (for AI agent on Ubuntu machine)

**Goal:** Debug why vibe-model gets stuck in `REQUIREMENTS` state during CI runs.

### Setup

1. **Navigate to workspace:**
   ```bash
   cd ~/dev  # or your preferred workspace directory
   ```

2. **Clone and checkout the bun branch:**
   ```bash
   git clone https://github.com/cfogelklou/vibe-model.git
   cd vibe-model
   git checkout bun
   ```

3. **Install Bun (if not already installed):**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

4. **Install dependencies and build:**
   ```bash
   bun install
   bun run build
   ```

5. **Set up test fixture:**
   ```bash
   ./scripts/setup_example_repo.sh
   ```

### Test Run

6. **Run vibe-model with MVP mode:**
   ```bash
   cd example/src
   ../../bin/vibe-model -v --mvp --no-consult --no-push --commit-interval 5 "Build a pig latinifier CLI in C++ using CMake, ninja, and CTest that converts text to pig latin. Use minimal testing - just verify the basic conversion works. IMPORTANT: Configure CMake to build to a 'build/' subdirectory. Name the executable 'pig-latinifier'. The CLI should accept command-line arguments and convert each word to pig latin."
   ```

### What to Observe

**Critical observations to report back:**

1. **Tool usage:** Does the AI agent use `str_replace_editor.edit` tool calls? Watch for tool use patterns in the output.

2. **State progression:** Does the journey file state update from `REQUIREMENTS` → `SYSTEM_DESIGN` → etc.? Check the journey file after each iteration:
   ```bash
   cat vibe-model/journey/*.journey.md | grep "State:"
   ```

3. **Iteration timing:** How long does each iteration take? Is it similar to CI (3-7 minutes per iteration)?

4. **Final state:** After the run completes (or times out), what is the final state of the journey?

### Debug Commands

If things get stuck, you can check:
```bash
# Check journey file state
cat vibe-model/journey/*.journey.md | grep -A2 "## Meta"

# List journey files
ls -la vibe-model/journey/

# Check if build artifacts were created
ls -la build/ 2>/dev/null || echo "No build directory"
```

### Report Back

Please report:
- Did the state progress past `REQUIREMENTS`?
- Were `str_replace_editor` tool calls made?
- How many iterations completed before finishing/timing out?
- Any error messages or unusual behavior?
- Total time to complete (if it completed)

---

## Background

**CI Issue:** Run 23188311753 timed out after 30 minutes. The AI agent stayed stuck in `REQUIREMENTS` state for all 7 iterations, never updating the journey file or progressing to the next state.

**Key finding:** No tool use (`str_replace_editor`) was logged in CI - the AI was responding with text only but not using tools to edit files.
