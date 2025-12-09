# Solution Diff - Task Tracking

**Branch:** `feature/solution-diff`
**Created:** 2025-12-08
**Status:** Slice 1 + Slice 3 complete (metadata + component-level diff)

---

## Overview

**Goal:** Compare Power Platform solutions between two environments to identify differences in version, managed state, and metadata.

**Discovery Findings:**
- Found: `ISolutionRepository` already supports environment-scoped queries
- Found: `MsalAuthenticationService` supports concurrent auth to multiple environments
- Found: `DataverseApiService` is environment-agnostic (takes environmentId param)
- Will reuse: Existing Solution entity, repository, panel coordinator patterns
- Need to create: NEW dual-environment panel pattern (first in codebase)

---

## Requirements

### Slice 1 (MVP) - Metadata Comparison
- [x] Select source and target environments
- [x] Select solution from dropdown (loads from source env)
- [x] Compare solution metadata (version, isManaged, timestamps)
- [x] Display comparison status (Same, Different, SourceOnly, TargetOnly)
- [x] Show differences in side-by-side table

### Slice 2 (Future) - Bulk Comparison
- [ ] Compare all solutions at once
- [ ] Filter to show only differences
- [ ] Sort by status/name

### Slice 3 - Component-Level Diff (COMPLETE)
- [x] Fetch solution components from both environments
- [x] Compare component lists (entities, flows, plugins, etc.)
- [x] Show added/removed components with expandable sections

### Slice 4 (Future) - Export
- [ ] Export diff report (JSON/CSV)
- [ ] Copy to clipboard

**Success Criteria:**
- [x] Can compare same solution across two environments
- [ ] Manual F5 testing confirms UI works correctly
- [ ] Unit tests for domain layer pass

---

## Implementation Checklist

### Domain Layer
- [x] `ComparisonStatus` enum (Same, Different, SourceOnly, TargetOnly)
- [x] `ComparisonResult` value object (immutable, factory methods)
- [x] `SolutionComparison` entity (rich comparison logic)
- [ ] Unit tests for SolutionComparison (target: 100%)
- [ ] Unit tests for ComparisonResult (target: 100%)
- [x] `npm run compile` passes
- [x] Committed: `06ca1ff`

### Application Layer
- [x] `CompareSolutionMetadataUseCase` implementation
- [x] `SolutionComparisonViewModel` definition
- [x] `SolutionComparisonViewModelMapper` implementation
- [ ] Unit tests for mapper (target: 90%)
- [x] `npm run compile` passes
- [x] Committed: `06ca1ff`

### Infrastructure Layer
- [x] Reuses existing `DataverseApiSolutionRepository` (no changes needed)
- [x] `npm run compile` passes
- [x] Committed: `06ca1ff`

### Presentation Layer
- [x] `SolutionDiffPanelComposed` (NEW dual-environment pattern)
- [x] `DualEnvironmentSelectorSection` (source + target dropdowns)
- [x] `SolutionComparisonSection` (comparison results)
- [x] `dualEnvironmentSelectorView.ts` (HTML rendering)
- [x] `solutionComparisonView.ts` (HTML rendering)
- [x] `solution-diff.css` (styles)
- [x] `SolutionDiffBehavior.js` (webview behavior)
- [x] `initializeSolutionDiff.ts` (lazy loading)
- [x] `npm run compile` passes
- [x] Committed: `06ca1ff`

### Extension Integration
- [x] Command added to `package.json`
- [x] Command registered in `extension.ts`
- [x] Dual-environment picker workflow
- [x] `npm run compile` passes
- [x] Committed: `06ca1ff`

---

## Testing

- [ ] Unit tests pass: `npm test`
- [ ] Integration tests for panel: Not started
- [ ] E2E tests: Not required for Slice 1
- [ ] Manual testing (F5): **PENDING**

### Manual Test Cases

| Test Case | Status | Notes |
|-----------|--------|-------|
| Launch panel with 2 envs | Pending | |
| Source env dropdown loads envs | Pending | |
| Target env dropdown loads envs | Pending | |
| Solution dropdown loads from source | Pending | |
| Same solution, same version | Pending | Should show "Same" |
| Same solution, different version | Pending | Should show "Different" |
| Solution only in source | Pending | Should show "SourceOnly" |
| Solution only in target | Pending | Should show "TargetOnly" |
| Change source env reloads solutions | Pending | |
| Change target env re-runs comparison | Pending | |

### Bugs Found During Manual Testing

| Bug | Status | Notes |
|-----|--------|-------|
| | | |

---

## Review & Merge

- [ ] All implementation checkboxes complete
- [ ] All bugs from manual testing fixed
- [ ] `/code-review` - APPROVED
- [ ] CHANGELOG.md updated
- [ ] PR created: `gh pr create`
- [ ] CI passes

---

## Cleanup (After Merge)

- [ ] Design doc (`docs/design/SOLUTION_DIFF_DESIGN.md`): Extract patterns to architecture docs OR delete
- [ ] This tracking doc: Delete (`git rm`)
- [ ] Related documentation updated

---

## Session Notes

### Session 1 (2025-12-08)

**Completed:**
- Read requirements from `docs/future/ALM_DEVOPS.md`
- Explored codebase for existing patterns
- Created technical design document (`docs/design/SOLUTION_DIFF_DESIGN.md`)
- Implemented Slice 1 (metadata comparison only)
- Fixed bug: JS using wrong postMessage + event delegation
- F5 tested - metadata diff working (version, timestamps, managed state)

**User Feedback:**
- Slice 1 works but is NOT deep enough for real troubleshooting
- Need component-level diff to find actual problems
- Current output only shows "version doesn't match" or "install dates differ"
- **Priority: Implement Slice 3 (Component-Level Diff)**

**Commits:**
1. `0791acd` - Design document
2. `06ca1ff` - Slice 1 implementation
3. `1d45d38` - Bug fix (vscode.postMessage + event delegation)

**What Slice 3 needs (Component-Level Diff):**

1. **New API calls needed:**
   - `GET /api/data/v9.2/solutioncomponents?$filter=_solutionid_value eq '{solutionId}'`
   - Returns: componenttype, objectid, rootcomponentbehavior
   - Component types: 1=Entity, 29=Workflow/Flow, 92=PluginAssembly, 61=WebResource, etc.

2. **Domain entities to create:**
   - `SolutionComponent` entity (componentType, objectId, name, etc.)
   - `ComponentComparison` entity (compares components across envs)
   - `ComponentDiff` value object (added, removed, modified components)

3. **UI changes:**
   - Expandable sections by component type (Entities, Flows, Plugins, etc.)
   - Show added (green), removed (red), modified (yellow) components
   - Click to expand component details

4. **Deep comparison (future):**
   - Entity schema diff (fields, relationships)
   - Flow definition diff
   - Plugin step configuration diff

**Key Files:**
- Panel: `src/features/solutionDiff/presentation/panels/SolutionDiffPanelComposed.ts`
- Domain: `src/features/solutionDiff/domain/entities/SolutionComparison.ts`
- JS Behavior: `resources/webview/js/behaviors/SolutionDiffBehavior.js`

**Architecture Notes:**
- First dual-environment feature in codebase
- Uses `customData` in `SectionRenderData` for feature-specific properties
- Panel is singleton (only one diff panel at a time)
- Reuses existing `ISolutionRepository` for solution queries

### Session 2 (2025-12-09)

**Completed:**
- Created design document for Slice 3 (`docs/design/SOLUTION_DIFF_COMPONENT_DESIGN.md`)
- Implemented Slice 3 (component-level diff):

**Domain Layer (NEW):**
- `ComponentType.ts` - Enum with display name helpers
- `SolutionComponent.ts` - Entity with matching logic
- `ComponentDiff.ts` - Value object for categorized differences
- `ComponentComparison.ts` - Entity with diff business logic

**Application Layer (NEW):**
- `CompareSolutionComponentsUseCase.ts` - Orchestrates component comparison
- `ComponentDiffViewModel.ts` - ViewModels for component diff
- `ComponentDiffViewModelMapper.ts` - Maps domain to ViewModels

**Infrastructure Layer (MODIFIED):**
- `ISolutionComponentRepository.ts` - Added `findAllComponentsForSolution()` method + DTO
- `DataverseApiSolutionComponentRepository.ts` - Implemented new method

**Presentation Layer (MODIFIED/NEW):**
- `componentDiffView.ts` - NEW HTML rendering for component diff
- `solutionComparisonView.ts` - Extended to render component diff
- `SolutionComparisonSection.ts` - Extended to include component diff data
- `SolutionDiffPanelComposed.ts` - Extended to call component comparison use case
- `initializeSolutionDiff.ts` - Extended to create component repository
- `solution-diff.css` - Added component diff styles

**Key Features:**
- Components grouped by type (Entities, Flows, Plugins, etc.)
- Expandable sections with counts
- Color-coded: Added (green), Removed (red), Unchanged (gray)
- Auto-expands groups with differences
- Graceful handling: Component diff only shown if both solutions exist

**Pending:**
- F5 manual testing with real environments
