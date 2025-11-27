# Development Tools Enhancements

Power Platform development tools for plugins and web resources.

---

## High Priority

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

### Web Resources Manager
**Status**: Planned
**Priority**: High
**Estimated Effort**: 24-32 hours
**Value**: Edit web resources with full VSCode capabilities (syntax highlighting, extensions)

**Description**:
Browse, edit, and sync web resources between Dynamics and local repository.

**Core Features**:
- Browse/search web resources by solution, type, name
- Open web resource in VSCode editor (full syntax highlighting)
- Save changes back to Dynamics
- Pull latest from Dynamics to local
- Repo folder mapping for CI/CD sync

**Sync Features**:
- Map local folder to solution's web resources
- Push local changes to Dynamics
- Pull Dynamics changes to local
- Conflict detection (modified in both places)
- Batch sync operations

**Technical Considerations**:
- Web resource content is base64 encoded
- Need to handle different types (JS, CSS, HTML, images, etc.)
- Consider file watching for auto-sync
- Git integration for change tracking

**Success Criteria**:
- Full VSCode editing experience for web resources
- Reliable sync between repo and Dynamics
- CI/CD pipeline integration possible

---

**Last Updated**: 2025-11-26
