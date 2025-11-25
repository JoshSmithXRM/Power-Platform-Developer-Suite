# Review Technical Debt Command

**Purpose:** Audit all documented technical debt items to verify they're still relevant and clean up resolved/outdated issues

**Frequency:** Quarterly or before major releases

**Invocation:** `/review-technical-debt`

---

## Command Execution Process

### Phase 1: Discovery & Analysis

**1. Read technical debt index:**
```bash
Read docs/technical-debt/README.md
```

**2. Read all debt item files:**
```bash
# Read all files in parallel from all categories
Read docs/technical-debt/accepted-tradeoffs/*.md
Read docs/technical-debt/will-not-implement/*.md
Read docs/technical-debt/scheduled/*.md
Read docs/technical-debt/low-priority/*.md
```

**3. Verify each item still exists (PARALLEL):**

For each technical debt item file, run verification in parallel:
- Grep for patterns mentioned in the file
- Read code files referenced
- Check if code still matches description
- Check if issue was already fixed

**Examples of parallel verification:**
```bash
# For cross-feature-dto-coupling.md
Grep for "EnvironmentConnectionDto" in VsCodeStorageReader.ts

# For getValue-pattern.md
Glob for "**/domain/valueObjects/*.ts"
Grep for "getValue\(\): (string|number)" pattern

# For clean-architecture-guide-length.md
Count lines in docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md
```

---

### Phase 2: Classification

**Classify each item into one of four categories:**

**✅ RESOLVED** - Issue no longer exists
- Code has been refactored
- File deleted
- Pattern no longer present
- **Action:** Delete the debt item file, update README.md

**⚠️ OUTDATED** - Description no longer accurate
- Code changed but issue remains in different form
- File moved
- **Action:** Update the item file OR delete if not worth updating

**📋 STILL VALID** - Issue still exists as described
- Keep the item file
- Update "Last Reviewed" date
- Update priority if needed
- **Action:** Update "Last Reviewed" date in file

**❌ RECLASSIFY** - Item moved to wrong category
- Accepted tradeoff should be Scheduled (trigger occurred)
- Scheduled should be Low Priority (trigger didn't happen)
- **Action:** Move file to correct category folder, update README.md

**❓ NEEDS INVESTIGATION** - Can't determine from automated checks
- Requires manual review
- Complex architectural question
- **Action:** Flag for user review

---

### Phase 3: Cleanup & Reporting

**1. Update individual debt item files:**
- Delete RESOLVED items (git rm)
- Update STILL VALID items (change "Last Reviewed" date)
- Move RECLASSIFIED items to correct folder
- Update OUTDATED items or delete them

**2. Update README.md index:**
- Remove rows for deleted items
- Update counts in Quick Summary table
- Update category tables
- Update health metrics if changed

**3. Generate cleanup report:**

```markdown
# Technical Debt Review Report

**Date:** YYYY-MM-DD
**Items Reviewed:** {total}

## Summary

- ✅ Resolved: {count} items (deleted files)
- ⚠️ Outdated: {count} items (updated or deleted)
- 📋 Still Valid: {count} items (kept, updated review date)
- ❌ Reclassified: {count} items (moved to different category)
- ❓ Needs Investigation: {count} items

## Resolved Items (Deleted)

1. **Cross-Feature DTO Coupling** - RESOLVED
   - Evidence: Shared DTOs created in src/shared/application/dtos/
   - Resolved by: Shared DTOs refactor
   - File deleted: docs/technical-debt/low-priority/cross-feature-dto-coupling.md

## Still Valid Items (Review Date Updated)

1. **getValue() Pattern** - STILL VALID
   - Still 100+ callsites, still 0 bugs
   - Decision remains: not justified
   - File: docs/technical-debt/accepted-tradeoffs/getValue-pattern.md
   - Updated "Last Reviewed" to 2025-11-22

## Reclassified Items (Moved)

1. **Clean Architecture Guide Length** - Scheduled → Low Priority
   - Trigger didn't occur (document still under 2,000 lines)
   - Moved from scheduled/ to low-priority/

## Needs Investigation

1. **DateTimeFilter Mixed Concerns** - NEEDS INVESTIGATION
   - Code exists but unsure if still violates separation
   - User review required

## Recommendations

- Delete resolved items (already done)
- Update README.md counts (done)
- No immediate action needed for remaining items
```

**4. Save report to:**
```
docs/technical-debt/TECHNICAL_DEBT_REVIEW_YYYY-MM-DD.md
```

**Note:** This report file is .gitignored (won't be committed)

---

## File Operations

### Deleting Resolved Items

```bash
# Delete the file
git rm docs/technical-debt/category/item-name.md

# Update README.md (remove row from table, update counts)
Edit docs/technical-debt/README.md
```

### Updating Still-Valid Items

```bash
# Update "Last Reviewed" date in file
Edit docs/technical-debt/category/item-name.md
# Change: **Last Reviewed:** 2025-XX-XX
```

### Moving Items Between Categories

```bash
# Example: Scheduled → Low Priority
git mv docs/technical-debt/scheduled/item.md docs/technical-debt/low-priority/

# Update README.md (move row to different table, update counts)
Edit docs/technical-debt/README.md
```

---

## Parallel Execution Patterns

**ALWAYS run verifications in parallel when possible:**

**✅ GOOD - Parallel verification:**
```
Single message with multiple tool calls:
- Read all 7 debt item files simultaneously
- Grep for pattern A in file X
- Grep for pattern B in file Y
- Count lines in architecture guide
- Check for imports in multiple files
```

**❌ BAD - Sequential verification:**
```
Message 1: Read first debt item file
Wait for result
Message 2: Read second debt item file
Wait for result
(Wastes time - these are independent!)
```

**Rule:** Verify all debt items in parallel unless verification of item B depends on result of item A.

---

## Example Session

**User:** `/review-technical-debt`

**Claude:**
```
I'll review all technical debt items in docs/technical-debt/.

Reading index and all debt item files...
Found 7 items across 4 categories:
- Accepted Tradeoffs: 3 items
- Will Not Implement: 1 item
- Scheduled: 2 items
- Low Priority: 1 item

Verifying all items in parallel...
[Runs 15+ tool calls in parallel - greps, globs, reads, counts]

Analysis complete. Here's what I found:

✅ RESOLVED (1 item):
1. Cross-Feature DTO Coupling - Shared DTOs created, file deleted

📋 STILL VALID (5 items):
2. getValue() Pattern - Still 100+ callsites, 0 bugs (kept)
3. Large Panel Files - Coordinator pattern still justified (kept)
4. Unsafe Type Assertions - Still safe with repository validation (kept)
5. XML Formatter Interface - Still correctly avoided (kept)
6. DateTime Filter Mixed Concerns - Still has format conversions (kept)

⚠️ UPDATED (1 item):
7. Clean Architecture Guide - Now 1,800 lines (was 1,708), priority remains Medium

I'll now update the files and README.md...

[Deletes resolved item file]
[Updates "Last Reviewed" dates in 6 files]
[Updates README.md index]

Done! Technical debt reviewed:
- Deleted 1 resolved item
- Updated 6 items with new review dates
- Updated README.md counts and health metrics

Technical Debt Health: 🟢 Excellent (6/6 items have zero bugs)
```

---

## Validation

**After review is complete:**

1. ✅ All debt item files have current "Last Reviewed" dates
2. ✅ README.md counts match actual file count
3. ✅ Resolved items deleted (both file and README entry)
4. ✅ Reclassified items in correct folder
5. ✅ Review report generated with evidence
6. ✅ User can see what was cleaned up and what remains

---

## Best Practices

**DO:**
- ✅ Verify all items in parallel (maximize efficiency)
- ✅ Provide evidence for RESOLVED classification (grep results, file reads)
- ✅ Update "Last Reviewed" date in all valid items
- ✅ Delete resolved item files (don't just update status)
- ✅ Move items between categories if triggers changed

**DON'T:**
- ❌ Delete items without verification (must confirm resolved)
- ❌ Keep outdated descriptions "just in case" (delete or update)
- ❌ Run verifications sequentially (wastes time)
- ❌ Forget to update README.md after file changes

---

## Related Commands

- `/fix-technical-debt` - Actually fix technical debt items
- `/comprehensive-review` - Full codebase review (finds NEW technical debt)
- `/cleanup-code` - Fix logging/comment violations

---

## Success Criteria

**Review is successful when:**

1. ✅ All technical debt items verified (parallel execution)
2. ✅ Resolved items deleted (file + README entry)
3. ✅ Still-valid items updated with new review dates
4. ✅ README.md counts accurate
5. ✅ Review report generated with evidence
6. ✅ User understands what was cleaned up and what remains
7. ✅ Technical debt inventory is current and accurate

**Typical duration:** 5-10 minutes (with parallel execution)
