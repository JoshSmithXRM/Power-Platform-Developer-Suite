# CLAUDE.md - Quick Reference

**Essential rules for AI assistants working on the Power Platform Developer Suite.**

---

## 🚫 NEVER (Non-Negotiable)

1. **`any` without explicit type** - Use proper interfaces or `unknown` with narrowing
2. **`eslint-disable` without permission** - Fix root cause. Ask if rule seems wrong
3. **`updateWebview()` for updates** - Use event bridges (`component.setData()`)
4. **Technical debt shortcuts** - No "quick fixes". Do it right or discuss tradeoffs
5. **Duplicate code 3+ times** - Stop at 2nd copy. Create abstraction (Three Strikes Rule)
6. **Extension Host imports in webview** - Webview uses `postMessage()` only
7. **Skip `panel-content` wrapper** - Breaks layout. Always use proper structure
8. **Implicit `any` from services** - Services MUST return typed models
9. **Behaviors without `BaseBehavior`** - All webview behaviors MUST extend `BaseBehavior`
10. **camelCase in messages** - Use `kebab-case`: `'environment-changed'` not `'environmentChanged'`

---

## ✅ ALWAYS (Required Patterns)

1. **TypeScript strict mode** - Type safety catches bugs at compile time
2. **Service → Model mapping** - Define models, map in services
3. **ComponentFactory for creation** - ALL components through factory
4. **Event bridges for updates** - `this.tree.setNodes(data)` triggers bridge
5. **Explicit return types on services** - ESLint enforces this
6. **`onChange` for EnvironmentSelector** - Without it, panel won't load data
7. **PanelComposer.compose()** - Use for standard layouts
8. **Abstract methods for enforcement** - Make missing implementations compilation errors
9. **Three-layer separation** - Service → Panel → Component
10. **Refactor on 2nd duplication** - Don't wait for 3rd
11. **Hook methods for panel events** - Use `handlePanelAction()` / `handleOtherComponentEvent()`, not `handleComponentEvent()`

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

---

**Development:** `npm run compile` (use this for testing)

**Remember:** Make the right thing easy, wrong thing hard. TypeScript and ESLint enforce patterns.
