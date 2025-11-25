# Contributing to Power Platform Developer Suite

Thank you for your interest in contributing! This guide will help you get started with contributing to the project.

---

## Quick Start

1. **Fork and clone** the repository
2. **Install dependencies**: `npm install`
3. **Run tests**: `npm test`
4. **Start development**: `npm run watch` + Press `F5` to launch Extension Development Host
5. **Read coding standards**: [CLAUDE.md](./CLAUDE.md)
6. **Read workflows**: [Development Workflows](./.claude/WORKFLOW.md)

---

## Development Setup

### Prerequisites

- **Node.js 20.x** (recommended) or 18.x
- **VS Code** (latest version)
- **Git**

**Note:** Node.js 22+ has module resolution issues with vsce packaging tools. Use Node 20.x for packaging.

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Power-Platform-Developer-Suite.git
cd Power-Platform-Developer-Suite

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test
```

### Running in Development

```bash
# Terminal 1: Watch mode (auto-compile on save)
npm run watch

# Terminal 2 (or just press F5 in VS Code)
# Launch Extension Development Host
# This opens a new VS Code window with the extension loaded
```

---

## Coding Standards

### Architecture

This project uses **Clean Architecture** with strict separation of concerns:

```
src/features/{feature}/
  ├── domain/          # Business logic (ZERO external dependencies)
  ├── application/     # Use cases and orchestration
  ├── infrastructure/  # External systems (APIs, storage)
  └── presentation/    # VS Code panels and webviews
```

**Critical Rules:**
- ✅ Business logic in domain entities (not services or UI)
- ✅ Domain has ZERO external dependencies (no `vscode`, `axios`, etc.)
- ✅ Use cases orchestrate only (no business logic)
- ✅ Value objects for validation (no primitive obsession)
- ✅ Explicit return types on all public methods
- ❌ No `any` without explicit type
- ❌ No anemic domain models (entities must have behavior)

**Read the full standards:**
- [CLAUDE.md](./CLAUDE.md) - Quick reference for coding standards
- [Clean Architecture Guide](./docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md) - Detailed architecture patterns

###Testing Requirements

**Coverage Targets:**
- Domain layer: **95-100%** (critical business logic)
- Application layer: **85-95%** (use cases and orchestration)
- Infrastructure layer: **70-85%** (external integrations)
- Presentation layer: **<50%** (manual testing preferred)

**Before submitting a PR:**
```bash
npm test             # All tests must pass
npm run compile      # Zero TypeScript errors
npm run lint         # Zero ESLint violations
```

**Test Patterns:**
- Use test factories for consistent test data
- Mock repositories for isolation
- Write integration tests for complex workflows

**Read more:**
- [Testing Guide](./docs/testing/TESTING_GUIDE.md) - Unit testing patterns
- [Integration Testing Guide](./docs/testing/INTEGRATION_TESTING_GUIDE.md) - Panel integration tests

---

## Contribution Workflow

### 1. Pick an Issue

- Browse [open issues](https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/issues)
- Comment on the issue to claim it
- For new features, open an issue first to discuss

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes

### 3. Make Changes

**Development Workflow:**

1. **Write tests first** (TDD encouraged)
2. **Implement feature** following Clean Architecture layers:
   - Start with domain (entities, value objects)
   - Then application (use cases, mappers)
   - Then infrastructure (repositories, API integration)
   - Finally presentation (panels, UI)
3. **Run compile after each layer**: `npm run compile`
4. **Write tests**: Aim for coverage targets
5. **Manual testing**: Press `F5` to test in Extension Development Host

**Read detailed workflow:**
- [Feature Development Workflow](./.claude/WORKFLOW.md#feature-development-workflow)
- [Bug Fix Workflow](./.claude/WORKFLOW.md#bug-fix-workflow)

### 4. Commit Changes

**Commit Message Format:**
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add plugin registration panel

Implements plugin registration with step assembly browser
and image registration support.

Closes #123
```

```
fix: prevent null reference in environment activation

Added null check before accessing environment properties.

Fixes #456
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

**Then:**
1. Go to GitHub and create a Pull Request
2. Fill out the PR template
3. Link related issues (`Closes #123`)
4. Wait for review

---

## Pull Request Guidelines

### PR Title

Use the same format as commit messages:
```
feat: add plugin registration panel
fix: prevent null reference in environment activation
```

### PR Description

Include:
- **What changed**: Brief description
- **Why it changed**: Motivation/problem solved
- **How to test**: Steps to verify the change
- **Related issues**: `Closes #123` or `Fixes #456`

**Example:**
```markdown
## What Changed
Added plugin registration panel with step assembly browser.

## Why
Users need to register plugins directly from VS Code without
switching to the Plugin Registration Tool.

## How to Test
1. Open Power Platform Developer Suite
2. Click "Plugin Registration" in Tools panel
3. Verify step assembly browser loads
4. Test registering a new plugin

## Related Issues
Closes #123
```

### Before Submitting PR

**Checklist:**
- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run compile`)
- [ ] No ESLint violations (`npm run lint`)
- [ ] Coverage meets targets (run `npm run test:coverage`)
- [ ] Manual testing completed (F5 in VS Code)
- [ ] CHANGELOG.md updated (add entry under `[Unreleased]`)
- [ ] Documentation updated (if applicable)

---

## Code Review Process

1. **Automated checks** run on every PR (GitHub Actions)
2. **Maintainer review** - Code quality, architecture compliance
3. **Feedback** - Address review comments
4. **Approval** - Once approved, PR will be merged
5. **Cleanup** - Delete your branch after merge

**What reviewers look for:**
- Clean Architecture compliance
- Test coverage meets targets
- No business logic in use cases or UI
- Value objects used for validation
- Proper error handling
- Code quality (no duplication, clear names)

---

## Development Resources

### Documentation

**Architecture:**
- [Clean Architecture Guide](./docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md)
- [Value Object Patterns](./docs/architecture/VALUE_OBJECT_PATTERNS.md)
- [Domain Service Patterns](./docs/architecture/DOMAIN_SERVICE_PATTERNS.md)
- [Repository Patterns](./docs/architecture/REPOSITORY_PATTERNS.md)

**Testing:**
- [Testing Guide](./docs/testing/TESTING_GUIDE.md)
- [Integration Testing Guide](./docs/testing/INTEGRATION_TESTING_GUIDE.md)

**Workflows:**
- [Development Workflows](./.claude/WORKFLOW.md)
- [CLAUDE.md](./CLAUDE.md) - Quick reference

### Commands

```bash
# Development
npm run watch          # Auto-compile on save
npm run compile        # One-time TypeScript compilation
npm test               # Run all tests
npm run test:watch     # Watch mode for tests
npm run test:coverage  # Coverage report
npm run lint           # ESLint check

# Packaging (Node 20.x required)
npm run local          # Build and install locally
npm run marketplace    # Revert to marketplace version
```

### Getting Help

- **Documentation**: Start with [CLAUDE.md](./CLAUDE.md) and [Clean Architecture Guide](./docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md)
- **Issues**: Search [existing issues](https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/issues) or open a new one
- **Discussions**: Use [GitHub Discussions](https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/discussions) for questions

---

## Release Process

Releases are handled by maintainers. Contributors should:
1. Add entries to CHANGELOG.md under `[Unreleased]`
2. Do NOT bump version numbers in package.json
3. Do NOT create GitHub releases

Maintainers will:
1. Bump version when ready to release
2. Create GitHub release (triggers automatic marketplace publish)
3. Update CHANGELOG.md with release date

**Read more:** [Release Guide](./docs/RELEASE_GUIDE.md)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

- **General questions**: Open a [GitHub Discussion](https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/discussions)
- **Bug reports**: Open an [issue](https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/issues)
- **Feature requests**: Open an [issue](https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/issues) with `enhancement` label

---

**Thank you for contributing! Your efforts help make Power Platform development better for everyone.**
