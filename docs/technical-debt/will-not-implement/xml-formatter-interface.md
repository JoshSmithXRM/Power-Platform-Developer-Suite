# IXmlFormatter Interface Extraction

**Category:** Will Not Implement
**Priority:** N/A
**Effort:** Low (1 hour)
**Last Reviewed:** 2025-11-22

---

## Summary

Clean Architecture Guardian suggested extracting an interface for `XmlFormatter` to follow the Dependency Inversion Principle more strictly.

**Decision: Will not implement.** This would be cargo cult DIP without any benefit.

---

## Why This Was Suggested

To follow Dependency Inversion Principle more strictly by having infrastructure depend on abstractions rather than concrete classes.

---

## Why This Is Unnecessary

### 1. XmlFormatter is Already in Infrastructure Layer

**Location:** `src/shared/infrastructure/formatters/XmlFormatter.ts`

- Infrastructure can use concrete classes without interfaces
- DIP is for **protecting domain from infrastructure changes**
- XmlFormatter is infrastructure, injected into other infrastructure
- **No domain layer in this dependency chain**

### 2. No Multiple Implementations Needed

- XML formatting has **one correct approach**
- No business reason to swap formatters (not like switching databases or APIs)
- YAGNI principle applies: "You Aren't Gonna Need It"

### 3. Already Highly Testable

```typescript
// Pure function with no dependencies
export class XmlFormatter {
    public format(xml: string): string {
        // Simple transformation logic
    }
}
```

- Pure function with no side effects
- Easy to mock if needed (though mocking not necessary)
- Current tests work perfectly without interface

### 4. Adding Interface Would Be Cargo Cult DIP

**Cargo cult programming:** Following patterns without understanding why.

```typescript
// ❌ Unnecessary ceremony
interface IXmlFormatter {
    format(xml: string): string;
}

class XmlFormatter implements IXmlFormatter {
    format(xml: string): string { ... }
}

// Still injecting into infrastructure, not domain!
class SomeInfrastructureService {
    constructor(private formatter: IXmlFormatter) {}
}
```

**This adds:**
- ❌ Extra file (IXmlFormatter.ts)
- ❌ Extra abstraction (interface)
- ❌ No actual benefit (still infrastructure → infrastructure)

---

## When Interface WOULD Be Needed

An interface would be justified if:

1. **Multiple implementations exist**
   - JsonFormatter, YamlFormatter, XmlFormatter
   - Want polymorphism to swap at runtime

2. **Domain layer depends on formatting**
   - Domain entity needs to serialize itself
   - Need to protect domain from infrastructure changes

3. **Different trade-offs between implementations**
   - PrettyXmlFormatter (readable, larger)
   - CompactXmlFormatter (smaller, less readable)
   - Business logic chooses based on context

**None of these apply.** We have one implementation, used only in infrastructure, with no variation needed.

---

## Current Usage

```typescript
// Infrastructure service using concrete class (correct)
export class SomeService {
    constructor(
        private readonly xmlFormatter: XmlFormatter  // Concrete class, no interface
    ) {}

    someMethod() {
        const formatted = this.xmlFormatter.format(xml);
    }
}
```

**This is correct because:**
- ✅ Both are infrastructure (no domain involvement)
- ✅ Single implementation (no polymorphism needed)
- ✅ Testable (pure function, easy to mock if needed)

---

## Verdict

**Interface would add ceremony without benefit.**

XmlFormatter is correctly placed in infrastructure and correctly injected as concrete class.

---

## Related Items

- None (standalone decision)

---

## References

**Code Locations:**
- `src/shared/infrastructure/formatters/XmlFormatter.ts`

**Pattern Documentation:**
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - DIP explained (when to use interfaces)
- Principle: Interfaces protect domain from infrastructure, not infrastructure from infrastructure

**Discussions:**
- Code Guardian review: Suggested IXmlFormatter extraction
- Decision: Correctly rejected as unnecessary abstraction
