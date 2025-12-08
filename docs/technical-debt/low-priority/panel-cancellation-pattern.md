# Panel Cancellation Pattern - Apply to Other Panels

**Category:** Low Priority
**Priority:** Low
**Effort:** 4-6 hours (if VirtualTableCacheManager refactored)
**Last Reviewed:** 2025-12-06

---

## Summary

The two-level cancellation pattern (panel-level + operation-level) was implemented in WebResourcesPanelComposed to stop API requests when panels are closed or operations are superseded. This pattern should ideally be applied to other panels that make API calls, but it's not currently needed due to smaller data volumes.

**Decision: Defer until performance issues observed or VirtualTableCacheManager refactoring needed**

---

## Current State

Only WebResourcesPanelComposed has the cancellation pattern implemented:

```typescript
// WebResourcesPanelComposed.ts
private readonly panelCancellationToken: ICancellationToken;

constructor(...) {
    this.panelCancellationToken = new AbortSignalCancellationTokenAdapter(
        this.panel.abortSignal
    );
}

// Uses CompositeCancellationToken combining panel + operation tokens
const compositeToken = new CompositeCancellationToken([
    this.panelCancellationToken,
    operationToken
]);
await this.listWebResourcesUseCase.execute(envId, solutionId, compositeToken);
```

**Panels WITHOUT cancellation:**

| Panel | API Calls | Reason Not Critical |
|-------|-----------|---------------------|
| PluginTraceViewerPanelComposed | `getPluginTracesUseCase` | Smaller datasets |
| DataExplorerPanelComposed | `executeSqlUseCase` | Single query, fast |
| EnvironmentVariablesPanelComposed | `listEnvVarsUseCase` | Smaller datasets |
| ConnectionReferencesPanelComposed | `listConnectionRefsUseCase` | Smaller datasets |
| SolutionExplorerPanelComposed | VirtualTableCacheManager | Needs refactoring |
| ImportJobViewerPanelComposed | VirtualTableCacheManager | Needs refactoring |

**Affected files:**
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`
- `src/features/dataExplorer/presentation/panels/DataExplorerPanelComposed.ts`
- `src/features/environmentVariables/presentation/panels/EnvironmentVariablesPanelComposed.ts`
- `src/features/connectionReferences/presentation/panels/ConnectionReferencesPanelComposed.ts`
- `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts`
- `src/features/importJobViewer/presentation/panels/ImportJobViewerPanelComposed.ts`

---

## Why It Exists

WebResourcesPanelComposed fetches 5000+ records per page with multiple pages. When a panel was closed mid-request, API calls continued running, wasting server resources. The cancellation pattern was implemented to stop these calls.

Other panels fetch smaller datasets or single queries, making cancellation less critical.

**Timeline:**
- Created: 2025-12-04 (WebResources implementation)
- Last reviewed: 2025-12-06

---

## Why Deferred

### Effort vs. Benefit Analysis

| Factor | Assessment |
|--------|------------|
| **Refactoring Scope** | 6 panels, VirtualTableCacheManager needs ICancellationToken support |
| **Effort** | 4-6 hours |
| **Issues Found** | Zero - no user complaints about orphaned API calls |
| **Risk** | Very Low - datasets are small, queries are fast |
| **Benefit** | Marginal server resource savings |

**Verdict:** Not worth the effort until VirtualTableCacheManager refactoring is needed for another reason.

---

## Proposed Solution

When needed, apply the same pattern from WebResourcesPanelComposed:

### Step 1: Add panel-level cancellation token
```typescript
private readonly panelCancellationToken: ICancellationToken;

constructor(...) {
    this.panelCancellationToken = new AbortSignalCancellationTokenAdapter(
        this.panel.abortSignal
    );
}
```

### Step 2: Use composite token for use case calls
```typescript
const compositeToken = new CompositeCancellationToken([
    this.panelCancellationToken,
    this.currentOperationCancellationSource?.token
].filter(Boolean));

await this.someUseCase.execute(envId, compositeToken);
```

### Step 3: Refactor VirtualTableCacheManager (for Solution Explorer, Import Job Viewer)
```typescript
// VirtualTableCacheManager would need to accept ICancellationToken
async getPagedData(
    page: number,
    cancellationToken?: ICancellationToken
): Promise<T[]>
```

**Effort:** 4-6 hours

---

## When to Revisit

Consider implementing if:

1. **Performance issues** - Users report slow panel closing or server resource complaints
2. **VirtualTableCacheManager refactoring** - If refactoring for another reason, add cancellation support
3. **Large dataset panels added** - New panels with 1000+ record fetches

Otherwise, **defer indefinitely**.

---

## References

**Code Locations:**
- `src/features/webResources/presentation/panels/WebResourcesPanelComposed.ts:89-95` - Working implementation
- `src/shared/infrastructure/adapters/CompositeCancellationToken.ts` - Composite token class
- `src/shared/infrastructure/adapters/AbortSignalCancellationTokenAdapter.ts` - Adapter class

**Pattern Documentation:**
- WebResourcesPanelComposed serves as reference implementation

**Tests:**
- WebResourcesPanelComposed.integration.test.ts - Has cancellation tests
