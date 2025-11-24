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
13. **Write tests for domain and application layers** - Domain: 100% target, use cases: 90% target
14. **Test-driven bug fixes** - Write failing test, fix bug, verify test passes
15. **VS Code panel singleton** - `private static currentPanel` + `createOrShow()` factory

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

**Logging Levels:**
- `trace` - Extremely verbose (loop iterations, raw payloads, method entry/exit)
- `debug` - Technical details, method flow, API calls
- `info` - Business events, use case completion, state changes
- `warn` - Recoverable issues, fallbacks, missing optional config
- `error` - Failures, exceptions (always pass error object)

**Message Format:**
- ✅ Capitalize first letter (sentence case)
- ✅ No period at end
- ✅ Structured data in args: `logger.info('Deleted traces', { count: 15 })`
- ❌ No string interpolation: `` logger.info(`Deleted ${count} traces`) ``

---

## 💻 Tech Stack

- **TypeScript 5.x** (strict mode, explicit return types)
- **Jest** (testing framework)
- **VS Code Extension API** (panels, commands, webviews)
- **Node 18+** (runtime)
- **Power Platform API** (Dataverse, environments, solutions)

---

## 🧠 Extended Thinking

For complex/uncertain problems, trigger extended thinking modes:

- `"think"` - Standard extended reasoning (~10-20s extra thinking)
- `"think hard"` - More thorough analysis (~30-60s)
- `"think harder"` - Deep analysis (~1-2min)
- `"ultrathink"` - Maximum reasoning (rare, very expensive, ~2-5min)

**When to use:**
- ✅ Uncertain architectural approach (think hard)
- ✅ Complex refactoring decisions (think)
- ✅ Breaking down large features into slices (think hard)
- ✅ Critical production decisions (think harder)
- ❌ Simple CRUD features (normal mode sufficient)

---

## 🛠️ Common Commands

**Development:**
- `npm run compile` - TypeScript compilation (run after EVERY layer)
- `npm test` - Run all tests (must pass before commits)
- `npm run lint` - ESLint check
- `npm run watch` - Continuous compilation during development

**VS Code:**
- `F5` - Launch Extension Development Host (manual testing required)
- `Ctrl+Shift+P` - Command palette (test your commands)

**Claude Code:**
- `/clear` - Reset context when switching tasks (important!)
- `/cleanup-code` - Systematic comment/logging standards enforcement
- `/code-review` - Invoke code-guardian for approval
- `/review-technical-debt` - Audit technical debt, clean up resolved items
- `/fix-technical-debt` - Interactively fix technical debt items

**Code Quality & Dead Code Detection:**
- `npx ts-prune` - Find unused exports (dead code detection)
- `npx depcheck` - Find unused npm dependencies
- `npx madge --circular src/ --extensions ts` - Detect circular dependencies (should always be 0)
- `npx madge --circular src/ --extensions ts > madge-report.txt` - Save circular dependency report
- `/comprehensive-review` - 8-agent parallel code review (quarterly, pre-production only)

**When to run:**
- **Monthly**: Quick `ts-prune` check for unused exports
- **Before cleanup sprints**: Generate all 3 reports (ts-prune, depcheck, madge)
- **After major refactors**: Run `madge --circular` to verify no new circular dependencies
- **Quarterly**: Run `/comprehensive-review` for full production readiness assessment

---

## 📦 Version Management & Local Installation

### Critical Rules

1. **`package.json` version is ALWAYS the production version** - Never commit dev suffixes
2. **Marketplace only accepts numeric versions** - No `-dev.1`, `-beta`, `-rc` tags allowed
3. **Use F5 for 99% of development** - Only install locally for final production testing
4. **Dev suffix is automatic** - Scripts handle version manipulation, never manual

### Workflow

**During Feature Development:**
```bash
# package.json stays at production version (e.g., "0.1.1")
# Use F5 (Extension Development Host) for all testing
npm run watch  # Terminal 1
# Press F5 to launch Extension Development Host
```

**When You Need Production Testing:**
```bash
# Install local dev build (auto-appends -dev.X suffix)
npm run local
# Creates: 0.1.1-dev.3 (increments automatically)
# Installs in main VS Code with dev version clearly marked
# package.json REMAINS at 0.1.1 (never modified)
```

**Revert to Marketplace Version:**
```bash
npm run marketplace
# Uninstalls local version
# Reinstalls published version from VS Code Marketplace
```

**Clean Up Extension Folders:**
```bash
npm run cleanup-extensions
# Points to extensions folder for manual cleanup if needed
# (Windows nul files require manual deletion via File Explorer)
```

### How It Works

**`npm run local` workflow:**
1. Reads version from `package.json` (e.g., `0.1.1`)
2. Increments counter in `.dev-version` file (e.g., `3`)
3. **Temporarily** modifies `package.json` to `0.1.1-dev.3`
4. Builds and packages extension with dev version
5. **Immediately restores** `package.json` to `0.1.1`
6. Installs `.vsix` with dev version in VS Code

**Result:**
- ✅ Extensions panel shows: `0.1.1-dev.3` (clearly marked as dev)
- ✅ `package.json` shows: `0.1.1` (production version, safe to commit)
- ✅ `.dev-version` shows: `3` (counter for next build)
- ✅ Git status: Clean (no modifications to package.json)

### Release Process

**When Ready to Publish:**

1. **Finish feature work on feature branch**
   - All tests passing
   - Manual testing complete via F5
   - Code reviewed and approved

2. **Merge to main branch**
   ```bash
   git checkout main
   git merge feature/your-feature
   ```

3. **Bump version on main**
   ```bash
   # Edit package.json manually
   # "version": "0.1.1" → "0.1.2" (or appropriate semver)
   git add package.json
   git commit -m "Bump version to v0.1.2"
   git push origin main
   ```

4. **Create GitHub Release**
   - Go to GitHub → Releases → Create new release
   - Tag: `v0.1.2`
   - Title: `v0.1.2`
   - Description: Release notes
   - Publish release

5. **GitHub Actions Auto-Publishes**
   - Workflow triggers on release
   - Builds from main branch
   - Publishes `0.1.2` to VS Code Marketplace
   - Version is numeric (no dev suffix) - ✅ Marketplace accepts it

### Version Requirements

**VS Code Marketplace:**
- ✅ Accepts: `1.0.0`, `0.1.2`, `2.5.3` (numeric only)
- ❌ Rejects: `0.1.1-dev.1`, `1.0.0-beta`, `0.5.0-rc.1`

**Local .vsix Installation:**
- ✅ Accepts: ANY version format including `-dev.X` suffixes
- ✅ Perfect for development/testing

**Why This Workflow:**
- `package.json` always shows "real" version (ready to publish anytime)
- No risk of accidentally publishing dev version (impossible - marketplace rejects it)
- Clear distinction between dev builds and production
- Aligns with existing release workflow (bump on main, then publish)

### Troubleshooting

**Extensions won't delete (nul file errors):**
```bash
npm run cleanup-extensions
# Follow instructions to manually delete via File Explorer
# Navigate to: %USERPROFILE%\.vscode\extensions
# Delete folders starting with: joshsmithxrm.power-platform-developer-suite-
# Use Shift+Delete for permanent deletion
```

**Marketplace install shows wrong version:**
- Clear VS Code cache (close all windows first):
  ```bash
  Remove-Item -Recurse -Force "$env:APPDATA\Code\Cache"
  code --install-extension JoshSmithXRM.power-platform-developer-suite --force
  ```

**Want specific dev version:**
- Dev counter stored in `.dev-version` (gitignored)
- Edit manually to reset: `echo 1 > .dev-version`
- Next build will be `-dev.2`

### Node.js Version

**For Packaging (.vsix creation):**
- Use Node.js 20.x: `nvm use 20`
- Node.js 22+ has module resolution issues with vsce

**For Development (F5):**
- Any Node.js version works fine
- Node.js 22 is OK for regular development

---

## ⚡ Parallel Execution (Maximize Efficiency)

**ALWAYS use parallel tool calls when operations are independent:**

**✅ DO parallelize:**
- Reading multiple unrelated files
- Multiple grep searches for different patterns
- Multiple glob searches
- Independent bash commands (git status + git diff + git log)
- Analysis tasks that don't depend on each other

**❌ DON'T parallelize:**
- Operations where second depends on first result
- Write then Read same file
- Compile then test (sequential dependency)
- Create directory then write file to it

**Examples:**

**✅ GOOD - Parallel reads:**
```
Read Environment.ts
Read EnvironmentRepository.ts
Read EnvironmentMapper.ts
(All in single message - 3 tool calls)
```

**✅ GOOD - Parallel searches:**
```
Grep for "StorageEntry" pattern
Grep for "StorageCollection" pattern
Glob for "*Storage*.ts" files
(All in single message - 3 tool calls)
```

**❌ BAD - False parallelization:**
```
Write new file
Read same file (depends on write completing)
(Must be sequential)
```

**Rule of thumb:** If tool call B doesn't need the result of tool call A, parallelize them.

**See:** `.claude/WORKFLOW.md` for detailed parallel execution patterns

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

### Building Features

1. **Design phase** (approach depends on complexity)
   - **Simple features (1-2 files)**: Use "think" or "think hard" - no formal design needed
   - **Medium features (3-6 files)**: Invoke `design-architect` for FIRST SLICE only, implement incrementally
   - **Complex features (7+ files)**: Break into slices, design each slice separately (prevents overwhelming designs)
   - **Uncertain approach**: Use "think harder" to evaluate options before committing to design

2. **Implementation phase** (inside-out)
   - Domain → Application → Infrastructure → Presentation
   - `npm run compile` after EACH layer
   - Write tests AFTER implementation, BEFORE review
   - Commit per layer
   - Manual test (F5) when complete

3. **Review phase** (once per feature)
   - Invoke `code-guardian` after all layers complete
   - `npm test` and `npm run compile` must pass
   - Manual testing must be complete
   - Get APPROVE before committing

4. **Documentation phase** (optional)
   - Invoke `docs-generator` when needed
   - Batch documentation at end of sprint

### Bug Fixes

1. Write failing test (reproduces bug)
2. Fix bug (test passes)
3. Commit with test (prevents regression)

### Refactoring

1. Tests pass BEFORE refactoring (baseline)
2. Refactor code
3. Tests pass AFTER refactoring (behavior unchanged)

---

## 🤖 Agent Roles

- **YOU** = Implementer (human or builder)
- **design-architect** = Feature designer (BEFORE implementation, complex features)
- **code-guardian** = Reviewer + Final Approval Gate (AFTER implementation)
- **docs-generator** = Documentation creator (OPTIONAL, when needed)

See `.claude/AGENTS.md` for detailed agent guide.

---

## 📚 References

**For detailed workflows:**
- `.claude/WORKFLOW.md` - All workflows (features, bugs, refactoring, testing)
- `.claude/AGENTS.md` - Agent invocation guide
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

**Project management:**
- `TECHNICAL_DEBT.md` - Code quality issues requiring remediation
- `FUTURE_ENHANCEMENTS.md` - Planned features and improvements (deferred work)

---

**Development:** `npm run compile` (use after EVERY layer)

**Remember:** Rich domain models with behavior. Business logic in domain, not use cases or panels.
