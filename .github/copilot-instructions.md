# GitHub Copilot Instructions for Power Platform Developer Suite

**IMPORTANT: Keep this file synchronized with `CLAUDE.md`. Any updates should be made to both files identically.**

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
- **ComponentUtils** - Base utilities shared by all components
- **EnvironmentSelectorBehavior** - Environment selector webview interactions
- **SolutionSelectorBehavior** - Solution selector webview interactions  
- **DataTableBehavior** - Enhanced data table functionality
- **ActionBarBehavior** - Action bar and button handling
- **PanelUtils** - Panel-level operations (loading states, messaging, error handling)
- **TableUtils** - Legacy table functionality (being phased out)

### Critical Requirements

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

**State Management:**
- Use StateService for UI state persistence (not data caching)
- Always make fresh API calls, only cache UI preferences
- Save panel state: selected environment, sort settings, view config

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