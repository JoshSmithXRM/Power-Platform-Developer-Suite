# CLAUDE.md

Quick reference for AI assistants working with this VS Code extension codebase.
**For detailed examples and explanations, see the `docs/` folder.**

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
        this.environmentSelector = ComponentFactory.createEnvironmentSelector({...});
        this.dataTable = ComponentFactory.createDataTable({...});
    }

    protected getHtmlContent(): string {
        return PanelComposer.compose([
            this.environmentSelector,
            this.dataTable
        ], this.getCommonWebviewResources());
    }
}
```

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

## Component Updates

✅ **Use event bridges** - efficient, no UI flash:
```typescript
this.dataTable.setData(newData);  // Triggers event bridge automatically
```

❌ **DON'T use** `updateWebview()` - causes full HTML regeneration

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

## Development Commands

```bash
npm run compile          # Development build
npm run watch            # Watch mode for development
npm run package          # Production build with webpack
npm run test-release     # Build, package, and install locally
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

- ❌ Try to use ComponentFactory in webview JavaScript
- ❌ Use `updateWebview()` for component data updates
- ❌ Mix Extension Host and Webview contexts
- ❌ Transform data in Service or Component layers
- ❌ Skip `panel-content` wrapper in custom layouts
- ❌ Add custom body/container styles that override base layout
- ❌ Use custom header classes instead of `panel-controls`
- ❌ Hardcode colors (breaks theme compatibility)

## Component Behavior Pattern

All webview behavior scripts MUST follow this pattern:

```javascript
class ComponentBehavior {
    static instances = new Map();

    static initialize(componentId, config, element) {
        if (!componentId || !element) return null;
        if (this.instances.has(componentId)) return this.instances.get(componentId);

        const instance = { id: componentId, config, element };
        this.instances.set(componentId, instance);
        return instance;
    }

    static handleMessage(message) {
        if (!message?.componentId) return;
        // Handle Extension Host messages
    }
}

// Global registration
if (typeof window !== 'undefined') {
    window.ComponentBehavior = ComponentBehavior;
    if (window.ComponentUtils?.registerBehavior) {
        window.ComponentUtils.registerBehavior('ComponentType', ComponentBehavior);
    }
}
```

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
