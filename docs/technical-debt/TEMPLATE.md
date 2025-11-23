# [Item Name]

**Category:** Accepted Tradeoff / Will Not Implement / Scheduled / Low Priority
**Priority:** Low / Medium / High / N/A
**Effort:** [time estimate] (e.g., "15-20 min", "2-3 hours", "6-8 hours")
**Last Reviewed:** YYYY-MM-DD

---

## Summary

[One-paragraph summary of the technical debt item. What is the issue? What decision was made?]

**Decision: [Accept this pattern / Will not implement / Defer until X / Fix when Y]**

---

## Current State

[Describe current implementation. Include:]
- File locations
- Code examples (if relevant)
- Scope (how many files/lines affected)
- Current behavior

```typescript
// Code example if applicable
export class Example {
    // Show current implementation
}
```

**Affected files:**
- `path/to/file1.ts`
- `path/to/file2.ts`

**Scope:**
- X files affected
- Y lines of code
- Z callsites

---

## Why It Exists

[Historical context. Why was it implemented this way?]

**Context:**
- Initial approach was...
- Business requirement was...
- Technical constraint was...

**Timeline:**
- Created: YYYY-MM-DD
- Last modified: YYYY-MM-DD

---

## Why [Accepted / Not Implemented / Deferred]

[Explain the decision. Include cost/benefit analysis if applicable.]

### [For Accepted Tradeoffs] Effort vs. Benefit Analysis

| Factor | Assessment |
|--------|------------|
| **Refactoring Scope** | [e.g., "100+ callsites across 20+ files"] |
| **Effort** | [e.g., "6-8 hours"] |
| **Bugs Found** | [e.g., "Zero instances"] |
| **Risk** | [e.g., "Low - validation at repository layer"] |
| **Benefit** | [e.g., "Marginal compile-time safety improvement"] |

**Verdict:** [Conclusion based on analysis]

---

### [For Will Not Implement] Why This Is Unnecessary

1. **Reason 1**
   - Explanation

2. **Reason 2**
   - Explanation

3. **Reason 3**
   - Explanation

---

### [For Scheduled] When to Address

**Triggers (OR condition):**
- [Trigger 1 - e.g., "When document hits 2,000 lines"]
- [Trigger 2 - e.g., "Before adding more content"]
- [Trigger 3 - e.g., "Next documentation sprint"]

**Timeline:** [e.g., "Next 1-2 sprints", "When naturally touching code"]

---

### [For Low Priority] Fix When

[Describe the trigger condition for fixing]

**Triggers:**
- [Primary trigger - e.g., "When 3rd feature needs this data"]
- [Secondary trigger - e.g., "When DTO structure changes frequently"]

---

## [Optional] Proposed Solution

[If applicable, describe how to fix this when the time comes]

### Step 1: [Action]
```typescript
// Code example
```

### Step 2: [Action]
```typescript
// Code example
```

### Step 3: [Action]
```bash
# Commands to run
```

**Effort:** [time estimate]

---

## [Optional] Why This Pattern is Safe

[For accepted tradeoffs, explain why it's safe to keep]

### 1. [Safety Mechanism 1]
- Explanation
- Evidence

### 2. [Safety Mechanism 2]
- Explanation
- Evidence

### 3. [Safety Mechanism 3]
- Explanation
- Evidence

---

## [Optional] Accepted Trade-offs

[For accepted tradeoffs, summarize what we're accepting vs. what we'd gain]

| Aspect | Current Pattern | Alternative |
|--------|----------------|-------------|
| **Type Safety** | [e.g., "Runtime validation"] | [e.g., "Runtime + Compile"] |
| **Bugs Prevented** | [e.g., "Invalid values"] | [e.g., "Invalid values + type mixing"] |
| **Developer Velocity** | [e.g., "Fast"] | [e.g., "Slower"] |
| **Refactoring Cost** | [e.g., "Low"] | [e.g., "High"] |
| **Bugs Found** | [e.g., "0"] | [e.g., "0 (theoretical)"] |

**Decision:** [Conclusion]

---

## [Optional] When to Revisit

[Conditions that would make us reconsider this decision]

Consider [fixing / reconsidering] only if:

1. **[Condition 1]** - [e.g., "Multiple bugs found due to X"]
2. **[Condition 2]** - [e.g., "Major refactoring already planned"]
3. **[Condition 3]** - [e.g., "New domain model built from scratch"]

Otherwise, **[keep current pattern / will not implement / defer]**.

---

## [Optional] Risks of Not Addressing

[For scheduled/low-priority items, what are the risks?]

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **[Risk 1]** | [e.g., "Low"] | [e.g., "Medium"] | [e.g., "Tests catch breaking changes"] |
| **[Risk 2]** | [e.g., "Medium"] | [e.g., "Low"] | [e.g., "Documentation clarifies ownership"] |

**Current risk level:** [e.g., "Low", "Medium", "High"]

---

## [Optional] Alternative Solutions Considered

### Alternative 1: [Approach]
- ✅ Pros
- ❌ Cons
- **Verdict:** [Why rejected / accepted]

### Alternative 2: [Approach]
- ✅ Pros
- ❌ Cons
- **Verdict:** [Why rejected / accepted]

---

## Related Items

[Link to other technical debt items that are related]

- [Item 1](../category/item-name.md) - [relationship]
- [Item 2](../category/item-name.md) - [relationship]
- None (standalone decision)

---

## References

**Code Locations:**
- `path/to/file1.ts:123` - [description]
- `path/to/file2.ts:456` - [description]

**Pattern Documentation:**
- [Document name](../path/to/doc.md) - [relevance]
- CLEAN_ARCHITECTURE_GUIDE.md - [principle]

**Tests:**
- `path/to/test.test.ts` - [coverage]

**Discussions:**
- Technical debt review YYYY-MM-DD: [outcome]
- Code Guardian review: [suggestion and decision]

---

## Usage Instructions

1. **Copy this template** to appropriate category folder
2. **Rename file** to descriptive name (use kebab-case)
3. **Fill in all sections** (delete optional sections if not applicable)
4. **Update README.md** to include this item in the appropriate table
5. **Commit with message:** `docs: add [item name] to technical debt`

**Example file names:**
- `accepted-tradeoffs/feature-flag-cleanup.md`
- `scheduled/split-large-use-case.md`
- `low-priority/extract-shared-validator.md`

**Categories:**
- `accepted-tradeoffs/` - Keep indefinitely (conscious decisions, zero bugs, high cost)
- `will-not-implement/` - Rejected suggestions (over-engineering, unnecessary)
- `scheduled/` - Has clear trigger or timeline (1-2 sprints)
- `low-priority/` - Fix opportunistically (when naturally touching code)
