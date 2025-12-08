# Data Explorer Visual Query Builder - Implementation Plan

## Overview

Transform the Data Explorer panel from a code-based query editor to a **Visual Query Builder** (like Advanced Find), while keeping notebooks as the primary code editing experience.

**Key Principle:**
- **Panel = Visual/Point-and-click** (unique value)
- **Notebooks = Code-based** (SQL/FetchXML)

---

## Implementation Progress

| Step | Description | Status |
|------|-------------|--------|
| 1 | Foundation - Domain Model & FetchXML Parser/Generator | ✅ Complete |
| 2 | Panel Restructure - Remove Old Editor, Add Entity Picker | ✅ Complete |
| 3 | Core Visual Builder - Columns, Filters MVP, Sort | ✅ Complete |
| 3.0 | → Panel Layout & UX Fixes | ✅ Complete |
| 3.2 | → Column Selector | ✅ Complete |
| 3.3 | → Filter Builder (MVP) | ✅ Complete |
| 3.4 | → Sort Section | ✅ Complete |
| 3.5 | → Query Options (Top N, Distinct) | ✅ Complete |
| 4 | Sticky Action Bar (Execute/Clear) | ✅ Complete |
| 5 | Toolbar Redesign (Export/Import) | ✅ Complete |
| 6 | View Management - Load/Save Views | 📦 Deferred (needs layoutxml) |
| 7 | Notebook ↔ Panel Integration | ✅ Complete |
| 8 | Advanced Features - AND/OR Groups, Joins | 📦 Deferred |
| 9 | Cleanup & Polish | ✅ Complete |

---

## Step 1: Foundation - Domain Model & FetchXML Parser/Generator ✅ COMPLETE

### 1.1 Domain Entities for Visual Query

- [x] Create `VisualQuery` entity (entity, columns, filters, sort, distinct, top)
- [x] Create `QueryColumn` value object (name, width, alias)
- [x] Create `QueryCondition` value object (attribute, operator, value)
- [x] Create `QueryFilterGroup` value object (type: AND/OR, conditions, nested groups)
- [x] Create `QuerySort` value object (attribute, descending)
- [x] Create `FetchXmlOperator` value object (operator metadata, validation)

### 1.2 FetchXML Parser (Domain Service)

- [x] Create `FetchXmlParser` domain service
- [x] Parse `<entity name="...">` → entity name
- [x] Parse `<attribute name="...">` → columns array
- [x] Parse `<filter type="and|or">` → filter groups
- [x] Parse `<condition attribute="..." operator="..." value="...">` → conditions
- [x] Parse `<order attribute="..." descending="...">` → sort
- [x] Parse `<fetch top="..." distinct="...">` → query options
- [x] Handle nested `<filter>` groups
- [x] Unit tests for parser

### 1.3 FetchXML Generator (Domain Service)

- [x] Create `FetchXmlGenerator` domain service
- [x] Generate `<fetch>` with top, distinct attributes
- [x] Generate `<entity>` with attributes
- [x] Generate `<attribute>` elements from columns
- [x] Generate `<filter>` and `<condition>` from filter model
- [x] Generate `<order>` from sort model
- [x] Unit tests for generator

### 1.4 Supporting Infrastructure

- [x] Create `FetchXmlParseError` for parser errors

---

## Step 2: Panel Restructure - Remove Old Editor, Add Entity Picker ✅ COMPLETE

### 2.1 Remove Old Code Editor Components

- [x] Remove `New Query` button and handler
- [x] Remove `Open File` button and handler
- [x] Remove SQL Mode tab (external editor integration)
- [x] Remove FetchXML Mode inline editing
- [x] Remove `SqlEditorWatcher` dependency from panel

### 2.2 Entity Picker Section

- [x] Create entity picker dropdown (reuse metadata from IntelliSense)
- [x] On entity change: update visual query and regenerate preview
- [x] Show entity display name + logical name (grouped by Standard/Custom)

### 2.3 New Panel Architecture

- [x] Create `VisualQueryBuilderSection` and `visualQueryBuilderView.ts`
- [x] Create `VisualQueryBuilderBehavior.js` for webview interactions
- [x] Create application layer re-exports (`application/types/index.ts`)
- [x] Update panel to use `VisualQuery` for state management
- [x] Add FetchXML/SQL preview tabs (read-only)

---

## Step 3: Core Visual Builder - Columns, Filters MVP, Sort

### 3.0 Panel Layout & UX Fixes ✅ COMPLETE

**Problem:** Panel content too tall, no scrolling, poor UX when sections expand.

- [x] Implement two-pane layout:
  ```
  ┌─────────────────────────────┐
  │ Toolbar (fixed)             │  ← Environment + Execute/Export
  ├─────────────────────────────┤
  │ Query Builder Area          │  ← Collapsible + internally scrollable
  │ - Entity picker             │
  │ - Column picker             │
  │ - Query preview             │
  ├─────────────────────────────┤
  │ Results Table               │  ← Fills remaining, scrolls internally
  └─────────────────────────────┘
  ```
- [x] Make entire Query Builder section collapsible (not just individual parts)
- [x] Query builder area: `max-height: 50vh; overflow-y: auto`
- [x] Results table: `flex: 1; overflow-y: auto`
- [ ] Optional: draggable divider between panes (deferred to future)

**Bug:** Columns don't load when panel restores with saved entity selection.
- [x] Fix: In state restoration, if `selectedEntity` exists, call `loadAttributesForEntity()`

**Additional UX Fixes:**
- [x] Fix Ctrl+A not working in search inputs (KeyboardSelectionBehavior)
- [x] Persist and restore full query state (entity + selected columns)
- [x] Use consistent search box pattern with 🔍 emoji placeholder

### 3.1 View Selector Section 📦 DEFERRED

Moved to Step 6 (View Management) which is deferred to future version.
Requires layoutxml generation for proper view saving.

### 3.2 Column Selector Section ✅ COMPLETE

- [x] Create multi-select column picker (checkboxes)
- [x] Load available columns from entity metadata
- [x] Show column display name + logical name + type
- [x] Select All checkbox (reverts to SELECT *)
- [x] Collapsible section with count badge
- [x] Search box to filter columns
- [x] Collapse state persisted to localStorage
- [ ] ~~Allow drag-and-drop reordering~~ (deferred to future)

### 3.3 Filter Builder Section (MVP) ✅ COMPLETE

- [x] Create filter row component (field dropdown, operator dropdown, value input)
- [x] Field dropdown: populated from entity attributes
- [x] Operator dropdown: varies by field type (text, number, date, lookup, optionset)
  - Text: eq, ne, like, not-like, begins-with, ends-with, null, not-null
  - Number: eq, ne, gt, ge, lt, le, null, not-null
  - Date: eq, ne, gt, ge, lt, le, null, not-null
  - Lookup: eq, ne, null, not-null
  - OptionSet: eq, ne, in, not-in, null, not-null
- [x] Value input: varies by field type (text input, number input, date picker, boolean dropdown)
- [x] Add filter button
- [x] Remove filter button (X)
- [x] All filters use AND logic (MVP)
- [x] Filter persistence (save/restore with entity and columns)
- [x] Filter preview integration (filters appear in FetchXML/SQL preview)
- [x] Focus loss bug fixed (value changes don't re-render filter list)

**Implementation Files:**
- `FilterConditionViewModel.ts` - ViewModel for filter row data
- `FilterOperatorConfiguration.ts` - Operators by attribute type
- `visualQueryBuilderView.ts` - Filter section HTML rendering
- `data-explorer.css` - Filter section CSS styles
- `VisualQueryBuilderBehavior.js` - Webview behavior for filter interactions
- `DataExplorerPanelComposed.ts` - Panel handler for filter commands

### 3.3.1 Column Display & Ordering Polish ✅ COMPLETE

- [x] Sort columns by logical name (not display name) for consistency
- [x] Column picker: show `logicalName DisplayName Type` (logical name first, prominent)
- [x] Filter dropdown: show `logicalName (DisplayName)` format
- [x] Plugin Trace Viewer: sort filter fields by OData name for consistency
- [x] Filter out `IsValidForRead=false` columns (prevents query errors on virtual columns)

### 3.4 Sort Section ✅ COMPLETE

- [x] Create sort row (attribute dropdown, direction toggle)
- [x] Single sort for MVP
- [x] Ascending/Descending toggle
- [x] Collapsible section with count badge
- [x] Clear sort button
- [x] Sort persistence (save/restore with entity)
- [x] FetchXML preview includes `<order>` element
- [x] Collapse state persisted to localStorage

### 3.5 Query Options ✅ COMPLETE

- [x] Top N input (default: empty, placeholder 100)
- [x] Distinct checkbox
- [x] Top N validation (1-5000)
- [x] Options persistence (save/restore with entity)
- [x] FetchXML preview includes `top` and `distinct` attributes
- [x] Collapsible section with summary in header

---

## Step 4: Sticky Action Bar (Execute/Clear) ✅ COMPLETE

- [x] Create sticky action bar at bottom of query builder (always visible)
- [x] Execute button - primary style, runs current query
- [x] Clear button - secondary style, resets columns/filters/sort/options (keeps entity)
- [x] Both buttons disabled when no entity selected
- [x] Execute disabled while query running (show spinner)
- [x] Preserve Ctrl+Enter keyboard shortcut

---

## Step 5: Toolbar Redesign (Export/Import) ✅ COMPLETE

### 5.1 Toolbar Layout ✅ COMPLETE

- [x] Keep Environment selector (left side)
- [x] Add Export dropdown (right side)
- [x] Add Import dropdown (right side)
- [x] Move Execute/Clear from sticky action bar to toolbar

### 5.2 Export Dropdown ✅ COMPLETE

**Results (disabled when no results):**
- [x] CSV - use existing CsvExportService
- [x] JSON - JSON.stringify with save dialog

**Query (disabled when no entity):**
- [x] FetchXML (.xml) - save generated FetchXML (default format)
- [x] SQL (.sql) - save generated SQL
- [x] Notebook (.ppdsnb) - create notebook with current query

### 5.3 Import Dropdown ✅ COMPLETE

- [x] FetchXML File (.xml) - parse → populate VQB (uses existing FetchXmlParser)
- [x] SQL File (.sql) - transpile to FetchXML → parse → populate VQB

### 5.4 Import Behavior ✅ COMPLETE

- [x] After import, VQB updates with parsed query
- [x] If entity doesn't exist in environment, show error
- [x] If query has unsupported features, show warning and populate what's possible

---

## Step 6: View Management - Load/Save Views 📦 DEFERRED

**Status:** Deferred to future version
**Reason:** Requires layoutxml generation which is complex (column widths, order, visibility)

See `docs/future/DATA_MANAGEMENT.md` for details.

When implemented:
- Load System Views and Personal Views
- Save as Personal View (UserQuery) to Dataverse
- View selector dropdown in VQB

---

## Step 7: Notebook ↔ Panel Integration ✅ COMPLETE

### 7.1 Notebook → Panel (Cell Toolbar Button) ✅ COMPLETE

- [x] Register `openCellInDataExplorer` command
- [x] Add "Open in Data Explorer" button to notebook cell toolbar (`notebook/cell/title` menu)
- [x] On click: get cell content (SQL or FetchXML) + environment from notebook metadata
- [x] Send to Data Explorer panel: parse query, populate Visual Query Builder
- [x] Uses `$(table)` icon for the toolbar button

### 7.2 Notebook → Panel (Context Menu) ✅ COMPLETE

- [x] Add context menu item in `notebook/cell/context` menu
- [x] Same behavior as toolbar button

### 7.3 Panel → Notebook (Already Working)

- [x] Existing "Open in Notebook" creates new notebook (already implemented in earlier step)
- [x] Include current environment in notebook metadata (already implemented)
- [ ] Optional: Let user choose SQL vs FetchXML format (deferred)

### 7.5 Notebook Cell Export ✅ COMPLETE

- [x] Store query results by cell URI after execution
- [x] Add `exportNotebookCellResultsToCsv` command
- [x] Add `exportNotebookCellResultsToJson` command
- [x] Add commands to `notebook/cell/context` menu
- [x] Reuse existing `CsvExportService` for export functionality

### 7.4 Environment Transfer ✅ COMPLETE

- [x] When sending from notebook to panel: read `environmentId` from notebook metadata
- [x] Panel opens for that environment (creates new or shows existing panel for that env)
- [x] If no environment in notebook: uses `undefined`, panel prompts for selection

---

## Step 8: Advanced Features - AND/OR Groups, Joins 📦 DEFERRED

**Status:** Deferred to future version
**Reason:** MVP complete with basic features; advanced features can come later

See `docs/future/DATA_MANAGEMENT.md` for details.

When implemented:
- AND/OR filter groups with nesting
- Multi-column sort
- Link entities (joins) in visual builder
- Aggregates in visual builder

---

## Step 9: Cleanup & Polish ✅ COMPLETE

### 9.1 Remove Unused Code ✅ COMPLETE

- [x] Remove SqlEditorWatcher (if fully unused)
- [x] Remove old query editor view code
- [x] Remove old SQL/FetchXML mode tabs
- [x] Clean up unused CSS

### 9.2 IntelliSense Consideration ✅ N/A

File-based editing removed in favor of Visual Query Builder + Notebooks.
IntelliSense works in notebooks (SQL and FetchXML cells).

### 9.3 Environment Isolation Verification ✅ COMPLETE

- [x] Verify notebook environment isolated from panel
- [x] Test: change panel env, notebook env unchanged
- [x] Test: notebook → panel transfer preserves env
- [x] Environment persists on save/load

### 9.4 Testing ✅ COMPLETE

- [x] Unit tests for view use cases
- [x] Integration tests for visual builder panel
- [x] Manual E2E testing

---

## Notes

- FetchXML parser is the critical path - everything depends on it ✅
- Start with MVP filter (simple conditions, AND only)
- Test frequently - visual builder is complex UI
- Keep notebooks working throughout - don't break existing functionality
