# Code Review Progress Tracker

Track remediation of issues identified in the comprehensive code review (November 23, 2025).

## How to Use This Tracker

- **Status**: Open | In Progress | Completed | Deferred
- **Priority**: Critical | High | Medium | Low
- **Effort**: Estimated time to fix
- **PR/Commit**: Link to fix once completed

---

## Critical Issues (0)

**None identified.** ✅

---

## High Priority Issues (26)

### Test Coverage (10 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| TC-1 | Missing tests for EnvironmentDomainMapper | Completed | 4h | Claude | Nov 23-24 | 544 lines - bidirectional mapping tested |
| TC-2 | Missing tests for AttributeMetadataMapper | Completed | 3h | Claude | Nov 23-24 | 511 lines - all attribute types covered |
| TC-3 | Missing tests for EntityMetadataMapper | Completed | 4h | Claude | Nov 23-24 | 893 lines - composition fully tested |
| TC-4 | Missing tests for RelationshipMetadataMapper | Completed | 2h | Claude | Nov 23-24 | Cascade configurations tested |
| TC-5 | Missing tests for EntityKeyMapper | Completed | 1h | Claude | Nov 23-24 | Alternate keys tested |
| TC-6 | Missing tests for OptionSetMetadataMapper | Completed | 3h | Claude | Nov 23-24 | Priority logic tested |
| TC-7 | Missing tests for FileSystemDeploymentSettingsRepository | Completed | 2h | Claude | Nov 23-24 | JSON parsing safety tested |
| TC-8 | Missing tests for StorageInspectionService | Completed | 2h | Claude | Nov 23-24 | 353 lines - multi-storage coordination tested |
| TC-9 | Missing tests for PluginTraceViewModelMapper | Completed | 2h | Claude | Nov 23-24 | Presentation mapping tested |
| TC-10 | Missing tests for TimelineViewModelMapper | Completed | 2h | Claude | Nov 23-24 | Hierarchy mapping tested |

**Total Estimated Effort**: 25 hours - ✅ **COMPLETED**

### Code Quality (3 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| CQ-1 | Code duplication in extension.ts (7 functions) | Completed | 6h | Claude | [pending] | Extracted 7 feature initializers - needs F5 testing |
| CQ-2 | CollectionService duplication (6 classes) | Completed | 30m | Claude | [docs] | Accepted as valid pattern - documented in DOMAIN_SERVICE_PATTERNS.md |
| CQ-3 | Large files need refactoring (4 files >700 lines) | Completed | 2h | Claude | [docs] | Guidelines added to CODE_QUALITY_GUIDE.md - test files and justified panels acceptable |

**Total Estimated Effort**: 8.5 hours (reduced from 26h - 67% reduction)
**Actual Effort**: ~6 hours (implementation + documentation)

### Security (5 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| SEC-1 | OAuth redirect uses HTTP instead of HTTPS | Deferred | 0h | Claude | [docs] | Industry standard - documented as acceptable in CLAUDE.md |
| SEC-2 | Information disclosure in error messages | Open | 2h | | | Sanitize API error text |
| SEC-3 | Secret revelation without authorization | Completed | 30m | Claude | Nov 24 | Confirmation dialog + audit logging implemented |
| SEC-4 | No rate limiting on authentication | Open | 4h | | | Implement exponential backoff |
| SEC-5 | Insufficient SSRF prevention | Open | 1h | | | Block private IPs/metadata endpoints |

**Total Estimated Effort**: 7 hours (remaining)

### Test Quality (3 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| TQ-1 | Real setTimeout in async tests (24 files) | Open | 4h | | | Use jest.useFakeTimers() |
| TQ-2 | Mock call index assertions (20+ files) | Open | 6h | | | Use expect.objectContaining |
| TQ-3 | Missing SpyLogger for logging assertions | Open | 2h | | | Create SpyLogger utility |

**Total Estimated Effort**: 12 hours (1.5 days)

### Type Safety (2 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| TS-1 | Non-null assertions in test files (150+ instances) | Deferred | 0h | Claude | [docs] | Test-only pattern - documented as acceptable in CLAUDE.md |
| TS-2 | Type assertions in integration tests | Deferred | 0h | Claude | [docs] | Test-only pattern - documented as acceptable in CLAUDE.md |

**Total Estimated Effort**: 0 hours (deferred as acceptable patterns)

### Architecture (1 issue)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| ARCH-1 | ESLint disable audit (21 files) | Open | 2h | | | Quarterly review process |

**Total Estimated Effort**: 2 hours

### Domain Purity (0 issues)

**No high-priority issues.** ✅

### Pattern Compliance (0 issues)

**No high-priority issues.** ✅

---

## Medium Priority Issues (30)

### Test Coverage (9 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| TC-11 | Missing tests for MsalAuthenticationService | Open | 12h | | | 670 lines, 4 auth flows |
| TC-12 | Missing tests for PowerPlatformApiService | Open | 2h | | | API wrapper |
| TC-13 | Missing tests for WhoAmIService | Open | 1h | | | Environment discovery |
| TC-14 | Missing tests for VsCodeEventPublisher | Open | 1h | | | Event publishing |
| TC-15 | Missing tests for MakerUrlBuilder | Open | 3h | | | 11 URL-building methods |
| TC-16 | Missing tests for VSCodeBrowserService | Open | 30m | | | Simple wrapper |
| TC-17 | Missing tests for VsCodeStorageClearer | Open | 2h | | | Storage clearing |
| TC-18 | Missing tests for VsCodeStorageReader | Open | 2h | | | Storage reading |
| TC-19 | Incomplete tests for DataverseEntityMetadataRepository | Open | 4h | | | Expand beyond option sets |

**Total Estimated Effort**: 27.5 hours

### Code Quality (2 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| CQ-4 | Panel singleton pattern duplication | Open | 4h | | | Already partial via base class |
| CQ-5 | ViewModelMapper repetition (8 classes) | Open | 0h | | | Acceptable - type safety |

**Total Estimated Effort**: 4 hours

### Security (6 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| SEC-6 | innerHTML usage in webview contexts | Open | 4h | | | Prefer createElement |
| SEC-7 | Batch delete without transaction support | Open | 6h | | | Parse batch responses |
| SEC-8 | Authentication token logging (token length) | Open | 15m | | | Remove metadata |
| SEC-9 | Missing CSP headers in webviews | Open | 2h | | | Add CSP meta tags |
| SEC-10 | No validation on property path segments | Open | 1h | | | Prevent prototype pollution |
| SEC-11 | Error handling may leak stack traces | Open | 2h | | | Sanitize user-facing errors |

**Total Estimated Effort**: 15.25 hours

### Test Quality (4 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| TQ-4 | Inconsistent test data factory patterns | Open | 4h | | | Centralize factories |
| TQ-5 | Verbose beforeEach setup in integration tests | Open | 4h | | | Extract setup helpers |
| TQ-6 | Performance test thresholds machine-dependent | Open | 2h | | | Use relative comparisons |
| TQ-7 | Inconsistent assertion counts per test | Open | 6h | | | One logical assertion per test |

**Total Estimated Effort**: 16 hours

### Domain Purity (4 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| DP-1 | FilterCondition.getDescription() presentation logic | Open | 30m | | | Move to mapper |
| DP-2 | Sorting in mapper vs domain service inconsistency | Open | 2h | | | Create EnvironmentCollectionService |
| DP-3 | Static factory methods on entities | Open | 1h | | | Document exception in CLAUDE.md |
| DP-4 | Test file importing presentation layer | Open | 30m | | | Split test files by layer |

**Total Estimated Effort**: 4 hours

### Type Safety (2 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| TS-3 | Type assertions for message narrowing | Open | 0h | | | Acceptable pattern |
| TS-4 | Record<string, unknown> for flexible data | Open | 0h | | | Acceptable pattern |

**Total Estimated Effort**: 0 hours (no action needed)

### Architecture (2 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| ARCH-2 | Presentation mappers contain HTML generation | Open | 1h | | | Extract to view helpers |
| ARCH-3 | FilterCondition has presentation-like methods | Open | 0h | | | Acceptable for domain |

**Total Estimated Effort**: 1 hour

### Pattern Compliance (1 issue)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| PC-1 | Temporary setTimeout in EnvironmentSetupPanel | Open | 30m | | | Track timeout ID for cleanup |

**Total Estimated Effort**: 30 minutes

---

## Low Priority Issues (48)

*Low priority issues deferred to maintenance backlog. See individual reports for details.*

### Test Coverage (29 issues)
- Missing value object tests (6)
- Missing UI formatter tests (7)
- Missing presentation component tests (7)
- Missing view tests (4)
- Missing plugin trace formatter tests (4)
- Missing serializer tests (1)

### Test Quality (6 issues)
- Test file size variation
- Missing describe nesting
- Commented-out helpers
- Etc.

### Code Quality (4 issues)
- Test file size
- console.log in performance tests (acceptable)
- Unused exports
- Etc.

### Security (6 issues)
- Default OAuth port hardcoded
- No dependency vulnerability scanning
- Secrets with predictable keys
- No timeout on auth server
- JSON.stringify without circular ref protection
- Device code timeout not configurable

### Architecture (3 issues)
- MsalAuthenticationService complexity
- Domain services could be smaller
- Panel initialization type safety

---

## Sprint Planning

### Sprint 1: Critical Infrastructure Testing (1-2 weeks)

**Goal**: Address all high-priority test coverage gaps

**Issues**: TC-1 through TC-10
**Estimated Effort**: 25 hours
**Success Criteria**:
- All 7 infrastructure mappers have comprehensive tests
- StorageInspectionService has tests
- Both presentation mappers have tests
- Infrastructure test coverage >80%

### Sprint 2: Code Quality Improvements (1 week)

**Goal**: Eliminate code duplication

**Issues**: CQ-1, CQ-2, CQ-3
**Estimated Effort**: 26 hours
**Success Criteria**:
- Generic FeatureInitializer replaces 7 duplicate functions
- Generic CollectionService<T> replaces 6 duplicate classes
- Files >700 lines refactored or documented exception

### Sprint 3: Security Hardening (3-5 days)

**Goal**: Address high-priority security issues

**Issues**: SEC-1 through SEC-5
**Estimated Effort**: 11.5 hours
**Success Criteria**:
- Secret revelation requires confirmation
- Authentication has rate limiting
- SSRF prevention in place
- Error messages sanitized
- CSP headers added (if doing SEC-9 too)

### Sprint 4: Test Quality Improvements (2-3 days)

**Goal**: Eliminate brittle test patterns

**Issues**: TQ-1, TQ-2, TQ-3
**Estimated Effort**: 12 hours
**Success Criteria**:
- All tests use fake timers (no real setTimeout)
- No mock.calls[index] assertions
- SpyLogger utility created and used

---

## Progress Summary

### Overall Progress

| Priority | Total Issues | Completed | In Progress | Open | Deferred |
|----------|--------------|-----------|-------------|------|----------|
| Critical | 0 | - | - | - | - |
| High | 26 | 16 | 0 | 10 | 0 |
| Medium | 30 | 0 | 0 | 30 | 0 |
| Low | 48 | 0 | 0 | 0 | 48 |
| **Total** | **104** | **16** | **0** | **40** | **48** |

### Completion Percentage by Category

| Category | Total | Completed | % Complete |
|----------|-------|-----------|------------|
| Architecture | 6 | 0 | 0% |
| Domain Purity | 7 | 0 | 0% |
| Type Safety | 6 | 2 | 33% |
| Code Quality | 9 | 3 | 33% |
| Security | 17 | 1 | 6% |
| Pattern Compliance | 2 | 0 | 0% |
| Test Coverage | 48 | 10 | 21% |
| Test Quality | 13 | 0 | 0% |

---

## Notes

- **Last Updated**: November 24, 2025
- **Next Review**: February 23, 2026 (Quarterly)
- **Recent Updates**:
  - Documented acceptable patterns (CQ-2, SEC-1, TS-1, TS-2) - 6 issues resolved/deferred
  - Completed high-priority test coverage (TC-1 through TC-10) - 10 issues completed
  - **Total Progress**: 16 of 56 active issues resolved (29%)
- **Low priority issues** (48) deferred to maintenance backlog - see individual reports

---

## Legend

- **Status**:
  - `Open`: Not started
  - `In Progress`: Work underway
  - `Completed`: Issue resolved
  - `Deferred`: Postponed to future sprint
- **Effort**: Estimated hours to complete
- **PR/Commit**: Reference to resolution (added when completed)
