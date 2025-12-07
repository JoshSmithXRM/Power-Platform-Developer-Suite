# Bug Fixes Batch - Task Tracking

**Branch:** `feature/finish-data-explorer-web-resources-metadata`
**Created:** 2025-12-06
**Status:** 5 of 5 Bugs Fixed ✅

---

## Overview

**Goal:** Fix 5 reported bugs across multiple panels with regression tests for each.

---

## Bug Status Summary

| # | Bug | Panel | Severity | Status |
|---|-----|-------|----------|--------|
| 1 | Unable to select text | Persistence Inspector | Low | ✅ FIXED |
| 2 | Ctrl+A not working in filter inputs | Plugin Trace Viewer | Medium | ✅ FIXED |
| 3 | Broken import XML links | Import Job Viewer | High | ✅ FIXED |
| 4 | Infinite loading spinner | Connection Refs / Env Vars | Medium | ✅ FIXED |
| 5 | Alias breaks data AND links | Data Explorer / Notebooks | **Critical** | ✅ FIXED |

---

## ✅ Bug #1: Persistence Inspector - Cannot Select Text (FIXED)

**Root Cause:** CSS `user-select: none` on `.tree-header` blocked all text selection.

**Fix:** Moved `user-select: none` from `.tree-header` to `.tree-toggle` only.

**File:** `resources/webview/css/features/persistence-inspector.css`

---

## ✅ Bug #2: Plugin Trace Viewer - Ctrl+A Not Working (FIXED)

**Root Cause:** VS Code intercepts keyboard shortcuts before they reach webview inputs.

**Fix:** Added `setupKeyboardShortcuts()` with `stopPropagation()` for Ctrl+A/C/V/X in input fields.

**File:** `resources/webview/js/behaviors/PluginTraceViewerBehavior.js`

---

## ✅ Bug #3: Import Job Viewer - Cannot Open Import XML Links (FIXED)

**Root Cause:** ViewModel structure mismatch. The mapper provided `solutionNameHtml` (raw HTML string) but `VirtualTableRenderer` expects `solutionNameLink` (structured `CellLink` data). The renderer checks for `col.key + 'Link'` pattern and falls back to plain text if not found.

**Fix:** Updated `ImportJobViewModelMapper` to use `CellLink` pattern instead of HTML string:
- Changed `solutionNameHtml: '<a ...>'` → `solutionNameLink: { command, commandData, className }`
- Updated `ImportJobViewModel` interface to use `CellLink` type
- The existing behavior click handler (`data-id`) works with `CellLink.commandData.id`

**Files Changed:**
- `src/features/importJobViewer/application/viewModels/ImportJobViewModel.ts`
- `src/features/importJobViewer/application/mappers/ImportJobViewModelMapper.ts`
- `src/features/importJobViewer/application/mappers/ImportJobViewModelMapper.test.ts`

---

## ✅ Bug #4: Connection References & Environment Variables - Infinite Spinner (FIXED)

### Root Cause (CONFIRMED via Log Analysis)

Two issues were identified:

**Issue 1: Infinite Loading Spinner**
The `initializeAndLoadData()` method used `scaffoldingBehavior.refresh({ tableData: viewModels })` to send data to the frontend after loading. However, this regenerates the entire HTML, which resets the table state. The frontend JavaScript expects data via `postMessage({ command: 'updateTableData', ... })`, not embedded in HTML. After HTML regeneration, the table was in its initial state waiting for data that never arrived.

**Issue 2: "No Data" Flash**
Before the infinite loading bug was fixed, there was also a brief flash of "No data" message. This happened because:
1. First scaffold refresh: `tableData: []` → shows "No data"
2. Load solutions
3. Second scaffold refresh: `tableData: []` → **still shows "No data"** (the flash!)
4. `showTableLoading()` → finally shows loading spinner

### Fix Applied

1. **Move `showTableLoading()` immediately after first scaffold refresh** (before loading solutions)
2. **Replace second scaffold refresh with `updateSolutionSelector` message** (avoids full HTML refresh)
3. **Replace final scaffold refresh with `postMessage({ command: 'updateTableData', ... })`** (sends data properly)

**Files Changed:**
- `src/features/connectionReferences/presentation/panels/ConnectionReferencesPanelComposed.ts`
- `src/features/environmentVariables/presentation/panels/EnvironmentVariablesPanelComposed.ts`
- `src/features/webResources/presentation/panels/WebResourcesPanelComposed.ts`
- `src/features/importJobViewer/presentation/panels/ImportJobViewerPanelComposed.ts`
- `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts`

### Tests
- All 692 tests for environmentVariables and connectionReferences pass
- All 1025 tests for affected panels pass
- Extension compiles successfully

---

## ✅ Bug #5: Data Explorer - Aliases Break Lookup Links (FIXED)

### Root Cause (CONFIRMED via Debug Logging)

When using an alias for a lookup column, Dataverse returns data **differently**:

| Without Alias | With Alias |
|--------------|------------|
| `_createdby_value` | `CreatedByUser` (alias as key) |
| `_createdby_value@...lookuplogicalname` | `CreatedByUser@...lookuplogicalname` |

Our code only checked for `_xxx_value` pattern to detect lookups, so aliased lookups were treated as plain values → no clickable links!

### Fix Applied

Added detection for `@Microsoft.Dynamics.CRM.lookuplogicalname` annotation on ANY key (not just `_xxx_value` pattern).

**Files Changed:**
- `src/features/dataExplorer/infrastructure/repositories/DataverseDataExplorerQueryRepository.ts:765-781`
- Updated tests to match real Dataverse response format

### Tests
- 21 repository tests pass
- 18 mapper tests pass
- Tests updated to use realistic Dataverse response format

---

## Session Notes

### Session 1 (2025-12-06)
- Explored codebase for all 5 bugs
- Fixed Bugs #1, #2 (CSS and JS fixes)
- Initial attempt at Bug #3 (added click handler) - incomplete fix

### Session 2 (2025-12-06)
- **Bug #5:** Initially thought case sensitivity was the issue
- Added debug logging to capture real Dataverse response
- **ACTUAL ROOT CAUSE:** Aliased lookups return alias as key with annotations, not `_xxx_value` pattern
- Fixed by detecting `@Microsoft.Dynamics.CRM.lookuplogicalname` annotation on any key
- All tests pass, manual testing confirmed links work

### Session 3 (2025-12-06)
- **Bug #4:** Analyzed logs showing successful API calls (use case completed with 0 results)
- Identified root cause: `scaffoldingBehavior.refresh()` regenerates HTML, table expects data via `postMessage`
- Also fixed "No data" flash by moving `showTableLoading()` and using `updateSolutionSelector` message
- Applied fix to 5 panels: ConnectionReferences, EnvironmentVariables, WebResources, ImportJobViewer, SolutionExplorer
- All tests pass, extension compiles successfully

### Session 4 (2025-12-06)
- **Bug #3 (ACTUAL FIX):** User reported import job links still not working
- Root cause: ViewModel structure mismatch - mapper provided `solutionNameHtml` but `VirtualTableRenderer` expects `solutionNameLink` (CellLink pattern)
- Fixed by updating mapper to use CellLink structure instead of HTML string
- All 173 import job tests pass

---

## Completion Status

**All 5 bugs fixed and manually confirmed.**

| Bug | Fix Verified |
|-----|-------------|
| #1 Text selection | ✅ Confirmed |
| #2 Ctrl+A shortcuts | ✅ Confirmed |
| #3 Import job links | ✅ Confirmed |
| #4 Loading spinner | ✅ Confirmed |
| #5 Alias lookup links | ✅ Confirmed |

Ready for PR to main.
