# Detailed Patterns Reference

**This file contains the detailed explanations moved from CLAUDE.md**

For quick rules, see: `CLAUDE.md` (the Rules Card)

---

## Table of Contents

1. [SOLID Principles with Examples](#solid-principles-with-examples)
2. [Component Creation Patterns](#component-creation-patterns)
3. [Panel Initialization Pattern](#panel-initialization-pattern)
4. [Custom Layouts (Advanced)](#custom-layouts-advanced)
5. [Layout vs Data Components](#layout-vs-data-components)
6. [Message Naming Conventions](#message-naming-conventions)
7. [Data Flow Pattern](#data-flow-pattern)
8. [Logging by Context](#logging-by-context)
9. [Component Behavior Pattern](#component-behavior-pattern)
10. [Refactoring Principles](#refactoring-principles)

---

## SOLID Principles with Examples

### Interface Segregation Principle (ISP) - Most Violated

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

See: `docs/ARCHITECTURE_GUIDE.md` for more SOLID examples

---

## Component Creation Patterns

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

See: `docs/COMPONENT_PATTERNS.md` for full lifecycle details

---

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

---

## Custom Layouts (Advanced)

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

See: `docs/PANEL_LAYOUT_GUIDE.md` for more patterns

---

## Layout vs Data Components

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

See: MetadataBrowserPanel, PluginRegistrationPanel for examples

---

## Message Naming Conventions

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

See: `docs/MESSAGE_CONVENTIONS.md`

---

## Data Flow Pattern

```typescript
// 1. Service returns business data
const data = await this.service.getData(params);

// 2. Panel transforms for display (add 'id' property for tables)
const uiData = this.transformDataForDisplay(data);

// 3. Component receives UI-ready data
this.dataTable.setData(uiData);
```

---

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

---

## Component Behavior Pattern

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

See: `docs/COMPONENT_PATTERNS.md` for full lifecycle hooks

---

## Refactoring Principles

**Three Strikes Rule**: Fixing same code in 3+ places? STOP and create abstraction.

**Red Flags**:
- Fixing same bug in N≥3 files
- Copy-pasting code
- "do this for all panels" tasks
- Sequential todos for identical changes

**Task Structuring**:
```
❌ BAD: Fix createNew() in MetadataBrowserPanel, Fix createNew() in SolutionExplorerPanel, ...
✅ GOOD: Analyze createNew() duplication → Design abstraction → Implement across all panels
```

**Opportunistic Refactoring**: See duplication? Fix it now while context is fresh, not "later"
