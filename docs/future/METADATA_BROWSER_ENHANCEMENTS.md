# Metadata Browser Enhancements

Future enhancements for the Metadata Browser panel.

---

## Implemented (v0.1.0 - v0.2.0)

**Metadata Browser Core** is fully implemented:
- ✅ Browse entities with hierarchical navigation (System/Custom)
- ✅ View attributes with complete metadata (type, required level, constraints)
- ✅ View relationships (One-to-Many, Many-to-Many)
- ✅ View entity keys (alternate keys)
- ✅ View security privileges
- ✅ Global choice sets (OptionSets) with values
- ✅ Smart 5-minute caching
- ✅ Export metadata to JSON
- ✅ Open in Maker functionality
- ✅ Parallel metadata queries for performance
- ✅ Search within entity/attribute lists

**Implementation**: `src/features/metadataBrowser/`

---

## Medium Priority

### Metadata Comparison Between Environments
**Status**: Planned
**Priority**: Medium
**Estimated Effort**: 8-12 hours
**Value**: Identify schema differences between dev/test/prod

**Description**:
Compare entity metadata between two environments to identify schema drift or missing customizations.

**Core Features**:
- Select two environments
- Compare entity attributes, relationships, keys
- Highlight differences (added, removed, changed)
- Export comparison report

**Technical Considerations**:
- Requires dual environment connection
- Diff algorithm for nested metadata structures
- May be significant UI work for comparison view

---

## Low Priority

### Quick Search Across All Entities (Global Search)
**Status**: Planned
**Priority**: Low
**Estimated Effort**: 4-6 hours
**Value**: Find attributes/relationships without knowing which entity they belong to

**Description**:
Search across all entities for a specific attribute name, relationship, or other metadata property.

**Core Features**:
- Global search input
- Search by attribute logical name, display name
- Search by relationship name
- Results show entity + matched item

**Technical Considerations**:
- May require loading all entity metadata upfront (performance concern)
- Consider indexing/caching strategy

---

### Bookmarking Favorite Entities
**Status**: Planned
**Priority**: Low
**Estimated Effort**: 2-4 hours
**Value**: Quick access to frequently used entities

**Description**:
Bookmark entities for quick access without searching.

**Core Features**:
- Star/bookmark icon on entity rows
- Favorites section at top of tree
- Persist favorites per environment

**Technical Considerations**:
- Store in VS Code workspace state (existing pattern)
- Simple UI addition to tree

---

### Inline Editing of Metadata
**Status**: Planned
**Priority**: Low
**Estimated Effort**: 16-24 hours
**Value**: Modify entity schemas without leaving VS Code

**Description**:
Edit entity metadata (display names, descriptions, required levels) directly in the panel.

**Core Features**:
- Edit attribute display name, description
- Edit attribute required level
- Edit entity display name, description
- Save changes to Dataverse

**Technical Considerations**:
- Requires write permissions to metadata
- Managed vs unmanaged component restrictions
- Publish after changes

---

### Creating/Deleting Entities and Attributes
**Status**: Planned
**Priority**: Low
**Estimated Effort**: 24-32 hours
**Value**: Full schema management without leaving VS Code

**Description**:
Create new entities, attributes, relationships from within the Metadata Browser.

**Core Features**:
- Create new custom entity
- Add attributes to entity
- Add relationships
- Delete custom entities/attributes (with confirmation)

**Technical Considerations**:
- Complex UI for entity/attribute creation forms
- Validation of schema names
- Publisher prefix handling
- Only works for unmanaged components

---

## Archive (Considered & Deferred)

### Solution-Aware Filtering
**Status**: Moved to Solution Explorer
**Decision Date**: 2025-12-03
**Reason**: Metadata Browser is intended to browse ALL metadata in an environment regardless of solution. Solution-scoped entity viewing belongs in Solution Explorer panel where users can drill into solution components.

### CSV/Excel Export
**Status**: Deferred
**Decision Date**: 2025-12-03
**Reason**:
- Clipboard copy to Excel works (few extra clicks)
- Excel export requires heavy dependencies (~500KB-1.5MB for xlsx libraries)
- Bundle size impact not justified for documentation use case
- If strong user demand emerges, consider "Zip of CSVs" approach (no heavy deps)

---

**Last Updated**: 2025-12-03
