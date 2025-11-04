# CLAUDE.md - Quick Reference

**Essential rules for AI assistants working on the Power Platform Developer Suite.**

---

## 🚫 NEVER (Non-Negotiable)

1. **`any` without explicit type** - Use proper interfaces or `unknown` with narrowing
2. **`eslint-disable` without permission** - Fix root cause. Ask if rule seems wrong
3. **Technical debt shortcuts** - No "quick fixes". Do it right or discuss tradeoffs
4. **Duplicate code 3+ times** - Stop at 2nd copy. Create abstraction (Three Strikes Rule)
5. **Business logic outside domain layer** - Business logic belongs in domain entities/services
6. **Anemic domain models (entities without behavior)** - Use rich models with methods, not just data
7. **Domain depending on outer layers** - Domain has ZERO dependencies
8. **Business logic in use cases** - Use cases orchestrate only, no complex logic
9. **Business logic in panels** - Panels call use cases, no logic
10. **HTML in panel .ts files** - Extract all HTML to separate view files in `presentation/views/`
11. **Non-null assertions (`!`)** - Use explicit null checks for type narrowing
12. **Dynamic import types in signatures** - Use direct imports: `import type { Foo } from '...'`
13. **Static utility methods on entities** - Put in domain services or collection classes
14. **Presentation logic in domain** - Display formatting belongs in mappers, not entities
15. **Time/effort estimates in designs** - AI time estimates are consistently wrong; use complexity levels instead

---

## ✅ ALWAYS (Required Patterns)

1. **TypeScript strict mode** - Type safety catches bugs at compile time
2. **Clean Architecture layers** - Domain → Application → Infrastructure/Presentation
3. **Rich domain models** - Entities with behavior (methods), not just data
4. **Use cases orchestrate** - Coordinate domain entities, no business logic
5. **ViewModels for presentation** - DTOs mapped from domain entities
6. **Repository interfaces in domain** - Domain defines contracts, infrastructure implements
7. **Dependency direction inward** - All dependencies point toward domain
8. **Explicit return types** - All public methods have return types
9. **Abstract methods for enforcement** - Make missing implementations compilation errors
10. **Refactor on 2nd duplication** - Don't wait for 3rd
11. **HTML in separate view files** - All panel HTML goes in `presentation/views/` as render functions
12. **Type narrowing with explicit checks** - `if (x === null) return;` not `x!`
13. **Domain services for complex logic** - Use case complex logic → domain service
14. **Mappers transform only** - No sorting params; sort before/after mapping
15. **Write tests for domain and application layers** - Business logic must be tested
16. **Run tests before review** - `npm run compile` includes tests
17. **Test-driven bug fixes** - Write failing test, fix bug, verify test passes
18. **Design docs for complex features** - Use template from `.claude/templates/` for features with 4+ slices
19. **Complexity over time estimates** - Use Simple/Moderate/Complex + slice count, not hours/days
20. **Vertical slicing in designs** - Identify MVP slice and enhancement slices explicitly

21. **VS Code panel singleton** - `private static currentPanel` + `createOrShow()` factory (framework standard)
22. **Panel pattern selection** - Use DataTablePanelCoordinator (Pattern 1) for data tables with environment dropdown; Direct Implementation (Pattern 2) for custom UI (> 70%) or developer tools (see `.claude/templates/PANEL_PATTERN_GUIDE.md`)

---

## 💬 Commenting Rules

**Comment when:**
- ✅ Public/protected methods (JSDoc)
- ✅ WHY, not WHAT (non-obvious decisions)
- ✅ Complex algorithms / Regex

**Never comment:**
- ❌ Obvious code
- ❌ Placeholders ("Handle event" / "Process data")
- ❌ Band-aids for bad code
- ❌ "WHY:" prefix - Explain WHY naturally, don't label it

---

## 📝 Logging Rules

**Never log:**
- ❌ In domain entities/services - Domain is pure business logic, zero infrastructure
- ❌ console.log in production code - Remove before commit (dev debugging only)
- ❌ Secrets/tokens unredacted - Truncate tokens, sanitize sensitive data
- ❌ Global Logger.getInstance() - Inject ILogger via constructor for testability

**Always log:**
- ✅ At use case boundaries - Start/completion/failures in application layer
- ✅ Via injected ILogger - Constructor injection, not global singleton
- ✅ To OutputChannel in production - VS Code's logging mechanism
- ✅ Infrastructure operations - API calls, auth, storage (debug level)
- ✅ User actions in panels - Command invocations, lifecycle events
- ✅ Use NullLogger in tests - Silent by default, SpyLogger for assertions

---

## 📋 Design Documentation Rules

**When to create design docs:**
- ✅ Complex features (4+ vertical slices, affects multiple domains)
- ✅ New architectural patterns
- ✅ Features requiring multi-agent design review

**When to skip design docs:**
- ❌ Simple features (1-2 slices, <1 hour implementation)
- ❌ Bug fixes
- ❌ Small refactorings

**Design doc requirements:**
- ✅ Use template: `.claude/templates/TECHNICAL_DESIGN_TEMPLATE.md`
- ✅ Complexity: Simple | Moderate | Complex (NO time estimates)
- ✅ Implementation slices: Identify MVP slice + enhancements
- ✅ Business value: 3-4 sentences (Problem → Solution → Value)
- ✅ Type contracts: Define BEFORE implementation
- ❌ Version numbers in filename (use git branches for iterations)
- ❌ Keep old versions after approval (delete drafts, keep final only)

**Review and approval:**
- ✅ Architect reviews create separate file in `docs/design/reviews/` during iteration
- ✅ After final approval, add **summary** to design doc under "Key Decisions"
- ✅ Delete review files after approval (archived in git history)

---

## 🔄 Workflow Rules

**When building features:**
- ✅ Design type contracts BEFORE implementation - Prevents type error cascade (15x rework multiplier)
- ✅ Compile after EACH layer - `npm run compile` after domain, application, infrastructure, presentation
- ✅ Review per layer (not all at once) - Catch violations early (5-10 min fixes vs 2+ hour refactors)
- ✅ Commit per layer - Granular rollback capability
- ✅ Write clean from start - No cleanup phase needed if following LOGGING_GUIDE.md
- ✅ Write tests AFTER implementation, BEFORE review - Domain entities (100% target), use cases (90% target)
- ✅ Run `npm test` before `npm run compile` - Tests must pass before review
- ✅ Include test file paths in commit messages - Document test coverage

**When fixing bugs:**
- ✅ Write failing test first - Reproduces bug
- ✅ Fix bug - Test passes
- ✅ Commit includes test - Prevents regression

**When refactoring:**
- ✅ Tests must pass BEFORE refactoring - Baseline behavior established
- ✅ Tests must pass AFTER refactoring - Behavior unchanged

**Agent roles (see .claude/AGENT_ROLES.md):**
- YOU = Implementer (human or builder)
- clean-architecture-guardian = Designer + Reviewer + Final Approval Gate (NOT implementer)
- typescript-pro = Type Safety Reviewer (NOT implementer)
- code-cleanup-implementer = Logging/Comment Fixer + Documenter (IS implementer)

**Never:**
- ❌ Implement all layers then compile - Type errors compound 15x
- ❌ Skip type contract review - Leads to downstream type refactoring
- ❌ Mix feature work with refactoring - Separate concerns, separate commits
- ❌ Ask reviewers to implement - They review, YOU implement

---

**Development:** `npm run compile` (use this after EVERY layer)

**Remember:** Rich domain models with behavior. Business logic in domain, not use cases or panels.

---

## 📚 Workflow References

**For specific workflows, see:**
- `.claude/WORKFLOW_GUIDE.md` - Master workflow guide with invocation examples
- `.claude/workflows/DESIGN_WORKFLOW.md` - Technical design documentation process
- `.claude/workflows/NEW_FEATURE_WORKFLOW.md` - Complete feature implementation
- `.claude/workflows/VERTICAL_SLICING_GUIDE.md` - How to slice features for fast feedback
- `.claude/workflows/BUG_FIX_WORKFLOW.md` - Quick bug fix process
- `.claude/workflows/REFACTORING_WORKFLOW.md` - Safe refactoring process
- `.claude/AGENT_ROLES.md` - Agent responsibilities (who implements vs who reviews)
- `.claude/templates/PANEL_PATTERN_GUIDE.md` - Panel implementation pattern selection (Pattern 1 vs Pattern 2)
