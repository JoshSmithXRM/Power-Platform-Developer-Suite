# Power Platform Developer Suite - Component-Based Architecture Guide

## 🏗️ Architecture Overview

The Power Platform Developer Suite follows a **component-based architecture** with strict separation of concerns and comprehensive code reuse:

### **1. COMPONENTS** - Reusable UI building blocks with composition pattern ✅
### **2. PANELS** - Composed from multiple component instances, minimal custom code ✅  
### **3. SERVICES** - Business logic and API interaction layers with dependency injection ✅
### **4. FACTORIES** - Component creation and panel composition utilities ✅
### **5. BEHAVIORS** - Component-specific webview JavaScript for interactivity ✅
### **6. LOGGING** - Centralized structured logging with VS Code native APIs ✅

**New Architecture Status**: Transitioning from legacy HTML generation to component composition pattern to eliminate duplication and enable multi-instance components.

---

## 📋 Component-Based Directory Structure

```
Extension Root
├── 📁 src/
│   ├── 📁 panels/           # Panel classes composed from components
│   │   ├── 📁 base/         # Base panel functionality  
│   │   │   └── BasePanel.ts
│   │   ├── SolutionExplorerPanel.ts
│   │   ├── ImportJobViewerPanel.ts
│   │   ├── DataExplorerPanel.ts
│   │   ├── MetadataBrowserPanel.ts
│   │   ├── EnvironmentSetupPanel.ts
│   │   ├── ConnectionReferencesPanel.ts
│   │   ├── EnvironmentVariablesPanel.ts
│   │   └── PluginTraceViewerPanel.ts
│   │
│   ├── 📁 components/       # Component-based UI system
│   │   ├── 📁 base/
│   │   │   ├── BaseComponent.ts         # Base component class
│   │   │   ├── ComponentInterface.ts    # Component contracts  
│   │   │   └── ComponentConfig.ts       # Base configuration types
│   │   ├── 📁 selectors/
│   │   │   ├── 📁 EnvironmentSelector/
│   │   │   │   ├── EnvironmentSelectorComponent.ts
│   │   │   │   ├── EnvironmentSelectorView.ts    # HTML generation
│   │   │   │   └── EnvironmentSelectorConfig.ts  # Configuration types
│   │   │   ├── 📁 SolutionSelector/
│   │   │   │   ├── SolutionSelectorComponent.ts
│   │   │   │   ├── SolutionSelectorView.ts
│   │   │   │   └── SolutionSelectorConfig.ts
│   │   │   └── 📁 EntitySelector/
│   │   │       ├── EntitySelectorComponent.ts
│   │   │       ├── EntitySelectorView.ts
│   │   │       └── EntitySelectorConfig.ts
│   │   ├── 📁 tables/
│   │   │   ├── 📁 DataTable/
│   │   │   │   ├── DataTableComponent.ts
│   │   │   │   ├── DataTableView.ts
│   │   │   │   └── DataTableConfig.ts
│   │   │   ├── 📁 FilterableTable/
│   │   │   │   ├── FilterableTableComponent.ts
│   │   │   │   ├── FilterableTableView.ts
│   │   │   │   └── FilterableTableConfig.ts
│   │   │   └── 📁 EmptyTable/
│   │   │       ├── EmptyTableComponent.ts
│   │   │       ├── EmptyTableView.ts
│   │   │       └── EmptyTableConfig.ts
│   │   └── 📁 forms/
│   │       ├── 📁 ActionBar/
│   │       │   ├── ActionBarComponent.ts
│   │       │   ├── ActionBarView.ts
│   │       │   └── ActionBarConfig.ts
│   │       ├── 📁 SearchForm/
│   │       │   ├── SearchFormComponent.ts
│   │       │   ├── SearchFormView.ts
│   │       │   └── SearchFormConfig.ts
│   │       └── 📁 FilterForm/
│   │           ├── FilterFormComponent.ts
│   │           ├── FilterFormView.ts
│   │           └── FilterFormConfig.ts
│   │
│   ├── 📁 factories/
│   │   ├── ComponentFactory.ts          # Enhanced component creation
│   │   └── PanelComposer.ts            # Panel composition helper
│   │
│   ├── 📁 services/
│   │   ├── AuthenticationService.ts
│   │   ├── StateService.ts
│   │   ├── SolutionService.ts
│   │   ├── UrlBuilderService.ts
│   │   └── ServiceFactory.ts
│   │
│   ├── 📁 commands/
│   │   ├── EnvironmentCommands.ts
│   │   ├── PanelCommands.ts
│   │   └── MetadataBrowserCommands.ts
│   │
│   ├── 📁 providers/
│   │   ├── EnvironmentsProvider.ts
│   │   └── ToolsProvider.ts
│   │
│   └── 📁 types/
│       ├── index.ts
│       ├── ComponentTypes.ts            # Component-specific types
│       └── node-persist.d.ts
│
├── 📁 resources/webview/
│   ├── 📁 css/
│   │   ├── 📁 components/              # Component-specific styles
│   │   │   ├── environment-selector.css
│   │   │   ├── solution-selector.css
│   │   │   ├── data-table.css
│   │   │   ├── action-bar.css
│   │   │   └── search-form.css
│   │   └── 📁 base/
│   │       ├── panel-base.css          # Base panel styles
│   │       └── component-base.css      # Base component styles
│   └── 📁 js/
│       ├── 📁 components/              # Component behavior scripts
│       │   ├── EnvironmentSelectorBehavior.js
│       │   ├── SolutionSelectorBehavior.js
│       │   ├── DataTableBehavior.js
│       │   ├── ActionBarBehavior.js
│       │   └── SearchFormBehavior.js
│       └── 📁 utils/
│           ├── ComponentUtils.js       # Base component utilities
│           ├── PanelUtils.js          # Panel-level operations
│           └── TableUtils.js          # Legacy (being phased out)
│
└── 📁 dist/
    ├── extension.js
    └── extension.js.LICENSE.txt
```

---

## 🎯 Core Design Principles

### **1. Component Composition over Inheritance**
Panels are built by **composing multiple reusable component instances** rather than custom HTML generation.

### **2. Multi-Instance Support**
Every component supports multiple instances per panel with independent configuration and state.

### **3. Strict Separation of Concerns**
- **Component Class** (TypeScript) - Business logic, state management, configuration
- **View Class** (TypeScript) - HTML generation in Extension Host context
- **Behavior Script** (JavaScript) - Webview interactivity and event handling  
- **CSS File** - Component-specific styling

### **4. Configuration-Driven Development**
All components accept typed configuration objects for customization, eliminating hardcoded values.

### **5. Dependency Injection**
All dependencies are injected through constructors via ServiceFactory - no direct instantiation.

### **6. Extension Host vs Webview Separation**
Components generate HTML in Extension Host context, handle interactions in webview context via behavior scripts.

---

## 📐 Flexible Panel Layout System

### **The Height Management Challenge**

Traditional VS Code extensions often struggle with layout issues:
- **Hardcoded pixel heights** break on different panel configurations
- **Fixed calculations** like `calc(100vh - 120px)` fail when adding/removing controls
- **Per-panel CSS tweaking** required for each unique layout

### **Flexbox-Based Solution**

The Power Platform Developer Suite implements a **scalable flexbox layout system** that automatically adapts to any panel configuration:

```css
/* Base Layout Structure */
.panel-container {
    height: 100vh;                    /* Full viewport height */
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

/* Top Controls Section - Natural Height */
.panel-controls {
    flex: 0 0 auto;                   /* Don't grow, natural height only */
    padding: var(--component-padding);
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;
    gap: var(--component-gap);
}

/* Main Content Area - Fills Remaining Space */
.panel-content {
    flex: 1 1 auto;                   /* Grow to fill available space */
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;                    /* Critical: allows flex child to shrink */
}

/* Table Section - Uses All Content Space */
.panel-table-section {
    flex: 1 1 auto;                   /* Use all available content space */
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
}
```

### **Intelligent Component Organization**

`PanelComposer.organizeComponentsForFlexibleLayout()` automatically categorizes and positions components:

```typescript
/**
 * Organize components into flexible layout structure
 * Separates control components from table components automatically
 */
private static organizeComponentsForFlexibleLayout(componentHTML: string): string {
    // Parse component HTML and categorize by type
    const controlComponents: string[] = [];    // Selectors, action bars, forms
    const tableComponents: string[] = [];      // Data tables, lists
    const otherComponents: string[] = [];      // Fallback category
    
    // Detect component types from HTML attributes and structure
    for (const match of componentMatches) {
        if (match.includes('data-component-type="DataTable"') || 
            match.includes('data-table') || 
            match.includes('class="data-table')) {
            tableComponents.push(match);
        } else if (match.includes('data-component-type="EnvironmentSelector"') ||
                   match.includes('data-component-type="SolutionSelector"') ||
                   match.includes('data-component-type="ActionBar"')) {
            controlComponents.push(match);
        } else {
            otherComponents.push(match);
        }
    }
    
    // Build structured layout
    return `
        <div class="panel-controls">
            ${controlComponents.concat(otherComponents).join('\n')}
        </div>
        <div class="panel-content">
            <div class="panel-table-section">
                ${tableComponents.join('\n')}
            </div>
        </div>
    `;
}
```

### **Layout Behavior Examples**

#### **Simple Panel (Minimal Controls)**
```typescript
// Panel with just environment selector + table
PanelComposer.compose([
    environmentSelector,    // → Controls section (natural height)
    dataTable              // → Table section (fills remaining space)
]);
```
**Result**: Table gets maximum available height, minimal space for controls.

#### **Complex Panel (Many Controls)**
```typescript  
// Panel with multiple controls + table
PanelComposer.compose([
    environmentSelector,    // → Controls section
    solutionSelector,       // → Controls section  
    actionBar,             // → Controls section
    searchForm,            // → Controls section
    dataTable              // → Table section (adapts to remaining space)
]);
```
**Result**: All controls stack naturally in top section, table uses remaining space.

#### **Multi-Table Panel**
```typescript
// Panel with controls + multiple tables
PanelComposer.compose([
    environmentSelector,    // → Controls section
    primaryTable,          // → Table section
    secondaryTable         // → Table section (shares space)
]);
```
**Result**: Controls at top, tables share remaining space proportionally.

### **Data Table Integration**

Data tables now use flexible height instead of hardcoded pixels:

```css
/* OLD: Hardcoded heights (removed) */
.data-table-container {
    height: calc(100vh - 160px);  /* ❌ Breaks on different panels */
    min-height: 400px;
    max-height: calc(100vh - 120px);
}

/* NEW: Flexible height system */
.data-table-container {
    height: 100%;                  /* ✅ Use full height of parent */
    display: flex;
    flex-direction: column;
    min-height: 0;                 /* Allow shrinking */
}

.data-table-wrapper {
    flex: 1;                       /* ✅ Table content grows to fill */
    overflow: auto;
    min-height: 0;
}
```

### **Benefits**

#### **🚀 Scalability**
- **Works with ANY panel configuration** - 1 control or 20 controls
- **No per-panel CSS required** - One layout system works everywhere
- **Future-proof** - New components automatically work

#### **🎯 Developer Experience** 
- **Zero hardcoded heights** - No pixel calculations needed
- **Automatic organization** - Components go to correct sections
- **Backward compatible** - Existing panels work immediately

#### **⚡ Performance**
- **No layout thrashing** - Flexbox handles resize efficiently  
- **Consistent behavior** - Same layout logic across all panels
- **Mobile responsive** - Flexbox adapts to different screen sizes

### **Migration Impact**

#### **No Code Changes Required**
Existing panels automatically benefit from the new layout system:

```typescript
// This code works the same but now has flexible layout
return PanelComposer.compose([
    this.environmentSelector,
    this.dataTable
], this.getCommonWebviewResources());
```

#### **CSS Improvements**
All data tables now:
- ✅ Fill available height perfectly
- ✅ Adapt to any number of top controls  
- ✅ Handle window resizing gracefully
- ✅ Support different panel configurations

#### **Enhanced User Experience**
- **No more empty space** at bottom of panels
- **Consistent table sizing** across all panels
- **Better space utilization** on different screen sizes
- **Professional appearance** with proper proportions

### **Implementation Details**

The flexible layout system is implemented in three layers:

1. **CSS Base Classes** (`component-base.css`) - Define flexbox structure
2. **PanelComposer Logic** (`PanelComposer.ts`) - Intelligent component organization  
3. **Component Integration** (`data-table.css`) - Tables adapt to flexible containers

This creates a **comprehensive solution** that eliminates height management issues across the entire extension while maintaining backward compatibility and requiring no code changes for existing panels.

---

## 🔧 Component-Based Architecture Pattern

### **Component Structure**

Each component follows a consistent 4-file structure:

```typescript
// 1. Component Class (TypeScript) - Extension Host Context
export class EnvironmentSelectorComponent extends BaseComponent {
    private config: EnvironmentSelectorConfig;
    private selectedEnvironmentId?: string;
    
    constructor(config: EnvironmentSelectorConfig) {
        super(config);
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    
    // Generate HTML in Extension Host context
    generateHTML(): string {
        return EnvironmentSelectorView.render(this.config, this.selectedEnvironmentId);
    }
    
    // Handle state changes
    setEnvironments(environments: Environment[]): void {
        this.config.environments = environments;
        this.notifyUpdate();
    }
    
    setSelected(environmentId: string): void {
        this.selectedEnvironmentId = environmentId;
        this.notifyUpdate();
    }
}

// 2. View Class (TypeScript) - HTML Generation
export class EnvironmentSelectorView {
    static render(config: EnvironmentSelectorConfig, selectedId?: string): string {
        return `
            <div class="environment-selector" data-component-id="${config.id}">
                <label for="${config.id}">${config.label}</label>
                <select id="${config.id}" class="environment-dropdown">
                    <option value="">${config.placeholder}</option>
                    ${config.environments?.map(env => 
                        `<option value="${env.id}" ${env.id === selectedId ? 'selected' : ''}>
                            ${env.displayName}
                        </option>`
                    ).join('')}
                </select>
                <span id="${config.id}_status" class="environment-status environment-disconnected">
                    Disconnected
                </span>
            </div>
        `;
    }
}

// 3. Configuration Interface (TypeScript) - Type Safety
export interface EnvironmentSelectorConfig extends BaseComponentConfig {
    id: string;
    label?: string;
    placeholder?: string;
    environments?: Environment[];
    onChange?: (environmentId: string) => void;
    showStatus?: boolean;
    className?: string;
}

export const DEFAULT_ENVIRONMENT_SELECTOR_CONFIG: Partial<EnvironmentSelectorConfig> = {
    label: 'Environment:',
    placeholder: 'Loading environments...',
    showStatus: true,
    className: 'environment-selector'
};
```

```javascript
// 4. Behavior Script (JavaScript) - Webview Context
class EnvironmentSelectorBehavior {
    static instances = new Map();
    
    // ✅ REQUIRED: Static initialize method for ComponentUtils compatibility
    static initialize(componentId, config, element) {
        if (!componentId || !element) {
            console.error('EnvironmentSelectorBehavior: componentId and element are required');
            return null;
        }
        
        if (this.instances.has(componentId)) {
            console.warn(`EnvironmentSelectorBehavior: ${componentId} already initialized`);
            return this.instances.get(componentId);
        }
        
        const instance = {
            id: componentId,
            config: { ...config },
            element: element,
            statusElement: element.querySelector('[data-component-element="status"]')
        };
        
        // Setup event listeners
        element.addEventListener('change', (e) => {
            const environmentId = e.target.value;
            this.handleEnvironmentChange(instance, environmentId);
        });
        
        this.instances.set(componentId, instance);
        console.log(`EnvironmentSelectorBehavior: Initialized ${componentId}`);
        return instance;
    }
    
    // ✅ REQUIRED: Static handleMessage method for Extension Host communication
    static handleMessage(message) {
        console.log('DEBUG: EnvironmentSelectorBehavior.handleMessage called with:', message);
        
        if (!message || !message.componentId) {
            console.warn('EnvironmentSelector handleMessage: Invalid message format', message);
            return;
        }
        
        // Handle different message actions
        const { action, data, componentId } = message;
        
        switch (action) {
            case 'componentUpdate':
            case 'environmentsLoaded':
                if (data && data.environments) {
                    this.loadEnvironments(componentId, data.environments);
                }
                if (data && data.selectedEnvironmentId) {
                    this.setSelectedEnvironment(componentId, data.selectedEnvironmentId);
                }
                break;
                
            case 'environmentSelected':
                if (data && data.environmentId) {
                    this.setSelectedEnvironment(componentId, data.environmentId);
                }
                break;
                
            case 'loadingStateChanged':
                this.setLoading(componentId, data.loading, data.message);
                break;
                
            case 'errorOccurred':
                this.showError(componentId, data.error, data.context);
                break;
                
            default:
                console.warn(`EnvironmentSelectorBehavior: Unknown message action: ${action}`);
        }
    }
    
    static handleEnvironmentChange(instance, environmentId) {
        // Update visual state
        this.updateConnectionStatus(instance, environmentId ? 'connected' : 'disconnected');
        
        // Notify panel via message
        if (instance.config.onChange) {
            ComponentUtils.sendMessage('environmentChanged', {
                componentId: instance.id,
                environmentId: environmentId
            });
        }
    }
    
    static loadEnvironments(componentId, environments) {
        const instance = this.instances.get(componentId);
        if (!instance) return;
        
        // Clear existing options
        instance.element.innerHTML = '<option value="">Select environment...</option>';
        
        // Add environment options
        environments.forEach(env => {
            const option = document.createElement('option');
            option.value = env.id;
            option.textContent = env.displayName;
            instance.element.appendChild(option);
        });
    }
    
    static setSelectedEnvironment(componentId, environmentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;
        
        instance.element.value = environmentId;
        this.updateConnectionStatus(instance, 'connected');
    }
    
    static updateConnectionStatus(instance, status) {
        if (!instance.statusElement) return;
        
        instance.statusElement.className = `environment-status environment-${status}`;
        instance.statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
}

// ✅ REQUIRED: Component Registry Pattern for ComponentUtils integration
// Make available globally
window.EnvironmentSelectorBehavior = EnvironmentSelectorBehavior;

// Register with ComponentUtils if available - CRITICAL for component communication
if (window.ComponentUtils && window.ComponentUtils.registerBehavior) {
    window.ComponentUtils.registerBehavior('EnvironmentSelector', EnvironmentSelectorBehavior);
    console.log('EnvironmentSelectorBehavior registered with ComponentUtils');
} else {
    console.log('EnvironmentSelectorBehavior loaded, ComponentUtils not available yet');
}
```

```css
/* 5. Component Styles (CSS) - Component-Specific Styling */
.environment-selector {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    margin-bottom: 16px;
}

.environment-selector label {
    color: var(--vscode-foreground);
    font-weight: 500;
    min-width: 100px;
}

.environment-dropdown {
    flex: 1;
    padding: 6px 12px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
}

.environment-status {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.environment-connected {
    background: rgba(0, 128, 0, 0.1);
    color: #00b300;
}

.environment-disconnected {
    background: rgba(255, 0, 0, 0.1);
    color: #e74c3c;
}
```

---

## 🔄 Component Registry and Lifecycle Pattern

### **Component Behavior Registration (MANDATORY)**

All component behavior scripts MUST follow this exact registration pattern for ComponentUtils integration:

#### **1. Required Static Methods**

Every behavior class MUST implement these two static methods:

```javascript
class ComponentBehavior {
    // ✅ REQUIRED: Initialize component instance  
    static initialize(componentId, config, element) {
        // Validation
        if (!componentId || !element) {
            console.error('ComponentBehavior: componentId and element are required');
            return null;
        }
        
        // Prevent double initialization
        if (this.instances.has(componentId)) {
            console.warn(`ComponentBehavior: ${componentId} already initialized`);
            return this.instances.get(componentId);
        }
        
        // Create and store instance
        const instance = { id: componentId, config, element };
        this.instances.set(componentId, instance);
        return instance;
    }
    
    // ✅ REQUIRED: Handle messages from Extension Host
    static handleMessage(message) {
        console.log('DEBUG: ComponentBehavior.handleMessage called with:', message);
        
        if (!message || !message.componentId) {
            console.warn('ComponentBehavior handleMessage: Invalid message format', message);
            return;
        }
        
        // Route to appropriate handler based on message.action
        switch (message.action) {
            case 'componentUpdate':
                this.handleComponentUpdate(message.componentId, message.data);
                break;
            case 'stateChange':
                this.handleStateChange(message.componentId, message.data);
                break;
            default:
                console.warn(`ComponentBehavior: Unknown action: ${message.action}`);
        }
    }
}
```

#### **2. Global Registration Pattern**

At the end of every behavior script:

```javascript
// ✅ REQUIRED: Component Registry Pattern
if (typeof window !== 'undefined') {
    // Make behavior available globally
    window.ComponentBehavior = ComponentBehavior;
    
    // Register with ComponentUtils - CRITICAL for Extension Host communication
    if (window.ComponentUtils && window.ComponentUtils.registerBehavior) {
        window.ComponentUtils.registerBehavior('ComponentType', ComponentBehavior);
        console.log('ComponentBehavior registered with ComponentUtils');
    } else {
        console.log('ComponentBehavior loaded, ComponentUtils not available yet');
    }
}
```

#### **3. Script Loading Order in PanelComposer**

Component behaviors must load BEFORE ComponentUtils for proper registration:

```typescript
// PanelComposer.ts - collectBehaviorScripts() method
private static collectBehaviorScripts(components: BaseComponent[]): string[] {
    const scripts: string[] = [];
    
    // 1. Load PanelUtils first
    scripts.push('js/utils/PanelUtils.js');
    
    // 2. Load component behavior scripts
    components.forEach(component => {
        const behaviorScript = component.getBehaviorScript();
        if (behaviorScript && !scripts.includes(behaviorScript)) {
            scripts.push(behaviorScript);
        }
    });
    
    // 3. Load ComponentUtils LAST (after all behaviors are available)
    scripts.push('js/utils/ComponentUtils.js');
    
    return scripts;
}
```

### **Component Initialization Lifecycle**

The proper initialization sequence prevents "ComponentUtils not available yet" errors:

1. **HTML Loads**: Browser renders component HTML structure
2. **Behavior Scripts Load**: Component behaviors register with `window.ComponentBehavior = ...`
3. **ComponentUtils Loads**: Finds all registered behaviors and initializes components  
4. **Component Instances Created**: Each behavior's `initialize()` method called
5. **Message Routing Active**: `handleMessage()` methods ready to receive Extension Host updates

### **ComponentUtils Integration**

ComponentUtils provides the central registry and message routing system:

```javascript
// ComponentUtils.js - Core registry functionality
class ComponentUtils {
    static registeredBehaviors = new Map();
    static componentInstances = new Map();
    
    // Register behavior classes  
    static registerBehavior(componentType, behaviorClass) {
        console.log(`ComponentUtils: Registering behavior ${componentType}`);
        this.registeredBehaviors.set(componentType, behaviorClass);
        this.checkReadyToInitialize();
    }
    
    // Initialize all components when ready
    static initializeAllComponents() {
        document.querySelectorAll('[data-component-type]').forEach(element => {
            const componentType = element.getAttribute('data-component-type');
            const componentId = element.getAttribute('data-component-id');
            
            if (this.registeredBehaviors.has(componentType)) {
                const behaviorClass = this.registeredBehaviors.get(componentType);
                const instance = behaviorClass.initialize(componentId, {}, element);
                
                if (instance) {
                    this.componentInstances.set(componentId, instance);
                }
            }
        });
    }
    
    // Route messages from Extension Host to component behaviors
    static handleMessage(message) {
        const { componentId, componentType, action } = message;
        
        if (componentType && this.registeredBehaviors.has(componentType)) {
            const behaviorClass = this.registeredBehaviors.get(componentType);
            if (behaviorClass.handleMessage) {
                behaviorClass.handleMessage(message);
            }
        }
    }
}
```

---

## 🏭 Enhanced ComponentFactory Pattern

### **Component Creation Factory**

```typescript
export class ComponentFactory {
    // Environment Selectors
    static createEnvironmentSelector(config: EnvironmentSelectorConfig): EnvironmentSelectorComponent {
        return new EnvironmentSelectorComponent(config);
    }
    
    // Solution Selectors  
    static createSolutionSelector(config: SolutionSelectorConfig): SolutionSelectorComponent {
        return new SolutionSelectorComponent(config);
    }
    
    // Data Tables
    static createDataTable(config: DataTableConfig): DataTableComponent {
        return new DataTableComponent(config);
    }
    
    static createFilterableTable(config: FilterableTableConfig): FilterableTableComponent {
        return new FilterableTableComponent(config);
    }
    
    // Action Bars
    static createActionBar(config: ActionBarConfig): ActionBarComponent {
        return new ActionBarComponent(config);
    }
    
    // Search Forms
    static createSearchForm(config: SearchFormConfig): SearchFormComponent {
        return new SearchFormComponent(config);
    }
}
```

### **Panel Composition Helper**

```typescript
export class PanelComposer {
    static compose(
        components: BaseComponent[], 
        webviewResources: WebviewResources,
        panelTitle?: string
    ): string {
        // Generate component HTML
        const componentHTML = components.map(component => component.generateHTML()).join('\n');
        
        // Collect required CSS files
        const cssFiles = this.collectCSSFiles(components);
        
        // Collect required behavior scripts
        const behaviorScripts = this.collectBehaviorScripts(components);
        
        // Generate complete HTML
        return this.generateCompleteHTML({
            title: panelTitle || 'Panel',
            componentHTML,
            cssFiles,
            behaviorScripts,
            webviewResources
        });
    }
    
    private static collectCSSFiles(components: BaseComponent[]): string[] {
        const cssFiles = new Set<string>();
        cssFiles.add('base/component-base.css');
        
        components.forEach(component => {
            cssFiles.add(component.getCSSFile());
        });
        
        return Array.from(cssFiles);
    }
    
    private static collectBehaviorScripts(components: BaseComponent[]): string[] {
        const scripts = new Set<string>();
        scripts.add('utils/ComponentUtils.js');
        
        components.forEach(component => {
            scripts.add(component.getBehaviorScript());
        });
        
        return Array.from(scripts);
    }
    
    private static generateCompleteHTML(params: {
        title: string;
        componentHTML: string;
        cssFiles: string[];
        behaviorScripts: string[];
        webviewResources: WebviewResources;
    }): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${params.title}</title>
            ${params.cssFiles.map(css => 
                `<link rel="stylesheet" href="${params.webviewResources.getCSSUri(css)}">`
            ).join('\n            ')}
        </head>
        <body>
            ${params.componentHTML}
            
            ${params.behaviorScripts.map(script => 
                `<script src="${params.webviewResources.getScriptUri(script)}"></script>`
            ).join('\n            ')}
            
            <script>
                const vscode = acquireVsCodeApi();
                
                // Initialize all components
                document.addEventListener('DOMContentLoaded', () => {
                    ComponentUtils.initializeAllComponents();
                });
                
                // Setup message handling
                ComponentUtils.setupMessageHandler({
                    'componentUpdate': ComponentUtils.handleComponentUpdate,
                    'environmentsLoaded': ComponentUtils.handleEnvironmentsLoaded,
                    'dataLoaded': ComponentUtils.handleDataLoaded
                });
            </script>
        </body>
        </html>`;
    }
}
```

---

## 📊 Updated Panel Implementation Pattern

### **Component-Composed Panel Structure**

```typescript
export class EnvironmentVariablesPanel extends BasePanel {
    public static readonly viewType = 'environmentVariables';
    
    // Component instances
    private environmentSelector: EnvironmentSelectorComponent;
    private solutionSelector: SolutionSelectorComponent;
    private dataTable: DataTableComponent;
    private actionBar: ActionBarComponent;
    
    // Services
    private environmentVariablesService: any;

    public static createOrShow(extensionUri: vscode.Uri) {
        const existing = BasePanel.focusExisting(EnvironmentVariablesPanel.viewType);
        if (existing) return;
        EnvironmentVariablesPanel.createNew(extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: EnvironmentVariablesPanel.viewType,
            title: 'Environment Variables Manager'
        });

        this.environmentVariablesService = ServiceFactory.getEnvironmentVariablesService();
        this.initializeComponents();
        this.initialize();
    }
    
    private initializeComponents(): void {
        // Create component instances with configuration
        this.environmentSelector = ComponentFactory.createEnvironmentSelector({
            id: 'envSelector',
            label: 'Environment:',
            onChange: this.handleEnvironmentChange.bind(this)
        });
        
        this.solutionSelector = ComponentFactory.createSolutionSelector({
            id: 'solutionSelector',
            label: 'Solution:', 
            onChange: this.handleSolutionChange.bind(this)
        });
        
        this.dataTable = ComponentFactory.createDataTable({
            id: 'envVarsTable',
            columns: [
                { key: 'displayname', label: 'Display Name', sortable: true },
                { key: 'schemaname', label: 'Name', sortable: true },
                { key: 'typeDisplay', label: 'Type', sortable: true },
                { key: 'defaultValue', label: 'Default Value', sortable: false },
                { key: 'currentValue', label: 'Current Value', sortable: false },
                { key: 'ismanaged', label: 'Managed', sortable: true }
            ],
            defaultSort: { column: 'displayname', direction: 'asc' },
            filterable: true,
            onRowAction: this.handleRowAction.bind(this)
        });
        
        this.actionBar = ComponentFactory.createActionBar({
            id: 'actionBar',
            actions: [
                { id: 'sync', label: 'Sync Deployment Settings', primary: true },
                { id: 'openMaker', label: 'Open in Maker', secondary: true },
                { id: 'refresh', label: 'Refresh', secondary: true }
            ],
            onActionClick: this.handleActionClick.bind(this)
        });
    }

    protected getHtmlContent(): string {
        // Use PanelComposer to generate complete HTML from components
        return PanelComposer.compose([
            this.environmentSelector,
            this.solutionSelector, 
            this.actionBar,
            this.dataTable
        ], this.getCommonWebviewResources(), 'Environment Variables Manager');
    }
    
    // Component event handlers
    private handleEnvironmentChange(environmentId: string): void {
        this.loadSolutions(environmentId);
    }
    
    private handleSolutionChange(solutionId: string): void {
        this.loadEnvironmentVariables(solutionId);
    }
    
    private handleActionClick(actionId: string): void {
        switch (actionId) {
            case 'sync':
                this.handleSyncDeploymentSettings();
                break;
            case 'openMaker':
                this.handleOpenInMaker();
                break;
            case 'refresh':
                this.refreshData();
                break;
        }
    }
    
    private handleRowAction(actionId: string, rowData: any): void {
        // Handle table row actions
        console.log('Row action:', actionId, rowData);
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'componentUpdate':
                await this.handleComponentUpdate(message);
                break;
            case 'environmentChanged':
                await this.handleEnvironmentChanged(message.data.environmentId);
                break;
            // ... other message handlers
        }
    }
}
```

---

## 🎨 Component Styling Architecture

### **CSS Organization & Cascade**

The styling system follows a **progressive enhancement cascade** with four levels:

1. **Base Component Styles** (`base/component-base.css`)
   - Foundation styles for all components
   - VS Code theme integration
   - CSS custom properties

2. **Base Panel Styles** (`base/panel-base.css`)
   - Panel container and layout styles
   - Common panel UI patterns

3. **Component-Specific Styles** (`components/[component-name].css`)
   - Default styles for each component type
   - Applied to ALL instances of that component

4. **Panel-Specific Overrides** (`panels/[panel-name]-panel.css`) 
   - Optional overrides for specific panels
   - Loaded automatically if file exists
   - Use component className for targeting

### **Panel-Specific Styling Example**

```css
/* resources/webview/css/panels/environment-variables-panel.css */

/* Target components in this panel using their className */
.environment-variables-table {
    font-size: 12px;  /* Smaller text for dense data */
}

.environment-variables-table .data-table-cell {
    padding: 4px 8px;  /* Tighter padding */
}

/* Override action bar for this panel only */
.environment-variables-actions .action-button {
    padding: 4px 12px;
    font-size: 12px;
}
```

### **How to Enable Panel-Specific Styles**

1. **Use className when creating components:**
```typescript
this.dataTable = ComponentFactory.createDataTable({
    id: 'myTable',
    className: 'my-panel-table',  // Panel-specific class
    columns: [...]
});
```

2. **Create panel CSS file (optional):**
   - Name: `[panel-title]-panel.css` in `css/panels/`
   - Auto-loaded if exists, ignored if missing
   - No code changes needed

3. **CSS loads in order:**
   - Base styles → Component defaults → Panel overrides
   - Later styles override earlier ones

### **CSS Custom Properties for Theming**
```css
/* component-base.css */
:root {
    --component-padding: 12px;
    --component-border-radius: 4px;
    --component-gap: 12px;
    --selector-min-width: 200px;
    --table-header-height: 40px;
    --action-button-height: 32px;
}

.component-base {
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: var(--component-border-radius);
    padding: var(--component-padding);
}

.component-grid {
    display: grid;
    gap: var(--component-gap);
    grid-template-columns: 1fr;
}

@media (min-width: 800px) {
    .component-grid {
        grid-template-columns: 1fr 1fr;
    }
}

@media (min-width: 1200px) {
    .component-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}
```

---

## 📚 Component Development Guidelines

### **Creating a New Component**

1. **Create the 4-file structure** in `src/components/[category]/[ComponentName]/`
2. **Implement BaseComponent interface** for consistency
3. **Define comprehensive configuration interface** with sensible defaults
4. **Generate HTML in View class** for Extension Host context
5. **Handle interactions in Behavior script** for webview context
6. **Style with component-specific CSS** using VS Code theme variables
7. **Register in ComponentFactory** for easy creation
8. **Write unit tests** for component logic

### **Component Update Implementation Requirements**

Every component MUST implement proper Extension Host ↔ Webview communication:

#### **Extension Host Component (TypeScript)**
```typescript
export class MyComponent extends BaseComponent {
    private data: any[] = [];
    
    public setData(data: any[]): void {
        this.data = [...data];
        this.processData();
        this.notifyUpdate(); // ✅ REQUIRED - Triggers panel event bridge
    }
    
    public setConfiguration(config: Partial<MyComponentConfig>): void {
        this.config = { ...this.config, ...config };
        this.notifyStateChange({ config: this.config }); // ✅ REQUIRED for config changes
    }
    
    public getData(): any[] {
        return [...this.data]; // ✅ REQUIRED - Panel needs access for event bridge
    }
}
```

#### **Panel Event Bridge Setup (TypeScript)**  
```typescript
export class MyPanel extends BasePanel {
    private myComponent: MyComponent;
    
    private initializeComponents(): void {
        this.myComponent = ComponentFactory.createMyComponent({
            id: 'myComponent',
            // ... configuration
        });
        
        // ✅ REQUIRED - Setup event bridge for each component
        this.setupComponentEventBridges();
    }
    
    private setupComponentEventBridges(): void {
        // Data update bridge
        this.myComponent.on('update', (event) => {
            this.postMessage({
                command: 'component-update',
                componentId: event.componentId,
                action: 'dataUpdate',
                data: this.myComponent.getData()
            });
        });
        
        // Configuration change bridge
        this.myComponent.on('stateChange', (event) => {
            this.postMessage({
                command: 'component-update',
                componentId: event.componentId,
                action: 'configUpdate', 
                data: event.state
            });
        });
        
        // Error bridge
        this.myComponent.on('error', (event) => {
            this.postMessage({
                command: 'component-error',
                componentId: event.componentId,
                error: event.error
            });
        });
    }
}
```

#### **Webview Behavior Script (JavaScript)**
```javascript
class MyComponentBehavior {
    constructor(componentId) {
        this.componentId = componentId;
        this.element = document.getElementById(componentId);
        this.initialized = false;
        this.init();
        
        // ✅ REQUIRED - Register for messages from Extension Host
        ComponentUtils.registerMessageHandler(componentId, this.handleMessage.bind(this));
    }
    
    // ✅ REQUIRED - Handle Extension Host messages
    handleMessage(message) {
        if (message.command === 'component-update' && 
            message.componentId === this.componentId) {
            this.handleUpdate(message.action, message.data);
        } else if (message.command === 'component-error' &&
                   message.componentId === this.componentId) {
            this.handleError(message.error);
        }
    }
    
    handleUpdate(action, data) {
        switch (action) {
            case 'dataUpdate':
                this.updateComponentData(data);
                break;
            case 'configUpdate':
                this.updateComponentConfig(data);
                break;
            default:
                console.warn(`Unknown update action: ${action}`);
        }
    }
    
    // ✅ REQUIRED - Efficient DOM updates without full page reload
    updateComponentData(data) {
        console.log(`Updating component ${this.componentId} with new data`);
        
        // Update DOM elements efficiently
        this.clearContent();
        this.renderContent(data);
        this.updateInteractions();
        
        console.log(`Component ${this.componentId} updated successfully`);
    }
    
    // Send user interactions back to Extension Host
    notifyUserAction(action, data) {
        ComponentUtils.sendMessage('component-action', {
            componentId: this.componentId,
            action: action,
            data: data,
            timestamp: Date.now()
        });
    }
}

// ✅ REQUIRED - Make behavior available globally
window.MyComponentBehavior = MyComponentBehavior;
```

### **Multi-Instance Component Support**

```typescript
// Support multiple instances per panel
const sourceEnvSelector = ComponentFactory.createEnvironmentSelector({
    id: 'sourceEnv',           // ← Unique ID required
    label: 'Source Environment:',
    onChange: this.handleSourceEnvChange.bind(this)
});

const targetEnvSelector = ComponentFactory.createEnvironmentSelector({
    id: 'targetEnv',           // ← Different unique ID
    label: 'Target Environment:',  
    onChange: this.handleTargetEnvChange.bind(this)
});
```

### **Component Communication**

```typescript
// Component-to-component communication via events
export class BaseComponent extends EventEmitter {
    protected notifyUpdate(): void {
        this.emit('update', { componentId: this.config.id });
    }
    
    protected notifyStateChange(state: any): void {
        this.emit('stateChange', { componentId: this.config.id, state });
    }
}

// Panel listens for component events
this.environmentSelector.on('update', (data) => {
    this.handleComponentUpdate(data);
});
```

---

## 🚀 Migration Path from Legacy Architecture

### **Phase 1: Core Component Infrastructure**
1. ✅ Create base component classes and interfaces
2. ✅ Implement ComponentFactory with basic components
3. ✅ Create PanelComposer for HTML generation
4. ✅ Update CLAUDE.md and architecture docs

### **Phase 2: Priority Component Implementation**
1. 🔄 **EnvironmentSelectorComponent** - Used by all panels
2. 🔄 **DataTableComponent** - Most commonly used component
3. 🔄 **ActionBarComponent** - Standard panel actions
4. 🔄 **SolutionSelectorComponent** - Used by multiple panels

### **Phase 3: Panel Migration**
1. 🔄 **EnvironmentVariablesPanel** - Simplest panel for testing
2. 🔄 **SolutionExplorerPanel** - Most complex, good test case
3. 🔄 **DataExplorerPanel** - Multiple selectors, good multi-instance test

### **Phase 4: Advanced Components**
1. ⏳ **FilterFormComponent** - Advanced filtering capabilities
2. ⏳ **SearchFormComponent** - Search functionality
3. ⏳ **CollapsibleSectionComponent** - Expandable content areas
4. ⏳ **TabsComponent** - Multi-section panels

### **Phase 5: Legacy Cleanup**
1. ⏳ Remove legacy ComponentFactory methods
2. ⏳ Phase out TableUtils.js in favor of DataTableBehavior.js
3. ⏳ Clean up unused CSS and JavaScript files
4. ⏳ Update all documentation

---

## 🏆 Expected Benefits

### **Code Reusability**
- **Before**: ~70% duplicate code across panels for environment selectors
- **After**: Single EnvironmentSelectorComponent used everywhere

### **Multi-Instance Support**
- **Before**: Impossible to have multiple environment selectors per panel
- **After**: Unlimited instances with independent state management

### **Maintainability** 
- **Before**: Bug fixes require changes in 7+ places
- **After**: Fix once in component, automatically updates all panels

### **Developer Experience**
- **Before**: Custom HTML and JavaScript for each panel
- **After**: Configure components, compose with PanelComposer.compose()

### **Type Safety**
- **Before**: Untyped HTML generation and configuration
- **After**: Full TypeScript interfaces for all component configurations

### **Testing**
- **Before**: Integration testing only (full panel required)
- **After**: Unit test individual components in isolation

---

## 📈 Success Metrics

### **Immediate Goals (Phase 1-2)**
- ✅ Component infrastructure established
- 🎯 3 core components implemented (EnvironmentSelector, DataTable, ActionBar)
- 🎯 1 panel migrated as proof of concept (EnvironmentVariablesPanel)
- 🎯 Multi-instance functionality demonstrated

### **Medium-term Goals (Phase 3-4)**
- 🎯 All 8 panels migrated to component composition
- 🎯 90%+ reduction in duplicate HTML/JavaScript code
- 🎯 Complete type safety for component configurations
- 🎯 Comprehensive component test coverage

### **Long-term Benefits**
- 🎯 New panel development reduced from days to hours
- 🎯 Component library reusable across multiple VS Code extensions
- 🎯 Consistent user experience across all panels
- 🎯 Easy addition of new features (themes, accessibility, etc.)

---

## 📊 Logging Architecture

### **Centralized LoggerService**

Professional logging system using VS Code's native APIs for structured, security-conscious logging with context-specific patterns:

```typescript
// Service integration
export class ServiceFactory {
    static getLoggerService(): LoggerService { ... }
}

// Panel usage - BasePanel provides this.componentLogger automatically
class MyPanel extends BasePanel {
    private async loadData() {
        this.componentLogger.info('Loading panel data', { environmentId: env.id });
        try {
            const data = await this.dataService.fetch();
            this.componentLogger.debug('Data loaded successfully', { recordCount: data.length });
        } catch (error) {
            this.componentLogger.error('Failed to load data', error, { operation: 'fetchData' });
        }
    }
}

// Component usage - BaseComponent provides this.componentLogger automatically
class MyComponent extends BaseComponent {
    public setData(data: any[]): void {
        this.componentLogger.debug('Setting component data', { 
            componentId: this.config.id,
            itemCount: data.length 
        });
        this.data = [...data];
        this.notifyUpdate();
    }
}

// Service usage - Services use private logger getter with manual setup
class MyService {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger() {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('MyService');
        }
        return this._logger;
    }
    
    public async fetchData(params: any): Promise<any> {
        this.logger.info('Fetching service data', { params });
        try {
            const result = await this.apiCall(params);
            this.logger.debug('Service data retrieved', { resultCount: result.length });
            return result;
        } catch (error) {
            this.logger.error('Service data fetch failed', error, { operation: 'fetchData' });
            throw error;
        }
    }
}
```

### **Security Features**

- **Automatic sanitization** of tokens, passwords, and sensitive data
- **Structured metadata** for debugging without exposing credentials
- **VS Code integration** for user-accessible logs via native commands

### **Logging Patterns by Architectural Layer**

The extension uses different logging patterns depending on the architectural layer:

| Layer | Property | Pattern | Reason |
|-------|----------|---------|--------|
| **Panels** | `this.componentLogger` | Auto-provided by BasePanel | Inherits from BasePanel, automatic setup |
| **Components** | `this.componentLogger` | Auto-provided by BaseComponent | Inherits from BaseComponent, automatic setup |
| **Services** | `this.logger` | Manual getter with lazy initialization | Independent classes, manual logger setup |
| **Webview Behaviors** | `console.log` | Browser console only | LoggerService not available in webview context |

**When to use each pattern:**

```typescript
// ✅ PANELS: Use this.componentLogger (BasePanel provides automatically)
class MyPanel extends BasePanel {
    async loadData() {
        this.componentLogger.info('Loading panel data');
    }
}

// ✅ COMPONENTS: Use this.componentLogger (BaseComponent provides automatically) 
class MyComponent extends BaseComponent {
    setData(data: any[]) {
        this.componentLogger.debug('Setting component data');
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
        this.logger.info('Fetching data');
    }
}

// ✅ WEBVIEW BEHAVIORS: Use console.log (LoggerService not available)
class MyBehavior {
    static handleMessage(message) {
        console.log('Handling message in webview:', message);
    }
}
```

### **Log Levels & Usage**

| Level | Purpose | Example |
|-------|---------|---------|
| **trace** | Detailed flow | Method entry/exit, component lifecycle |
| **debug** | Development info | State changes, initialization steps |
| **info** | Milestones | Panel opened, data loaded, user actions |
| **warn** | Concerning | Deprecation warnings, fallback usage |
| **error** | Failures | Exceptions, failed operations, validation errors |

### **Access Methods**

**For Users:**
- `Developer: Open Extensions Logs Folder` (VS Code command)
- `Developer: Set Log Level...` (configure verbosity)

**For Development:**  
- Output panel: "Power Platform Developer Suite" channel
- Structured JSON format with timestamps and metadata

---

## 🔄 Component Update Communication Architecture

### **The Component Update Challenge**

Components in Extension Host context need to communicate state changes to their corresponding webview representations without causing full HTML regeneration (which creates UI flash and performance issues).

### **Extension Host Component Events**

Components emit events when their state changes using the BaseComponent event system:

```typescript
// BaseComponent automatically provides these methods
export class DataTableComponent extends BaseComponent {
    public setData(data: DataTableRow[]): void {
        this.data = [...data];
        this.processData();
        this.notifyUpdate(); // ✅ Emits 'update' event
    }
    
    public setColumns(columns: TableColumn[]): void {
        this.config.columns = columns;
        this.notifyStateChange({ columns }); // ✅ Emits 'stateChange' event
    }
}
```

**Available Component Events:**
- **`update`** - Component data has changed (e.g., table rows, dropdown options)
- **`stateChange`** - Component configuration has changed (e.g., columns, settings)
- **`error`** - Component encountered an error
- **`initialized`** - Component finished initialization
- **`disposed`** - Component was cleaned up

### **Event Bridge Pattern (Required)**

Panels MUST implement event listeners to bridge Extension Host component events to webview updates:

```typescript
export class ConnectionReferencesPanel extends BasePanel {
    private initializeComponents(): void {
        // Create components
        this.dataTableComponent = ComponentFactory.createDataTable({
            id: 'connectionRefs-table',
            columns: this.getTableColumns()
        });
        
        this.environmentSelectorComponent = ComponentFactory.createEnvironmentSelector({
            id: 'envSelector',
            onChange: this.handleEnvironmentChange.bind(this)
        });
        
        // ✅ CRITICAL: Setup event bridges for each component
        this.setupComponentEventBridges();
    }
    
    private setupComponentEventBridges(): void {
        // Data table update bridge
        this.dataTableComponent.on('update', (event) => {
            this.postMessage({
                command: 'component-update',
                componentId: event.componentId,
                action: 'setData',
                data: this.dataTableComponent.getData()
            });
        });
        
        // Environment selector state change bridge  
        this.environmentSelectorComponent.on('stateChange', (event) => {
            this.postMessage({
                command: 'component-update',
                componentId: event.componentId, 
                action: 'environmentsLoaded',
                data: {
                    environments: event.state.environments,
                    selectedId: event.state.selectedId
                }
            });
        });
        
        // Error handling bridge
        [this.dataTableComponent, this.environmentSelectorComponent].forEach(component => {
            component.on('error', (event) => {
                this.postMessage({
                    command: 'component-error',
                    componentId: event.componentId,
                    error: event.error
                });
            });
        });
    }
}
```

### **Webview Component Message Handling**

Component behavior scripts MUST implement `handleMessage()` to process Extension Host updates:

```javascript
// DataTableBehavior.js
class DataTableBehavior {
    constructor(tableId) {
        this.tableId = tableId;
        this.table = document.getElementById(tableId);
        this.initialized = false;
        this.init();
        
        // Register for component update messages
        ComponentUtils.registerMessageHandler(this.tableId, this.handleMessage.bind(this));
    }
    
    // ✅ REQUIRED: Handle messages from Extension Host
    handleMessage(message) {
        if (message.command === 'component-update' && 
            message.componentId === this.tableId) {
            
            switch (message.action) {
                case 'setData':
                    this.updateTableData(message.data);
                    break;
                case 'setColumns':
                    this.updateTableColumns(message.data);
                    break;
                case 'setLoading':
                    this.toggleLoadingState(message.data);
                    break;
            }
        } else if (message.command === 'component-error' &&
                   message.componentId === this.tableId) {
            this.showErrorState(message.error);
        }
    }
    
    // Efficient DOM updates without full page reload
    updateTableData(data) {
        console.log(`Updating table ${this.tableId} with ${data.length} rows`);
        
        // Clear existing rows
        const tbody = this.table.querySelector('tbody');
        tbody.innerHTML = '';
        
        // Add new rows
        data.forEach(row => {
            const tr = this.createTableRow(row);
            tbody.appendChild(tr);
        });
        
        // Update pagination, sorting, etc.
        this.updateTableMeta(data);
        
        console.log(`Table ${this.tableId} updated successfully`);
    }
    
    createTableRow(rowData) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-row-id', rowData.id);
        
        // Create cells based on current column configuration
        this.currentColumns.forEach(column => {
            const td = document.createElement('td');
            td.textContent = rowData[column.key] || '';
            td.className = `table-cell table-cell-${column.key}`;
            tr.appendChild(td);
        });
        
        return tr;
    }
}

// Auto-initialize when script loads
window.DataTableBehavior = DataTableBehavior;
```

### **ComponentUtils Message Routing**

The ComponentUtils.js handles message routing to appropriate component behaviors:

```javascript
// ComponentUtils.js enhancements
class ComponentUtils {
    static messageHandlers = new Map();
    
    static registerMessageHandler(componentId, handler) {
        this.messageHandlers.set(componentId, handler);
    }
    
    static handleMessage(event) {
        const message = event.data;
        
        if (!message || !message.command) {
            return;
        }
        
        // Route component-specific messages
        if (message.componentId && this.messageHandlers.has(message.componentId)) {
            const handler = this.messageHandlers.get(message.componentId);
            handler(message);
            return;
        }
        
        // Handle global panel messages
        this.handleGlobalMessage(message);
    }
}
```

### **Component Update Strategies**

#### **✅ Use Component Messaging (Recommended)**
For data updates that don't change component structure:

```typescript
// ✅ CORRECT: Component handles webview update automatically
this.dataTableComponent.setData(newTableData);
// Flow: setData() → notifyUpdate() → Panel event bridge → Webview DOM update

this.environmentSelectorComponent.setEnvironments(environments);  
// Flow: setEnvironments() → notifyStateChange() → Panel bridge → Webview update
```

#### **❌ Avoid `updateWebview()` for Data Updates**  
Only use `updateWebview()` for structural changes requiring full HTML regeneration:

```typescript
// ❌ WRONG: Causes flash and regenerates entire HTML unnecessarily
this.dataTableComponent.setData(newTableData);
this.updateWebview(); // Regenerates ALL HTML including unchanged components

// ✅ CORRECT: Only when adding/removing components or major layout changes
if (needNewComponents) {
    this.initializeNewComponents();
    this.updateWebview(); // Full HTML regeneration needed for structure change
}
```

#### **Update Decision Matrix**

| Change Type | Method | Reason | Performance |
|-------------|--------|---------|-------------|
| Table data | Component messaging | No HTML structure change | Fast DOM update |
| Dropdown options | Component messaging | Same component, different data | Fast option update |
| Component configuration | Component messaging | Structure preserved | Fast attribute update |
| Add/remove components | `updateWebview()` | HTML structure changes | Full regeneration needed |
| Panel layout change | `updateWebview()` | Major DOM changes needed | Full regeneration needed |
| Theme/CSS changes | Component messaging | Styling only | Fast class update |

### **Message Protocol Standards**

#### **Extension Host → Webview (Component Updates)**
```typescript
// Standard component update message format
this.postMessage({
    command: 'component-update',     // Standard command
    componentId: 'myTable',          // Target component ID  
    action: 'setData',               // Specific action to perform
    data: transformedTableData,      // Action payload
    timestamp: Date.now()            // For debugging/ordering
});
```

#### **Webview → Extension Host (User Actions)**
```javascript
// Standard user action message format  
ComponentUtils.sendMessage('component-action', {
    componentId: 'myTable',          // Source component ID
    action: 'row-selected',          // User action type
    data: {                          // Action details
        rowId: 'row-123',
        rowData: selectedRow
    },
    timestamp: Date.now()
});
```

#### **Error Handling Messages**
```typescript
// Extension Host error notification
this.postMessage({
    command: 'component-error',
    componentId: 'myTable',
    error: {
        message: error.message,
        type: 'data-load-failed',
        recovery: 'retry-available'
    }
});
```

### **Implementation Checklist**

For each new component, ensure:

- [ ] **Extension Host Component**: Calls `notifyUpdate()` or `notifyStateChange()` appropriately
- [ ] **Panel Event Bridge**: Listens to component events and forwards to webview  
- [ ] **Webview Behavior**: Implements `handleMessage()` for update processing
- [ ] **Message Registration**: Component registers with ComponentUtils message router
- [ ] **Error Handling**: Both Extension Host errors and webview errors are handled
- [ ] **Performance**: Uses component messaging instead of `updateWebview()` for data updates

---

## 🔄 Data Flow and Transformation Architecture

### **Data Layer Responsibilities**

The extension enforces clear separation of concerns across three data processing layers:

#### **1. Service Layer (Business Data)**
**Purpose**: Return raw business data from APIs with complete accuracy and business logic
- Raw OData entities, relationship objects, API responses
- Business logic: filtering, aggregation, entity relationships
- Data completeness and accuracy focus
- **Example**: `ConnectionReferencesService` returns `FlowConnectionRelationship[]`

```typescript
// Service Layer - Business Data
export interface FlowConnectionRelationship {
    id: string;
    flowId?: string;
    flowName?: string;
    flowModifiedOn?: string;
    connectionReferenceId?: string;
    connectionReferenceLogicalName?: string;
    connectorType?: string;
    relationshipType: 'flow-to-cr' | 'orphaned-flow' | 'orphaned-cr';
    // ... business fields
}
```

#### **2. Panel Layer (UI Data Transformation)**
**Purpose**: Transform business data to UI-ready format for component consumption
- Add required UI properties (especially `id` for table rows)
- Apply UI-specific formatting (dates, status badges, display names)
- Handle null/undefined values with fallback display text
- **Ownership**: Data transformation is **Panel Layer responsibility**

```typescript
// Panel Layer - UI Transformation
private transformConnectionReferencesData(relationships: any): any[] {
    if (!relationships || !relationships.relationships) {
        this.componentLogger.debug('No relationships data to transform');
        return [];
    }

    const relationshipItems = relationships.relationships || [];
    this.componentLogger.debug('Transforming business data for UI', { 
        itemCount: relationshipItems.length 
    });

    const tableData = relationshipItems.map((rel: any) => ({
        id: rel.id, // REQUIRED: Unique identifier for table rows
        flowName: rel.flowName || 'No Flow Associated',
        connectionReference: rel.connectionReferenceLogicalName || 'No Connection Reference',
        connectorType: rel.connectorType || 'Unknown Connector',
        relationshipType: rel.relationshipType || 'unknown',
        isManaged: (rel.flowIsManaged || rel.crIsManaged) ? 'Yes' : 'No',
        modifiedOn: this.formatDate(rel.flowModifiedOn || rel.crModifiedOn),
        modifiedBy: rel.flowModifiedBy || rel.crModifiedBy || 'Unknown'
    }));

    this.componentLogger.debug('Data transformation completed', { 
        originalCount: relationshipItems.length,
        transformedCount: tableData.length 
    });

    return tableData;
}
```

#### **3. Component Layer (Display)**
**Purpose**: Accept transformed UI data and render consistently
- Focus on interaction, sorting, filtering, styling
- No business logic or data transformation
- Consistent rendering and user experience

```typescript
// Component Layer - Display Only
this.dataTable = ComponentFactory.createDataTable({
    id: 'relationshipsTable',
    columns: [
        { key: 'flowName', label: 'Flow Name', sortable: true },
        { key: 'connectionReference', label: 'Connection Reference', sortable: true },
        { key: 'connectorType', label: 'Connector Type', sortable: true }
    ],
    data: transformedTableData  // ← UI-ready data from panel transformation
});
```

### **Data Transformation Pattern**

**Standard implementation pattern for all panels:**

```typescript
// 1. Load business data from service
private async loadConnectionReferences(environmentId: string, solutionId?: string): Promise<void> {
    try {
        this.componentLogger.info('Loading connection references', { environmentId, solutionId });
        
        // Get business data from service layer
        const relationships = await this.connectionReferencesService.aggregateRelationships(
            environmentId, 
            solutionId
        );
        
        this.componentLogger.info('Business data loaded', { 
            flowsCount: relationships.flows.length,
            connectionReferencesCount: relationships.connectionReferences.length,
            relationshipsCount: relationships.relationships.length 
        });

        // Transform business data for UI display
        const tableData = this.transformConnectionReferencesData(relationships);
        
        // Send UI-ready data to components
        this.postMessage({
            action: 'connectionReferencesLoaded',
            data: tableData
        });
        
    } catch (error) {
        this.componentLogger.error('Error loading connection references', error as Error);
    }
}

// 2. Transform business data to UI format
private transformConnectionReferencesData(businessData: any): any[] {
    // Comprehensive logging for debugging data flow
    this.componentLogger.debug('Starting data transformation', { businessData });
    
    if (!businessData?.relationships) {
        this.componentLogger.warn('No relationship data available for transformation');
        return [];
    }
    
    const tableData = businessData.relationships.map((item: any) => ({
        // CRITICAL: id property required for table row actions
        id: item.id || `${item.flowId || 'orphan'}-${item.connectionReferenceId || 'none'}`,
        
        // UI-specific formatting with null safety
        displayName: item.flowName || 'No Flow Associated',
        status: this.formatStatus(item.relationshipType),
        lastModified: this.formatDate(item.flowModifiedOn || item.crModifiedOn),
        
        // Fallback values for missing data
        connectorType: item.connectorType || 'Unknown',
        isManaged: (item.flowIsManaged || item.crIsManaged) ? 'Yes' : 'No'
    }));
    
    this.componentLogger.info('Data transformation completed', {
        originalCount: businessData.relationships.length,
        transformedCount: tableData.length
    });
    
    return tableData;
}

// 3. Helper methods for UI formatting
private formatStatus(relationshipType: string): string {
    const statusMap = {
        'flow-to-cr': 'Connected',
        'orphaned-flow': 'Orphaned Flow', 
        'orphaned-cr': 'Orphaned Reference'
    };
    return statusMap[relationshipType] || 'Unknown';
}

private formatDate(dateString?: string): string {
    if (!dateString) return 'Unknown';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return 'Invalid Date';
    }
}
```

### **Critical Requirements**

#### **1. Table Data `id` Property**
All table data objects **must** have a unique `id` field for row actions to function:

```typescript
// ✅ CORRECT - Every row has unique id
const tableData = items.map(item => ({
    id: item.primaryKey || `generated-${index}`,  // Required!
    name: item.displayName,
    status: item.isActive ? 'Active' : 'Inactive'
}));

// ❌ INCORRECT - Missing id property
const tableData = items.map(item => ({
    name: item.displayName,     // Missing id!
    status: item.isActive ? 'Active' : 'Inactive'
}));
```

#### **2. Panel Layer Ownership**
Data transformation **belongs in panels**, not services or components:

- **Services**: Return complete business data for maximum flexibility
- **Panels**: Transform business data to meet UI component requirements
- **Components**: Accept UI-ready data, focus on display and interaction

#### **3. Comprehensive Logging**
Log all transformation steps for debugging data flow issues:

```typescript
this.componentLogger.debug('Transforming business data for UI', { 
    inputType: typeof businessData,
    itemCount: businessData?.length || 0
});

// ... transformation logic ...

this.componentLogger.info('Transformation completed', {
    originalCount: businessData.length,
    transformedCount: tableData.length,
    hasRequiredIds: tableData.every(item => !!item.id)
});
```

#### **4. Null Safety**
Handle null/undefined values with appropriate fallback display text:

```typescript
const tableData = businessData.map(item => ({
    id: item.id || `fallback-${Date.now()}-${Math.random()}`,
    displayName: item.name || item.title || 'Unnamed Item',
    status: item.isActive ? 'Active' : 'Inactive',
    lastModified: item.modifiedOn ? this.formatDate(item.modifiedOn) : 'Never',
    owner: item.owner?.name || 'Unknown User'
}));
```

#### **5. Type Consistency**
Maintain consistent data types throughout the transformation pipeline:

```typescript
// Define transformation interface
interface UITableRow {
    id: string;           // Always string for consistency
    displayName: string;  // Never null/undefined
    status: string;       // Formatted display value
    lastModified: string; // Formatted date string
    isManaged: string;    // 'Yes'/'No' not boolean
}

// Use interface in transformation
private transformDataForTable(businessData: any[]): UITableRow[] {
    return businessData.map(item => ({
        id: String(item.id || 'unknown'),
        displayName: String(item.name || 'Unnamed'),
        status: this.formatStatus(item.status),
        lastModified: this.formatDate(item.modifiedOn),
        isManaged: item.isManaged ? 'Yes' : 'No'
    }));
}
```

### **Benefits of This Architecture**

- **Clear Separation**: Each layer has distinct, well-defined responsibilities
- **Reusable Services**: Business logic can be reused across multiple panels
- **Consistent UI**: All tables receive properly formatted, UI-ready data
- **Debuggable**: Comprehensive logging reveals data flow issues quickly
- **Type Safe**: TypeScript interfaces ensure data consistency
- **Maintainable**: Changes to business logic don't affect UI formatting and vice versa