# Plugin Trace Viewer - Dropdown Controls & Filter Panel Requirements

**Feature:** Dropdown Controls and Dynamic Filter Panel for Plugin Trace Viewer
**Date:** 2025-11-06
**Status:** Requirements Gathering → Ready for Architect Review

---

## 1. Overview

The Plugin Trace Viewer currently has simple button controls but needs dropdown menus for grouped actions (Export, Delete, Trace Level, Auto-Refresh) and a dynamic filter panel to filter traces by any API field. The old implementation (TEMP/templates) had these features, and we need to rebuild them using our current Clean Architecture and PanelCoordinator patterns.

---

## 2. Current State

### What We Have
- **Simple buttons** in ActionButtonsSection (Refresh, Open in Maker, Delete Selected, etc.)
- **Single cycle button** for Trace Level (changes Off → Exception → All)
- **Environment selector dropdown** (reusable pattern in shared/infrastructure/ui)
- **PanelCoordinator architecture** with sections
- **Full API data** available through domain entities
- **TraceFilter domain entity** (supports OData filtering)

### What's Missing
- ❌ **No dropdown controls** (only simple buttons)
- ❌ **No Export dropdown** (CSV/JSON as separate buttons)
- ❌ **No Delete dropdown** (multiple delete actions as separate buttons)
- ❌ **No TraceLevel dropdown** (just a cycle button, not a dropdown)
- ❌ **No Auto-Refresh control** (completely missing)
- ❌ **No filter panel** (filtering is manual in code only)

### Old Implementation (TEMP/templates)
```typescript
// Old dropdown structure from PluginTraceViewerPanel.ts (lines 166-212)
{
    id: 'export',
    label: 'Export',
    icon: 'export',
    type: 'dropdown',
    dropdownItems: [
        { id: 'csv', label: 'Export to CSV' },
        { id: 'json', label: 'Export to JSON' }
    ]
},
{
    id: 'delete',
    label: 'Delete',
    icon: 'trash',
    type: 'dropdown',
    dropdownItems: [
        { id: 'delete-all', label: 'Delete All Traces...' },
        { id: 'delete-old', label: 'Delete Old Traces...' }
    ]
},
{
    id: 'traceLevel',
    label: 'Trace Level: Off',
    type: 'dropdown',
    dropdownItems: [
        { id: '0', label: 'Off' },
        { id: '1', label: 'Exception' },
        { id: '2', label: 'All' }
    ]
},
{
    id: 'autoRefresh',
    label: 'Auto-Refresh: ⏸ Paused',
    type: 'dropdown',
    dropdownItems: [
        { id: '0', label: '⏸ Paused' },
        { id: '10', label: '▶ Every 10s' },
        { id: '30', label: '▶ Every 30s' },
        { id: '60', label: '▶ Every 60s' }
    ]
}
```

---

## 3. Requirements

### 3.1 Reusable Dropdown Control Abstraction

**FR-1.1: Generic Dropdown Section**
- **MUST** create a reusable `DropdownSection` that implements `ISection`
- **MUST** support configurable dropdown items (id, label)
- **MUST** support current selection state (displayed in button label)
- **MUST** emit commands when dropdown items are selected
- **MUST** work within PanelCoordinator architecture
- **MUST** match VS Code styling (similar to environment selector)
- **SHOULD** support icons on dropdown items (optional)
- **SHOULD** support disabled state for items
- **SHOULD** support separators between groups

**FR-1.2: Reuse or Extend Existing Patterns**
- **MUST** follow `EnvironmentSelectorSection` pattern (existing dropdown example)
- **MUST** use `ISection` interface with `SectionPosition.Toolbar`
- **MUST** separate view rendering from state management
- **SHOULD** extract common dropdown HTML/CSS to shared view utility
- **SHOULD** consider if `ActionButtonsSection` can be extended to support dropdown type

**Questions for Architect:**
- Should we extend `ActionButtonsSection` to support dropdown type, OR create separate `DropdownSection`?
- Should dropdown be a generic section, OR specific sections per use case (ExportDropdownSection, etc.)?
- Should we create a shared `renderDropdown()` utility function like `renderEnvironmentSelector()`?

---

### 3.2 Export Dropdown Control

**FR-2.1: Export Dropdown UI**
- **MUST** display "Export ▲" button with dropdown arrow indicator
- **MUST** show dropdown menu with 2 options:
  - "Export to CSV"
  - "Export to JSON"
- **MUST** position in toolbar (left side, before Delete)
- **SHOULD** use export icon (matching old implementation)

**FR-2.2: Export Actions**
- **MUST** emit `exportToCsv` command when "Export to CSV" selected
- **MUST** emit `exportToJson` command when "Export to JSON" selected
- **MUST** export currently filtered/visible traces (respect active filters)
- **SHOULD** show progress indicator for large exports
- **SHOULD** include trace count in success message

**FR-2.3: Export Data Scope**
- **MUST** export all columns from `PluginTraceTableRowViewModel`:
  - createdOn, pluginName, entityName, messageName, operationType, mode, depth, duration, status
- **SHOULD** use human-readable headers (e.g., "Created On" not "createdOn")
- **SHOULD** format dates consistently (ISO 8601 for JSON, locale for CSV)
- **MUST NOT** include HTML formatting (e.g., pluginNameHtml)

---

### 3.3 Delete Dropdown Control

**FR-3.1: Delete Dropdown UI**
- **MUST** display "Delete ▼" button with dropdown arrow indicator
- **MUST** show dropdown menu with 2 options:
  - "Delete All Traces..."
  - "Delete Old Traces..."
- **MUST** position in toolbar (after Export, before Trace Level)
- **SHOULD** use trash/delete icon
- **SHOULD** use danger variant color (red) to indicate destructive action

**FR-3.2: Delete Actions**
- **MUST** emit `deleteAllTraces` command when "Delete All Traces..." selected
- **MUST** emit `deleteOldTraces` command when "Delete Old Traces..." selected
- **MUST** show confirmation dialog before deletion (with trace count)
- **SHOULD** use "..." ellipsis to indicate confirmation dialog will appear

**FR-3.3: Delete Old Traces Logic**
- **MUST** define "old" as traces older than 30 days (configurable?)
- **SHOULD** show count of traces to be deleted in confirmation
- **MUST** respect trace level setting (don't delete traces if level is Off?)
- **QUESTION:** Should "Delete Old Traces" be configurable (7/14/30/60 days)?

---

### 3.4 Trace Level Dropdown Control

**FR-4.1: Trace Level Dropdown UI**
- **MUST** display "Trace Level: {Current}" button with dropdown arrow
- **MUST** show current level in button label (e.g., "Trace Level: All ▲")
- **MUST** show dropdown menu with 3 options:
  - "Off"
  - "Exception"
  - "All"
- **MUST** highlight/checkmark currently selected level
- **MUST** position in toolbar (after Delete dropdown)

**FR-4.2: Trace Level Actions**
- **MUST** emit `setTraceLevel` command with level value (0/1/2)
- **MUST** update button label immediately after selection
- **MUST** call Dataverse API to set organization trace level
- **MUST** auto-refresh traces after level change
- **SHOULD** show warning when setting to "All" (performance impact)

**FR-4.3: Trace Level Domain Logic**
- **MUST** use existing `TraceLevel` value object (domain/valueObjects/TraceLevel.ts)
- **MUST** validate level values (0=Off, 1=Exception, 2=All)
- **MUST** provide `isPerformanceIntensive()` check (level = All)
- **SHOULD** warn user if "All" is selected on production environment

---

### 3.5 Auto-Refresh Dropdown Control

**FR-5.1: Auto-Refresh Dropdown UI**
- **MUST** display "Auto-Refresh: {Status}" button with dropdown arrow
- **MUST** show current state in button label:
  - "Auto-Refresh: ⏸ Paused"
  - "Auto-Refresh: ▶ Every 10s"
  - "Auto-Refresh: ▶ Every 30s"
  - "Auto-Refresh: ▶ Every 60s"
- **MUST** show dropdown menu with 4 options:
  - "⏸ Paused"
  - "▶ Every 10s"
  - "▶ Every 30s"
  - "▶ Every 60s"
- **MUST** highlight/checkmark currently selected interval
- **MUST** position in toolbar (rightmost control)

**FR-5.2: Auto-Refresh Actions**
- **MUST** emit `setAutoRefresh` command with interval value (0/10/30/60 seconds)
- **MUST** update button label immediately after selection
- **MUST** start/stop background timer based on selection
- **MUST** clear timer when interval changed or paused
- **MUST** refresh traces at specified interval (call existing refresh logic)
- **MUST** pause auto-refresh when user is viewing trace details (don't disrupt UX)
- **SHOULD** show visual indicator when refresh is in progress

**FR-5.3: Auto-Refresh Domain Logic**
- **MUST** create `RefreshInterval` value object (domain/valueObjects/RefreshInterval.ts)
- **MUST** validate interval values (0=Paused, 10/30/60 seconds)
- **MUST** provide `isPaused()`, `getIntervalSeconds()` methods
- **SHOULD** persist last selected interval (remember user preference)
- **MUST NOT** auto-refresh during active API calls (prevent race conditions)

**FR-5.4: Auto-Refresh Implementation Notes**
- **MUST** use `setInterval` on webview side (not extension)
- **MUST** clear interval on panel dispose/close
- **MUST** pause during active selection/editing
- **SHOULD** show countdown timer indicator (optional enhancement)
- **QUESTION:** Should auto-refresh respect filters? (always refresh with current filter state)

---

### 3.6 Filter Panel

**FR-6.1: Filter Panel UI**
- **MUST** display collapsible filter panel (above or below toolbar)
- **MUST** show "Filters" button/toggle to expand/collapse panel
- **MUST** show active filter count badge (e.g., "Filters (2)" when 2 filters active)
- **MUST** display filter controls in a form layout
- **SHOULD** use VS Code form styling (similar to settings UI)
- **SHOULD** collapse by default, expand when user clicks "Filters"

**FR-6.2: Filter Fields (Static - Phase 1)**

For **Phase 1**, implement static filters for common fields:

| Field | Type | Control | Example Values |
|-------|------|---------|---------------|
| **Plugin Name** | Text | Text input (substring match) | "MyPlugin" |
| **Entity Name** | Text | Text input (substring match) | "account" |
| **Message Name** | Text | Text input (substring match) | "Update" |
| **Operation Type** | Enum | Dropdown | Plugin, Workflow |
| **Mode** | Enum | Dropdown | Synchronous, Asynchronous |
| **Status** | Enum | Dropdown | Success, Failed |
| **Created On (From)** | Date | Date picker | 2025-11-01 |
| **Created On (To)** | Date | Date picker | 2025-11-06 |
| **Duration (Min)** | Number | Number input | 100 (ms) |
| **Duration (Max)** | Number | Number input | 5000 (ms) |
| **Has Exception** | Boolean | Checkbox | Yes/No |
| **Correlation ID** | Text | Text input (exact match) | "abc-123" |

**FR-6.3: Filter Actions**
- **MUST** emit `applyFilters` command when "Apply" button clicked
- **MUST** emit `clearFilters` command when "Clear All" button clicked
- **MUST** show "Apply" and "Clear All" buttons at bottom of filter panel
- **MUST** update table immediately after applying filters
- **MUST** preserve filters when auto-refresh runs
- **SHOULD** show filter summary above table (e.g., "Showing 15 traces where Plugin Name contains 'MyPlugin'")

**FR-6.4: Filter Domain Logic**
- **MUST** extend existing `TraceFilter` entity (domain/entities/TraceFilter.ts)
- **MUST** generate OData filter query from filter criteria
- **MUST** support multiple simultaneous filters (AND logic)
- **SHOULD** support OR logic within same field (e.g., "Plugin1 OR Plugin2")
- **MUST** validate filter inputs (dates, numbers, etc.)
- **MUST** handle null/empty values correctly

**Example OData Filter:**
```
pluginname eq 'MyPlugin' and messagename eq 'Update' and performanceexecutionduration gt 1000
```

---

### 3.7 Dynamic Filter Panel (Phase 2 - Future Enhancement)

**FR-7.1: Metadata API**
- **SHOULD** call Dataverse API to get entity metadata for `plugintracelog` table
- **SHOULD** retrieve field names, types, and display names dynamically
- **SHOULD** cache metadata (don't fetch every time)
- **SHOULD** provide fallback to static schema if metadata unavailable

**FR-7.2: Dynamic Filter Controls**
- **SHOULD** generate filter controls dynamically based on field type:
  - **Text fields** → Text input (substring match)
  - **Enum/OptionSet** → Dropdown (from metadata)
  - **Date fields** → Date picker
  - **Number fields** → Number input with min/max
  - **Boolean fields** → Checkbox or toggle
- **SHOULD** support custom operators per field type (equals, contains, greater than, etc.)
- **SHOULD** allow user to add/remove filter criteria dynamically

**FR-7.3: Advanced Filtering**
- **SHOULD** support complex queries (AND/OR groups)
- **SHOULD** support "not equals" / "not contains" operators
- **SHOULD** save filter presets (user-defined filters)
- **SHOULD** support filter templates (common queries)

**Note:** Phase 2 dynamic filtering is for future Data Explorer feature. Keep architecture extensible.

---

## 4. API & Data Structure

### 4.1 Available Fields from Dataverse API

**Source:** `DataversePluginTraceLogDto` (infrastructure/repositories/DataversePluginTraceRepository.ts)

| API Field Name | Type | Description |
|----------------|------|-------------|
| `plugintracelogid` | string (guid) | Unique trace ID |
| `createdon` | string (datetime) | Timestamp when trace created |
| `typename` | string | Plugin class name |
| `primaryentity` | string \| null | Entity logical name (e.g., "account") |
| `messagename` | string | SDK message (e.g., "Update", "Create") |
| `operationtype` | number | 1=Plugin, 2=Workflow |
| `mode` | number | 0=Synchronous, 1=Asynchronous |
| `depth` | number | Execution depth (nested plugin calls) |
| `performanceexecutionduration` | number | Duration in milliseconds |
| `performanceconstructorduration` | number | Constructor duration in milliseconds |
| `performanceexecutionstarttime` | string \| null | Start timestamp |
| `performanceconstructorstarttime` | string \| null | Constructor start timestamp |
| `exceptiondetails` | string \| null | Exception message/stack trace |
| `messageblock` | string \| null | Serialized execution context |
| `configuration` | string \| null | Plugin step configuration |
| `secureconfiguration` | string \| null | Secure configuration |
| `correlationid` | string \| null | Correlation ID for grouped operations |
| `requestid` | string \| null | Request ID |
| `pluginstepid` | string \| null | Plugin step ID (guid) |
| `persistencekey` | string \| null | Persistence key |
| `organizationid` | string \| null | Organization ID (guid) |
| `profile` | string \| null | Profile information |
| `issystemcreated` | boolean \| null | System-created flag |
| `_createdby_value` | string \| null | Created by user ID |
| `_createdonbehalfby_value` | string \| null | Created on behalf of user ID |

### 4.2 Domain Entity

**Source:** `PluginTrace` (domain/entities/PluginTrace.ts)

Rich domain model with behavior methods:
- `hasException()` → boolean
- `isSuccessful()` → boolean
- `getStatus()` → 'Success' | 'Failed'
- `isRelatedTo(correlationId: string)` → boolean
- `isNested()` → boolean (depth > 1)
- `isSynchronous()` / `isAsynchronous()` → boolean
- `hasCorrelationId()` → boolean

### 4.3 ViewModel Structure

**Source:** `PluginTraceViewModel` (application/viewModels/PluginTraceViewModel.ts)

**Table Row (displayed in grid):**
- createdOn, pluginName, entityName, messageName, operationType, mode, depth, duration, status

**Detail Panel (full details):**
- All table fields PLUS: stage, constructorDuration, executionStartTime, exceptionDetails, messageBlock, configuration, correlationId, requestId, etc.

---

## 5. Technical Considerations

### 5.1 Architecture Patterns

**Clean Architecture Layers:**
- **Domain:** `RefreshInterval` value object, extend `TraceFilter` entity
- **Application:** Filter use cases (ApplyFilterUseCase, ClearFilterUseCase)
- **Infrastructure:** OData query builder for filters
- **Presentation:** DropdownSection, FilterPanelSection, view rendering functions

**PanelCoordinator Integration:**
- Sections emit commands via `postMessage({ command: 'setAutoRefresh', data: { interval: 10 } })`
- Coordinator handles commands and delegates to use cases
- Sections re-render when state changes (e.g., trace level updated)

**Reusable Patterns:**
- Follow `EnvironmentSelectorSection` pattern for dropdown implementation
- Separate view rendering (`renderDropdown()`) from section state management
- Use `SectionPosition.Toolbar` for all dropdown controls

### 5.2 State Management

**Dropdown State:**
- Each dropdown section manages its own current selection state
- State changes trigger re-render of dropdown button label
- Coordinator holds global state (trace level, refresh interval, active filters)

**Filter State:**
- `TraceFilter` entity holds current filter criteria
- Coordinator passes filter to repository for API calls
- Filter persists across refresh operations

**Auto-Refresh State:**
- Timer ID stored in section (cleared on dispose)
- Interval value stored in coordinator state
- Paused during active API calls

### 5.3 UI/UX Considerations

**Dropdown Behavior:**
- Click button → show dropdown menu
- Click outside → close dropdown
- Click item → close dropdown, execute action, update button label
- Keyboard navigation (arrow keys, enter, escape)

**Filter Panel Behavior:**
- Collapsed by default (minimize visual clutter)
- Badge shows active filter count (0 = no badge)
- "Apply" button required (don't auto-filter on every keystroke for performance)
- "Clear All" removes all filters and refreshes

**Auto-Refresh UX:**
- Pause during detail panel viewing (don't disrupt user)
- Show visual indicator when refresh in progress (spinner)
- Don't refresh during active API calls (queue next refresh)
- Remember user preference across sessions

### 5.4 Performance Considerations

**Filtering:**
- Apply filters server-side (OData query) - don't filter large datasets client-side
- Limit result set to top 100/500/1000 (configurable?)
- Show warning if filter returns very large result set

**Auto-Refresh:**
- Don't refresh more frequently than 10 seconds (API throttling)
- Cancel pending refresh if user manually refreshes
- Show stale data indicator if refresh fails (e.g., API error)

**Dropdown Rendering:**
- Lazy render dropdown menu (only when opened)
- Cache rendered HTML (only re-render on state change)
- Use CSS for animations (not JavaScript)

---

## 6. Open Questions for Architect

### Q1: Dropdown Control Architecture
**Question:** Should we extend `ActionButtonsSection` to support a new `dropdown` button type, OR create separate `DropdownSection` implementations per control?

**Options:**
- **A)** Extend `ActionButtonsSection` with `type: 'button' | 'dropdown'` config
  - ✅ Reuses existing infrastructure
  - ❌ Adds complexity to ActionButtonsSection
- **B)** Create `DropdownSection` base class, specific sections per control
  - ✅ Follows single responsibility principle
  - ✅ More flexible for custom dropdown behavior
  - ❌ More files/code
- **C)** Create generic `DropdownSection<TConfig>` with config-driven behavior
  - ✅ Reusable for all dropdowns
  - ✅ Clean separation
  - ❌ May be over-engineered for 4 dropdowns

**Recommendation:** Option B (specific sections) - aligns with Clean Architecture, each dropdown has unique behavior.

---

### Q2: Filter Panel Architecture
**Question:** Should we implement dynamic filtering with metadata API now, or start with static schema and add dynamic later?

**Options:**
- **A)** Phase 1: Static schema (hardcoded filter fields) → Phase 2: Dynamic (metadata API)
  - ✅ Faster delivery
  - ✅ Meets immediate needs
  - ❌ Potential rework for Phase 2
- **B)** Full dynamic implementation from start
  - ✅ Future-proof for Data Explorer
  - ❌ More complex, slower delivery
  - ❌ Metadata API may not provide all needed info

**Recommendation:** Option A (phased approach) - deliver value faster, architecture can support dynamic later.

---

### Q3: OData Filter Query Builder
**Question:** Should we create a generic OData query builder utility, or handle filtering specific to plugin traces?

**Options:**
- **A)** Generic `ODataQueryBuilder` utility class (shared infrastructure)
  - ✅ Reusable for other features (Data Explorer)
  - ✅ Testable, single responsibility
  - ❌ May be over-engineered for current needs
- **B)** `PluginTraceFilterBuilder` specific to plugin traces
  - ✅ Simpler, focused on current feature
  - ❌ Not reusable for other entities

**Recommendation:** Option A (generic builder) - we know Data Explorer is coming, invest in reusable infrastructure.

---

### Q4: Auto-Refresh Timer Location
**Question:** Should auto-refresh timer live in the webview (presentation), or in the extension (coordinator)?

**Options:**
- **A)** Webview (JavaScript `setInterval` in section)
  - ✅ Simple, no extension communication overhead
  - ❌ Timer stops when panel hidden/inactive
  - ❌ Less reliable for background refresh
- **B)** Extension (VS Code extension host)
  - ✅ Reliable, works when panel inactive
  - ✅ Can show notifications when new traces arrive
  - ❌ More complex, more messages between webview/extension

**Recommendation:** Option A (webview) for now - simpler, panel is usually active when user wants auto-refresh. Can enhance later if needed.

---

### Q5: Filter Validation
**Question:** Should filter validation happen in domain (TraceFilter entity) or application (use case)?

**Options:**
- **A)** Domain (TraceFilter entity validates inputs in constructor/methods)
  - ✅ Business rules in domain (Clean Architecture)
  - ✅ Validation reusable across use cases
  - ❌ Domain shouldn't know about OData syntax
- **B)** Application (ApplyFilterUseCase validates, throws domain exceptions)
  - ✅ Use case orchestrates validation
  - ❌ Business rules leak into application layer

**Recommendation:** Option A (domain validation) - TraceFilter validates business rules (date ranges, numeric ranges), infrastructure handles OData translation.

---

## 7. Success Criteria

### Dropdown Controls
- ✅ Export dropdown with CSV/JSON options works
- ✅ Delete dropdown with All/Old options works
- ✅ Trace Level dropdown changes organization level and updates label
- ✅ Auto-Refresh dropdown starts/stops timer at specified interval
- ✅ All dropdowns follow VS Code styling (match environment selector)
- ✅ Commands properly routed through coordinator to use cases

### Filter Panel
- ✅ Filter panel collapses/expands on click
- ✅ Filter controls display for all static fields (plugin name, entity, message, dates, etc.)
- ✅ Apply filters generates correct OData query and refreshes table
- ✅ Clear filters removes all criteria and shows all traces
- ✅ Active filter count badge displays correctly
- ✅ Filters persist across auto-refresh operations

### Architecture
- ✅ Dropdown abstraction is reusable (not duplicated code)
- ✅ Clean Architecture maintained (domain → application → infrastructure → presentation)
- ✅ No business logic in presentation layer
- ✅ TraceFilter entity handles filter validation
- ✅ Tests written for domain and application layers (90%+ coverage)

### UX
- ✅ Dropdowns match VS Code native styling (theme variables)
- ✅ Auto-refresh doesn't disrupt user when viewing details
- ✅ Filter panel doesn't clutter UI when not in use
- ✅ Performance acceptable with 100+ traces (filtered server-side)

---

## 8. Implementation Notes

### Files to Create/Modify

**Dropdown Abstraction (Shared):**
- `src/shared/infrastructure/ui/sections/DropdownSection.ts` (base class or interface)
- `src/shared/infrastructure/ui/views/dropdownView.ts` (render utility)
- `src/shared/infrastructure/ui/styles/dropdown.css` (if needed)

**Plugin Trace Viewer - Dropdowns:**
- `src/features/pluginTraceViewer/presentation/sections/ExportDropdownSection.ts`
- `src/features/pluginTraceViewer/presentation/sections/DeleteDropdownSection.ts`
- `src/features/pluginTraceViewer/presentation/sections/TraceLevelDropdownSection.ts`
- `src/features/pluginTraceViewer/presentation/sections/AutoRefreshDropdownSection.ts`
- `src/features/pluginTraceViewer/presentation/views/dropdownViews.ts` (render functions)

**Plugin Trace Viewer - Filter Panel:**
- `src/features/pluginTraceViewer/presentation/sections/FilterPanelSection.ts`
- `src/features/pluginTraceViewer/presentation/views/filterPanelView.ts`
- `src/features/pluginTraceViewer/domain/entities/TraceFilter.ts` (extend existing)
- `src/features/pluginTraceViewer/domain/valueObjects/RefreshInterval.ts` (new)
- `src/features/pluginTraceViewer/application/useCases/ApplyFilterUseCase.ts` (new)
- `src/features/pluginTraceViewer/application/useCases/SetAutoRefreshUseCase.ts` (new)
- `src/features/pluginTraceViewer/infrastructure/odata/ODataQueryBuilder.ts` (new, shared utility)

**Tests:**
- `__tests__/RefreshInterval.test.ts`
- `__tests__/TraceFilter.test.ts` (extend existing)
- `__tests__/ApplyFilterUseCase.test.ts`
- `__tests__/SetAutoRefreshUseCase.test.ts`

### Reusable Patterns to Follow
```typescript
// Example: DropdownSection base structure
export abstract class DropdownSection implements ISection {
    public readonly position = SectionPosition.Toolbar;
    protected currentSelection: string;

    protected abstract getDropdownItems(): ReadonlyArray<DropdownItem>;
    protected abstract getButtonLabel(): string;

    public render(data: SectionRenderData): string {
        return renderDropdown({
            id: this.getId(),
            label: this.getButtonLabel(),
            items: this.getDropdownItems(),
            currentSelection: this.currentSelection
        });
    }
}

// Specific implementation
export class TraceLevelDropdownSection extends DropdownSection {
    private traceLevel: TraceLevel = TraceLevel.Off;

    protected getDropdownItems(): ReadonlyArray<DropdownItem> {
        return [
            { id: '0', label: 'Off' },
            { id: '1', label: 'Exception' },
            { id: '2', label: 'All' }
        ];
    }

    protected getButtonLabel(): string {
        return `Trace Level: ${this.traceLevel.toString()} ▲`;
    }

    public setTraceLevel(level: TraceLevel): void {
        this.traceLevel = level;
        this.currentSelection = level.toString();
    }
}
```

---

## 9. Next Steps

1. **Review Requirements** → Present to architect for design
2. **Architect Design** → Invoke `design-architect` agent with this requirements doc
3. **Implementation** → Build inside-out (domain → application → infrastructure → presentation)
4. **Testing** → Write tests after implementation, before review
5. **Review** → Invoke `code-guardian` once all layers complete
6. **Documentation** → Update panel guide if needed

---

## 10. References

**Current Code:**
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts` (main panel)
- `src/shared/infrastructure/ui/sections/EnvironmentSelectorSection.ts` (dropdown pattern)
- `src/features/pluginTraceViewer/domain/entities/TraceFilter.ts` (existing filter)
- `src/features/pluginTraceViewer/domain/valueObjects/TraceLevel.ts` (trace level enum)

**Old Code (Reference):**
- `TEMP/templates/src/panels/PluginTraceViewerPanel.ts` (old dropdown implementations)

**Architecture Guides:**
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- `.claude/WORKFLOW.md`
- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`

---

**Ready for Architect Review** ✅
