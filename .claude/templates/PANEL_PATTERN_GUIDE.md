# Panel Implementation Pattern Guide

**Last Updated:** 2025-11-04
**Status:** Official Guidance

---

## Overview

This guide defines **when and how** to choose between the two panel implementation patterns in the Power Platform Developer Suite codebase.

Both patterns are architecturally valid and serve different purposes. Choosing the wrong pattern leads to wasted effort, code duplication, and maintenance burden.

---

## Two Patterns: Quick Reference

| Aspect | Pattern 1: DataTablePanelCoordinator | Pattern 2: Direct Implementation |
|--------|-------------------------------------|----------------------------------|
| **Use Case** | Data table panels with standard features | Custom UI panels, developer tools |
| **Complexity** | Higher (behavior composition) | Lower (self-contained) |
| **Code Volume** | ~370 lines (panel + data loader) | ~900 lines (panel + view) |
| **UI Flexibility** | Limited (shared template) | Full control |
| **Feature Reuse** | High (built-in features) | Low (manual implementation) |
| **Examples** | Connection References, Solutions | Persistence Inspector, Environment Setup |

---

## Pattern 1: DataTablePanelCoordinator (Composition-Based)

### When to Use Pattern 1

Use Pattern 1 when your panel meets **3 or more** of these criteria:

✅ **Panel displays tabular data** (sortable, filterable rows)
✅ **Panel needs environment dropdown** (switch between environments)
✅ **Panel needs solution filter** (optional filter by solution)
✅ **Panel needs export functionality** (CSV/JSON)
✅ **Panel should match existing data table UX** (consistency with other panels)
✅ **Custom UI needs are supplementary** (< 30% of total UI)

### What You Get Out-of-the-Box

Pattern 1 provides these features automatically:

- ✅ Environment dropdown with switching
- ✅ Solution filter (optional)
- ✅ Data table with sorting/filtering
- ✅ Search box (client-side search)
- ✅ Loading states (automatic spinners)
- ✅ Export buttons (CSV/JSON)
- ✅ Refresh button
- ✅ Custom toolbar buttons
- ✅ Pagination (future)
- ✅ Consistent VS Code theming

### Architecture

```
Panel Factory (createOrShow)
  → DataTableBehaviorRegistry (composes behaviors)
    → PanelTrackingBehavior (singleton per environment)
    → HtmlRenderingBehavior (generates HTML/CSS/JS)
    → EnvironmentBehavior (environment dropdown)
    → SolutionFilterBehavior (solution filter - optional)
    → DataBehavior (loads data via DataLoader)
    → MessageRoutingBehavior (routes webview messages)
  → DataTablePanelCoordinator (orchestrates lifecycle)
```

### File Structure

```
src/features/{featureName}/presentation/
├── panels/
│   └── {FeatureName}PanelComposed.ts       (~300 lines)
└── dataLoaders/
    └── {FeatureName}DataLoader.ts          (~70 lines)
```

### Implementation Steps

#### 1. Create Panel (PanelComposed.ts)

```typescript
import { DataTablePanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/DataTablePanelCoordinator';
import { DataTableBehaviorRegistry } from '../../../../shared/infrastructure/ui/behaviors/DataTableBehaviorRegistry';
import { HtmlRenderingBehavior, type HtmlCustomization } from '../../../../shared/infrastructure/ui/behaviors/HtmlRenderingBehavior';
import { EnvironmentBehavior } from '../../../../shared/infrastructure/ui/behaviors/EnvironmentBehavior';
import { SolutionFilterBehavior } from '../../../../shared/infrastructure/ui/behaviors/SolutionFilterBehavior';
import { DataBehavior } from '../../../../shared/infrastructure/ui/behaviors/DataBehavior';
import { MessageRoutingBehavior } from '../../../../shared/infrastructure/ui/behaviors/MessageRoutingBehavior';
import { PanelTrackingBehavior } from '../../../../shared/infrastructure/ui/behaviors/PanelTrackingBehavior';

export class MyFeaturePanelComposed {
  public static readonly viewType = 'powerPlatformDevSuite.myFeature';
  private static panels = new Map<string, MyFeaturePanelComposed>();

  private readonly coordinator: DataTablePanelCoordinator;
  private readonly registry: DataTableBehaviorRegistry;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
    private readonly getEnvironmentById: (envId: string) => Promise<Environment | null>,
    private readonly myUseCase: MyUseCase,
    private readonly logger: ILogger,
    environmentId: string,
    private readonly panelStateRepository: IPanelStateRepository | undefined
  ) {
    logger.debug('MyFeaturePanel: Initialized');

    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri]
    };

    this.registry = this.createBehaviorRegistry(environmentId);
    this.coordinator = this.createCoordinator();
    this.registerPanelCommands();

    void this.coordinator.initialize();
  }

  public static async createOrShow(
    extensionUri: vscode.Uri,
    getEnvironments: () => Promise<EnvironmentOption[]>,
    getEnvironmentById: (envId: string) => Promise<Environment | null>,
    myUseCase: MyUseCase,
    logger: ILogger,
    initialEnvironmentId?: string,
    panelStateRepository?: IPanelStateRepository
  ): Promise<MyFeaturePanelComposed> {
    // Get target environment
    let targetEnvironmentId = initialEnvironmentId;
    if (!targetEnvironmentId) {
      const environments = await getEnvironments();
      targetEnvironmentId = environments[0]?.id;
    }
    if (!targetEnvironmentId) {
      throw new Error('No environments available');
    }

    // Reuse existing panel if open
    const existingPanel = MyFeaturePanelComposed.panels.get(targetEnvironmentId);
    if (existingPanel) {
      existingPanel.panel.reveal(vscode.ViewColumn.One);
      return existingPanel;
    }

    // Get environment name for title
    const environment = await getEnvironmentById(targetEnvironmentId);
    const environmentName = environment?.name || 'Unknown';

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      MyFeaturePanelComposed.viewType,
      `My Feature - ${environmentName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );

    const newPanel = new MyFeaturePanelComposed(
      panel,
      extensionUri,
      getEnvironments,
      getEnvironmentById,
      myUseCase,
      logger,
      targetEnvironmentId,
      panelStateRepository
    );

    MyFeaturePanelComposed.panels.set(targetEnvironmentId, newPanel);

    return newPanel;
  }

  private createBehaviorRegistry(environmentId: string): DataTableBehaviorRegistry {
    const config = this.getConfig();
    const customization = this.getCustomization();

    const panelTrackingBehavior = new PanelTrackingBehavior(
      MyFeaturePanelComposed.panels
    );

    const htmlRenderingBehavior = new HtmlRenderingBehavior(
      this.panel.webview,
      this.extensionUri,
      config,
      customization
    );

    const messageRoutingBehavior = new MessageRoutingBehavior(
      this.panel.webview,
      this.logger
    );

    const environmentBehavior = new EnvironmentBehavior(
      this.panel.webview,
      this.getEnvironments,
      this.getEnvironmentById,
      async () => { /* Coordinator handles reload */ },
      this.logger,
      environmentId
    );

    // Solution filter (enable/disable based on needs)
    const solutionFilterBehavior = new SolutionFilterBehavior(
      this.panel.webview,
      'myFeature',
      environmentBehavior,
      async () => this.loadSolutions(), // Or async () => [] if disabled
      this.panelStateRepository,
      async () => { /* Coordinator handles reload */ },
      this.logger,
      true  // true = enabled, false = disabled
    );

    const dataLoader = new MyFeatureDataLoader(
      () => environmentBehavior.getCurrentEnvironmentId(),
      () => solutionFilterBehavior.getCurrentSolutionId(),
      this.myUseCase,
      this.logger
    );

    const dataBehavior = new DataBehavior(
      this.panel.webview,
      config,
      dataLoader,
      this.logger
    );

    return new DataTableBehaviorRegistry(
      environmentBehavior,
      solutionFilterBehavior,
      dataBehavior,
      messageRoutingBehavior,
      htmlRenderingBehavior,
      panelTrackingBehavior
    );
  }

  private createCoordinator(): DataTablePanelCoordinator {
    const dependencies: CoordinatorDependencies = {
      panel: this.panel,
      getEnvironmentById: this.getEnvironmentById,
      logger: this.logger
    };

    return new DataTablePanelCoordinator(this.registry, dependencies);
  }

  private registerPanelCommands(): void {
    // Custom commands (feature-specific)
    this.registry.messageRoutingBehavior.registerHandler('myCustomCommand', async (message) => {
      if (isMyCustomMessage(message)) {
        await this.handleMyCustomCommand(message.data);
      }
    });
  }

  private getConfig(): DataTableConfig {
    return {
      viewType: MyFeaturePanelComposed.viewType,
      title: 'My Feature',
      dataCommand: 'myFeatureData',
      defaultSortColumn: 'name',
      defaultSortDirection: 'asc',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'createdOn', label: 'Created On' }
      ],
      searchPlaceholder: '🔍 Search...',
      noDataMessage: 'No data found.',
      enableSolutionFilter: true,  // true/false based on needs
      toolbarButtons: [
        { id: 'refreshBtn', label: 'Refresh', command: 'refresh', position: 'left' },
        { id: 'exportCsvBtn', label: 'Export CSV', command: 'exportCsv', position: 'right' }
      ]
    };
  }

  private getCustomization(): HtmlCustomization {
    return {
      customCss: `/* Custom styles */`,
      filterLogic: `/* Custom filtering logic */`,
      customJavaScript: `/* Custom JS behaviors */`
    };
  }

  private async loadSolutions(): Promise<SolutionOption[]> {
    // Load solutions for filter (if needed)
    return [];
  }
}
```

#### 2. Create Data Loader (DataLoader.ts)

```typescript
import type { IDataLoader } from '../../../../shared/infrastructure/ui/behaviors/IDataLoader';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

export class MyFeatureDataLoader implements IDataLoader {
  constructor(
    private readonly getCurrentEnvironmentId: () => string | null,
    private readonly getCurrentSolutionId: () => string | null,
    private readonly myUseCase: MyUseCase,
    private readonly logger: ILogger
  ) {}

  public async load(cancellationToken: ICancellationToken): Promise<Record<string, unknown>[]> {
    const envId = this.getCurrentEnvironmentId();
    if (!envId) {
      return [];
    }

    try {
      // Call use case (returns domain entities)
      const entities = await this.myUseCase.execute(
        envId,
        this.getCurrentSolutionId() || undefined
      );

      // Map to ViewModels (simple DTO objects for table)
      return entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        createdOn: entity.createdOn.toISOString()
      }));
    } catch (error) {
      this.logger.error('Failed to load data', error);
      throw error;
    }
  }
}
```

### Examples in Codebase

- `src/features/connectionReferences/presentation/panels/ConnectionReferencesPanelComposed.ts`
- `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts`
- `src/features/environmentVariables/presentation/panels/EnvironmentVariablesPanelComposed.ts`

---

## Pattern 2: Direct Implementation (Self-Contained)

### When to Use Pattern 2

Use Pattern 2 when your panel meets **3 or more** of these criteria:

✅ **Panel has completely custom UI** (> 70% of UI is unique)
✅ **Panel is a developer tool** (unique interactions, not for end-users)
✅ **Panel doesn't need data table features** (no sorting/filtering/export)
✅ **Panel doesn't need environment dropdown**
✅ **Full control benefits outweigh code reuse**
✅ **Panel has unique interaction patterns** (forms, trees, custom layouts)

### What You Implement Manually

Pattern 2 requires manual implementation of:

- ❌ Environment dropdown (if needed)
- ❌ Data table rendering
- ❌ Filtering/sorting
- ❌ Export functionality
- ❌ Loading states
- ❌ Search box
- ❌ All HTML/CSS/JS

### Architecture

```
Panel Factory (createOrShow)
  → Panel Constructor
    → Use case injection (direct dependencies)
    → Message handling (manual routing)
    → State management (private fields)
    → HTML rendering (view file returns complete HTML)
```

### File Structure

```
src/features/{featureName}/presentation/
├── panels/
│   └── {FeatureName}Panel.ts              (~400 lines)
└── views/
    └── {featureName}.ts                    (~500 lines HTML/CSS/JS inline)
```

### Implementation Steps

#### 1. Create Panel (Panel.ts)

```typescript
import { renderMyFeature } from '../views/myFeature';

export class MyFeaturePanel {
  public static readonly viewType = 'powerPlatformDevSuite.myFeature';
  private static currentPanel?: MyFeaturePanel | undefined;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly myUseCase: MyUseCase,
    private readonly logger: ILogger,
    private disposables: vscode.Disposable[] = []
  ) {
    this.logger.debug('MyFeaturePanel: Initialized');

    // Set webview options
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    // Set initial HTML
    this.panel.webview.html = this.getHtmlContent();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async message => this.handleMessage(message),
      null,
      this.disposables
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.logger.debug('MyFeaturePanel: Disposed');
      this.dispose();
    }, null, this.disposables);

    // Load initial data
    void this.handleRefresh();
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    myUseCase: MyUseCase,
    logger: ILogger
  ): MyFeaturePanel {
    // If panel already exists, show it
    if (MyFeaturePanel.currentPanel) {
      MyFeaturePanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      return MyFeaturePanel.currentPanel;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      MyFeaturePanel.viewType,
      'My Feature',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );

    MyFeaturePanel.currentPanel = new MyFeaturePanel(
      panel,
      extensionUri,
      myUseCase,
      logger
    );

    return MyFeaturePanel.currentPanel;
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isWebviewMessage(message)) {
      this.logger.warn('Received invalid message from webview', message);
      return;
    }

    try {
      if (message.command === 'refresh') {
        await this.handleRefresh();
      } else if (message.command === 'myCustomCommand') {
        await this.handleMyCustomCommand(message.data);
      }
    } catch (error) {
      this.logger.error('Error handling webview message', error);
    }
  }

  private async handleRefresh(): Promise<void> {
    try {
      // Call use case
      const data = await this.myUseCase.execute();

      // Send to webview
      await this.panel.webview.postMessage({
        command: 'dataLoaded',
        data
      });
    } catch (error) {
      this.logger.error('Failed to refresh data', error);
    }
  }

  private getHtmlContent(): string {
    return renderMyFeature();
  }

  public dispose(): void {
    if (MyFeaturePanel.currentPanel === this) {
      MyFeaturePanel.currentPanel = undefined;
    }

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
```

#### 2. Create View (view.ts)

```typescript
import { html } from '../../../../infrastructure/ui/utils/HtmlUtils';

export function renderMyFeature(): string {
  return html`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>My Feature</title>
      <style>
        body {
          padding: 20px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }
        /* Custom styles here */
      </style>
    </head>
    <body>
      <div class="toolbar">
        <button id="refreshBtn">🔄 Refresh</button>
      </div>

      <div id="content">
        <!-- Custom HTML here -->
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('refreshBtn').addEventListener('click', () => {
          vscode.postMessage({ command: 'refresh' });
        });

        window.addEventListener('message', event => {
          const message = event.data;

          switch (message.command) {
            case 'dataLoaded':
              renderData(message.data);
              break;
          }
        });

        function renderData(data) {
          // Custom rendering logic
        }
      </script>
    </body>
    </html>
  `;
}
```

### Examples in Codebase

- `src/features/persistenceInspector/presentation/panels/PersistenceInspectorPanel.ts`
- `src/features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts`

---

## Decision Matrix

Use this matrix to choose the correct pattern:

| Criteria | Weight | Pattern 1 Score | Pattern 2 Score |
|----------|--------|----------------|----------------|
| Needs data table | High | +3 | 0 |
| Needs environment dropdown | High | +3 | 0 |
| Needs solution filter | Medium | +2 | 0 |
| Needs export | Medium | +2 | 0 |
| Custom UI < 30% | Medium | +2 | 0 |
| Custom UI > 70% | High | 0 | +3 |
| Developer tool | Low | 0 | +1 |
| Unique interactions | Medium | 0 | +2 |

**If Pattern 1 Score > Pattern 2 Score → Use Pattern 1**
**If Pattern 2 Score > Pattern 1 Score → Use Pattern 2**

### Tiebreaker Rule

**If Pattern 1 Score = Pattern 2 Score**, ask:

> "Would I need to override more than 50% of the HTML structure to achieve my UI?"

- ✅ **YES** (replacing content area, adding panels/tree/tabs) → Use **Pattern 2** (fighting the template)
- ❌ **NO** (supplementary UI like buttons, detail toggle) → Use **Pattern 1** (customization)

**Examples of >50% structural override:**
- Replacing single table with multiple tables
- Adding tree view or split panels
- Replacing content area with custom layout (three-panel, etc.)
- Adding tab controls for primary navigation

**Examples of supplementary customization (<50%):**
- Adding custom buttons above the table
- Adding a detail panel that toggles visibility
- Custom filtering/sorting logic
- Custom styling or badges

---

### Example: Plugin Trace Viewer

| Criteria | Pattern 1 | Pattern 2 |
|----------|-----------|-----------|
| Needs data table | ✅ +3 | 0 |
| Needs environment dropdown | ✅ +3 | 0 |
| Needs solution filter | ❌ 0 | 0 |
| Needs export | ✅ +2 | 0 |
| Custom UI < 30% | ✅ +2 (trace level + detail panel = ~25%) | 0 |
| Custom UI > 70% | 0 | ❌ 0 |
| Developer tool | 0 | ❌ 0 |
| Unique interactions | 0 | ❌ 0 |
| **Total** | **10** | **0** |

**Decision:** Pattern 1 (DataTablePanelCoordinator)

---

### Example: Metadata Browser

| Criteria | Pattern 1 | Pattern 2 |
|----------|-----------|-----------|
| Needs data table | ✅ +3 (multiple tables) | 0 |
| Needs environment dropdown | ✅ +3 | 0 |
| Needs solution filter | ❌ 0 | 0 |
| Needs export | ❌ 0 | 0 |
| Custom UI < 30% | 0 | ❌ 0 |
| Custom UI > 70% | 0 | ✅ +3 (tree + tabs + detail = ~90%) |
| Developer tool | 0 | ✅ +1 |
| Unique interactions | 0 | ✅ +2 (tree navigation, tab switching) |
| **Total** | **6** | **6** |

**Tiebreaker Applied:** Would need to replace entire content structure with three-panel layout (tree + tabbed tables + detail panel). This is >50% structural override.

**Decision:** Pattern 2 (Direct Implementation)

**Key Differences from Plugin Trace Viewer:**
- Plugin Traces: Single table + supplementary UI (15% custom) = Pattern 1 ✅
- Metadata Browser: Tree + multiple tables + detail (90% custom) = Pattern 2 ✅

---

## Common Pitfalls

### ❌ Pitfall 1: Choosing Pattern 2 for Data Tables

**Problem:** Reimplementing data table features manually

**Example:**
```typescript
// DON'T: Manual table rendering in Pattern 2
function renderTable(data) {
  return `<table>${data.map(row => `<tr>...</tr>`).join('')}</table>`;
}
```

**Solution:** Use Pattern 1 (DataTablePanelCoordinator) - table is built-in

---

### ❌ Pitfall 2: Choosing Pattern 1 for Custom UI

**Problem:** Fighting the shared HTML template

**Example:**
```typescript
// DON'T: Extensive customization to override standard table
const customization = {
  customCss: '/* 500 lines to override everything */',
  customJavaScript: '/* 1000 lines to rebuild UI */'
};
```

**Solution:** Use Pattern 2 (Direct Implementation) - full control

---

### ❌ Pitfall 3: Mixing Patterns

**Problem:** Using Pattern 2 structure with Pattern 1 behaviors

**Example:**
```typescript
// DON'T: Extending non-existent BaseBehavior in Pattern 2
class MyPanelBehavior extends BaseBehavior {
  // This framework doesn't exist in our codebase
}
```

**Solution:** Pick ONE pattern and follow it completely

---

## Migration Guide

### Migrating Pattern 2 → Pattern 1

**When to Migrate:**
- Panel adds data table requirements
- Panel adds environment dropdown
- Code duplication becomes maintenance burden

**Steps:**
1. Create `{Feature}PanelComposed.ts` following Pattern 1 structure
2. Create `{Feature}DataLoader.ts` implementing `IDataLoader`
3. Move custom UI to `HtmlCustomization` (customCss, customJavaScript)
4. Update command registration to use new panel
5. Delete old Panel.ts and view.ts
6. Test environment switching, filtering, export

---

## Summary

| Question | Answer |
|----------|--------|
| **Default choice for new panels?** | Pattern 1 (unless custom UI > 70%) |
| **When to use Pattern 2?** | Custom UI panels, developer tools |
| **Can I mix patterns?** | ❌ No - pick one and follow it completely |
| **Which is "better"?** | Neither - depends on requirements |
| **Fastest implementation?** | Pattern 1 (if requirements fit) |
| **Most flexible?** | Pattern 2 (full control) |

**Key Principle:** Maximize code reuse when possible (Pattern 1), use full control when necessary (Pattern 2).
