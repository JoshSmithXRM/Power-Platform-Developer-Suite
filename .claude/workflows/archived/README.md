# Archived Workflow Files

**These workflow files were archived on 2025-01-04 as part of a workflow consolidation.**

## Why These Were Archived

The original workflow system had 6 separate workflow files:
- `BUG_FIX_WORKFLOW.md`
- `COMPLIANCE_REVIEW_WORKFLOW.md`
- `DESIGN_WORKFLOW.md`
- `NEW_FEATURE_WORKFLOW.md`
- `REFACTORING_WORKFLOW.md`
- `VERTICAL_SLICING_GUIDE.md`

Plus a meta-guide:
- `WORKFLOW_GUIDE.md` - Decision tree to figure out which workflow to use

This led to:
- **Documentation fragmentation** - Users needed a map to navigate docs
- **Inconsistency** - Workflows had different formats and levels of detail
- **Cognitive overhead** - "Which workflow do I need?"

## New Consolidated System

All workflows were consolidated into a **single file** (in `.claude/`):

### `.claude/WORKFLOW.md`
Contains ALL workflows in one place:
1. **Feature Development Workflow** (design → implement → review)
   - Phase 1: Design (outside-in)
   - Phase 2: Implement (inside-out)
   - Phase 3: Review (once per feature)
   - Phase 4: Documentation (optional)

2. **Bug Fix Workflow** (write test → fix → commit)

3. **Refactoring Workflow** (test before → refactor → test after)

4. **Testing Workflow** (domain entities, use cases)

### Benefits
- **No decision tree needed** - Clear file name, clear structure
- **Consistency** - All workflows follow same format
- **Easier maintenance** - Update in one place
- **Simpler** - 30 files → 12 files (60% reduction)

## Key Changes from Old Workflows

### Feature Development
- **Old:** Review after each layer (12+ touchpoints)
- **New:** Review once after all layers (1 touchpoint)
- **Result:** 92% reduction in review overhead

### Design Approach
- **Old:** Inside-out only (domain → app → infra → presentation)
- **New:** Design outside-in (user perspective), implement inside-out (technical)
- **Result:** Better UX validation, same clean architecture

### Vertical Slicing
- **Old:** Separate guide (VERTICAL_SLICING_GUIDE.md)
- **New:** Integrated into feature workflow (iterative development pattern)
- **Result:** Clearer when/how to use vertical slicing

## Migration

If you need to reference the old workflows:
- Bug fix → See "Bug Fix Workflow" in new `WORKFLOW.md`
- Design → See "Phase 1: Design" in new `WORKFLOW.md`
- Feature dev → See "Feature Development Workflow" in new `WORKFLOW.md`
- Refactoring → See "Refactoring Workflow" in new `WORKFLOW.md`
- Vertical slicing → See "Pattern 1: Iterative Development" in new `WORKFLOW.md`

## Restoration

To restore the old system (not recommended):
1. Move files from `archived/` back to `.claude/workflows/`
2. Restore `.claude/WORKFLOW_GUIDE.md` from `.claude/archived/`
3. Update `CLAUDE.md` workflow references

However, the new consolidated system is recommended for:
- Simpler navigation (one file to rule them all)
- Consistency across workflows
- Easier updates and maintenance

---

**Archived:** 2025-01-04
**Reason:** Workflow consolidation - streamlined from 6 separate files to 1 comprehensive file
**Status:** Preserved in git history, safe to delete if new system validated
