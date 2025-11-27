# Virtual Data Table - Architecture Diagrams

**Design Document:** [VIRTUAL_DATA_TABLE_DESIGN.md](./VIRTUAL_DATA_TABLE_DESIGN.md)

---

## Clean Architecture Layers

```
┌────────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (VS Code Panels + Webview)                     │
│                                                                     │
│  WebResourcesPanel.ts                                              │
│    ├─ Uses VirtualDataTableSection (section composition)          │
│    ├─ Uses VirtualTableCacheManager (orchestration)               │
│    ├─ Calls handleRefresh() → loadInitialPage()                   │
│    └─ Sends VirtualTableViewModel via postMessage                 │
│                                                                     │
│  VirtualTableRenderer.js (Webview-side)                            │
│    ├─ TanStack Virtual integration                                 │
│    ├─ Renders only visible rows (~50-100 in DOM)                  │
│    └─ Updates DOM on scroll (swap visible rows)                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                           ↓ depends on ↓
┌────────────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER (Use Cases, ViewModels, Orchestration)          │
│                                                                     │
│  VirtualTableCacheManager<T>                                       │
│    ├─ Orchestrates background loading (non-blocking)              │
│    ├─ Manages cache state (cachedCount, totalCount, isLoading)    │
│    ├─ Coordinates IVirtualTableDataProvider calls                 │
│    └─ NO business logic (delegates to domain)                     │
│                                                                     │
│  SearchVirtualTableUseCase<T>                                      │
│    ├─ Client-side search (filter cached records)                  │
│    ├─ Server fallback (when not in cache)                         │
│    └─ Returns domain entities (caller maps to ViewModels)         │
│                                                                     │
│  VirtualTableViewModel                                             │
│    ├─ DTO for presentation (rows, pagination, filter, virtual)    │
│    ├─ No behavior (pure data structure)                           │
│    └─ Consumed by VirtualDataTableSection                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                           ↓ depends on ↓
┌────────────────────────────────────────────────────────────────────┐
│ DOMAIN LAYER (Business Logic, Interfaces, Value Objects)          │
│                                                                     │
│  IVirtualTableDataProvider<T> (interface)                          │
│    ├─ findPaginated(page, pageSize, options) → PaginatedResult<T> │
│    └─ getCount(options) → number                                  │
│                                                                     │
│  PaginatedResult<T> (immutable value object)                       │
│    ├─ Business logic: isFirstPage(), isLastPage(), hasNextPage()  │
│    ├─ Validation: page >= 1, pageSize > 0, items <= pageSize     │
│    └─ Calculations: getTotalPages(), getNextPage()                │
│                                                                     │
│  VirtualTableConfig (immutable value object)                       │
│    ├─ Business rules: initialPageSize (10-1000)                   │
│    │                   maxCachedRecords (100-50000)                │
│    │                   backgroundPageSize (100-5000)               │
│    ├─ Validation: maxCached >= initialPage                        │
│    └─ Calculations: getBackgroundPageCount()                      │
│                                                                     │
│  VirtualTableCacheState (immutable value object)                   │
│    ├─ Tracks: cachedCount, totalCount, isLoading, currentPage     │
│    ├─ Business logic: isFullyCached(), isEmpty(), isFiltered()    │
│    ├─ Calculations: getCachePercentage()                          │
│    └─ Immutable updates: withCachedCount(), withLoading(), etc.   │
│                                                                     │
│  ZERO EXTERNAL DEPENDENCIES (no TanStack, no vscode, no infra)    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                           ↑ implements ↑
┌────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE LAYER (Repositories, API, External Services)        │
│                                                                     │
│  DataverseWebResourceRepository                                    │
│    ├─ Implements IVirtualTableDataProvider<WebResource>           │
│    ├─ findPaginated() → OData query with $top, $skip              │
│    ├─ getCount() → OData $count endpoint                          │
│    └─ Maps DataverseDto → WebResource (domain entity)             │
│                                                                     │
│  VirtualDataTableSection (implements ISection)                     │
│    ├─ Stateless section (delegates HTML to view layer)            │
│    ├─ Renders virtual scroll container (empty tbody)              │
│    └─ Data populated via postMessage (data-driven updates)        │
│                                                                     │
│  VirtualTableRenderer.js (Webview-side)                            │
│    ├─ TanStack Virtual Core integration (vanilla JS)              │
│    ├─ observeElementRect, observeElementOffset (manual setup)     │
│    ├─ Calculates visible rows based on scroll position            │
│    └─ Renders only visible rows + spacers (top/bottom padding)    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Initial Page Load Flow (Detailed)

```
┌──────────────────┐
│ User Opens Panel │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Panel.handleRefresh()                                           │
│   - Calls cacheManager.loadInitialPage()                       │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ VirtualTableCacheManager.loadInitialPage()                      │
│   1. Update state: isLoading = true, currentPage = 1           │
│   2. Call provider.findPaginated(page=1, pageSize=100)         │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Repository.findPaginated(page=1, pageSize=100)                  │
│   - Build OData query: $top=100&$skip=0&$orderby=name          │
│   - Parallel: Fetch page 1 AND total count                     │
│   - Map DataverseDto → WebResource (domain entity)             │
│   - Return PaginatedResult<WebResource>                        │
│     { items: [100 entities], page: 1, pageSize: 100,          │
│       totalCount: 70000 }                                      │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CacheManager receives PaginatedResult                           │
│   1. Cache entities: cachedRecords = [100 entities]            │
│   2. Update state: cachedCount=100, totalCount=70000,          │
│                    isLoading=false, currentPage=1              │
│   3. Check: hasNextPage()? Yes → Start background loading      │
│   4. Return PaginatedResult to caller                          │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ (Background Loading Starts - Non-Blocking)
         │ ┌───────────────────────────────────────────────────┐
         │ │ CacheManager.loadBackgroundPages()                │
         │ │   Loop: page 2, 3, 4... until maxCached reached   │
         │ │   - Fetch page 2 (500 records)                    │
         │ │   - Cache += 500 (total: 600)                     │
         │ │   - Update state: cachedCount=600                 │
         │ │   - Fetch page 3 (500 records)                    │
         │ │   - Cache += 500 (total: 1100)                    │
         │ │   - Continue until 5000 cached...                 │
         │ └───────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Panel maps entities → ViewModels                                │
│   - WebResourceViewModelMapper.toViewModel(entity)              │
│   - Creates WebResourceViewModel[] (display-ready data)         │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Panel sends VirtualTableViewModel via postMessage               │
│   {                                                             │
│     command: 'updateVirtualTable',                              │
│     data: {                                                     │
│       rows: [100 ViewModels],                                  │
│       pagination: {                                             │
│         cachedCount: 100,                                       │
│         totalCount: 70000,                                      │
│         isLoading: false, (background loading in progress)     │
│         currentPage: 1,                                         │
│         isFullyCached: false                                    │
│       },                                                        │
│       filter: { query: null, isActive: false, visibleCount: 100 },│
│       virtualization: {                                         │
│         totalItems: 100,                                        │
│         estimatedItemHeight: 32                                 │
│       }                                                         │
│     }                                                           │
│   }                                                             │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ VirtualTableRenderer.updateData(viewModels)                     │
│   1. Store viewModels in memory: this.viewModels = [100 VMs]   │
│   2. Update virtualizer count: virtualizer.setOptions({        │
│        count: 100                                               │
│      })                                                         │
│   3. Trigger renderVisibleRows()                               │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ VirtualTableRenderer.renderVisibleRows()                        │
│   1. TanStack Virtual calculates visible range                 │
│      - Scroll position: 0px (top)                              │
│      - Viewport height: 600px                                  │
│      - Item height: 32px                                       │
│      - Visible items: rows 0-18 (19 rows fit in viewport)     │
│      - Overscan: +10 rows → render rows 0-28                   │
│                                                                 │
│   2. Build HTML for visible rows + spacers                     │
│      <tr style="height: 0px">       <!-- Top spacer -->        │
│      <tr>Row 0 data</tr>            <!-- Visible rows -->      │
│      <tr>Row 1 data</tr>                                       │
│      ...                                                        │
│      <tr>Row 28 data</tr>                                      │
│      <tr style="height: 2304px">    <!-- Bottom spacer -->     │
│        <!-- (100 items - 29 rendered) * 32px = 2272px -->      │
│                                                                 │
│   3. Update tbody.innerHTML (only 29 rows in DOM!)             │
│                                                                 │
│   Result: 29 rows rendered out of 100 total                    │
│           User sees instant table, smooth scroll               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ User sees table with 100 records     │
│ Footer: "100 of 70,000 loaded"       │
│ Background loading continues...      │
│ (non-blocking, user can scroll now)  │
└──────────────────────────────────────┘
```

**Time to first render:** < 2 seconds (target)
**Rows in DOM:** ~29 (vs 70,000 in old implementation)
**Memory usage:** ~10MB for 100 ViewModels (vs 500MB+ for 70k)

---

## Virtual Scrolling on User Scroll

```
┌──────────────────────────┐
│ User scrolls down        │
│ (scroll position: 800px) │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ TanStack Virtual detects scroll                                 │
│   - observeElementOffset() callback triggered                   │
│   - New scroll position: 800px                                  │
│   - Calculate new visible range:                                │
│       startIndex = Math.floor(800 / 32) = 25                    │
│       endIndex = Math.ceil((800 + 600) / 32) = 44               │
│       + overscan 10 → render rows 15-54                         │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ VirtualTableRenderer.renderVisibleRows()                        │
│   1. Get new virtual items (rows 15-54)                         │
│   2. Build HTML:                                                │
│      <tr style="height: 480px">     <!-- Top spacer -->         │
│        <!-- 15 rows * 32px = 480px -->                          │
│      <tr>Row 15 data</tr>           <!-- Visible rows -->       │
│      <tr>Row 16 data</tr>                                       │
│      ...                                                         │
│      <tr>Row 54 data</tr>                                       │
│      <tr style="height: 1440px">    <!-- Bottom spacer -->      │
│        <!-- (100 - 55) * 32px = 1440px -->                      │
│                                                                 │
│   3. Update tbody.innerHTML                                     │
│      - Old rows (0-28) removed from DOM                         │
│      - New rows (15-54) added to DOM                            │
│      - Only 40 rows in DOM (unchanged)                          │
│                                                                 │
│   Result: Smooth scroll, 60fps maintained                       │
│           Memory usage unchanged (40 rows in DOM)               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ User sees rows 15-54             │
│ No jank, smooth 60fps scroll     │
│ Rows 0-14 removed from DOM       │
│ Rows 55-99 not rendered yet      │
└──────────────────────────────────┘
```

**Key insight:** Only ~40 rows ever in DOM, regardless of total dataset size (70k).

---

## Client-Side Search Flow

```
┌───────────────────────────┐
│ User types "script"       │
│ in search box             │
└────────┬──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ VirtualTableRenderer debounces input (300ms)                    │
│   - Wait 300ms after last keystroke                             │
│   - Prevents excessive filtering on every key press             │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SearchVirtualTableUseCase.execute(query="script")               │
│   1. Check query empty? No                                      │
│   2. Search cached records                                      │
│      - cacheManager.searchCached(filterFn)                      │
│      - filterFn: (entity, "script") =>                          │
│          entity.getName().toLowerCase().includes("script")      │
│   3. Found 45 matching entities in cache                        │
│   4. Check: results > 0? Yes → return cached results            │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Panel maps results → ViewModels                                 │
│   - 45 entities → 45 ViewModels                                 │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Panel sends VirtualTableViewModel via postMessage               │
│   {                                                             │
│     rows: [45 filtered ViewModels],                            │
│     pagination: { cachedCount: 5000, totalCount: 70000, ... }, │
│     filter: {                                                   │
│       query: "script",                                          │
│       isActive: true,                                           │
│       visibleCount: 45                                          │
│     },                                                          │
│     virtualization: { totalItems: 45, ... }                    │
│   }                                                             │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ VirtualTableRenderer.updateData(filteredViewModels)             │
│   1. Update viewModels: this.viewModels = [45 filtered VMs]    │
│   2. Update virtualizer count: 45                               │
│   3. Re-virtualize: calculate visible rows from 45 total        │
│   4. Render visible rows (all 45 fit in viewport!)              │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ User sees 45 filtered results    │
│ Footer: "45 of 5,000 visible"    │
│ Response time: < 100ms (instant) │
└──────────────────────────────────┘
```

**Performance:** < 100ms response (client-side filtering in memory)

---

## Server Search Fallback Flow

```
┌───────────────────────────────┐
│ User types "xyz123"           │
│ (term not in cached records)  │
└────────┬──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SearchVirtualTableUseCase.execute(query="xyz123")               │
│   1. Search cached records: cacheManager.searchCached(filterFn) │
│      - Result: 0 matches                                        │
│   2. Check: results > 0? No                                     │
│   3. Check: cache fully loaded? No (5000 of 70000 cached)       │
│   4. Trigger server search fallback                             │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SearchVirtualTableUseCase.searchServer(query="xyz123")          │
│   1. Build OData filter expression:                             │
│      "contains(name, 'xyz123') or contains(displayname, 'xyz123')"│
│   2. Call provider.findPaginated(                               │
│        page=1,                                                  │
│        pageSize=1000,                                           │
│        options={ filter: OData expression }                     │
│      )                                                          │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Repository.findPaginated(page=1, pageSize=1000, filter=...)     │
│   - Build OData query:                                          │
│     GET /webresourceset?                                        │
│       $filter=contains(name,'xyz123') or contains(displayname,'xyz123')│
│       &$top=1000                                                │
│       &$skip=0                                                  │
│   - Dataverse API processes server-side filter                  │
│   - Returns matching records (e.g., 3 results)                  │
│   - Map to domain entities                                      │
│   - Return PaginatedResult { items: [3 entities], ... }        │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Panel receives server results                                   │
│   1. Map 3 entities → 3 ViewModels                              │
│   2. Send VirtualTableViewModel via postMessage                 │
│      { rows: [3 server results], filter: { source: 'server' } }│
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ User sees 3 results from server  │
│ Footer: "3 results (searched server)"│
│ Response time: ~500ms-1s         │
└──────────────────────────────────┘
```

**Performance:** ~500ms-1s (server query latency)
**Tradeoff:** Slower than client search, but finds records not in cache

---

## Background Loading Flow (Non-Blocking)

```
Initial Page Loaded (100 records cached)
         │
         ├─ User sees table immediately (100 records)
         │  User can scroll, search, interact (non-blocking)
         │
         └─ Background Task Started (async, non-blocking)
                  │
                  ▼
         ┌─────────────────────────────────────────────┐
         │ VirtualTableCacheManager.loadBackgroundPages()│
         │                                              │
         │  Loop: page 2 to N until maxCached reached  │
         │    ├─ Check cancellation token              │
         │    ├─ Fetch page 2 (500 records)            │
         │    ├─ Add to cache (total: 600)             │
         │    ├─ Update state: cachedCount=600         │
         │    ├─ Optional: Send progress update        │
         │    │   footer: "600 of 70,000 loaded"       │
         │    │                                         │
         │    ├─ Fetch page 3 (500 records)            │
         │    ├─ Add to cache (total: 1100)            │
         │    ├─ Update state: cachedCount=1100        │
         │    │                                         │
         │    ├─ ... continue ...                      │
         │    │                                         │
         │    ├─ Fetch page 10 (500 records)           │
         │    ├─ Add to cache (total: 5000)            │
         │    ├─ Update state: cachedCount=5000        │
         │    │   isFullyCached=false (70k total)      │
         │    │                                         │
         │    └─ Stop: maxCachedRecords reached        │
         │                                              │
         └──────────────────────────────────────────────┘
                  │
                  ▼
         Background Loading Complete
           - 5000 records cached (7% of 70k total)
           - User can search 5000 instantly
           - Scroll remains smooth (virtual scrolling)
           - Memory footprint: ~100MB (ViewModels)

Cancellation Scenarios:
  ├─ User changes environment → Cancel background loading
  ├─ Panel disposed → Cancel background loading
  └─ Explicit cancellation token → Stop immediately
```

**Key Benefit:** Non-blocking UX - user interacts immediately, loading continues in background

---

## Memory Comparison (70k Web Resources)

### Current Implementation (DataTableSection)

```
┌─────────────────────────────────────────────────────────┐
│ Load All Records (70k)                                  │
│   - Fetch ALL pages from Dataverse                      │
│   - Store 70k domain entities in memory                 │
│   - Map to 70k ViewModels                               │
│   - Render 70k rows to HTML string                      │
│   - Browser parses 70k <tr> elements into DOM           │
│                                                          │
│ Memory Breakdown:                                       │
│   - Domain entities: 70k * ~2KB = 140MB                 │
│   - ViewModels: 70k * ~3KB = 210MB                      │
│   - DOM nodes: 70k * ~2KB = 140MB                       │
│   - Total: ~490MB                                       │
│                                                          │
│ Performance:                                            │
│   - Initial load: 10+ seconds (all pages fetched)       │
│   - Scroll: Janky (browser struggles with 70k DOM rows) │
│   - Search: Slow (filters 70k DOM rows with display:none)│
└─────────────────────────────────────────────────────────┘
```

### New Implementation (VirtualDataTableSection)

```
┌─────────────────────────────────────────────────────────┐
│ Load Initial Page (100) + Background Load (5000)        │
│   - Fetch first page (100 records)                      │
│   - Background fetch pages 2-10 (5000 total cached)     │
│   - Virtual scrolling renders ~50 rows to DOM           │
│                                                          │
│ Memory Breakdown:                                       │
│   - Domain entities (cached): 5k * ~2KB = 10MB          │
│   - ViewModels: 5k * ~3KB = 15MB                        │
│   - DOM nodes: ~50 * ~2KB = 100KB                       │
│   - TanStack Virtual lib: ~5KB                          │
│   - Total: ~25MB (cached state)                         │
│                                                          │
│ Performance:                                            │
│   - Initial load: < 2 seconds (first page only)         │
│   - Scroll: Smooth 60fps (~50 rows in DOM)              │
│   - Search: Instant < 100ms (filter 5k in memory)       │
└─────────────────────────────────────────────────────────┘
```

**Improvement:**
- Memory: 95% reduction (490MB → 25MB)
- Initial load: 80% faster (10s → 2s)
- Scroll: 60fps vs janky
- Search: Instant vs slow

---

## Migration Path Visualization

### Before (DataTableSection)

```typescript
export class WebResourcesPanel {
  private constructor(...) {
    // Old approach: Load all records
  }

  private createCoordinator() {
    const sections = [
      new DataTableSection({
        columns: [...],
        searchPlaceholder: '...',
        noDataMessage: '...'
      })
    ];
    // ...
  }

  private async handleRefresh() {
    // Load ALL records (blocks until complete)
    const allResources = await this.repository.findAll(environmentId);

    // Map to ViewModels
    const viewModels = allResources.map(r => this.mapper.toViewModel(r));

    // Send all ViewModels at once
    await this.panel.webview.postMessage({
      command: 'updateTableData',
      data: { viewModels, columns: config.columns }
    });
  }
}
```

### After (VirtualDataTableSection)

```typescript
export class WebResourcesPanel {
  private readonly cacheManager: VirtualTableCacheManager<WebResource>;
  private readonly config: VirtualTableConfig;

  private constructor(...) {
    // New approach: Virtual table with cache manager
    this.config = VirtualTableConfig.createDefault();
    this.cacheManager = new VirtualTableCacheManager(
      this.repository, // implements IVirtualTableDataProvider
      this.config,
      this.logger
    );
  }

  private createCoordinator() {
    const sections = [
      new VirtualDataTableSection({ // ← Only change: Virtual section
        columns: [...],
        searchPlaceholder: '...',
        noDataMessage: '...'
      })
    ];
    // ...
  }

  private async handleRefresh() {
    // Load FIRST PAGE only (background loading starts automatically)
    const result = await this.cacheManager.loadInitialPage();
    const cacheState = this.cacheManager.getCacheState();

    // Map to ViewModels
    const viewModels = result.getItems().map(r => this.mapper.toViewModel(r));

    // Send VirtualTableViewModel (includes pagination state)
    await this.panel.webview.postMessage({
      command: 'updateVirtualTable', // ← New command
      data: {
        rows: viewModels,
        pagination: {
          cachedCount: cacheState.getCachedRecordCount(),
          totalCount: cacheState.getTotalRecordCount(),
          isLoading: cacheState.getIsLoading(),
          currentPage: cacheState.getCurrentPage(),
          isFullyCached: cacheState.isFullyCached()
        },
        filter: { query: null, isActive: false, visibleCount: viewModels.length },
        virtualization: { totalItems: viewModels.length, estimatedItemHeight: 32 }
      }
    });
  }

  private async handleEnvironmentChange(environmentId: string) {
    this.currentEnvironmentId = environmentId;
    this.cacheManager.clearCache(); // ← Clear cache on env change
    await this.handleRefresh();
  }

  public dispose() {
    void this.cacheManager.cancelBackgroundLoading(); // ← Cancel on dispose
    // ...
  }
}
```

**Migration changes:**
1. Import `VirtualDataTableSection`, `VirtualTableCacheManager`, `VirtualTableConfig`
2. Create cache manager in constructor
3. Replace `DataTableSection` → `VirtualDataTableSection`
4. Update `handleRefresh()` to use `cacheManager.loadInitialPage()`
5. Send `VirtualTableViewModel` instead of plain ViewModels
6. Clear cache on environment change
7. Cancel background loading on dispose

**Time:** ~30 minutes per panel
