# CLAUDE.md - Rules Card

**Quick reference for AI assistants. For detailed patterns, see `docs/patterns/DETAILED_PATTERNS.md`**

---

## 🚫 NEVER (Non-Negotiable)

1. **`any` without explicit type** - Use proper interfaces or `unknown` with narrowing. ISP over `any` always.
2. **`eslint-disable` without permission** - Fix root cause. Ask if rule seems wrong.
3. **`updateWebview()` for updates** - Use event bridges (`component.setData()`). Only in `BasePanel.initialize()`.
4. **Technical debt shortcuts** - No "quick fixes". Do it right or discuss tradeoffs explicitly.
5. **Duplicate code 3+ times** - Stop at 2nd copy. Create abstraction (Three Strikes Rule).
6. **Extension Host imports in webview** - Webview uses `postMessage()` only. No ComponentFactory/ServiceFactory.
7. **Skip `panel-content` wrapper** - Breaks layout. Always use proper structure.
8. **Implicit `any` from services** - Services MUST return typed models, never raw API responses.
9. **Behaviors without `BaseBehavior`** - All webview behaviors MUST extend `BaseBehavior`.
10. **camelCase in messages** - Use `kebab-case`: `'environment-changed'` not `'environmentChanged'`.

---

## ✅ ALWAYS (Required Patterns)

1. **TypeScript strict mode** - Leverage compiler. Type safety catches bugs at compile time.
2. **Service → Model mapping** - Define models, map in services. Never return untyped API responses.
3. **ComponentFactory for creation** - ALL components through factory. No direct instantiation.
4. **Event bridges for updates** - `this.tree.setNodes(data)` triggers bridge automatically.
5. **Explicit return types on services** - ESLint enforces this. Type all public APIs.
6. **`onChange` for EnvironmentSelector** - Without it, panel won't load data on initial open.
7. **PanelComposer.compose()** - Use for standard layouts. Don't create HTML manually.
8. **Abstract methods for enforcement** - Make missing implementations compilation errors.
9. **Three-layer separation** - Service (business logic) → Panel (UI coordination) → Component (rendering).
10. **Refactor on 2nd duplication** - Don't wait for 3rd. Fix it while context is fresh.

---

## 🎯 Top Violations (Check Your Code)

1. Using `any` instead of Interface Segregation → Use `IRenderable[]` not `BaseComponent<any>[]`
2. Adding eslint-disable comments → Fix root cause, don't bypass
3. Calling updateWebview() for updates → Use event bridges
4. Missing onChange in EnvironmentSelector → Panel won't load data
5. Not extending BaseBehavior → Silent failures
6. Extension Host controlling UI visibility → Webview owns layout
7. Skipping panel-content wrapper → Breaks alignment

---

## 📐 Critical Patterns

### Panel Structure (MANDATORY)
```html
<div class="panel-container">
    <div class="panel-controls"><!-- Top bar --></div>
    <div class="panel-content"><!-- Content area --></div>
</div>
```

### Component Creation
```typescript
// Extension Host - create with ComponentFactory
this.tree = ComponentFactory.createTreeView({...});
this.setupComponentEventBridges([this.tree]);
this.tree.setNodes(newData);  // Event bridge handles update
```

### Webview Behavior
```javascript
class MyBehavior extends BaseBehavior {
    static getComponentType() { return 'MyComponent'; }
    static onComponentUpdate(instance, data) { /* handle data */ }
}
MyBehavior.register();
```

### Service Return Types
```typescript
// ❌ WRONG
async getData(): Promise<any> { return apiResponse.value; }

// ✅ CORRECT
async getData(): Promise<MyModel[]> {
    return apiResponse.value.map(raw => this.mapToModel(raw));
}
```

---

## 🔧 When You Need `any` (Rare)

1. **EventEmitter signatures** - Matching Node.js interface (with comment + eslint-disable)
2. **Dynamic template variables** - True catch-all objects (with comment + eslint-disable)

**Process if you think you need `any`:**
1. STOP - Don't write it yet
2. ANALYZE - What methods/properties do you actually use?
3. SEGREGATE - Create interface with only those methods (ISP)
4. IMPLEMENT - Make base class implement interface
5. VERIFY - Compile with no warnings

**If you wrote `any` without this process, delete it and do it right.**

---

## ⚠️ Execution Contexts (CRITICAL)

| Context | Language | Has Access To | Purpose |
|---------|----------|---------------|---------|
| **Extension Host** | TypeScript | ComponentFactory, ServiceFactory, Node.js | Business logic, generate HTML |
| **Webview** | JavaScript | DOM, postMessage only | Display UI, handle interactions |

❌ NEVER use ComponentFactory/ServiceFactory in webview
✅ ALWAYS generate HTML in Extension Host

See: `docs/EXECUTION_CONTEXTS.md`

---

## 🛠️ Development Commands

```bash
npm run compile          # Development build - USE THIS
npm run watch            # Watch mode for continuous development
```

**Don't run unless instructed:** `npm run package`, `npm run test-release`, `npm run lint`

---

## 📚 Detailed Documentation

- **Patterns:** `docs/patterns/DETAILED_PATTERNS.md` - Full pattern examples
- **Architecture:** `docs/ARCHITECTURE_GUIDE.md` - SOLID principles deep dive
- **Components:** `docs/COMPONENT_PATTERNS.md` - Component lifecycle
- **Panels:** `docs/PANEL_LAYOUT_GUIDE.md` - Panel structure patterns
- **Messages:** `docs/MESSAGE_CONVENTIONS.md` - Message naming standards
- **Contexts:** `docs/EXECUTION_CONTEXTS.md` - Extension Host vs Webview

---

## ✔️ Self-Review Checklist (Before Merging)

When you complete significant changes, verify:

- [ ] No `any` without explicit comment explaining why
- [ ] All behaviors extend BaseBehavior
- [ ] Services return typed models (not `any`)
- [ ] No code duplication (DRY)
- [ ] Changes compile with TypeScript strict mode
- [ ] No eslint-disable added
- [ ] Message names use kebab-case
- [ ] Event bridges used for component updates
- [ ] Panel structure includes panel-content wrapper

**If ANY checkbox unchecked, explain why or fix it.**

---

**Remember: Make the right thing easy, wrong thing hard. TypeScript and ESLint enforce patterns - use them.**
