# Plan: Build ASCII QR Code CLI Tool Using vibe-model

## Context

**Goal**: Use the vibe-model tool to build a simple C++ CLI application that:
- Takes a URL as input
- Generates a QR code
- Displays it as ASCII art
- Uses CMake + Ninja for building

**Purpose**: This serves as a real-world test of the vibe-model tool itself - "AI eating its own tail"

**Constraint**: The vibe-model tool calls `claude` and `gemini` CLIs, so we need an external AI agent to run it (to avoid recursion).

---

## Recommended Solution: Open Interpreter

Use **Open Interpreter** as the external AI agent that will:
1. Read the vibe-model documentation
2. Run vibe-model with the QR code goal
3. Let vibe-model go through its V-Model lifecycle
4. Document any bugs/issues found in vibe-model
5. Create a summary report

### Setup Open Interpreter

```bash
# Install Open Interpreter
pip install open-interpreter

# Configure API key
export OPENAI_API_KEY="sk-..."

# Start the session
cd /Users/christopherfogelklou/dev
interpreter
```

### Prompt to Give Open Interpreter

```
You are testing the vibe-model autonomous development tool.

LOCATION: /Users/christopherfogelklou/dev/vibe-model

YOUR TASK: Use vibe-model to build a C++ CLI tool with these requirements:

**Product Requirements:**
- A CLI tool that takes a URL as a command-line argument
- Generates a QR code from that URL
- Displays the QR code as ASCII art in the terminal
- Must use C++ as the language
- Must use CMake for build configuration
- Must use Ninja as the build generator

**Steps:**
1. Read /Users/christopherfogelklou/dev/vibe-model/USER_GUIDE.md to understand vibe-model
2. Ensure vibe-model is built (cd vibe-model && bun install && bun run build)
3. From /Users/christopherfogelklou/dev, run: ./vibe-model/bin/vibe-model "Build a C++ CLI tool that takes a URL and displays it as an ASCII QR code. Use CMake and Ninja."
4. Let vibe-model run through its entire V-Model lifecycle autonomously
5. If it gets stuck or errors, try to understand why and document it
6. After completion, test the resulting tool if it was built successfully

**Important:**
- vibe-model will call the 'claude' CLI subprocess - this is expected and correct
- You are acting as the user who invoked vibe-model
- Let vibe-model drive the development process
- Only intervene if vibe-model appears completely stuck

WORKING DIRECTORY: /Users/christopherfogelklou/dev

Create a final summary report of:
- Did vibe-model successfully build the tool?
- Any bugs or issues encountered in vibe-model itself
- What worked well vs what didn't
```

---

## Alternative: Run Manually

If you prefer to run vibe-model manually first (to test it yourself):

```bash
cd /Users/christopherfogelklou/dev

# Run vibe-model with the goal
./vibe-model/bin/vibe-model "Build a C++ CLI tool that takes a URL argument and generates an ASCII QR code in the terminal. Use CMake and Ninja for building."

# Check status anytime
./vibe-model/bin/vibe-model status

# Continue if paused
./vibe-model/bin/vibe-model
```

---

## Technical Requirements for the QR Tool

**Dependencies needed:**
- `libqrencode` - C library for QR code generation
- Standard C++17 or later
- CMake 3.15+
- Ninja build system

**Expected project structure:**
```
vibe-model/prototypes/qr-code-tool/
├── CMakeLists.txt
├── src/
│   └── main.cpp
└── build/
```

**Expected usage:**
```bash
./qr-generator "https://example.com"
# Outputs ASCII QR code to terminal
```

---

## Verification After vibe-model Runs

1. **Check journey progress:**
   ```bash
   cat vibe-model/journey/*.md
   ```

2. **Check if code was generated:**
   ```bash
   ls -la vibe-model/prototypes/
   ```

3. **Try building the result:**
   ```bash
   cd vibe-model/prototypes/*/build
   ninja
   ./qr-generator "test"
   ```

4. **Review vibe-model's output for any errors**

---

## Potential vibe-model Issues to Watch For

Based on code analysis:
- TypeScript not built → run `bun run build` in vibe-model
- Missing dependencies → run `bun install`
- `claude` CLI not installed → vibe-model needs this
- Journey directory permissions
- State machine getting stuck in transitions

---

## Files Referenced

- `/Users/christopherfogelklou/dev/vibe-model/USER_GUIDE.md` - User documentation
- `/Users/christopherfogelklou/dev/vibe-model/bin/vibe-model` - CLI executable
- `/Users/christopherfogelklou/dev/vibe-model/src/state-machine.ts` - V-Model states
- `/Users/christopherfogelklou/dev/vibe-model/src/main-loop.ts` - Main execution loop
