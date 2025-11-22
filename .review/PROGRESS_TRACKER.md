# Code Review Progress Tracker

**Review Date**: November 21, 2025
**Status**: In Progress
**Overall Score**: 8.4/10
**Production Readiness**: Needs Work (2 weeks to production-ready)

---

## Overview

This document tracks all issues identified by the 8-agent comprehensive code review process. Issues are organized by priority with specific actions, locations, and estimated effort.

---

## Critical Issues (Production Blockers) - 3 Total

### ✅ ❌ ⏳ [CRITICAL-1] escapeHtml Function Duplication (8 instances)
**Status**: ⏳ Pending
**Agent**: Code Quality
**Severity**: Critical
**Estimated Effort**: 2 hours
**Blocking Production**: YES

**Description**: Security-critical `escapeHtml` function duplicated across 8 files

**Affected Files**:
1. ❌ `src/shared/infrastructure/ui/views/htmlHelpers.ts:11`
2. ❌ `src/shared/infrastructure/ui/views/dataTable.ts:520`
3. ❌ `src/shared/infrastructure/ui/sections/ResizableDetailPanelSection.ts:196`
4. ❌ `src/features/importJobViewer/application/mappers/ImportJobViewModelMapper.ts:58`
5. ❌ `src/shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior.ts:86`
6. ❌ `src/features/solutionExplorer/application/mappers/SolutionViewModelMapper.ts:40`
7. ❌ `src/features/pluginTraceViewer/presentation/sections/FilterPanelSection.ts:305`
8. ✅ `src/infrastructure/ui/utils/HtmlUtils.ts:19` (canonical - keep this)

**Action Required**:
- Replace all 7 duplicates with: `import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';`
- Update import paths based on file location
- Run `npm run compile` to verify no errors
- Search codebase for any remaining instances: `grep -r "function escapeHtml" src/`

**Impact**: Security vulnerability fixes might miss locations, inconsistent implementations

---

### ✅ ❌ ⏳ [CRITICAL-2] All Application Mappers Have Zero Test Coverage (20 files)
**Status**: ⏳ Pending
**Agent**: Test Coverage
**Severity**: Critical
**Estimated Effort**: 5 days (Week 1 of test plan)
**Blocking Production**: YES

**Description**: ALL 20 application layer mappers lack test coverage - critical UI boundary untested

**Missing Tests** (prioritized):

**Priority 1 - Deployment Settings (affects file exports)**:
1. ❌ `EnvironmentVariableToDeploymentSettingsMapper.test.ts`
2. ❌ `ConnectionReferenceToDeploymentSettingsMapper.test.ts`

**Priority 2 - ViewModel Mappers (affects UI)**:
3. ❌ `EnvironmentFormViewModelMapper.test.ts`
4. ❌ `EnvironmentListViewModelMapper.test.ts`
5. ❌ `EnvironmentVariableViewModelMapper.test.ts`
6. ❌ `FlowConnectionRelationshipViewModelMapper.test.ts`
7. ❌ `SolutionViewModelMapper.test.ts`
8. ❌ `ImportJobViewModelMapper.test.ts`
9. ❌ `EntityAttributeMapper.test.ts`
10. ❌ `EntityTreeItemMapper.test.ts`
11. ❌ `ChoiceTreeItemMapper.test.ts`
12. ❌ `AttributeRowMapper.test.ts`
13. ❌ `RelationshipRowMapper.test.ts`
14. ❌ `KeyRowMapper.test.ts`
15. ❌ `PrivilegeRowMapper.test.ts`
16. ❌ `ChoiceValueRowMapper.test.ts`

**Priority 3 - Storage Mappers**:
17. ❌ `StorageEntryMapper.test.ts`
18. ❌ `StorageCollectionMapper.test.ts`
19. ❌ `StorageMetadataMapper.test.ts`
20. ❌ `ClearAllResultMapper.test.ts`

**Action Required**:
- Create test file for each mapper using pattern:
  ```typescript
  describe('MapperName', () => {
    let mapper: MapperName;
    beforeEach(() => { mapper = new MapperName(); });

    it('should map all properties correctly', () => { ... });
    it('should handle null values', () => { ... });
    it('should handle edge cases', () => { ... });
  });
  ```
- Verify property mapping from domain to ViewModel
- Test null/undefined handling
- Run `npm test` after each mapper

**Impact**: UI bugs, data transformation errors, no regression protection

---

### ✅ ❌ ⏳ [CRITICAL-3] StorageEntry & StorageCollection Entities Untested
**Status**: ⏳ Pending
**Agent**: Test Coverage
**Severity**: Critical
**Estimated Effort**: 1 day
**Blocking Production**: YES

**Description**: Critical domain entities with protected key logic have ZERO test coverage

**Missing Tests**:
1. ❌ `src/features/persistenceInspector/domain/entities/StorageEntry.test.ts`
   - `isProtected()` - Identifies protected keys (critical!)
   - `canBeCleared()` - Validation preventing accidental deletion
   - `getPropertyAtPath()` - Nested property navigation
   - `hasProperty()` - Property existence check
   - Factory method with secret handling

2. ❌ `src/features/persistenceInspector/domain/entities/StorageCollection.test.ts`
   - `validateClearOperation()` - CRITICAL: Prevents deletion of protected keys
   - `validateClearAllOperation()` - Aggregate validation with counts
   - `isKeyProtected()` - Regex pattern matching
   - `getClearableEntries()` / `getProtectedEntries()` - Filtering
   - `getTotalSize()` - Aggregate calculation

**Action Required**:
- Create comprehensive test coverage for both entities
- Test protected key patterns (regex matching)
- Test edge cases: deep property paths, missing properties, array indices
- Test validation prevents clearing protected keys
- Run `npm test -- StorageEntry.test.ts` and `npm test -- StorageCollection.test.ts`

**Impact**: CRITICAL - Could allow accidental deletion of environment configurations

---

## High Priority Issues (Next Sprint) - 20 Total

### ✅ ❌ ⏳ [HIGH-1] Presentation Sorting in Application Layer
**Status**: ⏳ Pending
**Agents**: Architecture, Domain Purity
**Severity**: High
**Estimated Effort**: 1 day

**Description**: Sorting logic for UI display in 3 use cases (architecture violation)

**Affected Files**:
- ❌ `src/features/metadataBrowser/application/useCases/LoadEntityMetadataUseCase.ts:101-125`
- ❌ `src/features/metadataBrowser/application/useCases/LoadChoiceMetadataUseCase.ts:39`
- ❌ `src/features/metadataBrowser/application/useCases/LoadMetadataTreeUseCase.ts:38-41`

**Action Required**:
- Move sorting methods to presentation layer mappers
- Use domain collection services for sorting before mapping
- Update use cases to return unsorted entities
- Update mappers to accept `shouldSort` parameter

**Impact**: Architecture violation, use cases aware of UI concerns

---

### ✅ ❌ ⏳ [HIGH-2] Large File - extension.ts (1,137 lines)
**Status**: ⏳ Pending
**Agent**: Code Quality
**Severity**: High
**Estimated Effort**: 2 days

**Description**: Main extension entry point too large, needs composition root extraction

**Affected File**:
- ❌ `src/extension.ts:1` (1,137 lines)

**Action Required**:
- Create `src/infrastructure/composition/DependencyContainer.ts`
- Create `src/infrastructure/composition/FeatureInitializers.ts`
- Extract DI setup to container
- Extract feature initialization to initializers
- Refactor `activate()` to use composition root

**Impact**: Maintenance difficulty, poor separation of concerns

---

### ✅ ❌ ⏳ [HIGH-3] Large Repository - DataverseEntityMetadataRepository.ts (813 lines)
**Status**: ⏳ Pending
**Agent**: Code Quality
**Severity**: High
**Estimated Effort**: 2 days

**Description**: Repository mixes API calls with extensive DTO mapping

**Affected File**:
- ❌ `src/features/metadataBrowser/infrastructure/repositories/DataverseEntityMetadataRepository.ts:1` (813 lines)

**Action Required**:
- Create `EntityMetadataMapper.ts` for DTO → domain mapping
- Create `AttributeMetadataMapper.ts` for attribute mapping
- Inject mappers into repository
- Repository calls API, delegates mapping to mappers

**Impact**: Maintenance difficulty, mixed responsibilities

---

### ✅ ❌ ⏳ [HIGH-4] Missing Tests: 6 Domain Collection Services
**Status**: ⏳ Pending
**Agent**: Test Coverage
**Severity**: High
**Estimated Effort**: 2 days (Week 3)

**Description**: Sorting logic in collection services untested

**Missing Tests**:
1. ❌ `SolutionCollectionService.test.ts` - Default solution first, then alphabetical
2. ❌ `EnvironmentVariableCollectionService.test.ts` - Alphabetical by schema name
3. ❌ `CloudFlowCollectionService.test.ts` - Alphabetical by name
4. ❌ `ConnectionReferenceCollectionService.test.ts` - Alphabetical by logical name
5. ❌ `ImportJobCollectionService.test.ts` - In-progress first, then by date (complex)
6. ❌ `FlowConnectionRelationshipCollectionService.test.ts` - By flow name, then connection

**Action Required**:
- Test basic sorting (correct order)
- Test edge cases (empty, single item, identical names)
- Test defensive copy (original array unchanged)
- Test complex priority sorting (ImportJobCollectionService)

**Impact**: Incorrect UI ordering, poor UX, no regression protection

---

### ✅ ❌ ⏳ [HIGH-5] through [HIGH-16]: Missing Use Case Tests (12 files)
**Status**: ⏳ Pending
**Agent**: Test Coverage
**Severity**: High
**Estimated Effort**: 3 days (Week 4)

**Description**: 36% of use cases lack test coverage

**Missing Tests** (prioritized by risk):

**Priority 1 - Deletion/Clearing**:
1. ❌ `DeleteEnvironmentUseCase.test.ts` - CRITICAL: Secret cleanup logic
2. ❌ `ClearAllStorageUseCase.test.ts` - CRITICAL: Bulk deletion

**Priority 2 - File Export**:
3. ❌ `ExportEnvironmentVariablesToDeploymentSettingsUseCase.test.ts`
4. ❌ `ExportConnectionReferencesToDeploymentSettingsUseCase.test.ts`

**Priority 3 - Complex Orchestration**:
5. ❌ `ListEnvironmentVariablesUseCase.test.ts` - Complex filtering
6. ❌ `ListConnectionReferencesUseCase.test.ts` - Relationship building

**Priority 4 - Validation/Query**:
7. ❌ `CheckConcurrentEditUseCase.test.ts`
8. ❌ `ValidateUniqueNameUseCase.test.ts`
9. ❌ `LoadEnvironmentByIdUseCase.test.ts`
10. ❌ `TestExistingEnvironmentConnectionUseCase.test.ts`
11. ❌ `GetClearAllConfirmationMessageUseCase.test.ts`
12. ❌ `OpenImportLogUseCase.test.ts`

**Action Required**:
- Create test for each use case
- Test orchestration logic (not business logic - that's in domain)
- Test logging at boundaries
- Test error handling
- Test event publishing

**Impact**: No validation of orchestration, error paths untested

---

### ✅ ❌ ⏳ [HIGH-17] Missing Tests: EnvironmentVariable Entity
**Status**: ⏳ Pending
**Agent**: Test Coverage
**Severity**: High
**Estimated Effort**: 4 hours

**Affected File**:
- ❌ `src/features/environmentVariables/domain/entities/EnvironmentVariable.test.ts`

**Missing Coverage**:
- Constructor type validation
- `getEffectiveValue()` - Current ?? default
- `hasValue()` - Any value set
- `hasOverride()` - Environment-specific overrides
- `isSecret()` - Secret type identification
- `isInSolution()` - Solution membership

**Action Required**:
- Create comprehensive entity tests
- Test all business logic methods
- Test edge cases (null values, type validation)

**Impact**: Business logic untested, no regression protection

---

### ✅ ❌ ⏳ [HIGH-18] Missing Tests: ConnectionReference Entity
**Status**: ⏳ Pending
**Agent**: Test Coverage
**Severity**: High
**Estimated Effort**: 4 hours

**Affected File**:
- ❌ `src/features/connectionReferences/domain/entities/ConnectionReference.test.ts`

**Action Required**:
- Review entity for business logic
- Create comprehensive tests if logic exists

**Impact**: Business logic potentially untested

---

### ✅ ❌ ⏳ [HIGH-19] Missing Tests: DeploymentSettings Entity
**Status**: ⏳ Pending
**Agent**: Test Coverage
**Severity**: High
**Estimated Effort**: 1 day

**Affected File**:
- ❌ `src/shared/domain/entities/DeploymentSettings.test.ts`

**Missing Coverage**:
- `syncEnvironmentVariables()` - Add/remove/preserve logic
- `syncConnectionReferences()` - Add/remove/preserve logic
- Generic `syncEntries()` - Complex algorithm
- Edge cases: empty arrays, all new, all removed, partial overlaps

**Action Required**:
- Test sync operations comprehensively
- Test edge cases
- Test alphabetical sorting is preserved

**Impact**: Complex sync logic untested, data loss risk

---

### ✅ ❌ ⏳ [HIGH-20] Missing Tests: 17 Value Objects (50% untested)
**Status**: ⏳ Pending
**Agent**: Test Coverage
**Severity**: High
**Estimated Effort**: 3 days (Week 5)

**Missing Tests**:

**MetadataBrowser Feature (7)**:
1. ❌ `AttributeType.test.ts`
2. ❌ `OptionSetMetadata.test.ts`
3. ❌ `LogicalName.test.ts`
4. ❌ `SchemaName.test.ts`
5. ❌ `CascadeConfiguration.test.ts`
6. ❌ (2 others from file count)

**PersistenceInspector Feature (10)**:
7. ❌ `StorageKey.test.ts` - Key validation and patterns
8. ❌ `StorageValue.test.ts` - Value wrapping
9. ❌ `StorageType.test.ts` - Type discrimination
10. ❌ `StorageMetadata.test.ts` - Metadata calculation
11. ❌ `PropertyPath.test.ts` - Path validation
12. ❌ `DataType.test.ts` - Type identification
13. ❌ `ProtectedKeyPattern.test.ts` - Regex patterns (CRITICAL)
14. ❌ `ClearValidationResult.test.ts`
15. ❌ `ClearAllValidationResult.test.ts`
16. ❌ (1 other from file count)

**Action Required**:
- Prioritize value objects with validation logic
- Test regex patterns thoroughly (ProtectedKeyPattern)
- Test edge cases and boundary conditions

**Impact**: Validation logic untested, pattern matching unverified

---

## Medium Priority Issues (Backlog) - 29 Total

### ✅ ❌ ⏳ [MEDIUM-1] Inconsistent Mapper Sorting Patterns
**Status**: ⏳ Pending
**Agents**: Architecture, Domain Purity
**Severity**: Medium
**Estimated Effort**: 1 day

**Description**: Some mappers delegate to domain services, some don't support sorting, some panels sort ViewModels

**Affected Files**:
- ❌ `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts:125,266`
- ❌ `src/features/environmentVariables/presentation/panels/EnvironmentVariablesPanelComposed.ts:161,320`

**Action Required**:
- Standardize on `toViewModels(items, shouldSort)` pattern
- All mappers should support sorting parameter
- Panels should use mapper's `toViewModels(items, true)`
- Remove direct ViewModel sorting from panels

**Impact**: Inconsistent patterns, harder maintenance

---

### ✅ ❌ ⏳ [MEDIUM-2] Panel Singleton Pattern Variations
**Status**: ⏳ Pending
**Agent**: Pattern Compliance
**Severity**: Medium
**Estimated Effort**: 2 hours

**Description**: Two panels don't follow EnvironmentScopedPanel base class

**Affected Files**:
- ❌ `src/features/persistenceInspector/presentation/panels/PersistenceInspectorPanelComposed.ts:79`
- ❌ `src/features/environmentSetup/presentation/panels/EnvironmentSetupPanelComposed.ts:41`

**Action Required**:
1. Add JSDoc comments explaining why each doesn't extend EnvironmentScopedPanel
2. Change `EnvironmentSetupPanel.currentPanels` from public to private static
3. Consider creating `NonEnvironmentScopedPanel` base class

**Impact**: Inconsistent patterns, public static Map exposed

---

### ✅ ❌ ⏳ [MEDIUM-3] Type Assertions in Panel State (as any)
**Status**: ⏳ Pending
**Agent**: Type Safety
**Severity**: Medium
**Estimated Effort**: 4 hours

**Description**: Two files use `as any` to work around PanelState interface limitations

**Affected Files**:
- ❌ `src/features/pluginTraceViewer/presentation/behaviors/PluginTraceFilterManagementBehavior.ts:252`
- ❌ `src/features/pluginTraceViewer/presentation/behaviors/PluginTraceDetailPanelBehavior.ts:198`

**Action Required**:
- Update `PanelState` interface with index signature: `[key: string]: unknown;`
- OR create typed helper function: `buildPanelState(...)`
- Remove `as any` casts

**Impact**: Type safety bypassed, potential runtime errors

---

### ✅ ❌ ⏳ [MEDIUM-4] CSP Allows 'unsafe-inline' for Styles
**Status**: ⏳ Pending
**Agent**: Security
**Severity**: Medium
**Estimated Effort**: 1 day

**Affected File**:
- ❌ `src/shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior.ts:70`

**Action Required**:
- Move all inline styles to external CSS files
- OR use nonce-based styles with `<style nonce="${cspNonce}">`
- Remove 'unsafe-inline' from CSP

**Impact**: Weakened CSP, potential style injection

---

### ✅ ❌ ⏳ [MEDIUM-5] Token Preview in Authentication Logs
**Status**: ⏳ Pending
**Agent**: Security
**Severity**: Medium
**Estimated Effort**: 30 minutes

**Affected File**:
- ❌ `src/features/environmentSetup/infrastructure/services/MsalAuthenticationService.ts:124`

**Action Required**:
- Remove `tokenPreview: token.substring(0, 10) + '...'`
- Replace with safe metadata: `tokenLength: token.length`

**Impact**: Sensitive data in logs

---

### ✅ ❌ ⏳ [MEDIUM-6] innerHTML Usage in Static HTML
**Status**: ⏳ Pending
**Agent**: Security
**Severity**: Medium
**Estimated Effort**: 30 minutes

**Affected File**:
- ❌ `src/features/metadataBrowser/presentation/views/MetadataBrowserView.html:25`

**Action Required**:
- Replace innerHTML with textContent for numeric data
- OR use DOM manipulation: `document.createElement('h2')`

**Impact**: Potential XSS if data ever becomes user-controlled

---

### ✅ ❌ ⏳ [MEDIUM-7] through [MEDIUM-29]: Various Medium Issues
**Status**: ⏳ Pending

**Summary**:
- Large panel files (600-800 lines) - Acceptable with coordinator pattern
- DateTimeFilter technical debt - Formatting methods in domain (documented)
- TODO/FIXME comments - All tracked in TECHNICAL_DEBT.md
- Panel disposal patterns - Needs documentation review
- Missing singleton pattern docs in EnvironmentScopedPanel
- Extension subscription clarity - Needs comment
- Missing integration tests for new features
- Edge case coverage varies
- No tests for domain events
- ViewModels with logic need tests
- Presentation layer has minimal coverage
- Infrastructure utilities may lack tests
- Repository query options not exhaustively tested
- No performance tests

**Total Medium Priority Issues**: 29 (detailed in individual agent reports)

---

## Low Priority Issues (Continuous Improvement) - 18 Total

### ✅ ❌ ⏳ [LOW-1] Console.log in Test Files
**Status**: ⏳ Pending
**Agents**: Code Quality, Test Quality, Pattern Compliance (3 agents)
**Severity**: Low
**Estimated Effort**: 15 minutes

**Affected File**:
- ❌ `src/shared/infrastructure/ui/behaviors/HtmlRenderingBehavior.test.ts`

**Action Required**:
- Remove console.log statement from test file

**Impact**: Test output pollution

---

### ✅ ❌ ⏳ [LOW-2] Non-Null Assertions in Test Files
**Status**: ⏳ Pending
**Agents**: Architecture, Code Quality, Pattern Compliance (3 agents)
**Severity**: Low
**Estimated Effort**: 2 hours

**Description**: Extensive use of `!` in test files (acceptable but could be better)

**Affected Files** (sample):
- `src/features/environmentSetup/infrastructure/repositories/EnvironmentRepository.test.ts`
- `src/features/connectionReferences/domain/services/FlowConnectionRelationshipBuilder.test.ts`
- `src/features/metadataBrowser/infrastructure/repositories/__tests__/DataverseEntityMetadataRepository.optionsets.test.ts`

**Action Required**:
- Consider replacing with explicit null checks in future refactoring
- Create helper: `function assertDefined<T>(value: T | undefined): asserts value is T`

**Impact**: Minor - acceptable in test code

---

### ✅ ❌ ⏳ [LOW-3] through [LOW-18]: Various Low Issues
**Status**: ⏳ Pending

**Summary**:
- ESLint disable comments (all justified - continue documenting)
- Static factory methods in domain (documented exception - acceptable)
- OData query building in domain (design decision - documented)
- Type guard validation could be enhanced
- Mock type casting pattern (acceptable but could be cleaner)
- Factory pattern not used consistently
- Parameterized testing opportunities
- expect.any() could be more specific
- Password presence logging
- Hardcoded OAuth port (3000)
- Test file organization inconsistent
- Test naming conventions vary
- Missing test utilities for complex objects
- Minor commented code in production files
- Type assertions in test mocks

**Total Low Priority Issues**: 18 (detailed in individual agent reports)

---

## Overall Progress

| Category | Total Issues | Completed | Remaining | % Complete |
|----------|-------------|-----------|-----------|------------|
| **Critical** | 3 | 0 | 3 | 0% |
| **High Priority** | 20 | 0 | 20 | 0% |
| **Medium Priority** | 29 | 0 | 29 | 0% |
| **Low Priority** | 18 | 0 | 18 | 0% |
| **TOTAL** | **70** | **0** | **70** | **0%** |

---

## Next Steps (Prioritized)

### This Week (Critical - Production Blockers)
1. ⏳ Fix escapeHtml duplication (2 hours)
2. ⏳ Create tests for StorageEntry & StorageCollection (1 day)
3. ⏳ Create tests for DeleteEnvironmentUseCase (4 hours)
4. ⏳ Create tests for ClearAllStorageUseCase (4 hours)

### Week 1 (Critical - Mappers)
5. ⏳ Create tests for all 20 mappers (5 days)
   - Day 1-2: Deployment settings mappers (2)
   - Day 3-5: ViewModel mappers (15)
   - Day 5: Storage mappers (3)

### Week 2 (High - Use Cases & Services)
6. ⏳ Move presentation sorting to presentation layer (1 day)
7. ⏳ Create tests for 6 collection services (2 days)
8. ⏳ Create tests for EnvironmentVariable & ConnectionReference (1 day)
9. ⏳ Create tests for DeploymentSettings (1 day)

### Week 3 (High - Remaining Use Cases)
10. ⏳ Create tests for export use cases (1 day)
11. ⏳ Create tests for list use cases (1 day)
12. ⏳ Create tests for validation/query use cases (3 days)

### Week 4 (High - Value Objects)
13. ⏳ Create tests for 17 value objects (5 days)

### Week 5 (High - Refactoring)
14. ⏳ Refactor extension.ts (2 days)
15. ⏳ Split DataverseEntityMetadataRepository (2 days)
16. ⏳ Document panel pattern exceptions (2 hours)

### Ongoing (Medium & Low)
17. ⏳ Address medium-priority issues as time permits
18. ⏳ Clean up low-priority issues during maintenance

---

## Timeline to Production

**Current State**: 8.4/10 (Needs Work)
**Target State**: 9.5/10 (Production Ready)

**Critical Path** (2 weeks):
- Week 1: Critical fixes + all mapper tests
- Week 2: High-priority use case tests + entity tests

**Production Release Date**: **2 weeks from code review completion**

**Post-Production**: Continue with test coverage improvements and refactoring in subsequent sprints

---

## Notes

- All issues from previous review (archive/2025-11-21/) have been addressed
- This is a fresh, unbiased review with no knowledge of previous findings
- Agents detected excellent architectural quality and strong domain modeling
- Primary gaps are in test coverage (mappers, use cases, value objects)
- Code duplication (`escapeHtml`) is only critical code quality issue
- Type safety is exceptional (9.8/10) - world-class practices
- Security is excellent (9/10) - industry-standard patterns

---

## Key Files for Reference

- **Agent Reports**: `.review/results/01-08_*.md` (8 detailed reports)
- **Summary**: `.review/SUMMARY.md` (this review aggregated)
- **Architecture Guide**: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- **Testing Guide**: `docs/testing/TESTING_GUIDE.md`
- **Technical Debt**: `TECHNICAL_DEBT.md` (tracked TODOs)

---

**Last Updated**: November 21, 2025
**Next Review**: After critical issues resolved (2 weeks)
