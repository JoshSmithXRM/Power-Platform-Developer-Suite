# ADR-0002: Value Object getValue() Without Branded Types

**Status:** Accepted
**Date:** 2025-11-22
**Applies to:** All domain value objects

## Context

Value objects wrap primitives with validation. The `getValue()` method returns the underlying primitive, but TypeScript cannot distinguish between different value object types after unwrapping:

```typescript
const envId = new EnvironmentId('env-123');
const clientId = new ClientId('client-456');

// Both return `string` - TypeScript allows mixing:
const mixedUp: string = envId.getValue();
repository.saveClient(mixedUp);  // Compiles but wrong!
```

Branded types could prevent this at compile time but require significant refactoring.

## Decision

Accept the current `getValue(): string` pattern without branded types.

## Consequences

### Positive

- **Zero bugs found** in code review across 100+ callsites
- Simple, understandable pattern for all contributors
- No type gymnastics at infrastructure boundaries
- Domain validation still catches invalid values at runtime

### Negative

- Theoretical risk of mixing incompatible IDs at compile time
- Relies on semantic context (variable names, function signatures) to prevent mistakes

### Why This Is Safe

1. **Domain validation works** - Value objects validate on construction
2. **Type mixing is rare** - Each value object type is used in specific contexts
3. **Clean Architecture protects boundaries** - Infrastructure APIs require primitives anyway

### When to Revisit

Consider branded types only if multiple bugs are found due to ID mixing.

## References

- Value objects: `src/features/*/domain/valueObjects/`
- Pattern used by: `EnvironmentId`, `ClientId`, `TenantId`, `DataverseUrl`, `CorrelationId`, `LogicalName`, `SchemaName`
