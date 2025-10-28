# CLAUDE.md

Quick reference for AI assistants working with this VS Code extension codebase.
**For detailed examples and explanations, see the `docs/` folder.**

## 🏗️ ARCHITECTURAL PRINCIPLES (NON-NEGOTIABLE)

**These principles MUST be followed. No exceptions. No shortcuts.**

### 1. Type Safety First
- ❌ **NEVER use `any`** - Use proper types or `unknown` with narrowing
- ❌ **NEVER use `unknown` for component data** - Use generics for type-safe data contracts
- ❌ **NEVER use optional chaining to hide missing methods** - Implement required interfaces
- ✅ **ALWAYS leverage TypeScript's type system** - If it compiles with strict mode, it's safer
- ✅ **ALWAYS use generics for reusable components** - `BaseComponent<TData>` not `BaseComponent`

**Why**: Type safety catches bugs at compile time, not runtime. Each `any` or `unknown` creates a blind spot where bugs hide.

### 2. No Technical Debt Without Explicit Discussion
- ❌ **NEVER add `eslint-disable` comments** without explicit user permission (see Code Quality Rules below)
- ❌ **NEVER use workarounds** when proper solution is available
- ❌ **NEVER say "this works for now"** - either do it right or discuss tradeoffs explicitly
- ✅ **ALWAYS discuss architectural tradeoffs** with pros/cons/risks before implementing
- ✅ **ALWAYS choose the architecturally sound solution** even if it takes longer initially

**Why**: Technical debt compounds. Each shortcut makes the next one easier to justify. This leads to unmaintainable codebases.

### 3. Consistency Over Convenience
- ❌ **NEVER create one-off patterns** - follow existing patterns or refactor them
- ❌ **NEVER duplicate code** - abstract common patterns (DRY principle)
- ✅ **ALWAYS enforce patterns through TypeScript** - use abstract classes/interfaces
- ✅ **ALWAYS refactor when you see duplication** - don't add to technical debt

**Why**: Inconsistent patterns increase cognitive load and make maintenance expensive.

### 4. Fail Fast, Fail Loud
- ❌ **NEVER fail silently** - `getData?.() || null` hides missing implementations
- ❌ **NEVER use default values to paper over problems** - fix the root cause
- ✅ **ALWAYS make missing implementations compilation errors** - use `abstract` or required interfaces
- ✅ **ALWAYS validate at boundaries** - check inputs at API/component boundaries

**Why**: Silent failures are the hardest bugs to debug. Loud failures are easy to fix.

### 5. Code for the Team, Not Just Yourself
- ❌ **NEVER write "clever" code** - write obvious code
- ❌ **NEVER skip documentation** for non-obvious patterns
- ✅ **ALWAYS prioritize readability** - code is read 10x more than written
- ✅ **ALWAYS consider onboarding** - new developers should understand the pattern

**Why**: Code is a team asset. Optimize for team productivity, not individual convenience.

## 🚨 TOP VIOLATIONS (READ THIS FIRST)

**Most common mistakes to avoid:**

1. **Using `any` instead of Interface Segregation** → Use `IRenderable[]` not `BaseComponent<any>[]`
2. **Adding eslint-disable comments** → Fix root cause, don't bypass linting
3. **Calling updateWebview() for updates** → Use event bridges (this.component.setData())
4. **Missing onChange in EnvironmentSelector** → Panel won't load data on initial open
5. **Not extending BaseBehavior** → Causes silent failures in webview behaviors
6. **Extension Host controlling UI visibility** → Webview owns layout, Extension Host sends data only
7. **Skipping panel-content wrapper** → Breaks layout alignment

## 🎯 SOLID DESIGN PRINCIPLES (MANDATORY)

**All code MUST follow SOLID principles. Use Interface Segregation Principle instead of `any`.**

- **SRP**: One class, one responsibility (EnvironmentSelectorComponent = selection only, DataTableComponent = display only)
- **OCP**: Extend without modifying (Use `BaseComponent<TData>` generics, don't modify base classes)
- **LSP**: Derived classes fully substitutable (All BaseComponent impls must have `getData()`)
- **ISP** ⭐ **CRITICAL**: Create focused interfaces, NEVER use `any` as shortcut
- **DIP**: Depend on abstractions (IRenderable), not concrete classes

### Interface Segregation Principle (ISP) ⭐ **MOST VIOLATED**

**Problem**: Using `any` instead of interface segregation
```typescript
// ❌ WRONG - defeats type safety
compose(components: BaseComponent<any>[]) { }

// ✅ CORRECT - segregate interface
interface IRenderable {
    generateHTML(): string;
    getCSSFile(): string;
    getBehaviorScript(): string;
}
compose(components: IRenderable[]) { }
```

**This codebase pattern**:
```typescript
// PanelComposer depends on IRenderable, not BaseComponent<any>
export interface IRenderable { getId(); getType(); generateHTML(); getCSSFile(); getBehaviorScript(); }
export abstract class BaseComponent<TData> implements IRenderable {
    abstract getData(): TData;  // Type-safe, component-specific
}
class PanelComposer { static compose(components: IRenderable[]) { } }
```

📖 **Full SOLID examples**: `docs/ARCHITECTURE_GUIDE.md`

## 🚫 Code Quality Rules

### When `any` IS Acceptable (RARE):
1. **EventEmitter signatures**: Matching Node.js EventEmitter interface
   ```typescript
   // ✅ OK - matching standard library signature
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   on(event: string, listener: (...args: any[]) => void): this;
   ```
   **MUST include**: Comment explaining why + eslint-disable
2. **Dynamic template variables**: True catch-all objects
   ```typescript
   // ✅ OK - dynamic values from user configuration
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   variables?: Record<string, any>;
   ```

### When `any` is NOT Acceptable:
- ❌ **Component arrays**: Use `IRenderable[]` not `BaseComponent<any>[]`
- ❌ **Working around generics**: Create proper interfaces instead
- ❌ **"I don't know the type"**: Use `unknown` then narrow, or create interface
- ❌ **Convenience/laziness**: Never acceptable

### Process When You Think You Need `any`:
1. **STOP** - Don't write it yet
2. **ANALYZE** - What methods/properties do you actually use?
3. **SEGREGATE** - Create an interface with only those methods (ISP)
4. **IMPLEMENT** - Make base class implement the interface
5. **VERIFY** - Compile with no warnings

**If you wrote `any` without this process, you cut a corner. Delete it and do it right.**

## CRITICAL: Execution Contexts

**Two separate environments** - NEVER mix them:

| Context | Language | Has Access To | Purpose |
|---------|----------|---------------|---------|
| **Extension Host** | TypeScript | ComponentFactory, ServiceFactory, Node.js APIs | Generate HTML, manage state, business logic |
| **Webview** | JavaScript | DOM, postMessage only | Display UI, handle interactions |

❌ **NEVER** try to use `ComponentFactory` or `ServiceFactory` in webview JavaScript
✅ **ALWAYS** generate HTML in Extension Host using ComponentFactory

📖 **See**: `docs/EXECUTION_CONTEXTS.md` for complete guide

## Panel Structure (MANDATORY)

ALL panels MUST use this structure:

```html
<div class="panel-container">
    <div class="panel-controls"><!-- Top bar --></div>
    <div class="panel-content"><!-- Content area --></div>
</div>
```

❌ **NEVER** skip `panel-content` wrapper (causes misalignment)
❌ **NEVER** add custom body/container styles (breaks layout)
✅ **ALWAYS** use `PanelComposer.compose()` for standard layouts

📖 **See**: `docs/PANEL_LAYOUT_GUIDE.md` for complete guide

## Component Creation Pattern

```typescript
export class MyPanel extends BasePanel {
    private environmentSelector: EnvironmentSelectorComponent;
    private dataTable: DataTableComponent;

    private initializeComponents(): void {
        // ⚠️ CRITICAL: EnvironmentSelector MUST have onChange callback
        // Without it, panel won't load data on initial open (auto-selection won't trigger data load)
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

    private handleEnvironmentSelection(environmentId: string): void {
        // Load your panel's data here
        // This fires on BOTH: initial auto-select AND manual user change
        this.loadData(environmentId);
    }
}
```

**Why onChange is mandatory for EnvironmentSelector:**
- BasePanel auto-selects first environment on initial panel load
- `setSelectedEnvironment()` internally triggers the onChange callback
- Same callback fires when user manually changes environment dropdown
- **Without onChange**: Auto-selection happens but your panel never loads data → empty panel on open

📖 **See**: `docs/COMPONENT_PATTERNS.md` - Environment Selection Lifecycle for full details

## Custom Layouts (Advanced Only)

Use `composeWithCustomHTML()` ONLY for complex multi-panel layouts:

```typescript
protected getHtmlContent(): string {
    const customHTML = `
        <div class="panel-container">
            <div class="panel-controls">
                ${this.actionBar.generateHTML()}
                ${this.environmentSelector.generateHTML()}
            </div>
            <div class="panel-content">
                <!-- ⚠️ CRITICAL: Keep panel-content wrapper -->
                <div class="my-custom-layout">...</div>
            </div>
        </div>
    `;

    return PanelComposer.composeWithCustomHTML(
        customHTML,
        [this.actionBar, this.environmentSelector, ...],
        ['css/panels/my-panel.css'],
        [],
        this.getCommonWebviewResources(),
        'Panel Title'
    );
}
```

📖 **See**: `docs/PANEL_LAYOUT_GUIDE.md` for custom layout patterns

## Layout Components vs Data Components

**CRITICAL DISTINCTION**: Two types of components with different patterns:

### Data Components (Have TypeScript API)
**Examples:** TreeView, ActionBar, DataTable, EnvironmentSelector

```typescript
// Extension Host - create instance, register for updates, send data
this.tree = factory.createTreeView({...});
this.setupComponentEventBridges([this.tree]);
this.tree.setNodes(newData);  // Clean API
```

### Layout Components (HTML Only)
**Examples:** SplitPanel

```typescript
// Extension Host - just HTML, NO instance, NO event bridge
protected getHtmlContent(): string {
    return `<div data-component-type="SplitPanel" data-component-id="split">
        <div data-panel="left">${content}</div>
        <div data-panel="right">${details}</div>
    </div>`;
}
```

### Who Controls What?

**Extension Host:** ✅ Business data/logic | ❌ UI visibility/state
**Webview:** ✅ UI layout/interactions | ❌ Business data/logic

**❌ WRONG** - Extension Host controls layout:
```typescript
handleNodeSelected(node) {
    this.postMessage({ action: 'update-content', data: {...} });
    this.postMessage({ action: 'showPanel', componentId: 'split' }); // WRONG
}
```

**✅ CORRECT** - Webview owns layout:
```typescript
// Extension Host - DATA only
handleNodeSelected(node) {
    this.postMessage({ command: 'show-node-details', data: {...} });
}

// Webview - handles BOTH data AND layout
static showNodeDetails(data) {
    document.getElementById('content').innerHTML = data.html;
    document.getElementById('splitPanel').classList.remove('split-panel-right-hidden');
}
```

**Why**: Separation of concerns (data vs UI), no round trips, simpler messages, correct layering

📖 **See**: MetadataBrowserPanel, PluginRegistrationPanel for reference

## Panel Initialization Pattern

**MANDATORY**: ALL panels MUST follow this initialization pattern:

```typescript
constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    super(panel, extensionUri, ...);

    // 1. Initialize component factory
    this.componentFactory = new ComponentFactory();

    // 2. Create component instances
    this.initializeComponents();

    // 3. Set up event bridges
    this.setupComponentEventBridges([...components]);

    // 4. Initialize panel (renders initial HTML)
    this.initialize(); // ← This calls updateWebview() internally
}
```

❌ **NEVER call** `updateWebview()` **directly in constructor**
✅ **ALWAYS call** `initialize()` which handles state restoration + initial render

## Component Updates

✅ **Use event bridges** - efficient, no UI flash:
```typescript
this.dataTable.setData(newData);  // Triggers event bridge automatically
```

❌ **DON'T use** `updateWebview()` - causes full HTML regeneration
⚠️ **EXCEPTION**: `updateWebview()` is only called by `BasePanel.initialize()` for initial render

## Message Naming Convention

**CRITICAL**: All message commands MUST use **kebab-case** (hyphens), NOT camelCase:

```typescript
// ✅ CORRECT
case 'environment-changed':
case 'environment-selected':
case 'component-event':
case 'filter-panel-collapsed':

// ❌ WRONG
case 'environmentChanged':
case 'componentEvent':
```

**Environment Changes**: ALWAYS handle BOTH cases:
```typescript
case 'environment-selected':
case 'environment-changed':
    const envId = message.data?.environmentId || message.environmentId;
    await this.handleEnvironmentChanged(envId);
    break;
```

## Data Flow

```typescript
// 1. Service returns business data
const data = await this.service.getData(params);

// 2. Panel transforms for display (add 'id' property for tables)
const uiData = this.transformDataForDisplay(data);

// 3. Component receives UI-ready data
this.dataTable.setData(uiData);
```

## Logging by Context

**Extension Host** (TypeScript):
```typescript
// Panels & Components: Use this.componentLogger
this.componentLogger.info('Loading data', { environmentId });

// Services: Use private logger getter
private get logger() {
    if (!this._logger) {
        this._logger = ServiceFactory.getLoggerService().createComponentLogger('MyService');
    }
    return this._logger;
}
```

**Webview** (JavaScript):
```javascript
// Use console.log (LoggerService not available)
console.log('Handling message:', message);
```

## Security Rules

- **NEVER** log, expose, or exfiltrate tokens/credentials
- **ALL** API calls go through AuthenticationService
- **USE** VS Code SecretStorage for sensitive data
- **VALIDATE** all user inputs before API calls

## Code Quality Rules (NON-NEGOTIABLE)

**NEVER add `eslint-disable` comments without explicit permission. NO EXCEPTIONS.**

When you encounter a linting error: **STOP** → **ANALYZE** why rule exists → **FIX ROOT CAUSE** → **ASK** if you believe rule is wrong

```typescript
// ❌ FORBIDDEN - bypassing code quality
// eslint-disable-next-line no-restricted-syntax
this.updateWebview();

// ✅ CORRECT - fix the actual problem
this.initialize();
```

**Why**: Lint rules enforce architecture. Disable comments hide code smells and create technical debt.

**If rule is genuinely wrong**: Explain why, propose updating `.eslintrc.json`, get approval BEFORE disabling

## Development Commands

**IMPORTANT**: Always use `npm run compile` to prepare builds for testing.

```bash
npm run compile          # Development build - USE THIS FOR TESTING
npm run watch            # Watch mode for continuous development
```

**DO NOT run these commands unless explicitly instructed by the user:**
```bash
npm run package          # Production build - user runs this
npm run test-release     # Package + install - user runs this
npm run lint             # Standalone lint - compile already includes this
```

**Why**: `npm run compile` runs lint + webpack with dev settings, catching all errors and preparing the extension for testing in VS Code. The packaging commands require additional tools (vsce) and are for release preparation, not development testing.

## Refactoring Principles

**Three Strikes Rule**: Fixing same code in 3+ places? STOP and create abstraction.

**Red Flags**: Fixing same bug in N≥3 files, copy-pasting code, "do this for all panels" tasks, sequential todos for identical changes

**Task Structuring**:
```
❌ BAD: Fix createNew() in MetadataBrowserPanel, Fix createNew() in SolutionExplorerPanel, ...
✅ GOOD: Analyze createNew() duplication → Design abstraction → Implement across all panels
```

**Opportunistic Refactoring**: See duplication? Fix it now while context is fresh, not "later"

## Quick Reference - DO's

- ✅ Use ComponentFactory for ALL component creation
- ✅ Compose panels from reusable component instances
- ✅ Use event bridges for component updates
- ✅ Transform data in Panel layer (not Service/Component)
- ✅ Follow Extension Host vs Webview separation
- ✅ Maintain standard panel structure: `panel-container` → `panel-controls` → `panel-content`
- ✅ Use `PanelComposer.compose()` for standard layouts
- ✅ Use semantic CSS tokens (not hardcoded colors)

## Quick Reference - DON'Ts

- ❌ **Add eslint-disable comments without explicit permission - NO EXCEPTIONS**
- ❌ Try to use ComponentFactory in webview JavaScript
- ❌ Use `updateWebview()` for component data updates
- ❌ Mix Extension Host and Webview contexts
- ❌ Transform data in Service or Component layers
- ❌ Skip `panel-content` wrapper in custom layouts
- ❌ Add custom body/container styles that override base layout
- ❌ Use custom header classes instead of `panel-controls`
- ❌ Hardcode colors (breaks theme compatibility)
- ❌ Fix the same bug in 3+ files without questioning the pattern
- ❌ Create todos that encourage mechanical repetition across files
- ❌ Duplicate code blocks - stop at 2nd instance and consider abstraction

## Component Behavior Pattern (MANDATORY)

**All webview behaviors MUST extend `BaseBehavior`. No exceptions.**

**Why**: Before BaseBehavior, missing `case 'componentUpdate'` caused silent failures (data sent, never displayed). BaseBehavior enforces implementation via abstract method.

### Required Pattern:

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

    // OPTIONAL: Override createInstance, findDOMElements, setupEventListeners, cleanupInstance
}
MyComponentBehavior.register(); // REQUIRED - DO NOT FORGET
```

### What You MUST Do:

1. ✅ Extend BaseBehavior
2. ✅ Implement `getComponentType()`
3. ✅ Implement `onComponentUpdate()` (enforced at compile time)
4. ✅ Call `.register()` at end of file

### What Happens If You Forget:

❌ No BaseBehavior → Silent failures
❌ No `getComponentType()` → Runtime error
❌ No `onComponentUpdate()` → Compilation error (good!)
❌ No `.register()` → Component doesn't work

📖 **Full pattern with all optional hooks**: `docs/COMPONENT_PATTERNS.md`

## Documentation Reference

- `docs/README.md` - Complete documentation index and navigation
- `docs/EXECUTION_CONTEXTS.md` - Extension Host vs Webview deep dive
- `docs/PANEL_LAYOUT_GUIDE.md` - Complete panel structure patterns
- `docs/MESSAGE_CONVENTIONS.md` - Message naming and structure standards
- `docs/ERROR_HANDLING_PATTERNS.md` - Error handling and notification patterns
- `docs/ARCHITECTURE_GUIDE.md` - High-level architecture and SOLID principles
- `docs/COMPONENT_PATTERNS.md` - Component design patterns and lifecycle
- `docs/STYLING_PATTERNS.md` - CSS semantic tokens and styling patterns
- `docs/DEVELOPMENT_GUIDE.md` - Practical development workflow and debugging
