# Notebook Bug Fixes

**Branch:** `fix/notebook-no-data-race-condition`
**Created:** 2025-12-09
**Status:** Multiple bugs in progress

---

## Bug Report

### Original Symptom (Misleading)
- User runs query in Notebook → Shows "no data" in table cells
- Reloading VS Code window fixes the issue temporarily

### Actual Symptom (After Repro)
- **Query 1** runs in Cell 1 → Shows correct data initially
- **Query 2** runs in Cell 2 → Cell 2 shows headers only, NO DATA
- **Query 2's DATA appears in Cell 1's output!** (overwrites Cell 1's results)

### Reproduction Steps
1. Open a `.ppdsnb` notebook with 2 cells
2. Run Query 1 in Cell 1 (any FetchXML query) → Works correctly
3. Run Query 2 in Cell 2 (different FetchXML query) → Cell 2 shows headers but no rows
4. Observe: Cell 1 now shows Query 2's data!
5. Reload window → Running only Query 2 works correctly

---

## Root Cause: DUPLICATE ELEMENT IDs

### The Bug
`DataverseNotebookController.renderResultsHtml()` generates HTML with **hardcoded element IDs**:
- `id="scrollContainer"` (line 555)
- `id="tableBody"` (line 560)

When multiple cells have outputs, the DOM contains **multiple elements with the same ID**.

### Why This Causes Cross-Cell Data Corruption

```
DOM after Cell 1 and Cell 2 render:

Cell 1 Output:
  <div id="scrollContainer">  ← FIRST in DOM
    <tbody id="tableBody">Cell 1 data</tbody>
  </div>
  <script>/* Cell 1's script - already ran, populated correctly */</script>

Cell 2 Output:
  <div id="scrollContainer">  ← SECOND in DOM, SAME ID!
    <tbody id="tableBody">EMPTY - never populated!</tbody>
  </div>
  <script>
    // Cell 2's script runs:
    const container = document.getElementById('scrollContainer');
    // ↑ Returns Cell 1's container (first match in DOM)!

    const tbody = document.getElementById('tableBody');
    // ↑ Returns Cell 1's tbody!

    tbody.innerHTML = /* Cell 2's data */;
    // ↑ Overwrites Cell 1's data with Cell 2's data!
  </script>
```

**Result:**
- Cell 1: Shows Cell 2's data (overwritten by Cell 2's script)
- Cell 2: Shows headers only (its tbody was never populated)

---

## The Fix

Generate **unique element IDs per cell** using a random suffix or cell-specific identifier:

```typescript
// Before (BUG):
<div id="scrollContainer">
<tbody id="tableBody">

// After (FIX):
const uniqueId = crypto.randomUUID().substring(0, 8);
<div id="scrollContainer_${uniqueId}">
<tbody id="tableBody_${uniqueId}">
```

### Files to Modify
1. `DataverseNotebookController.ts` - `renderResultsHtml()` method
   - Generate unique ID suffix
   - Pass unique IDs to HTML template
   - Pass unique IDs to `getVirtualScrollScript()`

---

## Regression Tests Added

**File:** `DataverseNotebookController.integration.test.ts`

| Test | Purpose |
|------|---------|
| `should use UNIQUE element IDs for each cell output` | Documents current buggy state (IDs are same) |
| `should generate script that targets cell-specific element IDs` | Verifies script uses passed IDs |
| `demonstrates how duplicate IDs cause cross-cell data corruption` | Simulates getElementById behavior |

**Test Strategy:**
- Tests currently PASS by documenting buggy behavior
- After fix, update assertions to verify IDs are UNIQUE

---

## Implementation Checklist

- [x] Identify root cause
- [x] Write regression tests documenting bug
- [ ] Implement fix (unique IDs per cell)
- [ ] Update tests to verify unique IDs
- [ ] Manual testing with multi-cell notebook
- [ ] Commit and create PR

---

## Files Modified

| File | Change Type | Purpose |
|------|-------------|---------|
| `QueryResultViewModelMapper.columnTypes.test.ts` | Modified | Added initial regression tests (mapper logic) |
| `DataverseNotebookController.ts` | Modified | Added debug logging |
| `DataverseNotebookController.integration.test.ts` | Modified | Added duplicate ID regression tests |

---

## Session Notes

### Session 1 (2025-12-09) - Initial Investigation

- Investigated original "no data" report
- Added debug logging and mapper tests
- Concluded it was a race condition (partially correct)

### Session 2 (2025-12-09) - Root Cause Found

- User reproduced bug with clearer symptoms
- Identified that Query 2's data appears in Query 1's cell
- Traced to duplicate element IDs in rendered HTML
- `document.getElementById()` returns first match in DOM
- Cell 2's script targets Cell 1's elements by mistake
- Wrote regression tests documenting the bug
- **Ready to implement fix**

---

## Additional Issues Discovered

### Issue 2: Aggregate Query Adds Spurious `countname` Column

**Symptom:** Running an aggregate query like:
```xml
<fetch aggregate="true">
  <entity name="et_salesopportunity">
    <attribute name="et_salesopportunityid" alias="count" aggregate="count" />
  </entity>
</fetch>
```

Results in headers: `count    countname` (spurious `countname` column added)

**Root Cause:** In `DataverseDataExplorerQueryRepository.inferDataType()`:
```typescript
if (formattedKey in record) {
    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return 'optionset';  // <-- BUG: Aggregate COUNT is an integer!
        }
        return 'money';
    }
}
```

Aggregate results have `FormattedValue` annotations (e.g., `count@OData.Community.Display.V1.FormattedValue`).
The code incorrectly identifies integer aggregates as `optionset`, triggering virtual column expansion.

**Fix:** Add check for aggregate queries or improve data type inference to distinguish optionsets from aggregates.

**Status:** Bug confirmed, fix pending.

---

### Issue 3: Virtual Column (`createdbyname`) Returns Null When Queried Alone

**Symptom:**
- `SELECT createdbyname FROM account` → Returns null
- `SELECT createdby, createdbyname FROM account` → Both populated

**Question:** Is this Dataverse API behavior or a bug in our code?

**Investigation:** Added debug command `power-platform-dev-suite.debugVirtualColumn` to test raw API response.

**How to test:**
1. Press `Ctrl+Shift+P`
2. Run "Power Platform: Debug Virtual Column"
3. Select environment
4. Check Output panel for raw API responses

**Status:** Awaiting API test results to determine if this is Dataverse behavior or our bug.

---

## Implementation Checklist (Updated)

### Bug 1: Duplicate Element IDs - FIXED ✓
- [x] Identify root cause
- [x] Write regression tests documenting bug
- [x] Implement fix (unique IDs per cell)
- [x] Update tests to verify unique IDs
- [x] Manual testing with multi-cell notebook

### Bug 2: Aggregate `countname` Column - FIXED ✓
- [x] Identify root cause (inferDataType returns 'optionset' for integer aggregates)
- [x] Write regression tests (3 tests added)
- [x] Fix data type inference for aggregates
- [ ] Manual testing

**Fix:** Added `isNumericFormattedValue()` helper in `DataverseDataExplorerQueryRepository.ts`.
Integer values with FormattedValue that parses as a number are now identified as `'number'` type,
not `'optionset'`. This prevents spurious `{column}name` virtual columns for aggregates.

**Tests added:**
1. `should NOT create spurious name columns for aggregate COUNT results`
2. `should NOT create spurious name columns for aggregate SUM results`
3. `should handle aggregate COUNT with large numbers and locale formatting`

### Bug 3: Single Column Text Alignment - FIXED ✓
**Symptom:** When query returns only 1 column, cell text is right-aligned but header is left-aligned.

**Root Cause:** `.data-cell` CSS class was missing `text-align: left;` property.
Header cells had `text-align: left;` but data cells relied on browser default alignment.

**Fix:** Added `text-align: left;` to `.data-cell` class in `DataverseNotebookController.ts:668`.

- [x] Identify root cause
- [x] Fix CSS alignment
- [ ] Manual testing

### Issue 4: Virtual Column Behavior - DOCUMENTED (NOT A BUG) ✓
- [x] Add debug command for API testing
- [x] Register debug command in package.json (now visible in command palette when in dev mode)
- [x] Run debug command to capture raw API response
- [x] Determine if Dataverse behavior or our bug → **Dataverse behavior**

**Findings from API tests (2025-12-09):**

| Query | Dataverse Returns |
|-------|-------------------|
| `SELECT createdbyname` | Only `accountid` (ignores virtual column) |
| `SELECT createdby, createdbyname` | `_createdby_value` + FormattedValue annotation (ignores createdbyname) |
| `SELECT createdby` | `_createdby_value` + FormattedValue annotation (name in annotation) |

**Conclusion:** `createdbyname` and similar virtual columns are NOT queryable via FetchXML.
Dataverse ignores them and returns the lookup value with the name in the `FormattedValue` annotation.
Our code correctly handles this by extracting names from annotations.

**No fix needed** - this is expected Dataverse behavior.

---

## Issue 5: Virtual Fields in IntelliSense and Data Explorer

### Problem Statement
Virtual fields (like `createdbyname`, `statuscodename`) should not appear in:
- IntelliSense SELECT suggestions (they return empty)
- Data Explorer columns panel (can't be selected)

But they SHOULD appear in:
- IntelliSense WHERE suggestions (filtering works!)
- IntelliSense ORDER BY - **Hide** (redundant - sorts same as real field)

### Key Findings from Testing

| Operation | Virtual Field | Real Field | Notes |
|-----------|--------------|------------|-------|
| SELECT | Returns empty | Works | Virtual not retrievable |
| WHERE | Works (filters by label) | Works (filters by value) | Both valid, different comparison |
| ORDER BY | Sorts by label | Also sorts by label! | Identical behavior - virtual redundant |

### Metadata Discovery

Dataverse metadata includes fields we're NOT capturing:

| Missing Field | Purpose |
|---------------|---------|
| `AttributeOf` | Parent attribute (e.g., `createdbyname` → `createdby`) |
| `IsLogical` | Whether it's a logical/computed attribute |
| `SourceType` | 0=simple, 1=calculated, 2=rollup |
| `LinkedAttributeId` | For linked attributes |
| Many others... | Full audit needed |

### Root Cause
Our Metadata Browser DTOs and domain entities are **incomplete**. The Web API returns these fields but we're not capturing them.

---

## REVISED PLAN: Full Metadata Audit

### Phase 1: Complete Metadata Capture (NEW SESSION)
**Goal:** Capture ALL attribute metadata fields from Dataverse Web API

1. **Audit current DTOs** - Document what we have vs what API returns
2. **Add ALL missing fields** to `AttributeMetadataDto`
3. **Update domain entity** `AttributeMetadata` with new fields
4. **Update mappers** to propagate all fields
5. **Update serializer** for detail panel display
6. **Test** - Verify all fields appear in Metadata Browser raw view

### Phase 2: Use Metadata for Filtering
**Goal:** Filter virtual fields properly using `AttributeOf` field

1. **IntelliSense** - Context-aware filtering:
   - SELECT: Hide fields where `AttributeOf` is set (virtual)
   - WHERE: Show all fields (virtual filtering works)
   - ORDER BY: Hide fields where `AttributeOf` is set (redundant)
2. **Data Explorer columns panel** - Hide virtual fields
3. **No changes to Metadata Browser** - Keep showing everything

### Decision Made
- Context-aware IntelliSense: **YES**
- Use `AttributeOf` for filtering: **YES** (not pattern matching)
- Metadata Browser changes: **NO** (keep as pure data tool)

---

## Session 3 Summary (2025-12-09)

### Completed
- [x] Bug 2: Aggregate countname - FIXED with tests
- [x] Bug 3: Single column alignment - FIXED
- [x] Issue 4: Virtual column investigation - Documented as Dataverse behavior
- [x] Removed temporary debug command (investigation complete)

### Discovered
- Virtual fields work in WHERE but not SELECT
- ORDER BY on virtual field = same as real field (sorts by label)
- Our metadata is incomplete - missing `AttributeOf`, `IsLogical`, etc.

### Next Session
- Full metadata audit and completion
- Then implement virtual field filtering using proper metadata
