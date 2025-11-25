# Panel Initialization Pattern Guide

**CRITICAL**: All data table panels MUST follow this exact initialization pattern to avoid race conditions and ensure loading indicators work correctly.

## The Problem We're Solving

When a VS Code webview panel initializes, there's a race condition:
1. Backend sets webview HTML
2. Backend sends `postMessage` with data
3. **BUT** JavaScript may not be loaded yet!
4. Message arrives before behavior is initialized → **LOST**
5. User sees loading spinner forever

## The Solution: Two-Phase Pattern

### Phase 1: Initial Load (Full HTML Refresh)
Use full HTML refresh via `scaffoldingBehavior.refresh()` for initial data load. This guarantees the data is in the HTML when JavaScript initializes.

### Phase 2: User-Triggered Refresh (Message-Based Update)
Use `postMessage` for subsequent refreshes triggered by user actions (Refresh button). This preserves user state like search queries and scroll position.

---

## Standard Pattern Implementation

### Step 1: Constructor Setup

```typescript
private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    // ... other dependencies
    environmentId: string
) {
    this.currentEnvironmentId = environmentId;

    // Configure webview
    panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [extensionUri]
    };

    // Create coordinator and scaffolding
    const result = this.createCoordinator();
    this.coordinator = result.coordinator;
    this.scaffoldingBehavior = result.scaffoldingBehavior;

    // Register command handlers
    this.registerCommandHandlers();

    // CRITICAL: Fire-and-forget async initialization
    // Uses fire-and-forget to avoid blocking constructor
    void this.initializeAndLoadData();
}
```

### Step 2: Initial Load Method (ALWAYS FULL HTML REFRESH)

**Method name MUST be**: `initializeAndLoadData()`

```typescript
private async initializeAndLoadData(): Promise<void> {
    // 1. Load dropdown data (environments, solutions, etc.)
    const environments = await this.getEnvironments();

    // 2. First refresh: Show loading state
    await this.scaffoldingBehavior.refresh({
        environments,
        currentEnvironmentId: this.currentEnvironmentId,
        tableData: [],
        isLoading: true  // Shows spinner in table
    });

    // 3. Load actual data from use case
    const entities = await this.myUseCase.execute(this.currentEnvironmentId);
    const viewModels = entities.map(e => this.viewModelMapper.toViewModel(e));

    // 4. Second refresh: Show actual data
    // CRITICAL: Full HTML refresh, NOT postMessage
    await this.scaffoldingBehavior.refresh({
        environments,
        currentEnvironmentId: this.currentEnvironmentId,
        tableData: viewModels
        // isLoading defaults to false, no loading spinner
    });
}
```

**Why two refreshes?**
- First refresh shows loading spinner immediately (good UX)
- Second refresh shows data when ready
- Both use full HTML refresh to avoid race condition

### Step 3: User-Triggered Refresh Method (MESSAGE-BASED UPDATE)

**Method name MUST be**: `handleRefresh()`

```typescript
private async handleRefresh(): Promise<void> {
    this.logger.debug('Refreshing data');

    try {
        // Load data
        const entities = await this.myUseCase.execute(this.currentEnvironmentId);
        const viewModels = entities.map(e => this.viewModelMapper.toViewModel(e));

        this.logger.info('Data loaded successfully', { count: viewModels.length });

        // CRITICAL: Use postMessage, NOT scaffoldingBehavior.refresh()
        // This preserves user state (search, scroll position)
        await this.panel.webview.postMessage({
            command: 'updateTableData',
            data: {
                viewModels,
                columns: this.getTableConfig().columns,
                isLoading: false
            }
        });
    } catch (error: unknown) {
        this.logger.error('Error refreshing data', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to refresh: ${errorMessage}`);
    }
}
```

### Step 4: Register Command Handlers

```typescript
private registerCommandHandlers(): void {
    // Refresh button handler
    this.coordinator.registerHandler('refresh', async () => {
        await this.handleRefresh();
    });

    // Other handlers...
}
```

---

## Frontend Behavior Pattern

The frontend behavior MUST handle the `updateTableData` message:

```javascript
window.createBehavior({
    initialize() {
        // Setup event listeners
    },
    handleMessage(message) {
        if (message.command === 'updateTableData') {
            updateTableData(message.data);
        }
    }
});

function updateTableData(data) {
    const { viewModels, columns, isLoading } = data;

    const tbody = document.querySelector('tbody');
    if (!tbody) {
        console.warn('[YourPanel] No tbody found for table update');
        return;
    }

    // Show loading state if still loading
    if (isLoading) {
        window.TableRenderer.showTableLoading(tbody, 'Loading...');
        return;
    }

    // Render data
    const rowsHtml = window.TableRenderer.renderTableRows(viewModels, columns);
    tbody.innerHTML = rowsHtml;

    // Re-apply search filter if active
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value) {
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        window.TableRenderer.updateTableFooter(viewModels.length);
    }

    // Re-apply row striping
    const table = document.querySelector('table');
    if (table) {
        table.dispatchEvent(new Event('tableUpdated', { bubbles: true }));
    }
}
```

---

## Decision Matrix: When to Use Each Pattern

| Scenario | Pattern | Reason |
|----------|---------|--------|
| **Initial panel load** | Full HTML refresh | Avoids race condition with JS initialization |
| **User clicks Refresh button** | Message-based update | Preserves search query, scroll position |
| **User changes environment dropdown** | Full HTML refresh | Major state change, needs full reset |
| **User changes solution filter** | Either (prefer message) | Depends on complexity |
| **Auto-refresh timer** | Message-based update | User might be interacting with panel |

---

## Common Mistakes to Avoid

### ❌ WRONG: Using postMessage on initial load
```typescript
private async initializeAndLoadData(): Promise<void> {
    await this.scaffoldingBehavior.refresh({ tableData: [], isLoading: true });

    const data = await this.loadData();

    // ❌ RACE CONDITION! Message may arrive before JS loads
    await this.panel.webview.postMessage({
        command: 'updateTableData',
        data: { viewModels: data }
    });
}
```

### ❌ WRONG: Using full HTML refresh for Refresh button
```typescript
private async handleRefresh(): Promise<void> {
    const data = await this.loadData();

    // ❌ LOSES USER STATE! Wipes out search, scroll, etc.
    await this.scaffoldingBehavior.refresh({
        tableData: data
    });
}
```

### ❌ WRONG: Inconsistent method naming
```typescript
// ❌ Should be initializeAndLoadData()
private async initialize(): Promise<void> { ... }

// ❌ Should be handleRefresh()
private async refresh(): Promise<void> { ... }
```

---

## Checklist for New Panels

- [ ] Constructor uses `void this.initializeAndLoadData()`
- [ ] `initializeAndLoadData()` does TWO full HTML refreshes (loading, then data)
- [ ] `handleRefresh()` uses `postMessage` with `updateTableData` command
- [ ] Frontend behavior has `updateTableData()` function
- [ ] Frontend behavior handles `isLoading` flag correctly
- [ ] Refresh button registered as `'refresh'` command handler
- [ ] All error cases handled with user-friendly messages

---

## Reference Implementations

These panels follow the pattern correctly:
- `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts`
- `src/features/importJobViewer/presentation/panels/ImportJobViewerPanelComposed.ts`
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`

## Testing Your Implementation

1. **Initial load**: Loading spinner should appear briefly, then data
2. **Refresh button**: Should update data without losing search query
3. **Fast clicking Refresh**: Should not break or show empty table
4. **Environment change**: Should show loading, then new environment's data
5. **Network error**: Should show error message, not get stuck loading

---

**Last Updated**: 2025-01-10
**Related Guides**:
- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
