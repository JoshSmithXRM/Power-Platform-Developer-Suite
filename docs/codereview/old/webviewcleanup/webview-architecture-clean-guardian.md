# Webview Architecture: Clean Architecture Compliance Analysis

> **Purpose:** Define architectural patterns for webview templates, components, and HTML generation that maintain Clean Architecture principles and prevent business logic leakage into the presentation layer.

**Status:** Architectural Design Document
**Date:** 2025-10-31
**Context:** Plugin Registration and other complex panels require sophisticated UI with forms, grids, filters. Current inline HTML approach (345+ lines in EnvironmentSetupPanel) won't scale.

---

## Executive Summary

This document establishes Clean Architecture-compliant patterns for building webview UIs in the Power Platform Developer Suite. It addresses the challenge of building complex panels while maintaining strict architectural boundaries, preventing business logic from leaking into templates, and ensuring feature independence.

**Key Architectural Decisions:**
1. **Component-View-Behavior Pattern** (already implemented in TEMP/templates)
2. **Layer-Specific Responsibilities** for templates and composition
3. **Dependency Inversion** for ViewModels → Templates
4. **PanelComposer** for centralized resource management
5. **Feature-Scoped Components** with shared base classes

---

## 1. Layer Responsibilities: Who Owns What?

### 1.1 Domain Layer
**Owns:** NOTHING related to HTML/UI

**Rules:**
- ✅ Business entities with behavior
- ✅ Business rules and validation
- ✅ Domain services
- ❌ NO HTML templates
- ❌ NO ViewModels (those live in Application layer)
- ❌ NO knowledge of presentation

**Example:**
```typescript
// ✅ GOOD - Domain entity with business logic
export class Plugin {
    constructor(
        public readonly id: string,
        public readonly name: string,
        private readonly assemblyName: string
    ) {}

    validate(): ValidationResult {
        // Business validation logic
        if (!this.assemblyName.endsWith('.dll')) {
            return { isValid: false, errors: ['Assembly must be a DLL file'] };
        }
        return { isValid: true };
    }

    isSystemPlugin(): boolean {
        return this.assemblyName.startsWith('Microsoft.');
    }
}
```

---

### 1.2 Application Layer
**Owns:** ViewModels and DTOs for presentation

**Rules:**
- ✅ ViewModels (shape data for UI consumption)
- ✅ Mappers (Domain → ViewModel)
- ✅ Use cases (orchestrate domain logic)
- ❌ NO HTML generation
- ❌ NO CSS classes or styling concerns
- ❌ NO component configuration

**Example:**
```typescript
// ✅ GOOD - ViewModel for presentation layer
export interface PluginViewModel {
    id: string;
    name: string;
    assemblyName: string;
    statusLabel: string;           // "Active" / "Inactive"
    statusVariant: 'success' | 'warning' | 'danger';
    isSystemPlugin: boolean;
    displayName: string;           // Formatted for display
    registeredOnDisplay: string;   // "1/30/2025 10:30 AM"
}

// Mapper transforms domain to ViewModel
export class PluginViewModelMapper {
    toViewModel(plugin: Plugin): PluginViewModel {
        return {
            id: plugin.id,
            name: plugin.name,
            assemblyName: plugin.assemblyName,
            statusLabel: plugin.isActive() ? 'Active' : 'Inactive',
            statusVariant: plugin.isActive() ? 'success' : 'warning',
            isSystemPlugin: plugin.isSystemPlugin(),
            displayName: plugin.getDisplayName(),
            registeredOnDisplay: plugin.registeredOn.toLocaleString()
        };
    }
}
```

---

### 1.3 Presentation Layer
**Owns:** Components, Views, Panels, Behaviors

This is where HTML lives, following the **Component-View-Behavior** pattern.

#### 1.3.1 Components (TypeScript - Extension Host)

**Responsibility:** State management, event emission, lifecycle management

**Location:** `src/features/{feature}/presentation/components/` or `src/core/presentation/components/` (for shared)

**Rules:**
- ✅ Manages component state
- ✅ Emits events via EventEmitter
- ✅ Delegates HTML generation to View
- ✅ NO HTML string building
- ✅ NO business logic

**Example:**
```typescript
// src/features/pluginRegistration/presentation/components/PluginGridComponent.ts
export class PluginGridComponent extends BaseDataComponent<DataTableData> {
    private config: DataTableConfig;

    constructor(config: DataTableConfig) {
        super(config);
        this.config = config;
    }

    // Delegates HTML generation to View
    public generateHTML(): string {
        const viewState = this.getViewState();
        return DataTableView.render(this.config, viewState);
    }

    // Component logic - setting data
    public setData(plugins: PluginViewModel[]): void {
        this.data = plugins;
        this.processData();
        this.notifyUpdate(); // Triggers event bridge
    }

    // Component logic - sorting
    public sort(columnId: string, direction: 'asc' | 'desc'): void {
        this.sortConfig = [{ column: columnId, direction }];
        this.processData();
        this.notifyUpdate();
    }

    public getType(): string { return 'DataTable'; }
    public getCSSFile(): string { return 'components/data-table.css'; }
    public getBehaviorScript(): string { return 'components/DataTableBehavior.js'; }
}
```

#### 1.3.2 Views (TypeScript - Extension Host)

**Responsibility:** Pure HTML generation from state

**Location:** `src/features/{feature}/presentation/components/{ComponentName}View.ts` or shared views

**Rules:**
- ✅ Pure functions: State → HTML string
- ✅ NO state management
- ✅ NO event handling
- ✅ Uses ViewModels as input
- ✅ HTML escaping for XSS prevention
- ❌ NO component lifecycle management
- ❌ NO business logic

**Example:**
```typescript
// src/features/pluginRegistration/presentation/components/PluginGridView.ts
export class PluginGridView {
    /**
     * Render complete plugin grid HTML
     */
    static render(config: DataTableConfig, state: DataTableViewState): string {
        return `
            <div class="data-table" data-component-id="${config.id}">
                ${this.renderToolbar(config, state)}
                ${this.renderTable(config, state)}
                ${this.renderPagination(config, state)}
            </div>
        `;
    }

    private static renderTable(config: DataTableConfig, state: DataTableViewState): string {
        return `
            <table class="data-table-element">
                ${this.renderTableHeader(config, state)}
                ${this.renderTableBody(config, state)}
            </table>
        `;
    }

    private static renderTableHeader(config: DataTableConfig, state: DataTableViewState): string {
        const headerCells = config.columns.map(column =>
            this.renderHeaderCell(column, state)
        ).join('');

        return `
            <thead>
                <tr>${headerCells}</tr>
            </thead>
        `;
    }

    private static renderHeaderCell(column: DataTableColumn, state: DataTableViewState): string {
        const sortConfig = state.sortConfig.find(s => s.column === column.id);
        const sortIcon = sortConfig ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '';

        return `
            <th data-column-id="${column.id}" class="${column.sortable ? 'sortable' : ''}">
                <span>${escapeHtml(column.label)}</span>
                ${sortIcon ? `<span class="sort-indicator">${sortIcon}</span>` : ''}
            </th>
        `;
    }

    private static renderTableBody(config: DataTableConfig, state: DataTableViewState): string {
        const rows = state.data.map(row => this.renderTableRow(row, config)).join('');
        return `<tbody>${rows}</tbody>`;
    }

    private static renderTableRow(row: DataTableRow, config: DataTableConfig): string {
        const cells = config.columns.map(column => {
            const value = row[column.field];
            const formatted = column.format ? column.format(value, row) : value;
            return `<td>${escapeHtml(String(formatted ?? ''))}</td>`;
        }).join('');

        return `<tr data-row-id="${row.id}">${cells}</tr>`;
    }
}
```

#### 1.3.3 Behaviors (JavaScript - Webview Context)

**Responsibility:** Client-side interactivity and message passing

**Location:** `resources/webview/js/components/{ComponentName}Behavior.js`

**Rules:**
- ✅ DOM event handling
- ✅ Sends messages to Extension Host via postMessage
- ✅ Receives updates from Extension Host
- ✅ DOM manipulation (show/hide, animations)
- ❌ NO business logic
- ❌ NO calculations or validation (except basic UI validation like "required field")

**Example:**
```javascript
// resources/webview/js/components/DataTableBehavior.js
class DataTableBehavior extends BaseBehavior {
    constructor(componentElement) {
        super(componentElement);
        this.componentId = componentElement.dataset.componentId;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle sort clicks
        this.componentElement.querySelectorAll('th.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const columnId = header.dataset.columnId;
                this.handleSort(columnId);
            });
        });

        // Handle pagination
        this.componentElement.querySelectorAll('[data-page]').forEach(button => {
            button.addEventListener('click', () => {
                const page = button.dataset.page;
                this.handlePageChange(page);
            });
        });
    }

    handleSort(columnId) {
        // NO business logic - just pass to Extension Host
        this.postMessage({
            command: 'component-event',
            data: {
                componentId: this.componentId,
                eventType: 'sort',
                data: { columnId }
            }
        });
    }

    handlePageChange(page) {
        this.postMessage({
            command: 'component-event',
            data: {
                componentId: this.componentId,
                eventType: 'pageChange',
                data: { page }
            }
        });
    }

    // Handle updates from Extension Host
    handleUpdate(data) {
        // Update DOM with new data
        this.updateTableBody(data.data);
        this.updatePagination(data.currentPage, data.totalPages);
    }

    updateTableBody(rows) {
        const tbody = this.componentElement.querySelector('tbody');
        // Update DOM with new rows
        // NO calculations - just rendering what Extension Host sent
    }
}

// Register behavior with ComponentUtils
ComponentUtils.registerBehavior('DataTable', DataTableBehavior);
```

#### 1.3.4 Panels (TypeScript - Extension Host)

**Responsibility:** Top-level UI containers, orchestrate components, delegate to use cases

**Location:** `src/features/{feature}/presentation/panels/{PanelName}Panel.ts`

**Rules:**
- ✅ Creates and manages components
- ✅ Calls use cases from Application layer
- ✅ Handles user actions (button clicks)
- ✅ Uses PanelComposer to assemble HTML
- ❌ NO inline HTML (delegate to components/views)
- ❌ NO business logic (delegate to use cases)

**Example:**
```typescript
// src/features/pluginRegistration/presentation/panels/PluginRegistrationPanel.ts
export class PluginRegistrationPanel extends BasePanel {
    private pluginGrid: DataTableComponent;
    private actionBar: ActionBarComponent;
    private filterPanel: FilterPanelComponent;

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService) {
        super(panel, extensionUri, authService, {
            viewType: 'pluginRegistration',
            title: 'Plugin Registration'
        });

        // Create components
        this.pluginGrid = ComponentFactory.createDataTable({
            id: 'plugin-grid',
            columns: this.getColumnDefinitions(),
            sortable: true,
            paginated: true
        });

        this.actionBar = ComponentFactory.createActionBar({
            id: 'plugin-actions',
            actions: [
                { id: 'register', label: 'Register Plugin', icon: 'add' },
                { id: 'unregister', label: 'Unregister', icon: 'trash' },
                { id: 'refresh', label: 'Refresh', icon: 'refresh' }
            ]
        });

        this.filterPanel = ComponentFactory.createFilterPanel({
            id: 'plugin-filters',
            fields: this.getFilterFields()
        });

        // Setup event bridges
        this.setupComponentEventBridges([this.pluginGrid, this.actionBar, this.filterPanel]);
    }

    protected getHtmlContent(): string {
        // Use PanelComposer to assemble components
        return PanelComposer.compose(
            [this.actionBar, this.filterPanel, this.pluginGrid],
            this.getCommonWebviewResources(),
            'Plugin Registration'
        );
    }

    protected async loadEnvironmentData(environmentId: string): Promise<void> {
        // Delegate to use case
        this.pluginGrid.setLoading(true, 'Loading plugins...');

        const plugins = await this.loadPluginsUseCase.execute({ environmentId });

        this.pluginGrid.setData(plugins);
        this.pluginGrid.setLoading(false);
    }

    protected async handlePanelAction(componentId: string, actionId: string): Promise<void> {
        switch (actionId) {
            case 'register':
                await this.handleRegisterPlugin();
                break;
            case 'unregister':
                await this.handleUnregisterPlugin();
                break;
            case 'refresh':
                await this.handleRefresh();
                break;
        }
    }

    private async handleRegisterPlugin(): Promise<void> {
        // Show dialog, get user input, then delegate to use case
        const result = await this.registerPluginCommand.execute({
            environmentId: this.currentEnvironmentId!
        });

        if (result.success) {
            vscode.window.showInformationMessage('Plugin registered successfully');
            await this.handleRefresh();
        }
    }

    private getColumnDefinitions(): DataTableColumn[] {
        return [
            {
                id: 'name',
                label: 'Name',
                field: 'name',
                sortable: true
            },
            {
                id: 'assemblyName',
                label: 'Assembly',
                field: 'assemblyName',
                sortable: true
            },
            {
                id: 'status',
                label: 'Status',
                field: 'statusLabel',
                sortable: true,
                cellRenderer: (value, row) => {
                    return `<span class="status-badge status-badge--${row.statusVariant}">${escapeHtml(value)}</span>`;
                }
            }
        ];
    }
}
```

---

## 2. Dependency Direction: Ensuring Clean Architecture

### 2.1 Dependency Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                            │
│  • Plugin entity                                           │
│  • Business rules                                          │
│  • NO dependencies                                         │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ depends on
┌─────────────────────────────────────────────────────────────┐
│               APPLICATION LAYER                            │
│  • PluginViewModel                                         │
│  • PluginViewModelMapper                                   │
│  • LoadPluginsUseCase                                      │
│  • RegisterPluginCommand                                   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ depends on
┌─────────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                            │
│                                                            │
│  Panel (PluginRegistrationPanel)                          │
│    ├─> Component (DataTableComponent)                     │
│    │     ├─> View (DataTableView)                         │
│    │     └─> Behavior (DataTableBehavior.js)              │
│    │                                                       │
│    └─> PanelComposer (assembles HTML)                     │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Dependency Rules

#### Rule 1: Templates CANNOT depend on Domain Entities

```typescript
// ❌ BAD - View depending on Domain entity
import { Plugin } from '../../../domain/entities/Plugin';

export class PluginGridView {
    static render(plugins: Plugin[]): string {  // ← Domain entity leaked into View
        // This violates Clean Architecture!
        // Views should only know about ViewModels
    }
}

// ✅ GOOD - View depends on ViewModel
import { PluginViewModel } from '../../../application/viewModels/PluginViewModel';

export class PluginGridView {
    static render(plugins: PluginViewModel[]): string {  // ← ViewModel from Application layer
        // This is correct - Views consume ViewModels
    }
}
```

#### Rule 2: Shared Components CANNOT depend on Feature-Specific ViewModels

```typescript
// ❌ BAD - Shared component depending on feature-specific ViewModel
// src/core/presentation/components/DataTableComponent.ts
import { PluginViewModel } from '../../../features/pluginRegistration/application/viewModels/PluginViewModel';

export class DataTableComponent {
    setData(data: PluginViewModel[]): void {  // ← Feature coupling!
        // This prevents reuse across features
    }
}

// ✅ GOOD - Shared component uses generic types
export class DataTableComponent<TRow = DataTableRow> {
    setData(data: TRow[]): void {  // ← Generic, reusable
        // Component works with any row shape
    }
}

// Feature-specific usage:
const pluginGrid = new DataTableComponent<PluginViewModel>({
    id: 'plugin-grid',
    columns: [...] // Feature-specific column config
});
```

#### Rule 3: ViewModels flow FROM Application TO Presentation (one-way)

```typescript
// ✅ GOOD - Proper dependency direction
// Panel → Use Case → ViewModel

export class PluginRegistrationPanel extends BasePanel {
    private async loadPlugins(): Promise<void> {
        // 1. Call use case (Application layer)
        const viewModels: PluginViewModel[] = await this.loadPluginsUseCase.execute({
            environmentId: this.currentEnvironmentId
        });

        // 2. Pass ViewModels to Component (Presentation layer)
        this.pluginGrid.setData(viewModels);  // Component receives ViewModels
    }
}

// ❌ BAD - Presentation layer creating ViewModels
export class PluginRegistrationPanel extends BasePanel {
    private async loadPlugins(): Promise<void> {
        // 1. Get domain entities directly (WRONG!)
        const plugins: Plugin[] = await this.pluginRepository.getAll();

        // 2. Map in Presentation layer (WRONG!)
        const viewModels = plugins.map(p => ({
            id: p.id,
            name: p.name,
            statusLabel: p.isActive() ? 'Active' : 'Inactive'  // Business logic in Panel!
        }));

        this.pluginGrid.setData(viewModels);
    }
}
```

---

## 3. Directory Structure: Where Everything Lives

### 3.1 Feature-Scoped Components

Components specific to a single feature:

```
src/features/pluginRegistration/
├── domain/
│   ├── entities/
│   │   └── Plugin.ts                    # Domain entity with business logic
│   └── interfaces/
│       └── IPluginRepository.ts
│
├── application/
│   ├── useCases/
│   │   └── LoadPluginsUseCase.ts
│   ├── commands/
│   │   └── RegisterPluginCommand.ts
│   ├── viewModels/
│   │   └── PluginViewModel.ts           # Shape for presentation
│   └── mappers/
│       └── PluginViewModelMapper.ts     # Domain → ViewModel
│
├── presentation/
│   ├── panels/
│   │   └── PluginRegistrationPanel.ts   # Top-level container
│   │
│   ├── components/
│   │   ├── PluginDetailsComponent.ts    # Feature-specific component
│   │   └── PluginDetailsView.ts         # HTML generation
│   │
│   └── behaviors/                       # If feature needs custom behaviors
│       └── PluginDetailsBehavior.js
│
└── infrastructure/
    └── repositories/
        └── PluginRepository.ts
```

### 3.2 Shared Components (Reusable Across Features)

Components used by multiple features:

```
src/core/presentation/
├── components/
│   ├── DataTableComponent.ts            # Generic table component
│   ├── DataTableView.ts                 # HTML generation
│   ├── ActionBarComponent.ts            # Generic action bar
│   ├── ActionBarView.ts
│   ├── FilterPanelComponent.ts
│   ├── FilterPanelView.ts
│   └── ... (other shared components)
│
└── panels/
    └── BasePanel.ts                     # Base class for all panels

resources/webview/
├── css/
│   ├── base/
│   │   ├── component-base.css           # Base component styles (all components)
│   │   └── panel-base.css               # Base panel styles (all panels)
│   │
│   └── components/
│       ├── data-table.css               # DataTable-specific styles
│       ├── action-bar.css
│       ├── filter-panel.css
│       └── ... (other component styles)
│
└── js/
    ├── utils/
    │   ├── BaseBehavior.js              # Base class for behaviors
    │   └── ComponentUtils.js            # Behavior registration
    │
    └── components/
        ├── DataTableBehavior.js         # DataTable client-side logic
        ├── ActionBarBehavior.js
        ├── FilterPanelBehavior.js
        └── ... (other behaviors)
```

### 3.3 PanelComposer Location

```
src/
└── factories/
    └── PanelComposer.ts                 # Centralized HTML assembly
```

**Rationale:** PanelComposer is infrastructure for composing panels, not domain logic. It lives in `factories/` alongside ComponentFactory.

---

## 4. Shared Component Strategy: Reuse Without Coupling

### 4.1 When to Share Components

**Share when:**
- ✅ Component has NO feature-specific business logic
- ✅ Component accepts generic configuration
- ✅ Component is used by 2+ features
- ✅ Component has clear, stable interface

**Examples of shareable components:**
- DataTable (generic grid)
- ActionBar (generic toolbar)
- FilterPanel (generic filtering)
- SearchInput (generic search box)
- StatusBadge (generic status indicator)
- EnvironmentSelector (shared across all panels)

**Don't share when:**
- ❌ Component contains feature-specific business rules
- ❌ Component tightly coupled to specific ViewModels
- ❌ Component only used in one feature (yet)

### 4.2 Shared Component Design Pattern

**Use Generic Types + Configuration:**

```typescript
// src/core/presentation/components/DataTableComponent.ts

// Generic component that works with any row type
export class DataTableComponent<TRow = DataTableRow> extends BaseDataComponent {
    private config: DataTableConfig<TRow>;

    constructor(config: DataTableConfig<TRow>) {
        super(config);
        this.config = config;
    }

    setData(rows: TRow[]): void {
        this.data = rows;
        this.processData();
        this.notifyUpdate();
    }

    generateHTML(): string {
        // Generic View doesn't know about specific TRow shapes
        return DataTableView.render(this.config, this.getViewState());
    }
}

// Configuration with feature-specific concerns:
export interface DataTableConfig<TRow = DataTableRow> {
    id: string;
    columns: DataTableColumn<TRow>[];  // Columns know how to render TRow
    sortable?: boolean;
    filterable?: boolean;
    paginated?: boolean;
}

export interface DataTableColumn<TRow = DataTableRow> {
    id: string;
    label: string;
    field: keyof TRow;  // Type-safe field access
    sortable?: boolean;
    format?: (value: unknown, row: TRow) => string;
    cellRenderer?: (value: unknown, row: TRow, column: DataTableColumn<TRow>) => string;
}
```

**Feature-Specific Usage:**

```typescript
// src/features/pluginRegistration/presentation/panels/PluginRegistrationPanel.ts

// Feature-specific usage with PluginViewModel
this.pluginGrid = new DataTableComponent<PluginViewModel>({
    id: 'plugin-grid',
    columns: [
        {
            id: 'name',
            label: 'Plugin Name',
            field: 'name',  // Type-safe: TypeScript knows PluginViewModel has 'name'
            sortable: true
        },
        {
            id: 'status',
            label: 'Status',
            field: 'statusLabel',
            cellRenderer: (value, row: PluginViewModel) => {
                // Feature-specific rendering logic in panel configuration
                return `<span class="status-badge status-badge--${row.statusVariant}">
                    ${escapeHtml(value as string)}
                </span>`;
            }
        }
    ],
    sortable: true,
    paginated: true
});
```

### 4.3 Preventing Feature Coupling

**Anti-Pattern: Feature-Specific Logic in Shared Component**

```typescript
// ❌ BAD - Feature logic in shared component
export class DataTableComponent {
    renderCell(column: DataTableColumn, row: DataTableRow): string {
        // Feature-specific logic in shared component!
        if (column.id === 'pluginStatus') {
            return this.renderPluginStatus(row);  // ← Plugin-specific logic!
        }
        if (column.id === 'solutionType') {
            return this.renderSolutionType(row);  // ← Solution-specific logic!
        }
        return escapeHtml(String(row[column.field]));
    }
}
```

**Correct Pattern: Configuration Callbacks**

```typescript
// ✅ GOOD - Configuration-driven rendering
export class DataTableComponent<TRow> {
    renderCell(column: DataTableColumn<TRow>, row: TRow): string {
        // Component delegates rendering to configuration callback
        if (column.cellRenderer) {
            return column.cellRenderer(row[column.field], row, column);
        }
        return escapeHtml(String(row[column.field]));
    }
}

// Feature-specific rendering in panel configuration:
const columns: DataTableColumn<PluginViewModel>[] = [
    {
        id: 'status',
        field: 'statusLabel',
        cellRenderer: (value, row) => {
            // Feature-specific logic lives in feature code, not shared component
            return `<span class="status-badge status-badge--${row.statusVariant}">
                ${escapeHtml(value as string)}
            </span>`;
        }
    }
];
```

---

## 5. ViewModel-Template Integration: Type-Safe Data Flow

### 5.1 ViewModel Design Principles

**ViewModels are Application Layer Contracts:**

```typescript
// src/features/pluginRegistration/application/viewModels/PluginViewModel.ts

/**
 * Presentation DTO for Plugin entity
 * Contains UI-friendly shapes, NO domain logic
 */
export interface PluginViewModel {
    // Identity
    id: string;
    name: string;
    assemblyName: string;

    // Computed display values (computed by mapper using domain logic)
    displayName: string;              // "My Custom Plugin (v1.0.0)"
    statusLabel: string;              // "Active" / "Inactive"
    statusVariant: 'success' | 'warning' | 'danger';

    // Formatted timestamps
    registeredOnDisplay: string;      // "1/30/2025 10:30 AM"
    lastModifiedDisplay: string;

    // Flags for UI behavior
    isSystemPlugin: boolean;          // Used to disable actions
    canUnregister: boolean;           // Business rule applied by mapper
    hasErrors: boolean;
}
```

### 5.2 Mapping: Domain → ViewModel

**Mapper lives in Application Layer:**

```typescript
// src/features/pluginRegistration/application/mappers/PluginViewModelMapper.ts

export class PluginViewModelMapper {
    toViewModel(plugin: Plugin): PluginViewModel {
        // Apply domain logic to compute display values
        return {
            id: plugin.id,
            name: plugin.name,
            assemblyName: plugin.assemblyName,

            // Computed using domain methods
            displayName: plugin.getDisplayName(),
            statusLabel: plugin.isActive() ? 'Active' : 'Inactive',
            statusVariant: this.getStatusVariant(plugin),

            // Formatted for display
            registeredOnDisplay: plugin.registeredOn.toLocaleString(),
            lastModifiedDisplay: plugin.lastModified?.toLocaleString() || 'Never',

            // Business rules
            isSystemPlugin: plugin.isSystemPlugin(),
            canUnregister: plugin.canUnregister(),  // Domain method
            hasErrors: plugin.hasValidationErrors()
        };
    }

    private getStatusVariant(plugin: Plugin): 'success' | 'warning' | 'danger' {
        if (plugin.hasErrors()) return 'danger';
        if (!plugin.isActive()) return 'warning';
        return 'success';
    }

    toViewModels(plugins: Plugin[]): PluginViewModel[] {
        return plugins.map(p => this.toViewModel(p));
    }
}
```

### 5.3 Type-Safe Template Binding

**Views consume ViewModels:**

```typescript
// src/core/presentation/components/DataTableView.ts

export class DataTableView {
    static render<TRow>(config: DataTableConfig<TRow>, state: DataTableViewState<TRow>): string {
        return `
            <div class="data-table" data-component-id="${config.id}">
                ${this.renderTable(config, state)}
            </div>
        `;
    }

    private static renderTable<TRow>(config: DataTableConfig<TRow>, state: DataTableViewState<TRow>): string {
        const rows = state.data.map(row => this.renderRow(row, config)).join('');
        return `
            <table>
                <thead>${this.renderHeaders(config)}</thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    private static renderRow<TRow>(row: TRow, config: DataTableConfig<TRow>): string {
        const cells = config.columns.map(column => {
            const value = row[column.field];  // Type-safe field access

            // Use cellRenderer if provided (feature-specific logic)
            if (column.cellRenderer) {
                return `<td>${column.cellRenderer(value, row, column)}</td>`;
            }

            // Default rendering
            const formatted = column.format ? column.format(value, row) : value;
            return `<td>${escapeHtml(String(formatted ?? ''))}</td>`;
        }).join('');

        return `<tr data-row-id="${(row as any).id}">${cells}</tr>`;
    }
}
```

### 5.4 Flow Summary

```
Domain Entity (Plugin)
    ↓
    │ PluginViewModelMapper.toViewModel()
    ↓
ViewModel (PluginViewModel)
    ↓
    │ panel.setData(viewModels)
    ↓
Component (DataTableComponent)
    ↓
    │ component.generateHTML()
    ↓
View (DataTableView.render())
    ↓
HTML String
    ↓
    │ PanelComposer.compose()
    ↓
Complete HTML Document
    ↓
    │ panel.webview.html = html
    ↓
Webview (Browser)
    ↓
    │ User clicks → Behavior → postMessage
    ↓
Panel receives message
    ↓
    │ panel.handlePanelAction()
    ↓
Use Case / Command
    ↓
    │ Domain logic
    ↓
CYCLE REPEATS
```

---

## 6. Anti-Patterns: What Violates Clean Architecture

### Anti-Pattern 1: Business Logic in Templates

```typescript
// ❌ BAD - Business logic in View
export class PluginGridView {
    static renderStatus(plugin: Plugin): string {
        // Business logic in template!
        if (plugin.assemblyName.startsWith('Microsoft.')) {
            return '<span class="badge badge-info">System</span>';
        }
        if (plugin.lastModified < Date.now() - 90 * 24 * 60 * 60 * 1000) {
            return '<span class="badge badge-warning">Outdated</span>';
        }
        return '<span class="badge badge-success">Active</span>';
    }
}

// ✅ GOOD - Business logic in Domain, computed values in ViewModel
export class Plugin {
    isSystemPlugin(): boolean {
        return this.assemblyName.startsWith('Microsoft.');
    }

    isOutdated(): boolean {
        return this.lastModified < Date.now() - 90 * 24 * 60 * 60 * 1000;
    }

    getStatusLabel(): string {
        if (this.isSystemPlugin()) return 'System';
        if (this.isOutdated()) return 'Outdated';
        return 'Active';
    }
}

export class PluginViewModelMapper {
    toViewModel(plugin: Plugin): PluginViewModel {
        return {
            statusLabel: plugin.getStatusLabel(),  // Domain method
            statusVariant: this.getVariant(plugin),
            // ...
        };
    }
}

export class PluginGridView {
    static renderStatus(row: PluginViewModel): string {
        // NO logic - just display what ViewModel provides
        return `<span class="badge badge-${row.statusVariant}">${escapeHtml(row.statusLabel)}</span>`;
    }
}
```

### Anti-Pattern 2: Anemic ViewModels (Just Data Bags)

```typescript
// ❌ BAD - Anemic ViewModel (forces logic into View)
export interface PluginViewModel {
    id: string;
    name: string;
    isActive: boolean;
    isSystemPlugin: boolean;
    lastModified: Date;
}

// View has to compute display values
export class PluginGridView {
    static render(plugin: PluginViewModel): string {
        // Logic pushed into View!
        const status = plugin.isActive ? 'Active' : 'Inactive';
        const variant = plugin.isSystemPlugin ? 'info' : (plugin.isActive ? 'success' : 'warning');
        const lastMod = plugin.lastModified.toLocaleString();

        return `<div>${status} ${lastMod}</div>`;
    }
}

// ✅ GOOD - Rich ViewModel (pre-computed for display)
export interface PluginViewModel {
    id: string;
    name: string;
    statusLabel: string;           // "Active" / "Inactive" - pre-computed
    statusVariant: 'success' | 'warning' | 'info';  // Pre-computed
    lastModifiedDisplay: string;   // "1/30/2025 10:30 AM" - formatted
}

// View just renders
export class PluginGridView {
    static render(plugin: PluginViewModel): string {
        // NO logic - just display
        return `<span class="badge badge-${plugin.statusVariant}">${escapeHtml(plugin.statusLabel)}</span>
                <span>${escapeHtml(plugin.lastModifiedDisplay)}</span>`;
    }
}
```

### Anti-Pattern 3: Domain Entities in Views

```typescript
// ❌ BAD - View depends on Domain entity
import { Plugin } from '../../../domain/entities/Plugin';

export class PluginGridView {
    static render(plugins: Plugin[]): string {
        // Violates dependency rule!
        // Views should NOT know about Domain entities
        return plugins.map(p => `<tr><td>${p.name}</td></tr>`).join('');
    }
}

// ✅ GOOD - View depends on ViewModel
import { PluginViewModel } from '../../../application/viewModels/PluginViewModel';

export class PluginGridView {
    static render(plugins: PluginViewModel[]): string {
        return plugins.map(p => `<tr><td>${escapeHtml(p.name)}</td></tr>`).join('');
    }
}
```

### Anti-Pattern 4: Panels Generating HTML Directly

```typescript
// ❌ BAD - Panel with inline HTML
export class PluginRegistrationPanel extends BasePanel {
    protected getHtmlContent(): string {
        return `
            <div class="panel">
                <div class="toolbar">
                    <button id="register">Register</button>
                    <button id="refresh">Refresh</button>
                </div>
                <table class="plugins">
                    <thead>
                        <tr><th>Name</th><th>Status</th></tr>
                    </thead>
                    <tbody id="plugin-rows"></tbody>
                </table>
            </div>
        `;
    }
}

// ✅ GOOD - Panel delegates to Components and PanelComposer
export class PluginRegistrationPanel extends BasePanel {
    private actionBar: ActionBarComponent;
    private pluginGrid: DataTableComponent<PluginViewModel>;

    constructor(...) {
        super(...);

        // Create components
        this.actionBar = ComponentFactory.createActionBar({
            id: 'plugin-actions',
            actions: [
                { id: 'register', label: 'Register', icon: 'add' },
                { id: 'refresh', label: 'Refresh', icon: 'refresh' }
            ]
        });

        this.pluginGrid = ComponentFactory.createDataTable<PluginViewModel>({
            id: 'plugin-grid',
            columns: this.getColumnDefinitions()
        });
    }

    protected getHtmlContent(): string {
        // Delegate to PanelComposer
        return PanelComposer.compose(
            [this.actionBar, this.pluginGrid],
            this.getCommonWebviewResources(),
            'Plugin Registration'
        );
    }
}
```

### Anti-Pattern 5: Business Logic in Behaviors (Webview JavaScript)

```javascript
// ❌ BAD - Business logic in Behavior
class PluginTableBehavior extends BaseBehavior {
    handleRowClick(pluginData) {
        // Business logic in webview!
        if (pluginData.assemblyName.startsWith('Microsoft.')) {
            alert('Cannot modify system plugins');
            return;
        }

        if (pluginData.registeredDays > 90) {
            alert('This plugin is outdated');
        }

        // More business logic...
        this.enableActions(pluginData);
    }
}

// ✅ GOOD - Behavior just passes data to Extension Host
class PluginTableBehavior extends BaseBehavior {
    handleRowClick(pluginData) {
        // NO logic - just notify Extension Host
        this.postMessage({
            command: 'component-event',
            data: {
                componentId: this.componentId,
                eventType: 'rowClicked',
                data: { pluginId: pluginData.id }
            }
        });
    }
}

// Extension Host panel handles business logic:
export class PluginRegistrationPanel extends BasePanel {
    protected async handleOtherComponentEvent(componentId: string, eventType: string, data: unknown): Promise<void> {
        if (eventType === 'rowClicked') {
            const { pluginId } = data as { pluginId: string };

            // Delegate to use case (business logic)
            const canEdit = await this.checkCanEditPluginUseCase.execute({ pluginId });

            if (!canEdit.allowed) {
                vscode.window.showWarningMessage(canEdit.reason);  // "Cannot modify system plugins"
                return;
            }

            // Continue with edit action...
        }
    }
}
```

---

## 7. Example Architecture: EnvironmentSetupPanel Refactored

### 7.1 Current State Analysis

**File:** `src/features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts`

**Issues:**
- 345 lines of inline HTML (lines 427-771)
- Form structure hardcoded in panel
- Difficult to test
- Cannot reuse form components
- Violates Single Responsibility Principle

### 7.2 Refactored Architecture

#### Step 1: Create ViewModels

```typescript
// src/features/environmentSetup/application/viewModels/EnvironmentFormViewModel.ts

export interface EnvironmentFormViewModel {
    id?: string;                       // Undefined for new environments
    name: string;
    dataverseUrl: string;
    tenantId: string;
    authenticationMethod: string;
    publicClientId: string;
    powerPlatformEnvironmentId?: string;

    // Service Principal fields
    clientId?: string;
    clientSecretPlaceholder?: string;   // "••••••••" for existing
    hasStoredClientSecret?: boolean;

    // Username/Password fields
    username?: string;
    passwordPlaceholder?: string;
    hasStoredPassword?: boolean;

    // UI state
    isNewEnvironment: boolean;
    canDelete: boolean;
}
```

#### Step 2: Create Form Component (Reusable)

```typescript
// src/core/presentation/components/FormComponent.ts

export interface FormField {
    id: string;
    label: string;
    type: 'text' | 'password' | 'select' | 'checkbox';
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    options?: Array<{ value: string; label: string }>;
    visibleWhen?: (formData: Record<string, unknown>) => boolean;
}

export interface FormConfig {
    id: string;
    fields: FormField[];
    submitLabel?: string;
    cancelLabel?: string;
}

export class FormComponent extends BaseComponent<FormData> {
    private config: FormConfig;
    private data: Record<string, unknown> = {};

    constructor(config: FormConfig) {
        super(config);
        this.config = config;
    }

    public generateHTML(): string {
        return FormView.render(this.config, this.data);
    }

    public setData(data: Record<string, unknown>): void {
        this.data = data;
        this.notifyUpdate();
    }

    public getData(): FormData {
        return { formData: this.data };
    }

    // ... other component methods
}
```

#### Step 3: Create Form View

```typescript
// src/core/presentation/components/FormView.ts

export class FormView {
    static render(config: FormConfig, data: Record<string, unknown>): string {
        const sections = this.groupFieldsIntoSections(config.fields);

        return `
            <div class="form-component" data-component-id="${config.id}">
                <form id="${config.id}-form">
                    ${sections.map(section => this.renderSection(section, data)).join('')}
                    ${this.renderActions(config)}
                </form>
            </div>
        `;
    }

    private static renderSection(section: FormSection, data: Record<string, unknown>): string {
        return `
            <section class="form-section">
                ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}
                ${section.fields.map(field => this.renderField(field, data)).join('')}
            </section>
        `;
    }

    private static renderField(field: FormField, data: Record<string, unknown>): string {
        // Check conditional visibility
        if (field.visibleWhen && !field.visibleWhen(data)) {
            return '';
        }

        const value = data[field.id] ?? '';

        return `
            <div class="form-group" data-field-id="${field.id}">
                <label for="${field.id}">
                    ${escapeHtml(field.label)}
                    ${field.required ? '<span class="required">*</span>' : ''}
                </label>
                ${this.renderInput(field, value)}
                ${field.helpText ? `<span class="help-text">${escapeHtml(field.helpText)}</span>` : ''}
            </div>
        `;
    }

    private static renderInput(field: FormField, value: unknown): string {
        switch (field.type) {
            case 'text':
            case 'password':
                return `<input type="${field.type}"
                               id="${field.id}"
                               name="${field.id}"
                               value="${escapeHtml(String(value))}"
                               placeholder="${escapeHtml(field.placeholder ?? '')}"
                               ${field.required ? 'required' : ''}>`;

            case 'select':
                return `<select id="${field.id}" name="${field.id}" ${field.required ? 'required' : ''}>
                    ${field.options?.map(opt => `
                        <option value="${escapeHtml(opt.value)}"
                                ${value === opt.value ? 'selected' : ''}>
                            ${escapeHtml(opt.label)}
                        </option>
                    `).join('') ?? ''}
                </select>`;

            case 'checkbox':
                return `<input type="checkbox"
                               id="${field.id}"
                               name="${field.id}"
                               ${value ? 'checked' : ''}>`;

            default:
                return '';
        }
    }

    private static renderActions(config: FormConfig): string {
        return `
            <div class="form-actions">
                <button type="submit" class="button primary">
                    ${escapeHtml(config.submitLabel ?? 'Save')}
                </button>
                ${config.cancelLabel ? `
                    <button type="button" class="button secondary" data-action="cancel">
                        ${escapeHtml(config.cancelLabel)}
                    </button>
                ` : ''}
            </div>
        `;
    }
}
```

#### Step 4: Refactor Panel to Use Components

```typescript
// src/features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts

export class EnvironmentSetupPanel {
    private environmentForm: FormComponent;
    private actionBar: ActionBarComponent;

    constructor(...) {
        // Create form component with configuration
        this.environmentForm = new FormComponent({
            id: 'environment-form',
            fields: this.getFormFields(),
            submitLabel: 'Save Environment'
        });

        // Create action bar
        this.actionBar = ComponentFactory.createActionBar({
            id: 'env-actions',
            actions: [
                { id: 'save', label: 'Save Environment', icon: 'save', variant: 'primary' },
                { id: 'test', label: 'Test Connection', icon: 'debug', variant: 'secondary' },
                { id: 'delete', label: 'Delete Environment', icon: 'trash', variant: 'danger' }
            ]
        });

        // Setup event bridges
        this.setupComponentEventBridges([this.environmentForm, this.actionBar]);
    }

    private getFormFields(): FormField[] {
        return [
            // Basic Information
            {
                id: 'name',
                label: 'Environment Name',
                type: 'text',
                required: true,
                placeholder: 'e.g., DEV',
                helpText: 'A friendly name to identify this environment'
            },
            {
                id: 'dataverseUrl',
                label: 'Dataverse URL',
                type: 'text',
                required: true,
                placeholder: 'https://org.crm.dynamics.com',
                helpText: 'The URL of your Dataverse organization'
            },
            {
                id: 'environmentId',
                label: 'Environment ID (Optional)',
                type: 'text',
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                helpText: 'Optional: The unique GUID for this environment'
            },

            // Authentication
            {
                id: 'tenantId',
                label: 'Tenant ID',
                type: 'text',
                required: true,
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                helpText: 'Your Azure AD tenant ID'
            },
            {
                id: 'authenticationMethod',
                label: 'Authentication Method',
                type: 'select',
                required: true,
                options: [
                    { value: 'Interactive', label: 'Interactive (Browser)' },
                    { value: 'ServicePrincipal', label: 'Service Principal (Client Secret)' },
                    { value: 'UsernamePassword', label: 'Username/Password' },
                    { value: 'DeviceCode', label: 'Device Code' }
                ],
                helpText: 'Select how you want to authenticate to this environment'
            },
            {
                id: 'publicClientId',
                label: 'Public Client ID',
                type: 'text',
                required: true,
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                helpText: 'Application (client) ID for Interactive/DeviceCode flows'
            },

            // Service Principal fields (conditional)
            {
                id: 'clientId',
                label: 'Client ID',
                type: 'text',
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                helpText: 'Application ID for service principal',
                visibleWhen: (data) => data.authenticationMethod === 'ServicePrincipal'
            },
            {
                id: 'clientSecret',
                label: 'Client Secret',
                type: 'password',
                placeholder: 'Enter client secret',
                helpText: 'Secret value (stored securely)',
                visibleWhen: (data) => data.authenticationMethod === 'ServicePrincipal'
            },

            // Username/Password fields (conditional)
            {
                id: 'username',
                label: 'Username',
                type: 'text',
                placeholder: 'user@domain.com',
                helpText: 'Dataverse username',
                visibleWhen: (data) => data.authenticationMethod === 'UsernamePassword'
            },
            {
                id: 'password',
                label: 'Password',
                type: 'password',
                placeholder: 'Enter password',
                helpText: 'Password (stored securely)',
                visibleWhen: (data) => data.authenticationMethod === 'UsernamePassword'
            }
        ];
    }

    protected getHtmlContent(): string {
        // Delegate to PanelComposer - NO inline HTML
        return PanelComposer.compose(
            [this.actionBar, this.environmentForm],
            this.getCommonWebviewResources(),
            'Environment Setup'
        );
    }

    private async loadEnvironment(environmentId: string): Promise<void> {
        // Delegate to use case
        const viewModel = await this.loadEnvironmentByIdUseCase.execute({ environmentId });

        // Pass ViewModel to component
        this.environmentForm.setData(viewModel);
    }

    protected async handlePanelAction(componentId: string, actionId: string): Promise<void> {
        switch (actionId) {
            case 'save':
                await this.handleSaveEnvironment();
                break;
            case 'test':
                await this.handleTestConnection();
                break;
            case 'delete':
                await this.handleDeleteEnvironment();
                break;
        }
    }

    private async handleSaveEnvironment(): Promise<void> {
        const formData = this.environmentForm.getData().formData;

        // Delegate to use case
        const result = await this.saveEnvironmentUseCase.execute({
            existingEnvironmentId: this.currentEnvironmentId,
            ...formData
        });

        if (result.success) {
            vscode.window.showInformationMessage('Environment saved successfully');
        }
    }
}
```

### 7.3 Benefits of Refactored Architecture

**Before:**
- ❌ 345 lines of inline HTML in panel
- ❌ Cannot reuse form logic
- ❌ Difficult to test
- ❌ Cannot change form layout without touching panel
- ❌ Mixed concerns (HTML generation + business logic)

**After:**
- ✅ Panel: 100 lines (configuration + orchestration)
- ✅ FormComponent: Reusable across features
- ✅ FormView: Testable HTML generation
- ✅ Separation of concerns (Component-View-Behavior)
- ✅ Can change form layout by reconfiguring fields
- ✅ Clean Architecture compliant

---

## 8. Architectural Decision Records (ADRs)

### ADR-001: Component-View-Behavior Pattern

**Status:** Accepted

**Context:**
We need a pattern for building UI components that separates concerns and maintains Clean Architecture boundaries.

**Decision:**
Adopt the Component-View-Behavior pattern where:
- **Component** (TypeScript, Extension Host): State management, events, lifecycle
- **View** (TypeScript, Extension Host): Pure HTML generation from state
- **Behavior** (JavaScript, Webview): Client-side interactivity

**Consequences:**
- ✅ Clear separation between state and presentation
- ✅ Views are pure functions (easy to test)
- ✅ Behaviors isolated to webview context
- ✅ Components reusable across features
- ❌ More files per component (3 instead of 1)
- ❌ Requires discipline to avoid mixing concerns

**Implementation:**
See TEMP/templates for existing implementation.

---

### ADR-002: ViewModels in Application Layer, NOT Presentation

**Status:** Accepted

**Context:**
ViewModels represent the contract between Application and Presentation layers. Where should they live?

**Decision:**
ViewModels live in Application layer (`application/viewModels/`), NOT Presentation layer.

**Rationale:**
1. **Dependency Direction:** Presentation depends on Application, not vice versa
2. **Reusability:** ViewModels can be used by multiple panels
3. **Testability:** Application layer ViewModels can be tested without UI
4. **Clear Responsibility:** Application layer defines the contract for presentation

**Consequences:**
- ✅ Maintains dependency inversion
- ✅ ViewModels testable without UI
- ✅ Clear separation of concerns
- ❌ Might seem counterintuitive (ViewModels sound like "View" layer)

---

### ADR-003: PanelComposer for HTML Assembly

**Status:** Accepted

**Context:**
Panels need to assemble HTML from multiple components, inject CSS/JS resources, and create complete HTML documents.

**Decision:**
Use PanelComposer factory to centralize HTML assembly logic.

**Rationale:**
1. **DRY:** Avoid duplicating resource collection logic across panels
2. **Consistency:** All panels use same HTML structure
3. **Maintainability:** Changes to HTML structure happen in one place
4. **Testability:** PanelComposer testable in isolation

**Implementation:**
```typescript
// Panel delegates to PanelComposer
protected getHtmlContent(): string {
    return PanelComposer.compose(
        [this.actionBar, this.pluginGrid],
        this.getCommonWebviewResources(),
        'Plugin Registration'
    );
}
```

**Consequences:**
- ✅ Centralized resource management
- ✅ Consistent HTML structure
- ✅ Easy to add new resources (CSS/JS)
- ❌ Another abstraction to learn

---

### ADR-004: Feature-Scoped Components vs Shared Components

**Status:** Accepted

**Context:**
Some components are feature-specific, others reusable across features. How do we organize them?

**Decision:**
- **Shared Components:** `src/core/presentation/components/` (e.g., DataTable, ActionBar)
- **Feature Components:** `src/features/{feature}/presentation/components/` (e.g., PluginDetailsComponent)

**Criteria for Shared:**
1. Used by 2+ features
2. NO feature-specific business logic
3. Accepts generic configuration
4. Stable interface

**Criteria for Feature-Scoped:**
1. Only used in one feature
2. Contains feature-specific rendering
3. Tightly coupled to feature ViewModels

**Consequences:**
- ✅ Clear organization
- ✅ Prevents feature coupling
- ✅ Encourages reusability
- ❌ Need to refactor when component becomes shared

---

### ADR-005: Generic Types for Shared Components

**Status:** Accepted

**Context:**
Shared components like DataTable need to work with different row types (PluginViewModel, SolutionViewModel, etc.) without creating dependencies on specific features.

**Decision:**
Use TypeScript generic types with configuration callbacks for feature-specific logic.

**Example:**
```typescript
export class DataTableComponent<TRow = DataTableRow> {
    constructor(config: DataTableConfig<TRow>) { ... }
}

// Feature usage:
const table = new DataTableComponent<PluginViewModel>({
    columns: [
        {
            field: 'status',
            cellRenderer: (value, row: PluginViewModel) => {
                // Feature-specific rendering in configuration
                return `<span class="badge">${row.statusLabel}</span>`;
            }
        }
    ]
});
```

**Consequences:**
- ✅ Type-safe without feature coupling
- ✅ Shared components stay generic
- ✅ Feature logic lives in feature code
- ❌ More complex TypeScript signatures

---

### ADR-006: NO Business Logic in Views or Behaviors

**Status:** Accepted

**Context:**
Where should business logic live? Views generate HTML, Behaviors handle client-side events.

**Decision:**
Business logic lives ONLY in Domain layer. Views and Behaviors are DUMB.

**Rules:**
- Views: Pure functions (State → HTML)
- Behaviors: Pass events to Extension Host, receive updates
- Business Logic: Domain entities, Use Cases, Commands

**Enforcement:**
1. Code Reviews: Reject PRs with logic in Views/Behaviors
2. ViewModels: All computed values come from Application layer
3. Behaviors: Only postMessage, NO calculations

**Example Violations:**
```javascript
// ❌ BAD - Logic in Behavior
if (plugin.registeredDays > 90) {
    showWarning('Plugin outdated');
}

// ✅ GOOD - Behavior passes to Extension Host
this.postMessage({ command: 'plugin-clicked', pluginId: plugin.id });

// Extension Host checks business rules:
const isOutdated = await this.checkPluginStatusUseCase.execute({ pluginId });
if (isOutdated) {
    vscode.window.showWarningMessage('Plugin outdated');
}
```

**Consequences:**
- ✅ Clean Architecture maintained
- ✅ Testable business logic
- ✅ Views/Behaviors remain simple
- ❌ More message passing
- ❌ Might feel like overkill for simple checks

---

## 9. Migration Strategy

### Phase 1: Establish Shared Components (DONE)

**Status:** ✅ Complete (exists in TEMP/templates)

**Components Available:**
- DataTableComponent
- ActionBarComponent
- FilterPanelComponent
- SearchInputComponent
- EnvironmentSelectorComponent
- SolutionSelectorComponent
- SplitPanelComponent
- TreeViewComponent
- StatusBadgeComponent

**Next Steps:** Move from TEMP/templates to src/ following directory structure.

---

### Phase 2: Refactor EnvironmentSetupPanel (NEXT)

**Goal:** Eliminate 345 lines of inline HTML

**Steps:**
1. Create FormComponent (generic reusable form)
2. Create EnvironmentFormViewModel
3. Refactor EnvironmentSetupPanel to use FormComponent
4. Test and validate

**Estimated Effort:** 4-6 hours

---

### Phase 3: Build Plugin Registration Panel (PRIORITY)

**Goal:** Apply architecture to complex feature with forms, grids, filters

**Components Needed:**
- PluginGridComponent (DataTable configured for plugins)
- PluginFormComponent (FormComponent configured for plugin registration)
- PluginDetailsComponent (custom feature-specific component)

**Steps:**
1. Define PluginViewModel and related ViewModels
2. Create Use Cases (LoadPluginsUseCase, RegisterPluginCommand, etc.)
3. Build Panel using shared components + feature-specific components
4. Implement Behaviors for client-side interactions

**Estimated Effort:** 2-3 days

---

### Phase 4: Codify as Templates (OPTIONAL)

**Goal:** Provide scaffolding for new panels

**Deliverables:**
- Panel template generator
- Component template generator
- ViewModel template generator

**Estimated Effort:** 1 day

---

## 10. Testing Strategy

### 10.1 View Testing (Unit Tests)

**Views are pure functions → Easy to test:**

```typescript
// test/presentation/components/DataTableView.test.ts

describe('DataTableView', () => {
    it('should render table with data', () => {
        const config: DataTableConfig = {
            id: 'test-table',
            columns: [
                { id: 'name', label: 'Name', field: 'name' },
                { id: 'status', label: 'Status', field: 'status' }
            ]
        };

        const state: DataTableViewState = {
            data: [
                { id: '1', name: 'Plugin A', status: 'Active' },
                { id: '2', name: 'Plugin B', status: 'Inactive' }
            ],
            sortConfig: [],
            filters: {},
            currentPage: 1,
            pageSize: 50,
            totalRows: 2,
            // ...
        };

        const html = DataTableView.render(config, state);

        expect(html).toContain('Plugin A');
        expect(html).toContain('Plugin B');
        expect(html).toContain('Active');
    });

    it('should render sort indicators', () => {
        const state = {
            sortConfig: [{ column: 'name', direction: 'asc' as const }],
            // ...
        };

        const html = DataTableView.render(config, state);

        expect(html).toContain('sort-indicator');
        expect(html).toContain('▲');  // Ascending icon
    });
});
```

### 10.2 Component Testing (Unit Tests)

**Components manage state → Test state transitions:**

```typescript
// test/presentation/components/DataTableComponent.test.ts

describe('DataTableComponent', () => {
    let component: DataTableComponent<TestRow>;

    beforeEach(() => {
        component = new DataTableComponent({
            id: 'test-table',
            columns: [
                { id: 'name', label: 'Name', field: 'name', sortable: true }
            ]
        });
    });

    it('should update data and emit event', () => {
        const listener = jest.fn();
        component.on('update', listener);

        const data = [{ id: '1', name: 'Test' }];
        component.setData(data);

        expect(listener).toHaveBeenCalled();
        expect(component.getData().data).toEqual(data);
    });

    it('should sort data', () => {
        component.setData([
            { id: '1', name: 'B' },
            { id: '2', name: 'A' }
        ]);

        component.sort('name', 'asc');

        const data = component.getData().data;
        expect(data[0].name).toBe('A');
        expect(data[1].name).toBe('B');
    });
});
```

### 10.3 Panel Integration Tests

**Panels orchestrate components → Test integration:**

```typescript
// test/presentation/panels/PluginRegistrationPanel.test.ts

describe('PluginRegistrationPanel', () => {
    let panel: PluginRegistrationPanel;
    let mockUseCase: jest.Mocked<LoadPluginsUseCase>;

    beforeEach(() => {
        mockUseCase = {
            execute: jest.fn()
        } as any;

        panel = new PluginRegistrationPanel(
            mockWebviewPanel,
            mockExtensionUri,
            mockAuthService,
            mockUseCase
        );
    });

    it('should load plugins on environment change', async () => {
        const plugins: PluginViewModel[] = [
            { id: '1', name: 'Plugin A', statusLabel: 'Active', /* ... */ }
        ];

        mockUseCase.execute.mockResolvedValue(plugins);

        await panel.loadEnvironmentData('env-1');

        expect(mockUseCase.execute).toHaveBeenCalledWith({ environmentId: 'env-1' });
        // Verify component received data
    });
});
```

### 10.4 ViewModel Mapping Tests

**Mappers transform domain → ViewModel:**

```typescript
// test/application/mappers/PluginViewModelMapper.test.ts

describe('PluginViewModelMapper', () => {
    let mapper: PluginViewModelMapper;

    beforeEach(() => {
        mapper = new PluginViewModelMapper();
    });

    it('should map active plugin correctly', () => {
        const plugin = new Plugin(
            '1',
            'My Plugin',
            'MyPlugin.dll',
            true,  // isActive
            new Date('2025-01-30')
        );

        const viewModel = mapper.toViewModel(plugin);

        expect(viewModel.id).toBe('1');
        expect(viewModel.name).toBe('My Plugin');
        expect(viewModel.statusLabel).toBe('Active');
        expect(viewModel.statusVariant).toBe('success');
        expect(viewModel.isSystemPlugin).toBe(false);
    });

    it('should identify system plugins', () => {
        const plugin = new Plugin(
            '1',
            'System Plugin',
            'Microsoft.Plugin.dll',
            true,
            new Date()
        );

        const viewModel = mapper.toViewModel(plugin);

        expect(viewModel.isSystemPlugin).toBe(true);
        expect(viewModel.canUnregister).toBe(false);
    });
});
```

---

## 11. Summary

### Architectural Principles Reinforced

1. **Layer Separation:**
   - Domain: Business logic ONLY
   - Application: ViewModels, Use Cases, Mappers
   - Presentation: Components, Views, Behaviors, Panels

2. **Dependency Direction:**
   - All dependencies point INWARD (Presentation → Application → Domain)
   - ViewModels are contracts between layers

3. **Component-View-Behavior Pattern:**
   - Component: State + Lifecycle (TypeScript, Extension Host)
   - View: Pure HTML generation (TypeScript, Extension Host)
   - Behavior: Client-side events (JavaScript, Webview)

4. **PanelComposer:**
   - Centralized HTML assembly
   - Resource management (CSS/JS)
   - Consistent panel structure

5. **Feature Independence:**
   - Shared components: Generic + Configuration
   - Feature components: Feature-specific
   - NO cross-feature dependencies

### Key Takeaways

✅ **DO:**
- Use ViewModels from Application layer
- Delegate HTML generation to Views
- Keep Behaviors dumb (just message passing)
- Use PanelComposer for panel assembly
- Generic types for shared components

❌ **DON'T:**
- Put business logic in Views or Behaviors
- Expose Domain entities to Presentation layer
- Generate HTML in Panels (use Components)
- Create anemic ViewModels (pre-compute display values)
- Couple shared components to specific features

### Next Steps

1. **Immediate:** Refactor EnvironmentSetupPanel using FormComponent
2. **Short-term:** Build Plugin Registration Panel following architecture
3. **Long-term:** Migrate all panels to Component-View-Behavior pattern

---

**Document Status:** Complete
**Last Updated:** 2025-10-31
**Reviewers:** Architecture Team, Claude Code
**Approved By:** Pending Review
