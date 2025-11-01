# Technical Debt & Future Improvements

This document tracks known technical debt and future improvement opportunities that have been deferred for valid reasons.

## Documentation

### JSDoc on Public Methods

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (2-3 hours)

**Issue:**
Public methods in use cases and other application layer classes lack JSDoc documentation. While method names and TypeScript types provide some documentation, JSDoc would improve:
- IntelliSense experience in IDE
- API discoverability
- Developer onboarding

**Current State:**
```typescript
// No JSDoc
public async execute(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
```

**Desired State:**
```typescript
/**
 * Saves or updates an environment configuration
 * @param request Environment data including credentials and configuration
 * @returns Environment ID and any validation warnings
 * @throws ApplicationError if validation fails or environment not found
 */
public async execute(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
```

**Recommendation:**
- Add JSDoc as part of dedicated documentation sprint
- Focus on public APIs first (use cases, domain services)
- Include @param, @returns, @throws tags
- Keep comments focused on "why" and "what", not "how"

**Files to Update:**
- All use case `execute()` methods
- Domain service public methods
- Repository interface methods
- Public methods in domain entities

**Related Review Finding:**
Code Reviewer - Major Issue #6

---

## Code Quality

### Cross-Feature DTO Coupling in Persistence Inspector

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (15-20 minutes)

**Issue:**
The Persistence Inspector infrastructure layer directly references `EnvironmentConnectionDto` from the `environmentSetup` feature to derive secret keys. This creates cross-feature coupling at the infrastructure level.

**Current State:**
```typescript
// VsCodeStorageReader.ts
import { EnvironmentConnectionDto } from '../../../environmentSetup/application/dto/EnvironmentConnectionDto';

public async readAllSecretKeys(): Promise<string[]> {
    const environments = this.globalState.get<EnvironmentConnectionDto[]>(
        VsCodeStorageReader.ENVIRONMENTS_KEY, []
    );
    // Derives secret keys from environment structure
}
```

**Why Deferred:**
- Persistence Inspector is a debug tool that needs to understand environment structure
- Infrastructure-to-infrastructure coupling is acceptable in Clean Architecture
- Only one feature currently needs this pattern
- "Don't abstract until you need it twice" principle

**When to Address:**
- When a 3rd feature needs to read environment data
- When environment DTO structure changes frequently
- During refactoring sprint focused on shared infrastructure

**Recommended Solution:**
1. Create shared DTOs in `src/shared/domain/` or `src/shared/application/`
2. Move environment-related DTOs to shared location
3. Both features reference shared DTOs instead of cross-feature imports

**Related Review Finding:**
Clean Architecture Guardian - Optional Improvement #1

---

### Other deferred items will be added here as they arise

