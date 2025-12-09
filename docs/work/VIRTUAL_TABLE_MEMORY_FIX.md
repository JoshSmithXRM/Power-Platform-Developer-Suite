# Virtual Table Memory Fix - Progress Tracking

**Branch:** `feature/virtual-table-data-explorer`
**Started:** 2025-12-08
**Status:** ✅ COMPLETE - Ready for PR

---

## Problem Statement

Data Explorer and Notebooks caused VS Code to consume 4-9GB of memory when displaying query results with 5k rows × 68+ columns (e.g., `sdkmessageprocessingstep` with all-attributes). The UI became completely unresponsive and VS Code crashed.

**Comparison:** Web Resources panel handles thousands of records with negligible memory usage using virtual scrolling.

---

## Root Causes Identified

### 1. Escaped JSON in HTML Attributes (CRITICAL)
- `escapeHtml()` converts `"` to `&quot;` (6x character expansion for quotes)
- This broke `JSON.parse()` when VirtualTableRenderer tried to read `data-columns`
- Console error: `Failed to parse column data SyntaxError: Expected property name or '}'`

### 2. Row Data Written Back to DOM Attribute
- `VirtualTableRenderer.update()` line 945 did: `tbody.setAttribute('data-rows', JSON.stringify(allRows))`
- This stored ALL 5k rows as JSON string in a DOM attribute after every update
- Combined with escaped quotes = massive memory bloat

### 3. Notebooks Rendered Full HTML Tables
- Original implementation rendered ALL rows as DOM table cells
- 5k rows × 68 columns = 340,000 DOM cells with inline styles

---

## Fixes Applied

### Data Explorer Panel (`DataExplorerBehavior.js`)

| Change | File Location | Description |
|--------|---------------|-------------|
| Removed `data-rows` attribute | `createVirtualTableStructure()` | Row data not stored in DOM |
| Removed `data-columns` attribute | `createVirtualTableStructure()` | Column config not stored in DOM |
| Added `VirtualTableRenderer.initialize()` call | `updateQueryResults()` | Explicitly initialize handlers after DOM created |
| Pass data via `update()` only | `updateQueryResults()` | All data stays in JS memory |

### VirtualTableRenderer.js

| Change | File Location | Description |
|--------|---------------|-------------|
| Exposed `initialize` function | Public API | Allows explicit initialization after dynamic DOM creation |
| Removed `setAttribute('data-rows', ...)` | `updateVirtualTable()` ~line 945 | Prevents writing row data back to DOM |
| Added copy button support | `createCopyButton()`, `createRecordCellContent()` | For lookup cell copy URL buttons |

### Notebooks (`DataverseNotebookController.ts`)

| Change | Description |
|--------|-------------|
| Complete rewrite of `renderResultsHtml()` | Now uses inline virtual scrolling JavaScript |
| Row data in JS variable | `const rowData = ${JSON.stringify(rowData)}` in script |
| Only renders visible rows | ~15-20 rows at a time in 400px container |
| Scroll handler updates view | Debounced re-render on scroll |

### Panel Configuration (`DataExplorerPanelComposed.ts`)

| Change | Description |
|--------|-------------|
| Added VirtualTableRenderer.js to scripts | Panel now loads the virtual table renderer |

### CSS (`data-explorer.css`)

| Change | Description |
|--------|-------------|
| Added virtual table container styles | Proper flex layout for scroll container |
| Added spacer row styles | For virtual scrolling height calculation |

---

## Memory Flow (After Phase 1 Fix)

```
Query executes
    ↓
Repository returns QueryResult (5k rows in memory)
    ↓
Mapper creates ViewModel (rows + rowLookups arrays)
    ↓
postMessage sends to webview (serialized once)
    ↓
DataExplorerBehavior.updateQueryResults():
  - Creates HTML structure (header only, NO row data in attributes)
  - Calls VirtualTableRenderer.initialize() → sets up scroll/search handlers
  - Calls VirtualTableRenderer.update({rows, rowLookups, entityLogicalName})
    → NO virtualRows copy! Data passed by reference
    ↓
VirtualTableRenderer stores:
  - allRows = rows (reference, no copy)
  - lookupContext = {rowLookups, entityLogicalName}
    ↓
VirtualTableRenderer.createRowElement() renders ~50 visible rows:
  - For each visible row, computes CellLinks lazily via computeCellLinkFromContext()
  - CellLinks created ONLY for visible rows, not all 5000
    ↓
On scroll: re-renders visible window, computes CellLinks for new visible rows
```

---

## Files Changed

```
resources/webview/css/features/data-explorer.css
resources/webview/js/behaviors/DataExplorerBehavior.js
resources/webview/js/renderers/VirtualTableRenderer.js
src/features/dataExplorer/notebooks/DataverseNotebookController.ts
src/features/dataExplorer/presentation/panels/DataExplorerPanelComposed.ts
```

---

## Phase 1: Eliminate Data Copies (Current)

**Problem identified:** Despite earlier fixes, memory still 3-4GB because of multiple data copies in webview:

| Data Structure | Size (5k rows × 68 cols) |
|----------------|--------------------------|
| `rows` (from postMessage) | 5000 × 68 strings |
| `rowLookups` (from postMessage) | 5000 × ~30 lookup objects |
| `virtualRows` (NEW COPY in DataExplorerBehavior) | 5000 × (68 + 60 CellLinks) |

**Root cause:** `DataExplorerBehavior.updateQueryResults()` creates `virtualRows` by copying every row and pre-computing CellLinks for ALL 5000 rows upfront.

**Solution:** Lazy CellLink computation
1. Pass `rows` directly to VirtualTableRenderer (no copy)
2. Pass lookup context (`rowLookups`, `entityLogicalName`) separately
3. Compute CellLinks in `createRowElement()` for only visible rows (~50)

**Expected result:** ~60-70% memory reduction (3-4GB → ~1GB)

### Changes for Phase 1 (IMPLEMENTED)

| File | Change |
|------|--------|
| `VirtualTableRenderer.js` | Added `lookupContext` state; `computeCellLinkFromContext()` for lazy computation; `isGuid()` helper; updated `createRowElement()` to use lazy computation |
| `DataExplorerBehavior.js` | Removed `virtualRows` copy loop (~40 lines); pass `rows` directly with `rowLookups` and `entityLogicalName` context |

**Memory savings:**
- Before: 5000 rows × spread copy × 68 cols × CellLink objects = ~1.5 million object allocations
- After: CellLinks computed only for ~50 visible rows = ~3000 object allocations per render

---

## Remaining Issues (Phase 2 Required)

Testing after Phase 1 showed **memory still at +4GB**. Further analysis revealed:

### Issue 1: DUAL MESSAGE PROCESSING (CRITICAL) ✅ FIXED
Both behaviors were loaded for Data Explorer panel and both handled `queryResultsUpdated`:
- `VisualQueryBuilderBehavior.js` was building FULL HTML table with ALL 5000 rows
- Then `DataExplorerBehavior.js` would overwrite with virtual table

**Fix:** Removed `queryResultsUpdated` case from VisualQueryBuilderBehavior.js. Now only DataExplorerBehavior handles it with virtual scrolling.

### Issue 2: O(n) LINEAR SEARCH IN createRowElement ✅ FIXED
`allRows.indexOf(row)` was called for each visible row = 50 × 5000 = 250,000 comparisons per render.

**Fix:** Added `rowToOriginalIndex` WeakMap built once when data arrives. Now O(1) lookup per row.

### Issue 3: MULTIPLE ARRAY COPIES ✅ FIXED
`filteredRows = [...allRows]` appeared 4 times in VirtualTableRenderer.js.

**Fix:** Use reference `filteredRows = allRows` everywhere except in `sortRows()` where we need a copy before in-place sort mutation.

### Issue 4: MISSING SCROLLBAR ✅ FIXED
User reports: "missing a scrollbar on the table"

**Fix:** Updated CSS for proper flex layout chain:
- `.virtual-table-container`: Added `display: flex; flex-direction: column`
- `.virtual-scroll-wrapper`: Changed `height: 100%` to `flex: 1; min-height: 0`
- `#results-table-container`: Added `max-height: 100%`, increased `min-height: 200px`

### Issue 5: postMessage SERIALIZATION (Known Limitation - Future Work)
The entire `rows` + `rowLookups` arrays are serialized to JSON and deserialized.
- 5k rows × 68 columns = ~340k string values
- Plus 5k × ~30 lookup objects = ~150k objects

**This is a fundamental VS Code webview limitation.** The only real fix is server-side pagination:
- Add `count="500"` to FetchXML by default
- Implement "Load more" or infinite scroll
- Handle entities that don't support paging gracefully

**Not addressed in this fix** - marked as Phase 3 / future enhancement.

### User Test Observations
- 5k IDs only (1 column) = 300MB memory pressure
- Limited to 100 rows = perfectly responsive
- No high CPU but table unresponsive

---

## Phase 2 Complete - Remaining Issues

### Issue: Column Widths Cramped/Smooshed ✅ FIXED
After Phase 2 fixes, table columns appear very narrow and content is truncated.
See screenshot - all columns cramped together despite horizontal scroll being available.

**Root cause:**
`datatable.css` applies `table-layout: fixed` to all `.virtual-table` elements (line 231-234). This forces columns to have equal widths distributed across the table width, overriding `width: max-content` in data-explorer.css. With `table-layout: fixed`, columns don't size to their content.

**Fix applied:**
Added `table-layout: auto` override in `data-explorer.css` for `#results-table-container .virtual-table`. This allows content-based column sizing for variable-width query result columns while maintaining the fixed layout behavior in other panels that need it.

### Issue: Notebook Columns Cramped ✅ FIXED
After implementing virtual scrolling for notebooks, columns were cramped/smooshed.

**Root cause:**
Notebook used `position: absolute; width: 100%` on rows (line 713), which:
1. Removed rows from normal table flow
2. Constrained rows to container width
3. Prevented `width: max-content` from sizing columns to content

**Fix applied:**
Changed notebook to use same **spacer row approach** as VirtualTableRenderer.js:
- Top spacer row with calculated height (normal flow)
- Visible rows in normal table flow (NO absolute positioning)
- Bottom spacer row with calculated height

Both Data Explorer and Notebook now use the same virtual scrolling pattern.

### Refactoring: Shared Virtual Scroll Generator ✅ COMPLETE
Extracted notebook virtual scroll script to shared module to eliminate duplication.

**New file:** `src/shared/infrastructure/ui/virtualScroll/VirtualScrollScriptGenerator.ts`
- Single source of truth for notebook virtual scrolling algorithm
- `generateVirtualScrollScript()` takes config and returns inline JS
- DataverseNotebookController now uses this generator
- VirtualTableRenderer.js has cross-reference comment pointing to generator

**Why not fully unified:**
VirtualTableRenderer.js has additional panel features (search, sort, selection, pagination) that notebooks don't need. The core spacer row algorithm is now shared via the generator.

---

## Testing Checklist

- [x] Data Explorer: Query with 5k rows, all columns - memory stays under 1.5GB
- [x] Data Explorer: Virtual scrolling works (smooth scroll through all rows)
- [x] Data Explorer: Search filter works
- [x] Data Explorer: Sort columns work
- [x] Data Explorer: Lookup links clickable
- [x] Data Explorer: Copy URL buttons work
- [x] Data Explorer: Cell selection (click-drag) works
- [x] Data Explorer: Column widths size to content properly
- [x] Notebooks: Query with 5k rows renders in 400px scroll container
- [x] Notebooks: Virtual scrolling works in notebook output
- [x] Notebooks: Links open in browser
- [x] Notebooks: Column widths size to content properly

---

## For Next Session (If Issues Persist)

### Quick Context
You're debugging memory issues in Data Explorer's query results table. The goal is efficient rendering of 5k+ rows using virtual scrolling (only render visible rows).

### Key Files to Read First
1. `resources/webview/js/behaviors/DataExplorerBehavior.js` - `updateQueryResults()` function (~line 185-295)
2. `resources/webview/js/renderers/VirtualTableRenderer.js` - `initialize()` and `updateVirtualTable()` functions
3. This document for context

### Debugging Steps
1. Open VS Code Developer Tools (Help → Toggle Developer Tools)
2. Check Console tab for JavaScript errors (especially JSON parse errors)
3. Check Memory tab - take heap snapshot before/after query execution
4. Compare with Web Resources panel which works correctly

### Common Issues to Check
- Is `VirtualTableRenderer.initialize()` being called AFTER DOM is created?
- Is any code still writing to `data-rows` or `data-columns` attributes?
- Is `escapeHtml()` being applied to JSON strings anywhere?
- Are there multiple copies of row data being created?

### Web Resources Panel (Working Reference)
`src/features/webResources/presentation/panels/WebResourcesPanelComposed.ts` - Uses same VirtualTableRenderer pattern successfully. Compare initialization flow.

---

## Related Technical Debt

- `docs/technical-debt/low-priority/environment-repository-caching.md` - Unrelated but was investigated during debugging

---

## Git Status

```bash
git checkout feature/virtual-table-data-explorer
npm run compile
# Test with F5
```
