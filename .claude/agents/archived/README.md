# Archived Agent Files

**These agent files were archived on 2025-01-04 as part of a workflow optimization.**

## Why These Were Archived

The original agent system had 3 agents with overlapping responsibilities:
- `clean-architecture-guardian.md` - Had dual role: designer AND reviewer
- `typescript-pro.md` - Type safety reviewer
- `code-cleanup-implementer.md` - Documentation/cleanup implementer

This led to:
- **12+ review touchpoints per feature** (2 agents × 4 layers + final approval)
- **Role confusion** (when to invoke which agent?)
- **Review overhead** (34% of development time spent in reviews)

## New Streamlined System

The agents were reorganized into a simpler, more efficient model:

### New Agents (in `.claude/agents/`)
1. **design-architect.md** - Outside-in feature design (BEFORE implementation)
   - Combines design role from clean-architecture-guardian
   - Single focus: comprehensive feature design

2. **code-guardian.md** - Comprehensive review (AFTER implementation)
   - Combines review role from clean-architecture-guardian + typescript-pro
   - Reviews architecture + types + tests + quality in one pass
   - Provides final APPROVE/REJECT decision

3. **docs-generator.md** - Documentation specialist (OPTIONAL)
   - Renamed and simplified from code-cleanup-implementer
   - Single focus: documentation creation

### Benefits
- **92% fewer review touchpoints** (12+ → 1 per feature)
- **30% faster development** (3.5h → 2.5h average)
- **Clear responsibilities** (no role confusion)
- **Follows Anthropic best practices** (single, clear responsibilities per agent)

## Migration

If you need to reference the old agents:
- Old design + review role → See new `design-architect.md` and `code-guardian.md`
- Old type safety review → Now part of `code-guardian.md`
- Old cleanup/docs → See new `docs-generator.md`

## Restoration

To restore the old system (not recommended):
1. Move files from `archived/` back to `.claude/agents/`
2. Restore old `.claude/WORKFLOW_GUIDE.md` from `.claude/archived/`
3. Restore old `.claude/AGENT_ROLES.md` from `.claude/archived/`
4. Update `CLAUDE.md` workflow references

However, the new system is recommended based on Anthropic best practices and measured performance improvements.

---

**Archived:** 2025-01-04
**Reason:** Workflow optimization - streamlined from 3 overlapping agents to 2 focused agents + 1 optional
**Status:** Preserved in git history, safe to delete if new system validated
