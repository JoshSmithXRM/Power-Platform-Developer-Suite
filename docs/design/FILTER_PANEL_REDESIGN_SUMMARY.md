# Filter Panel Redesign - Quick Summary

**Full Design:** See `FILTER_PANEL_REDESIGN.md`

---

## What's Changing?

### 1. Quick Filters (NEW)
Toggle buttons at top of filter panel:
- **Exception Only** - Status = Exception
- **Last Hour** - Created On >= (now - 1 hour)
- **Last 24 Hours** - Created On >= (now - 24 hours)
- **Today** - Created On >= today 00:00

**UX:** Click to toggle, combine multiple quick filters (OR'd together)

---

### 2. Per-Row AND/OR (MAJOR CHANGE)

**Before:**
```
[Global: Match ALL (AND) / Match ANY (OR)]

[✓] [Plugin Name] [Contains] [Initial]
[✓] [Status] [Equals] [Exception]
```
Query: `(pluginname contains 'Initial') AND (status eq 'Exception')`

**After:**
```
[✓] [Plugin Name] [Contains] [Initial] [WHERE]
[✓] [Status] [Equals] [Exception] [OR ▼]
```
Query: `(pluginname contains 'Initial') OR (status eq 'Exception')`

**Why:** Enables complex queries like: "Show exceptions OR slow traces from plugin X"

---

### 3. Drag-and-Drop Reordering (NEW)

**Before:** Fixed order, no reordering

**After:** Drag handle (⋮⋮) on left of each row, drag to reorder

**Why:** Users can organize conditions logically (readability, query structure)

---

### 4. Visual Polish
- Cleaner layout with better spacing
- Modern toggle button design for quick filters
- Smooth drag animations
- Improved visual hierarchy

---

## Data Model Changes

### FilterConditionViewModel (UPDATED)
```typescript
// BEFORE
interface FilterConditionViewModel {
  id: string;
  enabled: boolean;
  field: string;
  operator: string;
  value: string;
  // No logicalOperator
}

// AFTER
interface FilterConditionViewModel {
  id: string;
  enabled: boolean;
  field: string;
  operator: string;
  value: string;
  logicalOperator: 'and' | 'or'; // NEW
}
```

### FilterCriteriaViewModel (BREAKING CHANGE)
```typescript
// BEFORE
interface FilterCriteriaViewModel {
  conditions: readonly FilterConditionViewModel[];
  logicalOperator: 'and' | 'or'; // GLOBAL - REMOVED
  top: number;
}

// AFTER
interface FilterCriteriaViewModel {
  conditions: readonly FilterConditionViewModel[];
  quickFilters: QuickFilterViewModel; // NEW
  top: number;
  // Global logicalOperator REMOVED
}

interface QuickFilterViewModel {
  exceptionOnly: boolean;
  lastHour: boolean;
  last24Hours: boolean;
  today: boolean;
}
```

---

## Domain Changes

### QuickFilter Value Object (NEW)
```typescript
export class QuickFilter {
  static readonly ExceptionOnly: QuickFilter;
  static readonly LastHour: QuickFilter;
  static readonly Last24Hours: QuickFilter;
  static readonly Today: QuickFilter;

  // Converts to FilterCondition(s)
  public toFilterConditions(currentTime: Date): readonly FilterCondition[];
}
```

### FilterCondition Entity (UPDATED)
```typescript
// BEFORE
constructor(
  field: FilterField,
  operator: FilterOperator,
  value: string,
  enabled: boolean = true
)

// AFTER
constructor(
  field: FilterField,
  operator: FilterOperator,
  value: string,
  enabled: boolean = true,
  logicalOperator: 'and' | 'or' = 'and' // NEW
)
```

### TraceFilter Entity (UPDATED)
```typescript
// BEFORE
constructor(
  top: number,
  orderBy: string,
  conditions: readonly FilterCondition[] = [],
  logicalOperator: 'and' | 'or' = 'and', // REMOVED
  // ...
)

// AFTER
constructor(
  top: number,
  orderBy: string,
  conditions: readonly FilterCondition[] = [],
  quickFilters: ReadonlySet<QuickFilterId> = new Set(), // NEW
  // ...
)

// NEW methods:
public reorderConditions(fromIndex: number, toIndex: number): TraceFilter
public toggleQuickFilter(filterId: QuickFilterId): TraceFilter
```

---

## Implementation Slices

**Slice 1 (MVP):** Per-row AND/OR logic
- Domain: Update FilterCondition, TraceFilter, ODataQueryBuilder
- Application: Update ViewModels, mapper
- Presentation: Render per-row dropdowns, collect on Apply
- Result: Users can build: WHERE Status = Exception OR Plugin Name Contains 'X'

**Slice 2:** Quick filters
- Domain: Create QuickFilter value object
- Application: Add QuickFilterViewModel, update mapper
- Presentation: Render toggle buttons, handle clicks
- Result: Users can quickly filter by "Exception Only" + "Last Hour"

**Slice 3:** Drag-and-drop reordering
- Domain: Add reorderConditions() method
- Application: Create ReorderFilterConditionsCommand
- Presentation: Add drag handles, implement drag events
- Result: Users can drag conditions to reorder

**Slice 4:** UI polish
- CSS: Quick filter styles, drag handle styles, animations
- Result: Modern, clean UI

---

## Migration Path

**Breaking Change:** Global `logicalOperator` removed

**Impact:** LOW - Internal API only, not user-facing

**Migration:**
1. Existing filters default to per-row AND (same behavior as before)
2. No user data migration needed (filters are transient state)
3. First render after upgrade shows default filter (no saved state lost)

---

## Testing Highlights

**Domain Tests:**
- QuickFilter.toFilterConditions() generates correct FilterCondition
- FilterCondition with logicalOperator validates correctly
- TraceFilter.reorderConditions() validates indices, reorders correctly
- ODataQueryBuilder chains per-row operators correctly

**Application Tests:**
- FilterCriteriaMapper converts quick filters bidirectionally
- ReorderFilterConditionsCommand orchestrates reordering
- Mapper handles per-row logical operators

**Manual Testing:**
- Toggle quick filters → Apply → Traces filtered
- Add custom conditions with OR → Apply → Complex query works
- Drag conditions to reorder → Apply → Query reflects new order
- Clear All → All filters removed

---

## File Changes

**New Files (3):**
- `QuickFilter.ts` (domain value object)
- `QuickFilterViewModel.ts` (application)
- `ReorderFilterConditionsCommand.ts` (application use case)

**Modified Files (8):**
- Domain: `FilterCondition.ts`, `TraceFilter.ts`, `ODataQueryBuilder.ts`
- Application: `FilterConditionViewModel.ts`, `FilterCriteriaViewModel.ts`, `FilterCriteriaMapper.ts`
- Presentation: `FilterPanelSection.ts`, `PluginTraceViewerBehavior.js`

**Total:** 11 files

---

## Reusability for Data Explorer

**Design considerations:**
1. Configurable field definitions (not hard-coded to plugin trace fields)
2. Configurable quick filters (Data Explorer will have different quick filters)
3. Generic webview behavior (extract to shared FilterPanelBehavior.js)
4. Abstraction points (IFilterableField, IQuickFilterProvider)

**Future enhancement slice:**
- Extract generic FilterPanel component
- Create PluginTraceFilterPanel (extends generic)
- Create DataExplorerFilterPanel (extends generic)

---

## UI Preview

```
┌────────────────────────────────────────────────────────────┐
│ Filters (3)                                          [v]   │
├────────────────────────────────────────────────────────────┤
│ [🔴 Exception Only] [🕐 Last Hour] [📅 Last 24 Hours] [📆 Today] │
│                                                            │
│ ⋮⋮ [✓] [Plugin Name ▼] [Contains ▼] [Initial] [WHERE]   [🗑] │
│ ⋮⋮ [✓] [Status ▼] [Equals ▼] [Exception] [OR ▼]         [🗑] │
│ ⋮⋮ [✓] [Duration ▼] [> ▼] [1000] [AND ▼]                [🗑] │
│                                                            │
│ [+ Add Condition]  [✓ Apply Filters]  [✗ Clear All]      │
└────────────────────────────────────────────────────────────┘
```

**Legend:**
- ⋮⋮ = Drag handle (grab to reorder)
- [✓] = Enable/disable checkbox
- [WHERE] = First row label (not editable)
- [OR ▼] / [AND ▼] = Logical operator dropdown
- [🗑] = Remove button

**Active quick filters** show highlighted background (blue accent)

---

## Next Steps

1. **Review this design** - Get human approval
2. **Implement Slice 1** - Per-row AND/OR (core functionality)
3. **Test Slice 1** - Write tests, manual testing, compile
4. **Implement Slice 2** - Quick filters
5. **Implement Slice 3** - Drag-and-drop
6. **Implement Slice 4** - UI polish
7. **Final review** - Invoke code-guardian for approval

**Estimated complexity:** Complex (4 slices, new patterns, architectural changes)

---

## Questions for Review

1. **Keyboard accessibility:** Should we add Ctrl+Up/Down for reordering in Slice 4?
2. **Quick filter persistence:** Should quick filter state persist across VS Code sessions?
3. **Maximum conditions:** Do we need a hard limit (e.g., 10 conditions max)?
4. **Quick filter combination logic:** Always OR quick filters together, or allow configuration?

---

**Full Design Document:** `FILTER_PANEL_REDESIGN.md` (comprehensive, all layers, all types, all tests)
