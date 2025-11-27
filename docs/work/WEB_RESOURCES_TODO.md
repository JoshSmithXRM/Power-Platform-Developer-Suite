# Web Resources Panel - Task Tracking

**Branch:** `feature/web-resources`
**Created:** 2025-11-26
**Status:** Blocked (waiting on `feature/virtual-table`)

---

## Overview

**Goal:** Provide web resource browsing, editing, and sync capabilities within VS Code

**Discovery Findings:**
- Found: Existing `DataTableSection` shared by all panels - no pagination
- Found: All repositories use fetch-all-then-filter pattern (OData `@odata.nextLink` loop)
- Found: Plugin Trace limit hardcoded to 100 in `TraceFilter.ts:178`
- Found: No VS Code configuration infrastructure exists
- Will reuse: Existing panel patterns, scaffolding behavior, FileSystemProvider pattern
- Need to create: ~~Virtual data table component~~ (moved to `feature/virtual-table`)

**Key Constraint:** User environment has **70,000 web resources** - current fetch-all approach is unusable

---

## Dependencies

```
feature/configuration-settings (in progress - parallel branch)
    ↓
feature/virtual-table (in progress - parallel branch)
    ↓
feature/web-resources (this branch - adopts virtual table for Slice 2)
```

---

## Slice Status

| Slice | Description | Status | Notes |
|-------|-------------|--------|-------|
| 1 | Browse & View (read-only) | ✅ Complete | Works but unusable at 70k scale |
| 2 | Adopt Virtual Table | ⏳ Blocked | Waiting on `feature/virtual-table` |
| 3 | Edit & Save | ⏳ Planned | Design after Slice 2 |
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

## Slice 2: Adopt Virtual Table ⏳ BLOCKED

**Blocked by:** `feature/virtual-table` branch

Once virtual table merges to main:
- [ ] Pull virtual table into this branch
- [ ] Update `WebResourcesPanelComposed` to use `VirtualDataTableSection`
- [ ] Update `ListWebResourcesUseCase` for paginated repository
- [ ] Test with 70k environment
- [ ] Committed

---

## Slice 3: Edit & Save ⏳ PLANNED

**Prerequisites:** Slice 2 complete (users need to find files before editing)

- [ ] Design document created
- [ ] Update `WebResourceFileSystemProvider.writeFile()` (currently throws read-only)
- [ ] Create `UpdateWebResourceUseCase`
- [ ] Add save-to-Dynamics functionality
- [ ] Dirty indicator in editor
- [ ] Error handling for save failures
- [ ] Tests
- [ ] Committed

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

- [ ] Unit tests pass: `npm test`
- [ ] Integration tests for panel
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
- Created tracking document
- **Decision:** Split pagination/virtual table to separate branch (`feature/virtual-table`)
- **Decision:** Split configuration to separate branch (`feature/configuration-settings`)
- Updated this tracking doc to reflect new dependency chain
- **Current status:** Blocked on dependencies, working on design doc cleanup
