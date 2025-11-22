# Code Review Implementation Plan - Complete Cleanup Checklist

**Created**: November 21, 2025
**Status**: Not Started
**Target Completion**: 6 weeks
**Overall Progress**: 0/70 issues + 0/2 cleanup passes = 0%

---

## Table of Contents

1. [Phase 1: Critical Issues (Week 1)](#phase-1-critical-issues-week-1)
2. [Phase 2: High Priority Issues (Weeks 2-4)](#phase-2-high-priority-issues-weeks-2-4)
3. [Phase 3: Medium Priority Issues (Week 5)](#phase-3-medium-priority-issues-week-5)
4. [Phase 4: Low Priority Issues (Week 6)](#phase-4-low-priority-issues-week-6)
5. [Phase 5: Comment Cleanup Pass (Week 6)](#phase-5-comment-cleanup-pass-week-6)
6. [Phase 6: Logging Review Pass (Week 6)](#phase-6-logging-review-pass-week-6)
7. [Verification & Sign-off](#verification--sign-off)

---

## Phase 1: Critical Issues (Week 1)

**Target**: Production blockers resolved
**Estimated Effort**: 5 days
**Progress**: 0/3 complete

### Day 1 - Code Duplication Fix

#### ✅ CRITICAL-1: Consolidate escapeHtml Duplication (2 hours)

**Files to Update** (7 total):
- ✅ `src/shared/infrastructure/ui/views/htmlHelpers.ts:11`
  - ✅ Add import: `import { escapeHtml } from '../../../infrastructure/ui/utils/HtmlUtils';`
  - ✅ Remove local `escapeHtml` function
  - ✅ Verify all references updated

- ✅ `src/shared/infrastructure/ui/views/dataTable.ts:520`
  - ✅ Add import: `import { escapeHtml } from '../../../infrastructure/ui/utils/HtmlUtils';`
  - ✅ Remove local `escapeHtml` function (in JavaScript template) - **NOTE: Kept for browser context**
  - ✅ Verify all references updated

- ✅ `src/shared/infrastructure/ui/sections/ResizableDetailPanelSection.ts:196`
  - ✅ Add import: `import { escapeHtml } from '../../../infrastructure/ui/utils/HtmlUtils';`
  - ✅ Remove local `escapeHtml` function
  - ✅ Verify all references updated

- ✅ `src/features/importJobViewer/application/mappers/ImportJobViewModelMapper.ts:58`
  - ✅ Add import: `import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';`
  - ✅ Remove local `escapeHtml` function
  - ✅ Verify all references updated

- ✅ `src/shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior.ts:86`
  - ✅ Add import: `import { escapeHtml } from '../../../infrastructure/ui/utils/HtmlUtils';`
  - ✅ Remove local `escapeHtml` function
  - ✅ Verify all references updated

- ✅ `src/features/solutionExplorer/application/mappers/SolutionViewModelMapper.ts:40`
  - ✅ Add import: `import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';`
  - ✅ Remove local `escapeHtml` function
  - ✅ Verify all references updated

- ✅ `src/features/pluginTraceViewer/presentation/sections/FilterPanelSection.ts:305`
  - ✅ Add import: `import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';`
  - ✅ Remove local `escapeHtml` function
  - ✅ Verify all references updated

**Verification**:
- ✅ Run: `npm run compile` (must pass with zero errors) - **Passes with pre-existing warnings**
- ✅ Search: `grep -r "function escapeHtml" src/` (should only find HtmlUtils.ts) - **Verified**
- ✅ Search: `grep -r "escapeHtml.*=.*function" src/` (should find zero) - **Verified**
- ☐ Manual test: Open each affected panel and verify HTML rendering works
- ☐ Commit: "fix: consolidate escapeHtml to single implementation"

---

### Day 2 - Critical Domain Entity Tests

#### ☐ CRITICAL-3a: StorageEntry Entity Tests (4 hours)

**Create**: `src/features/persistenceInspector/domain/entities/StorageEntry.test.ts`

**Test Coverage Checklist**:
- ☐ Factory method tests
  - ☐ `create()` with different storage types (GLOBAL, WORKSPACE, SECRET)
  - ☐ `create()` with secret value handling
  - ☐ `create()` with complex nested objects

- ☐ `isProtected()` tests
  - ☐ Returns true for 'power-platform-dev-suite-environments'
  - ☐ Returns true for 'power-platform-dev-suite-secret-*' pattern
  - ☐ Returns true for 'power-platform-dev-suite-password-*' pattern
  - ☐ Returns false for non-protected keys
  - ☐ Edge cases: empty key, null key

- ☐ `canBeCleared()` tests
  - ☐ Returns false for protected entries
  - ☐ Returns true for non-protected entries
  - ☐ SECRET storage type cannot be cleared

- ☐ `getPropertyAtPath()` tests
  - ☐ Navigate nested object properties (2-3 levels deep)
  - ☐ Navigate arrays with indices
  - ☐ Return undefined for missing paths
  - ☐ Handle null intermediate objects
  - ☐ Handle undefined intermediate objects
  - ☐ Handle primitive values (not objects)
  - ☐ Edge case: empty path array
  - ☐ Edge case: path to root

- ☐ `hasProperty()` tests
  - ☐ Returns true for existing property
  - ☐ Returns false for missing property
  - ☐ Handles nested paths
  - ☐ Handles array indices

**Verification**:
- ☐ Run: `npm test -- StorageEntry.test.ts` (all tests pass)
- ☐ Coverage should include all public methods
- ☐ Edge cases covered (null, undefined, empty)
- ☐ Commit: "test: add comprehensive StorageEntry tests"

---

#### ☐ CRITICAL-3b: StorageCollection Entity Tests (4 hours)

**Create**: `src/features/persistenceInspector/domain/entities/StorageCollection.test.ts`

**Test Coverage Checklist**:
- ☐ Factory method tests
  - ☐ `create()` with protected patterns
  - ☐ `create()` with empty entries
  - ☐ `create()` with mixed protected/non-protected entries

- ☐ `validateClearOperation()` tests
  - ☐ **CRITICAL**: Prevents deletion of protected keys
  - ☐ Allows deletion of non-protected keys
  - ☐ Returns validation result with correct status
  - ☐ Returns error message for protected keys
  - ☐ Edge case: key not found
  - ☐ Edge case: null/undefined key

- ☐ `validateClearAllOperation()` tests
  - ☐ **CRITICAL**: Counts protected vs clearable entries correctly
  - ☐ Prevents clearing if all entries are protected
  - ☐ Allows clearing if some entries are clearable
  - ☐ Returns accurate counts (clearable, protected, total)
  - ☐ Edge case: empty collection
  - ☐ Edge case: all protected
  - ☐ Edge case: all clearable

- ☐ `isKeyProtected()` tests
  - ☐ Regex pattern matching for protected keys
  - ☐ Exact match for 'power-platform-dev-suite-environments'
  - ☐ Pattern match for 'power-platform-dev-suite-secret-*'
  - ☐ Pattern match for 'power-platform-dev-suite-password-*'
  - ☐ Returns false for non-protected keys
  - ☐ Edge cases: special characters, wildcards

- ☐ `getClearableEntries()` tests
  - ☐ Filters out protected entries
  - ☐ Returns only clearable entries
  - ☐ Returns empty array if all protected

- ☐ `getProtectedEntries()` tests
  - ☐ Filters out clearable entries
  - ☐ Returns only protected entries
  - ☐ Returns empty array if none protected

- ☐ `getTotalSize()` tests
  - ☐ Calculates total size correctly
  - ☐ Sums sizes across all entries
  - ☐ Returns 0 for empty collection

**Verification**:
- ☐ Run: `npm test -- StorageCollection.test.ts` (all tests pass)
- ☐ Run: `npm test -- persistenceInspector` (all persistence tests pass)
- ☐ **MANUAL TEST**: Open Persistence Inspector panel, verify protected keys cannot be cleared
- ☐ Commit: "test: add comprehensive StorageCollection tests"

---

### Days 3-4 - Critical Use Case Tests

#### ☐ HIGH-5a: DeleteEnvironmentUseCase Tests (4 hours)

**Create**: `src/features/environmentSetup/application/useCases/DeleteEnvironmentUseCase.test.ts`

**Test Coverage Checklist**:
- ☐ Successful deletion flow
  - ☐ Calls repository.delete() with correct environment ID
  - ☐ Publishes EnvironmentDeleted event
  - ☐ Logs start, success, and completion
  - ☐ Returns success result

- ☐ Secret cleanup
  - ☐ **CRITICAL**: Retrieves environment before deletion
  - ☐ **CRITICAL**: Calls secret storage to delete clientSecret if exists
  - ☐ **CRITICAL**: Calls secret storage to delete password if exists
  - ☐ **CRITICAL**: Handles missing secrets gracefully
  - ☐ **CRITICAL**: Cleans up orphaned secret keys

- ☐ Error handling
  - ☐ Logs error if repository.delete() fails
  - ☐ Logs error if secret cleanup fails
  - ☐ Returns error result
  - ☐ Does not publish event if deletion fails

- ☐ Edge cases
  - ☐ Environment not found
  - ☐ Environment with no secrets
  - ☐ Partial secret cleanup failure

**Verification**:
- ☐ Run: `npm test -- DeleteEnvironmentUseCase.test.ts` (all tests pass)
- ☐ Verify mock logger called with expected messages
- ☐ Verify event publisher called with EnvironmentDeleted
- ☐ Commit: "test: add DeleteEnvironmentUseCase tests"

---

#### ☐ HIGH-5b: ClearAllStorageUseCase Tests (4 hours)

**Create**: `src/features/persistenceInspector/application/useCases/ClearAllStorageUseCase.test.ts`

**Test Coverage Checklist**:
- ☐ Successful clear all flow
  - ☐ Calls storage clearing service with correct parameters
  - ☐ Publishes StorageClearedAll event
  - ☐ Logs start, success, and completion
  - ☐ Returns result with counts

- ☐ Validation
  - ☐ **CRITICAL**: Validates clear all operation via StorageCollection
  - ☐ **CRITICAL**: Prevents clearing if all entries protected
  - ☐ Returns validation errors if operation not allowed

- ☐ Partial clearing
  - ☐ Clears only clearable entries
  - ☐ Skips protected entries
  - ☐ Returns accurate counts (cleared, protected, total)

- ☐ Error handling
  - ☐ Logs error if clearing fails
  - ☐ Returns error result
  - ☐ Does not publish event if clearing fails

- ☐ Edge cases
  - ☐ Empty storage
  - ☐ All entries protected
  - ☐ No entries protected

**Verification**:
- ☐ Run: `npm test -- ClearAllStorageUseCase.test.ts` (all tests pass)
- ☐ Verify protected entries are NOT cleared
- ☐ Verify event published with correct counts
- ☐ Commit: "test: add ClearAllStorageUseCase tests"

---

### Day 5 - Mapper Tests (Start of 20)

#### ☐ CRITICAL-2: Deployment Settings Mappers (Day 5, 6 hours)

**Priority 1 - Affects File Exports**:

##### ☐ EnvironmentVariableToDeploymentSettingsMapper.test.ts

**Create**: `src/features/environmentVariables/application/mappers/EnvironmentVariableToDeploymentSettingsMapper.test.ts`

**Test Coverage**:
- ☐ Maps all properties correctly
  - ☐ schemaName
  - ☐ type
  - ☐ value (current value)
  - ☐ defaultValue (if no current value)

- ☐ Handles null/undefined values
  - ☐ currentValue is null → uses defaultValue
  - ☐ defaultValue is null → uses empty string
  - ☐ Both null → uses empty string

- ☐ Handles different types
  - ☐ String type
  - ☐ Number type
  - ☐ Boolean type
  - ☐ Secret type (should NOT export value)

- ☐ Edge cases
  - ☐ Empty schemaName
  - ☐ Very long values
  - ☐ Special characters in values

**Verification**:
- ☐ Run: `npm test -- EnvironmentVariableToDeploymentSettingsMapper.test.ts`
- ☐ Create test file, verify exported JSON structure
- ☐ Commit: "test: add EnvironmentVariableToDeploymentSettingsMapper tests"

---

##### ☐ ConnectionReferenceToDeploymentSettingsMapper.test.ts

**Create**: `src/features/connectionReferences/application/mappers/ConnectionReferenceToDeploymentSettingsMapper.test.ts`

**Test Coverage**:
- ☐ Maps all properties correctly
  - ☐ logicalName
  - ☐ connectionReferenceLogicalName
  - ☐ connectorId
  - ☐ (any other deployment settings properties)

- ☐ Handles null/undefined values
- ☐ Edge cases
  - ☐ Empty logicalName
  - ☐ Missing connector info

**Verification**:
- ☐ Run: `npm test -- ConnectionReferenceToDeploymentSettingsMapper.test.ts`
- ☐ Create test file, verify exported JSON structure
- ☐ Commit: "test: add ConnectionReferenceToDeploymentSettingsMapper tests"

---

### Week 1 End Checkpoint

**Before proceeding to Week 2**:
- ☐ All Critical issues resolved (3/3)
- ☐ Run: `npm run compile` (zero errors)
- ☐ Run: `npm test` (all tests pass)
- ☐ Manual test: Persistence Inspector (protected keys work)
- ☐ Manual test: Environment Setup (delete environment cleans up secrets)
- ☐ Manual test: Export deployment settings (files export correctly)
- ☐ Git status clean (all changes committed)

---

## Phase 2: High Priority Issues (Weeks 2-4)

**Target**: Architecture violations fixed, all tests created
**Estimated Effort**: 15 days
**Progress**: 0/20 complete

### Week 2, Days 1-3 - Remaining Mapper Tests (18 mappers)

#### ☐ ViewModel Mappers - Environment Setup (3 mappers, Day 1)

##### ☐ EnvironmentFormViewModelMapper.test.ts (2 hours)

**Test Coverage**:
- ☐ Maps all environment properties
- ☐ Maps credential flags (hasStoredClientSecret, hasStoredPassword)
- ☐ Handles optional fields (clientId, tenantId)
- ☐ Handles authentication methods
- ☐ Edge cases: null values, empty strings

**Files**: `src/features/environmentSetup/application/mappers/EnvironmentFormViewModelMapper.test.ts`

---

##### ☐ EnvironmentListViewModelMapper.test.ts (2 hours)

**Test Coverage**:
- ☐ Maps collection of environments
- ☐ Maps individual environment properties
- ☐ Preserves order
- ☐ Handles empty array
- ☐ Edge cases

**Files**: `src/features/environmentSetup/application/mappers/EnvironmentListViewModelMapper.test.ts`

---

#### ☐ ViewModel Mappers - Other Features (11 mappers, Days 2-3)

##### ☐ EnvironmentVariableViewModelMapper.test.ts (1.5 hours)
##### ☐ FlowConnectionRelationshipViewModelMapper.test.ts (2 hours)
##### ☐ SolutionViewModelMapper.test.ts (1.5 hours)
##### ☐ ImportJobViewModelMapper.test.ts (1.5 hours)
##### ☐ EntityAttributeMapper.test.ts (2 hours)
##### ☐ EntityTreeItemMapper.test.ts (2 hours)
##### ☐ ChoiceTreeItemMapper.test.ts (1.5 hours)
##### ☐ AttributeRowMapper.test.ts (1 hour)
##### ☐ RelationshipRowMapper.test.ts (1 hour)
##### ☐ KeyRowMapper.test.ts (1 hour)
##### ☐ PrivilegeRowMapper.test.ts (1 hour)
##### ☐ ChoiceValueRowMapper.test.ts (1 hour)

**For each mapper**:
- ☐ Test all property mappings
- ☐ Test null/undefined handling
- ☐ Test edge cases
- ☐ Verify ViewModel structure matches expected

---

#### ☐ Storage Mappers (4 mappers, Day 4)

##### ☐ StorageEntryMapper.test.ts (1.5 hours)
##### ☐ StorageCollectionMapper.test.ts (1.5 hours)
##### ☐ StorageMetadataMapper.test.ts (1.5 hours)
##### ☐ ClearAllResultMapper.test.ts (1 hour)

**Verification for all mappers**:
- ☐ Run: `npm test` (all mapper tests pass)
- ☐ Commit: "test: add all ViewModel and storage mapper tests (18 files)"

---

### Week 2, Day 5 - Architecture Fix

#### ☐ HIGH-1: Move Presentation Sorting to Presentation Layer (1 day)

**Affected Files**:

##### ☐ LoadEntityMetadataUseCase.ts

**Changes**:
- ☐ Remove 5 private sort methods:
  - ☐ `sortAttributes()`
  - ☐ `sortOneToManyRelationships()`
  - ☐ `sortManyToOneRelationships()`
  - ☐ `sortManyToManyRelationships()`
  - ☐ `sortKeys()`
  - ☐ `sortPrivileges()`
- ☐ Return unsorted domain entities
- ☐ Update tests to verify unsorted results

##### ☐ LoadChoiceMetadataUseCase.ts

**Changes**:
- ☐ Remove `sortChoiceValues()` method
- ☐ Return unsorted choice values
- ☐ Update tests

##### ☐ LoadMetadataTreeUseCase.ts

**Changes**:
- ☐ Remove entity sorting
- ☐ Remove choice sorting
- ☐ Return unsorted collections
- ☐ Update tests

##### ☐ Create/Update Mappers or Presentation Services

**Option 1 - Update Existing Mappers**:
- ☐ Update EntityMetadataMapper to accept `shouldSort` parameter
- ☐ Delegate to domain collection service for sorting
- ☐ Update ChoiceMetadataMapper similarly

**Option 2 - Create Presentation Services**:
- ☐ Create `src/features/metadataBrowser/presentation/services/MetadataSortingService.ts`
- ☐ Implement sorting logic there
- ☐ Call from panels before rendering

##### ☐ Update Panels

- ☐ MetadataBrowserPanel: Call mapper with `shouldSort: true`
- ☐ Verify UI still shows sorted results

**Verification**:
- ☐ Run: `npm run compile` (zero errors)
- ☐ Run: `npm test` (all tests pass)
- ☐ Manual test: MetadataBrowser panel shows entities/choices sorted correctly
- ☐ Verify use cases no longer have sorting logic
- ☐ Commit: "refactor: move presentation sorting from use cases to presentation layer"

---

### Week 3 - Collection Services & Entity Tests

#### ☐ HIGH-4: Domain Collection Service Tests (2 days)

##### ☐ SolutionCollectionService.test.ts (3 hours)

**Test Coverage**:
- ☐ Sorts Default solution first
- ☐ Sorts non-Default solutions alphabetically by friendlyName
- ☐ Handles empty array
- ☐ Handles single solution
- ☐ Handles identical names
- ☐ Defensive copy (original array unchanged)

---

##### ☐ EnvironmentVariableCollectionService.test.ts (2 hours)

**Test Coverage**:
- ☐ Sorts alphabetically by schemaName
- ☐ Handles empty array
- ☐ Defensive copy

---

##### ☐ CloudFlowCollectionService.test.ts (2 hours)

**Test Coverage**:
- ☐ Sorts alphabetically by name
- ☐ Handles empty array
- ☐ Defensive copy

---

##### ☐ ConnectionReferenceCollectionService.test.ts (2 hours)

**Test Coverage**:
- ☐ Sorts alphabetically by logical name
- ☐ Handles empty array
- ☐ Defensive copy

---

##### ☐ ImportJobCollectionService.test.ts (4 hours - complex)

**Test Coverage**:
- ☐ Sorts in-progress jobs first (by getSortPriority)
- ☐ Within same priority, sorts by creation date (most recent first)
- ☐ Handles all job statuses correctly
- ☐ Handles empty array
- ☐ Defensive copy
- ☐ Edge case: jobs with same priority and date

---

##### ☐ FlowConnectionRelationshipCollectionService.test.ts (2 hours)

**Test Coverage**:
- ☐ Sorts by flow name first
- ☐ Then by connection reference name
- ☐ Handles empty array
- ☐ Defensive copy

**Verification**:
- ☐ Run: `npm test` (all collection service tests pass)
- ☐ Manual test: Open each panel, verify sorting is correct
- ☐ Commit: "test: add all domain collection service tests (6 files)"

---

#### ☐ HIGH-17, HIGH-18, HIGH-19: Entity Tests (3 days)

##### ☐ EnvironmentVariable.test.ts (4 hours)

**Test Coverage**:
- ☐ Constructor type validation
- ☐ `getEffectiveValue()` - current ?? default
- ☐ `hasValue()` - any value set
- ☐ `hasOverride()` - environment-specific overrides
- ☐ `isSecret()` - secret type identification
- ☐ `isInSolution()` - solution membership
- ☐ Edge cases: null values, all types

**Files**: `src/features/environmentVariables/domain/entities/EnvironmentVariable.test.ts`

---

##### ☐ ConnectionReference.test.ts (4 hours)

**First**:
- ☐ Review `src/features/connectionReferences/domain/entities/ConnectionReference.ts` for business logic

**Then create tests for**:
- ☐ All business logic methods found
- ☐ Constructor validation
- ☐ Edge cases

**Files**: `src/features/connectionReferences/domain/entities/ConnectionReference.test.ts`

---

##### ☐ DeploymentSettings.test.ts (1 day)

**Test Coverage**:
- ☐ `syncEnvironmentVariables()` tests
  - ☐ Add new entries
  - ☐ Remove missing entries
  - ☐ Preserve existing entries
  - ☐ Alphabetical sorting maintained
  - ☐ Edge case: empty array
  - ☐ Edge case: all new entries
  - ☐ Edge case: all removed
  - ☐ Edge case: partial overlap

- ☐ `syncConnectionReferences()` tests
  - ☐ Same coverage as above

- ☐ Generic `syncEntries()` tests (if accessible)
  - ☐ Algorithm correctness
  - ☐ Edge cases

**Files**: `src/shared/domain/entities/DeploymentSettings.test.ts`

**Verification**:
- ☐ Run: `npm test` (all entity tests pass)
- ☐ Commit: "test: add EnvironmentVariable, ConnectionReference, and DeploymentSettings tests"

---

### Week 4 - Use Case Tests (12 use cases)

#### ☐ HIGH-5: Remaining Use Case Tests (5 days)

**Priority 2 - File Export Use Cases** (Day 1):

##### ☐ ExportEnvironmentVariablesToDeploymentSettingsUseCase.test.ts (3 hours)

**Test Coverage**:
- ☐ Successful export flow
- ☐ Calls repository to get environment variables
- ☐ Calls mapper to convert to deployment settings
- ☐ Calls file service to write JSON
- ☐ Logs start, success, completion
- ☐ Error handling
- ☐ Empty environment variables

---

##### ☐ ExportConnectionReferencesToDeploymentSettingsUseCase.test.ts (3 hours)

**Test Coverage**:
- ☐ Same as above for connection references

---

**Priority 3 - Complex Orchestration Use Cases** (Day 2):

##### ☐ ListEnvironmentVariablesUseCase.test.ts (3 hours)

**Test Coverage**:
- ☐ Calls repository to get environment variables
- ☐ Calls factory to create environment variables
- ☐ Applies filtering if requested
- ☐ Returns filtered results
- ☐ Logs at boundaries
- ☐ Error handling

---

##### ☐ ListConnectionReferencesUseCase.test.ts (4 hours)

**Test Coverage**:
- ☐ Calls repositories to get connection references and flows
- ☐ Calls FlowConnectionRelationshipBuilder to build relationships
- ☐ Returns relationships
- ☐ Logs at boundaries
- ☐ Error handling
- ☐ Edge case: no flows

---

**Priority 4 - Validation/Query Use Cases** (Days 3-5):

##### ☐ CheckConcurrentEditUseCase.test.ts (2 hours)
##### ☐ ValidateUniqueNameUseCase.test.ts (2 hours)
##### ☐ LoadEnvironmentByIdUseCase.test.ts (2 hours)
##### ☐ TestExistingEnvironmentConnectionUseCase.test.ts (3 hours)
##### ☐ GetClearAllConfirmationMessageUseCase.test.ts (2 hours)
##### ☐ OpenImportLogUseCase.test.ts (2 hours)

**For each use case**:
- ☐ Test successful flow
- ☐ Test orchestration logic
- ☐ Test logging at boundaries
- ☐ Test error handling
- ☐ Test edge cases

**Verification**:
- ☐ Run: `npm test` (all use case tests pass)
- ☐ Run: `npm run compile` (zero errors)
- ☐ Commit: "test: add remaining 12 use case tests"

---

## Phase 3: Medium Priority Issues (Week 5)

**Target**: Architecture consistency, security hardening
**Estimated Effort**: 5 days
**Progress**: 0/29 complete

### Week 5, Day 1 - Quick Security Fixes (Morning)

#### ☐ MEDIUM-5: Remove Token Preview from Logs (30 minutes)

**File**: `src/features/environmentSetup/infrastructure/services/MsalAuthenticationService.ts:124`

**Changes**:
- ☐ Remove line: `tokenPreview: token.substring(0, 10) + '...'`
- ☐ Add line: `tokenLength: token.length`
- ☐ Update log message if needed

**Verification**:
- ☐ Search codebase for any other token logging
- ☐ Run: `npm run compile`
- ☐ Manual test: Authenticate, check logs don't contain token preview
- ☐ Commit: "security: remove token preview from authentication logs"

---

#### ☐ MEDIUM-6: Replace innerHTML with textContent (30 minutes)

**File**: `src/features/metadataBrowser/presentation/views/MetadataBrowserView.html:25`

**Changes**:
- ☐ Replace innerHTML with textContent or DOM manipulation:
  ```javascript
  // Current
  content.innerHTML = '<h2>Entities: ' + message.data.entities.length + '</h2>';

  // Recommended
  const entitiesHeading = document.createElement('h2');
  entitiesHeading.textContent = `Entities: ${message.data.entities.length}`;
  const choicesHeading = document.createElement('h2');
  choicesHeading.textContent = `Choices: ${message.data.choices.length}`;
  content.replaceChildren(entitiesHeading, choicesHeading);
  ```

**Verification**:
- ☐ Search codebase for other innerHTML usage: `grep -r "\.innerHTML\s*=" src/`
- ☐ Manual test: MetadataBrowser panel still displays counts correctly
- ☐ Commit: "security: replace innerHTML with textContent"

---

### Week 5, Day 1 - Value Object Tests (Afternoon, 3-4 hours)

#### ☐ HIGH-20: Start Value Object Tests (17 total)

**MetadataBrowser Feature (7 files)**:

##### ☐ AttributeType.test.ts (30 min)
##### ☐ OptionSetMetadata.test.ts (45 min)
##### ☐ LogicalName.test.ts (30 min)
##### ☐ SchemaName.test.ts (30 min)
##### ☐ CascadeConfiguration.test.ts (45 min)
##### ☐ (2 others - identify and test)

**For each**:
- ☐ Test validation logic
- ☐ Test value object creation
- ☐ Test immutability
- ☐ Test edge cases

---

### Week 5, Days 2-3 - Value Object Tests (PersistenceInspector)

**PersistenceInspector Feature (10 files)**:

##### ☐ StorageKey.test.ts (1 hour)

**Test Coverage**:
- ☐ Key validation
- ☐ Protected key pattern detection
- ☐ Edge cases

---

##### ☐ ProtectedKeyPattern.test.ts (2 hours - CRITICAL)

**Test Coverage**:
- ☐ Regex pattern matching
- ☐ Matches 'power-platform-dev-suite-environments' exactly
- ☐ Matches 'power-platform-dev-suite-secret-*' pattern
- ☐ Matches 'power-platform-dev-suite-password-*' pattern
- ☐ Does not match non-protected keys
- ☐ Edge cases: special characters, edge patterns

---

##### ☐ StorageValue.test.ts (1 hour)
##### ☐ StorageType.test.ts (30 min)
##### ☐ StorageMetadata.test.ts (1 hour)
##### ☐ PropertyPath.test.ts (1 hour)
##### ☐ DataType.test.ts (45 min)
##### ☐ ClearValidationResult.test.ts (45 min)
##### ☐ ClearAllValidationResult.test.ts (45 min)
##### ☐ (1 other - identify and test)

**Verification**:
- ☐ Run: `npm test` (all value object tests pass)
- ☐ Commit: "test: add all value object tests (17 files)"

---

### Week 5, Day 4 - Pattern & Architecture Fixes

#### ☐ MEDIUM-1: Standardize Mapper Sorting Patterns (4 hours)

**Affected Files**:

##### ☐ Update SolutionViewModelMapper

- ☐ Ensure `toViewModels(solutions, shouldSort)` pattern exists
- ☐ Delegates to `SolutionCollectionService.sort()` when `shouldSort = true`
- ☐ Document pattern in JSDoc

---

##### ☐ Update EnvironmentVariableViewModelMapper

- ☐ Same pattern as above
- ☐ Delegates to `EnvironmentVariableCollectionService.sort()`

---

##### ☐ Update All Other Mappers

- ☐ Review all mappers that transform collections
- ☐ Add `shouldSort` parameter where applicable
- ☐ Delegate to domain collection services

---

##### ☐ Update Panels

**Files**:
- ☐ `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts:125,266`
  - ☐ Remove direct ViewModel sorting
  - ☐ Use: `this.viewModelMapper.toViewModels(solutions, true)`

- ☐ `src/features/environmentVariables/presentation/panels/EnvironmentVariablesPanelComposed.ts:161,320`
  - ☐ Remove direct ViewModel sorting
  - ☐ Use: `this.viewModelMapper.toViewModels(envVars, true)`

**Verification**:
- ☐ Search for direct ViewModel sorting: `grep -r "\.sort.*ViewModel" src/features/*/presentation/panels/`
- ☐ Should find zero results
- ☐ Run: `npm run compile`
- ☐ Manual test: All panels still show sorted results
- ☐ Commit: "refactor: standardize mapper sorting patterns"

---

#### ☐ MEDIUM-2: Document Panel Pattern Exceptions (2 hours)

**File 1**: `src/features/persistenceInspector/presentation/panels/PersistenceInspectorPanelComposed.ts:79`

**Add JSDoc**:
```typescript
/**
 * Presentation layer panel for Persistence Inspector.
 *
 * NOTE: This panel does NOT extend EnvironmentScopedPanel because it's a
 * development-only tool that operates on VS Code storage globally, not
 * scoped to a specific environment. It inspects all storage (global, workspace,
 * and secrets) across the entire extension.
 *
 * Pattern: Uses private static currentPanel for singleton management.
 */
```

---

**File 2**: `src/features/environmentSetup/presentation/panels/EnvironmentSetupPanelComposed.ts:41`

**Changes**:
- ☐ Change `public static currentPanels` to `private static panels`
- ☐ Add JSDoc:
  ```typescript
  /**
   * Environment Setup Panel.
   *
   * NOTE: This panel does NOT extend EnvironmentScopedPanel because it has unique
   * requirements: it allows one panel for "new" environment creation plus one panel
   * per existing environment being edited. The base class is optimized for one
   * panel per environment ID only.
   *
   * Pattern: Uses private static Map<string, Panel> where key is environmentId || 'new'.
   */
  private static panels: Map<string, EnvironmentSetupPanelComposed> = new Map();
  ```

**Verification**:
- ☐ Run: `npm run compile`
- ☐ Search for `public static currentPanels` - should find zero
- ☐ Commit: "docs: document panel pattern exceptions and fix visibility"

---

#### ☐ MEDIUM-3: Fix PanelState Type Assertions (4 hours)

**Option 1 - Update Interface** (Recommended):

**File**: `src/shared/infrastructure/ui/panels/PanelState.ts` (or wherever defined)

**Changes**:
- ☐ Add index signature to PanelState interface:
  ```typescript
  export interface PanelState {
      selectedSolutionId: string;
      lastUpdated: string;
      filterCriteria?: unknown;
      detailPanelWidth?: number;
      autoRefreshInterval?: number;
      [key: string]: unknown; // Allow additional properties
  }
  ```

---

**Then update**:

**File 1**: `src/features/pluginTraceViewer/presentation/behaviors/PluginTraceFilterManagementBehavior.ts:252`

**Changes**:
- ☐ Remove `as any` cast
- ☐ Remove eslint-disable comments
- ☐ Code should now type-check cleanly

---

**File 2**: `src/features/pluginTraceViewer/presentation/behaviors/PluginTraceDetailPanelBehavior.ts:198`

**Changes**:
- ☐ Remove `as any` cast
- ☐ Remove eslint-disable comments

**Verification**:
- ☐ Search for `as any` in production code: `grep -r "as any" src/ --exclude-dir=node_modules --exclude="*.test.ts"`
- ☐ Should find zero results (except justified/documented cases)
- ☐ Run: `npm run compile` (zero errors)
- ☐ Manual test: PluginTraceViewer panel state persists correctly
- ☐ Commit: "fix: remove type assertions from panel state by extending interface"

---

### Week 5, Day 5 - Large File Refactoring (Part 1)

#### ☐ HIGH-2: Refactor extension.ts (Start - 4 hours)

**Goal**: Extract DI container setup

**Step 1 - Create DependencyContainer** (2 hours):

**Create**: `src/infrastructure/composition/DependencyContainer.ts`

**Extract**:
- ☐ All ILogger instantiation
- ☐ All repository instantiation
- ☐ All service instantiation
- ☐ All use case instantiation
- ☐ All mapper instantiation

**Pattern**:
```typescript
export class DependencyContainer {
    constructor(private readonly context: vscode.ExtensionContext) {}

    // Logging
    public createLogger(): ILogger { ... }

    // Repositories
    public createEnvironmentRepository(): IEnvironmentRepository { ... }
    public createSolutionRepository(): ISolutionRepository { ... }
    // ... etc

    // Services
    public createDataverseApiService(): DataverseApiService { ... }
    // ... etc

    // Use Cases
    public createLoadEnvironmentsUseCase(): LoadEnvironmentsUseCase { ... }
    // ... etc

    // Mappers
    public createEnvironmentFormViewModelMapper(): EnvironmentFormViewModelMapper { ... }
    // ... etc
}
```

---

**Step 2 - Update extension.ts** (2 hours):

**Changes**:
- ☐ Import DependencyContainer
- ☐ Replace all instantiation with container calls:
  ```typescript
  export function activate(context: vscode.ExtensionContext): void {
      const container = new DependencyContainer(context);
      const logger = container.createLogger();

      // Use container.create*() for all dependencies
      const loadEnvironmentsUseCase = container.createLoadEnvironmentsUseCase();
      // ... etc
  }
  ```

**Verification**:
- ☐ Run: `npm run compile` (zero errors)
- ☐ Extension activates successfully
- ☐ All features work (manual smoke test)
- ☐ Line count reduced significantly (target: under 600 lines)
- ☐ Commit: "refactor: extract DI container from extension.ts (part 1)"

---

## Phase 4: Low Priority Issues (Week 6, Days 1-2)

**Target**: Code quality improvements
**Estimated Effort**: 2 days
**Progress**: 0/18 complete

### Week 6, Day 1 - Test Code Cleanup

#### ☐ LOW-1: Remove Console.log from Test Files (15 minutes)

**File**: `src/shared/infrastructure/ui/behaviors/HtmlRenderingBehavior.test.ts`

**Changes**:
- ☐ Search for console.log in file
- ☐ Remove console.log statement(s)
- ☐ Verify tests still pass

**Global Search**:
- ☐ Search entire codebase: `grep -r "console\.log" src/**/*.test.ts`
- ☐ Remove any other console.log in test files

**Verification**:
- ☐ Run: `npm test` (all tests pass)
- ☐ No console output during test run (except test results)
- ☐ Commit: "test: remove console.log from test files"

---

#### ☐ LOW-2: Review Non-Null Assertions in Tests (2 hours - optional)

**If pursuing this**:
- ☐ Create helper function:
  ```typescript
  // src/shared/testing/TestHelpers.ts
  export function assertDefined<T>(value: T | undefined | null): asserts value is T {
      expect(value).toBeDefined();
      expect(value).not.toBeNull();
  }
  ```

- ☐ Update sample test files to use helper
- ☐ Document pattern for future tests

**Note**: This is optional - current usage is acceptable

---

### Week 6, Day 1-2 - Finish Large File Refactoring

#### ☐ HIGH-2: Refactor extension.ts (Complete) (4 hours)

**Step 3 - Create FeatureInitializers** (2 hours):

**Create**: `src/infrastructure/composition/FeatureInitializers.ts`

**Extract**:
- ☐ All command registration logic
- ☐ Group by feature

**Pattern**:
```typescript
export class FeatureInitializers {
    constructor(private readonly container: DependencyContainer) {}

    public initializeEnvironmentSetup(context: vscode.ExtensionContext): void {
        // Register all environment setup commands
    }

    public initializeSolutionExplorer(context: vscode.ExtensionContext): void {
        // Register all solution explorer commands
    }

    // ... etc for each feature
}
```

---

**Step 4 - Final extension.ts cleanup** (2 hours):

**Changes**:
- ☐ Create container
- ☐ Create feature initializers
- ☐ Call initializers for each feature
- ☐ Register subscriptions

**Target**:
```typescript
export function activate(context: vscode.ExtensionContext): void {
    const container = new DependencyContainer(context);
    const featureManager = new FeatureInitializers(container);

    featureManager.initializeEnvironmentSetup(context);
    featureManager.initializeSolutionExplorer(context);
    featureManager.initializePluginTraceViewer(context);
    // ... etc
}
```

**Verification**:
- ☐ extension.ts is now under 200 lines (from 1,137)
- ☐ Run: `npm run compile` (zero errors)
- ☐ Run extension (F5)
- ☐ Test each feature works
- ☐ Commit: "refactor: complete extension.ts refactoring with feature initializers"

---

#### ☐ HIGH-3: Split DataverseEntityMetadataRepository (Start - 4 hours)

**Step 1 - Create EntityMetadataMapper** (2 hours):

**Create**: `src/features/metadataBrowser/infrastructure/mappers/EntityMetadataMapper.ts`

**Extract from repository**:
- ☐ All DTO-to-domain mapping logic for EntityMetadata
- ☐ `mapDtoToEntity()` → `toDomain(dto: EntityMetadataDto): EntityMetadata`

---

**Step 2 - Create AttributeMetadataMapper** (2 hours):

**Create**: `src/features/metadataBrowser/infrastructure/mappers/AttributeMetadataMapper.ts`

**Extract from repository**:
- ☐ All DTO-to-domain mapping logic for AttributeMetadata
- ☐ `mapAttributeDto()` → `toDomain(dto: AttributeMetadataDto): AttributeMetadata`

**Verification**:
- ☐ Commit: "refactor: extract mappers from DataverseEntityMetadataRepository (part 1)"

---

### Week 6, Day 2 - Continue Repository Refactoring

#### ☐ HIGH-3: Split DataverseEntityMetadataRepository (Complete)

**Step 3 - Update Repository** (2 hours):

**File**: `src/features/metadataBrowser/infrastructure/repositories/DataverseEntityMetadataRepository.ts`

**Changes**:
- ☐ Inject EntityMetadataMapper in constructor
- ☐ Inject AttributeMetadataMapper in constructor
- ☐ Replace inline mapping with mapper calls
- ☐ Remove old mapping methods

**Before**:
```typescript
const entity = this.mapDtoToEntity(dto);
const attributes = dto.attributes.map(a => this.mapAttributeDto(a));
```

**After**:
```typescript
const entity = this.entityMapper.toDomain(dto);
const attributes = dto.attributes.map(a => this.attributeMapper.toDomain(a));
```

---

**Step 4 - Create Mapper Tests** (2 hours):

**Create**:
- ☐ `EntityMetadataMapper.test.ts`
- ☐ `AttributeMetadataMapper.test.ts`

**Test**:
- ☐ All DTO-to-domain mappings
- ☐ Edge cases
- ☐ Null handling

**Verification**:
- ☐ Repository is now under 500 lines (from 813)
- ☐ Run: `npm test` (all tests pass, including mapper tests)
- ☐ Run: `npm run compile` (zero errors)
- ☐ Manual test: MetadataBrowser panel works correctly
- ☐ Commit: "refactor: complete DataverseEntityMetadataRepository split with mappers"

---

### Week 6, Day 2 - Additional Medium Priority

#### ☐ MEDIUM-4: CSP Strengthen (Optional - 4 hours if pursuing)

**File**: `src/shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior.ts:70`

**Option 1 - Move Inline Styles to External CSS**:
- ☐ Review all HTML views for inline styles
- ☐ Extract to external CSS files
- ☐ Update CSP to remove 'unsafe-inline' for styles

**Option 2 - Use Nonce-Based Styles**:
- ☐ Update CSP: `style-src ${cspSource} 'nonce-${cspNonce}'`
- ☐ Add nonce to all `<style>` tags: `<style nonce="${cspNonce}">`

**Note**: This is a future enhancement, not blocking

---

#### ☐ LOW-3 through LOW-18: Various Low Priority Items

**Review and address if time permits**:
- ☐ Test file organization (move to co-location if any in `__tests__/`)
- ☐ Test naming conventions (enforce "should...when...")
- ☐ Create shared test utilities/factories
- ☐ Review ESLint suppressions (all should have justifications - already done)
- ☐ Static factory methods (already documented as acceptable)
- ☐ OData in domain (already documented as design decision)
- ☐ Mock type casting patterns (minor, acceptable)
- ☐ Parameterized testing opportunities (optional optimization)
- ☐ Password presence logging (LOW-7 in security report)
- ☐ Hardcoded OAuth port (LOW-8 in security report)

**Note**: Most low-priority items are already acceptable or documented exceptions

---

## Phase 5: Comment Cleanup Pass (Week 6, Days 3-4)

**Target**: All comments match CODE_QUALITY_GUIDE.md standards
**Estimated Effort**: 2 days
**Progress**: 0% complete

### Comment Standards Review

**From CODE_QUALITY_GUIDE.md**:

**Comment When**:
- ✅ Public/protected methods (JSDoc)
- ✅ WHY, not WHAT (non-obvious decisions)
- ✅ Complex algorithms / Regex
- ✅ Business rules that aren't obvious from code

**Never Comment**:
- ❌ Obvious code
- ❌ Placeholders ("Handle event" / "Process data")
- ❌ Band-aids for bad code
- ❌ WHAT the code does (code should be self-documenting)

---

### Week 6, Day 3 - Domain & Application Layer Comments

#### ☐ Review Domain Layer Comments

**For each feature's domain layer**:

##### ☐ Environment Setup Domain (2 hours)

**Files to review**:
- ☐ `src/features/environmentSetup/domain/entities/Environment.ts`
  - ☐ Review all JSDoc comments on public methods
  - ☐ Ensure comments explain WHY, not WHAT
  - ☐ Remove obvious comments (e.g., "Returns the environment name" on `getName()`)
  - ☐ Add WHY comments for non-obvious business logic
  - ☐ Example: `getOrphanedSecretKeys()` - explain WHY we detect orphans

- ☐ `src/features/environmentSetup/domain/services/*.ts`
  - ☐ Review all domain services
  - ☐ JSDoc on public methods
  - ☐ Explain complex algorithms

- ☐ `src/features/environmentSetup/domain/valueObjects/*.ts`
  - ☐ Review value objects
  - ☐ Document validation rules (WHY certain values are invalid)

---

##### ☐ Plugin Trace Viewer Domain (2 hours)

**Files to review**:
- ☐ `src/features/pluginTraceViewer/domain/entities/*.ts`
- ☐ `src/features/pluginTraceViewer/domain/services/*.ts`
- ☐ `src/features/pluginTraceViewer/domain/valueObjects/*.ts`

**Special attention**:
- ☐ `TraceFilter.ts` - Has acknowledged technical debt, ensure TODOs reference TECHNICAL_DEBT.md
- ☐ `FilterCondition.ts` - OData query building (has eslint-disable with justification)
- ☐ `ODataQueryBuilder.ts` - Complex query construction logic

---

##### ☐ Other Features' Domain Layers (2 hours)

**Review each**:
- ☐ Solution Explorer domain
- ☐ Import Job Viewer domain
- ☐ Connection References domain
- ☐ Environment Variables domain
- ☐ Metadata Browser domain
- ☐ Persistence Inspector domain

---

#### ☐ Review Application Layer Comments

**For each feature's application layer**:

##### ☐ Use Cases (2 hours)

**Pattern to enforce**:
- ☐ JSDoc on use case class explaining WHAT it orchestrates
- ☐ JSDoc on `execute()` method with parameters and return type
- ☐ Comments inside `execute()` only for non-obvious WHY
- ☐ Remove comments that just restate code

**Example - Good**:
```typescript
/**
 * Deletes an environment and cleans up associated secrets.
 *
 * NOTE: This use case is responsible for orphaned secret cleanup because
 * environments may have secrets from previous auth methods that are no longer
 * referenced. We clean these up to prevent secret storage bloat.
 */
export class DeleteEnvironmentUseCase {
    public async execute(environmentId: string): Promise<void> {
        this.logger.info('Deleting environment', { environmentId });

        // Retrieve environment first to identify secrets that need cleanup
        const environment = await this.repository.getById(environmentId);

        // Delete from repository
        await this.repository.delete(environmentId);

        // Clean up secrets (WHY: prevent orphaned secrets)
        await this.cleanupSecrets(environment);

        this.eventPublisher.publish(new EnvironmentDeleted(environmentId));
    }
}
```

**Example - Bad**:
```typescript
/**
 * Deletes an environment.
 */
export class DeleteEnvironmentUseCase {
    public async execute(environmentId: string): Promise<void> {
        // Log the start
        this.logger.info('Deleting environment', { environmentId });

        // Get the environment
        const environment = await this.repository.getById(environmentId);

        // Delete it
        await this.repository.delete(environmentId);

        // Clean up secrets
        await this.cleanupSecrets(environment);

        // Publish event
        this.eventPublisher.publish(new EnvironmentDeleted(environmentId));
    }
}
```

---

##### ☐ Mappers (1 hour)

**Review all 20 mappers**:
- ☐ JSDoc on class explaining purpose
- ☐ JSDoc on public methods
- ☐ Comments only for non-obvious transformations

**Example**:
```typescript
/**
 * Maps EnvironmentVariable domain entities to deployment settings format.
 *
 * NOTE: Secret values are intentionally NOT exported to deployment settings
 * for security reasons. Secrets must be configured per environment.
 */
export class EnvironmentVariableToDeploymentSettingsMapper {
    public toDeploymentSettings(envVar: EnvironmentVariable): DeploymentSettingEntry {
        return {
            schemaName: envVar.schemaName,
            type: envVar.type,
            // Use current value if set, otherwise default (secrets are excluded)
            value: envVar.isSecret() ? '' : (envVar.currentValue ?? envVar.defaultValue)
        };
    }
}
```

---

### Week 6, Day 4 - Infrastructure & Presentation Layer Comments

#### ☐ Review Infrastructure Layer Comments (3 hours)

##### ☐ Repositories

**For each repository**:
- ☐ JSDoc explaining what data source it accesses
- ☐ JSDoc on complex query building
- ☐ Comments on OData query construction (WHY certain filters)

**Example**:
```typescript
/**
 * Dataverse API implementation of plugin trace repository.
 *
 * Queries the PluginTraceLog entity using OData protocol.
 * NOTE: We use server-side filtering for performance - traces can number in millions.
 */
export class DataversePluginTraceRepository implements IPluginTraceRepository {
    // ...
}
```

---

##### ☐ Services

- ☐ Review `MsalAuthenticationService` - complex auth flows
- ☐ Review `DataverseApiService` - retry logic
- ☐ Review formatters and utilities

---

#### ☐ Review Presentation Layer Comments (2 hours)

##### ☐ Panels

**For each panel**:
- ☐ JSDoc explaining panel purpose and lifecycle
- ☐ Document WHY panels don't extend EnvironmentScopedPanel (if applicable)
- ☐ Document command handlers (WHAT they do, WHY if non-obvious)

---

##### ☐ Behaviors & Coordinators

- ☐ Review behavior classes
- ☐ JSDoc explaining behavior responsibility
- ☐ Comments on complex DOM manipulation

---

#### ☐ Review Shared/Common Comments (1 hour)

- ☐ `src/shared/domain/**/*.ts`
- ☐ `src/shared/infrastructure/**/*.ts`
- ☐ `src/infrastructure/**/*.ts`

---

### Comment Cleanup Verification

**Automated Checks**:
- ☐ Search for placeholder comments:
  ```bash
  grep -r "// Handle" src/
  grep -r "// Process" src/
  grep -r "// TODO" src/  # Should only find documented TODOs in TECHNICAL_DEBT.md
  grep -r "// FIXME" src/
  grep -r "// HACK" src/
  ```

- ☐ Search for obvious comments:
  ```bash
  grep -r "// Get the" src/
  grep -r "// Set the" src/
  grep -r "// Return" src/
  grep -r "// Call" src/
  ```

**Manual Review**:
- ☐ Spot-check 10-20 files across all layers
- ☐ Verify JSDoc on all public methods
- ☐ Verify comments explain WHY, not WHAT

**Commit**:
- ☐ Commit all comment updates: "docs: cleanup comments to match code quality standards"

---

## Phase 6: Logging Review Pass (Week 6, Day 5)

**Target**: Logging matches LOGGING_GUIDE.md standards
**Estimated Effort**: 1 day
**Progress**: 0% complete

### Logging Standards Review

**From LOGGING_GUIDE.md**:

**Logging Levels**:
- `trace` - Extremely verbose (loop iterations, raw payloads, method entry/exit)
- `debug` - Technical details, method flow, API calls
- `info` - Business events, use case completion, state changes
- `warn` - Recoverable issues, fallbacks, missing optional config
- `error` - Failures, exceptions (always pass error object)

**Message Format**:
- ✅ Capitalize first letter (sentence case)
- ✅ No period at end
- ✅ Structured data in args: `logger.info('Message', { key: value })`
- ❌ NO string interpolation: `` logger.info(`Message ${value}`) ``

**Architecture**:
- ❌ NO logging in domain layer
- ✅ Logging at use case boundaries (application layer)
- ✅ Logging in infrastructure (repositories, services)
- ✅ Minimal logging in presentation (only critical user actions)

---

### Week 6, Day 5 Morning - Application Layer Logging

#### ☐ Review All Use Case Logging (3 hours)

**For EACH use case** (33 total):

##### ☐ Verify Logging Pattern

**Required logs**:
- ☐ `info` at start: `logger.info('Starting <UseCase>', { params });`
- ☐ `info` at success: `logger.info('<UseCase> completed successfully', { result metadata });`
- ☐ `error` on failure: `logger.error('<UseCase> failed', { error }, error);`

**Example - Correct**:
```typescript
export class LoadEnvironmentsUseCase {
    public async execute(): Promise<Environment[]> {
        this.logger.info('Loading environments');

        try {
            const environments = await this.repository.getAll();
            this.logger.info('Environments loaded successfully', { count: environments.length });
            return environments;
        } catch (error) {
            this.logger.error('Failed to load environments', { error: normalizeError(error) }, error);
            throw error;
        }
    }
}
```

---

##### ☐ Review Logging Levels

**Check each log statement**:
- ☐ Is `debug` used appropriately? (technical details, not business events)
- ☐ Is `info` used for business events? (use case completion, state changes)
- ☐ Is `warn` used for recoverable issues? (fallbacks, missing optional data)
- ☐ Is `error` used for failures? (with error object passed)

**Common issues to fix**:
- ☐ Using `debug` for business events → Change to `info`
- ☐ Using `info` for technical details → Change to `debug`
- ☐ Error logs without error object → Add error object

---

##### ☐ Verify Message Format

**For each log message**:
- ☐ Capitalized first letter? ✅ "Loading environments" ❌ "loading environments"
- ☐ No period at end? ✅ "Loading environments" ❌ "Loading environments."
- ☐ Using structured args? ✅ `logger.info('Msg', { count })` ❌ `` logger.info(`Msg ${count}`) ``

**Find and fix string interpolation**:
```bash
grep -r "logger\.\(info\|debug\|warn\|error\)\(\`" src/
```

**Fix**:
```typescript
// Bad
logger.info(`Loaded ${count} environments`);

// Good
logger.info('Loaded environments', { count });
```

---

##### ☐ Check for Excessive Logging

**Questions for each log**:
- ☐ Is this log necessary? Does it provide value for troubleshooting?
- ☐ Is this log too verbose? (logging in loops without limiting)
- ☐ Is this log redundant? (multiple logs saying the same thing)

**Remove unnecessary logs**:
- ☐ Logs that just restate code
- ☐ Logs with no useful context
- ☐ Excessive debug logs that don't aid troubleshooting

---

### Week 6, Day 5 Afternoon - Infrastructure & Presentation Logging

#### ☐ Review Repository Logging (1 hour)

**For each repository** (11 total):

##### ☐ Verify Appropriate Level

- ☐ `debug` for query building: `logger.debug('Building OData query', { filter, select })`
- ☐ `debug` for API calls: `logger.debug('Fetching entities from Dataverse', { entityName })`
- ☐ `info` for cache hits/misses: `logger.info('Cache hit', { entityId })`
- ☐ `error` for failures: `logger.error('Failed to fetch entity', { error }, error)`

##### ☐ Check for Over-Logging

- ☐ Don't log every entity fetched in a loop
- ☐ Don't log raw API responses (could be huge)
- ☐ Log summary instead: `logger.debug('Fetched entities', { count: entities.length })`

---

#### ☐ Review Service Logging (1 hour)

**Key services to review**:

##### ☐ MsalAuthenticationService

- ☐ `debug` for auth flow steps: `logger.debug('Acquiring access token', { authMethod, tenantId })`
- ☐ `info` for successful auth: `logger.info('Access token acquired successfully', { authMethod, tokenLength })`
- ☐ `warn` for fallback: `logger.warn('Falling back to device code flow', { reason })`
- ☐ `error` for auth failure: `logger.error('Authentication failed', { error }, error)`

##### ☐ DataverseApiService

- ☐ `debug` for HTTP requests: `logger.debug('Making HTTP request', { method, url })`
- ☐ `debug` for retry attempts: `logger.debug('Retrying request', { attempt, maxAttempts })`
- ☐ `warn` for rate limiting: `logger.warn('Rate limited, retrying after delay', { retryAfter })`
- ☐ `error` for failures: `logger.error('HTTP request failed', { error }, error)`

---

#### ☐ Review Presentation Logging (30 minutes)

**For panels and behaviors**:

##### ☐ Minimal Logging

- ☐ Only log critical user actions
- ☐ `info` for panel open: `logger.info('Panel opened', { viewType, environmentId })`
- ☐ `info` for user actions: `logger.info('User exported traces', { count, format })`
- ☐ `error` for UI errors: `logger.error('Failed to render panel', { error }, error)`

##### ☐ No Technical Logging

- ☐ Remove debug logs for rendering
- ☐ Remove debug logs for message passing (unless debugging specific issue)
- ☐ Keep only business-relevant logs

---

### Logging Review Verification

**Automated Checks**:

##### ☐ Find String Interpolation in Logs

```bash
grep -r "logger\.\(info\|debug\|warn\|error\)\(\`" src/ --exclude-dir=node_modules --exclude="*.test.ts"
```
- ☐ Should find zero results

---

##### ☐ Find Logs with Periods

```bash
grep -r "logger\.\(info\|debug\|warn\|error\).*\\.'" src/ --exclude-dir=node_modules --exclude="*.test.ts"
```
- ☐ Review and remove periods

---

##### ☐ Find Logs in Domain Layer

```bash
grep -r "logger\." src/features/*/domain/ src/shared/domain/
```
- ☐ Should find zero results (except in comments)

---

##### ☐ Find Error Logs Without Error Object

```bash
grep -r "logger\.error" src/ --exclude-dir=node_modules --exclude="*.test.ts" -A 1
```
- ☐ Manually review: each error log should pass error object as 3rd parameter

---

**Manual Review**:
- ☐ Spot-check 20-30 log statements across all layers
- ☐ Verify correct levels (debug/info/warn/error)
- ☐ Verify meaningful messages with context
- ☐ Verify structured args, not string interpolation

**Test Logging**:
- ☐ Run extension (F5)
- ☐ Open Output panel → "Power Platform Developer Suite"
- ☐ Perform various actions
- ☐ Verify logs are:
  - ☐ Helpful for troubleshooting
  - ☐ Not too verbose
  - ☐ Properly formatted
  - ☐ At correct levels

**Commit**:
- ☐ Commit all logging updates: "refactor: standardize logging per LOGGING_GUIDE.md"

---

## Verification & Sign-off

### Final Verification Checklist

#### ☐ All Issues Resolved

**Critical** (3/3):
- ☐ escapeHtml duplication fixed
- ☐ All 20 mappers tested
- ☐ StorageEntry & StorageCollection tested

**High Priority** (20/20):
- ☐ Presentation sorting moved to presentation layer
- ☐ extension.ts refactored (under 200 lines)
- ☐ DataverseEntityMetadataRepository split (under 500 lines)
- ☐ All 6 collection services tested
- ☐ All 12 missing use cases tested
- ☐ All 3 missing entity tests created
- ☐ All 17 value object tests created

**Medium Priority** (29/29):
- ☐ Mapper sorting patterns standardized
- ☐ Panel pattern exceptions documented
- ☐ PanelState type assertions removed
- ☐ Token preview removed from logs
- ☐ innerHTML replaced with textContent
- ☐ All other medium priority items addressed

**Low Priority** (18/18):
- ☐ Console.log removed from tests
- ☐ All other low priority items reviewed

---

#### ☐ Cleanup Passes Complete

**Comment Cleanup**:
- ☐ All domain layer comments reviewed
- ☐ All application layer comments reviewed
- ☐ All infrastructure layer comments reviewed
- ☐ All presentation layer comments reviewed
- ☐ No placeholder comments
- ☐ No obvious comments
- ☐ All comments explain WHY, not WHAT

**Logging Cleanup**:
- ☐ All use case logging reviewed
- ☐ All repository logging reviewed
- ☐ All service logging reviewed
- ☐ All presentation logging reviewed
- ☐ No string interpolation in logs
- ☐ Correct logging levels used
- ☐ No logging in domain layer

---

#### ☐ Automated Verification

**Compilation**:
- ☐ Run: `npm run compile`
- ☐ Zero TypeScript errors
- ☐ Zero warnings

**Tests**:
- ☐ Run: `npm test`
- ☐ All tests pass
- ☐ New test count: ~2,403 + ~90 new tests = ~2,500 total
- ☐ Test coverage improved significantly

**Linting**:
- ☐ Run: `npm run lint` (if available)
- ☐ Zero errors
- ☐ Acceptable warnings (with justifications)

---

#### ☐ Manual Testing

**Smoke Test All Features**:
- ☐ Environment Setup
  - ☐ Create new environment
  - ☐ Edit existing environment
  - ☐ Delete environment (verify secrets cleaned up)
  - ☐ Test connection

- ☐ Solution Explorer
  - ☐ View solutions
  - ☐ Verify Default solution appears first
  - ☐ Verify alphabetical sorting

- ☐ Plugin Trace Viewer
  - ☐ Load traces
  - ☐ Apply filters
  - ☐ View details
  - ☐ Export traces

- ☐ Import Job Viewer
  - ☐ View import jobs
  - ☐ Verify in-progress jobs appear first
  - ☐ Open import log

- ☐ Environment Variables
  - ☐ View environment variables
  - ☐ Export to deployment settings
  - ☐ Verify file format

- ☐ Connection References
  - ☐ View connection references
  - ☐ View flow relationships
  - ☐ Export to deployment settings

- ☐ Metadata Browser
  - ☐ View entities
  - ☐ View entity metadata
  - ☐ View attributes sorted correctly
  - ☐ Verify HTML rendering (no XSS issues)

- ☐ Persistence Inspector
  - ☐ View storage
  - ☐ Verify protected keys cannot be cleared
  - ☐ Clear individual entries
  - ☐ Clear all (verify protected keys remain)

---

#### ☐ Code Quality Verification

**grep Checks**:

- ☐ No escapeHtml duplication:
  ```bash
  grep -r "function escapeHtml" src/
  # Should only find HtmlUtils.ts
  ```

- ☐ No console.log in production:
  ```bash
  grep -r "console\.log" src/ --exclude-dir=node_modules --exclude="*.test.ts"
  # Should find zero
  ```

- ☐ No string interpolation in logs:
  ```bash
  grep -r "logger\.\(info\|debug\|warn\|error\)\(\`" src/ --exclude-dir=node_modules --exclude="*.test.ts"
  # Should find zero
  ```

- ☐ No logging in domain:
  ```bash
  grep -r "logger\." src/features/*/domain/ src/shared/domain/
  # Should find zero (except in comments)
  ```

- ☐ No `as any` (except justified):
  ```bash
  grep -r "as any" src/ --exclude-dir=node_modules --exclude="*.test.ts"
  # Should find zero
  ```

- ☐ No `public static` on panel maps:
  ```bash
  grep -r "public static.*panels\|public static.*currentPanel" src/
  # Should find zero
  ```

---

#### ☐ Documentation Verification

**Updated Documents**:
- ☐ PROGRESS_TRACKER.md shows 70/70 issues complete
- ☐ IMPLEMENTATION_PLAN.md (this document) fully checked off
- ☐ TECHNICAL_DEBT.md updated if any new debt identified
- ☐ README.md updated if needed

**Git Status**:
- ☐ All changes committed
- ☐ Meaningful commit messages
- ☐ No uncommitted changes
- ☐ No untracked files (except intentional)

---

### Final Sign-off

#### ☐ Production Readiness

**Scores**:
- ☐ Architecture: 9.5/10 → Maintained or improved
- ☐ Domain Purity: 9.5/10 → Maintained
- ☐ Type Safety: 9.8/10 → Maintained
- ☐ Code Quality: 7/10 → **Improved to 9.5/10**
- ☐ Security: 9/10 → **Improved to 9.5/10**
- ☐ Pattern Compliance: 9.5/10 → Maintained
- ☐ Test Coverage: 6/10 → **Improved to 9/10**
- ☐ Test Quality: 9/10 → Maintained

**Overall Target**: 8.4/10 → **9.5/10** ✅

---

#### ☐ Final Checklist

- ☐ All 70 code review issues resolved
- ☐ Comment cleanup pass complete
- ☐ Logging review pass complete
- ☐ All tests passing
- ☐ Zero compilation errors
- ☐ Manual testing complete
- ☐ Documentation updated
- ☐ All changes committed

---

#### ☐ Ready for Production

- ☐ Code review by team (if applicable)
- ☐ Final QA/manual testing by QA team (if applicable)
- ☐ Performance testing (if applicable)
- ☐ Security review (if applicable)
- ☐ Deployment plan created
- ☐ Rollback plan created

---

## Progress Tracking

**Overall Progress**: ☐☐☐☐☐☐☐☐☐☐ 0%

**By Phase**:
- Phase 1 (Critical): ☐☐☐☐☐ 0% (0/3 complete)
- Phase 2 (High): ☐☐☐☐☐ 0% (0/20 complete)
- Phase 3 (Medium): ☐☐☐☐☐ 0% (0/29 complete)
- Phase 4 (Low): ☐☐☐☐☐ 0% (0/18 complete)
- Phase 5 (Comments): ☐☐☐☐☐ 0%
- Phase 6 (Logging): ☐☐☐☐☐ 0%

**Estimated Completion Date**: 6 weeks from start
**Target Production Date**: Week 7

---

## Notes

- Update this document as you complete tasks (check boxes with ✅)
- Commit this document after each day's work
- Use git commit messages that reference task numbers: "fix: CRITICAL-1 - consolidate escapeHtml"
- If you discover new issues, add them to PROGRESS_TRACKER.md and this document
- If any task is blocked, document the blocker and move to next task
- Celebrate wins! 🎉 (especially after completing each phase)

---

**Last Updated**: November 21, 2025
**Next Review**: After Phase 1 complete (Week 1)
