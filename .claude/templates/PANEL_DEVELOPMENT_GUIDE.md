# Panel Development Guide

When and how to implement panels in the Power Platform Developer Suite.

---

## Overview

**Default Approach:** Use the **PanelCoordinator framework** for all panels unless you can justify why composition provides no value.

---

## Quick Decision Matrix

```
Does your panel have composable sections (table, filters, actions, detail pane)?
├─ YES → Use Framework Approach (PanelCoordinator)
└─ NO → Ask: "Is it truly one-off with zero reusable parts?"
    ├─ YES → Direct Implementation (rare)
    └─ NO → Use Framework Approach
```

**Default:** Framework Approach (90%+ of panels)

---

## Framework Approach (Default)

### When to Use

Use the Framework Approach when your panel has **ANY** of these:

✅ Multiple visual sections (table, filters, actions, detail pane)
✅ Data table, tree view, or list
✅ Filter controls (dropdowns, search, date pickers)
✅ Action buttons (toolbar, context menu)
✅ Environment dropdown (operates within selected environment)
✅ Split view or multi-panel layout
✅ Reusable UI components

**Rule of Thumb:** If you can identify 2+ visual sections, use the framework.

### What the Framework Provides

**Core Capabilities (Always Available):**
- ✅ Section composition (arrange UI sections in layouts)
- ✅ Message routing (webview ↔ extension communication)
- ✅ Panel lifecycle management (create, show, dispose)
- ✅ Panel tracking (singleton per environment or global)

**Optional Behaviors (Include as Needed):**
- ✅ **EnvironmentBehavior** - Environment dropdown (90% of panels need this)
- ✅ **DataBehavior** - Data loading via IDataLoader pattern
- ✅ **SolutionFilterBehavior** - Solution filter dropdown
- ✅ Custom behaviors for your feature

**Section Library (Reusable Components):**
- ✅ **DataTableSection** - Data tables with sorting/filtering
- ✅ **TreeViewSection** - Hierarchical tree views
- ✅ **FilterControlsSection** - Filter UI (dropdowns, inputs)
- ✅ **ActionButtonsSection** - Toolbar buttons
- ✅ **DetailPanelSection** - Detail/preview panes
- ✅ **EmptyStateSection** - Empty state messaging
- ✅ Custom sections (in your feature's presentation/sections/)

### Architecture

```
Panel (createOrShow factory)
  → PanelCoordinator (orchestrates lifecycle)
    → Behaviors (cross-cutting concerns)
      ├─ SectionCompositionBehavior (compose sections)
      ├─ MessageRoutingBehavior (handle messages)
      ├─ EnvironmentBehavior (optional - environment dropdown)
      └─ DataBehavior (optional - data loading)
    → Sections (UI components)
      ├─ DataTableSection
      ├─ FilterControlsSection
      ├─ ActionButtonsSection
      └─ Custom feature sections
```

### File Structure

```
src/features/{featureName}/presentation/
├── panels/
│   └── {FeatureName}Panel.ts                  (~200-400 lines)
├── sections/                                   (optional - custom sections)
│   ├── {Feature}DetailSection.ts
│   └── {Feature}ControlsSection.ts
└── dataLoaders/                                (if using DataBehavior)
    └── {FeatureName}DataLoader.ts
```

### Implementation Example

#### Panels WITH Environment (90% of panels)

```typescript
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { EnvironmentBehavior } from '../../../../shared/infrastructure/ui/behaviors/EnvironmentBehavior';
import { DataBehavior } from '../../../../shared/infrastructure/ui/behaviors/DataBehavior';
import { DataTableSection } from '../../../../shared/infrastructure/ui/sections/DataTableSection';
import { FilterControlsSection } from '../../../../shared/infrastructure/ui/sections/FilterControlsSection';

export class SolutionPanel {
  public static readonly viewType = 'powerPlatformDevSuite.solutions';
  private static panels = new Map<string, SolutionPanel>();

  private readonly coordinator: PanelCoordinator;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    environmentService: IEnvironmentService,
    dataLoader: SolutionsDataLoader,
    logger: ILogger
  ) {
    // Define sections
    const sections = [
      new DataTableSection({
        columns: [
          { id: 'displayName', label: 'Name' },
          { id: 'version', label: 'Version' },
          { id: 'publisher', label: 'Publisher' }
        ]
      }),
      new FilterControlsSection({
        filters: [
          { id: 'solutionType', type: 'select', label: 'Type', options: ['All', 'Managed', 'Unmanaged'] }
        ]
      })
    ];

    // Create coordinator with behaviors
    this.coordinator = new PanelCoordinator({
      panel,
      extensionUri,
      behaviors: [
        new EnvironmentBehavior(environmentService),  // ✅ Include environment dropdown
        new DataBehavior(dataLoader)
      ],
      sections,
      logger
    });
  }

  public static async createOrShow(
    extensionUri: vscode.Uri,
    environmentService: IEnvironmentService,
    dataLoader: SolutionsDataLoader,
    logger: ILogger,
    initialEnvironmentId?: string
  ): Promise<SolutionPanel> {
    // Singleton pattern
    const existingPanel = SolutionPanel.panels.get(initialEnvironmentId || 'default');
    if (existingPanel) {
      existingPanel.coordinator.reveal();
      return existingPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      SolutionPanel.viewType,
      'Solutions',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    const instance = new SolutionPanel(panel, extensionUri, environmentService, dataLoader, logger);
    SolutionPanel.panels.set(initialEnvironmentId || 'default', instance);

    return instance;
  }

  public dispose(): void {
    this.coordinator.dispose();
    SolutionPanel.panels.delete(/* environment id */);
  }
}
```

#### Panels WITHOUT Environment (10% of panels)

```typescript
export class EnvironmentSetupPanel {
  private readonly coordinator: PanelCoordinator;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    dataLoader: EnvironmentsDataLoader,
    logger: ILogger
  ) {
    const sections = [
      new DataTableSection({
        columns: [
          { id: 'name', label: 'Environment Name' },
          { id: 'url', label: 'URL' }
        ]
      }),
      new ActionButtonsSection({
        buttons: [
          { id: 'add', label: 'Add Environment' },
          { id: 'edit', label: 'Edit' },
          { id: 'delete', label: 'Delete' }
        ]
      })
    ];

    this.coordinator = new PanelCoordinator({
      panel,
      extensionUri,
      behaviors: [
        // ❌ NO EnvironmentBehavior (this panel manages environments, doesn't operate within one)
        new DataBehavior(dataLoader)
      ],
      sections,
      logger
    });
  }
}
```

### Key Characteristics

| Aspect | Framework Approach |
|--------|-------------------|
| **Code Volume** | ~200-400 lines (panel) + 70 lines (data loader if needed) |
| **UI Flexibility** | High (compose any sections in any layout) |
| **Feature Reuse** | Very high (shared section library) |
| **Consistency** | Automatic (shared section styles) |
| **Extensibility** | Easy (add new sections as needed) |
| **Testing** | Easy (mock behaviors and sections) |

### When to Include EnvironmentBehavior

**Include EnvironmentBehavior (90% of panels):**
- Panel operates within a selected environment
- Panel needs environment dropdown at top
- Examples: Solutions, Plugin Traces, Web Resources, Metadata Browser, Data Explorer

**Exclude EnvironmentBehavior (10% of panels):**
- Panel manages environments (Environment Setup)
- Panel is environment-agnostic (Persistence Inspector)
- Panel operates globally (Settings, About)

---

## Direct Implementation (Edge Cases Only)

### When to Use

Use Direct Implementation ONLY when **ALL** of these are true:

❌ Panel has no reusable sections (truly one-off UI)
❌ Panel is single-purpose with < 3 visual areas
❌ Panel won't be replicated for other features
❌ Composition provides no value

**Examples of Valid Direct Implementation:**
- Single static form with no dynamic sections
- Experimental/prototype panel (will be replaced)
- Extremely simple panel (single button + text)

**Note:** Very rare. Most panels benefit from composition.

### Architecture

```
Panel (createOrShow factory)
  → Manages webview lifecycle directly
  → Implements message handling directly
  → Generates HTML directly
  → No shared behaviors or sections
```

### File Structure

```
src/features/{featureName}/presentation/
├── panels/
│   └── {FeatureName}Panel.ts                  (~600-900 lines)
└── views/
    └── {featureName}View.ts                   (~300-500 lines HTML)
```

### Key Characteristics

| Aspect | Direct Implementation |
|--------|----------------------|
| **Code Volume** | ~900-1400 lines (panel + view) |
| **UI Flexibility** | Full control (no framework constraints) |
| **Feature Reuse** | None (all code custom) |
| **Consistency** | Manual (must replicate UX manually) |
| **Extensibility** | Difficult (no composition points) |
| **Testing** | Harder (tightly coupled) |

### When NOT to Use

**Don't use Direct Implementation for:**
- ❌ Data tables (use DataTableSection)
- ❌ Tree views (use TreeViewSection)
- ❌ Panels with filters (use FilterControlsSection)
- ❌ Panels with multiple sections (use Framework Approach)
- ❌ "I want full control" (Framework Approach provides full control via custom sections)

**Rule:** If you're thinking "I'll just implement it directly because it's simpler" - **stop**. Extract sections from your "direct" implementation and use the framework.

---

## Section Development

### Creating Custom Sections

If your panel needs UI that doesn't exist in the shared section library:

**1. Check if it's reusable across 2+ panels**
   - **YES** → Create in `src/shared/infrastructure/ui/sections/`
   - **NO** → Create in `src/features/{feature}/presentation/sections/`

**2. Implement ISection interface**

```typescript
export interface ISection {
  render(data: SectionRenderData): string;
}
```

**3. Example: Custom Feature Section**

```typescript
// src/features/pluginTraceViewer/presentation/sections/TraceLevelControlsSection.ts

export class TraceLevelControlsSection implements ISection {
  constructor(
    private getTraceLevelUseCase: GetTraceLevelUseCase,
    private setTraceLevelUseCase: SetTraceLevelUseCase,
    private logger: ILogger
  ) {}

  render(data: SectionRenderData): string {
    const currentLevel = data.traceLevel || 'Off';

    return `
      <div class="trace-level-controls">
        <span>Current Trace Level: <strong>${escapeHtml(currentLevel)}</strong></span>
        <button id="changeTraceLevelBtn">Change Level</button>
      </div>
    `;
  }
}
```

**4. Use in Panel**

```typescript
const sections = [
  new DataTableSection(config),
  new TraceLevelControlsSection(getTraceLevelUseCase, setTraceLevelUseCase, logger), // Custom section
  new DetailPanelSection(config)
];

this.coordinator = new PanelCoordinator({ sections, behaviors, ... });
```

---

## Migration Guide

### Migrating from Old Pattern 1/Pattern 2 Terminology

**Old Terminology (Deprecated):**
- ❌ "Pattern 1: DataTablePanelCoordinator" → Too narrow (implies data tables only)
- ❌ "Pattern 2: Direct Implementation" → Used for everything else

**New Terminology:**
- ✅ **Framework Approach** (default for 90%+ of panels)
- ✅ **Direct Implementation** (rare edge cases only)

### Migrating Existing Panels

**If your panel currently uses DataTablePanelCoordinator:**
1. Rename import: `DataTablePanelCoordinator` → `PanelCoordinator` (when available)
2. No other changes needed (backwards compatible)

**If your panel uses Direct Implementation:**
1. Ask: "Can this be decomposed into sections?"
2. If YES → Migrate to Framework Approach
3. If NO → Document why Direct Implementation is appropriate

---

## Decision Tree

```
Start: I need to build a panel
  ↓
Does it have 2+ visual sections (table, filters, actions, detail)?
  ├─ YES → Framework Approach (PanelCoordinator + sections)
  └─ NO → Is it truly one-off with zero reusable parts?
      ├─ YES → Direct Implementation (rare - document why)
      └─ NO → Framework Approach (extract sections for reuse)

Framework Approach:
  ↓
Does it operate within a selected environment?
  ├─ YES → Include EnvironmentBehavior
  └─ NO → Exclude EnvironmentBehavior

Does it load data via standard pattern?
  ├─ YES → Include DataBehavior + create DataLoader
  └─ NO → Custom data loading in coordinator

Which sections do you need?
  ├─ Data table → DataTableSection
  ├─ Tree view → TreeViewSection
  ├─ Filters → FilterControlsSection
  ├─ Actions → ActionButtonsSection
  ├─ Detail → DetailPanelSection
  └─ Custom → Create custom section (feature or shared)
```

---

## Common Mistakes

### ❌ Mistake 1: "Direct Implementation is simpler"

**Wrong Thinking:**
> "I'll just implement it directly. The framework seems complex."

**Why It's Wrong:**
- Direct Implementation is 900+ lines of code
- Framework Approach is 200-400 lines with better separation
- You'll duplicate code that already exists (data table, filters, etc.)

**Right Approach:**
> "I'll use the framework and create custom sections for unique UI."

### ❌ Mistake 2: "My panel is unique, it needs Direct Implementation"

**Wrong Thinking:**
> "My panel has a unique layout, so I can't use the framework."

**Why It's Wrong:**
- Framework supports custom sections and layouts
- "Unique" usually means "slightly different sections" not "completely custom"

**Right Approach:**
> "I'll identify the sections, create custom ones for unique parts, and use the framework."

### ❌ Mistake 3: "Framework is only for data tables"

**Wrong Thinking:**
> "My panel uses a tree view, not a table. I need Direct Implementation."

**Why It's Wrong:**
- Framework supports DataTableSection, TreeViewSection, custom sections
- "PanelCoordinator" is universal, not table-specific

**Right Approach:**
> "I'll use TreeViewSection (or create it if it doesn't exist) with the framework."

---

## Summary

**Default:** Use Framework Approach (PanelCoordinator with sections)

**Only use Direct Implementation if:**
- Truly one-off with zero reusable sections
- Can justify why composition provides no value
- Document the decision

**Remember:**
- EnvironmentBehavior is **optional** (90% include it, 10% don't)
- Sections are **composable** (mix and match as needed)
- Custom sections go in **feature layer** (unless reusable across 2+ features)
- Framework is **extensible** (add new sections when needed, not speculatively)

---

## Examples by Category

### Panels WITH Environment (Most Common)

| Panel | Sections | Behaviors |
|-------|----------|-----------|
| Solutions | DataTable, FilterControls | EnvironmentBehavior, DataBehavior |
| Plugin Traces | DataTable, DetailPanel, CustomControls | EnvironmentBehavior, DataBehavior |
| Web Resources | DataTable, ActionButtons | EnvironmentBehavior, DataBehavior |
| Metadata Browser | TreeView, DataTable, DetailPanel | EnvironmentBehavior |
| Data Explorer | FilterControls, DataTable, ActionButtons | EnvironmentBehavior, DataBehavior |

### Panels WITHOUT Environment (Rare)

| Panel | Sections | Behaviors |
|-------|----------|-----------|
| Environment Setup | DataTable, ActionButtons | DataBehavior (no EnvironmentBehavior) |
| Persistence Inspector | TreeView | (no EnvironmentBehavior, no DataBehavior) |
| Settings | CustomForm | (no EnvironmentBehavior) |

---

---

## Panel Initialization Naming

**See detailed guide:** `docs/patterns/PANEL_INITIALIZATION_GUIDE.md`

Quick reference for naming initialization methods:

| Pattern | Method Name | When to Use |
|---------|------------|-------------|
| Simple | `initializePanel()` | Basic setup, no data/state |
| Stateful | `initializeWithPersistedState()` | Restore workspace state |
| Data-Driven | `initializeAndLoadData()` | Fetch API data before render |

---

## Related Documentation

- **`docs/architecture/WEBVIEW_PATTERNS.md`** - **CRITICAL**: Message contracts, CSS layouts, behavior patterns, and implementation checklist
- `.claude/templates/PANEL_INITIALIZATION_PATTERN.md` - Two-phase initialization to avoid race conditions
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Layer boundaries and dependencies
- `.claude/WORKFLOW.md` - Complete development workflow (9 phases)
