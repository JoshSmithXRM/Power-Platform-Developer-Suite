# Solution Panel Integration Tests

This document outlines integration tests needed for the Solution Explorer panel. These tests verify end-to-end workflows from user actions to external side effects.

**Status**: 📋 Specification (Not Yet Implemented)
**Created**: 2025-01-04
**Last Updated**: 2025-01-04

---

## Why These Tests Are Needed

**Bugs Found Without Integration Tests:**
1. ✅ **FIXED**: Message payload property mismatch (`payload` vs `data`) - links didn't work
2. ✅ **FIXED**: Table row striping broke with search filtering
3. ✅ **FIXED**: Environment change didn't disable refresh button during operation
4. ✅ **FIXED**: Column sorting implemented (client-side)
5. ⚠️ **OPEN - APPROVED FIX**: Panel behavior when no environments configured (will show empty state)
6. 🚫 **BLOCKED**: Singleton map behavior on environment change (pattern under discussion - see "Architect Review" section)

**Current Test Coverage:**
- **Unit tests**: 1121 tests across 55 suites
- **Integration tests**: 0 tests
- **Panel-specific tests**: 0 tests for SolutionExplorerPanel

---

## Architecture Notes

### Sorting Implementation
- **Client-side sorting**: `DataTableBehavior.js` sorts table rows in-place via DOM manipulation
- **No backend calls**: Sorting does not trigger data reload
- **State tracking**: Client-side tracks current sort column and direction
- **Locale-aware**: Uses `String.localeCompare()` for string sorting
- **Empty value handling**: Empty cells pushed to end of sort order
- **Visual indicators**: Headers show ▲/▼ to indicate sort direction
- **Row striping**: Automatically recalculated after sort

### Search Implementation
- **Client-side only**: `DataTableBehavior.js` filters rows via `display:none`
- **No backend calls**: Search does not trigger data reload
- **Row striping**: Automatically recalculated after search filtering
- **Record count**: Updates to reflect visible rows only

### Environment Selector
- **Always visible**: Currently shown regardless of environment count
- **TODO**: Implement conditional visibility (hide if 0 or 1 environments) - needs configuration option

### Button State Management
- **PanelCoordinator**: Automatically disables buttons during async operations
- **Client-side**: Webview receives `setButtonState` message to toggle disabled/spinner states
- **Opt-out**: Use `{ disableOnExecute: false }` for handlers that shouldn't disable (e.g., sorting)

---

## Test Categories

### 1. Panel Initialization Tests

#### Test: Panel opens successfully with valid environment
```typescript
// GIVEN: User has at least one configured environment
// WHEN: User opens Solution Explorer
// THEN: Panel opens showing solutions for default environment
// AND: Environment selector shows all available environments
// AND: Current environment is pre-selected in dropdown
```

#### Test: Panel opens with no environments configured
```typescript
// GIVEN: User has no configured environments
// WHEN: User opens Solution Explorer
// THEN: Error thrown: "No environments available"
// AND: Panel does not open
// NOTE: This behavior is under architect review - may change to show empty state instead
```

#### Test: Panel opens with specific environment ID
```typescript
// GIVEN: User has multiple configured environments
// WHEN: User opens Solution Explorer with initialEnvironmentId="env-2"
// THEN: Panel opens showing solutions for env-2
// AND: Environment selector shows env-2 as selected
```

#### Test: Panel singleton behavior per environment
```typescript
// GIVEN: Solution Explorer is open for environment A
// WHEN: User opens Solution Explorer for environment A again
// THEN: Existing panel is revealed (not created new)
// WHEN: User opens Solution Explorer for environment B
// THEN: New panel is created for environment B
// AND: Both panels remain open simultaneously
```

---

### 2. Data Loading Tests

#### Test: Solutions load on panel open
```typescript
// GIVEN: Environment has 5 solutions
// WHEN: Panel opens
// THEN: Table displays 5 solution rows
// AND: Record count shows "5 records"
// AND: Default solution appears first (if present)
// AND: Solutions are sorted alphabetically after Default
```

#### Test: Empty state when environment has no solutions
```typescript
// GIVEN: Environment has 0 solutions
// WHEN: Panel opens
// THEN: Table shows "No solutions found."
// AND: Record count shows "0 records"
// AND: Search input is visible but disabled
```

#### Test: Error handling for API failure
```typescript
// GIVEN: Dataverse API returns 500 error
// WHEN: Panel opens
// THEN: Error message displayed: "Failed to refresh solutions: [error]"
// AND: Table shows empty state
// AND: Refresh button remains enabled for retry
```

---

### 3. Environment Selector Tests

#### Test: Environment selector displays all environments
```typescript
// GIVEN: User has 3 configured environments: Dev, Test, Prod
// WHEN: Panel opens with Dev environment
// THEN: Environment dropdown shows all 3 options
// AND: Dev is selected
// AND: Dropdown options show environment names (not IDs)
```

#### Test: Changing environment refreshes data
```typescript
// GIVEN: Panel is open showing solutions for Dev environment
// WHEN: User selects Test from environment dropdown
// THEN: Panel title updates to "Solutions - Test"
// AND: Solutions list refreshes showing Test solutions
// AND: Refresh button is disabled during reload
// AND: Refresh button re-enables after reload completes
```

#### Test: Environment change updates panel singleton mapping
```typescript
// GIVEN: Panel is open for Dev environment
// WHEN: User changes to Test environment
// THEN: Panel's currentEnvironmentId updates to Test
// NOTE: Singleton map behavior under architect review - current implementation may allow duplicates
// QUESTIONS:
//   - Should singleton be based on initial environment only?
//   - Should map be updated when environment changes?
//   - What prevents duplicate panels for same environment?
```

#### Test: Environment selector visibility based on environment count
```typescript
// GIVEN: User has exactly 1 configured environment
// WHEN: Panel opens
// THEN: Environment selector is visible (current behavior)
// NOTE: Configurable visibility to be implemented
// TODO: Add configuration option to hide selector when 0 or 1 environments
```

---

### 4. Column Sorting Tests

#### Test: Clicking column header sorts ascending
```typescript
// GIVEN: Panel displays 10 solutions (unsorted or default sort)
// WHEN: User clicks "Version" column header
// THEN: Table rows re-ordered by Version ascending (DOM manipulation)
// AND: Version header shows ▲ indicator
// AND: Other column headers lose sort indicators
// AND: No backend request made
```

#### Test: Clicking same column header toggles sort direction
```typescript
// GIVEN: Solutions sorted by Version ascending (▲)
// WHEN: User clicks "Version" column header again
// THEN: Table rows re-ordered by Version descending
// AND: Version header shows ▼ indicator
// AND: Client-side state: currentDirection toggles asc -> desc
```

#### Test: Clicking different column resets to ascending
```typescript
// GIVEN: Solutions sorted by Version descending (▼)
// WHEN: User clicks "Publisher" column header
// THEN: Table rows re-ordered by Publisher ascending
// AND: Publisher header shows ▲ indicator
// AND: Version header loses ▼ indicator
// AND: Client-side state: currentColumn = 'publisher', currentDirection = 'asc'
```

#### Test: Sort state lost on refresh (client-side limitation)
```typescript
// GIVEN: Solutions sorted by Publisher descending (client-side)
// WHEN: User clicks Refresh button
// THEN: Refreshed data rendered in default sort order
// AND: Client-side sort state is NOT preserved across refresh
// NOTE: This is expected behavior for client-side sorting
```

#### Test: Sort handles empty cell values
```typescript
// GIVEN: 5 solutions, 2 have empty/blank installedOn cells
// WHEN: User sorts by Installed On ascending
// THEN: Solutions with text content appear first (sorted)
// AND: Solutions with empty cells appear last
// AND: Empty cells detected via textContent.trim()
```

#### Test: Sort uses locale-aware string comparison
```typescript
// GIVEN: Solutions with names containing accented characters (é, ñ, etc.)
// WHEN: User sorts by Solution Name
// THEN: Solutions sorted using String.localeCompare()
// AND: Accented characters sort correctly per locale
```

#### Test: Sort does not trigger loading state
```typescript
// GIVEN: Panel is open
// WHEN: User clicks column header to sort
// THEN: Refresh button is NOT disabled
// AND: No loading spinner shown
// AND: No webview message sent to backend
// AND: Sorting happens instantly (DOM only)
```

#### Test: Sort reapplies row striping
```typescript
// GIVEN: Table has alternating row colors (even/odd classes)
// WHEN: User sorts by any column
// THEN: Rows re-ordered in DOM
// AND: applyRowStriping() recalculates even/odd classes
// AND: Visible rows maintain alternating colors
```

#### Test: Sort works with search filtering
```typescript
// GIVEN: User searches to show 5 of 10 solutions
// AND: 5 hidden rows have display:none
// WHEN: User clicks column header to sort
// THEN: All rows (including hidden) are sorted
// AND: Visible rows maintain search filter (display:none preserved)
// AND: Row striping applied to visible rows only
```

#### Test: Initial sort indicator from server-rendered HTML
```typescript
// GIVEN: Server renders table with Solution Name ▲ indicator
// WHEN: DataTableBehavior initializes
// THEN: Client-side state: currentColumn = 'friendlyName', currentDirection = 'asc'
// AND: Clicking Solution Name toggles to descending
// NOTE: Client reads ▲/▼ from header textContent on page load
```

---

### 5. Search Functionality Tests

#### Test: Search filters solutions client-side
```typescript
// GIVEN: Panel displays 10 solutions
// WHEN: User types "Common" in search box
// THEN: Only solutions with "Common" in any field are visible
// AND: Hidden rows have display:none style
// AND: Record count updates to match visible rows
// AND: No server request is made
```

#### Test: Search maintains alternating row striping
```typescript
// GIVEN: Panel displays 10 solutions with alternating row colors
// WHEN: User searches to show only rows 2, 5, 8
// THEN: Visible rows maintain alternating colors
// AND: Row 2 has color A, row 5 has color B, row 8 has color A
// AND: DataTableBehavior.applyRowStriping() recalculates striping
```

#### Test: Clearing search restores all rows
```typescript
// GIVEN: User has filtered to 3 visible solutions
// WHEN: User clears search input
// THEN: All 10 solutions become visible
// AND: Record count updates to "10 records"
// AND: Striping is correct for all visible rows
```

#### Test: Search matches across all columns
```typescript
// GIVEN: Panel displays solutions
// WHEN: User searches for text present in Version column
// THEN: Matching solution is visible
// WHEN: User searches for text present in Publisher column
// THEN: Matching solution is visible
```

---

### 6. Solution Link Click Tests

#### Test: Clicking solution name opens in Maker Portal
```typescript
// GIVEN: Panel displays solutions
// AND: Environment has powerPlatformEnvironmentId configured
// WHEN: User clicks solution name link
// THEN: Browser opens Maker Portal URL
// AND: URL includes environment ID and solution ID
// AND: URL format matches: make.powerapps.com/environments/{envId}/solutions/{solutionId}
```

#### Test: Solution link requires environment ID
```typescript
// GIVEN: Panel displays solutions
// AND: Environment has NO powerPlatformEnvironmentId configured
// WHEN: User clicks solution name link
// THEN: Error message shown: "Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one."
// AND: Browser does NOT open
```

#### Test: Solution link sends correct data payload
```typescript
// GIVEN: Panel displays solution with ID "abc-123"
// WHEN: User clicks solution name link
// THEN: WebviewMessage sent with { command: 'openInMaker', data: { solutionId: 'abc-123' } }
// AND: Handler receives solutionId correctly
```

#### Test: Solution link XSS protection
```typescript
// GIVEN: Solution with malicious name: "<script>alert('xss')</script>"
// WHEN: Panel renders solution name as link
// THEN: friendlyNameHtml contains escaped HTML: "&lt;script&gt;alert('xss')&lt;/script&gt;"
// AND: Script tag does not execute
// AND: Link text displays as plain text, not executed code
// AND: SolutionViewModelMapper.escapeHtml() sanitizes input
```

---

### 7. Action Button Tests

#### Test: Refresh button reloads solutions
```typescript
// GIVEN: Panel displays 5 solutions
// WHEN: User clicks Refresh button
// THEN: Button is disabled with spinner
// AND: Solutions are reloaded from API
// AND: Table updates with fresh data
// AND: Button re-enables after completion
```

#### Test: Refresh button shows error on failure
```typescript
// GIVEN: Panel is open
// WHEN: User clicks Refresh and API returns error
// THEN: Error message displayed
// AND: Button re-enables for retry
// AND: Table shows last successful data (or empty)
```

#### Test: Open in Maker button opens solutions list
```typescript
// GIVEN: Panel is open with environment having powerPlatformEnvironmentId
// WHEN: User clicks "Open in Maker" button
// THEN: Browser opens Maker Portal solutions list
// AND: URL format: make.powerapps.com/environments/{envId}/solutions
```

#### Test: Open in Maker button requires environment ID
```typescript
// GIVEN: Panel is open with environment missing powerPlatformEnvironmentId
// WHEN: User clicks "Open in Maker" button
// THEN: Error message shown: "Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one."
// AND: Browser does NOT open
```

---

### 8. Table Rendering Tests

#### Test: Table shows all configured columns
```typescript
// GIVEN: Panel configuration defines 9 columns
// WHEN: Panel opens
// THEN: Table header shows 9 column headings
// AND: Columns are: Solution Name, Unique Name, Version, Type, Publisher, Visible, API Managed, Installed On, Modified On
```

#### Test: Solution name renders as clickable link
```typescript
// GIVEN: Panel displays solutions
// WHEN: Table renders
// THEN: Solution Name column contains <a> tags
// AND: Links have data-command="openInMaker" attribute
// AND: Links have data-solution-id="{id}" attribute
// AND: Link text is HTML-escaped (XSS protected)
```

#### Test: Boolean fields formatted as strings
```typescript
// GIVEN: Solution has isManaged=true, isVisible=false, isApiManaged=true
// WHEN: Table renders
// THEN: Type column shows "Managed" (not "true")
// AND: Visible column shows "No" (not "false")
// AND: API Managed column shows "Yes" (not "true")
// AND: SolutionViewModelMapper formats booleans to user-friendly strings
```

#### Test: Date fields formatted for display
```typescript
// GIVEN: Solution has installedOn="2024-01-15T10:30:00Z", modifiedOn="2024-02-20T14:45:30Z"
// WHEN: Table renders
// THEN: Installed On column shows formatted date via DateFormatter.formatDate()
// AND: Modified On column shows formatted date
// AND: Dates are NOT displayed as ISO 8601 strings
// AND: Format matches user's locale (e.g., "1/15/2024, 10:30 AM" or "15/01/2024 10:30")
```

---

### 9. Message Routing Tests

#### Test: Button click sends correct command
```typescript
// GIVEN: Panel is open
// WHEN: User clicks button with id="refresh"
// THEN: WebviewMessage sent with { command: 'refresh' }
// AND: Handler is called
```

#### Test: Data command includes payload
```typescript
// GIVEN: Element has data-command="openInMaker" data-solution-id="123"
// WHEN: User clicks element
// THEN: WebviewMessage sent with { command: 'openInMaker', data: { solutionId: '123' } }
```

#### Test: Environment selector sends environmentId
```typescript
// GIVEN: Panel displays environment dropdown
// WHEN: User selects environment with ID "env-2"
// THEN: WebviewMessage sent with { command: 'environmentChange', data: { environmentId: 'env-2' } }
```

#### Test: Unknown command logs warning
```typescript
// GIVEN: Panel is open
// WHEN: Webview sends message with unregistered command
// THEN: Warning logged: "No handler registered for command"
// AND: No handler is called
// AND: Panel does not crash
```

---

### 10. WebviewMessage Contract Tests

#### Test: Webview message uses 'data' property (not 'payload')
```typescript
// GIVEN: Webview JS sends message
// WHEN: Message is { command: 'test', data: { foo: 'bar' } }
// THEN: PanelCoordinator extracts data correctly
// AND: Handler receives { foo: 'bar' }
```

#### Test: Message without data handled gracefully
```typescript
// GIVEN: Webview sends message with no data property
// WHEN: Message is { command: 'refresh' }
// THEN: Handler is called with undefined
// AND: No errors thrown
```

---

### 11. Button State Management Tests

#### Test: Button disabled during async operation
```typescript
// GIVEN: Panel is open
// WHEN: User clicks Refresh button
// THEN: Button immediately disabled
// AND: Button shows spinner
// WHEN: Async operation completes
// THEN: Button re-enables
// AND: Spinner removed
```

#### Test: Button state restored on error
```typescript
// GIVEN: User clicks Refresh button
// WHEN: Operation throws error
// THEN: Button re-enables
// AND: Spinner removed
// AND: Original button text restored
```

#### Test: Multiple button clicks ignored during operation
```typescript
// GIVEN: User clicks Refresh button (operation takes 2 seconds)
// WHEN: PanelCoordinator sends setButtonState message to disable button
// AND: Webview applies disabled attribute to button
// WHEN: User clicks Refresh again 500ms later
// THEN: Second click has no effect (button is disabled in DOM)
// AND: Only one API call is made
// AND: Button re-enables after first operation completes
```

#### Test: Button state message sent from backend to webview
```typescript
// GIVEN: Panel is open
// WHEN: Backend calls coordinator.registerHandler('refresh', handler)
// AND: User clicks refresh button
// THEN: PanelCoordinator sends { command: 'setButtonState', buttonId: 'refresh', disabled: true, showSpinner: true }
// AND: Webview receives message and disables button
// WHEN: Handler completes
// THEN: PanelCoordinator sends { command: 'setButtonState', buttonId: 'refresh', disabled: false, showSpinner: false }
// AND: Webview re-enables button
```

#### Test: Button disabled attribute prevents duplicate clicks
```typescript
// GIVEN: Webview receives setButtonState message with disabled: true
// WHEN: Button element gets disabled attribute applied
// THEN: Clicking button has no effect (browser prevents event)
// AND: No additional webview messages sent
// NOTE: Integration test verifies client-side button handling
```

---

### 12. Panel Disposal Tests

#### Test: Panel removed from singleton map on close
```typescript
// GIVEN: Panel is open for environment "env-1"
// WHEN: User closes panel
// THEN: Panel instance removed from static panels Map
// AND: Opening panel for "env-1" again creates new instance
```

#### Test: Behaviors disposed on panel close
```typescript
// GIVEN: Panel is open with behaviors initialized
// WHEN: User closes panel
// THEN: All behavior dispose() methods are called
// AND: Event listeners are cleaned up
```

---

### 13. CSS and Styling Tests

#### Test: Table rows have alternating colors
```typescript
// GIVEN: Panel displays 5 solutions
// WHEN: Table renders
// THEN: Row 1 has .row-even class
// AND: Row 2 has .row-odd class
// AND: Classes alternate for all visible rows
```

#### Test: Hidden rows excluded from striping
```typescript
// GIVEN: Search hides rows 2 and 4
// WHEN: Striping is applied
// THEN: Visible rows maintain alternating colors
// AND: Hidden rows have no stripe classes
```

#### Test: Hover state overrides striping
```typescript
// GIVEN: Row has .row-even class (gray background)
// WHEN: User hovers over row
// THEN: Row shows hover background color
// AND: .row-even background is overridden by :hover
```

---

## Architect Review - Open Decisions

**Review Date**: 2025-01-04
**Reviewed By**: code-guardian
**Status**: 2 open architectural decisions (user will decide later)

### 1. ⚠️ Singleton vs Instance Pattern

**Current Implementation:** Singleton per environment (`Map<envId, Panel>`)

**Confirmed Bug:** Singleton map not updated when environment changes (allows duplicates)

#### **Option A: Singleton Pattern (Architect Recommendation)**

**Pros:**
- Prevents accidental duplication (500MB → 50MB if user clicks 5 times)
- Single source of truth (no stale data across multiple panels)
- Matches VS Code pattern (one editor per file)

**Cons:**
- Blocks side-by-side comparison (user can't compare solutions in parallel)
- Adds 20 lines boilerplate per panel (×30 panels = 600 lines)
- Prevents advanced workflows (Data Explorer showing 2 entities simultaneously)

**Implementation:**
```typescript
// Update map on environment change
private async handleEnvironmentChange(envId: string): Promise<void> {
  SolutionExplorerPanelComposed.panels.delete(this.currentEnvironmentId);
  this.currentEnvironmentId = envId;
  SolutionExplorerPanelComposed.panels.set(envId, this);
  await this.handleRefresh();
}
```

#### **Option B: Instance Pattern (Remove Singleton)**

**Pros:**
- Enables side-by-side comparison (user can compare 2 solutions/entities)
- Simpler code (remove 20 lines per panel, no map management)
- Natural multi-environment workflow (open panel for env-A and env-B simultaneously)

**Cons:**
- User can accidentally create duplicates (clicks 5 times = 500MB vs 50MB)
- No state sync between instances (refresh one, other shows stale data)
- More memory if user opens many duplicates

**Implementation:**
```typescript
// Remove static map entirely
public static async create(envId: string): Promise<Panel> {
  const panel = vscode.window.createWebviewPanel(...);
  return new Panel(panel, envId, ...);
}
```

#### **Option C: Hybrid Pattern (Per-Panel-Type Decision)**

Different panels have different needs:
- **Solution Explorer**: Singleton (user rarely compares solutions)
- **Data Explorer**: Instance (comparison-heavy workflow)
- **Metadata Browser**: Instance (browse multiple entities)
- **Environment Setup**: Global singleton (manages environments)

#### **Option D: Smart Singleton (User Choice)**

Prompt user on duplicate:
```typescript
const existing = Panel.panels.get(envId);
if (existing) {
  const choice = await vscode.window.showInformationMessage(
    'Panel already open. Open anyway?',
    'Show Existing', 'Open New'
  );
  // User decides
}
```

**Decision:** USER WILL DECIDE LATER

---

### 2. ⚠️ Memory Management: `retainContextWhenHidden` vs Extension Cache

**Current Implementation:** `retainContextWhenHidden: true` (50MB per panel, forever)

**User Concern:** "If we implement `retainContextWhenHidden: false`, that means whatever we've loaded in memory (entire metadata browser) is gone and now I'm stuck loading all that shit again"

#### **Option A: Keep `retainContextWhenHidden: true` (Current)**

**Pros:**
- Instant panel show (no reload)
- Simple implementation (no cache management)

**Cons:**
- 50MB per panel, even when hidden
- 20 panels = 1GB minimum (just webview overhead, before data)
- Memory never released until panel closed

#### **Option B: Extension-Level Data Cache (Architect Recommendation)**

**Pattern:**
```typescript
class MetadataBrowserPanel {
  private static dataCache = new Map<string, EntityMetadata[]>(); // Extension memory

  async initialize() {
    const cached = MetadataBrowserPanel.dataCache.get(this.envId);
    if (cached) {
      this.render(cached); // INSTANT - no API call
    } else {
      const data = await this.fetchMetadata();
      MetadataBrowserPanel.dataCache.set(this.envId, data);
      this.render(data);
    }
  }
}

// Set retainContextWhenHidden: false (dispose webview when hidden)
```

**Pros:**
- Hidden panel: 0MB (webview disposed)
- Data cached in extension: ~1-5MB (vs 50MB webview)
- Show panel: Instant (render from cache, no API call)
- 20 panels hidden + 3 visible = ~150MB vs 1GB+

**Cons:**
- Need to implement cache invalidation (on refresh)
- Data persists for extension lifetime (not per-webview)

#### **Memory Limits - Real Numbers:**

- **VS Code warning zone**: Extension using 1-2GB total
- **Practical limit**: Design for 20 panels max
- **With extension cache**: 20 panels = ~150-300MB (acceptable)
- **With `retainContextWhenHidden: true`**: 20 panels = 1GB+ (problematic)

#### **Per-Panel Strategy:**

| Panel Type | Pattern | Hidden Memory | Show Speed |
|------------|---------|---------------|------------|
| **Metadata Browser** | Extension cache | 0MB | Instant |
| **Plugin Registration** | Extension cache | 0MB | Instant |
| **Solutions** | Re-fetch on show | 0MB | <1s |
| **Import Jobs** | Re-fetch on show | 0MB | <1s |

**Decision:** USER WILL DECIDE LATER

---

## Approved Decisions (No Further Action Needed)

### ✅ Empty State for No Environments

- Show empty state message (not error)
- Hide environment selector when 0 environments
- Disable action buttons

### ✅ Environment Selector Visibility

- Hide when ≤1 environments
- Auto-show when 2+ environments
- Logic in `EnvironmentSelectorSection.render()`

### ✅ Search Box Always Enabled

- No disabled state (simpler, better UX)
- Current behavior is correct

---

## Impact on Tests

**Tests blocked pending decisions:**
- Singleton behavior tests (depends on singleton decision)
- Panel disposal/reveal tests (depends on singleton decision)
- Memory management tests (depends on cache decision)

**Tests ready to implement:**
- Empty state rendering
- Environment selector visibility
- Search functionality
- Column sorting
- Button state management
- XSS protection
- Boolean/date formatting


## Test Implementation Priority

### Phase 1: Critical Path (MVP) - Core Functionality
1. Panel initialization with valid environment
2. Solutions load on panel open
3. Refresh button reloads solutions
4. Clicking solution name opens in Maker Portal
5. Search filters solutions client-side
6. Column sorting (client-side) with direction toggle
7. Row striping maintained during search/sort

### Phase 2: Data Integrity & Contracts
8. WebviewMessage contract (data vs payload)
9. Message routing for all commands
10. Environment selector changes environment
11. Button state management during operations
12. Button disabled attribute prevents duplicate clicks
13. Boolean field formatting (Managed/Unmanaged, Yes/No)
14. Date field formatting (locale-aware display)
15. XSS protection for solution names

### Phase 3: Edge Cases & Error Handling
16. Empty state when environment has no solutions
17. Error handling for API failures
18. Solution link requires environment ID
19. Open in Maker requires environment ID
20. Panel with no environments (pending architect decision)
21. Environment selector visibility (pending implementation)

### Phase 4: Advanced Features & Polish
22. Sort works with search filtering (combined behavior)
23. Sort reapplies row striping
24. Table shows all configured columns
25. CSS and styling (striping, hover)
26. Panel disposal and cleanup
27. Singleton behavior (pending architect guidance)

---

## Test Infrastructure Needed

### Tools
- **Jest** - Already in use for unit tests
- **@testing-library/dom** - For DOM queries and assertions
- **jsdom** - For webview HTML rendering
- **Mock VS Code API** - For panel, webview, workspace mocking

### Test Helpers
```typescript
// File: src/shared/testing/helpers/PanelTestHarness.ts

/**
 * Test harness for integration testing webview panels.
 * Provides utilities to simulate user interactions and verify panel state.
 */
export class PanelTestHarness {
  // Panel creation
  createMockPanel(): vscode.WebviewPanel
  createMockEnvironment(): Environment

  // User interactions
  simulateButtonClick(buttonId: string): void
  simulateLinkClick(linkElement: HTMLElement): void
  simulateEnvironmentChange(environmentId: string): void
  simulateColumnHeaderClick(columnKey: string): void
  simulateSearchInput(query: string): void

  // State inspection
  getVisibleRows(): HTMLTableRowElement[]
  getRecordCount(): string
  getSortIndicator(columnKey: string): '▲' | '▼' | null
  getButtonState(buttonId: string): { disabled: boolean; hasSpinner: boolean }
  getEnvironmentSelectorValue(): string

  // Async helpers
  waitForOperation(operation: Promise<void>): Promise<void>
  waitForPanelUpdate(): Promise<void>

  // Message interception
  getLastWebviewMessage(): WebviewMessage | null
  getAllWebviewMessages(): WebviewMessage[]
  clearMessageHistory(): void

  // Cleanup
  dispose(): void
}
```

### Mock Implementations
```typescript
// File: src/shared/testing/mocks/MockWebviewPanel.ts

/**
 * Mock implementation of vscode.WebviewPanel for testing.
 * Captures postMessage calls and simulates webview lifecycle.
 */
export class MockWebviewPanel implements vscode.WebviewPanel {
  // Track messages sent to webview
  public readonly messagesSent: unknown[] = [];

  // Simulate webview message handlers
  public readonly onDidReceiveMessage: vscode.Event<unknown>;

  // Trigger simulated user actions
  public simulateMessage(message: WebviewMessage): void;

  // ... other vscode.WebviewPanel members
}
```

### Fixture Data
```typescript
// File: src/shared/testing/fixtures/solutions.ts

/**
 * Mock solution data for integration tests.
 * Covers edge cases: Default solution, managed/unmanaged, null dates, special characters.
 */
export const mockSolutions = [
  {
    id: 'solution-1',
    uniqueName: 'DefaultSolution',
    friendlyName: 'Default Solution',
    version: '1.0.0.0',
    isManaged: false,
    isVisible: true,
    isApiManaged: false,
    publisherName: 'Default Publisher',
    installedOn: '2024-01-15T10:30:00Z',
    modifiedOn: '2024-02-20T14:45:30Z',
    description: 'System default solution',
  },
  {
    id: 'solution-2',
    uniqueName: 'CommonDataServices',
    friendlyName: 'Common Data Services',
    version: '9.2.24011.00174',
    isManaged: true,
    isVisible: true,
    isApiManaged: true,
    publisherName: 'Microsoft',
    installedOn: '2024-01-10T08:00:00Z',
    modifiedOn: '2024-02-15T12:00:00Z',
    description: 'Core platform components',
  },
  {
    id: 'solution-3',
    uniqueName: 'CustomSolution',
    friendlyName: 'Custom Solution with Spëcial Çhars',
    version: '1.0.0.1',
    isManaged: false,
    isVisible: false,
    isApiManaged: false,
    publisherName: 'Contoso',
    installedOn: null, // Test null date handling
    modifiedOn: '2024-03-01T09:15:00Z',
    description: '',
  },
  {
    id: 'solution-4',
    uniqueName: 'XSSTestSolution',
    friendlyName: '<script>alert("xss")</script>',
    version: '1.0.0.0',
    isManaged: false,
    isVisible: true,
    isApiManaged: false,
    publisherName: 'Security Test',
    installedOn: '2024-01-20T11:00:00Z',
    modifiedOn: '2024-01-20T11:00:00Z',
    description: 'Tests XSS protection',
  },
];

export const mockEnvironments = [
  {
    id: 'env-dev',
    name: 'Development',
    powerPlatformEnvironmentId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  },
  {
    id: 'env-test',
    name: 'Test',
    powerPlatformEnvironmentId: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
  },
  {
    id: 'env-prod',
    name: 'Production',
    powerPlatformEnvironmentId: undefined, // Test missing environment ID
  },
];
```

---

## Example Test Implementation

```typescript
// File: src/features/solutionExplorer/presentation/panels/__tests__/SolutionExplorerPanel.integration.test.ts

import { SolutionExplorerPanelComposed } from '../SolutionExplorerPanelComposed';
import { PanelTestHarness } from '../../../../shared/testing/PanelTestHarness';
import { mockSolutions } from '../../../../shared/testing/fixtures/solutions';

describe('SolutionExplorerPanel Integration Tests', () => {
  let harness: PanelTestHarness;
  let panel: SolutionExplorerPanelComposed;

  beforeEach(async () => {
    harness = new PanelTestHarness();

    // Create panel with test environment
    panel = await SolutionExplorerPanelComposed.createOrShow(
      harness.extensionUri,
      harness.getEnvironments,
      harness.getEnvironmentById,
      harness.listSolutionsUseCase,
      harness.urlBuilder,
      harness.viewModelMapper,
      harness.logger,
      'test-env-1'
    );

    await harness.waitForInitialization();
  });

  afterEach(() => {
    harness.dispose();
  });

  describe('Panel Initialization', () => {
    it('should open successfully with valid environment', async () => {
      // Arrange
      harness.mockSolutions(mockSolutions);

      // Act
      const rows = harness.getVisibleRows();
      const recordCount = harness.getRecordCount();

      // Assert
      expect(rows).toHaveLength(5);
      expect(recordCount).toBe('5 records');
      expect(panel.panel.title).toBe('Solutions - Test Environment');
    });
  });

  describe('Solution Link Clicks', () => {
    it('should open solution in Maker Portal', async () => {
      // Arrange
      const openExternalSpy = jest.spyOn(vscode.env, 'openExternal');
      const solutionLink = harness.getSolutionLink('solution-1');

      // Act
      await harness.simulateLinkClick(solutionLink);

      // Assert
      expect(openExternalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          authority: 'make.powerapps.com',
          path: expect.stringContaining('solution-1')
        })
      );
    });
  });

  // ... more tests
});
```

---

## Success Criteria

**Tests are successful when:**
- ✅ All 40+ integration tests pass
- ✅ Tests run in <10 seconds total
- ✅ Tests are independent (can run in any order)
- ✅ Tests clean up resources (no memory leaks)
- ✅ Tests catch regressions (previously found bugs fail without fixes)
- ✅ CI/CD pipeline includes integration tests

---

## Future Enhancements

### Additional Test Coverage
- **Performance tests**: Panel loads in <2 seconds with 1000 solutions
- **Accessibility tests**: Screen reader compatibility, keyboard navigation
- **Responsive tests**: Panel layout on different viewport sizes
- **Localization tests**: UI strings are localizable

### Test Automation
- **Visual regression tests**: Screenshot comparison for UI changes
- **E2E tests**: Full user workflows across multiple panels
- **Load tests**: Panel behavior with 10,000+ solutions

---

## References

- [CLAUDE.md](../../CLAUDE.md) - Project coding standards
- [Development Workflows](../../.claude/WORKFLOW.md) - Development workflow
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)

---

**Next Steps:**
1. **User decides** on singleton pattern and memory management
2. **Create Test Infrastructure**: `PanelTestHarness.ts`, `MockWebviewPanel.ts`, fixtures
3. **Implement Phase 1 Tests** (critical path, excluding blocked tests)
4. **Implement Approved Fixes** (TDD - tests first): Empty state, selector visibility
