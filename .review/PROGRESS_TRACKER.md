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
| TC-1 | Missing tests for EnvironmentDomainMapper | Open | 4h | | | Critical bidirectional mapper |
| TC-2 | Missing tests for AttributeMetadataMapper | Open | 3h | | | All attribute types untested |
| TC-3 | Missing tests for EntityMetadataMapper | Open | 4h | | | Top-level composition untested |
| TC-4 | Missing tests for RelationshipMetadataMapper | Open | 2h | | | Cascade configurations untested |
| TC-5 | Missing tests for EntityKeyMapper | Open | 1h | | | Alternate keys untested |
| TC-6 | Missing tests for OptionSetMetadataMapper | Open | 3h | | | Complex priority logic untested |
| TC-7 | Missing tests for FileSystemDeploymentSettingsRepository | Open | 2h | | | JSON parsing safety untested |
| TC-8 | Missing tests for StorageInspectionService | Open | 2h | | | Multi-storage coordination untested |
| TC-9 | Missing tests for PluginTraceViewModelMapper | Open | 2h | | | Presentation mapping untested |
| TC-10 | Missing tests for TimelineViewModelMapper | Open | 2h | | | Hierarchy mapping untested |

**Total Estimated Effort**: 25 hours (3-4 days)

### Code Quality (3 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| CQ-1 | Code duplication in extension.ts (7 functions) | Open | 6h | | | Extract FeatureInitializer |
| CQ-2 | CollectionService duplication (6 classes) | Open | 4h | | | Create generic CollectionService<T> |
| CQ-3 | Large files need refactoring (4 files >700 lines) | Open | 16h | | | Split responsibilities |

**Total Estimated Effort**: 26 hours (3-4 days)

### Security (5 issues)

| # | Issue | Status | Effort | Assigned To | PR/Commit | Notes |
|---|-------|--------|--------|-------------|-----------|-------|
| SEC-1 | OAuth redirect uses HTTP instead of HTTPS | Open | 4h | | | Consider self-signed cert |
| SEC-2 | Information disclosure in error messages | Open | 2h | | | Sanitize API error text |
| SEC-3 | Secret revelation without authorization | Open | 30m | | | Add confirmation dialog |
| SEC-4 | No rate limiting on authentication | Open | 4h | | | Implement exponential backoff |
| SEC-5 | Insufficient SSRF prevention | Open | 1h | | | Block private IPs/metadata endpoints |

**Total Estimated Effort**: 11.5 hours (1.5 days)

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
| TS-1 | Non-null assertions in test files (150+ instances) | Open | 6h | | | Low priority - tests only |
| TS-2 | Type assertions in integration tests | Open | 2h | | | Low priority - acceptable pattern |

**Total Estimated Effort**: 8 hours (1 day)

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
| High | 26 | 0 | 0 | 26 | 0 |
| Medium | 30 | 0 | 0 | 30 | 0 |
| Low | 48 | 0 | 0 | 0 | 48 |
| **Total** | **104** | **0** | **0** | **56** | **48** |

### Completion Percentage by Category

| Category | Total | Completed | % Complete |
|----------|-------|-----------|------------|
| Architecture | 6 | 0 | 0% |
| Domain Purity | 7 | 0 | 0% |
| Type Safety | 6 | 0 | 0% |
| Code Quality | 9 | 0 | 0% |
| Security | 17 | 0 | 0% |
| Pattern Compliance | 2 | 0 | 0% |
| Test Coverage | 48 | 0 | 0% |
| Test Quality | 13 | 0 | 0% |

---

## Notes

- **Last Updated**: November 23, 2025
- **Next Review**: February 23, 2026 (Quarterly)
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
