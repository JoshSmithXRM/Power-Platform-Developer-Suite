# Virtual Data Table - Quick Reference Card

**For Implementers | 5-Minute Cheat Sheet**

---

## What Problem Does This Solve?

**Before:** Loading 70k web resources freezes browser (10+ seconds), 500MB memory, janky scrolling
**After:** Instant load (< 2s), 25MB memory, smooth 60fps scrolling

---

## Core Concepts (30-Second Overview)

1. **Server-side pagination** - Fetch first 100 records only
2. **Background loading** - Continue loading up to 5,000 in background (non-blocking)
3. **Virtual scrolling** - Render only ~50 visible rows to DOM (TanStack Virtual)
4. **Client-side cache** - Instant search within 5k cached records
5. **Server fallback** - Query Dataverse when search term not in cache

---

## File Locations

### Domain Layer (ZERO dependencies)
```
src/shared/domain/
  interfaces/IVirtualTableDataProvider.ts  ← NEW: Paginated data contract
  valueObjects/
    PaginatedResult.ts                     ← NEW: Immutable page wrapper
    VirtualTableConfig.ts                  ← NEW: Configuration (page sizes)
    VirtualTableCacheState.ts              ← NEW: Cache state snapshot
```

### Application Layer (Orchestration)
```
src/shared/application/
  services/VirtualTableCacheManager.ts     ← NEW: Background loading orchestration
  useCases/SearchVirtualTableUseCase.ts    ← NEW: Search with server fallback
  viewModels/VirtualTableViewModel.ts      ← NEW: Pagination + cache state DTO
```

### Infrastructure Layer (External APIs)
```
src/shared/infrastructure/ui/
  sections/VirtualDataTableSection.ts      ← NEW: Virtual table section
  views/virtualTableSectionView.ts         ← NEW: HTML rendering

resources/webview/js/renderers/
  VirtualTableRenderer.js                  ← NEW: TanStack Virtual integration

src/features/webResources/infrastructure/repositories/
  DataverseWebResourceRepository.ts        ← MODIFIED: Add findPaginated(), getCount()
```

---

## Key Interfaces (Copy-Paste Templates)

### IVirtualTableDataProvider<T> (Domain)

```typescript
export interface IVirtualTableDataProvider<T> {
  findPaginated(
    page: number,
    pageSize: number,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<PaginatedResult<T>>;

  getCount(
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<number>;
}
```

### PaginatedResult<T> (Domain)

```typescript
export class PaginatedResult<T> {
  public static create<T>(
    items: readonly T[],
    page: number,
    pageSize: number,
    totalCount: number
  ): PaginatedResult<T>;

  public isFirstPage(): boolean;
  public isLastPage(): boolean;
  public hasNextPage(): boolean;
  public getNextPage(): number | null;
  public getTotalPages(): number;

  public getItems(): readonly T[];
  public getPage(): number;
  public getPageSize(): number;
  public getTotalCount(): number;
}
```

### VirtualTableConfig (Domain)

```typescript
export class VirtualTableConfig {
  public static createDefault(): VirtualTableConfig;
  // Default: initialPageSize=100, maxCached=5000, backgroundPageSize=500

  public static create(
    initialPageSize: number,
    maxCachedRecords: number,
    backgroundPageSize: number,
    enableBackgroundLoading?: boolean
  ): VirtualTableConfig;

  public shouldLoadInBackground(): boolean;
  public getBackgroundPageCount(): number;
  public getInitialPageSize(): number;
  public getMaxCachedRecords(): number;
  public getBackgroundPageSize(): number;
}
```

### VirtualTableCacheManager (Application)

```typescript
export class VirtualTableCacheManager<T> {
  constructor(
    provider: IVirtualTableDataProvider<T>,
    config: VirtualTableConfig,
    logger: ILogger
  );

  public async loadInitialPage(
    cancellationToken?: ICancellationToken
  ): Promise<PaginatedResult<T>>;

  public searchCached(filterFn: (record: T) => boolean): T[];

  public clearCache(): void;
  public getCacheState(): VirtualTableCacheState;
  public getCachedRecords(): readonly T[];
  public async cancelBackgroundLoading(): Promise<void>;
}
```

---

## Implementation Checklist

### Slice 1: Virtual Scrolling (MVP)

- [ ] Create `IVirtualTableDataProvider<T>` interface
- [ ] Create `PaginatedResult<T>` value object
- [ ] Create `VirtualTableConfig` value object
- [ ] Create `VirtualTableCacheState` value object
- [ ] Write domain tests (100% coverage)
- [ ] `npm run compile` passes
- [ ] Commit domain layer

**Status:** CAN START NOW (not blocked by configuration-settings)

### Slice 2: Background Loading

- [ ] Create `VirtualTableCacheManager<T>` service
- [ ] Create `VirtualTableViewModel` DTO
- [ ] Write application tests (90% coverage)
- [ ] `npm run compile` passes
- [ ] Commit application layer

**Status:** BLOCKED (needs IConfigurationService from feature/configuration-settings)

### Slice 3-5: Search, Fallback, Sorting

- [ ] Create `SearchVirtualTableUseCase<T>` use case
- [ ] Create `VirtualDataTableSection` section
- [ ] Create `VirtualTableRenderer.js` (webview)
- [ ] Update repository: `findPaginated()`, `getCount()`
- [ ] Write infrastructure tests
- [ ] `npm run compile` passes
- [ ] Commit infrastructure layer

**Status:** BLOCKED (depends on Slice 2)

---

## Panel Migration Steps (30 Minutes)

### 1. Add Imports

```typescript
import { VirtualDataTableSection } from '../../../../shared/infrastructure/ui/sections/VirtualDataTableSection';
import { VirtualTableCacheManager } from '../../../../shared/application/services/VirtualTableCacheManager';
import { VirtualTableConfig } from '../../../../shared/domain/valueObjects/VirtualTableConfig';
import { IVirtualTableDataProvider } from '../../../../shared/domain/interfaces/IVirtualTableDataProvider';
```

### 2. Update Repository

```typescript
export class DataverseWebResourceRepository
  implements IWebResourceRepository, IVirtualTableDataProvider<WebResource> {

  async findPaginated(
    page: number,
    pageSize: number,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<PaginatedResult<WebResource>> {
    // Build OData query with $top, $skip
    const mergedOptions = { ...defaultOptions, ...options, top: pageSize };
    const skip = (page - 1) * pageSize;
    const queryString = ODataQueryBuilder.build(mergedOptions);
    const endpoint = `/api/data/v9.2/webresourceset?${queryString}&$skip=${skip}`;

    // Fetch page + count in parallel
    const [response, totalCount] = await Promise.all([
      this.apiService.get<DataverseWebResourcesResponse>(environmentId, endpoint, cancellationToken),
      this.getCount(options, cancellationToken)
    ]);

    // Map to domain entities
    const webResources = response.value.map(dto => this.mapToEntity(dto));

    // Return PaginatedResult
    return PaginatedResult.create(webResources, page, pageSize, totalCount);
  }

  async getCount(
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<number> {
    const filterParam = options?.filter ? `$filter=${options.filter}` : '';
    const endpoint = `/api/data/v9.2/webresourceset/$count${filterParam ? '?' + filterParam : ''}`;

    const count = await this.apiService.get<number>(environmentId, endpoint, cancellationToken);
    return count;
  }
}
```

### 3. Update Panel Constructor

```typescript
export class WebResourcesPanel {
  private readonly cacheManager: VirtualTableCacheManager<WebResource>;
  private readonly config: VirtualTableConfig;

  private constructor(...) {
    // Create config
    this.config = VirtualTableConfig.createDefault();

    // Create cache manager
    this.cacheManager = new VirtualTableCacheManager(
      this.repository, // implements IVirtualTableDataProvider<WebResource>
      this.config,
      this.logger
    );

    // ... rest of constructor
  }
}
```

### 4. Replace Section

```diff
  const sections = [
    new ActionButtonsSection({...}),
    new EnvironmentSelectorSection(),
-   new DataTableSection(config)
+   new VirtualDataTableSection(config) // Same config interface
  ];
```

### 5. Update handleRefresh()

```typescript
private async handleRefresh(): Promise<void> {
  try {
    // Load initial page (background loading starts automatically)
    const result = await this.cacheManager.loadInitialPage();
    const cacheState = this.cacheManager.getCacheState();

    // Map to ViewModels
    const viewModels = result.getItems().map(wr => this.mapper.toViewModel(wr));

    // Send VirtualTableViewModel
    await this.panel.webview.postMessage({
      command: 'updateVirtualTable',
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
  } catch (error) {
    // ... error handling
  }
}
```

### 6. Handle Environment Change

```typescript
private async handleEnvironmentChange(environmentId: string): Promise<void> {
  this.currentEnvironmentId = environmentId;
  this.cacheManager.clearCache(); // Important: clear stale cache
  await this.handleRefresh();
}
```

### 7. Handle Disposal

```typescript
public dispose(): void {
  void this.cacheManager.cancelBackgroundLoading();
  // ... rest of disposal
}
```

---

## Testing Quick Reference

### Domain Tests (100%)

```typescript
describe('PaginatedResult', () => {
  it('should validate page >= 1', () => {
    expect(() => PaginatedResult.create([], 0, 10, 100))
      .toThrow('Page must be >= 1');
  });

  it('should validate pageSize > 0', () => {
    expect(() => PaginatedResult.create([], 1, 0, 100))
      .toThrow('Page size must be > 0');
  });

  it('should validate items <= pageSize', () => {
    expect(() => PaginatedResult.create([1, 2, 3], 1, 2, 100))
      .toThrow('Items length (3) exceeds page size (2)');
  });

  it('should calculate isLastPage correctly', () => {
    const result = PaginatedResult.create(Array(10).fill(1), 10, 10, 100);
    expect(result.isLastPage()).toBe(true);
  });
});
```

### Application Tests (90%)

```typescript
describe('VirtualTableCacheManager', () => {
  let cacheManager: VirtualTableCacheManager<TestEntity>;
  let mockProvider: jest.Mocked<IVirtualTableDataProvider<TestEntity>>;

  beforeEach(() => {
    mockProvider = { findPaginated: jest.fn(), getCount: jest.fn() } as any;
    const config = VirtualTableConfig.createDefault();
    cacheManager = new VirtualTableCacheManager(mockProvider, config, new NullLogger());
  });

  it('should load initial page and cache records', async () => {
    const entities = [{ id: '1' }, { id: '2' }];
    const result = PaginatedResult.create(entities, 1, 100, 1000);
    mockProvider.findPaginated.mockResolvedValue(result);

    await cacheManager.loadInitialPage();

    expect(mockProvider.findPaginated).toHaveBeenCalledWith(1, 100, undefined, undefined);
    expect(cacheManager.getCacheState().getCachedRecordCount()).toBe(2);
  });
});
```

### Manual Testing

1. **70k records:** Open panel, verify < 2s load, smooth scrolling
2. **Search:** Type query, verify instant results (< 100ms)
3. **Server fallback:** Search for term not in cache, verify server query
4. **Environment change:** Switch env, verify cache cleared, new data loaded
5. **Memory:** DevTools → Memory, verify < 200MB for 5k cached records

---

## Performance Targets

| Metric | Target | Current (70k) | Status |
|--------|--------|---------------|--------|
| Initial load | < 2s | 10+ seconds | TBD |
| Scrolling | 60fps | Janky | TBD |
| Memory | < 200MB | 500MB+ | TBD |
| Search (cached) | < 100ms | Slow | TBD |
| DOM rows | ~50 | 70,000 | TBD |

---

## Common Pitfalls

1. **Forgetting to clear cache on environment change**
   - Symptom: Stale data from previous environment
   - Fix: `this.cacheManager.clearCache()` in `handleEnvironmentChange()`

2. **Not cancelling background loading on dispose**
   - Symptom: Background tasks continue after panel closed
   - Fix: `void this.cacheManager.cancelBackgroundLoading()` in `dispose()`

3. **Using DataTableSection instead of VirtualDataTableSection**
   - Symptom: Still loading all records
   - Fix: Import and use `VirtualDataTableSection`

4. **Repository not implementing IVirtualTableDataProvider**
   - Symptom: Type errors when creating cache manager
   - Fix: Add `implements IVirtualTableDataProvider<T>` to repository class

5. **Sending plain ViewModels instead of VirtualTableViewModel**
   - Symptom: Webview doesn't show pagination state
   - Fix: Send complete `VirtualTableViewModel` with pagination, filter, virtualization fields

---

## Dependencies

### Blocked By
- `feature/configuration-settings` - Provides `IConfigurationService`
  - Domain layer NOT blocked (can implement now)
  - Application/Infrastructure layers blocked

### External Dependencies (New)
- `@tanstack/virtual-core` (~5KB gzipped)
  - Install: `npm install @tanstack/virtual-core`
  - Bundle in webview JS

---

## Questions & Support

- **Full Design:** [VIRTUAL_DATA_TABLE_DESIGN.md](./VIRTUAL_DATA_TABLE_DESIGN.md)
- **Diagrams:** [VIRTUAL_DATA_TABLE_DIAGRAMS.md](./VIRTUAL_DATA_TABLE_DIAGRAMS.md)
- **Summary:** [VIRTUAL_DATA_TABLE_SUMMARY.md](./VIRTUAL_DATA_TABLE_SUMMARY.md)
- **Architecture:** `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- **Panel Patterns:** `docs/architecture/PANEL_ARCHITECTURE.md`

**Estimated Total Implementation Time:** 6-8 hours (all slices)
**Per-Panel Migration Time:** 30 minutes
