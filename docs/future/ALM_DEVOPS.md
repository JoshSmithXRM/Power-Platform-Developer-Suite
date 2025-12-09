# ALM & DevOps Enhancements

Application lifecycle management and DevOps tooling.

---

## High Priority

### Deployment Settings Promotion
**Status**: Planned
**Target Version**: v0.4.0
**Priority**: High
**Estimated Effort**: 16-24 hours
**Value**: Automate environment config promotion (Dev→QA→Prod)

**Description**:
Promote deployment settings between environments with intelligent mapping for custom connectors.

**Current State**:
- Can export connection references and environment variables
- Manual find/replace required for different environments

**Promotion Features**:
- Source environment settings export
- Target environment lookup (resolve ConnectionIds, ConnectorIds)
- Mapping table for custom connectors per environment
- Diff view showing what will change
- Apply promotion to target

**Custom Connector Handling**:
- Standard connectors: same ConnectorId across environments
- Custom connectors: different ConnectorId per environment
- Need to query target environment to resolve correct IDs
- Match by connector name/type, not ID

**Technical Considerations**:
- Query target environment's connections and connectors
- Build mapping table: LogicalName → (ConnectionId, ConnectorId)
- Handle missing connections gracefully
- Support for connection profiles (saved mappings)

**Success Criteria**:
- One-click promotion Dev→QA or QA→Prod
- Custom connectors handled automatically
- No manual find/replace needed

---

### Solution Diff/Compare
**Status**: Planned
**Target Version**: v0.5.0
**Priority**: High
**Note**: Can be developed in parallel with Plugin Registration (v0.6.0)
**Estimated Effort**: 24-32 hours
**Value**: Understand differences between environments

**Description**:
Compare solutions across environments to identify drift and differences.

**Core Features**:
- Select two environments to compare
- Select solution(s) to compare
- Component-level diff (entities, flows, plugins, etc.)
- Visual diff view (added, removed, modified)
- Export diff report

**Comparison Types**:
- Same solution, different environments
- Different solution versions
- Component-level deep comparison

**Technical Considerations**:
- Solution component metadata APIs
- Handle large solutions efficiently
- Meaningful diff for complex components

**Success Criteria**:
- Quick identification of environment drift
- Clear visualization of differences
- Actionable diff reports

---

## Medium Priority

### Pre-Release Channel Support
**Status**: Deferred (2025-Q1)
**Priority**: Medium
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

### Formal Rollback Documentation
**Status**: Deferred (2025-Q1)
**Priority**: Medium
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

### Release Checklist Template
**Status**: Deferred (2025-Q1)
**Priority**: Medium
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

**Last Updated**: 2025-12-08
