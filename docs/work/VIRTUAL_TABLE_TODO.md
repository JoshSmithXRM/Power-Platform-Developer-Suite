# Virtual Data Table - Task Tracking

**Branch:** `feature/virtual-table`
**Created:** 2025-11-27
**Status:** Discovery | Requirements | Design Complete | **Implementation (Solutions Panel)** | Testing | Review | Complete
**Design Docs:** `docs/design/VIRTUAL_DATA_TABLE_*.md` (4 files created)

---

## Overview

**Goal:** Build a shared `VirtualDataTableSection` component that supports large datasets (70k+ records) via virtual scrolling, server-side pagination, and intelligent caching.

**Discovery Findings:**

### Current Implementation (Problems)
- `DataverseWebResourceRepository.findAll()` (`src/features/webResources/infrastructure/repositories/DataverseWebResourceRepository.ts:60-140`)
  - Loops through ALL `@odata.nextLink` pages before returning
  - No streaming/progressive loading
  - 70k records = many API calls blocking initial render

- `dataTableSectionView.ts` (`src/shared/infrastructure/ui/views/dataTableSectionView.ts:83-86`)
  - Renders ALL rows to HTML string: `data.map(row => renderTableRow(...))`
  - No virtualization - all rows in DOM

- `DataTableBehavior.js` (`resources/webview/js/behaviors/DataTableBehavior.js:60-67`)
  - Client-side search via `display: none` (all rows still in DOM)
  - Re-applies row striping to ALL rows on filter

- `dataTable.ts` (`src/shared/infrastructure/ui/views/dataTable.ts:484-494`)
  - `renderData()` regenerates full table HTML on every render
  - No partial updates

### Patterns to Reuse
- `DataTableConfig` interface (`src/shared/infrastructure/ui/DataTablePanel.ts`) - Column config
- `QueryOptions` interface (`src/shared/domain/interfaces/QueryOptions.ts`) - OData filtering
- `PanelCoordinator` pattern - Message handling between extension and webview
- `SectionCompositionBehavior` - Section composition in panels
- `ODataQueryBuilder` - Building OData queries

### New Code Required
1. **Domain Layer:**
   - `IVirtualTableDataProvider` - Interface for paginated data access
   - `PaginatedResult<T>` - Value object for paginated responses
   - `VirtualTableConfig` - Configuration value object

2. **Application Layer:**
   - `VirtualTableState` - State management (cached records, scroll position)
   - `VirtualTableViewModel` - Extends table view with pagination info

3. **Infrastructure Layer:**
   - `VirtualDataTableSection` - New section implementation
   - `VirtualTableRenderer.ts` - Webview-side virtual scrolling
   - Updates to repositories to support paginated queries

4. **Presentation Layer:**
   - CSS for virtual scrolling container
   - Loading indicators for background fetch

---

## Requirements

### Functional Requirements

- [ ] R1: Initial page load fetches first `pageSize` records (default: 100)
- [ ] R2: Background loading continues until `maxCachedRecords` (default: 5000)
- [ ] R3: Virtual scrolling renders only visible rows (~50-100 in DOM)
- [ ] R4: Client-side search filters cached records instantly
- [ ] R5: When search term not found in cache, query server with `$filter`
- [ ] R6: "X of Y loaded" status indicator shows progress
- [ ] R7: Configurable page sizes via `IConfigurationService`
- [ ] R8: Backward compatible - existing panels opt-in to new component
- [ ] R9: Column sorting works with virtualized data

### Non-Functional Requirements

- [ ] NF1: 70k records initial load < 2 seconds
- [ ] NF2: Smooth 60fps scrolling through large datasets
- [ ] NF3: No browser memory warnings at 70k records
- [ ] NF4: Search within cache < 100ms response
- [ ] NF5: Server search fallback shows loading indicator

**Success Criteria:**
- [ ] Web Resources panel loads 70k records without freezing
- [ ] Scrolling through 70k records is smooth (no jank)
- [ ] Search within cache feels instant
- [ ] Memory usage stays under browser limits
- [ ] All existing panel tests still pass (backward compatibility)

---

## Implementation Checklist

### Domain Layer (COMPLETE)
- [x] `IVirtualTableDataProvider<T>` interface
- [x] `PaginatedResult<T>` value object
- [x] `VirtualTableConfig` value object
- [x] `VirtualTableCacheState` value object (tracks cache state)
- [x] Unit tests (132 tests, 100% coverage)
- [x] `npm run compile` passes
- [x] Committed (36a3543)

### Application Layer (COMPLETE)
- [x] `VirtualTableCacheManager` - Cache state management with background loading
- [x] `VirtualTableViewModel` - Extended view model types
- [x] `src/shared/application/index.ts` - Re-exports for Clean Architecture
- [x] Unit tests (32 tests for VirtualTableCacheManager)
- [x] `npm run compile` passes

### Infrastructure Layer (COMPLETE)
- [x] `VirtualDataTableSection` implementation
- [x] `VirtualTableRenderer.js` (webview JS - virtual scrolling)
- [x] `virtualTableSectionView.ts` - HTML rendering with pagination footer
- [x] `SolutionDataProviderAdapter` - Adapts repository to IVirtualTableDataProvider
- [x] Repository updates: `ISolutionRepository.findPaginated()`, `getCount()`
- [x] `DataverseApiSolutionRepository` - Paginated queries (note: Dataverse doesn't support $skip for Solutions, loads all at once)
- [x] `npm run compile` passes

### Presentation Layer (COMPLETE)
- [x] Footer shows consistent format: "X records" or "X of Y records" (matches DataTable)
- [x] Loading indicator (⟳) during background loading
- [x] `SectionRenderData` updated with pagination property

### Panel Migrations
- [x] **Solutions panel** - Migrated (1,246 records) - COMPLETE
- [ ] Web Resources panel (critical - 70k records) - needs $skip support or fetchxml paging
- [ ] Plugin Trace Viewer (remove 100 limit)
- [ ] Import Jobs (reported slow)

### Deferred Work (Slice 3)
- [ ] Server-side search fallback - Query server when search term not in cache
- [ ] Needed for Web Resources (70k records > 5k cache)

---

## Testing

- [x] Unit tests pass: `npm test` (6,452 tests passing)
- [ ] Performance tests: 1k, 5k, 10k record benchmarks
- [x] Integration tests: SolutionExplorerPanelComposed updated for new architecture
- [x] E2E tests: Solutions search test created (`e2e/tests/integration/solutions-search.spec.ts`)
- [x] Manual testing (F5): Solutions load correctly, search works after build fix

### Performance Benchmarks

| Dataset Size | Target Load Time | Target Memory |
|--------------|------------------|---------------|
| 1,000 records | < 500ms | < 50MB |
| 5,000 records | < 1s | < 100MB |
| 10,000 records | < 2s | < 150MB |
| 70,000 records | < 2s (first page) | < 200MB |

### Bugs Found During Manual Testing

| Bug | Status | Notes |
|-----|--------|-------|
| Search not filtering Solutions table | **FIXED** | VirtualTableRenderer.js was not being built - missing from webpack.webview.config.js entry points. |
| `$count` endpoint returns number not object | FIXED | Changed to `$count=true&$top=1` query parameter approach |
| `$top=0` invalid in Dataverse | FIXED | Changed to `$top=1&$select=solutionid` |
| `$skip` not supported for Solutions entity | FIXED | Load all solutions in single request (1,246 records is acceptable) |
| Footer showed "X visible Y records" | FIXED | Changed to consistent "X records" / "X of Y records" format |

---

## Review & Merge

- [ ] All implementation checkboxes complete
- [ ] All bugs from manual testing fixed
- [ ] `/code-review` - APPROVED
- [ ] CHANGELOG.md updated
- [ ] PR created: `gh pr create`
- [ ] CI passes

---

## Cleanup (After Merge)

- [ ] Design doc: Extract patterns OR delete
- [ ] This tracking doc: Delete (`git rm`)
- [ ] Related documentation updated
- [ ] Remove `docs/future/INFRASTRUCTURE.md` virtual table section (implemented)

---

## Technical Decisions

### Virtual Scrolling Approach
- Use TanStack Virtual core (`@tanstack/virtual-core`) for vanilla JS
- Requires manual setup of `observeElementRect`, `observeElementOffset`
- Reference: https://github.com/TanStack/virtual/discussions/455

### Cache Strategy
- In-memory cache up to `maxCachedRecords`
- LRU eviction when cache exceeds limit (future enhancement)
- Cache keyed by environment + entity type

### Search Behavior
1. User types in search box
2. Filter cached records (instant)
3. If 0 results AND more records on server: auto-search server
4. Show "Searching server..." indicator
5. Replace cache with server results

---

## Dependencies

### Waiting For
- ~~`feature/configuration-settings` branch to merge~~ - MERGED ✓

### Blocking
- `feature/web-resources` - Needs virtual table for 70k records (requires server-side search fallback)
- `feature/data-explorer` - Benefits from virtual scrolling

---

## Session Notes

### Session 1 (2025-11-27) - Discovery & Requirements
- Completed Discovery phase
- Analyzed current DataTableSection, DataTableBehavior, repositories
- Found all data loaded synchronously, all rows rendered to DOM
- Researched TanStack Virtual for vanilla JS implementation
- Documented requirements and success criteria

### Session 2 (2025-11-27) - Design Complete
- Created comprehensive technical design document (VIRTUAL_DATA_TABLE_DESIGN.md)
- Created executive summary (VIRTUAL_DATA_TABLE_SUMMARY.md)
- Created architecture diagrams (VIRTUAL_DATA_TABLE_DIAGRAMS.md)
- Created quick reference card (VIRTUAL_DATA_TABLE_QUICK_REF.md)
- Defined all type contracts upfront (domain, application, infrastructure, presentation)
- Designed 5 implementation slices (MVP → full feature)
- Identified performance targets (10x faster, 95% less memory)
- **Key Decision:** Domain layer CAN be implemented NOW (not blocked)
- **Next:** Get design approval, start domain layer implementation (Slice 1)

### Session 3 (2025-11-27) - Domain Layer Implementation
- Reset branch to origin/main (removed stale web-resources commits)
- Committed design documents (2db83d0)
- Implemented domain layer:
  - `IVirtualTableDataProvider<T>` interface
  - `PaginatedResult<T>` value object with pagination logic
  - `VirtualTableConfig` value object with validation
  - `VirtualTableCacheState` value object with immutable updates
- Wrote 132 tests with 100% coverage
- Committed domain layer (36a3543)
- **Status:** Domain layer COMPLETE

### Session 4 (2025-11-27) - Application & Infrastructure Layers
- Merged `feature/configuration-settings` from origin/main
- Implemented Application layer:
  - `VirtualTableCacheManager` - Background loading, cache management, state callbacks
  - `VirtualTableViewModel` types
  - 32 unit tests for VirtualTableCacheManager
- Implemented Infrastructure layer:
  - `VirtualDataTableSection` component
  - `virtualTableSectionView.ts` HTML rendering
  - `VirtualTableRenderer.js` webview virtual scrolling
- Discussed cache size strategy: 5k cache suitable for Solutions (~1200), needs server fallback for Web Resources (70k)
- **Decision:** Test on Solutions panel first before implementing Web Resources

### Session 5 (2025-11-27) - Solutions Panel Migration & Bug Fixes
- Migrated Solutions panel to use virtual table:
  - Added `findPaginated()` and `getCount()` to `ISolutionRepository`
  - Implemented in `DataverseApiSolutionRepository`
  - Created `SolutionDataProviderAdapter` to bind environmentId
  - Updated `SolutionExplorerPanelComposed` to use `VirtualTableCacheManager`
  - Updated integration tests for new repository-based architecture
- Fixed multiple Dataverse API issues:
  - `$count` endpoint returns raw number → use `$count=true` query param
  - `$top=0` invalid → use `$top=1&$select=solutionid`
  - `$skip` not supported for Solutions → load all at once (acceptable for 1,246 records)
- Fixed footer inconsistency:
  - Changed from "X visible Y records" to "X records" / "X of Y records"
  - Updated both `virtualTableSectionView.ts` and `VirtualTableRenderer.js`
- **Bug Found:** Search not filtering Solutions table
  - Search works on regular DataTable panels (Import Jobs)
  - VirtualTableRenderer.js search handler not triggering
  - **Next:** Add E2E Playwright test to debug
- **Status:** Solutions panel loads 1,246 records, footer consistent, search broken

### Session 6 (2025-11-27) - Search Bug Fixed
- **Root Cause Found:** `VirtualTableRenderer.js` was missing from webpack entry points
  - File existed at `resources/webview/js/renderers/VirtualTableRenderer.js`
  - Panel was loading from `dist/webview/VirtualTableRenderer.js` (didn't exist)
  - Added entry to `webpack.webview.config.js` → file now builds correctly
- Created E2E test for Solutions search (`e2e/tests/integration/solutions-search.spec.ts`)
  - Tests search input filters solutions
  - Tests footer shows "X of Y records" when filtered
  - Tests clearing search restores all records
  - Tests empty state when no matches
  - Tests VirtualTableRenderer.js initialization
- **Status:** Solutions panel search works correctly
- **Remaining Work:**
  - Web Resources panel migration (needs server-side search for 70k records)
  - Performance tests with real benchmarks
  - Code review and merge

### Session 7 (2025-11-27) - Data Table Consistency Pattern Design
- **Issue Identified:** Virtual table columns resize during scroll (Solutions), text wraps in regular tables (Import Jobs "Created By")
- **Root Cause:** Virtual tables use `width: max-content` which recalculates based on visible rows only
- **Solution Designed:** Data-Driven Column Width Pattern
  - Calculate optimal widths from ALL data (not just visible)
  - Lock widths after calculation
  - Use `table-layout: fixed` + `white-space: nowrap` for consistency
  - Add tooltips for truncated content
- **Design Documents Created:**
  - `docs/design/DATA_TABLE_CONSISTENCY_DESIGN.md` - Full technical design
  - `docs/architecture/DATA_TABLE_PATTERN.md` - Pattern documentation for ongoing reference
- **Scope:** ALL panels (mandatory pattern, not optional)
- **Status:** Design complete, ready for implementation

### Next Steps
1. Commit design documents
2. Implement ColumnWidthCalculator utility
3. Update CSS for table consistency
4. Update Solutions panel with column types
5. Update Import Jobs panel with column types
6. Update remaining panels
7. Test across all panels
8. Code review and merge
