# View Modes - Task Tracking

**Branch:** `feature/plugin-registration`
**Created:** 2025-12-21
**Status:** Implementation Complete - Awaiting F5 Testing

---

## Overview

**Goal:** Add view mode switcher to Plugin Registration panel allowing users to toggle between "Assembly View" (current) and "Message View" (steps grouped by SDK Message/Entity).

**Discovery Findings:**
- Found: Existing `PluginRegistrationTreeMapper` handles tree transformation
- Found: Steps already have `getMessageName()` and `getPrimaryEntityLogicalName()` methods
- Found: Existing workspace state management pattern in panel
- Will reuse: `SectionPosition.Toolbar` for dropdown placement
- Will reuse: Existing tree rendering infrastructure
- Need to create: `TreeViewMode` enum, `ViewModeSection`, message grouping logic

---

## Requirements

- [x] Design document created (`docs/design/VIEW_MODES_DESIGN.md`)
- [x] View mode dropdown in toolbar (Assembly View / Message View)
- [x] Assembly View shows current hierarchy (packages, assemblies, webhooks, etc.)
- [x] Message View groups steps by SDK Message -> Entity -> Steps
- [x] Custom APIs visible at root in BOTH views
- [x] View mode persists per environment in workspace state
- [x] View switching is instant (no API calls, uses cached data)

**Success Criteria:**
- [ ] User can switch between Assembly and Message views (NEEDS F5 TEST)
- [ ] Message view shows correct hierarchy (Message -> Entity -> Steps) (NEEDS F5 TEST)
- [ ] State persists across panel close/reopen (NEEDS F5 TEST)
- [ ] View switch takes < 100ms (no loading spinner) (NEEDS F5 TEST)

---

## Implementation Slices

### Slice 1: MVP - View Mode Switcher with Basic Message View
**Status:** ✅ Complete

#### Application Layer
- [x] Create `TreeViewMode` enum (`application/enums/TreeViewMode.ts`)
- [x] Add `SdkMessageMetadata` and `EntityGroupMetadata` to `TreeItemViewModel.ts`
- [x] Add `viewMode` parameter to `PluginRegistrationTreeMapper.toTreeItems()`
- [x] Implement `extractAllSteps()` method in mapper
- [x] Implement `groupStepsByMessageAndEntity()` method in mapper
- [x] Implement `buildMessageViewTree()` method in mapper
- [x] `npm run compile:fast` passes after each file
- [ ] Unit tests for mapper grouping logic (deferred to Slice 3)

#### Presentation Layer
- [x] Create `ViewModeSection.ts` (dropdown in toolbar)
- [x] Add `viewModeChange` to `PluginRegistrationCommands` type
- [x] Add `currentViewMode` state to panel
- [x] Add `cachedTreeResult` field to panel for instant re-render
- [x] Implement `handleViewModeChange()` in panel
- [x] Register ViewModeSection in panel's section composition
- [x] Wire up command handler for `viewModeChange`
- [x] `npm run compile` passes
- [x] All tests pass (8515 tests)

#### Verification
- [ ] F5 test: View mode dropdown appears in toolbar
- [ ] F5 test: Can switch between Assembly and Message views
- [ ] F5 test: Message view shows messages at root with steps as children

---

### Slice 2: Entity Hierarchy in Message View
**Status:** ✅ Complete (Implemented with Slice 1)

- [x] Enhance `buildMessageViewTree()` to create entity nodes
- [x] Steps with entity go under entity node (Message -> Entity -> Step)
- [x] Steps without entity go directly under message (Message -> Step)
- [x] Entity nodes show entity logical name
- [x] `npm run compile` passes

#### Verification
- [ ] F5 test: Message view shows Entity nodes under Messages
- [ ] F5 test: Steps correctly placed under Entity or directly under Message

---

### Slice 3: Polish - Icons, Counts, Tooltips
**Status:** ✅ Complete

- [x] Add step count to Message nodes (e.g., "Create (5 steps)")
- [x] Add step count to Entity nodes (e.g., "account (3 steps)")
- [x] Icons for Message and Entity nodes (📨 and 📋)
- [x] Unit tests for mapper grouping logic (10 new tests)
- [x] View mode state persistence (workspace state - per environment)
- [ ] Add tooltips with metadata (deferred - low priority)
- [ ] Update CSS if needed for view mode dropdown styling (verify in F5)

---

## Testing

- [x] Unit tests pass: `npm test` (8532 tests, including 10 new Message View tests)
- [ ] Manual testing (F5): All slices verified - **BLOCKED: User building Azure resources**
- [ ] State persistence tested (close/reopen panel)
- [ ] Environment switching tested (each env remembers its mode)
- [ ] Performance verified (< 100ms view switch)

### Bugs Found During Manual Testing

| Bug | Status | Notes |
|-----|--------|-------|
| | | |

---

## Review & Merge

- [x] All slices implemented
- [ ] All bugs from manual testing fixed
- [ ] `/code-review` - APPROVED
- [x] CHANGELOG.md updated (2025-12-26)
- [ ] PR created
- [ ] CI passes

---

## Pre-PR Remaining Items (2025-12-26)

| Item | Status | Notes |
|------|--------|-------|
| F5 Manual Testing | BLOCKED | User building Azure resources |
| Fix 35 lint errors | TODO | Non-null assertions + static methods |
| /prepare-pr | TODO | After testing complete |

---

## Cleanup (After Merge)

- [ ] Design doc: Delete (tests are the spec)
- [ ] This tracking doc: Delete (`git rm`)

---

## Session Notes

### Session 1 (2025-12-21)
- Created design document with outside-in approach
- Implemented Slice 1 + Slice 2 (inside-out: Application -> Presentation)
- Implemented Slice 3 (tests, state persistence)
- Key files created/modified:
  - `application/enums/TreeViewMode.ts` (NEW)
  - `application/viewModels/TreeItemViewModel.ts` (MODIFIED - added sdkMessage, entityGroup types)
  - `application/mappers/PluginRegistrationTreeMapper.ts` (MODIFIED - added view mode support)
  - `application/mappers/PluginRegistrationTreeMapper.test.ts` (MODIFIED - 10 new Message View tests)
  - `presentation/sections/ViewModeSection.ts` (NEW)
  - `presentation/panels/PluginRegistrationPanelComposed.ts` (MODIFIED - state management, persistence)
- All 8532 tests pass
- Compile succeeds
- Committed Slice 1+2: `d059dc9 feat(plugin-registration): add view mode switcher`
- Ready for F5 testing and final commit
