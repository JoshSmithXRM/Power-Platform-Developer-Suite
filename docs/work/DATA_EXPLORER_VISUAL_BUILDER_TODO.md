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
| 5 | Toolbar Redesign (Export/Import) | 🔄 In Progress |
| 6 | View Management - Load/Save Views | 📦 Deferred (needs layoutxml) |
| 7 | Notebook ↔ Panel Integration | ⬜ Pending |
| 8 | Advanced Features - AND/OR Groups, Joins | 📦 Deferred |
| 9 | Cleanup & Polish | ⬜ Pending |

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

## Step 5: Toolbar Redesign (Export/Import) 🔄 IN PROGRESS

### 5.1 Toolbar Layout

- [ ] Keep Environment selector (left side)
- [ ] Add Export dropdown (right side)
- [ ] Add Import dropdown (right side)

### 5.2 Export Dropdown

**Results (disabled when no results):**
- [ ] CSV - use existing CsvExportService
- [ ] JSON - JSON.stringify with save dialog

**Query (disabled when no entity):**
- [ ] FetchXML (.xml) - save generated FetchXML (default format)
- [ ] SQL (.sql) - save generated SQL
- [ ] Notebook (.ppdsnb) - create notebook with current query

### 5.3 Import Dropdown

- [ ] FetchXML File (.xml) - parse → populate VQB (uses existing FetchXmlParser)
- [ ] SQL File (.sql) - transpile to FetchXML → parse → populate VQB

### 5.4 Import Behavior

- [ ] After import, VQB updates with parsed query
- [ ] If entity doesn't exist in environment, show error
- [ ] If query has unsupported features, show warning and populate what's possible

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

## Step 7: Notebook ↔ Panel Integration

### 7.1 Notebook → Panel (CodeLens)

- [ ] Register CodeLens provider for `.ppdsnb` notebooks
- [ ] Show "Open in Data Explorer" above SQL/FetchXML cells
- [ ] On click: send query + environment to panel
- [ ] Panel receives: parse if FetchXML, show in preview, execute

### 7.2 Notebook → Panel (Context Menu)

- [ ] Add context menu item: "Open in Data Explorer"
- [ ] Same behavior as CodeLens

### 7.3 Panel → Notebook (Enhanced)

- [ ] Existing "Open in Notebook" creates new notebook
- [ ] Include current environment in notebook metadata
- [ ] Pre-populate with generated SQL or FetchXML (user choice?)

### 7.4 Environment Transfer

- [ ] When sending from notebook to panel: include environment ID
- [ ] Panel auto-selects that environment
- [ ] If environment not available: show error, use current

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

## Step 9: Cleanup & Polish

### 9.1 Remove Unused Code

- [ ] Remove SqlEditorWatcher (if fully unused)
- [ ] Remove old query editor view code
- [ ] Remove old SQL/FetchXML mode tabs
- [ ] Clean up unused CSS

### 9.2 IntelliSense Consideration

- [ ] Verify IntelliSense still works for standalone SQL files
- [ ] Document environment behavior for SQL files
- [ ] Consider: FetchXML IntelliSense (future)

### 9.3 Environment Isolation Verification

- [ ] Verify notebook environment isolated from panel
- [ ] Test: change panel env, notebook env unchanged
- [ ] Test: notebook → panel transfer preserves env

### 9.4 Testing

- [ ] Unit tests for view use cases
- [ ] Integration tests for visual builder panel
- [ ] Manual E2E testing

---

## Notes

- FetchXML parser is the critical path - everything depends on it ✅
- Start with MVP filter (simple conditions, AND only)
- Test frequently - visual builder is complex UI
- Keep notebooks working throughout - don't break existing functionality
