# Technical Debt Register

This document tracks known technical debt items that require attention. Items are prioritized by impact and documented with context for future resolution.

---

## Active Items

### TD-001: Regex-based FetchXML Parsing in Domain Layer

**Location:** `src/features/dataExplorer/domain/services/FetchXmlToSqlTranspiler.ts`

**Description:**
The FetchXmlToSqlTranspiler uses regex-based string parsing to convert FetchXML to SQL. This is a deliberate architectural choice to maintain domain layer purity (zero external dependencies), but has known limitations.

**Known Limitations:**
1. **Nested filters don't work correctly** - Regex cannot match nested XML structures; conditions in nested filters are flattened into the parent filter
2. **Complex XML edge cases may fail** - CDATA sections, XML comments, unusual attribute quoting might not parse correctly
3. **Limited structural validation** - Regex can check for patterns but not validate full XML structure

**Why This Choice:**
- Clean Architecture requires domain services have zero infrastructure dependencies
- Using an XML parser library (fast-xml-parser, xmldom) would violate domain layer purity
- Alternative would require moving transpilation to infrastructure layer, losing domain encapsulation

**Current Mitigation:**
- Removed broken nested filter code (was pretending to work but didn't)
- Added explicit documentation in code about limitations
- Added file-specific coverage exception in jest.config.js with explanation
- All conditions are extracted from any nesting level, just joined with parent's AND/OR

**When to Revisit:**
- If users need proper nested filter support (AND within OR, OR within AND)
- If parsing failures are reported for valid FetchXML
- If FetchXML features require accurate structural parsing

**Resolution Options:**
1. **Infrastructure adapter pattern** - Create `IFetchXmlParser` interface in domain, implement with XML library in infrastructure
2. **State machine parser** - Build proper parser without external deps (significant effort)
3. **Accept limitation** - Document that complex nested filters should be written in SQL mode

**Added:** 2025-11-30
**Priority:** Low (current implementation handles ~95% of real-world use cases)
**Effort:** Medium (2-3 days for infrastructure adapter approach)

---

## Resolved Items

_No resolved items yet._

---

## Guidelines

### When to Add Items
- Architecture decisions with known trade-offs
- Workarounds that need proper solutions
- Code that works but could be better
- Patterns that don't follow project standards

### When to Resolve Items
- When the item is properly fixed
- When a decision is made to not fix (document why)
- When the context changes and it's no longer relevant

### Priority Levels
- **Critical**: Affects correctness or security
- **High**: Causes significant developer friction
- **Medium**: Should be addressed when working in area
- **Low**: Nice to have, fix if convenient
