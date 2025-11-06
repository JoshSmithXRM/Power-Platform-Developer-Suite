# Webview State Management - Technical Design

**Status:** Draft
**Date:** 2025-11-06
**Complexity:** Moderate

---

## Overview

**User Problem:** When VS Code webview panels update state (e.g., dropdown selection changes from "Off" to "Exception"), the entire DOM is destroyed and recreated, causing all JavaScript event listeners (dropdowns, search, sorting) to be lost. Currently, the backend calls `webview.html = fullHtml` which replaces the entire DOM, breaking interactive controls.

**Solution:** Implement a data-driven webview architecture where the backend sends only state/data updates via `postMessage`, and the client-side JavaScript reactively updates specific DOM elements without full HTML replacement. This separates concerns: backend handles state/business logic, frontend handles rendering/interactivity.

**Value:** Interactive controls (dropdowns, search, table sorting) maintain their event listeners across state updates. Dropdowns show correct selected state immediately. Better performance (smaller message payloads). Clear separation of concerns between backend (state) and frontend (presentation).

---

## Requirements

### Functional Requirements

**Current Behavior (Broken):**
- [x] Backend generates full HTML document
- [x] Backend sets `webview.html = fullHtml`
- [x] All DOM nodes replaced, event listeners lost
- [x] Frontend attempts re-initialization via `htmlUpdated` message (doesn't work reliably)

**Target Behavior:**
- [ ] Initial load: Backend sets `webview.html` once (full HTML with initial state)
- [ ] State updates: Backend sends data via `postMessage({ command: 'updateState', state: {...} })`
- [ ] Frontend receives state update and re-renders specific DOM nodes
- [ ] Event listeners preserved (no DOM replacement)
- [ ] Dropdown controls show correct selected state (checkmark on current selection)
- [ ] Search, sorting, and other interactive features continue working
- [ ] Works across all panels (Plugin Trace Viewer, Import Job Viewer, future panels)

### Non-Functional Requirements
- [ ] Clean Architecture compliance (presentation layer concern, no business logic leak)
- [ ] Reusable pattern across all panels
- [ ] Type-safe state contracts between backend and frontend
- [ ] Performance: State updates < 50ms (no full HTML regeneration)
- [ ] Maintainable: Clear separation of rendering logic (backend vs frontend)

### Success Criteria
- [ ] User clicks dropdown item → State updates → Dropdown shows checkmark on new selection
- [ ] User clicks dropdown item → Other dropdowns continue working (event listeners preserved)
- [ ] User searches table → Clicks dropdown → Search functionality still works
- [ ] Panel loads → User performs 5 different dropdown interactions → All controls responsive
- [ ] Code review: Clear distinction between "what to render" (state) and "how to render" (view logic)

---

## Problem Analysis

### Root Cause

**Current Architecture (Full HTML Replacement):**
```
User Action → Backend Handler → scaffoldingBehavior.refresh(data)
  → composer.compose(data) → Generates full HTML string
  → webview.html = fullHtml → ENTIRE DOM DESTROYED
  → Event listeners lost (DropdownComponent.js setupDropdownTriggers() not re-run)
  → postMessage({ command: 'htmlUpdated' }) → Re-initialization attempted
  → Dropdowns broken (event listeners never re-attached correctly)
```

**Why `htmlUpdated` Failed:**
1. Setting `webview.html` is asynchronous (no guarantee of when DOM ready)
2. `postMessage` sent immediately after `webview.html = ...` (race condition)
3. Message may arrive before new DOM fully loaded
4. Even if timing worked, full DOM replacement is fundamentally wrong pattern for interactive UIs

### Current File Structure

**Backend (TypeScript):**
- `HtmlScaffoldingBehavior.ts` - Sets `webview.html`, sends `htmlUpdated` message
- `SectionCompositionBehavior.ts` - Composes section HTML into layout
- `DropdownSection.ts` - Renders dropdown HTML (generates full dropdown markup)
- `dropdownView.ts` - View utility (renders dropdown HTML with checkmarks)
- `PluginTraceViewerPanelComposed.ts` - Panel coordinator (calls `scaffoldingBehavior.refresh()`)

**Frontend (JavaScript):**
- `DropdownComponent.js` - Attaches event listeners to dropdowns
- `DataTableBehavior.js` - Attaches search/sorting event listeners
- `PluginTraceViewerBehavior.js` - Panel-specific behavior (calls `initializeDropdowns()`)

**Key Insight:** Backend generates ALL HTML (including dropdown selection state). Frontend only attaches event listeners. When backend regenerates HTML, frontend loses all listeners.

---

## Design Decision: Data-Driven Updates

### Architecture Choice: Hybrid Approach

**Decision:** Use **data-driven updates for state changes**, **full HTML replacement only for structural changes**.

**Rationale:**
1. **Initial Load:** Full HTML replacement acceptable (no event listeners exist yet)
2. **State Updates:** Data-driven updates preserve DOM and event listeners
3. **Structural Changes:** Full HTML replacement when table rows change, filters added/removed

**Distinction:**
- **State changes:** Dropdown selection, sort direction, loading indicator, trace level value
- **Structural changes:** Table rows added/removed, new filters appear, layout changes

### When to Use Each Pattern

| Scenario | Pattern | Reason |
|----------|---------|--------|
| Panel first loads | Full HTML replacement | No listeners exist, need complete UI |
| Dropdown selection changes | Data-driven update | State only, preserve listeners |
| Trace level changes (dropdown) | Data-driven update | State only, preserve listeners |
| Auto-refresh interval changes | Data-driven update | State only, preserve listeners |
| Table data reloads (traces added/removed) | Full HTML replacement | Structural change (rows) |
| Search input changes | Data-driven update | Client-side only, no backend needed |
| Sorting changes | Data-driven update | Client-side only (current impl) |
| Detail panel opens/closes | Data-driven update | `showDetailPanel` / `hideDetailPanel` messages already work |

**Key Insight:** Most dropdown controls (trace level, auto-refresh, export format) are **state-only changes** that should use data-driven updates. Table data reloads are **structural changes** that justify full HTML replacement.

---

## Implementation Slices

### MVP Slice (Slice 1): "User can change trace level and dropdown shows selection"
**Goal:** Prove data-driven state updates work for a single dropdown

**Backend Changes:**
- Modify `PluginTraceViewerPanelComposed.handleSetTraceLevel()`:
  - After setting trace level, send state update message instead of full refresh
  - `postMessage({ command: 'updateDropdownState', dropdownId: 'traceLevelDropdown', selectedId: '1' })`
- NO change to HTML generation (initial load still uses full HTML)

**Frontend Changes:**
- Add `updateDropdownState()` function to `DropdownComponent.js`:
  - Finds dropdown by `dropdownId`
  - Updates checkmark on selected item
  - Removes checkmark from previously selected items
- Update `PluginTraceViewerBehavior.js` to handle `updateDropdownState` message

**Result:** User clicks "Trace Level → Exception" → Dropdown shows checkmark on Exception → Other dropdowns still work ✅

**Acceptance Test:**
1. Open Plugin Trace Viewer
2. Click "Trace Level" dropdown → Select "Exception"
3. Dropdown closes, shows checkmark on "Exception"
4. Click "Export" dropdown → Opens correctly (proves event listeners preserved)
5. Click "Trace Level" dropdown again → Still shows checkmark on "Exception"

---

### Slice 2: "User can change auto-refresh interval with dropdown state preserved"
**Builds on:** Slice 1 (reuse `updateDropdownState` pattern)

**Backend Changes:**
- Modify `PluginTraceViewerPanelComposed.handleSetAutoRefresh()`:
  - Send state update message: `postMessage({ command: 'updateDropdownState', dropdownId: 'autoRefreshDropdown', selectedId: '30' })`
  - Remove call to `scaffoldingBehavior.refresh()` (not needed for state-only change)

**Frontend Changes:**
- No changes needed (reuse `updateDropdownState()` from Slice 1)

**Result:** Auto-refresh dropdown shows correct selection, all controls work ✅

---

### Slice 3: "Handle table refresh without breaking dropdown state"
**Builds on:** Slices 1-2

**Problem:** When user clicks "Refresh" button, table data reloads (structural change). Currently uses full HTML replacement, which would break dropdown state.

**Solution:** Use full HTML replacement for table refresh, but re-apply state immediately after.

**Backend Changes:**
- `PluginTraceViewerPanelComposed.handleRefresh()`:
  - Keep full HTML replacement (table rows change structurally)
  - After `scaffoldingBehavior.refresh()`, send state restoration message:
    ```typescript
    await this.scaffoldingBehavior.refresh({ tableData, environments, currentEnvironmentId, state });

    // Restore dropdown states after DOM replacement
    await this.panel.webview.postMessage({
      command: 'restoreDropdownStates',
      states: {
        traceLevelDropdown: this.currentTraceLevel?.value.toString(),
        autoRefreshDropdown: this.autoRefreshInterval.toString()
      }
    });
    ```

**Frontend Changes:**
- Add `restoreDropdownStates()` function to `PluginTraceViewerBehavior.js`:
  - Calls `updateDropdownState()` for each dropdown
  - Re-initializes event listeners (calls `initializeDropdowns()`)

**Result:** User clicks Refresh → Table data updates → Dropdown selections preserved ✅

---

### Slice 4: "Generalize pattern for all panels"
**Builds on:** Slices 1-3

**Goal:** Extract reusable state management pattern

**Refactor:**
1. Create `StateManagementBehavior` (shared infrastructure)
   - `updateState(stateKey, value)` - Generic state update
   - `getState(stateKey)` - Get current state value
   - `restoreState(stateSnapshot)` - Restore all state after full refresh

2. Update `DropdownComponent.js`:
   - Make `updateDropdownState()` handle any dropdown (already generic by `dropdownId`)

3. Create documentation:
   - `WEBVIEW_STATE_MANAGEMENT_GUIDE.md` - When to use data-driven vs full HTML replacement
   - Add to `PANEL_DEVELOPMENT_GUIDE.md`

**Result:** Pattern ready for use in Import Job Viewer, future panels ✅

---

## Architecture Design

### Layer Responsibilities (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (Backend - TypeScript)                   │
│ - Panels coordinate use cases                               │
│ - Decide WHAT state to send (data, not HTML)               │
│ - Send state updates via postMessage                        │
│ - Generate initial HTML (full DOM, one-time)               │
└─────────────────────────────────────────────────────────────┘
                          ↓ postMessage ↓
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (Frontend - JavaScript)                  │
│ - Receive state updates via message listener               │
│ - Decide HOW to render state (update DOM)                  │
│ - Maintain event listeners (no DOM replacement)            │
│ - Handle user interactions (send commands to backend)      │
└─────────────────────────────────────────────────────────────┘
```

### State Update Flow (Data-Driven)

```
User Clicks Dropdown Item
  ↓
Frontend: DropdownComponent.js handleDropdownItemClick()
  ↓
postMessage({ command: 'setTraceLevel', data: { level: 'Exception' } })
  ↓
Backend: PanelCoordinator routes to handler
  ↓
Backend: handleSetTraceLevel() orchestrates use case
  ↓
Use Case: SetTraceLevelUseCase.execute() (business logic in domain)
  ↓
Backend: Update internal state (this.currentTraceLevel = level)
  ↓
Backend: Send state update to frontend
postMessage({ command: 'updateDropdownState', dropdownId: 'traceLevelDropdown', selectedId: '1' })
  ↓
Frontend: PluginTraceViewerBehavior receives message
  ↓
Frontend: updateDropdownState() finds dropdown, updates checkmark
  ↓
✅ Dropdown shows selected state, all event listeners preserved
```

### Full Refresh Flow (Structural Changes)

```
User Clicks "Refresh" Button
  ↓
Frontend: postMessage({ command: 'refresh' })
  ↓
Backend: handleRefresh() orchestrates use case
  ↓
Use Case: GetPluginTracesUseCase.execute() (loads data)
  ↓
Backend: Generate full HTML with new table rows
  ↓
Backend: webview.html = fullHtml (DOM replaced)
  ↓
Backend: Send state restoration message
postMessage({ command: 'restoreDropdownStates', states: {...} })
  ↓
Frontend: Document loads, runs initialization scripts
  ↓
Frontend: Receives 'restoreDropdownStates' message
  ↓
Frontend: Calls initializeDropdowns() (re-attach event listeners)
  ↓
Frontend: Calls updateDropdownState() for each dropdown (restore checkmarks)
  ↓
✅ Table updated, dropdowns restored, all event listeners working
```

---

## Type Contracts

### Frontend → Backend Messages (Commands)

```typescript
// User interactions that trigger state changes
type FrontendCommands =
  | { command: 'setTraceLevel'; data: { level: string } }
  | { command: 'setAutoRefresh'; data: { interval: number } }
  | { command: 'refresh' }
  | { command: 'viewDetail'; data: { traceId: string } }
  | { command: 'closeDetail' }
  | { command: 'exportCsv'; data: { traceIds: string[] } }
  | { command: 'exportJson'; data: { traceIds: string[] } }
  | { command: 'deleteAll' }
  | { command: 'deleteOld' };
```

### Backend → Frontend Messages (State Updates)

```typescript
// State updates sent from backend to frontend
type BackendStateUpdates =
  | { command: 'updateDropdownState'; dropdownId: string; selectedId: string }
  | { command: 'restoreDropdownStates'; states: Record<string, string> }
  | { command: 'showDetailPanel' }
  | { command: 'hideDetailPanel' }
  | { command: 'selectRow'; traceId: string }
  | { command: 'htmlUpdated' }; // Only for full DOM replacement
```

### Frontend State Update Handler Interface

```javascript
/**
 * Handles state updates from backend without full DOM replacement.
 * Preserves event listeners by updating specific DOM elements.
 */
interface IStateUpdateHandler {
  /**
   * Updates a dropdown's selected state (checkmark indicator).
   * @param dropdownId - The dropdown identifier (e.g., 'traceLevelDropdown')
   * @param selectedId - The selected item ID (e.g., '1' for Exception level)
   */
  updateDropdownState(dropdownId: string, selectedId: string): void;

  /**
   * Restores all dropdown states after full DOM replacement.
   * Called after table refresh or structural changes.
   * @param states - Map of dropdownId → selectedId
   */
  restoreDropdownStates(states: Record<string, string>): void;
}
```

---

## Implementation Details

### Backend: When to Use Data-Driven Updates

**Use Data-Driven Update When:**
- State-only change (no HTML structure modification)
- Dropdown selection changes
- Toggle button states
- Loading indicators
- Current value display updates

**Example (Trace Level Change):**
```typescript
// ❌ OLD PATTERN (Full HTML replacement)
private async handleSetTraceLevel(levelString: string): Promise<void> {
  const level = TraceLevel.fromString(levelString);
  await this.setTraceLevelUseCase.execute(this.currentEnvironmentId, level);
  this.currentTraceLevel = level;

  // Regenerates ENTIRE HTML (breaks event listeners)
  await this.scaffoldingBehavior.refresh({
    tableData: viewModels,
    environments,
    currentEnvironmentId: this.currentEnvironmentId,
    state: { traceLevel: level.value }
  });
}

// ✅ NEW PATTERN (Data-driven state update)
private async handleSetTraceLevel(levelString: string): Promise<void> {
  const level = TraceLevel.fromString(levelString);
  await this.setTraceLevelUseCase.execute(this.currentEnvironmentId, level);
  this.currentTraceLevel = level;

  // Send state update only (preserves event listeners)
  await this.panel.webview.postMessage({
    command: 'updateDropdownState',
    dropdownId: 'traceLevelDropdown',
    selectedId: level.value.toString()
  });
}
```

**Use Full HTML Replacement When:**
- Table rows added/removed
- Filter panel toggled (structural change)
- New sections added dynamically
- Layout changes (split panel opened/closed)

**Example (Table Refresh with State Restoration):**
```typescript
// ✅ CORRECT PATTERN (Full HTML + State Restoration)
private async handleRefresh(): Promise<void> {
  const traces = await this.getPluginTracesUseCase.execute(envId, filter);
  this.traces = traces;

  const viewModels = traces.map(t => this.viewModelMapper.toTableRowViewModel(t));

  // Full HTML replacement (table rows changed structurally)
  await this.scaffoldingBehavior.refresh({
    tableData: viewModels,
    environments,
    currentEnvironmentId: this.currentEnvironmentId,
    state: {
      traceLevel: this.currentTraceLevel?.value,
      autoRefreshInterval: this.autoRefreshInterval
    }
  });

  // Restore dropdown states after DOM replacement
  await this.panel.webview.postMessage({
    command: 'restoreDropdownStates',
    states: {
      traceLevelDropdown: this.currentTraceLevel?.value.toString() ?? '0',
      autoRefreshDropdown: this.autoRefreshInterval.toString()
    }
  });
}
```

---

### Frontend: State Update Implementation

**File: `resources/webview/js/components/DropdownComponent.js`**

```javascript
/**
 * Updates a dropdown's selected state without re-rendering entire dropdown.
 * Preserves event listeners by only updating checkmark indicators.
 *
 * @param {string} dropdownId - The dropdown identifier
 * @param {string} selectedId - The newly selected item ID
 */
function updateDropdownState(dropdownId, selectedId) {
  const dropdown = document.querySelector(`[data-dropdown-id="${dropdownId}"]`);
  if (!dropdown) {
    console.warn(`Dropdown not found: ${dropdownId}`);
    return;
  }

  // Get all items in this dropdown
  const items = dropdown.querySelectorAll('.dropdown-item');

  items.forEach(item => {
    const itemId = item.getAttribute('data-dropdown-item-id');
    const checkmark = item.querySelector('span:first-child'); // First span is checkmark

    if (itemId === selectedId) {
      // Add checkmark to selected item
      item.classList.add('dropdown-item--selected');
      if (checkmark) {
        checkmark.innerHTML = '✓';
        checkmark.style.color = 'var(--vscode-testing-iconPassed)';
      }
    } else {
      // Remove checkmark from non-selected items
      item.classList.remove('dropdown-item--selected');
      if (checkmark) {
        checkmark.innerHTML = '';
        checkmark.style.color = '';
      }
    }
  });
}

// Make available globally
window.updateDropdownState = updateDropdownState;
```

**File: `resources/webview/js/behaviors/PluginTraceViewerBehavior.js`**

```javascript
window.createBehavior({
  initialize() {
    setupTraceLevelButton();
    setupDetailPanelTabs();
    setupDetailPanelVisibility();
    setupRowSelection();
    initializeDropdowns();
  },
  handleMessage(message) {
    if (message.command === 'updateDropdownState') {
      // State-only update (no DOM replacement)
      window.updateDropdownState(message.dropdownId, message.selectedId);
    } else if (message.command === 'restoreDropdownStates') {
      // Restore all dropdown states after full DOM replacement
      restoreDropdownStates(message.states);
    } else if (message.command === 'htmlUpdated') {
      // Full DOM replacement occurred - re-initialize everything
      initializeDropdowns();
    }
  }
});

/**
 * Restores multiple dropdown states after DOM replacement.
 * Called after table refresh or other structural changes.
 */
function restoreDropdownStates(states) {
  // Re-attach event listeners first
  initializeDropdowns();

  // Then restore selection states
  Object.entries(states).forEach(([dropdownId, selectedId]) => {
    if (selectedId !== undefined && selectedId !== 'undefined') {
      window.updateDropdownState(dropdownId, selectedId);
    }
  });
}
```

---

## Migration Strategy

### Phase 1: Prove Pattern (Slice 1)
1. Implement `updateDropdownState()` in `DropdownComponent.js`
2. Modify `handleSetTraceLevel()` to use data-driven update
3. Test: Change trace level → Verify dropdown shows selection → Verify other controls work
4. ✅ Pattern validated

### Phase 2: Expand to All Dropdowns (Slices 2-3)
1. Apply pattern to `handleSetAutoRefresh()`
2. Apply pattern to any other state-only updates
3. Update `handleRefresh()` to restore state after full HTML replacement
4. Test: Full workflow (change level → refresh → change interval → refresh)
5. ✅ All dropdowns working reliably

### Phase 3: Generalize (Slice 4)
1. Extract `StateManagementBehavior` (optional, if reuse needed)
2. Document pattern in `WEBVIEW_STATE_MANAGEMENT_GUIDE.md`
3. Update `PANEL_DEVELOPMENT_GUIDE.md` with decision tree:
   - State-only change? → Use data-driven update
   - Structural change? → Use full HTML replacement + state restoration
4. ✅ Pattern ready for other panels

### Phase 4: Apply to Other Panels (Future)
1. Import Job Viewer
2. Solution Manager
3. Any future panels with interactive controls

---

## Testing Strategy

### Unit Tests (Frontend - JavaScript)

**File: `resources/webview/js/components/DropdownComponent.test.js` (if testing added)**

```javascript
describe('updateDropdownState', () => {
  it('should add checkmark to selected item', () => {
    // Setup: Create dropdown DOM
    document.body.innerHTML = `
      <div data-dropdown-id="traceLevelDropdown">
        <div class="dropdown-item" data-dropdown-item-id="0">
          <span></span><span>Off</span>
        </div>
        <div class="dropdown-item" data-dropdown-item-id="1">
          <span></span><span>Exception</span>
        </div>
      </div>
    `;

    // Act: Update state
    updateDropdownState('traceLevelDropdown', '1');

    // Assert: Exception item has checkmark, Off item does not
    const items = document.querySelectorAll('.dropdown-item');
    expect(items[0].querySelector('span').innerHTML).toBe('');
    expect(items[1].querySelector('span').innerHTML).toBe('✓');
  });

  it('should preserve event listeners', () => {
    // Verify event listeners not removed after state update
    // (Integration test - would need to actually attach listeners first)
  });
});
```

### Integration Tests (Backend - TypeScript)

**File: `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.test.ts`**

```typescript
describe('PluginTraceViewerPanelComposed', () => {
  describe('handleSetTraceLevel', () => {
    it('should send updateDropdownState message instead of full refresh', async () => {
      // Arrange: Create panel with mocked dependencies
      const mockWebview = createMockWebview();
      const panel = await createPanel({ webview: mockWebview });

      // Act: Change trace level
      await panel.handleSetTraceLevel('Exception');

      // Assert: Received state update message (NOT full HTML replacement)
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'updateDropdownState',
        dropdownId: 'traceLevelDropdown',
        selectedId: '1'
      });
      expect(mockWebview.html).not.toHaveBeenCalled(); // No full HTML replacement
    });
  });

  describe('handleRefresh', () => {
    it('should restore dropdown states after full HTML replacement', async () => {
      // Arrange: Panel with trace level set
      const mockWebview = createMockWebview();
      const panel = await createPanel({
        webview: mockWebview,
        initialTraceLevel: TraceLevel.fromString('Exception')
      });

      // Act: Refresh table data
      await panel.handleRefresh();

      // Assert: Full HTML replacement occurred + state restoration message sent
      expect(mockWebview.html).toHaveBeenCalled(); // Full refresh
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'restoreDropdownStates',
        states: {
          traceLevelDropdown: '1',
          autoRefreshDropdown: '0'
        }
      });
    });
  });
});
```

### Manual Testing Checklist

**Scenario 1: State-Only Updates**
- [ ] Open Plugin Trace Viewer
- [ ] Click "Trace Level" dropdown → Select "Exception"
- [ ] Verify: Dropdown closes, shows checkmark on "Exception"
- [ ] Click "Auto-Refresh" dropdown → Verify it opens (event listeners preserved)
- [ ] Click "Export" dropdown → Verify it opens
- [ ] Click "Trace Level" dropdown again → Verify "Exception" still selected

**Scenario 2: Full Refresh with State Restoration**
- [ ] Open Plugin Trace Viewer
- [ ] Set trace level to "All"
- [ ] Set auto-refresh to "30 seconds"
- [ ] Click "Refresh" button
- [ ] Verify: Table data refreshes
- [ ] Verify: Trace Level dropdown still shows "All" selected
- [ ] Verify: Auto-Refresh dropdown still shows "30 seconds" selected
- [ ] Verify: All dropdowns still responsive (event listeners work)

**Scenario 3: Mixed Interactions**
- [ ] Open Plugin Trace Viewer
- [ ] Search for "contact" in search box
- [ ] Change trace level to "Exception"
- [ ] Verify: Search results preserved
- [ ] Sort by "Created On" column
- [ ] Change auto-refresh to "10 seconds"
- [ ] Verify: Sort order preserved
- [ ] Click detail on a trace
- [ ] Verify: Detail panel opens, dropdowns still work
- [ ] Close detail panel
- [ ] Verify: All controls still functional

---

## Open Questions

### Q1: Should we always restore state after full HTML replacement?

**Answer:** Yes, for interactive controls like dropdowns. State restoration should happen automatically after any full HTML replacement that affects controls with selection state.

**Implementation:** Backend tracks current state (dropdown selections, toggle states) and sends `restoreDropdownStates` message after every `scaffoldingBehavior.refresh()` call.

---

### Q2: How to handle race conditions if user clicks dropdown during table refresh?

**Answer:** Disable controls during async operations (show loading spinner).

**Implementation:** Send `setLoading(true)` message before async operation, `setLoading(false)` after completion. Frontend disables buttons/dropdowns while loading.

---

### Q3: Should state be persisted across panel close/reopen?

**Answer:** Out of scope for this design. Current behavior: State resets when panel closes. Future enhancement: Use `PanelStateRepository` to persist dropdown selections.

**Rationale:** Solving event listener problem is prerequisite. State persistence is separate concern.

---

### Q4: What about panels with complex forms (not just dropdowns)?

**Answer:** Same pattern applies. Send form state updates via `postMessage`, update specific input values without replacing entire form DOM.

**Example:**
```typescript
// Backend
postMessage({ command: 'updateFormField', fieldId: 'solutionName', value: 'NewSolution' });

// Frontend
function updateFormField(fieldId, value) {
  const field = document.getElementById(fieldId);
  if (field) field.value = value;
}
```

---

## Dependencies

### External
- VS Code Webview API (`vscode.window.createWebviewPanel`, `webview.postMessage`)

### Internal
- `PanelCoordinator` (existing) - Routes commands from frontend to backend handlers
- `HtmlScaffoldingBehavior` (existing) - Handles full HTML replacement for initial load
- `DropdownComponent.js` (existing) - Will be extended with `updateDropdownState()`

### No Breaking Changes
- Initial load still uses full HTML replacement (existing pattern)
- Existing panels continue working unchanged
- Migration is opt-in (per command handler)

---

## Risks & Mitigations

### Risk 1: Timing issues with postMessage
**Impact:** State update message arrives before/after DOM ready
**Mitigation:** Use message queuing pattern (frontend buffers messages until DOM ready)

### Risk 2: State desync between backend and frontend
**Impact:** Backend thinks level = "Exception", frontend shows "Off"
**Mitigation:**
- Backend is source of truth (always correct)
- Send full state snapshot on initialization
- Add debug logging for state updates

### Risk 3: Partial adoption creates inconsistent UX
**Impact:** Some dropdowns use data-driven updates, others use full refresh
**Mitigation:** Complete migration in single PR (all dropdown handlers updated together)

### Risk 4: Performance regression for large state updates
**Impact:** Sending large state objects via postMessage slower than HTML generation
**Mitigation:**
- State updates are small (dropdown selections = strings/numbers)
- Full HTML replacement still used for large data (table rows)
- Benchmark: State update < 10ms, full HTML replacement > 100ms

---

## Success Metrics

### Performance
- State-only update: < 50ms (vs current 200ms+ full HTML replacement)
- Full HTML replacement + state restoration: < 300ms (acceptable for structural changes)

### Reliability
- Zero dropped events after 20 consecutive dropdown interactions
- 100% test pass rate for state update handlers

### Code Quality
- Clear decision tree documented: "When to use data-driven vs full HTML replacement"
- Pattern reusable across all panels (no copy-paste, use shared utilities)

---

## Future Enhancements (Out of Scope)

1. **Virtual DOM Framework**: Consider lightweight virtual DOM library (e.g., lit-html) for complex UIs
2. **State Persistence**: Save dropdown selections across panel close/reopen
3. **Optimistic UI Updates**: Update UI immediately, roll back if backend operation fails
4. **Undo/Redo**: Track state history for user-facing undo functionality

---

## References

- VS Code Webview API: https://code.visualstudio.com/api/extension-guides/webview
- Clean Architecture Guide: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- Panel Development Guide: `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
- Related Design: `docs/design/PLUGIN_TRACE_VIEWER_CONTROLS_DESIGN.md`

---

## Appendix: Decision Tree

**When State Changes in Backend...**

```
Is the change state-only?
  (Dropdown selection, toggle, current value display)
  ├─ YES → Use data-driven update
  │         postMessage({ command: 'updateDropdownState', ... })
  │         Frontend updates specific DOM element
  │         Event listeners preserved ✅
  │
  └─ NO → Does it change HTML structure?
           (Table rows, new filters, layout changes)
           ├─ YES → Use full HTML replacement + state restoration
           │         scaffoldingBehavior.refresh(...)
           │         postMessage({ command: 'restoreDropdownStates', ... })
           │         Event listeners re-initialized ✅
           │
           └─ UNSURE → Ask: "Would a user notice if we only updated
                       specific text/attributes, or do we need new DOM nodes?"
```

**Examples:**

| Change | Pattern | Reason |
|--------|---------|--------|
| Trace level Off → Exception | Data-driven | State only (dropdown selection) |
| Auto-refresh 10s → 30s | Data-driven | State only (dropdown selection) |
| Table refresh (same 50 rows) | Full HTML | Structural (row contents changed) |
| Table adds 10 new rows | Full HTML | Structural (new DOM nodes) |
| Detail panel opens | Data-driven | Class toggle (`hidden` → visible) |
| Loading spinner appears | Data-driven | State only (display property) |
| Sort column Created On → Duration | Data-driven (client-side) | No backend involved |
| Search filter "contact" → "account" | Data-driven (client-side) | No backend involved |

---

## Appendix: File Changes Summary

### Files to Modify

**Backend (TypeScript):**
1. `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`
   - `handleSetTraceLevel()` - Use data-driven update
   - `handleSetAutoRefresh()` - Use data-driven update
   - `handleRefresh()` - Add state restoration after full HTML replacement

**Frontend (JavaScript):**
1. `resources/webview/js/components/DropdownComponent.js`
   - Add `updateDropdownState()` function
   - Make globally available via `window.updateDropdownState`

2. `resources/webview/js/behaviors/PluginTraceViewerBehavior.js`
   - Update `handleMessage()` to handle `updateDropdownState` command
   - Add `restoreDropdownStates()` function

### Files to Create (Future - Slice 4)

**Documentation:**
1. `docs/architecture/WEBVIEW_STATE_MANAGEMENT_GUIDE.md` - Pattern guide
2. Update `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` - Add state management section

**Optional (if reuse needed):**
1. `src/shared/infrastructure/ui/behaviors/StateManagementBehavior.ts` - Generic state management

### No Changes Needed

- `HtmlScaffoldingBehavior.ts` - Continue using for initial load and full refreshes
- `DropdownSection.ts` / `dropdownView.ts` - Still generate initial HTML correctly
- `SectionCompositionBehavior.ts` - Still compose sections into layout
- `DataTableBehavior.js` - Search/sort already client-side, no changes needed

---

**End of Design Document**
