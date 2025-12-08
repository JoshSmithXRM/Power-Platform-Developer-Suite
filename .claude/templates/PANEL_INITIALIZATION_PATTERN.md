# Panel Initialization Pattern Guide

**CRITICAL**: All data table panels MUST follow this exact initialization pattern to avoid race conditions and ensure loading indicators work correctly.

## The Problem We're Solving

When a VS Code webview panel initializes, there's a race condition:
1. Backend sets webview HTML
2. Backend sends `postMessage` with data
3. **BUT** JavaScript may not be loaded yet!
4. Message arrives before behavior is initialized → **LOST**
5. User sees "No data found" or loading spinner forever

## The Solution: HTML-Embedded Loading State

The key insight: **embed loading state in the initial HTML**, not via postMessage.

```typescript
// ✅ CORRECT: Loading state embedded in HTML (no race condition)
await this.scaffoldingBehavior.refresh({
    tableData: [],
    isLoading: true  // ← Spinner rendered in HTML immediately
});

// ❌ WRONG: Loading state sent via message (race condition!)
await this.scaffoldingBehavior.refresh({ tableData: [] });  // Shows "No data"
this.showTableLoading();  // Message may arrive before JS loads
```

### How virtualTableSectionView Handles `isLoading`

When `isLoading: true` with empty data, the view renders:
- **Table structure** (thead, tbody with `id="virtualTableBody"`) - ALWAYS present
- **Loading row inside tbody** - Shows spinner, can be replaced by VirtualTableRenderer.js

This is critical: the table structure MUST exist for VirtualTableRenderer.js to update it
when data arrives via postMessage. The view renders a loading ROW inside the table,
not a replacement loading DIV that replaces the entire table.

---

## Two Patterns: Regular Tables vs Virtual Tables

| Aspect | Regular Tables | Virtual Tables |
|--------|---------------|----------------|
| Section | `DataTableSection` | `VirtualDataTableSection` |
| Initial load | Two scaffold refreshes | One scaffold + postMessage |
| Data command | `updateTableData` | `updateVirtualTable` |
| Can full refresh after init | Yes | No (resets scroll) |
| Examples | PluginTraceViewer | ImportJob, Solutions, WebResources |

**Why virtual tables differ:** Full HTML refresh resets virtual scroll state (scroll position, rendered rows). Users would lose their place in large lists.

---

## Pattern A: Regular Tables (Two Scaffold Refreshes)

Use for panels with `DataTableSection` where scroll position doesn't matter.

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
    void this.initializeAndLoadData();
}
```

### Step 2: Initial Load Method

```typescript
private async initializeAndLoadData(): Promise<void> {
    // 1. Load dropdown data (environments, solutions, etc.)
    const environments = await this.getEnvironments();

    // 2. First refresh: Show loading state in HTML (no race condition)
    await this.scaffoldingBehavior.refresh({
        environments,
        currentEnvironmentId: this.currentEnvironmentId,
        tableData: [],
        isLoading: true  // ← CRITICAL: Renders spinner immediately
    });

    // 3. Load actual data from use case
    const entities = await this.myUseCase.execute(this.currentEnvironmentId);
    const viewModels = entities.map(e => this.viewModelMapper.toViewModel(e));

    // 4. Second refresh: Show actual data
    await this.scaffoldingBehavior.refresh({
        environments,
        currentEnvironmentId: this.currentEnvironmentId,
        tableData: viewModels
        // isLoading defaults to false
    });
}
```

### Step 3: User-Triggered Refresh (Message-Based)

```typescript
private async handleRefresh(): Promise<void> {
    this.logger.debug('Refreshing data');

    try {
        const entities = await this.myUseCase.execute(this.currentEnvironmentId);
        const viewModels = entities.map(e => this.viewModelMapper.toViewModel(e));

        // Use postMessage to preserve user state (search, scroll)
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
        vscode.window.showErrorMessage(`Failed to refresh: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
```

---

## Pattern B: Virtual Tables (One Scaffold + postMessage)

Use for panels with `VirtualDataTableSection` that need to preserve scroll position.

### Step 1: Constructor Setup (Same as Regular)

Same as Pattern A, plus initialize `LoadingStateBehavior` for button state management:

```typescript
private constructor(/* ... */) {
    // ... same setup as Pattern A ...

    // Initialize loading behavior for toolbar buttons
    this.loadingBehavior = new LoadingStateBehavior(
        panel,
        LoadingStateBehavior.createButtonConfigs(['refresh']),
        logger
    );

    void this.initializeAndLoadData();
}
```

### Step 2: Initial Load Method

```typescript
private async initializeAndLoadData(): Promise<void> {
    const environments = await this.getEnvironments();

    // Initial render with loading state - prevents "No data" flash
    // isLoading: true renders spinner in HTML immediately (no race condition)
    await this.scaffoldingBehavior.refresh({
        environments,
        currentEnvironmentId: this.currentEnvironmentId,
        tableData: [],
        isLoading: true  // ← CRITICAL: Renders spinner immediately
    });

    // Disable refresh button during initial load
    await this.loadingBehavior.setLoading(true);

    try {
        // Load data
        const result = await this.cacheManager.loadInitialPage();
        const viewModels = result.getItems()
            .map(item => this.viewModelMapper.toViewModel(item));

        // Send via postMessage (can't do second scaffold - resets virtual scroll)
        await this.panel.postMessage({
            command: 'updateVirtualTable',
            data: {
                rows: viewModels,
                pagination: {
                    cachedCount: result.getCachedCount(),
                    totalCount: result.getTotalCount(),
                    isLoading: false,
                    // ... other pagination state
                }
            }
        });
    } finally {
        await this.loadingBehavior.setLoading(false);
    }
}
```

### Step 3: User-Triggered Refresh

```typescript
private async handleRefresh(): Promise<void> {
    this.logger.debug('Refreshing data');

    // Show loading in button
    await this.loadingBehavior.setButtonLoading('refresh', true);

    // Show loading in table (JS is definitely loaded by now)
    this.showTableLoading();

    try {
        const result = await this.cacheManager.loadInitialPage();
        const viewModels = result.getItems()
            .map(item => this.viewModelMapper.toViewModel(item));

        await this.panel.postMessage({
            command: 'updateVirtualTable',
            data: {
                rows: viewModels,
                pagination: { /* ... */ }
            }
        });
    } catch (error: unknown) {
        this.logger.error('Error refreshing', error);
        vscode.window.showErrorMessage(`Failed to refresh: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        await this.loadingBehavior.setButtonLoading('refresh', false);
    }
}

/**
 * Shows loading spinner in the table.
 * Only use during handleRefresh() - NOT during initializeAndLoadData().
 * During init, use isLoading: true in scaffold instead.
 */
private showTableLoading(): void {
    void this.panel.postMessage({
        command: 'updateVirtualTable',
        data: {
            rows: [],
            columns: this.getTableConfig().columns,
            pagination: {
                cachedCount: 0,
                totalCount: 0,
                isLoading: true,
                currentPage: 0,
                isFullyCached: false
            }
        }
    });
}
```

---

## LoadingStateBehavior: Button State Management

`LoadingStateBehavior` manages **toolbar button states** during loading operations.

### What It Does
- Disables buttons during data loading
- Shows spinner on refresh button
- Re-enables buttons after loading completes

### What It Does NOT Do
- Does NOT manage table loading state (that's `isLoading` in scaffold/message)

### Usage

```typescript
// In constructor
this.loadingBehavior = new LoadingStateBehavior(
    panel,
    LoadingStateBehavior.createButtonConfigs(['refresh']),
    logger
);

// In initializeAndLoadData()
await this.loadingBehavior.setLoading(true);   // Disable all buttons
// ... load data ...
await this.loadingBehavior.setLoading(false);  // Re-enable buttons

// In handleRefresh()
await this.loadingBehavior.setButtonLoading('refresh', true);   // Single button
// ... refresh data ...
await this.loadingBehavior.setButtonLoading('refresh', false);
```

### Configuration Options

```typescript
// Buttons that show spinner during loading (default: ['refresh'])
LoadingStateBehavior.createButtonConfigs(['refresh', 'publish'], {
    spinnerButtons: ['refresh'],  // Only refresh shows spinner
    keepDisabledButtons: ['publish']  // Publish stays disabled after load
});
```

---

## Decision Matrix: When to Use Each Pattern

| Scenario | Pattern | Reason |
|----------|---------|--------|
| **Initial panel load** | `isLoading: true` in scaffold | Avoids race condition with JS initialization |
| **User clicks Refresh button** | `showTableLoading()` + postMessage | JS is loaded, preserves scroll position |
| **User changes environment** | Full scaffold refresh | Major state change, needs full reset |
| **User changes solution filter** | postMessage (prefer) | Preserves scroll, JS is loaded |
| **Auto-refresh timer** | postMessage | User might be interacting with panel |

---

## Common Mistakes to Avoid

### ❌ WRONG: Missing `isLoading: true` in scaffold

```typescript
private async initializeAndLoadData(): Promise<void> {
    // ❌ WRONG: No isLoading flag - renders "No data found" immediately
    await this.scaffoldingBehavior.refresh({ tableData: [] });

    this.showTableLoading();  // ❌ Too late! User already saw "No data"
    // ...
}
```

**Fix:** Add `isLoading: true` to scaffold refresh.

### ❌ WRONG: Using postMessage for initial data load (regular tables)

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

**Fix:** Use second scaffold refresh for regular tables, or accept postMessage for virtual tables (where scroll preservation matters).

### ❌ WRONG: Using full HTML refresh for Refresh button

```typescript
private async handleRefresh(): Promise<void> {
    const data = await this.loadData();

    // ❌ LOSES USER STATE! Wipes out search, scroll, etc.
    await this.scaffoldingBehavior.refresh({ tableData: data });
}
```

**Fix:** Use postMessage with `updateTableData` or `updateVirtualTable` command.

### ❌ WRONG: Confusing button state with table state

```typescript
// ❌ WRONG: This comment misunderstands the pattern
// "Don't pass isLoading:true - openMaker should stay enabled"
await this.scaffoldingBehavior.refresh({ tableData: [] });  // Missing isLoading!
```

**Fix:** `isLoading: true` in scaffold affects TABLE state only. Button state is managed separately by `LoadingStateBehavior`.

---

## Checklist for New Panels

### All Panels
- [ ] Constructor uses `void this.initializeAndLoadData()`
- [ ] `initializeAndLoadData()` has `isLoading: true` in first scaffold refresh
- [ ] `handleRefresh()` uses postMessage (NOT scaffold refresh)
- [ ] All error cases handled with user-friendly messages
- [ ] `LoadingStateBehavior` initialized for button state

### Regular Tables (DataTableSection)
- [ ] `initializeAndLoadData()` does TWO scaffold refreshes (loading, then data)
- [ ] Uses `updateTableData` command for refresh

### Virtual Tables (VirtualDataTableSection)
- [ ] `initializeAndLoadData()` does ONE scaffold refresh + postMessage
- [ ] Uses `updateVirtualTable` command for all updates
- [ ] `showTableLoading()` method implemented for refresh operations
- [ ] `showTableLoading()` NOT called during `initializeAndLoadData()`

---

## Reference Implementations

### Regular Table Pattern
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`

### Virtual Table Pattern
- `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts`
- `src/features/importJobViewer/presentation/panels/ImportJobViewerPanelComposed.ts`
- `src/features/webResources/presentation/panels/WebResourcesPanelComposed.ts`
- `src/features/environmentVariables/presentation/panels/EnvironmentVariablesPanelComposed.ts`
- `src/features/connectionReferences/presentation/panels/ConnectionReferencesPanelComposed.ts`

---

## Testing Your Implementation

1. **Initial load**: Loading spinner should appear immediately, then data (no "No data" flash)
2. **Refresh button**: Should update data without losing search query or scroll position
3. **Fast clicking Refresh**: Should not break or show empty table
4. **Environment change**: Should show loading, then new environment's data
5. **Network error**: Should show error message, not get stuck loading
6. **Virtual tables**: Scroll position preserved after refresh

---

## Frontend Behavior Pattern

### Regular Tables (updateTableData)

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
    const { viewModels, columns, isLoading, noDataMessage } = data;

    const tbody = document.querySelector('tbody');
    if (!tbody) {
        console.warn('[YourPanel] No tbody found for table update');
        return;
    }

    if (isLoading) {
        window.TableRenderer.showTableLoading(tbody, 'Loading...');
        return;
    }

    const rowsHtml = window.TableRenderer.renderTableRows(viewModels, columns, noDataMessage);
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

### Virtual Tables (updateVirtualTable)

Handled by `VirtualTableRenderer.js` - no custom behavior code needed.

---

**Related Guides**:
- `docs/architecture/WEBVIEW_PATTERNS.md` - Message contracts, CSS layouts, behavior patterns
- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` - Panel architecture decisions
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Layer boundaries
