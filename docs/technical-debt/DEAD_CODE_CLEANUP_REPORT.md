# Dead Code & Unused Exports Cleanup Report

**Generated**: 2025-11-22
**Tool**: `ts-prune`, `depcheck`, `madge`
**Status**: Analysis Complete - Awaiting Cleanup

---

## Executive Summary

| Category | Count | Severity | Estimated Cleanup Time |
|----------|-------|----------|------------------------|
| **Unused npm dependencies** | 4 packages | Medium | 30 minutes |
| **Unused TypeScript exports** | 85 items | Low-Medium | 4-8 hours |
| **Circular dependencies** | 3 cycles | Low | 2 hours |
| **Orphaned test files** | 0 | N/A | N/A |

**Overall Impact**: Removing dead code could reduce bundle size by ~5-10% and improve build times.

---

## 1. Unused npm Dependencies

### 🔴 **Priority: HIGH** - Remove These Packages

These dependencies are installed but **never imported** anywhere in the codebase:

```bash
npm uninstall axios node-fetch @types/node-fetch node-persist
```

#### Details:

| Package | Size | Last Used | Replacement |
|---------|------|-----------|-------------|
| `axios` | ~500kb | Never | Already using native `fetch` |
| `node-fetch` | ~50kb | Never | Already using native `fetch` |
| `@types/node-fetch` | ~10kb | Never | Not needed |
| `node-persist` | ~30kb | Never | Using VS Code storage APIs |

**Why They Exist**: Likely added during initial exploration, then replaced with better alternatives.

**Risk Level**: **ZERO** - These are completely unused. Safe to remove immediately.

**Action**: Run cleanup command and test build.

---

## 2. Unused TypeScript Exports

### Classification System

Exports are categorized into **5 categories**:

1. ✅ **FALSE POSITIVES** - Appear unused but are actually required
2. ⚠️ **PLANNED FEATURES** - Written but not yet wired up
3. 🟡 **TYPE-ONLY EXPORTS** - Used only for TypeScript types
4. 🔴 **TRULY DEAD** - Safe to delete
5. 🟢 **KEEP** - Part of public API or framework contracts

---

### 2.1 FALSE POSITIVES (Keep - Actually Used)

These are flagged by `ts-prune` but are **required**:

#### **VS Code Extension Entry Points**
```typescript
// src/extension.ts
- activate     // Required by VS Code
- deactivate   // Required by VS Code
```
**Action**: None. These are VS Code API contracts.

---

#### **Test Infrastructure**
```typescript
// src/infrastructure/logging/SpyLogger.ts
- SpyLogger    // Used in test files (ts-prune doesn't detect test imports)
```
**Action**: None. Required for testing.

---

#### **Type Definitions Used in Same File**

All exports marked `(used in module)` are used internally:
- `SaveEnvironmentMessage` (TypeGuards.ts:40)
- `TestConnectionMessage` (TypeGuards.ts:102)
- `DeleteEnvironmentMessage` (TypeGuards.ts:166)
- ... (14+ more in TypeGuards.ts)

**Action**: None. These are intentionally exported for other files to import.

---

### 2.2 PLANNED FEATURES (Investigate Before Deleting)

These appear to be **implemented but not wired up** - likely planned features:

#### 🔍 **Feature: Data Loader Architecture**

**Status**: Implemented but never instantiated

```typescript
// UNUSED: These data loaders exist but aren't called anywhere
src/features/connectionReferences/presentation/dataLoaders/ConnectionReferencesDataLoader.ts:13
src/features/environmentVariables/presentation/dataLoaders/EnvironmentVariablesDataLoader.ts:12
src/features/importJobViewer/presentation/dataLoaders/ImportJobDataLoader.ts:13
src/features/solutionExplorer/presentation/dataLoaders/SolutionDataLoader.ts:12
```

**Analysis**:
- All 4 `DataLoader` classes implement `IDataLoader` interface
- They're complete, tested implementations
- **BUT**: Never instantiated in any panel code
- Panels directly call use cases instead of using data loaders

**Possible Explanations**:
1. **Abandoned refactoring** - Started migrating to data loader pattern, never finished
2. **Over-engineering** - Decided simpler approach was better
3. **Planned feature** - Will be used when panels are refactored

**Recommendation**:
- **Option A** (Cleanup): Delete all 4 data loaders since panels work without them
- **Option B** (Complete): Wire them up in panels to use the abstraction
- **Option C** (Document): Add TODO comments explaining their purpose

**Estimated Impact**: ~500 LOC could be removed (or used)

---

#### 🔍 **Feature: Collection Services**

**Status**: Implemented but unused

```typescript
src/features/connectionReferences/domain/services/CloudFlowCollectionService.ts:6
src/features/connectionReferences/domain/services/ConnectionReferenceCollectionService.ts:6
```

**Analysis**:
- Simple domain services for sorting/filtering collections
- Only 10-15 LOC each
- Never called anywhere in codebase

**Recommendation**:
- **Keep**: They're tiny and represent good domain patterns
- **OR Delete**: If we're doing sorting in mappers instead

---

#### 🔍 **Feature: View Rendering Functions**

**Status**: Exist but never called

```typescript
src/features/environmentSetup/presentation/views/environmentSetup.ts:23
  - renderEnvironmentSetup

src/features/pluginTraceViewer/presentation/views/pluginTraceTimelineView.ts:10
  - renderTimelineTab
```

**Analysis**:
- Complete view rendering functions
- **BUT**: Related to old rendering architecture
- Panels now use `HtmlScaffoldingBehavior` instead

**Recommendation**: **DELETE** - These are from old architecture, replaced by new composition pattern

---

### 2.3 TYPE-ONLY EXPORTS (Keep - Used for Types)

These exports are used **only in type annotations**, not at runtime:

#### **Domain Value Objects (Re-exported in types.ts)**
```typescript
// src/features/pluginTraceViewer/application/types.ts
- CorrelationId     // Used in: import type { CorrelationId } from '...'
- PipelineStage     // Type-only import
- ValidationError   // Type-only import
- ExportFormat      // Type-only import
- PluginTrace       // Type-only import
```

**Why ts-prune flags these**: Type-only imports don't count as "usage" for ts-prune.

**Action**: **KEEP** - These provide type safety and are intentionally re-exported.

---

#### **Use Case DTOs (Request/Response types)**
```typescript
// All use case files export request/response interfaces:
- CheckConcurrentEditRequest
- CheckConcurrentEditResponse
- DiscoverEnvironmentIdResponse
- LoadEnvironmentByIdRequest
- SaveEnvironmentResponse
- TestConnectionResponse
... (10+ more)
```

**Why unused**: These are exported for **future external consumers** (e.g., if we build an API or CLI).

**Action**: **KEEP** - Good practice to export DTOs even if not currently used externally.

---

#### **Domain Events**
```typescript
// src/features/environmentSetup/domain/events/index.ts
- EnvironmentCreated
- EnvironmentUpdated
- EnvironmentDeleted
- AuthenticationCacheInvalidationRequested
- EnvironmentEvent (base type)

// src/features/persistenceInspector/domain/events/index.ts
- DomainEvent
- StorageInspected
- StorageEntryCleared
- ... (all event types)
```

**Why unused**: Events are consumed via the `index.ts` barrel export, so individual events appear unused.

**Action**: **KEEP** - Part of event-driven architecture.

---

### 2.4 TRULY DEAD CODE (Safe to Delete)

#### 🔴 **Priority: MEDIUM** - Delete These

##### **Unused Formatters**
```typescript
src/features/pluginTraceViewer/presentation/formatters/FilterSummaryFormatter.ts:9
  - FilterSummaryFormatter
```
**Action**: Delete class and file if it's the only export.

---

##### **Unused Sections**
```typescript
src/features/pluginTraceViewer/presentation/sections/PluginTraceToolbarSection.ts:9
  - PluginTraceToolbarSection
```
**Analysis**: Check if this was replaced by individual toolbar sections.
**Action**: Delete if functionality exists elsewhere.

---

##### **Unused Type Guards**
```typescript
src/infrastructure/ui/utils/TypeGuards.ts:353
  - isEnvironmentChangeMessage

src/shared/infrastructure/ui/types/TypeGuards.ts
  - isTreeNodeArray:13
  - isTraceLevel:33
  - isPluginTraceDetailViewModel:47
```
**Action**: Delete these specific type guards if no references found.

---

##### **Unused Utilities**
```typescript
src/shared/infrastructure/ui/utils/TableStriping.ts:12
  - applyRowStriping

src/shared/infrastructure/ui/types/BrandedTypes.ts:22
  - createButtonId
```
**Action**: Delete if unused.

---

### 2.5 KEEP (Part of Public API)

These are **intentionally exported** for external use or framework contracts:

#### **View Models (DTOs)**
```typescript
- FlowConnectionRelationshipViewModel
- EnvironmentFormViewModel
- ImportJobViewModel
- DetailPanelViewModel
... (all *ViewModel.ts files)
```
**Action**: **KEEP** - These are the public API for panels.

---

#### **Infrastructure DTOs**
```typescript
- EntityMetadataDto + nested types (LocalizedLabel, ManagedProperty, etc.)
- All DTO files in infrastructure/dtos/
```
**Action**: **KEEP** - These mirror external API contracts.

---

#### **Configuration Types**
```typescript
- EnvironmentSelectorConfig
- SolutionFilterConfig
- CommandHandlerOptions
- PanelFactory
- WebviewPanelOptions
- CreatePanelConfig
... (all *Config types)
```
**Action**: **KEEP** - Used for dependency injection and configuration.

---

## 3. Circular Dependencies

### 🟡 **Priority: LOW-MEDIUM** - Fix When Touching These Files

Found **3 circular dependency cycles**:

#### **Cycle 1: Environment Selector (Presentation Layer)**
```
EnvironmentSelectorSection.ts ↔ environmentSelectorView.ts
```
**Location**: `src/shared/infrastructure/ui/sections/` ↔ `src/shared/infrastructure/ui/views/`

**Root Cause**: Section imports view function, view imports section types.

**Fix**:
1. Extract shared types to `EnvironmentSelectorTypes.ts`
2. Both files import from types file
3. Break circular reference

**Impact**: Low - Both files in presentation layer, doesn't violate Clean Architecture.

---

#### **Cycle 2: Filter Domain (Domain Layer)**
```
FilterCondition.ts ↔ ODataExpressionBuilder.ts
```
**Location**: `src/features/pluginTraceViewer/domain/`

**Root Cause**: `FilterCondition` (entity) uses `ODataExpressionBuilder` (service), service imports entity types.

**Fix**:
1. Move OData building logic into `FilterCondition` entity method
2. **OR**: Extract shared types to value objects
3. **OR**: Make `ODataExpressionBuilder` not import entity, only take primitives

**Impact**: Medium - This is in domain layer and should be pure. **Should fix**.

---

#### **Cycle 3: Dropdown Section (Presentation Layer)**
```
DropdownSection.ts ↔ dropdownView.ts
```
**Location**: `src/shared/infrastructure/ui/sections/` ↔ `src/shared/infrastructure/ui/views/`

**Root Cause**: Same as Cycle 1.

**Fix**: Same as Cycle 1 - extract types.

---

## 4. Cleanup Plan

### Phase 1: Quick Wins (30 minutes)

**Remove unused npm packages** (ZERO risk):
```bash
npm uninstall axios node-fetch @types/node-fetch node-persist
npm run compile && npm test  # Verify nothing breaks
```

**Expected impact**: ~600kb smaller node_modules, faster npm install

---

### Phase 2: Decide on Data Loaders (1 hour)

**Decision needed**: Keep or delete the 4 `DataLoader` classes?

**Option A - DELETE** (recommended):
```bash
# Delete these files:
rm src/features/connectionReferences/presentation/dataLoaders/ConnectionReferencesDataLoader.ts
rm src/features/environmentVariables/presentation/dataLoaders/EnvironmentVariablesDataLoader.ts
rm src/features/importJobViewer/presentation/dataLoaders/ImportJobDataLoader.ts
rm src/features/solutionExplorer/presentation/dataLoaders/SolutionDataLoader.ts

# Verify no compilation errors
npm run compile
```

**Option B - WIRE UP** (if abstraction is valuable):
- Refactor panels to use data loaders
- Adds abstraction layer between panels and use cases
- More work (~4 hours) but cleaner architecture

**Recommendation**: **DELETE** - Panels are working fine, YAGNI applies here.

---

### Phase 3: Remove Dead View Functions (30 minutes)

Delete old rendering functions replaced by new architecture:

```bash
# These are confirmed dead (old architecture):
# Delete or inline into calling code:
- renderEnvironmentSetup
- renderTimelineTab
```

Verify with grep before deleting:
```bash
grep -r "renderEnvironmentSetup" src/
grep -r "renderTimelineTab" src/
```

---

### Phase 4: Fix Circular Dependencies (2 hours)

**Priority order**:
1. Fix `FilterCondition` ↔ `ODataExpressionBuilder` (domain purity issue)
2. Fix `EnvironmentSelectorSection` ↔ `environmentSelectorView`
3. Fix `DropdownSection` ↔ `dropdownView`

**Strategy**: Extract types pattern (detailed in section 3 above)

---

### Phase 5: Delete Truly Dead Code (2 hours)

Systematically delete items in section 2.4:
1. Search for usages with grep
2. If zero usages found (excluding test file itself), delete
3. Run `npm run compile` after each deletion
4. Run `npm test` after batch of deletions

**Checklist**:
- [ ] FilterSummaryFormatter
- [ ] PluginTraceToolbarSection
- [ ] isEnvironmentChangeMessage
- [ ] isTreeNodeArray
- [ ] isTraceLevel
- [ ] isPluginTraceDetailViewModel
- [ ] applyRowStriping
- [ ] createButtonId

---

## 5. Validation Steps

After each cleanup phase:

```bash
# 1. TypeScript compilation
npm run compile

# 2. Linting
npm run lint

# 3. Tests
npm test

# 4. Manual smoke test
# - Press F5 to launch extension
# - Open each panel
# - Verify basic functionality

# 5. Re-run dead code detection
npx ts-prune | tee ts-prune-after-cleanup.txt
npx depcheck --json

# 6. Compare before/after
diff docs/technical-debt/ts-prune-report.txt ts-prune-after-cleanup.txt
```

---

## 6. Automation Recommendations

### Add to CI/CD Pipeline

**Prevent regression** by adding checks:

```yaml
# .github/workflows/quality.yml
- name: Check for unused dependencies
  run: npx depcheck --ignores="@types/*,vscode"

- name: Check for circular dependencies
  run: npx madge --circular src/ --extensions ts --error

- name: Check for unused exports (warning only)
  run: npx ts-prune || true  # Don't fail build, just warn
```

### Add to Pre-commit Hook

```bash
# .husky/pre-commit (optional)
npx madge --circular src/ --extensions ts --error
```

---

## 7. Estimated Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **npm packages** | 45 | 41 | -4 packages |
| **node_modules size** | ~150MB | ~149MB | -600KB |
| **TypeScript files** | 530 | ~520 | -10 files |
| **LOC (production)** | 66,571 | ~65,500 | -1,000 lines |
| **Unused exports** | 85 | ~20 | -65 items |
| **Circular deps** | 3 | 0 | -3 cycles |
| **Bundle size** | TBD | TBD | Est. -5% |

---

## 8. Next Steps

### Immediate Actions (This Week)
1. ✅ Run Phase 1 (remove npm packages) - **30 minutes**
2. ✅ Decide on Data Loaders (Phase 2) - **1 hour**
3. ✅ Remove dead view functions (Phase 3) - **30 minutes**

### Short-term (Next Sprint)
4. Fix circular dependencies (Phase 4) - **2 hours**
5. Delete truly dead code (Phase 5) - **2 hours**

### Long-term (Next Quarter)
6. Add CI/CD checks for unused code
7. Document export policy in CLAUDE.md
8. Run quarterly cleanup audit

---

## 9. Open Questions

**Before proceeding, answer these**:

1. **Data Loaders**: Delete or wire up? (Recommend: delete)
2. **Collection Services**: Keep for patterns or delete for simplicity? (Recommend: keep, they're tiny)
3. **Type-only exports in types.ts**: Should we keep re-exporting value objects? (Recommend: yes, clean API)
4. **Domain events**: Are we planning event sourcing? (If no, simplify event architecture)

---

## Appendix A: Full ts-prune Output

See `ts-prune-report.txt` for complete export analysis.

---

## Appendix B: Commands Used

```bash
# Generate this report
npx ts-prune > docs/technical-debt/ts-prune-report.txt
npx depcheck --json > docs/technical-debt/depcheck-full-report.json
npx madge --circular --summary src/ --extensions ts > docs/technical-debt/madge-report.txt

# Verify specific exports
grep -r "import.*{.*ClassName" src/ --include="*.ts"
grep -r "import type.*{.*ClassName" src/ --include="*.ts"
```

---

**Report Complete** - Ready for cleanup execution.
