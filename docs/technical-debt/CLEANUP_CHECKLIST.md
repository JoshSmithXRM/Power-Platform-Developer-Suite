# Dead Code Cleanup Checklist

**Source**: DEAD_CODE_CLEANUP_REPORT.md
**Estimated Total Time**: 6 hours
**Last Updated**: 2025-11-22

---

## Phase 1: Remove Unused npm Packages ⏱️ 30 min

- [ ] Remove `axios` (never used, replaced with fetch)
- [ ] Remove `node-fetch` (never used, using native fetch)
- [ ] Remove `@types/node-fetch` (never used)
- [ ] Remove `node-persist` (never used, using VS Code storage)
- [ ] Run `npm run compile` to verify
- [ ] Run `npm test` to verify
- [ ] Commit: `chore: remove unused npm dependencies`

**Command**:
```bash
npm uninstall axios node-fetch @types/node-fetch node-persist
npm run compile && npm test
```

---

## Phase 2: Delete Unused Data Loaders ⏱️ 1 hour

**Decision**: Delete (recommended) or Wire Up

### Option A: Delete (Recommended)

- [ ] Delete `ConnectionReferencesDataLoader.ts`
- [ ] Delete `EnvironmentVariablesDataLoader.ts`
- [ ] Delete `ImportJobDataLoader.ts`
- [ ] Delete `SolutionDataLoader.ts`
- [ ] Run `npm run compile` to verify
- [ ] Commit: `chore: remove unused DataLoader classes`

**Files**:
```
src/features/connectionReferences/presentation/dataLoaders/ConnectionReferencesDataLoader.ts
src/features/environmentVariables/presentation/dataLoaders/EnvironmentVariablesDataLoader.ts
src/features/importJobViewer/presentation/dataLoaders/ImportJobDataLoader.ts
src/features/solutionExplorer/presentation/dataLoaders/SolutionDataLoader.ts
```

### Option B: Wire Up (If keeping abstraction)

- [ ] Refactor `ConnectionReferencesPanelComposed` to use data loader
- [ ] Refactor `EnvironmentVariablesPanelComposed` to use data loader
- [ ] Refactor `ImportJobViewerPanelComposed` to use data loader
- [ ] Refactor `SolutionExplorerPanelComposed` to use data loader
- [ ] Update tests
- [ ] Commit: `refactor: wire up DataLoader pattern in panels`

---

## Phase 3: Remove Dead View Functions ⏱️ 30 min

- [ ] Verify `renderEnvironmentSetup` has no usages: `grep -r "renderEnvironmentSetup" src/`
- [ ] Delete or inline `renderEnvironmentSetup` function
- [ ] Verify `renderTimelineTab` has no usages: `grep -r "renderTimelineTab" src/`
- [ ] Delete or inline `renderTimelineTab` function
- [ ] Run `npm run compile`
- [ ] Commit: `chore: remove unused view rendering functions`

**Files**:
```
src/features/environmentSetup/presentation/views/environmentSetup.ts:23
src/features/pluginTraceViewer/presentation/views/pluginTraceTimelineView.ts:10
```

---

## Phase 4: Fix Circular Dependencies ⏱️ 2 hours

### 4.1 Fix FilterCondition ↔ ODataExpressionBuilder (HIGH PRIORITY - Domain Layer)

**Current**:
```
FilterCondition.ts ↔ ODataExpressionBuilder.ts
```

**Solution**: Move OData logic into FilterCondition as a method OR extract shared types

- [ ] Analyze coupling between FilterCondition and ODataExpressionBuilder
- [ ] Choose fix strategy:
  - [ ] Option A: Move buildExpression() into FilterCondition entity
  - [ ] Option B: Extract shared types to value objects
  - [ ] Option C: Refactor ODataExpressionBuilder to not import entity
- [ ] Implement chosen solution
- [ ] Verify with `npx madge --circular src/ --extensions ts`
- [ ] Run tests
- [ ] Commit: `refactor: resolve FilterCondition ↔ ODataExpressionBuilder circular dependency`

**Files**:
```
src/features/pluginTraceViewer/domain/entities/FilterCondition.ts
src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts
```

---

### 4.2 Fix EnvironmentSelectorSection ↔ environmentSelectorView

**Current**:
```
EnvironmentSelectorSection.ts ↔ environmentSelectorView.ts
```

**Solution**: Extract shared types to separate file

- [ ] Create `EnvironmentSelectorTypes.ts` file
- [ ] Move shared types from section to types file
- [ ] Update imports in section file
- [ ] Update imports in view file
- [ ] Verify with `npx madge --circular src/ --extensions ts`
- [ ] Commit: `refactor: resolve EnvironmentSelector circular dependency`

**Files**:
```
src/shared/infrastructure/ui/sections/EnvironmentSelectorSection.ts
src/shared/infrastructure/ui/views/environmentSelectorView.ts
```

---

### 4.3 Fix DropdownSection ↔ dropdownView

**Current**:
```
DropdownSection.ts ↔ dropdownView.ts
```

**Solution**: Extract shared types (same as 4.2)

- [ ] Create `DropdownTypes.ts` file
- [ ] Move shared types from section to types file
- [ ] Update imports in section file
- [ ] Update imports in view file
- [ ] Verify with `npx madge --circular src/ --extensions ts`
- [ ] Commit: `refactor: resolve Dropdown circular dependency`

**Files**:
```
src/shared/infrastructure/ui/sections/DropdownSection.ts
src/shared/infrastructure/ui/views/dropdownView.ts
```

---

## Phase 5: Delete Truly Dead Code ⏱️ 2 hours

### 5.1 Verify and Delete Unused Classes

- [ ] **FilterSummaryFormatter**
  - [ ] `grep -r "FilterSummaryFormatter" src/ --include="*.ts"`
  - [ ] If zero usages, delete `FilterSummaryFormatter.ts`
  - [ ] `npm run compile`

- [ ] **PluginTraceToolbarSection**
  - [ ] `grep -r "PluginTraceToolbarSection" src/ --include="*.ts"`
  - [ ] If zero usages, delete `PluginTraceToolbarSection.ts`
  - [ ] `npm run compile`

---

### 5.2 Delete Unused Type Guards

- [ ] **isEnvironmentChangeMessage** (TypeGuards.ts:353)
  - [ ] Search for usages
  - [ ] Remove function if unused

- [ ] **isTreeNodeArray** (TypeGuards.ts:13)
  - [ ] Search for usages
  - [ ] Remove function if unused

- [ ] **isTraceLevel** (TypeGuards.ts:33)
  - [ ] Search for usages
  - [ ] Remove function if unused

- [ ] **isPluginTraceDetailViewModel** (TypeGuards.ts:47)
  - [ ] Search for usages
  - [ ] Remove function if unused

---

### 5.3 Delete Unused Utilities

- [ ] **applyRowStriping** (TableStriping.ts:12)
  - [ ] `grep -r "applyRowStriping" src/ --include="*.ts"`
  - [ ] Delete if unused

- [ ] **createButtonId** (BrandedTypes.ts:22)
  - [ ] `grep -r "createButtonId" src/ --include="*.ts"`
  - [ ] Delete if unused

---

### 5.4 Final Verification

- [ ] Run `npm run compile`
- [ ] Run `npm run lint`
- [ ] Run `npm test`
- [ ] Manual smoke test (F5 → test each panel)
- [ ] Commit: `chore: remove truly dead code (formatters, utilities, type guards)`

---

## Post-Cleanup Validation ⏱️ 30 min

- [ ] Re-run `npx ts-prune > ts-prune-after-cleanup.txt`
- [ ] Re-run `npx depcheck --json > depcheck-after-cleanup.json`
- [ ] Re-run `npx madge --circular src/ --extensions ts`
- [ ] Compare before/after:
  - [ ] Unused exports reduced from 85 to ~20
  - [ ] Circular dependencies reduced from 3 to 0
  - [ ] npm packages reduced from 45 to 41
- [ ] Update DEAD_CODE_CLEANUP_REPORT.md with "After" metrics
- [ ] Commit: `docs: update cleanup report with final metrics`

---

## CI/CD Integration (Optional)

- [ ] Add `depcheck` to CI pipeline
- [ ] Add `madge --circular` check to CI (fail on circular deps)
- [ ] Add `ts-prune` as warning (don't fail build)
- [ ] Commit: `ci: add dead code detection to pipeline`

---

## Completion Criteria

✅ **Phase 1-5 Complete**
✅ **All tests passing**
✅ **No circular dependencies**
✅ **Extension smoke test passed**
✅ **Documentation updated**

---

## Progress Tracking

| Phase | Status | Date Completed | Time Spent | Notes |
|-------|--------|----------------|------------|-------|
| Phase 1: npm packages | ⬜ Not Started | - | - | |
| Phase 2: Data loaders | ⬜ Not Started | - | - | Decision: Delete or Wire? |
| Phase 3: View functions | ⬜ Not Started | - | - | |
| Phase 4.1: FilterCondition fix | ⬜ Not Started | - | - | HIGH PRIORITY |
| Phase 4.2: EnvironmentSelector fix | ⬜ Not Started | - | - | |
| Phase 4.3: Dropdown fix | ⬜ Not Started | - | - | |
| Phase 5: Dead code | ⬜ Not Started | - | - | |
| Validation | ⬜ Not Started | - | - | |

**Legend**: ⬜ Not Started | 🟡 In Progress | ✅ Complete | ❌ Blocked

---

## Quick Commands Reference

```bash
# Check for unused exports
npx ts-prune

# Check for unused dependencies
npx depcheck

# Check for circular dependencies
npx madge --circular src/ --extensions ts

# Search for usage
grep -r "ClassName" src/ --include="*.ts"

# Verify builds
npm run compile && npm test

# Full validation
npm run compile && npm run lint && npm test
```
