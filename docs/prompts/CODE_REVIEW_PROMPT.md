# Code Review Prompt

**Purpose**: Reusable prompt for invoking parallel AI code reviews. Copy-paste this prompt to get comprehensive code review from multiple specialized agents.

---

## 🚀 Quick Reference

**What This Does**: Invokes 3 specialized agents in parallel to review all uncommitted changes, each producing a focused review document with production readiness score and categorized issues.

**Agents**:
- `@agent-code-reviewer` - General code quality and best practices
- `@agent-clean-architecture-guardian` - Clean Architecture compliance
- `@agent-typescript-pro` - TypeScript patterns and type safety

**Output**: Three markdown files in `docs/codereview/` with timestamp, production readiness score, and categorized issues (CRITICAL/MODERATE/MINOR).

---

## 📖 The Prompt

Copy and paste the following prompt to invoke the code review process:

```
Invoke the following 3 agents IN PARALLEL to review all uncommitted changes:

1. @agent-code-reviewer
2. @agent-clean-architecture-guardian
3. @agent-typescript-pro

Each agent must:
- Perform thorough code review of ALL uncommitted changes
- Create separate file: docs/codereview/{agent-name}-review-{YYYY-MM-DD}.md
- Focus ONLY on issues (no positives or praise)
- Use the format below

Format for each agent's review file:

# {Agent Name} Code Review - {Date}

## Production Readiness: {X}/10

**Rationale**: [1-2 sentences explaining the score based on severity and quantity of issues]

## Issues Found

### CRITICAL

**{File}:{Line}** - {Brief issue description}
- **Problem**: {Detailed explanation of what's wrong}
- **Fix**: {Specific steps to fix it}
- **Rationale**: {Why this matters - performance, security, maintainability, etc.}

### MODERATE

[Same format as CRITICAL]

### MINOR

[Same format as CRITICAL]

---

After all 3 agents complete their reviews:

1. Analyze all findings across the 3 review files
2. Provide consolidated recommendation
3. Explain rationale for recommendation
4. Let me (the user) decide what to fix

Do NOT automatically fix issues. Review only.
```

---

## 📋 Example Usage

### Step 1: Copy the Prompt

Copy the entire prompt from the section above.

### Step 2: Paste and Execute

Paste into Claude Code and wait for all 3 agents to complete their reviews.

### Step 3: Review Output Files

Check `docs/codereview/` directory for three timestamped files:
- `code-reviewer-review-2025-11-02.md`
- `clean-architecture-guardian-review-2025-11-02.md`
- `typescript-pro-review-2025-11-02.md`

### Step 4: Review Consolidated Analysis

Read the consolidated recommendation and decide which issues to address.

---

## 🎯 Review File Format Example

```markdown
# TypeScript Pro Code Review - 2025-11-02

## Production Readiness: 7/10

**Rationale**: Found 2 critical type safety issues and 4 moderate violations of TypeScript best practices. No blocking issues, but critical items should be addressed before merge.

## Issues Found

### CRITICAL

**src/domain/entities/Environment.ts:45** - Using `any` type for configuration object
- **Problem**: Method `applyConfiguration(config: any)` accepts `any` type, bypassing all type safety
- **Fix**: Define `EnvironmentConfiguration` interface with explicit properties
- **Rationale**: Type safety catches bugs at compile time. Each `any` creates a blind spot where runtime errors hide.

**src/application/useCases/SaveEnvironmentUseCase.ts:23** - Missing return type annotation
- **Problem**: Public method `execute()` has no explicit return type
- **Fix**: Add `: Promise<EnvironmentViewModel>` return type
- **Rationale**: Explicit return types prevent unintended API changes and improve IDE autocomplete

### MODERATE

**src/infrastructure/repositories/EnvironmentRepository.ts:67** - Non-null assertion operator used
- **Problem**: Using `environment!.id` assumes value is never null without runtime check
- **Fix**: Use optional chaining or explicit null check: `if (!environment) { throw... }`
- **Rationale**: Non-null assertions bypass TypeScript's safety checks and can cause runtime crashes

### MINOR

**src/presentation/panels/EnvironmentSetupPanel.ts:102** - Implicit `unknown` type in catch block
- **Problem**: Catch block doesn't explicitly type error parameter
- **Fix**: Add type annotation: `catch (error: unknown)` and use type guard
- **Rationale**: Explicit error typing improves clarity and enforces proper error handling patterns
```

---

## ⚙️ Customization Options

### Review Specific Files Only

Modify the prompt to target specific files:

```
Invoke the following 3 agents IN PARALLEL to review these files:
- src/domain/entities/Environment.ts
- src/application/useCases/SaveEnvironmentUseCase.ts

[Rest of prompt unchanged]
```

### Single Agent Review

For focused review from one agent only:

```
@agent-typescript-pro - Review all uncommitted TypeScript files.
Create file: docs/codereview/typescript-pro-review-{YYYY-MM-DD}.md

[Use same format as multi-agent prompt]
```

### Add Custom Agent

To include additional specialized agents:

```
Invoke the following agents IN PARALLEL:
1. @agent-code-reviewer
2. @agent-clean-architecture-guardian
3. @agent-typescript-pro
4. @agent-security-auditor  ← Add custom agent

[Rest of prompt unchanged]
```

---

## 🔍 What Each Agent Focuses On

### @agent-code-reviewer
- General code quality
- Best practices violations
- Code duplication
- Naming conventions
- Comment quality
- Test coverage

### @agent-clean-architecture-guardian
- Layer boundary violations
- Dependency direction
- Domain purity (zero infrastructure dependencies)
- Business logic placement
- Use case orchestration patterns
- Rich domain models vs anemic models

### @agent-typescript-pro
- Type safety (`any` usage, missing types)
- Return type annotations
- Type narrowing and guards
- Union types and discriminated unions
- Generic type usage
- Advanced TypeScript patterns

---

## 🚨 Common Issues Found

### Critical Issues

**Type Safety Violations**:
- Using `any` without explicit justification
- Missing return type annotations on public methods
- Non-null assertions without validation

**Architecture Violations**:
- Business logic in presentation layer
- Domain entities with infrastructure dependencies
- Use cases containing complex business logic

**Security Issues**:
- Logging secrets or tokens without redaction
- Missing input validation
- SQL injection vulnerabilities

### Moderate Issues

**Code Quality**:
- Duplicate code (3+ instances)
- Missing error handling
- Overly complex functions (>50 lines)

**Clean Architecture**:
- Anemic domain models (data only, no behavior)
- Repository interfaces in wrong layer
- Dependencies pointing outward from domain

### Minor Issues

**Style and Convention**:
- Inconsistent naming conventions
- Missing JSDoc comments
- Placeholder comments
- Console.log statements in production code

---

## 🔗 See Also

- [DOCUMENTATION_STYLE_GUIDE.md](../DOCUMENTATION_STYLE_GUIDE.md) - Documentation standards
- [CLAUDE.md](../../CLAUDE.md) - AI assistant instructions and coding rules
- [ARCHITECTURE_GUIDE.md](../architecture/ARCHITECTURE_GUIDE.md) - Clean Architecture principles
- [COMMENT_LOGGING_CLEANUP_PROMPT.md](COMMENT_LOGGING_CLEANUP_PROMPT.md) - Automated cleanup prompt
