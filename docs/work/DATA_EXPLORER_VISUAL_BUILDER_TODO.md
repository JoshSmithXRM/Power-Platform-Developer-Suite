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
| 3 | Core Visual Builder - Columns, Filters MVP, Sort | 🔄 Next |
| 4 | Preview Section & Action Buttons | ⬜ Pending |
| 5 | Toolbar Redesign | ⬜ Pending |
| 6 | View Management - Load/Save Views | ⬜ Pending |
| 7 | Notebook ↔ Panel Integration | ⬜ Pending |
| 8 | Advanced Features - AND/OR Groups, Joins | ⬜ Pending |
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

### 3.1 View Selector Section (Placeholder for Step 6)

- [ ] Create view selector dropdown (System Views | Personal Views groups)
- [ ] On view select: parse FetchXML → populate columns/filters/sort
- [ ] Show "New Query" option to start fresh
- [ ] Add refresh button to reload views

### 3.2 Column Selector Section

- [ ] Create multi-select column picker (checkboxes)
- [ ] Load available columns from entity metadata
- [ ] Allow drag-and-drop reordering (or up/down buttons)
- [ ] Show column display name + logical name
- [ ] Select all / Deselect all buttons

### 3.3 Filter Builder Section (MVP)

- [ ] Create filter row component (field dropdown, operator dropdown, value input)
- [ ] Field dropdown: populated from entity attributes
- [ ] Operator dropdown: varies by field type (text, number, date, lookup, optionset)
  - Text: eq, ne, like, not-like, begins-with, ends-with, contains, null, not-null
  - Number: eq, ne, gt, ge, lt, le, null, not-null
  - Date: eq, on, on-or-before, on-or-after, today, yesterday, last-x-days, etc.
  - Lookup: eq, ne, null, not-null, eq-userid, ne-userid
  - OptionSet: eq, ne, in, not-in, null, not-null
- [ ] Value input: varies by field type (text input, number input, date picker, lookup picker, optionset dropdown)
- [ ] Add filter button
- [ ] Remove filter button (X)
- [ ] All filters use AND logic (MVP)

### 3.4 Sort Section

- [ ] Create sort row (attribute dropdown, direction toggle)
- [ ] Single sort for MVP
- [ ] Ascending/Descending toggle

### 3.5 Query Options

- [ ] Top N input (default: 100)
- [ ] Distinct checkbox

---

## Step 4: Preview Section & Action Buttons

### 4.1 Preview Section (Read-Only)

- [ ] Tabbed display: [SQL] [FetchXML]
- [ ] Auto-generate from visual builder state
- [ ] Copy button for each tab
- [ ] "Open in Notebook" button moves to Export dropdown

### 4.2 Action Buttons

- [ ] Move Execute button below visual builder (under query area)
- [ ] Add Clear button (resets visual builder)
- [ ] Results table stays at bottom

---

## Step 5: Toolbar Redesign

### 5.1 Toolbar Layout

- [ ] Keep Environment selector (left side)
- [ ] Add Export dropdown: CSV, SQL File, FetchXML File, Open in Notebook
- [ ] Add Save View button (opens save dialog)
- [ ] Add Import dropdown: SQL File, FetchXML File

### 5.2 Export Functionality

- [ ] Export to CSV (existing, move to dropdown)
- [ ] Export to SQL file (save generated SQL)
- [ ] Export to FetchXML file (save generated FetchXML)
- [ ] Open in Notebook (existing, move to dropdown)

### 5.3 Import Functionality

- [ ] Import SQL file → parse and populate visual builder (best effort)
- [ ] Import FetchXML file → parse and populate visual builder

### 5.4 Save View Dialog

- [ ] Modal dialog: Name input, Description input
- [ ] Save as Personal View (userquery)
- [ ] Show success/error message

---

## Step 6: View Management - Load/Save Views

### 6.1 Domain

- [ ] Create `SavedView` entity (id, name, entityName, fetchXml, isSystem, isDefault)
- [ ] Create `ISavedViewRepository` interface

### 6.2 Infrastructure

- [ ] Create `DataverseSavedViewRepository` implementation
- [ ] Implement `getSystemViews(entityName)` - GET savedqueries
- [ ] Implement `getPersonalViews(entityName)` - GET userqueries
- [ ] Implement `savePersonalView(view)` - POST userquery
- [ ] Implement `updatePersonalView(view)` - PATCH userquery
- [ ] Implement `deletePersonalView(id)` - DELETE userquery

### 6.3 Application Layer

- [ ] Create `ListSavedViewsUseCase` (combines system + personal views)
- [ ] Create `LoadSavedViewUseCase` (fetches view details)
- [ ] Create `SavePersonalViewUseCase` (creates userquery)
- [ ] Create `UpdatePersonalViewUseCase` (updates userquery)
- [ ] Create `DeletePersonalViewUseCase` (deletes userquery)

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

## Step 8: Advanced Features - AND/OR Groups, Joins

### 8.1 AND/OR Filter Groups

- [ ] Allow switching between AND/OR at group level
- [ ] Create nested filter groups
- [ ] UI: Indented groups with AND/OR label
- [ ] Parser support for nested `<filter>` elements

### 8.2 Multi-Column Sort

- [ ] Allow multiple sort criteria
- [ ] Drag to reorder priority
- [ ] Add/remove sort rows

### 8.3 Link Entities (Joins)

- [ ] Add "Related Records" section
- [ ] Select related entity (1:N, N:1 relationships)
- [ ] Add columns from related entity
- [ ] Add filters on related entity
- [ ] Generate `<link-entity>` in FetchXML

### 8.4 Aggregates (Bonus)

- [ ] Group By support
- [ ] Aggregate functions (count, sum, avg, min, max)
- [ ] Having clause support

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
