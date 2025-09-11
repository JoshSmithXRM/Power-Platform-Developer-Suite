# Component Design Patterns

This guide documents the reusable patterns for building components in the Power Platform Developer Suite. These patterns ensure consistency, maintainability, and extensibility across all components.

## Component Architecture Pattern

### Four-File Structure

Every component follows a consistent structure that separates concerns:

```
ComponentName/
├── ComponentNameComponent.ts    # Business logic and state management
├── ComponentNameView.ts         # HTML generation for Extension Host
├── ComponentNameConfig.ts       # Configuration interfaces and types
└── ComponentNameBehavior.js     # Webview interaction handling
```

**Additional Files**:
- `component-name.css` - Component-specific styling
- `ComponentName.test.ts` - Unit tests

### Responsibility Separation

#### **Component Class (TypeScript)**
- **Purpose**: Business logic, state management, configuration validation
- **Context**: Extension Host only
- **Responsibilities**:
  - Manage component state
  - Validate configuration
  - Emit events for state changes
  - Provide data access methods

```typescript
export class DataTableComponent extends BaseComponent {
    private data: TableRow[] = [];
    private config: DataTableConfig;

    constructor(config: DataTableConfig) {
        super(config);
        this.config = this.validateAndNormalizeConfig(config);
    }

    public setData(data: TableRow[]): void {
        this.data = [...data];
        this.processData();
        this.notifyUpdate(); // Triggers event bridge
    }

    public getData(): TableRow[] {
        return [...this.data]; // Return copy for immutability
    }
}
```

#### **View Class (TypeScript)**
- **Purpose**: HTML generation using configuration and state
- **Context**: Extension Host only
- **Responsibilities**:
  - Generate HTML strings
  - Apply configuration to templates
  - Ensure webview compatibility

```typescript
export class DataTableView {
    static render(config: DataTableConfig, data: TableRow[]): string {
        return `
            <table id="${config.id}" class="data-table" 
                   data-component-type="DataTable"
                   data-component-id="${config.id}">
                ${this.renderHeader(config)}
                ${this.renderBody(config, data)}
            </table>
        `;
    }

    private static renderHeader(config: DataTableConfig): string {
        return `
            <thead>
                <tr>
                    ${config.columns.map(col => 
                        `<th data-column="${col.key}">${col.label}</th>`
                    ).join('')}
                </tr>
            </thead>
        `;
    }
}
```

#### **Behavior Script (JavaScript)**
- **Purpose**: User interaction, DOM manipulation, Extension Host communication
- **Context**: Webview only
- **Responsibilities**:
  - Handle user interactions
  - Update DOM efficiently
  - Communicate with Extension Host

```javascript
class DataTableBehavior {
    static instances = new Map();

    static initialize(componentId, config, element) {
        if (!componentId || !element) return null;
        if (this.instances.has(componentId)) return this.instances.get(componentId);

        const instance = {
            id: componentId,
            config: { ...config },
            element: element,
            tbody: element.querySelector('tbody')
        };

        this.setupEventListeners(instance);
        this.instances.set(componentId, instance);
        return instance;
    }

    static handleMessage(message) {
        if (!message?.componentId) return;

        switch (message.action) {
            case 'setData':
                this.updateTableData(message.componentId, message.data);
                break;
            case 'setColumns':
                this.updateTableColumns(message.componentId, message.data);
                break;
        }
    }

    static updateTableData(componentId, data) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Efficient DOM update without full regeneration
        instance.tbody.innerHTML = '';
        data.forEach(row => {
            const tr = this.createTableRow(row, instance.config);
            instance.tbody.appendChild(tr);
        });
    }
}

// Required: Global registration
window.DataTableBehavior = DataTableBehavior;
if (window.ComponentUtils?.registerBehavior) {
    window.ComponentUtils.registerBehavior('DataTable', DataTableBehavior);
}
```

## Configuration Pattern

### Type-Safe Configuration

All components use strongly-typed configuration objects:

```typescript
export interface DataTableConfig extends BaseComponentConfig {
    id: string;                          // Required: Unique identifier
    columns: TableColumn[];              // Required: Column definitions
    data?: TableRow[];                   // Optional: Initial data
    sortable?: boolean;                  // Optional: Enable sorting
    filterable?: boolean;                // Optional: Enable filtering
    rowActions?: TableAction[];          // Optional: Row action buttons
    onRowClick?: (row: TableRow) => void; // Optional: Row click handler
}

export const DEFAULT_DATA_TABLE_CONFIG: Partial<DataTableConfig> = {
    sortable: true,
    filterable: false,
    data: []
};
```

### Configuration Validation Pattern

```typescript
export class DataTableComponent extends BaseComponent {
    private validateAndNormalizeConfig(config: DataTableConfig): DataTableConfig {
        // Validate required properties
        if (!config.id) {
            throw new Error('DataTable: id is required');
        }
        
        if (!config.columns || config.columns.length === 0) {
            throw new Error('DataTable: columns are required');
        }

        // Merge with defaults
        return {
            ...DEFAULT_DATA_TABLE_CONFIG,
            ...config
        };
    }
}
```

## Event Communication Pattern

### Observer Pattern Implementation

Components use EventEmitter for loose coupling:

```typescript
// BaseComponent provides event infrastructure
export abstract class BaseComponent extends EventEmitter {
    protected config: BaseComponentConfig;

    protected notifyUpdate(): void {
        this.emit('update', {
            componentId: this.config.id,
            timestamp: Date.now()
        });
    }

    protected notifyStateChange(state: any): void {
        this.emit('stateChange', {
            componentId: this.config.id,
            state: state,
            timestamp: Date.now()
        });
    }

    protected notifyError(error: Error, context?: string): void {
        this.emit('error', {
            componentId: this.config.id,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context: context,
            timestamp: Date.now()
        });
    }
}
```

### Panel Event Bridge Pattern

Panels must setup event bridges for each component:

```typescript
export class MyPanel extends BasePanel {
    private setupComponentEventBridges(): void {
        // Data update bridge
        this.dataTable.on('update', (event) => {
            this.postMessage({
                command: 'component-event',
                componentId: event.componentId,
                eventType: 'dataUpdated',
                action: 'setData',
                data: this.dataTable.getData()
            });
        });

        // Configuration change bridge
        this.dataTable.on('stateChange', (event) => {
            this.postMessage({
                command: 'component-event',
                componentId: event.componentId,
                eventType: 'configChanged',
                action: 'updateState',
                state: event.state
            });
        });

        // Error handling bridge
        this.dataTable.on('error', (event) => {
            this.postMessage({
                command: 'component-error',
                componentId: event.componentId,
                error: event.error
            });
        });
    }
}
```

## Factory Integration Pattern

### Component Registration

All components must be registered in ComponentFactory:

```typescript
export class ComponentFactory {
    public createDataTable(config: DataTableConfig): DataTableComponent {
        this.validateComponentConfig(config, 'DataTable');
        
        const component = new DataTableComponent(config);
        this.trackInstance(config.id, 'DataTable', component);
        
        return component;
    }

    private validateComponentConfig(config: any, type: string): void {
        if (!config?.id) {
            throw new Error(`Component ID is required for ${type}`);
        }

        if (this.instances.has(config.id)) {
            throw new Error(`Component with ID '${config.id}' already exists`);
        }
    }
}
```

### Component Dependencies

Components that depend on services use dependency injection:

```typescript
export class EnvironmentSelectorComponent extends BaseComponent {
    constructor(
        config: EnvironmentSelectorConfig,
        private environmentService: EnvironmentService = ServiceFactory.getEnvironmentService()
    ) {
        super(config);
        this.initializeEnvironments();
    }

    private async initializeEnvironments(): Promise<void> {
        try {
            const environments = await this.environmentService.getEnvironments();
            this.setEnvironments(environments);
        } catch (error) {
            this.notifyError(error as Error, 'Failed to load environments');
        }
    }
}
```

## Multi-Instance Support Pattern

### Instance Management

Components must support multiple instances per panel:

```typescript
// Multiple instances with unique IDs
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

### Behavior Instance Tracking

Behavior scripts must track multiple instances:

```javascript
class EnvironmentSelectorBehavior {
    static instances = new Map();

    static initialize(componentId, config, element) {
        // Prevent duplicate initialization
        if (this.instances.has(componentId)) {
            return this.instances.get(componentId);
        }

        const instance = {
            id: componentId,
            config: { ...config },
            element: element,
            dropdown: element.querySelector('select'),
            statusElement: element.querySelector('.status')
        };

        this.setupInstanceEventListeners(instance);
        this.instances.set(componentId, instance);
        return instance;
    }

    static handleMessage(message) {
        // Route to specific instance
        const instance = this.instances.get(message.componentId);
        if (!instance) return;

        switch (message.action) {
            case 'environmentsLoaded':
                this.updateEnvironmentOptions(instance, message.data);
                break;
            case 'environmentSelected':
                this.selectEnvironment(instance, message.data.environmentId);
                break;
        }
    }
}
```

## State Management Patterns

### Component State Lifecycle

```typescript
export class BaseComponent extends EventEmitter {
    protected state: ComponentState = {
        initialized: false,
        loading: false,
        error: null,
        data: null
    };

    protected setState(newState: Partial<ComponentState>): void {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        this.notifyStateChange({
            oldState,
            newState: this.state
        });
    }

    public getState(): ComponentState {
        return { ...this.state }; // Return copy
    }
}
```

### Loading State Pattern

```typescript
export class DataTableComponent extends BaseComponent {
    public async loadData(params: any): Promise<void> {
        this.setState({ loading: true, error: null });

        try {
            const data = await this.dataService.fetchData(params);
            this.setData(data);
            this.setState({ loading: false });
        } catch (error) {
            this.setState({ 
                loading: false, 
                error: error as Error 
            });
            this.notifyError(error as Error, 'Failed to load data');
        }
    }
}
```

## Error Handling Patterns

### Component Error States

```typescript
// Component error handling
export class BaseComponent extends EventEmitter {
    protected handleError(error: Error, context: string, recoverable: boolean = true): void {
        this.setState({ 
            error: {
                message: error.message,
                context: context,
                recoverable: recoverable,
                timestamp: Date.now()
            }
        });

        this.notifyError(error, context);
    }
}
```

### Webview Error Display

```javascript
class ComponentBehavior {
    static showError(instance, error, context) {
        const errorElement = instance.element.querySelector('.error-display') || 
            this.createErrorElement(instance);

        errorElement.innerHTML = `
            <div class="error-message">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${error.message}</span>
                ${error.recoverable ? '<button class="retry-button">Retry</button>' : ''}
            </div>
        `;

        errorElement.style.display = 'block';
    }

    static clearError(instance) {
        const errorElement = instance.element.querySelector('.error-display');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
}
```

## Testing Patterns

### Component Unit Testing

```typescript
describe('DataTableComponent', () => {
    let component: DataTableComponent;
    let mockConfig: DataTableConfig;

    beforeEach(() => {
        mockConfig = {
            id: 'test-table',
            columns: [
                { key: 'name', label: 'Name' },
                { key: 'status', label: 'Status' }
            ]
        };
        component = new DataTableComponent(mockConfig);
    });

    it('should emit update event when data changes', () => {
        const updateSpy = jest.fn();
        component.on('update', updateSpy);

        const testData = [
            { id: '1', name: 'Test', status: 'Active' }
        ];

        component.setData(testData);

        expect(updateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                componentId: 'test-table'
            })
        );
    });
});
```

### Behavior Testing Pattern

```javascript
// Mock ComponentUtils for testing
global.ComponentUtils = {
    registerBehavior: jest.fn(),
    sendMessage: jest.fn()
};

describe('DataTableBehavior', () => {
    let mockElement;

    beforeEach(() => {
        mockElement = {
            id: 'test-table',
            querySelector: jest.fn(),
            addEventListener: jest.fn()
        };
    });

    it('should initialize instance correctly', () => {
        const instance = DataTableBehavior.initialize('test-table', {}, mockElement);
        
        expect(instance).not.toBeNull();
        expect(instance.id).toBe('test-table');
        expect(DataTableBehavior.instances.has('test-table')).toBe(true);
    });
});
```

## Pattern Enforcement

### **Automated Compliance**

Component patterns are reinforced through development tooling:

**ESLint Integration**:
- Factory pattern usage verification
- Base class extension requirements  
- Component communication pattern enforcement

**Development Guidelines**:
- Use `ComponentFactory` for all component instantiation
- Extend appropriate base classes (`BaseComponent`, `BasePanel`)
- Implement proper event bridges for component updates
- Follow logging architecture patterns

## Related Documentation

These patterns provide a consistent foundation for building maintainable, testable, and reusable components. For additional guidance:

- **[Architecture Guide](ARCHITECTURE_GUIDE.md)** - High-level architectural principles and SOLID design patterns
- **[Styling Patterns](STYLING_PATTERNS.md)** - CSS architecture and visual consistency for components
- **[Development Guide](DEVELOPMENT_GUIDE.md)** - Practical workflow for implementing these patterns

Follow these patterns when creating new components or modifying existing ones to ensure architectural consistency across the extension.