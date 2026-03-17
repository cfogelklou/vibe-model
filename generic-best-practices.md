# Generic Best Practices for Software Development

**Purpose**: Build less, reuse more. Every line of code is a liability.

**Rule**: Before designing or implementing anything, check this list first.

---

## Top 20 Generic Best Practices

### 1. Prefer Existing Solutions Over Custom Implementations
**Before** writing any custom code: Search for existing solutions first.
- Check if your platform's standard library has it
- Search for established libraries with strong community adoption
- Use official vendor libraries (e.g., Google, Apple, Microsoft) when available
- **Example**: For a service worker, use Google's Workbox instead of writing 500 lines of custom caching code.

### 2. Use Standard Library Data Structures
**Before** implementing custom lists, maps, queues:
- Use built-in data structures (Array, Map, Set, Vec, HashMap, etc.)
- Standard library implementations are optimized, tested, and debugged
- Custom data structures introduce bugs and maintenance burden
- **Example**: Use `std::unordered_map` instead of writing a hash table.

### 3. Don't Reinvent Well-Known Algorithms
**Before** implementing sorting, searching, compression:
- Use standard library algorithms (sort, binary search, etc.)
- Use established algorithm libraries (boost, numpy, etc.)
- Cryptographic primitives should NEVER be custom
- **Example**: Use `std::sort` instead of writing quicksort.

### 4. Follow Established Design Patterns
**Before** inventing new architectural patterns:
- Use known patterns (Singleton, Factory, Observer, Strategy, etc.)
- Don't create new patterns unless absolutely necessary
- Well-known patterns are understood by other developers
- **Example**: Use the Observer pattern for pub/sub instead of inventing your own.

### 5. Avoid Premature Abstraction
**Before** creating interfaces, base classes, frameworks:
- Implement the concrete case first
- Only abstract when you have 2-3 similar implementations
- YAGNI (You Aren't Gonna Need It)
- **Example**: Don't create an interface for a single implementation.

### 6. Keep Functions Small and Focused
- Each function should do ONE thing well
- Keep functions under 20-30 lines when possible
- Smaller functions are easier to test, understand, and reuse
- **Example**: Split `processUserInputAndSaveAndNotify()` into three functions.

### 7. DRY (Don't Repeat Yourself)
**Before** copy-pasting code:
- Extract repeated logic into a function
- Use configuration/data instead of code conditionals
- Reuse existing modules instead of duplicating
- **Example**: Instead of three functions that differ only by a string, pass the string as a parameter.

### 8. Use Dependency Injection
**Before** hard-coding dependencies:
- Pass dependencies as parameters
- Enables testing, flexibility, and modularity
- Avoids global state and singletons (except where truly appropriate)
- **Example**: Pass a `Logger` instance instead of hard-coding `console.log`.

### 9. Write Tests Before or With Code (TDD)
- Define expected behavior before implementation
- Tests serve as documentation and verification
- Catch design issues early (hard-to-test code is hard-to-use code)
- **Example**: Write test cases for edge cases before implementing the function.

### 10. Use Static Analysis and Linters
- Enable all available compiler warnings (-Wall -Wextra)
- Use language-specific linters (eslint, clang-tidy, pylint, etc.)
- Zero tolerance for static analysis warnings
- **Example**: Add `-fsanitize=address` to catch memory bugs.

### 11. Handle Errors Explicitly
- Never ignore errors or return values
- Use language-appropriate error handling (Result<T>, exceptions, error codes)
- Log errors with context (what, why, how to fix)
- **Example**: Check return codes and handle failure cases explicitly.

### 12. Avoid Magic Numbers and Strings
- Define named constants for non-obvious values
- Use enums for related constants
- Makes code self-documenting and easier to modify
- **Example**: Replace `if (status == 3)` with `if (status == Status::ACTIVE)`.

### 13. Use Meaningful Names
- Function names should describe WHAT they do, not HOW
- Variable names should describe their purpose
- Avoid abbreviations unless widely understood
- **Example**: `calculateAge(birthDate)` instead of `calc(b)`.

### 14. Keep Interfaces Small and Cohesive
- Interfaces should have few, related methods (Interface Segregation Principle)
- Avoid "god interfaces" with many unrelated methods
- Clients shouldn't depend on methods they don't use
- **Example**: Split `FileSystem` into `FileReader`, `FileWriter`, `FileMetadata`.

### 15. Prefer Composition Over Inheritance
- Compose behavior from smaller, focused objects
- Inheritance creates tight coupling and fragile base classes
- Composition is more flexible and testable
- **Example**: Use a `Logger` mixin/composition instead of inheriting from `Loggable`.

### 16. Document Only What Needs Explanation
- Code should be self-documenting with good names
- Document WHY, not WHAT (the code shows what)
- Document public APIs, non-obvious algorithms, and workarounds
- **Example**: Comment: "Uses retry because the API is flaky" not "increment counter".

### 17. Use Version Control Properly
- Commit frequently with meaningful messages
- Make atomic commits (one logical change per commit)
- Never commit broken builds or debugging code
- **Example**: Commit "fix null pointer in user lookup" not "wip stuff".

### 18. Run Tests Continuously (CI/CD)
- Every commit should run tests automatically
- Fail fast: stop the pipeline on first failure
- Keep test runtime under 5 minutes for rapid feedback
- **Example**: Use GitHub Actions or GitLab CI for automated testing.

### 19. Handle Edge Cases and Input Validation
- Validate inputs at module boundaries
- Handle null/empty/invalid inputs gracefully
- Document preconditions and invariants
- **Example**: Check for null pointers before dereferencing.

### 20. Keep It Simple (KISS)
- Simplicity is more valuable than cleverness
- Choose the simplest solution that works
- Avoid over-engineering and "future-proofing"
- **Example**: Use a simple loop instead of a complex one-liner.

### 21. Avoid mocks if possible
- Dependency injection + real code is always better than writing a mock for real code.

---

## Decision Framework

| Factor | Use Existing | Build Custom |
|--------|-------------|--------------|
| Core business logic | ❌ | ✅ |
| Generic infrastructure | ✅ | ❌ |
| Well-defined problem | ✅ | ❌ |
| Requires deep customization | ❌ | ✅ |
| Security-sensitive crypto | ✅ | ❌ |
| Learning exercise | Explicitly state it | ✅ |

## Code Budget Guidelines

**When custom implementation exceeds these sizes, reconsider:**

| Category | Max LOC | Reason |
|----------|---------|--------|
| Single function | 50 | Hard to test/understand |
| Single class/module | 300 | Too many responsibilities |
| Custom data structure | 100 | Use stdlib instead |
| Custom algorithm | 200 | Use library instead |
| Custom "framework" | 500 | Use existing framework |

## Questions to Ask Before Building

1. **Does the standard library have this?**
2. **Is there a well-maintained library for this?**
3. **Am I solving a well-known problem?** Use the known solution.
4. **Will this be >200 lines?** Consider a library.
5. **Is this core business logic?** If not, reuse.

## Integration

This document is referenced in:
- `prompts/main-iteration.md` - Research phase
- `vibe-model.md` - Research protocol

---

**Last Updated**: 2026-03-16
**Maintained by**: vibe-model project
