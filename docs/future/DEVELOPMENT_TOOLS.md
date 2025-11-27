# Development Tools Enhancements

Power Platform development tools for plugins and web resources.

---

## Implemented

### Web Resources Browser (Slice 1-2)
**Status**: ✅ Implemented
**Branch**: `feature/web-resources`
**Commit**: `5346adc`

**What's Implemented**:
- ✅ Browse web resources filtered by solution
- ✅ Display metadata in data table (name, display name, type, size, modified date)
- ✅ Click row to open in VS Code editor (read-only)
- ✅ Custom URI scheme: `ppds-webresource://`
- ✅ FileSystemProvider integration with VS Code
- ✅ Solution filtering (including "Default Solution")
- ✅ Text-based type filtering (excludes binary images by default)
- ✅ 60-second content cache

**Implementation**: `src/features/webResources/`

**Remaining Work** (see Web Resources Edit & Publish below):
- Edit and save (auto-upload to Dynamics)
- Publish after edit
- Conflict detection

---

## High Priority

### Web Resources Edit & Publish (Slices 3-5)
**Status**: Planned
**Priority**: High
**Estimated Effort**: 8-12 hours
**Value**: Full edit cycle without leaving VS Code
**Depends On**: Virtual Table (`feature/virtual-table`) for 70k+ record support

**Description**:
Extend the existing read-only Web Resources Browser to support editing, saving, and publishing web resources directly from VS Code.

**Slice 3: Edit & Save** (4-6 hours)
- Implement `writeFile()` in `WebResourceFileSystemProvider` (currently throws read-only)
- Create `UpdateWebResourceUseCase`
- Auto-upload to Dataverse on save (Ctrl+S)
- Status bar "Saving..." indicator
- Error handling for save failures

**Slice 4: Publish** (2-3 hours)
- Create `PublishWebResourceUseCase`
- Call Dataverse `PublishXml` action
- "Publish" button in panel toolbar
- Success/error notifications

**Slice 5: Enhanced UX** (2-3 hours)
- Conflict detection (warn if modified by another user)
- Disable editing for managed web resources (read-only badge)
- JavaScript syntax validation before upload
- Retry logic for transient failures

**Technical Considerations**:
- FileSystemProvider already implemented - just need `writeFile()`
- Use optimistic locking with `modifiedon` timestamp for conflict detection
- `PublishXml` API: `POST /api/data/v9.2/PublishXml` with XML payload

**Success Criteria**:
- User can edit JavaScript file in VS Code, save, changes appear in Dynamics
- User can publish web resource after editing
- Managed web resources show as read-only

**Key Files to Modify**:
- `src/features/webResources/infrastructure/providers/WebResourceFileSystemProvider.ts` (line 164: currently throws)
- `src/features/webResources/domain/interfaces/IWebResourceRepository.ts` (add `update()`, `publish()`)

---

### Plugin Registration Tool
**Status**: Planned
**Priority**: High
**Estimated Effort**: 40+ hours
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

### Web Resources Sync (Local Folder Mapping)
**Status**: Planned
**Priority**: Medium
**Estimated Effort**: 16-24 hours
**Value**: CI/CD integration, version control for web resources
**Depends On**: Web Resources Edit & Publish (Slices 3-5)

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

**Last Updated**: 2025-11-27
