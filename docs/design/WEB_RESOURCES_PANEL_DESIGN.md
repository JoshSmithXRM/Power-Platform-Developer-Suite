# Web Resources Panel - Technical Design

**Status:** Slice 1-2 Implemented, Slice 2 (Pagination) Blocked
**Date:** 2025-11-26
**Updated:** 2025-11-27

---

## Overview

**User Problem:** Developers need to edit web resources (JavaScript, HTML, CSS, images) in Dataverse/Power Platform, but current tools require switching between VS Code and the Maker Portal.

**Solution:** A VS Code panel that browses web resources by solution and opens them directly in VS Code editor tabs using a custom FileSystemProvider.

**Value:** Eliminates context switching and provides native IDE features for web resource development.

---

## Implementation Status

| Slice | Description | Status | Notes |
|-------|-------------|--------|-------|
| 1 | Browse & View (read-only) | ✅ Complete | `5346adc` |
| 2 | Adopt Virtual Table | ⏳ Blocked | Waiting on `feature/virtual-table` |
| 3 | Edit & Save | ⏳ Planned | See `docs/future/DEVELOPMENT_TOOLS.md` |
| 4 | Publish | ⏳ Planned | See `docs/future/DEVELOPMENT_TOOLS.md` |
| 5 | Enhanced UX | ⏳ Planned | See `docs/future/DEVELOPMENT_TOOLS.md` |

---

## What Was Implemented (Slice 1)

### Domain Layer
- `WebResource` entity with behavior: `getContent()`, `getFileExtension()`, `calculateSize()`, `isTextBased()`
- `WebResourceType` value object (enum mapping Dataverse type codes to extensions)
- `IWebResourceRepository` interface

### Application Layer
- `ListWebResourcesUseCase` - Fetch all web resources for environment
- `GetWebResourceContentUseCase` - Fetch single web resource content
- `WebResourceViewModel` and `WebResourceViewModelMapper`

### Infrastructure Layer
- `DataverseWebResourceRepository` - Dataverse API integration
- `WebResourceFileSystemProvider` - VS Code FileSystemProvider (read-only)

### Presentation Layer
- `WebResourcesPanelComposed` - PanelCoordinator pattern
- Custom URI scheme: `ppds-webresource://envId/webResourceId/filename.ext`

---

## Key Architectural Decisions

### Decision 1: FileSystemProvider vs TextDocumentContentProvider

**Chosen:** `vscode.FileSystemProvider`

**Rationale:**
- Provides full read/write capability (required for future auto-upload on save)
- Supports file metadata (size, mtime) for VS Code integration
- Enables standard save flow (Ctrl+S) when editing is implemented
- Industry standard for virtual file systems

**References:**
- [VS Code FileSystemProvider API](https://code.visualstudio.com/api/extension-guides/virtual-documents)

### Decision 2: Custom URI Scheme Format

**Format:** `ppds-webresource:/{envId}/{webResourceId}/{filename.ext}`

**Rationale:**
- Dedicated scheme allows granular activation event (`onFileSystem:ppds-webresource`)
- Filename in path enables proper syntax highlighting
- Environment ID in path supports multi-environment workflows

### Decision 3: In-Memory Cache

**Chosen:** In-memory cache with 60-second TTL

**Rationale:**
- Security: Content not persisted to disk
- Performance: Avoids repeated API calls within cache window
- Consistency: Re-fetches on panel refresh

---

## File Structure

```
src/features/webResources/
├── domain/
│   ├── entities/
│   │   └── WebResource.ts
│   ├── valueObjects/
│   │   └── WebResourceType.ts
│   └── interfaces/
│       └── IWebResourceRepository.ts
├── application/
│   ├── useCases/
│   │   ├── ListWebResourcesUseCase.ts
│   │   └── GetWebResourceContentUseCase.ts
│   ├── viewModels/
│   │   └── WebResourceViewModel.ts
│   └── mappers/
│       └── WebResourceViewModelMapper.ts
├── infrastructure/
│   ├── repositories/
│   │   └── DataverseWebResourceRepository.ts
│   └── providers/
│       └── WebResourceFileSystemProvider.ts
└── presentation/
    └── panels/
        └── WebResourcesPanelComposed.ts
```

---

## Current Limitation: 70k Records

The panel fetches ALL web resources via OData pagination. User environment has 70,000 web resources, making current approach unusable.

**Solution:** `feature/virtual-table` branch will provide:
- Server-side pagination (`$top`, `$skip`)
- Virtual scrolling (render only visible rows)
- Client-side cache for instant search

This branch is blocked until `feature/virtual-table` merges.

---

## Future Work

See `docs/future/DEVELOPMENT_TOOLS.md` for:
- **Slice 3:** Edit & Save (implement `writeFile()`)
- **Slice 4:** Publish (Dataverse `PublishXml` action)
- **Slice 5:** Enhanced UX (conflict detection, validation)
- **Web Resources Sync:** Local folder mapping for CI/CD

---

## References

- [Dataverse Web Resource Entity](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/webresource)
- [VS Code FileSystemProvider Sample](https://github.com/microsoft/vscode-extension-samples/tree/main/fsprovider-sample)
- Clean Architecture: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- Panel patterns: `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
