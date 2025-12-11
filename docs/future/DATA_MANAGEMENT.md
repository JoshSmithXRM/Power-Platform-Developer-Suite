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

### Data Explorer - Load Views (Insert FetchXML from Existing Views)
**Status**: Planned
**Target Version**: v0.5.0 or v0.6.0
**Priority**: Medium
**Estimated Effort**: 8-12 hours
**Value**: Leverage existing System/Personal Views instead of building queries from scratch
**Source**: User feedback (2025-12-08)

**Description**:
Allow users to browse existing System Views (savedquery) and Personal Views (userquery) for an entity, then insert the FetchXML into notebooks or populate the Visual Query Builder.

**Core Features**:
- **Notebook Integration**: Right-click → "Insert FetchXML from View" or cell toolbar button
- **Visual Builder Integration**: "Load from View" dropdown to populate builder
- Browse System Views and Personal Views for selected entity
- Preview view name, description, and column count before inserting
- Insert raw FetchXML into notebook cell (works for both SQL and FetchXML cells)

**Why This Is Simpler Than Full View Management**:
- **Read-only** - No risk of breaking existing views
- **No layoutxml needed** - Only reading fetchxml, not generating column layouts
- **No Save complexity** - Just loading, not creating userquery records

**User Value**:
1. **Discovery** - Learn what views already exist in the environment
2. **Learning** - See real FetchXML examples from their own data
3. **Time saving** - Start from existing queries instead of building from scratch
4. **Consistency** - Use same queries the Dynamics UI uses

**Technical Approach**:
1. Query `savedquery` for System Views (filter by returnedtypecode = entity)
2. Query `userquery` for Personal Views (filter by returnedtypecode = entity)
3. Present in VS Code Quick Pick (grouped by type)
4. Extract `fetchxml` attribute and insert into editor/builder

**API Queries**:
```
GET /savedqueries?$filter=returnedtypecode eq 'account'&$select=name,description,fetchxml
GET /userqueries?$filter=returnedtypecode eq 'account'&$select=name,description,fetchxml
```

---

### Data Explorer - Save as Personal View (UserQuery Creation)
**Status**: Deferred
**Target Version**: v1.0+
**Reason**: Requires layoutxml generation (column widths, order, visibility)

**Description**:
Save Visual Query Builder queries as Personal Views (UserQuery) in Dataverse so they appear in Dynamics Advanced Find.

**Core Features**:
- Save current query as Personal View
- Generate proper layoutxml for column display in Dynamics
- Views appear in Dynamics Advanced Find

**Technical Complexity**:
- layoutxml generation required for proper column display in Dynamics
- Need to calculate column widths, order, visibility
- Different from "Load Views" which is read-only

**Depends On**:
- Load Views feature (v0.5.0/v0.6.0) provides foundation

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

## Technical Debt

### Unified Query Execution Layer
**Status**: Needs Refactor
**Priority**: Medium
**Estimated Effort**: 8-12 hours
**Discovered**: 2025-12-10

**Problem**:
Data Explorer and Notebooks have separate query execution paths that handle virtual columns differently:

| Component | Execution Path | Virtual Column Detection |
|-----------|----------------|-------------------------|
| Notebooks (SQL) | `ExecuteSqlQueryUseCase` | ✅ Has detection + transformation |
| Notebooks (FetchXML) | `ExecuteFetchXmlQueryUseCase` | ❌ No detection |
| Data Explorer Visual Builder | `ExecuteFetchXmlQueryUseCase` | ❌ No detection |
| Data Explorer SQL mode | `ExecuteSqlQueryUseCase` | ✅ Has detection, but mapper not wired |

**Impact**:
- Virtual field filtering works in Notebooks SQL but not in Data Explorer
- Bug fixes need to be applied in multiple places
- "Open in Notebook" ports queries that behave differently

**Root Cause**:
Virtual column detection was added to `ExecuteSqlQueryUseCase` because it has access to the SQL AST. `ExecuteFetchXmlQueryUseCase` takes raw FetchXML and doesn't parse columns.

**Proposed Solution**:
Extract query execution to a shared `QueryExecutionService`:

```
┌─────────────────────────────────────────────────────────────┐
│                    QueryExecutionService                     │
├─────────────────────────────────────────────────────────────┤
│ - Virtual column detection (shared)                          │
│ - Query execution (shared)                                   │
│ - Result mapping with columnsToShow (shared)                 │
└─────────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
┌─────────────────┐          ┌─────────────────────┐
│ ExecuteSqlQuery │          │ ExecuteFetchXmlQuery │
│    UseCase      │          │      UseCase         │
└─────────────────┘          └─────────────────────┘
    (SQL parsing)              (FetchXML parsing)
```

**Work Items**:
1. Create `QueryExecutionService` in application layer
2. Move virtual column detection from use case to service
3. Both use cases delegate to shared service
4. Update Data Explorer and Notebooks to use consistent paths
5. Add tests for unified behavior

**Workaround (Current)**:
Filter virtual fields from column picker so users can't select them. Virtual-only SELECT remains an edge case for raw FetchXML input.

---

**Last Updated**: 2025-12-10 (Added Unified Query Execution Layer tech debt)
