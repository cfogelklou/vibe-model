# AI V-Model - Autonomous R&D Agent Submodule

A **generic git submodule** for autonomous R&D using the V-Model development lifecycle. Works with any parent project (C++, JavaScript, PWA, etc.) using Claude Code or Gemini.

---

## Project Overview

**Purpose**: This is a portable R&D agent that you can add to any project as a git submodule. It implements the V-Model protocol for formal, architecture-driven development with rigorous verification.

**Key Features**:
- Autonomous goal-driven development
- Formal V-Model lifecycle (Requirements → Design → Implementation → Verification)
- Gemini consultation during design phases for quality review
- Research integration (web search, codebase exploration)
- Git checkpointing for safe rollback
- Memory persistence across sessions

---

## Submodule Integration

### Adding to Your Project

```bash
# Add the submodule to your project
cd your-project
git submodule add https://github.com/cfogelklou/ai-v-model.git ai-v-model

# Initialize the submodule
git submodule update --init --recursive
```

### Directory Structure

When integrated, the submodule creates this structure:

```
your-project/                    # Parent project (git repository)
├── v_model/                    # V-Model outputs (created by script)
│   ├── .venv/                  # Python virtual environment for prototyping
│   ├── journey/                # Journey tracking files
│   ├── prototypes/             # Experimental code (Python, etc.)
│   └── memory.md               # Knowledge persistence
├── ai-v-model/                 # This submodule (separate git tracking)
│   ├── loop_v_model.sh         # Main loop script
│   ├── prompts/                # AI prompt templates
│   │   ├── main-iteration.md
│   │   ├── gemini-design-review-with-research.md
│   │   └── gemini-design-review-no-research.md
│   ├── CLAUDE.md               # This file
│   └── v_model.md              # Protocol documentation
└── ... (your project files)
```

**Important**:
- The `v_model/` directory is created in the **parent project root**, not inside the submodule.
- Python virtual environment lives at `v_model/.venv/` - this keeps prototyping dependencies with the project.

---

## Git Workflow (CRITICAL)

### Commits Happen in Parent Project

**All code changes, V-Model outputs, and journey files are committed to the parent project repository.**

```bash
# Run V-Model loop from parent project root
./ai-v-model/loop_v_model.sh "improve performance"

# When ready to commit (from parent project root):
git add v_model/journey/your-journey.md
git add src/changed_file.cpp
git commit -m "feat: improve performance"
```

### Submodule Updates

The submodule itself is a separate repository. To update the submodule:

```bash
# From parent project
cd ai-v-model
git pull origin main
cd ..
git add ai-v-model
git commit -m "chore: update ai-v-model submodule"
```

---

## Quick Start

### Two Ways to Start a Journey

**Option 1: Formal Q&A (recommended for complex goals)**

Start a conversational spec-gathering session before the loop:

```bash
claude
> Let's determine specifications for my goal according to ./ai-v-model/v_model.md
```

The AI follows the Spec Initiation Protocol, asks clarifying questions, creates a `.spec.md` file, and waits for your sign-off.

**Option 2: Direct Loop (faster, for simpler goals)**

Jump straight into the loop - questions happen during REQUIREMENTS phase:

```bash
./ai-v-model/loop_v_model.sh "your goal here"
```

### Running the Script

**Recommended**: Run from the parent project root for clarity:

```bash
# From parent project root
./ai-v-model/loop_v_model.sh "reduce latency to under 10ms"
```

Alternative (also works):

```bash
# From inside submodule
cd ai-v-model && ./loop_v_model.sh "reduce latency to under 10ms"
```

The script automatically resolves paths regardless of where you run it from.

### Starting a New Journey

```bash
# Start a new journey
./ai-v-model/loop_v_model.sh "reduce latency to under 10ms"

# With options
./ai-v-model/loop_v_model.sh -g "implement feature X"      # Use Gemini
./ai-v-model/loop_v_model.sh --no-consult "fix bug Y"      # Disable Gemini consultation
```

### Common Commands

```bash
# Check status of all journeys
./ai-v-model/loop_v_model.sh status

# Continue active journey
./ai-v-model/loop_v_model.sh

# Add a hint to guide the agent
./ai-v-model/loop_v_model.sh hint "try using FFT interpolation"

# Force pivot to next approach
./ai-v-model/loop_v_model.sh pivot

# Rollback to last checkpoint
./ai-v-model/loop_v_model.sh rollback
```

### Command Options

| Option | Description |
|--------|-------------|
| `-g, --gemini` | Use Gemini as primary AI provider |
| `--no-consult` | Disable Gemini consultation during design |
| `-v, --verbose` | Enable verbose logging |
| `-h, --help` | Show help message |

---

## V-Model Protocol Summary

The agent follows a formal V-Model development lifecycle:

```
REQUIREMENTS ───────────────→ ACCEPTANCE_TEST
     ↓                              ↑
[DESIGN_REVIEW]                    |
     ↓                              |
SYSTEM_DESIGN ──────────────→ SYSTEM_TEST
     ↓                              ↑
[DESIGN_REVIEW]                    |
     ↓                              |
ARCH_DESIGN ────────────→ INTEGRATION_TEST
     ↓                              ↑
[DESIGN_REVIEW]                    |
     ↓                              |
MODULE_DESIGN ──────────→ UNIT_TEST
     ↓                              ↑
     └────────── IMPLEMENTATION ────┘
```

### Stages

| Stage | Type | Description |
|-------|------|-------------|
| REQUIREMENTS | Design | Formalizing User Requirements into System Requirements |
| DESIGN_REVIEW | Review | Gemini consultation for design quality |
| SYSTEM_DESIGN | Design | High-level architectural planning (Epics) |
| ARCH_DESIGN | Design | Component-level design (Sub-systems/Interfaces) |
| MODULE_DESIGN | Design | Low-level logic design for a single Story |
| IMPLEMENTATION | Build | Coding the specific module/story |
| UNIT_TEST | Verify | Verifying the specific module logic |
| INTEGRATION_TEST | Verify | Verifying interaction with the system |
| SYSTEM_TEST | Verify | Verifying against original Spec |
| ACCEPTANCE_TEST | Verify | Final validation against User Requirements |

### Sign-Off Requirements

- **Requirements Sign-Off**: User must approve System Requirements before design proceeds
- **Design Review**: Automatic Gemini consultation at each design phase
- **Verification**: Each verification stage can fail back to corresponding design stage

---

## Configuration

Use environment variables to configure behavior:

```bash
export BUILD_COMMAND="npm run build"
export TEST_COMMAND="npm test"
export AI_PROVIDER="claude"
./ai-v-model/loop_v_model.sh "add feature X"
```

### Key Options

| Variable | Default | Description |
|----------|---------|-------------|
| BUILD_COMMAND | `cd build && ninja -j4` | Command to build the project |
| TEST_COMMAND | `./sau_src/motuner/test/motunit` | Command to run primary tests |
| AI_PROVIDER | `claude` | Primary AI provider (claude/gemini) |
| CONSULT_GEMINI | `true` | Enable Gemini consultation during design |

---

## Prompt Templates

AI prompts are stored externally in `ai-v-model/prompts/*.md` for easier editing and version control.

### Prompt Files

- `main-iteration.md` - Main V-Model phase execution prompt
- `gemini-design-review-with-research.md` - Gemini consultation with research context
- `gemini-design-review-no-research.md` - Gemini consultation fallback

### Placeholders

Prompts use `{{PLACEHOLDER}}` syntax for dynamic content substitution:

| Placeholder | Description |
|-------------|-------------|
| `{{AI_PROVIDER}}` | AI provider being used (claude/gemini) |
| `{{JOURNEY_CONTENT}}` | Full journey file content |
| `{{PHASE}}` | V-Model phase being reviewed |
| `{{DESIGN_CONTENT}}` | Design content for review |
| `{{RESEARCH_CONTENT}}` | Research notes from phase |

### Modifying Prompts

To modify prompts:
1. Edit the `.md` file directly in `ai-v-model/prompts/`
2. Use `{{PLACEHOLDER}}` syntax for dynamic values
3. Test changes by running the loop with `./loop_v_model.sh -g -v`

---

## Memory System

### Memory Location

Memory is stored in **markdown format** at `{PROJ_ROOT}/v_model/memory.md`:

```
your-project/
└── v_model/
    └── memory.md    # Persistent knowledge storage
```

### Memory Format

```markdown
# Project Memory

## Anti-Patterns
- **Approach X**: Failed because [reason]
- **Using Y for Z**: Causes performance issues

## Successful Patterns
- **Pattern A**: Works well for [use case]
- **Library B**: Good performance, easy integration

## Configuration Notes
- Optimal FFT size for this project: 4096
- Thread pool size: 4 works best on ARM

## Research Findings
- [2026-03-15] Discovered that X doesn't work with Y
```

### Memory Usage

- **Automatic**: The agent reads memory at journey start
- **Updates**: Agent adds learnings during journey
- **Format**: Plain markdown, human-editable

---

## Output Directories

All V-Model outputs go to `{PROJ_ROOT}/v_model/`:

```
v_model/
├── journey/                    # Journey tracking files
│   ├── improve-performance.md  # One file per journey
│   └── add-feature-x.md
├── prototypes/                 # Experimental code
│   └── prototype-fft-alt.py
└── memory.md                   # Knowledge persistence
```

### Journey File Format

Each journey file contains:
- Goal and specification
- Current state and progress
- Epic/story breakdown
- Design decisions
- Test results
- Learnings log

---

## Python Prototyping

The V-Model agent uses Python for rapid prototyping before C++/production implementation.

### Virtual Environment Setup

**Location**: `{PROJ_ROOT}/v_model/.venv/`

```bash
# Create virtual environment (one-time setup)
cd your-project
python3 -m venv v_model/.venv

# Activate for prototyping sessions
source v_model/.venv/bin/activate

# Install common prototyping dependencies
pip install numpy scipy matplotlib soundfile pandas
```

### Why v_model/.venv/?

- **Project-scoped**: Prototyping dependencies belong with the project, not the submodule
- **Isolated**: Doesn't pollute global Python or parent project's own venv
- **Portable**: The submodule remains generic; venv is per-project
- **Auto-ignored**: The script automatically adds `.venv/` to `v_model/.gitignore`

### Prototype Workflow

```bash
# 1. Activate venv
source v_model/.venv/bin/activate

# 2. Create prototype in v_model/prototypes/
# Agent will create files like: v_model/prototypes/fft_experiment.py

# 3. Run prototype
python v_model/prototypes/fft_experiment.py

# 4. Deactivate when done
deactivate
```

### .gitignore

The script automatically creates `v_model/.gitignore` to exclude generated artifacts:

```
# V-Model artifact exclusions
# Journey files and specs should be committed
# These entries exclude only generated/cache artifacts

.venv/
prototypes/__pycache__/
prototypes/*.pyc
```

**Note**: Journey files (`.journey.md`) and spec files (`.spec.md`) are **committed** as they are part of your project's documentation. Only cache files and build artifacts are ignored.

---

## Development Guidelines

### When to Use V-Model vs Simpler Approaches

**Use V-Model when**:
- Complex R&D tasks with uncertain solutions
- Tasks requiring formal verification
- Architecture changes affecting multiple components
- Performance optimization with specific targets

**Use simpler approaches when**:
- Simple bug fixes
- Well-defined feature additions
- Documentation updates
- Routine maintenance

### Research Integration

During design phases, the agent:
1. Searches for existing solutions (web search)
2. Consults Gemini for design reasoning
3. Explores the codebase for patterns
4. Checks memory for project-specific learnings

### Gemini Consultation

When `CONSULT_GEMINI=true` (default):
- Design phases automatically consult Gemini
- Gemini reviews design quality and research thoroughness
- Can be disabled with `--no-consult` flag

---

## Troubleshooting

### Script Can't Find Parent Project

Make sure you're running from within the submodule directory:

```bash
cd your-project/ai-v-model
./loop_v_model.sh "goal"
```

### Journey Files in Wrong Location

Check that `v_model/` directory exists in parent project root:

```bash
ls ../v_model/
```

If missing, the script will create it automatically.

### Tests Not Running

Configure `TEST_COMMAND` as an environment variable:

```bash
export TEST_COMMAND="npm test"
./loop_v_model.sh "fix tests"
```

---

## Reference

- **Protocol Documentation**: See `v_model.md` for detailed V-Model protocol
- **State Machine**: See state diagram in `v_model.md`
- **Configuration**: See environment variables above
