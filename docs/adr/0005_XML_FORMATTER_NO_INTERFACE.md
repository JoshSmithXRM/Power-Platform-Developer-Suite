# ADR-0005: XmlFormatter Without Interface (Rejected Over-Engineering)

**Status:** Accepted (Will Not Implement Interface)
**Date:** 2025-11-22
**Applies to:** XmlFormatter infrastructure service

## Context

A suggestion was made to extract an `IXmlFormatter` interface to follow Dependency Inversion Principle more strictly.

## Decision

Reject the interface extraction. This would be cargo cult DIP without benefit.

## Consequences

### Positive

- **No unnecessary abstraction** - One less file to maintain
- **Simpler code** - Direct concrete class injection
- **Still testable** - Pure function with no dependencies
- **Correct architecture** - Infrastructure can use concrete classes

### Why Interface Is Unnecessary

1. **Single implementation** - No business reason to swap formatters
2. **Pure function** - Easy to test/mock without interface
3. **YAGNI** - "You Aren't Gonna Need It"

### When Interface WOULD Be Needed

An interface would be justified if:
- Multiple implementations exist (JSON, YAML, XML formatters with polymorphism)
- Domain layer depends on formatting
- Different trade-offs between implementations (pretty vs compact)

None of these apply.

### Anti-Pattern Avoided

```typescript
// Cargo cult DIP - adds ceremony without benefit
interface IXmlFormatter {
    format(xml: string): string;
}

class XmlFormatter implements IXmlFormatter { }

// Still infrastructure -> infrastructure!
class SomeInfraService {
    constructor(private formatter: IXmlFormatter) {}
}
```

## References

- `src/shared/infrastructure/formatters/XmlFormatter.ts`
