# Web Resources Panel - Task Tracking

**Branch:** `feature/web-resources`
**Created:** 2025-11-26
**Status:** Implementation (Slice 2 - Virtual Table & Pagination)

---

## Overview

**Goal:** Provide web resource browsing, editing, and sync capabilities within VS Code

**Discovery Findings:**
- Found: Existing `DataTableSection` shared by all panels - no pagination
- Found: All repositories use fetch-all-then-filter pattern (OData `@odata.nextLink` loop)
- Found: Plugin Trace limit hardcoded to 100 in `TraceFilter.ts:178`
- Found: No VS Code configuration infrastructure exists
- Will reuse: Existing panel patterns, scaffolding behavior, FileSystemProvider pattern
- Need to create: Virtual data table component, configuration system, server-side pagination

**Key Constraint:** User environment has **70,000 web resources** - current fetch-all approach is unusable

---

## Slice Status

| Slice | Description | Status |
|-------|-------------|--------|
| 1 | Browse & View (read-only) | ✅ Complete |
| 2 | Virtual Table & Pagination | 🔄 In Progress |
| 3 | Edit & Save | ⏳ Planned |
| 4 | Publish | ⏳ Planned |
| 5 | Enhanced UX | ⏳ Planned |

---

## Slice 1: Browse & View ✅ COMPLETE

- [x] Domain: WebResource entity, WebResourceType value object
- [x] Application: ListWebResourcesUseCase, GetWebResourceContentUseCase
- [x] Infrastructure: DataverseWebResourceRepository, WebResourceFileSystemProvider
- [x] Presentation: WebResourcesPanelComposed
- [x] Custom URI scheme: `ppds-webresource://`
- [x] Solution filtering
- [x] Text-based type filtering (excludes images by default)
- [x] 60-second content cache
- [x] Committed: `5346adc`

---

## Slice 2: Virtual Table & Pagination 🔄 IN PROGRESS

### Requirements

- [ ] Support 70k+ web resources without browser/memory issues
- [ ] Fast initial load (< 2 seconds for first page)
- [ ] Instant client-side search within cached records
- [ ] Configurable page sizes and cache limits
- [ ] Apply to Web Resources panel first, then migrate others

### Architecture Decisions (PENDING USER INPUT)

| Decision | Options | Recommendation | User Choice |
|----------|---------|----------------|-------------|
| Branch strategy | A) New `feature/configuration-settings` first, B) Build in current branch | A - Config is foundational | **TBD** |
| Initial page size | 50, 100, 250 | 100 | **TBD** |
| Max cache size | 1000, 5000, 10000 | 5000 | **TBD** |
| Beyond-cache search | Prompt user, Auto-search server, Show "not found" | Auto-search server | **TBD** |
| Other panels scope | Web Resources only vs include Solutions/Import Jobs | Include (user says they're slow) | **TBD** |

### Implementation Checklist

#### Configuration System (if Option A - separate branch first)
- [ ] Create `feature/configuration-settings` branch
- [ ] Add VS Code configuration contribution to `package.json`
- [ ] Create `IConfigurationService` in shared domain
- [ ] Implement `VSCodeConfigurationService` in infrastructure
- [ ] Settings: `defaultPageSize`, `maxCachedRecords`, `pluginTraceLimit`
- [ ] Unit tests
- [ ] Merge to main, pull into web-resources branch

#### Domain Layer
- [ ] `PaginatedResult<T>` value object (items, totalCount, hasMore, cursor)
- [ ] `TableConfiguration` value object (pageSize, maxCache, etc.)
- [ ] Update repository interfaces for pagination support
- [ ] Domain tests
- [ ] `npm run compile` passes
- [ ] Committed

#### Application Layer
- [ ] Update `ListWebResourcesUseCase` for paginated fetching
- [ ] Add `SearchWebResourcesUseCase` for server-side search (beyond cache)
- [ ] ViewModel updates for pagination state
- [ ] Mapper updates
- [ ] Application tests (90% target)
- [ ] `npm run compile` passes
- [ ] Committed

#### Infrastructure Layer
- [ ] Update `DataverseWebResourceRepository` with `$top`, `$skip` support
- [ ] Add server-side `$filter` for search
- [ ] Background caching service
- [ ] `npm run compile` passes
- [ ] Committed

#### Presentation Layer
- [ ] `VirtualDataTableSection` component (renders only visible rows)
- [ ] Virtual scrolling behavior (swap DOM elements on scroll)
- [ ] "Loading more..." indicator
- [ ] "X of Y loaded" status
- [ ] Search behavior (cache first, server fallback)
- [ ] `npm run compile` passes
- [ ] Committed

---

## Testing

- [ ] Unit tests pass: `npm test`
- [ ] Integration tests for virtual table
- [ ] Performance tests: 1k, 5k, 10k records render times
- [ ] E2E tests: `npm run e2e:smoke`
- [ ] Manual testing (F5) with 70k environment

### Bugs Found During Manual Testing

| Bug | Status | Notes |
|-----|--------|-------|
| | | |

---

## Review & Merge

- [ ] All implementation checkboxes complete
- [ ] All bugs from manual testing fixed
- [ ] `/code-review` - APPROVED
- [ ] CHANGELOG.md updated
- [ ] PR created
- [ ] CI passes

---

## Session Notes

### Session 1 (2025-11-26)
- Completed Slice 1 implementation (read-only browsing)
- Committed as `5346adc feat(web-resources): Add Web Resources panel with editor integration`

### Session 2 (2025-11-27)
- Deep analysis of data table architecture and performance
- Discovered: ALL panels fetch ALL records (no pagination anywhere)
- Discovered: Plugin trace 100 limit is hardcoded in `TraceFilter.ts:178`
- Discovered: No VS Code configuration system exists
- User confirmed: 70k web resources in their environment
- User confirmed: Solutions and Import Jobs are also slow
- User preference: Client-side filtering of cached data (not server round-trips)
- Merged latest from main (documentation audit release)
- Created this tracking document
- **BLOCKED:** Awaiting user decisions on architecture questions

### Next Session
- Get user decisions on architecture questions
- If Option A: Create configuration branch first
- If Option B: Proceed with implementation in current branch
- Design virtual table component (may need `/design` for this)
