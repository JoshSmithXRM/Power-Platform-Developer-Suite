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

## Architect Review - Decisions & Open Discussion

**Review Date**: 2025-01-04
**Reviewed By**: clean-architecture-guardian
**Status**: 4 of 5 decisions approved, 1 under discussion

### 1. ⚠️ Panel Singleton vs Instance Pattern - UNDER DISCUSSION

**Current Implementation:**
- Uses singleton pattern with static map: `private static panels = new Map<string, SolutionExplorerPanelComposed>()`
- Map keyed by **initial** environment ID only
- When user changes environment via dropdown, `currentEnvironmentId` updates but map does NOT

**Confirmed Bug (if singleton is desired):**
1. User opens panel for `env-A` → map: `{ 'env-A': panelInstance }`
2. User switches to `env-B` via dropdown → `currentEnvironmentId = 'env-B'`, map unchanged
3. User opens new panel for `env-A` → creates **second** panel (violates singleton if intended)
4. User opens new panel for `env-B` → creates new panel (could reuse existing if singleton intended)

**Architect Recommendation:**
Update map on environment change to preserve singleton semantics:
```typescript
// Remove old key, add new key when environment changes
SolutionExplorerPanelComposed.panels.delete(oldEnvironmentId);
SolutionExplorerPanelComposed.panels.set(newEnvironmentId, this);
```

**Rationale Given:**
- Memory efficiency (webviews are heavy - full browser instances)
- State synchronization (prevent multiple panels showing different states)
- User confusion prevention (one view per resource)
- VS Code best practice pattern

**User Concerns:**
- **"Why can't I have two tabs for same environment?"** - What prevents this requirement?
- **"We're creating instances, not singletons"** - Is singleton actually needed?
- **Lack of explicit requirement** - Who requested singleton pattern?

**Need to Understand:**
1. **WHY singleton?** What is the actual requirement driving this?
2. **Pros/Cons of Singleton:**
   - What specific problems does singleton solve?
   - What user capabilities does singleton prevent?
3. **Pros/Cons of Instance (no singleton):**
   - What flexibility does instance pattern provide?
   - What problems does instance pattern create?
4. **User scenarios:**
   - Why would user want 2 panels for same environment?
   - What breaks if we allow multiple panels?

**Decision Status:** 🚫 **NOT APPROVED - NEEDS DISCUSSION**

**Action Required:**
- Document specific use cases for multiple panels of same environment
- Analyze memory/performance impact of multiple webview instances
- Evaluate state synchronization complexity with multiple panels
- Consider hybrid: singleton by default, allow override for specific user actions
- Review VS Code extension examples to see how they handle this

**Impact on Tests:**
- Cannot finalize singleton behavior tests until pattern is decided
- May need separate test suites for singleton vs instance patterns
- Test spec lines 87-104, 150-161 depend on this decision

---

### 2. ✅ Panel Behavior with No Environments - APPROVED

**Current Behavior:**
- `createOrShow()` throws `Error('No environments available')` if no environments exist
- Panel does not open, user sees error notification

**Architect Decision:** Show empty state (not error)

**Approved Implementation:**
- Allow `currentEnvironmentId: string | null`
- Use sentinel key `'__no_environment__'` for singleton/instance map (if kept)
- Render empty state with message: "No environments configured. Configure an environment to view solutions."
- Hide environment selector when 0 environments
- Disable action buttons (Refresh, Open in Maker)

**Rationale:**
- **Consistency**: Environment Setup panel MUST open with 0 environments (migration requirement)
- **User guidance**: Panel shows helpful message directing user to next steps
- **No dead end**: User sees UI and understands prerequisites
- **Progressive disclosure**: Panel exists but features disabled until prerequisites met

**Panel-Specific Behavior:**
Each panel decides its prerequisites:
- Solution Explorer: Can show empty state (not useful without environment)
- Environment Setup: MUST show with 0 environments (this is where user adds first environment)
- Plugin Registration: Requires environment + solution (multiple prerequisites)

**Decision Status:** ✅ **APPROVED**

**Impact on Tests:**
- Test spec line 68-75: Update to expect empty state (not error)
- Add tests for empty state rendering
- Add tests for disabled buttons with no environment

---

### 3. ✅ Environment Selector Visibility - APPROVED

**Current Behavior:**
- Environment selector always visible, regardless of environment count

**Architect Decision:** Automatic visibility based on count

**Approved Implementation:**
```typescript
// In EnvironmentSelectorSection.render()
public render(context: SectionRenderContext): string {
    const environments = context.data.environments || [];

    // Hide selector if 0 or 1 environments (user has no choice)
    if (environments.length <= 1) {
        return ''; // Render nothing
    }

    // Render dropdown for 2+ environments
    return renderEnvironmentSelectorView({ environments, currentEnvironmentId });
}
```

**Visibility Rules:**
- **0 environments**: Hide selector (panel shows empty state)
- **1 environment**: Hide selector (no choice, show environment name in title)
- **2+ environments**: Show selector

**Logic Location:** `EnvironmentSelectorSection.render()` (encapsulation)

**Title Behavior with 1 Environment:**
```typescript
if (environments.length === 1) {
    this.panel.title = `Solutions - ${environments[0].name}`;
} else {
    this.panel.title = 'Solutions'; // Dropdown makes it obvious
}
```

**Rationale:**
- **Automatic is simpler**: No configuration burden on panel developers
- **Consistent UX**: All panels behave the same (user learns once)
- **Logic belongs in section**: Section knows when it has nothing useful to show
- **Encapsulation**: Panel doesn't need to know about environment count

**Decision Status:** ✅ **APPROVED**

**Impact on Tests:**
- Test spec line 162-169: Update to expect automatic visibility
- Add test for selector hidden with 0 environments
- Add test for selector hidden with 1 environment
- Add test for title showing environment name when selector hidden

---

### 4. ✅ Search Box Disabled State - APPROVED

**Current Behavior:**
- Search input always enabled, even when no data

**Architect Decision:** Keep search enabled always

**Approved Implementation:**
- No changes needed (current behavior is correct)
- Search box always enabled regardless of data state

**Rationale:**
- **Simpler implementation**: No enable/disable state management
- **No confusing transitions**: Disabled → enabled state change is jarring
- **Harmless**: User can type, sees "0 records found", no harm done
- **Faster UX**: User can type search query while data loads (filters immediately when data arrives)

**Behavior:**
- Empty table + user types search → shows "0 records found"
- Empty table + user clears search → shows "0 records" (empty state message)

**Decision Status:** ✅ **APPROVED**

**Impact on Tests:**
- Test spec line 82-88: Remove expectation for disabled state
- Search always enabled, no tests needed for disabled state

---

### 5. ⚠️ Singleton Pattern Rationale - REQUIRES DEEPER DISCUSSION

**Architect Position:** Keep singleton pattern (VS Code best practice)

**Architect's Rationale:**
1. **Memory efficiency**: Webviews are heavy (full browser instances)
2. **State synchronization**: Prevents multiple panels showing different states
3. **User confusion prevention**: One view per resource (like one editor per file)
4. **VS Code pattern**: Recommended in webview documentation

**Pros/Cons Analysis (from Architect):**

| Aspect | Singleton | Multiple Instances |
|--------|-----------|-------------------|
| **Memory** | ✅ Lower (1 webview per env) | ❌ Higher (N webviews per env) |
| **State Sync** | ✅ No sync issues | ❌ Complex (must broadcast) |
| **UX Clarity** | ✅ User knows where to look | ⚠️ User must track multiple |
| **Flexibility** | ⚠️ Can't compare side-by-side | ✅ Multiple views |
| **Implementation** | ⚠️ Must update map on env change | ✅ Simpler (no map) |

**User's Concerns:**
- **"Why can't I have two tabs for same environment?"** - User wants this capability
- **"We're creating instances, not singletons"** - Questioning the pattern itself
- **No explicit requirement** - Who decided singleton is necessary?

**Open Questions:**
1. **What is the actual user requirement?** Why would user want 2 panels for same environment?
   - Compare solutions in 2 different sorted orders?
   - Reference one panel while working in another?
   - Keep one panel stable while refreshing another?

2. **Memory impact - is it significant?**
   - How much memory does 1 webview use? (need actual numbers)
   - Is 2 webviews for same environment actually a problem?
   - Do we have performance constraints that require singleton?

3. **State sync - is it actually complex?**
   - If panels are read-only (no edits), what state needs syncing?
   - Refresh button only affects the panel where it's clicked
   - Is there actual sync complexity or theoretical concern?

4. **What do other VS Code extensions do?**
   - Do they enforce singleton for data panels?
   - Or do they allow multiple instances?
   - Examples to research

5. **Hybrid approach possible?**
   - Default behavior: reveal existing panel (singleton-like)
   - User option: "Open in new panel" (instance-like)
   - Best of both worlds?

**Decision Status:** 🚫 **NOT APPROVED - REQUIRES DISCUSSION**

**Next Steps:**
1. User provides specific use cases for wanting multiple panels
2. Research actual memory footprint of VS Code webviews
3. Evaluate if state synchronization is real concern for read-only panels
4. Review VS Code extension examples (GitHub, GitLens, etc.)
5. Consider hybrid approach with user control
6. Reconvene to decide: singleton, instance, or hybrid

**Impact on Tests:**
- Cannot write singleton behavior tests until pattern is decided
- May need separate test suites depending on decision
- Test infrastructure (PanelTestHarness) should support both patterns

---

## 🗣️ Singleton Pattern Discussion - User & Architect Alignment Needed

**Current Status:** Architecture decision blocked - need consensus before proceeding with implementation

### User's Position: Remove or Make Optional

**Use Cases for Multiple Panels:**
> *User: Please provide specific scenarios where you want 2+ panels for same environment*

*Placeholder for user's use cases - to be filled in discussion*

**Concerns About Singleton:**
1. **Limitation without justification**: "Why can't I have two tabs for same environment?"
2. **Semantic mismatch**: "We're creating instances, not singletons really"
3. **No explicit requirement**: Who originally decided singleton was necessary?
4. **Complexity**: Singleton map management adds complexity (update on env change, disposal, etc.)

**Preference:** Allow multiple instances unless there's compelling reason not to

---

### Architect's Position: Keep Singleton Pattern

**VS Code Best Practice:**
- Webview panel documentation recommends singleton for resource-based panels
- Pattern: one editor per file, one panel per resource

**Technical Concerns:**
1. **Memory**: Each webview = full browser instance (Chromium)
2. **State sync**: If user refreshes one panel, other panels show stale data
3. **User confusion**: "Which panel am I looking at?" cognitive overhead

**Recommendation:** Singleton per environment, update map on environment change

---

### Questions to Resolve

**1. What are the actual use cases?**
- Why would user want 2 panels showing same environment's solutions?
- Is it for comparison (2 different sorts)?
- Is it for reference (keep one stable while interacting with another)?
- Is it for workflow (solutions panel + plugin registration panel both showing same env)?

**2. What is the actual memory impact?**
- Need measurements: How much memory does 1 webview use?
- Is 2-3 webviews for same environment actually a problem?
- Do we have performance constraints?

**3. Is state synchronization a real concern?**
- Current panels are **read-only** (no edit operations)
- Refresh button only affects the panel where clicked
- User can manually refresh other panels if needed
- Is automatic sync actually required?

**4. What do similar extensions do?**
Research needed:
- GitHub extension: How does it handle multiple PR panels?
- GitLens extension: Multiple file history panels?
- Azure extension: Multiple resource panels?

**5. Could we do hybrid?**
Options:
- **A) Default singleton, user can override**: Command "Open Solutions" reveals existing, "Open Solutions in New Panel" creates new instance
- **B) Always instance**: Remove singleton map entirely, simplest code
- **C) Configurable**: User setting "allowMultiplePanels: true/false"

---

### Proposed Resolution Process

**Option 1: User Provides Compelling Use Cases**
- If use cases are strong → remove singleton, allow instances
- Update test spec to test instance behavior (no singleton map)
- Simpler implementation (remove static map, remove map updates)

**Option 2: Architect's Concerns are Compelling**
- If memory/state sync are real problems → keep singleton
- Implement architect's recommendation (update map on env change)
- Add tests for singleton behavior

**Option 3: Compromise (Hybrid)**
- Default behavior reveals existing panel (feels like singleton)
- User can explicitly request new panel (instances allowed)
- Best of both worlds, slightly more complex

**Option 4: Research First**
- Measure actual memory footprint
- Review other VS Code extensions
- Make data-driven decision

---

### Impact on Test Specification

**If Singleton (Architect's recommendation):**
- Add tests for singleton map behavior
- Add tests for map updates on environment change
- Add tests for panel disposal removing from map
- Add tests for revealing existing panel

**If Instance (User's preference):**
- Remove all singleton-related tests
- Simplify panel creation (no map checks)
- Test that multiple panels can exist for same environment
- Test that panels are independent (refresh one doesn't affect others)

**If Hybrid:**
- Add tests for both behaviors
- Test default command reveals existing
- Test "new panel" command creates instance
- Test user setting toggles behavior

---

### Next Steps

1. **User**: Provide specific use cases for wanting multiple panels
2. **Research**: Measure webview memory, review other extensions
3. **Discussion**: Evaluate use cases vs. technical concerns
4. **Decision**: Choose option 1, 2, 3, or 4 above
5. **Update Tests**: Revise test specification based on decision
6. **Implement**: Write tests (TDD), then fix bugs

**IMPORTANT:** Do NOT implement singleton bug fix until pattern is decided and tests are written

---

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
- [WORKFLOW_GUIDE.md](../../.claude/WORKFLOW_GUIDE.md) - Development workflow
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)

---

**Next Steps:**
1. ✅ **Architect Review Complete** - 4 of 5 decisions approved, 1 requires user/architect discussion
2. **BLOCKED: Resolve Singleton Pattern** - See "Singleton Pattern Discussion" section
3. **Create Test Infrastructure** (can start while singleton is discussed):
   - `PanelTestHarness.ts` helper class (support both singleton and instance patterns)
   - `MockWebviewPanel.ts` mock implementation
   - `fixtures/solutions.ts` and `fixtures/environments.ts`
4. **Implement Phase 1 Tests** (after singleton decision) - 7 tests covering core functionality
5. **Implement Approved Fixes** (TDD - tests first!):
   - Empty state for no environments
   - Environment selector visibility
6. **Implement Phase 2-4 Tests** - Data integrity, edge cases, polish

---

## Document Summary & Recommendations

### Test Coverage Statistics
- **Total integration tests specified**: 60+ test cases
- **Categories**: 13 test categories covering full panel lifecycle
- **Current implementation coverage**: 0 tests (no integration tests exist)
- **Estimated implementation effort**:
  - Phase 1 (MVP): Simple (7 tests, critical path only)
  - Phase 2 (Data Integrity): Moderate (8 tests, contracts + formatting)
  - Phase 3-4 (Complete): Complex (45+ tests, full coverage)

### Key Findings from Review

**✅ Correctly Implemented:**
- Client-side sorting with locale-aware comparison
- Client-side search with row striping
- XSS protection via HTML escaping
- Boolean/date field formatting in mapper
- Button state management via PanelCoordinator
- WebviewMessage contract with `data` property

**⚠️ Architecture Decisions:**
1. ✅ **APPROVED**: Panel behavior when no environments configured (show empty state)
2. ✅ **APPROVED**: Environment selector visibility (hide when ≤1 environments)
3. ✅ **APPROVED**: Search box disabled state (keep enabled always)
4. 🚫 **BLOCKED**: Singleton pattern - requires user/architect alignment (see discussion section)

**❌ Missing Implementation (Approved for Implementation):**
1. Empty state support when no environments configured
2. Environment selector conditional visibility (hide when ≤1 environments)

**🐛 Confirmed Bugs (DO NOT FIX until tests written):**
1. **Panel throws error with 0 environments** - Should show empty state instead
2. **Environment selector always shows** - Should hide when ≤1 environments
3. **Singleton map not updated on env change** - Bug only if singleton pattern is kept (under discussion)

**⚠️ Known Limitations (Not Bugs):**
1. **Sort state lost on refresh** - Client-side sorting, expected behavior
2. **Search + Sort interaction** - Needs verification test

### Recommendations

1. ✅ **Architect consultation complete** - 4 of 5 decisions approved
   - **BLOCKED**: Singleton pattern discussion required (see discussion section above)
   - **APPROVED**: Empty state, selector visibility, search enabled

2. **Resolve singleton pattern decision FIRST**
   - User to provide specific use cases for multiple panels
   - Research webview memory footprint and other extensions
   - Choose: singleton, instance, or hybrid approach
   - This decision blocks singleton-related test implementation

3. **Implement PanelTestHarness as reusable infrastructure** (can start now)
   - Design harness to support both singleton and instance patterns
   - Will be needed for all future panel integration tests
   - Investment now pays off for Environment Setup, Plugin Registration, etc.

4. **Follow TDD strictly for bug fixes**
   - ❌ **DO NOT fix bugs until tests are written**
   - Write failing test first (proves bug exists)
   - Implement fix (test passes)
   - Prevents regression

5. **Start with Phase 1 tests** (after singleton decision)
   - Happy path tests easier to implement
   - Proves out harness design before complex edge cases
   - Excludes singleton tests (blocked)

6. **Document "known limitations"** for client-side sorting
   - Sort state lost on refresh (expected, not a bug)
   - No server-side sort order persistence
   - Users may expect sort to persist (UX consideration)
