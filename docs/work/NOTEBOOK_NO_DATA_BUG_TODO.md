# Notebook "No Data" Race Condition - Bug Investigation

**Branch:** `fix/notebook-no-data-race-condition`
**Created:** 2025-12-09
**Status:** Investigation (NOT FIXED)

---

## Bug Report

**Reported Symptom:**
- User runs identical SQL query in Data Explorer panel → Works correctly, shows data
- User runs same query in Notebook panel → Shows "no data" in table cells
- Reloading VS Code window fixes the issue temporarily

**Customer Query (for reference - do not hardcode):**
```sql
SELECT TOP 20
  et_salesappointmentsid,
  et_activitynumber,
  et_mobilestatus,
  et_salesrepownerid,
  et_salesrepowneridname,
  createdon,
  createdby,
  createdbyname
FROM et_salesappointments
```

**Key Observation:** This appears to be a race condition, NOT a logic bug. Reloading the window resets state and temporarily fixes the issue.

---

## Investigation Status

### Completed Analysis

- [x] Reviewed `QueryResultViewModelMapper.ts` - Mapper logic appears correct
- [x] Reviewed `DataverseNotebookController.ts` - Rendering logic appears correct
- [x] Compared Data Explorer vs Notebook rendering paths
- [x] Analyzed column/row key matching logic
- [x] Verified lookup/name column expansion logic

### Findings

1. **All unit tests pass** - The mapper and rendering logic is correct
2. **No shared mutable state** - Data Explorer and Notebook have separate mapper instances
3. **Race condition suspected** - "Works after reload" strongly suggests timing/state issue
4. **Root cause NOT identified** - Need more runtime data to isolate

### Possible Root Causes (Hypotheses)

1. **Environment state not loaded** - `selectedEnvironmentUrl` might be undefined during render
2. **Stale notebook controller state** - Controller persists across sessions, might hold corrupt state
3. **Async initialization timing** - Some component not ready when render executes
4. **Dataverse response case sensitivity** - Column keys might have different casing in some responses

---

## Changes Made (Investigation Only)

### Tests Added

1. **`QueryResultViewModelMapper.columnTypes.test.ts`**
   - Added "Explicit name column queries - Notebook regression" test section
   - 3 new tests for customer query pattern scenarios

2. **`DataverseNotebookController.integration.test.ts`** (NEW FILE)
   - End-to-end integration tests
   - 5 tests covering column/row key alignment

### Debug Logging Added

**File:** `DataverseNotebookController.ts`

Added diagnostic logging that will capture:
- Row count, column count, column names
- First row keys (to compare against column names)
- Environment URL status
- **Automatic detection** of column/row key mismatch (logs as ERROR)

**How to use:** When bug occurs, check Output panel → "Power Platform Developer Suite" for:
- `Notebook cell query completed` - Shows mapping details
- `REGRESSION BUG: Column/row key mismatch detected` - Identifies exact mismatch

---

## Next Steps

- [ ] Reproduce the bug again
- [ ] Capture debug logs when bug occurs
- [ ] Analyze logs to identify column/row key mismatch
- [ ] Identify root cause from log data
- [ ] Implement fix
- [ ] Write regression test that catches the specific failure
- [ ] Verify fix with manual testing

---

## Files Modified

| File | Change Type | Purpose |
|------|-------------|---------|
| `src/features/dataExplorer/application/mappers/QueryResultViewModelMapper.columnTypes.test.ts` | Modified | Added regression tests |
| `src/features/dataExplorer/notebooks/DataverseNotebookController.ts` | Modified | Added debug logging |
| `src/features/dataExplorer/notebooks/DataverseNotebookController.integration.test.ts` | New | Integration tests |

---

## Session Notes

### Session 1 (2025-12-09)

**What was done:**
- Investigated the bug report thoroughly
- Traced through mapper and rendering code paths
- Compared Data Explorer vs Notebook implementations
- Concluded this is a race condition, not a logic bug
- Added debug logging to capture diagnostic data when bug recurs
- Created regression tests to verify mapper logic is correct

**Handoff context:**
- Bug is NOT fixed - investigation only
- Debug logging is in place to help identify root cause
- When bug recurs, check Output panel for diagnostic logs
- Tests pass, so the issue is runtime state-related

**Blocked on:**
- Need to reproduce the bug to capture diagnostic logs
- Once logs are captured, root cause can be identified
