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
**Severity**: Medium (Missing useful feature)
**Status**: Documented, needs implementation

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

---

## Issue: Metadata Browser Action Buttons Disabled on Initial Load

**Date**: 2025-10-28
**Severity**: Medium (UI/UX issue)
**Status**: Documented, needs fix

### Description

In the Metadata Browser panel, the "Open in Maker" and "Refresh" buttons in the action bar are greyed out (disabled) when the panel initially loads, even though an environment is selected and metadata is loaded.

### Steps to Reproduce

1. Open Metadata Browser panel
2. Environment auto-selects and metadata loads successfully
3. **Bug**: Action bar buttons remain disabled despite data being loaded

### Expected Behavior

- Once environment is selected and metadata loads, action buttons should be enabled
- Refresh button should always be enabled when environment is selected
- Open in Maker button should be enabled when environment is selected

### Current State

Both buttons appear to be initialized as disabled and never get re-enabled after successful data load.

### Impact

- Users cannot refresh metadata without reopening panel
- Users cannot quickly open current entity in Maker portal
- Confusing UX - buttons appear broken

### Files Likely Affected

- `src/panels/MetadataBrowserPanel.ts` (button state management)
- Action bar initialization in `initializeComponents()`
- Missing calls to `actionBarComponent.setActionEnabled()` after data loads

### Potential Solution

```typescript
// After successful metadata load:
this.actionBarComponent?.setActionEnabled('refresh', true);
this.actionBarComponent?.setActionEnabled('openInMaker', true);

// Or initialize as enabled if environment is selected:
{
    id: 'openInMaker',
    label: 'Open in Maker',
    variant: 'primary',
    disabled: false  // Should be false when env selected
}
```

### Notes

- This issue was discovered during refresh button abstraction work
- Other panels (Solution Explorer, Import Jobs) have buttons enabled correctly
- Quick fix - just need to update disabled state after data loads or set initial state correctly
