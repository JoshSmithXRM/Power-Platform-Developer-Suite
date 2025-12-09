# Solution Diff - Task Tracking

**Branch:** `feature/solution-diff`
**Created:** 2025-12-08
**Status:** Implementation (Slice 1 complete, testing pending)

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

### Slice 3 (Future) - Component-Level Diff
- [ ] Fetch solution components from both environments
- [ ] Compare component lists (entities, flows, plugins, etc.)
- [ ] Show added/removed/modified components

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
- Implemented all 4 layers (Domain, Application, Infrastructure, Presentation)
- Integrated with extension (package.json, extension.ts)
- Established NEW dual-environment panel pattern

**Commits:**
1. `0791acd` - Design document
2. `06ca1ff` - Full Slice 1 implementation

**Handoff for next session:**
- F5 test the panel manually
- Write unit tests for domain layer (SolutionComparison, ComparisonResult)
- Fix any bugs found during manual testing
- Run `/code-review` for approval
- Update CHANGELOG.md
- Create PR

**Key Files:**
- Panel: `src/features/solutionDiff/presentation/panels/SolutionDiffPanelComposed.ts`
- Domain: `src/features/solutionDiff/domain/entities/SolutionComparison.ts`
- Use Case: `src/features/solutionDiff/application/useCases/CompareSolutionMetadataUseCase.ts`
- Command: `power-platform-dev-suite.solutionDiff` in extension.ts (line ~600)

**Architecture Notes:**
- First dual-environment feature in codebase
- Uses `customData` in `SectionRenderData` for feature-specific properties
- Panel is singleton (only one diff panel at a time, not per-environment)
- Solutions loaded from source environment only
