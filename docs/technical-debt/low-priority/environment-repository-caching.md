# Environment Repository Caching

**Category:** Low Priority
**Priority:** Low
**Effort:** 2-3 hours
**Last Reviewed:** 2025-12-07

---

## Summary

The `EnvironmentRepository.getAll()` method is called redundantly 5+ times during panel initialization, each time loading all environments from storage and mapping DTOs to domain entities. This creates unnecessary log noise and wasted CPU cycles, though actual user-facing impact is minimal since environments are stored locally.

**Decision: Fix when naturally touching EnvironmentRepository or SharedFactories**

---

## Current State

Multiple independent calls to `EnvironmentRepository.getAll()` happen within 100ms during panel initialization:

| Time (ms offset) | Source |
|------------------|--------|
| +0 | Initial panel setup |
| +1 | Second load |
| +2 | After message handler registration |
| +72 | During solution fetch |
| +72 | Parallel call (same millisecond) |

Each call:
- Reads from VS Code `globalState`
- Maps 4 DTOs to domain entities
- Results in 20 DTO→Entity mappings instead of 4

**Affected files:**
- `src/infrastructure/dependencyInjection/SharedFactories.ts` (3 closure factories)
- `src/extension.ts` (extension activation)
- `src/features/environmentSetup/application/useCases/LoadEnvironmentsUseCase.ts`
- `src/infrastructure/dependencyInjection/TreeViewProviders.ts`
- `src/features/environmentSetup/application/useCases/SetDefaultEnvironmentUseCase.ts`
- `src/features/environmentSetup/application/useCases/MoveEnvironmentUseCase.ts`

**Scope:**
- 8 independent call sites
- Every panel creation triggers 2+ calls via SharedFactories
- Every environment switch triggers additional calls

---

## Why It Exists

SharedFactories creates closure functions that panels use to get environment data. Each closure independently calls `getAll()` without coordination:

```typescript
// SharedFactories.ts - each creates independent closure
private createGetEnvironments(): () => Promise<EnvironmentOption[]> {
    return async () => {
        const environments = await this.environmentRepository.getAll(); // No caching
        return environments.map(env => (...));
    };
}

private createGetEnvironmentById(): (envId: string) => Promise<...> {
    return async (envId: string) => {
        const environments = await this.environmentRepository.getAll(); // Loads ALL to find ONE
        const environment = environments.find(env => ...);
        // ...
    };
}
```

**Context:**
- Initial implementation prioritized simplicity
- Environment count is small (typically 1-10)
- Storage is local (fast reads)
- No cache invalidation complexity

---

## Why Low Priority

### Effort vs. Impact Analysis

| Factor | Assessment |
|--------|------------|
| **User Impact** | Minimal - users won't notice 100ms redundancy |
| **Performance** | Low - local storage reads are fast |
| **Log Noise** | Moderate - clutters debug logs |
| **Code Quality** | Moderate smell - `getById` loading all is inefficient |
| **Effort** | 2-3 hours |
| **Risk of Fix** | Low - straightforward caching |

**Verdict:** Not urgent. Fix opportunistically when working in this area.

---

## Proposed Solution

Add TTL-based caching to `EnvironmentRepository`:

```typescript
// EnvironmentRepository.ts
export class EnvironmentRepository implements IEnvironmentRepository {
    private cache: Environment[] | null = null;
    private cacheExpiry: number = 0;
    private readonly CACHE_TTL_MS = 30_000; // 30 seconds

    async getAll(): Promise<Environment[]> {
        if (this.cache && Date.now() < this.cacheExpiry) {
            this.logger.debug('Returning cached environments', { count: this.cache.length });
            return [...this.cache]; // Defensive copy
        }

        const environments = await this.loadFromStorage();
        this.cache = environments;
        this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;
        return [...environments];
    }

    // Call in save(), delete(), updateOrder() methods
    private invalidateCache(): void {
        this.cache = null;
        this.cacheExpiry = 0;
    }
}
```

### Implementation Steps

1. Add cache fields to `EnvironmentRepository`
2. Modify `getAll()` to check cache first
3. Add `invalidateCache()` private method
4. Call `invalidateCache()` in mutation methods (save, delete, updateOrder)
5. Update tests to verify caching behavior

**Effort:** 2-3 hours

---

## Fix When

**Triggers:**
- When modifying `EnvironmentRepository` for other reasons
- When working on `SharedFactories` improvements
- When environment count grows significantly (10+ environments)
- During a code hygiene sprint

---

## Risks of Not Addressing

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance degradation | Low | Low | Only with many environments |
| Log noise obscures issues | Low | Medium | Debug level, can be filtered |
| Copied pattern spreads | Medium | Low | Document as tech debt |

**Current risk level:** Low

---

## Alternative Solutions Considered

### Alternative 1: Cache in SharedFactories
- ✅ Minimal change (1 file)
- ❌ Doesn't fix other callers (extension.ts, tree view)
- **Verdict:** Rejected - partial fix

### Alternative 2: Event-based cache invalidation
- ✅ Bulletproof consistency
- ❌ Over-engineering for 4 environments
- **Verdict:** Rejected - complexity not justified

### Alternative 3: Repository-level caching (Recommended)
- ✅ Fixes ALL callers automatically
- ✅ Follows existing patterns (DataverseEntityMetadataRepository)
- ✅ Single source of truth
- **Verdict:** Accepted

---

## Related Items

- None (standalone decision)

---

## References

**Code Locations:**
- `src/infrastructure/dependencyInjection/SharedFactories.ts:32,48,71` - closure factories
- `src/features/environments/infrastructure/repositories/EnvironmentRepository.ts` - repository implementation

**Pattern Documentation:**
- `docs/architecture/REPOSITORY_PATTERNS.md` - repository patterns
- Similar caching in `DataverseEntityMetadataRepository` and `IntelliSenseMetadataCache`

**Discussions:**
- Technical debt review 2025-12-07: Identified via debug log analysis
