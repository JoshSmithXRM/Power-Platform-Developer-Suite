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
**Status**: Planned
**Target Version**: v0.3.0
**Priority**: Medium
**Estimated Effort**: 4-6 hours
**Value**: Better conflict handling and validation

**Description**:
Polish the web resources editing experience with conflict detection and validation.

**Core Features**:
- Conflict detection (warn if modified by another user since open)
- JavaScript syntax validation before upload
- Retry logic for transient failures

**Technical Considerations**:
- Use optimistic locking with `modifiedon` timestamp for conflict detection
- JavaScript parsing can use VS Code's built-in diagnostics

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

**Last Updated**: 2025-12-02
