# Keyboard Selection Pattern - Zone-Based Architecture

## Overview

This document describes the zone-based keyboard selection pattern used across all webview panels. The pattern ensures Ctrl+A selects content within a specific context (zone) rather than the entire page.

## Problem

Browser's native Ctrl+A selects ALL visible content on a page, which is useless in complex UIs with multiple data regions (tables, editors, detail panels). Users expect Ctrl+A to select content relevant to their current focus.

## Solution

**Zone-based selection architecture** using `data-selection-zone` attributes to define selection boundaries.

## Architecture Components

### 1. CSS Foundation (`resources/webview/css/base/reset.css`)

```css
/* Disable selection by default */
body {
    user-select: none;
    -webkit-user-select: none;
}

/* Whitelist selectable elements */
input, textarea, [contenteditable="true"] { user-select: text; }
pre, code { user-select: text; }
.detail-tab-panel, .property-item, .detail-code, ... { user-select: text; }
```

**Key principle:** Block selection globally, whitelist specific content classes.

### 2. Zone Attributes (HTML)

Add `data-selection-zone="zone-name"` to define selection boundaries:

```html
<!-- Search input zone -->
<div class="search-container" data-selection-zone="search">
    <input type="text" placeholder="Search..." />
</div>

<!-- Table zone -->
<div class="table-container" data-selection-zone="table">
    <table class="data-table">...</table>
</div>

<!-- Detail panel tab zone -->
<div class="detail-tab-panel" data-selection-zone="detail-properties">
    <div class="property-item">...</div>
</div>
```

### 3. Keyboard Handler (`resources/webview/js/behaviors/KeyboardSelectionBehavior.js`)

Core behavior that intercepts Ctrl+A and delegates to zone-specific selection.

**Key functions:**

| Function | Purpose |
|----------|---------|
| `trackClickedZone(e)` | Captures last clicked zone for focus fallback |
| `findActiveZone()` | Finds active zone (activeElement > lastClicked > null) |
| `isDirectlyInZone(element, zone)` | Checks if element belongs directly to zone (not nested) |
| `selectZoneContent(zone)` | Selects appropriate content based on zone contents |
| `selectNodeContents(element)` | Programmatic text selection via Range API |
| `selectAllTableRows(tableElement)` | Delegates to VirtualTableRenderer or DataTableBehavior |

**Selection priority in `selectZoneContent()`:**
1. Textarea (directly in zone) → focus + select
2. Text input (directly in zone) → focus + select
3. Pre/code element (directly in zone) → select contents
4. Data table `.data-table` (directly in zone) → select all rows
5. Fallback → select entire zone content as text

### 4. Table Selection APIs

**VirtualTableRenderer** (virtual scrolling tables):
```javascript
window.VirtualTableRenderer.selectAllRows()
window.VirtualTableRenderer.clearSelection()
window.VirtualTableRenderer.getSelectionCount()
window.VirtualTableRenderer.getSelectedDataAsTsv()
```

**DataTableBehavior** (static tables):
```javascript
window.DataTableBehavior.selectAllRows(tableElement)  // Pass specific table!
window.DataTableBehavior.clearSelection()
window.DataTableBehavior.getSelectionCount()
window.DataTableBehavior.getSelectedDataAsTsv()
```

## Implementation Checklist

When adding zones to a new panel:

### HTML/TypeScript (Section files)
- [ ] Add `data-selection-zone="zone-name"` to each selectable region
- [ ] Use unique zone names (e.g., `search`, `table`, `detail-properties`)
- [ ] Ensure zones don't overlap (except intentional nesting)

### CSS (`reset.css`)
- [ ] Add content classes to whitelist if using custom classes
- [ ] Test that content is visually selectable after Ctrl+A

### JavaScript (Behavior files)
- [ ] Include `KeyboardSelectionBehavior.js` in panel scripts
- [ ] For custom rendering, add zones to generated HTML

## Zone Naming Conventions

| Zone Type | Naming Pattern | Example |
|-----------|---------------|---------|
| Search input | `{feature}-search` or `search` | `attributes-search` |
| Data table | `{feature}-table` or `table` | `results-table` |
| Detail panel tab | `detail-{tabId}` | `detail-properties` |
| Code preview | `{type}-preview` | `fetchxml-preview` |
| Specific content | `{content-type}` | `exception-details`, `message-block` |

## Nested Zones

Zones can be nested. The `isDirectlyInZone()` function ensures elements are only matched if their closest zone is the current zone.

```html
<!-- Parent zone -->
<div data-selection-zone="attributes-table">
    <!-- Nested zone - has its own Ctrl+A behavior -->
    <div data-selection-zone="attributes-search">
        <input type="text" />
    </div>
    <!-- Table belongs to parent zone -->
    <table class="data-table">...</table>
</div>
```

When user clicks in search input and presses Ctrl+A:
- Zone found: `attributes-search`
- Input is directly in zone → select input text

When user clicks in table and presses Ctrl+A:
- Zone found: `attributes-table`
- Input exists but NOT directly in zone (nested) → skip
- Table is directly in zone → select all rows

## Event Handling

**Critical:** Use capture phase to intercept before VS Code webview handlers:

```javascript
document.addEventListener('keydown', handleKeydown, true);  // true = capture
document.addEventListener('click', trackClickedZone, true);
```

**Stop all propagation** to prevent VS Code from handling:
```javascript
e.preventDefault();
e.stopPropagation();
e.stopImmediatePropagation();
```

## Keyboard Shortcuts

| Shortcut | Behavior |
|----------|----------|
| Ctrl+A | Select all within active zone |
| Ctrl+C | Copy selected rows as TSV (if table selection), else browser default |
| Escape | Clear all selections |

## Panels with Zone Implementation

| Panel | Zones |
|-------|-------|
| Data Explorer | `sql-query`, `fetchxml-preview`, `fetchxml-query`, `sql-preview`, `results-table`, `results-search` |
| Metadata Browser | `tree-search`, `attributes-table`, `attributes-search`, `keys-table`, `keys-search`, etc. (14 zones) |
| Plugin Traces | `search`, `table`, `odata-preview`, `detail-overview`, `detail-details`, `detail-timeline`, `exception-details`, `message-block` |
| Solutions | `search`, `table` (via shared DataTableSection) |
| Web Resources | `search`, `table` (via shared DataTableSection) |
| Env Variables | `search`, `table` (via shared DataTableSection) |
| Connection Refs | `search`, `table` (via shared DataTableSection) |
| Import Jobs | `search`, `table` (via shared DataTableSection) |

## Troubleshooting

### Ctrl+A selects nothing
1. Check zone exists with `data-selection-zone` attribute
2. Check CSS whitelist includes content classes
3. Check `KeyboardSelectionBehavior.js` is loaded

### Ctrl+A selects wrong content
1. Check for nested zones - inner zone takes priority
2. Use `isDirectlyInZone()` for element checks
3. Verify table uses `.data-table` class (layout tables excluded)

### Selection not visible
1. Check `user-select: text` is set on content classes in CSS
2. Add classes to whitelist in `reset.css`

## Related Files

- `resources/webview/css/base/reset.css` - CSS selection whitelist
- `resources/webview/js/behaviors/KeyboardSelectionBehavior.js` - Core handler
- `resources/webview/js/behaviors/DataTableBehavior.js` - Static table selection
- `resources/webview/js/renderers/VirtualTableRenderer.js` - Virtual table selection
- `src/shared/infrastructure/ui/views/dataTableSectionView.ts` - Shared table zones
- `src/shared/infrastructure/ui/sections/ResizableDetailPanelSection.ts` - Detail panel zones
