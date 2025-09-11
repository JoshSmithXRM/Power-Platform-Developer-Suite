# CLAUDE.md

This file provides essential patterns and constraints for AI assistants (Claude, GitHub Copilot, Cursor, etc.) when working with this VS Code extension codebase.

## CRITICAL: Understanding Execution Contexts

### Extension Host Context (Node.js/TypeScript)
- **What it is**: Runs in VS Code's Node.js process
- **Has access to**: ComponentFactory, ServiceFactory, all TypeScript classes, Node.js APIs, file system, VS Code APIs
- **Where it executes**: getHtmlContent() method, message handlers, all TypeScript code
- **Can do**: Generate HTML using ComponentFactory, make API calls, access services

### Webview Context (Browser/JavaScript)
- **What it is**: Runs in isolated browser sandbox where users interact
- **Has access to**: ONLY what's in the HTML string or loaded via `<script>` tags
- **Available utilities**: Component behavior scripts loaded as .js files
- **Cannot access**: ComponentFactory, ServiceFactory, or any TypeScript classes
- **Communication**: Only via vscode.postMessage() to Extension Host

### Critical Pattern: Never Mix Contexts

❌ **NEVER DO THIS** - Trying to use Extension Host classes in Webview:
```javascript
// In webview JavaScript - THIS WILL FAIL
function displayResults(data) {
    const tableHtml = ComponentFactory.generateDataTable(...); // ERROR: ComponentFactory is not defined
    document.getElementById('results').innerHTML = tableHtml;
}
```

✅ **ALWAYS DO THIS** - Generate HTML in Extension Host:
```typescript
// In getHtmlContent() method - Extension Host context
protected getHtmlContent(): string {
    const tableHtml = ComponentFactory.createDataTable({
        id: 'resultsTable',
        columns: [...]
    });
    
    return PanelComposer.compose([
        this.environmentSelector,
        this.dataTable
    ], this.getCommonWebviewResources());
}
```

## Component Composition Architecture

### Factory Pattern Usage (MANDATORY)
All component creation MUST use ComponentFactory in Extension Host context:

```typescript
// ✅ CORRECT: Use factory for component creation
this.environmentSelector = ComponentFactory.createEnvironmentSelector({
    id: 'envSelector',
    onChange: this.handleEnvironmentChange.bind(this)
});

this.dataTable = ComponentFactory.createDataTable({
    id: 'resultsTable',
    columns: this.getTableColumns()
});
```

### Panel Composition Pattern
Panels are built by composing reusable component instances:

```typescript
export class MyPanel extends BasePanel {
    private environmentSelector: EnvironmentSelectorComponent;
    private dataTable: DataTableComponent;

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ...);
        this.initializeComponents();
    }
    
    private initializeComponents(): void {
        // Create component instances with configuration
        this.environmentSelector = ComponentFactory.createEnvironmentSelector({...});
        this.dataTable = ComponentFactory.createDataTable({...});
        
        // Setup event bridges for efficient updates
        this.setupComponentEventBridges();
    }
    
    protected getHtmlContent(): string {
        return PanelComposer.compose([
            this.environmentSelector,
            this.dataTable
        ], this.getCommonWebviewResources());
    }
}
```

## Component Update Communication Pattern

### Use Event Bridges, NOT updateWebview()

❌ **NEVER DO THIS** - Causes UI flash and poor performance:
```typescript
private async loadData(): Promise<void> {
    const data = await this.service.getData();
    this.dataTable.setData(data);
    this.updateWebview(); // ❌ WRONG: Full HTML regeneration
}
```

✅ **ALWAYS DO THIS** - Use component event bridge:
```typescript
private initializeComponents(): void {
    this.dataTable = ComponentFactory.createDataTable({...});
    
    // ✅ CORRECT: Setup event bridge for efficient updates
    this.dataTable.on('update', (event) => {
        this.postMessage({
            command: 'component-event',
            componentId: event.componentId,
            eventType: 'dataUpdated',
            action: 'setData',
            data: this.dataTable.getData()
        });
    });
}

private async loadData(): Promise<void> {
    const data = await this.service.getData();
    this.dataTable.setData(data); // ✅ Triggers event bridge automatically
}
```

## Data Transformation Layer Pattern

### Service → Panel → Component Flow
```typescript
// 1. Service returns business data
const businessData = await this.service.getData(params);

// 2. Panel transforms for UI display
private transformDataForDisplay(businessData: BusinessDataType): UIDataType[] {
    return businessData.items.map(item => ({
        id: item.uniqueKey,                    // Required for row actions
        displayName: item.title || 'Untitled',
        status: this.calculateDisplayStatus(item),
        // ... other UI-specific fields
    }));
}

// 3. Component receives UI-ready data
const uiData = this.transformDataForDisplay(businessData);
this.dataTable.setData(uiData);
```

**Critical Requirements:**
- Table data MUST have 'id' property for row actions
- Transformation happens in Panel layer, not Service or Component
- Components remain data-source agnostic

## Logging Architecture by Context

### Extension Host Context (TypeScript)
```typescript
// ✅ Panels: Use this.componentLogger (auto-provided by BasePanel)
class MyPanel extends BasePanel {
    async loadData() {
        this.componentLogger.info('Loading data', { environmentId: env.id });
    }
}

// ✅ Components: Use this.componentLogger (auto-provided by BaseComponent)
class MyComponent extends BaseComponent {
    setData(data: any[]) {
        this.componentLogger.debug('Setting data', { itemCount: data.length });
    }
}

// ✅ Services: Use private logger getter
class MyService {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger() {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('MyService');
        }
        return this._logger;
    }
}
```

### Webview Context (JavaScript)
```javascript
// ✅ Use console.log in webview behaviors (LoggerService not available)
class MyBehavior {
    static handleMessage(message) {
        console.log('Handling message in webview:', message);
    }
}
```

## Component Behavior Registration Pattern

All webview behavior scripts MUST follow this registration pattern:

```javascript
class ComponentBehavior {
    static instances = new Map();
    
    // ✅ REQUIRED: Static initialization method
    static initialize(componentId, config, element) {
        if (!componentId || !element) return null;
        if (this.instances.has(componentId)) return this.instances.get(componentId);
        
        const instance = { id: componentId, config, element };
        this.instances.set(componentId, instance);
        return instance;
    }
    
    // ✅ REQUIRED: Static message handler
    static handleMessage(message) {
        if (!message?.componentId) return;
        // Handle Extension Host messages
    }
}

// ✅ REQUIRED: Global registration
if (typeof window !== 'undefined') {
    window.ComponentBehavior = ComponentBehavior;
    
    if (window.ComponentUtils?.registerBehavior) {
        window.ComponentUtils.registerBehavior('ComponentType', ComponentBehavior);
    }
}
```

## Security Rules (Non-Negotiable)

- **Never log, expose, or exfiltrate** tokens, credentials, or sensitive data
- **All API calls** must go through AuthenticationService
- **Use VS Code SecretStorage** for sensitive information
- **Validate all user inputs** before making API calls

## Development Commands

```bash
npm run compile          # Development build
npm run watch            # Watch mode for development 
npm run package          # Production build with webpack
npm run test-release     # Build, package, and install locally
```

## Quick Reference - Essential Patterns

**DO:**
- ✅ Use ComponentFactory for ALL component creation in Extension Host
- ✅ Compose panels from reusable component instances
- ✅ Use event bridges for component updates
- ✅ Transform data in Panel layer
- ✅ Follow Extension Host vs Webview separation

**DON'T:**
- ❌ Try to use ComponentFactory in webview JavaScript
- ❌ Use updateWebview() for component data updates
- ❌ Mix Extension Host and Webview contexts
- ❌ Transform data in Service or Component layers
- ❌ Create one-off implementations instead of reusable components

For detailed architecture patterns and component design guidelines, see `docs/ARCHITECTURE_GUIDE.md` and `docs/COMPONENT_PATTERNS.md`.