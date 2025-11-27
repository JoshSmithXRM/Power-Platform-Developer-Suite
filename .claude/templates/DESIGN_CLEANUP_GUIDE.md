# Design Document Cleanup Guide

**Purpose**: Keep design docs clean and maintainable by removing iteration artifacts after approval.

---

## When to Clean Up

**After final architecture approval:**
- Design status changes to "Approved"
- Feature is ready for implementation
- All critical findings have been addressed

---

## Cleanup Checklist

### Step 1: Consolidate Review Findings

**From:** `docs/design/reviews/[FEATURE]_*_REVIEW_[DATE].md`

**To:** Add summary in design doc under "Key Architectural Decisions"

Example:
```markdown
## Key Architectural Decisions

### Decision 1: Mapper Location
**Considered:** Application layer (code-guardian suggested)
**Chosen:** Presentation layer
**Rationale:** Mapper depends on presentation formatters. Moving to
  application would create app→pres dependency violation.
**Tradeoffs:** Mapper not reusable in other contexts, but maintains
  clean dependency direction.
```

### Step 2: Remove Versioned Files

**For features with iteration files (V1, V2, V3, V4):**

```bash
# Keep only the final approved version
# Example for Plugin Traces Phase 4:

# Rename final version (remove version number)
git mv docs/design/PLUGIN_TRACES_PHASE4_DESIGN_V4.md \
       docs/design/PLUGIN_TRACES_PHASE4_DESIGN.md

# Delete older versions
git rm docs/design/PLUGIN_TRACES_PHASE4_DESIGN_V2.md
git rm docs/design/PLUGIN_TRACES_PHASE4_DESIGN_V3.md

# Commit cleanup
git commit -m "docs: cleanup Plugin Traces Phase 4 design (post-approval)

- Renamed V4 to final (removed version number)
- Deleted V2, V3 (archived in git history)
- Consolidated review findings in design doc"
```

**Note:** If original file exists without version number, decide:
- Keep original if it's substantially different (different phase/scope)
- Replace original if V4 is the evolved version of the same design

### Step 3: Delete Review Files

```bash
# Delete architecture and type reviews
git rm docs/design/reviews/PLUGIN_TRACES_*_REVIEW_*.md

# Reviews are archived in git history if needed later
```

### Step 4: Update Design Doc

**Remove or minimize revision history:**

Before (during iteration):
```markdown
## Revision History

### V3 → V4
- Fixed mapper instantiation pattern
- Explained mapper location rationale

### V2 → V3
- Use cases return domain entities (not ViewModels)
- Panel builds TraceFilter domain entity

### V1 → V2
- Added type contracts section
```

After (post-approval):
```markdown
## Revision History

Final version approved [DATE]. See git history for detailed iteration.
```

### Step 5: Verify Clean State

- [ ] Only one design file per feature (no version numbers)
- [ ] Review files deleted from `docs/design/reviews/`
- [ ] Key decisions documented in design doc
- [ ] Status updated to "Approved" with date
- [ ] Git history preserves all iterations

---

## Why Clean Up?

**Benefits:**
- ✅ Less noise in repository
- ✅ Easier to find current/approved designs
- ✅ Reduced maintenance burden
- ✅ Clear signal: "This is the approved version"
- ✅ Git history preserves iteration if needed

**What we keep:**
- Final approved design (one file)
- Key architectural decisions (in design doc)
- Git history (full iteration record)

---

## Related Documentation

- `.claude/WORKFLOW.md` - Development workflows (Phase 9: Cleanup)
- `CLAUDE.md` - Project rules and patterns
- `docs/design/reviews/README.md` - Review directory purpose
