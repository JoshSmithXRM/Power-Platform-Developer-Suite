# Data Explorer - Session Work Tracking

**Branch:** `feature/data-explorer-phase-2`
**Status:** Slice 3 - FetchXML Direct Editing

---

## Slice Progress Overview

| Slice | Goal | Status |
|-------|------|--------|
| Slice 1 (MVP) | Execute simple SQL query | ✅ Complete |
| Slice 2 | Export results to CSV | ✅ Complete |
| **Slice 3** | Edit FetchXML directly | 🔄 In Progress |
| Slice 4 | Pagination (paging cookies) | ⏳ Post-MVP |

---

## Slice 3: FetchXML Direct Editing

**Goal:** User can edit FetchXML directly and execute, with bidirectional SQL ↔ FetchXML translation.

### Domain Layer
- [ ] `FetchXmlValidator` domain service - validates FetchXML syntax
- [ ] `FetchXmlToSqlTranspiler` domain service - reverse transpilation with warnings
- [ ] Unit tests for FetchXmlValidator (target: 100%)
- [ ] Unit tests for FetchXmlToSqlTranspiler (target: 100%)
- [ ] `npm run compile` passes
- [ ] Committed

### Application Layer
- [ ] `ExecuteFetchXmlQueryUseCase` - executes raw FetchXML queries
- [ ] Update `ExecuteSqlQueryUseCase` with `transpileToFetchXml()` method (if not already)
- [ ] Unit tests (target: 90%)
- [ ] `npm run compile` passes
- [ ] Committed

### Presentation Layer
- [ ] Mode toggle UI: SQL ↔ FetchXML tabs
- [ ] FetchXML editor (editable when in FetchXML mode)
- [ ] SQL preview (read-only when in FetchXML mode)
- [ ] Warning banner for unsupported FetchXML features during reverse transpilation
- [ ] `npm run compile` passes
- [ ] Committed

### Testing
- [ ] Unit tests pass: `npm test`
- [ ] E2E tests: Mode switching, FetchXML execution
- [ ] Manual testing (F5): Full workflow test

### Bugs Found During Manual Testing
| Bug | Status | Notes |
|-----|--------|-------|
| | | |

---

## Completed Work (Phase 2)

### Slice 1 (MVP) - Complete ✅
- SQL query execution with FetchXML preview
- Sortable results table
- Status bar with row count and timing
- Keyboard shortcut (Ctrl+Enter)
- Clickable record links (lookups + primary keys)
- Copy record URL on hover

### Slice 2 (CSV Export) - Complete ✅
- Export CSV button in toolbar
- CsvExportService shared infrastructure
- RFC 4180 compliant CSV formatting
- Plugin Traces refactored to use shared service

### Bug Fixes (Phase 2) - Complete ✅
- Link-entity columns not appearing
- Missing OData annotations
- Entity type "unknown"
- Empty results state
- Stacked columns bug
- Duplicate query execution
- Export CSV button loading state
- Status bar positioning
- FetchXML preview background

### E2E Tests - Complete ✅
- Data Explorer integration tests
- Plugin Trace Viewer E2E tests
- WebviewHelper fixes

---

## Technical Notes

### FetchXML Editing Architecture (Slice 3)

**Mode Toggle Behavior:**
1. **SQL → FetchXML:** Current SQL transpiled to FetchXML, FetchXML becomes editable
2. **FetchXML → SQL:** FetchXML reverse-transpiled to SQL with warnings for unsupported features

**Warning UX:**
- Warnings are non-blocking (user can still execute)
- Warning banner shows above editor, collapsible
- Warning clears when user modifies query

**Key Files:**
- `src/features/dataExplorer/domain/services/FetchXmlValidator.ts` - NEW
- `src/features/dataExplorer/domain/services/FetchXmlToSqlTranspiler.ts` - NEW
- `src/features/dataExplorer/application/useCases/ExecuteFetchXmlQueryUseCase.ts` - NEW
- `src/features/dataExplorer/presentation/panels/DataExplorerPanelComposed.ts` - UPDATE
- `resources/webview/js/behaviors/DataExplorerBehavior.js` - UPDATE

---

## Session Notes

### Session: 2025-11-27
- Completed documentation audit
- Fixed docs/README.md broken TECHNICAL_DEBT.md reference
- Updated CHANGELOG.md [Unreleased] with Phase 2 changes
- Restructured TODO for Slice 3 tracking
- Ready to begin Slice 3 implementation
