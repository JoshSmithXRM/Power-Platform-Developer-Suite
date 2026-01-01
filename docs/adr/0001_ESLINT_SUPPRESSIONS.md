# ADR-0001: ESLint Suppressions Policy

**Status:** Accepted
**Date:** 2025-11-23
**Applies to:** All TypeScript source files

## Context

ESLint enforces code quality rules, but some patterns require suppressions. Without a clear policy, suppressions can proliferate without justification, hiding real issues.

## Decision

Allow ESLint suppressions only when:
1. The pattern is a conscious architectural decision (e.g., OData in domain)
2. ESLint cannot understand the pattern (e.g., linear field mapping complexity)
3. External library requirements force specific patterns (e.g., MSAL mutations)
4. Test validation requires bypassing type checking (e.g., testing null inputs)

All suppressions must include inline documentation explaining why.

## Consequences

### Positive

- **29 justified suppressions** across 21 files (down from 41 after rule improvements)
- 100% of suppressions have clear documentation
- Quarterly review process ensures suppressions remain valid
- ESLint rule improvements eliminated 12 suppressions via prefix matching

### Negative

- Some suppressions require understanding architectural decisions
- New contributors may not immediately understand why rules are suppressed

### Suppression Categories

| Rule | Count | Justification |
|------|-------|---------------|
| `@typescript-eslint/no-require-imports` | 8 | Integration tests require dynamic imports |
| `@typescript-eslint/no-explicit-any` | 8 | Test validation of edge cases |
| `complexity` | 4 | Parameter assignment, not logic complexity |
| `local-rules/no-presentation-methods-in-domain` | 3 | OData query building (design decision) |
| `prefer-const` | 2 | MSAL library mutation requirements |
| Other | 4 | Various justified cases |

## References

- [ODATA_DOMAIN_PATTERN.md](../architecture/ODATA_DOMAIN_PATTERN.md) - OData in domain rationale
- [STATIC_FACTORY_PATTERN.md](../architecture/STATIC_FACTORY_PATTERN.md) - Static factory pattern
