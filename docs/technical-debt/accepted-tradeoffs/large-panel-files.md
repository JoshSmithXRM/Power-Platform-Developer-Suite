# Large Panel Files (600-800 lines)

**Category:** Accepted Tradeoff
**Priority:** Low
**Effort:** N/A (no action needed)
**Last Reviewed:** 2025-11-22

---

## Summary

Four panel files exceed 600 lines, with the largest at 797 lines. These sizes are **acceptable** because they follow the Coordinator Pattern with proper separation of concerns.

---

## Current State

### Affected Files

| File | Lines | Behaviors | Status |
|------|-------|-----------|--------|
| `MetadataBrowserPanel.ts` | 797 | 7 behaviors | ✅ Coordinator pattern |
| `PluginTraceViewerPanelComposed.ts` | 745 | 5 behaviors + 3 sections | ✅ Coordinator pattern |
| `EnvironmentSetupPanelComposed.ts` | 615 | 8 use cases | ✅ Multi-instance pattern |
| `ConnectionReferencesPanelComposed.ts` | 550 | Multiple services | ✅ Coordinator pattern |

---

## Why This Is Acceptable

These panels follow the **Coordinator Pattern** with proper separation of concerns:

### 1. MetadataBrowserPanel (797 lines)
- Coordinates **7 behaviors** for complex metadata navigation
- Manages dual-pane tree + detail view with search
- Delegates to specialized behaviors (TreeBehavior, SearchBehavior, DetailPanelBehavior, etc.)
- Panel itself is **thin coordinator** - behaviors contain actual logic

### 2. PluginTraceViewerPanelComposed (745 lines)
- Coordinates **5 behaviors + 3 sections** for trace management
- Manages filter panel, trace table, detail view, timeline view
- Each section/behavior is separately testable
- Complex UI justified by feature richness

### 3. EnvironmentSetupPanelComposed (615 lines)
- **Multi-instance panel** (not singleton) for concurrent environment editing
- Manages form state, validation, connection testing, discovery
- Delegates to **8 use cases** for business logic
- Form complexity requires coordination code

### 4. ConnectionReferencesPanelComposed (550 lines)
- Coordinates export, filtering, solution selection
- Manages relationship graph between flows and connections
- Delegates to specialized mappers and services

---

## Coordinator Pattern Verification

✅ **Each panel delegates to behaviors/sections**
✅ **Business logic in use cases, not panels**
✅ **Panels contain mostly: message routing, UI coordination, state synchronization**
✅ **Each behavior/section is separately testable**
✅ **No God Object anti-pattern** (panels coordinate, don't implement)

---

## Why Not Split Further

Splitting these panels would:
- ❌ Create artificial boundaries without improving maintainability
- ❌ Scatter coordination logic across multiple files
- ❌ Make message routing harder to understand
- ❌ Reduce cohesion (related coordination in separate files)

**Current sizes are justified by UI complexity and coordinator responsibilities.**

---

## When to Refactor

Consider refactoring only if:

1. **Panel exceeds 1,000 lines** (extract more behaviors)
2. **Panel contains business logic** (move to use cases/domain services)
3. **Panel responsibilities grow beyond coordination** (extract new behaviors)

---

## Accepted Trade-offs

| Aspect | Current State | If Split Further |
|--------|---------------|------------------|
| **Cohesion** | High (all coordination in one place) | Lower (scattered) |
| **Maintainability** | Good (clear coordinator) | Worse (fragmented) |
| **Lines of code** | 550-797 per file | More files, same total LOC |
| **Testability** | Good (behaviors tested) | Same (behaviors still exist) |

**Verdict:** Current approach is optimal for complex UIs with multiple coordinated behaviors.

---

## Related Items

- None (standalone decision)

---

## References

**Code Locations:**
- `src/features/metadataBrowser/presentation/panels/MetadataBrowserPanel.ts`
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`
- `src/features/environmentSetup/presentation/panels/EnvironmentSetupPanelComposed.ts`
- `src/features/connectionReferences/presentation/panels/ConnectionReferencesPanelComposed.ts`

**Pattern Documentation:**
- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` - Coordinator pattern
- `.claude/templates/PANEL_INITIALIZATION_PATTERN.md` - Panel lifecycle
