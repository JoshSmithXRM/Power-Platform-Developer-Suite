# Feature Completion Tracking - Data Explorer, Web Resources, Metadata Browser

**Branch:** `feature/finish-data-explorer-web-resources-metadata`
**Created:** 2025-12-02
**Target Version:** v0.3.0

---

## Summary

This document tracks remaining work to **fully complete** three features:
1. **Web Resources** - Conflict detection, validation, retry logic
2. **Metadata Browser** - Solution filtering, CSV export
3. **Data Explorer** - IntelliSense, Aggregates/JOINs, Saved Queries

**Implementation Order:**
1. Web Resources (conflict detection → JS validation → retry logic)
2. Metadata Browser (solution filtering → CSV export)
3. Data Explorer (IntelliSense → Aggregates/JOINs → Saved Queries)

---

## 1. Web Resources

### Implemented (v0.2.3 - v0.2.5)
- [x] Browse web resources with solution filtering
- [x] Display metadata in data table (name, display name, type, size, modified date, managed)
- [x] Click row to open in VS Code editor with syntax highlighting
- [x] Custom URI scheme: `ppds-webresource://`
- [x] FileSystemProvider integration with VS Code
- [x] Solution filtering (including "Default Solution")
- [x] Text-based type filtering (excludes binary images by default)
- [x] 60-second content cache (user-configurable)
- [x] Virtual table integration (65k+ resources)
- [x] Edit and save changes to Dataverse (Ctrl+S)
- [x] Publish: single resource, publish all, post-save notification
- [x] Auto-refresh row after editing
- [x] Managed web resources editable (v0.2.5)
- [x] Cross-panel publish coordination

### Remaining Work (This Branch)
| # | Task | Effort | Status |
|---|------|--------|--------|
| 1 | Conflict detection (warn if modified by another user) | 3-4h | **Done** |
| 1b | **BUG FIX**: Connection-based document identity (see below) | 4-6h | **Next** |
| 2 | JavaScript syntax validation before upload | 2-3h | Planned |
| 3 | Retry logic for transient failures | 1-2h | Planned |

**Total: ~10-15 hours** (increased due to bug fix)

#### Bug: FileSystemProvider Uses Wrong Connection

**Problem:** The FileSystemProvider is a singleton created with the first panel's connection. If a user opens a second panel with a different connection (e.g., Service Principal vs Interactive User), file operations still use the first connection's credentials.

**Current URI:** `ppds-webresource://environmentId/webResourceId/filename.ext`

**Expected Behavior:**
- Same connection + same web resource = same editor
- Different connection + same web resource = different editors (even if same environment)

**Fix Required:**
1. Change URI scheme to use `connectionId` instead of `environmentId`
2. Create a connection registry that FileSystemProvider can query
3. FileSystemProvider parses connection ID from URI, looks up correct credentials
4. Update cache key to `connectionId:webResourceId`

**Why This Matters:**
- Different connections may have different permissions
- Audit logs should show correct identity
- User explicitly chose different credentials for a reason

---

## 2. Metadata Browser

### Implemented (v0.1.0 - v0.2.0)
- [x] Browse entities with hierarchical navigation (System/Custom)
- [x] View attributes with complete metadata (type, required level, constraints)
- [x] View relationships (One-to-Many, Many-to-Many)
- [x] View entity keys (alternate keys)
- [x] View security privileges
- [x] Global choice sets (OptionSets) with values
- [x] Smart 5-minute caching
- [x] Export metadata to JSON
- [x] Open in Maker functionality
- [x] Parallel metadata queries for performance
- [x] Search within entity/attribute lists

### Remaining Work (This Branch)
| # | Task | Effort | Status |
|---|------|--------|--------|
| 4 | Solution-aware filtering (show only solution entities) | 4-6h | Planned |
| 5 | CSV export for attributes and relationships | 3-4h | Planned |

**Total: ~7-10 hours**

---

## 3. Data Explorer

### Implemented (v0.2.2 - v0.2.6)
- [x] SQL query editor with syntax highlighting
- [x] SQL to FetchXML transpilation with live preview
- [x] FetchXML direct editing mode (bidirectional preview)
- [x] FetchXML → SQL transpilation with warnings for unsupported features
- [x] Query execution against Dataverse via FetchXML
- [x] Results displayed in sortable data table
- [x] Clickable record links (lookup fields and primary keys)
- [x] Copy record URL button on hover
- [x] Export results to CSV
- [x] Keyboard shortcut (Ctrl+Enter)
- [x] Query execution status bar (row count, timing)
- [x] Query mode persistence per environment
- [x] Row limit warning modal (TOP 100 prompt)
- [x] Zone-based Ctrl+A selection in results table

### Remaining Work (This Branch)
| # | Task | Effort | Status |
|---|------|--------|--------|
| 6 | IntelliSense context service (track active environment) | 2-3h | Planned |
| 7 | Entity name completion (after FROM/JOIN) | 4-6h | Planned |
| 8 | Attribute name completion (after SELECT/WHERE/ORDER BY) | 4-6h | Planned |
| 9 | SQL keyword completion | 1-2h | Planned |
| 10 | Metadata caching for completions | 2-3h | Planned |
| 11 | SQL aggregate functions (COUNT, SUM, AVG, MIN, MAX) | 8-12h | Planned |
| 12 | SQL GROUP BY support | 4-6h | Planned |
| 13 | SQL JOIN support for related entities | 8-12h | Planned |
| 14 | Save query as UserQuery (Personal View) in Dataverse | 4-6h | Planned |
| 15 | Load existing personal views | 2-3h | Planned |

**Technical Design:** `docs/future/DATA_EXPLORER_INTELLISENSE_DESIGN.md` (V2)

**Total: ~40-55 hours**

---

## Grand Total: ~53-74 hours

| Feature | Effort |
|---------|--------|
| Web Resources | 6-9h |
| Metadata Browser | 7-10h |
| Data Explorer | 40-55h |

---

## Deferred (Not This Branch)

### Visual Query Builder
- Entity picker, column selector, filter builder UI
- **Why deferred:** SQL/FetchXML editors provide power-user experience; visual builder is nice-to-have

### Local Folder Sync (Web Resources)
- Map local folder to solution's web resources
- Two-way sync with file watching
- **Why deferred:** Will be implemented alongside Deployment Settings / ALM features
- **Future home:** New "Deployment Settings Manager" panel that consolidates sync functionality from Connection References and Environment Variables

---

## Pre-Commit Checklist

Before merging this branch:
- [ ] Update `docs/future/DATA_MANAGEMENT.md` - mark implemented items
- [ ] Update `docs/future/DEVELOPMENT_TOOLS.md` - mark implemented items
- [ ] Update `docs/future/METADATA_BROWSER_ENHANCEMENTS.md` - mark implemented items
- [ ] Run `/code-review` for final approval
- [ ] Run `/prepare-release` to bump version and update CHANGELOG
- [ ] Delete this tracking doc after PR merge

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-02 | Defer visual query builder | SQL/FetchXML editors provide power-user experience |
| 2025-12-02 | Defer local folder sync | Bundle with Deployment Settings / ALM features |
| 2025-12-02 | Include Saved Queries | Core value: SQL → FetchXML → Personal View in Dynamics |

---

**Last Updated:** 2025-12-02
