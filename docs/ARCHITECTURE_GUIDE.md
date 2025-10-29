# Power Platform Developer Suite - Architecture Guide

## Overview

The Power Platform Developer Suite is a VS Code extension built on **component-based architecture** with strict **separation of concerns** and **SOLID design principles**. This guide documents the architectural decisions, design patterns, and principles that govern the extension's structure.

## Architectural Philosophy

### SOLID Principles in Practice

#### **Single Responsibility Principle (SRP)**
Each class has one reason to change:
- **Panels**: Orchestrate component composition and handle user interactions
- **Components**: Manage specific UI functionality and state
- **Services**: Handle business logic and API interactions
- **Factories**: Create and configure object instances

#### **Open/Closed Principle (OCP)**
Components are open for extension through configuration, closed for modification:
```typescript
// Extend behavior through configuration, not code modification
const table = ComponentFactory.createDataTable({
    filterable: true,           // Extend with filtering
    sortable: true,             // Extend with sorting
    rowActions: customActions   // Extend with custom actions
});
```

#### **Liskov Substitution Principle (LSP)**
All components implement consistent base contracts:
```typescript
// Any component can be used wherever BaseComponent is expected
const components: BaseComponent[] = [
    environmentSelector,
    dataTable,
    actionBar
];
```

#### **Interface Segregation Principle (ISP)**
Components depend only on interfaces they use:
```typescript
// Components only expose methods relevant to their functionality
interface DataTableInterface {
    setData(data: TableRow[]): void;
    setColumns(columns: TableColumn[]): void;
    // No unrelated methods from other component types
}
```

#### **Dependency Inversion Principle (DIP)**
High-level modules depend on abstractions, not concretions:
```typescript
// Panels depend on abstract component interfaces, not concrete implementations
class MyPanel extends BasePanel {
    constructor(
        private componentFactory: ComponentFactoryInterface,
        private authService: AuthenticationServiceInterface
    ) {
        // Dependencies injected, not directly instantiated
    }
}
```

## Architectural Layers

### **1. Extension Host Layer (TypeScript/Node.js)**
**Responsibility**: Business logic, API calls, HTML generation, service orchestration

**Key Components**:
- Panels (orchestration)
- Services (business logic)
- ComponentFactory (object creation)
- ServiceFactory (dependency injection)

**Characteristics**:
- Has access to VS Code APIs and Node.js runtime
- Generates HTML for webview consumption
- Manages component state and lifecycle
- Handles authentication and API communication

### **2. Webview Layer (JavaScript/Browser)**
**Responsibility**: User interaction, DOM manipulation, event handling

**Key Components**:
- Component behaviors (interaction logic)
- ComponentUtils (message routing)
- PanelUtils (utility functions)

**Characteristics**:
- Runs in isolated browser sandbox
- No access to VS Code APIs or TypeScript classes
- Communicates with Extension Host via postMessage
- Handles user interactions and visual updates

### **3. Communication Layer**
**Responsibility**: Message passing between Extension Host and Webview

**Pattern**: Event-driven communication using observer pattern

**Extension Host Side**:
```typescript
// Extension Host emits events
component.on('update', (event) => {
    this.postMessage({
        command: 'component-event',
        componentId: event.componentId,
        action: 'componentUpdate',
        data: component.getData()
    });
});
```

**Webview Side (Using BaseBehavior)**:
```javascript
// Webview behaviors extend BaseBehavior for enforced patterns
class MyComponentBehavior extends BaseBehavior {
    static getComponentType() {
        return 'MyComponent';
    }

    // REQUIRED: Automatically handles 'componentUpdate' action
    static onComponentUpdate(instance, data) {
        this.updateComponent(instance, data);
    }

    // OPTIONAL: Handle other custom actions
    static handleCustomAction(instance, message) {
        switch (message.action) {
            case 'customAction':
                this.handleCustom(instance, message.data);
                break;
        }
    }
}

MyComponentBehavior.register();
```

**Key Benefits**:
- **Type safety**: Extension Host uses TypeScript with full IDE support
- **Enforced patterns**: BaseBehavior ensures `componentUpdate` is never forgotten
- **Registry-based routing**: No hardcoded message switches
- **Separation of concerns**: Business logic (Extension Host) vs UI updates (Webview)

## Design Patterns

### **Factory Pattern**
**Purpose**: Centralize object creation and configuration
**Implementation**: ComponentFactory and ServiceFactory classes

**Benefits**:
- Type-safe component creation
- Consistent configuration interfaces
- Dependency injection support
- Simplified testing through mocking

```typescript
// Factory encapsulates creation logic
export class ComponentFactory {
    createDataTable(config: DataTableConfig): DataTableComponent {
        this.validateConfig(config);
        const component = new DataTableComponent(config);
        this.trackInstance(component);
        return component;
    }
}
```

### **Observer Pattern**
**Purpose**: Enable loose coupling between components and panels
**Implementation**: EventEmitter-based component communication

**Benefits**:
- Components notify state changes without tight coupling
- Panels can react to component events
- Supports multiple listeners per component

```typescript
// Components emit events for state changes
export class BaseComponent extends EventEmitter {
    protected notifyUpdate(): void {
        this.emit('update', { componentId: this.config.id });
    }
}

// Panels listen for component events
component.on('update', (event) => {
    this.handleComponentUpdate(event);
});
```

### **Composition Pattern**
**Purpose**: Build complex panels from simple, reusable components
**Implementation**: PanelComposer and component instances

**Benefits**:
- Promotes code reuse across panels
- Enables flexible panel layouts
- Simplifies testing of individual components

```typescript
// Panels composed from multiple components
export class MyPanel extends BasePanel {
    protected getHtmlContent(): string {
        return PanelComposer.compose([
            this.environmentSelector,
            this.dataTable,
            this.actionBar
        ], this.getCommonWebviewResources());
    }
}
```

### **Strategy Pattern**
**Purpose**: Vary component behavior through configuration
**Implementation**: Configuration objects define component strategies

**Benefits**:
- Runtime behavior configuration
- No code modification required for new behaviors
- Clean separation of concerns

```typescript
// Different strategies through configuration
const compactTable = ComponentFactory.createDataTable({
    size: 'compact',
    filterable: false,
    sortable: true
});

const fullFeaturedTable = ComponentFactory.createDataTable({
    size: 'full',
    filterable: true,
    sortable: true,
    bulkActions: [...actions]
});
```

### **Chain of Responsibility Pattern**
**Purpose**: Process messages through a chain of handlers, delegating to the appropriate level
**Implementation**: BasePanel message routing with common and panel-specific handlers

**Benefits**:
- Eliminates duplicate message handling code across panels
- Centralizes common message logic in one place
- Enables consistent behavior across all panels
- Follows Open/Closed Principle (easy to add new common handlers without modifying child panels)

**Message Flow Architecture**:
```
Webview (postMessage)
    ↓
BasePanel.handleMessageInternal()
    ↓
BasePanel.handleCommonMessages() ──→ Handled? Yes → Return
    ↓ No
ChildPanel.handleMessage() ──→ Handle panel-specific message
```

**Implementation Example**:
```typescript
// BasePanel (abstract base class)
export abstract class BasePanel {
    // Entry point for all messages
    private async handleMessageInternal(message: WebviewMessage): Promise<void> {
        // Try common handlers first
        if (await this.handleCommonMessages(message)) {
            return; // Message handled by base class
        }

        // Delegate to child panel for panel-specific messages
        await this.handleMessage(message);
    }

    // Common message handlers shared across ALL panels
    private async handleCommonMessages(message: WebviewMessage): Promise<boolean> {
        switch (message.command) {
            case 'environment-changed':
                // All panels need consistent environment selection handling
                await this.processEnvironmentSelection(message.data.environmentId);
                return true; // Handled

            // Future common handlers go here
            // case 'theme-changed':
            // case 'refresh-all':

            default:
                return false; // Not handled, delegate to child
        }
    }

    // Abstract method - child panels implement their specific handlers
    protected abstract handleMessage(message: WebviewMessage): Promise<void>;
}

// ChildPanel (concrete implementation)
export class MyPanel extends BasePanel {
    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.command) {
            case 'load-data':
                // Panel-specific message handling
                await this.loadData(message.data);
                break;

            case 'export-data':
                await this.exportData(message.data);
                break;

            // No need to handle 'environment-changed' - BasePanel handles it
        }
    }
}
```

**When to Add Common Handlers**:

✅ **Add to `handleCommonMessages()` when**:
- Message is handled identically across 3+ panels (Three Strikes Rule)
- Behavior must be consistent for architectural reasons (e.g., state management)
- Logic involves BasePanel infrastructure (e.g., state manager, environment selector)

❌ **Keep in child panel `handleMessage()` when**:
- Message is panel-specific functionality
- Different panels need different behavior for the same message
- Logic involves panel-specific components or services

**Example Common Handlers**:
- `environment-changed` - All panels need consistent environment selection
- `panel-ready` - All panels may need initialization logic
- `resize` - All panels may need to respond to size changes

**Example Panel-Specific Handlers**:
- `load-solutions` - Only Solution Explorer needs this
- `trace-level-changed` - Only Plugin Trace Viewer needs this
- `entity-selected` - Only Metadata Browser needs this

### **Template Method Pattern**
**Purpose**: Define the skeleton of an algorithm, letting subclasses override specific steps
**Implementation**: BasePanel environment state management flow

**Benefits**:
- Enforces consistent state management across all panels
- Separates concerns (state management vs. data loading vs. switching side effects)
- Enables panels to customize behavior at specific points
- Prevents state synchronization bugs

**Environment State Management Flow**:
```
User selects environment in dropdown
    ↓
BasePanel.processEnvironmentSelection(envId)
    ├─→ Save old preferences (state manager)
    ├─→ Load new preferences (state manager)
    ├─→ Update currentEnvironmentId cache
    ├─→ Update component's internal state
    └─→ Call onEnvironmentChanged() hook
            ↓
ChildPanel.onEnvironmentChanged(envId) ←── TEMPLATE METHOD HOOK
    ├─→ Switching side effects (warnings, cleanup, timers)
    └─→ Call loadEnvironmentData()
            ↓
ChildPanel.loadEnvironmentData(envId) ←── ABSTRACT METHOD
    └─→ Pure data loading (no side effects)
```

**Implementation Example**:
```typescript
// BasePanel - Template method orchestrates the flow
export abstract class BasePanel {
    /**
     * Orchestrator: Manages state transitions and calls hooks
     * This is the TEMPLATE METHOD - defines the algorithm skeleton
     */
    protected async processEnvironmentSelection(environmentId: string): Promise<void> {
        // 1. State management (all panels need this)
        await this.stateManager.switchEnvironment(environmentId);

        // 2. Update cache (all panels need this)
        this.currentEnvironmentId = environmentId;

        // 3. Update component state (all panels need this)
        this.environmentSelectorComponent?.setSelectedEnvironment(environmentId);

        // 4. Call hook for panel-specific logic
        await this.onEnvironmentChanged(environmentId);
    }

    /**
     * Hook: Child panels override to add switching logic
     * Default implementation just loads data
     */
    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        await this.loadEnvironmentData(environmentId);
    }

    /**
     * Abstract method: Child panels MUST implement
     * This is PURE data loading with no side effects
     */
    protected abstract loadEnvironmentData(environmentId: string): Promise<void>;
}

// ChildPanel - Overrides hooks as needed
export class PluginTraceViewerPanel extends BasePanel {
    /**
     * Override hook to add switching side effects
     */
    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        // Warn if leaving environment with traces enabled
        if (this.currentTraceLevel === PluginTraceLevel.All) {
            const result = await vscode.window.showWarningMessage(
                'Plugin traces are enabled. Turn off before switching?',
                'Turn Off & Switch', 'Keep Enabled'
            );

            if (result === 'Turn Off & Switch') {
                await this.pluginService.setTraceLevel(this.currentEnvironmentId, PluginTraceLevel.Off);
            }
        }

        // Stop auto-refresh when switching environments
        this.stopAutoRefresh();

        // Load data for new environment
        await this.loadEnvironmentData(environmentId);
    }

    /**
     * Implement abstract method - pure data loading
     */
    protected async loadEnvironmentData(environmentId: string): Promise<void> {
        // ONLY data loading, no side effects (warnings, timers, etc.)
        await this.loadTraceLevel(environmentId);
        await this.loadTraces(environmentId, this.currentFilters);
    }
}
```

**Separation of Concerns**:

| Method | Responsibility | Side Effects Allowed? |
|--------|---------------|----------------------|
| `processEnvironmentSelection()` | State management orchestration | No - fixed algorithm |
| `onEnvironmentChanged()` | Switching side effects + data loading | Yes - warnings, cleanup, timers |
| `loadEnvironmentData()` | Pure data loading | No - only API calls and UI updates |

**Why This Separation Matters**:

✅ **Refresh button** calls `loadEnvironmentData()` directly - no switching side effects
✅ **Manual environment selection** calls `processEnvironmentSelection()` - full state management + switching logic
✅ **State stays synchronized** - `processEnvironmentSelection()` updates ALL state layers (manager, cache, component)
✅ **Bugs prevented** - Component's internal state never goes stale

**Anti-Pattern to Avoid**:
```typescript
// ❌ BAD: Directly calling onEnvironmentChanged bypasses state management
case 'environment-changed':
    await this.onEnvironmentChanged(envId); // State manager not updated!

// ✅ GOOD: Always use processEnvironmentSelection for manual selection
case 'environment-changed':
    await this.processEnvironmentSelection(envId); // Proper state flow
```

### **Pattern Interaction Summary**

The design patterns in this architecture work together to create a cohesive system:

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Action in Webview                       │
│                 (e.g., select environment)                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│        CHAIN OF RESPONSIBILITY (Message Routing)                 │
│                                                                   │
│  handleMessageInternal() → handleCommonMessages()                │
│                                   ↓                               │
│                           environment-changed?                   │
│                    Yes ──────────┴────────── No                  │
│                     ↓                         ↓                  │
│            BasePanel handles            Child handles            │
└────────────────────┬─────────────────────────┬──────────────────┘
                     │                         │
                     ↓                         ↓
┌─────────────────────────────────────┐  ┌──────────────────────┐
│  TEMPLATE METHOD (State Flow)       │  │  Panel-Specific      │
│                                     │  │  Message Handling    │
│  processEnvironmentSelection()      │  │                      │
│    ├─→ State Manager               │  │  (Factory creates    │
│    ├─→ Update cache                │  │   components,        │
│    ├─→ Update component            │  │   Observer notifies  │
│    └─→ onEnvironmentChanged()      │  │   changes)           │
│           ├─→ Side effects         │  │                      │
│           └─→ loadEnvironmentData()│  │                      │
└─────────────────────────────────────┘  └──────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│          OBSERVER PATTERN (Component Updates)                    │
│                                                                   │
│  component.setData(data) → emit('update') → postMessage()       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Webview Behavior (BaseBehavior)                     │
│                                                                   │
│  onComponentUpdate(instance, data) → Update DOM                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pattern Responsibilities**:

| Pattern | Layer | Purpose | Example |
|---------|-------|---------|---------|
| **Factory** | Extension Host | Create components | `ComponentFactory.createDataTable()` |
| **Composition** | Extension Host | Assemble panels | `PanelComposer.compose([...])` |
| **Chain of Responsibility** | Extension Host | Route messages | `handleCommonMessages() → handleMessage()` |
| **Template Method** | Extension Host | Enforce state flow | `processEnvironmentSelection() → onEnvironmentChanged()` |
| **Observer** | Extension Host | Notify changes | `component.emit('update')` |
| **Strategy** | Extension Host | Configure behavior | Component config objects |
| **BaseBehavior** | Webview | Enforce patterns | `onComponentUpdate()` required |

**Key Architectural Benefits**:

1. **DRY**: Common logic centralized in BasePanel (no duplication across 7 panels)
2. **SOLID**: Each pattern supports specific SOLID principles
3. **Fail Fast**: Abstract methods and required hooks catch mistakes at compile/runtime
4. **Consistency**: All panels follow the same message flow and state management
5. **Extensibility**: New common behaviors added without modifying child panels

## Cross-Cutting Concerns

### **Logging Architecture**
**Pattern**: Context-specific logging with automatic sanitization

**Extension Host Context**:
```typescript
// Auto-provided loggers based on context
class MyPanel extends BasePanel {
    // this.componentLogger available automatically
}

class MyService {
    private get logger() {
        return ServiceFactory.getLoggerService().createComponentLogger('MyService');
    }
}
```

**Webview Context**:
```javascript
// Browser console for webview behaviors
/**
 * MyBehavior - Webview behavior extending BaseBehavior
 */
class MyBehavior extends BaseBehavior {
    static getComponentType() {
        return 'MyComponent';
    }

    static onComponentUpdate(instance, data) {
        console.log('Processing component update:', data);
    }

    static handleCustomAction(instance, message) {
        console.log('Processing custom action:', message.action);
    }
}

MyBehavior.register();
```

### **Error Handling Strategy**
**Pattern**: Layered error handling with graceful degradation

1. **Service Layer**: Catch and log API errors, return error objects
2. **Panel Layer**: Handle service errors, show user-friendly messages
3. **Component Layer**: Display error states, provide recovery actions

### **State Management**
**Pattern**: Centralized state with component-level updates

**Principles**:
- UI state managed by StateService (persistence)
- Component state managed locally (temporary)
- Business state retrieved fresh from APIs (no caching)

### **Security Model**
**Pattern**: Defense in depth with multiple security layers

**Principles**:
- All API calls through AuthenticationService
- Automatic credential sanitization in logs
- Input validation at service boundaries
- VS Code SecretStorage for sensitive data

## Data Flow Architecture

### **Three-Layer Data Flow**
```
Service Layer (Business Data) 
    ↓ 
Panel Layer (UI Transformation) 
    ↓ 
Component Layer (Display)
```

**Service Layer Responsibilities**:
- Return complete, accurate business data
- Focus on data completeness and business rules
- Remain UI-agnostic for reusability

**Panel Layer Responsibilities**:
- Transform business data for UI consumption
- Add required UI properties (e.g., 'id' for table rows)
- Handle UI-specific formatting and computed fields

**Component Layer Responsibilities**:
- Accept transformed, UI-ready data
- Handle display, interaction, and visual state
- Remain data-source agnostic

### **Data Transformation Pattern**
```typescript
// 1. Service returns business data
const businessData = await this.service.fetchData(params);

// 2. Panel transforms for UI
private transformForDisplay(data: BusinessData): UIData[] {
    return data.items.map(item => ({
        id: item.uniqueId,                    // Required for table operations
        displayName: item.name || 'Unnamed',
        status: this.formatStatus(item),
        // ... other UI-specific fields
    }));
}

// 3. Component displays UI data
this.component.setData(transformedData);
```

## Extension Points

### **Adding New Components**
1. Create component following four-file structure:
   - `Component.ts` (business logic)
   - `View.ts` (HTML generation)
   - `Config.ts` (configuration interface)
   - `Behavior.js` (webview interactions)

2. Register in ComponentFactory
3. Follow BaseComponent interface
4. Implement required behavior methods

### **Adding New Panels**
1. **Extend BasePanel class**
   ```typescript
   export class MyPanel extends BasePanel<MyInstanceState, MyPreferences> {
       // Type-safe state management built-in
   }
   ```

2. **Compose from existing components**
   ```typescript
   private initializeComponents(): void {
       this.environmentSelector = ComponentFactory.createEnvironmentSelector({...});
       this.dataTable = ComponentFactory.createDataTable({...});
   }
   ```

3. **Implement required abstract methods**
   ```typescript
   // REQUIRED: Handle panel-specific messages
   protected async handleMessage(message: WebviewMessage): Promise<void> {
       switch (message.command) {
           case 'my-panel-action':
               await this.handleAction(message.data);
               break;
           // No need to handle 'environment-changed' - BasePanel handles it
       }
   }

   // REQUIRED: Load environment-specific data (pure data loading)
   protected async loadEnvironmentData(environmentId: string): Promise<void> {
       const data = await this.service.getData(environmentId);
       this.dataTable.setData(this.transformForDisplay(data));
   }
   ```

4. **Override hooks as needed**
   ```typescript
   // OPTIONAL: Add environment switching side effects
   protected async onEnvironmentChanged(environmentId: string): Promise<void> {
       // Custom switching logic (warnings, cleanup, etc.)
       if (this.needsCleanup()) {
           await this.cleanup();
       }

       // Always call super to load data
       await super.onEnvironmentChanged(environmentId);
   }
   ```

5. **Use PanelComposer for HTML generation**
   ```typescript
   protected getHtmlContent(): string {
       return PanelComposer.compose([
           this.environmentSelector,
           this.dataTable
       ], this.getCommonWebviewResources());
   }
   ```

**Key Points**:
- ✅ Common messages (`environment-changed`) are handled by BasePanel automatically
- ✅ State management (`currentEnvironmentId`, preferences) is handled by BasePanel
- ✅ Panel-specific messages go in your `handleMessage()` implementation
- ✅ Pure data loading goes in `loadEnvironmentData()`
- ✅ Switching side effects go in `onEnvironmentChanged()` override (optional)

### **Adding New Services**
1. Implement single responsibility
2. Accept dependencies through constructor
3. Register in ServiceFactory
4. Follow logging patterns

## Testing Strategy

### **Unit Testing Approach**
- **Components**: Test in isolation with mocked dependencies
- **Services**: Test business logic with mocked APIs
- **Panels**: Test composition and message handling

### **Integration Testing**
- **Component Integration**: Test component communication
- **Panel Integration**: Test full panel functionality
- **Extension Integration**: Test VS Code API integration

## Performance Considerations

### **Component Updates**
- Use event bridges for data updates, not full HTML regeneration
- Batch multiple component updates when possible
- Implement component-level state management

### **Memory Management**
- Dispose components when panels close
- Use weak references where appropriate
- Implement cleanup in component lifecycle

### **Bundle Optimization**
- Webpack bundling for production builds
- Tree shaking for unused code elimination
- Source maps for debugging support

## Migration and Evolution

### **Backward Compatibility**
- Maintain interface stability
- Deprecate features before removal
- Provide migration guides for breaking changes

### **Future Extensibility**
- Design components for configuration over customization
- Use dependency injection for testability
- Follow established patterns for consistency

## Architectural Standards Enforcement

### **Automated Code Quality**

The architectural patterns described in this guide are enforced through automated tooling:

**ESLint Rules**: 
- Component communication patterns (avoid `updateWebview()` for data updates)
- Context separation (Extension Host vs. Webview boundaries)
- Proper base class usage and factory patterns

**Development Workflow**:
- Linting integrated into build process for production
- Separate during development for fast iteration
- Validation commands available for architectural compliance

### **Pattern Compliance**

**Component Architecture**:
- Use `ComponentFactory` for component instantiation
- Implement proper event bridges for component updates
- Follow logging architecture (`this.componentLogger` vs. `console.log`)

**Context Awareness**:
- Extension Host code: Full access to VS Code APIs and Node.js
- Webview code: Browser context with limited scope
- Clear boundaries prevent runtime errors

## Related Documentation

This architecture guide provides the foundation for understanding and extending the Power Platform Developer Suite. For specific implementation details, see:

- **[Component Patterns](COMPONENT_PATTERNS.md)** - Detailed component design patterns and lifecycle management
- **[Styling Patterns](STYLING_PATTERNS.md)** - CSS architecture and visual consistency guidelines
- **[Development Guide](DEVELOPMENT_GUIDE.md)** - Practical development workflow, debugging, and testing

Together, these guides provide comprehensive guidance for maintaining and extending the extension's architecture.