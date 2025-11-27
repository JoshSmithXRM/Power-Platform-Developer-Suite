# Virtual Data Table Design - Executive Summary

**Design Document:** [VIRTUAL_DATA_TABLE_DESIGN.md](./VIRTUAL_DATA_TABLE_DESIGN.md)
**Date:** 2025-11-27
**Status:** Ready for Review

---

## Problem Statement

Current `DataTableSection` loads ALL records (70,000+ web resources) into memory and renders ALL rows to DOM, causing:
- Browser freezes during initial load (10+ seconds)
- Memory warnings and potential crashes
- Unresponsive UI during scrolling
- Poor search performance

**Impact:** Users cannot effectively browse large Power Platform datasets.

---

## Solution Overview

Build `VirtualDataTableSection` component with:

1. **Server-side pagination** - Load first 100 records instantly
2. **Background loading** - Continue loading up to 5,000 records in background
3. **Virtual scrolling** - Render only visible ~50 rows to DOM (using TanStack Virtual)
4. **Client-side cache** - Instant search within cached records
5. **Server search fallback** - Query server when search term not in cache

**Result:** 10x faster initial load, smooth 60fps scrolling, instant search.

---

## Key Architecture Decisions

### 1. Clean Architecture Compliance

```
Domain Layer (ZERO dependencies)
  ├─ IVirtualTableDataProvider<T> interface
  ├─ PaginatedResult<T> value object (immutable)
  ├─ VirtualTableConfig value object (validation)
  └─ VirtualTableCacheState value object (cache tracking)
       ↑ implements ↑
Infrastructure Layer
  ├─ Repository.findPaginated() (paginated queries)
  ├─ VirtualDataTableSection (section implementation)
  └─ VirtualTableRenderer.js (TanStack Virtual integration)
       ↑ depends on ↑
Application Layer (orchestration only)
  ├─ VirtualTableCacheManager (background loading)
  ├─ SearchVirtualTableUseCase (client + server search)
  └─ VirtualTableViewModel (pagination + cache state)
       ↑ depends on ↑
Presentation Layer
  └─ Panels use VirtualDataTableSection (opt-in, backward compatible)
```

**All dependencies point INWARD. Domain has ZERO external dependencies.**

### 2. TanStack Virtual Core

- Framework-agnostic (works with vanilla JS webview)
- Battle-tested library (used by TanStack Table)
- Small bundle size (~5KB gzipped)
- Handles complex virtualization math (scrollbar sizing, overscan, dynamic heights)

### 3. Hybrid Pagination Strategy

- **Initial load:** Fetch first 100 records (instant)
- **Background load:** Fetch pages 2-10 (up to 5,000 cached) non-blocking
- **Virtual scroll:** Render only visible ~50 rows to DOM
- **Search:** Client-side instant (< 100ms), server fallback if not in cache

### 4. Immutable Value Objects

- `PaginatedResult<T>` - Wraps page data + metadata (page, pageSize, totalCount)
- `VirtualTableConfig` - Configuration with validation (page sizes, cache limits)
- `VirtualTableCacheState` - Cache state snapshot (cachedCount, isLoading, etc.)

**Benefits:** Prevents mutation bugs, easier to reason about, testable.

---

## Implementation Slices

### Slice 1 (MVP): "User can load first page and scroll virtually"
**Goal:** Prove virtual scrolling works
**Files:** 8 new files (domain + infrastructure)
**Time:** ~2-3 hours
**Status:** Domain layer CAN BE IMPLEMENTED NOW (not blocked)

### Slice 2: "User sees background loading progress"
**Goal:** Background loading with progress indicator
**Files:** 2 new files
**Time:** ~1-2 hours
**Status:** BLOCKED by `feature/configuration-settings` (needs IConfigurationService)

### Slice 3: "User can search cached records instantly"
**Goal:** Client-side search within cache
**Files:** 2 new files
**Time:** ~1 hour

### Slice 4: "User can search server when term not in cache"
**Goal:** Server search fallback
**Files:** 1 modified file
**Time:** ~1 hour

### Slice 5: "User can sort virtualized columns"
**Goal:** Intelligent client/server sorting
**Files:** 1 modified file
**Time:** ~1 hour

**Total Implementation Time:** ~6-8 hours (all slices)

---

## Performance Targets

| Dataset Size | Target Load Time | Target Memory | Current (70k web resources) |
|--------------|------------------|---------------|-----------------------------|
| 1,000 records | < 500ms | < 50MB | ~10+ seconds, 500MB+ |
| 5,000 records | < 1s | < 100MB | N/A (not tested) |
| 10,000 records | < 2s | < 150MB | N/A (not tested) |
| 70,000 records | < 2s (first 100) | < 200MB (5k cached) | ~10+ seconds, 500MB+ |

**Expected Improvement:** 10x faster initial load, 60% less memory usage.

---

## Backward Compatibility

**100% backward compatible:**
- Existing panels continue using `DataTableSection`
- New panels opt-in to `VirtualDataTableSection`
- Same `DataTableConfig` interface
- No breaking changes to public APIs

**Migration per panel:** ~30 minutes
1. Replace `DataTableSection` with `VirtualDataTableSection`
2. Add `findPaginated()` and `getCount()` to repository
3. Use `VirtualTableCacheManager` in panel
4. Update `handleRefresh()` to use cache manager
5. Clear cache on environment change

---

## Dependencies

### External Dependencies (New)
- **@tanstack/virtual-core** - ~5KB gzipped, framework-agnostic virtual scrolling

### Internal Prerequisites
- **BLOCKED:** `feature/configuration-settings` (needs `IConfigurationService`)
  - Application and Infrastructure layers blocked
  - Domain layer CAN BE IMPLEMENTED NOW (zero dependencies)

- **Available Now:**
  - `IDataverseApiService` (API communication)
  - `ICancellationToken` (cancellation support)
  - `QueryOptions` interface (OData queries)
  - `ODataQueryBuilder` (OData query strings)
  - `PanelCoordinator` pattern (panel orchestration)

---

## Testing Strategy

### Domain Tests (100% coverage target)
- `PaginatedResult` - Validation, pagination logic, edge cases
- `VirtualTableConfig` - Validation, default values, constraints
- `VirtualTableCacheState` - State tracking, immutability, calculations

### Application Tests (90% coverage target)
- `VirtualTableCacheManager` - Orchestration, background loading, cancellation
- `SearchVirtualTableUseCase` - Client search, server fallback, edge cases

### Manual Testing
- **Scenario 1:** 70k records - instant initial load, smooth scrolling
- **Scenario 2:** Client-side search - instant results within cache
- **Scenario 3:** Server search fallback - finds records not in cache
- **Scenario 4:** Environment change - cache cleared, new data loaded
- **Scenario 5:** Column sorting - client/server intelligent routing

---

## Files Created/Modified

### New Files (8 for Slice 1)
```
src/shared/domain/
  interfaces/IVirtualTableDataProvider.ts
  valueObjects/PaginatedResult.ts
  valueObjects/VirtualTableConfig.ts
  valueObjects/VirtualTableCacheState.ts

src/shared/application/
  services/VirtualTableCacheManager.ts
  viewModels/VirtualTableViewModel.ts

src/shared/infrastructure/ui/
  sections/VirtualDataTableSection.ts
  views/virtualTableSectionView.ts

resources/webview/js/renderers/
  VirtualTableRenderer.js
```

### Modified Files (2)
```
src/features/webResources/infrastructure/repositories/
  DataverseWebResourceRepository.ts (add findPaginated, getCount)

src/features/webResources/presentation/panels/
  WebResourcesPanel.ts (use VirtualDataTableSection)
```

---

## Next Steps

1. **Review & Approval**
   - Human reviews design document
   - Approve or request changes

2. **Slice 1 Implementation** (CAN START NOW - not blocked)
   - Implement domain layer (IVirtualTableDataProvider, PaginatedResult, VirtualTableConfig, VirtualTableCacheState)
   - Write domain tests (100% coverage)
   - Commit domain layer

3. **Wait for Configuration Settings**
   - `feature/configuration-settings` branch merges
   - `IConfigurationService` available

4. **Slices 2-5 Implementation**
   - Implement application layer (VirtualTableCacheManager, SearchVirtualTableUseCase)
   - Implement infrastructure layer (VirtualDataTableSection, VirtualTableRenderer.js)
   - Update repositories (findPaginated, getCount)
   - Write application/infrastructure tests

5. **Panel Migrations**
   - Web Resources panel (critical - 70k records)
   - Plugin Trace Viewer (remove 100 limit)
   - Solutions panel (reported slow)
   - Import Jobs panel (reported slow)

6. **Performance Benchmarking**
   - Measure actual vs target performance
   - Optimize if needed

7. **Code Review & Merge**
   - `/code-review` - code-guardian approval
   - Update CHANGELOG.md
   - Create PR
   - Merge to main

---

## Questions?

**See full design:** [VIRTUAL_DATA_TABLE_DESIGN.md](./VIRTUAL_DATA_TABLE_DESIGN.md)

**Sections to review first:**
1. **Type Contracts** (pg 10-35) - All interfaces defined upfront
2. **Implementation Slices** (pg 5-7) - Vertical slicing breakdown
3. **Architecture Design** (pg 8-9) - Layer responsibilities
4. **Data Flow Diagrams** (pg 41-43) - How data flows through system
5. **Migration Guide** (pg 48-51) - How existing panels migrate

**Key trade-offs to consider:**
- Background loading complexity vs instant UX
- Memory footprint (5k cached records) vs full dataset access
- TanStack Virtual dependency vs custom implementation
- Immutable value objects (verbose) vs mutable state (simple)
