# Implementation Plan: Security & Test Improvements

**Created**: November 24, 2025
**Status**: Approved
**Estimated Effort**: 50-60 hours (1.5-2 weeks)

---

## Overview

This plan addresses:
1. **SEC-3**: Secret revelation confirmation (security hardening)
2. **Test Quality**: Fix brittle test patterns (TQ-1, TQ-2)
3. **Test Coverage**: Comprehensive coverage for high-risk components (TC-1 through TC-10)

---

## Phase 1: Security - Secret Revelation Confirmation (2 hours)

### SEC-3: Add Confirmation Dialog for Secret Revelation

**Priority**: High
**Effort**: 2 hours
**Risk**: Low (isolated change)

#### Current Behavior
- `RevealSecretUseCase` executes immediately without user confirmation
- Secrets revealed with single button click in Persistence Inspector panel
- No audit trail or additional authorization

#### Proposed Solution

**Step 1: Update RevealSecretUseCase** (30 minutes)
```typescript
// src/features/persistenceInspector/application/useCases/RevealSecretUseCase.ts

export class RevealSecretUseCase {
    /**
     * Reveals the actual value of a secret storage entry
     * REQUIRES: User confirmation before execution
     * @param key Secret storage key to reveal
     * @param confirmed Whether user has confirmed the action
     * @returns The revealed secret value
     */
    public async execute(key: string, confirmed: boolean): Promise<string> {
        this.logger.debug('RevealSecretUseCase: Revealing secret', { key });

        // NEW: Require confirmation
        if (!confirmed) {
            throw new ApplicationError('Secret revelation requires user confirmation');
        }

        try {
            const value = await this.storageInspectionService.revealSecret(key);

            if (value === undefined) {
                this.logger.warn('Secret not found', { key });
                throw new Error(`Secret not found: ${key}`);
            }

            this.eventPublisher.publish(new SecretRevealed(key));
            this.logger.info('Secret revealed', { key }); // Audit trail

            return value;
        } catch (error) {
            this.logger.error('RevealSecretUseCase: Failed to reveal secret', error);
            throw error;
        }
    }
}
```

**Step 2: Update PersistenceInspectorPanelComposed** (1 hour)
```typescript
// src/features/persistenceInspector/presentation/panels/PersistenceInspectorPanelComposed.ts

private async handleRevealSecret(message: RevealSecretMessage): Promise<void> {
    try {
        const key = message.key;

        // NEW: Show confirmation dialog
        const confirmation = await vscode.window.showWarningMessage(
            `Reveal secret value for "${key}"?`,
            {
                modal: true,
                detail: 'This will expose the masked secret value in the panel. This action will be logged.'
            },
            'Reveal Secret'
        );

        if (confirmation !== 'Reveal Secret') {
            // User cancelled
            this.panel.webview.postMessage({
                type: 'revealSecretCancelled',
                key
            });
            return;
        }

        // Execute with confirmation flag
        const value = await this.revealSecretUseCase.execute(key, true);

        // Send revealed value to webview
        this.panel.webview.postMessage({
            type: 'secretRevealed',
            key,
            value
        });
    } catch (error) {
        this.logger.error('Failed to reveal secret', error);
        vscode.window.showErrorMessage(
            `Failed to reveal secret: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}
```

**Step 3: Update Tests** (30 minutes)
- Update `RevealSecretUseCase.test.ts` to test confirmation requirement
- Add test case for `confirmed: false` (should throw)
- Update integration test for confirmation dialog

**Testing Checklist**:
- [ ] Unit test: `execute()` throws when `confirmed: false`
- [ ] Unit test: `execute()` succeeds when `confirmed: true`
- [ ] Integration test: Confirmation dialog appears
- [ ] Integration test: Cancelling dialog does not reveal secret
- [ ] Integration test: Confirming dialog reveals secret
- [ ] Manual test (F5): Verify user experience

**Deliverables**:
- Modified `RevealSecretUseCase.ts`
- Modified `PersistenceInspectorPanelComposed.ts`
- Updated tests
- Manual testing complete

---

## Phase 2: Test Quality Improvements (12 hours)

### TQ-2: Replace Brittle Mock Call Index Assertions (6 hours)

**Priority**: High
**Effort**: 6 hours
**Files Affected**: 20+ test files

#### Problem
```typescript
// ❌ Brittle - breaks when call order changes
expect(mockLogger.info).toHaveBeenCalledTimes(2);
expect(mockLogger.info.mock.calls[0][0]).toBe('Loading solutions');
expect(mockLogger.info.mock.calls[1][0]).toBe('Solutions loaded');
```

#### Solution
```typescript
// ✅ Robust - order-independent
expect(mockLogger.info).toHaveBeenCalledWith(
    'Loading solutions',
    expect.anything()
);
expect(mockLogger.info).toHaveBeenCalledWith(
    'Solutions loaded',
    expect.objectContaining({
        count: expect.any(Number)
    })
);
```

#### Implementation Strategy

**Step 1: Create Helper Utilities** (1 hour)
```typescript
// src/__tests__/helpers/assertionHelpers.ts

/**
 * Asserts that a mock was called with specific arguments (order-independent)
 */
export function expectCalledWithArgs<T extends (...args: any[]) => any>(
    mock: jest.MockedFunction<T>,
    ...expectedArgs: Parameters<T>
): void {
    expect(mock).toHaveBeenCalledWith(...expectedArgs);
}

/**
 * Asserts that logger was called with message and optional metadata
 */
export function expectLoggerCalledWith(
    logger: jest.Mocked<ILogger>,
    level: 'info' | 'debug' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>
): void {
    if (metadata) {
        expect(logger[level]).toHaveBeenCalledWith(message, expect.objectContaining(metadata));
    } else {
        expect(logger[level]).toHaveBeenCalledWith(message, expect.anything());
    }
}
```

**Step 2: Update Test Files Systematically** (5 hours)
- Process 4 files per hour (20 files total)
- For each file:
  1. Identify all `mock.calls[index]` patterns
  2. Replace with `expect.objectContaining()` or helper
  3. Run tests to verify
  4. Commit changes

**Priority Order** (process in this order):
1. Use case tests (most important)
2. Service tests
3. Repository tests
4. Mapper tests
5. Integration tests

**Affected Files** (sample):
- `FileSystemDeploymentSettingsRepository.test.ts`
- `DataversePluginTraceRepository.test.ts`
- `ConnectionReferencesPanelComposed.integration.test.ts`
- `SolutionFilterBehavior.test.ts`
- `HtmlRenderingBehavior.test.ts`
- `ListSolutionsUseCase.test.ts`
- `ListImportJobsUseCase.test.ts`
- (Plus 13+ more)

**Testing**: Run `npm test` after each file to ensure no regressions

### TQ-1: Audit and Fix setTimeout Usage (6 hours)

**Priority**: Medium
**Effort**: 6 hours
**Files Affected**: 24 files

#### Audit Process

**Step 1: Categorize setTimeout Usage** (2 hours)
- Read all 24 files
- Categorize each usage:
  - **Type A**: Testing async behavior (should use fake timers)
  - **Type B**: Integration tests with real timing (acceptable)
  - **Type C**: Workarounds for race conditions (needs investigation)

**Step 2: Fix Type A Usage** (3 hours)
```typescript
// ❌ Before: Real timers
it('should handle timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(result).toBeDefined();
});

// ✅ After: Fake timers
it('should handle timeout', async () => {
    jest.useFakeTimers();

    const promise = useCase.execute();

    jest.advanceTimersByTime(100);
    await promise;

    expect(result).toBeDefined();

    jest.useRealTimers();
});
```

**Step 3: Document Type B & C** (1 hour)
- Add comments explaining why real timers are necessary
- Create JIRA tickets for Type C workarounds

**Affected Files** (from grep results):
- Integration test files (likely Type B - acceptable)
- Domain event tests (likely Type A - needs fixing)
- Async use case tests (needs case-by-case evaluation)

---

## Phase 3: Comprehensive Test Coverage (36-40 hours)

### High Priority Mappers (16 hours)

#### TC-2: AttributeMetadataMapper Tests (4 hours)

**File**: `src/features/metadataBrowser/application/mappers/AttributeMetadataMapper.ts`
**Complexity**: High (handles 20+ attribute types)
**Current Coverage**: 0%
**Target Coverage**: 90%+

**Test Structure**:
```typescript
describe('AttributeMetadataMapper', () => {
    describe('String attributes', () => {
        it('should map StringAttributeMetadata with maxLength');
        it('should map StringAttributeMetadata without maxLength');
        it('should handle formatName (Email, Text, TextArea, Url, etc.)');
    });

    describe('Picklist attributes', () => {
        it('should map PicklistAttributeMetadata with options');
        it('should map MultiSelectPicklistAttributeMetadata');
        it('should map StatusAttributeMetadata');
        it('should map StateAttributeMetadata');
    });

    describe('Lookup attributes', () => {
        it('should map LookupAttributeMetadata with single target');
        it('should map LookupAttributeMetadata with multiple targets');
    });

    describe('Numeric attributes', () => {
        it('should map IntegerAttributeMetadata');
        it('should map DecimalAttributeMetadata');
        it('should map DoubleAttributeMetadata');
        it('should map MoneyAttributeMetadata');
    });

    describe('Date/Time attributes', () => {
        it('should map DateTimeAttributeMetadata');
    });

    describe('Boolean attributes', () => {
        it('should map BooleanAttributeMetadata');
    });

    describe('Other attribute types', () => {
        it('should map MemoAttributeMetadata');
        it('should map ImageAttributeMetadata');
        it('should map FileAttributeMetadata');
        it('should map UniqueIdentifierAttributeMetadata');
    });

    describe('Common properties', () => {
        it('should map isRequired correctly');
        it('should map isPrimaryId correctly');
        it('should map isPrimaryName correctly');
        it('should map description when present');
    });
});
```

**Test Data Factories**:
```typescript
// __tests__/factories/AttributeMetadataFactory.ts
export function createStringAttribute(overrides?: Partial<StringAttributeMetadata>): StringAttributeMetadata {
    return {
        '@odata.type': '#Microsoft.Dynamics.CRM.StringAttributeMetadata',
        LogicalName: 'test_string',
        DisplayName: { UserLocalizedLabel: { Label: 'Test String' } },
        AttributeType: 'String',
        MaxLength: 100,
        FormatName: { Value: 'Text' },
        ...overrides
    };
}
```

#### TC-3: EntityMetadataMapper Tests (4 hours)

**File**: `src/features/metadataBrowser/application/mappers/EntityMetadataMapper.ts`
**Complexity**: High (top-level composition, coordinates multiple mappers)
**Current Coverage**: 0%
**Target Coverage**: 90%+

**Test Structure**:
```typescript
describe('EntityMetadataMapper', () => {
    describe('toViewModel', () => {
        it('should map basic entity properties');
        it('should map entity with attributes');
        it('should map entity with relationships');
        it('should map entity with keys');
        it('should map entity with all components');
        it('should handle missing optional components');
    });

    describe('Attribute mapping integration', () => {
        it('should delegate attribute mapping to AttributeMetadataMapper');
        it('should handle empty attributes array');
    });

    describe('Relationship mapping integration', () => {
        it('should delegate relationship mapping to RelationshipMetadataMapper');
        it('should handle empty relationships array');
    });

    describe('Key mapping integration', () => {
        it('should delegate key mapping to EntityKeyMapper');
        it('should handle empty keys array');
    });
});
```

#### TC-6: OptionSetMetadataMapper Tests (3 hours)

**File**: `src/features/metadataBrowser/application/mappers/OptionSetMetadataMapper.ts`
**Complexity**: Medium (complex priority logic for option ordering)
**Current Coverage**: 0%
**Target Coverage**: 90%+

**Test Focus**:
- Global vs local option sets
- Option ordering (priority-based)
- Option labels and values
- Edge cases (empty option sets, missing metadata)

#### TC-4: RelationshipMetadataMapper Tests (2 hours)

**File**: `src/features/metadataBrowser/application/mappers/RelationshipMetadataMapper.ts`
**Complexity**: Medium (cascade configurations)
**Current Coverage**: 0%
**Target Coverage**: 90%+

#### TC-5: EntityKeyMapper Tests (1 hour)

**File**: `src/features/metadataBrowser/application/mappers/EntityKeyMapper.ts`
**Complexity**: Low (straightforward mapping)
**Current Coverage**: 0%
**Target Coverage**: 90%+

#### TC-1: EnvironmentDomainMapper Tests (2 hours)

**File**: `src/features/environmentSetup/application/mappers/EnvironmentDomainMapper.ts`
**Complexity**: Medium (bidirectional mapping, handles multiple auth methods)
**Current Coverage**: 0%
**Target Coverage**: 90%+

**Test Structure**:
```typescript
describe('EnvironmentDomainMapper', () => {
    describe('toDomain', () => {
        it('should map ViewModel to Environment entity');
        it('should handle OAuth Client Secret auth method');
        it('should handle OAuth Username/Password auth method');
        it('should handle OAuth Device Code auth method');
        it('should throw on invalid auth method');
    });

    describe('toViewModel', () => {
        it('should map Environment entity to ViewModel');
        it('should map all auth methods correctly');
        it('should handle optional fields (Power Platform ID)');
    });

    describe('Bidirectional mapping', () => {
        it('should maintain data integrity: domain -> VM -> domain');
        it('should maintain data integrity: VM -> domain -> VM');
    });
});
```

### Critical Infrastructure (8 hours)

#### TC-7: FileSystemDeploymentSettingsRepository Tests (2 hours)

**File**: `src/shared/infrastructure/repositories/FileSystemDeploymentSettingsRepository.ts`
**Complexity**: Medium (JSON parsing, file I/O, error handling)
**Current Coverage**: Partial (has some tests already)
**Target Coverage**: 90%+

**Additional Test Cases Needed**:
```typescript
describe('FileSystemDeploymentSettingsRepository', () => {
    describe('read', () => {
        it('should handle malformed JSON gracefully');
        it('should handle corrupted JSON (truncated)');
        it('should handle JSON with unexpected structure');
        it('should handle very large files (>10MB)');
        it('should handle concurrent reads');
    });

    describe('write', () => {
        it('should handle file write failures');
        it('should handle concurrent writes (last-write-wins)');
        it('should create directory if missing');
    });
});
```

#### TC-8: StorageInspectionService Tests (3 hours)

**File**: `src/features/persistenceInspector/domain/services/StorageInspectionService.ts`
**Complexity**: High (coordinates multiple storage readers)
**Current Coverage**: 0%
**Target Coverage**: 90%+

**Test Structure**:
```typescript
describe('StorageInspectionService', () => {
    describe('inspectAll', () => {
        it('should read from globalState storage');
        it('should read from workspaceState storage');
        it('should read from secretStorage');
        it('should combine results from all storages');
        it('should handle storage read failures gracefully');
    });

    describe('revealSecret', () => {
        it('should reveal secret from secretStorage');
        it('should throw when secret not found');
        it('should handle secretStorage read errors');
    });

    describe('Edge cases', () => {
        it('should handle empty storages');
        it('should handle storage with undefined values');
        it('should handle storage with null values');
    });
});
```

#### TC-9: PluginTraceViewModelMapper Tests (2 hours)

**File**: `src/features/pluginTraceViewer/application/mappers/PluginTraceViewModelMapper.ts`
**Complexity**: Medium (presentation formatting)
**Current Coverage**: 0%
**Target Coverage**: 90%+

#### TC-10: TimelineViewModelMapper Tests (1 hour)

**File**: `src/features/pluginTraceViewer/application/mappers/TimelineViewModelMapper.ts`
**Complexity**: Low (straightforward hierarchy mapping)
**Current Coverage**: 0%
**Target Coverage**: 90%+

### Medium Priority Coverage (12-16 hours)

#### TC-11: MsalAuthenticationService Tests (12 hours)

**File**: `src/features/environmentSetup/infrastructure/services/MsalAuthenticationService.ts`
**Complexity**: Very High (670 lines, 4 auth flows, caching, error handling)
**Current Coverage**: 0%
**Target Coverage**: 80%+ (lower target due to complexity)

**Test Strategy**:
- Mock MSAL library extensively
- Focus on each auth flow independently
- Test caching behavior
- Test error scenarios

**Note**: This is the largest single testing effort. Consider breaking into smaller tasks.

#### TC-12 through TC-19: Other Services (4 hours total)

Lower priority services with simpler logic:
- PowerPlatformApiService (2h)
- WhoAmIService (1h)
- VsCodeEventPublisher (30m)
- MakerUrlBuilder (30m)
- Others as time permits

---

## Implementation Schedule

### Week 1: Security & Test Quality

**Days 1-2** (16 hours):
- SEC-3: Secret revelation confirmation (2h)
- TQ-2: Replace brittle mock assertions (14h remaining from 6h estimate + buffer)

**Days 3-4** (16 hours):
- TQ-1: Audit and fix setTimeout usage (6h)
- Start TC-2: AttributeMetadataMapper tests (10h progress)

### Week 2: Test Coverage - Mappers

**Days 5-7** (24 hours):
- Complete TC-2: AttributeMetadataMapper (remaining)
- TC-3: EntityMetadataMapper tests (4h)
- TC-6: OptionSetMetadataMapper tests (3h)
- TC-4: RelationshipMetadataMapper tests (2h)
- TC-5: EntityKeyMapper tests (1h)
- TC-1: EnvironmentDomainMapper tests (2h)
- Start TC-7: FileSystemDeploymentSettingsRepository (partial)

### Week 3: Test Coverage - Infrastructure

**Days 8-10** (20 hours):
- Complete TC-7: FileSystemDeploymentSettingsRepository
- TC-8: StorageInspectionService tests (3h)
- TC-9: PluginTraceViewModelMapper tests (2h)
- TC-10: TimelineViewModelMapper tests (1h)
- TC-11: MsalAuthenticationService tests (start, aim for 50% coverage)

**Remaining items** (TC-12 through TC-19):
- Defer to maintenance backlog or next sprint

---

## Success Criteria

### Phase 1: Security
- [ ] Secret revelation requires confirmation dialog
- [ ] Unit tests pass for confirmation requirement
- [ ] Integration tests pass
- [ ] Manual F5 testing confirms good UX

### Phase 2: Test Quality
- [ ] Zero `mock.calls[index]` patterns in use case tests
- [ ] <5 remaining in other test files (documented exceptions)
- [ ] setTimeout usage categorized (Type A fixed, Type B/C documented)
- [ ] All tests still passing

### Phase 3: Test Coverage
- [ ] AttributeMetadataMapper: 90%+ coverage
- [ ] EntityMetadataMapper: 90%+ coverage
- [ ] OptionSetMetadataMapper: 90%+ coverage
- [ ] RelationshipMetadataMapper: 90%+ coverage
- [ ] EntityKeyMapper: 90%+ coverage
- [ ] EnvironmentDomainMapper: 90%+ coverage
- [ ] FileSystemDeploymentSettingsRepository: 90%+ coverage
- [ ] StorageInspectionService: 90%+ coverage
- [ ] Overall domain/application layer coverage: >80%

---

## Risk Mitigation

### Risks

1. **Test coverage taking longer than estimated**
   - *Mitigation*: Prioritize high-risk components first (mappers, infrastructure)
   - *Fallback*: Defer TC-11 (MsalAuthenticationService) to next sprint

2. **Breaking existing functionality**
   - *Mitigation*: Run `npm test` after each change
   - *Mitigation*: Commit frequently with descriptive messages
   - *Mitigation*: Manual F5 testing for critical paths

3. **Discovering bugs during testing**
   - *Mitigation*: Write failing test first, fix bug, verify test passes (TDD)
   - *Mitigation*: Track bugs separately from test coverage tasks

### Rollback Plan

If any phase fails:
- Phase 1: Revert SEC-3 changes (isolated, minimal risk)
- Phase 2: Complete file-by-file; can stop at any point
- Phase 3: Complete mapper-by-mapper; partial coverage still valuable

---

## Dependencies

- No external dependencies
- No breaking changes
- All work in existing test infrastructure
- Uses existing Jest configuration

---

## Deliverables

1. **Code Changes**:
   - Modified RevealSecretUseCase.ts
   - Modified PersistenceInspectorPanelComposed.ts
   - 20+ test files updated (mock assertions)
   - 24 test files audited (setTimeout)
   - 10+ new test files created (coverage)

2. **Documentation**:
   - Test helper utilities documented
   - setTimeout usage categorized
   - Coverage reports generated

3. **Metrics**:
   - Overall test coverage: Target 80%+ (domain + application)
   - Test quality: Zero brittle mock patterns in critical tests
   - Security: 100% of secret operations require confirmation

---

## Next Steps

1. Review and approve this plan
2. Create feature branch: `feature/security-and-test-improvements`
3. Begin Phase 1: SEC-3 implementation
4. Daily standups to track progress
5. Weekly review to adjust schedule if needed
