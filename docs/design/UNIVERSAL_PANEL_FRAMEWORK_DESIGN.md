# Universal Panel Framework - Technical Design

**Status:** Draft
**Date:** 2025-11-04
**Complexity:** Moderate

---

## Overview

**User Problem:** Current `DataTablePanelCoordinator` has a narrow name implying "data tables only," hard-coded button assumptions causing runtime errors, and inconsistent guidance on when to use framework vs direct implementation. Developers are confused about which approach to use for new panels.

**Solution:** Refactor to a **Universal Panel Framework** with:
- Rename: `DataTablePanelCoordinator` → `PanelCoordinator` (universal, not table-specific)
- Section-based composition (supports tables, trees, split views, filters, custom UI)
- Optional behaviors (EnvironmentBehavior is opt-in, not required)
- Eliminate "Pattern 1 vs Pattern 2" terminology in favor of "Framework Approach (default) vs Direct Implementation (rare)"
- Extract TreeViewSection from PersistenceInspectorPanel (validates non-table use case)

**Value:** Provides a clear, extensible default framework for ALL panel development. Eliminates confusion, reduces code duplication, and establishes consistent UX across all panels. Resolves technical debt (hard-coded buttons) at root cause rather than patching symptoms.

---

## Requirements

### Functional Requirements
- [x] Framework supports data tables (DataTableSection)
- [x] Framework supports tree views (TreeViewSection - NEW)
- [x] Framework supports filter controls (FilterControlsSection)
- [x] Framework supports action buttons (ActionButtonsSection)
- [x] Framework supports detail panels (DetailPanelSection)
- [x] Framework supports split view layouts
- [x] EnvironmentBehavior is optional (can be excluded)
- [x] Sections are stateless (coordinator orchestrates)
- [x] Message routing handled by MessageRoutingBehavior
- [x] All 7 existing panels migrate to new framework

### Non-Functional Requirements
- [x] **Backwards Compatible (Phase 1):** Existing panels work unchanged during rename
- [x] **Performance:** No performance degradation (section composition is efficient)
- [x] **Testability:** Sections and coordinator are independently testable
- [x] **Extensibility:** Easy to add new sections without modifying framework

### Success Criteria
- [x] All 7 panels use PanelCoordinator (no "legacy code")
- [x] EnvironmentSetupPanel works without EnvironmentBehavior
- [x] PersistenceInspectorPanel uses TreeViewSection (no HTML in .ts file)
- [x] Plugin Trace Viewer implements with custom sections
- [x] Hard-coded button technical debt resolved (sections register handlers dynamically)
- [x] Documentation updated (Framework Approach vs Direct Implementation)
- [x] Tests pass for all panels

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "Rename + Backwards Compatibility"
**Goal:** Rename `DataTablePanelCoordinator` → `PanelCoordinator`, verify existing panels work unchanged.

**Shared Infrastructure:**
- Rename `DataTablePanelCoordinator.ts` → `PanelCoordinator.ts`
- Update class name: `export class PanelCoordinator<TEntity, TViewModel>`
- Add deprecated export: `export { PanelCoordinator as DataTablePanelCoordinator }`
- Update all imports in existing panels (automated find/replace)

**Testing:**
- Run `npm run compile` - should succeed
- Run `npm test` - all tests should pass
- Manually test all 6 existing panels - should work identically

**Result:** WORKING RENAME ✅ (proves backward compatibility)

**Complexity:** Simple (1-2 hours)

---

### Slice 2: "Section System Foundation"
**Builds on:** Slice 1

**Goal:** Implement section interface and stateless rendering pattern.

**Domain/Application (Shared):**
```typescript
// src/shared/infrastructure/ui/sections/ISection.ts
export interface ISection {
  render(data: SectionRenderData): string;
}

// src/shared/infrastructure/ui/types/SectionRenderData.ts
export interface SectionRenderData {
  tableData?: Record<string, unknown>[];
  detailData?: unknown;
  filterState?: Record<string, unknown>;
  isLoading?: boolean;
  errorMessage?: string;
  customData?: Record<string, unknown>;
}
```

**Infrastructure (Shared):**
```typescript
// src/shared/infrastructure/ui/sections/DataTableSection.ts
export class DataTableSection implements ISection {
  constructor(private config: DataTableConfig) {}

  render(data: SectionRenderData): string {
    const tableData = data.tableData || [];
    return this.generateTableHtml(tableData, this.config);
  }

  private generateTableHtml(data: Record<string, unknown>[], config: DataTableConfig): string {
    // Extract existing HTML generation from base template
  }
}
```

**Testing:**
- Unit test DataTableSection with sample data
- Verify HTML output matches existing template

**Result:** SECTION INTERFACE DEFINED ✅

**Complexity:** Moderate (3-4 hours)

---

### Slice 3: "SectionCompositionBehavior"
**Builds on:** Slice 2

**Goal:** Create behavior to compose sections into layouts.

**Infrastructure (Shared):**
```typescript
// src/shared/infrastructure/ui/behaviors/SectionCompositionBehavior.ts
export class SectionCompositionBehavior {
  constructor(
    private sections: ISection[],
    private layout: PanelLayout = PanelLayout.SingleColumn
  ) {}

  compose(data: SectionRenderData): string {
    const layoutTemplate = this.getLayoutTemplate();
    return this.injectSectionsIntoLayout(layoutTemplate, data);
  }

  private getLayoutTemplate(): string {
    switch (this.layout) {
      case PanelLayout.SingleColumn:
        return this.singleColumnTemplate();
      case PanelLayout.SplitHorizontal:
        return this.splitHorizontalTemplate();
      default:
        return this.singleColumnTemplate();
    }
  }

  private singleColumnTemplate(): string {
    return `
      <div class="panel-container">
        <div class="toolbar-section"><!-- TOOLBAR --></div>
        <div class="header-section"><!-- HEADER --></div>
        <div class="filters-section"><!-- FILTERS --></div>
        <div class="main-section"><!-- MAIN --></div>
        <div class="footer-section"><!-- FOOTER --></div>
      </div>
    `;
  }

  private injectSectionsIntoLayout(template: string, data: SectionRenderData): string {
    let html = template;

    // Group sections by position
    this.sections.forEach(section => {
      const sectionHtml = section.render(data);
      const position = section.position || SectionPosition.Main;
      const placeholder = `<!-- ${position.toUpperCase()} -->`;
      html = html.replace(placeholder, sectionHtml);
    });

    return html;
  }
}
```

**Testing:**
- Test composition with multiple sections
- Verify layout template injection works correctly

**Result:** SECTION COMPOSITION WORKING ✅

**Complexity:** Moderate (3-4 hours)

---

### Slice 4: "Migrate EnvironmentSetupPanel (No EnvironmentBehavior)"
**Builds on:** Slice 3

**Goal:** Prove EnvironmentBehavior is optional by migrating EnvironmentSetupPanel without it.

**Presentation (Environment Setup Feature):**
```typescript
// Migrate EnvironmentSetupPanel to use new section system
const sections = [
  new DataTableSection({
    columns: [
      { id: 'name', label: 'Environment Name' },
      { id: 'url', label: 'URL' },
      { id: 'status', label: 'Status' }
    ]
  }),
  new ActionButtonsSection({
    buttons: [
      { id: 'add', label: 'Add Environment', icon: 'add' },
      { id: 'edit', label: 'Edit', icon: 'edit' },
      { id: 'delete', label: 'Delete', icon: 'trash' },
      { id: 'testConnection', label: 'Test Connection', icon: 'debug' }
    ]
  })
];

this.coordinator = new PanelCoordinator({
  panel,
  extensionUri,
  behaviors: [
    // NO EnvironmentBehavior - this panel manages environments, doesn't operate within one
    new DataBehavior(environmentDataLoader),
    new SectionCompositionBehavior(sections, PanelLayout.SingleColumn)
  ],
  logger
});
```

**Testing:**
- Environment Setup panel opens correctly
- No environment dropdown shown (correct behavior)
- CRUD operations work
- Panel doesn't crash without EnvironmentBehavior

**Result:** OPTIONAL ENVIRONMENT BEHAVIOR PROVEN ✅

**Complexity:** Moderate (2-3 hours)

---

### Slice 5: "Extract TreeViewSection + Migrate PersistenceInspectorPanel"
**Builds on:** Slice 4

**Goal:** Extract TreeViewSection, prove framework supports non-table UI.

**Infrastructure (Shared):**
```typescript
// src/shared/infrastructure/ui/sections/TreeViewSection.ts
export class TreeViewSection implements ISection {
  constructor(private config: TreeViewConfig) {}

  render(data: SectionRenderData): string {
    const treeData = data.customData?.treeData || [];
    return this.generateTreeHtml(treeData, this.config);
  }

  private generateTreeHtml(nodes: TreeNode[], config: TreeViewConfig): string {
    // Extract HTML generation from PersistenceInspectorPanel
    return `
      <div class="tree-view">
        ${this.renderNodes(nodes, 0)}
      </div>
    `;
  }

  private renderNodes(nodes: TreeNode[], depth: number): string {
    return nodes.map(node => `
      <div class="tree-node" style="padding-left: ${depth * 20}px">
        <span class="tree-icon">${node.hasChildren ? '▶' : ''}</span>
        <span class="tree-label">${escapeHtml(node.label)}</span>
      </div>
      ${node.children ? this.renderNodes(node.children, depth + 1) : ''}
    `).join('');
  }
}
```

**Presentation (Persistence Inspector Feature):**
```typescript
// Migrate PersistenceInspectorPanel to use TreeViewSection
const sections = [
  new TreeViewSection({
    expandable: true,
    selectable: true
  })
];

this.coordinator = new PanelCoordinator({
  panel,
  extensionUri,
  behaviors: [
    // NO EnvironmentBehavior (debug tool, not environment-scoped)
    // NO DataBehavior (custom data loading)
    new SectionCompositionBehavior(sections, PanelLayout.SingleColumn)
  ],
  logger
});
```

**Testing:**
- Persistence Inspector opens correctly
- Tree view renders
- No environment dropdown (correct)
- Expand/collapse works

**Result:** TREE VIEW SECTION WORKING ✅ (Framework supports non-table UI)

**Complexity:** Moderate (4-5 hours)

---

### Slice 6: "Implement Core Shared Sections"
**Builds on:** Slice 5

**Goal:** Implement FilterControlsSection, ActionButtonsSection, DetailPanelSection for reuse.

**Infrastructure (Shared):**
```typescript
// FilterControlsSection.ts
export class FilterControlsSection implements ISection {
  constructor(private config: FilterControlsConfig) {}

  render(data: SectionRenderData): string {
    const filterState = data.filterState || {};
    return `
      <div class="filter-controls">
        ${this.config.filters.map(filter => this.renderFilter(filter, filterState)).join('')}
        <div class="filter-actions">
          <button id="applyFilters" class="primary">Apply Filters</button>
          <button id="clearFilters">Clear</button>
        </div>
      </div>
    `;
  }

  private renderFilter(filter: FilterConfig, state: Record<string, unknown>): string {
    switch (filter.type) {
      case 'text':
        return `<input type="text" id="${filter.id}" placeholder="${filter.label}" value="${state[filter.id] || ''}" />`;
      case 'select':
        return `<select id="${filter.id}">
          ${filter.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select>`;
      default:
        return '';
    }
  }
}

// ActionButtonsSection.ts
export class ActionButtonsSection implements ISection {
  constructor(private config: ActionButtonsConfig) {}

  render(data: SectionRenderData): string {
    return `
      <div class="action-buttons">
        ${this.config.buttons.map(btn => `
          <button id="${btn.id}" class="${btn.variant || 'default'}">
            ${btn.icon ? `<span class="icon">${btn.icon}</span>` : ''}
            ${btn.label}
          </button>
        `).join('')}
      </div>
    `;
  }
}

// DetailPanelSection.ts
export class DetailPanelSection implements ISection {
  constructor(private config: DetailPanelConfig) {}

  render(data: SectionRenderData): string {
    const detailData = data.detailData;

    if (!detailData) {
      return '<div class="detail-panel hidden"></div>';
    }

    return `
      <div class="detail-panel">
        <div class="detail-header">
          <h2>Details</h2>
          <button id="closeDetail">Close</button>
        </div>
        <div class="detail-content">
          ${this.renderDetailContent(detailData)}
        </div>
      </div>
    `;
  }

  private renderDetailContent(data: unknown): string {
    // Render detail content based on config
    return '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  }
}
```

**Testing:**
- Unit test each section
- Verify HTML output is correct
- Test with various config options

**Result:** CORE SECTIONS COMPLETE ✅

**Complexity:** Moderate (5-6 hours)

---

### Slice 7: "Migrate SolutionPanel"
**Builds on:** Slice 6

**Goal:** Migrate SolutionPanel to use FilterControlsSection + DataTableSection.

**Presentation (Solution Feature):**
```typescript
const sections = [
  new FilterControlsSection({
    filters: [
      { id: 'solutionType', type: 'select', label: 'Type', options: ['All', 'Managed', 'Unmanaged'] }
    ]
  }),
  new DataTableSection({
    columns: [
      { id: 'displayName', label: 'Name' },
      { id: 'version', label: 'Version' },
      { id: 'publisher', label: 'Publisher' }
    ]
  }),
  new ActionButtonsSection({
    buttons: [
      { id: 'refresh', label: 'Refresh', icon: 'refresh' },
      { id: 'export', label: 'Export', icon: 'export' }
    ]
  })
];

this.coordinator = new PanelCoordinator({
  panel,
  extensionUri,
  behaviors: [
    new EnvironmentBehavior(environmentService),  // ✅ Include
    new DataBehavior(solutionDataLoader),
    new SectionCompositionBehavior(sections, PanelLayout.SingleColumn)
  ],
  logger
});
```

**Testing:**
- Solution panel opens
- Environment dropdown works
- Filter controls work
- Data table populates
- Refresh and export buttons work

**Result:** SOLUTION PANEL MIGRATED ✅

**Complexity:** Simple (2-3 hours)

---

### Slice 8: "Implement Plugin Trace Viewer with Custom Sections"
**Builds on:** Slice 7

**Goal:** Implement Plugin Trace Viewer with all custom sections (complex validation).

**Presentation (Plugin Trace Viewer Feature):**
```typescript
// Custom sections
const traceLevelSection = new TraceLevelControlsSection(
  getTraceLevelUseCase,
  setTraceLevelUseCase,
  logger
);

const traceDetailSection = new TraceDetailPanelSection({
  tabs: ['Overview', 'Exception', 'Configuration', 'Message Block']
});

// Shared sections
const filterSection = new FilterControlsSection({
  filters: [
    { id: 'pluginName', type: 'text', label: 'Plugin Name' },
    { id: 'entityName', type: 'text', label: 'Entity Name' },
    { id: 'status', type: 'select', label: 'Status', options: ['All', 'Success', 'Exception'] }
  ]
});

const tableSection = new DataTableSection({
  columns: [
    { id: 'status', label: 'Status' },
    { id: 'createdOn', label: 'Created On' },
    { id: 'pluginName', label: 'Plugin Name' },
    { id: 'entityName', label: 'Entity' },
    { id: 'messageName', label: 'Message' },
    { id: 'mode', label: 'Mode' },
    { id: 'duration', label: 'Duration' }
  ]
});

const actionSection = new ActionButtonsSection({
  buttons: [
    { id: 'refresh', label: 'Refresh' },
    { id: 'deleteSelected', label: 'Delete Selected' },
    { id: 'deleteAll', label: 'Delete All' },
    { id: 'exportCsv', label: 'Export CSV' }
  ]
});

const sections = [
  traceLevelSection,   // Custom (header position)
  filterSection,       // Shared (filters position)
  tableSection,        // Shared (main position)
  traceDetailSection,  // Custom (detail position)
  actionSection        // Shared (footer position)
];

this.coordinator = new PanelCoordinator({
  panel,
  extensionUri,
  behaviors: [
    new EnvironmentBehavior(environmentService),
    new DataBehavior(pluginTracesDataLoader),
    new SectionCompositionBehavior(sections, PanelLayout.SplitHorizontal)
  ],
  logger
});
```

**Testing:**
- Plugin Trace Viewer opens
- All sections render correctly
- Trace level controls work
- Filter controls work
- Data table populates
- Detail panel shows/hides
- Split view layout works
- All buttons work

**Result:** COMPLEX PANEL COMPLETE ✅ (Framework validated)

**Complexity:** Moderate (6-8 hours)

---

### Slice 9: "Implement Remaining Panels (WebResource, PluginAssembly, Component)"
**Builds on:** Slice 8

**Goal:** Implement 3 unimplemented panels using sections from start.

**Presentation (Web Resource, Plugin Assembly, Component Features):**
- All use similar structure: DataTableSection + ActionButtonsSection
- All include EnvironmentBehavior
- All use DataBehavior with feature-specific DataLoader

**Testing:**
- Each panel opens correctly
- Environment dropdown works
- Data loads and displays
- Actions work

**Result:** ALL PANELS MIGRATED ✅

**Complexity:** Simple (3-4 hours total for all 3)

---

### Slice 10: "Documentation + Cleanup"
**Builds on:** Slice 9

**Goal:** Update all documentation, remove deprecated code.

**Documentation:**
- ✅ Update `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` (already done)
- ✅ Update `CLAUDE.md` rule #22 (already done)
- ✅ Update `docs/TECHNICAL_DEBT.md` (already done)
- Create migration guide for future panels
- Add JSDoc to all sections

**Cleanup:**
- Remove deprecated `DataTablePanelCoordinator` export (after all imports updated)
- Remove old base template HTML generation code (replaced by sections)
- Remove hard-coded button event listeners (replaced by section handlers)

**Testing:**
- Final `npm run compile` - should succeed
- Final `npm test` - all tests should pass
- All 7 panels tested manually

**Result:** FRAMEWORK COMPLETE + DOCUMENTED ✅

**Complexity:** Simple (2-3 hours)

---

## Total Effort Estimate

| Slice | Complexity | Estimated Hours |
|-------|-----------|----------------|
| 1. Rename + Backwards Compatibility | Simple | 1-2 |
| 2. Section System Foundation | Moderate | 3-4 |
| 3. SectionCompositionBehavior | Moderate | 3-4 |
| 4. Migrate EnvironmentSetupPanel | Moderate | 2-3 |
| 5. TreeViewSection + PersistenceInspector | Moderate | 4-5 |
| 6. Core Shared Sections | Moderate | 5-6 |
| 7. Migrate SolutionPanel | Simple | 2-3 |
| 8. Plugin Trace Viewer | Moderate | 6-8 |
| 9. Remaining Panels (3 panels) | Simple | 3-4 |
| 10. Documentation + Cleanup | Simple | 2-3 |
| **TOTAL** | **Moderate** | **31-42 hours** |

**Phased Delivery:**
- **Phase 1:** Slices 1-3 (Framework Foundation) - 7-10 hours - **MVP WORKING**
- **Phase 2:** Slices 4-6 (Core Sections + Migrations) - 11-14 hours - **PROVEN EXTENSIBLE**
- **Phase 3:** Slices 7-10 (Complete Migration) - 13-18 hours - **ALL PANELS COMPLETE**

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (Panels)                                 │
├─────────────────────────────────────────────────────────────┤
│ Panel (Factory)                                             │
│ - createOrShow() factory (singleton pattern)               │
│ - Constructs PanelCoordinator with sections + behaviors    │
│ - Handles panel-specific message routing                   │
│ - NO HTML generation (delegated to sections)               │
│ - NO business logic (delegated to use cases)               │
└─────────────────────────────────────────────────────────────┘
                          ↓ uses ↓
┌─────────────────────────────────────────────────────────────┐
│ Shared Infrastructure (Framework)                           │
├─────────────────────────────────────────────────────────────┤
│ PanelCoordinator (Universal Coordinator)                    │
│ - Orchestrates panel lifecycle                             │
│ - Holds panel state (currentData, filters, etc.)           │
│ - Re-renders on state changes                              │
│ - Delegates rendering to SectionCompositionBehavior         │
│                                                              │
│ Behaviors (Cross-Cutting Concerns)                          │
│ - SectionCompositionBehavior: Compose sections → HTML      │
│ - MessageRoutingBehavior: Route webview messages           │
│ - EnvironmentBehavior: Environment dropdown (OPTIONAL)     │
│ - DataBehavior: Load data via IDataLoader (OPTIONAL)       │
│                                                              │
│ Sections (UI Components)                                    │
│ - ISection: interface { render(data): string }             │
│ - DataTableSection: Generates table HTML                   │
│ - TreeViewSection: Generates tree HTML                     │
│ - FilterControlsSection: Generates filter controls HTML    │
│ - ActionButtonsSection: Generates buttons HTML             │
│ - DetailPanelSection: Generates detail pane HTML           │
└─────────────────────────────────────────────────────────────┘
                          ↓ uses ↓
┌─────────────────────────────────────────────────────────────┐
│ Feature-Specific (Custom Sections)                          │
├─────────────────────────────────────────────────────────────┤
│ TraceLevelControlsSection (Plugin Trace Viewer)            │
│ TraceDetailPanelSection (Plugin Trace Viewer)              │
│ [Future custom sections as needed]                          │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction

✅ **CORRECT:**
- Panels → PanelCoordinator (shared infrastructure)
- PanelCoordinator → Behaviors (composition)
- PanelCoordinator → Sections (composition)
- Sections → ISection interface (abstraction)
- Feature sections → ISection interface (abstraction)

❌ **NEVER:**
- Shared sections → Feature code
- Framework → Feature code

---

## Type Contracts (Define BEFORE Implementation)

### Shared Infrastructure Types

#### ISection Interface
```typescript
// src/shared/infrastructure/ui/sections/ISection.ts

export enum SectionPosition {
  Toolbar = 'toolbar',
  Header = 'header',
  Filters = 'filters',
  Main = 'main',
  Detail = 'detail',
  Footer = 'footer'
}

export interface ISection {
  readonly position?: SectionPosition;
  render(data: SectionRenderData): string;
}
```

#### SectionRenderData
```typescript
// src/shared/infrastructure/ui/types/SectionRenderData.ts

export interface SectionRenderData {
  // Table data (for DataTableSection)
  tableData?: Record<string, unknown>[];

  // Detail data (for DetailPanelSection)
  detailData?: unknown;

  // Filter state (for FilterControlsSection)
  filterState?: Record<string, unknown>;

  // Loading state (for all sections)
  isLoading?: boolean;

  // Error message (for all sections)
  errorMessage?: string;

  // Custom data (for feature-specific sections)
  customData?: Record<string, unknown>;
}
```

#### PanelLayout
```typescript
// src/shared/infrastructure/ui/types/PanelLayout.ts

export enum PanelLayout {
  SingleColumn = 'single-column',
  SplitHorizontal = 'split-horizontal',
  SplitVertical = 'split-vertical',
  ThreePanel = 'three-panel'
}
```

#### DataTableConfig
```typescript
// src/shared/infrastructure/ui/sections/DataTableSection.ts

export interface DataTableColumn {
  id: string;
  label: string;
  width?: string;
}

export interface DataTableConfig {
  columns: DataTableColumn[];
  selectable?: boolean;
  emptyMessage?: string;
}
```

#### FilterControlsConfig
```typescript
// src/shared/infrastructure/ui/sections/FilterControlsSection.ts

export interface FilterConfig {
  id: string;
  type: 'text' | 'select' | 'date';
  label: string;
  options?: string[];
  placeholder?: string;
}

export interface FilterControlsConfig {
  filters: FilterConfig[];
}
```

#### ActionButtonsConfig
```typescript
// src/shared/infrastructure/ui/sections/ActionButtonsSection.ts

export interface ButtonConfig {
  id: string;
  label: string;
  icon?: string;
  variant?: 'default' | 'primary' | 'danger';
}

export interface ActionButtonsConfig {
  buttons: ButtonConfig[];
}
```

#### TreeViewConfig
```typescript
// src/shared/infrastructure/ui/sections/TreeViewSection.ts

export interface TreeNode {
  id: string;
  label: string;
  icon?: string;
  children?: TreeNode[];
}

export interface TreeViewConfig {
  expandable?: boolean;
  selectable?: boolean;
  icons?: boolean;
}
```

#### PanelCoordinatorConfig
```typescript
// src/shared/infrastructure/ui/coordinators/PanelCoordinator.ts

export interface PanelCoordinatorConfig {
  panel: vscode.WebviewPanel;
  extensionUri: vscode.Uri;
  behaviors: IPanelBehavior[];
  sections?: ISection[];
  logger: ILogger;
}
```

### Coordinator Methods

```typescript
export class PanelCoordinator<TEntity, TViewModel> {
  constructor(config: PanelCoordinatorConfig);

  // Lifecycle
  public reveal(): void;
  public dispose(): void;

  // State management
  public async handleDataLoaded(data: TEntity[]): Promise<void>;
  public async handleFilterChanged(filters: Record<string, unknown>): Promise<void>;
  public async handleRowSelected(id: string): Promise<void>;

  // Rendering
  private async render(): Promise<void>;

  // Message handling (delegates to MessageRoutingBehavior)
  public async handleMessage(message: WebviewMessage): Promise<void>;
}
```

---

## File Structure

### After Refactor

```
src/shared/infrastructure/ui/
├── coordinators/
│   └── PanelCoordinator.ts                      # Renamed from DataTablePanelCoordinator
├── behaviors/
│   ├── IPanelBehavior.ts
│   ├── SectionCompositionBehavior.ts            # NEW
│   ├── MessageRoutingBehavior.ts
│   ├── EnvironmentBehavior.ts                   # OPTIONAL
│   ├── DataBehavior.ts                          # OPTIONAL
│   └── SolutionFilterBehavior.ts                # OPTIONAL
├── sections/
│   ├── ISection.ts                              # NEW
│   ├── DataTableSection.ts                      # NEW
│   ├── TreeViewSection.ts                       # NEW
│   ├── FilterControlsSection.ts                 # NEW
│   ├── ActionButtonsSection.ts                  # NEW
│   ├── DetailPanelSection.ts                    # NEW
│   └── EmptyStateSection.ts                     # NEW
└── types/
    ├── SectionRenderData.ts                     # NEW
    ├── PanelLayout.ts                           # NEW
    └── WebviewMessage.ts

src/features/pluginTraceViewer/presentation/
├── panels/
│   └── PluginTraceViewerPanel.ts
├── sections/
│   ├── TraceLevelControlsSection.ts             # NEW (custom)
│   └── TraceDetailPanelSection.ts               # NEW (custom)
└── dataLoaders/
    └── PluginTracesDataLoader.ts

src/features/environmentSetup/presentation/
├── panels/
│   └── EnvironmentSetupPanel.ts                 # MIGRATED (no EnvironmentBehavior)
└── dataLoaders/
    └── EnvironmentsDataLoader.ts

src/features/persistenceInspector/presentation/
├── panels/
│   └── PersistenceInspectorPanel.ts             # MIGRATED (uses TreeViewSection)
└── [No data loader - custom loading]
```

---

## Clean Architecture Compliance

### ✅ Layer Separation

**Shared Infrastructure:**
- ✅ PanelCoordinator orchestrates (NO business logic)
- ✅ Behaviors handle cross-cutting concerns (environment, data loading, message routing)
- ✅ Sections generate HTML (stateless, pure functions)
- ✅ No dependencies on feature code

**Feature Presentation:**
- ✅ Panels create coordinator with feature-specific config
- ✅ Custom sections in feature layer (if not reusable)
- ✅ NO business logic (delegates to use cases)
- ✅ NO HTML in .ts files (delegated to sections)

**Dependency Direction:**
- ✅ Panels → PanelCoordinator (shared infrastructure)
- ✅ PanelCoordinator → Behaviors (composition)
- ✅ PanelCoordinator → Sections (composition)
- ✅ All dependencies point inward or sideways (never outward to features)

### ✅ SOLID Principles

**Single Responsibility:**
- ✅ PanelCoordinator: Orchestrates panel lifecycle
- ✅ SectionCompositionBehavior: Composes sections into layouts
- ✅ MessageRoutingBehavior: Routes webview messages
- ✅ EnvironmentBehavior: Manages environment dropdown
- ✅ DataBehavior: Loads data via IDataLoader
- ✅ Each section: Generates HTML for one UI component

**Open/Closed:**
- ✅ Framework open for extension (new sections, new behaviors)
- ✅ Framework closed for modification (don't edit PanelCoordinator to add features)

**Liskov Substitution:**
- ✅ All sections implement ISection (interchangeable)
- ✅ All behaviors implement IPanelBehavior (interchangeable)

**Interface Segregation:**
- ✅ ISection is minimal (render only)
- ✅ Sections don't depend on unused methods

**Dependency Inversion:**
- ✅ PanelCoordinator depends on ISection (abstraction), not concrete sections
- ✅ Sections can be mocked in tests

---

## Testing Strategy

### Unit Tests

**Sections (Isolated):**
```typescript
describe('DataTableSection', () => {
  it('should render table with data', () => {
    const section = new DataTableSection({
      columns: [
        { id: 'name', label: 'Name' },
        { id: 'value', label: 'Value' }
      ]
    });

    const html = section.render({
      tableData: [
        { name: 'Foo', value: 'Bar' }
      ]
    });

    expect(html).toContain('<table');
    expect(html).toContain('Foo');
    expect(html).toContain('Bar');
  });

  it('should render empty state when no data', () => {
    const section = new DataTableSection({
      columns: [],
      emptyMessage: 'No data'
    });

    const html = section.render({ tableData: [] });

    expect(html).toContain('No data');
  });
});

describe('TreeViewSection', () => {
  it('should render tree with nested nodes', () => {
    const section = new TreeViewSection({ expandable: true });

    const html = section.render({
      customData: {
        treeData: [
          { id: '1', label: 'Root', children: [
            { id: '2', label: 'Child' }
          ]}
        ]
      }
    });

    expect(html).toContain('Root');
    expect(html).toContain('Child');
  });
});
```

**Behaviors (Isolated):**
```typescript
describe('SectionCompositionBehavior', () => {
  it('should compose sections into single-column layout', () => {
    const sections = [
      new DataTableSection({ columns: [] }),
      new ActionButtonsSection({ buttons: [] })
    ];

    const behavior = new SectionCompositionBehavior(sections, PanelLayout.SingleColumn);
    const html = behavior.compose({ tableData: [] });

    expect(html).toContain('panel-container');
  });
});
```

### Integration Tests

**PanelCoordinator:**
```typescript
describe('PanelCoordinator', () => {
  it('should render panel with sections', async () => {
    const mockPanel = createMockWebviewPanel();
    const mockLogger = new NullLogger();

    const sections = [
      new DataTableSection({ columns: [] })
    ];

    const coordinator = new PanelCoordinator({
      panel: mockPanel,
      extensionUri: vscode.Uri.file('/test'),
      behaviors: [
        new SectionCompositionBehavior(sections)
      ],
      logger: mockLogger
    });

    await coordinator.render();

    expect(mockPanel.webview.html).toContain('<table');
  });
});
```

### Manual Testing

**All 7 Panels:**
- [ ] EnvironmentSetupPanel opens and works (no environment dropdown)
- [ ] PersistenceInspectorPanel opens and shows tree view
- [ ] SolutionPanel opens with environment dropdown and filter
- [ ] PluginTraceViewerPanel opens with all sections
- [ ] WebResourcePanel opens (when implemented)
- [ ] PluginAssemblyPanel opens (when implemented)
- [ ] ComponentPanel opens (when implemented)

---

## Migration Checklist

### Phase 1: Framework Foundation
- [ ] Rename DataTablePanelCoordinator → PanelCoordinator
- [ ] Update all imports (automated find/replace)
- [ ] Run `npm run compile` - should succeed
- [ ] Run `npm test` - should pass
- [ ] Define ISection interface
- [ ] Implement DataTableSection (extract from base template)
- [ ] Implement SectionCompositionBehavior
- [ ] Test section composition with sample data

### Phase 2: Core Sections + Migrations
- [ ] Migrate EnvironmentSetupPanel (no EnvironmentBehavior)
- [ ] Test EnvironmentSetupPanel works correctly
- [ ] Extract TreeViewSection from PersistenceInspectorPanel
- [ ] Migrate PersistenceInspectorPanel to use TreeViewSection
- [ ] Test PersistenceInspectorPanel works correctly
- [ ] Implement FilterControlsSection
- [ ] Implement ActionButtonsSection
- [ ] Implement DetailPanelSection
- [ ] Unit test all sections

### Phase 3: Complete Migration
- [ ] Migrate SolutionPanel with sections
- [ ] Test SolutionPanel works correctly
- [ ] Implement Plugin Trace Viewer custom sections
- [ ] Implement Plugin Trace Viewer with all sections
- [ ] Test Plugin Trace Viewer works correctly
- [ ] Implement WebResourcePanel with sections
- [ ] Implement PluginAssemblyPanel with sections
- [ ] Implement ComponentPanel with sections
- [ ] Test all 3 new panels work correctly

### Phase 4: Documentation + Cleanup
- [ ] Update PANEL_DEVELOPMENT_GUIDE.md ✅ (already done)
- [ ] Update CLAUDE.md ✅ (already done)
- [ ] Update TECHNICAL_DEBT.md ✅ (already done)
- [ ] Create migration guide for future panels
- [ ] Add JSDoc to all sections and behaviors
- [ ] Remove deprecated DataTablePanelCoordinator export
- [ ] Remove old base template HTML generation code
- [ ] Remove hard-coded button event listeners
- [ ] Final `npm run compile` - should succeed
- [ ] Final `npm test` - should pass
- [ ] Manual test all 7 panels

---

## Success Metrics

### Functional Success
- ✅ All 7 panels work correctly with new framework
- ✅ EnvironmentSetupPanel works without EnvironmentBehavior
- ✅ PersistenceInspectorPanel uses TreeViewSection (no HTML in .ts)
- ✅ Plugin Trace Viewer has all required features
- ✅ No runtime errors (hard-coded buttons issue resolved)

### Code Quality Success
- ✅ No HTML in panel .ts files (rule #11 enforced)
- ✅ Sections are reusable across features
- ✅ Framework is extensible (easy to add new sections)
- ✅ All tests pass
- ✅ Documentation is complete and accurate

### Developer Experience Success
- ✅ Clear guidance on when to use Framework vs Direct Implementation
- ✅ New panels can be implemented quickly using existing sections
- ✅ Section library is discoverable (good naming, JSDoc)
- ✅ Framework doesn't feel constraining (custom sections are easy)

---

## Risk Mitigation

### Risk 1: Breaking Existing Panels During Migration

**Mitigation:**
- Phase 1 is backwards compatible (rename only)
- Test after each migration (don't batch)
- Keep old code until migration verified
- Each phase delivers working software

### Risk 2: Framework Too Complex for Simple Panels

**Mitigation:**
- Simple panels (EnvironmentSetupPanel) are simpler with framework (less code)
- Sections are optional (can use just one section)
- Framework provides value even for simple panels (message routing, lifecycle)

### Risk 3: Section Interface Too Rigid

**Mitigation:**
- ISection is minimal (just render method)
- SectionRenderData is flexible (customData field for anything)
- Custom sections can extend base sections if needed
- Direct Implementation still available for edge cases

---

## Future Enhancements (Out of Scope)

**Not included in this refactor (implement when needed):**
- SplitViewSection (three-panel layout) - Wait for Metadata Browser panel
- QueryBuilderSection (query UI) - Wait for Data Explorer panel
- ChartSection (data visualization) - Wait for analytics features
- FormSection (dynamic forms) - Wait for settings panels
- TabsSection (tabbed content) - May extend DetailPanelSection

**YAGNI Principle:** Extract sections when building 2nd panel that needs them (Three Strikes Rule).

---

## Approval Checklist

Before proceeding to implementation:
- [ ] User approves approach
- [ ] Architect (clean-architecture-guardian) approves design
- [ ] Type contracts reviewed and approved
- [ ] Vertical slicing strategy reviewed and approved
- [ ] Testing strategy reviewed and approved
- [ ] Migration plan reviewed and approved

---

**Ready for review.**
