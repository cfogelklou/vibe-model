# Contributing to vibe-model

Thank you for your interest in contributing to vibe-model! This document provides guidelines for contributing to the project.

## Development Environment Setup

### Prerequisites

- **Bun runtime** (>= 1.0.0)
- **Node.js** (>= 18.0.0)
- **Git**
- **TypeScript** (>= 5.0.0)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cfogelklou/vibe-model.git
   cd vibe-model
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Build the project:
   ```bash
   bun run build
   ```

4. Run tests to verify setup:
   ```bash
   bun test
   ```

## Code Style Guidelines

### TypeScript Configuration

This project uses TypeScript with strict mode enabled. All code must:

- Pass TypeScript type checking (`bun run typecheck`)
- Follow the existing code style (enforced by ESLint)
- Use strict typing (no `any` types unless absolutely necessary)
- Include proper JSDoc comments for public APIs

### ESLint Configuration

The project uses ESLint with TypeScript-specific rules. Run linting before committing:

```bash
# Check for issues
bun run lint

# Auto-fix issues
bun run lint:fix
```

### Code Conventions

- Use **camelCase** for variables and functions
- Use **PascalCase** for classes, interfaces, and types
- Use **UPPER_SNAKE_CASE** for constants
- Keep functions focused and small (< 50 lines when possible)
- Write descriptive variable and function names
- Add JSDoc comments for all public APIs

### File Organization

- Keep related functionality in the same file
- Use the existing directory structure
- Place unit tests in `src/__tests__/unit/`
- Name test files after the module they test (e.g., `config.test.ts`)

## Pull Request Process

### Before Submitting

1. **Run all tests**:
   ```bash
   bun test
   ```

2. **Run type checking**:
   ```bash
   bun run typecheck
   ```

3. **Run linting**:
   ```bash
   bun run lint
   ```

4. **Build the project**:
   ```bash
   bun run build
   ```

All checks must pass before submitting a PR.

### Submitting a Pull Request

1. Fork the repository and create a feature branch
2. Make your changes following the code style guidelines
3. Write clear commit messages
4. Push to your fork and submit a pull request
5. Include a description of your changes
6. Reference any related issues

### PR Review Process

- All PRs require at least one maintainer approval
- Address review feedback promptly
- Keep PRs focused and small when possible
- Ensure all CI checks pass

## Testing Requirements

### Test Coverage

- Write unit tests for new functionality
- Aim for high test coverage on critical paths
- Test both success and failure cases
- Mock external dependencies (AI providers, file system)

### Running Tests

```bash
# Run all tests
bun test

# Run unit tests only
bun run test:unit

# Run specific test file
bun test src/__tests__/unit/config.test.ts
```

### Test Structure

Follow the existing test structure:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Teardown
  });

  it('should do something', () => {
    // Arrange
    const input = { /* ... */ };

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

## Project-Specific Guidelines

### Keep It Generic and Reusable

**Critical**: When fixing bugs or adding features to vibe-model, keep all modifications generic and reusable.

- Avoid hardcoding project-specific paths
- Keep configuration flexible
- Test with different project structures
- Don't assume specific build tools or languages

### State Machine Changes

The state machine (`state-machine.ts`) is the core of the V-Model protocol. When modifying it:

- Document all state transitions clearly
- Ensure backward compatibility
- Add tests for new states or transitions
- Update the protocol documentation (`vibe-model.md`)

### AI Provider Integration

When adding support for new AI providers:

- Implement the `AIProvider` interface
- Add tests for the new provider
- Update the configuration documentation
- Document any provider-specific limitations

## Getting Help

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Documentation**: See [USER_GUIDE.md](USER_GUIDE.md) for usage documentation

## Code of Conduct

Be respectful, inclusive, and constructive. We aim to maintain a welcoming community for all contributors.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
