# Data Management Enhancements

Features for querying, manipulating, and managing Dataverse data.

---

## High Priority

### Data Explorer (Ad-hoc Advanced Find)
**Status**: In Development
**Target Version**: v0.3.0
**Priority**: High
**Estimated Effort**: 32-40 hours
**Value**: Query data without leaving VSCode, save and reuse queries

**Description**:
Interactive query builder for Dataverse data with live results and saved queries.

**Core Features**:
- Entity picker with search
- Column selector (multi-select)
- Filter builder (conditions, groups, AND/OR)
- Sort configuration
- Live data table with results
- Pagination for large result sets

**Query Persistence**:
- Save as UserQuery (Personal View) in Dataverse
- Load existing personal views
- Portable across devices/users with same permissions
- Available in Dynamics UI as well

**Advanced Features**:
- FetchXML view/edit mode
- Export to CSV/Excel
- Quick filters on result columns
- Column resizing/reordering

**Technical Considerations**:
- UserQuery entity for saved queries (systemuser-owned)
- FetchXML generation from UI selections
- Handle large result sets (virtual scrolling?)
- Respect user's security privileges

**Success Criteria**:
- Faster than Advanced Find in browser
- Queries saved and reusable
- Works with any entity user has access to

---

### SQL to FetchXML (SQL4CDS-style)
**Status**: Partially Implemented (basic SQL parsing done)
**Target Version**: v0.4.0 (aggregates, JOINs)
**Priority**: High
**Estimated Effort**: 24-32 hours (remaining: aggregates, JOINs ~16-28h)
**Value**: Query Dataverse using familiar SQL syntax

**Description**:
Write SQL queries, convert to FetchXML, execute against Dataverse. Inspired by XRM Toolbox SQL4CDS.

**Core Features**:
- SQL query editor with syntax highlighting
- SQL → FetchXML conversion
- Execute query and display results
- View generated FetchXML
- Query history

**SQL Support**:
- SELECT with column list or *
- FROM with table (entity) name
- WHERE with conditions (=, <>, <, >, LIKE, IN, IS NULL)
- JOIN for related entities (lookup traversal)
- ORDER BY
- TOP / LIMIT for pagination
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
- GROUP BY

**Example Queries**:
```sql
SELECT name, revenue, createdon
FROM account
WHERE statecode = 0
ORDER BY revenue DESC

SELECT a.name, c.fullname
FROM account a
JOIN contact c ON a.primarycontactid = c.contactid
WHERE a.revenue > 1000000

SELECT statecode, COUNT(*) as count
FROM contact
GROUP BY statecode
```

**Integration with Data Explorer**:
- Switch between SQL mode and visual query builder
- SQL generates FetchXML, visual builder can read it back
- Same result display and export capabilities

**Technical Considerations**:
- SQL parser (could use existing library or build simple one)
- Map SQL constructs to FetchXML equivalents
- Handle Dataverse-specific quirks (option sets, lookups, polymorphic lookups)
- Error messages for unsupported SQL features
- Consider referencing MarkMpn's SQL4CDS for parsing patterns

**Limitations to Document**:
- Not full T-SQL - subset that maps to FetchXML
- No INSERT/UPDATE/DELETE (read-only, or separate feature)
- Some complex JOINs may not translate

**Success Criteria**:
- Common queries work as expected
- Clear error messages for unsupported syntax
- Faster than writing FetchXML by hand
- Seamless integration with Data Explorer

---

### Record Cloning (Cross-Environment)
**Status**: Planned
**Target Version**: v1.1+
**Priority**: High
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
- Handle duplicate detection rules
- Transaction/rollback for batch failures

**Success Criteria**:
- Reliable cross-environment data copy
- Clear handling of lookup remapping
- Progress visibility for large batches

---

## Medium Priority

### Bulk Data Operations
**Status**: Planned
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
- Progress tracking and cancellation

**Safety Features**:
- Record count confirmation
- Preview first N records
- Dry-run mode
- Audit trail of operations

**Success Criteria**:
- Safer than direct API calls
- Clear preview before destructive operations
- Handles large batches efficiently

---

**Last Updated**: 2025-11-30
