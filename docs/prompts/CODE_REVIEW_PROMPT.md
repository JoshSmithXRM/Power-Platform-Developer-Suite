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
- Focus ONLY on issues (NO positives, NO praise, NO "What's GOOD" sections)
- Be concise - brief problem descriptions and fixes only
- Identify repeated patterns that should be automated with ESLint rules
- Use the format below

Format for each agent's review file:

# {Agent Name} Code Review - {Date}

## Production Readiness: {X}/10

**Rationale**: [1 sentence explaining the score]

## Issues Found

### CRITICAL

**{File}:{Line}** - {Brief issue description}
- **Problem**: {What's wrong - 1-2 sentences max}
- **Fix**: {Specific fix - 1-2 sentences max}
- **Rationale**: {Why it matters - 1 sentence}

### MODERATE

[Same format as CRITICAL]

### MINOR

[Same format as CRITICAL]

## Recommended ESLint Rules

**Purpose**: Identify patterns that could be prevented by automated linting.

If you notice **3+ violations of the same pattern** across the codebase, suggest an ESLint rule:

**Pattern**: {Brief description of the repeated violation}
- **Rule Name**: `{suggested-eslint-rule-name}`
- **Severity**: error | warn
- **Current Violations**: {count} instances
- **Enforcement**: Custom rule | Existing ESLint plugin
- **Example**:
```typescript
// ❌ Bad (would be caught)
{code example}

// ✅ Good (correct pattern)
{code example}
```

**Rationale**: {Why this should be automated - 1 sentence}

---

After all 3 agents complete their reviews:

1. Read all 3 review files
2. Provide SHORT consolidated summary with:
   - Overall production readiness score
   - Top 5 critical issues (overlapping across agents)
   - Top 5 moderate issues
   - Recommended action: merge/fix first/not ready
   - Summary of suggested ESLint rules (if any patterns were identified by agents)
3. NO fluff, NO praise, NO "what's excellent" sections
4. Keep it under 50 lines total

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

**Rationale**: 2 critical type safety issues and 4 moderate violations found.

## Issues Found

### CRITICAL

**src/domain/entities/Environment.ts:45** - `any` type used
- **Problem**: `applyConfiguration(config: any)` bypasses type safety
- **Fix**: Define `EnvironmentConfiguration` interface
- **Rationale**: Type safety catches bugs at compile time

**src/application/useCases/SaveEnvironmentUseCase.ts:23** - Missing return type
- **Problem**: `execute()` has no explicit return type
- **Fix**: Add `: Promise<EnvironmentViewModel>`
- **Rationale**: Prevents API changes and improves autocomplete

### MODERATE

**src/infrastructure/repositories/EnvironmentRepository.ts:67** - Non-null assertion
- **Problem**: `environment!.id` assumes non-null without check
- **Fix**: Use optional chaining: `environment?.id`
- **Rationale**: Prevents runtime crashes

### MINOR

**src/presentation/panels/EnvironmentSetupPanel.ts:102** - Untyped catch
- **Problem**: Catch block missing error type annotation
- **Fix**: `catch (error: unknown)`
- **Rationale**: Enforces proper error handling

## Recommended ESLint Rules

**Pattern**: Missing explicit return types on public methods
- **Rule Name**: `@typescript-eslint/explicit-function-return-type`
- **Severity**: error
- **Current Violations**: 12 instances
- **Enforcement**: Existing ESLint plugin (already available)
- **Example**:
```typescript
// ❌ Bad (would be caught)
public async execute(id: string) {
    return await this.repository.findById(id);
}

// ✅ Good (correct pattern)
public async execute(id: string): Promise<Entity> {
    return await this.repository.findById(id);
}
```
- **Rationale**: Prevents accidental API contract changes and improves IDE autocomplete.

**Pattern**: Static utility methods on domain entities
- **Rule Name**: `local-rules/no-static-entity-methods`
- **Severity**: error
- **Current Violations**: 4 instances
- **Enforcement**: Custom rule required
- **Example**:
```typescript
// ❌ Bad (would be caught)
export class Solution {
    static sort(solutions: Solution[]): Solution[] { ... }
}

// ✅ Good (correct pattern)
export class SolutionCollection {
    constructor(private solutions: Solution[]) {}
    sort(): Solution[] { ... }
}
```
- **Rationale**: Enforces CLAUDE.md rule #13 - static utility methods violate SRP and should be in domain services.
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

## 🤖 ESLint Rule Recommendation Workflow

When code review agents identify **repeated patterns** (3+ violations of the same type), they should recommend automating detection with ESLint rules.

### Process:

1. **Review Agent Identifies Pattern**
   - Agent notices multiple violations of the same anti-pattern
   - Adds "Recommended ESLint Rules" section to review file
   - Provides rule name, severity, example, and rationale

2. **Human Reviews Recommendations**
   - Read ESLint rule suggestions from all 3 review files
   - Consolidated summary lists all suggested rules
   - Decide which rules to implement

3. **Implement New Rules** (if approved)
   - Custom rules: Add to `eslint-local-rules.cjs`
   - Configuration: Enable in `eslint.config.mjs`
   - TypeScript: Update `tsconfig.json` if needed

4. **Benefits**
   - ✅ Prevents future violations automatically
   - ✅ Reduces manual code review burden
   - ✅ Enforces consistency across team
   - ✅ Catches issues at development time (IDE)

### Example ESLint Rules Already Implemented:

Based on previous code reviews, these custom rules were added:

- `no-static-entity-methods` - Blocks static utility methods on entities (CLAUDE.md #13)
- `no-presentation-methods-in-domain` - Blocks presentation logic in domain (CLAUDE.md #14)
- `no-html-in-typescript` - Blocks HTML in panel TypeScript files (CLAUDE.md #11)
- `prefer-explicit-undefined` - Encourages explicit `| undefined` over `?`

These now run automatically on every `npm run lint` and block CI/CD if violated.

---

## 🔗 See Also

- [DOCUMENTATION_STYLE_GUIDE.md](../DOCUMENTATION_STYLE_GUIDE.md) - Documentation standards
- [CLAUDE.md](../../CLAUDE.md) - AI assistant instructions and coding rules
- [ARCHITECTURE_GUIDE.md](../architecture/ARCHITECTURE_GUIDE.md) - Clean Architecture principles
- [COMMENT_LOGGING_CLEANUP_PROMPT.md](COMMENT_LOGGING_CLEANUP_PROMPT.md) - Automated cleanup prompt
- [eslint-local-rules.cjs](../../eslint-local-rules.cjs) - Custom ESLint rules implementation
- [eslint.config.mjs](../../eslint.config.mjs) - ESLint configuration
