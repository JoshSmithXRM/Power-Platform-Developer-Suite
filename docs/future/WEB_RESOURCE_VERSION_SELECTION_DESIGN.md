# Web Resource Version Selection - UX Design

**Status:** Design Complete, Ready for Implementation
**Branch:** `feature/finish-data-explorer-web-resources-metadata`
**Date:** 2025-12-03

---

## Overview

When working with web resources, developers need to handle two version-related scenarios:

1. **Process 1 (Open):** Opening a file that has unpublished changes
2. **Process 2 (Save Conflict):** Saving when someone else modified the file

Both require showing differences and letting the user choose a version. This document defines the UX for each.

---

## Process 1: Opening with Unpublished Changes

### Scenario

- User clicks to open a web resource
- System detects: published content ≠ unpublished content
- User needs to choose which version to start editing from

### Key Insight

This is **NOT a merge scenario**. The user is choosing a **starting point** for their work. This is a low-stakes decision (no work to lose yet).

### UX Flow

```
[User clicks to open web resource]
        ↓
[System detects: published ≠ unpublished]
        ↓
[Show diff view: Published (left) vs Unpublished (right)]
        ↓
[Show action prompt with clear choices:]
   ┌─────────────────────────────────────────────────────────────┐
   │  This file has unpublished changes.                        │
   │                                                             │
   │  [Edit Unpublished]     [Edit Published]      [Cancel]     │
   │  (your pending changes) (live version)        (close)      │
   └─────────────────────────────────────────────────────────────┘
        ↓
[User chooses]
        ↓
[Close diff → Open chosen version as normal editable file]
        ↓
[User edits and saves when ready]
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Show diff? | Yes | User needs to see what's different to make informed choice |
| Merge editor? | No | Overkill - 95%+ of cases are "pick one entirely" |
| Diff editable? | No | Diff is for viewing/deciding, not editing |
| Default option? | None | Both are equally valid starting points |

### Button Labels

- **"Edit Unpublished"** - Clear that this is their pending changes
- **"Edit Published"** - Clear that this is the live version
- **"Cancel"** - Close without opening anything

### After Selection

1. Close the diff view
2. Open the chosen version as a normal editable file
3. User can edit freely
4. Changes saved only when user explicitly saves (Ctrl+S)

---

## Process 2: Save Conflict Detection

### Scenario

- User opened file at time T1 (recorded `modifiedOn` timestamp)
- User made local edits
- User tries to save at time T2
- System checks: server's `modifiedOn` > T1 (someone else changed it)
- User needs to resolve the conflict

### Key Insight

This is a **conflict scenario** with **high stakes** - user could lose their work. But it's still typically "pick one" not "merge chunks" because we lack the base version for proper 3-way merge.

### UX Flow

```
[User tries to save (Ctrl+S)]
        ↓
[System detects: server modifiedOn > baseline]
        ↓
[Show modal:]
   ┌──────────────────────────────────────────────────────────────┐
   │  This file was modified on the server since you opened it.  │
   │                                                              │
   │  [Overwrite]       [Compare First]       [Discard My Work]   │
   │  Save my changes   See differences       Reload server       │
   │  to server         then decide           version             │
   └──────────────────────────────────────────────────────────────┘
        ↓
[If "Compare First":]
        ↓
[Show diff: Server version (left) vs My local changes (right)]
        ↓
[Show action prompt:]
   ┌─────────────────────────────────────────────────────────────┐
   │  [Save My Version]              [Use Server Version]        │
   │  (overwrite server)             (discard my changes)        │
   └─────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Show diff? | Optional | User may already know they want to overwrite |
| Merge editor? | No | We lack base version for proper 3-way merge |
| Allow skip? | Yes | "Overwrite" lets user skip comparison |
| Default option? | None | Both have significant consequences |

### Button Labels (Initial Modal)

- **"Overwrite"** - Clear that this replaces server content
- **"Compare First"** - See the diff before deciding
- **"Discard My Work"** - Clear consequence: lose local changes

### Button Labels (After Compare)

- **"Save My Version"** - Overwrite server with local changes
- **"Use Server Version"** - Discard local changes, reload server content

### Technical Note

We currently store `modifiedOn` timestamp but not the original content. This means:
- We can detect conflicts (timestamp comparison)
- We cannot do proper 3-way merge (no base version)
- Future enhancement: cache original content for merge support

---

## Comparison Table

| Aspect | Process 1 (Open) | Process 2 (Save Conflict) |
|--------|------------------|---------------------------|
| **Trigger** | Opening a file | Saving a file |
| **Versions** | Published vs Unpublished | Server (current) vs Local edits |
| **User's work at risk?** | No | Yes |
| **Stakes** | Low | High |
| **Primary question** | "Where do I start?" | "Whose changes win?" |
| **Compare required?** | Yes (always show) | No (optional) |
| **Merge editor?** | No | No (lack base version) |

---

## Implementation Requirements

### Process 1 Implementation

1. **Detection:** In `handleOpenWebResource`, after fetching both versions
2. **Diff View:** Use `vscode.diff` command with published (left) and unpublished (right)
3. **Action Prompt:** Modal or notification with clear buttons
4. **Transition:** Close diff, open chosen version via `openWebResourceDirectly()`
5. **No Save:** Nothing saved until user explicitly saves

### Process 2 Implementation

1. **Detection:** In `writeFile`, compare server `modifiedOn` with cached baseline
2. **Initial Modal:** `vscode.window.showWarningMessage` with three options
3. **Compare View:** Use `vscode.diff` with server version vs local content
4. **Resolution:** Either proceed with save or reload from server
5. **Reload:** Use `WorkspaceEdit` to replace editor content (existing `reloadFromServer` method)

### VS Code APIs Needed

- `vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title)` - Show diff
- `vscode.window.showWarningMessage(message, { modal: true }, ...buttons)` - Modal prompts
- `vscode.commands.executeCommand('workbench.action.closeActiveEditor')` - Close diff
- `vscode.workspace.openTextDocument(uri)` + `vscode.window.showTextDocument()` - Open file
- `vscode.WorkspaceEdit` - Replace content for reload

### File Changes Required

- `WebResourcesPanelComposed.ts` - Process 1 logic in `showPublishedVsUnpublishedDiff`
- `WebResourceFileSystemProvider.ts` - Process 2 logic in `writeFile` and `checkForConflict`

---

## Current State

### What's Implemented

- [x] `getPublishedContent()` - Fetch published version
- [x] `getContent()` - Fetch unpublished version (via RetrieveUnpublished)
- [x] Conflict detection on save (modifiedOn comparison)
- [x] "Overwrite" / "Reload from Server" modal (basic)
- [x] `reloadFromServer()` using WorkspaceEdit

### What's Missing (Process 1)

- [ ] Proper diff view on open (currently uses merge editor)
- [ ] Action buttons after viewing diff
- [ ] Clean transition from diff to edit mode

### What's Missing (Process 2)

- [ ] "Compare First" option in conflict modal
- [ ] Diff view showing server vs local changes
- [ ] Action buttons after viewing comparison

---

## Future Enhancement: Merge Support

If we want to support merge editor for Process 2:

1. **Cache original content** when file is opened (not just `modifiedOn`)
2. **Store in memory** for the editing session (e.g., `Map<cacheKey, originalContent>`)
3. **Use as base** for 3-way merge when conflict detected
4. **Add option** "Merge Changes" alongside "Overwrite" and "Discard"

This would enable proper 3-way merge for complex conflicts where both sides have valuable changes.

---

## Acceptance Criteria

### Process 1

- [ ] Opening a web resource with unpublished changes shows diff view
- [ ] Diff shows: Published (left) vs Unpublished (right)
- [ ] User sees clear prompt with "Edit Unpublished" / "Edit Published" / "Cancel"
- [ ] Selecting a version closes diff and opens that version for editing
- [ ] No changes saved until user explicitly saves
- [ ] Cancel closes diff without opening anything

### Process 2

- [ ] Saving when server modified shows modal with "Overwrite" / "Compare First" / "Discard"
- [ ] "Overwrite" saves local changes immediately
- [ ] "Discard" reloads server version (existing behavior)
- [ ] "Compare First" shows diff: Server (left) vs Local (right)
- [ ] After compare, user can choose "Save My Version" or "Use Server Version"
- [ ] Chosen action executes correctly

---

**Last Updated:** 2025-12-03
