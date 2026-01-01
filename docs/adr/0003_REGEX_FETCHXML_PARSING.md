# ADR-0003: Regex-based FetchXML Parsing

**Status:** Accepted
**Date:** 2025-11-30
**Applies to:** FetchXmlToSqlTranspiler, FetchXmlParser

## Context

The FetchXML transpiler needs to parse XML to convert FetchXML to SQL. Options:

1. **Regex parsing** - Zero dependencies, simple, but can't handle nested structures
2. **XML library** - Proper parsing, but adds dependency complexity

## Decision

Use regex-based parsing for simplicity. Accept limitations with nested XML structures.

## Consequences

### Positive

- **Simple implementation** - Zero external dependencies
- **~95% of queries work** - Typical FetchXML doesn't use nested filters
- **Self-contained** - No complexity for parser injection

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
