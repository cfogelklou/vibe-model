# AI V-Model

> **Autonomous R&D agent using the V-Model development lifecycle with formal verification.**

A **generic git submodule** for autonomous R&D using the V-Model protocol. Works with any parent project (C++, JavaScript, PWA, etc.) using Claude Code or Gemini.

---

## Features

- **Goal-driven development**: Works toward ambitious goals without pre-defined plans
- **Formal V-Model lifecycle**: Requirements → Design → Implementation → Verification
- **Design review**: Automatic Gemini consultation for design quality
- **Research integration**: Web search, codebase exploration, external consultation
- **Safe rollback**: Git checkpointing at key milestones
- **Memory persistence**: Learnings persist across sessions
- **Dead-end detection**: Automatic pivot when approaches stagnate
- **Quality guardrails**: Linting, static analysis, performance thresholds

---

## Quick Start

```bash
# Add the submodule to your project
git submodule add https://github.com/cfogelklou/ai-v-model.git ai-v-model

# Initialize the submodule
git submodule update --init --recursive

# Start a new journey
./ai-v-model/loop_v_model.sh "your goal here"
```

---

## Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| **[USER_GUIDE.md](USER_GUIDE.md)** | Users | Complete user manual with commands, configuration, troubleshooting |
| **[v_model.md](v_model.md)** | AI Agents | Formal V-Model protocol specification |
| **[CLAUDE.md](CLAUDE.md)** | AI Agents | Quick reference for Claude Code agents |

---

## Basic Usage

```bash
# Start a new journey
./ai-v-model/loop_v_model.sh "reduce latency to under 10ms"

# Continue active journey
./ai-v-model/loop_v_model.sh

# Check status of all journeys
./ai-v-model/loop_v_model.sh status

# Add a hint to guide the agent
./ai-v-model/loop_v_model.sh hint "try using FFT interpolation"

# Force pivot to next approach
./ai-v-model/loop_v_model.sh pivot

# Rollback to last checkpoint
./ai-v-model/loop_v_model.sh rollback
```

---

## V-Model Workflow

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

---

## Configuration

Configure via environment variables:

```bash
export BUILD_COMMAND="npm run build"
export TEST_COMMAND="npm test"
export AI_PROVIDER="claude"
./ai-v-model/loop_v_model.sh "add feature X"
```

See [USER_GUIDE.md](USER_GUIDE.md#configuration) for all configuration options.

---

## Directory Structure

```
your-project/
├── v_model/                    # V-Model outputs (created by script)
│   ├── journey/                # Journey tracking files
│   ├── prototypes/             # Experimental code
│   ├── .venv/                  # Python virtual environment
│   └── memory.md               # Knowledge persistence
└── ai-v-model/                 # This submodule
    ├── loop_v_model.sh         # Main loop script
    ├── prompts/                # AI prompt templates
    ├── USER_GUIDE.md           # Complete user manual
    ├── v_model.md              # Protocol specification
    ├── CLAUDE.md               # Quick reference
    └── README.md               # This file
```

---

## When to Use V-Model

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

---

## Requirements

- Bash shell
- Git
- Claude Code CLI or Gemini CLI
- (Optional) Python for prototyping

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## Links

- **Documentation**: [USER_GUIDE.md](USER_GUIDE.md)
- **Protocol Specification**: [v_model.md](v_model.md)
- **Quick Reference**: [CLAUDE.md](CLAUDE.md)
- **GitHub Repository**: https://github.com/cfogelklou/ai-v-model
