# Data Explorer - Session Work Tracking

**Branch:** `feature/data-explorer-phase-2`
**Status:** Slice 3 - FetchXML Direct Editing

---

## Slice Progress Overview

| Slice | Goal | Status |
|-------|------|--------|
| Slice 1 (MVP) | Execute simple SQL query | ✅ Complete |
| Slice 2 | Export results to CSV | ✅ Complete |
| Slice 3 | Edit FetchXML directly | ✅ Complete (pending manual test) |
| Slice 4 | Pagination (paging cookies) | ⏳ Post-MVP |

---

## Slice 3: FetchXML Direct Editing

**Goal:** User can edit FetchXML directly and execute, with bidirectional SQL ↔ FetchXML translation.

### Domain Layer ✅
- [x] `FetchXmlValidator` domain service - validates FetchXML syntax (32 tests)
- [x] `FetchXmlToSqlTranspiler` domain service - reverse transpilation with warnings (33 tests)
- [x] Unit tests for FetchXmlValidator (100% coverage)
- [x] Unit tests for FetchXmlToSqlTranspiler (100% coverage)
- [x] `npm run compile` passes
- [x] Committed: `301186a`

### Application Layer ✅
- [x] `FetchXmlValidationError` domain error
- [x] `ExecuteFetchXmlQueryUseCase` - validates and executes raw FetchXML queries
- [x] `transpileToSql()` and `validate()` methods for live preview
- [x] Unit tests (20 tests for use case, 12 for error)
- [x] `npm run compile` passes
- [x] Committed: `78f8384`

### Presentation Layer ✅
- [x] Mode toggle UI: SQL ↔ FetchXML tabs
- [x] FetchXML editor (editable when in FetchXML mode) with syntax highlighting
- [x] SQL preview (read-only when in FetchXML mode)
- [x] Warning banner for unsupported FetchXML features
- [x] Query mode persistence (SQL, FetchXML, mode all saved per environment)
- [x] `npm run compile` passes
- [x] Committed: `b3b2afc`

### Testing
- [x] Unit tests pass: `npm test` (6,955 tests passing)
- [ ] E2E tests: Mode switching, FetchXML execution (optional)
- [x] Manual testing (F5): Bug fixes verified
- [ ] Final manual test pass after bug fixes

### Bugs Found During Manual Testing
| Bug | Status | Notes |
|-----|--------|-------|
| Column headers have extra formatting applied | ✅ Fixed | Use logical name as-is when no display name |
| Extra OData annotation fields showing in results | ✅ Fixed | Filter `@Microsoft.Dynamics.CRM.` annotations |
| FetchXML tab shows table only, no editor | ✅ Fixed | Render both panels with content, toggle visibility |
| Export CSV button stays spinning after export | ✅ Fixed | Added defensive spinner removal in messaging.js |
| Lookup values showing raw JSON vs display name | ✅ Fixed | Fall back to ID when name missing (owninguser case) |

### Bug Fix Details

**Bug 1 - Column Headers:** `QueryResultViewModelMapper.toHeaderText()` now returns logical name as-is instead of applying title-case formatting.

**Bug 2 - OData Annotations:** Added filter in `DataverseDataExplorerQueryRepository` to skip keys containing `@Microsoft.Dynamics.CRM.` or `@OData.Community.Display.` in both `extractColumnsFromRecord()` and `mapRecordToRow()`.

**Bug 3 - FetchXML Editor:** Refactored `queryEditorView.ts` to always render both SQL and FetchXML panels with full content. The inactive panel is hidden but its elements exist for JavaScript event wiring.

**Bug 4 - Export CSV Spinner:** Added defensive logic in `messaging.js` to remove spinner element even if original content wasn't saved (can happen if panel refreshes during export).

**Bug 5 - Lookup JSON Display:**
- Root cause: Dataverse returns `@OData.Community.Display.V1.FormattedValue` for some lookups but NOT for system-computed fields like `owninguser`
- `owninguser` is derived from `ownerid` when owner is a user (vs team), and doesn't get full OData annotation support
- Fix: `QueryResultViewModelMapper.toDisplayString()` now falls back to ID when lookup has `entityType` but no `name`

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

### Session: 2025-11-27 (continued)
**Slice 3 Implementation Complete**

Domain Layer:
- `FetchXmlValidator` - string-based XML validation (32 tests)
- `FetchXmlToSqlTranspiler` - reverse transpilation with warnings (33 tests)

Application Layer:
- `FetchXmlValidationError` - domain error with formatted output
- `ExecuteFetchXmlQueryUseCase` - validate + execute (20 tests)

Presentation Layer:
- Mode toggle tabs (SQL / FetchXML)
- FetchXML editor with syntax highlighting
- SQL preview panel
- Warnings banner for unsupported features
- State persistence per environment

Commits:
- `301186a` - Domain services
- `78f8384` - Application use case
- `b3b2afc` - Presentation layer

**Next:** Manual testing with F5

### Session: 2025-11-27 (earlier)
- Completed documentation audit
- Fixed docs/README.md broken TECHNICAL_DEBT.md reference
- Updated CHANGELOG.md [Unreleased] with Phase 2 changes
- Restructured TODO for Slice 3 tracking
- Ready to begin Slice 3 implementation
