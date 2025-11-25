# Future Enhancements

This document tracks features, improvements, and ideas that we want to implement in the future but are not actively working on. This is distinct from technical debt - these are net-new capabilities rather than code quality improvements.

**Purpose**: Central tracking for future work that doesn't fit into technical debt or current sprint planning.

**Related Documents**:
- `TECHNICAL_DEBT.md` - Code quality issues that need addressing
- `CHANGELOG.md` - Historical changes and current unreleased work
- `.claude/WORKFLOW.md` - Development workflow and processes

---

## How to Use This Document

1. **Adding Items**: When you have an idea for a future feature or improvement, add it to the appropriate section
2. **Prioritization**: Items are organized by priority (High/Medium/Low) and category
3. **Promotion to Active Work**: When ready to implement, move the item to a design document or create a feature branch
4. **Review Cadence**: Review quarterly to reassess priorities and archive stale ideas

---

## High Priority (Next 6 Months)

### ALM & DevOps

#### Pre-Release Channel Support
**Status**: Deferred (2025-Q1)
**Estimated Effort**: 4-6 hours
**Value**: Allows beta testing with early adopters before stable release

**Description**:
Add support for VS Code Marketplace pre-release channel to enable staged rollouts.

**Requirements**:
- Modify publish workflow to detect pre-release vs stable
- Update version bump workflow to support pre-release tags
- Document pre-release process in CLAUDE.md
- Add testing workflow for pre-release builds

**Implementation Notes**:
- VS Code supports `--pre-release` flag in vsce publish
- GitHub releases can be marked as "pre-release"
- Users can opt-in via VS Code settings

**Success Criteria**:
- Can publish beta versions to pre-release channel
- Stable releases unaffected
- Clear documentation for users on how to access pre-releases

---

### Rollback Procedures

#### Formal Rollback Documentation
**Status**: Deferred (2025-Q1)
**Estimated Effort**: 2-3 hours
**Value**: Reduces recovery time during incidents

**Description**:
Create comprehensive rollback procedures for handling bad releases.

**Requirements**:
- Document marketplace rollback limitations (cannot unpublish)
- Create hotfix release process
- Define incident response procedures
- Create release validation checklist

**Deliverables**:
- `docs/ROLLBACK_PROCEDURES.md`
- `.github/RELEASE_CHECKLIST.md` template
- Update CLAUDE.md with rollback references

**Success Criteria**:
- Clear procedures for reverting bad releases
- Defined roles and responsibilities
- Tested communication plan

---

### Release Management

#### Release Checklist Template
**Status**: Deferred (2025-Q1)
**Estimated Effort**: 1-2 hours
**Value**: Ensures consistent release quality

**Description**:
GitHub issue template for release preparation and post-release validation.

**Requirements**:
- Pre-release validation steps
- Post-release monitoring checklist
- Integration with existing workflows
- Clear success criteria

**Template Sections**:
- Pre-release checks (tests, manual testing, code review)
- Deployment validation (marketplace install, core features)
- Post-release monitoring (error tracking, user feedback)

**Success Criteria**:
- Used for every release
- Prevents common release issues
- Documented in CLAUDE.md workflow

---

## Medium Priority (6-12 Months)

### Observability

#### Telemetry & Analytics
**Status**: Under Consideration
**Estimated Effort**: 8-12 hours
**Value**: Understand usage patterns and identify issues proactively

**Description**:
Add opt-in telemetry for error tracking and feature usage analytics.

**Requirements**:
- User consent mechanism (respects VS Code telemetry settings)
- Privacy compliance (no PII collection)
- Azure Application Insights integration
- Clear documentation of collected data

**Metrics to Track**:
- Extension activation/deactivation
- Feature usage (which commands are used)
- Error rates and types
- Performance metrics (load times, operation duration)

**Privacy Considerations**:
- Respect `telemetry.telemetryLevel` setting in VS Code
- No collection of user code or data
- Anonymous user IDs only
- Clear opt-out mechanism

**Blockers**:
- Requires Azure Application Insights account
- Need privacy policy documentation
- Must align with VS Code telemetry best practices

**Success Criteria**:
- Can identify most-used features
- Proactive error detection before user reports
- No privacy complaints
- < 1% performance overhead

---

#### Error Tracking Integration
**Status**: Under Consideration
**Estimated Effort**: 4-6 hours
**Value**: Faster bug identification and resolution

**Description**:
Integrate error tracking service (Sentry, Application Insights) for production error monitoring.

**Requirements**:
- Select error tracking service
- Implement error boundary/global error handler
- Configure source map upload for stack traces
- Add error context (extension version, VS Code version, OS)

**Considerations**:
- Must work with existing telemetry opt-in
- Should not slow down extension
- Need secure credential management

**Success Criteria**:
- Production errors captured automatically
- Stack traces map to source code
- Can correlate errors with releases

---

### User Experience

#### In-App Feedback Mechanism
**Status**: Future (2025-Q3)
**Estimated Effort**: 6-8 hours
**Value**: Easier bug reporting and feature requests

**Description**:
Add command to report issues directly from VS Code.

**Requirements**:
- "Report Issue" command in command palette
- Pre-populate GitHub issue template with diagnostic info
- Include extension version, VS Code version, OS
- Option to include error logs

**Features**:
- Auto-fill issue template
- Privacy controls (what data to include)
- Direct link to GitHub issues
- Optional screenshot attachment

**Success Criteria**:
- Reduces incomplete bug reports
- Faster triage time
- Positive user feedback

---

## Low Priority (12+ Months)

### Testing Infrastructure

#### Integration Testing Framework
**Status**: Future
**Estimated Effort**: 16-24 hours
**Value**: Catch integration bugs before production

**Description**:
Add VS Code extension integration tests using `@vscode/test-electron`.

**Scope**:
- Extension activation tests
- Command registration tests
- Webview integration tests
- End-to-end user workflow tests

**Challenges**:
- Requires headless VS Code setup (xvfb on Linux)
- Longer CI build times
- More complex test fixtures
- Maintenance overhead

**Success Criteria**:
- Core workflows covered by integration tests
- Tests run in CI
- No flaky tests
- Clear test organization

---

#### E2E Testing with Real Power Platform
**Status**: Exploratory
**Estimated Effort**: 24-40 hours
**Value**: Catch API integration issues

**Description**:
End-to-end tests against real Power Platform environments.

**Challenges**:
- Requires test environment credentials
- Power Platform API rate limits
- Long test execution times
- Environment setup/teardown complexity
- Cost considerations

**Considerations**:
- May need dedicated test environment
- Secret management for credentials
- Selective execution (not every PR)
- Clear test data cleanup

---

### Advanced Features

#### Multi-Environment Support
**Status**: Exploratory
**Estimated Effort**: 40+ hours
**Value**: Streamline multi-environment workflows

**Description**:
Enhanced support for working with multiple Power Platform environments simultaneously.

**Potential Features**:
- Environment comparison views
- Bulk operations across environments
- Environment-specific settings
- Connection profiles

**Depends On**:
- User feedback on current environment handling
- Clear use cases from real users

---

## Archive (Considered & Rejected)

None yet.

---

## Notes

**When to Move Items**:
- **To Active Work**: Create feature branch and design document
- **To Archive**: Mark as rejected with reason (e.g., "Complexity too high", "User feedback negative")
- **To Technical Debt**: If it's a code quality issue rather than new feature

**Review Schedule**:
- Quarterly review of High Priority items
- Bi-annual review of Medium/Low Priority
- Annual archive cleanup

**Last Reviewed**: 2025-01-23
