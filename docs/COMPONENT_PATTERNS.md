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

## Environment Selection Lifecycle (MANDATORY PATTERN)

### ⚠️ Critical: onChange Callback Required

**Every panel using EnvironmentSelector MUST provide an onChange callback. Without it, the panel will not load data on initial open.**

### The Problem

BasePanel auto-selects the first environment when a panel opens. However, programmatically setting a dropdown value (`selector.value = envId`) **does not trigger DOM change events**. Therefore, the panel never receives notification that an environment was selected, and data never loads.

### The Solution

The EnvironmentSelectorComponent internally triggers the `onChange` callback when `setSelectedEnvironment()` is called. This works for **both** scenarios:
1. **Initial load**: BasePanel calls `setSelectedEnvironment()` → onChange fires → panel loads data
2. **User change**: User changes dropdown → onChange fires → panel loads data

### Pattern Implementation

```typescript
export class MyPanel extends BasePanel {
    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private myService: MyService;

    private initializeComponents(): void {
        // ✅ CORRECT: With onChange callback
        this.environmentSelectorComponent = this.componentFactory.createEnvironmentSelector({
            id: 'myPanel-envSelector',
            label: 'Environment',
            placeholder: 'Select an environment...',
            showRefreshButton: true,
            onChange: (environmentId: string) => {
                this.handleEnvironmentSelection(environmentId);
            }
        });
    }

    /**
     * Handles environment selection from BOTH:
     * - Initial auto-selection by BasePanel
     * - Manual user selection via dropdown
     */
    private handleEnvironmentSelection(environmentId: string): void {
        this.componentLogger.debug('Environment selected', { environmentId });

        if (!environmentId) {
            // Clear data when environment is deselected
            this.clearData();
            return;
        }

        // Load panel-specific data
        this.loadData(environmentId);
    }

    private async loadData(environmentId: string): Promise<void> {
        try {
            const data = await this.myService.getData(environmentId);
            // Update your components with data
            this.dataTableComponent?.setData(data);
        } catch (error) {
            this.componentLogger.error('Failed to load data', error as Error);
            vscode.window.showErrorMessage('Failed to load data: ' + (error as Error).message);
        }
    }
}
```

### ❌ Common Mistake

```typescript
// ❌ WRONG: No onChange callback
this.environmentSelectorComponent = this.componentFactory.createEnvironmentSelector({
    id: 'myPanel-envSelector',
    label: 'Environment'
    // Missing onChange!
});

// Panel opens → environment auto-selected → onChange not called → data never loads → EMPTY PANEL
```

### How BasePanel Auto-Selection Works

```typescript
// BasePanel.ts - loadEnvironmentsWithAutoSelect()
protected async loadEnvironmentsWithAutoSelect(): Promise<void> {
    const environments = await this.authService.getEnvironments();

    // Set environments in component
    environmentSelectorComponent.setEnvironments(environments);

    // Auto-select first environment (or restore from cache)
    const selectedEnvironmentId = environments[0]?.id;
    if (selectedEnvironmentId) {
        // This triggers the onChange callback internally ↓
        environmentSelectorComponent.setSelectedEnvironment(selectedEnvironmentId);
    }
}
```

```typescript
// EnvironmentSelectorComponent.ts - setSelectedEnvironment()
public setSelectedEnvironment(environmentId: string | null): void {
    this.selectedEnvironmentId = environmentId;

    // Update webview dropdown value
    this.notifyUpdate();

    // ✅ Trigger onChange callback (if provided)
    if (this.config.onChange) {
        this.config.onChange(environmentId || '');
    }
}
```

### Multiple Environment Selectors

When a panel needs multiple environment selectors (e.g., source/target for comparison):

```typescript
private initializeComponents(): void {
    this.sourceEnvSelector = this.componentFactory.createEnvironmentSelector({
        id: 'source-env',
        label: 'Source Environment:',
        onChange: (envId: string) => {
            this.sourceEnvironmentId = envId;
            this.compareEnvironments();
        }
    });

    this.targetEnvSelector = this.componentFactory.createEnvironmentSelector({
        id: 'target-env',
        label: 'Target Environment:',
        onChange: (envId: string) => {
            this.targetEnvironmentId = envId;
            this.compareEnvironments();
        }
    });
}
```

### When to Handle 'environment-changed' Message

**You typically do NOT need to handle the `environment-changed` message if you use onChange.**

The `environment-changed` message is sent from the webview when the user manually changes the dropdown. However, if you provide `onChange`, that callback handles both auto-selection and manual changes.

```typescript
// ❌ REDUNDANT: Don't do both
protected async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.command) {
        case 'environment-changed':
            // This is already handled by onChange callback
            // No need to handle it here too!
            break;
    }
}
```

**Exception**: Only handle `environment-changed` if you need to sync state between multiple selectors or have special validation logic.

### Debugging Checklist

If your panel is not loading data on initial open:

- [ ] Does EnvironmentSelector have `onChange` callback?
- [ ] Does the callback actually call your data loading method?
- [ ] Is `this` bound correctly? (Use arrow function or `.bind(this)`)
- [ ] Are you checking logs to confirm callback is firing?
- [ ] Is BasePanel actually auto-selecting? (Check `loadEnvironments()` was called)

```typescript
// ✅ Good debugging approach
onChange: (environmentId: string) => {
    this.componentLogger.info('🔄 Environment onChange fired', { environmentId }); // Log it!
    this.handleEnvironmentSelection(environmentId);
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

## View Helpers Pattern

### When to Use View Helpers vs Components

**View Helpers** are lightweight, stateless classes that generate HTML strings for panel-specific rendering logic that doesn't warrant a full component.

### Decision Tree

**Create a Component When**:
- ✅ Reusable across multiple panels
- ✅ Has state or lifecycle management
- ✅ Needs event handling
- ✅ Requires configuration validation
- ✅ Benefits from multi-instance tracking

**Create View Helpers When**:
- ✅ Panel-specific rendering logic
- ✅ Stateless HTML generation
- ✅ Type-specific formatting (e.g., different attribute types)
- ✅ Keeps panel file manageable
- ✅ No reuse expected across panels

### View Helper Structure

View helpers are static classes with static methods that return HTML strings:

```typescript
// src/panels/MetadataBrowserPanel/views/AttributePropertyView.ts

import { AttributeMetadata } from '../../../services/MetadataService';

export class AttributePropertyView {
    /**
     * Render complete attribute property view
     */
    static render(attribute: AttributeMetadata): string {
        return `
            <div class="property-view">
                ${this.renderCommonProperties(attribute)}
                ${this.renderTypeSpecificProperties(attribute)}
                ${this.renderManagedProperties(attribute)}
            </div>
        `;
    }

    /**
     * Render common properties (all attributes have these)
     */
    private static renderCommonProperties(attr: AttributeMetadata): string {
        return `
            <div class="property-section">
                <div class="property-section-title">General</div>
                <div class="property-row">
                    <span class="property-label">Display Name:</span>
                    <span class="property-value">${this.escapeHtml(attr.DisplayName?.UserLocalizedLabel?.Label || '')}</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Logical Name:</span>
                    <span class="property-value">${attr.LogicalName}</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Type:</span>
                    <span class="property-value">${attr.AttributeType}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render type-specific properties based on attribute type
     */
    private static renderTypeSpecificProperties(attr: AttributeMetadata): string {
        switch (attr.AttributeType) {
            case 'String':
                return this.renderStringProperties(attr);
            case 'Picklist':
            case 'State':
            case 'Status':
                return this.renderPicklistProperties(attr);
            case 'Lookup':
            case 'Customer':
            case 'Owner':
                return this.renderLookupProperties(attr);
            case 'Integer':
            case 'BigInt':
            case 'Decimal':
            case 'Double':
            case 'Money':
                return this.renderNumericProperties(attr);
            case 'DateTime':
                return this.renderDateTimeProperties(attr);
            case 'Boolean':
                return this.renderBooleanProperties(attr);
            default:
                return '';
        }
    }

    private static renderPicklistProperties(attr: AttributeMetadata): string {
        const options = attr.OptionSet?.Options || [];

        return `
            <div class="property-section">
                <div class="property-section-title">Choice Properties</div>
                <div class="property-row">
                    <span class="property-label">Default Value:</span>
                    <span class="property-value">${attr.DefaultFormValue ?? 'None'}</span>
                </div>
                ${options.length > 0 ? `
                    <div class="property-row">
                        <span class="property-label">Options:</span>
                        <span class="property-value">${options.length} option(s)</span>
                    </div>
                    <div class="property-list">
                        ${options.map(opt => `
                            <div class="property-list-item">
                                <span class="option-value">${opt.Value}</span>
                                <span class="option-label">${opt.Label?.UserLocalizedLabel?.Label || ''}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    private static renderLookupProperties(attr: AttributeMetadata): string {
        const targets = attr.Targets || [];

        return `
            <div class="property-section">
                <div class="property-section-title">Lookup Properties</div>
                <div class="property-row">
                    <span class="property-label">Target Entities:</span>
                    <span class="property-value">${targets.join(', ') || 'None'}</span>
                </div>
            </div>
        `;
    }

    // ... other type-specific renderers

    private static renderManagedProperties(attr: AttributeMetadata): string {
        return `
            <div class="property-section">
                <div class="property-section-title">Managed Properties</div>
                <div class="property-row">
                    <span class="property-label">Is Managed:</span>
                    <span class="property-value ${attr.IsManaged ? 'boolean-true' : 'boolean-false'}">
                        ${attr.IsManaged ? 'Yes' : 'No'}
                    </span>
                </div>
                <div class="property-row">
                    <span class="property-label">Is Customizable:</span>
                    <span class="property-value ${attr.IsCustomizable?.Value ? 'boolean-true' : 'boolean-false'}">
                        ${attr.IsCustomizable?.Value ? 'Yes' : 'No'}
                    </span>
                </div>
            </div>
        `;
    }

    /**
     * Escape HTML to prevent XSS
     */
    private static escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
```

### Usage in Panel

View helpers are imported and used in the Panel class (Extension Host context):

```typescript
// In MetadataBrowserPanel.ts

import { AttributePropertyView } from './views/AttributePropertyView';
import { RelationshipPropertyView } from './views/RelationshipPropertyView';

export class MetadataBrowserPanel extends BasePanel {

    private generateDetailPanelContent(item: any, itemType: string): string {
        switch (itemType) {
            case 'attribute':
                return AttributePropertyView.render(item);
            case 'relationship':
                return RelationshipPropertyView.render(item);
            // ... other types
            default:
                return '<p>No detail view available</p>';
        }
    }

    protected handleMessage(message: WebviewMessage): Promise<void> {
        if (message.command === 'row-clicked') {
            const detailHtml = this.generateDetailPanelContent(
                message.data.item,
                message.data.type
            );

            this.postMessage({
                command: 'show-detail-panel',
                html: detailHtml
            });
        }
    }
}
```

### Best Practices for View Helpers

1. **Keep Them Static**: All methods should be static - no instance state
2. **HTML Escaping**: Always escape user-provided text to prevent XSS
3. **Type Safety**: Use TypeScript interfaces for all parameters
4. **Modular**: Break down rendering into small, focused methods
5. **Reusable Within Panel**: Methods can be reused across different views
6. **Documentation**: Document what each renderer handles
7. **File Organization**: Keep in `panels/PanelName/views/` directory

### Example: Multiple View Helpers for One Panel

```
src/panels/MetadataBrowserPanel/
├── MetadataBrowserPanel.ts
└── views/
    ├── AttributePropertyView.ts      # Handles all attribute types
    ├── RelationshipPropertyView.ts   # Handles 1:N, N:1, N:N relationships
    ├── KeyPropertyView.ts            # Handles entity keys
    ├── PrivilegePropertyView.ts      # Handles privileges
    └── ChoicePropertyView.ts         # Handles global choices
```

### When View Helpers Might Become Components

If you find yourself needing view helpers in **multiple panels**, consider promoting them to components:

1. **Multiple panels need same rendering** → Create component
2. **Need state management** → Create component
3. **Need event handling** → Create component
4. **Need configuration** → Create component

**Example**: If both MetadataBrowser and a hypothetical "Schema Compare" panel need attribute rendering, promote `AttributePropertyView` to `AttributeDetailComponent`.

---

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

**Note**: See [Environment Selection Lifecycle](#environment-selection-lifecycle-mandatory-pattern) for why `onChange` is mandatory for EnvironmentSelector.

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