# Dynamics DevTools - Component Architecture Guide

## 🏗️ Architecture Overview

The Dynamics DevTools extension follows a clean, modular architecture with three distinct layers:

### **1. PANELS** - Full webview windows that provide complete functionality
### **2. COMPONENTS** - Reusable UI elements that can be embedded in panels  
### **3. VIEWS** - Data presentation logic that transforms raw data into UI-ready formats

---

## 📋 Component Hierarchy

```
Extension Root
├── 📁 panels/           # Full webview windows
│   ├── 📁 base/         # Base classes and managers
│   │   ├── BasePanel.ts           # Abstract base for all panels
│   │   └── EnvironmentManager.ts  # Environment handling logic
│   ├── SolutionExplorerPanel.ts
│   ├── MetadataBrowserPanel.ts
│   ├── QueryDataPanel.ts
│   ├── ImportJobViewerPanel.ts
│   └── RecordCloningPanel.ts     # (future)
│
├── 📁 components/       # Reusable UI components
│   ├── 📁 base/         # Base component classes
│   │   └── BaseComponent.ts      # Abstract base for components
│   ├── EnvironmentSelector.ts
│   ├── DataTable.ts
│   ├── StatusBadge.ts
│   ├── FilterControls.ts
│   └── ProgressIndicator.ts
│
├── 📁 views/            # Data presentation logic
│   ├── SolutionListView.ts
│   ├── EntityMetadataView.ts
│   ├── QueryResultView.ts
│   └── ClonePreviewView.ts       # (future)
│
├── 📁 services/         # Business logic
│   ├── AuthenticationService.ts
│   ├── ODataService.ts
│   └── StateService.ts           # Panel state persistence
│
├── 📁 commands/         # VS Code command handlers
├── 📁 providers/        # Tree view providers
└── 📁 types/           # Shared interfaces
```

---

## 🎯 Component Design Principles

### **1. Single Responsibility**
Each component has ONE clear purpose and does it well.

### **2. Dependency Injection**
All dependencies are injected through constructors - no direct instantiation.

### **3. Reusability**
Components can be used across multiple panels without modification.

### **4. State Management**
Components manage their own internal state but expose clean APIs for external control.

### **5. Event-Driven Communication**
Components communicate through well-defined events and message passing.

---

## 📊 PANELS - Full Webview Windows

Panels are complete, standalone webview windows that provide full functionality to users.

### **Panel Structure**
```typescript
export class ExamplePanel extends BasePanel {
    public static readonly viewType = 'examplePanel';
    
    // Required: Both creation methods
    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService): void
    public static createNew(extensionUri: vscode.Uri, authService: AuthenticationService): void
    
    // Private constructor with dependency injection
    private constructor(panel, extensionUri, authService, odataService, stateService)
    
    // Required implementations
    protected handleMessage(message: WebviewMessage): Promise<void>
    protected getHtmlContent(): string
    protected getPanelSpecificJs(): string
}
```

### **Panel Creation Pattern (STANDARD)**
```typescript
public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
    // Always try to focus existing first
    const existing = BasePanel.focusExisting(ExamplePanel.viewType);
    if (existing) {
        return;
    }
    
    // Create new if none exists
    ExamplePanel.createNew(extensionUri, authService);
}

public static createNew(extensionUri: vscode.Uri, authService: AuthenticationService) {
    const panel = BasePanel.createWebviewPanel({
        viewType: ExamplePanel.viewType,
        title: 'Example Panel',
        enableScripts: true,
        retainContextWhenHidden: true,
        enableFindWidget: true
    });

    // Inject all dependencies
    const odataService = new ODataService();
    const stateService = StateService.getInstance();
    
    new ExamplePanel(panel, extensionUri, authService, odataService, stateService);
}
```

### **Panel HTML Template (STANDARD)**
```typescript
protected getHtmlContent(): string {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.viewType}</title>
        <style>
            ${ComponentFactory.getBaseCss()}
            ${ComponentFactory.getDataTableCss()}
            ${this.getPanelSpecificCss()}
        </style>
    </head>
    <body>
        ${ComponentFactory.createEnvironmentSelector()}
        
        <div class="header">
            <h1 class="title">${this.panel.title}</h1>
            <div class="header-actions">
                ${this.getHeaderActions()}
            </div>
        </div>
        
        <div id="content">
            ${this.getContentHtml()}
        </div>
        
        <script>
            const vscode = acquireVsCodeApi();
            ${ComponentFactory.getEnvironmentSelectorJs()}
            ${ComponentFactory.getDataTableJs()}
            ${this.getPanelSpecificJs()}
        </script>
    </body>
    </html>`;
}
```

---

## 🧩 COMPONENTS - Reusable UI Elements

Components are reusable UI elements that can be embedded in multiple panels.

### **Component Guidelines**

#### **1. EnvironmentSelector Component**
```typescript
class EnvironmentSelector {
    static getHtml(): string
    static getCss(): string  
    static getJs(): string
    static handleMessage(message: WebviewMessage): void
}
```

#### **2. DataTable Component**
```typescript
class DataTable {
    static getHtml(config: TableConfig): string
    static getCss(): string
    static getJs(): string
    static generateTable(data: any[], columns: TableColumn[]): string
}

interface TableConfig {
    id: string;
    columns: TableColumn[];
    sortable: boolean;
    filterable: boolean;
    selectable: boolean;
    stickyHeader: boolean;
}

interface TableColumn {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    renderer?: (value: any, row: any) => string;
}
```

#### **3. StatusBadge Component**
```typescript
class StatusBadge {
    static render(status: string, type: BadgeType): string
    static getCss(): string
}

enum BadgeType {
    Success = 'success',
    Error = 'error', 
    Warning = 'warning',
    Info = 'info',
    Managed = 'managed',
    Unmanaged = 'unmanaged'
}
```

### **Component Factory Pattern**
```typescript
export class ComponentFactory {
    static createEnvironmentSelector(config?: EnvironmentSelectorConfig): string
    static createDataTable(config: TableConfig): string
    static createStatusBadge(status: string, type: BadgeType): string
    static createFilterControls(config: FilterConfig): string
    
    // Aggregate CSS/JS methods
    static getBaseCss(): string
    static getDataTableCss(): string
    static getEnvironmentSelectorJs(): string
    static getDataTableJs(): string
}
```

---

## 📋 VIEWS - Data Presentation Logic

Views transform raw data into UI-ready formats and handle data-specific rendering logic.

### **View Structure**
```typescript
export abstract class BaseView<TData, TConfig> {
    constructor(protected config: TConfig) {}
    
    abstract transform(data: TData[]): ViewData
    abstract getColumns(): TableColumn[]
    abstract getFilterOptions(): FilterOption[]
    
    render(data: TData[]): string {
        const viewData = this.transform(data);
        return ComponentFactory.createDataTable({
            columns: this.getColumns(),
            data: viewData,
            ...this.config
        });
    }
}
```

### **Example View Implementation**
```typescript
export class SolutionListView extends BaseView<Solution, SolutionViewConfig> {
    transform(solutions: Solution[]): ViewData {
        return solutions.map(solution => ({
            id: solution.solutionid,
            name: solution.friendlyname,
            version: solution.version,
            managed: solution.ismanaged,
            publisher: solution.publishername,
            status: this.getStatusBadge(solution),
            actions: this.getActionButtons(solution)
        }));
    }
    
    getColumns(): TableColumn[] {
        return [
            { key: 'name', label: 'Solution Name', sortable: true },
            { key: 'version', label: 'Version', sortable: true },
            { key: 'managed', label: 'Type', renderer: this.renderManagedBadge },
            { key: 'publisher', label: 'Publisher', sortable: true },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions', sortable: false }
        ];
    }
    
    private renderManagedBadge(managed: boolean): string {
        return ComponentFactory.createStatusBadge(
            managed ? 'Managed' : 'Unmanaged',
            managed ? BadgeType.Managed : BadgeType.Unmanaged
        );
    }
}
```

---

## 🗄️ STATE MANAGEMENT

### **StateService for Panel Persistence**
```typescript
export class StateService {
    private static instance: StateService;
    
    // Save panel state
    async savePanelState(panelType: string, state: PanelState): Promise<void>
    
    // Restore panel state
    async getPanelState(panelType: string): Promise<PanelState | null>
    
    // Clear panel state
    async clearPanelState(panelType: string): Promise<void>
    
    // State change events
    onStateChanged: vscode.Event<StateChangedEvent>
}

interface PanelState {
    selectedEnvironmentId?: string;
    filters?: Record<string, any>;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    selectedItems?: string[];
    viewConfig?: any;
}
```

### **Panel State Integration**
```typescript
export class ExamplePanel extends BasePanel {
    private stateService: StateService;
    
    protected async initialize(): Promise<void> {
        // Restore panel state
        const savedState = await this.stateService.getPanelState(this.viewType);
        if (savedState) {
            this.restoreState(savedState);
        }
        
        super.initialize();
    }
    
    private async saveCurrentState(): Promise<void> {
        const state: PanelState = {
            selectedEnvironmentId: this.environmentManager.selectedEnvironmentId,
            filters: this.getCurrentFilters(),
            sortColumn: this.currentSort.column,
            sortDirection: this.currentSort.direction
        };
        
        await this.stateService.savePanelState(this.viewType, state);
    }
}
```

---

## 🔌 DEPENDENCY INJECTION

### **Service Injection Pattern**
```typescript
// ❌ OLD WAY - Direct instantiation
constructor(panel, extensionUri, authService) {
    this.odataService = new ODataService(); // Bad!
}

// ✅ NEW WAY - Dependency injection  
constructor(panel, extensionUri, authService, odataService, stateService) {
    this.authService = authService;
    this.odataService = odataService;
    this.stateService = stateService;
}
```

### **Service Factory**
```typescript
export class ServiceFactory {
    private static authService: AuthenticationService;
    private static odataService: ODataService;
    private static stateService: StateService;
    
    static initialize(context: vscode.ExtensionContext): void {
        this.authService = AuthenticationService.getInstance(context);
        this.odataService = new ODataService();
        this.stateService = StateService.getInstance(context);
    }
    
    static getAuthService(): AuthenticationService {
        return this.authService;
    }
    
    static getODataService(): ODataService {
        return this.odataService;
    }
    
    static getStateService(): StateService {
        return this.stateService;
    }
}
```

---

## 📨 MESSAGE HANDLING PATTERN

### **Standardized Message Handling**
```typescript
protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
        switch (message.action) {
            // Standard component messages
            case 'loadEnvironments':
                await this.environmentManager.loadEnvironments();
                break;
                
            case 'environmentChanged':
                await this.handleEnvironmentChange(message.environmentId);
                break;
                
            case 'tableSort':
                await this.handleTableSort(message.column, message.direction);
                break;
                
            case 'tableFilter':
                await this.handleTableFilter(message.filters);
                break;
                
            // Panel-specific messages
            case 'loadSolutions':
                await this.loadSolutions();
                break;
                
            case 'openSolution':
                await this.openSolution(message.solutionId, message.mode);
                break;
                
            default:
                console.warn(`Unknown message action: ${message.action}`);
        }
    } catch (error) {
        this.handleError(error, message.action);
    }
}

private handleError(error: any, action: string): void {
    console.error(`Error handling ${action}:`, error);
    
    // Show user-friendly error
    this.postMessage({
        action: 'error',
        message: `Failed to ${action}: ${error.message}`,
        details: error
    });
    
    // Also show VS Code notification for critical errors
    if (this.isCriticalError(error)) {
        vscode.window.showErrorMessage(`Dynamics DevTools: ${error.message}`);
    }
}
```

---

## 🚀 GETTING STARTED

### **Creating a New Panel**

1. **Create panel class extending BasePanel**
2. **Implement required methods (createOrShow, createNew, handleMessage, getHtmlContent)**
3. **Use ComponentFactory for UI elements**
4. **Implement state persistence**
5. **Register commands in appropriate command handler**
6. **Add to extension.ts activation**

### **Creating a New Component**

1. **Create component class with static methods**
2. **Implement getHtml(), getCss(), getJs()**
3. **Add to ComponentFactory**
4. **Document usage patterns**

### **Creating a New View**

1. **Extend BaseView with appropriate generics**
2. **Implement transform(), getColumns(), getFilterOptions()**
3. **Define view-specific interfaces**
4. **Add to view registry**

---

## 📚 NEXT STEPS

1. **Implement StateService for panel persistence**
2. **Create ComponentFactory with standardized components**
3. **Refactor existing panels to use new patterns**
4. **Create BaseView abstract class**
5. **Implement dependency injection throughout**
6. **Add error handling standards**
