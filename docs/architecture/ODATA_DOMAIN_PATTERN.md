# OData Query Building in Domain Layer

**Category**: Accepted Tradeoff (Design Decision)
**Priority**: N/A (Conscious architectural choice)
**Last Reviewed**: 2025-11-23

---

## Summary

OData query expression building logic exists in the domain layer (`ODataExpressionBuilder` service, `FilterCondition.toODataExpression()` methods). This pattern was flagged in the original architecture review as "appearing to be an infrastructure concern," but it is actually a **conscious architectural decision**.

**Decision: KEEP - OData expressions represent domain filtering logic (business rules), not infrastructure.**

---

## Current State

**Location**: Plugin Trace Viewer feature - Domain layer

**Files**:
- `src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts` - Domain service for query building
- `src/features/pluginTraceViewer/domain/entities/FilterCondition.ts:59` - `toODataExpression()` method
- `src/features/pluginTraceViewer/domain/entities/TraceFilter.ts:98` - `toODataFilter()` method

**Code Example**:
```typescript
// Domain Service (ODataExpressionBuilder.ts)
/**
 * Domain Service: OData Expression Builder
 *
 * Handles translation of filter conditions to OData query expressions.
 * Encapsulates OData v4 syntax knowledge, keeping domain entities pure.
 *
 * Business Rules:
 * - Function operators (contains, startswith, endswith) use function syntax
 * - Comparison operators use infix notation (field operator value)
 * - Text/enum values are quoted, numbers/dates are not
 * - Single quotes in values are escaped as ''
 * - Date values use DateTimeFilter for proper OData formatting
 */
export class ODataExpressionBuilder {
    /**
     * Builds OData filter expression from a filter condition.
     * Returns undefined if condition is disabled.
     */
    public buildExpression(condition: FilterCondition): string | undefined {
        if (!condition.enabled) {
            return undefined;
        }

        const fieldName = condition.field.odataName;
        const operator = condition.operator.odataOperator;
        const fieldType = condition.field.fieldType;

        // Null operators (don't need a value)
        if (operator === 'null') {
            return `${fieldName} eq null`;
        }
        if (operator === 'notnull') {
            return `${fieldName} ne null`;
        }

        const value = this.formatValue(condition.value, fieldType);

        // Function-style operators (contains, startswith, endswith)
        if (this.isFunctionOperator(operator)) {
            return `${operator}(${fieldName}, ${value})`;
        }

        // Comparison operators (eq, ne, gt, lt, ge, le)
        return `${fieldName} ${operator} ${value}`;
    }
}
```

---

## Justification

### Why OData is Domain Logic

**OData filter expressions are business rules**, not infrastructure concerns:

1. **Filter logic is domain knowledge**:
   - "Show me traces where MessageName contains 'Create'"
   - "Show me traces created after 2025-11-01"
   - "Show me traces with OperationType equals 'Create'"
   - These are **business filtering rules**, not HTTP transport details

2. **OData is the query language of the domain**:
   - Microsoft Dataverse uses OData as its native query language
   - OData expressions represent **WHAT** to filter (business rules)
   - The domain decides filtering logic; infrastructure executes it

3. **Clean separation of concerns**:
   - **Domain**: WHAT to filter (business rules, query specification)
   - **Infrastructure**: HOW to execute (HTTP client, authentication, caching, retry logic)

**Comparison**:
- ✅ **Domain**: "Filter traces where OperationType equals 'Create'" → OData expression building (`OperationType eq 'Create'`)
- ❌ **Infrastructure**: "Send HTTP GET request with authentication header" → HTTP client, auth tokens, headers

---

## Analogy: SQL WHERE Clauses

OData expressions are analogous to SQL WHERE clauses:

**SQL Example**:
```sql
-- Domain concern: Business rule (what to query)
WHERE age > 18 AND status = 'Active'

-- Infrastructure concern: How to execute
Database driver, connection pooling, query optimization
```

**OData Example**:
```typescript
// Domain concern: Business rule (what to filter)
const filter = "age gt 18 and status eq 'Active'";

// Infrastructure concern: How to execute
HTTP GET /api/users?$filter=${filter}
  with authentication, caching, retry logic
```

**Key insight**: The **query specification** (WHERE clause / OData filter) is domain logic. The **query execution** (database driver / HTTP client) is infrastructure.

---

## Why This Was Flagged

**Original review concern**:
> "OData query string building logic exists in domain entities (FilterCondition, TraceFilter). This appears to be infrastructure concern but is justified as domain logic per technical design decision."

**Our response**:

### 1. OData is Query Specification, Not Query Execution

**What the domain does** (query specification):
- Defines WHAT to filter: "OperationType equals Create"
- Builds filter expression: `"OperationType eq 'Create'"`
- Combines multiple conditions: `"OperationType eq 'Create' and createdOn gt 2025-11-01T00:00:00Z"`

**What infrastructure does** (query execution):
- Sends HTTP GET request: `/api/plugintraces?$filter=...`
- Adds authentication headers: `Authorization: Bearer <token>`
- Handles caching: Check cache before API call
- Handles retries: Retry on 429/503 errors
- Handles errors: Map HTTP errors to domain errors

**Conclusion**: Domain builds the query (business rules), infrastructure executes it (technical details).

### 2. OData Syntax is Domain Knowledge

**Business rules encoded in OData**:
- String operations: `contains(MessageName, 'Create')` - "Message name contains Create"
- Date comparisons: `createdOn gt 2025-11-01` - "Created after Nov 1st"
- Null checks: `ExceptionDetails eq null` - "Traces without exceptions"
- Enums: `OperationType eq 2` - "Create operations" (domain knows 2 = Create)

**These are business rules**, not infrastructure details. The domain must encode these rules in OData syntax because Dataverse (the domain) uses OData as its query language.

### 3. Alternative Approaches (Why Rejected)

#### Alternative 1: Generic Filter Interface (Rejected)

**Idea**: Create generic filter interface, let infrastructure translate to OData.

```typescript
// Domain
interface Filter {
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan';
    value: unknown;
}

// Infrastructure translates to OData
const odataExpression = translateToOData(filter);
```

**Problems**:
1. ❌ Infrastructure must know domain filtering rules (tight coupling)
2. ❌ Domain entities become anemic (no behavior, just data)
3. ❌ Violates SRP (infrastructure does HTTP + builds queries)
4. ❌ Harder to test (query building logic in infrastructure, far from domain)
5. ❌ Domain loses control over query semantics

#### Alternative 2: Repository Builds Queries (Rejected)

**Idea**: Pass raw filter objects to repository, let repository build OData.

```typescript
// Domain
class TraceFilter {
    conditions: FilterCondition[];
}

// Infrastructure repository
class DataversePluginTraceRepository {
    async query(filter: TraceFilter): Promise<PluginTrace[]> {
        const odataExpression = this.buildOData(filter); // ❌ Business logic in infrastructure
        return this.apiClient.get(`/plugintraces?$filter=${odataExpression}`);
    }
}
```

**Problems**:
1. ❌ Business logic leaks into infrastructure layer
2. ❌ Repository must understand filter semantics (violation of dependency inversion)
3. ❌ Duplicates query building logic if multiple repositories need filtering

---

## Current Approach (Why Correct)

### Architecture

```
┌─────────────────────────────────────────┐
│ Domain Layer                            │
│                                         │
│ ┌─────────────────┐                    │
│ │ FilterCondition │                    │
│ │ ────────────────│                    │
│ │ + toODataExpression()                │ ← Encodes business rule
│ └─────────────────┘                    │
│          │                              │
│          v                              │
│ ┌─────────────────┐                    │
│ │ TraceFilter     │                    │
│ │ ────────────────│                    │
│ │ + toODataFilter()                    │ ← Combines conditions
│ └─────────────────┘                    │
│          │                              │
│          v                              │
│ ┌─────────────────────────┐            │
│ │ ODataExpressionBuilder  │            │ ← Domain service
│ │ ────────────────────────│            │   (encapsulates OData syntax)
│ │ + buildExpression()     │            │
│ └─────────────────────────┘            │
└─────────────────────────────────────────┘
          │
          │ (OData filter string)
          v
┌─────────────────────────────────────────┐
│ Infrastructure Layer                    │
│                                         │
│ ┌───────────────────────────────────┐  │
│ │ DataversePluginTraceRepository    │  │
│ │ ──────────────────────────────────│  │
│ │ + query(filter: TraceFilter)      │  │ ← Blindly executes
│ │   {                                │  │   query from domain
│ │     const odata = filter.toOData();│  │
│ │     return this.http.get(odata);   │  │
│ │   }                                │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Benefits**:
1. ✅ Domain encapsulates filtering logic (business rules in domain layer)
2. ✅ Infrastructure executes queries blindly (no business knowledge)
3. ✅ Clean separation of concerns (WHAT vs HOW)
4. ✅ Easy to test (query building logic is testable in isolation)
5. ✅ Domain retains control over query semantics

---

## Evidence from Codebase

### 1. ODataExpressionBuilder is a Domain Service

Located in `domain/services/` (not `infrastructure/`):
```
src/features/pluginTraceViewer/
├── domain/
│   ├── services/
│   │   ├── ODataExpressionBuilder.ts      ← Domain service
│   │   ├── ODataExpressionBuilder.test.ts ← 48 tests
│   │   └── PluginTraceFilterService.ts
│   └── entities/
│       ├── FilterCondition.ts
│       └── TraceFilter.ts
└── infrastructure/
    └── repositories/
        └── DataversePluginTraceRepository.ts ← Uses domain service
```

**Domain services** encapsulate complex domain logic that doesn't belong to any single entity. Query building is domain logic (filtering rules), so it belongs in a domain service.

### 2. Comprehensive Tests Verify Business Rules

`ODataExpressionBuilder.test.ts` (48 tests) verifies **business rules**:
- String operations: `contains()`, `startswith()`, `endswith()`
- Null handling: `eq null`, `ne null`
- Date formatting: ISO 8601 UTC format
- Value escaping: Single quotes escaped as `''`
- Field type handling: Text vs Number vs Date

**These are business rules**, not infrastructure details.

### 3. Repository Blindly Executes Queries

```typescript
// DataversePluginTraceRepository.ts
async getPluginTraces(filter: TraceFilter): Promise<PluginTrace[]> {
    // Domain provides OData filter (business rules)
    const odataFilter = filter.toODataFilter();

    // Infrastructure executes (technical details)
    const url = `/api/data/v9.2/plugintraceLogs?$filter=${odataFilter}`;
    const response = await this.apiService.get(url);

    // Map DTOs to domain entities
    return response.value.map(dto => this.mapToEntity(dto));
}
```

**Repository has ZERO knowledge of filtering logic** - it blindly executes the query provided by the domain.

---

## ESLint Suppressions

**Suppressed rule**: `local-rules/no-presentation-methods-in-domain`

**Justification in code**:
```typescript
// FilterCondition.ts:58
// eslint-disable-next-line local-rules/no-presentation-methods-in-domain
// OData query building is domain logic (design decision, see technical design doc)
toODataExpression(): string | undefined {
    return this.oDataExpressionBuilder.buildExpression(this);
}

// TraceFilter.ts:98
// eslint-disable-next-line local-rules/no-presentation-methods-in-domain
// OData query building is domain logic (design decision, see technical design doc)
toODataFilter(): string {
    const expressions = this.conditions
        .map(c => c.toODataExpression())
        .filter(e => e !== undefined);
    return expressions.join(' and ');
}
```

**All 5 suppressions documented** (see `eslint-suppressions.md`).

---

## Design Documents

This decision is documented in multiple design docs:

1. **DATETIME_FILTER_ARCHITECTURE.md**:
   - Explains OData format conversion in DateTimeFilter
   - Documents layer responsibilities for datetime handling

2. **FILTER_PANEL_IMPROVEMENTS_DESIGN.md**:
   - Describes filter panel architecture
   - Documents query building as domain responsibility

3. **CLEAN_ARCHITECTURE_GUIDE.md**:
   - Clarifies domain layer responsibilities
   - Defines query specification vs query execution

---

## Decision

**KEEP**: OData query building is domain logic for Dataverse-based applications.

**Rationale**:
1. ✅ OData expressions are **query specifications** (WHAT), not **query execution** (HOW)
2. ✅ Filtering rules are business knowledge, belong in domain
3. ✅ Clean separation: Domain builds queries, infrastructure executes them
4. ✅ Well-tested (48 tests verify business rules)
5. ✅ Analogous to SQL WHERE clauses (universally accepted as domain logic)
6. ✅ Alternative approaches violate SRP and create tight coupling

**This is NOT technical debt** - it is a conscious architectural decision aligned with Clean Architecture principles.

**No action required** - pattern is correct as-is.

---

## Comparison with DateTimeFilter

**Note**: OData query building (THIS document) is **different** from DateTimeFilter format conversion (see `scheduled/datetime-filter-mixed-concerns.md`).

| Aspect | OData Query Building (KEEP) | DateTimeFilter Formatting (DEFER) |
|--------|---------------------------|----------------------------------|
| **Concern** | Query specification (WHAT to filter) | Format conversion (UTC ↔ local ↔ OData) |
| **Layer** | Domain (business rules) | Should be in helpers (presentation/infrastructure) |
| **Decision** | ✅ Correct architecture | ⏳ Extract helpers when touching code |
| **Why different** | Query building IS domain logic | Format conversion is NOT domain logic |

---

## Related Items

- **eslint-suppressions.md**: Documents all `local-rules/no-presentation-methods-in-domain` suppressions
- **datetime-filter-mixed-concerns.md**: SEPARATE issue about format conversion methods (not query building)
- **static-factory-methods.md**: Related pattern (domain entities with methods)

---

## References

**Design Documents**:
- `docs/design/DATETIME_FILTER_ARCHITECTURE.md` - DateTime filtering architecture
- `docs/design/FILTER_PANEL_IMPROVEMENTS_DESIGN.md` - Filter panel design
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Domain layer responsibilities

**Code Locations**:
- `src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts`
- `src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.test.ts` (48 tests)
- `src/features/pluginTraceViewer/domain/entities/FilterCondition.ts:59`
- `src/features/pluginTraceViewer/domain/entities/TraceFilter.ts:98`

**ESLint Suppressions**:
- 5 occurrences documented in `eslint-suppressions.md`

**Architecture Principles**:
- Robert C. Martin, *Clean Architecture* - "Use cases orchestrate, entities decide"
- Eric Evans, *Domain-Driven Design* - "Services encapsulate domain logic that doesn't fit in entities"

---

**Last Updated**: 2025-11-23
**Next Review**: 2026-02-23 (Quarterly)
