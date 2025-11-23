# DateTimeFilter Mixed Concerns in Value Object

**Category:** Scheduled
**Priority:** Medium
**Effort:** Medium (2-3 hours)
**Last Reviewed:** 2025-11-22

---

## Summary

`DateTimeFilter` value object mixes domain, presentation, and infrastructure concerns by including format conversion methods that belong in other layers.

**Decision: Defer until next refactoring cycle when touching this code.**

---

## Current State

**Location:** `src/shared/domain/valueObjects/DateTimeFilter.ts`

```typescript
/**
 * DateTimeFilter Value Object
 *
 * Note: Includes format conversion methods for pragmatic reasons (eliminates
 * boilerplate in calling code). See docs/architecture/TECHNICAL_DEBT.md for
 * future refactoring plan to extract presentation/infrastructure helpers.
 */
export class DateTimeFilter {
    private constructor(private readonly utcIsoValue: string) {
        this.validateUtcIso(utcIsoValue);
    }

    // ✅ Domain concern (correct)
    static fromUtcIso(utcIso: string): DateTimeFilter { ... }
    getUtcIso(): string { ... }
    isBefore(other: DateTimeFilter): boolean { ... }

    // ❌ Presentation concern (should be in view/mapper)
    static fromLocalDateTime(localDateTime: string): DateTimeFilter { ... }
    toLocalDateTime(): string { ... }

    // ❌ Infrastructure concern (should be in OData service)
    toODataFormat(): string { ... }
}
```

---

## Why It Exists

**Historical context:**
- Initial DDD value object pattern with self-contained conversions
- Static factories + conversion methods pattern
- Pragmatic approach: eliminates boilerplate in calling code

**Current usage:**
- `src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts` - Uses `toODataFormat()`
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts` - Uses `fromLocalDateTime()`

---

## Impact

**Maintenance cost:** Format conversion logic scattered across domain value object
**Bug risk:** Low - conversion logic is well-tested, but violates separation of concerns
**Size:** ~100 lines across value object and usages

**ESLint violations:**
- Mixed concerns flagged but suppressed
- Documented as technical debt in code comments

---

## Proposed Solution

Extract format conversion to helper functions in appropriate layers:

```typescript
// Domain: Pure value object (only UTC ISO concerns)
class DateTimeFilter {
    static fromUtcIso(utcIso: string): DateTimeFilter
    getUtcIso(): string
    isBefore(other: DateTimeFilter): boolean
}

// Application layer: Conversion helpers
export function localDateTimeToUtc(local: string): string {
    const date = new Date(local);
    return date.toISOString();
}

export function utcToLocalDateTime(utc: string): string {
    const date = new Date(utc);
    // Format as "YYYY-MM-DDTHH:MM" for datetime-local input
    return date.toISOString().slice(0, 16);
}

// Infrastructure layer: OData helpers
export function formatDateForOData(utc: string): string {
    return utc.replace(/\.\d{3}Z$/, 'Z'); // Remove milliseconds
}
```

**Usage after refactoring:**
```typescript
// Presentation layer
const localInput = '2025-11-22T14:30';
const utc = localDateTimeToUtc(localInput);
const filter = DateTimeFilter.fromUtcIso(utc);

// Infrastructure layer
const odataValue = formatDateForOData(filter.getUtcIso());
```

---

## When to Address

**Triggers (OR condition):**
- Next refactoring cycle when touching this code
- When establishing consistent pattern for other value objects (DataverseUrl has same issue)
- When adding more datetime filtering features
- When someone new to the codebase questions the pattern

**Timeline:** Opportunistic (next time we touch filter code)

---

## Why Deferred

**Current implementation:**
- ✅ Works correctly and is well-tested
- ✅ Comprehensive test coverage prevents regression
- ✅ Documented as technical debt in code comments
- ✅ ESLint configured to allow factory methods

**Refactoring concerns:**
- ⚠️ Helper function extraction adds files/complexity
- ⚠️ Service pattern would be over-engineering
- ⚠️ Not causing bugs in practice

**Verdict:** Simple helper function extraction when naturally touching the code.

---

## Mitigations (Current)

1. **ESLint configured** to allow static factory methods
2. **Comprehensive test coverage** prevents regression
3. **Code comments** document the technical debt
4. **Isolated usage** (only 2 callsites, easy to refactor later)

---

## Related Items

- Similar issue: `DataverseUrl` value object may have same pattern

---

## References

**Code Locations:**
- `src/shared/domain/valueObjects/DateTimeFilter.ts` - Value object with mixed concerns
- `src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts` - Uses toODataFormat()
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts` - Uses fromLocalDateTime()

**Pattern Documentation:**
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Layer separation principles

**Tests:**
- `src/shared/domain/valueObjects/DateTimeFilter.test.ts` - Comprehensive coverage

**Discussions:**
- Technical debt review 2025-11-22: Deferred until next touch
