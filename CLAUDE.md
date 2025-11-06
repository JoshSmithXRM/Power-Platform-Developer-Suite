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

## 🔄 Workflow Philosophy

**Design outside-in** (user perspective: panel → ViewModels → use cases → domain)
**Implement inside-out** (technical: domain → application → infrastructure → presentation)
**Review once per feature** (after all 4 layers complete, not per layer)

### Building Features

1. **Design phase** (complex features only)
   - Invoke `design-architect` for 4+ slice features
   - Define type contracts BEFORE implementation
   - Skip for simple features (1-2 slices)

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

**Architecture guides:**
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Detailed patterns
- `docs/architecture/CODE_QUALITY_GUIDE.md` - Comment & code quality standards
- `docs/architecture/LOGGING_GUIDE.md` - Logging by layer
- `docs/testing/TESTING_GUIDE.md` - Testing patterns

---

**Development:** `npm run compile` (use after EVERY layer)

**Remember:** Rich domain models with behavior. Business logic in domain, not use cases or panels.
