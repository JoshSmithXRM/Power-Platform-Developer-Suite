# Data Management Enhancements

Features for querying, manipulating, and managing Dataverse data.

---

## Implemented

### Data Explorer (SQL/FetchXML Query Execution)
**Status**: Implemented (v0.2.2 - v0.2.6)
**Version**: v0.2.2 (MVP), v0.2.4 (FetchXML mode), v0.2.6 (settings)

**What's Implemented**:
- SQL query editor with syntax highlighting
- SQL → FetchXML transpilation with live preview
- FetchXML direct editing mode (bidirectional preview)
- FetchXML → SQL transpilation with warnings for unsupported features
- Query execution against Dataverse
- Results displayed in sortable data table
- Clickable record links (lookup fields and primary keys)
- Copy record URL button on hover
- Export results to CSV
- Keyboard shortcut (Ctrl+Enter)
- Query mode persistence per environment
- Row limit warning modal (TOP 100 prompt)
- Zone-based Ctrl+A selection in results table

**SQL Support** (Implemented):
- SELECT with column list or *
- FROM with table (entity) name
- WHERE with conditions (=, <>, <, >, LIKE, IN, IS NULL)
- ORDER BY
- TOP / LIMIT for pagination

**Implementation**: `src/features/dataExplorer/`

---

### Data Explorer - IntelliSense
**Status**: Implemented (v0.3.0)
**Completed**: 2025-12-06

**What's Implemented**:
- Native VS Code SQL editor integration (New Query, Open File buttons)
- Entity name completion (after FROM/JOIN)
- Attribute name completion (after SELECT/WHERE/ORDER BY)
- Context-aware SQL keyword completion
- String literal detection (no suggestions inside quotes)
- Metadata caching for performance (per environment)
- Ctrl+Enter keybinding for query execution from VS Code editor
- FetchXML IntelliSense (element, attribute, operator suggestions)
- Document-scoped environment resolution (notebooks vs panel)

**Implementation**: `src/features/dataExplorer/presentation/providers/`

---

### Data Explorer - Notebooks
**Status**: Implemented (v0.3.0)
**Completed**: 2025-12-06

**What's Implemented**:
- Combined SQL/FetchXML notebook support (.ppdsnb extension)
- SQL cells transpile → execute as FetchXML
- FetchXML cells execute directly
- Clickable record links in notebook output (open in browser)
- Environment stored in notebook metadata
- IntelliSense works in notebook cells (reads environment from metadata)

**Implementation**: `src/features/dataExplorer/notebooks/`

---

### Data Explorer - Aggregates & Basic JOINs
**Status**: Implemented (v0.3.0)
**Completed**: 2025-12-06

**Aggregate Support**:
- DISTINCT keyword
- COUNT(*), COUNT(column), COUNT(DISTINCT column)
- SUM, AVG, MIN, MAX functions
- GROUP BY clause (single and multiple columns)
- Column aliases for aggregates

**JOIN Support**:
- INNER JOIN → FetchXML `<link-entity link-type="inner">`
- LEFT JOIN → FetchXML `<link-entity link-type="outer">`
- Table aliases (`FROM account a`)
- Qualified column references (`a.name`)

**Example Queries**:
```sql
SELECT statecode, COUNT(*) as count
FROM contact
GROUP BY statecode

SELECT a.name, c.fullname
FROM account a
INNER JOIN contact c ON a.primarycontactid = c.contactid
WHERE a.revenue > 1000000
```

**Implementation**: `src/features/dataExplorer/domain/sql/`

---

### Data Explorer - Visual Query Builder
**Status**: Implemented (v0.3.0)
**Completed**: 2025-12-08

**Description**:
Transform the Data Explorer panel from a code-based query editor to a Visual Query Builder (like Advanced Find), while keeping notebooks as the primary code editing experience.

**What's Implemented**:
- Visual Query Builder UI (entity picker, column selector, filter builder, sort, options)
- FetchXML parser/generator (bidirectional: populate builder ↔ generate FetchXML)
- Query preview tabs (FetchXML/SQL - read-only)
- Toolbar with Execute, Clear, Export, and Import dropdowns
- Export: Results (CSV, JSON) and Query (FetchXML, SQL, Notebook)
- Import: FetchXML and SQL files → parse and populate Visual Query Builder
- Notebook ↔ Panel integration (cell toolbar button, context menu)
- Cell export (CSV/JSON from notebook cell results)
- Environment isolation (notebook and panel environments independent)
- State persistence (entity, columns, filters, sort, options saved per environment)

**Implementation**: `src/features/dataExplorer/`

---

## Deferred (Future Versions)

### Data Explorer - Query History
**Status**: Deferred
**Target Version**: v1.0+
**Reason**: Notebooks now serve as query history (saved queries with results)

**Original Plan**:
- Environment-specific history (last 50 per env)
- Cross-environment history (last 100 global)
- History dropdown + "View All" modal UI

**Why Deferred**: Notebooks provide better query history - queries are saved to files with results, can be version controlled, shared, and organized by the user.

---

### Data Explorer - INSERT/UPDATE/DELETE
**Status**: Deferred
**Target Version**: v1.0+
**Priority**: Medium
**Estimated Effort**: 12-16 hours
**Value**: Full CRUD operations from SQL

**Description**:
Support data modification statements with safety features.

**Core Features**:
- INSERT INTO entity (columns) VALUES (values)
- UPDATE entity SET column = value WHERE condition
- DELETE FROM entity WHERE condition
- Preview affected records before execution
- Confirmation dialogs with record counts
- Batch operations (100 records per batch)

**Safety Features**:
- Require WHERE clause for UPDATE/DELETE
- Preview mode before executing
- Extra confirmation for >100 records

---

### Data Explorer - View Management (UserQuery Save/Load)
**Status**: Deferred
**Target Version**: v1.0+
**Reason**: Requires layoutxml generation (column widths, order, visibility)

**Description**:
Save Visual Query Builder queries as Personal Views (UserQuery) in Dataverse, and load existing views.

**Core Features**:
- View selector dropdown (System Views | Personal Views)
- Save as Personal View (creates userquery record)
- Load existing Personal Views
- Views appear in Dynamics Advanced Find

**Technical Complexity**:
- layoutxml generation required for proper column display in Dynamics
- Need to calculate column widths, order, visibility
- System Views require solution context

---

### Data Explorer - Advanced Visual Query Builder Features
**Status**: Deferred
**Target Version**: v1.0+
**Reason**: MVP complete with basic features

**Features**:
- AND/OR filter groups with nesting
- Multi-column sort with drag reorder
- Link entities (joins) in visual builder UI
- Aggregates in visual builder (GROUP BY, COUNT, SUM, etc.)

**Technical Notes**:
- FetchXmlParser already supports nested filters
- Would need significant UI work for join builder

---

### Advanced Aggregates
**Status**: Deferred
**Target Version**: v1.0+
**Reason**: Requires custom SQL syntax or has no direct SQL equivalent

**Features**:
- HAVING clause: `SELECT statecode, COUNT(*) FROM account GROUP BY statecode HAVING COUNT(*) > 10`
- Date grouping: `GROUP BY YEAR(createdon)` → FetchXML `dategrouping="year"`
  - Supported in FetchXML: day, week, month, quarter, year, fiscal-period, fiscal-year
- User timezone control for date grouping

**Technical Notes**:
- HAVING requires post-processing or FetchXML filter workarounds
- Date grouping requires custom SQL syntax (non-standard)

---

### Advanced JOIN Types
**Status**: Deferred
**Target Version**: v1.0+
**Reason**: FetchXML supports join types without standard SQL equivalents

| FetchXML link-type | SQL Equivalent | Status |
|--------------------|----------------|--------|
| `inner` | INNER JOIN | Implemented |
| `outer` | LEFT JOIN | Implemented |
| `exists` | EXISTS subquery | No standard SQL |
| `in` | IN subquery | No standard SQL |
| `any` / `not any` | None | No SQL equivalent |
| `all` / `not all` | None | No SQL equivalent |
| `matchfirstrowusingcrossapply` | CROSS APPLY | Not standard SQL |

**Options for future**:
- Add FetchXML-specific syntax: `JOIN entity USING EXISTS`
- Or leave as FetchXML-only features (use FetchXML mode directly)

---

## Medium Priority

### Record Cloning (Cross-Environment)
**Status**: Deferred
**Target Version**: v1.1+
**Priority**: Medium
**Estimated Effort**: 16-24 hours
**Value**: Copy records between environments for testing/data migration

**Description**:
Query records in source environment and clone to target environment.

**Core Features**:
- Dual environment connection (source + target)
- Query builder (reuse Data Explorer)
- Column mapping (handle different schemas)
- Preview before clone
- Batch operations with progress

**Technical Considerations**:
- Requires two authenticated connections
- Handle lookup field remapping
- Skip system fields (createdon, modifiedon, etc.)

---

### Bulk Data Operations
**Status**: Deferred
**Target Version**: v1.1+
**Priority**: Medium
**Estimated Effort**: 16-24 hours
**Value**: Safe bulk update/delete with preview

**Description**:
Bulk update or delete records with preview and confirmation.

**Core Features**:
- Query records (reuse Data Explorer)
- Bulk update: set field values across records
- Bulk delete: remove matching records
- Preview affected records before execution

**Safety Features**:
- Record count confirmation
- Preview first N records
- Dry-run mode

---

**Last Updated**: 2025-12-08
