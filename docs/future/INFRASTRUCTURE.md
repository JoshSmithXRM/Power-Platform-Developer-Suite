# Infrastructure Enhancements

Testing infrastructure, tooling, and user experience improvements.

---

## Implemented

### Playwright E2E Testing
**Status**: ✅ Implemented (Slice 1-4 complete)
**Priority**: High
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

**Implementation**: `e2e/` folder with Playwright tests and helpers

**Remaining Enhancements** (not yet implemented):
- Webview content interaction tests (click buttons, fill forms inside panels)
- Panel-specific integration tests (Data Explorer query execution, etc.)
- Visual regression testing (screenshot comparison)

---

## High Priority

### Version Roadmap Planning
**Status**: ✅ Implemented (v0.2.4)
**Priority**: High
**Value**: Clear versioning strategy and user visibility into project direction

**What's Implemented**:
- ✅ `ROADMAP.md` created with version milestones (0.3 → 1.0)
- ✅ Versioning philosophy documented (PATCH/MINOR/MAJOR criteria)
- ✅ Feature themes per version
- ✅ Post-1.0 roadmap outlined

**Implementation**: `ROADMAP.md` in repository root

---

### User Configuration System
**Status**: ✅ Implemented (v0.2.3)
**Priority**: High
**Estimated Effort**: 8-12 hours
**Value**: User-configurable settings for record limits, page sizes, and panel behavior

**Description**:
Add VS Code configuration contribution point to allow users to customize extension behavior. Currently all limits are hardcoded (e.g., plugin trace 100 limit in `TraceFilter.ts:178`).

**Core Features**:
- VS Code Settings UI integration (`contributes.configuration` in package.json)
- `IConfigurationService` domain interface
- `VSCodeConfigurationService` infrastructure implementation
- Settings exposed via VS Code Settings editor

**Planned Settings**:
```json
{
  "ppds.table.defaultPageSize": 100,
  "ppds.table.maxCachedRecords": 5000,
  "ppds.pluginTrace.defaultLimit": 100
}
```

**Technical Considerations**:
- Domain layer defines interface (no VS Code dependency)
- Infrastructure implements using `vscode.workspace.getConfiguration()`
- Inject via constructor (testable with mock)
- Settings should have sensible defaults

**Success Criteria**:
- Users can adjust record limits without code changes
- Settings appear in VS Code Settings UI under "Power Platform Developer Suite"
- All panels respect configured values

**Dependencies**:
- Required for Virtual Data Table (large dataset support)

---

### Virtual Data Table
**Status**: ✅ Implemented (v0.2.3)
**Priority**: High
**Estimated Effort**: 16-24 hours
**Value**: Support large datasets (70k+ records) without browser/memory issues

**Description**:
New data table component with virtual scrolling and server-side pagination. Current `DataTableSection` renders ALL rows to DOM, causing performance issues with large datasets.

**Core Features**:
- Virtual scrolling (only render visible rows + buffer)
- Server-side pagination (`$top`, `$skip` OData parameters)
- Background caching up to configurable limit
- Client-side search within cache (instant)
- Server-side search fallback (for records beyond cache)
- "X of Y loaded" status indicator

**Technical Approach**:
1. Fetch first page immediately (fast initial load)
2. Background-fetch additional pages up to `maxCachedRecords`
3. Virtual scroll renders ~50-100 rows in DOM at a time
4. Search filters cached data; falls back to server if not found

**Panels to Update**:
- Web Resources (70k+ records - critical)
- Plugin Trace Viewer (remove hardcoded 100 limit)
- Solutions (user reports slow)
- Import Jobs (user reports slow)

**Success Criteria**:
- 70k records: Initial load < 2 seconds
- Smooth scrolling through large datasets
- Instant search within cached records
- No browser memory issues

**Dependencies**:
- User Configuration System (for page size settings)

---

## Low Priority

### Integration Testing Framework
**Status**: Future
**Priority**: Low
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

### E2E Testing with Real Power Platform
**Status**: Exploratory
**Priority**: Low
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

### Multi-Environment Support
**Status**: Exploratory
**Priority**: Low
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

### In-App Feedback Mechanism
**Status**: Future (2025-Q3)
**Priority**: Low
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

### Advanced Configuration Settings
**Status**: Future (Low Priority)
**Priority**: Low
**Estimated Effort**: 4-6 hours
**Value**: Power users can fine-tune advanced behavior

**Description**:
Additional VS Code settings for advanced users identified during the v0.2.5 settings audit. These are lower priority because they affect edge cases or technical behavior that most users won't need to change.

**Proposed Settings**:

| Setting | Current Value | Description |
|---------|---------------|-------------|
| `authentication.timeout` | 90s | Browser auth timeout for slow MFA |
| `api.retryBackoff` | 1000ms | Base exponential backoff delay |
| `publish.lockTimeout` | 5min | Safety timeout for publish locks |
| `connectionTest.timeout` | 10s | WhoAmI API timeout |
| `virtualTable.searchLimit` | 1000 | Max server search records |
| `webResources.maxFilterIds` | 100 | Max IDs in OData filter |
| `errors.maxMessageLength` | 200 | Error message truncation length |

**Implementation Pattern**:
Same as HIGH/MEDIUM priority settings already implemented - read via `IConfigurationService` with sensible defaults.

**Add When**:
- Users explicitly request any of these settings
- Edge case bugs surface that require user-configurable workarounds

---

**Last Updated**: 2025-12-02
**Status Review**: All items reviewed and categorized as of this date
