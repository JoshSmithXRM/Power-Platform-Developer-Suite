# Notebook Cell Output Cross-Contamination Bug

**Branch:** `fix/notebook-no-data-race-condition`
**Created:** 2025-12-09
**Status:** ROOT CAUSE IDENTIFIED - Ready to Fix

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
