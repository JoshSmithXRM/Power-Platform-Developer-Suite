# Panel Initialization Naming Guide

**Standard naming conventions for panel initialization methods in the Power Platform Developer Suite.**

---

## Overview

This guide defines three standard initialization patterns for VS Code panels based on complexity and requirements. Using consistent naming conventions improves code readability and signals the initialization behavior to developers.

---

## Quick Reference

| Pattern | Method Name | When to Use |
|---------|------------|-------------|
| **Simple** | `initializePanel()` | Basic setup, no external data or state |
| **Stateful** | `initializeWithPersistedState()` | Restore previous user state from workspace storage |
| **Data-Driven** | `initializeAndLoadData()` | Fetch data from API before initial render |

---

## Pattern 1: Simple Panels

### Method Name
```typescript
private async initializePanel(): Promise<void>
```

### When to Use
- Minimal setup required
- No external data fetching
- No state restoration needed
- Panel is self-contained or form-based

### Example Use Cases
- Form panels (Environment Setup)
- Configuration panels
- Simple diagnostic panels (Persistence Inspector)

### Code Example
```typescript
private async initializePanel(): Promise<void> {
    if (this.currentEnvironmentId) {
        await this.handleLoadEnvironment();
    } else {
        await this.scaffoldingBehavior.refresh({
            formData: {}
        });
    }
}
```

### Real-World Examples
- **EnvironmentSetupPanelComposed** (line 166): Form for creating/editing environments
- **PersistenceInspectorPanelComposed** (line 170): Simple refresh-on-demand panel

---

## Pattern 2: Stateful Panels

### Method Name
```typescript
private async initializeWithPersistedState(): Promise<void>
```

### When to Use
- Panel needs to restore previous user state
- Uses workspace storage (`IPanelStateRepository`)
- State includes: selected tabs, filters, panel width, last selection
- Goal: Prevent blank panel on reload - restore user context

### Example Use Cases
- Panels with persistent UI preferences
- Panels with saved filters or selections
- Panels with resizable layouts

### Code Example
```typescript
private async initializeWithPersistedState(): Promise<void> {
    this.logger.debug('Loading persisted panel state');

    // Load persisted state
    const state = await this.stateRepository.load({
        panelType: MetadataBrowserPanel.viewType,
        environmentId: this.currentEnvironmentId
    });

    // Restore state properties
    if (state?.selectedTab) {
        this.currentTab = state.selectedTab;
    }
    if (state?.detailPanelWidth) {
        this.detailPanelWidth = state.detailPanelWidth;
    }

    // Initialize with restored state
    const environments = await this.getEnvironments();
    await this.scaffoldingBehavior.refresh({
        environments,
        currentEnvironmentId: this.currentEnvironmentId
    });

    // Restore previous selection if it existed
    if (state?.selectedItemId) {
        await this.handleSelectEntity(state.selectedItemId);
    }
}
```

### Real-World Example
- **MetadataBrowserPanel** (line 381): Restores selected tab, entity/choice selection, and detail panel width

---

## Pattern 3: Data-Driven Panels

### Method Name
```typescript
private async initializeAndLoadData(): Promise<void>
```

### When to Use
- Panel requires API data before first render
- Displays data tables or lists
- May restore state AND fetch data (combines Pattern 2 + Pattern 3)
- Loading indicator should be shown during data fetch

### Example Use Cases
- Data table panels (Solutions, Import Jobs, Environment Variables)
- Panels that query Dataverse on startup
- Panels with auto-refresh intervals

### Code Example
```typescript
private async initializeAndLoadData(): Promise<void> {
    // Load environments first
    const environments = await this.getEnvironments();

    // Show loading state
    await this.scaffoldingBehavior.refresh({
        environments,
        currentEnvironmentId: this.currentEnvironmentId,
        tableData: [],
        isLoading: true
    });

    // Fetch data from API
    const solutions = await this.listSolutionsUseCase.execute(this.currentEnvironmentId);
    const viewModels = solutions
        .map(s => this.viewModelMapper.toViewModel(s))
        .sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));

    // Re-render with actual data
    await this.scaffoldingBehavior.refresh({
        environments,
        currentEnvironmentId: this.currentEnvironmentId,
        tableData: viewModels
    });
}
```

### Real-World Examples
- **PluginTraceViewerPanelComposed** (line 237): Loads persisted filters, then fetches traces
- **SolutionExplorerPanelComposed** (line 109): Shows loading state, then fetches solutions
- **EnvironmentVariablesPanelComposed** (line 125): Restores solution filter, then loads data
- **ImportJobViewerPanelComposed** (line 114): Loads environments, then import jobs
- **ConnectionReferencesPanelComposed** (line 268): Restores state, loads solutions, then data

---

## Hybrid Pattern: State + Data

### When to Use
Some panels need BOTH state restoration AND data loading. Use `initializeAndLoadData()` but include state restoration logic at the beginning.

### Code Example
```typescript
private async initializeAndLoadData(): Promise<void> {
    // STEP 1: Load persisted state (optional)
    if (this.panelStateRepository) {
        const state = await this.panelStateRepository.load({
            panelType: 'environmentVariables',
            environmentId: this.currentEnvironmentId
        });
        if (state?.selectedSolutionId) {
            this.currentSolutionId = state.selectedSolutionId;
        }
    }

    // STEP 2: Load environments and solutions
    const environments = await this.getEnvironments();
    const solutions = await this.loadSolutions();

    // STEP 3: Show loading state
    await this.scaffoldingBehavior.refresh({
        environments,
        currentEnvironmentId: this.currentEnvironmentId,
        solutions,
        currentSolutionId: this.currentSolutionId,
        tableData: [],
        isLoading: true
    });

    // STEP 4: Fetch data
    const data = await this.listDataUseCase.execute(
        this.currentEnvironmentId,
        this.currentSolutionId
    );

    // STEP 5: Render with data
    await this.scaffoldingBehavior.refresh({
        environments,
        currentEnvironmentId: this.currentEnvironmentId,
        solutions,
        currentSolutionId: this.currentSolutionId,
        tableData: data
    });
}
```

### Real-World Examples
- **PluginTraceViewerPanelComposed**: Restores filter criteria AND auto-refresh interval before loading traces
- **EnvironmentVariablesPanelComposed**: Restores selected solution before loading environment variables
- **ConnectionReferencesPanelComposed**: Restores solution filter before loading connection references

---

## Decision Tree

```
┌─────────────────────────────────────┐
│ Does panel fetch data from API?    │
└─────────────┬───────────────────────┘
              │
              ├─ NO ──► Does it restore state?
              │         │
              │         ├─ NO ──► initializePanel()
              │         │         (Simple setup)
              │         │
              │         └─ YES ──► initializeWithPersistedState()
              │                    (Restore user preferences)
              │
              └─ YES ──► initializeAndLoadData()
                         (Fetch data, optionally restore state first)
```

---

## Panel Inventory by Pattern

### Pattern 1: `initializePanel()` (Simple)
- **EnvironmentSetupPanelComposed** - Form-based environment editor
- **PersistenceInspectorPanelComposed** - Diagnostic panel (refresh on demand)

### Pattern 2: `initializeWithPersistedState()` (Stateful)
- **MetadataBrowserPanel** - Restores tab, entity selection, panel width

### Pattern 3: `initializeAndLoadData()` (Data-Driven)
- **PluginTraceViewerPanelComposed** - Loads traces (with state restoration)
- **SolutionExplorerPanelComposed** - Loads solutions
- **EnvironmentVariablesPanelComposed** - Loads environment variables (with state)
- **ImportJobViewerPanelComposed** - Loads import jobs
- **ConnectionReferencesPanelComposed** - Loads connection references (with state)

**Total Panels Analyzed:** 8

---

## Best Practices

1. **Name signals intent**: Method name should immediately tell developers what the initialization does
2. **Consistent patterns**: Use the same pattern for similar panel types (all data tables use `initializeAndLoadData()`)
3. **Loading states**: Always show loading indicator if fetching data (`isLoading: true`)
4. **State restoration first**: If combining state + data, restore state BEFORE fetching data (so filters apply)
5. **Error handling**: Wrap data fetching in try-catch and show error messages
6. **Two-phase rendering**:
   - Phase 1: Render skeleton (environments, loading state)
   - Phase 2: Render with data (full table)

---

## Anti-Patterns to Avoid

❌ **DON'T** use generic method names like `initialize()` - Be specific!

❌ **DON'T** mix initialization logic in constructor - Keep constructor minimal

❌ **DON'T** forget loading indicators - Users should see progress

❌ **DON'T** restore state AFTER fetching data - Order matters (state → data)

---

## Migration Guide

### If you have an existing panel with `initialize()`:

1. **Determine the pattern:**
   - Does it fetch data? → `initializeAndLoadData()`
   - Does it restore state? → `initializeWithPersistedState()`
   - Neither? → `initializePanel()`

2. **Rename the method:**
   ```typescript
   // Before
   private async initialize(): Promise<void> { ... }

   // After
   private async initializeAndLoadData(): Promise<void> { ... }
   ```

3. **Update the call in constructor:**
   ```typescript
   // Before
   void this.initialize();

   // After
   void this.initializeAndLoadData();
   ```

---

## Related Documentation

- **Panel Development Guide**: `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
- **Panel Initialization Pattern**: `.claude/templates/PANEL_INITIALIZATION_PATTERN.md`
- **Clean Architecture Guide**: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`

---

**Last Updated:** 2025-11-22
