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
4. ✅ **FIXED**: Column sorting implemented with TableSortingBehavior
5. ❌ **OPEN**: Panel behavior when no environments configured (throws error - needs architect review)
6. ❌ **OPEN**: Singleton map behavior on environment change (needs architect review)

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
// GIVEN: Panel displays 10 solutions sorted by Solution Name (default)
// WHEN: User clicks "Version" column header
// THEN: Solutions re-render sorted by Version ascending
// AND: Version header shows ▲ indicator
// AND: TableSortingBehavior.handleSortRequest('version') called
// AND: Panel refreshes with sorted data
```

#### Test: Clicking same column header toggles sort direction
```typescript
// GIVEN: Solutions sorted by Version ascending (▲)
// WHEN: User clicks "Version" column header again
// THEN: Solutions re-render sorted by Version descending
// AND: Version header shows ▼ indicator
// AND: Sort direction toggles asc -> desc
```

#### Test: Clicking different column resets to ascending
```typescript
// GIVEN: Solutions sorted by Version descending (▼)
// WHEN: User clicks "Publisher" column header
// THEN: Solutions sorted by Publisher ascending
// AND: Publisher header shows ▲ indicator
// AND: Version header loses sort indicator
```

#### Test: Sort state persists across refresh
```typescript
// GIVEN: Solutions sorted by Publisher descending
// WHEN: User clicks Refresh button
// THEN: Refreshed data maintains Publisher descending sort
// AND: TableSortingBehavior retains sort state
```

#### Test: Sort handles null/undefined values
```typescript
// GIVEN: 5 solutions, 2 have null installedOn dates
// WHEN: User sorts by Installed On ascending
// THEN: Solutions with dates appear first (sorted)
// AND: Solutions with null dates appear last
```

#### Test: Sort uses locale-aware string comparison
```typescript
// GIVEN: Solutions with names containing accented characters (é, ñ, etc.)
// WHEN: User sorts by Solution Name
// THEN: Solutions sorted using String.localeCompare()
// AND: Accented characters sort correctly per locale
```

#### Test: Sort button does not trigger loading state
```typescript
// GIVEN: Panel is open
// WHEN: User clicks column header to sort
// THEN: Refresh button is NOT disabled
// AND: No loading spinner shown
// AND: Sort command registered with { disableOnExecute: false }
```

#### Test: Sort persists when environment changed
```typescript
// GIVEN: Solutions sorted by Version descending
// WHEN: User changes environment
// THEN: New environment's solutions loaded
// AND: Sort state resets to default (Solution Name ascending)
// NOTE: Current behavior - may want to persist sort across environments
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

### 5. Solution Link Click Tests

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

---

### 6. Action Button Tests

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

### 7. Table Rendering Tests

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
// GIVEN: Solution has isManaged=true, isVisible=false
// WHEN: Table renders
// THEN: Type column shows "Managed"
// AND: Visible column shows "No"
```

#### Test: Date fields formatted for display
```typescript
// GIVEN: Solution has installedOn="2024-01-15T10:30:00Z"
// WHEN: Table renders
// THEN: Installed On column shows formatted date (not ISO string)
```

---

### 8. Message Routing Tests

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

### 9. WebviewMessage Contract Tests

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

### 10. Button State Management Tests

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
// WHEN: User clicks Refresh again 500ms later
// THEN: Second click has no effect (button disabled)
// AND: Only one API call is made
```

---

### 11. Panel Disposal Tests

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

### 12. CSS and Styling Tests

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

## Test Implementation Priority

### Phase 1: Critical Path (MVP)
1. Panel initialization with valid environment
2. Solutions load on panel open
3. Refresh button reloads solutions
4. Clicking solution name opens in Maker Portal
5. Search filters solutions client-side

### Phase 2: Data Integrity
6. WebviewMessage contract (data vs payload)
7. Message routing for all commands
8. Environment selector changes environment
9. Button state management during operations

### Phase 3: Edge Cases
10. Panel with no environments configured
11. Empty state when environment has no solutions
12. Error handling for API failures
13. Environment selector hidden when only one environment

### Phase 4: Polish
14. Table rendering (all columns, formatting)
15. CSS and styling (striping, hover)
16. Panel disposal and cleanup
17. Singleton behavior per environment

---

## Test Infrastructure Needed

### Tools
- **Jest** - Already in use for unit tests
- **@testing-library/dom** - For DOM queries and assertions
- **jsdom** - For webview HTML rendering
- **Mock VS Code API** - For panel, webview, workspace mocking

### Test Helpers
```typescript
// File: src/shared/testing/PanelTestHarness.ts

export class PanelTestHarness {
  createMockPanel(): vscode.WebviewPanel
  createMockEnvironment(): Environment
  simulateButtonClick(buttonId: string): void
  simulateLinkClick(linkElement: HTMLElement): void
  simulateEnvironmentChange(environmentId: string): void
  getVisibleRows(): HTMLTableRowElement[]
  getRecordCount(): string
  waitForOperation(operation: Promise<void>): Promise<void>
}
```

### Fixture Data
```typescript
// File: src/shared/testing/fixtures/solutions.ts

export const mockSolutions = [
  {
    id: 'solution-1',
    uniqueName: 'DefaultSolution',
    friendlyName: 'Default Solution',
    version: '1.0.0.0',
    isManaged: false,
    publisherName: 'Default Publisher',
    // ... other fields
  },
  // ... more solutions
]
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
- [WORKFLOW_GUIDE.md](../../.claude/WORKFLOW_GUIDE.md) - Development workflow
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)

---

**Next Steps:**
1. Create `PanelTestHarness.ts` helper class
2. Create solution fixtures in `fixtures/solutions.ts`
3. Implement Phase 1 tests (Critical Path)
4. Add integration tests to CI/CD pipeline
5. Expand to Phase 2-4 tests
