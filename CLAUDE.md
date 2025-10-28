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

## 🎯 SOLID DESIGN PRINCIPLES (MANDATORY)

**All code MUST follow SOLID principles. Use Interface Segregation Principle instead of `any`.**

### Single Responsibility Principle (SRP)
- ✅ **DO**: Each class has ONE reason to change
  - `EnvironmentSelectorComponent` - manages environment selection only
  - `DataTableComponent` - manages table display only
  - `PanelComposer` - composes HTML only (doesn't fetch data)
- ❌ **DON'T**: Mix concerns in one class
  - Don't put business logic in components
  - Don't put rendering logic in services

### Open/Closed Principle (OCP)
- ✅ **DO**: Extend behavior without modifying existing code
  - Use `BaseComponent<TData>` generic to add new component types
  - Use `PanelComposer.composeWithCustomHTML()` for custom layouts
- ❌ **DON'T**: Modify base classes for specific use cases
  - Don't add component-specific logic to `BaseComponent`

### Liskov Substitution Principle (LSP)
- ✅ **DO**: Derived classes must be substitutable for base classes
  - All `BaseComponent<TData>` implementations must have `getData()`
  - All components work with `PanelComposer.compose()`
- ❌ **DON'T**: Override base behavior in incompatible ways
  - Don't make `getData()` throw exceptions in some implementations

### Interface Segregation Principle (ISP) ⭐ **CRITICAL**
- ✅ **DO**: Create focused interfaces for specific needs
  - **Example**: `IRenderable` interface for rendering concerns
  - **Why**: PanelComposer only needs `generateHTML()`, `getCSSFile()`, `getBehaviorScript()`
  - **Pattern**: `PanelComposer.compose(components: IRenderable[])`

- ❌ **DON'T**: Use `any` when you should use interface segregation
  ```typescript
  // ❌ WRONG - This is a shortcut that defeats type safety
  compose(components: BaseComponent<any>[]) { }

  // ✅ CORRECT - Segregate interface for rendering concerns
  interface IRenderable {
      generateHTML(): string;
      getCSSFile(): string;
      getBehaviorScript(): string;
  }
  compose(components: IRenderable[]) { }
  ```

**Real Example from This Codebase**:
```typescript
// PanelComposer doesn't care about TData, only rendering methods
export interface IRenderable {
    getId(): string;
    getType(): string;
    generateHTML(): string;
    getCSSFile(): string;
    getBehaviorScript(): string;
}

// BaseComponent implements IRenderable + adds type-safe getData()
export abstract class BaseComponent<TData> implements IRenderable {
    abstract getData(): TData;  // Type-safe, specific to component
    // ... IRenderable methods
}

// PanelComposer depends on IRenderable, not BaseComponent<any>
class PanelComposer {
    static compose(components: IRenderable[], ...) { }
}
```

### Dependency Inversion Principle (DIP)
- ✅ **DO**: Depend on abstractions, not concrete implementations
  - `BasePanel` depends on `IRenderable`, not specific component classes
  - Services use interfaces, not concrete implementations
- ❌ **DON'T**: Hard-code dependencies on concrete classes
  - Don't check `instanceof SpecificComponent` in base classes

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

### ESLint Disable Comments

**NEVER add `eslint-disable` comments without explicit permission. NO EXCEPTIONS.**

When you encounter a linting error:

1. **STOP** - Do not add disable comments
2. **ANALYZE** - Understand why the rule exists
3. **FIX THE ROOT CAUSE** - Refactor code to comply with the rule
4. **ASK** - If you believe the rule is wrong, discuss with the user first

**Examples:**

❌ **FORBIDDEN** (bypassing code quality):
```typescript
// eslint-disable-next-line no-restricted-syntax
this.updateWebview();
```

✅ **CORRECT** (fix the actual problem):
```typescript
// Use the proper pattern that follows architecture
this.initialize();
```

**Why This Matters:**
- Lint rules enforce architectural patterns
- Disable comments hide code smells
- Bypassing rules degrades codebase quality over time
- Each disable comment is technical debt

**If A Rule Is Genuinely Wrong:**
- Explain why the rule is incorrect
- Propose updating `.eslintrc.json`
- Get explicit approval BEFORE disabling
- Document the reasoning in the eslint config

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

**Three Strikes Rule**: If you're fixing/changing the same code in 3+ places, STOP and create an abstraction.

**Before duplicating code:**
1. Stop after the 2nd duplication
2. Ask: "Will this pattern repeat in more places?"
3. If yes: Create abstraction first, then apply everywhere
4. If no: Duplication is acceptable for 2 instances

**Opportunistic Refactoring**: When you touch code and see clear duplication, fix it immediately while context is fresh. Don't schedule for "later" (it never happens).

**Red Flags for Missing Abstractions:**
- Fixing same bug in N files (N ≥ 3)
- Copy-pasting code blocks between files
- "Do this for all panels" type tasks
- Creating multiple sequential todos for identical changes

**Task Structuring for Architectural Thinking:**
```
❌ BAD (encourages mechanical repetition):
- Fix createNew() in MetadataBrowserPanel
- Fix createNew() in SolutionExplorerPanel
- Fix createNew() in PluginTraceViewerPanel
...

✅ GOOD (encourages analysis):
- Analyze createNew() duplication pattern across all panels
- Design abstraction to eliminate duplication
- Implement fix across all panels
```

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

## Component Behavior Pattern (MANDATORY - ENFORCED BY BASEBEHAVIOR)

**All webview behaviors MUST extend `BaseBehavior` base class. No exceptions.**

### Why BaseBehavior Exists

**Problem**: Before BaseBehavior, developers had to manually implement `componentUpdate` handlers. This was error-prone:
- Missing `case 'componentUpdate'` caused silent failures (data sent, never displayed)
- Hardcoded switch statements in ComponentUtils required manual updates for every new component
- No enforcement - easy to forget required methods

**Solution**: BaseBehavior enforces the pattern through:
1. **Abstract method `onComponentUpdate(instance, data)`** - MUST be implemented or class won't compile
2. **Registry pattern** - Behaviors auto-register via `.register()`, no hardcoded switches
3. **Consistent initialization** - Common lifecycle managed by base class

### Required Pattern for ALL New Behaviors:

```javascript
/**
 * MyComponentBehavior - Webview behavior for MyComponent
 * Extends BaseBehavior for enforced componentUpdate pattern
 */
class MyComponentBehavior extends BaseBehavior {
    /**
     * Get component type identifier (REQUIRED)
     */
    static getComponentType() {
        return 'MyComponent';  // Must match component type in Extension Host
    }

    /**
     * Handle component data updates from Extension Host (REQUIRED)
     * This is called automatically when event bridge sends updated data
     * CANNOT be forgotten - BaseBehavior enforces implementation
     */
    static onComponentUpdate(instance, data) {
        // Handle the data update here
        // Example: Update DOM, refresh display, etc.
        if (data && data.items) {
            this.updateItems(instance, data.items);
        }
    }

    /**
     * Create instance structure (OPTIONAL override)
     */
    static createInstance(componentId, config, element) {
        return {
            id: componentId,
            config: { ...config },
            element: element,

            // Component-specific DOM elements
            itemsList: null,

            // Component-specific state
            items: [],

            // Event handlers
            boundHandlers: {}
        };
    }

    /**
     * Find DOM elements (OPTIONAL override)
     */
    static findDOMElements(instance) {
        instance.itemsList = instance.element.querySelector('.items-list');
    }

    /**
     * Setup event listeners (OPTIONAL override)
     */
    static setupEventListeners(instance) {
        instance.boundHandlers.itemClick = (e) => this.handleItemClick(instance, e);
        instance.itemsList.addEventListener('click', instance.boundHandlers.itemClick);
    }

    /**
     * Handle custom actions beyond componentUpdate (OPTIONAL override)
     */
    static handleCustomAction(instance, message) {
        switch (message.action) {
            case 'selectItem':
                this.selectItem(instance, message.itemId);
                break;
            case 'clearSelection':
                this.clearSelection(instance);
                break;
            default:
                console.warn(`MyComponentBehavior: Unhandled action '${message.action}'`);
        }
    }

    /**
     * Cleanup resources (OPTIONAL override)
     */
    static cleanupInstance(instance) {
        if (instance.itemsList && instance.boundHandlers.itemClick) {
            instance.itemsList.removeEventListener('click', instance.boundHandlers.itemClick);
        }
    }

    // Component-specific helper methods
    static updateItems(instance, items) {
        // Implementation...
    }

    static handleItemClick(instance, event) {
        // Implementation...
    }
}

// Auto-register with ComponentUtils (REQUIRED - DO NOT FORGET)
MyComponentBehavior.register();
```

### What BaseBehavior Provides Automatically:

✅ **Enforced `onComponentUpdate()` implementation** - Abstract method must be implemented
✅ **Registry-based routing** - No hardcoded switches in ComponentUtils
✅ **Common initialization flow** - `initialize()`, `createInstance()`, `findDOMElements()`, `setupEventListeners()`
✅ **Message routing** - `handleMessage()` routes to `onComponentUpdate()` or `handleCustomAction()`
✅ **Cleanup management** - `cleanup()` with `cleanupInstance()` hook
✅ **Auto-registration** - `.register()` adds to ComponentUtils registry

### CRITICAL: What You MUST Do:

1. ✅ **Extend BaseBehavior** - `class MyBehavior extends BaseBehavior`
2. ✅ **Implement `getComponentType()`** - Return string matching Extension Host component type
3. ✅ **Implement `onComponentUpdate()`** - Handle event bridge data updates
4. ✅ **Call `.register()` at end of file** - Registers behavior with ComponentUtils

### What Happens If You Forget:

❌ **Forget to extend BaseBehavior** → Manual implementation, high risk of silent failures
❌ **Forget `getComponentType()`** → Runtime error when calling `.register()`
❌ **Forget `onComponentUpdate()`** → TypeScript compilation error (good! fails fast)
❌ **Forget `.register()`** → Behavior not registered, messages not routed, component doesn't work

### Migration from Old Pattern:

If you find old behaviors not extending BaseBehavior:

```javascript
// ❌ OLD PATTERN (pre-BaseBehavior)
class OldBehavior {
    static instances = new Map();

    static initialize(componentId, config, element) {
        // Manual implementation
    }

    static handleMessage(message) {
        switch (message.action) {
            case 'componentUpdate':  // Easy to forget this case!
                // Handle update
                break;
        }
    }
}

// ✅ NEW PATTERN (with BaseBehavior)
class NewBehavior extends BaseBehavior {
    static getComponentType() { return 'NewComponent'; }

    static onComponentUpdate(instance, data) {
        // MUST implement - enforced by abstract method
    }

    static handleCustomAction(instance, message) {
        // Handle other actions here
    }
}
NewBehavior.register();
```

**Refactor priority**: High - Old patterns are fragile and cause silent failures

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
