# Plan: Build ASCII QR Code CLI Tool Using v-model

## Context

**Goal**: Use the ai-v-model tool to build a simple C++ CLI application that:
- Takes a URL as input
- Generates a QR code
- Displays it as ASCII art
- Uses CMake + Ninja for building

**Purpose**: This serves as a real-world test of the v-model tool itself - "AI eating its own tail"

**Constraint**: The v-model tool calls `claude` and `gemini` CLIs, so we need an external AI agent to run it (to avoid recursion).

---

## Recommended Solution: Open Interpreter

Use **Open Interpreter** as the external AI agent that will:
1. Read the v-model documentation
2. Run v-model with the QR code goal
3. Let v-model go through its V-Model lifecycle
4. Document any bugs/issues found in v-model
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
You are testing the ai-v-model autonomous development tool.

LOCATION: /Users/christopherfogelklou/dev/ai-v-model

YOUR TASK: Use v-model to build a C++ CLI tool with these requirements:

**Product Requirements:**
- A CLI tool that takes a URL as a command-line argument
- Generates a QR code from that URL
- Displays the QR code as ASCII art in the terminal
- Must use C++ as the language
- Must use CMake for build configuration
- Must use Ninja as the build generator

**Steps:**
1. Read /Users/christopherfogelklou/dev/ai-v-model/USER_GUIDE.md to understand v-model
2. Ensure v-model is built (cd ai-v-model && bun install && bun run build)
3. From /Users/christopherfogelklou/dev, run: ./ai-v-model/bin/v-model "Build a C++ CLI tool that takes a URL and displays it as an ASCII QR code. Use CMake and Ninja."
4. Let v-model run through its entire V-Model lifecycle autonomously
5. If it gets stuck or errors, try to understand why and document it
6. After completion, test the resulting tool if it was built successfully

**Important:**
- v-model will call the 'claude' CLI subprocess - this is expected and correct
- You are acting as the user who invoked v-model
- Let v-model drive the development process
- Only intervene if v-model appears completely stuck

WORKING DIRECTORY: /Users/christopherfogelklou/dev

Create a final summary report of:
- Did v-model successfully build the tool?
- Any bugs or issues encountered in v-model itself
- What worked well vs what didn't
```

---

## Alternative: Run Manually

If you prefer to run v-model manually first (to test it yourself):

```bash
cd /Users/christopherfogelklou/dev

# Run v-model with the goal
./ai-v-model/bin/v-model "Build a C++ CLI tool that takes a URL argument and generates an ASCII QR code in the terminal. Use CMake and Ninja for building."

# Check status anytime
./ai-v-model/bin/v-model status

# Continue if paused
./ai-v-model/bin/v-model
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
v_model/prototypes/qr-code-tool/
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

## Verification After v-model Runs

1. **Check journey progress:**
   ```bash
   cat v_model/journey/*.md
   ```

2. **Check if code was generated:**
   ```bash
   ls -la v_model/prototypes/
   ```

3. **Try building the result:**
   ```bash
   cd v_model/prototypes/*/build
   ninja
   ./qr-generator "test"
   ```

4. **Review v-model's output for any errors**

---

## Potential v-model Issues to Watch For

Based on code analysis:
- TypeScript not built → run `bun run build` in ai-v-model
- Missing dependencies → run `bun install`
- `claude` CLI not installed → v-model needs this
- Journey directory permissions
- State machine getting stuck in transitions

---

## Files Referenced

- `/Users/christopherfogelklou/dev/ai-v-model/USER_GUIDE.md` - User documentation
- `/Users/christopherfogelklou/dev/ai-v-model/bin/v-model` - CLI executable
- `/Users/christopherfogelklou/dev/ai-v-model/src/state-machine.ts` - V-Model states
- `/Users/christopherfogelklou/dev/ai-v-model/src/main-loop.ts` - Main execution loop
