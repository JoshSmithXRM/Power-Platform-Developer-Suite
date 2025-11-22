# Review Technical Debt Command

**Purpose:** Audit all documented technical debt items to verify they're still relevant and clean up resolved/outdated issues

**Frequency:** Quarterly or before major releases

**Invocation:** `/review-technical-debt`

---

## Command Execution Process

### Phase 1: Discovery & Analysis

**1. Read current technical debt documentation:**
```bash
Read docs/TECHNICAL_DEBT.md
```

**2. Extract all technical debt items:**
- Parse each issue section
- Extract file paths, line numbers, patterns to search for
- Create inventory of all items

**3. Verify each item still exists (PARALLEL):**

For each technical debt item, run verification in parallel:
- Grep for patterns mentioned
- Read files mentioned
- Check if code still matches description
- Check if issue was already fixed

**Examples of parallel verification:**
```bash
# If debt item mentions "Cross-Feature DTO Coupling"
Grep for "EnvironmentConnectionDto" in VsCodeStorageReader.ts

# If debt item mentions "getValue() Pattern"
Glob for "**/domain/valueObjects/*.ts"
Grep for "getValue(): string" pattern

# If debt item mentions "Business Logic in Command Handlers"
Read extension.ts lines 184-239
```

---

### Phase 2: Classification

**Classify each item into one of four categories:**

**✅ RESOLVED** - Issue no longer exists
- Code has been refactored
- File deleted
- Pattern no longer present
- **Action:** Remove from TECHNICAL_DEBT.md

**⚠️ OUTDATED** - Description no longer accurate
- Code changed but issue remains in different form
- File moved
- **Action:** Update description or remove if not worth updating

**📋 STILL VALID** - Issue still exists as described
- Keep in TECHNICAL_DEBT.md
- Update priority if needed
- **Action:** Keep, optionally update priority/context

**❓ NEEDS INVESTIGATION** - Can't determine from automated checks
- Requires manual review
- Complex architectural question
- **Action:** Flag for user review

---

### Phase 3: Cleanup & Reporting

**1. Update TECHNICAL_DEBT.md:**
- Remove RESOLVED items
- Remove OUTDATED items (or update if valuable)
- Keep STILL VALID items
- Add notes for NEEDS INVESTIGATION items

**2. Generate cleanup report:**

```markdown
# Technical Debt Review Report

**Date:** YYYY-MM-DD
**Items Reviewed:** {total}

## Summary

- ✅ Resolved: {count} items
- ⚠️ Outdated: {count} items
- 📋 Still Valid: {count} items
- ❓ Needs Investigation: {count} items

## Resolved Items (Removed)

1. **Cross-Feature DTO Coupling** - RESOLVED
   - Evidence: VsCodeStorageReader.ts no longer imports EnvironmentConnectionDto
   - Resolved by: Shared DTOs refactor

2. **getValue() Pattern** - RESOLVED
   - Evidence: Branded types implemented in Phase 1 refactor
   - Resolved by: Type safety improvements

## Still Valid Items (Kept)

1. **Business Logic in Command Handlers** - STILL VALID
   - Priority: Medium → High (updated)
   - Code still contains orchestration in extension.ts
   - Recommendation: Address in next sprint

## Needs Investigation

1. **DateTimeFilter Mixed Concerns** - NEEDS INVESTIGATION
   - Code exists but unsure if still violates separation
   - User review required

## Recommendations

- Fix "Business Logic in Command Handlers" (high priority)
- Investigate DateTimeFilter pattern
- No immediate action needed for remaining items
```

**3. Save report to:**
```
docs/technical-debt/TECHNICAL_DEBT_REVIEW_YYYY-MM-DD.md
```

**4. Update docs/TECHNICAL_DEBT.md:**
- Remove resolved items
- Update priorities
- Add review date note at top

---

## Parallel Execution Patterns

**ALWAYS run verifications in parallel when possible:**

**✅ GOOD - Parallel verification:**
```
Single message with multiple tool calls:
- Grep for pattern A in file X
- Grep for pattern B in file Y
- Read file Z to check implementation
- Glob for files matching pattern C
```

**❌ BAD - Sequential verification:**
```
Message 1: Grep for pattern A
Wait for result
Message 2: Grep for pattern B
Wait for result
(Wastes time - these are independent!)
```

**Rule:** Verify all debt items in parallel unless verification of item B depends on result of item A.

---

## Example Session

**User:** `/review-technical-debt`

**Claude:**
```
I'll review all technical debt items in TECHNICAL_DEBT.md.

Reading current technical debt documentation...
Found 6 items to verify.

Verifying all items in parallel...
[Runs 15+ tool calls in parallel - greps, globs, reads]

Analysis complete. Here's what I found:

✅ RESOLVED (2 items):
1. Cross-Feature DTO Coupling - Code refactored, imports removed
2. getValue() Pattern - Branded types implemented

⚠️ OUTDATED (1 item):
3. Unsafe Type Assertions - Description mentions old file structure

📋 STILL VALID (2 items):
4. Business Logic in Command Handlers - Still present in extension.ts
5. DateTimeFilter Mixed Concerns - Still violates separation

❓ NEEDS INVESTIGATION (1 item):
6. CLEAN_ARCHITECTURE_GUIDE.md Length - Need to measure current line count

I'll now update TECHNICAL_DEBT.md and generate a report...

[Updates TECHNICAL_DEBT.md]
[Creates review report]

Done! Technical debt cleaned up:
- Removed 2 resolved items
- Removed 1 outdated item
- Kept 2 valid items
- Flagged 1 for investigation

Review report saved to: docs/technical-debt/TECHNICAL_DEBT_REVIEW_2025-11-22.md
```

---

## Validation

**After updating TECHNICAL_DEBT.md:**

1. ✅ File compiles (no broken markdown)
2. ✅ All remaining items are still accurate
3. ✅ Review report generated with evidence
4. ✅ User can see what was cleaned up and why

---

## Best Practices

**DO:**
- ✅ Verify all items in parallel (maximize efficiency)
- ✅ Provide evidence for RESOLVED classification (grep results, file reads)
- ✅ Save review report with date (audit trail)
- ✅ Update priorities for still-valid items based on refactor progress

**DON'T:**
- ❌ Delete items without verification (must confirm resolved)
- ❌ Update line numbers manually (too brittle, just reference file/pattern)
- ❌ Keep outdated descriptions "just in case" (clutters context)
- ❌ Run verifications sequentially (wastes time)

---

## Related Commands

- `/fix-technical-debt` - Actually fix technical debt items
- `/comprehensive-review` - Full codebase review (finds NEW technical debt)
- `/cleanup-code` - Fix logging/comment violations

---

## Success Criteria

**Review is successful when:**

1. ✅ All technical debt items verified (parallel execution)
2. ✅ Resolved items removed from TECHNICAL_DEBT.md
3. ✅ Still-valid items kept with updated context
4. ✅ Review report generated with evidence
5. ✅ User understands what was cleaned up and what remains
6. ✅ TECHNICAL_DEBT.md is current and accurate

**Typical duration:** 5-10 minutes (with parallel execution)
