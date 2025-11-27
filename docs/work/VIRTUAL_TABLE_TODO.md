# Virtual Data Table - Task Tracking

**Branch:** `feature/virtual-table`
**Created:** 2025-11-27
**Status:** Discovery | Requirements | **Design Complete** | Implementation (Domain Ready) | Testing | Review | Complete
**Blocked by:** `feature/configuration-settings` (needs `IConfigurationService` for Application/Infrastructure layers)
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

### Domain Layer (CAN IMPLEMENT NOW)
- [ ] `IVirtualTableDataProvider<T>` interface
- [ ] `PaginatedResult<T>` value object
- [ ] `VirtualTableConfig` value object
- [ ] `IVirtualTableCache<T>` interface
- [ ] Unit tests (target: 100%)
- [ ] `npm run compile` passes
- [ ] Committed

### Application Layer (BLOCKED - needs IConfigurationService)
- [ ] `VirtualTableCacheManager` - Cache state management
- [ ] `VirtualTableViewModel` - Extended view model
- [ ] Unit tests (target: 90%)
- [ ] `npm run compile` passes
- [ ] Committed

### Infrastructure Layer (BLOCKED - needs IConfigurationService)
- [ ] `VirtualDataTableSection` implementation
- [ ] `VirtualTableRenderer.ts` (webview JS)
- [ ] `VirtualTableCache` implementation
- [ ] Repository updates for paginated queries
- [ ] `npm run compile` passes
- [ ] Committed

### Presentation Layer (BLOCKED - needs Infrastructure)
- [ ] Virtual table CSS styles
- [ ] Loading indicator styles
- [ ] Panel migration guide/examples
- [ ] `npm run compile` passes
- [ ] Committed

### Panel Migrations (After Infrastructure Complete)
- [ ] Web Resources panel (critical - 70k records)
- [ ] Plugin Trace Viewer (remove 100 limit)
- [ ] Solutions (reported slow)
- [ ] Import Jobs (reported slow)

---

## Testing

- [ ] Unit tests pass: `npm test`
- [ ] Performance tests: 1k, 5k, 10k record benchmarks
- [ ] Integration tests: VirtualDataTableSection with mock data
- [ ] E2E tests: Virtual scrolling in webview
- [ ] Manual testing (F5): Complete

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
- `feature/configuration-settings` branch to merge:
  - `IConfigurationService` interface
  - `ppds.table.defaultPageSize` setting (default: 100)
  - `ppds.table.maxCachedRecords` setting (default: 5000)

### Blocking
- `feature/web-resources` - Needs virtual table for 70k records
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
