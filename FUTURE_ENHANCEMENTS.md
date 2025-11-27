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

### Testing & Automation

#### Playwright E2E Testing for Claude Automation
**Status**: ✅ Implemented (Slice 1-4 complete)
**Branch**: `feature/playwright-e2e`
**Value**: Claude can run automated UI tests to find issues without manual F5 testing

**What's Implemented**:
- ✅ VS Code launch via Playwright Electron (`VSCodeLauncher.launch()`)
- ✅ Command Palette automation (`CommandPaletteHelper`)
- ✅ Webview iframe access (`WebviewHelper`)
- ✅ Screenshot capture (`ScreenshotHelper`, `VSCodeLauncher.takeScreenshot()`)
- ✅ Console log capture (`vscode.getLogs()` - renderer + webview debug)
- ✅ Extension Output channel logs (`vscode.getExtensionLogs()` - your logger output)
- ✅ Claude-optimized JSON reporter with suggestions (`ClaudeJsonReporter`)
- ✅ Smoke tests: VS Code launch, command execution, extension activation verification

**Commands**:
- `npm run e2e:smoke` - Run smoke tests (~30s)
- `npm run e2e:headed` - Visible VS Code window
- `npm run e2e:debug` - Playwright Inspector

**Design Doc**: `docs/design/PLAYWRIGHT_E2E_DESIGN.md`

**Future Enhancements** (not yet implemented):
- Webview content interaction tests (click buttons, fill forms inside panels)
- Panel-specific integration tests (Data Explorer query execution, etc.)
- Visual regression testing (screenshot comparison)

---

### Power Platform Development Tools

#### Plugin Registration Tool
**Status**: Planned
**Estimated Effort**: 40+ hours
**Value**: VSCode-native plugin registration without leaving the IDE

**Description**:
Port of Microsoft's Plugin Registration Tool (PRT) functionality to VSCode. Register assemblies, steps, and images directly from the extension.

**Core Features**:
- Browse registered assemblies, plugins, steps, images
- Register new assemblies (upload DLL)
- Add/edit/delete plugin steps
- Add/edit/delete step images
- Enable/disable steps
- View plugin type details

**Technical Considerations**:
- Uses Dataverse Plugin Registration APIs
- Assembly storage options (database vs sandbox)
- Step filtering modes
- Image attribute selection

**Success Criteria**:
- Can perform all common PRT operations
- No need to launch external PRT tool
- Faster iteration for plugin development

---

#### Web Resources Manager
**Status**: Planned
**Estimated Effort**: 24-32 hours
**Value**: Edit web resources with full VSCode capabilities (syntax highlighting, extensions)

**Description**:
Browse, edit, and sync web resources between Dynamics and local repository.

**Core Features**:
- Browse/search web resources by solution, type, name
- Open web resource in VSCode editor (full syntax highlighting)
- Save changes back to Dynamics
- Pull latest from Dynamics to local
- Repo folder mapping for CI/CD sync

**Sync Features**:
- Map local folder to solution's web resources
- Push local changes to Dynamics
- Pull Dynamics changes to local
- Conflict detection (modified in both places)
- Batch sync operations

**Technical Considerations**:
- Web resource content is base64 encoded
- Need to handle different types (JS, CSS, HTML, images, etc.)
- Consider file watching for auto-sync
- Git integration for change tracking

**Success Criteria**:
- Full VSCode editing experience for web resources
- Reliable sync between repo and Dynamics
- CI/CD pipeline integration possible

---

### Data Management

#### Data Explorer (Ad-hoc Advanced Find)
**Status**: Planned
**Estimated Effort**: 32-40 hours
**Value**: Query data without leaving VSCode, save and reuse queries

**Description**:
Interactive query builder for Dataverse data with live results and saved queries.

**Core Features**:
- Entity picker with search
- Column selector (multi-select)
- Filter builder (conditions, groups, AND/OR)
- Sort configuration
- Live data table with results
- Pagination for large result sets

**Query Persistence**:
- Save as UserQuery (Personal View) in Dataverse
- Load existing personal views
- Portable across devices/users with same permissions
- Available in Dynamics UI as well

**Advanced Features**:
- FetchXML view/edit mode
- Export to CSV/Excel
- Quick filters on result columns
- Column resizing/reordering

**Technical Considerations**:
- UserQuery entity for saved queries (systemuser-owned)
- FetchXML generation from UI selections
- Handle large result sets (virtual scrolling?)
- Respect user's security privileges

**Success Criteria**:
- Faster than Advanced Find in browser
- Queries saved and reusable
- Works with any entity user has access to

---

#### SQL to FetchXML (SQL4CDS-style)
**Status**: Planned
**Estimated Effort**: 24-32 hours
**Value**: Query Dataverse using familiar SQL syntax

**Description**:
Write SQL queries, convert to FetchXML, execute against Dataverse. Inspired by XRM Toolbox SQL4CDS.

**Core Features**:
- SQL query editor with syntax highlighting
- SQL → FetchXML conversion
- Execute query and display results
- View generated FetchXML
- Query history

**SQL Support**:
- SELECT with column list or *
- FROM with table (entity) name
- WHERE with conditions (=, <>, <, >, LIKE, IN, IS NULL)
- JOIN for related entities (lookup traversal)
- ORDER BY
- TOP / LIMIT for pagination
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
- GROUP BY

**Example Queries**:
```sql
SELECT name, revenue, createdon
FROM account
WHERE statecode = 0
ORDER BY revenue DESC

SELECT a.name, c.fullname
FROM account a
JOIN contact c ON a.primarycontactid = c.contactid
WHERE a.revenue > 1000000

SELECT statecode, COUNT(*) as count
FROM contact
GROUP BY statecode
```

**Integration with Data Explorer**:
- Switch between SQL mode and visual query builder
- SQL generates FetchXML, visual builder can read it back
- Same result display and export capabilities

**Technical Considerations**:
- SQL parser (could use existing library or build simple one)
- Map SQL constructs to FetchXML equivalents
- Handle Dataverse-specific quirks (option sets, lookups, polymorphic lookups)
- Error messages for unsupported SQL features
- Consider referencing MarkMpn's SQL4CDS for parsing patterns

**Limitations to Document**:
- Not full T-SQL - subset that maps to FetchXML
- No INSERT/UPDATE/DELETE (read-only, or separate feature)
- Some complex JOINs may not translate

**Success Criteria**:
- Common queries work as expected
- Clear error messages for unsupported syntax
- Faster than writing FetchXML by hand
- Seamless integration with Data Explorer

---

#### Record Cloning (Cross-Environment)
**Status**: Planned
**Estimated Effort**: 16-24 hours
**Value**: Copy records between environments for testing/data migration

**Description**:
Query records in source environment and clone to target environment.

**Core Features**:
- Dual environment connection (source + target)
- Query builder (reuse Data Explorer)
- Column mapping (handle different schemas)
- Preview before clone
- Batch operations with progress

**Technical Considerations**:
- Requires two authenticated connections
- Handle lookup field remapping
- Skip system fields (createdon, modifiedon, etc.)
- Handle duplicate detection rules
- Transaction/rollback for batch failures

**Success Criteria**:
- Reliable cross-environment data copy
- Clear handling of lookup remapping
- Progress visibility for large batches

---

#### Bulk Data Operations
**Status**: Future
**Estimated Effort**: 16-24 hours
**Value**: Safe bulk update/delete with preview

**Description**:
Bulk update or delete records with preview and confirmation.

**Core Features**:
- Query records (reuse Data Explorer)
- Bulk update: set field values across records
- Bulk delete: remove matching records
- Preview affected records before execution
- Progress tracking and cancellation

**Safety Features**:
- Record count confirmation
- Preview first N records
- Dry-run mode
- Audit trail of operations

**Success Criteria**:
- Safer than direct API calls
- Clear preview before destructive operations
- Handles large batches efficiently

---

### ALM & DevOps

#### Deployment Settings Promotion
**Status**: Planned
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

#### Solution Diff/Compare
**Status**: Future
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

### Administration

#### Connection Manager
**Status**: Planned
**Estimated Effort**: 16-24 hours
**Value**: Manage Power Platform connections from VSCode

**Description**:
View and manage connections for the environment.

**Core Features**:
- List all connections
- Filter by connector type, status, owner
- View connection details
- Test connection health
- Share/unshare connections

**Technical Considerations**:
- New PowerShell library for connections (investigate API)
- May need different auth scope
- Connection sharing permissions

**Success Criteria**:
- View all environment connections
- Basic connection management operations

---

#### Async Job Monitor
**Status**: Planned
**Estimated Effort**: 16-24 hours
**Value**: Monitor and manage background jobs

**Description**:
View and manage async operations, system jobs, and bulk operations.

**Core Features**:
- List async operations (pending, running, completed, failed)
- Filter by type, status, date range
- View job details and errors
- Cancel pending/running jobs
- Bulk delete old jobs

**Job Types**:
- System jobs (workflows, async plugins)
- Bulk delete jobs
- Import/export jobs
- Solution operations

**Cleanup Features**:
- Delete completed jobs older than X days
- Delete failed jobs
- Bulk cleanup with preview

**Success Criteria**:
- Clear visibility into background operations
- Easy cleanup of old jobs
- Quick identification of stuck/failed jobs

---

#### Security Role Viewer
**Status**: Future
**Estimated Effort**: 24-32 hours
**Value**: Understand and compare security roles

**Description**:
View security role privileges and compare roles.

**Core Features**:
- List security roles
- View role privileges (entity permissions matrix)
- Compare two roles side-by-side
- Search privileges by entity
- Export role definition

**Advanced Features**:
- Effective permissions for user (all roles combined)
- Role assignment management
- Privilege gap analysis

**Technical Considerations**:
- Security role metadata APIs
- Privilege depth visualization (User, BU, Parent, Org)
- Large permission matrices

**Success Criteria**:
- Faster than navigating Dynamics security UI
- Clear role comparison
- Understand effective permissions

---

#### Workflow & Flow Manager
**Status**: Planned
**Estimated Effort**: 16-24 hours
**Value**: Manage workflow/flow state without navigating to each one

**Description**:
View and manage classic workflows and Power Automate flows.

**Core Features**:
- List all workflows (classic) and flows (modern)
- Filter by type, status (active/draft), solution
- Activate/deactivate in bulk
- View which connections a flow uses
- View run history summary

**Flow Details**:
- Connection references used
- Trigger type
- Last run status
- Owner

**Stretch Goals**:
- View flow definition (read-only)
- Edit flow definition (complex - may not be feasible)

**Success Criteria**:
- Quick state management for workflows/flows
- Understand connection usage per flow
- Bulk activation/deactivation

---

### Observability

#### Flow Run History
**Status**: Future
**Estimated Effort**: 16-24 hours
**Value**: Debug flow failures without leaving VSCode

**Description**:
View Power Automate flow run history and errors.

**Core Features**:
- List flow runs (succeeded, failed, cancelled)
- Filter by flow, status, date range
- View run details (trigger, actions, duration)
- View action inputs/outputs
- Error message details

**Advanced Features**:
- Resubmit failed runs
- Cancel running flows
- Export run details

**Technical Considerations**:
- Flow management APIs
- Run history can be large
- Action-level detail requires additional API calls

**Success Criteria**:
- Quick identification of flow failures
- Clear error context
- Faster debugging than browser UI

---

#### Entity Dependency Graph
**Status**: Future
**Estimated Effort**: 16-24 hours
**Value**: Understand impact before making changes

**Description**:
Visual graph of entity dependencies - "what breaks if I delete this?"

**Core Features**:
- Select entity/component
- Show dependent components
- Show dependencies (what this depends on)
- Visual graph view
- Impact analysis

**Dependency Types**:
- Lookup fields
- Workflows/flows referencing entity
- Business rules
- Plugins
- Forms, views, charts

**Technical Considerations**:
- Dependency tracking APIs
- Graph visualization library
- Can be slow for complex entities

**Success Criteria**:
- Understand impact before changes
- Prevent accidental breakage
- Visual representation of dependencies

---

### ALM & DevOps (Existing Section)

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

**Last Reviewed**: 2025-11-24
