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
