# Temporary Issues Log

Issues discovered during development that need to be addressed.

---

## Issue: Environment Selector State Leaking Across Panel Instances

**Date**: 2025-10-28
**Severity**: High (Subtle but dangerous)
**Status**: Documented, needs investigation

### Description

When multiple panel instances of the same type are open (e.g., multiple Import Job Viewer tabs), environment selection state leaks across instances during refresh operations.

### Steps to Reproduce

1. Open multiple Import Job Viewer panels (or any panel with environment selector)
2. Set each panel to a different environment
3. Refresh one of the panels
4. **Bug**: The last environment selector that was updated gets applied to the refreshed tab, changing the query unexpectedly

### Impact

- Queries execute against wrong environment
- User expects to see data from Environment A, but sees data from Environment B
- Subtle and difficult to notice (dangerous)
- Affects all panels with environment selectors

### Root Cause Analysis

Likely a missing abstraction in how environment selector state is managed:
- State may be shared/static instead of instance-specific
- Refresh logic may be using global state instead of panel-specific state
- Event bridges or message handlers may not be properly scoped to panel instances

### Potential Solution

- Ensure each panel instance maintains its own environment selector state
- Verify event bridges are properly scoped to panel instances
- Audit refresh logic to ensure it uses instance-specific state, not global/last-updated state
- May be related to existing missing abstraction work in progress

### Files Likely Affected

- `src/components/controls/EnvironmentSelector/EnvironmentSelectorComponent.ts`
- `src/panels/BasePanel.ts` (refresh logic)
- Panel-specific refresh implementations
- Event bridge setup in panel constructors

### Notes

- This issue may already be addressed by missing abstraction work in progress
- Document here to ensure it's not missed during implementation
- Test with multiple panel instances after any environment selector refactoring

---

## Issue: Plugin Registration Missing Entity Information

**Date**: 2025-10-28
**Resolved**: 2025-10-29
**Severity**: Medium (Missing useful feature)
**Status**: ✅ Fixed

### Description

Plugin registration steps are missing entity information. We should retrieve and display which entity (table) each step is registered to, and include it in the search functionality.

### Current State

- Steps are loaded from `sdkmessageprocessingsteps` table
- We get: `name`, `stage`, `mode`, `rank`, `filteringattributes`, `statecode`
- **Missing**: Entity/table name that the step is registered to

### Desired State

- Retrieve entity information for each step
- Display entity in step label or properties
- Include entity name in `searchText` for comprehensive search
- Example: Search "contact" finds all steps registered to the contact entity

### Use Case

**Problem**: Developer needs to find all plugin steps registered to a specific entity (e.g., "opportunity")

**Current workaround**:
- Manually expand every assembly → plugin type → step
- Check properties panel for each step
- Slow and tedious

**With entity search**:
- Search "opportunity"
- Instantly see all steps registered to opportunity entity
- Massive productivity improvement

### Implementation Notes

**OData Query Update**:
```typescript
// Current query for steps
const queryUrl = `${baseUrl}/api/data/v9.2/sdkmessageprocessingsteps?
    $select=sdkmessageprocessingstepid,name,plugintypeid,sdkmessageid,stage,mode,rank,filteringattributes,statecode`;

// Need to expand sdkmessagefilter to get entity name
const queryUrl = `${baseUrl}/api/data/v9.2/sdkmessageprocessingsteps?
    $select=sdkmessageprocessingstepid,name,plugintypeid,sdkmessageid,stage,mode,rank,filteringattributes,statecode
    &$expand=sdkmessagefilterid($select=primaryobjecttypecode)`;
```

**Tree Node Update**:
```typescript
// Add entity to searchText
const stepNode = {
    label: step.name,
    searchText: `${step.filteringattributes} ${entityName}`,  // Include entity in search
    // ...
};
```

**Properties Panel**:
- Add "Entity" field to step properties display
- Show friendly entity name (e.g., "Contact" not "contact")

### Files Likely Affected

- `src/services/PluginRegistrationService.ts` (OData query update)
- `src/panels/PluginRegistrationPanel.ts` (`buildCompleteTree()`, `generateStepDetailsHTML()`)
- Properties panel rendering for steps

### Related

- Filtering attributes search already implemented (2025-10-28)
- This follows same pattern: add to searchText without cluttering label
- Should use same approach for entity search

### Resolution Summary (2025-10-29)

**Changes made:**

1. **PluginRegistrationService.ts:39** - Added `entityLogicalName?: string` to `PluginStep` interface
2. **PluginRegistrationService.ts:182** - Updated `getSteps()` query to expand `sdkmessagefilterid($select=primaryobjecttypecode)`
3. **PluginRegistrationService.ts:279** - Updated `getAllSteps()` query to expand `sdkmessagefilterid($select=primaryobjecttypecode)`
4. **PluginRegistrationPanel.ts:649-657** - Updated `buildCompleteTree()` to include entity name in `searchText`
5. **PluginRegistrationPanel.ts:276** - Added `'entitylogicalname': 'Entity'` to friendly name mappings

**Result:**
- ✅ Entity information now retrieved from Dataverse API
- ✅ Entity displayed in properties panel when step is selected
- ✅ Entity included in search - searching "contact" finds all steps registered to contact entity
- ✅ Massive productivity improvement for developers finding entity-specific plugin steps

---

## Issue: Metadata Browser Action Buttons Disabled on Initial Load

**Date**: 2025-10-28
**Updated**: 2025-10-29
**Severity**: Low (Simple bug, symptom of larger issue)
**Status**: Documented, quick fix available, but part of larger architectural issue

### Description

In the Metadata Browser panel, the "Open in Maker" and "Refresh" buttons flash briefly as enabled, then become disabled when environment auto-selects, creating confusing UX.

### Root Cause (Discovered 2025-10-29)

**Simple logic bug in MetadataBrowserPanel.ts:**

1. **Line 182, 184**: Buttons initialized as `disabled: false`
2. **Line 826**: `handleEnvironmentSelection()` calls `updateActionBar(false, false)` → disables both buttons (overly conservative)
3. **Line 1128**: `loadEntityMetadata()` calls `updateActionBar(true, true)` → re-enables buttons

**Result**: Buttons flash enabled → disabled → enabled (after entity selection)

### Quick Fix for MetadataBrowserPanel

Three line changes:

```typescript
// Line 182 - Initialize as disabled (prevents flash)
disabled: true  // Changed from false

// Line 826 - Enable both buttons after environment loads
this.updateActionBar(true, true);  // Changed from (false, false)
// Both buttons only need environment selected (Open in Maker goes to entities list, not specific entity)

// Line 1191 - Enable both after choice loads too
this.updateActionBar(true, true);  // Changed from (true, false)
```

### Why This is a Symptom

**This bug reveals a missing abstraction** - see "Issue: Missing BasePanel Abstraction for Action Button State Management" below. The quick fix addresses the immediate UX issue, but the architectural fix prevents this class of bug across all 8+ panels.

---

## Issue: Missing BasePanel Abstraction for Action Button State Management

**Date**: 2025-10-29
**Severity**: High (Design smell, violates DRY and architectural principles)
**Status**: Documented, needs architectural refactor

### Description

Action button state management is inconsistent across panels. Every panel manually decides initial button states and when to enable/disable them after environment selection. This violates **DRY**, **Consistency Over Convenience**, and creates bugs like the Metadata Browser button flash issue.

### Evidence of Inconsistency

**Initial button states across panels:**

```typescript
// ✅ CONSISTENT - Start disabled
SolutionExplorerPanel:    disabled: true   (line 118)
ImportJobViewerPanel:     disabled: true   (line 120)

// ❌ INCONSISTENT - Start enabled (causes flash bug)
MetadataBrowserPanel:     disabled: false  (line 182)
EnvironmentVariablesPanel: disabled: false (line 153)
ConnectionReferencesPanel: disabled: false (line 156)

// ❌ BASE CLASS DEFAULT - Also inconsistent
BasePanel.getStandardRefreshAction(): disabled: false (line 620)
```

**Manual state management scattered across panels:**

```typescript
// Every panel manually calls setActionDisabled after environment loads
// Some do it, some don't, some do it at different times
// No standard pattern = bugs waiting to happen
```

### Root Cause

**Missing abstraction in BasePanel** for managing action button lifecycle tied to environment selection:

1. ❌ No standard pattern for initial button states
2. ❌ No automatic enable/disable based on environment selection
3. ❌ Each panel reinvents the same pattern (or forgets to)
4. ❌ `getStandardRefreshAction()` defaults to enabled, but panels with environments should start disabled

### Impact

- **Bugs**: Flash/flicker issues (MetadataBrowserPanel), buttons that never enable/disable
- **Inconsistent UX**: Some panels have working buttons on load, others don't
- **Code duplication**: 8+ panels manually managing the same state transitions
- **Maintenance burden**: Every new panel must remember this pattern
- **Violation of architectural principles**: DRY, Consistency Over Convenience, Fail Fast

### Architectural Solution

**BasePanel should automatically manage action button state for panels with environment selectors:**

#### 1. New BasePanel Method: `getStandardActions()`

```typescript
/**
 * Returns standard actions (refresh, openInMaker) with correct initial state
 * based on whether panel has environment selector.
 *
 * Panels with environment selector: buttons start disabled, auto-enabled after env loads
 * Panels without environment selector: buttons start enabled
 */
protected getStandardActions(options?: {
    includeRefresh?: boolean;
    includeOpenInMaker?: boolean;
    openInMakerUrl?: 'entities' | 'solutions' | ((envId: string) => string);
}): ActionConfig[] {
    const hasEnvironmentSelector = !!this.environmentSelectorComponent;
    const actions: ActionConfig[] = [];

    if (options?.includeRefresh !== false) {
        actions.push({
            id: 'refresh',
            label: 'Refresh',
            icon: 'refresh',
            variant: 'secondary',
            disabled: hasEnvironmentSelector  // Auto-disabled if panel uses environments
        });
    }

    if (options?.includeOpenInMaker) {
        actions.push({
            id: 'openInMaker',
            label: 'Open in Maker',
            variant: 'primary',
            disabled: hasEnvironmentSelector  // Auto-disabled if panel uses environments
        });
    }

    return actions;
}
```

#### 2. Auto-Enable Buttons After Environment Selection

```typescript
/**
 * Existing loadEnvironmentsWithAutoSelect should automatically enable buttons
 * after successful environment load
 */
protected async loadEnvironmentsWithAutoSelect(
    environmentSelectorComponent: EnvironmentSelectorComponent,
    logger: ComponentLogger,
    viewType?: string,
    autoSelect: boolean = true
): Promise<void> {
    // ... existing logic ...

    // AUTO-ENABLE STANDARD BUTTONS AFTER ENVIRONMENT LOADS
    if (this.actionBarComponent) {
        // Enable all standard actions that were auto-disabled
        this.actionBarComponent.setActionDisabled('refresh', false);
        this.actionBarComponent.setActionDisabled('openInMaker', false);
        // Future: Track which actions were auto-disabled and only enable those
    }
}
```

#### 3. Panel Opt-Out / Customization

```typescript
/**
 * Panels can override to customize behavior
 * Example: Panel only wants openInMaker enabled after specific entity selected
 */
protected shouldEnableActionsAfterEnvironmentLoad(): {
    refresh?: boolean;
    openInMaker?: boolean;
} {
    // Default: enable everything after environment loads
    return { refresh: true, openInMaker: true };
}
```

### Benefits

✅ **DRY**: Button state logic centralized in BasePanel
✅ **Consistency**: All panels follow same pattern automatically
✅ **Fewer bugs**: Can't forget to disable/enable buttons
✅ **Better UX**: No flashes, consistent behavior
✅ **Maintainability**: New panels get correct behavior for free
✅ **Type safety**: Compile-time enforcement of patterns

### Migration Strategy

#### Phase 1: Add New Abstraction (Non-Breaking)
- Add `getStandardActions()` to BasePanel
- Add auto-enable logic to `loadEnvironmentsWithAutoSelect()`
- Mark `getStandardRefreshAction()` as deprecated with JSDoc comment
- Keep existing behavior working

#### Phase 2: Migrate Panels One-by-One
- Update each panel to use new pattern
- Test thoroughly after each migration
- Remove manual `setActionDisabled()` calls

#### Phase 3: Remove Deprecated Code
- Remove `getStandardRefreshAction()` after all panels migrated
- Add ESLint rule preventing direct `setActionDisabled()` on standard actions?

### Files Affected

**Core:**
- `src/panels/base/BasePanel.ts` (add new methods)

**Panels to migrate (8+):**
- `src/panels/MetadataBrowserPanel.ts`
- `src/panels/SolutionExplorerPanel.ts`
- `src/panels/ImportJobViewerPanel.ts`
- `src/panels/EnvironmentVariablesPanel.ts`
- `src/panels/ConnectionReferencesPanel.ts`
- `src/panels/PluginTraceViewerPanel.ts`
- `src/panels/PluginRegistrationPanel.ts`
- Any other panels with action bars + environment selectors

### Related Issues

- **Metadata Browser Action Buttons** (above) - symptom of this issue
- **Environment Selector State Leaking** (above) - may share root cause (missing BasePanel abstractions)

### Priority

**High** - This is a design smell that compounds with every new panel added. Should be addressed before adding more panels or the technical debt becomes harder to unwind.

### Notes

- This follows the same philosophy as existing `loadEnvironmentsWithAutoSelect()` abstraction
- BasePanel should handle common patterns, panels should only customize exceptions
- Consider similar abstractions for other common patterns (tree loading states, table loading states, etc.)
