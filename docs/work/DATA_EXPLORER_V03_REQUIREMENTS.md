# Data Explorer v0.3.0 - Requirements

**Branch:** `feature/finish-data-explorer-web-resources-metadata`
**Created:** 2025-12-04
**Target Version:** v0.3.0

---

## Overview

Transform Data Explorer from a basic query tool into a full-featured SQL development environment for Dataverse. The goal is to match the polish of Web Resources panel - seamless VS Code integration, intelligent assistance, and workflows that bridge VS Code and Dynamics.

---

## Current Architecture

The Data Explorer panel currently supports **two query modes** with bidirectional sync:

```
┌─────────────────────────────────────────────────────────────────┐
│ Environment: [Contoso Dev ▼]                                    │
├─────────────────────────────────────────────────────────────────┤
│ [SQL Mode]  [FetchXML Mode]                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ SQL Mode ─────────────────────────────────────────────────┐ │
│  │ SQL Editor (textarea)     │ FetchXML Preview (read-only)  │ │
│  │ User types SQL here       │ Live transpilation updates    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           ↕ switch modes ↕                      │
│  ┌─ FetchXML Mode ────────────────────────────────────────────┐ │
│  │ FetchXML Editor (textarea) │ SQL Preview (read-only)      │ │
│  │ User types FetchXML here   │ Transpiles with warnings     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Execute Query]  [Export CSV]                                   │
├─────────────────────────────────────────────────────────────────┤
│ Results Table (sortable, clickable links)                       │
└─────────────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- SQL ↔ FetchXML transpilation is bidirectional
- Edit SQL → FetchXML preview updates automatically
- Switch to FetchXML mode → edit FetchXML directly → SQL preview shows equivalent (with warnings for unsupported features)
- Query mode persists per environment

**After v0.3.0 enhancements:**
- Phase 1: SQL editing moves to native VS Code editor (with IntelliSense), FetchXML mode stays in panel
- Phase 5: Visual Query Builder becomes a THIRD mode alongside SQL and FetchXML

---

## Feature Summary

| # | Feature | Priority | Effort Est. | Status |
|---|---------|----------|-------------|--------|
| 1 | IntelliSense + Native VS Code Editor | P0 | 12-18h | Planned |
| 2 | Query History (Dual Scope) | P0 | 6-8h | Planned |
| 3 | Aggregates & GROUP BY | P1 | 8-12h | Planned |
| 4 | JOINs (link-entity) | P1 | 8-12h | Planned |
| 5 | INSERT/UPDATE/DELETE | P1 | 12-16h | Planned |
| 6 | Visual Query Builder + Saved Queries | P2 | 16-24h | Planned (may defer) |

**Total Estimated Effort:** 62-90 hours

**Note:** Feature 6 is the most likely to be deferred if scope needs trimming. Features 1-5 establish core SQL editing experience; Feature 6 adds visual alternative and persistence.

---

## Feature 1: IntelliSense + Native VS Code Editor

### Problem Statement
Currently, users type SQL in a webview textarea without any assistance. They must remember entity and attribute names, leading to typos and frustration. The textarea lacks the polish of a native VS Code editor.

### Goals
1. Move SQL editing from webview textarea to native VS Code editor
2. Provide context-aware autocomplete for Dataverse metadata
3. Maintain bidirectional preview (SQL ↔ FetchXML)
4. Support opening existing .sql files with full IntelliSense

### Requirements

#### 1.1 Native Editor Integration
| ID | Requirement | Priority |
|----|-------------|----------|
| 1.1.1 | "New Query" button opens untitled SQL document in VS Code editor | P0 |
| 1.1.2 | "Open File" button shows file picker for .sql/.xml files | P0 |
| 1.1.3 | Execute Query works from panel (reads from active/visible SQL editor) | P0 |
| 1.1.4 | Ctrl+Enter in SQL editor executes query (when Data Explorer panel is open) | P1 |
| 1.1.5 | FetchXML preview updates as SQL is typed (debounced) | P1 |
| 1.1.6 | Results display in Data Explorer panel | P0 |

#### 1.2 Entity Completion
| ID | Requirement | Priority |
|----|-------------|----------|
| 1.2.1 | After typing `FROM `, suggest all entity logical names | P0 |
| 1.2.2 | After typing `JOIN `, suggest all entity logical names | P0 |
| 1.2.3 | Show display name as completion detail (e.g., "account" → "Account") | P0 |
| 1.2.4 | Show entity type indicator (System/Custom) | P2 |
| 1.2.5 | Filter suggestions as user types (prefix match) | P0 |
| 1.2.6 | Sort by relevance (exact match first, then prefix, then contains) | P1 |

#### 1.3 Attribute Completion
| ID | Requirement | Priority |
|----|-------------|----------|
| 1.3.1 | After `SELECT `, suggest attributes for the FROM entity | P0 |
| 1.3.2 | After `WHERE `, suggest attributes for the FROM entity | P0 |
| 1.3.3 | After `ORDER BY `, suggest attributes for the FROM entity | P0 |
| 1.3.4 | After comma in SELECT list, suggest more attributes | P0 |
| 1.3.5 | Show attribute type in detail (String, Integer, Lookup, etc.) | P0 |
| 1.3.6 | Show display name as completion detail | P1 |
| 1.3.7 | Support aliased tables (`a.name` when `FROM account a`) | P1 |

#### 1.4 Keyword Completion
| ID | Requirement | Priority |
|----|-------------|----------|
| 1.4.1 | At start of query, suggest SELECT, INSERT, UPDATE, DELETE | P0 |
| 1.4.2 | After SELECT columns, suggest FROM | P0 |
| 1.4.3 | After FROM entity, suggest WHERE, ORDER BY, JOIN, GROUP BY | P0 |
| 1.4.4 | After WHERE condition, suggest AND, OR | P0 |
| 1.4.5 | Suggest comparison operators (=, <>, <, >, LIKE, IN, IS NULL) | P2 |

#### 1.5 Metadata Caching
| ID | Requirement | Priority |
|----|-------------|----------|
| 1.5.1 | Cache entity list per environment (no TTL - until env change) | P0 |
| 1.5.2 | Cache attribute list per entity with 5-minute TTL | P0 |
| 1.5.3 | Clear cache when environment changes | P0 |
| 1.5.4 | Show loading indicator during first metadata fetch | P2 |

#### 1.6 Context Service
| ID | Requirement | Priority |
|----|-------------|----------|
| 1.6.1 | Track active environment from Data Explorer panel | P0 |
| 1.6.2 | IntelliSense only works when environment is selected | P0 |
| 1.6.3 | Update context when user changes environment in panel | P0 |

### Technical Design
See: `docs/future/DATA_EXPLORER_INTELLISENSE_DESIGN.md` (V2)

### Success Criteria
- [ ] Typing "FROM acc" suggests "account" within 500ms
- [ ] Typing "SELECT na" (with account as FROM entity) suggests "name"
- [ ] Opening a .sql file from disk gets IntelliSense for active environment
- [ ] Query execution works seamlessly between editor and panel

---

## Feature 2: Query History (Dual Scope)

### Problem Statement
Users frequently run the same queries or variations. Currently, there's no way to recall previous queries. The dev→prod workflow requires manually copying queries between environments.

### Goals
1. Remember queries run in each environment
2. Enable cross-environment query reuse (dev → prod workflow)
3. Quick access to recent queries

### Requirements

#### 2.1 Environment-Specific History
| ID | Requirement | Priority |
|----|-------------|----------|
| 2.1.1 | Store last 50 queries per environment | P0 |
| 2.1.2 | Record: SQL text, timestamp, row count, execution time (ms) | P0 |
| 2.1.3 | Display in panel as searchable dropdown/list | P0 |
| 2.1.4 | Click query to load into editor | P0 |
| 2.1.5 | Show query preview on hover (first 100 chars) | P1 |
| 2.1.6 | Clear history option (per environment) | P2 |
| 2.1.7 | Deduplicate identical queries (update timestamp, keep latest) | P1 |

#### 2.2 Cross-Environment History (Global)
| ID | Requirement | Priority |
|----|-------------|----------|
| 2.2.1 | Store last 100 queries across all environments | P0 |
| 2.2.2 | Record: SQL text, environment name, environment ID, timestamp | P0 |
| 2.2.3 | Display as separate section or toggle in history panel | P0 |
| 2.2.4 | "Run in Current Environment" action | P0 |
| 2.2.5 | Show which environment query was last run in | P0 |
| 2.2.6 | Search/filter by SQL text | P1 |

#### 2.3 Storage
| ID | Requirement | Priority |
|----|-------------|----------|
| 2.3.1 | Persist using VS Code globalState (survives restart) | P0 |
| 2.3.2 | Storage format: JSON with version for migrations | P1 |
| 2.3.3 | Limit storage size (prune old entries if needed) | P1 |

#### 2.4 UI Integration (Hybrid: Dropdown + Modal)
| ID | Requirement | Priority |
|----|-------------|----------|
| 2.4.1 | History dropdown in toolbar (last 5-10 queries, quick access) | P0 |
| 2.4.2 | "View All History" option opens modal with full search/filter | P0 |
| 2.4.3 | Modal shows tabs: "This Environment" / "All Environments" | P0 |
| 2.4.4 | Keyboard shortcut to open history (e.g., Ctrl+H in panel) | P2 |
| 2.4.5 | Pin/favorite frequently used queries | P2 |

#### 2.5 Storage Format
Store both environment ID and name for graceful handling of renames/deletions:
```json
{
  "version": 1,
  "environmentHistory": {
    "env-abc-123": [
      {
        "sql": "SELECT * FROM account",
        "timestamp": "2025-12-04T10:30:00Z",
        "rowCount": 42,
        "executionTimeMs": 350
      }
    ]
  },
  "globalHistory": [
    {
      "sql": "SELECT * FROM account",
      "environmentId": "env-abc-123",
      "environmentName": "Contoso Dev",
      "timestamp": "2025-12-04T10:30:00Z"
    }
  ]
}
```
- Environment ID used for "Run in Current Environment" action
- Environment name shown for display (update on access if env still exists)
- Deleted environments show as "Contoso Dev (deleted)"

### Success Criteria
- [ ] Run query in Dev → Switch to Prod → Find query in global history → Execute
- [ ] Search history for "account" finds all queries with "account"
- [ ] History persists across VS Code restarts

---

## Feature 3: Aggregates & GROUP BY

### Problem Statement
Users cannot perform aggregate queries (counts, sums, averages) that are essential for data analysis and reporting.

### Goals
1. Support standard SQL aggregate functions
2. Support GROUP BY for grouping results
3. Transpile to FetchXML aggregate syntax

### Requirements

#### 3.1 Aggregate Functions
| ID | Requirement | Priority |
|----|-------------|----------|
| 3.1.1 | COUNT(*) - count all rows | P0 |
| 3.1.2 | COUNT(column) - count non-null values | P0 |
| 3.1.3 | SUM(column) - sum numeric values | P0 |
| 3.1.4 | AVG(column) - average numeric values | P0 |
| 3.1.5 | MIN(column) - minimum value | P0 |
| 3.1.6 | MAX(column) - maximum value | P0 |
| 3.1.7 | COUNT(DISTINCT column) - count unique values | P1 |
| 3.1.8 | Column aliases: `COUNT(*) as total` | P0 |

#### 3.2 GROUP BY
| ID | Requirement | Priority |
|----|-------------|----------|
| 3.2.1 | GROUP BY single column | P0 |
| 3.2.2 | GROUP BY multiple columns | P0 |
| 3.2.3 | Validate: non-aggregated columns must be in GROUP BY | P0 |
| 3.2.4 | HAVING clause for filtering aggregated results | P1 |

#### 3.3 FetchXML Transpilation
| ID | Requirement | Priority |
|----|-------------|----------|
| 3.3.1 | Set `aggregate="true"` on fetch element | P0 |
| 3.3.2 | Generate `<attribute aggregate="count">` etc. | P0 |
| 3.3.3 | Generate `<attribute groupby="true">` for GROUP BY columns | P0 |
| 3.3.4 | Handle aliases in FetchXML | P0 |

### Example Queries
```sql
-- Count all contacts
SELECT COUNT(*) as total FROM contact

-- Count by state
SELECT statecode, COUNT(*) as count
FROM contact
GROUP BY statecode

-- Sum revenue by account
SELECT accountid, SUM(revenue) as total_revenue
FROM opportunity
WHERE statecode = 0
GROUP BY accountid

-- With HAVING
SELECT ownerid, COUNT(*) as case_count
FROM incident
GROUP BY ownerid
HAVING COUNT(*) > 10
```

### Success Criteria
- [ ] `SELECT COUNT(*) FROM contact` returns total count
- [ ] `SELECT statecode, COUNT(*) FROM contact GROUP BY statecode` returns grouped counts
- [ ] Invalid query (non-grouped column without aggregate) shows clear error

---

## Feature 4: JOINs (link-entity)

### Problem Statement
Users cannot query related entities in a single query. They must run multiple queries and manually correlate results.

### Goals
1. Support INNER JOIN syntax for related entities
2. Transpile to FetchXML link-entity
3. Handle table aliases for disambiguation

### Requirements

#### 4.1 JOIN Syntax
| ID | Requirement | Priority |
|----|-------------|----------|
| 4.1.1 | INNER JOIN with ON clause | P0 |
| 4.1.2 | LEFT OUTER JOIN (if FetchXML supports) | P1 |
| 4.1.3 | Multiple JOINs in single query | P1 |
| 4.1.4 | Table aliases required for JOINs | P0 |

#### 4.2 Alias Handling
| ID | Requirement | Priority |
|----|-------------|----------|
| 4.2.1 | Support `FROM account a` alias syntax | P0 |
| 4.2.2 | Support `a.name` qualified column references | P0 |
| 4.2.3 | Resolve aliases in SELECT, WHERE, ORDER BY | P0 |
| 4.2.4 | IntelliSense: suggest `a.` columns for alias `a` | P1 |

#### 4.3 FetchXML Transpilation
| ID | Requirement | Priority |
|----|-------------|----------|
| 4.3.1 | Generate `<link-entity>` for each JOIN | P0 |
| 4.3.2 | Set `from` and `to` attributes for relationship | P0 |
| 4.3.3 | Set `link-type="inner"` or `"outer"` | P0 |
| 4.3.4 | Handle link-entity attributes in SELECT | P0 |
| 4.3.5 | Handle link-entity conditions in WHERE | P0 |

### Example Queries
```sql
-- Account with primary contact
SELECT a.name, c.fullname, c.emailaddress1
FROM account a
INNER JOIN contact c ON a.primarycontactid = c.contactid
WHERE a.statecode = 0

-- Opportunity with account and owner
SELECT o.name, a.name as account_name, u.fullname as owner_name
FROM opportunity o
INNER JOIN account a ON o.customerid = a.accountid
INNER JOIN systemuser u ON o.ownerid = u.systemuserid
WHERE o.statecode = 0
```

### Success Criteria
- [ ] Account-Contact join returns combined columns
- [ ] Aliases work in SELECT, WHERE, ORDER BY
- [ ] FetchXML preview shows correct link-entity structure

---

## Feature 5: INSERT/UPDATE/DELETE

### Problem Statement
Users can only read data. Creating and modifying records requires switching to Dynamics or using separate tools.

### Goals
1. Support INSERT for creating records
2. Support UPDATE for modifying records
3. Support DELETE for removing records
4. Provide safety features to prevent accidental data loss

### Requirements

#### 5.1 INSERT Statement
| ID | Requirement | Priority |
|----|-------------|----------|
| 5.1.1 | `INSERT INTO entity (columns) VALUES (values)` syntax | P0 |
| 5.1.2 | Support string, number, boolean, null values | P0 |
| 5.1.3 | Support GUID values for lookups | P0 |
| 5.1.4 | Return created record ID on success | P0 |
| 5.1.5 | Show created record link (clickable) | P1 |

**Note on validation:** No client-side required field validation. Dataverse API accepts partial updates without requiring all Business Required fields (unlike UI). Let the server reject invalid requests - this is simpler and always accurate. If server rejects, we show the error message clearly.

#### 5.2 UPDATE Statement
| ID | Requirement | Priority |
|----|-------------|----------|
| 5.2.1 | `UPDATE entity SET column = value WHERE condition` syntax | P0 |
| 5.2.2 | Support multiple SET clauses | P0 |
| 5.2.3 | Require WHERE clause (no mass updates without filter) | P0 |
| 5.2.4 | Preview affected records before execution | P0 |
| 5.2.5 | Show count of records to be updated | P0 |
| 5.2.6 | Confirmation dialog with record count | P0 |
| 5.2.7 | Return count of updated records | P0 |

#### 5.3 DELETE Statement
| ID | Requirement | Priority |
|----|-------------|----------|
| 5.3.1 | `DELETE FROM entity WHERE condition` syntax | P0 |
| 5.3.2 | Require WHERE clause (no mass deletes without filter) | P0 |
| 5.3.3 | Preview affected records before execution | P0 |
| 5.3.4 | Confirmation dialog with record count and warning | P0 |
| 5.3.5 | Return count of deleted records | P0 |
| 5.3.6 | Extra confirmation for > 100 records | P1 |

#### 5.4 Safety Features
| ID | Requirement | Priority |
|----|-------------|----------|
| 5.4.1 | No UPDATE/DELETE without WHERE clause | P0 |
| 5.4.2 | Preview mode: show affected records without executing | P0 |
| 5.4.3 | Confirmation dialog shows: operation, entity, record count | P0 |
| 5.4.4 | "Type entity name to confirm" for destructive operations | P1 |
| 5.4.5 | Audit log of executed modifications (local) | P2 |

#### 5.5 API Integration
| ID | Requirement | Priority |
|----|-------------|----------|
| 5.5.1 | INSERT → POST /api/data/v9.2/{entityset} | P0 |
| 5.5.2 | UPDATE → PATCH /api/data/v9.2/{entityset}({id}) | P0 |
| 5.5.3 | DELETE → DELETE /api/data/v9.2/{entityset}({id}) | P0 |
| 5.5.4 | Batch operations using Dataverse $batch endpoint | P1 |
| 5.5.5 | Progressive batches of 100 records with progress feedback | P1 |
| 5.5.6 | Cancel button during long-running batch operations | P1 |

**Batch strategy:** Process 100 records per batch request. User sees "Updated 100 of 500..." progress. If a batch fails, only 100 records are in unknown state (easier to investigate). Can expand to user-configurable batch size in future if needed.

### Example Queries
```sql
-- Create a contact
INSERT INTO contact (firstname, lastname, emailaddress1)
VALUES ('John', 'Doe', 'john.doe@example.com')

-- Update job title for specific contact
UPDATE contact
SET jobtitle = 'Senior Developer'
WHERE contactid = '12345678-1234-1234-1234-123456789012'

-- Bulk update (with preview and confirmation)
UPDATE contact
SET statecode = 1
WHERE parentcustomerid = '...' AND modifiedon < '2024-01-01'

-- Delete inactive contacts (with confirmation)
DELETE FROM contact
WHERE statecode = 1 AND modifiedon < '2023-01-01'
```

### Success Criteria
- [ ] INSERT creates record and shows new record link
- [ ] UPDATE shows preview before executing
- [ ] DELETE requires confirmation with record count
- [ ] Cannot execute UPDATE/DELETE without WHERE clause

---

## Feature 6: Visual Query Builder + Saved Queries

### Problem Statement
1. Not all users are comfortable writing SQL - they need a visual interface like Advanced Find
2. Queries are lost when the session ends
3. There's no bridge between VS Code queries and Dynamics views

### Goals
1. Provide Visual Query Builder as a THIRD mode (alongside existing SQL and FetchXML modes)
2. Three-way sync: SQL ↔ FetchXML ↔ Visual Builder (edit any, others update)
3. Save queries as Personal Views (UserQuery) in Dataverse
4. Load existing Personal Views into any mode

### Three-Mode Architecture (After Phase 5)
```
┌─────────────────────────────────────────────────────────────────┐
│ [SQL Mode]  [FetchXML Mode]  [Visual Builder]    [Save View ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  All three modes stay in sync:                                  │
│  - Edit SQL → FetchXML + Visual Builder update                  │
│  - Edit FetchXML → SQL + Visual Builder update                  │
│  - Edit Visual Builder → SQL + FetchXML update                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** SQL Mode editing will use native VS Code editor (Phase 1). FetchXML Mode stays in panel. Visual Builder is entirely in panel.

### Requirements

#### 6.1 Visual Query Builder
| ID | Requirement | Priority |
|----|-------------|----------|
| 6.1.1 | Entity selector dropdown (searchable) | P0 |
| 6.1.2 | Column picker (checkboxes for SELECT columns) | P0 |
| 6.1.3 | Filter builder (AND/OR groups, conditions) | P0 |
| 6.1.4 | Sort order configuration | P0 |
| 6.1.5 | Row limit selector (TOP N) | P0 |
| 6.1.6 | Related entity selector (for JOINs) | P1 |
| 6.1.7 | Aggregate function builder (COUNT, SUM, etc.) | P1 |
| 6.1.8 | GROUP BY column picker | P1 |

#### 6.2 Three-Way Sync
| ID | Requirement | Priority |
|----|-------------|----------|
| 6.2.1 | SQL changes update FetchXML + Visual Builder in real-time | P0 |
| 6.2.2 | FetchXML changes update SQL + Visual Builder in real-time | P0 |
| 6.2.3 | Visual Builder changes update SQL + FetchXML in real-time | P0 |
| 6.2.4 | Tab/toggle to switch between all three modes | P0 |
| 6.2.5 | Handle parse errors gracefully (show warning, don't break sync) | P0 |
| 6.2.6 | "Query has unsupported features" warning when Visual can't represent | P1 |

#### 6.3 Save Query
| ID | Requirement | Priority |
|----|-------------|----------|
| 6.3.1 | "Save as Personal View" action in panel | P0 |
| 6.3.2 | Prompt for view name and description | P0 |
| 6.3.3 | Generate FetchXML from current query | P0 |
| 6.3.4 | Generate layoutxml for column display | P0 |
| 6.3.5 | Create UserQuery record in Dataverse | P0 |
| 6.3.6 | Show success message with link to Dynamics | P1 |

#### 6.4 Load Query
| ID | Requirement | Priority |
|----|-------------|----------|
| 6.4.1 | "Load Personal View" action in panel | P0 |
| 6.4.2 | Show list of user's Personal Views for current entity | P0 |
| 6.4.3 | Load into Visual Builder AND SQL editor | P0 |
| 6.4.4 | Show view name, description, modified date | P1 |
| 6.4.5 | Search/filter views by name | P1 |

#### 6.5 Update Query
| ID | Requirement | Priority |
|----|-------------|----------|
| 6.5.1 | "Update Personal View" when editing a loaded view | P1 |
| 6.5.2 | Confirm before overwriting existing view | P1 |
| 6.5.3 | "Save as New" option to create copy | P1 |

#### 6.6 UserQuery Entity (Personal Views Only)
| ID | Requirement | Priority |
|----|-------------|----------|
| 6.6.1 | Set name, description, fetchxml, layoutxml | P0 |
| 6.6.2 | Set returnedtypecode (entity logical name) | P0 |
| 6.6.3 | Set querytype = 0 (Personal View) | P0 |

**Note:** Personal Views only for v0.3.0. System Views (savedquery) would be part of Solution Management feature in a future release - they require different permissions and solution context.

### Visual Query Builder UX Concept
```
┌─────────────────────────────────────────────────────────────────┐
│ [SQL] [FetchXML] [Visual Builder]                [Save View ▼] │
├─────────────────────────────────────────────────────────────────┤
│ Entity: [Contact ▼]                              TOP: [100 ▼]  │
├─────────────────────────────────────────────────────────────────┤
│ Columns:                                                        │
│ ☑ fullname    ☑ emailaddress1    ☐ telephone1    ☐ jobtitle   │
│ [+ Add Column]                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Filters:                                                        │
│ ┌─ AND ───────────────────────────────────────────────────────┐│
│ │ [statecode ▼] [Equals ▼] [Active ▼]              [×]       ││
│ │ [createdon ▼] [Last X Days ▼] [30]               [×]       ││
│ │ [+ Add Condition]  [+ Add Group]                            ││
│ └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ Sort By: [fullname ▼] [Ascending ▼]  [+ Add Sort]              │
├─────────────────────────────────────────────────────────────────┤
│                              [Execute Query]                    │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** SQL tab opens native VS Code editor (Phase 1). FetchXML and Visual Builder tabs show panel UI.

### Success Criteria
- [ ] Build query visually → SQL updates automatically
- [ ] Edit SQL → Visual Builder updates automatically
- [ ] Save query → appears in Dynamics Advanced Find
- [ ] Load Personal View → populates both SQL and Visual Builder
- [ ] Users who don't know SQL can build queries visually

---

## Implementation Order

### Phase 1: Foundation (IntelliSense + Native Editor)
- IntelliSenseContextService (tracks active environment)
- DataverseCompletionProvider (entity/attribute completion)
- SqlEditorService (opens SQL files in VS Code)
- Panel integration: "New Query" and "Open File" buttons
- Panel reads SQL from active VS Code editor for execution
- **Preserves:** FetchXML mode stays in panel (unchanged)
- **Deliverable:** SQL editing in native VS Code with IntelliSense

### Phase 2: History
- Query execution history storage (globalState)
- Environment-specific history (last 50 per env)
- Cross-environment history (last 100 global)
- History dropdown + "View All" modal UI
- **Deliverable:** Quick access to previous queries, dev→prod workflow

### Phase 3: Advanced SELECT (Aggregates + JOINs)
- Aggregate function support in SQL parser (COUNT, SUM, AVG, MIN, MAX)
- GROUP BY / HAVING clause support
- FetchXML aggregate transpilation
- JOIN syntax in SQL parser
- link-entity transpilation
- Alias resolution (`a.name` when `FROM account a`)
- **Deliverable:** Full analytical query support

### Phase 4: Data Modification (INSERT/UPDATE/DELETE)
- New statement types in SQL parser
- INSERT execution via POST API
- UPDATE with preview and confirmation (batches of 100)
- DELETE with preview and confirmation (batches of 100)
- Safety features (require WHERE, confirmation dialogs)
- **Deliverable:** Full CRUD operations

### Phase 5: Visual Query Builder + Saved Queries (May Defer)
- Visual Query Builder as THIRD mode (alongside SQL + FetchXML)
- Three-way sync: SQL ↔ FetchXML ↔ Visual Builder
- UserQuery creation (Personal Views)
- layoutxml generation for column display
- Load/update existing Personal Views
- **Deliverable:** Visual query building + persistence to Dynamics

---

## Non-Goals (Out of Scope for v0.3.0)

- Stored procedures / functions
- Transactions across multiple statements
- Schema modifications (CREATE TABLE, ALTER)
- Cross-environment data copy (separate feature)
- Real-time query collaboration
- Query performance analysis / execution plans

---

## Reference: SQL4CDS

SQL4CDS is an open-source project providing SQL support for Dataverse. We will reference it for:
- Understanding SQL syntax patterns
- Edge case handling
- UX decisions

**Approach:** Clean room - understand patterns, design our own implementation. No code copying.

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-04 | Claude | Initial requirements document |
| 2025-12-04 | Claude | Added current architecture diagram, incorporated design decisions, clarified 3-mode architecture for Phase 5 |

