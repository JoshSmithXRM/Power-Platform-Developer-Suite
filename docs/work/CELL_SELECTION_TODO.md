# Cell Selection Implementation - Progress Tracking

## Summary

Implementing Excel/Dataverse Maker-style cell selection for all data tables in the extension.

## Design Decisions (User Confirmed)

| Decision | Choice |
|----------|--------|
| Selection model | Cell-based, no row number column |
| Shift+click | Extends rectangular range from anchor |
| Headers in copy | Only when entire table is selected (Ctrl+A OR manual full selection) |
| Ctrl+click | Deferred (not implementing now) |
| Drill-down | Links handle it; click outside link = selection |
| Scope | All tables (reusable pattern) |

---

## Completed Work

### 1. Core Selection Infrastructure ✅
- **Created**: `resources/webview/js/behaviors/CellSelectionBehavior.js`
  - Selection state model (anchor/focus coordinates)
  - Click to select single cell
  - Click + drag for rectangular range
  - Shift+click to extend selection
  - `selectAll()` for Ctrl+A
  - `getSelectedDataAsTsv()` with header logic
  - Link detection to preserve drill-down behavior
  - Exposed via `window.CellSelectionBehavior`

### 2. CSS Styles ✅
- **Modified**: `resources/webview/css/sections/datatable.css`
  - Added `.cell-selected` background highlight
  - Added `.cell-selected-top/bottom/left/right` border styles
  - Added `tbody.selecting` cursor style during drag

### 3. Keyboard Integration ✅
- **Modified**: `resources/webview/js/behaviors/KeyboardSelectionBehavior.js`
  - Updated `selectAllTableCells()` to use CellSelectionBehavior
  - Updated `copyToClipboard()` to prioritize cell selection
  - Updated `clearSelection()` to clear cell selection
  - Updated `hasTableSelection()` to check cell selection
  - Updated `updateFooter()` for cell selection count

### 4. VirtualTableRenderer Integration ✅
- **Modified**: `resources/webview/js/renderers/VirtualTableRenderer.js`
  - Added `initializeCellSelection()` function
  - Calls `CellSelectionBehavior.attach()` on initialize
  - Refreshes cell selection after scroll/render
  - Clears cell selection on data update

### 5. DataTableBehavior Integration ✅
- **Modified**: `resources/webview/js/behaviors/DataTableBehavior.js`
  - Added `initializeCellSelection()` function
  - Initializes cell selection for non-virtual tables on DOM ready

### 6. Panel Script Loading ✅
Added `CellSelectionBehavior.js` to jsUris in all panels:
- `DataExplorerPanelComposed.ts`
- `SolutionExplorerPanelComposed.ts`
- `WebResourcesPanelComposed.ts`
- `ImportJobViewerPanelComposed.ts`
- `PluginTraceViewerPanelComposed.ts`
- `EnvironmentVariablesPanelComposed.ts`
- `ConnectionReferencesPanelComposed.ts`
- `MetadataBrowserPanel.ts`

### 7. Header Logic Fix ✅
- **Modified**: `CellSelectionBehavior.js` `getSelectedDataAsTsv()`
  - Now includes headers when entire table is selected by ANY means
  - Works for both Ctrl+A and manual drag-select of all cells

### 8. DataExplorerBehavior Integration (Partial) ⚠️
- **Modified**: `resources/webview/js/behaviors/DataExplorerBehavior.js`
  - Added `initializeCellSelection(table, columns, rows)` function
  - Called after dynamic table creation in `updateQueryResults()`
- **Modified**: `DataExplorerPanelComposed.ts`
  - Added `DataExplorerBehavior.js` to jsUris (was missing!)

---

## Outstanding Issue: Data Explorer Not Working

### Symptom
- Cell selection works on ALL panels EXCEPT Data Explorer
- Clicking a cell in Data Explorer does nothing

### Working Panels (for comparison)
- Solution Explorer (uses VirtualTableRenderer)
- Web Resources (uses VirtualTableRenderer)
- Import Job Viewer (uses VirtualTableRenderer)
- Plugin Trace Viewer (uses DataTableBehavior)
- Environment Variables (uses DataTableBehavior)
- Connection References (uses DataTableBehavior)
- Metadata Browser (uses DataTableBehavior)

### Data Explorer Differences
1. **Dynamic table creation**: Table is created AFTER query execution via `updateQueryResults()`
2. **Webpack bundled**: DataExplorerBehavior.js is bundled by webpack (ES modules with imports)
3. **Uses `window.createBehavior()`**: Different initialization pattern than other panels
4. **CellSelectionBehavior.js is NOT webpack bundled**: Loaded as raw JS file

### Likely Root Cause
Script loading/timing issue between:
- `CellSelectionBehavior.js` (raw JS, sets `window.CellSelectionBehavior`)
- `DataExplorerBehavior.js` (webpack bundle, uses `window.CellSelectionBehavior`)

The `initializeCellSelection()` function checks `if (!window.CellSelectionBehavior) { return; }` - this may be silently failing because webpack bundle execution timing differs from raw script loading.

### Investigation Needed
1. Add console.log in `initializeCellSelection()` to verify it's being called
2. Check if `window.CellSelectionBehavior` exists when `updateQueryResults()` runs
3. Compare how other webpack-bundled behaviors (that work) access `window.CellSelectionBehavior`
4. Consider whether CellSelectionBehavior.js should also be webpack-bundled for consistency

### Potential Fixes to Try
1. **Debug logging**: Add console logs to trace execution
2. **Webpack bundle CellSelectionBehavior**: Add to webpack.webview.config.js entry points
3. **Ensure load order**: Verify CellSelectionBehavior.js loads before DataExplorerBehavior.js executes
4. **Alternative approach**: Have DataExplorerBehavior check for CellSelectionBehavior availability with retry/polling

---

## Testing Checklist

### Working (Other Panels)
- [x] Click cell → single cell selected
- [x] Click link → record opens, no selection
- [x] Click+drag → rectangular range
- [x] Shift+click → extend from anchor
- [x] Ctrl+A → all cells selected
- [x] Ctrl+C partial → TSV without headers
- [x] Ctrl+C after Ctrl+A → TSV with headers
- [x] Manual select all cells → TSV with headers
- [x] Escape → clear selection

### Not Working (Data Explorer)
- [ ] Any cell selection functionality

---

## Files Changed

### Created
- `resources/webview/js/behaviors/CellSelectionBehavior.js`

### Modified
- `resources/webview/css/sections/datatable.css`
- `resources/webview/js/behaviors/KeyboardSelectionBehavior.js`
- `resources/webview/js/behaviors/DataTableBehavior.js`
- `resources/webview/js/behaviors/DataExplorerBehavior.js`
- `resources/webview/js/renderers/VirtualTableRenderer.js`
- `src/features/dataExplorer/presentation/panels/DataExplorerPanelComposed.ts`
- `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts`
- `src/features/webResources/presentation/panels/WebResourcesPanelComposed.ts`
- `src/features/importJobViewer/presentation/panels/ImportJobViewerPanelComposed.ts`
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`
- `src/features/environmentVariables/presentation/panels/EnvironmentVariablesPanelComposed.ts`
- `src/features/connectionReferences/presentation/panels/ConnectionReferencesPanelComposed.ts`
- `src/features/metadataBrowser/presentation/panels/MetadataBrowserPanel.ts`
