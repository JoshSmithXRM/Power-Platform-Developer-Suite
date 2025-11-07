# Technical Debt Registry

**Purpose:** Track known technical debt items with impact assessment and refactoring plans.

---

## Template for Future Debt

**Status:** [Documented | In Progress | Resolved]

**Issue:** [Description of technical debt]

**Location:** [File paths or components affected]

**Impact:** [Low | Medium | High]
- **Maintenance cost:** [Description]
- **Bug risk:** [Description]
- **Size:** [Lines of code or scope]

**Why It Exists:** [Historical context]

**Proposed Solution:** [Brief description of fix]

**Refactoring Plan:** [Steps to resolve]

**Timeline:** [When to address this]

**Decision:** [Why we're keeping this debt for now]

**Mitigations:** [What we're doing to minimize impact]

---

## Guidelines for Adding Technical Debt

**When to document:**
- ✅ Code violates CLAUDE.md principles (e.g., Three Strikes Rule)
- ✅ Architect identifies architectural concerns during review
- ✅ Duplication reaches 3+ instances
- ✅ Known performance issues deferred for later optimization
- ✅ Temporary workarounds for external API limitations

**When NOT to document:**
- ❌ Simple refactoring opportunities (just do them)
- ❌ Minor code style improvements
- ❌ Personal preferences without architectural impact

**Required fields:**
- Status, Priority, Issue, Location, Impact, Proposed Solution
- Why It Exists (context for future developers)
- Decision (why we're deferring)

**Review cycle:**
- Review quarterly during maintenance windows
- Re-prioritize based on feature roadmap
- Close items after refactoring
