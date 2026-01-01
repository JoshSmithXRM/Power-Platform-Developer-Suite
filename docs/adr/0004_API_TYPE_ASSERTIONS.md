# ADR-0004: API Response Type Assertions Without Runtime Validation

**Status:** Accepted
**Date:** 2025-11-23
**Applies to:** DataverseApiService

## Context

`DataverseApiService.request<T>()` returns `data as T` without full runtime shape validation:

```typescript
const data: unknown = await response.json();

if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid API response structure');
}

return data as T;  // No shape validation
```

This creates theoretical risk of API contract violations causing runtime errors.

## Decision

Accept type assertions with current mitigations rather than implementing full schema validation (Zod/AJV).

## Consequences

### Positive

- **Zero bugs found** from API contract violations
- Repository mappers provide defense-in-depth validation
- Domain entities validate on construction
- Dataverse API contracts are stable (Microsoft-maintained)
- No schema maintenance overhead

### Negative

- Theoretical risk of runtime errors if API changes unexpectedly
- Type safety relies on Microsoft maintaining stable contracts

### Defense in Depth

1. **Layer 1:** Basic validation (non-null object)
2. **Layer 2:** Repository mappers validate fields during mapping
3. **Layer 3:** Domain entities validate on construction

### When to Revisit

Consider full schema validation if:
1. API contract violations cause runtime errors
2. Adding integration tests with mocked responses
3. Microsoft changes Dataverse API unexpectedly

## References

- `src/shared/infrastructure/services/DataverseApiService.ts:305` - Type assertion
- Repository mappers provide field validation during DTO-to-entity mapping
