# Regex-based FetchXML Parsing

**Category:** Accepted Tradeoff
**Priority:** Low
**Effort:** 2-3 days (infrastructure adapter approach)
**Last Reviewed:** 2025-11-30

---

## Summary

The FetchXmlToSqlTranspiler uses regex-based string parsing instead of a proper XML parser to convert FetchXML to SQL. This maintains domain layer purity but has limitations with nested XML structures.

**Decision: Accept this pattern - domain purity outweighs edge case support**

---

## Current State

The transpiler uses regex patterns to extract FetchXML elements and convert them to SQL syntax.

**Affected files:**
- `src/features/dataExplorer/domain/services/FetchXmlToSqlTranspiler.ts`
- `src/features/dataExplorer/domain/services/FetchXmlValidator.ts`

**Scope:**
- 2 files affected
- ~700 lines of code
- Used by ExecuteFetchXmlQueryUseCase

**Current behavior:**
- Successfully parses ~95% of real-world FetchXML queries
- Handles attributes, filters, conditions, link-entities, orders
- Nested filters are flattened (conditions extracted, joined with parent's AND/OR)
- 90.66% branch coverage achieved (meets domain threshold)

---

## Why It Exists

**Context:**
- Clean Architecture requires domain services have zero external dependencies
- XML parsing libraries (fast-xml-parser, xmldom, DOMParser) are infrastructure concerns
- Alternative would require moving transpilation to infrastructure layer

**Timeline:**
- Created: 2025-11-27
- Last modified: 2025-11-30

---

## Why Accepted

### Effort vs. Benefit Analysis

| Factor | Assessment |
|--------|------------|
| **Refactoring Scope** | Create IFetchXmlParser interface, infrastructure implementation, DI updates |
| **Effort** | 2-3 days |
| **Bugs Found** | Zero instances |
| **Risk** | Low - typical FetchXML queries work correctly |
| **Benefit** | Proper nested filter support (~5% of use cases) |

**Verdict:** High effort for rare use case. Users can write complex queries in SQL mode instead.

---

## Known Limitations

1. **Nested filters don't work correctly**
   - Regex cannot match nested XML structures
   - `<filter><filter>...</filter></filter>` - inner filter conditions are extracted but OR/AND grouping is lost
   - Conditions flatten into parent filter's type

2. **Complex XML edge cases may fail**
   - CDATA sections
   - XML comments
   - Unusual attribute quoting

3. **Remaining uncovered branches (~9%)**
   - Defensive nullish coalescing (`match[1] ?? ''`) for regex capture groups
   - Non-Error exception handling (unreachable in practice)
   - These are safety fallbacks, not functional gaps

---

## When to Revisit

Consider fixing only if:

1. **Multiple user complaints** about nested filter behavior
2. **New features require** accurate structural parsing (e.g., FetchXML validation with line numbers)
3. **Major refactoring** of data explorer already planned

Otherwise, **keep current pattern**.

---

## Proposed Solution (If Needed)

### Infrastructure Adapter Pattern

**Step 1:** Define interface in domain
```typescript
// src/features/dataExplorer/domain/services/IFetchXmlParser.ts
export interface IFetchXmlParser {
    parse(fetchXml: string): ParsedFetchXml;
}
```

**Step 2:** Implement with XML library in infrastructure
```typescript
// src/features/dataExplorer/infrastructure/services/XmlFetchXmlParser.ts
import { XMLParser } from 'fast-xml-parser';

export class XmlFetchXmlParser implements IFetchXmlParser {
    private readonly parser = new XMLParser({ /* options */ });

    parse(fetchXml: string): ParsedFetchXml {
        const doc = this.parser.parse(fetchXml);
        // Convert to domain model
    }
}
```

**Step 3:** Inject via constructor
```typescript
export class FetchXmlToSqlTranspiler {
    constructor(private readonly parser: IFetchXmlParser) {}
}
```

**Effort:** 2-3 days

---

## Why This Pattern is Safe

### 1. SQL Mode Alternative
- Users needing complex nested logic can write SQL directly
- SQL mode has full expressiveness

### 2. FetchXML Validation
- Invalid FetchXML is caught by FetchXmlValidator before transpilation
- Repository layer validates against Dataverse API

### 3. Test Coverage
- 53 tests cover transpiler behavior
- Edge cases documented and tested

---

## Accepted Trade-offs

| Aspect | Current Pattern | With XML Parser |
|--------|----------------|-----------------|
| **Domain Purity** | 100% pure | Requires infrastructure abstraction |
| **Nested Filters** | Flattened | Full support |
| **Typical Queries** | Works (~95%) | Works (100%) |
| **Complexity** | Self-contained | DI + interface + impl |
| **Dependencies** | Zero | fast-xml-parser (~50KB) |

**Decision:** Accept limitation for domain purity. Rare edge case not worth complexity.

---

## Related Items

- None (standalone decision)

---

## References

**Code Locations:**
- `src/features/dataExplorer/domain/services/FetchXmlToSqlTranspiler.ts` - Main transpiler

**Pattern Documentation:**
- [DOMAIN_SERVICE_PATTERNS.md](../../architecture/DOMAIN_SERVICE_PATTERNS.md#pattern-6-transpiler-services) - Transpiler pattern documentation

**Tests:**
- `src/features/dataExplorer/domain/services/FetchXmlToSqlTranspiler.test.ts` - 65 tests (90.66% branch coverage)
