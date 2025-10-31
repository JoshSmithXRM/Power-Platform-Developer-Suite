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

### Other deferred items will be added here as they arise

