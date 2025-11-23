# Unsafe Type Assertions in DataverseApiService

**Category:** Accepted Tradeoff
**Priority:** Low
**Effort:** 8-12 hours to implement full validation
**Last Reviewed:** 2025-11-23

---

## Summary

`DataverseApiService.request<T>()` returns `data as T` without runtime shape validation. This creates a theoretical risk of API contract violations causing runtime errors.

**Decision: Accept this risk.** Current mitigations (repository validation, stable API contracts) are sufficient, and zero bugs have been found in practice.

---

## Current State

```typescript
// src/shared/infrastructure/services/DataverseApiService.ts:296-305
const data: unknown = await response.json();

if (typeof data !== 'object' || data === null) {
    this.logger.error('Invalid API response: expected object', { data });
    throw new Error('Invalid API response structure: expected object');
}

this.logger.debug('DataverseApiService: Request succeeded', { method, endpoint });

return data as T;  // ⚠️ No shape validation
```

---

## Current Mitigations

### 1. Basic Validation
- ✅ Ensures response is non-null object (lines 298-301)
- ✅ Validates HTTP status codes
- ✅ Handles network errors

### 2. Repository Validation
- ✅ Repositories validate individual fields when mapping to domain entities
- ✅ Mappers throw descriptive errors for missing/invalid fields
- ✅ Domain entities validate on construction

### 3. Stable API Contracts
- ✅ Dataverse API contracts are stable (Microsoft-maintained)
- ✅ Breaking changes are rare and well-documented
- ✅ TypeScript provides compile-time safety for known APIs

---

## Why Not Fixed

### Effort vs. Benefit Analysis

| Factor | Assessment |
|--------|------------|
| **Implementation Effort** | 8-12 hours to add Zod/AJV schema validation for every API response |
| **Bugs Found** | **Zero** in production usage |
| **Current Mitigation** | Repository validation at mapping layer |
| **API Stability** | Dataverse contracts are stable |
| **Maintenance Cost** | High (schemas for every endpoint) |
| **Value Added** | Low (duplicate validation) |

**Verdict:** Current approach (validation at repository layer) is sufficient and hasn't caused bugs.

---

## Why This Pattern is Safe

### 1. Defense in Depth
- **Layer 1:** Basic validation (non-null object)
- **Layer 2:** Repository mappers validate fields
- **Layer 3:** Domain entities validate on construction

### 2. Fail-Fast at Mapping Layer
When API contracts change, repositories immediately throw descriptive errors:

```typescript
// Repository mapper catches missing fields
if (!dto.environmentid) {
    throw new Error('Missing environmentid in API response');
}
```

### 3. TypeScript Compile-Time Safety
- API response interfaces are well-typed
- IDE catches most issues during development
- Tests verify API contracts

---

## Alternative Solution (If Implemented)

```typescript
// Optional type guard parameter
async get<T>(
  environmentId: string,
  endpoint: string,
  typeGuard?: (data: unknown) => data is T,
  cancellationToken?: ICancellationToken
): Promise<T> {
  const data = await this.request(...);

  if (typeGuard && !typeGuard(data)) {
    throw new Error('API response validation failed');
  }

  return data as T;
}
```

**Usage:**
```typescript
// Add validation only for critical endpoints
const solution = await api.get<SolutionDto>(
    envId,
    '/api/data/v9.2/solutions',
    isSolutionDto  // Optional type guard
);
```

---

## When to Revisit

Consider implementing runtime validation if:

1. **API contract violations cause runtime errors** (none found so far)
2. **Adding integration tests with mocked responses** (schemas useful for mocks)
3. **Microsoft changes Dataverse API contracts unexpectedly** (rare, well-documented)

---

## Accepted Trade-offs

| Aspect | Current Pattern | Full Validation |
|--------|----------------|-----------------|
| **Implementation Cost** | Low (already done) | High (8-12 hours) |
| **Maintenance Cost** | Low (repositories validate) | High (schema maintenance) |
| **Runtime Safety** | Good (repository validation) | Better (dual validation) |
| **Bugs Prevented** | Contract violations | Contract violations (duplicate) |
| **Bugs Found** | 0 | 0 (theoretical) |

**Decision: Current pattern is pragmatic and effective.**

---

## Related Items

- None (standalone decision)

---

## References

**Code Locations:**
- `src/shared/infrastructure/services/DataverseApiService.ts:305` - Type assertion
- `src/shared/infrastructure/services/DataverseApiService.ts:298-301` - Basic validation

**Repository Examples (validation at mapping layer):**
- `src/features/environmentSetup/infrastructure/repositories/EnvironmentRepository.ts`
- `src/features/solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.ts`
- `src/features/metadataBrowser/infrastructure/repositories/DataverseEntityMetadataRepository.ts`

**Discussions:**
- Technical debt review 2025-11-22: Zero bugs from API contract violations
