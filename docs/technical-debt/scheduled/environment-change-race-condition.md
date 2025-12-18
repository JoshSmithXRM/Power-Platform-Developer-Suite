# Environment Change Race Condition in Panels

**Category:** Scheduled
**Priority:** Medium
**Effort:** 2-3 hours (8 panels to update)
**Last Reviewed:** 2025-12-17

---

## Summary

When a user changes environments while data is loading, stale results from the previous environment can overwrite the UI. This has been fixed for Plugin Registration panel but other panels still need the fix.

**Decision: Apply "load generation" pattern to all panels that load data on environment change**

---

## Current State

**Fixed:**
- `PluginRegistrationPanelComposed.ts` - Uses `currentLoadId` pattern

**Needs Fix:**
- `ConnectionReferencesPanelComposed.ts`
- `DataExplorerPanelComposed.ts`
- `EnvironmentVariablesPanelComposed.ts`
- `ImportJobViewerPanelComposed.ts`
- `PluginTraceViewerPanelComposed.ts`
- `SolutionExplorerPanelComposed.ts`
- `WebResourcesPanelComposed.ts`
- `PersistenceInspectorPanelComposed.ts`

**Scope:**
- 8 panels need update
- ~20 lines per panel

---

## The Pattern (from Plugin Registration)

```typescript
class SomePanelComposed {
    /** Generation counter for load operations */
    private currentLoadId = 0;

    private async handleRefresh(): Promise<void> {
        // Increment load ID to invalidate any in-flight requests
        const thisLoadId = ++this.currentLoadId;

        try {
            const result = await this.loadData();

            // Check if this load has been superseded
            if (thisLoadId !== this.currentLoadId) {
                this.logger.debug('Discarding stale load result');
                return;
            }

            // Safe to update UI
            await this.panel.postMessage({ command: 'updateData', data: result });
        } catch (error) {
            // Don't show error if superseded
            if (thisLoadId !== this.currentLoadId) return;
            // Handle error...
        } finally {
            // Only clear loading state if still current
            if (thisLoadId === this.currentLoadId) {
                await this.loadingBehavior.setLoading(false);
            }
        }
    }
}
```

---

## When to Address

**Triggers (OR condition):**
- When touching any of the affected panels for other work
- Before next production release (0.5.0)
- If user reports stale data bugs

**Timeline:** Next 1-2 sprints, opportunistically

---

## Related Items

- None (standalone fix)

---

## References

**Code Locations:**
- `src/features/pluginRegistration/presentation/panels/PluginRegistrationPanelComposed.ts:158-159` - Reference implementation
- `src/features/pluginRegistration/presentation/panels/PluginRegistrationPanelComposed.ts:771-845` - handleRefresh with pattern

**Pattern Documentation:**
- `src/shared/infrastructure/ui/behaviors/DataBehavior.ts` - Similar pattern using CancellationTokenSource
