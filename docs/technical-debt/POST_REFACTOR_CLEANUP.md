# Post-Refactor Documentation Cleanup

**Purpose:** Track documentation cleanup tasks to execute after 70-item refactor complete
**Created:** 2025-11-22
**Status:** Active tracking document
**Delete this file:** After all cleanup tasks complete

---

## Immediate Deletions Executed ✅

**Date:** 2025-11-22

- ✅ Deleted `TEMP/` folder (13 files, ~500KB) - Superseded by current docs
- ✅ Deleted `docs/analysis/HYBRID_RENDERING_DUPLICATION_ANALYSIS.md` - Outdated, references deleted files
- ✅ Deleted `.claude/SYSTEM_IMPROVEMENTS.md` - Incorporated into WORKFLOW.md and AGENTS.md

**Context saved:** ~1MB

---

## Pending Deletions (After Feature Complete)

**Delete these design documents immediately after their features are implemented, tested, and approved by code-guardian.**

### 1. DateTime Filter Architecture
**File:** `docs/design/DATETIME_FILTER_ARCHITECTURE.md` (910 lines)
**Delete when:**
- [ ] DateTimeFilter value object implemented
- [ ] Tests pass (domain: 100%, use cases: 90%+)
- [ ] Code-guardian approved
- [ ] Manual testing complete (F5)

**How to verify completion:**
```bash
# Check if DateTimeFilter exists
ls src/shared/domain/valueObjects/DateTimeFilter.ts
# Check if tests exist and pass
npm test -- DateTimeFilter
```

---

### 2. Filter Panel Improvements
**File:** `docs/design/FILTER_PANEL_IMPROVEMENTS_DESIGN.md` (982 lines)
**Prerequisites:** TypeScript behavior refactoring must be complete
**Delete when:**
- [ ] All 26 filter fields implemented
- [ ] Quick filters as toggle checkboxes implemented
- [ ] OData preview panel implemented
- [ ] Tests pass
- [ ] Code-guardian approved
- [ ] Manual testing complete (filter by depth, exception text, etc.)

**How to verify completion:**
```bash
# Check FilterField enum has 26 fields
grep -c "export enum FilterField" src/features/pluginTraceViewer/domain/valueObjects/FilterField.ts
# Check for OData preview section
grep "odata-preview" resources/webview/css/sections/filter-panel.css
```

---

### 3. Webview TypeScript Migration
**File:** `docs/design/WEBVIEW_TYPESCRIPT_MIGRATION_DESIGN.md` (1,531 lines)
**Timeline:** 4-week migration (per design doc)
**Delete when:**
- [ ] All webview behaviors migrated to TypeScript
- [ ] All renderers migrated to TypeScript
- [ ] All utilities migrated to TypeScript
- [ ] Old JavaScript files removed from `resources/webview/js/behaviors/`
- [ ] `npm run compile` passes with zero errors
- [ ] All panels tested and working
- [ ] Source maps working for debugging

**How to verify completion:**
```bash
# Check for remaining .js files in behaviors
ls resources/webview/js/behaviors/*.js 2>/dev/null || echo "All migrated"
# Check TypeScript compilation
npm run compile
```

---

### 4. Metadata Browser (Check if Feature Complete)
**Files to delete:**
- `docs/design/METADATA_BROWSER_PRESENTATION_DESIGN.md` (2,429 lines)
- `.claude/requirements/METADATA_BROWSER_REQUIREMENTS.md` (274 lines)
- `docs/design/METADATA_BROWSER_PRESENTATION_REQUIREMENTS.md` (584 lines)

**Decision needed:** Is Metadata Browser feature complete?
- [ ] Check IMPLEMENTATION_PLAN.md for Metadata Browser status
- [ ] If complete: Delete all 3 files
- [ ] If incomplete: Keep until complete, then delete

**How to verify completion:**
```bash
# Check if MetadataBrowserPanel exists and is registered
grep -r "MetadataBrowserPanel" src/features/metadataBrowser/presentation/panels/
# Check for tests
npm test -- MetadataBrowser
```

---

## Technical Debt Report Files (Evaluate Status)

**Location:** `docs/technical-debt/`

**Files:**
- `CLEANUP_CHECKLIST.md` (8KB)
- `DEAD_CODE_CLEANUP_REPORT.md` (17KB)
- `DEAD_CODE_SUMMARY.md` (4KB)
- `README.md` (5KB)
- `depcheck-full-report.json` (17KB)
- `madge-report.txt` (33KB)
- `ts-prune-report.txt` (9KB)

**Question:** Are these reports current or pre-refactor?

**Action to take:**
```bash
# Check file dates
ls -la docs/technical-debt/

# If all files dated before refactor start (2025-11-XX):
# Delete entire folder EXCEPT this file
cd docs/technical-debt
rm CLEANUP_CHECKLIST.md DEAD_CODE_CLEANUP_REPORT.md DEAD_CODE_SUMMARY.md README.md depcheck-full-report.json madge-report.txt ts-prune-report.txt

# Keep only POST_REFACTOR_CLEANUP.md (this file)
```

**Recommendation:** Generate reports on-demand, don't commit analysis artifacts to git.

---

## Post-Refactor Documentation Updates

### After Phase 1 Complete (Storage Refactor)
**When:** Items 1-8 complete (StorageEntry, StorageCollection patterns)

**Tasks:**
- [ ] Update `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
  - Add StorageEntry example (~1 page)
  - Add StorageCollection example (~1 page)
  - Reference actual production code (no toy examples)
- [ ] Update `CLAUDE.md`
  - Add storage pattern quick reference (5-10 lines)
  - Example: "Use StorageEntry for type-safe storage keys"
- [ ] Delete any temporary storage design docs (if created)

**How to verify Phase 1 complete:**
```bash
# Check IMPLEMENTATION_PLAN.md Phase 1 status
grep -A 20 "Phase 1:" .review/IMPLEMENTATION_PLAN.md
```

---

### After Phase 2 Complete (Filter Panel + Hybrid Rendering)
**When:** Items 1-20 complete

**Tasks:**
- [ ] DELETE: `docs/design/FILTER_PANEL_IMPROVEMENTS_DESIGN.md` (see Pending Deletions above)
- [ ] DELETE: `docs/design/DATETIME_FILTER_ARCHITECTURE.md` (see Pending Deletions above)
- [ ] Update `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
  - Add rendering pattern example (if not already present)
  - Maximum 1-2 pages
  - Reference actual production code
- [ ] Delete temporary rendering analysis docs (if any in `docs/technical-debt/`)

---

### After Webview TypeScript Migration Complete
**When:** All 4 slices complete (4-week timeline)

**Tasks:**
- [ ] DELETE: `docs/design/WEBVIEW_TYPESCRIPT_MIGRATION_DESIGN.md` (see Pending Deletions above)
- [ ] Update `CLAUDE.md`
  - Add webview TypeScript conventions section
  - Maximum 10-15 lines
  - Reference tsconfig.webview.json
- [ ] Update `docs/testing/TESTING_GUIDE.md`
  - Add webview TypeScript testing patterns (if not present)
  - Maximum 1 page
- [ ] Verify all old JavaScript files removed from `resources/webview/js/behaviors/`

---

### After Metadata Browser Complete
**When:** Feature implemented + tested + code-guardian approved

**Tasks:**
- [ ] DELETE: All 3 Metadata Browser design docs (see Pending Deletions above)
- [ ] **DO NOT** create replacement docs - tests document behavior

---

## Quarterly Maintenance (After Initial Cleanup)

**Schedule:** Every 3 months
**Tasks:**

1. **Search for expired design docs:**
   ```bash
   # Find design docs older than 2 weeks
   find docs/design -name "*.md" -mtime +14
   ```

2. **Generate fresh analysis reports:**
   ```bash
   # Dependency check
   npx depcheck --json > docs/technical-debt/depcheck-report.json

   # Unused exports
   npx ts-prune > docs/technical-debt/ts-prune-report.txt

   # Circular dependencies
   npx madge --circular --extensions ts src/ > docs/technical-debt/madge-report.txt
   ```

3. **Update TECHNICAL_DEBT.md:**
   - Review reports
   - Add new findings
   - Remove resolved items
   - Update priority levels

4. **Delete resolved technical debt items:**
   - Check TECHNICAL_DEBT.md
   - Verify items are resolved
   - Remove from document

5. **Delete this cleanup tracker:**
   - After all post-refactor tasks complete
   - After quarterly maintenance established

---

## Documentation Health Metrics

### Before Cleanup (2025-11-22)
- Total markdown files: 93
- Design documents: 7 active
- Outdated/duplicate: ~17 files (~1.2MB)
- Documentation debt: **High**

### After Immediate Deletions (2025-11-22)
- Files removed: 15
- Context saved: ~1MB
- Documentation debt: **Medium**

### Target State (After Full Refactor + Cleanup)
- Total markdown files: ~65-70
- Design documents: 0 (all deleted per 0-2 week policy)
- Outdated/duplicate: 0
- Documentation debt: **Low**

---

## Completion Checklist

When all tasks complete, verify:

- [ ] All pending deletions executed
- [ ] All documentation updates applied
- [ ] CLAUDE.md reflects current patterns
- [ ] CLEAN_ARCHITECTURE_GUIDE.md has real examples
- [ ] No design docs older than 2 weeks
- [ ] Technical debt reports are current
- [ ] `npm run compile` passes
- [ ] All tests pass
- [ ] This file deleted

**After completion:** Delete this file (`POST_REFACTOR_CLEANUP.md`)

---

## Quick Reference: What to Delete When

| Trigger | Files to Delete | Update Required |
|---------|----------------|-----------------|
| DateTimeFilter complete | `DATETIME_FILTER_ARCHITECTURE.md` | None (tests document behavior) |
| Filter panel complete | `FILTER_PANEL_IMPROVEMENTS_DESIGN.md` | None |
| Webview TS migration complete | `WEBVIEW_TYPESCRIPT_MIGRATION_DESIGN.md` | CLAUDE.md (conventions) |
| Metadata Browser complete | 3 design docs (see above) | None |
| Phase 1 refactor complete | Temporary storage docs (if any) | CLEAN_ARCHITECTURE_GUIDE.md (examples) |
| Phase 2 refactor complete | Filter + DateTime designs | CLEAN_ARCHITECTURE_GUIDE.md (rendering) |
| Quarterly audit | Expired designs, stale reports | TECHNICAL_DEBT.md |

---

**Remember:** Design documents have a **0-2 week lifespan**. Delete immediately after feature complete + tests pass + code-guardian approved.

**Tests are the documentation.** Architecture guides provide patterns, not implementations.
