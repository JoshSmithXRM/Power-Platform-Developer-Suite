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

### Solution-Aware Filtering
**Status**: Planned
**Priority**: Medium
**Estimated Effort**: 4-6 hours
**Value**: Show only entities/components within a specific solution

**Description**:
Filter the entity/choice tree to show only components that belong to a selected solution, similar to how other panels filter by solution.

**Core Features**:
- Solution dropdown selector (reuse existing pattern)
- Filter tree to solution components only
- Option to show all entities (current behavior)

**Technical Considerations**:
- Query solution components to get entity list
- May need to cache solution component mappings

---

### Metadata Export to JSON/CSV
**Status**: Planned
**Priority**: Medium
**Estimated Effort**: 4-6 hours
**Value**: Export entity schemas for documentation or comparison

**Description**:
Export entity metadata (attributes, relationships, keys) to JSON or CSV format for documentation, auditing, or offline analysis.

**Core Features**:
- Export current entity metadata to JSON
- Export attribute list to CSV
- Export relationships to CSV
- Bulk export all entities in solution

**Technical Considerations**:
- Reuse existing CSV export infrastructure from Data Explorer
- JSON export is straightforward (serialize domain entities)

---

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

## Archive (Considered & Rejected)

*None yet.*

---

**Last Updated**: 2025-12-02
