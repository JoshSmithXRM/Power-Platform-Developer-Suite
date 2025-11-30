# Web Resources Panel - Task Tracking

**Branch:** `feature/web-resources`
**Created:** 2025-11-26
**Status:** Implementation Complete - Ready for Manual Testing & Review

---

## Overview

**Goal:** Provide web resource browsing, editing, and sync capabilities within VS Code

**Key Constraint:** User environment has **65,000+ web resources** in a single solution - requires virtual table with server-side search fallback

**What's Included in This PR:**
- Web Resources panel (browse, edit, save, publish)
- Virtual table infrastructure with 5k cache + server search fallback
- Publish: single resource, bulk publish all, and post-save notification
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
| 4 | Publish | ✅ Complete | Toolbar + notification + Publish All |
| 5 | Enhanced UX | ⏳ Deferred | Conflict detection, etc. - future PR |

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

## Slice 4: Publish ✅ COMPLETE

**Design Decision:** Option B + C + Publish All + Publish Solution

### Domain Layer
- [x] Add `publish(environmentId, webResourceId)` to `IWebResourceRepository`
- [x] Add `publishMultiple(environmentId, webResourceIds)` to `IWebResourceRepository`
- [x] Add `publishAll(environmentId)` to `IWebResourceRepository` (uses PublishAllXml)
- [x] Create `PublishWebResourceUseCase` with `execute()`, `executeMultiple()`, and `executeAll()`

### Infrastructure Layer
- [x] Implement `publish()` and `publishMultiple()` in `DataverseWebResourceRepository`
  - POST `/api/data/v9.2/PublishXml`
  - Body: `{ "ParameterXml": "<importexportxml><webresources><webresource>{guid}</webresource>...</webresources></importexportxml>" }`
- [x] Implement `publishAll()` in `DataverseWebResourceRepository`
  - POST `/api/data/v9.2/PublishAllXml` (no body - publishes ALL customizations)

### Presentation Layer
- [x] Add "Publish" toolbar button (publishes selected row, disabled when no selection)
- [x] Add "Publish Solution" toolbar button (publishes web resources in current solution, disabled when "All Web Resources")
- [x] Add "Publish All" toolbar button (uses PublishAllXml - publishes ALL customizations, not just web resources)
- [x] After save success in FileSystemProvider, show VS Code notification with "Publish" action button
- [x] Handle row selection via `rowSelect` command
- [x] Dynamic enable/disable of "Publish Solution" based on solution filter selection
- [x] Tests: PublishWebResourceUseCase (14 tests), repository publish (17 tests)
- [x] Total web resources tests: 322 (was 288)

---

## Slice 5: Enhanced UX ⏳ DEFERRED

Deferred to future PR - see "Future Work" section below.

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
- [x] E2E tests pass: `npm run e2e:smoke` (6/6)
- [ ] Manual testing (F5) with 65k+ web resources environment

### Bugs Found During Manual Testing

| Bug | Status | Notes |
|-----|--------|-------|
| Web resources not clickable | ✅ Fixed | Changed from `nameHtml` to `nameLink` CellLink structure |
| Publish buttons not working | ✅ Fixed | Added row selection to VirtualTableRenderer, fixed button state updates |
| "All Solutions" causing confusion | ✅ Fixed | Removed synthetic "All Solutions" option - Default Solution is the default |
| Virtual table only shows 16 rows | ✅ Fixed | Root cause: hardcoded 600px max. Fixed with CSS flexbox layout to fill available viewport |
| .js appended to all files | ✅ Fixed | Web resource name already includes extension - don't append again |
| Size shows 0 B for all rows | ✅ Fixed | Removed Size column - Dataverse doesn't expose file size without fetching content |
| No loading state when switching | ✅ Fixed | Added `showLoading` command to VirtualTableRenderer |

---

## Future Work (Not in This PR)

These items were identified during virtual table development but are deferred:

### Panel Migrations to Virtual Table
- [x] **Plugin Trace Viewer** - ~~Remove 100 record hardcoded limit~~ ALREADY DONE - configurable via `pluginTrace.defaultLimit` setting (1-5000)
- [ ] **Import Jobs** - Migrate to virtual table (separate session)

### Performance Benchmarks
- [ ] Create formal performance test suite (1k, 5k, 10k, 70k records)
- [ ] Document actual load times and memory usage

### Slice 5: Enhanced UX (Deferred)
- [ ] Conflict detection (check modifiedOn before save, warn if changed)
- [ ] Auto-refresh on external changes
- [ ] Diff view (local vs server)
- [ ] Keyboard shortcuts

---

## Review & Merge

- [x] All implementation checkboxes complete
- [ ] Manual testing complete (F5)
- [ ] All bugs from manual testing fixed
- [ ] `/code-review` - APPROVED
- [x] CHANGELOG.md updated
- [x] PR created: https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/pull/31
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
