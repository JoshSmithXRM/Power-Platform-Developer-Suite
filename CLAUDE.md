# CLAUDE.md

**IMPORTANT: Keep this file synchronized with `.github/copilot-instructions.md`. Any updates should be made to both files identically.**

This file provides guidance to AI assistants (Claude, GitHub Copilot, Cursor, etc.) and developers when working with code in this repository.

## CRITICAL: Understanding Execution Contexts

### Extension Host Context (Node.js/TypeScript)
- **What it is**: Runs in VS Code's Node.js process
- **Has access to**: ComponentFactory, ServiceFactory, all TypeScript classes, Node.js APIs, file system, VS Code APIs
- **Where it executes**: getHtmlContent() method, message handlers, all TypeScript code
- **Can do**: Generate HTML using ComponentFactory, make API calls, access services

### Webview Context (Browser/JavaScript)
- **What it is**: Runs in isolated browser sandbox where users interact
- **Has access to**: ONLY what's in the HTML string or loaded via `<script>` tags
- **Available utilities**: TableUtils, PanelUtils, EnvironmentSelectorUtils (loaded as .js files)
- **Cannot access**: ComponentFactory, ServiceFactory, or any TypeScript classes
- **Communication**: Only via vscode.postMessage() to Extension Host

### Common Mistakes to Avoid

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
    
    return `<!DOCTYPE html>
        <html>
        <body>
            <div id="tableContainer">
                ${tableHtml}  <!-- ComponentFactory runs in Extension Host -->
            </div>
            <script>
                // Webview can only use loaded utilities
                TableUtils.initializeTable('resultsTable', {...});
            </script>
        </body>
        </html>`;
}
```

❌ **NEVER DO THIS** - Using `updateWebview()` for component data updates:
```typescript
// In panel method - THIS CAUSES FLASH AND POOR PERFORMANCE
private async loadConnectionReferences(): Promise<void> {
    const data = await this.service.getData();
    const transformedData = this.transformData(data);
    
    this.dataTableComponent.setData(transformedData);
    this.updateWebview(); // ❌ WRONG: Full HTML regeneration causes flash
}
```

✅ **ALWAYS DO THIS** - Use component event bridge for data updates:
```typescript
// Panel constructor - Setup event bridge ONCE
private initializeComponents(): void {
    this.dataTableComponent = ComponentFactory.createDataTable({
        id: 'myTable',
        columns: this.getTableColumns()
    });
    
    // ✅ CORRECT: Setup event bridge for efficient updates
    this.dataTableComponent.on('update', (event) => {
        this.postMessage({
            command: 'component-update',
            componentId: event.componentId,
            action: 'setData',
            data: this.dataTableComponent.getData()
        });
    });
}

// Data loading method - Component handles webview update automatically  
private async loadConnectionReferences(): Promise<void> {
    const data = await this.service.getData();
    const transformedData = this.transformData(data);
    
    this.dataTableComponent.setData(transformedData); // ✅ CORRECT: Efficient DOM update via event bridge
    // No updateWebview() call needed - component handles webview update
}
```

## Component-Based Architecture

### Component Composition Pattern

Panels are now built by **composing reusable components** rather than custom implementations:

```typescript
export class EnvironmentVariablesPanel extends BasePanel {
    private environmentSelector: EnvironmentSelectorComponent;
    private solutionSelector: SolutionSelectorComponent;  
    private dataTable: DataTableComponent;

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ...);
        
        // Compose panel from reusable components
        this.environmentSelector = ComponentFactory.createEnvironmentSelector({
            id: 'envSelector',
            onChange: this.handleEnvironmentChange.bind(this)
        });
        
        this.solutionSelector = ComponentFactory.createSolutionSelector({
            id: 'solutionSelector', 
            onChange: this.handleSolutionChange.bind(this)
        });
    }
    
    protected getHtmlContent(): string {
        return PanelComposer.compose([
            this.environmentSelector,
            this.solutionSelector,
            this.dataTable
        ], this.getCommonWebviewResources());
    }
}
```

### Component Structure

Each component follows this structure:
- **Component Class** (TypeScript) - Business logic, state management, configuration
- **View Class** (TypeScript) - HTML generation for Extension Host context  
- **Behavior Script** (JavaScript) - Webview interactivity and event handling
- **CSS File** - Component-specific styling
- **Config Interface** - Type-safe configuration options

### Multi-Instance Support

Components support multiple instances per panel:

```typescript
// Multiple environment selectors in one panel
const sourceEnvSelector = ComponentFactory.createEnvironmentSelector({
    id: 'sourceEnv',
    label: 'Source Environment:',
    onChange: this.handleSourceEnvChange.bind(this)
});

const targetEnvSelector = ComponentFactory.createEnvironmentSelector({
    id: 'targetEnv', 
    label: 'Target Environment:',
    onChange: this.handleTargetEnvChange.bind(this)
});
```

## Flexible Panel Layout System (NEW)

### **Scalable Height Management**

The extension now uses a **flexbox-based layout system** that automatically adapts to any panel configuration without hardcoded pixel values:

```css
/* Flexible Layout Classes */
.panel-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.panel-controls {
    flex: 0 0 auto;           /* Natural height, doesn't grow */
    padding: var(--component-padding);
    border-bottom: 1px solid var(--vscode-panel-border);
}

.panel-content {
    flex: 1 1 auto;           /* Grows to fill remaining space */
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.panel-table-section {
    flex: 1 1 auto;           /* Tables use all available space */
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
```

### **Intelligent Component Organization**

`PanelComposer.organizeComponentsForFlexibleLayout()` automatically separates components:

- **Control Components** → Top section (selectors, action bars, forms)
- **Table Components** → Content section (data tables, lists)  
- **Automatic Detection** → Based on component types and HTML structure

### **Benefits**

✅ **Works with ANY panel configuration** - 1 control or 10 controls at the top
✅ **Zero hardcoded pixel values** - Pure flexbox layout system  
✅ **Self-adapting** - Tables automatically consume correct amount of space
✅ **Future-proof** - New components work automatically
✅ **Backward compatible** - Existing panels benefit immediately

### **Usage**

No code changes required - the system automatically organizes components:

```typescript
// ANY configuration works automatically
return PanelComposer.compose([
    this.environmentSelector,      // → Goes to controls section
    this.solutionSelector,         // → Goes to controls section  
    this.actionBar,               // → Goes to controls section
    this.dataTable                // → Goes to table section (fills remaining space)
], this.getCommonWebviewResources());
```

## Component Development & Reuse Rules

### ComponentFactory Usage (MANDATORY)

ComponentFactory creates configured component instances in the Extension Host context. **Always use ComponentFactory for component creation.**

**Available Component Types:**
- **Selectors**: `createEnvironmentSelector()`, `createSolutionSelector()`, `createEntitySelector()`
- **Tables**: `createDataTable()`, `createEmptyTable()`, `createFilterableTable()`
- **Forms**: `createActionBar()`, `createSearchForm()`, `createFilterForm()`
- **Containers**: `createPanel()`, `createCollapsibleSection()`, `createTabs()`

**Component Usage Rules:**
1. **ALWAYS** use ComponentFactory for component creation
2. **CONFIGURE** components through typed configuration objects
3. **COMPOSE** panels from multiple component instances
4. **EXTEND** ComponentFactory when new component types are needed
5. **REFERENCE** - Look at refactored panels for composition patterns

### Component Configuration

All components accept configuration objects:

```typescript
const dataTable = ComponentFactory.createDataTable({
    id: 'resultsTable',
    columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'status', label: 'Status', sortable: false }
    ],
    defaultSort: { column: 'name', direction: 'asc' },
    filterable: true,
    onRowAction: this.handleRowAction.bind(this)
});
```

### Pattern Examples

**Component Composition (recommended):**
```typescript
// In constructor - create and configure components
this.components = {
    environmentSelector: ComponentFactory.createEnvironmentSelector({
        id: 'envSelect',
        onChange: this.handleEnvironmentChange.bind(this)
    }),
    dataTable: ComponentFactory.createDataTable({
        id: 'resultsTable',
        columns: this.getColumnConfig()
    })
};

// In getHtmlContent() - compose HTML
protected getHtmlContent(): string {
    return PanelComposer.compose([
        this.components.environmentSelector,
        this.components.dataTable
    ], this.getCommonWebviewResources());
}
```

**Legacy Pattern (being phased out):**
```typescript
// Old approach - avoid for new development
return `<script type="text/template" id="tableTemplate">
    ${ComponentFactory.createDataTable({
        id: 'myTable',
        columns: [...]
    })}
</script>`;
```

## Security Rules (Non-Negotiable)

- **Never log, expose, or exfiltrate** tokens, credentials, or sensitive data
- **Use VS Code SecretStorage** for all sensitive information storage
- **All API calls** must go through AuthenticationService - never create alternate auth patterns
- **Validate all user inputs** before making API calls
- **No external network calls** except through proper authentication channels
- **Ask clarifying questions** when requirements are ambiguous

## Logging Standards (Mandatory)

**Use VS Code's Native Logging APIs - NO console.log statements**

### LoggerService Usage by Architectural Layer

The extension uses different logging patterns depending on the architectural layer:

| Layer | Property | Pattern | Reason |
|-------|----------|---------|--------|
| **Panels** | `this.componentLogger` | Auto-provided by BasePanel | Inherits from BasePanel, automatic setup |
| **Components** | `this.componentLogger` | Auto-provided by BaseComponent | Inherits from BaseComponent, automatic setup |
| **Services** | `this.logger` | Manual getter with lazy initialization | Independent classes, manual logger setup |
| **Webview Behaviors** | `console.log` | Browser console only | LoggerService not available in webview context |

```typescript
// ✅ PANELS: Use this.componentLogger (BasePanel provides automatically)
class MyPanel extends BasePanel {
    async loadData() {
        this.componentLogger.info('Loading panel data', { 
            viewType: this.viewType,
            componentCount: 3 
        });
    }
}

// ✅ COMPONENTS: Use this.componentLogger (BaseComponent provides automatically) 
class MyComponent extends BaseComponent {
    setData(data: any[]) {
        this.componentLogger.debug('Setting component data', { 
            componentId: this.config.id,
            itemCount: data.length 
        });
    }
}

// ✅ SERVICES: Use this.logger with private getter pattern
class MyService {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger() {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('MyService');
        }
        return this._logger;
    }
    
    async fetchData() {
        this.logger.info('Fetching service data');
        this.logger.error('Service operation failed', error, { operation: 'fetchData' });
    }
}

// ✅ WEBVIEW BEHAVIORS: Use console.log (LoggerService not available in webview context)
class MyBehavior {
    static handleMessage(message) {
        console.log('Handling message in webview:', message);
    }
}
```

### Log Levels (Use Appropriately)

- **trace**: Most detailed - component method calls, detailed flow
- **debug**: Development info - initialization steps, state changes  
- **info**: Production milestones - panel opened, data loaded, operations completed
- **warn**: Concerning but recoverable - deprecated usage, fallbacks triggered
- **error**: Actual failures - exceptions, failed operations, validation errors

### Required Format

```typescript
// ✅ CORRECT - Structured with context
this.componentLogger.info('Environment selected', { 
    environmentId: env.id, 
    environmentName: env.name,
    panelType: this.viewType 
});

// ❌ WRONG - Plain console.log (in Extension Host context)
console.log('Environment selected:', env.id);

// ❌ WRONG - No context
this.componentLogger.info('Operation completed');
```

### Security-Safe Logging

The LoggerService automatically sanitizes sensitive data:

```typescript
// Automatically redacts tokens, passwords, secrets
this.componentLogger.debug('API call completed', { 
    token: 'Bearer abc123...',     // Becomes '[REDACTED]'
    data: responseData,            // Safe data preserved
    environmentUrl: env.url        // Safe data preserved
});
```

### Accessing Logs

**For Users:**
- Use VS Code command: `Developer: Open Extensions Logs Folder`
- Configurable log levels via VS Code: `Developer: Set Log Level...`

**For Development:**
- View in VS Code Output panel: Select "Power Platform Developer Suite" channel
- All logs include timestamps and structured metadata

### Context-Specific Logging Rules

**Extension Host Context (TypeScript):**
- ✅ **ALWAYS use `this.componentLogger`** for all logging
- ❌ **NEVER use `console.log`** in Extension Host code
- Available in: `BasePanel`, `BaseComponent`, and service classes

**Webview Context (JavaScript):**  
- ✅ **MUST use `console.log`** - LoggerService is not available in webview
- Located in: `resources/webview/js/components/*Behavior.js` files
- Webview logs appear in browser DevTools, not VS Code logs

### Migration Rule

**Replace ALL `console.log/error/warn` statements in Extension Host TypeScript code with LoggerService calls.** Webview JavaScript behavior scripts should continue using `console.log` as LoggerService is not accessible in webview context.

## Development Commands

**Build and Development:**
```bash
npm install              # Install dependencies
npm run compile          # Development build
npm run watch            # Watch mode for development 
npm run package          # Production build with webpack (includes TypeScript type checking)
```

**Extension Testing:**
```bash
npm run vsce-package     # Create .vsix package
npm run test-release     # Build, package, and install locally
npm run clean-install    # Uninstall and reinstall fresh
code --install-extension power-platform-developer-suite-0.0.1.vsix  # Manual install
```

**Development Workflow:**
- Use `npm run watch` for continuous compilation during development
- Press F5 in VS Code to launch Extension Development Host
- Use VS Code task "Build Extension" for webpack compilation

## Architecture Overview

This VS Code extension for Microsoft Dynamics 365/Power Platform follows a modular architecture with clean separation of concerns:

### Core Structure
- **panels/** - Webview panels extending BasePanel, composed from reusable components
- **services/** - Business logic with dependency injection via ServiceFactory
- **components/** - Component-based UI system with composition pattern
  - **base/** - Base component classes, interfaces, and shared functionality
  - **selectors/** - Environment, solution, and entity selector components
  - **tables/** - Data table components with various configurations
  - **forms/** - Action bars, forms, and input components
- **factories/** - Enhanced ComponentFactory and PanelComposer for component creation
- **providers/** - VS Code tree view providers (environments, tools)
- **commands/** - Command handlers organized by domain
- **resources/webview/** - Component-specific CSS and JavaScript behaviors

### Key Architectural Patterns

**Panel Development:**
- All panels extend `BasePanel` class with consistent structure
- **Compose panels** from reusable component instances, avoid custom HTML
- Use `ServiceFactory` for dependency injection - never direct instantiation
- Use `PanelComposer.compose()` to combine components into complete HTML
- Include common webview resources via `getCommonWebviewResources()`
- Follow standard message handling pattern with try/catch error handling

**Service Layer:**
- Services accept dependencies through constructor (especially AuthenticationService)
- Register all services in ServiceFactory with proper initialization
- Focus on single responsibility per service
- Use AuthenticationService for all token management

**UI Components:**
- Use `ComponentFactory` for ALL component creation in Extension Host
- **Create component instances** with configuration objects for customization
- **Support multiple instances** of the same component type per panel
- Components handle their own state management and lifecycle
- Table data MUST have 'id' property for row actions to work
- Support HTML content in table cells for badges and formatting

**Component Behaviors (loaded as .js files):**
- **ComponentUtils** - Component registry, message routing, and initialization lifecycle management
- **EnvironmentSelectorBehavior** - Environment selector webview interactions
- **SolutionSelectorBehavior** - Solution selector webview interactions  
- **DataTableBehavior** - Enhanced data table functionality with static message handling
- **ActionBarBehavior** - Action bar and button handling
- **PanelUtils** - Panel-level operations (loading states, messaging, error handling)
- **TableUtils** - Legacy table functionality (being phased out)

**Component Behavior Requirements (MANDATORY):**
All behavior scripts MUST implement these static methods for ComponentUtils integration:
```javascript
class ComponentBehavior {
    static initialize(componentId, config, element) { /* Component setup */ }
    static handleMessage(message) { /* Extension Host communication */ }
}

// REQUIRED: Global registration at end of script
if (window.ComponentUtils && window.ComponentUtils.registerBehavior) {
    window.ComponentUtils.registerBehavior('ComponentType', ComponentBehavior);
}
```

### Data Flow and Transformation Patterns

The extension follows a clear separation of concerns for data handling across architectural layers:

**Service Layer Responsibilities:**
- Return business data in domain-appropriate structures
- Focus on data accuracy, completeness, and business rules  
- Remain UI-agnostic and reusable across different consumers
- Handle API calls, authentication, and data aggregation

**Panel Layer Responsibilities:**
- Transform service data for specific UI display needs
- Map business objects to component-expected formats
- Handle UI-specific data enrichment (badges, formatting, computed fields)
- Ensure table data includes required 'id' property for row actions
- Coordinate between multiple services and components

**Component Layer Responsibilities:**
- Accept transformed data and render appropriately
- Handle component-specific state and user interactions
- Remain data-source agnostic and reusable

**Data Transformation Pattern:**
```typescript
// Service returns business data
const businessData = await serviceFactory.getService().getData(params);

// Panel transforms for UI display in private method
private transformDataForDisplay(businessData: BusinessDataType): UIDataType[] {
    return businessData.items.map(item => ({
        id: item.uniqueKey,                    // Required for row actions
        displayName: item.title || 'Untitled',
        status: this.calculateDisplayStatus(item),
        formattedDate: this.formatDate(item.created),
        // ... other UI-specific fields
    }));
}

// Component receives UI-ready data
const uiData = this.transformDataForDisplay(businessData);
this.dataTableComponent.setData(uiData);
```

This approach maintains separation of concerns while ensuring each layer handles appropriate responsibilities and enables consistent data flow patterns across all panels.

### Critical Requirements

**For DataTable HTML Structure (MANDATORY):**
DataTable components MUST always render required HTML elements for dynamic updates:

```typescript
// ✅ CORRECT: Always render tbody and include component ID
private static renderTable(config: DataTableConfig, state: DataTableViewState): string {
    return `
        <table id="${config.id}" class="data-table-element">
            ${this.renderTableHeader(config, visibleColumns, state)}
            ${this.renderTableBody(config, visibleColumns, state)}
        </table>
    `;
}

private static renderTableBody(config: DataTableConfig, state: DataTableViewState): string {
    const visibleData = this.getVisibleData(config, state);
    
    // ✅ CRITICAL: Always render tbody, even when empty (required for dynamic updates)
    return `
        <tbody class="data-table-tbody">
            ${visibleData.map((row, index) => 
                this.renderTableRow(row, index, columns, config, state)
            ).join('')}
        </tbody>
    `;
}

// ❌ WRONG: Conditional tbody rendering breaks DataTableBehavior updates
if (visibleData.length === 0) {
    return ''; // DataTableBehavior can't find tbody element to update
}
```

**For Table Implementation:**
```javascript
// Data objects MUST have 'id' property for row actions
const tableData = items.map(item => ({
    id: item.primaryKey,     // Required for TableUtils
    status: calculateStatus(item),  // Can contain HTML badges
    ...item
}));

// Initialize with action handlers
TableUtils.initializeTable('tableId', {
    onRowAction: handleRowAction  // (actionId, rowData) => void
});
```

**For Component Data Updates (MANDATORY):**
All panels MUST implement event bridge pattern for component updates to avoid unnecessary HTML regeneration:

```typescript
// In panel constructor - Set up event bridges for all components
this.components.forEach(component => {
    component.on('update', (event) => {
        this.postMessage({
            action: 'componentUpdate',
            componentId: event.componentId,
            data: component.getData()  // Get current component data
        });
    });
    
    component.on('stateChange', (event) => {
        this.postMessage({
            action: 'componentStateChange',
            componentId: event.componentId,
            state: event.state
        });
    });
});

// ❌ NEVER use updateWebview() for component data updates
// This causes full HTML regeneration and flash effects
```

**State Management:**
- Use StateService for UI state persistence (not data caching)
- Always make fresh API calls, only cache UI preferences
- Save panel state: selected environment, sort settings, view config

## Component Registry and Lifecycle Pattern (MANDATORY)

### **The Component Behavior Problem We Solved**

Initial implementation had behaviors that couldn't receive Extension Host messages, causing issues like:
- ❌ "ComponentUtils not available yet" errors
- ❌ "DataTable warning: No data provided - table will be empty" 
- ❌ Extension Host sends 292 rows but webview shows no data
- ❌ Component behaviors not receiving `componentUpdate` messages

### **Component Registry Pattern Solution**

All component behaviors MUST follow this exact pattern:

#### **1. Required Static Methods (Non-Negotiable)**
```javascript
class ComponentBehavior {
    static instances = new Map(); // Track component instances
    
    // ✅ REQUIRED: ComponentUtils calls this to initialize components
    static initialize(componentId, config, element) {
        if (!componentId || !element) {
            console.error('ComponentBehavior: componentId and element are required');
            return null;
        }
        
        // Prevent double initialization
        if (this.instances.has(componentId)) {
            return this.instances.get(componentId);
        }
        
        // Create and store instance
        const instance = {
            id: componentId,
            config: { ...config },
            element: element
        };
        
        this.instances.set(componentId, instance);
        return instance;
    }
    
    // ✅ REQUIRED: ComponentUtils routes Extension Host messages here
    static handleMessage(message) {
        if (!message || !message.componentId) {
            console.warn('Invalid message format', message);
            return;
        }
        
        // Handle specific message actions
        switch (message.action) {
            case 'componentUpdate':
                this.updateComponent(message.componentId, message.data);
                break;
            case 'stateChange':
                this.updateState(message.componentId, message.state);
                break;
            default:
                console.warn(`Unknown action: ${message.action}`);
        }
    }
}
```

#### **2. Global Registration Pattern (Critical)**
At the END of every behavior script file:
```javascript
// ✅ REQUIRED: Make behavior available globally
if (typeof window !== 'undefined') {
    window.ComponentBehavior = ComponentBehavior;
    
    // ✅ CRITICAL: Register with ComponentUtils for message routing
    if (window.ComponentUtils && window.ComponentUtils.registerBehavior) {
        window.ComponentUtils.registerBehavior('ComponentType', ComponentBehavior);
        console.log('ComponentBehavior registered with ComponentUtils');
    } else {
        console.log('ComponentBehavior loaded, ComponentUtils not available yet');
    }
}
```

#### **3. Script Loading Order (Essential)**
PanelComposer MUST load behaviors BEFORE ComponentUtils:
```typescript
// In PanelComposer.collectBehaviorScripts()
const scripts = [
    'js/utils/PanelUtils.js',                    // 1. Panel utilities first
    'js/components/EnvironmentSelectorBehavior.js', // 2. Component behaviors
    'js/components/DataTableBehavior.js',           // 3. More behaviors
    'js/utils/ComponentUtils.js'                    // 4. ComponentUtils LAST
];
```

### **Initialization Lifecycle**
1. **HTML renders** with `data-component-type` and `data-component-id` attributes
2. **Behavior scripts load** and register with `window.ComponentUtils.registerBehavior()`  
3. **ComponentUtils loads** and finds all registered behaviors
4. **Component initialization** - ComponentUtils calls each behavior's `initialize()` method
5. **Message routing active** - Extension Host messages routed to `handleMessage()` methods

### **Why This Pattern Works**
- ✅ **Eliminates "ComponentUtils not available yet" errors** - correct loading order
- ✅ **Enables Extension Host → Webview communication** - message routing works
- ✅ **Prevents double initialization** - instance tracking prevents conflicts  
- ✅ **Provides debugging information** - comprehensive logging throughout lifecycle
- ✅ **Supports multi-instance components** - each behavior manages multiple instances

## Component Update Communication

### Extension Host ↔ Webview Bridge Pattern

When components emit events in the Extension Host, they must be forwarded to the webview for UI updates. This avoids the performance penalty and visual flash of `updateWebview()`.

**Required Implementation Pattern:**

```typescript
// 1. In Panel Constructor - Set up event bridge for each component
constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, ...) {
    super(panel, extensionUri, ...);
    
    // Create components
    this.environmentSelector = ComponentFactory.createEnvironmentSelector({...});
    this.dataTable = ComponentFactory.createDataTable({...});
    
    // Set up event bridges - MANDATORY for all components
    this.setupComponentEventBridge(this.environmentSelector);
    this.setupComponentEventBridge(this.dataTable);
}

private setupComponentEventBridge(component: BaseComponent): void {
    component.on('update', (event) => {
        this.postMessage({
            action: 'componentUpdate',
            componentId: event.componentId,
            data: (component as any).getData?.() || null
        });
    });
    
    component.on('stateChange', (event) => {
        this.postMessage({
            action: 'componentStateChange',
            componentId: event.componentId,
            state: event.state
        });
    });
}
```

**Webview Behavior Scripts:**

```javascript
// In component behavior scripts (e.g., DataTableBehavior.js)
const DataTableBehavior = {
    initialize(componentId, config, element) {
        // Component-specific setup
        return this;
    },
    
    // Handle messages from Extension Host
    handleMessage(message) {
        if (message.action === 'componentUpdate' && message.componentId === this.componentId) {
            // Update UI with new data without full page refresh
            this.updateDisplayData(message.data);
        } else if (message.action === 'componentStateChange' && message.componentId === this.componentId) {
            // Handle state changes
            this.updateState(message.state);
        }
    }
};
```

**Benefits:**
- Eliminates visual flash from full HTML regeneration
- Improves performance by updating only changed components
- Maintains clean separation between Extension Host and webview contexts
- Enables granular component updates and state management

**Anti-Pattern to Avoid:**
```typescript
// ❌ DON'T DO THIS - Causes flash and poor performance
async handleLoadData() {
    const data = await this.service.getData();
    this.dataTable.setData(data);
    this.updateWebview(); // Regenerates entire HTML
}

// ✅ DO THIS - Use event bridge pattern instead
async handleLoadData() {
    const data = await this.service.getData();
    this.dataTable.setData(data); // Emits 'update' event, bridge forwards to webview
    // No updateWebview() call needed
}
```

## API Guidelines

**OData Query Best Practices:**
- Use `$select` to limit fields and improve performance
- Apply `$top` for pagination, `$orderby` for sorting
- Use `$expand` judiciously for related entities
- Dataverse API filtering preferred over in-memory filtering

**Authentication:**
- All API calls go through AuthenticationService
- Never create alternate authentication patterns
- Use proper token management with environment-specific tokens

## Development Guidelines

**File Organization:**
- Keep files small and single-purpose
- Follow established patterns in existing panels
- Use composition over inheritance
- Maintain consistent naming conventions

**Error Handling:**
- Implement comprehensive try/catch in message handlers
- Provide user-friendly error messages
- Use PanelUtils.showError() for consistent error display

**Testing:**
- Test with multiple environments and authentication methods
- Verify table functionality with row actions and context menus
- Test error scenarios and edge cases

## Component Development Guidelines

**Creating New Components:**
- Follow the four-file structure: Component.ts, View.ts, Behavior.js, styles.css
- Implement BaseComponent interface for consistency
- Use configuration objects for all customization
- Support multiple instances per panel
- Include comprehensive TypeScript types

**Component Communication:**
- Use observer pattern for component-to-component communication
- Emit typed events for state changes
- Handle parent panel message routing
- Maintain component isolation

**Component Testing:**
- Unit test component classes independently
- Test with various configuration combinations
- Mock webview behavior interactions
- Verify multi-instance scenarios

**Component Styling:**
- Use CSS custom properties for theming
- Follow VS Code design system
- Scope styles to component classes
- Support component composition layouts

## Webpack Bundling

Extension uses webpack for production optimization:
- Single bundled output: `dist/extension.js`  
- 92% size reduction (127KB vs 1.64MB)
- All dependencies bundled except VS Code API
- Source maps for debugging support

## Change Management Process

**Always Required for Changes:**
1. Update `CHANGELOG.md` under `[Unreleased]` section using Keep a Changelog format
2. Use semantic categories: Added, Changed, Fixed, Deprecated, Removed, Security, Technical
3. Run build verification: `npm run package`
4. Test extension functionality in Extension Development Host (F5)

**Verification Checklist Before Completion:**
- [ ] Build completes successfully (`npm run package`)
- [ ] TypeScript compilation passes (verified by webpack build)
- [ ] Extension loads without errors in Development Host
- [ ] CHANGELOG.md updated with changes
- [ ] All modified functionality tested

## Workflow Guidelines

**Making Code Changes:**
- Make minimal, well-scoped changes that preserve existing APIs
- Follow established patterns in existing files
- Test changes in Extension Development Host (F5) before completion
- Report build status and list modified files when done

**Communication Style:**
- Provide brief plan, execute changes, report results
- Keep responses concise and focused
- Include build/test status in completion reports

## Quick Reference - Do's and Don'ts

**DO:**
- ✅ Use ComponentFactory for ALL component creation in Extension Host
- ✅ Compose panels from reusable component instances
- ✅ Configure components through typed configuration objects
- ✅ Use PanelComposer.compose() to generate complete panel HTML
- ✅ Create component instances in constructor, compose in getHtmlContent()
- ✅ Use component-specific behavior scripts in webview
- ✅ Follow the Extension Host vs Webview separation strictly
- ✅ Support multiple instances of components per panel

**DON'T:**
- ❌ Try to use ComponentFactory in webview JavaScript
- ❌ Build HTML strings manually when components can do it
- ❌ Create custom HTML when reusable components exist
- ❌ Mix Extension Host and Webview contexts
- ❌ Access TypeScript classes from webview code
- ❌ Create one-off implementations instead of reusable components
- ❌ Skip component configuration - always use typed config objects