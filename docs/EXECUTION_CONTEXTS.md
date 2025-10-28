# Execution Contexts Guide

Understanding the separation between Extension Host and Webview contexts is **critical** for building VS Code extensions with webviews. Mixing these contexts is one of the most common mistakes.

## Two Separate Execution Environments

### Extension Host Context (Node.js/TypeScript)

**What it is**: Runs in VS Code's Node.js process with full system access

**Has access to**:
- ComponentFactory, ServiceFactory
- All TypeScript classes and modules
- Node.js APIs (fs, path, etc.)
- File system access
- VS Code Extension APIs
- Environment variables

**Where it executes**:
- `getHtmlContent()` method
- Message handlers in panels
- All TypeScript code in `/src`
- Service layer, component classes

**What it does**:
- Generate HTML using ComponentFactory
- Make API calls to Power Platform
- Access authentication services
- Manage state and business logic
- Compose panels and components

**Example - Correct Usage**:
```typescript
// In MyPanel.ts - Extension Host context
protected getHtmlContent(): string {
    // ✅ CORRECT: ComponentFactory available here
    const tableHtml = ComponentFactory.createDataTable({
        id: 'resultsTable',
        columns: this.getTableColumns(),
        data: this.tableData
    });

    return PanelComposer.compose([
        this.environmentSelector,
        this.dataTable
    ], this.getCommonWebviewResources());
}

private async loadData(environmentId: string): Promise<void> {
    // ✅ CORRECT: ServiceFactory available here
    const service = ServiceFactory.getSolutionService();
    const solutions = await service.getSolutions(environmentId);

    this.dataTable.setData(solutions);  // Triggers event bridge
}
```

### Webview Context (Browser/JavaScript)

**What it is**: Runs in an isolated browser sandbox where users interact

**Has access to**:
- ONLY what's in the HTML string
- JavaScript files loaded via `<script>` tags
- Component behavior scripts (`.js` files)
- DOM APIs (document, window)
- vscode.postMessage() API

**Does NOT have access to**:
- ComponentFactory, ServiceFactory
- TypeScript classes
- Node.js modules
- File system
- Direct Extension APIs

**Where it executes**:
- Inside the webview HTML
- Behavior scripts in `/resources/webview/js`
- User interactions (clicks, input)

**What it does**:
- Handle user interactions
- Update DOM efficiently
- Communicate with Extension Host via postMessage
- Initialize component behaviors
- Manage UI state

### BaseBehavior Pattern (MANDATORY for Webview Behaviors)

**All webview behaviors MUST extend `BaseBehavior`** to ensure:
- **Enforced `onComponentUpdate()` implementation** - Can't forget to handle data updates
- **Registry-based message routing** - No hardcoded switches
- **Consistent lifecycle management** - Initialization, event setup, cleanup

**Required**:
1. Extend `BaseBehavior`
2. Implement `getComponentType()` - Return component type string
3. Implement `onComponentUpdate(instance, data)` - Handle event bridge data updates
4. Call `.register()` at end of file

**Example - Correct Usage**:
```javascript
// In DataTableBehavior.js - Webview context
/**
 * DataTableBehavior - Webview behavior for DataTable component
 * Extends BaseBehavior for enforced componentUpdate pattern
 */
class DataTableBehavior extends BaseBehavior {
    /**
     * Get component type identifier (REQUIRED)
     */
    static getComponentType() {
        return 'DataTable';
    }

    /**
     * Handle component data updates from Extension Host (REQUIRED)
     * Called automatically when event bridge sends updated data
     */
    static onComponentUpdate(instance, data) {
        // ✅ CORRECT: Receive updates from Extension Host via event bridge
        if (data && Array.isArray(data)) {
            this.updateTable(instance, data);
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
            tbody: null,
            boundHandlers: {}
        };
    }

    /**
     * Find DOM elements (OPTIONAL override)
     */
    static findDOMElements(instance) {
        instance.tbody = instance.element.querySelector('tbody');
    }

    /**
     * Setup event listeners (OPTIONAL override)
     */
    static setupEventListeners(instance) {
        // ✅ CORRECT: Direct DOM manipulation
        instance.boundHandlers.rowClick = (e) => this.handleRowClick(instance, e);
        instance.element.addEventListener('click', instance.boundHandlers.rowClick);
    }

    /**
     * Handle custom actions beyond componentUpdate (OPTIONAL override)
     */
    static handleCustomAction(instance, message) {
        switch (message.action) {
            case 'selectRow':
                this.selectRow(instance, message.rowId);
                break;
        }
    }

    /**
     * Cleanup resources (OPTIONAL override)
     */
    static cleanupInstance(instance) {
        if (instance.element && instance.boundHandlers.rowClick) {
            instance.element.removeEventListener('click', instance.boundHandlers.rowClick);
        }
    }

    static updateTable(instance, data) {
        if (!instance.tbody) return;

        // ✅ CORRECT: Update DOM with new data
        instance.tbody.innerHTML = data.map(row =>
            `<tr>${row.cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`
        ).join('');
    }

    static handleRowClick(instance, event) {
        // Implementation...
    }
}

// ✅ CORRECT: Auto-register with ComponentUtils (REQUIRED)
DataTableBehavior.register();
```

## Critical Pattern: Never Mix Contexts

### ❌ WRONG: Trying to use Extension Host classes in Webview

```javascript
// In webview JavaScript - THIS WILL FAIL
function displayResults(data) {
    // ❌ ERROR: ComponentFactory is not defined in webview
    const tableHtml = ComponentFactory.generateDataTable({
        id: 'table',
        data: data
    });
    document.getElementById('results').innerHTML = tableHtml;
}
```

**Why this fails**: ComponentFactory is a TypeScript class that only exists in the Extension Host. The webview is a sandboxed browser environment that has no access to Node.js or TypeScript modules.

### ✅ CORRECT: Generate HTML in Extension Host

```typescript
// In Panel TypeScript - Extension Host context
private async handleLoadData(environmentId: string): Promise<void> {
    // ✅ Generate HTML in Extension Host
    const data = await this.service.getData(environmentId);
    this.dataTable.setData(data);

    // ✅ Event bridge sends update to webview
    this.postMessage({
        command: 'component-event',
        componentId: 'myTable',
        action: 'setData',
        data: this.transformDataForDisplay(data)
    });
}
```

```javascript
// In Webview JavaScript
window.addEventListener('message', event => {
    const message = event.data;

    if (message.command === 'component-event') {
        // ✅ CORRECT: Just update DOM with provided data
        DataTableBehavior.handleMessage(message);
    }
});
```

## Communication Between Contexts

### Extension Host → Webview (Downward)

**Use**: `panel.webview.postMessage(message)`

```typescript
// In Panel class - Extension Host
private updateComponentData(componentId: string, data: any): void {
    this.postMessage({
        command: 'component-event',
        componentId: componentId,
        action: 'setData',
        data: data
    });
}
```

### Webview → Extension Host (Upward)

**Use**: `vscode.postMessage(message)`

```javascript
// In Webview JavaScript
function handleUserAction(action, data) {
    vscode.postMessage({
        command: 'user-action',
        action: action,
        data: data
    });
}

// Example: User clicks a button
document.getElementById('myButton').addEventListener('click', () => {
    vscode.postMessage({
        command: 'refresh-data',
        environmentId: currentEnvironmentId
    });
});
```

```typescript
// In Panel class - Extension Host
protected async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.command) {
        case 'refresh-data':
            await this.refreshData(message.environmentId);
            break;
    }
}
```

## Component Lifecycle Across Contexts

### 1. Component Creation (Extension Host)

```typescript
// Extension Host only
this.dataTable = ComponentFactory.createDataTable({
    id: 'myTable',
    columns: [...],
    data: []
});
```

### 2. HTML Generation (Extension Host)

```typescript
// Extension Host generates HTML string
protected getHtmlContent(): string {
    return PanelComposer.compose([
        this.dataTable  // Calls dataTable.generateHTML()
    ], this.getCommonWebviewResources());
}
```

### 3. HTML Rendering (Webview)

```html
<!-- HTML delivered to webview -->
<div class="data-table" id="myTable"
     data-component-type="DataTable"
     data-component-id="myTable">
    <!-- Table content -->
</div>
```

### 4. Behavior Initialization (Webview)

```javascript
// Webview JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('myTable');
    DataTableBehavior.initialize('myTable', config, table);
});
```

### 5. Updates (Extension Host → Webview)

```typescript
// Extension Host updates data
this.dataTable.setData(newData);  // Triggers event

// Event bridge sends message to webview
this.postMessage({
    command: 'component-event',
    componentId: 'myTable',
    action: 'setData',
    data: newData
});
```

```javascript
// Webview receives and applies update
DataTableBehavior.handleMessage({
    componentId: 'myTable',
    action: 'setData',
    data: newData
});
```

## Common Mistakes and Solutions

### Mistake 1: Trying to import TypeScript modules in webview

❌ **Wrong**:
```javascript
// In webview .js file
import { ComponentFactory } from '../../../src/factories/ComponentFactory';
// ERROR: Module system not available in webview
```

✅ **Correct**:
```javascript
// Use globally registered behaviors
if (window.ComponentUtils) {
    window.ComponentUtils.initializeAllComponents();
}
```

### Mistake 2: Trying to use Node.js APIs in webview

❌ **Wrong**:
```javascript
// In webview JavaScript
const fs = require('fs');  // ERROR: Node.js not available
const path = require('path');  // ERROR: Node.js not available
```

✅ **Correct**:
```javascript
// Request data from Extension Host
vscode.postMessage({
    command: 'load-file',
    filePath: '/path/to/file'
});

// Extension Host handles file operations
```

### Mistake 3: Trying to call panel methods from webview

❌ **Wrong**:
```javascript
// In webview JavaScript
panel.loadEnvironments();  // ERROR: panel object not accessible
```

✅ **Correct**:
```javascript
// Send message to Extension Host
vscode.postMessage({
    command: 'load-environments'
});

// Extension Host handles the action
```

### Mistake 4: Storing component instances in webview

❌ **Wrong**:
```javascript
// In webview JavaScript
const table = new DataTableComponent({...});  // ERROR: Class not available
```

✅ **Correct**:
```javascript
// Store lightweight state only
const tableState = {
    componentId: 'myTable',
    sortColumn: 'name',
    sortDirection: 'asc'
};
```

## Context-Appropriate Logging

### Extension Host Logging

```typescript
// In Panel classes
class MyPanel extends BasePanel {
    async loadData() {
        // ✅ Use this.componentLogger
        this.componentLogger.info('Loading data', { environmentId });
    }
}

// In Component classes
class MyComponent extends BaseComponent {
    setData(data: any[]) {
        // ✅ Use this.componentLogger
        this.componentLogger.debug('Setting data', { itemCount: data.length });
    }
}

// In Service classes
class MyService {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;

    private get logger() {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('MyService');
        }
        return this._logger;
    }

    async fetchData() {
        this.logger.info('Fetching data');
    }
}
```

### Webview Logging

```javascript
// In Webview JavaScript - LoggerService not available
/**
 * MyBehavior - Example webview behavior
 */
class MyBehavior extends BaseBehavior {
    static getComponentType() {
        return 'MyComponent';
    }

    static onComponentUpdate(instance, data) {
        // ✅ Use console.log
        console.log('Handling component update in webview:', data);
    }

    static handleCustomAction(instance, message) {
        console.log('Handling custom action:', message.action);
    }

    static createInstance(componentId, config, element) {
        console.debug('Initializing component:', componentId);
        return {
            id: componentId,
            config: { ...config },
            element: element,
            boundHandlers: {}
        };
    }
}

MyBehavior.register();
```

## Security Implications

### Extension Host Security

- Has full system access - be careful with user input
- Can access credentials and secrets
- Can make API calls
- Should validate all webview messages

```typescript
protected async handleMessage(message: WebviewMessage): Promise<void> {
    // ✅ Validate message structure
    if (!message || !message.command) {
        this.componentLogger.warn('Invalid message received');
        return;
    }

    // ✅ Validate data before using
    if (message.command === 'delete-item' && message.itemId) {
        // Validate itemId format, ownership, etc.
        await this.deleteItem(message.itemId);
    }
}
```

### Webview Security

- Sandboxed browser environment
- Cannot access file system or secrets
- Content Security Policy restrictions
- Should never trust data without validation

```javascript
// ✅ Sanitize user input before displaying
function displayUserData(data) {
    const sanitized = data.replace(/[<>]/g, '');
    element.textContent = sanitized;  // Use textContent, not innerHTML
}
```

## Quick Reference

| **Aspect** | **Extension Host** | **Webview** |
|------------|-------------------|-------------|
| **Language** | TypeScript | JavaScript |
| **Environment** | Node.js | Browser |
| **Access** | Full system, VS Code APIs | DOM only |
| **Factories** | ✅ Available | ❌ Not available |
| **File System** | ✅ Available | ❌ Not available |
| **Generate HTML** | ✅ Yes (ComponentFactory) | ❌ No |
| **Update DOM** | ❌ No | ✅ Yes |
| **Logging** | this.componentLogger | console.log |
| **Communication** | postMessage → webview | postMessage → Extension Host |

## Summary

**Golden Rule**:
- **Extension Host**: Generates HTML, manages state, handles business logic
- **Webview**: Displays HTML, handles interactions, updates DOM
- **Communication**: Always via postMessage in both directions

Following this separation ensures maintainable, secure, and performant VS Code extensions.
