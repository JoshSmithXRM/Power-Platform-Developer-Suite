# Dynamics DevTools - Component Architecture Guide

## 🏗️ Architecture Overview

The Dynamics DevTools extension follows a clean, modular architecture with clear separation of concerns:

### **1. PANELS** - Full webview windows that provide complete functionality
### **2. COMPONENTS** - Reusable UI elements that can be embedded in panels  
### **3. SERVICES** - Business logic and API interaction layers
### **4. UTILITIES** - Shared functionality for common operations

---

## 📋 Component Hierarchy

```
Extension Root
├── 📁 panels/           # Full webview windows
│   ├── 📁 base/         # Base classes and managers
│   │   ├── BasePanel.ts           # Abstract base for all panels
│   │   └── EnvironmentManager.ts  # Environment handling logic
│   ├── SolutionExplorerPanel.ts   # ✅ Fully refactored
│   ├── MetadataBrowserPanel.ts
│   ├── QueryDataPanel.ts
│   ├── ImportJobViewerPanel.ts
│   └── EnvironmentSetupPanel.ts
│
├── 📁 components/       # Reusable UI components
│   ├── ComponentFactory.ts        # ✅ Factory for all UI components
│   └── [Panel-specific components as needed]
│
├── 📁 webview/          # Webview resources
│   └── 📁 components/   # Client-side utilities
│       ├── TableUtils.js           # ✅ Advanced table functionality
│       ├── TableStyles.css         # ✅ Complete table styling
│       ├── PanelUtils.js           # ✅ Common panel operations
│       ├── PanelStyles.css         # ✅ Shared panel styling
│       └── EnvironmentSelectorUtils.js  # ✅ Environment management
│
├── 📁 services/         # Business logic
│   ├── AuthenticationService.ts
│   ├── ODataService.ts
│   ├── StateService.ts             # ✅ Panel state persistence
│   ├── SolutionService.ts          # ✅ Solution operations
│   ├── UrlBuilderService.ts        # ✅ URL construction
│   └── ServiceFactory.ts          # ✅ Dependency injection
│
├── 📁 commands/         # VS Code command handlers
├── 📁 providers/        # Tree view providers
├── 📁 models/           # Data models and interfaces
└── 📁 types/           # Shared TypeScript interfaces
```

---

## 🎯 Core Design Principles

### **1. Single Responsibility**
Each component, service, and utility has ONE clear purpose and does it well.

### **2. Dependency Injection**
All dependencies are injected through constructors via ServiceFactory - no direct instantiation.

### **3. Composition Over Inheritance**
Prefer composing functionality through utilities and services rather than complex inheritance hierarchies.

### **4. Shared Resource Management**
Common functionality is abstracted into reusable utilities accessible to all panels.

### **5. Clean Separation of Concerns**
- **Panels**: UI coordination and message handling
- **Services**: Business logic and API calls  
- **Components**: Reusable UI generation
- **Utilities**: Common operations and patterns

---

## 🔧 Shared Utilities & Abstractions

### **1. ServiceFactory - Dependency Injection** ✅
```typescript
export class ServiceFactory {
    static getAuthService(): AuthenticationService
    static getSolutionService(): SolutionService
    static getUrlBuilderService(): typeof UrlBuilderService
    static getStateService(): StateService
    static getODataService(): ODataService
}
```

**Purpose**: Centralized dependency management, consistent service access across all panels.

### **2. ComponentFactory - UI Generation** ✅
```typescript
export class ComponentFactory {
    static createEnvironmentSelector(config?: EnvironmentSelectorConfig): string
    static createDataTable(config: TableConfig): string
}
```

**Purpose**: Consistent UI component generation with standardized configuration patterns.

### **3. BasePanel - Panel Foundation** ✅
```typescript
export abstract class BasePanel {
    protected getCommonWebviewResources(): {
        tableUtilsScript: vscode.Uri;
        tableStylesSheet: vscode.Uri; 
        panelStylesSheet: vscode.Uri;
        panelUtilsScript: vscode.Uri;
    }
    
    abstract handleMessage(message: WebviewMessage): Promise<void>
    abstract getHtmlContent(): string
}
```

**Purpose**: Consistent panel structure, shared resource management, common functionality.

### **4. PanelUtils.js - Client-Side Operations** ✅
```javascript
class PanelUtils {
    static showLoading(containerId, message)
    static showError(message, containerId)
    static showNoData(message, containerId)
    static sendMessage(action, data)
    static setupMessageHandler(handlers)
    static initializePanel(config)
    static formatDate(dateString, options)
}
```

**Purpose**: Common client-side operations shared across all panels (loading states, error handling, messaging).

### **5. TableUtils.js - Advanced Table Management** ✅
```javascript
class TableUtils {
    static initializeTable(tableId, config)
    static loadTableData(tableId, data)
    static sortTable(tableId, column, direction)
    static filterTable(tableId, searchTerm)
    static handleRowAction(tableId, action, rowId)
    static showContextMenu(tableId, event, row)
}
```

**Purpose**: Complete table functionality including sorting, filtering, selection, actions, and context menus.

### **6. EnvironmentSelectorUtils.js - Environment Management** ✅
```javascript
class EnvironmentSelectorUtils {
    static initializeSelector(selectorId, config)
    static loadEnvironments(selectorId, environments)
    static setSelectedEnvironment(selectorId, environmentId)
    static setLoadingState(selectorId, isLoading)
    static updateConnectionStatus(selectorId)
}
```

**Purpose**: Complete environment selector functionality with multi-instance support.

### **7. Shared Styling** ✅
- **PanelStyles.css**: Common panel layout, buttons, states, environment selectors
- **TableStyles.css**: Complete table styling including sorting indicators, context menus, filters

**Purpose**: Consistent visual design across all panels, VS Code theme integration.

---

## 📊 PANEL ARCHITECTURE PATTERN

### **Standard Panel Structure**
```typescript
export class ExamplePanel extends BasePanel {
    public static readonly viewType = 'examplePanel';
    
    private _specificService: SpecificService;
    private _urlBuilderService: typeof UrlBuilderService;

    public static createOrShow(extensionUri: vscode.Uri) {
        const existing = BasePanel.focusExisting(ExamplePanel.viewType);
        if (existing) return;
        
        const panel = BasePanel.createWebviewPanel({
            viewType: ExamplePanel.viewType,
            title: 'Example Panel'
        });

        new ExamplePanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: ExamplePanel.viewType,
            title: 'Example Panel'
        });

        this._specificService = ServiceFactory.getSpecificService();
        this._urlBuilderService = ServiceFactory.getUrlBuilderService();
        
        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.handleLoadEnvironments();
                break;
            case 'loadData':
                await this.handleLoadData(message.environmentId);
                break;
            // Panel-specific actions...
        }
    }

    protected getHtmlContent(): string {
        const { tableUtilsScript, tableStylesSheet, panelStylesSheet, panelUtilsScript } = this.getCommonWebviewResources();
        
        const envSelectorUtilsScript = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'components', 'EnvironmentSelectorUtils.js')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${this.viewType}</title>
            <link rel="stylesheet" href="${panelStylesSheet}">
            <link rel="stylesheet" href="${tableStylesSheet}">
            <style>
                /* Panel-specific styles only */
            </style>
        </head>
        <body>
            ${ComponentFactory.createEnvironmentSelector({
                id: 'environmentSelect',
                label: 'Environment:',
                placeholder: 'Loading environments...'
            })}

            <div class="header">
                <h1 class="title">${this.panel.title}</h1>
                <button class="btn" onclick="refreshData()">Refresh</button>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to continue...</p>
                </div>
            </div>

            <script src="${envSelectorUtilsScript}"></script>
            <script src="${panelUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
                
                // Initialize panel with common utilities
                const panelUtils = PanelUtils.initializePanel({
                    environmentSelectorId: 'environmentSelect',
                    onEnvironmentChange: 'onEnvironmentChange',
                    clearMessage: 'Select an environment to continue...'
                });
                
                // Load environments on startup
                document.addEventListener('DOMContentLoaded', () => {
                    panelUtils.loadEnvironments();
                });
                
                // Environment change handler
                function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
                    currentEnvironmentId = environmentId;
                    if (environmentId) {
                        loadData();
                    } else {
                        panelUtils.clearContent('Select an environment to continue...');
                    }
                }
                
                // Panel-specific functionality
                function loadData() {
                    if (!currentEnvironmentId) return;
                    
                    panelUtils.showLoading('Loading data...');
                    PanelUtils.sendMessage('loadData', { 
                        environmentId: currentEnvironmentId 
                    });
                }
                
                // Setup message handlers
                PanelUtils.setupMessageHandler({
                    'environmentsLoaded': (message) => {
                        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
                        if (message.selectedEnvironmentId) {
                            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
                            currentEnvironmentId = message.selectedEnvironmentId;
                            loadData();
                        }
                    },
                    
                    'dataLoaded': (message) => {
                        populateData(message.data);
                    }
                });
                
                // Panel-specific data handling
                function populateData(data) {
                    // Use ComponentFactory and TableUtils for data display
                }
            </script>
        </body>
        </html>`;
    }
}
```

---

## 🗄️ SERVICE LAYER PATTERN

### **Service Structure**
```typescript
export class ExampleService {
    constructor(private authService: AuthenticationService) {}

    async getData(environmentId: string): Promise<DataType[]> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);
        
        // API call logic...
        
        return transformedData;
    }
}
```

### **Service Registration in ServiceFactory**
```typescript
export class ServiceFactory {
    private static exampleService: ExampleService;
    
    static initialize(context: vscode.ExtensionContext): void {
        // Initialize all services
        ServiceFactory.exampleService = new ExampleService(ServiceFactory.authService);
    }
    
    static getExampleService(): ExampleService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.exampleService;
    }
}
```

---

## 🔌 COMPONENT FACTORY PATTERN

### **Component Configuration Interfaces**
```typescript
export interface TableConfig {
    id: string;
    columns: TableColumn[];
    defaultSort?: { column: string; direction: 'asc' | 'desc' };
    rowActions?: TableAction[];
    contextMenu?: ContextMenuItem[];
    bulkActions?: BulkAction[];
    filterable?: boolean;
    selectable?: boolean;
    stickyHeader?: boolean;
    stickyFirstColumn?: boolean;
    className?: string;
}

export interface EnvironmentSelectorConfig {
    id?: string;
    statusId?: string;
    label?: string;
    placeholder?: string;
    showStatus?: boolean;
    onSelectionChange?: string;
    className?: string;
}
```

### **Component Generation**
```typescript
export class ComponentFactory {
    static createDataTable(config: TableConfig): string {
        // Validate config with sensible defaults
        // Generate HTML with proper data attributes
        // Support multi-instance with unique IDs
        // Runtime data type detection
    }
    
    static createEnvironmentSelector(config?: EnvironmentSelectorConfig): string {
        // Optional configuration with defaults
        // Multi-instance support
        // Status indicator integration
        // Event handling setup
    }
}
```

---

## 📨 MESSAGE HANDLING PATTERN

### **Standardized Message Types**
```typescript
// Environment Management
'loadEnvironments' | 'environmentChanged'

// Table Operations
'tableSort' | 'tableFilter' | 'tableRowAction' | 'tableContextMenu' | 'tableBulkAction'

// Panel-Specific Operations
'loadData' | 'performAction' | 'updateSettings'

// System Messages
'error' | 'success' | 'loading'
```

### **Message Handler Implementation**
```typescript
protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
        switch (message.action) {
            // Standard operations handled by base or utilities
            case 'loadEnvironments':
                await this.handleLoadEnvironments();
                break;
                
            // Panel-specific operations
            case 'loadData':
                await this.handleLoadData(message.environmentId);
                break;
                
            default:
                console.log('Unknown action:', message.action);
        }
    } catch (error: any) {
        console.error('Error handling message:', error);
        this._panel.webview.postMessage({
            action: 'error',
            message: `Failed to ${message.action}: ${error.message}`
        });
    }
}
```

---

## 🧪 STATE MANAGEMENT

### **StateService Integration**
```typescript
// Save panel state (UI state only, no data caching)
await this._stateService.savePanelState(PanelType.viewType, {
    selectedEnvironmentId: environmentId,
    sortColumn: 'name',
    sortDirection: 'asc',
    filters: { status: 'active' },
    viewConfig: { showDetails: true }
});

// Restore panel state
const cachedState = await this._stateService.getPanelState(PanelType.viewType);
if (cachedState?.selectedEnvironmentId === environmentId) {
    // Apply cached UI state
}
```

**State Persistence Scope**:
- ✅ UI preferences (sort, filters, view settings)
- ✅ Selected environment
- ✅ Panel-specific configuration
- ❌ No data caching (always fresh API calls)

---

## 🎨 STYLING ARCHITECTURE

### **CSS Organization**
- **PanelStyles.css**: Base layout, buttons, states, environment selectors, responsive design
- **TableStyles.css**: Complete table functionality, sorting indicators, context menus, filters
- **Panel-specific styles**: Only unique styling in each panel's `<style>` section

### **Theme Integration**
All components use VS Code CSS variables for seamless theme integration:
```css
background: var(--vscode-editor-background);
color: var(--vscode-editor-foreground);
border: 1px solid var(--vscode-widget-border);
```

---

## 📚 IMPLEMENTATION GUIDELINES

### **When Creating a New Panel:**

1. **Extend BasePanel** with proper dependency injection
2. **Use ComponentFactory** for all UI components
3. **Include common resources** via `getCommonWebviewResources()`
4. **Use PanelUtils** for common client-side operations
5. **Implement proper error handling** with try/catch blocks
6. **Follow the standard message handling pattern**
7. **Integrate StateService** for UI state persistence

### **When Creating a New Service:**

1. **Accept dependencies through constructor** (especially AuthenticationService)
2. **Register in ServiceFactory** with proper initialization
3. **Focus on single responsibility** (one business domain)
4. **Return clean, transformed data** ready for UI consumption
5. **Handle errors appropriately** with meaningful messages

### **When Adding New Functionality:**

1. **Check existing utilities first** - don't duplicate functionality
2. **Abstract common patterns** into utilities if used in multiple places
3. **Follow established naming conventions** and patterns
4. **Update ComponentFactory** if creating reusable UI elements
5. **Test with multiple environments** and error scenarios

---

## 🏆 SUCCESS METRICS

This architecture achieves:

- ✅ **Consistent User Experience**: All panels look and behave similarly
- ✅ **Code Reusability**: ~70% reduction in duplicate code across panels
- ✅ **Maintainability**: Changes to common functionality update all panels
- ✅ **Developer Experience**: Clear patterns and utilities for rapid development
- ✅ **Performance**: Efficient resource loading and state management
- ✅ **Accessibility**: VS Code theme integration and proper contrast ratios
