# Technical Debt & Future Improvements

This document tracks known technical debt and future improvement opportunities that have been deferred for valid reasons.

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

## Documentation

### CLEAN_ARCHITECTURE_GUIDE.md Exceeds Length Limit

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (2-3 hours to split properly)

**Issue:**
`docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` is 1,709 lines, exceeding the DOCUMENTATION_STYLE_GUIDE.md hard limit of 1,200 lines.

**Current State:**
- Comprehensive guide with Quick Reference, 5 core principles, layer architecture, decision frameworks, 3 real-world examples, and 5 common mistakes
- All examples from actual production code (Environment entity, SaveEnvironmentUseCase, EnvironmentRepository)
- Well-structured with progressive disclosure
- Highly valuable reference document

**Why Deferred:**
- Content quality is exceptional (scored 88/100 in review)
- Document is navigable with Quick Reference section
- Style guide allows comprehensive guides as exception
- Not enough architectural patterns documented yet (only Environment feature fully implemented)
- Better to split after Data Panel Suite is implemented (more patterns to organize)

**When to Address:**
- After Data Panel Suite implementation (will have more examples and patterns)
- When document approaches 2,000 lines
- When adding significantly more content

**Recommended Solution:**
Split into 3 documents (~500-600 lines each):
1. `CLEAN_ARCHITECTURE_GUIDE.md` - Principles, layer overview, decision framework
2. `CLEAN_ARCHITECTURE_EXAMPLES.md` - Detailed real-world examples (Environment, Data Panels)
3. `CLEAN_ARCHITECTURE_PATTERNS.md` - Common mistakes, value objects, rich models

**Related Review Finding:**
Code review by primary developer - scored 88/100, exceeded 1200 line hard limit

---

### Other deferred items will be added here as they arise

