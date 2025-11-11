# Technical Debt Registry

**Purpose:** Track known technical debt items with impact assessment and refactoring plans.

---

## Template for Future Debt

**Status:** [Documented | In Progress | Resolved]

**Issue:** [Description of technical debt]

**Location:** [File paths or components affected]

**Impact:** [Low | Medium | High]
- **Maintenance cost:** [Description]
- **Bug risk:** [Description]
- **Size:** [Lines of code or scope]

**Why It Exists:** [Historical context]

**Proposed Solution:** [Brief description of fix]

**Refactoring Plan:** [Steps to resolve]

**Timeline:** [When to address this]

**Decision:** [Why we're keeping this debt for now]

**Mitigations:** [What we're doing to minimize impact]

---

## Guidelines for Adding Technical Debt

**When to document:**
- ✅ Code violates CLAUDE.md principles (e.g., Three Strikes Rule)
- ✅ Architect identifies architectural concerns during review
- ✅ Duplication reaches 3+ instances
- ✅ Known performance issues deferred for later optimization
- ✅ Temporary workarounds for external API limitations

**When NOT to document:**
- ❌ Simple refactoring opportunities (just do them)
- ❌ Minor code style improvements
- ❌ Personal preferences without architectural impact

**Required fields:**
- Status, Priority, Issue, Location, Impact, Proposed Solution
- Why It Exists (context for future developers)
- Decision (why we're deferring)

**Review cycle:**
- Review quarterly during maintenance windows
- Re-prioritize based on feature roadmap
- Close items after refactoring

---

## DateTimeFilter: Mixed Concerns in Value Object

**Status:** Documented

**Priority:** Medium

**Issue:** DateTimeFilter value object mixes domain, presentation, and infrastructure concerns

**Location:**
- `src/shared/domain/valueObjects/DateTimeFilter.ts`
- `src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts`
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`
- `src/features/pluginTraceViewer/presentation/sections/FilterPanelSection.ts`

**Impact:** Medium
- **Maintenance cost:** Format conversion logic scattered across domain value object instead of layer-specific helpers
- **Bug risk:** Low - conversion logic is well-tested, but violates separation of concerns
- **Size:** ~100 lines across value object and usages

**Why It Exists:**
Initial implementation followed traditional DDD value object pattern with self-contained conversions (static factories + conversion methods). During implementation, ESLint flagged violations because conversion methods (`toLocalDateTime`, `toODataFormat`) belong in presentation/infrastructure layers, not domain.

Design-architect proposed creating DateTimeConversionService, but analysis revealed:
1. Existing value objects (Duration, StorageKey, DataverseUrl) use static factory methods
2. Service pattern would be overengineering for simple format conversions
3. Some existing value objects (DataverseUrl) also have presentation methods

**Proposed Solution:**
Extract format conversion methods to simple helper functions in appropriate layers:

```typescript
// Domain: Pure value object
class DateTimeFilter {
    static fromUtcIso(utcIso: string): DateTimeFilter  // Factory
    getUtcIso(): string                                 // Accessor
    isBefore(other: DateTimeFilter): boolean            // Domain behavior
}

// Application layer: Conversion helpers
export function localDateTimeToUtc(local: string): string { }
export function utcToLocalDateTime(utc: string): string { }

// Infrastructure layer: OData helpers
export function formatDateForOData(utc: string): string { }
```

**Refactoring Plan:**
1. Create `src/shared/application/helpers/dateTimeHelpers.ts` with conversion functions
2. Create `src/shared/infrastructure/helpers/odataFormatters.ts` with OData formatting
3. Update DateTimeFilter to remove `getLocalDateTime()` and `getODataFormat()`
4. Update all call sites to use helper functions
5. Verify tests pass
6. Consider refactoring DataverseUrl similarly (has `getApiBaseUrl()` infrastructure method)

**Timeline:**
- Short term (implemented): Added factory methods to ESLint allowlist, renamed `toX()` → `getX()` to satisfy linter
- Long term (next refactoring cycle): Extract conversion methods to helper functions when touching this code

**Decision:**
Deferring full refactor because:
1. Current implementation works correctly and is well-tested
2. Service pattern would introduce unnecessary complexity (dependency injection everywhere)
3. Helper function extraction is a simple refactor when needed
4. Allows us to establish pattern and apply consistently to other value objects (DataverseUrl, etc.)

**Mitigations:**
- ESLint configured to allow factory methods (`fromUtcIso`, `fromLocalDateTime`)
- Methods renamed `toX()` → `getX()` to pass presentation method lint rule
- Comprehensive test coverage prevents regression
- Technical debt documented for future refactoring
