# ADR-0005: Regex-based FetchXML Parsing for Domain Purity

**Status:** Accepted
**Date:** 2025-11-30
**Applies to:** FetchXmlToSqlTranspiler, FetchXmlParser

## Context

The FetchXML transpiler needs to parse XML to convert FetchXML to SQL. Options:

1. **Regex parsing** - Zero dependencies, keeps domain pure, but can't handle nested structures
2. **XML library** - Proper parsing, but adds infrastructure dependency to domain

Clean Architecture requires domain services have zero external dependencies.

## Decision

Use regex-based parsing to maintain domain layer purity. Accept limitations with nested XML structures.

## Consequences

### Positive

- **Domain layer remains pure** - Zero external dependencies
- **~95% of queries work** - Typical FetchXML doesn't use nested filters
- **Self-contained** - No DI complexity for parser injection
- **90.66% branch coverage** - Meets domain threshold

### Negative

- Nested `<filter><filter>...</filter></filter>` structures don't parse correctly
- Complex XML edge cases (CDATA, comments) may fail
- Users with complex needs must use SQL mode instead

### Known Limitations

1. Nested filters are flattened (conditions extracted, OR/AND grouping lost)
2. CDATA sections not supported
3. XML comments not supported

### When to Revisit

Consider infrastructure adapter pattern if:
1. Multiple user complaints about nested filter behavior
2. New features require accurate structural parsing
3. Major Data Explorer refactoring already planned

### Alternative (If Needed)

```typescript
// Domain interface
interface IFetchXmlParser {
    parse(fetchXml: string): ParsedFetchXml;
}

// Infrastructure implementation with XML library
class XmlFetchXmlParser implements IFetchXmlParser { }
```

## References

- `src/features/dataExplorer/domain/services/FetchXmlToSqlTranspiler.ts`
- [DOMAIN_SERVICE_PATTERNS.md](../architecture/DOMAIN_SERVICE_PATTERNS.md) - Transpiler pattern
