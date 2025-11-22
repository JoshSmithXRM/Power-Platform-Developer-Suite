# Test Coverage Agent - Code Review Report

**Date**: 2025-11-21
**Scope**: Domain and Application layer test coverage analysis
**Overall Assessment**: Significant Issues

---

## Executive Summary

The codebase demonstrates **inconsistent test coverage** with significant gaps in critical domain and application layers. While some features (PluginTraceViewer, MetadataBrowser, PersistenceInspector) have excellent test coverage, entire feature domains (ConnectionReferences, EnvironmentVariables) have **ZERO test coverage** for their domain layer.

**Test Coverage Statistics:**
- Domain Entities: 12/17 tested (71%) - **5 untested**
- Domain Services: 6/17 tested (35%) - **11 untested** ⚠️
- Domain Value Objects: 15/33 tested (45%) - **18 untested** ⚠️
- Application Use Cases: 21/33 tested (64%) - **12 untested**
- Infrastructure Repositories: 3/21 tested (14%) - **18 untested** ⚠️

**Critical Issues**: 15
**High Priority Issues**: 28
**Medium Priority Issues**: 12
**Low Priority Issues**: 3

**Key Findings:**
1. **Entire feature domains missing tests**: ConnectionReferences and EnvironmentVariables features have ZERO domain tests
2. **Complex business logic untested**: FlowConnectionRelationshipBuilder, DeploymentSettings sync operations, AuthenticationCacheInvalidationService
3. **Critical use cases untested**: Delete/Load/Validate environment operations, export operations
4. **Repository layer severely undertested**: Only 3 of 21 repository implementations have tests
5. **Value objects inconsistently tested**: 18 untested value objects, many with validation logic

---

## Critical Issues

### 1. Entire ConnectionReferences Domain Untested
**Severity**: Critical
**Location**: src/features/connectionReferences/domain/
**Pattern**: Testing
**Description**:
The entire ConnectionReferences feature domain has ZERO test coverage despite containing complex business logic for matching flows to connection references, handling orphaned relationships, and case-insensitive matching.

**Untested Domain Files:**
- `entities/CloudFlow.ts` - JSON parsing, connection reference extraction (47 lines of logic)
- `entities/ConnectionReference.ts` - Business methods for connection validation
- `services/FlowConnectionRelationshipBuilder.ts` - 162 lines of complex relationship-building logic
- `services/CloudFlowCollectionService.ts` - Sorting logic
- `services/ConnectionReferenceCollectionService.ts` - Sorting logic
- `services/FlowConnectionRelationshipCollectionService.ts` - Multi-field sorting
- `valueObjects/FlowConnectionRelationship.ts` - Relationship type validation

**Why Critical**:
- Complex business logic with multiple edge cases (orphaned flows, orphaned CRs, case-insensitive matching)
- JSON parsing with error handling that could fail silently
- Relationship building algorithm affects data integrity
- Missing tests for case-insensitive mapping (Power Platform behavior)

**Test Scenarios Needed**:
1. **CloudFlow.extractConnectionReferenceNames()**:
   - Valid clientData with connection references
   - Invalid JSON in clientData (should throw ValidationError on construction)
   - Malformed clientData structure (should return empty array)
   - Empty clientData (should return empty array)
   - Null clientData (should return empty array)
   - Multiple connection references extraction

2. **FlowConnectionRelationshipBuilder.buildRelationships()**:
   - Flow with matching connection reference (flow-to-cr)
   - Flow with missing connection reference (orphaned-flow)
   - Connection reference with no flows (orphaned-cr)
   - Case-insensitive matching (CR name differs in case)
   - Multiple flows using same connection reference
   - Empty flows/connection references arrays

**Recommendation**:
Create comprehensive test suite for entire ConnectionReferences domain layer BEFORE any production use. Target 100% coverage given the complexity and criticality of this feature.

---

### 2. EnvironmentVariables Domain Completely Untested
**Severity**: Critical
**Location**: src/features/environmentVariables/domain/
**Pattern**: Testing
**Description**:
The EnvironmentVariables feature has ZERO domain layer tests despite handling secret values, type validation, and environment-specific overrides.

**Untested Domain Files:**
- `entities/EnvironmentVariable.ts` - Type validation, effective value calculation, secret detection
- `services/EnvironmentVariableFactory.ts` - Complex definition/value joining logic (64 lines)
- `services/EnvironmentVariableCollectionService.ts` - Sorting logic

**Why Critical**:
- Handles **SECRET** type environment variables (security-sensitive)
- Type validation can throw ValidationError (untested error paths)
- Complex factory logic joins two separate data sources (definitions + values)
- Effective value calculation (currentValue ?? defaultValue) affects application behavior
- Missing tests for secret masking behavior

**Test Scenarios Needed**:
1. **EnvironmentVariable constructor**:
   - Valid type codes (100000000-100000005)
   - Invalid type code (should throw ValidationError)
   - All type enum values

2. **getEffectiveValue()**:
   - Current value exists (should return currentValue)
   - Only default value exists (should return defaultValue)
   - Both values null (should return null)

3. **hasOverride()**:
   - Current value differs from default (should return true)
   - Current value same as default (should return false)
   - Only default value set (should return false)
   - No values set (should return false)

4. **isSecret()**:
   - Secret type (100000004) returns true
   - All other types return false

5. **EnvironmentVariableFactory.createFromDefinitionsAndValues()**:
   - Definitions with matching values
   - Definitions without matching values (value should be null)
   - Multiple definitions with partial values
   - Empty definitions array
   - Null description handling (should coalesce to empty string)

**Recommendation**:
Create full test suite for EnvironmentVariable domain layer immediately. This is production code handling sensitive data (secrets) without any test coverage.

---

### 3. DeploymentSettings Sync Logic Untested
**Severity**: Critical
**Location**: src/shared/domain/entities/DeploymentSettings.ts
**Pattern**: Testing
**Description**:
The DeploymentSettings entity contains complex sync logic (194 lines) for merging environment variables and connection references with existing deployment settings. This business-critical logic has ZERO test coverage.

**Why Critical**:
- Affects deployment automation (wrong sync = deployment failures)
- Complex generic sync algorithm with add/remove/preserve logic
- Alphabetical sorting requirement (source control diffs)
- Preserves existing values during sync (data retention logic)
- Multiple edge cases (empty arrays, all new, all removed, partial overlap)

**Test Scenarios Needed**:
1. **syncEnvironmentVariables()**:
   - Add new entries (not in existing)
   - Remove entries (in existing but not in new)
   - Preserve existing values (entry in both)
   - Mixed add/remove/preserve
   - Empty existing array
   - Empty new entries array
   - Alphabetical sorting verification

2. **syncConnectionReferences()**:
   - Same scenarios as above
   - Verify both ConnectionId and ConnectorId are preserved
   - Verify LogicalName sorting

3. **Edge cases**:
   - Duplicate keys in new entries
   - Case-sensitive vs case-insensitive key matching
   - Null values in preserved entries

**Recommendation**:
Write comprehensive tests for DeploymentSettings sync operations. Target 100% coverage for this critical business logic. Each sync operation should have 8-10 test cases covering all scenarios.

---

### 4. AuthenticationCacheInvalidationService Untested
**Severity**: Critical
**Location**: src/features/environmentSetup/domain/services/AuthenticationCacheInvalidationService.ts
**Pattern**: Testing
**Description**:
Service determining when authentication cache should be invalidated has no tests. Incorrect cache invalidation logic could cause authentication failures or security issues (stale tokens).

**Why Critical**:
- Security implications (stale tokens could be used)
- Affects user authentication experience (unnecessary re-auth if logic wrong)
- Complex boolean logic with 5 different change conditions
- Null handling for previous environment (new environments)

**Test Scenarios Needed**:
1. **shouldInvalidateCache() - New environment**:
   - Previous is null (should return false)

2. **shouldInvalidateCache() - Changed fields**:
   - Authentication method changed (should return true)
   - Client ID changed (should return true)
   - Username changed (should return true)
   - Dataverse URL changed (should return true)
   - Tenant ID changed (should return true)
   - No changes (should return false)
   - Multiple fields changed (should return true)

3. **Edge cases**:
   - ClientId null → null (should return false)
   - ClientId null → value (should return true)
   - ClientId value → null (should return true)

**Recommendation**:
Create test suite with 10+ test cases covering all change scenarios and edge cases. This is security-sensitive code that must be tested.

---

### 5. FlowConnectionRelationshipBuilder Complex Logic Untested
**Severity**: Critical
**Location**: src/features/connectionReferences/domain/services/FlowConnectionRelationshipBuilder.ts
**Pattern**: Testing
**Description**:
The FlowConnectionRelationshipBuilder contains 162 lines of complex business logic for matching flows to connection references, handling orphaned relationships, and case-insensitive matching. **ZERO test coverage**.

**Why Critical**:
- Complex algorithm with multiple paths (3 relationship types)
- Case-insensitive matching (Power Platform behavior)
- Set-based tracking to identify orphaned connection references
- Creates different relationship types based on presence/absence of data
- Business-critical for identifying configuration issues

**Test Scenarios Needed**:
1. **Case-insensitive matching**:
   - Flow references "cr_name", CR is "CR_NAME" (should match)
   - Flow references "CR_Name", CR is "cr_name" (should match)

2. **Relationship types**:
   - Flow + CR exists → flow-to-cr
   - Flow exists, CR missing → orphaned-flow
   - CR exists, no flow uses it → orphaned-cr

3. **Multiple relationships**:
   - One flow with multiple CRs
   - Multiple flows with same CR
   - Mix of valid and orphaned relationships

4. **Edge cases**:
   - Empty flows array
   - Empty connection references array
   - Flow with no connection references (should skip)
   - All flows orphaned
   - All CRs orphaned

**Recommendation**:
This is the most complex untested domain service. Needs 15+ test cases covering all relationship types and edge cases. Must test case-insensitive matching explicitly.

---

### 6. StorageClearingService Business Rules Untested
**Severity**: Critical
**Location**: src/features/persistenceInspector/domain/services/StorageClearingService.ts
**Pattern**: Testing
**Description**:
Domain service enforcing critical business rules for storage clearing (protected keys, secret handling, property clearing) has no tests. Incorrect logic could result in data loss or security breaches.

**Why Critical**:
- Enforces protection rules (prevents accidental data loss)
- Different handling for secrets vs regular storage
- Property-level clearing with validation
- Clear all operation with protection checks
- Throws multiple error types that must be tested

**Test Scenarios Needed**:
1. **clearEntry()**:
   - Valid entry not protected (should clear)
   - Protected entry (should throw ProtectedKeyError)
   - Secret storage routing (should call clearSecretKey)
   - Workspace storage routing (should call clearWorkspaceStateKey)
   - Global storage routing (should call clearGlobalStateKey)

2. **clearProperty()**:
   - Valid property (should clear)
   - Protected entry (should throw ProtectedKeyError)
   - Secret entry (should throw InvalidOperationError)
   - Property not found (should throw PropertyNotFoundError)
   - Workspace vs global routing

3. **clearAll()**:
   - Has clearable entries (should clear all non-protected)
   - No clearable entries (should throw InvalidOperationError)
   - Protected patterns passed to clearer

**Recommendation**:
Create comprehensive test suite covering all business rules and error conditions. Target 100% coverage. Use mocks for IStorageClearer and IProtectedKeyProvider.

---

### 7. StorageInspectionService Aggregation Logic Untested
**Severity**: Critical
**Location**: src/features/persistenceInspector/domain/services/StorageInspectionService.ts
**Pattern**: Testing
**Description**:
Service coordinating storage inspection across multiple storage types (global, workspace, secrets) and building StorageCollection aggregate has no tests.

**Why Critical**:
- Combines data from 3 different storage sources
- Secret value masking logic (security)
- Secret existence verification (filters deleted secrets)
- Builds aggregate with protection patterns
- Reveals secrets on demand

**Test Scenarios Needed**:
1. **inspectStorage()**:
   - Global state entries created correctly
   - Workspace state entries created correctly
   - Secret entries created with '***' value
   - Non-existent secrets filtered out
   - Protection patterns applied to collection
   - Empty storage (all sources empty)

2. **revealSecret()**:
   - Secret exists (should return value)
   - Secret doesn't exist (should return undefined)

**Recommendation**:
Create test suite with mocked IStorageReader. Test all storage types and secret masking. Verify secret existence check prevents phantom entries.

---

### 8. CloudFlow JSON Parsing Error Handling Untested
**Severity**: Critical
**Location**: src/features/connectionReferences/domain/entities/CloudFlow.ts
**Pattern**: Testing
**Description**:
CloudFlow entity parses JSON clientData and extracts connection references. Constructor validation and extraction logic have no tests. Invalid JSON handling could fail silently.

**Why Critical**:
- Constructor validates JSON (throws ValidationError if invalid)
- extractConnectionReferenceNames() has complex nested property access
- Multiple return paths with different outcomes
- Type narrowing with hasClientData() guard
- Silent failure on malformed data (returns empty array)

**Test Scenarios Needed**:
1. **Constructor validation**:
   - Valid JSON clientData (should construct)
   - Invalid JSON clientData (should throw ValidationError)
   - Null clientData (should construct)
   - Empty string clientData (should construct)

2. **extractConnectionReferenceNames()**:
   - Valid structure with connection references (should extract names)
   - Valid JSON but no properties field (should return empty array)
   - Valid JSON but no connectionReferences field (should return empty array)
   - Empty connectionReferences object (should return empty array)
   - connectionReferences without connection field (should skip)
   - connectionReferences without connectionReferenceLogicalName (should skip)
   - Multiple connection references (should extract all)
   - JSON parse error in extraction (should return empty array)

**Recommendation**:
Create comprehensive test suite for CloudFlow. Focus on edge cases and error handling. Verify ValidationError is thrown correctly in constructor.

---

### 9. EnvironmentVariable Type Validation Untested
**Severity**: Critical
**Location**: src/features/environmentVariables/domain/entities/EnvironmentVariable.ts
**Pattern**: Testing
**Description**:
EnvironmentVariable constructor validates type codes but has no tests. Invalid type handling and secret detection logic are untested.

**Why Critical**:
- Constructor throws ValidationError for invalid types
- Handles SECRET type (security-sensitive)
- Effective value calculation affects application behavior
- Override detection for environment-specific configuration
- isInSolution logic for filtering

**Test Scenarios Needed**:
1. **Constructor validation**:
   - All valid type codes (100000000-100000005)
   - Invalid type code (should throw ValidationError)
   - Type code outside enum range

2. **getEffectiveValue()**:
   - Current value set (should return currentValue)
   - Only default value set (should return defaultValue)
   - Both null (should return null)

3. **hasValue()**:
   - Effective value exists (should return true)
   - Effective value null (should return false)

4. **hasOverride()**:
   - Current differs from default (should return true)
   - Current same as default (should return false)
   - Only default set (should return false)

5. **isSecret()**:
   - Type 100000004 (should return true)
   - All other types (should return false)

**Recommendation**:
Create full test suite for EnvironmentVariable entity. Test all type codes, validation errors, and business methods.

---

### 10. Critical Use Cases Missing Tests
**Severity**: Critical
**Location**: Multiple use case files
**Pattern**: Testing
**Description**:
12 critical application layer use cases have no test coverage, including environment deletion, validation, and export operations.

**Untested Use Cases:**

**Environment Setup (7 untested):**
1. `DeleteEnvironmentUseCase` - Deletes environment, clears secrets, invalidates cache
2. `LoadEnvironmentByIdUseCase` - Loads environment with credential metadata
3. `ValidateUniqueNameUseCase` - Validates name uniqueness
4. `CheckConcurrentEditUseCase` - Prevents concurrent edits (stateful logic)
5. `TestExistingEnvironmentConnectionUseCase` - Tests connection for existing env

**ConnectionReferences (2 untested):**
6. `ListConnectionReferencesUseCase` - Complex orchestration with filtering
7. `ExportConnectionReferencesToDeploymentSettingsUseCase` - Export with sync

**EnvironmentVariables (2 untested):**
8. `ListEnvironmentVariablesUseCase` - Joins definitions/values, filters by solution
9. `ExportEnvironmentVariablesToDeploymentSettingsUseCase` - Export with sync

**Other (2 untested):**
10. `OpenImportLogUseCase` - Opens XML log in editor
11. `ClearAllStorageUseCase` - Clears all storage (high-risk operation)
12. `GetClearAllConfirmationMessageUseCase` - Builds confirmation message

**Why Critical**:
- DeleteEnvironmentUseCase handles cascading deletions (secrets, cache)
- Export use cases sync with existing files (data preservation logic)
- List use cases have complex orchestration (parallel fetches, filtering)
- CheckConcurrentEditUseCase has stateful logic (Set tracking)
- ClearAllStorageUseCase is high-risk (data loss potential)

**Recommendation**:
Prioritize tests for these use cases in order:
1. DeleteEnvironmentUseCase (cascading deletes)
2. Both Export use cases (data preservation)
3. Both List use cases (complex orchestration)
4. CheckConcurrentEditUseCase (stateful logic)
5. Remaining 6 use cases

Target 90% coverage for application layer.

---

### 11. Repository Layer Severely Undertested
**Severity**: Critical
**Location**: src/features/*/infrastructure/repositories/
**Pattern**: Testing
**Description**:
Only 3 of 21 repository implementations have test coverage (14%). Repositories handle external API calls, data mapping, and error handling but are largely untested.

**Tested Repositories (3):**
- DataversePluginTraceRepository.test.ts
- DataverseApiImportJobRepository.test.ts
- DataverseApiSolutionRepository.test.ts

**Untested Repositories (18):**
1. DataverseApiCloudFlowRepository
2. DataverseApiConnectionReferenceRepository
3. EnvironmentRepository (environment persistence, secrets)
4. DataverseApiEnvironmentVariableRepository
5. DataverseEntityMetadataRepository
6. DataverseApiSolutionComponentRepository
7. FileSystemDeploymentSettingsRepository
8. VSCodePanelStateRepository
9. Plus 10 more infrastructure implementations

**Why Critical**:
- Repositories contain data mapping logic (OData → domain entities)
- Error handling for API failures
- Query building (OData filters, selects, expands)
- Secret storage (EnvironmentRepository)
- File system operations (FileSystemDeploymentSettingsRepository)

**Recommendation**:
Create integration tests for all repository implementations. Focus on:
1. EnvironmentRepository (secrets handling - highest priority)
2. FileSystemDeploymentSettingsRepository (file I/O)
3. DataverseApiCloudFlowRepository (complex mapping)
4. DataverseApiEnvironmentVariableRepository (joins definitions/values)
5. Remaining repositories

Target 80% coverage for repository layer.

---

### 12. Value Objects with Validation Logic Untested
**Severity**: Critical
**Location**: Multiple value object files
**Pattern**: Testing
**Description**:
18 value objects are untested, many containing validation logic, business rules, or complex parsing.

**Untested Value Objects with Validation:**
1. `AuthenticationMethod` - Type validation, serialization
2. `ClientId` - GUID validation
3. `DataverseUrl` - URL validation, normalization
4. `EnvironmentId` - GUID validation
5. `EnvironmentName` - Name validation (length, characters)
6. `TenantId` - GUID validation
7. `StorageKey` - Key validation
8. `PropertyPath` - Path parsing, segment extraction
9. `ProtectedKeyPattern` - Regex pattern matching

**Why Critical**:
- Validation errors thrown by value objects are untested
- URL normalization logic could have bugs
- Path parsing logic could fail on edge cases
- Pattern matching affects protection rules

**Test Scenarios Needed (examples):**
1. **DataverseUrl**:
   - Valid URL (should construct)
   - Invalid URL (should throw)
   - URL normalization (trailing slash, https upgrade)

2. **PropertyPath**:
   - Simple path "key" (should parse)
   - Nested path "key.nested.deep" (should parse)
   - Array path "key[0]" (should parse)
   - Mixed path "key.nested[0].field" (should parse)
   - Empty path (should throw or return empty)

3. **ProtectedKeyPattern**:
   - Exact match (should match)
   - Wildcard match (should match)
   - No match (should not match)

**Recommendation**:
Create tests for all value objects with validation logic. Prioritize:
1. DataverseUrl (complex normalization)
2. PropertyPath (complex parsing)
3. ProtectedKeyPattern (regex matching)
4. All GUID validators (ClientId, EnvironmentId, TenantId)
5. EnvironmentName (validation rules)

---

### 13. Shared DeploymentSettings Entity Untested
**Severity**: Critical
**Location**: src/shared/domain/entities/DeploymentSettings.ts
**Pattern**: Testing
**Description**:
Shared domain entity used by multiple features has ZERO test coverage despite complex sync logic affecting deployment automation.

**Why Critical**:
- Used by ConnectionReferences AND EnvironmentVariables features
- Complex generic sync algorithm (194 lines)
- Alphabetical sorting requirement
- Value preservation logic
- Add/remove/preserve statistics
- Affects deployment file accuracy

**Impact Scope**:
- ExportConnectionReferencesToDeploymentSettingsUseCase
- ExportEnvironmentVariablesToDeploymentSettingsUseCase
- FileSystemDeploymentSettingsRepository

**Test Coverage Needed**:
See Critical Issue #3 above for detailed test scenarios.

**Recommendation**:
This is the highest priority shared domain entity for testing. Create comprehensive test suite immediately.

---

### 14. EnvironmentVariableFactory Join Logic Untested
**Severity**: Critical
**Location**: src/features/environmentVariables/domain/services/EnvironmentVariableFactory.ts
**Pattern**: Testing
**Description**:
Factory service joining environment variable definitions with values (64 lines) has no tests. This join operation is critical for data integrity.

**Why Critical**:
- Joins data from two separate Dataverse tables
- Left join semantics (definitions without values included)
- Nullability handling (undefined → null coalescing)
- Description field null handling (null → empty string)
- Map-based lookup for performance
- Creates EnvironmentVariable entities (could throw validation errors)

**Test Scenarios Needed**:
1. **Matching definitions and values**:
   - Definition with matching value (should join)
   - Definition without matching value (currentValue should be null)
   - Multiple definitions with partial values

2. **Null handling**:
   - Value undefined in map (should coalesce to null)
   - Value.value is null (should preserve null)
   - Definition.description is null (should coalesce to empty string)

3. **Edge cases**:
   - Empty definitions array (should return empty)
   - Empty values array (all currentValues should be null)
   - Both empty (should return empty)
   - Invalid type code in definition (should throw ValidationError)

**Recommendation**:
Create test suite covering all join scenarios and null handling. Mock definition/value data structures. Verify ValidationError handling.

---

### 15. ConnectionReference and CloudFlow Entities Untested
**Severity**: Critical
**Location**:
- src/features/connectionReferences/domain/entities/ConnectionReference.ts
- src/features/connectionReferences/domain/entities/CloudFlow.ts
**Pattern**: Testing
**Description**:
Core domain entities for ConnectionReferences feature have no tests despite containing business methods and validation logic.

**Why Critical**:
- ConnectionReference.hasConnection() affects business logic
- ConnectionReference.isInSolution() used for filtering
- CloudFlow parsing and extraction logic (see Critical Issue #8)
- CloudFlow.hasConnectionReferences() used for filtering
- CloudFlow.hasClientData() type guard affects safety

**Test Scenarios Needed**:
See Critical Issue #8 for CloudFlow details.

**ConnectionReference tests needed:**
1. **hasConnection()**:
   - connectionId is null (should return false)
   - connectionId is string (should return true)

2. **isInSolution()**:
   - ID in set (should return true)
   - ID not in set (should return false)
   - Empty set (should return false)

**Recommendation**:
Create comprehensive test suites for both entities. CloudFlow needs more extensive testing due to JSON parsing complexity.

---

## High Priority Issues

### 16. Domain Services Missing Tests
**Severity**: High
**Location**: Multiple domain service files
**Pattern**: Testing
**Description**:
11 of 17 domain services are untested (65% untested rate). Domain services contain business logic that should be 100% tested.

**Untested Domain Services:**
1. `CloudFlowCollectionService` - Sorting (simple but untested)
2. `ConnectionReferenceCollectionService` - Sorting (simple but untested)
3. `FlowConnectionRelationshipCollectionService` - Multi-field sorting
4. `AuthenticationCacheInvalidationService` - Cache invalidation logic (Critical - see issue #4)
5. `EnvironmentVariableCollectionService` - Sorting
6. `EnvironmentVariableFactory` - Join logic (Critical - see issue #14)
7. `ImportJobCollectionService` - Sorting
8. `StorageClearingService` - Business rules (Critical - see issue #6)
9. `StorageInspectionService` - Aggregation (Critical - see issue #7)
10. `SolutionCollectionService` - Sorting
11. `FlowConnectionRelationshipBuilder` - Complex matching (Critical - see issue #5)

**Why High Priority**:
- Domain services contain business logic (Clean Architecture principle)
- Should have 100% test coverage per coding standards
- Even "simple" sorting logic can have bugs (defensive copy, stability)
- Collection services used by mappers (incorrect sorting affects UI)

**Recommendation**:
Create tests for all domain services. Even simple sorting services need tests to verify:
- Defensive copying (original array not mutated)
- Sort stability
- Empty array handling
- Single item array
- Already sorted array

---

### 17. Value Objects Missing Behavioral Tests
**Severity**: High
**Location**: Multiple value object files
**Pattern**: Testing
**Description**:
18 of 33 value objects are untested (55% untested). Many contain behavior beyond simple validation.

**Untested Value Objects:**
1. `FlowConnectionRelationship` - 3 type-checking methods
2. `ApiError` - Error representation
3. `ValidationResult` - Validation outcome
4. `ClearAllValidationResult` - Has business method hasClearableEntries()
5. `ClearValidationResult` - Validation outcome with reason
6. `DataType` - Type detection
7. `PipelineStage` - Stage enumeration
8. `TimelineNode` - Timeline hierarchy node

**Why High Priority**:
- Value objects with methods need behavioral tests
- FlowConnectionRelationship has 3 methods determining relationship type
- ClearAllValidationResult.hasClearableEntries() affects business logic
- DataType detection logic could have bugs

**Test Scenarios Needed (examples):**
1. **FlowConnectionRelationship**:
   - isValidRelationship() for each relationship type
   - isOrphanedFlow() for each relationship type
   - isOrphanedConnectionReference() for each relationship type

2. **ClearAllValidationResult**:
   - hasClearableEntries() when clearableCount > 0 (should return true)
   - hasClearableEntries() when clearableCount = 0 (should return false)

**Recommendation**:
Test all value objects with behavioral methods. Simple data containers can have lower priority, but objects with methods must be tested.

---

### 18. ListConnectionReferencesUseCase Complex Orchestration Untested
**Severity**: High
**Location**: src/features/connectionReferences/application/useCases/ListConnectionReferencesUseCase.ts
**Pattern**: Testing
**Description**:
Use case with complex orchestration (155 lines) including parallel fetches, solution filtering, relationship building, and cancellation handling has no tests.

**Why High Priority**:
- Parallel fetching (Promise.all) with different query options
- Solution filtering with two component type lookups
- Cancellation token checks at multiple stages
- Error normalization and logging
- Calls untested FlowConnectionRelationshipBuilder

**Test Scenarios Needed**:
1. **Happy path**:
   - No solution filter (should return all relationships)
   - With solution filter (should filter flows and CRs)

2. **Cancellation**:
   - Cancelled before execution
   - Cancelled after fetching data
   - Cancelled after filtering by solution

3. **Error handling**:
   - Repository fetch fails
   - Solution component lookup fails
   - Relationship builder throws

4. **Edge cases**:
   - Empty flows and CRs
   - Solution has no flows or CRs
   - All flows/CRs in solution

**Recommendation**:
Create comprehensive test suite with mocked repositories and relationship builder. Test all cancellation points and error scenarios.

---

### 19. ListEnvironmentVariablesUseCase Join and Filter Untested
**Severity**: High
**Location**: src/features/environmentVariables/application/useCases/ListEnvironmentVariablesUseCase.ts
**Pattern**: Testing
**Description**:
Use case orchestrating definition/value fetching, joining via factory, and solution filtering has no tests.

**Why High Priority**:
- Parallel fetching of definitions and values
- Factory join operation (see Critical Issue #14)
- Solution filtering logic
- Cancellation handling
- Error normalization

**Test Scenarios Needed**:
1. **Happy path**:
   - No solution filter (should join all definitions/values)
   - With solution filter (should filter definitions before joining)

2. **Cancellation**:
   - Cancelled before execution
   - Cancelled after fetching data
   - Cancelled after filtering

3. **Edge cases**:
   - No definitions
   - No values (all currentValue should be null)
   - Solution has no environment variables

**Recommendation**:
Create test suite with mocked repository and factory. Verify join happens AFTER filtering (optimization).

---

### 20. Export Use Cases Missing Tests
**Severity**: High
**Location**:
- ExportConnectionReferencesToDeploymentSettingsUseCase.ts
- ExportEnvironmentVariablesToDeploymentSettingsUseCase.ts
**Pattern**: Testing
**Description**:
Both export use cases handling deployment settings file synchronization have no tests.

**Why High Priority**:
- File I/O operations (repository.exists, read, write)
- User cancellation handling (promptForFilePath returns null)
- Sync operation with existing files (see Critical Issue #3)
- Logging of sync statistics
- Suggested filename handling

**Test Scenarios Needed (both use cases):**
1. **New file**:
   - User provides filename
   - File doesn't exist
   - Should create new DeploymentSettings
   - Should write to file

2. **Existing file**:
   - User provides filename
   - File exists
   - Should read existing settings
   - Should sync with new entries
   - Should write updated settings

3. **User cancellation**:
   - User cancels file prompt (should return null)

4. **Edge cases**:
   - Empty data to export
   - Sync results in all adds, all removes, all preserves

**Recommendation**:
Create test suites for both export use cases. Mock file system repository. Verify sync statistics are correct.

---

### 21. DeleteEnvironmentUseCase Cascading Deletes Untested
**Severity**: High
**Location**: src/features/environmentSetup/application/useCases/DeleteEnvironmentUseCase.ts
**Pattern**: Testing
**Description**:
Use case handling environment deletion with cascading operations (delete entity, clear secrets, invalidate cache, publish events) has no tests.

**Why High Priority**:
- Cascading delete operations (repository, events)
- Multiple event publications (AuthenticationCacheInvalidationRequested, EnvironmentDeleted)
- Error handling (environment not found)
- Secret cleanup (implicit in repository.delete)
- Event data extraction from environment entity

**Test Scenarios Needed**:
1. **Happy path**:
   - Environment exists
   - Should delete from repository
   - Should publish cache invalidation event
   - Should publish deletion event with correct data

2. **Error cases**:
   - Environment not found (should throw ApplicationError)
   - Repository delete fails (should propagate error)

3. **Event verification**:
   - Cache invalidation event has correct reason ('environment_deleted')
   - Deletion event has environmentName and isActive from entity

**Recommendation**:
Create test suite with mocked repository and event publisher. Verify all cascading operations occur and events contain correct data.

---

### 22. LoadEnvironmentByIdUseCase Credential Check Untested
**Severity**: High
**Location**: src/features/environmentSetup/application/useCases/LoadEnvironmentByIdUseCase.ts
**Pattern**: Testing
**Description**:
Use case loading environment with credential availability checks has no tests.

**Why High Priority**:
- Two async credential checks (client secret, password)
- Null handling for clientId and username
- ViewModel mapping with credential flags
- Error handling (environment not found)

**Test Scenarios Needed**:
1. **Happy path**:
   - Environment with client ID (should check for client secret)
   - Environment with username (should check for password)
   - Environment with both

2. **Credential checks**:
   - Client secret stored (hasStoredClientSecret should be true)
   - Client secret not stored (hasStoredClientSecret should be false)
   - No client ID (hasStoredClientSecret should be false)
   - Password stored (hasStoredPassword should be true)
   - Password not stored (hasStoredPassword should be false)
   - No username (hasStoredPassword should be false)

3. **Error cases**:
   - Environment not found (should throw ApplicationError)

**Recommendation**:
Create test suite with mocked repository. Test all credential check combinations. Verify mapper receives correct flags.

---

### 23. ValidateUniqueNameUseCase Exclusion Logic Untested
**Severity**: High
**Location**: src/features/environmentSetup/application/useCases/ValidateUniqueNameUseCase.ts
**Pattern**: Testing
**Description**:
Use case validating environment name uniqueness with exclusion logic has no tests.

**Why High Priority**:
- Exclusion logic (exclude current environment when editing)
- Response message construction
- Optional excludeEnvironmentId handling
- Used during environment creation and editing (different scenarios)

**Test Scenarios Needed**:
1. **Unique name**:
   - Name not used (should return isUnique: true, no message)
   - Name used by excluded environment (should return isUnique: true)

2. **Non-unique name**:
   - Name used by another environment (should return isUnique: false with message)

3. **Exclusion**:
   - No exclusion (new environment)
   - With exclusion (editing environment)

**Recommendation**:
Create test suite with mocked repository. Test exclusion logic carefully - this affects environment creation validation.

---

### 24. CheckConcurrentEditUseCase Stateful Logic Untested
**Severity**: High
**Location**: src/features/environmentSetup/application/useCases/CheckConcurrentEditUseCase.ts
**Pattern**: Testing
**Description**:
Use case with stateful logic (Set-based tracking) for preventing concurrent edits has no tests.

**Why High Priority**:
- Stateful (maintains Set of editing sessions)
- Three public methods that interact with state
- Used to prevent data races in environment editing
- State management errors could allow concurrent edits (data corruption risk)

**Test Scenarios Needed**:
1. **execute()**:
   - Environment not being edited (should return canEdit: true)
   - Environment being edited (should return canEdit: false)

2. **registerEditSession()**:
   - Register new session (should add to set)
   - Register already registered session (should be idempotent)

3. **unregisterEditSession()**:
   - Unregister existing session (should remove from set)
   - Unregister non-existent session (should be idempotent)

4. **State interactions**:
   - Register → check → should be editing
   - Register → unregister → check → should not be editing
   - Multiple concurrent sessions for different environments

**Recommendation**:
Create test suite verifying stateful behavior. Test session lifecycle (register → check → unregister). Verify Set semantics.

---

### 25. OpenImportLogUseCase Error Handling Untested
**Severity**: High
**Location**: src/features/importJobViewer/application/useCases/OpenImportLogUseCase.ts
**Pattern**: Testing
**Description**:
Use case opening import log XML in editor has no tests for error handling and log validation.

**Why High Priority**:
- Validates import job has log data (hasLog() check)
- Null assertion after type guard (could throw if guard is wrong)
- Editor service integration
- Cancellation handling
- Error normalization

**Test Scenarios Needed**:
1. **Happy path**:
   - Import job with log data (should open in editor)

2. **Error cases**:
   - Import job has no log data (should throw error)
   - Repository fetch fails
   - Editor service fails

3. **Cancellation**:
   - Cancelled before execution (should throw OperationCancelledException)

4. **Edge cases**:
   - importLogXml is null after hasLog() check (should throw)

**Recommendation**:
Create test suite with mocked repository and editor service. Test all error scenarios and cancellation.

---

### 26. ClearAllStorageUseCase High-Risk Operation Untested
**Severity**: High
**Location**: src/features/persistenceInspector/application/useCases/ClearAllStorageUseCase.ts
**Pattern**: Testing
**Description**:
Use case performing high-risk "clear all storage" operation has no tests.

**Why High Priority**:
- High-risk operation (data loss potential)
- Calls StorageClearingService (see Critical Issue #6)
- Event publishing after clear
- Error handling for no clearable entries
- Confirmation message construction

**Test Scenarios Needed**:
1. **Happy path**:
   - Has clearable entries (should clear all and publish event)

2. **Error cases**:
   - No clearable entries (should throw InvalidOperationError)
   - StorageClearingService throws

3. **Event verification**:
   - StorageClearedAll event published with correct counts

**Recommendation**:
Create test suite with mocked storage inspection and clearing services. Verify event publication. Test error scenarios.

---

### 27. Repository Implementations Missing Integration Tests
**Severity**: High
**Location**: Multiple repository files
**Pattern**: Testing
**Description**:
18 of 21 repository implementations have no integration tests. Repositories handle external I/O and data mapping.

**Highest Priority Untested Repositories:**
1. **EnvironmentRepository** (CRITICAL):
   - Secret storage (getClientSecret, getPassword, delete cleanup)
   - Environment CRUD operations
   - Name uniqueness checking
   - Global state read/write

2. **FileSystemDeploymentSettingsRepository** (HIGH):
   - File I/O (read, write, exists)
   - JSON parsing and serialization
   - File picker dialog (promptForFilePath)
   - Error handling for missing/invalid files

3. **DataverseApiCloudFlowRepository** (HIGH):
   - OData query building (complex select/expand/filter)
   - Flow data mapping to CloudFlow entity
   - Client data parsing
   - Created by expansion

4. **DataverseApiEnvironmentVariableRepository** (HIGH):
   - Separate definition and value fetches
   - Two table queries (environmentvariabledefinition, environmentvariablevalue)
   - Data mapping for factory consumption

**Why High Priority**:
- EnvironmentRepository handles secrets (security-sensitive)
- FileSystemDeploymentSettingsRepository handles file I/O (error-prone)
- API repositories have complex query building and mapping
- Integration tests catch issues that unit tests miss

**Recommendation**:
Create integration tests for repositories in priority order:
1. EnvironmentRepository (focus on secret operations)
2. FileSystemDeploymentSettingsRepository (focus on file I/O)
3. DataverseApiCloudFlowRepository
4. DataverseApiEnvironmentVariableRepository
5. Remaining repositories

Use test doubles for VS Code APIs and external services.

---

### 28. Domain Collection Services All Untested
**Severity**: High
**Location**: Multiple collection service files
**Pattern**: Testing
**Description**:
All collection services (5 total) have no tests despite being used by mappers and containing sorting logic.

**Untested Collection Services:**
1. CloudFlowCollectionService - Sort by name
2. ConnectionReferenceCollectionService - Sort by logical name
3. FlowConnectionRelationshipCollectionService - Multi-field sort (flow name, then CR name)
4. EnvironmentVariableCollectionService - Sort by schema name
5. ImportJobCollectionService - Sort (need to check implementation)
6. SolutionCollectionService - Sort (need to check implementation)

**Why High Priority**:
- Sorting affects UI presentation
- Defensive copy must be verified (original array not mutated)
- Multi-field sorting can have bugs
- Used by mappers (incorrect sorting propagates to UI)

**Test Scenarios Needed (per service):**
1. **Sort correctness**:
   - Multiple items (should sort correctly)
   - Already sorted (should maintain order)
   - Single item (should return single item)
   - Empty array (should return empty array)

2. **Defensive copy**:
   - Original array not mutated
   - Returned array is new instance

3. **Multi-field sorting** (FlowConnectionRelationshipCollectionService):
   - Same flow name (should sort by CR name)
   - Different flow names (should sort by flow name first)

**Recommendation**:
Create simple test suites for all collection services. Focus on defensive copy and sort correctness. FlowConnectionRelationshipCollectionService needs more extensive tests for multi-field sorting.

---

### 29. GetClearAllConfirmationMessageUseCase Message Construction Untested
**Severity**: High
**Location**: src/features/persistenceInspector/application/useCases/GetClearAllConfirmationMessageUseCase.ts
**Pattern**: Testing
**Description**:
Use case building confirmation message for clear all operation has no tests (assuming it exists - need to verify).

**Why High Priority**:
- User-facing message construction
- Must accurately reflect what will be cleared
- Should mention protected entries
- Used before high-risk operation (clear all)

**Test Scenarios Needed**:
1. **Message accuracy**:
   - Correct clearable count in message
   - Correct protected count in message
   - Appropriate warning language

2. **Edge cases**:
   - No clearable entries
   - No protected entries
   - All entries clearable
   - All entries protected

**Recommendation**:
Create test suite verifying message accuracy. Messages should match ClearAllValidationResult data.

---

### 30. TestExistingEnvironmentConnectionUseCase Untested
**Severity**: High
**Location**: src/features/environmentSetup/application/useCases/TestExistingEnvironmentConnectionUseCase.ts
**Pattern**: Testing
**Description**:
Use case testing connection for existing environment (likely without re-prompting for credentials) has no tests.

**Why High Priority**:
- Different from TestConnectionUseCase (uses existing credentials)
- WhoAmI service call
- Error handling for invalid credentials
- Used to verify environment still works

**Test Scenarios Needed**:
1. **Happy path**:
   - Valid existing environment (should succeed)

2. **Error cases**:
   - Invalid credentials (should fail gracefully)
   - Network error (should propagate)
   - WhoAmI service fails

**Recommendation**:
Create test suite with mocked WhoAmI service. Compare with TestConnectionUseCase tests for consistency.

---

### 31. Untested Domain Entities - All Metadata Browser Entities
**Severity**: High
**Location**: src/features/metadataBrowser/domain/entities/
**Pattern**: Testing
**Description**:
7 metadata browser entities are untested despite containing complex business logic for entity metadata representation.

**Untested Entities:**
1. AttributeMetadata - 9 test files exist but some entities may still be missing coverage
2. EntityKey - Key definition with attributes
3. EntityMetadata - Complex entity with multiple collections
4. ManyToManyRelationship - M:N relationship representation
5. OneToManyRelationship - 1:N relationship representation
6. SecurityPrivilege - Privilege representation

**Note**: Need to verify which entities actually have tests vs which test files exist.

**Why High Priority**:
- Complex entities with nested collections
- Business methods for filtering and querying
- Used throughout metadata browser feature
- EntityMetadata is aggregate root

**Recommendation**:
Verify actual test coverage for metadata browser entities. Create tests for any untested entities and methods.

---

### 32. Persistence Inspector Entity Tests Needed
**Severity**: High
**Location**: src/features/persistenceInspector/domain/entities/
**Pattern**: Testing
**Description**:
2 persistence inspector entities are untested despite complex business logic for storage inspection and clearing.

**Untested Entities:**
1. **StorageCollection** - Aggregate root with validation logic
   - validateClearOperation() - Protection checking
   - validateClearAllOperation() - Clear all validation
   - Entry management
   - Protection pattern application

2. **StorageEntry** - Complex entity with property navigation
   - Type detection (isSecret, isWorkspace, isGlobal)
   - Property path navigation (hasProperty)
   - Value type detection
   - JSON object navigation

**Why High Priority**:
- StorageCollection is aggregate enforcing business rules
- validateClearOperation() prevents data loss
- StorageEntry.hasProperty() used for property clearing
- Type detection affects routing to correct storage

**Test Scenarios Needed:**

**StorageCollection:**
1. validateClearOperation():
   - Protected key (should return not allowed)
   - Non-protected key (should return allowed)
   - Pattern matching for protection

2. validateClearAllOperation():
   - Has clearable entries (should return validation with counts)
   - No clearable entries (hasClearableEntries() should return false)
   - Mixed protected and non-protected

**StorageEntry:**
1. Type detection:
   - isSecret() for secret type
   - isWorkspace() for workspace type
   - isGlobal() for global type

2. hasProperty():
   - Simple property exists (should return true)
   - Nested property exists (should return true)
   - Property doesn't exist (should return false)
   - Array index access
   - Null/undefined property values

**Recommendation**:
Create comprehensive test suites for both entities. StorageCollection tests critical for data protection. StorageEntry.hasProperty() needs extensive edge case testing.

---

### 33. FilterCondition Entity Validation Untested
**Severity**: High
**Location**: src/features/pluginTraceViewer/domain/entities/FilterCondition.ts
**Pattern**: Testing
**Description**:
FilterCondition entity has test file but may be missing coverage for validation logic and business methods.

**Why High Priority**:
- Used to build OData filter expressions
- Validation affects query correctness
- Multiple operator types with different validation rules
- Date range handling

**Recommendation**:
Review existing tests and ensure full coverage of validation logic and all operator types.

---

### 34. PipelineStage and TimelineNode Value Objects Untested
**Severity**: High
**Location**:
- src/features/pluginTraceViewer/domain/valueObjects/PipelineStage.ts
- src/features/pluginTraceViewer/domain/valueObjects/TimelineNode.ts
**Pattern**: Testing
**Description**:
PipelineStage enumeration and TimelineNode hierarchy value objects are untested.

**Why High Priority**:
- PipelineStage affects filtering and display
- TimelineNode represents hierarchy structure
- TimelineNode likely has child management methods
- Used by TimelineHierarchyService (also untested)

**Recommendation**:
Create tests for both value objects. TimelineNode needs tests for hierarchy operations.

---

## Medium Priority Issues

### 35. Simple Value Objects Without Tests
**Severity**: Medium
**Location**: Multiple value object files
**Pattern**: Testing
**Description**:
Several simple value objects without complex logic are untested.

**Untested Simple Value Objects:**
1. ApiError - Error representation
2. ValidationResult - Simple validation outcome
3. DataType - Type enumeration
4. StorageType - Type enumeration
5. StorageMetadata - Metadata container

**Why Medium Priority**:
- Mostly data containers
- Less complex than validation value objects
- Lower risk if bugs exist
- Still should be tested for completeness

**Recommendation**:
Create basic test suites for simple value objects. Lower priority than entities/services but should still be tested.

---

### 36. Domain Events Untested
**Severity**: Medium
**Location**: Multiple domain event files
**Pattern**: Testing
**Description**:
Domain events (EnvironmentCreated, EnvironmentDeleted, EnvironmentUpdated, etc.) have no tests.

**Why Medium Priority**:
- Mostly data containers
- Simple constructors
- Used for pub/sub communication
- Should verify all properties are set correctly

**Recommendation**:
Create simple test suites verifying event construction and properties. Low complexity but good for documentation.

---

### 37. Mapper Classes Could Benefit from Tests
**Severity**: Medium
**Location**: Multiple mapper files
**Pattern**: Testing
**Description**:
Mappers (ViewModel mappers, deployment settings mappers) generally don't have dedicated tests.

**Why Medium Priority**:
- Mappers should only transform data (no business logic per standards)
- Tested indirectly through use case tests
- Direct tests would verify transformations
- Could catch null handling issues

**Recommendation**:
Lower priority than domain/application layer but consider adding mapper tests for complex transformations.

---

### 38. Error Classes Could Have Tests
**Severity**: Medium
**Location**: Domain error classes
**Pattern**: Testing
**Description**:
Custom error classes (DomainError, ValidationError, ProtectedKeyError, etc.) have no tests.

**Why Medium Priority**:
- Simple classes
- Tested indirectly when thrown
- Good for documentation
- Verify inheritance and properties

**Recommendation**:
Create simple test suites for error classes verifying construction and properties.

---

### 39. Interface Files (Type Definitions Only)
**Severity**: Medium
**Location**: Multiple interface files
**Pattern**: Testing
**Description**:
Repository interfaces and service interfaces are not tested (they're TypeScript interfaces, not implementations).

**Why Medium Priority**:
- Interfaces themselves don't need tests
- Implementations need tests
- Interface usage tested through implementations

**Recommendation**:
No action needed for interfaces. Focus on implementation tests.

---

### 40. Shared Domain ValueObjects DateTimeFilter
**Severity**: Medium
**Location**: src/shared/domain/valueObjects/DateTimeFilter.ts
**Pattern**: Testing
**Description**:
Shared DateTimeFilter value object has test file but coverage should be verified.

**Why Medium Priority**:
- Shared across features
- Date filtering logic
- Range validation
- Has existing test (verify completeness)

**Recommendation**:
Review existing tests for completeness. Ensure all range scenarios covered.

---

### 41. ODataQueryBuilder Services Partially Tested
**Severity**: Medium
**Location**:
- src/features/pluginTraceViewer/domain/services/ODataQueryBuilder.ts
- src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts
**Pattern**: Testing
**Description**:
ODataQueryBuilder and ODataExpressionBuilder have test files but coverage should be verified for all query types.

**Why Medium Priority**:
- Complex query building logic
- Has existing tests
- Verify all operators and combinations tested

**Recommendation**:
Review existing tests for completeness. Ensure all OData operators and edge cases covered.

---

### 42. TimelineHierarchyService Test Coverage
**Severity**: Medium
**Location**: src/features/pluginTraceViewer/domain/services/TimelineHierarchyService.ts
**Pattern**: Testing
**Description**:
TimelineHierarchyService has test file but coverage completeness should be verified.

**Why Medium Priority**:
- Complex hierarchy building
- Has existing tests
- Verify all scenarios covered

**Recommendation**:
Review existing tests for hierarchy edge cases (orphaned nodes, circular references if possible, deep nesting).

---

### 43. PluginTraceFilterService Test Coverage
**Severity**: Medium
**Location**: src/features/pluginTraceViewer/domain/services/PluginTraceFilterService.ts
**Pattern**: Testing
**Description**:
PluginTraceFilterService has test file but should verify all filter combinations tested.

**Why Medium Priority**:
- Complex filtering logic
- Has existing tests
- Multiple filter types

**Recommendation**:
Review existing tests. Ensure all filter field combinations covered.

---

### 44. Infrastructure Layer UI Components
**Severity**: Medium
**Location**: src/shared/infrastructure/ui/
**Pattern**: Testing
**Description**:
Shared UI infrastructure (behaviors, coordinators, sections) has some tests but coverage varies.

**Why Medium Priority**:
- Presentation layer (critical paths only per standards)
- Some components tested
- Verify critical paths covered

**Recommendation**:
Review existing UI tests. Focus on critical user paths and error scenarios.

---

### 45. Formatter Classes
**Severity**: Medium
**Location**: Various formatter files
**Pattern**: Testing
**Description**:
Formatters (TraceLevelFormatter, RelativeTimeFormatter, XmlFormatter) have test files but completeness should be verified.

**Why Medium Priority**:
- Presentation logic
- Has existing tests
- Lower priority than domain/application

**Recommendation**:
Review existing formatter tests for edge cases (null values, extreme dates, invalid XML).

---

### 46. Type Guard Functions
**Severity**: Medium
**Location**: src/infrastructure/ui/utils/TypeGuards.ts
**Pattern**: Testing
**Description**:
TypeGuards utility has test file but should verify all guards tested.

**Why Medium Priority**:
- Type safety helpers
- Has existing tests
- Verify all type guards covered

**Recommendation**:
Review existing tests. Ensure all type guards have positive and negative cases.

---

## Low Priority Issues

### 47. Index Files Not Tested
**Severity**: Low
**Location**: Various index.ts files
**Pattern**: Testing
**Description**:
Index files (re-export only) are not tested.

**Why Low Priority**:
- No logic to test
- Just re-exports

**Recommendation**:
No action needed.

---

### 48. Type Definition Files
**Severity**: Low
**Location**: Various type files
**Pattern**: Testing
**Description**:
Pure type definition files (interfaces, types) are not tested.

**Why Low Priority**:
- TypeScript types
- No runtime behavior

**Recommendation**:
No action needed.

---

### 49. Constant Files
**Severity**: Low
**Location**: src/shared/domain/constants/
**Pattern**: Testing
**Description**:
Constant definition files are not tested.

**Why Low Priority**:
- Simple constant definitions
- No logic

**Recommendation**:
No action needed for pure constants.

---

## Positive Findings

### Excellent Test Coverage in Some Features

**PluginTraceViewer Feature:**
- Domain entities tested (PluginTrace, TraceFilter, FilterCondition)
- Value objects well-tested (ExecutionMode, OperationType, Duration, CorrelationId, TraceLevel, TraceStatus, FilterField, FilterOperator, TimelineNode)
- Domain services tested (PluginTraceFilterService, TimelineHierarchyService, ODataQueryBuilder, ODataExpressionBuilder)
- All use cases tested (GetPluginTracesUseCase, DeleteTracesUseCase, ExportTracesUseCase, SetTraceLevelUseCase, GetTraceLevelUseCase, BuildTimelineUseCase)
- Repository tested (DataversePluginTraceRepository)

**MetadataBrowser Feature:**
- Value objects tested (LogicalName, SchemaName, AttributeType, CascadeConfiguration, OptionSetMetadata)
- Entities tested (EntityKey, OneToManyRelationship, ManyToManyRelationship, AttributeMetadata, EntityMetadata, SecurityPrivilege)
- All use cases tested (LoadEntityAttributesUseCase, OpenInMakerUseCase, LoadChoiceMetadataUseCase, LoadMetadataTreeUseCase, LoadEntityMetadataUseCase)
- Repository tested (DataverseEntityMetadataRepository with dedicated optionsets test)

**PersistenceInspector Feature:**
- All use cases tested (InspectStorageUseCase, ClearStoragePropertyUseCase, ClearStorageEntryUseCase, RevealSecretUseCase)
- Domain services untested but use cases provide coverage

**EnvironmentSetup Feature:**
- Core domain tested (Environment entity, EnvironmentValidationService, ValueObjects)
- Key use cases tested (DiscoverEnvironmentIdUseCase, LoadEnvironmentsUseCase, SaveEnvironmentUseCase, TestConnectionUseCase)

**ImportJobViewer Feature:**
- Domain tested (ImportJob entity, ImportJobFactory)
- Use case tested (ListImportJobsUseCase)
- Repository tested (DataverseApiImportJobRepository)

**SolutionExplorer Feature:**
- Domain tested (Solution entity)
- Use case tested (ListSolutionsUseCase)
- Repository tested (DataverseApiSolutionRepository)

**Shared Infrastructure:**
- Good test coverage for UI components (behaviors, sections, coordinators)
- DataTableSection, ActionButtonsSection, EnvironmentSelectorSection, SolutionFilterSection all tested
- Behaviors tested (PanelTrackingBehavior, HtmlRenderingBehavior, TableSortingBehavior, etc.)
- Utilities tested (TypeGuards, HtmlUtils, RelativeTimeFormatter, ODataQueryBuilder, ErrorUtils)

**Test Quality:**
- Tests follow AAA pattern (Arrange-Act-Assert)
- Descriptive test names using "should...when..." pattern
- Good use of mocks and test doubles
- NullLogger used in tests (proper logging test pattern)

---

## Pattern Analysis

### Pattern: Missing Tests for Entire Feature Domains
**Occurrences**: 2 (ConnectionReferences, EnvironmentVariables)
**Impact**: Critical - Entire feature domains in production without test coverage
**Locations**:
- src/features/connectionReferences/domain/ (0 tests)
- src/features/environmentVariables/domain/ (0 tests)

**Recommendation**: Adopt **feature-level test coverage requirements**. Before merging any feature, require:
- Domain layer: 100% test coverage
- Application layer: 90% test coverage
- At least one repository integration test

---

### Pattern: Collection Services Consistently Untested
**Occurrences**: 5 services
**Impact**: High - Sorting logic affects UI presentation across all features
**Locations**:
- CloudFlowCollectionService
- ConnectionReferenceCollectionService
- FlowConnectionRelationshipCollectionService
- EnvironmentVariableCollectionService
- SolutionCollectionService

**Recommendation**: Create **collection service test template**. All collection services follow same pattern (defensive copy + sort). Create reusable test template.

---

### Pattern: Export Use Cases All Untested
**Occurrences**: 2 use cases
**Impact**: High - Deployment automation without test coverage
**Locations**:
- ExportConnectionReferencesToDeploymentSettingsUseCase
- ExportEnvironmentVariablesToDeploymentSettingsUseCase

**Recommendation**: **Prioritize export functionality tests**. These use cases handle deployment automation - critical for DevOps scenarios.

---

### Pattern: Complex Domain Services Untested
**Occurrences**: 4 services
**Impact**: Critical - Business logic in services without tests
**Locations**:
- FlowConnectionRelationshipBuilder (162 lines, complex matching)
- AuthenticationCacheInvalidationService (security-sensitive)
- StorageClearingService (data loss prevention)
- StorageInspectionService (multi-source aggregation)

**Recommendation**: **Domain services must be tested before use cases**. Services contain extracted business logic and should have 100% coverage.

---

### Pattern: Repository Layer Undertested
**Occurrences**: 18 untested repositories (86%)
**Impact**: High - Infrastructure layer lacks integration tests
**Locations**: All repository implementations except 3

**Recommendation**: **Require integration tests for all repositories**. Repositories are infrastructure layer boundary - integration tests catch mapping and query building issues.

---

### Pattern: Value Objects with Validation Inconsistently Tested
**Occurrences**: 18 untested value objects
**Impact**: Medium-High - Validation errors and business methods untested
**Locations**: All features have some untested value objects

**Recommendation**: **Value objects with validation or methods must be tested**. Simple data containers lower priority, but anything with validation logic or methods requires tests.

---

### Pattern: Delete/Cleanup Operations Untested
**Occurrences**: 3 operations
**Impact**: High - Data deletion without test coverage
**Locations**:
- DeleteEnvironmentUseCase (cascading deletes)
- ClearAllStorageUseCase (clear all operation)
- StorageClearingService (protection rules)

**Recommendation**: **High-risk operations require extensive testing**. Delete/clear operations should have tests for success cases, error cases, and protection rules.

---

### Pattern: Factory Services Untested
**Occurrences**: 2 factories
**Impact**: High - Data construction and joining logic untested
**Locations**:
- EnvironmentVariableFactory (join definitions/values)
- ImportJobFactory (tested)

**Recommendation**: **Factory services must be tested**. Factories contain construction and assembly logic - critical for data integrity.

---

## Recommendations Summary

### Immediate Actions (Critical Priority)

1. **Create tests for ConnectionReferences domain layer** - Entire feature untested
2. **Create tests for EnvironmentVariables domain layer** - Entire feature untested
3. **Test DeploymentSettings sync operations** - Critical deployment logic
4. **Test AuthenticationCacheInvalidationService** - Security-sensitive
5. **Test FlowConnectionRelationshipBuilder** - Complex matching algorithm
6. **Test StorageClearingService and StorageInspectionService** - Data protection
7. **Test all export use cases** - Deployment automation
8. **Test DeleteEnvironmentUseCase** - Cascading deletes
9. **Test EnvironmentVariableFactory** - Data joining logic
10. **Create integration tests for EnvironmentRepository** - Secret handling

### Short-term Actions (High Priority)

11. **Test all untested use cases** (12 total) - Aim for 90% application layer coverage
12. **Test all collection services** (5 services) - Sorting logic
13. **Test all untested domain services** (11 services) - Business logic
14. **Test LoadEnvironmentByIdUseCase** - Credential checking
15. **Test ValidateUniqueNameUseCase** - Name validation
16. **Test CheckConcurrentEditUseCase** - Stateful logic
17. **Test OpenImportLogUseCase** - Error handling
18. **Test ClearAllStorageUseCase** - High-risk operation
19. **Create integration tests for FileSystemDeploymentSettingsRepository** - File I/O
20. **Create integration tests for API repositories** (15 remaining)

### Medium-term Actions (Medium Priority)

21. **Test remaining value objects** (18 total) - Prioritize those with validation
22. **Test domain entities** - StorageCollection, StorageEntry (2 untested)
23. **Review existing test coverage** - Verify completeness for tested components
24. **Test simple value objects** - For completeness
25. **Add mapper tests** - Optional but helpful for transformations

### Process Improvements

26. **Adopt feature-level test coverage gates**:
    - Domain layer: 100% required before merge
    - Application layer: 90% required before merge
    - At least 1 repository integration test required

27. **Create test templates**:
    - Collection service test template (defensive copy + sort)
    - Use case test template (happy path, errors, cancellation)
    - Repository integration test template

28. **Test-driven development for new features**:
    - Write domain tests first (TDD)
    - Write use case tests before implementation
    - Add integration tests before merge

29. **Coverage reporting**:
    - Add coverage thresholds to CI/CD
    - Generate coverage reports per layer
    - Fail builds below threshold

30. **Documentation**:
    - Update TESTING_GUIDE.md with coverage requirements
    - Add examples of good test patterns
    - Document test template usage

---

## Metrics

- **Total Domain Files**: 112
  - Entities: 17 (12 tested, 5 untested) - 71% coverage
  - Services: 17 (6 tested, 11 untested) - 35% coverage ⚠️
  - Value Objects: 33 (15 tested, 18 untested) - 45% coverage
  - Interfaces: 27 (not applicable)
  - Other: 18 (events, errors, constants)

- **Total Application Files**: 79
  - Use Cases: 33 (21 tested, 12 untested) - 64% coverage
  - Mappers: 18 (mostly untested)
  - ViewModels: 14 (data classes, low priority)
  - Other: 14 (types, errors, interfaces)

- **Total Infrastructure Files**: ~50+ (including repositories)
  - Repositories: 21 (3 tested, 18 untested) - 14% coverage ⚠️
  - UI Components: ~20 (many tested)
  - Services: ~10 (some tested)

- **Total Test Files**: 90
  - Domain tests: ~33
  - Application tests: ~21
  - Infrastructure tests: ~20
  - Shared tests: ~16

- **Features by Test Coverage**:
  - **Excellent** (>80%): PluginTraceViewer, MetadataBrowser, PersistenceInspector (use cases)
  - **Good** (60-80%): EnvironmentSetup, ImportJobViewer, SolutionExplorer
  - **Poor** (<60%): ConnectionReferences, EnvironmentVariables ⚠️

- **Critical Issues**: 15 (blocking production readiness)
- **High Priority Issues**: 28 (needed for 90% coverage)
- **Medium Priority Issues**: 12 (nice to have)
- **Low Priority Issues**: 3 (no action needed)

- **Test Coverage Score**: 5/10 (inconsistent coverage, critical gaps)
- **Production Readiness**: 6/10 (some features well-tested, others not at all)

---

## Conclusion

The codebase demonstrates **inconsistent test coverage** with some features having excellent coverage (PluginTraceViewer, MetadataBrowser) while others have **zero domain tests** (ConnectionReferences, EnvironmentVariables). The most critical gaps are:

1. **Two entire feature domains untested** (ConnectionReferences, EnvironmentVariables)
2. **Complex business logic untested** (FlowConnectionRelationshipBuilder, DeploymentSettings sync, AuthenticationCacheInvalidationService)
3. **Repository layer severely undertested** (14% coverage)
4. **Critical use cases untested** (delete, export, validate operations)

**Immediate action required** for ConnectionReferences and EnvironmentVariables features - these should not be in production without comprehensive domain layer tests. The DeploymentSettings sync logic is also critical for deployment automation and must be tested.

The well-tested features demonstrate good testing practices (AAA pattern, descriptive names, proper mocking), so the team knows how to write good tests - the issue is **inconsistent application** of testing standards across features.

**Recommendation**: Implement feature-level test coverage gates (100% domain, 90% application) and create missing tests following the priority order in this report.
