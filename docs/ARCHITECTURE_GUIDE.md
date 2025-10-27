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
```typescript
// Extension Host emits events
component.on('update', (event) => {
    this.postMessage({
        command: 'component-event',
        componentId: event.componentId,
        data: component.getData()
    });
});

// Webview handles events
static handleMessage(message) {
    if (message.command === 'component-event') {
        this.updateComponent(message.componentId, message.data);
    }
}
```

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
class MyBehavior {
    static handleMessage(message) {
        console.log('Processing message:', message);
    }
}
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
1. Extend BasePanel class
2. Compose from existing components
3. Implement required message handlers
4. Use PanelComposer for HTML generation

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