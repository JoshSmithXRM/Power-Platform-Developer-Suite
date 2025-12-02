# Ctrl+A Zone Architecture - Implementation Guide

**Created:** 2025-12-01
**Status:** Ready for Implementation
**Branch:** `chore/e2e-testing-and-fixes`

---

## Overview

Implement context-aware Ctrl+A selection across all panels using a **zone-based architecture**. Each panel has distinct zones where Ctrl+A selects only content within that zone.

---

## Core Architecture

### Zone Detection Algorithm

```javascript
function handleCtrlA(e) {
    // 1. ALWAYS prevent browser default FIRST
    e.preventDefault();
    window.getSelection().removeAllRanges();

    // 2. Find the active zone (closest to click/focus)
    const zone = findActiveZone();

    // 3. If no zone, do nothing (safe default)
    if (!zone) return;

    // 4. Select content based on element type within zone
    selectZoneContent(zone);
}

function findActiveZone() {
    // Priority 1: activeElement's closest zone
    const activeEl = document.activeElement;
    if (activeEl) {
        const zone = activeEl.closest('[data-selection-zone]');
        if (zone) return zone;
    }

    // Priority 2: Last clicked zone (tracked via click handler)
    if (lastClickedZone) return lastClickedZone;

    // Priority 3: No zone = no selection
    return null;
}

function selectZoneContent(zone) {
    // Find selectable element within zone
    const textarea = zone.querySelector('textarea');
    const input = zone.querySelector('input[type="text"], input[type="search"]');
    const pre = zone.querySelector('pre');
    const table = zone.querySelector('table, .virtual-table-container, #virtualTableBody');

    if (textarea) {
        textarea.select();
    } else if (input) {
        input.select();
    } else if (pre) {
        selectNodeContents(pre);
    } else if (table) {
        // Use VirtualTableRenderer or DataTableBehavior API
        window.VirtualTableRenderer?.selectAllRows?.() ||
        window.DataTableBehavior?.selectAllRows?.();
        updateFooter();
    } else {
        // Fallback: select entire zone content (for detail panels)
        selectNodeContents(zone);
    }
}
```

### Zone Nesting (Key Feature)

Zones can be nested. The **closest** zone to click target wins:

```html
<!-- Tab-level zone (fallback) -->
<div data-selection-zone="overview-tab">
    <div class="detail-grid">...</div> <!-- Inherits parent zone -->

    <!-- Nested zone - overrides parent when clicked -->
    <div data-selection-zone="exception-text">
        <pre>Exception content</pre>
    </div>
</div>
```

**Behavior:**
- Click Exception block + Ctrl+A → select just exception
- Click elsewhere in tab + Ctrl+A → select entire tab content

---

## Files to Modify

### 1. KeyboardSelectionBehavior.js (REWRITE)

**Location:** `resources/webview/js/behaviors/KeyboardSelectionBehavior.js`

**Changes:**
- [ ] Always call `e.preventDefault()` at TOP of Ctrl+A handler
- [ ] Always call `window.getSelection().removeAllRanges()` first
- [ ] Implement zone hierarchy detection (closest zone wins)
- [ ] Remove `lastClickedContext` string tracking, use `lastClickedZone` element reference
- [ ] Handle nested zones correctly
- [ ] Keep existing Ctrl+C and Escape handlers

### 2. Data Explorer

**Files:**
- `src/features/dataExplorer/presentation/views/queryEditorView.ts`

**Zones to Add:**

| Zone Name | Wrapper | Element |
|-----------|---------|---------|
| `sql-query` | `.sql-editor-wrapper` | `#sql-editor` textarea |
| `fetchxml-preview` | `.fetchxml-preview-wrapper` | `pre.fetchxml-content` |
| `fetchxml-query` | `.fetchxml-editor-wrapper` | `#fetchxml-editor` textarea |
| `sql-preview` | `.sql-preview-wrapper` | `pre.sql-content` |
| `results-search` | NEW container | NEW `#resultsSearchInput` |
| `results-table` | `#results-table-container` | table/virtual table |

**NEW: Add Search Bar to Results**

```html
<div class="query-results-section">
    <!-- NEW: Search container with zone -->
    <div data-selection-zone="results-search" class="results-search-container">
        <input type="text" id="resultsSearchInput" placeholder="Search results..." />
    </div>
    <div data-selection-zone="results-table" id="results-table-container">
        <!-- table renders here -->
    </div>
</div>
```

### 3. Plugin Traces

**Files:**
- `resources/webview/js/behaviors/PluginTraceViewerBehavior.js` (for detail panel rendering)
- `src/features/pluginTraceViewer/presentation/views/pluginTraceToolbarView.ts` (if exists)
- Need to check where OData preview is rendered

**Zones to Add:**

| Zone Name | Location | Element |
|-----------|----------|---------|
| `trace-search` | Toolbar | `#searchInput` |
| `trace-table` | Main content | Virtual table |
| `odata-preview` | OData section | `pre` |
| `overview-tab` | Detail panel | `#pluginTraceOverviewContent` |
| `exception-text` | NESTED in overview | `.detail-code.exception` |
| `message-block` | NESTED in overview | `.detail-code` (non-exception) |
| `details-tab` | Detail panel | `#pluginTraceDetailsContent` |
| `timeline-tab` | Detail panel | `#pluginTraceTimelineContent` |
| `raw-data` | Detail panel | `#pluginTraceRawContent` |

**Note:** Exception and Message Block zones are added dynamically in `renderOverviewTab()` function.

### 4. Metadata Browser

**Files:**
- `src/features/metadataBrowser/presentation/sections/MetadataBrowserLayoutSection.ts`
- `src/features/metadataBrowser/presentation/sections/MetadataBrowserDetailSection.ts`

**Zones to Add:**

| Zone Name | Location | Element |
|-----------|----------|---------|
| `tree-search` | Sidebar | `#treeSearch` |
| `attributes-table` | Tab panel | `#attributesTable` |
| `keys-table` | Tab panel | `#keysTable` |
| `onetomany-table` | Tab panel | `#oneToManyTable` |
| `manytoone-table` | Tab panel | `#manyToOneTable` |
| `manytomany-table` | Tab panel | `#manyToManyTable` |
| `privileges-table` | Tab panel | `#privilegesTable` |
| `choicevalues-table` | Tab panel | `#choiceValuesTable` |
| `properties-tab` | Detail panel | `#metadataPropertiesContent` |
| `raw-data` | Detail panel | `#metadataRawDataContent` |

**Note:** Each tab already has its own search input (`.table-search[data-table="X"]`). These are inside the tab-panel so will inherit that zone.

### 5. Solutions Panel

**Files:**
- `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts`
- Related section/view files

**Zones to Add:**

| Zone Name | Element |
|-----------|---------|
| `search` | `#searchInput` |
| `solutions-table` | Virtual table |

### 6. Web Resources Panel

**Files:**
- `src/features/webResources/presentation/panels/WebResourcesPanelComposed.ts`

**Zones to Add:**

| Zone Name | Element |
|-----------|---------|
| `search` | `#searchInput` |
| `resources-table` | Virtual table |

### 7. Environment Variables Panel

**Files:**
- `src/features/environmentVariables/presentation/panels/EnvironmentVariablesPanelComposed.ts`

**Zones to Add:**

| Zone Name | Element |
|-----------|---------|
| `search` | `#searchInput` |
| `variables-table` | Virtual table |

### 8. Connection References Panel

**Files:**
- `src/features/connectionReferences/presentation/panels/ConnectionReferencesPanelComposed.ts`

**Zones to Add:**

| Zone Name | Element |
|-----------|---------|
| `search` | `#searchInput` |
| `references-table` | Table |

### 9. Import Job Viewer Panel

**Files:**
- `src/features/importJobViewer/presentation/panels/ImportJobViewerPanelComposed.ts`

**Zones to Add:**

| Zone Name | Element |
|-----------|---------|
| `search` | `#searchInput` |
| `jobs-table` | Virtual table |

---

## CSS Changes

### Keep Existing (No Changes Needed)

**reset.css:**
```css
body {
    user-select: none;  /* KEEP - prevents browser selecting everything */
}
input, textarea, [contenteditable="true"] {
    user-select: text;  /* KEEP - allows mouse selection in inputs */
}
pre, code {
    user-select: text;  /* KEEP - allows mouse selection in code blocks */
}
```

**datatable.css:**
```css
tbody {
    user-select: none;  /* KEEP - prevents selecting table cell text */
}
.selection-badge { ... }  /* KEEP */
```

The CSS is correct for mouse selection. The JavaScript fix handles Ctrl+A.

---

## E2E Test Strategy

### Approach: API-Based Testing

Since Playwright → VS Code webview keyboard delivery is unreliable, tests should:
1. Call JavaScript APIs directly (e.g., `VirtualTableRenderer.selectAllRows()`)
2. Verify selection state via DOM queries (`.row-selected` count)
3. Verify footer badge shows selection count
4. Verify no unwanted browser selection (buttons/labels)

### Test File

**Location:** `e2e/tests/integration/keyboard-selection.spec.ts`

**Test Cases to Update/Add:**
- [ ] Data Explorer: SQL input zone selection
- [ ] Data Explorer: Results table zone selection
- [ ] Data Explorer: FetchXML preview zone selection
- [ ] Data Explorer: Results search zone (NEW)
- [ ] Plugin Traces: Table zone selection
- [ ] Plugin Traces: Detail panel tab zones
- [ ] Metadata Browser: Tab-specific table zones
- [ ] Solutions: Table zone selection
- [ ] Cross-panel: No zone = no selection (clicking empty area)

---

## Implementation Order

1. **KeyboardSelectionBehavior.js** - Core algorithm fix
2. **Data Explorer** - Most complex (3+ zones, add search bar)
3. **E2E Tests** - Validate Data Explorer works
4. **Plugin Traces** - Complex (nested zones in detail panel)
5. **Metadata Browser** - Complex (7 tables + detail panel)
6. **Remaining Panels** - Simple (search + table each)
7. **Final E2E Validation**

---

## Selection Behavior Summary

| Element Type | Selection Method |
|--------------|-----------------|
| `<textarea>` | `textarea.select()` |
| `<input>` | `input.select()` |
| `<pre>` / `<code>` | `window.getSelection().selectNodeContents(element)` |
| `<table>` (virtual) | `VirtualTableRenderer.selectAllRows()` |
| `<table>` (regular) | `DataTableBehavior.selectAllRows()` |
| Detail panel tab | `window.getSelection().selectNodeContents(tabContainer)` |

---

## Open Items (Resolved)

- [x] Search bar behavior: Native input selection (A) ✓
- [x] Detail panel "full" selection: Select ALL content including labels (A) ✓
- [x] Data Explorer search bar: Add now (in scope) ✓
- [x] Metadata Browser tables: Confirmed 7 separate tables ✓
- [x] E2E test strategy: API-based testing (A) ✓

---

## Notes

- The zone `data-selection-zone` attribute is for **documentation and debugging** - the JS auto-detects what to select based on element types inside
- Zones can be nested - closest zone to click wins
- Search inputs use native browser selection (no special handling needed beyond zone boundary)
- Table selection uses existing `VirtualTableRenderer`/`DataTableBehavior` APIs
