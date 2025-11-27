# Web Resources Panel - Task Tracking

**Branch:** `feature/web-resources`
**Created:** 2025-11-26
**Status:** Implementation Complete - Ready for Manual Testing & Review

---

## Overview

**Goal:** Provide web resource browsing, editing, and sync capabilities within VS Code

**Key Constraint:** User environment has **65,000+ web resources** in a single solution - requires virtual table with server-side search fallback

**What's Included in This PR:**
- Web Resources panel (browse, edit, save)
- Virtual table infrastructure with 5k cache + server search fallback
- All virtual table work from merged `feature/virtual-table` branch

---

## Dependencies

```
feature/configuration-settings ✅ MERGED
    ↓
feature/virtual-table ✅ MERGED
    ↓
feature/web-resources (this branch - completes virtual table + web resources)
```

---

## Slice Status

| Slice | Description | Status | Notes |
|-------|-------------|--------|-------|
| 1 | Browse & View (read-only) | ✅ Complete | Works but unusable at 70k scale |
| 2 | Adopt Virtual Table | ✅ Complete | 5k cache + server search fallback |
| 3 | Edit & Save | ✅ Complete | Ctrl+S saves to Dataverse |
| 4 | Publish | ⏳ Planned | |
| 5 | Enhanced UX | ⏳ Planned | |

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

## Slice 2: Adopt Virtual Table ✅ COMPLETE

**Status:** Virtual table with server-side search fallback fully implemented

### Infrastructure (Virtual Table Slice 4)
- [x] Pull virtual table from main (merged)
- [x] `SearchVirtualTableUseCase` - client-cache + server fallback orchestration
- [x] Add `findPaginated()` and `getCount()` to `IWebResourceRepository`
- [x] Implement paginated queries in `DataverseWebResourceRepository`
- [x] Create `WebResourceDataProviderAdapter`
- [x] Unit tests for SearchVirtualTableUseCase (26 tests)

### UI Integration
- [x] Update `VirtualTableRenderer.js` for server search flow:
  - [x] Notify backend when search yields 0 results and cache not full
  - [x] Show "Searching server..." indicator
  - [x] Handle server search results
- [x] Update `WebResourcesPanelComposed`:
  - [x] Change from `DataTableSection` to `VirtualDataTableSection`
  - [x] Create `VirtualTableCacheManager` with adapter
  - [x] Create `SearchVirtualTableUseCase` instance
  - [x] Handle `searchServer` messages from webview
  - [x] Wire up OData filter builder for web resources
  - [x] Background cache loading with state updates
- [x] All tests pass (6,800 total)

### Remaining
- [ ] Manual test with 65k+ web resources environment (F5)
- [ ] Committed

---

## Slice 3: Edit & Save ✅ COMPLETE

**Implementation:**
- [x] Domain: Added `updateContent()` to `IWebResourceRepository`
- [x] Application: Created `UpdateWebResourceUseCase` with validation
- [x] Infrastructure: Implemented `updateContent()` in `DataverseWebResourceRepository`
- [x] Infrastructure: Implemented `writeFile()` in `WebResourceFileSystemProvider`
- [x] Business rule: Managed web resources cannot be edited
- [x] Business rule: Non-text-based types (PNG, JPG, etc.) cannot be edited
- [x] Cache updated after save
- [x] `onDidChangeFile` event fired after save
- [x] Error handling for save failures
- [x] Tests for UpdateWebResourceUseCase (21 tests)
- [x] Tests for repository updateContent (7 tests)
- [x] Tests for FileSystemProvider writeFile (5 tests)
- [x] Total web resources tests: 288 (was 255)

---

## Slice 4: Publish ⏳ PLANNED

- [ ] Create `PublishWebResourceUseCase`
- [ ] Call Dataverse `PublishXml` action
- [ ] UI for publish button/command
- [ ] Batch publish support
- [ ] Tests
- [ ] Committed

---

## Slice 5: Enhanced UX ⏳ PLANNED

- [ ] Conflict detection (modified by another user)
- [ ] Auto-refresh on external changes
- [ ] Diff view (local vs server)
- [ ] Keyboard shortcuts
- [ ] Tests
- [ ] Committed

---

## Current Work (While Blocked)

### Immediate Tasks
- [x] Clean up design doc (extract patterns, trim future ideas)
- [x] Move future slice ideas to `docs/future/DEVELOPMENT_TOOLS.md`
- [x] Run technical debt check on Slice 1 implementation
- [x] Add WebResourceTypeFormatter tests (14 tests)
- [x] Add DataverseWebResourceRepository tests (17 tests)

### Design Doc Cleanup ✅ COMPLETE
- [x] Trimmed `WEB_RESOURCES_PANEL_DESIGN.md` from 1934 → 148 lines
- [x] Moved Slices 3-5 details to `docs/future/DEVELOPMENT_TOOLS.md`
- [x] Kept key architectural decisions (FileSystemProvider, URI scheme, caching)
- [x] Updated status to reflect current blocked state

---

## Testing

- [x] Unit tests pass: `npm test` (6,800 tests)
- [x] Lint passes: `npm run lint:all`
- [x] Build passes: `npm run compile`
- [ ] Manual testing (F5) with 65k+ web resources environment
- [ ] E2E tests: `npm run e2e:smoke`

### Bugs Found During Manual Testing

| Bug | Status | Notes |
|-----|--------|-------|
| | | |

---

## Future Work (Not in This PR)

These items were identified during virtual table development but are deferred:

### Panel Migrations to Virtual Table
- [ ] **Plugin Trace Viewer** - Remove 100 record hardcoded limit (`TraceFilter.ts:178`)
- [ ] **Import Jobs** - Reported slow with large datasets

### Performance Benchmarks
- [ ] Create formal performance test suite (1k, 5k, 10k, 70k records)
- [ ] Document actual load times and memory usage

---

## Review & Merge

- [x] All implementation checkboxes complete
- [ ] Manual testing complete (F5)
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
- Created tracking document
- **Decision:** Split pagination/virtual table to separate branch (`feature/virtual-table`)
- **Decision:** Split configuration to separate branch (`feature/configuration-settings`)
- Updated this tracking doc to reflect new dependency chain
- Created worktrees for parallel development:
  - `C:\VS\Power-Platform-Developer-Suite-configuration` → `feature/configuration-settings`
  - `C:\VS\Power-Platform-Developer-Suite-virtual-table` → `feature/virtual-table`
- Design doc cleanup:
  - Trimmed `WEB_RESOURCES_PANEL_DESIGN.md` from 1934 → 148 lines
  - Moved Slices 3-5 details to `docs/future/DEVELOPMENT_TOOLS.md`
  - Committed: `81467ac`
- Technical debt resolution:
  - Added WebResourceTypeFormatter tests (14 tests)
  - Added DataverseWebResourceRepository tests (17 tests)
  - Total web resources tests now: 255
  - Committed: `bcd6af8`
- **Current status:** All cleanup complete. Branch blocked on `feature/virtual-table`

### Session 3 (2025-11-27)
- Implemented Slice 3: Edit & Save functionality
- Added `updateContent()` to `IWebResourceRepository` interface
- Implemented `updateContent()` in `DataverseWebResourceRepository` (PATCH to webresourceset)
- Created `UpdateWebResourceUseCase` with business rule validation
- Updated `WebResourceFileSystemProvider` to support write operations
- Business rules enforced:
  - Managed web resources throw `ManagedWebResourceError`
  - Non-text-based types (PNG, JPG, GIF, ICO, XAP) cannot be edited
  - SVG is editable (it's text-based XML)
- Cache is updated after successful save
- `onDidChangeFile` event fired for VS Code to detect changes
- Removed `isReadonly: true` from FileSystemProvider registration
- Added 33 new tests (288 total for web resources feature)
- **Current status:** Slice 3 complete. Ready for manual testing (F5)

### Session 4 (2025-11-27)
- Merged configuration settings and virtual table changes from main
- User reported 65k web resources in a SINGLE solution - 5k cache insufficient
- Decision: Implement Virtual Table Slice 4 (server-side search fallback) on this branch
- Implemented shared infrastructure for server-side search:
  - Created `SearchVirtualTableUseCase` in `src/shared/application/useCases/`
  - Added `findPaginated()` and `getCount()` to `IWebResourceRepository`
  - Implemented paginated queries in `DataverseWebResourceRepository` (supports OData $skip)
  - Created `WebResourceDataProviderAdapter` for VirtualTableCacheManager binding
  - Added 26 tests for SearchVirtualTableUseCase
- All tests pass (6,826 total)
- **Current status:** Server search infrastructure complete. Panel integration pending.

### Session 5 (2025-11-27)
- Completed Slice 2 panel integration:
  - Updated `VirtualTableRenderer.js` with server search flow (triggerServerSearch, showServerSearchIndicator, handleServerSearchResults)
  - Updated `WebResourcesPanelComposed` to use virtual table architecture:
    - Changed from `DataTableSection` to `VirtualDataTableSection`
    - Added `VirtualTableCacheManager<WebResource>` and `SearchVirtualTableUseCase<WebResource>`
    - Implemented `initializeVirtualTable()` for environment-specific setup
    - Added `searchServer` command handler for server-side search
    - Added `updateVirtualTableData()` for background cache loading updates
    - OData filter builder: `contains(name,'...') or contains(displayname,'...')`
  - Updated `initializeWebResources.ts` to pass `webResourceRepository` to panel
  - Fixed type issues: `PaginatedResult.getItems()`, `SearchResult.results`, `VirtualTableCacheState` getters
- All tests pass (6,800 total)
- **Current status:** Slice 2 complete. Ready for manual testing (F5) with 65k environment.
