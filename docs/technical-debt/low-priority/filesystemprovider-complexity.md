# WebResourceFileSystemProvider Complexity

**Category:** Low Priority
**Priority:** Low
**Effort:** 4-6 hours
**Last Reviewed:** 2025-12-03

---

## Summary

The `WebResourceFileSystemProvider` grew from ~150 lines to ~800 lines as features were added (conflict detection, unpublished change detection, version selection UX). The file now handles multiple concerns that could be extracted into focused classes.

**Decision: Fix opportunistically when adding new features to this area**

---

## Current State

The FileSystemProvider handles:
1. **5 content modes**: unpublished, published, conflict, server-current, local-pending
2. **Server state tracking**: for conflict detection during saves
3. **Pending fetch deduping**: prevents duplicate API calls
4. **Conflict resolution UI**: modals and diff views
5. **Publish notification**: post-save workflow

**Affected files:**
- `src/features/webResources/infrastructure/providers/WebResourceFileSystemProvider.ts` (~800 lines)

**Scope:**
- 1 file affected
- ~800 lines of code
- Single class with multiple responsibilities

---

## Why It Exists

Features were added incrementally to support web resource editing:
1. Initial implementation: basic read/write (~150 lines)
2. Added conflict detection for concurrent edits
3. Added unpublished change detection on file open
4. Added version selection UX (diff views, modals)
5. Added multiple content modes for diff display

Each feature was valuable and correctly implemented, but the cumulative effect is a large file.

**Timeline:**
- Created: 2025-11 (v0.2.3)
- Expanded: 2025-12-03 (conflict detection, version selection)

---

## Why Low Priority

### Effort vs. Benefit Analysis

| Factor | Assessment |
|--------|------------|
| **Current Bugs** | Zero - all functionality works correctly |
| **Readability** | Acceptable - methods are well-named and documented |
| **Testability** | Good - existing tests cover main scenarios |
| **Maintenance Risk** | Low - feature is stable, unlikely to change frequently |
| **Refactoring Effort** | 4-6 hours |
| **Benefit** | Improved separation of concerns, easier testing |

**Verdict:** Working correctly with good test coverage. Refactoring would improve architecture but provides no immediate value.

---

## Proposed Solution

When addressing, extract into focused classes:

### Step 1: Extract ConflictResolver
```typescript
// New file: ConflictResolver.ts
export class WebResourceConflictResolver {
    async checkForConflict(...): Promise<ConflictResolution> { }
    async showConflictDiffAndResolve(...): Promise<ConflictResolution> { }
    async reloadFromServer(...): Promise<void> { }
}
```

### Step 2: Extract ContentModeHandler
```typescript
// New file: ContentModeHandler.ts
export class WebResourceContentModeHandler {
    async readPublishedContent(...): Promise<Uint8Array> { }
    async readConflictContent(...): Promise<Uint8Array> { }
    async readServerCurrentContent(...): Promise<Uint8Array> { }
    async readLocalPendingContent(...): Promise<Uint8Array> { }
    async readUnpublishedContent(...): Promise<Uint8Array> { }
}
```

### Step 3: Simplify FileSystemProvider
```typescript
// FileSystemProvider becomes thin coordinator
export class WebResourceFileSystemProvider {
    constructor(
        private readonly contentHandler: WebResourceContentModeHandler,
        private readonly conflictResolver: WebResourceConflictResolver,
        ...
    ) { }

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const mode = parseWebResourceUri(uri).mode;
        return this.contentHandler.readContent(mode, ...);
    }
}
```

**Effort:** 4-6 hours including test updates

---

## When to Address

**Triggers:**
- Adding new content mode or conflict resolution feature
- Bug fix requiring significant changes to this file
- Natural refactoring as part of related work

Otherwise, leave as-is - it's working correctly.

---

## Related Items

- None (standalone decision)

---

## References

**Code Locations:**
- `src/features/webResources/infrastructure/providers/WebResourceFileSystemProvider.ts` - main file
- `src/features/webResources/infrastructure/providers/WebResourceConnectionRegistry.ts` - related registry

**Tests:**
- `src/features/webResources/infrastructure/providers/WebResourceFileSystemProvider.test.ts`

**Discussions:**
- Branch review 2025-12-03: Identified as acceptable complexity for now
