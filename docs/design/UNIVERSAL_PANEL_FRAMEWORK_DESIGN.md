# Universal Panel Framework - Technical Design

**Status:** ✅ APPROVED FOR IMPLEMENTATION
**Date:** 2025-11-04
**Complexity:** Moderate
**Approved By:** clean-architecture-guardian (Final Approval), typescript-pro (Type Safety Review)

---

## Overview

**User Problem:** Current `DataTablePanelCoordinator` has a narrow name implying "data tables only," hard-coded button assumptions causing runtime errors, and inconsistent guidance on when to use framework vs direct implementation. Developers are confused about which approach to use for new panels.

**Solution:** Refactor to a **Universal Panel Framework** with:
- New implementation: `PanelCoordinator` (universal, extensible) alongside existing `DataTablePanelCoordinator` (deprecated)
- Section-based composition (supports tables, trees, split views, filters, custom UI)
- Replace `HtmlRenderingBehavior` with `SectionCompositionBehavior` (fundamental shift from template-based to component-based)
- Optional behaviors (EnvironmentBehavior is opt-in, not required)
- Eliminate "Pattern 1 vs Pattern 2" terminology in favor of "Framework Approach (default) vs Direct Implementation (rare)"
- Extract TreeViewSection from PersistenceInspectorPanel (validates non-table use case)

**Value:** Provides a clear, extensible default framework for ALL panel development. Eliminates confusion, reduces code duplication, and establishes consistent UX across all panels. Resolves technical debt (hard-coded buttons) at root cause rather than patching symptoms.

---

## Current State Analysis

### Existing Architecture (DataTablePanelCoordinator)

**Current Pattern: Behavior Registry**

```typescript
// Current coordinator constructor
export class DataTablePanelCoordinator implements IDataTablePanelCoordinator {
  constructor(
    private readonly registry: IDataTableBehaviorRegistry,  // Behavior registry
    private readonly dependencies: CoordinatorDependencies
  ) {}
}

// Behavior registry interface
export interface IDataTableBehaviorRegistry {
  readonly environmentBehavior: IEnvironmentBehavior;
  readonly solutionFilterBehavior: ISolutionFilterBehavior;
  readonly dataBehavior: IDataBehavior;
  readonly messageRoutingBehavior: IMessageRoutingBehavior;
  readonly htmlRenderingBehavior: IHtmlRenderingBehavior;  // ← HTML is a behavior!
  readonly panelTrackingBehavior: IPanelTrackingBehavior;
  dispose(): void;
}
```

**Initialization Flow:**
```typescript
public async initialize(): Promise<void> {
  // 1. Register panel tracking
  const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
  if (envId) {
    this.registry.panelTrackingBehavior.registerPanel(envId, panel);
  }

  // 2. Set up HTML rendering (TEMPLATE-BASED)
  panel.webview.html = this.registry.htmlRenderingBehavior.renderHtml();

  // 3. Register command handlers
  this.registerCommandHandlers();

  // 4. Initialize message routing
  this.registry.messageRoutingBehavior.initialize();

  // 5. Initialize environment behavior
  await this.registry.environmentBehavior.initialize();

  // 6. Initialize solution filter
  await this.registry.solutionFilterBehavior.initialize();

  // 7. Load initial data
  await this.registry.dataBehavior.initialize();
}
```

**Key Observation:** `HtmlRenderingBehavior` generates HTML from a **fixed base template** (`src/shared/infrastructure/ui/views/dataTable.ts`). This template has hard-coded button assumptions causing runtime errors.

### Problems with Current Architecture

1. **Template-Based Rendering** - Single base template with placeholders, not composable
2. **Hard-Coded Assumptions** - Base template assumes `refreshBtn` and `openMakerBtn` exist (lines 192-198)
3. **Narrow Naming** - "DataTable" implies tables only, but framework could support trees, split views, etc.
4. **Tight Coupling** - 6 behaviors tightly coupled through registry interface
5. **Limited Extensibility** - Adding new UI sections requires modifying base template

### Proposed Architecture (PanelCoordinator)

**New Pattern: Section Composition**

```typescript
// NEW coordinator constructor
export class PanelCoordinator implements IPanelCoordinator {
  constructor(config: PanelCoordinatorConfig) {}
}

export interface PanelCoordinatorConfig {
  panel: vscode.WebviewPanel;
  extensionUri: vscode.Uri;
  behaviors: IPanelBehavior[];           // SectionCompositionBehavior contains sections + layout
  logger: ILogger;
}
```

**Fundamental Shift:**
- **Old:** `HtmlRenderingBehavior` generates HTML from fixed template
- **New:** `SectionCompositionBehavior` composes sections into layout

**Key Difference:**
```typescript
// OLD (Template-Based)
htmlRenderingBehavior.renderHtml()
  → Base template with placeholders
  → Replace placeholders with data
  → Return complete HTML

// NEW (Component-Based)
sectionCompositionBehavior.compose(data)
  → Get layout template
  → For each section: render(data)
  → Inject section HTML into layout
  → Return complete HTML
```

**Backwards Compatibility:**
- `DataTablePanelCoordinator` continues to exist (deprecated, unchanged)
- `PanelCoordinator` is NEW implementation (different constructor)
- Gradual migration, no breaking changes

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
- [x] HTML extracted to view files (CLAUDE.md Rule #10 compliance)

### Non-Functional Requirements
- [x] **Backwards Compatible (Phase 1):** Existing panels work unchanged (using DataTablePanelCoordinator)
- [x] **Performance:** No performance degradation (section composition is efficient)
- [x] **Testability:** Sections and coordinator are independently testable
- [x] **Extensibility:** Easy to add new sections without modifying framework

### Test Coverage Targets
- [x] **Sections:** 90% coverage (pure functions, easy to test)
- [x] **Behaviors:** 80% coverage (some VS Code API mocking needed)
- [x] **Coordinator:** 85% coverage (integration layer)
- [x] **View Functions:** 90% coverage (HTML generation logic)

### Success Criteria
- [x] All 7 panels use PanelCoordinator (no "legacy code")
- [x] EnvironmentSetupPanel works without EnvironmentBehavior
- [x] PersistenceInspectorPanel uses TreeViewSection (no HTML in .ts file)
- [x] Plugin Trace Viewer implements with custom sections
- [x] Hard-coded button technical debt resolved (sections register handlers dynamically)
- [x] Documentation updated (Framework Approach vs Direct Implementation)
- [x] Tests pass for all panels with required coverage targets

---

## Event Handling Pattern

**Approach:** Stateless sections, panel registers handlers by ID convention.

### How It Works

1. **Sections render elements with predictable IDs:**
   ```typescript
   export class ActionButtonsSection implements ISection {
     render(data: SectionRenderData): string {
       return renderActionButtons(this.config.buttons);  // Delegates to view
     }
   }

   // View file renders buttons with IDs
   export function renderActionButtons(buttons: ButtonConfig[]): string {
     return buttons.map(btn => `
       <button id="${btn.id}">${btn.label}</button>
     `).join('');
   }
   ```

2. **Panel registers handlers for those IDs:**
   ```typescript
   const sections = [
     new ActionButtonsSection({
       buttons: [
         { id: 'refresh', label: 'Refresh' },
         { id: 'delete', label: 'Delete' }
       ]
     })
   ];

   // Coordinator handles message routing
   messageRoutingBehavior.registerHandler('refresh', async () => {
     await dataBehavior.loadData();
   });

   messageRoutingBehavior.registerHandler('delete', async () => {
     await deleteSelectedUseCase.execute();
   });
   ```

3. **Webview JavaScript sends messages by button ID:**
   ```javascript
   // webview.js (generated by view)
   document.getElementById('refresh')?.addEventListener('click', () => {
     vscode.postMessage({ command: 'refresh' });
   });

   document.getElementById('delete')?.addEventListener('click', () => {
     vscode.postMessage({ command: 'delete' });
   });
   ```

### Key Principles

- ✅ **Sections are stateless** - No event handling logic in sections
- ✅ **Convention over configuration** - Button ID = message command
- ✅ **Panel owns handlers** - Coordinator/panel registers handlers, not sections
- ✅ **Type safety** - Button IDs defined in config, handlers reference same IDs

### Example: Custom Section with Event Handling

```typescript
// TraceLevelControlsSection.ts (section)
export class TraceLevelControlsSection implements ISection {
  readonly position = SectionPosition.Header;

  constructor(private currentLevel: string) {}

  render(data: SectionRenderData): string {
    return renderTraceLevelControls(
      data.customData?.traceLevel || this.currentLevel
    );
  }
}

// traceLevelControlsView.ts (view - HTML generation)
export function renderTraceLevelControls(currentLevel: string): string {
  return `
    <div class="trace-level-controls">
      <span>Current Trace Level: <strong>${escapeHtml(currentLevel)}</strong></span>
      <button id="changeTraceLevel">Change Level</button>
    </div>
  `;
}

// PluginTraceViewerPanel.ts (panel - event handling)
messageRoutingBehavior.registerHandler('changeTraceLevel', async () => {
  const newLevel = await vscode.window.showQuickPick(['Off', 'Exception', 'All']);
  if (newLevel) {
    await setTraceLevelUseCase.execute(environmentId, TraceLevel.fromString(newLevel));
  }
});
```

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "Implement PanelCoordinator (New) Alongside DataTablePanelCoordinator (Existing)"
**Goal:** Create NEW coordinator with section support, keep existing coordinator unchanged.

**Shared Infrastructure:**
- Create `PanelCoordinator.ts` (new file, new class)
  - Constructor takes `PanelCoordinatorConfig` (different from DataTablePanelCoordinator)
  - Implements basic lifecycle: `initialize()`, `dispose()`, `reveal()`
- Create `IPanelCoordinator.ts` interface
- Create `SectionCompositionBehavior.ts` (replaces HtmlRenderingBehavior for new coordinator)
- Keep `DataTablePanelCoordinator.ts` UNCHANGED (deprecated but functional)
- Update `PANEL_DEVELOPMENT_GUIDE.md` to reference PanelCoordinator

**Testing:**
- All existing panels continue using `DataTablePanelCoordinator` (NO changes)
- Create ONE proof-of-concept test panel using `PanelCoordinator`
- Run `npm run compile` - should succeed
- Run `npm test` - all tests should pass
- Test coverage: 85% for PanelCoordinator

**Result:** NEW FRAMEWORK AVAILABLE, OLD FRAMEWORK STILL WORKS ✅

**Complexity:** Moderate

---

### Slice 2: "Section Interface + View Extraction"
**Builds on:** Slice 1

**Goal:** Define section contract and extract HTML to view files (CLAUDE.md Rule #10).

**Domain/Application (Shared):**
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
  readonly position: SectionPosition;
  render(data: SectionRenderData): string;
}

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

**Infrastructure (Shared):**
```typescript
// src/shared/infrastructure/ui/sections/DataTableSection.ts
export class DataTableSection implements ISection {
  readonly position = SectionPosition.Main;

  constructor(private config: DataTableConfig) {}

  render(data: SectionRenderData): string {
    const tableData = data.tableData || [];
    return renderDataTable(tableData, this.config);  // ← Delegates to view
  }
}

// src/shared/infrastructure/ui/views/dataTableView.ts
export function renderDataTable(
  data: Record<string, unknown>[],
  config: DataTableConfig
): string {
  // ALL HTML GENERATION HERE (not in .ts section file)
  return `
    <table class="data-table">
      <thead>
        <tr>
          ${config.columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => renderTableRow(row, config.columns)).join('')}
      </tbody>
    </table>
  `;
}

function renderTableRow(row: Record<string, unknown>, columns: DataTableColumn[]): string {
  return `
    <tr>
      ${columns.map(col => `<td>${escapeHtml(String(row[col.id] || ''))}</td>`).join('')}
    </tr>
  `;
}
```

**File Structure (NEW):**
```
src/shared/infrastructure/ui/
├── sections/
│   ├── ISection.ts                      # NEW
│   └── DataTableSection.ts              # NEW (delegates to view)
└── views/
    ├── dataTableView.ts                 # NEW (HTML generation)
    └── htmlHelpers.ts                   # NEW (escapeHtml, etc.)
```

**Testing:**
- Unit test `ISection` interface compliance
- Unit test `DataTableSection.render()` with sample data
- Unit test `renderDataTable()` HTML output
- Verify HTML output matches existing base template table
- Test coverage: 90% for view functions, 90% for sections

**Result:** SECTION INTERFACE DEFINED + HTML EXTRACTED ✅

**Complexity:** Moderate

---

### Slice 3: "SectionCompositionBehavior + Layout System"
**Builds on:** Slice 2

**Goal:** Create behavior to compose sections into layouts.

**Infrastructure (Shared):**
```typescript
// src/shared/infrastructure/ui/behaviors/SectionCompositionBehavior.ts
export class SectionCompositionBehavior implements IPanelBehavior {
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

  private splitHorizontalTemplate(): string {
    return `
      <div class="panel-container split-horizontal">
        <div class="toolbar-section"><!-- TOOLBAR --></div>
        <div class="header-section"><!-- HEADER --></div>
        <div class="filters-section"><!-- FILTERS --></div>
        <div class="content-split">
          <div class="main-section"><!-- MAIN --></div>
          <div class="detail-section hidden"><!-- DETAIL --></div>
        </div>
        <div class="footer-section"><!-- FOOTER --></div>
      </div>
    `;
  }

  private injectSectionsIntoLayout(template: string, data: SectionRenderData): string {
    let html = template;

    // Group sections by position
    const sectionsByPosition = this.groupSectionsByPosition();

    // Inject each position
    for (const [position, sections] of sectionsByPosition.entries()) {
      const placeholder = `<!-- ${position.toUpperCase()} -->`;
      const sectionHtml = sections.map(s => s.render(data)).join('\n');
      html = html.replace(placeholder, sectionHtml);
    }

    return html;
  }

  private groupSectionsByPosition(): Map<SectionPosition, ISection[]> {
    const map = new Map<SectionPosition, ISection[]>();

    for (const section of this.sections) {
      const position = section.position;
      const sections = map.get(position);

      if (sections === undefined) {
        map.set(position, [section]);
      } else {
        sections.push(section);
      }
    }

    return map;
  }
}

// src/shared/infrastructure/ui/types/PanelLayout.ts
export enum PanelLayout {
  SingleColumn = 'single-column',
  SplitHorizontal = 'split-horizontal',
  SplitVertical = 'split-vertical',
  ThreePanel = 'three-panel'  // Future
}
```

**Testing:**
- Test composition with single section
- Test composition with multiple sections at different positions
- Test single-column layout
- Test split-horizontal layout (for future Plugin Trace Viewer)
- Verify HTML output is correct
- Test coverage: 80% for SectionCompositionBehavior

**Result:** SECTION COMPOSITION WORKING ✅

**Complexity:** Moderate

---

### Slice 4: "Migrate SolutionPanel (Simple Validation)"
**Builds on:** Slice 3

**Goal:** Migrate simplest real panel to validate framework with minimal risk.

**Presentation (Solution Feature):**
```typescript
// Define panel commands (Command Registry Pattern)
type SolutionPanelCommands = 'refresh' | 'export';

// Create sections
const filterSection = new FilterControlsSection({
  filters: [
    { id: 'solutionType', type: 'select', label: 'Type', options: ['All', 'Managed', 'Unmanaged'] }
  ]
});

const tableSection = new DataTableSection({
  columns: [
    { id: 'displayName', label: 'Name' },
    { id: 'version', label: 'Version' },
    { id: 'publisher', label: 'Publisher' }
  ]
});

const actionSection = new ActionButtonsSection({
  buttons: [
    { id: createButtonId('refresh'), label: 'Refresh' },  // Branded type
    { id: createButtonId('export'), label: 'Export' }
  ]
});

// Create coordinator (NEW PanelCoordinator with command registry)
this.coordinator = new PanelCoordinator<SolutionPanelCommands>({
  panel,
  extensionUri,
  behaviors: [
    new EnvironmentBehavior(environmentService),  // ✅ Include
    new DataBehavior(solutionDataLoader),
    new SectionCompositionBehavior(
      [filterSection, tableSection, actionSection],
      PanelLayout.SingleColumn
    ),
    new MessageRoutingBehavior()
  ],
  logger
});

// Register event handlers (type-safe commands)
this.coordinator.registerHandler('refresh', async () => {  // ✅ Autocomplete + type check
  await dataBehavior.loadData();
});

this.coordinator.registerHandler('export', async () => {  // ✅ Autocomplete + type check
  await exportSolutionsUseCase.execute();
});

// this.coordinator.registerHandler('typo', ...);  // ❌ Compile error!
```

**Testing:**
- Solution panel opens
- Environment dropdown works (EnvironmentBehavior included)
- Filter controls render and work
- Data table populates
- Refresh and export buttons work
- Compare UX with old DataTablePanelCoordinator version
- Test coverage: 85% for SolutionPanel coordinator

**Result:** SIMPLE PANEL MIGRATED ✅ (Framework validated with real panel)

**Complexity:** Simple

---

### Slice 5: "Migrate EnvironmentSetupPanel (Form-Based, No EnvironmentBehavior)"
**Builds on:** Slice 4

**Goal:** Prove EnvironmentBehavior is optional AND prove framework supports form-based panels (not just data tables).

**Current Implementation:** EnvironmentSetupPanel is a form panel with:
- Basic Information section: Name, Dataverse URL, Environment ID (with Discover button)
- Authentication section: Tenant ID, Auth Method dropdown, conditional fields (Service Principal, Username/Password)
- Header buttons: Save, Test Connection, Delete (conditionally shown)
- Uses EnvironmentSetupBehavior.js for client-side form logic
- Has dynamic fields that show/hide based on auth method selection

**Domain (Environment Setup Feature):**

Create domain entities and services for validation and business rules:

```typescript
// src/features/environmentSetup/domain/entities/EnvironmentConfig.ts
export class EnvironmentConfig {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly dataverseUrl: URL,
    public readonly authMethod: AuthenticationMethod,
    public readonly tenantId: string | null,
    public readonly publicClientId: string,
    public readonly powerPlatformEnvironmentId: string | null,
    public readonly credentials: AuthenticationCredentials
  ) {}

  /**
   * Factory method with validation.
   * Enforces business rules at entity creation.
   */
  static create(data: EnvironmentFormData): EnvironmentConfig {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      throw new Error('Environment name is required');
    }

    if (!data.dataverseUrl || !this.isValidUrl(data.dataverseUrl)) {
      throw new Error('Valid Dataverse URL is required');
    }

    if (!data.authenticationMethod) {
      throw new Error('Authentication method is required');
    }

    // Validate auth-method-specific requirements
    const authMethod = AuthenticationMethod.fromString(data.authenticationMethod);
    const credentials = this.createCredentials(authMethod, data);

    // Validate Tenant ID requirement
    if (authMethod === AuthenticationMethod.ServicePrincipal && !data.tenantId) {
      throw new Error('Tenant ID is required for Service Principal authentication');
    }

    return new EnvironmentConfig(
      data.id || this.generateId(),
      data.name.trim(),
      new URL(data.dataverseUrl),
      authMethod,
      data.tenantId || null,
      data.publicClientId || '51f81489-12ee-4a9e-aaae-a2591f45987d',
      data.powerPlatformEnvironmentId || null,
      credentials
    );
  }

  private static createCredentials(
    authMethod: AuthenticationMethod,
    data: EnvironmentFormData
  ): AuthenticationCredentials {
    if (authMethod === AuthenticationMethod.ServicePrincipal) {
      if (!data.clientId || !data.clientSecret) {
        throw new Error('Service Principal requires Client ID and Client Secret');
      }
      return new ServicePrincipalCredentials(data.clientId, data.clientSecret);
    }

    if (authMethod === AuthenticationMethod.UsernamePassword) {
      if (!data.username || !data.password) {
        throw new Error('Username/Password authentication requires username and password');
      }
      return new UsernamePasswordCredentials(data.username, data.password);
    }

    return new InteractiveCredentials();
  }

  private static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && parsed.hostname.includes('dynamics.com');
    } catch {
      return false;
    }
  }

  private static generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Rich behavior: Update authentication method.
   * Returns new instance (immutable entity).
   */
  updateAuthMethod(
    newMethod: AuthenticationMethod,
    newCredentials: AuthenticationCredentials
  ): EnvironmentConfig {
    return new EnvironmentConfig(
      this.id,
      this.name,
      this.dataverseUrl,
      newMethod,
      this.tenantId,
      this.publicClientId,
      this.powerPlatformEnvironmentId,
      newCredentials
    );
  }

  /**
   * Rich behavior: Validate if environment can be saved.
   */
  canSave(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.authMethod === AuthenticationMethod.ServicePrincipal && !this.tenantId) {
      errors.push('Tenant ID is required for Service Principal');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// src/features/environmentSetup/domain/services/EnvironmentFormRules.ts
/**
 * Domain service: Business rules for environment form fields.
 * Determines which fields are visible/required based on authentication method.
 */
export class EnvironmentFormRules {
  /**
   * Returns fields that should be visible for the given authentication method.
   * Business rules:
   * - Service Principal requires: clientId, clientSecret
   * - Username/Password requires: username, password
   * - Interactive/DeviceCode: no additional fields
   */
  getVisibleFields(
    authMethod: AuthenticationMethod,
    allFields: ReadonlyArray<FormFieldConfig>
  ): ReadonlyArray<FormFieldConfig> {
    return allFields.filter(field => {
      // Fields without conditional display are always visible
      if (!field.conditionalDisplay) {
        return true;
      }

      const { dependsOn, showWhen } = field.conditionalDisplay;

      // Business rule: Show Service Principal fields
      if (authMethod === AuthenticationMethod.ServicePrincipal && showWhen === 'ServicePrincipal') {
        return true;
      }

      // Business rule: Show Username/Password fields
      if (authMethod === AuthenticationMethod.UsernamePassword && showWhen === 'UsernamePassword') {
        return true;
      }

      return false;
    });
  }

  /**
   * Returns validation rules for a field based on context.
   */
  getFieldValidationRules(
    field: FormFieldConfig,
    authMethod: AuthenticationMethod
  ): ReadonlyArray<ValidationRule> {
    const rules: ValidationRule[] = [];

    // Required field validation
    if (field.required) {
      rules.push({
        type: 'required',
        message: `${field.label} is required`
      });
    }

    // URL validation
    if (field.type === 'url') {
      rules.push({
        type: 'pattern',
        pattern: /^https:\/\/.+\.dynamics\.com/,
        message: 'Must be a valid Dynamics 365 URL (https://...dynamics.com)'
      });
    }

    // Tenant ID validation for Service Principal
    if (field.id === 'tenantId' && authMethod === AuthenticationMethod.ServicePrincipal) {
      rules.push({
        type: 'required',
        message: 'Tenant ID is required for Service Principal'
      });
    }

    return rules;
  }
}
```

**Infrastructure (Shared):**

Create `LoadingStateBehavior` for automatic button state management:

```typescript
// src/shared/infrastructure/ui/behaviors/LoadingStateBehavior.ts
export class LoadingStateBehavior implements IPanelBehavior {
  private buttonStates = new Map<string, ButtonState>();
  private panel: vscode.WebviewPanel | null = null;
  private onStateChanged: (() => Promise<void>) | null = null;

  async initialize(panel: vscode.WebviewPanel): Promise<void> {
    this.panel = panel;
  }

  /**
   * Register callback to trigger re-render when state changes.
   */
  setRenderCallback(callback: () => Promise<void>): void {
    this.onStateChanged = callback;
  }

  /**
   * Wraps async operation with automatic state tracking.
   * Shows loading spinner, then success/error state, then resets.
   */
  async trackOperation<T>(
    buttonId: ButtonId,
    operation: () => Promise<T>,
    defaultVariant: ButtonVariant = 'primary'
  ): Promise<T> {
    try {
      // Set loading state
      this.setState(buttonId, { loading: true, variant: defaultVariant });
      await this.notifyStateChanged();

      // Execute operation
      const result = await operation();

      // Set success state
      this.setState(buttonId, { variant: 'success' });
      await this.notifyStateChanged();

      // Reset after 2s
      setTimeout(() => {
        this.setState(buttonId, { variant: defaultVariant });
        this.notifyStateChanged();
      }, 2000);

      return result;
    } catch (error) {
      // Set error state
      this.setState(buttonId, { variant: 'danger' });
      await this.notifyStateChanged();

      // Reset after 2s
      setTimeout(() => {
        this.setState(buttonId, { variant: defaultVariant });
        this.notifyStateChanged();
      }, 2000);

      throw error;
    }
  }

  /**
   * Get current button states for rendering.
   */
  getButtonStates(): Record<string, ButtonState> {
    return Object.fromEntries(this.buttonStates);
  }

  private setState(buttonId: ButtonId, state: ButtonState): void {
    this.buttonStates.set(buttonId, state);
  }

  private async notifyStateChanged(): Promise<void> {
    if (this.onStateChanged) {
      await this.onStateChanged();
    }
  }

  dispose(): void {
    this.buttonStates.clear();
    this.panel = null;
    this.onStateChanged = null;
  }
}
```

**Infrastructure (Shared):**

Create `ButtonState` value object in domain types:

```typescript
// src/shared/domain/types/ButtonState.ts
export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'success';

/**
 * Value object representing the visual state of a button.
 * Immutable - changes create new instances.
 */
export class ButtonState {
  constructor(
    public readonly loading: boolean = false,
    public readonly disabled: boolean = false,
    public readonly variant: ButtonVariant = 'default',
    public readonly hidden: boolean = false
  ) {
    // Validation: loading buttons should be disabled
    if (loading && !disabled) {
      throw new Error('Loading buttons must be disabled');
    }
  }

  /**
   * Create loading state.
   */
  static loading(variant: ButtonVariant = 'default'): ButtonState {
    return new ButtonState(true, true, variant, false);
  }

  /**
   * Create success state.
   */
  static success(): ButtonState {
    return new ButtonState(false, false, 'success', false);
  }

  /**
   * Create error state.
   */
  static error(): ButtonState {
    return new ButtonState(false, false, 'danger', false);
  }

  /**
   * Create default state.
   */
  static default(variant: ButtonVariant = 'default'): ButtonState {
    return new ButtonState(false, false, variant, false);
  }

  /**
   * Create hidden state.
   */
  static hidden(): ButtonState {
    return new ButtonState(false, true, 'default', true);
  }

  /**
   * Convert to plain object for serialization.
   */
  toPlainObject(): {
    loading: boolean;
    disabled: boolean;
    variant: ButtonVariant;
    hidden: boolean;
  } {
    return {
      loading: this.loading,
      disabled: this.disabled,
      variant: this.variant,
      hidden: this.hidden
    };
  }
}
```

**Infrastructure (Shared):**

Update `SectionRenderData` with typed properties:

```typescript
// src/shared/infrastructure/ui/types/SectionRenderData.ts
/**
 * Standardized data passed to sections during rendering.
 * All properties are typed and documented.
 */
export interface SectionRenderData {
  // Optional discriminant for type narrowing
  sectionType?: 'table' | 'tree' | 'detail' | 'filter' | 'form' | 'custom';

  // Table data (for DataTableSection)
  tableData?: ReadonlyArray<Record<string, unknown>>;

  // Detail data (for DetailPanelSection)
  detailData?: unknown;

  // Filter state (for FilterControlsSection)
  filterState?: Record<string, unknown>;

  // Form data (for FormSection) - TYPED
  formData?: Record<string, unknown>;

  // Button states (for ButtonWithStateSection) - TYPED
  buttonStates?: Record<string, ButtonState>;

  // Validation errors (for FormSection)
  validationErrors?: Record<string, string[]>;

  // Loading state (for all sections)
  isLoading?: boolean;

  // Error message (for all sections)
  errorMessage?: string;

  // Custom data (escape hatch for feature-specific sections)
  customData?: Record<string, unknown>;
}
```

**Infrastructure (Shared):**

Create `FormSection` for form-based panels:

```typescript
// src/shared/infrastructure/ui/sections/FormSection.ts
export class FormSection implements ISection {
  readonly position = SectionPosition.Main;

  constructor(private config: FormSectionConfig) {}

  render(data: SectionRenderData): string {
    const formData = data.customData?.formData as Record<string, unknown> || {};
    return renderForm(this.config, formData);
  }
}

// src/shared/infrastructure/ui/types/FormSectionConfig.ts
export interface FormFieldConfig {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly type: 'text' | 'url' | 'password' | 'select';
  readonly placeholder?: string;
  readonly helpText?: string;
  readonly required?: boolean;
  readonly defaultValue?: string;
  readonly options?: ReadonlyArray<{ value: string; label: string }>;
  readonly conditionalDisplay?: {
    readonly dependsOn: string;
    readonly showWhen: string;
  };
}

export interface FormFieldGroupConfig {
  readonly title: string;
  readonly fields: ReadonlyArray<FormFieldConfig>;
}

export interface FormSectionConfig {
  readonly id: string;
  readonly fieldGroups: ReadonlyArray<FormFieldGroupConfig>;
}

// src/shared/infrastructure/ui/views/formView.ts
export function renderForm(
  config: FormSectionConfig,
  formData: Record<string, unknown>
): string {
  return `
    <form id="${config.id}">
      ${config.fieldGroups.map(group => renderFieldGroup(group, formData)).join('\n')}
    </form>
  `;
}

function renderFieldGroup(
  group: FormFieldGroupConfig,
  formData: Record<string, unknown>
): string {
  return `
    <div class="form-group-section">
      <h2>${escapeHtml(group.title)}</h2>
      ${group.fields.map(field => renderFormField(field, formData)).join('\n')}
    </div>
  `;
}

function renderFormField(
  field: FormFieldConfig,
  formData: Record<string, unknown>
): string {
  const value = formData[field.name] || field.defaultValue || '';
  const displayStyle = shouldShowField(field, formData) ? '' : 'display: none;';
  const dataAttr = field.conditionalDisplay
    ? `data-depends-on="${field.conditionalDisplay.dependsOn}" data-show-when="${field.conditionalDisplay.showWhen}"`
    : '';

  return `
    <div class="form-field" ${dataAttr} style="${displayStyle}">
      <label for="${field.id}">${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>
      ${renderFieldInput(field, value)}
      ${field.helpText ? `<span class="help-text">${escapeHtml(field.helpText)}</span>` : ''}
    </div>
  `;
}

function renderFieldInput(field: FormFieldConfig, value: unknown): string {
  const valueStr = String(value || '');

  if (field.type === 'select' && field.options) {
    return `
      <select id="${field.id}" name="${field.name}" ${field.required ? 'required' : ''}>
        ${field.options.map(opt => `
          <option value="${escapeHtml(opt.value)}" ${opt.value === valueStr ? 'selected' : ''}>
            ${escapeHtml(opt.label)}
          </option>
        `).join('')}
      </select>
    `;
  }

  return `
    <input
      type="${field.type}"
      id="${field.id}"
      name="${field.name}"
      value="${escapeHtml(valueStr)}"
      placeholder="${escapeHtml(field.placeholder || '')}"
      ${field.required ? 'required' : ''}
    />
  `;
}

function shouldShowField(
  field: FormFieldConfig,
  formData: Record<string, unknown>
): boolean {
  if (!field.conditionalDisplay) {
    return true;
  }

  const dependentValue = formData[field.conditionalDisplay.dependsOn];
  return dependentValue === field.conditionalDisplay.showWhen;
}
```

**Infrastructure (Shared):**

Create `ButtonWithStateSection` for buttons with loading states and visual feedback:

```typescript
// src/shared/infrastructure/ui/sections/ButtonWithStateSection.ts
export class ButtonWithStateSection implements ISection {
  readonly position = SectionPosition.Header;

  constructor(private config: ButtonWithStateConfig) {}

  render(data: SectionRenderData): string {
    const buttonStates = data.customData?.buttonStates as Record<string, ButtonState> || {};
    return renderButtonsWithState(this.config, buttonStates);
  }
}

// src/shared/infrastructure/ui/types/ButtonWithStateConfig.ts
export interface ButtonState {
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'success';
  readonly hidden?: boolean;
}

export interface ButtonWithStateConfig {
  readonly buttons: ReadonlyArray<{
    readonly id: ButtonId;
    readonly label: string;
    readonly defaultState?: ButtonState;
  }>;
}

// src/shared/infrastructure/ui/views/buttonWithStateView.ts
export function renderButtonsWithState(
  config: ButtonWithStateConfig,
  states: Record<string, ButtonState>
): string {
  return `
    <div class="button-group">
      ${config.buttons.map(btn => {
        const state = states[btn.id] || btn.defaultState || {};
        const variant = state.variant || 'default';
        const loading = state.loading ? 'loading' : '';
        const disabled = state.disabled || state.loading ? 'disabled' : '';
        const hidden = state.hidden ? 'display: none;' : '';

        return `
          <button
            id="${btn.id}"
            class="btn btn-${variant} ${loading}"
            ${disabled ? 'disabled' : ''}
            style="${hidden}"
          >
            ${state.loading ? '<span class="spinner"></span>' : ''}
            ${escapeHtml(btn.label)}
          </button>
        `;
      }).join('\n')}
    </div>
  `;
}
```

**Presentation (Environment Setup Feature):**

Define panel commands:
```typescript
type EnvironmentSetupPanelCommands =
  | 'save'
  | 'testConnection'
  | 'delete'
  | 'discoverEnvironmentId'
  | 'validateName'
  | 'authMethodChanged';
```

Create sections:
```typescript
const headerSection = new ButtonWithStateSection({
  buttons: [
    { id: createButtonId('save'), label: 'Save Environment', defaultState: { variant: 'primary' } },
    { id: createButtonId('testConnection'), label: 'Test Connection', defaultState: { variant: 'secondary' } },
    { id: createButtonId('delete'), label: 'Delete Environment', defaultState: { variant: 'danger', hidden: !isEditMode } }
  ]
});

const formSection = new FormSection({
  id: 'environmentForm',
  fieldGroups: [
    {
      title: 'Basic Information',
      fields: [
        {
          id: 'name',
          name: 'name',
          label: 'Environment Name',
          type: 'text',
          placeholder: 'e.g., DEV',
          helpText: 'A friendly name to identify this environment',
          required: true
        },
        {
          id: 'dataverseUrl',
          name: 'dataverseUrl',
          label: 'Dataverse URL',
          type: 'url',
          placeholder: 'https://org.crm.dynamics.com',
          helpText: 'The URL of your Dataverse organization',
          required: true
        },
        {
          id: 'environmentId',
          name: 'powerPlatformEnvironmentId',
          label: 'Environment ID (Optional)',
          type: 'text',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          helpText: 'Optional: The unique GUID for this environment'
        }
      ]
    },
    {
      title: 'Authentication',
      fields: [
        {
          id: 'tenantId',
          name: 'tenantId',
          label: 'Tenant ID (Optional)',
          type: 'text',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          helpText: 'Your Azure AD tenant ID. Optional for Interactive/DeviceCode/UsernamePassword. Required for Service Principal.',
          required: false
        },
        {
          id: 'authenticationMethod',
          name: 'authenticationMethod',
          label: 'Authentication Method',
          type: 'select',
          required: true,
          helpText: 'Select how you want to authenticate to this environment',
          options: [
            { value: 'Interactive', label: 'Interactive (Browser)' },
            { value: 'ServicePrincipal', label: 'Service Principal (Client Secret)' },
            { value: 'UsernamePassword', label: 'Username/Password' },
            { value: 'DeviceCode', label: 'Device Code' }
          ]
        },
        {
          id: 'publicClientId',
          name: 'publicClientId',
          label: 'Public Client ID',
          type: 'text',
          defaultValue: '51f81489-12ee-4a9e-aaae-a2591f45987d',
          placeholder: '51f81489-12ee-4a9e-aaae-a2591f45987d',
          helpText: "Application (client) ID for Interactive/DeviceCode flows. Default is Microsoft's official public client ID.",
          required: true
        },
        // Service Principal conditional fields
        {
          id: 'clientId',
          name: 'clientId',
          label: 'Client ID',
          type: 'text',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          helpText: 'Application ID for service principal',
          conditionalDisplay: {
            dependsOn: 'authenticationMethod',
            showWhen: 'ServicePrincipal'
          }
        },
        {
          id: 'clientSecret',
          name: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          placeholder: 'Enter client secret',
          helpText: 'Secret value (stored securely)',
          conditionalDisplay: {
            dependsOn: 'authenticationMethod',
            showWhen: 'ServicePrincipal'
          }
        },
        // Username/Password conditional fields
        {
          id: 'username',
          name: 'username',
          label: 'Username',
          type: 'text',
          placeholder: 'user@domain.com',
          helpText: 'Dataverse username',
          conditionalDisplay: {
            dependsOn: 'authenticationMethod',
            showWhen: 'UsernamePassword'
          }
        },
        {
          id: 'password',
          name: 'password',
          label: 'Password',
          type: 'password',
          placeholder: 'Enter password',
          helpText: 'Password (stored securely)',
          conditionalDisplay: {
            dependsOn: 'authenticationMethod',
            showWhen: 'UsernamePassword'
          }
        }
      ]
    }
  ]
});

// Custom section for Discover button (inline with Environment ID field)
const discoverButtonSection = new CustomInlineButtonSection({
  position: SectionPosition.Main, // Rendered after environmentId field
  buttonId: createButtonId('discoverEnvironmentId'),
  label: 'Discover ID',
  targetFieldId: 'environmentId'
});
```

Create coordinator:
```typescript
this.coordinator = new PanelCoordinator<EnvironmentSetupPanelCommands>({
  panel,
  extensionUri,
  behaviors: [
    // NO EnvironmentBehavior - this panel manages environments, doesn't operate within one
    new SectionCompositionBehavior(
      [headerSection, formSection, discoverButtonSection],
      PanelLayout.SingleColumn
    ),
    new MessageRoutingBehavior()
  ],
  logger
});

// Track button states for visual feedback
let buttonStates: Record<string, ButtonState> = {};

// Register handlers with button state management
this.coordinator.registerHandler('save', async (payload) => {
  const formData = payload as EnvironmentFormData;

  try {
    // Show loading state
    buttonStates.save = { loading: true, variant: 'primary' };
    await this.render(buttonStates);

    await saveEnvironmentUseCase.execute(formData);

    // Success state (green)
    buttonStates.save = { variant: 'success' };
    await this.render(buttonStates);

    // Reset after 2s
    setTimeout(() => {
      buttonStates.save = { variant: 'primary' };
      this.render(buttonStates);
    }, 2000);
  } catch (error) {
    // Error state (red)
    buttonStates.save = { variant: 'danger' };
    await this.render(buttonStates);

    // Reset after 2s
    setTimeout(() => {
      buttonStates.save = { variant: 'primary' };
      this.render(buttonStates);
    }, 2000);

    throw error;
  }
});

this.coordinator.registerHandler('testConnection', async (payload) => {
  const formData = payload as EnvironmentFormData;

  try {
    buttonStates.testConnection = { loading: true, variant: 'secondary' };
    await this.render(buttonStates);

    await testConnectionUseCase.execute(formData);

    buttonStates.testConnection = { variant: 'success' };
    await this.render(buttonStates);

    setTimeout(() => {
      buttonStates.testConnection = { variant: 'secondary' };
      this.render(buttonStates);
    }, 2000);
  } catch (error) {
    buttonStates.testConnection = { variant: 'danger' };
    await this.render(buttonStates);

    setTimeout(() => {
      buttonStates.testConnection = { variant: 'secondary' };
      this.render(buttonStates);
    }, 2000);

    throw error;
  }
});

this.coordinator.registerHandler('discoverEnvironmentId', async (payload) => {
  const dataverseUrl = payload as { dataverseUrl: string };

  try {
    buttonStates.discoverEnvironmentId = { loading: true };
    await this.render(buttonStates);

    const environmentId = await discoverEnvironmentIdUseCase.execute(dataverseUrl);

    // Success - update form field
    await this.panel.webview.postMessage({
      command: 'updateField',
      data: { fieldId: 'environmentId', value: environmentId }
    });

    buttonStates.discoverEnvironmentId = { variant: 'success' };
    await this.render(buttonStates);

    setTimeout(() => {
      buttonStates.discoverEnvironmentId = {};
      this.render(buttonStates);
    }, 2000);
  } catch (error) {
    buttonStates.discoverEnvironmentId = { variant: 'danger' };
    await this.render(buttonStates);

    setTimeout(() => {
      buttonStates.discoverEnvironmentId = {};
      this.render(buttonStates);
    }, 2000);

    throw error;
  }
});

this.coordinator.registerHandler('delete', async () => {
  const confirmed = await vscode.window.showWarningMessage(
    'Are you sure you want to delete this environment?',
    { modal: true },
    'Delete'
  );

  if (confirmed) {
    await deleteEnvironmentUseCase.execute(environmentId);
    this.dispose();
  }
});

this.coordinator.registerHandler('validateName', async (payload) => {
  const name = payload as { name: string };
  const isUnique = await validateUniqueNameUseCase.execute(name.name, environmentId);

  await this.panel.webview.postMessage({
    command: 'validationResult',
    data: { fieldId: 'name', valid: isUnique, message: isUnique ? '' : 'Name already exists' }
  });
});

this.coordinator.registerHandler('authMethodChanged', async (payload) => {
  const authMethod = payload as { authMethod: string };

  // Re-render form with conditional fields shown/hidden
  await this.render({
    ...buttonStates,
    formData: { authenticationMethod: authMethod.authMethod }
  });
});
```

**Client-side behavior (webview):**
- Reuse existing `EnvironmentSetupBehavior.js` for form logic
- Handles conditional field display/hide based on auth method
- Sends messages to panel for validation, save, test, etc.

**Testing:**
- Environment Setup panel opens correctly (form mode, not table)
- NO environment dropdown shown (correct - no EnvironmentBehavior)
- Form fields render correctly with proper layout
- Conditional fields show/hide based on auth method selection
- Save button: Shows spinner → green on success / red on failure
- Test Connection button: Shows spinner → green on success / red on failure
- Discover ID button: Shows spinner → green on success / red on failure
- Delete button only shown when editing existing environment
- Name validation works (real-time check for duplicate names)
- All form data saves correctly
- Panel look and feel matches current implementation
- Test coverage:
  - FormSection: 90% coverage
  - ButtonWithStateSection: 90% coverage
  - renderForm view: 90% coverage
  - renderButtonsWithState view: 90% coverage
  - EnvironmentSetupPanel coordinator: 85% coverage

**Result:** OPTIONAL ENVIRONMENT BEHAVIOR PROVEN ✅ + FORM-BASED PANELS SUPPORTED ✅

**Complexity:** Moderate (more complex than originally estimated - requires new FormSection + ButtonWithStateSection + state management for visual feedback)

---

### Slice 6: "Implement Core Shared Sections + Views"
**Builds on:** Slice 5

**Goal:** Implement remaining core sections for reuse.

**Infrastructure (Shared):**

1. **FilterControlsSection + View**
   ```typescript
   // FilterControlsSection.ts
   export class FilterControlsSection implements ISection {
     readonly position = SectionPosition.Filters;

     constructor(private config: FilterControlsConfig) {}

     render(data: SectionRenderData): string {
       return renderFilterControls(this.config, data.filterState || {});
     }
   }

   // filterControlsView.ts
   export function renderFilterControls(
     config: FilterControlsConfig,
     state: Record<string, unknown>
   ): string {
     return `
       <div class="filter-controls">
         ${config.filters.map(filter => renderFilter(filter, state)).join('')}
         <div class="filter-actions">
           <button id="applyFilters" class="primary">Apply Filters</button>
           <button id="clearFilters">Clear</button>
         </div>
       </div>
     `;
   }
   ```

2. **ActionButtonsSection + View**
   ```typescript
   // ActionButtonsSection.ts
   export class ActionButtonsSection implements ISection {
     readonly position = SectionPosition.Footer;

     constructor(private config: ActionButtonsConfig) {}

     render(data: SectionRenderData): string {
       return renderActionButtons(this.config.buttons);
     }
   }

   // actionButtonsView.ts
   export function renderActionButtons(buttons: ButtonConfig[]): string {
     return `
       <div class="action-buttons">
         ${buttons.map(btn => renderButton(btn)).join('')}
       </div>
     `;
   }
   ```

3. **DetailPanelSection + View**
   ```typescript
   // DetailPanelSection.ts
   export class DetailPanelSection implements ISection {
     readonly position = SectionPosition.Detail;

     constructor(private config: DetailPanelConfig) {}

     render(data: SectionRenderData): string {
       return renderDetailPanel(this.config, data.detailData);
     }
   }

   // detailPanelView.ts
   export function renderDetailPanel(
     config: DetailPanelConfig,
     detailData: unknown
   ): string {
     if (!detailData) {
       return ''; // Hidden by default
     }

     return `
       <div class="detail-panel">
         <div class="detail-header">
           <h2>Details</h2>
           <button id="closeDetail">Close</button>
         </div>
         <div class="detail-content">
           ${renderDetailContent(detailData, config)}
         </div>
       </div>
     `;
   }
   ```

**File Structure:**
```
src/shared/infrastructure/ui/
├── sections/
│   ├── ISection.ts
│   ├── DataTableSection.ts
│   ├── FilterControlsSection.ts         # NEW
│   ├── ActionButtonsSection.ts          # NEW
│   └── DetailPanelSection.ts            # NEW
└── views/
    ├── dataTableView.ts
    ├── filterControlsView.ts            # NEW
    ├── actionButtonsView.ts             # NEW
    ├── detailPanelView.ts               # NEW
    └── htmlHelpers.ts
```

**Testing:**
- Unit test each section with various configs
- Unit test each view function's HTML output
- Test with edge cases (empty data, missing config)
- Test coverage: 90% for all sections and views

**Result:** CORE SECTIONS COMPLETE ✅

**Complexity:** Moderate

---

### Slice 7: "Extract TreeViewSection + Migrate PersistenceInspectorPanel"
**Builds on:** Slice 6

**Goal:** Validate framework supports non-table UI (tree views).

**Note on Complexity:** PersistenceInspectorPanel has complex stateful tree interactions. This migration proves framework flexibility but may be deferred if too complex.

**Infrastructure (Shared):**
```typescript
// TreeViewSection.ts
export class TreeViewSection implements ISection {
  readonly position = SectionPosition.Main;

  constructor(private config: TreeViewConfig) {}

  render(data: SectionRenderData): string {
    const treeData = data.customData?.treeData as TreeNode[] || [];
    return renderTreeView(treeData, this.config);
  }
}

// treeViewView.ts
export function renderTreeView(nodes: TreeNode[], config: TreeViewConfig): string {
  return `
    <div class="tree-view">
      ${renderTreeNodes(nodes, 0, config)}
    </div>
  `;
}

function renderTreeNodes(nodes: TreeNode[], depth: number, config: TreeViewConfig): string {
  return nodes.map(node => `
    <div class="tree-node" style="padding-left: ${depth * 20}px" data-node-id="${node.id}">
      ${node.children ? `<span class="tree-icon expandable">▶</span>` : ''}
      <span class="tree-label">${escapeHtml(node.label)}</span>
      ${node.actions ? renderNodeActions(node.actions) : ''}
    </div>
    ${node.children && node.expanded ? renderTreeNodes(node.children, depth + 1, config) : ''}
  `).join('');
}
```

**Presentation (Persistence Inspector Feature):**
```typescript
// Simplified - may keep Direct Implementation if tree state management too complex
const sections = [
  new TreeViewSection({
    expandable: true,
    selectable: false
  })
];

this.coordinator = new PanelCoordinator({
  panel,
  extensionUri,
  behaviors: [
    // NO EnvironmentBehavior (debug tool)
    // NO DataBehavior (custom data loading)
    new SectionCompositionBehavior(sections, PanelLayout.SingleColumn),
    new MessageRoutingBehavior()
  ],
  logger
});
```

**Risk Mitigation:** If tree state management proves too complex, defer this migration and keep PersistenceInspectorPanel as Direct Implementation. Framework is already validated with tables (Slice 4-5).

**Testing:**
- Tree view renders correctly
- Expand/collapse works
- Actions per node work
- Test coverage: 90% for TreeViewSection and view

**Result:** TREE VIEW SECTION WORKING ✅ (Framework supports non-table UI)

**Complexity:** Moderate (HIGH RISK - may defer)

---

### Slice 8A: "Implement Plugin Trace Viewer (Single Column, No Detail Panel)"
**Builds on:** Slice 6

**Goal:** Implement Plugin Trace Viewer WITHOUT detail panel to reduce complexity. Validates custom sections.

**Presentation (Plugin Trace Viewer Feature):**

**Custom Sections:**
```typescript
// TraceLevelControlsSection.ts
export class TraceLevelControlsSection implements ISection {
  readonly position = SectionPosition.Header;

  constructor(
    private getTraceLevelUseCase: GetTraceLevelUseCase,
    private setTraceLevelUseCase: SetTraceLevelUseCase,
    private logger: ILogger
  ) {}

  render(data: SectionRenderData): string {
    // Use type guard instead of type assertion (Recommendation #1)
    const currentLevel = isTraceLevel(data.customData?.traceLevel)
      ? data.customData.traceLevel
      : 'Off';
    return renderTraceLevelControls(currentLevel);
  }
}

// traceLevelControlsView.ts
export function renderTraceLevelControls(currentLevel: string): string {
  return `
    <div class="trace-level-controls">
      <span>Current Trace Level: <strong>${escapeHtml(currentLevel)}</strong></span>
      <button id="${createButtonId('changeTraceLevel')}">Change Level</button>
    </div>
  `;
}
```

**Panel Setup:**
```typescript
// Define panel commands (Command Registry Pattern)
type PluginTracePanelCommands =
  | 'refresh'
  | 'deleteSelected'
  | 'deleteAll'
  | 'exportCsv'
  | 'changeTraceLevel';

const sections = [
  new TraceLevelControlsSection(getTraceLevelUseCase, setTraceLevelUseCase, logger),
  new FilterControlsSection({
    filters: [
      { id: 'pluginName', type: 'text', label: 'Plugin Name' },
      { id: 'entityName', type: 'text', label: 'Entity Name' },
      { id: 'status', type: 'select', label: 'Status', options: ['All', 'Success', 'Exception'] }
    ]
  }),
  new DataTableSection({
    columns: [
      { id: 'status', label: 'Status' },
      { id: 'createdOn', label: 'Created On' },
      { id: 'pluginName', label: 'Plugin Name' },
      { id: 'entityName', label: 'Entity' },
      { id: 'messageName', label: 'Message' },
      { id: 'mode', label: 'Mode' },
      { id: 'duration', label: 'Duration' }
    ]
  }),
  new ActionButtonsSection({
    buttons: [
      { id: createButtonId('refresh'), label: 'Refresh' },
      { id: createButtonId('deleteSelected'), label: 'Delete Selected' },
      { id: createButtonId('deleteAll'), label: 'Delete All' },
      { id: createButtonId('exportCsv'), label: 'Export CSV' }
    ]
  })
];

this.coordinator = new PanelCoordinator<PluginTracePanelCommands>({
  panel,
  extensionUri,
  behaviors: [
    new EnvironmentBehavior(environmentService),
    new DataBehavior(pluginTracesDataLoader),
    new SectionCompositionBehavior(sections, PanelLayout.SingleColumn),
    new MessageRoutingBehavior()
  ],
  logger
});

// Register handlers (type-safe commands)
this.coordinator.registerHandler('changeTraceLevel', async () => { /* ... */ });
this.coordinator.registerHandler('refresh', async () => { /* ... */ });
this.coordinator.registerHandler('deleteSelected', async () => { /* ... */ });
// ... other handlers
```

**Testing:**
- Plugin Trace Viewer opens
- Trace level controls work
- Filter controls work
- Data table populates
- All action buttons work
- Test coverage targets:
  - TraceLevelControlsSection: 90% coverage
  - renderTraceLevelControls view: 90% coverage
  - Panel coordinator integration: 85% coverage

**Result:** PLUGIN TRACE VIEWER (SIMPLE VERSION) COMPLETE ✅

**Complexity:** Moderate

---

### Slice 8B: "Add Detail Panel + Split View to Plugin Trace Viewer"
**Builds on:** Slice 8A

**Goal:** Add detail panel with split view layout. Completes Plugin Trace Viewer feature.

**Presentation (Plugin Trace Viewer Feature):**

**Custom Section:**
```typescript
// TraceDetailPanelSection.ts
export class TraceDetailPanelSection implements ISection {
  readonly position = SectionPosition.Detail;

  constructor(private config: TraceDetailPanelConfig) {}

  render(data: SectionRenderData): string {
    const detailData = data.detailData as PluginTraceDetailViewModel | undefined;
    return renderTraceDetailPanel(detailData, this.config);
  }
}

// traceDetailPanelView.ts
export function renderTraceDetailPanel(
  traceDetail: PluginTraceDetailViewModel | undefined,
  config: TraceDetailPanelConfig
): string {
  if (!traceDetail) {
    return ''; // Hidden when no selection
  }

  return `
    <div class="trace-detail-panel">
      <div class="detail-header">
        <h2>${escapeHtml(traceDetail.pluginName)}</h2>
        <span class="status-badge ${traceDetail.status}">${traceDetail.status}</span>
        <button id="closeDetail">Close</button>
      </div>

      <div class="tabs">
        ${config.tabs.map((tab, idx) => `
          <button class="tab ${idx === 0 ? 'active' : ''}" data-tab="${tab}">${tab}</button>
        `).join('')}
      </div>

      <div class="tab-content">
        ${renderTabContent(traceDetail, config.tabs[0])}
      </div>
    </div>
  `;
}
```

**Panel Update:**
```typescript
// Add detail section
const detailSection = new TraceDetailPanelSection({
  tabs: ['Overview', 'Exception', 'Configuration', 'Message Block']
});

const sections = [
  traceLevelSection,
  filterSection,
  tableSection,
  detailSection,        // NEW
  actionSection
];

// Change layout to split horizontal
this.coordinator = new PanelCoordinator({
  panel,
  extensionUri,
  behaviors: [
    new EnvironmentBehavior(environmentService),
    new DataBehavior(pluginTracesDataLoader),
    new SectionCompositionBehavior(sections, PanelLayout.SplitHorizontal),  // Changed
    new MessageRoutingBehavior()
  ],
  logger
});

// Add row selection handler
this.coordinator.registerHandler('rowSelected', async (payload: { id: string }) => {
  const trace = await getPluginTraceDetailUseCase.execute(environmentId, payload.id);
  this.currentDetailData = viewModelMapper.toDetailViewModel(trace);
  await this.render(); // Re-render with detail data
  await this.panel.webview.postMessage({ command: 'showDetailSection' });
});

this.coordinator.registerHandler('closeDetail', async () => {
  this.currentDetailData = null;
  await this.render();
  await this.panel.webview.postMessage({ command: 'hideDetailSection' });
});
```

**Testing:**
- Click row → detail panel shows
- Split view layout works
- Tabs in detail panel work
- Close button hides detail panel
- Detail content renders correctly
- Test coverage targets:
  - TraceDetailPanelSection: 90% coverage
  - renderTraceDetailPanel view: 90% coverage
  - Panel coordinator integration: 85% coverage
  - Split view layout: 85% coverage

**Result:** PLUGIN TRACE VIEWER (COMPLETE) ✅

**Complexity:** Moderate

---

### Slice 9: "Implement Remaining Panels (WebResource, PluginAssembly, Component)"
**Builds on:** Slice 8A

**Goal:** Implement 3 unimplemented panels using sections from start.

**Presentation (All 3 Features):**
- All use similar structure: DataTableSection + ActionButtonsSection
- All include EnvironmentBehavior
- All use DataBehavior with feature-specific DataLoader
- Simple single-column layout

**Testing:**
- Each panel opens correctly
- Environment dropdown works
- Data loads and displays
- Actions work
- Test coverage: 85% for each panel coordinator

**Result:** ALL PANELS IMPLEMENTED WITH FRAMEWORK ✅

**Complexity:** Simple

---

### Slice 10: "Documentation + Deprecation Cleanup"
**Builds on:** Slice 9

**Goal:** Complete documentation, deprecate old coordinator, remove technical debt.

**Documentation:**
- ✅ Update `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` (already done)
- ✅ Update `CLAUDE.md` rule #22 (already done)
- ✅ Update `docs/TECHNICAL_DEBT.md` (already done)
- Create migration guide: `docs/MIGRATION_GUIDE_PANEL_FRAMEWORK.md`
- Add JSDoc to all sections, views, and coordinator

**Deprecation:**
- Add `@deprecated` JSDoc to `DataTablePanelCoordinator`
  ```typescript
  /**
   * @deprecated Use PanelCoordinator instead. This will be removed in v2.0.
   * See docs/MIGRATION_GUIDE_PANEL_FRAMEWORK.md for migration instructions.
   */
  export class DataTablePanelCoordinator { }
  ```
- Add deprecation notice in constructor (logged once)
- Update all existing panels to use `PanelCoordinator` (automated refactor)

**Cleanup:**
- Remove hard-coded button event listeners from old base template (now unused)
- Archive old base template (keep for reference, not used by new coordinator)
- Remove `HtmlRenderingBehavior` (replaced by SectionCompositionBehavior)

**Testing:**
- Final `npm run compile` - should succeed
- Final `npm test` - all tests should pass (ALL coverage targets met)
- All 7 panels tested manually - should work correctly
- Performance testing - no degradation

**Result:** FRAMEWORK COMPLETE + DOCUMENTED + CLEAN ✅

**Complexity:** Simple

---

## Total Effort Estimate

| Slice | Complexity |
|-------|-----------|
| 1. Implement PanelCoordinator (New) | Moderate |
| 2. Section Interface + View Extraction | Moderate |
| 3. SectionCompositionBehavior + Layouts | Moderate |
| 4. Migrate SolutionPanel (Simple) | Simple |
| 5. Migrate EnvironmentSetupPanel (No Env) | Simple |
| 6. Core Shared Sections + Views | Moderate |
| 7. TreeViewSection + PersistenceInspector | Moderate (HIGH RISK) |
| 8A. Plugin Trace Viewer (Single Column) | Moderate |
| 8B. Plugin Trace Viewer (Detail + Split) | Moderate |
| 9. Remaining Panels (3 panels) | Simple |
| 10. Documentation + Cleanup | Simple |
| **TOTAL** | **Moderate** |

**Note:** Time estimates removed per CLAUDE.md Rule #15. Use complexity labels to assess effort.

**Phased Delivery:**
- **Phase 1:** Slices 1-3 (Framework Foundation) - **MVP WORKING**
- **Phase 2:** Slices 4-6 (Core Sections + Simple Migrations) - **PROVEN WITH REAL PANELS**
- **Phase 3:** Slices 7-10 (Complex Migrations + Completion) - **ALL PANELS COMPLETE**

**Risk Mitigation:** Slice 7 (PersistenceInspector) may be deferred if tree state complexity too high. Framework is already validated without it.

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
│ - Registers message handlers by button ID                  │
│ - NO HTML generation (delegated to sections/views)         │
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
│ Sections (UI Components - Stateless)                        │
│ - ISection: interface { position, render(data) }           │
│ - DataTableSection: Delegates to renderDataTable()         │
│ - TreeViewSection: Delegates to renderTreeView()           │
│ - FilterControlsSection: Delegates to renderFilterControls()│
│ - ActionButtonsSection: Delegates to renderActionButtons() │
│ - DetailPanelSection: Delegates to renderDetailPanel()     │
│                                                              │
│ Views (HTML Generation - Pure Functions)                    │
│ - renderDataTable(): Generate table HTML                   │
│ - renderTreeView(): Generate tree HTML                     │
│ - renderFilterControls(): Generate filter controls HTML    │
│ - renderActionButtons(): Generate buttons HTML             │
│ - renderDetailPanel(): Generate detail pane HTML           │
│ - All in separate .ts files (CLAUDE.md Rule #10)           │
└─────────────────────────────────────────────────────────────┘
                          ↓ uses ↓
┌─────────────────────────────────────────────────────────────┐
│ Feature-Specific (Custom Sections + Views)                  │
├─────────────────────────────────────────────────────────────┤
│ TraceLevelControlsSection → renderTraceLevelControls()     │
│ TraceDetailPanelSection → renderTraceDetailPanel()         │
│ [Future custom sections as needed]                          │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction

✅ **CORRECT:**
- Panels → PanelCoordinator (shared infrastructure)
- PanelCoordinator → Behaviors (composition)
- PanelCoordinator → Sections (composition)
- Sections → Views (delegation)
- Sections → ISection interface (abstraction)
- Views → HTML helpers (pure functions)
- Feature sections → Shared section interfaces (abstraction)

❌ **NEVER:**
- Shared sections → Feature code
- Framework → Feature code
- Views → Sections (views are pure functions, no dependencies)
- Sections → Behaviors (sections are stateless)

### Behavior vs Section: What's the Difference?

**Behaviors:** Orchestrate panel lifecycle and cross-cutting concerns.
- Examples: EnvironmentBehavior, DataBehavior, MessageRoutingBehavior, SectionCompositionBehavior
- Lifecycle: `initialize()`, `dispose()`, event subscriptions
- Stateful (hold references, manage subscriptions, coordinate actions)
- Implement `IPanelBehavior` interface

**Sections:** Render UI components.
- Examples: DataTableSection, TreeViewSection, FilterControlsSection, custom sections
- Lifecycle: `render(data)` only (called each re-render)
- Stateless (pure functions that transform data → HTML)
- Implement `ISection` interface

**Views:** Generate HTML.
- Examples: renderDataTable(), renderTreeView(), renderFilterControls()
- Pure functions: `(data, config) => HTML string`
- Zero dependencies (just htmlHelpers for escaping)
- Located in `presentation/views/` (CLAUDE.md Rule #10)

**Relationship:**
- Sections use views (delegation)
- Behaviors use sections (composition)
- SectionCompositionBehavior composes sections into layouts
- Sections are used BY behaviors, not the other way around

**Why separate Sections from Behaviors?**
- Behaviors manage state and lifecycle, sections render views
- Sections are easier to test (pure functions via views)
- Sections are reusable across features (behaviors are feature-specific)
- Sections can be composed dynamically (behaviors are fixed per panel)

**Why separate Sections from Views?**
- Sections coordinate (which view to call, with what data)
- Views generate HTML (pure functions, testable in isolation)
- CLAUDE.md Rule #10: HTML must be in separate view files

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
  readonly position: SectionPosition;  // Required - where to inject in layout
  render(data: SectionRenderData): string;
}
```

#### SectionRenderData
```typescript
// src/shared/infrastructure/ui/types/SectionRenderData.ts

/**
 * Data passed to sections during rendering.
 *
 * NOTE: This is a union type with optional fields for all section types.
 * Trade-off: Couples sections via shared contract, but pragmatic for <10 section types.
 * If section types exceed 10, refactor to discriminated union.
 *
 * Optional discriminant added for future type narrowing (zero-cost now).
 */
export interface SectionRenderData {
  // Optional discriminant for type narrowing (Recommendation #3)
  sectionType?: 'table' | 'tree' | 'detail' | 'filter' | 'custom';

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
  // Escape hatch for unique section needs
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
  ThreePanel = 'three-panel'  // Future - for Metadata Browser
}
```

#### Branded Types
```typescript
// src/shared/infrastructure/ui/types/BrandedTypes.ts

/**
 * Branded type for button IDs to prevent typos at compile time.
 * Recommendation #2: Type-safe button ID references.
 */
export type ButtonId = string & { readonly __brand: 'ButtonId' };

export function createButtonId(id: string): ButtonId {
  return id as ButtonId;
}
```

#### Section Configs

```typescript
// DataTableSection
export interface DataTableColumn {
  readonly id: string;
  readonly label: string;
  readonly width?: string;
}

export interface DataTableConfig {
  readonly columns: ReadonlyArray<DataTableColumn>;  // Recommendation #5
  readonly selectable?: boolean;
  readonly emptyMessage?: string;
}

// FilterControlsSection
export interface FilterConfig {
  readonly id: string;
  readonly type: 'text' | 'select' | 'date';
  readonly label: string;
  readonly options?: ReadonlyArray<string>;  // Recommendation #5
  readonly placeholder?: string;
}

export interface FilterControlsConfig {
  readonly filters: ReadonlyArray<FilterConfig>;  // Recommendation #5
}

// ActionButtonsSection
export interface ButtonConfig {
  readonly id: ButtonId;  // Recommendation #2: Branded type
  readonly label: string;
  readonly icon?: string;
  readonly variant?: 'default' | 'primary' | 'danger';
}

export interface ActionButtonsConfig {
  readonly buttons: ReadonlyArray<ButtonConfig>;  // Recommendation #5
}

// TreeViewSection
export interface TreeNode {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly expanded?: boolean;
  readonly children?: ReadonlyArray<TreeNode>;  // Recommendation #5
  readonly actions?: ReadonlyArray<NodeAction>;  // Recommendation #5
}

export interface NodeAction {
  readonly id: ButtonId;  // Recommendation #2: Branded type
  readonly label: string;
  readonly icon?: string;
}

export interface TreeViewConfig {
  readonly expandable?: boolean;
  readonly selectable?: boolean;
  readonly icons?: boolean;
}
```

#### PanelCoordinatorConfig
```typescript
// src/shared/infrastructure/ui/coordinators/PanelCoordinator.ts

export interface PanelCoordinatorConfig<TCommands extends string = string> {
  panel: vscode.WebviewPanel;
  extensionUri: vscode.Uri;
  behaviors: IPanelBehavior[];  // SectionCompositionBehavior contains sections + layout
  logger: ILogger;
}
```

#### WebviewMessage Type Guard
```typescript
// src/shared/infrastructure/ui/types/WebviewMessage.ts

/**
 * Message received from webview.
 * Recommendation #6: Type guard for runtime validation.
 */
export interface WebviewMessage {
  readonly command: string;
  readonly payload?: unknown;
}

export function isWebviewMessage(value: unknown): value is WebviewMessage {
  return typeof value === 'object' &&
         value !== null &&
         'command' in value &&
         typeof (value as { command: unknown }).command === 'string';
}
```

#### Type Guards for CustomData
```typescript
// src/shared/infrastructure/ui/types/TypeGuards.ts

/**
 * Type guards for SectionRenderData.customData access.
 * Recommendation #1: Eliminates type assertions, provides runtime validation.
 */

export function isTreeNodeArray(value: unknown): value is TreeNode[] {
  return Array.isArray(value) &&
    value.every(node => typeof node === 'object' &&
                        node !== null &&
                        'id' in node &&
                        'label' in node);
}

export function isTraceLevel(value: unknown): value is string {
  return typeof value === 'string' &&
    ['Off', 'Exception', 'All'].includes(value);
}

export function isPluginTraceDetailViewModel(value: unknown): value is PluginTraceDetailViewModel {
  return typeof value === 'object' &&
         value !== null &&
         'id' in value &&
         'pluginName' in value;
}
```

### Coordinator Methods

```typescript
export class PanelCoordinator<TCommands extends string = string> implements IPanelCoordinator<TCommands> {
  constructor(config: PanelCoordinatorConfig<TCommands>);

  // Lifecycle
  public async initialize(): Promise<void>;
  public reveal(): void;
  public dispose(): void;

  // State management
  public async handleDataLoaded(data: unknown[]): Promise<void>;
  public async handleFilterChanged(filters: Record<string, unknown>): Promise<void>;
  public async handleRowSelected(id: string): Promise<void>;

  // Message handling (Command Registry Pattern)
  public registerHandler<T extends TCommands>(
    command: T,
    handler: (payload?: unknown) => Promise<void>
  ): void;

  public async handleMessage(message: WebviewMessage): Promise<void>;

  // Rendering (private)
  private async render(): Promise<void>;
  private getRenderData(): SectionRenderData;
}
```

---

## File Structure

### After Refactor

```
src/shared/infrastructure/ui/
├── coordinators/
│   ├── PanelCoordinator.ts                      # NEW (universal coordinator)
│   ├── IPanelCoordinator.ts                     # NEW
│   ├── DataTablePanelCoordinator.ts             # DEPRECATED (kept for backwards compat)
│   └── IDataTablePanelCoordinator.ts            # DEPRECATED
├── behaviors/
│   ├── IPanelBehavior.ts
│   ├── SectionCompositionBehavior.ts            # NEW (replaces HtmlRenderingBehavior)
│   ├── MessageRoutingBehavior.ts
│   ├── EnvironmentBehavior.ts                   # OPTIONAL
│   ├── DataBehavior.ts                          # OPTIONAL
│   ├── SolutionFilterBehavior.ts                # OPTIONAL
│   ├── HtmlRenderingBehavior.ts                 # DEPRECATED (old template-based)
│   └── ...
├── sections/
│   ├── ISection.ts                              # NEW
│   ├── DataTableSection.ts                      # NEW
│   ├── TreeViewSection.ts                       # NEW
│   ├── FilterControlsSection.ts                 # NEW
│   ├── ActionButtonsSection.ts                  # NEW
│   ├── DetailPanelSection.ts                    # NEW
│   └── EmptyStateSection.ts                     # NEW
├── views/                                        # NEW (CLAUDE.md Rule #10)
│   ├── dataTableView.ts                         # NEW (HTML generation)
│   ├── treeViewView.ts                          # NEW (HTML generation)
│   ├── filterControlsView.ts                    # NEW (HTML generation)
│   ├── actionButtonsView.ts                     # NEW (HTML generation)
│   ├── detailPanelView.ts                       # NEW (HTML generation)
│   ├── htmlHelpers.ts                           # NEW (escapeHtml, etc.)
│   └── dataTable.ts                             # OLD (archived for reference)
└── types/
    ├── SectionRenderData.ts                     # NEW
    ├── PanelLayout.ts                           # NEW
    └── WebviewMessage.ts

src/features/pluginTraceViewer/presentation/
├── panels/
│   └── PluginTraceViewerPanel.ts                # MIGRATED (uses PanelCoordinator)
├── sections/
│   ├── TraceLevelControlsSection.ts             # NEW (custom)
│   └── TraceDetailPanelSection.ts               # NEW (custom)
├── views/
│   ├── traceLevelControlsView.ts                # NEW (HTML generation)
│   └── traceDetailPanelView.ts                  # NEW (HTML generation)
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

docs/
├── design/
│   └── UNIVERSAL_PANEL_FRAMEWORK_DESIGN.md      # This document
└── MIGRATION_GUIDE_PANEL_FRAMEWORK.md           # NEW (migration instructions)
```

---

## Key Decisions

### Decision 1: New Implementation vs Rename
**Decision:** Implement `PanelCoordinator` (new) alongside `DataTablePanelCoordinator` (deprecated).

**Rationale:**
- True backwards compatibility - existing panels continue working unchanged
- Different constructor signatures prevent simple rename
- Gradual migration reduces risk

**Trade-off:**
- Temporary duplication (both coordinators exist during migration)
- Must maintain two coordinators briefly
- After migration complete, deprecate and eventually remove old coordinator

**Alternative Considered:** Rename with constructor overloading
**Why Rejected:** Overloading complex, error-prone. Clean separation is clearer.

---

### Decision 2: HTML in Sections vs Separate Views
**Decision:** Sections delegate to view functions in separate files (CLAUDE.md Rule #10 compliance).

**Rationale:**
- CLAUDE.md Rule #10: "HTML in panel .ts files - Extract all HTML to separate view files"
- Separates rendering logic (views) from composition logic (sections)
- Views are pure functions, easier to test in isolation
- Consistent with existing pattern (see `dataTable.ts` view file)

**Trade-off:**
- More files (each section has corresponding view file)
- Extra indirection (section calls view function)
- But: Clearer separation of concerns, better testability

**Implementation:**
```typescript
// Section (composition logic)
export class DataTableSection implements ISection {
  render(data: SectionRenderData): string {
    return renderDataTable(data.tableData || [], this.config);  // Delegates
  }
}

// View (HTML generation)
export function renderDataTable(
  data: Record<string, unknown>[],
  config: DataTableConfig
): string {
  // ALL HTML HERE
}
```

---

### Decision 3: SectionRenderData as Union Type
**Decision:** Use shared data contract with optional fields + `customData` escape hatch.

**Rationale:**
- Pragmatic for MVP - easy for sections to access data
- Avoids complex discriminated unions early
- Escape hatch (`customData`) allows custom sections without modifying contract

**Trade-off:**
- Couples sections via shared contract (violates Open/Closed Principle)
- Adding new section type may require modifying `SectionRenderData`
- Acceptable for <10 section types

**Future Consideration:**
If section types exceed 10, refactor to discriminated union:
```typescript
export type SectionRenderData =
  | { type: 'table'; tableData: Record<string, unknown>[]; isLoading?: boolean }
  | { type: 'tree'; treeData: TreeNode[]; isLoading?: boolean }
  | { type: 'detail'; detailData: unknown; isLoading?: boolean };
```

**YAGNI:** Keep simple for now, refactor if needed.

---

### Decision 4: Stateless Sections + Panel Registers Handlers
**Decision:** Sections are pure render functions. Panel registers message handlers by button ID.

**Rationale:**
- Simpler testing (sections are pure functions)
- Clear separation (rendering vs logic)
- Sections don't know about webview messages (lower coupling)

**Trade-off:**
- Panel must know button IDs (convention: button id = message command)
- If button ID changes, must update both section config and handler registration
- Acceptable - IDs are defined in same config object

**Implementation:**
```typescript
// Section config defines IDs
const actionSection = new ActionButtonsSection({
  buttons: [
    { id: 'refresh', label: 'Refresh' },
    { id: 'delete', label: 'Delete' }
  ]
});

// Panel registers handlers for those IDs
coordinator.registerHandler('refresh', async () => { /* ... */ });
coordinator.registerHandler('delete', async () => { /* ... */ });
```

**Alternative Considered:** Sections register handlers
**Why Rejected:** Makes sections stateful, harder to test, tighter coupling.

---

### Decision 5: Migration Risk Order
**Decision:** Migrate simple panels first (Solution, EnvironmentSetup), complex panels last (PluginTraceViewer).

**Rationale:**
- Build confidence with simple panels before tackling high-risk migrations
- Validate framework incrementally, not all at once
- If complex migration fails, simple panels already migrated

**Trade-off:**
- Framework not fully validated until complex panels complete
- But: Risk mitigation more important than speed

**Migration Order:**
1. SolutionPanel (simple - table + filter)
2. EnvironmentSetupPanel (simple - no environment behavior)
3. WebResource, PluginAssembly, Component (simple - similar to Solution)
4. PersistenceInspectorPanel (moderate - tree view, may defer)
5. PluginTraceViewer (complex - custom sections + split view)

---

### Decision 6: PersistenceInspectorPanel May Stay Direct Implementation
**Decision:** Attempt migration to TreeViewSection, but defer if tree state complexity too high.

**Rationale:**
- Framework already validated with tables (Solution, EnvironmentSetup)
- TreeViewSection proves framework supports non-table UI
- BUT: PersistenceInspectorPanel has complex stateful interactions (expand/collapse, reveal secrets)
- Forcing migration may be more complex than beneficial

**Acceptance Criteria for Migration:**
- Tree state (expanded/collapsed nodes) manageable via `customData`
- "Reveal Secret" per-node actions work cleanly
- "Clear Entry" action integrates well with tree selection
- Total complexity ≤ Direct Implementation complexity

**If Migration Too Complex:**
- Keep PersistenceInspectorPanel as Direct Implementation
- Extract `TreeViewSection` for future panels (Metadata Browser, etc.)
- Framework is already proven without this migration

---

### Decision 7: Replace HtmlRenderingBehavior, Not Extend It
**Decision:** `SectionCompositionBehavior` is a NEW behavior that replaces `HtmlRenderingBehavior`.

**Rationale:**
- HtmlRenderingBehavior uses fixed base template (template-based)
- SectionCompositionBehavior composes sections (component-based)
- Fundamental architectural difference - not an extension

**Trade-off:**
- Cannot reuse HtmlRenderingBehavior code
- Must implement layout templates from scratch
- But: Clean separation, no legacy template constraints

**Implementation:**
- Old: `HtmlRenderingBehavior` used by `DataTablePanelCoordinator`
- New: `SectionCompositionBehavior` used by `PanelCoordinator`
- After migration: Deprecate and remove `HtmlRenderingBehavior`

---

## Clean Architecture Compliance

### ✅ Layer Separation

**Shared Infrastructure:**
- ✅ PanelCoordinator orchestrates (NO business logic)
- ✅ Behaviors handle cross-cutting concerns (environment, data loading, message routing, composition)
- ✅ Sections coordinate rendering (stateless, NO HTML in .ts files)
- ✅ Views generate HTML (pure functions in separate files, CLAUDE.md Rule #10)
- ✅ No dependencies on feature code

**Feature Presentation:**
- ✅ Panels create coordinator with feature-specific config
- ✅ Custom sections in feature layer (if not reusable)
- ✅ Custom views in feature layer (HTML generation)
- ✅ NO business logic (delegates to use cases)
- ✅ NO HTML in .ts files (delegated to views)

**Dependency Direction:**
- ✅ Panels → PanelCoordinator (shared infrastructure)
- ✅ PanelCoordinator → Behaviors (composition)
- ✅ Behaviors → Sections (composition)
- ✅ Sections → Views (delegation)
- ✅ Views → HTML helpers (pure functions)
- ✅ All dependencies point inward or sideways (never outward to features)

### ✅ SOLID Principles

**Single Responsibility:**
- ✅ PanelCoordinator: Orchestrates panel lifecycle
- ✅ SectionCompositionBehavior: Composes sections into layouts
- ✅ MessageRoutingBehavior: Routes webview messages
- ✅ EnvironmentBehavior: Manages environment dropdown
- ✅ DataBehavior: Loads data via IDataLoader
- ✅ Each section: Coordinates rendering for one UI component
- ✅ Each view: Generates HTML for one UI component

**Open/Closed:**
- ✅ Framework open for extension (new sections, new behaviors, new layouts)
- ✅ Framework closed for modification (don't edit PanelCoordinator to add features)

**Liskov Substitution:**
- ✅ All sections implement ISection (interchangeable)
- ✅ All behaviors implement IPanelBehavior (interchangeable)

**Interface Segregation:**
- ✅ ISection is minimal (position + render only)
- ✅ Sections don't depend on unused methods
- ✅ Views are pure functions (no interface needed)

**Dependency Inversion:**
- ✅ PanelCoordinator depends on ISection (abstraction), not concrete sections
- ✅ PanelCoordinator depends on IPanelBehavior (abstraction), not concrete behaviors
- ✅ Sections can be mocked in tests
- ✅ Behaviors can be mocked in tests

---

## Testing Strategy

### Unit Tests

**Sections (Isolated - 90% coverage target):**
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
```

**Views (Isolated - 90% coverage target):**
```typescript
describe('renderDataTable', () => {
  it('should generate table HTML with columns', () => {
    const html = renderDataTable(
      [{ name: 'Foo', value: 'Bar' }],
      { columns: [{ id: 'name', label: 'Name' }, { id: 'value', label: 'Value' }] }
    );

    expect(html).toContain('<table');
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<td>Foo</td>');
  });

  it('should escape HTML in data', () => {
    const html = renderDataTable(
      [{ name: '<script>alert("xss")</script>' }],
      { columns: [{ id: 'name', label: 'Name' }] }
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
```

**Behaviors (Isolated - 80% coverage target):**
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
    expect(html).toContain('main-section');
    expect(html).toContain('footer-section');
  });

  it('should inject sections at correct positions', () => {
    const tableSection = new DataTableSection({ columns: [] });
    const actionSection = new ActionButtonsSection({ buttons: [{ id: 'test', label: 'Test' }] });

    const behavior = new SectionCompositionBehavior([tableSection, actionSection], PanelLayout.SingleColumn);
    const html = behavior.compose({ tableData: [] });

    // Table in main section
    expect(html.indexOf('<table')).toBeLessThan(html.indexOf('footer-section'));

    // Actions in footer section
    expect(html.indexOf('footer-section')).toBeLessThan(html.indexOf('test'));
  });
});
```

### Integration Tests

**PanelCoordinator (85% coverage target):**
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
        new SectionCompositionBehavior(sections, PanelLayout.SingleColumn)
      ],
      logger: mockLogger
    });

    await coordinator.initialize();

    expect(mockPanel.webview.html).toContain('<table');
  });

  it('should re-render on data change', async () => {
    const coordinator = createTestCoordinator();

    await coordinator.handleDataLoaded([{ name: 'Test' }]);

    expect(coordinator.panel.webview.html).toContain('Test');
  });
});
```

### Manual Testing

**All 7 Panels (Complete walkthrough):**
- [ ] EnvironmentSetupPanel opens and works (no environment dropdown)
- [ ] PersistenceInspectorPanel opens and shows tree view
- [ ] SolutionPanel opens with environment dropdown and filter
- [ ] PluginTraceViewerPanel opens with all sections (trace level, filters, table, detail, actions)
- [ ] PluginTraceViewerPanel detail panel shows/hides correctly
- [ ] PluginTraceViewerPanel split view layout works
- [ ] WebResourcePanel opens (when implemented)
- [ ] PluginAssemblyPanel opens (when implemented)
- [ ] ComponentPanel opens (when implemented)

**Coverage Validation:**
- [ ] Run `npm test -- --coverage`
- [ ] Verify sections ≥90% coverage
- [ ] Verify views ≥90% coverage
- [ ] Verify coordinator ≥85% coverage
- [ ] Verify behaviors ≥80% coverage

---

## Migration Checklist

### Phase 1: Framework Foundation
- [ ] Implement `PanelCoordinator.ts` (new file, different from DataTablePanelCoordinator)
- [ ] Implement `IPanelCoordinator.ts` interface
- [ ] Keep `DataTablePanelCoordinator.ts` unchanged (deprecated)
- [ ] Define `ISection` interface with `position` property
- [ ] Implement `DataTableSection` (delegates to view)
- [ ] Create `renderDataTable()` view function (HTML generation)
- [ ] Implement `SectionCompositionBehavior`
- [ ] Test section composition with sample data
- [ ] Run `npm run compile` - should succeed
- [ ] Run `npm test` - should pass
- [ ] Coverage: Sections 90%, Views 90%, Coordinator 85%

### Phase 2: Core Sections + Simple Migrations
- [ ] Implement `FilterControlsSection` + view
- [ ] Implement `ActionButtonsSection` + view
- [ ] Implement `DetailPanelSection` + view
- [ ] Unit test all sections and views (90% coverage)
- [ ] Migrate SolutionPanel to PanelCoordinator
- [ ] Test SolutionPanel works correctly
- [ ] Migrate EnvironmentSetupPanel (no EnvironmentBehavior)
- [ ] Test EnvironmentSetupPanel works correctly
- [ ] Coverage: All targets met

### Phase 3: Complex Migrations + Completion
- [ ] Extract `TreeViewSection` + view
- [ ] Attempt PersistenceInspectorPanel migration
- [ ] If too complex, defer and keep Direct Implementation
- [ ] Test TreeViewSection works (if migrated)
- [ ] Implement TraceLevelControlsSection + view (custom)
- [ ] Implement Plugin Trace Viewer (single column)
- [ ] Test Plugin Trace Viewer (single column) works
- [ ] Implement TraceDetailPanelSection + view (custom)
- [ ] Add detail panel + split view to Plugin Trace Viewer
- [ ] Test Plugin Trace Viewer (complete) works
- [ ] Implement WebResourcePanel with sections
- [ ] Implement PluginAssemblyPanel with sections
- [ ] Implement ComponentPanel with sections
- [ ] Test all 3 new panels work correctly
- [ ] Coverage: All targets met

### Phase 4: Documentation + Cleanup
- [ ] Create `docs/MIGRATION_GUIDE_PANEL_FRAMEWORK.md`
- [ ] Add JSDoc to all sections, views, behaviors, coordinator
- [ ] Add `@deprecated` to `DataTablePanelCoordinator`
- [ ] Add deprecation warning in DataTablePanelCoordinator constructor
- [ ] Update all panels to use `PanelCoordinator` (if not already migrated)
- [ ] Archive old base template (`dataTable.ts` moved to `dataTable.legacy.ts`)
- [ ] Mark `HtmlRenderingBehavior` as deprecated
- [ ] Remove hard-coded button event listeners from old template
- [ ] Final `npm run compile` - should succeed
- [ ] Final `npm test -- --coverage` - should pass with all targets met
- [ ] Manual test all 7 panels

---

## Success Metrics

### Functional Success
- ✅ All 7 panels work correctly with new framework
- ✅ EnvironmentSetupPanel works without EnvironmentBehavior
- ✅ PersistenceInspectorPanel uses TreeViewSection (OR kept as Direct Implementation if too complex)
- ✅ Plugin Trace Viewer has all required features
- ✅ No runtime errors (hard-coded buttons issue resolved)

### Code Quality Success
- ✅ No HTML in .ts files (CLAUDE.md Rule #10 enforced - all HTML in view files)
- ✅ Sections are reusable across features
- ✅ Framework is extensible (easy to add new sections)
- ✅ All tests pass with coverage targets met (90% sections/views, 85% coordinator, 80% behaviors)
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
- Phase 1 implements NEW coordinator (no changes to existing)
- DataTablePanelCoordinator stays unchanged (deprecated but functional)
- Test after each migration (don't batch)
- Each phase delivers working software

### Risk 2: Framework Too Complex for Simple Panels

**Mitigation:**
- Simple panels (SolutionPanel, EnvironmentSetup) are actually SIMPLER with framework
- Sections reduce code volume vs Direct Implementation
- Framework provides value even for simple panels (message routing, lifecycle, composition)
- Validate with SolutionPanel first (Slice 4)

### Risk 3: Section Interface Too Rigid

**Mitigation:**
- ISection is minimal (just position + render)
- SectionRenderData is flexible (customData escape hatch)
- Custom sections can implement ISection directly (no inheritance required)
- Direct Implementation still available for truly one-off panels

### Risk 4: PersistenceInspectorPanel Migration Too Complex

**Mitigation:**
- Attempt migration in Slice 7
- If tree state management too complex, defer
- Framework already validated without it (tables proven in Slices 4-5)
- TreeViewSection extracted for future panels regardless

---

## Future Enhancements (Out of Scope)

**Not included in this refactor (implement when needed):**
- ThreePanel layout (for Metadata Browser) - Wait until Metadata Browser panel
- QueryBuilderSection (query UI) - Wait for Data Explorer panel
- ChartSection (data visualization) - Wait for analytics features
- FormSection (dynamic forms) - Wait for settings panels
- Advanced TabsSection (tabbed content) - May extend DetailPanelSection when needed

**YAGNI Principle:** Extract sections when building 2nd panel that needs them (Three Strikes Rule).

---

## Approval Checklist

Before proceeding to implementation:
- [ ] User approves approach
- [ ] Architect (clean-architecture-guardian) approves design (FINAL APPROVAL)
- [ ] Type contracts reviewed and approved
- [ ] Vertical slicing strategy reviewed and approved
- [ ] Testing strategy with coverage targets reviewed and approved
- [ ] Migration plan reviewed and approved
- [ ] Event handling pattern reviewed and approved
- [ ] Key decisions documented with trade-offs

---

**Changes Made (Revision 2):**
1. ✅ Added "Current State Analysis" section explaining behavior registry pattern
2. ✅ Extracted HTML to view files (all sections delegate to view functions)
3. ✅ Removed all time estimates (complexity labels only)
4. ✅ Added "Event Handling Pattern" section with examples
5. ✅ Revised Slice 1 to implement NEW coordinator (not rename existing)
6. ✅ Added test coverage targets to all slices (90% sections/views, 85% coordinator, 80% behaviors)
7. ✅ Added "Key Decisions" section with 7 documented decisions and trade-offs
8. ✅ Fixed SectionPosition implementation (added to interface and all sections)
9. ✅ Split Slice 8 into 8A (single column) and 8B (detail + split) - complexity accurate
10. ✅ Added "Behavior vs Section" explanation in Architecture Design
11. ✅ Documented SectionRenderData trade-off (union type acceptable for <10 types)
12. ✅ Clarified PersistenceInspectorPanel may stay Direct Implementation (risk mitigation)

**Changes Made (Revision 3):**
1. ✅ Implemented Architect Recommendation #1 (Option B): Removed `sections` and `layout` from `PanelCoordinatorConfig` - sections now passed ONLY to `SectionCompositionBehavior` constructor for better encapsulation and extensibility
2. ✅ Implemented Architect Recommendation #2: Added explicit test coverage targets to Slices 8A and 8B for custom sections (TraceLevelControlsSection, TraceDetailPanelSection) - 90% coverage for sections/views, 85% for coordinator integration

**Changes Made (Revision 4):**
1. ✅ **TypeScript Critical Fix**: Fixed non-null assertion in `groupSectionsByPosition()` - replaced `map.get(position)!.push(section)` with explicit undefined check (CLAUDE.md Rule #12 compliance)
2. ✅ **Command Registry Pattern**: Added generic type parameter `<TCommands extends string>` to `PanelCoordinator` and `registerHandler()` for compile-time command validation, autocomplete, and typo prevention
3. ✅ **Branded Types for Button IDs**: Added `ButtonId` branded type and `createButtonId()` helper to prevent typos between button configs and handler registrations at compile time
4. ✅ **Type Guards for CustomData**: Added `isTreeNodeArray()`, `isTraceLevel()`, and `isPluginTraceDetailViewModel()` type guards to eliminate type assertions (CLAUDE.md Rule #12) with runtime validation
5. ✅ **WebviewMessage Type Guard**: Added `isWebviewMessage()` type guard for runtime validation of messages from webview, preventing crashes from malformed data
6. ✅ **Union Discriminant**: Added optional `sectionType` discriminant to `SectionRenderData` for future type narrowing (zero-cost now, enables easier migration later)
7. ✅ **Readonly Arrays**: Changed all config interfaces to use `ReadonlyArray<T>` instead of mutable arrays, preventing accidental mutation bugs
8. ✅ **Readonly Properties**: Added `readonly` modifiers to all config interface properties for immutability
9. ✅ **Updated Examples**: All usage examples now demonstrate command registry pattern, branded types, and type guards in practice

**✅ APPROVED FOR IMPLEMENTATION**

**Architect's Final Assessment:**
- Clean Architecture Compliance: Excellent
- Type Safety Assessment: Appropriate and Well-Justified (NOT over-engineering)
- CLAUDE.md Compliance: Full - No violations found
- Design Completeness: Implementation-Ready
- Risk Assessment: LOW

**Next Steps:** Begin Slice 1 implementation (PanelCoordinator + ISection interface + SectionCompositionBehavior)
