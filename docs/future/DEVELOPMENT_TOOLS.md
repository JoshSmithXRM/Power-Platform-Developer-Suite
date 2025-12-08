# Development Tools Enhancements

Power Platform development tools for plugins and web resources.

---

## Implemented

### Web Resources Manager (Complete)
**Status**: ✅ Fully Implemented (v0.2.3 - v0.2.5)
**Version**: v0.2.3 (Edit/Save/Publish), v0.2.5 (Managed editing enabled)

**What's Implemented**:
- ✅ Browse web resources filtered by solution
- ✅ Display metadata in data table (name, display name, type, size, modified date, managed)
- ✅ Click row to open in VS Code editor with syntax highlighting
- ✅ Custom URI scheme: `ppds-webresource://`
- ✅ FileSystemProvider integration with VS Code
- ✅ Solution filtering (including "Default Solution")
- ✅ Text-based type filtering (excludes binary images by default)
- ✅ 60-second content cache (user-configurable)
- ✅ Virtual table integration (65k+ resources)
- ✅ Edit and save changes to Dataverse (Ctrl+S)
- ✅ Publish: single resource, publish all, post-save notification
- ✅ Auto-refresh row after editing
- ✅ Managed web resources editable (v0.2.5 - supports production hotfixes)
- ✅ Cross-panel publish coordination (prevents concurrent conflicts)

**Implementation**: `src/features/webResources/`

## High Priority

### Plugin Registration Tool
**Status**: Planned
**Target Version**: v0.6.0
**Priority**: High
**Estimated Effort**: 40-60 hours
**Value**: VSCode-native plugin registration without leaving the IDE

**Description**:
Port of Microsoft's Plugin Registration Tool (PRT) functionality to VSCode. Register assemblies, steps, and images directly from the extension.

**Core Features**:
- Browse registered assemblies, plugins, steps, images
- Register new assemblies (upload DLL)
- Add/edit/delete plugin steps
- Add/edit/delete step images
- Enable/disable steps
- View plugin type details

**Technical Considerations**:
- Uses Dataverse Plugin Registration APIs
- Assembly storage options (database vs sandbox)
- Step filtering modes
- Image attribute selection

**Success Criteria**:
- Can perform all common PRT operations
- No need to launch external PRT tool
- Faster iteration for plugin development

---

## Medium Priority

### Web Resources - Enhanced UX
**Status**: ✅ Implemented (v0.3.0)
**Priority**: Medium

**What's Implemented**:
- ✅ Conflict detection (warn if modified by another user since open)
- ✅ Version selection UX (diff view with "Compare First" option)
- ✅ Syntax highlighting for custom URI scheme (JS, CSS, HTML, etc.)
- ✅ Created By / Modified By columns
- ✅ Retry logic (already in shared DataverseApiService)
- ✅ JS validation (covered by VS Code's built-in diagnostics with syntax highlighting)

---

### Solution Explorer - Entity Browsing
**Status**: Planned
**Target Version**: v0.4.0+
**Priority**: Medium
**Estimated Effort**: 4-6 hours
**Value**: View entities/tables belonging to a specific solution

**Description**:
Expand Solution Explorer to show entities (tables) that belong to the selected solution, with drill-down to view their metadata.

**Core Features**:
- Show entities as children of solution node
- Click entity to view attributes, relationships, keys (like Metadata Browser)
- Filter to show only solution-owned vs all entities in solution

**Technical Considerations**:
- Query solution components (type = Entity)
- Reuse Metadata Browser's entity detail views
- Consider lazy loading for large solutions

---

### Web Resources Sync (Local Folder Mapping)
**Status**: Deferred
**Target Version**: v1.0+
**Priority**: Medium
**Estimated Effort**: 16-24 hours
**Value**: CI/CD integration, version control for web resources

**Description**:
Map local folder to solution's web resources for two-way sync. Enables version control and CI/CD pipelines.

**Core Features**:
- Map local folder to solution's web resources
- Push local changes to Dynamics
- Pull Dynamics changes to local
- Conflict detection (modified in both places)
- Batch sync operations

**Technical Considerations**:
- File watching for auto-sync
- Git integration for change tracking
- Handle file renames/deletes
- Preserve folder structure in web resource names

**Success Criteria**:
- Developer can work in local folder with git
- Changes sync to Dynamics on command
- CI/CD pipeline can push web resources

---

## Archive (Considered & Rejected)

*None yet.*

---

**Last Updated**: 2025-12-03
