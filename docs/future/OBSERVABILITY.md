# Observability Enhancements

Monitoring, debugging, and analytics features.

---

## Medium Priority

### Flow Run History
**Status**: Future
**Priority**: Medium
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

### Entity Dependency Graph
**Status**: Future
**Priority**: Medium
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

### Telemetry & Analytics
**Status**: Under Consideration
**Priority**: Medium
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

### Error Tracking Integration
**Status**: Under Consideration
**Priority**: Medium
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

**Last Updated**: 2025-11-26
