# Data Explorer Visual Query Builder - Implementation Plan

## Overview

Transform the Data Explorer panel from a code-based query editor to a **Visual Query Builder** (like Advanced Find), while keeping notebooks as the primary code editing experience.

**Key Principle:**
- **Panel = Visual/Point-and-click** (unique value)
- **Notebooks = Code-based** (SQL/FetchXML)

---

## Phase 1: Foundation - FetchXML Parser & Domain Model

### 1.1 Domain Entities for Visual Query

- [ ] Create `VisualQuery` entity (entity, columns, filters, sort, distinct, top)
- [ ] Create `QueryColumn` value object (name, width, alias)
- [ ] Create `QueryFilter` value object (field, operator, value, type)
- [ ] Create `QueryFilterGroup` value object (type: AND/OR, conditions, nested groups)
- [ ] Create `QuerySort` value object (attribute, descending)

### 1.2 FetchXML Parser (Domain Service)

- [ ] Create `FetchXmlParser` domain service
- [ ] Parse `<entity name="...">` → entity name
- [ ] Parse `<attribute name="...">` → columns array
- [ ] Parse `<filter type="and|or">` → filter groups
- [ ] Parse `<condition attribute="..." operator="..." value="...">` → conditions
- [ ] Parse `<order attribute="..." descending="...">` → sort
- [ ] Parse `<fetch top="..." distinct="...">` → query options
- [ ] Handle nested `<filter>` groups (Phase 2 complexity)
- [ ] Handle `<link-entity>` (Phase 2 - joins)
- [ ] Unit tests for parser

### 1.3 FetchXML Generator (Enhance Existing)

- [ ] Create `FetchXmlGenerator` domain service (or enhance existing transpiler)
- [ ] Generate `<fetch>` with top, distinct attributes
- [ ] Generate `<entity>` with attributes
- [ ] Generate `<attribute>` elements from columns
- [ ] Generate `<filter>` and `<condition>` from filter model
- [ ] Generate `<order>` from sort model
- [ ] Unit tests for generator

---

## Phase 2: View Management (savedquery/userquery)

### 2.1 Domain

- [ ] Create `SavedView` entity (id, name, entityName, fetchXml, isSystem, isDefault)
- [ ] Create `ISavedViewRepository` interface

### 2.2 Infrastructure

- [ ] Create `DataverseSavedViewRepository` implementation
- [ ] Implement `getSystemViews(entityName)` - GET savedqueries
- [ ] Implement `getPersonalViews(entityName)` - GET userqueries
- [ ] Implement `savePersonalView(view)` - POST userquery
- [ ] Implement `updatePersonalView(view)` - PATCH userquery
- [ ] Implement `deletePersonalView(id)` - DELETE userquery

### 2.3 Application Layer

- [ ] Create `ListSavedViewsUseCase` (combines system + personal views)
- [ ] Create `LoadSavedViewUseCase` (fetches view details)
- [ ] Create `SavePersonalViewUseCase` (creates userquery)
- [ ] Create `UpdatePersonalViewUseCase` (updates userquery)
- [ ] Create `DeletePersonalViewUseCase` (deletes userquery)

---

## Phase 3: Visual Query Builder UI

### 3.1 Panel Restructure - Remove Old Code Editor

- [ ] Remove `New Query` button and handler
- [ ] Remove `Open File` button and handler
- [ ] Remove SQL Mode tab (external editor integration)
- [ ] Remove FetchXML Mode inline editing
- [ ] Remove `SqlEditorWatcher` dependency from panel
- [ ] Keep `SqlEditorService` for Import functionality only

### 3.2 Visual Builder - Entity Picker Section

- [ ] Create entity picker dropdown (reuse metadata from IntelliSense)
- [ ] On entity change: clear columns/filters, load entity attributes
- [ ] Show entity display name + logical name

### 3.3 Visual Builder - View Selector Section

- [ ] Create view selector dropdown (System Views | Personal Views groups)
- [ ] On view select: parse FetchXML → populate columns/filters/sort
- [ ] Show "New Query" option to start fresh
- [ ] Add refresh button to reload views

### 3.4 Visual Builder - Column Selector Section

- [ ] Create multi-select column picker (checkboxes)
- [ ] Load available columns from entity metadata
- [ ] Allow drag-and-drop reordering (or up/down buttons)
- [ ] Show column display name + logical name
- [ ] Select all / Deselect all buttons

### 3.5 Visual Builder - Filter Builder Section (MVP)

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

### 3.6 Visual Builder - Sort Section

- [ ] Create sort row (attribute dropdown, direction toggle)
- [ ] Single sort for MVP
- [ ] Ascending/Descending toggle

### 3.7 Visual Builder - Query Options

- [ ] Top N input (default: 100)
- [ ] Distinct checkbox

### 3.8 Preview Section (Read-Only)

- [ ] Tabbed display: [SQL] [FetchXML]
- [ ] Auto-generate from visual builder state
- [ ] Copy button for each tab
- [ ] "Open in Notebook" button moves to Export dropdown

### 3.9 Action Buttons

- [ ] Move Execute button below visual builder (under query area)
- [ ] Add Clear button (resets visual builder)
- [ ] Results table stays at bottom

---

## Phase 4: Toolbar Redesign

### 4.1 Toolbar Layout

- [ ] Keep Environment selector (left side)
- [ ] Add Export dropdown: CSV, SQL File, FetchXML File, Open in Notebook
- [ ] Add Save View button (opens save dialog)
- [ ] Add Import dropdown: SQL File, FetchXML File

### 4.2 Export Functionality

- [ ] Export to CSV (existing, move to dropdown)
- [ ] Export to SQL file (save generated SQL)
- [ ] Export to FetchXML file (save generated FetchXML)
- [ ] Open in Notebook (existing, move to dropdown)

### 4.3 Import Functionality

- [ ] Import SQL file → parse and populate visual builder (best effort)
- [ ] Import FetchXML file → parse and populate visual builder

### 4.4 Save View Dialog

- [ ] Modal dialog: Name input, Description input
- [ ] Save as Personal View (userquery)
- [ ] Show success/error message

---

## Phase 5: Notebook ↔ Panel Integration

### 5.1 Notebook → Panel (CodeLens)

- [ ] Register CodeLens provider for `.ppdsnb` notebooks
- [ ] Show "Open in Data Explorer" above SQL/FetchXML cells
- [ ] On click: send query + environment to panel
- [ ] Panel receives: parse if FetchXML, show in preview, execute

### 5.2 Notebook → Panel (Context Menu)

- [ ] Add context menu item: "Open in Data Explorer"
- [ ] Same behavior as CodeLens

### 5.3 Panel → Notebook (Enhanced)

- [ ] Existing "Open in Notebook" creates new notebook
- [ ] Include current environment in notebook metadata
- [ ] Pre-populate with generated SQL or FetchXML (user choice?)

### 5.4 Environment Transfer

- [ ] When sending from notebook to panel: include environment ID
- [ ] Panel auto-selects that environment
- [ ] If environment not available: show error, use current

---

## Phase 6: Advanced Features (Full Advanced Find Parity)

### 6.1 AND/OR Filter Groups

- [ ] Allow switching between AND/OR at group level
- [ ] Create nested filter groups
- [ ] UI: Indented groups with AND/OR label
- [ ] Parser support for nested `<filter>` elements

### 6.2 Multi-Column Sort

- [ ] Allow multiple sort criteria
- [ ] Drag to reorder priority
- [ ] Add/remove sort rows

### 6.3 Link Entities (Joins)

- [ ] Add "Related Records" section
- [ ] Select related entity (1:N, N:1 relationships)
- [ ] Add columns from related entity
- [ ] Add filters on related entity
- [ ] Generate `<link-entity>` in FetchXML

### 6.4 Aggregates (Bonus)

- [ ] Group By support
- [ ] Aggregate functions (count, sum, avg, min, max)
- [ ] Having clause support

---

## Phase 7: Cleanup & Polish

### 7.1 Remove Unused Code

- [ ] Remove SqlEditorWatcher (if fully unused)
- [ ] Remove old query editor view code
- [ ] Remove old SQL/FetchXML mode tabs
- [ ] Clean up unused CSS

### 7.2 IntelliSense Consideration

- [ ] Verify IntelliSense still works for standalone SQL files
- [ ] Document environment behavior for SQL files
- [ ] Consider: FetchXML IntelliSense (future)

### 7.3 Environment Isolation Verification

- [ ] Verify notebook environment isolated from panel
- [ ] Test: change panel env, notebook env unchanged
- [ ] Test: notebook → panel transfer preserves env

### 7.4 Testing

- [ ] Unit tests for FetchXML parser
- [ ] Unit tests for FetchXML generator
- [ ] Unit tests for view use cases
- [ ] Integration tests for visual builder panel
- [ ] Manual E2E testing

---

## Implementation Order (Recommended)

1. **Phase 1**: Domain model + FetchXML parser (foundation for everything)
2. **Phase 3.1-3.2**: Remove old editor, add entity picker (start fresh)
3. **Phase 3.3-3.6**: Core visual builder (columns, filters MVP, sort)
4. **Phase 3.8-3.9**: Preview tabs + action buttons
5. **Phase 4**: Toolbar redesign
6. **Phase 2**: View management (load/save views)
7. **Phase 5**: Notebook ↔ Panel integration
8. **Phase 6**: Advanced features (AND/OR groups, joins)
9. **Phase 7**: Cleanup & polish

---

## Notes

- FetchXML parser is the critical path - everything depends on it
- Start with MVP filter (simple conditions, AND only)
- Test frequently - visual builder is complex UI
- Keep notebooks working throughout - don't break existing functionality
