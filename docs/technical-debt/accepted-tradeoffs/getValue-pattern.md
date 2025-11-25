# getValue() Pattern Without Branded Types

**Category:** Accepted Tradeoff
**Priority:** N/A (Indefinitely accepted)
**Effort:** 6-8 hours for 100+ callsites
**Last Reviewed:** 2025-11-22

---

## Summary

All value objects in the domain layer use a `getValue()` method that returns primitive types (string, number) without branded type safety. This creates a theoretical risk of accidentally mixing incompatible value objects at compile time.

**Decision: Accept this pattern as-is.** The pragmatic benefits outweigh the theoretical type safety improvement.

---

## Current State

Value objects wrap primitives with validation and expose them via `getValue()`:

```typescript
// src/features/environmentSetup/domain/valueObjects/EnvironmentId.ts
export class EnvironmentId {
    private readonly value: string;

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment ID cannot be empty');
        }
        this.value = value;
    }

    public getValue(): string {
        return this.value;
    }
}
```

**Scope:**
- **20 files** use the getValue() pattern across multiple value objects
- **100+ callsites** across application and infrastructure layers
- Examples: `EnvironmentId`, `DataverseUrl`, `ClientId`, `TenantId`, `EnvironmentName`, `StorageKey`

**Value objects using this pattern:**
- `EnvironmentId`, `ClientId`, `TenantId`, `EnvironmentName`, `DataverseUrl` (environmentSetup)
- `CorrelationId` (pluginTraceViewer)
- `LogicalName`, `SchemaName`, `AttributeType` (metadataBrowser)

---

## The Type Safety Issue

TypeScript cannot distinguish between different value object types after `getValue()`:

```typescript
const envId = new EnvironmentId('env-123');
const clientId = new ClientId('client-456');

// Both return `string` - TypeScript allows this mistake:
const mixedUp: string = envId.getValue();
repository.saveClient(mixedUp);  // Runtime bug! Wrong ID type
```

---

## Alternative: Branded Types

```typescript
// Branded type pattern
type Brand<K, T> = K & { __brand: T };

export class EnvironmentId {
    private readonly value: Brand<string, 'EnvironmentId'>;

    public getValue(): Brand<string, 'EnvironmentId'> {
        return this.value;
    }
}

// Now TypeScript prevents mixing:
saveEnvironment(envId.getValue());     // ✅ OK
saveEnvironment(clientId.getValue());  // ❌ Compile error!
```

---

## Why Not Implement

### Effort vs. Benefit Analysis

| Factor | Assessment |
|--------|------------|
| **Refactoring Scope** | 100+ callsites across 20+ files (6-8 hours) |
| **Breaking Changes** | All persistence layers, mappers, API services |
| **Runtime Safety** | No change (same validation, same runtime behavior) |
| **Compile Safety** | Marginal improvement (catches theoretical bugs only) |
| **Real Bugs Found** | **Zero instances in codebase review** |
| **Code Complexity** | Increases (branded types, type assertions at boundaries) |
| **Developer Experience** | Degrades (more boilerplate, harder onboarding) |

**Verdict:** 6-8 hours of work for zero observed bugs = not worth it.

---

## Why This Pattern is Safe

### 1. Domain Validation Still Works
- Value objects validate on construction
- Real-world bugs (empty strings, malformed URLs, invalid UUIDs) are all caught by domain validation, not by branded types

### 2. Type Mixing is Rare
- `EnvironmentId` → only used with `IEnvironmentRepository`
- `ClientId` → only used with `MsalAuthenticationService`
- `DataverseUrl` → only used for API base URLs
- The **semantic context prevents mistakes** more than type brands would

### 3. Clean Architecture Protects Boundaries
- Infrastructure APIs require primitives
- Value objects **must** unwrap to primitives at the boundary
- Branded types just add ceremony without runtime benefit

---

## Accepted Trade-offs

| Aspect | Current Pattern | Branded Types |
|--------|----------------|---------------|
| **Type Safety** | Runtime (DomainError) | Runtime + Compile |
| **Bugs Prevented** | Invalid values | Invalid values + type mixing |
| **Developer Velocity** | Fast (simple pattern) | Slower (type wrangling) |
| **Refactoring Cost** | Low | High (100+ callsites) |
| **Bugs Found in Review** | 0 | 0 (theoretical only) |

**Decision: Current pattern wins on pragmatism.**

---

## When to Revisit

Consider branded types only if:

1. **Multiple bugs** are found due to ID mixing (none found in review)
2. **Major refactoring** is already planned (e.g., migrating persistence layer)
3. **New domain model** is being built from scratch (low refactoring cost)

Otherwise, **keep the current pattern indefinitely**.

---

## Related Items

- None (standalone decision)

---

## References

**Code Locations:**
- `src/features/environmentSetup/domain/valueObjects/EnvironmentId.ts`
- `src/features/environmentSetup/domain/valueObjects/ClientId.ts`
- `src/features/environmentSetup/domain/valueObjects/TenantId.ts`
- `src/features/environmentSetup/domain/valueObjects/DataverseUrl.ts`
- `src/features/environmentSetup/domain/valueObjects/EnvironmentName.ts`
- `src/features/pluginTraceViewer/domain/valueObjects/CorrelationId.ts`
- `src/features/metadataBrowser/domain/valueObjects/LogicalName.ts`
- `src/features/metadataBrowser/domain/valueObjects/SchemaName.ts`
- `src/features/metadataBrowser/domain/valueObjects/AttributeType.ts`

**Discussions:**
- Technical debt review 2025-11-22: Zero bugs found in 100+ callsites
