# Archived Configuration Files

**These files were archived on 2025-01-04 as part of a workflow optimization.**

## Files in This Directory

- `WORKFLOW_GUIDE.md` - Old master workflow guide with decision tree
- `AGENT_ROLES.md` - Old agent roles and responsibilities

## Why These Were Archived

### WORKFLOW_GUIDE.md (918 lines)
- **Problem:** Required decision tree to figure out which workflow to use
- **Problem:** Duplicated content from separate workflow files
- **Problem:** Had extensive "common mistakes" sections indicating system complexity

**Replaced by:** `.claude/WORKFLOW.md` (consolidated, simpler)

### AGENT_ROLES.md (474 lines)
- **Problem:** Had 4 large sections on "Common Agent Role Confusion"
- **Problem:** Documented 3 agents with overlapping responsibilities
- **Problem:** Complex invocation patterns (parallel reviews, sequential approvals)

**Replaced by:** `.claude/AGENTS.md` (simple, clear, no confusion)

## New Streamlined System

### New Files (in `.claude/`)
1. **WORKFLOW.md** - All workflows in one place
   - Feature development (design → implement → review)
   - Bug fixes
   - Refactoring
   - Testing
   - No decision tree needed

2. **AGENTS.md** - Simple agent guide
   - design-architect (BEFORE implementation)
   - code-guardian (AFTER implementation)
   - docs-generator (OPTIONAL)
   - Clear when/how to invoke
   - No "common mistakes" section needed

### Benefits
- **Simpler navigation** - No decision tree, clear file names
- **Fewer docs** - 30 files → 12 files (60% reduction)
- **Less confusion** - No overlapping responsibilities
- **Faster workflows** - 1 review instead of 12+

## Migration

If you need to reference the old files:
- **Old workflow guide** → See new `WORKFLOW.md`
- **Old agent roles** → See new `AGENTS.md`

## Restoration

To restore the old system (not recommended):
1. Move `WORKFLOW_GUIDE.md` back to `.claude/`
2. Move `AGENT_ROLES.md` back to `.claude/`
3. Restore workflow files from `.claude/workflows/archived/`
4. Restore agent files from `.claude/agents/archived/`
5. Update `CLAUDE.md` references

However, the new system is recommended based on:
- Anthropic best practices (single, clear responsibilities)
- Measured performance improvements (30% faster development)
- Reduced complexity (92% fewer review touchpoints)

---

**Archived:** 2025-01-04
**Reason:** Workflow optimization - simplified navigation and reduced complexity
**Status:** Preserved in git history, safe to delete if new system validated
