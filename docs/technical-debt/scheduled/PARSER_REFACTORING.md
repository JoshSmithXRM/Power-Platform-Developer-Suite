# FetchXML Parser Refactoring: Regex to Stack-Based Approach

**Category:** Scheduled
**Priority:** Medium
**Effort:** 6-8 hours
**Last Reviewed:** 2024-12-08

---

## Summary

The FetchXML parser (`FetchXmlParser.ts`) and transpiler (`FetchXmlToSqlTranspiler.ts`) use regex-based parsing which cannot correctly handle nested XML structures. This is a fundamental limitation of regular expressions - they cannot parse context-free grammars like nested XML.

**Decision: Refactor to stack-based parsing approach in a future release**

---

## Current State

The parser uses regex patterns like:
```typescript
/<filter([^>]*)>([\s\S]*?)<\/filter>/gi
```

This non-greedy pattern matches to the FIRST `</filter>` tag encountered, not the matching closing tag. For nested filters:

```xml
<filter type="and">
  <filter type="or">
    <condition attribute="status" operator="eq" value="1" />
  </filter>
</filter>
```

The regex matches from the first `<filter>` to the inner `</filter>`, extracting incorrect content. The `parseNestedFilters` method (lines 282-295) never executes because the regex fails to find nested structures.

**Affected files:**
- `src/features/dataExplorer/domain/services/FetchXmlParser.ts`
- `src/features/dataExplorer/domain/services/FetchXmlToSqlTranspiler.ts`

**Scope:**
- 2 files affected
- ~1,200 lines of code total
- Parser works correctly for single-level filters (most common case)
- Nested filters parse incorrectly (edge case, but valid FetchXML)

**Coverage Impact:**
- Files excluded from coverage thresholds in `jest.config.js`
- Tests exist and pass for single-level parsing
- Nested filter tests cannot achieve coverage due to regex limitation

---

## Why It Exists

**Context:**
- Initial implementation prioritized simplicity and zero dependencies
- Regex approach works for simple, flat XML structures
- FetchXML complexity (nested filters) wasn't fully anticipated
- Most real-world FetchXML uses single-level filters

**Timeline:**
- Created: Initial Data Explorer implementation
- Issue identified: 2024-12-08 during coverage improvement work

---

## Why Scheduled

This is a legitimate bug that affects functionality, not just a code quality issue:

1. **Real Bug**: Nested FetchXML filters don't parse correctly
2. **Limited Impact**: Most users use single-level filters
3. **Workaround Exists**: Users can flatten filter logic
4. **Effort Required**: Significant refactoring needed

### When to Address

**Triggers (OR condition):**
- User reports nested filter parsing issue
- Adding new FetchXML parsing features
- Next major Data Explorer enhancement cycle
- v0.4.0 or v0.5.0 release planning

**Timeline:** Post v0.3.0, within next 2-3 releases

---

## Proposed Solution

Replace regex-based parsing with a stack-based tokenizer approach.

### Why Stack-Based (Not External Library)

1. **Zero dependencies** - Aligns with project philosophy
2. **Full control** - Can optimize for FetchXML specifically
3. **Testable** - Easy to unit test each component
4. **Maintainable** - Clear, understandable code

### Step 1: Create XML Tokenizer

```typescript
type XmlToken =
  | { type: 'open-tag'; name: string; attributes: Map<string, string> }
  | { type: 'close-tag'; name: string }
  | { type: 'self-closing'; name: string; attributes: Map<string, string> }
  | { type: 'text'; content: string };

class XmlTokenizer {
  tokenize(xml: string): XmlToken[] {
    // Scan character by character
    // Emit tokens for each element
  }
}
```

### Step 2: Create Stack-Based Parser

```typescript
class FetchXmlStackParser {
  parse(tokens: XmlToken[]): VisualQuery {
    const stack: ParseContext[] = [];

    for (const token of tokens) {
      if (token.type === 'open-tag') {
        stack.push(this.createContext(token));
      } else if (token.type === 'close-tag') {
        const completed = stack.pop();
        this.attachToParent(stack, completed);
      }
      // Handle self-closing, text, etc.
    }

    return this.buildResult(stack);
  }
}
```

### Step 3: Migrate Existing Logic

- Move condition parsing logic to new parser
- Move attribute extraction to new parser
- Update FetchXmlToSqlTranspiler to use parsed structure
- Maintain backward compatibility for all existing tests

**Effort:** 6-8 hours

---

## Why This Pattern is Currently Safe

### 1. Limited Real-World Impact
- Most FetchXML uses single-level filters
- Power Platform's UI typically generates flat filters
- Complex nested queries are rare

### 2. Tests Cover Working Functionality
- 38 tests for FetchXmlParser (all passing)
- 108 tests for FetchXmlToSqlTranspiler (all passing)
- Single-level parsing thoroughly tested

### 3. Workaround Available
- Users can restructure queries to avoid deep nesting
- SQL transpilation works for supported cases

---

## Risks of Not Addressing

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| User hits nested filter bug | Medium | Low | Error message, documentation |
| Feature requests for nested filters | Low | Medium | Prioritize refactoring |
| Technical debt accumulation | Low | Low | Documented, tracked |

**Current risk level:** Low

---

## Alternative Solutions Considered

### Alternative 1: External XML Parser Library (e.g., fast-xml-parser)
- ✅ Battle-tested, handles all edge cases
- ✅ Minimal code to write
- ❌ Adds dependency
- ❌ Against project philosophy of minimal dependencies
- **Verdict:** Rejected - prefer zero-dependency approach

### Alternative 2: Browser DOMParser (for webview context)
- ✅ No dependency, built into browser
- ❌ Only works in webview, not Node.js
- ❌ Parser runs in domain layer (should be environment-agnostic)
- **Verdict:** Rejected - domain should not depend on browser APIs

### Alternative 3: Recursive Descent Parser
- ✅ Clean code structure
- ✅ Uses function call stack naturally
- ❌ Slightly more complex than stack-based for this use case
- **Verdict:** Considered - stack-based preferred for simplicity

---

## Related Items

- None (standalone technical debt item)

---

## References

**Code Locations:**
- `src/features/dataExplorer/domain/services/FetchXmlParser.ts:278-300` - parseNestedFilters method
- `src/features/dataExplorer/domain/services/FetchXmlParser.ts:145` - extractFilter regex
- `jest.config.js:18-21` - coverage exclusions

**Pattern Documentation:**
- CLEAN_ARCHITECTURE_GUIDE.md - domain layer should be framework-agnostic

**Tests:**
- `src/features/dataExplorer/domain/services/FetchXmlParser.test.ts` - 38 tests
- `src/features/dataExplorer/domain/services/FetchXmlToSqlTranspiler.test.ts` - 108 tests

**Discussions:**
- Technical debt review 2024-12-08: Identified during v0.3.0 coverage work
- Decision: Exclude from coverage, document, schedule for future release
