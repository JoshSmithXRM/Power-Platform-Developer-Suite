# AI Assistant Detailed Reference

**Comprehensive patterns and examples for AI assistants working with this codebase.**

**Quick reference:** `CLAUDE.md` at project root

---

## 📐 Critical Patterns

### Panel Structure (MANDATORY)

All panels MUST use this structure:

```html
<div class="panel-container">
    <div class="panel-controls"><!-- Top bar --></div>
    <div class="panel-content"><!-- Content area --></div>
</div>
```

**Why:**
- `panel-container`: Root layout container
- `panel-controls`: Top bar for selectors/actions
- `panel-content`: Main content area with proper vertical positioning

❌ **NEVER skip `panel-content` wrapper** - causes content misalignment

📖 See: `docs/PANEL_LAYOUT_GUIDE.md`

---

### Component Creation Pattern

```typescript
export class MyPanel extends BasePanel {
    private environmentSelector: EnvironmentSelectorComponent;
    private dataTable: DataTableComponent;

    private initializeComponents(): void {
        // ⚠️ CRITICAL: EnvironmentSelector MUST have onChange callback
        // Without it, panel won't load data on initial open
        this.environmentSelector = ComponentFactory.createEnvironmentSelector({
            id: 'myPanel-envSelector',
            label: 'Environment',
            onChange: (environmentId: string) => {
                this.handleEnvironmentSelection(environmentId);
            }
        });

        this.dataTable = ComponentFactory.createDataTable({
            id: 'myPanel-dataTable',
            columns: [...],
            data: []
        });
    }

    protected getHtmlContent(): string {
        return PanelComposer.compose([
            this.environmentSelector,
            this.dataTable
        ], this.getCommonWebviewResources());
    }

    private async handleEnvironmentSelection(environmentId: string): Promise<void> {
        // Load your panel's data here
        // This fires on BOTH: initial auto-select AND manual user change
        await this.loadData(environmentId);
    }
}
```

**Why onChange is mandatory:**
- BasePanel auto-selects first environment on initial load
- `setSelectedEnvironment()` internally triggers onChange
- Same callback fires when user manually changes environment
- Without onChange: Panel opens empty until manual selection

📖 See: `docs/COMPONENT_PATTERNS.md` - Environment Selection Lifecycle

---

### Panel Message Handling Hooks

BasePanel provides hook methods for handling component events. **DO NOT override `handleComponentEvent()`** - BasePanel routes events automatically.

**Use these hooks instead:**

```typescript
export class MyPanel extends BasePanel {
    // Handle panel-specific messages from webview
    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.command) {
            case 'my-custom-command':
                await this.handleCustomCommand(message.data);
                break;
        }
    }

    // Handle action bar button clicks (optional hook)
    protected async handlePanelAction(componentId: string, actionId: string): Promise<void> {
        if (actionId === 'export') {
            await this.exportData();
        }
    }

    // Handle other component events like rowSelected, nodeExpanded (optional hook)
    protected async handleOtherComponentEvent(componentId: string, eventType: string, data?: unknown): Promise<void> {
        if (componentId === 'my-splitPanel' && eventType === 'rightPanelClosed') {
            this.selectedNode = undefined;
        }
    }
}
```

**Why hook methods are mandatory:**
- BasePanel handles common events (environment-changed, component-event) automatically
- Prevents duplicate routing logic across panels (~20 lines per panel)
- Template Method Pattern enforces proper event flow
- Standard actions (refresh) handled by BasePanel

**Event Flow:**
1. Webview sends message → `handleMessageInternal()`
2. BasePanel checks `handleCommonMessages()` first
3. If not common → delegates to child's `handleMessage()`
4. For component-event messages → routes to hooks automatically

❌ **DON'T override `handleComponentEvent()`** - causes duplicate routing
✅ **DO use hook methods** - `handlePanelAction()`, `handleOtherComponentEvent()`

📖 See: `src/panels/PluginRegistrationPanel.ts` - Reference implementation

---

### Webview Behavior Pattern

All webview behaviors MUST extend BaseBehavior:

```javascript
class MyComponentBehavior extends BaseBehavior {
    // REQUIRED: Component type (must match Extension Host)
    static getComponentType() { return 'MyComponent'; }

    // REQUIRED: Handle data updates (enforced by abstract method)
    static onComponentUpdate(instance, data) {
        if (data?.items) this.updateItems(instance, data.items);
    }

    // OPTIONAL: Custom actions beyond componentUpdate
    static handleCustomAction(instance, message) {
        switch (message.action) {
            case 'selectItem': this.selectItem(instance, message.itemId); break;
        }
    }
}
MyComponentBehavior.register(); // REQUIRED - DO NOT FORGET
```

**Why BaseBehavior is mandatory:**
- Before BaseBehavior: missing `case 'componentUpdate'` caused silent failures
- Template Method Pattern enforces `onComponentUpdate()` at compile time
- Provides consistent lifecycle management

📖 See: `docs/COMPONENT_PATTERNS.md` - BaseBehavior Pattern

---

### Service Return Types

```typescript
// ❌ WRONG - implicit any
async getData(): Promise<any> {
    return apiResponse.value;
}

// ❌ WRONG - untyped raw response
async getData() {
    return apiResponse.value;  // Returns raw API data
}

// ✅ CORRECT - typed model
async getData(): Promise<MyModel[]> {
    const response = await this.api.get(...);
    return response.value.map(raw => this.mapToModel(raw));
}

private mapToModel(raw: any): MyModel {
    return {
        id: raw.solutionid,
        name: raw.friendlyname,
        version: raw.version
    };
}
```

**Why typed models:**
- Type safety throughout the codebase
- Transform API names to developer-friendly names
- Catch API changes at compile time

📖 See: `docs/ARCHITECTURE_GUIDE.md` - Service Layer

---

## 🔧 When You Need `any` (Rare)

### Acceptable Uses (with justification)

**1. EventEmitter signatures** - Matching Node.js interface:
```typescript
// ✅ OK - matching standard library signature
// eslint-disable-next-line @typescript-eslint/no-explicit-any
on(event: string, listener: (...args: any[]) => void): this;
```

**2. Dynamic template variables** - True catch-all objects:
```typescript
// ✅ OK - dynamic values from user configuration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
variables?: Record<string, any>;
```

### Unacceptable Uses

❌ **Component arrays** - Use `IRenderable[]` not `BaseComponent<any>[]`
❌ **Working around generics** - Create proper interfaces
❌ **"I don't know the type"** - Use `unknown` then narrow
❌ **Convenience/laziness** - Never acceptable

### Process When You Think You Need `any`

1. **STOP** - Don't write it yet
2. **ANALYZE** - What methods/properties do you actually use?
3. **SEGREGATE** - Create an interface with only those methods (ISP)
4. **IMPLEMENT** - Make base class implement the interface
5. **VERIFY** - Compile with no warnings

**If you wrote `any` without this process, you cut a corner. Delete it and do it right.**

---

## ⚠️ Execution Contexts (CRITICAL)

Two separate environments - NEVER mix them:

| Context | Language | Has Access To | Purpose |
|---------|----------|---------------|---------|
| **Extension Host** | TypeScript | ComponentFactory, ServiceFactory, Node.js APIs | Generate HTML, manage state, business logic |
| **Webview** | JavaScript | DOM, postMessage only | Display UI, handle interactions |

### Common Mistakes

❌ **NEVER try to use ComponentFactory in webview JavaScript**
```javascript
// ❌ WRONG - webview cannot access Extension Host code
const selector = ComponentFactory.createEnvironmentSelector({...});  // FAILS
```

❌ **NEVER try to control UI visibility from Extension Host**
```typescript
// ❌ WRONG - Extension Host shouldn't control layout
this.postMessage({ action: 'showPanel', panelId: 'details' });
```

✅ **CORRECT - Generate HTML in Extension Host, display in webview**
```typescript
// Extension Host (TypeScript)
protected getHtmlContent(): string {
    const selector = ComponentFactory.createEnvironmentSelector({...});
    return PanelComposer.compose([selector], ...);
}
```

✅ **CORRECT - Webview controls its own layout**
```javascript
// Webview (JavaScript)
static showDetails(data) {
    document.getElementById('details').innerHTML = data.html;
    document.getElementById('split-panel').classList.remove('hidden');
}
```

📖 See: `docs/EXECUTION_CONTEXTS.md`

---

## 💬 Commenting Standards

### When to Comment

**✅ Public/Protected Methods** (JSDoc):
```typescript
/**
 * Updates table data and triggers re-render via event bridge.
 *
 * @param data - Array of table rows with 'id' property required
 * @throws {Error} If data is missing 'id' property on any row
 */
public setData(data: TableRow[]): void {
    this.validateData(data);
    this.data = [...data];
    this.notifyUpdate();
}
```

**✅ Non-Obvious WHY**:
```typescript
// Trigger onChange even for programmatic selection
// Without this, panels open empty until user manually changes environment
if (this.config.onChange) {
    this.config.onChange(environmentId || '');
}
```

**✅ Regex Patterns**:
```typescript
// Match Dataverse entity logical names: lowercase letters, numbers, underscores
// Must start with letter, end with letter or number
// Examples: "account", "new_customentity", "cr123_field"
const entityNamePattern = /^[a-z][a-z0-9_]*[a-z0-9]$/;
```

### Never Comment

❌ **Obvious code**:
```typescript
// ❌ BAD - Comment states what code does
// Validate message before processing
if (!this.isValidMessage(message)) { return; }

// ✅ GOOD - Code is self-documenting
if (!this.isValidMessage(message)) { return; }
```

❌ **Placeholder comments**:
```typescript
// ❌ BAD
// Handle component event
await this.handleComponentEvent(message);

// Process data
const result = processData(input);

// Return result
return result;
```

❌ **Band-aids for bad code**:
```typescript
// ❌ BAD - Comment trying to explain confusing code
// Check if user is admin or has permission and is active and not deleted
if (u.r === 'a' || (u.p && u.s === 1 && !u.d)) { }

// ✅ GOOD - Refactor code to be self-explanatory
const isAdmin = user.role === 'admin';
const hasActivePermission = user.hasPermission && user.isActive && !user.isDeleted;
if (isAdmin || hasActivePermission) { }
```

📖 See: `docs/CODE_COMMENTING_GUIDE.md`

---

## 🛠️ Development Commands

```bash
npm run compile          # Development build - USE THIS FOR TESTING
npm run watch            # Watch mode for continuous development
```

**DO NOT run unless explicitly instructed by the user:**
```bash
npm run package          # Production build - user runs this
npm run test-release     # Package + install - user runs this
npm run lint             # Standalone lint - compile already includes this
```

**Why:** `npm run compile` runs lint + webpack with dev settings, catching all errors and preparing the extension for testing in VS Code.

---

## ✔️ Self-Review Checklist

When you complete significant changes, verify:

### Type Safety
- [ ] No `any` without explicit comment explaining why + eslint-disable
- [ ] All service methods have explicit return types
- [ ] Services return typed models (not `Promise<any>`)
- [ ] No implicit `any` from missing type annotations

### Architecture
- [ ] All behaviors extend BaseBehavior
- [ ] No Extension Host code imported in webview
- [ ] Event bridges used for component updates (not updateWebview())
- [ ] Panel structure includes panel-content wrapper
- [ ] Three-layer separation maintained (Service → Panel → Component)

### Code Quality
- [ ] No code duplication (DRY - refactor on 2nd occurrence)
- [ ] Changes compile with TypeScript strict mode
- [ ] No eslint-disable added (or explicit permission granted)
- [ ] Message names use kebab-case ('environment-changed')
- [ ] Comments explain WHY, not WHAT

### Patterns
- [ ] ComponentFactory used for all component creation
- [ ] EnvironmentSelector has onChange callback
- [ ] PanelComposer.compose() used for standard layouts
- [ ] Abstract methods enforce required implementations

**If ANY checkbox unchecked, explain why or fix it.**

---

## 🚩 Red Flags (Stop and Ask)

If you encounter these, consult detailed docs:

| Red Flag | Likely Issue | Check |
|----------|--------------|-------|
| Component not updating | Missing event bridge | COMPONENT_PATTERNS.md |
| Panel empty on load | Missing onChange callback | COMPONENT_PATTERNS.md #environment-selection-lifecycle |
| TypeScript error with `any` | Type safety violation | ARCHITECTURE_GUIDE.md #type-safety-first |
| ESLint disable comment | Code quality bypass | CLAUDE.md #never-eslint-disable |
| Three+ files with same code | DRY violation | ARCHITECTURE_GUIDE.md #three-strikes-rule |
| Webview can't access factory | Execution context confusion | EXECUTION_CONTEXTS.md |
| UI flash on update | Using updateWebview() instead of event bridge | COMPONENT_PATTERNS.md #event-communication-pattern |

---

## 🔗 See Also

- [CLAUDE.md](../CLAUDE.md) - Quick reference (load every session)
- [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - SOLID principles and design decisions
- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Component lifecycle and patterns
- [PANEL_LAYOUT_GUIDE.md](PANEL_LAYOUT_GUIDE.md) - Panel structure requirements
- [ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md) - Error handling standards
- [EXECUTION_CONTEXTS.md](EXECUTION_CONTEXTS.md) - Extension Host vs Webview deep dive
- [MESSAGE_CONVENTIONS.md](MESSAGE_CONVENTIONS.md) - Message naming and structure
- [CODE_COMMENTING_GUIDE.md](CODE_COMMENTING_GUIDE.md) - Commenting standards
- [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) - Documentation conventions
