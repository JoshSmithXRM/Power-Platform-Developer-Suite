# Comprehensive Code Review Guide

**Purpose**: Assess production-worthiness, SOLID design, Clean Architecture compliance, and identify bugs, violations, and unused code.

**Output Location**: `.review/results/[AGENT_NAME]_REPORT.md`

---

## Review Objectives

### Primary Goals
1. **Production Worthiness**: Is this codebase ready for production deployment?
2. **SOLID Principles**: Are SOLID principles being followed correctly?
3. **Clean Architecture**: Are architectural boundaries being respected?
4. **Bug Detection**: Are there any bugs, potential runtime errors, or edge cases?
5. **Code Health**: Dead code, duplication, complexity, maintainability
6. **Pattern Detection**: Find recurring anti-patterns across the codebase

### Output Requirements

**CRITICAL**: Structure all findings using this format for pattern detection:

```markdown
## [CATEGORY] Issue Title
**Severity**: Critical | High | Medium | Low
**Location**: file:line
**Pattern**: [Architecture|Type Safety|Testing|Code Quality|Security|Performance|Domain|Presentation]
**Description**:
Detailed description of the issue

**Recommendation**:
Specific actionable fix

**Code Example** (if applicable):
\`\`\`typescript
// Current (bad)
...

// Recommended (good)
...
\`\`\`
```

---

## Severity Definitions

- **Critical**: Blocks production, security vulnerability, data loss risk, architectural violation breaking Clean Architecture
- **High**: Significant bug, SOLID violation, business logic in wrong layer, missing critical tests
- **Medium**: Code smell, minor architectural concern, missing tests for non-critical paths, type safety issue
- **Low**: Style inconsistency, minor duplication, documentation gap

---

## Clean Architecture Review Checklist

### Layer Boundaries (CRITICAL)

**Domain Layer** (`src/domain/`)
- ✅ **MUST HAVE**: Zero dependencies on outer layers (application, infrastructure, presentation)
- ✅ **MUST HAVE**: Rich domain models with behavior (methods), not anemic data containers
- ✅ **MUST HAVE**: All business logic lives here
- ✅ **MUST HAVE**: Repository interfaces defined here (implementations in infrastructure)
- ❌ **MUST NOT**: Import from `application/`, `infrastructure/`, `presentation/`
- ❌ **MUST NOT**: Use `ILogger`, `vscode`, or any infrastructure concerns
- ❌ **MUST NOT**: Have static utility methods on entities (use domain services)
- ❌ **MUST NOT**: Have presentation logic (formatting, sorting for display)

**Application Layer** (`src/application/`)
- ✅ **MUST HAVE**: Use cases that orchestrate domain entities
- ✅ **MUST HAVE**: Logging at use case boundaries (start/completion/failures)
- ✅ **MUST HAVE**: Constructor injection of dependencies (`ILogger`, repositories)
- ❌ **MUST NOT**: Contain business logic (move to domain services)
- ❌ **MUST NOT**: Depend on presentation or infrastructure implementations
- ❌ **MUST NOT**: Make business decisions (sort, filter, validate business rules)

**Infrastructure Layer** (`src/infrastructure/`)
- ✅ **MUST HAVE**: Repository implementations
- ✅ **MUST HAVE**: External service integrations (Power Platform API)
- ❌ **MUST NOT**: Contain business logic

**Presentation Layer** (`src/presentation/`)
- ✅ **MUST HAVE**: Panels as singletons (`createOrShow()` pattern)
- ✅ **MUST HAVE**: HTML in separate view files (`presentation/views/`)
- ✅ **MUST HAVE**: ViewModels as simple DTOs (mapped from domain)
- ✅ **MUST HAVE**: Mappers that only transform data (no business decisions)
- ❌ **MUST NOT**: Contain business logic
- ❌ **MUST NOT**: Have HTML templates in TypeScript files
- ❌ **MUST NOT**: Make business decisions in mappers (sort before/after mapping)

### Dependency Direction (CRITICAL)

**All dependencies must point inward**: Presentation → Application → Domain
- Domain knows nothing about outer layers
- Application depends on domain interfaces only
- Presentation depends on application and domain DTOs/ViewModels
- Infrastructure implements domain interfaces

---

## SOLID Principles Review

### Single Responsibility Principle (SRP)
- Each class/module has one reason to change
- No "God objects" doing too many things
- Clear, focused responsibilities

### Open/Closed Principle (OCP)
- Open for extension, closed for modification
- Use interfaces and polymorphism
- Avoid switch statements on types

### Liskov Substitution Principle (LSP)
- Subtypes must be substitutable for base types
- No breaking contracts in inheritance

### Interface Segregation Principle (ISP)
- Clients shouldn't depend on interfaces they don't use
- Small, focused interfaces over large ones

### Dependency Inversion Principle (DIP)
- Depend on abstractions (interfaces), not concretions
- High-level modules shouldn't depend on low-level modules

---

## TypeScript & Type Safety

### Required Patterns
- ✅ Strict mode enabled
- ✅ Explicit return types on all public methods
- ✅ Proper interfaces, no `any` without explicit justification
- ✅ Use `unknown` with type narrowing instead of `any`
- ✅ Direct imports (`import type { Foo } from '...'`) not dynamic imports in signatures
- ✅ Explicit null checks (no `!` non-null assertions)

### Anti-Patterns
- ❌ `any` type without explicit comment explaining why
- ❌ Non-null assertion operator (`!`)
- ❌ Missing return types
- ❌ Type assertions without validation (`as SomeType`)
- ❌ `@ts-ignore` or `eslint-disable` comments

---

## Code Quality Standards

### Duplication (Three Strikes Rule)
- First occurrence: OK
- Second occurrence: Refactor NOW (don't wait for third)
- Third occurrence: Never allow

### Complexity
- Functions should be focused and readable
- Complex algorithms need comments explaining WHY
- Deep nesting indicates need for refactoring

### Dead Code
- Unused imports
- Unused variables/functions
- Commented-out code blocks
- Unreachable code

### Comments
- ✅ JSDoc on public/protected methods
- ✅ WHY comments for non-obvious decisions
- ✅ Complex algorithm explanations
- ❌ Obvious code comments ("increment counter")
- ❌ Placeholder comments ("Handle event", "Process data")
- ❌ Band-aid comments explaining bad code

### Logging
- ✅ `ILogger` injection in application layer
- ✅ Structured data: `logger.info('Message', { key: value })`
- ✅ Proper levels: trace/debug/info/warn/error
- ✅ Capitalized sentences, no ending period
- ❌ `console.log` in production code
- ❌ Logging in domain layer (zero infrastructure)
- ❌ Global `Logger.getInstance()`
- ❌ String interpolation in messages

---

## Testing Review (Test-Focused Agents)

### Coverage Expectations
- Domain layer: 100% target
- Application layer (use cases): 90% target
- Presentation layer: Critical paths only
- Infrastructure: Integration tests for repositories

### Test Quality
- ✅ Arrange-Act-Assert pattern
- ✅ One logical assertion per test
- ✅ Descriptive test names (`should...when...`)
- ✅ Test behavior, not implementation
- ✅ `NullLogger` in tests (silent by default)
- ✅ Mock external dependencies
- ❌ Testing private methods directly
- ❌ Brittle tests coupled to implementation
- ❌ Tests without assertions

### Missing Tests
- Critical business logic paths
- Error handling and edge cases
- Domain entity methods
- Use case orchestration
- Repository implementations (integration tests)

### Test-Driven Bug Fixes
- Every bug fix should include a test that reproduces it
- Test fails before fix, passes after fix
- Prevents regression

---

## Bug Detection

### Common Bug Patterns
- Null/undefined dereferencing
- Off-by-one errors
- Race conditions
- Memory leaks (event listeners not cleaned up)
- Incorrect error handling (swallowed exceptions)
- Resource leaks (files, connections not closed)
- Integer overflow/underflow
- Incorrect string manipulation
- Logic errors in conditionals

### Edge Cases
- Empty collections
- Null/undefined inputs
- Boundary values (0, -1, MAX_INT)
- Concurrent operations
- Network failures
- Invalid user input

---

## Security Review

### OWASP Top 10 Considerations
- SQL Injection (if applicable)
- XSS vulnerabilities
- Command injection
- Path traversal
- Insecure deserialization
- Sensitive data exposure
- Missing authentication/authorization
- Insufficient logging
- Vulnerable dependencies

### VS Code Extension Specific
- Proper input validation
- Secrets not hardcoded
- Secure API communication
- User input sanitization
- File system access controls

---

## VS Code Pattern Compliance

### Panel Patterns
- Singleton pattern: `private static currentPanel` + `createOrShow()`
- HTML in separate view files
- Proper message passing (webview ↔ extension)
- Resource cleanup in `dispose()`
- Webview CSP (Content Security Policy)

### Extension Activation
- Proper command registration
- Context subscriptions for cleanup
- Activation events correctly configured

---

## Performance Considerations

### Memory Management
- Event listeners properly disposed
- Large objects not retained unnecessarily
- Proper use of weak references where appropriate
- Webview disposal when not needed

### Efficiency
- Unnecessary computations in loops
- N+1 query problems
- Inefficient algorithms (O(n²) where O(n) possible)
- Excessive object creation

---

## Report Structure

Your report should follow this structure:

```markdown
# [AGENT NAME] Code Review Report

**Date**: [Current Date]
**Scope**: [What you reviewed]
**Overall Assessment**: [Production Ready | Needs Work | Significant Issues]

---

## Executive Summary

[2-3 paragraph overview of findings]

**Critical Issues**: X
**High Priority Issues**: Y
**Medium Priority Issues**: Z
**Low Priority Issues**: W

---

## Critical Issues

[Use standard format for each issue]

---

## High Priority Issues

[Use standard format for each issue]

---

## Medium Priority Issues

[Use standard format for each issue]

---

## Low Priority Issues

[Use standard format for each issue]

---

## Positive Findings

[What's being done well]

---

## Pattern Analysis

[Recurring patterns you noticed - this is key for cross-agent pattern detection]

### Pattern: [Name]
**Occurrences**: X
**Impact**: [Description]
**Locations**: [List of files]
**Recommendation**: [How to fix systematically]

---

## Recommendations Summary

[Prioritized list of actionable recommendations]

1. [Most critical fix]
2. [Second priority]
...

---

## Metrics

- Files Reviewed: X
- Critical Issues: X
- High Priority: X
- Medium Priority: X
- Low Priority: X
- Code Quality Score: X/10
- Production Readiness: X/10
```

---

## Review Thoroughness

### Required Analysis
1. **Read actual code**: Don't just scan, understand logic flow
2. **Check imports**: Verify layer boundaries aren't violated
3. **Trace dependencies**: Follow dependency chains to ensure inward flow
4. **Review tests**: Check if critical paths are tested
5. **Look for patterns**: Identify recurring issues across files
6. **Consider context**: Understand business domain (Power Platform development tools)

### Search Strategy
1. Start with domain layer (most critical for Clean Architecture)
2. Review application layer use cases
3. Check infrastructure implementations
4. Examine presentation panels and views
5. Review test coverage
6. Look for cross-cutting concerns

### Key Files/Patterns to Search
- `src/domain/**/*.ts` - Domain entities, services, interfaces
- `src/application/**/*.ts` - Use cases
- `src/infrastructure/**/*.ts` - Repository implementations
- `src/presentation/**/*.ts` - Panels, mappers, ViewModels
- `**/*.test.ts` - Test coverage
- Import statements for layer violations
- `any` type usage
- `!` non-null assertions
- `console.log` statements
- `eslint-disable` comments

---

## Exclusions

**Do NOT review**:
- `node_modules/`
- `out/`
- `.vscode/`
- `dist/`
- Generated files
- Third-party libraries

**DO review**:
- `src/` (primary focus)
- `*.test.ts` files (for test-focused agents)
- Configuration files (for architecture understanding)
- Documentation files (for accuracy)

---

## Final Notes

- **Be thorough**: This is a comprehensive production-readiness assessment
- **Be specific**: Always include file paths and line numbers
- **Be constructive**: Offer solutions, not just criticisms
- **Be pattern-focused**: Look for systemic issues, not just one-offs
- **Be honest**: If there are critical issues blocking production, say so clearly

**Remember**: The goal is to ensure this codebase follows Clean Architecture, SOLID principles, and is production-ready. Your findings will be analyzed for patterns across all agent reports.
