# CLAUDE.md - Quick Reference

**Essential rules for AI assistants working on the Power Platform Developer Suite.**

---

## 🚫 NEVER (Non-Negotiable)

1. **`any` without explicit type** - Use proper interfaces or `unknown` with narrowing
2. **`eslint-disable` without permission** - Fix root cause. Ask if rule seems wrong
3. **Quick fixes or technical debt shortcuts** - Do it right or discuss tradeoffs. Explain root cause and proper solution, never band-aids
4. **Duplicate code 3+ times** - Stop at 2nd copy. Create abstraction (Three Strikes Rule)
5. **Anemic domain models** - Entities must have behavior (methods), not just data
6. **Business logic outside domain** - Business logic ONLY in domain entities/services, NEVER in use cases or panels
7. **Domain depending on outer layers** - Domain has ZERO external dependencies
8. **HTML in panel TypeScript files** - Extract to separate view files in `presentation/views/`
9. **Non-null assertions (`!`)** - Use explicit null checks: `if (x === null) return;`
10. **Dynamic import types in signatures** - Use direct imports: `import type { Foo } from '...'`
11. **Static utility methods on entities** - Put in domain services or collection classes
12. **Presentation logic in domain** - Display formatting belongs in mappers, not entities

---

## ✅ ALWAYS (Required Patterns)

1. **TypeScript strict mode** - Type safety catches bugs at compile time
2. **Clean Architecture layers** - Domain → Application → Infrastructure/Presentation
3. **Rich domain models** - Entities with behavior (methods), not just data
4. **Use cases orchestrate only** - Coordinate domain entities, NO business logic
5. **ViewModels are DTOs** - Simple data structures mapped from domain entities
6. **Repository interfaces in domain** - Domain defines contracts, infrastructure implements
7. **Dependencies point inward** - All dependencies flow toward domain
8. **Explicit return types** - All public methods have return types
9. **Refactor on 2nd duplication** - Don't wait for 3rd
10. **Type narrowing with explicit checks** - No shortcuts, proper validation
11. **Domain services for complex logic** - If use case has complex logic, extract to domain service
12. **Mappers transform only** - No business decisions; sort before/after mapping
13. **Write tests after F5 validation, before PR** - Domain: 80%+, complex orchestration: 70%+
14. **Test-driven bug fixes** - Write failing test, fix bug, verify test passes
15. **VS Code panel singleton** - `private static currentPanel` + `createOrShow()` factory
16. **Explore before implementing** - Search for existing patterns/code before creating new

---

## ⚖️ Acceptable Pattern Exceptions

**Some patterns appear duplicated but are actually valid design decisions:**

### Collection Service Pattern
- ✅ **Multiple collection services with similar structure** - NOT problematic duplication
- Each service: 15-25 lines, single `sort()` method, feature-specific business rules
- Defensive copy `[...items].sort()` is an intentional pattern
- Example: `SolutionCollectionService`, `ImportJobCollectionService`, `EnvironmentVariableCollectionService`
- **Why acceptable:** Structural similarity ≠ duplication. Each encapsulates different business logic.
- **See:** [DOMAIN_SERVICE_PATTERNS.md](docs/architecture/DOMAIN_SERVICE_PATTERNS.md#acceptable-structural-similarity-in-collection-services)

### Large Files (When Justified)
- ✅ **Integration test files** (800-1500 lines) - Comprehensive test coverage more important than file size
- ✅ **Panel coordinators** (700-900 lines) - Multiple command handlers for single panel (requires `eslint-disable` justification)
- ✅ **Complex domain entities** (700-800 lines) - Rich behavior with clear section comments
- **See:** [CODE_QUALITY_GUIDE.md](docs/architecture/CODE_QUALITY_GUIDE.md#file-size-guidelines) for detailed guidance

### Security Practices (Acceptable Deviations)
- ✅ **HTTP localhost OAuth redirects** (`http://localhost:3000`) - Industry standard for local development
- Microsoft MSAL documentation uses HTTP for localhost redirects
- HTTPS on localhost requires self-signed certificates (poor UX, minimal security benefit)
- **Why acceptable:** OAuth spec allows HTTP for localhost; redirect URIs are validated by authorization server

### Type Safety in Tests
- ✅ **Non-null assertions in test files** (`variable!`) - Acceptable in test setup/mocking
- ✅ **Type assertions for message narrowing** (`as MessageType`) - Common pattern for discriminated unions in tests
- **Why acceptable:** Test-only code; reduces boilerplate without production risk

---

## 💬 Comment & Logging Standards

**See detailed guides:**
- **Comments**: [CODE_QUALITY_GUIDE.md](docs/architecture/CODE_QUALITY_GUIDE.md) - When/how to comment
- **Logging**: [LOGGING_GUIDE.md](docs/architecture/LOGGING_GUIDE.md) - Logging levels, formatting, architecture

**Comment Rules:**

**Comment when:**
- ✅ Public/protected methods (JSDoc)
- ✅ WHY, not WHAT (non-obvious decisions)
- ✅ Complex algorithms / Regex

**Never comment:**
- ❌ Obvious code
- ❌ Placeholders ("Handle event" / "Process data")
- ❌ Band-aids for bad code

**Logging Architecture:**

**Never log:**
- ❌ In domain entities/services (zero infrastructure in domain)
- ❌ `console.log` in production code (dev debugging only, remove before commit)
- ❌ Global `Logger.getInstance()` (inject `ILogger` via constructor)

**Always log:**
- ✅ At use case boundaries (application layer: start/completion/failures)
- ✅ Via injected `ILogger` (constructor injection, testable)
- ✅ Use `NullLogger` in tests (silent by default, `SpyLogger` for assertions)

**See [LOGGING_GUIDE.md](docs/architecture/LOGGING_GUIDE.md)** for levels and message formatting.

---

## 💻 Tech Stack

- **TypeScript 5.x** (strict mode, explicit return types)
- **Jest 30.x** (testing framework)
- **VS Code Extension API** (panels, commands, webviews)
- **Node 18+** (runtime)
- **Power Platform API** (Dataverse, environments, solutions)

---

## 🧠 Extended Thinking

Extended thinking is expensive (tokens + time). Front-load during **design**, minimize during **execution**.

### The Principle

```
DESIGN PHASE → think hard / think harder (get approach right)
BUILD PHASE  → normal mode (execute the plan)
DEBUG PHASE  → escalate as needed (normal → think → think hard)
REVIEW PHASE → normal mode (code speaks for itself)
```

### Decision Matrix

| Situation | Mode | Why |
|-----------|------|-----|
| Clear spec, just implementing | Normal | Plan exists, execute it |
| Bug with obvious root cause | Normal | Fix it |
| Unfamiliar code, need to understand | `think` | Build mental model |
| 2-3 options, weighing tradeoffs | `think` | Structured comparison |
| Medium feature design (3-6 files) | `think hard` | Architectural decisions matter |
| Breaking large feature into slices | `think hard` | Strategy affects everything |
| First approach failed, reconsidering | `think hard` | Need fresh perspective |
| Complex multi-system architecture | `think harder` | High stakes, many interactions |
| Security-sensitive decisions | `think harder` | Can't afford mistakes |
| Major pivot, everything on table | `ultrathink` | Rare, last resort |

### Build Mode Triggers

Even during implementation, certain situations should prompt thinking:
- "I'm not sure how this should work..." → `think`
- "There are a few ways to do this..." → `think hard`
- "This is getting complicated..." → `think hard`

### Mode Reference

- `"think"` - Standard extended reasoning (~10-20s)
- `"think hard"` - More thorough analysis (~30-60s)
- `"think harder"` - Deep analysis (~1-2min)
- `"ultrathink"` - Maximum reasoning (rare, ~2-5min)

---

## 🛠️ Common Commands

**Development:**
- `npm run compile` - Full compilation with lint + tests
- `npm run compile:fast` - Quick build only, no lint/tests
- `npm test` - Run all tests
- `npm run lint` - ESLint check
- `npm run watch` - Continuous compilation during development

**VS Code:**
- `F5` - Launch Extension Development Host (manual testing required)
- `Ctrl+Shift+P` - Command palette (test your commands)

**Claude Code:**
- `/clear` - Reset context when switching tasks (important!)
- `/design [feature]` - Invoke design-architect for feature design
- `/new-panel [name]` - Scaffold new VS Code panel with Clean Architecture
- `/cleanup-code` - Find/fix logging and comment violations
- `/prepare-pr` - Full PR validation (compile, tests, coverage, CHANGELOG, code review)
- `/prepare-release X.Y.Z` - Release prep (everything in /prepare-pr + version bump)
- `/code-review` - Standalone code review (now included in /prepare-pr)
- `/review-technical-debt` - Audit technical debt, clean up resolved items
- `/fix-technical-debt` - Interactively fix technical debt items
- `/handoff` - Generate session summary for context handoff

**Code Quality & Dead Code Detection:**
- `npm run type-coverage` - Type coverage check (95% minimum)
- `npm run call-graph` - Detect circular dependencies (should always be 0)
- `npx ts-prune` - Find unused exports (dead code detection)
- `npx depcheck` - Find unused npm dependencies
- `/comprehensive-review` - 8-agent parallel code review (quarterly, pre-production only)

**E2E Testing (Playwright):**
- `npm run e2e:smoke` - Run smoke tests (~30s) - VS Code launch, command execution, screenshots
- `npm run e2e:headed` - Run with visible VS Code window (debugging)
- `npm run e2e:debug` - Step-by-step debugging with Playwright Inspector

**When to run E2E tests:**
- ✅ After UI/panel changes to verify they still work
- ✅ When debugging panel initialization issues
- ✅ To capture screenshots of current state
- ✅ To verify extension activation and command registration
- ❌ NOT for every code change (unit tests are faster)
- ❌ NOT as replacement for manual F5 testing (E2E is supplementary)

**What E2E tests capture:**
- `vscode.getLogs()` - VS Code console logs (renderer, webview debug messages)
- `vscode.getExtensionLogs()` - Extension Output channel logs (your logger.info/debug/error)
- Screenshots saved to `e2e/screenshots/`
- Structured JSON results in `e2e/results/claude-results.json`

**When to run:**
- **Monthly**: Quick `ts-prune` check for unused exports
- **Before cleanup sprints**: Generate all 3 reports (ts-prune, depcheck, madge)
- **After major refactors**: Run `madge --circular` to verify no new circular dependencies
- **Quarterly**: Run `/comprehensive-review` for full production readiness assessment

---

## 📦 Version Management

**Full process:** [Release Guide](docs/RELEASE_GUIDE.md)

**Quick Rules:**
1. `package.json` version is ALWAYS production version (no dev suffixes)
2. Use F5 for development, `npm run local` for production testing
3. Node.js 20.x for packaging (22+ has vsce issues)

**Before ANY PR to main:** Update `CHANGELOG.md`

**For releases:** Use `/prepare-release` command

---

## 🔀 Git Branch & Merge Strategy

### Branching
- **main**: Protected branch, always deployable
- **feature/xxx, fix/xxx, refactor/xxx**: Development branches

### Merge Strategy: Squash Merge
**We use squash merge for all PRs to main.** This keeps main's history clean and readable.

**Why squash merge:**
- Main branch has one commit per feature/fix (clean, readable history)
- Feature branches can have messy exploratory commits (that's fine!)
- Easy to revert entire features if needed
- Changelog maps 1:1 with commits on main

**What this means for you:**
- Commit freely on feature branches (WIP, fixups, experiments - all OK)
- Don't worry about "perfect" commit history on feature branches
- PR title becomes the squashed commit message (make it good!)
- All feature branch commits collapse into one commit on main

**PR titles should follow commit message format:**
```
feat: add plugin registration panel
fix: prevent null reference in environment activation
```

---

## 🌳 Git Worktrees (Parallel Development)

Use git worktrees for parallel feature development in separate Claude Code sessions.

**Creating a worktree:**
```bash
# From main repo, create worktree as sibling directory
git worktree add "../Power-Platform-Developer-Suite-[feature]" -b feature/[branch-name]
```

**Auto-symlinked files:** The `post-checkout` hook automatically symlinks these gitignored files from main repo:
- `.mcp.json` - Dataverse MCP connection
- `.claude/settings.local.json` - Claude Code settings
- `.env.e2e.local` - E2E test credentials

**Managing worktrees:**
```bash
git worktree list              # List all worktrees
git worktree remove <path>     # Remove worktree (after merging branch)
git worktree prune             # Clean up stale worktree references
```

**Best practices:**
- Each worktree = separate Claude Code session
- Don't switch branches within a worktree (defeats the purpose)
- Remove worktree after feature is merged

---

## ⚡ Parallel Execution

**Parallelize independent operations** (multiple reads, searches, git commands).
**Sequentialize dependent operations** (write → read same file, compile → test).

**Rule:** If tool call B doesn't need the result of tool call A, parallelize them.

---

## 🎯 Context Management

**When to /clear:**
- ✅ After completing feature (before starting next)
- ✅ When context fills with irrelevant code (conversation getting bloated)
- ✅ When switching between unrelated tasks
- ✅ After extensive debugging session
- ❌ Mid-feature implementation (breaks flow)
- ❌ During multi-step refactoring

**Tips:**
- Use `/clear` liberally - it's better to lose context than work with stale/bloated context
- After `/clear`, refer to this file (CLAUDE.md) to restore essential rules
- Extended thinking uses more context - clear before using "think hard"

---

## 🔄 Workflow Philosophy

**Design outside-in** (user perspective: panel → ViewModels → use cases → domain)
**Implement inside-out** (technical: domain → application → infrastructure → presentation)
**Review once per feature** (after all 4 layers complete, not per layer)
**Design docs are temporary** - Delete after PR merge (extract patterns → `docs/architecture/`, ideas → GitHub Issues)

### Building Features

1. **Design phase** (approach depends on complexity)
   - **Simple features (1-2 files)**: Use "think" or "think hard" - no formal design needed
   - **Medium features (3-6 files)**: Invoke `design-architect` for FIRST SLICE only, implement incrementally
   - **Complex features (7+ files)**: Break into slices, design each slice separately (prevents overwhelming designs)
   - **Uncertain approach**: Use "think harder" to evaluate options before committing to design

2. **Implementation phase** (inside-out, exploration mode)
   - Domain → Application → Infrastructure → Presentation
   - `npm run compile:fast` after EVERY file edit - catch errors immediately, don't batch
   - `npm run compile` (full) after completing each layer
   - NO tests during exploration (focus on getting to F5 fast)
   - Commit per layer (WIP commits are fine - squash merge cleans up)
   - F5 test and iterate until "feels right"

3. **Stabilization phase** (tests required before PR)
   - Write domain tests (business rules, validation)
   - Write application tests (complex orchestration only)
   - `npm test` must pass before review

4. **Review phase** (once per feature)
   - Invoke `code-guardian` after all layers complete
   - `npm test` and `npm run compile` must pass
   - Manual testing must be complete
   - Get APPROVE before committing

### Bug Fixes

1. Write failing test (reproduces bug)
2. Fix bug (test passes)
3. Commit with test (prevents regression)

**Choose test type based on bug category:**

| Bug Type | Unit Test | E2E Test | Example |
|----------|-----------|----------|---------|
| Domain/use case logic | ✅ Always | ❌ No | Validation rule wrong |
| Mapper/transformer | ✅ Always | ❌ No | Field not mapped |
| Panel rendering | ✅ If possible | ✅ Yes | Button not disabled |
| User workflow broken | ❌ Hard | ✅ Yes | Env switch overwrites state |
| Race condition/timing | ❌ Hard | ✅ Yes | Data loads before panel ready |
| State persistence | ❌ Hard | ✅ Yes | Settings not restored |

**E2E-driven bug fix process** (for workflow/UI/state bugs):
1. **Reproduce manually** - Confirm bug exists via F5
2. **Write E2E test** - Capture the expected workflow behavior
3. **Run test** - Verify it FAILS (proves test catches the bug)
4. **Fix the bug** - Implement the fix
5. **Run test** - Verify it PASSES (proves fix works)
6. **Commit with test** - Regression protection automatic

### Refactoring

1. Tests pass BEFORE refactoring (baseline)
2. Refactor code
3. Tests pass AFTER refactoring (behavior unchanged)

---

## 🤖 Agent Roles

- **YOU** = Implementer (human or builder)
- **design-architect** = Feature designer (BEFORE implementation, complex features)
- **code-guardian** = Reviewer + Final Approval Gate (AFTER implementation)

See `.claude/agents/` for agent definitions.

---

## 📚 References

**For detailed workflows:**
- `.claude/WORKFLOW.md` - All workflows (features, bugs, refactoring, testing)
- `.claude/agents/` - Agent definitions (code-guardian, design-architect)
- `.claude/TROUBLESHOOTING.md` - Common problems and solutions
- `.claude/templates/TECHNICAL_DESIGN_TEMPLATE.md` - Design template
- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` - Panel patterns
- `.claude/templates/PANEL_INITIALIZATION_PATTERN.md` - **CRITICAL** Panel initialization pattern (MUST follow)

**Architecture guides:**
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Core architectural patterns
- `docs/architecture/CODE_QUALITY_GUIDE.md` - Comment & code quality standards
- `docs/architecture/LOGGING_GUIDE.md` - Logging by layer

**Detailed pattern guides:**
- `docs/architecture/VALUE_OBJECT_PATTERNS.md` - Value object implementation patterns
- `docs/architecture/DOMAIN_SERVICE_PATTERNS.md` - Domain service patterns
- `docs/architecture/MAPPER_PATTERNS.md` - **Read this first** to avoid sorting mistakes
- `docs/architecture/REPOSITORY_PATTERNS.md` - Repository implementation patterns

**Testing guides:**
- `docs/testing/TESTING_GUIDE.md` - Unit testing patterns and test factories
- `docs/testing/INTEGRATION_TESTING_GUIDE.md` - Panel integration testing patterns
- `e2e/README.md` - E2E testing infrastructure (Playwright + VS Code)

**Project management:**
- GitHub Issues - Planned features (filter by `epic:*` labels) and tech debt (filter by `tech-debt` label)
- `docs/adr/` - Architectural Decision Records (accepted tradeoffs, rejected suggestions)
- `docs/requirements/` - Feature requirements documentation

---

## 🔄 Session Habits

| When | Action |
|------|--------|
| Complex feature (3+ files) | `/design` first |
| Before PR | `/prepare-pr` (includes code review) |
| For releases | `/prepare-release X.Y.Z` (includes code review + version bump) |
| End session | `/handoff` |
| Context full/switching tasks | `/clear` |
| Uncertain architecture | "think harder" before designing |

---

## 📝 Commit Guidance

**Context-aware approach** - not one-size-fits-all:

**Code changes:**
- Commit per layer during implementation
- Follow session pattern if established (user said "commit and proceed" = do it going forward)
- Ask if unclear on significant code changes

**Documentation/planning:**
- Commit at logical checkpoints WITHOUT asking
- After each completed phase
- When tracking doc updated significantly

**Never commit:**
- Failing tests
- Compilation errors
- Incomplete implementations (unless WIP branch)

---

## 📂 Work Tracking

**For multi-phase work, create tracking doc:** `docs/work/[FEATURE]_TODO.md`

- Use template: `.claude/templates/TASK_TRACKING_TEMPLATE.md`
- Update as work progresses (check boxes)
- Track bugs found during manual testing
- Delete after PR merge (git history preserves it)

**Keep in sync:** TodoWrite (in-session) + tracking doc (persistent)

---

**Git Commits & PRs:** No "Generated with Claude Code" footers, Co-authored-by lines, or AI attribution in commits or PR descriptions. Keep messages clean and conventional.
