# System Improvements - Refactoring Guidance

**Date:** 2025-01-05
**Reason:** Optimize workflow for refactoring to existing patterns

---

## Problem Identified

During Environment Setup panel migration, `design-architect` was invoked for a **refactoring to an existing pattern** (PanelCoordinator). While the output was comprehensive and valuable, it was heavyweight for a "cookbook" refactoring.

**Symptoms:**
- 1,235 line design document for following existing pattern
- ~30 min overhead when "study reference + implement" would suffice
- Agent wasn't sure when to invoke vs skip design-architect

**Root Cause:**
- No explicit guidance in AGENTS.md about skipping design for pattern refactorings
- WORKFLOW.md didn't distinguish "refactoring" from "refactoring to existing pattern"
- Ambiguous prompts ("design process") triggered design-architect invocation

---

## Changes Made

### 1. Updated AGENTS.md

**Added section:** "IMPORTANT: Refactoring to Existing Patterns"

**Guidance:**
- ✅ Skip design-architect when pattern already documented
- ✅ Skip when reference implementation exists
- ✅ Skip when following a "cookbook"

**Instead:**
1. Study reference implementation
2. Map existing → new structure
3. Implement incrementally
4. Invoke code-guardian for final review

**Recommended prompt template:**
```
Refactor {ComponentName} to use {ExistingPattern} pattern.

Reference:
- Pattern guide: .claude/templates/{PATTERN_GUIDE}.md
- Working example: {ReferenceFile}.ts

This is a refactoring to an existing pattern - skip design phase.
Follow the refactoring workflow in .claude/WORKFLOW.md.
```

**Examples added:**
- ❌ Don't invoke for: "Port Environment Setup panel to universal panel pattern"
- ✅ Do invoke for: "Design a new universal panel pattern"

---

### 2. Updated WORKFLOW.md

**Added section:** "⚡ Special Case: Refactoring to Existing Pattern"

**Location:** Top of "Refactoring Workflow" section

**Content:**
- Clear distinction from standard refactoring
- 5-step streamlined process
- Explicit "Skip design-architect" step
- Examples of when this applies

**Key message:** "This is NOT standard refactoring - it's following an existing recipe."

---

## Expected Benefits

### For Future Refactorings

**Before (Environment Setup):**
```
User: "Let's begin the design process"
Agent: *invokes design-architect*
Output: 1,235 line design doc
Time: ~30 min overhead
```

**After (Persistence Inspector):**
```
User: "Refactor Persistence Inspector to universal pattern (skip design, follow SolutionsPanel.ts)"
Agent: *studies SolutionsPanel.ts*
Agent: *maps structure*
Agent: *implements incrementally*
Output: Working refactoring
Time: ~0 min overhead (straight to implementation)
```

**Efficiency gain:** ~30 min per pattern refactoring

### For Clarity

- ✅ Clear when to invoke design-architect vs not
- ✅ Explicit refactoring prompt template
- ✅ Reduced ambiguity in workflow selection
- ✅ Better agent decision-making

---

## Testing Plan

**Next refactoring:** Persistence Inspector panel

**Test prompt:**
```
Refactor Persistence Inspector panel to use PanelCoordinator pattern.

Reference:
- Pattern guide: .claude/templates/PANEL_DEVELOPMENT_GUIDE.md
- Working example: SolutionsPanel.ts

This is a refactoring to an existing pattern - skip design phase.
Follow the refactoring workflow in .claude/WORKFLOW.md.
```

**Expected outcome:**
- ❌ Should NOT invoke design-architect
- ✅ Should study SolutionsPanel.ts
- ✅ Should show structure mapping
- ✅ Should start implementation immediately
- ✅ Should invoke code-guardian at end

**Success criteria:**
- Zero design document generation
- Straight to implementation
- Working refactoring in <2 hours

---

## Documentation Value

**Note:** The Environment Setup design document generated is NOT wasted effort:

**Value as template:**
- ✅ Complete migration guide for ALL future panel ports
- ✅ Documents PanelCoordinator pattern comprehensively
- ✅ Shows message handler integration pattern
- ✅ Reference for Connection References, Environment Variables, etc.

**Keep as:** `docs/design/ENVIRONMENT_SETUP_PANEL_MIGRATION_DESIGN.md`

**Use for:** Future panel migrations (documentation reference, not process to repeat)

---

## Files Changed

1. `.claude/AGENTS.md`
   - Added "IMPORTANT: Refactoring to Existing Patterns" section
   - Added prompt template
   - Added examples

2. `.claude/WORKFLOW.md`
   - Added "⚡ Special Case: Refactoring to Existing Pattern" section
   - 5-step streamlined process
   - Explicit "skip design-architect" guidance

3. `.claude/SYSTEM_IMPROVEMENTS.md` (this file)
   - Documents the improvement
   - Testing plan for validation

---

## Lessons Learned

### What Worked
- design-architect output quality was excellent
- Comprehensive documentation has value as template
- Agent followed explicit instructions ("design process")

### What Improved
- Now have explicit guidance for refactorings
- Clear prompt templates reduce ambiguity
- Workflow selection more obvious

### System Evolution
- Iterating based on real usage ✅
- Data-driven optimization ✅
- Preserving what works, improving what doesn't ✅

---

## Related Documentation

- [AGENTS.md](.claude/AGENTS.md) - Agent invocation guide
- [WORKFLOW.md](.claude/WORKFLOW.md) - All workflows
- [ENVIRONMENT_SETUP_PANEL_MIGRATION_DESIGN.md](../docs/design/ENVIRONMENT_SETUP_PANEL_MIGRATION_DESIGN.md) - Template for future migrations

---

**Status:** Implemented, awaiting validation with Persistence Inspector refactoring
