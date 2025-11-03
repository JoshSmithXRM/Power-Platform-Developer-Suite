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

**Development:** `npm run compile` (use this for testing)

**Remember:** Rich domain models with behavior. Business logic in domain, not use cases or panels.
