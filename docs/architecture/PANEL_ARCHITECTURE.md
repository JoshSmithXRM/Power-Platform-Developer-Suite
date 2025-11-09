# Panel Architecture Guide

**Comprehensive guide to the panel composition architecture in Power Platform Developer Suite.**

**Last Updated:** 2025-11-08
**Status:** Official Architecture Reference

---

## Overview

The panel architecture is based on **composition over inheritance**, using a coordinator pattern to orchestrate modular, reusable UI sections and behaviors.

**Key Principles:**
- **Sections define UI** - Composable, reusable components (tables, filters, buttons)
- **Behaviors add functionality** - Optional cross-cutting concerns (environment dropdown, data loading)
- **Coordinator orchestrates** - Manages lifecycle, message routing, command handlers
- **Data-driven updates** - Send ViewModels to client, no HTML re-renders
- **Type-safe commands** - Generic command type ensures compile-time validation

**Architecture Layers:**
```
Panel (createOrShow factory)
  → PanelCoordinator<TCommands> (lifecycle orchestration)
    → Behaviors (cross-cutting concerns)
      ├─ HtmlScaffoldingBehavior (HTML document wrapper)
      ├─ SectionCompositionBehavior (compose sections into layouts)
      ├─ EnvironmentBehavior (optional - environment dropdown)
      └─ DataBehavior (optional - data loading via IDataLoader)
    → Sections (UI components)
      ├─ DataTableSection (data tables)
      ├─ EnvironmentSelectorSection (environment dropdown)
      ├─ ActionButtonsSection (toolbar buttons)
      └─ Custom feature sections
```

---

## PanelCoordinator Pattern

### What is PanelCoordinator?

`PanelCoordinator<TCommands>` is the universal coordinator for all panels. It:
- Manages webview panel lifecycle (create, dispose)
- Routes messages from webview to handlers
- Initializes behaviors in sequence
- Provides type-safe command registration
- Automatically manages button loading states

### Type-Safe Command Registration

Commands are defined as a union type for compile-time validation:

```typescript
type SolutionPanelCommands = 'refresh' | 'openMaker' | 'openInMaker' | 'environmentChange';

const coordinator = new PanelCoordinator<SolutionPanelCommands>({
  panel,
  extensionUri,
  behaviors: [/* ... */],
  logger
});

// ✅ Type-safe - command must be one of SolutionPanelCommands
coordinator.registerHandler('refresh', async () => {
  await this.handleRefresh();
});

// ❌ Compile error - 'invalidCommand' not in SolutionPanelCommands
coordinator.registerHandler('invalidCommand', async () => { });
```

### Basic Pattern

```typescript
export class FeaturePanel {
  public static readonly viewType = 'powerPlatformDevSuite.feature';
  private static panels = new Map<string, FeaturePanel>();

  private readonly coordinator: PanelCoordinator<FeaturePanelCommands>;
  private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
  private currentEnvironmentId: string;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly useCases: { /* ... */ },
    private readonly logger: ILogger,
    environmentId: string
  ) {
    this.currentEnvironmentId = environmentId;

    // Configure webview
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri]
    };

    // Create coordinator with behaviors and sections
    const result = this.createCoordinator();
    this.coordinator = result.coordinator;
    this.scaffoldingBehavior = result.scaffoldingBehavior;

    // Register command handlers
    this.registerCommandHandlers();

    // Initialize and load data
    void this.initializeAndLoadData();
  }

  private createCoordinator(): {
    coordinator: PanelCoordinator<FeaturePanelCommands>;
    scaffoldingBehavior: HtmlScaffoldingBehavior;
  } {
    // 1. Define sections (UI components)
    const sections = [
      new ActionButtonsSection({ buttons: [/*...*/] }, SectionPosition.Toolbar),
      new EnvironmentSelectorSection(),
      new DataTableSection(config)
    ];

    // 2. Create composition behavior (renders sections into layout)
    const compositionBehavior = new SectionCompositionBehavior(
      sections,
      PanelLayout.SingleColumn
    );

    // 3. Resolve CSS modules
    const cssUris = resolveCssModules(
      {
        base: true,
        components: ['buttons', 'inputs'],
        sections: ['environment-selector', 'action-buttons', 'datatable']
      },
      this.extensionUri,
      this.panel.webview
    );

    // 4. Create scaffolding behavior (wraps in HTML document)
    const scaffoldingBehavior = new HtmlScaffoldingBehavior(
      this.panel.webview,
      compositionBehavior,
      {
        cssUris,
        jsUris: [/* webview scripts */],
        cspNonce: getNonce(),
        title: 'Feature Panel'
      }
    );

    // 5. Create coordinator
    const coordinator = new PanelCoordinator<FeaturePanelCommands>({
      panel: this.panel,
      extensionUri: this.extensionUri,
      behaviors: [scaffoldingBehavior],
      logger: this.logger
    });

    return { coordinator, scaffoldingBehavior };
  }

  private registerCommandHandlers(): void {
    this.coordinator.registerHandler('refresh', async () => {
      await this.handleRefresh();
    });

    this.coordinator.registerHandler('environmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId) {
        await this.handleEnvironmentChange(environmentId);
      }
    });
  }

  private async initializeAndLoadData(): Promise<void> {
    // Load environments for selector
    const environments = await this.getEnvironments();

    // Initialize coordinator with initial data
    await this.scaffoldingBehavior.refresh({
      environments,
      currentEnvironmentId: this.currentEnvironmentId,
      tableData: []
    });

    // Load feature data
    await this.handleRefresh();
  }

  public static async createOrShow(/* ... */): Promise<FeaturePanel> {
    // Singleton pattern per environment
    const existingPanel = FeaturePanel.panels.get(environmentId);
    if (existingPanel) {
      existingPanel.panel.reveal();
      return existingPanel;
    }

    const panel = vscode.window.createWebviewPanel(/* ... */);
    const newPanel = new FeaturePanel(/* ... */);

    FeaturePanel.panels.set(environmentId, newPanel);
    panel.onDidDispose(() => {
      FeaturePanel.panels.delete(environmentId);
    });

    return newPanel;
  }
}
```

---

## Section-Based Composition

### What are Sections?

Sections are reusable UI components that implement the `ISection` interface:

```typescript
export interface ISection {
  readonly position: SectionPosition;
  render(data: SectionRenderData): string;
}
```

**Section positions:**
- `Toolbar` - Top toolbar area (buttons, controls)
- `Header` - Below toolbar (environment selector, breadcrumbs)
- `Filters` - Filter controls (dropdowns, search)
- `Main` - Primary content area (tables, trees, forms)
- `Detail` - Detail/preview pane (side or bottom)
- `Footer` - Bottom area (status, pagination)

### Shared Section Library

Located in `src/shared/infrastructure/ui/sections/`:

| Section | Purpose | Position | Example |
|---------|---------|----------|---------|
| `DataTableSection` | Data tables with sorting/filtering | Main | Solution lists, trace logs |
| `ActionButtonsSection` | Toolbar buttons | Toolbar | Refresh, Export, Delete |
| `EnvironmentSelectorSection` | Environment dropdown | Header | All environment-scoped panels |
| `SolutionFilterSection` | Solution filter dropdown | Filters | Solution-scoped data |
| `DropdownSection` | Generic dropdown control | Filters/Header | Custom filters |

### Creating Custom Sections

**Decision: Shared vs Feature-Specific**
- **Shared** (`src/shared/infrastructure/ui/sections/`) - Reusable across 2+ panels
- **Feature** (`src/features/{feature}/presentation/sections/`) - Feature-specific UI

**Example: Custom Feature Section**

```typescript
// src/features/pluginTraceViewer/presentation/sections/TraceLevelControlsSection.ts

import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

export class TraceLevelControlsSection implements ISection {
  public readonly position = SectionPosition.Toolbar;

  render(data: SectionRenderData): string {
    const currentLevel = data.traceLevel || 'Off';

    return `
      <div class="trace-level-controls">
        <label>Trace Level:</label>
        <select id="traceLevelSelect">
          <option value="Off" ${currentLevel === 'Off' ? 'selected' : ''}>Off</option>
          <option value="Error" ${currentLevel === 'Error' ? 'selected' : ''}>Error</option>
          <option value="Warning" ${currentLevel === 'Warning' ? 'selected' : ''}>Warning</option>
          <option value="Info" ${currentLevel === 'Info' ? 'selected' : ''}>Info</option>
        </select>
        <button id="applyTraceLevelBtn">Apply</button>
      </div>
    `;
  }
}
```

---

## Data-Driven Updates

### Philosophy

**Old Approach (BAD):**
- Re-render entire HTML document on every data change
- Slow, flickers, loses client-side state

**New Approach (GOOD):**
- Render HTML once on initialization
- Send ViewModels to client via `postMessage`
- Client-side JavaScript updates DOM incrementally

### Message Patterns

#### Update Table Data

**Extension-side:**

```typescript
await this.panel.webview.postMessage({
  command: 'updateTableData',
  data: {
    viewModels: [ /* array of ViewModels */ ],
    columns: this.getTableConfig().columns
  }
});
```

**Example from SolutionExplorerPanelComposed:**

```typescript
private async handleRefresh(): Promise<void> {
  const solutions = await this.listSolutionsUseCase.execute(this.currentEnvironmentId);

  // Map domain entities to ViewModels
  const viewModels = solutions
    .map(s => this.viewModelMapper.toViewModel(s))
    .sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));

  // Send ViewModels to client (no HTML generation here!)
  await this.panel.webview.postMessage({
    command: 'updateTableData',
    data: {
      viewModels,
      columns: this.getTableConfig().columns
    }
  });
}
```

#### Set Button State

```typescript
this.panel.webview.postMessage({
  command: 'setButtonState',
  buttonId: 'refresh',
  disabled: true,
  showSpinner: true
});
```

**Automatic via PanelCoordinator:**

```typescript
// PanelCoordinator automatically manages button states
coordinator.registerHandler('refresh', async () => {
  // Button automatically disabled + spinner shown
  await this.handleRefresh();
  // Button automatically re-enabled + spinner hidden
}, { disableOnExecute: true }); // Default is true
```

---

## Layout System

### Available Layouts

- **SingleColumn** - Sections stacked vertically (90% of panels)
- **SplitHorizontal** - Main and detail side-by-side
- **SplitVertical** - Main and detail stacked

```typescript
const compositionBehavior = new SectionCompositionBehavior(
  sections,
  PanelLayout.SingleColumn // or SplitHorizontal, SplitVertical
);
```

---

## File Structure

### Typical Panel Structure

```
src/features/{featureName}/
├── presentation/
│   ├── panels/
│   │   └── {FeatureName}PanelComposed.ts  (~300-400 lines)
│   └── sections/                          (optional - custom sections)
│       ├── {Feature}DetailSection.ts
│       └── {Feature}ControlsSection.ts
```

### Shared Infrastructure

```
src/shared/infrastructure/ui/
├── coordinators/
│   ├── PanelCoordinator.ts
│   └── IPanelCoordinator.ts
├── behaviors/
│   ├── HtmlScaffoldingBehavior.ts
│   ├── SectionCompositionBehavior.ts
│   └── IPanelBehavior.ts
├── sections/
│   ├── ISection.ts
│   ├── DataTableSection.ts
│   ├── ActionButtonsSection.ts
│   └── EnvironmentSelectorSection.ts
└── types/
    ├── PanelLayout.ts
    ├── SectionPosition.ts
    ├── SectionRenderData.ts
    └── WebviewMessage.ts
```

---

## Summary

**Key Takeaways:**

1. **PanelCoordinator is the default** - Use for all panels
2. **Sections define UI** - Compose from shared library + custom sections
3. **Type-safe commands** - Define command union type
4. **Data-driven updates** - Send ViewModels via `postMessage`, avoid HTML re-renders
5. **SingleColumn layout** - Default for 90% of panels

**Related Documentation:**
- [PANEL_DEVELOPMENT_GUIDE.md](../../.claude/templates/PANEL_DEVELOPMENT_GUIDE.md) - Quick decision guide
- [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md) - Domain, application, infrastructure layers
