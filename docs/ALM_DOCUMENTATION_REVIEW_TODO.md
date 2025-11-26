# ALM & Documentation Review TODO

**Branch:** `docs/alm-documentation-review`
**Created:** 2025-01-26
**Status:** Planning

---

## Problem Statement

When implementing new features, Claude overlooks existing patterns and functionality, leading to:
- Wasted tokens rebuilding what already exists
- Pattern violations that require reverts
- Need for overly explicit instructions from user

**Goal:** Make Claude organically discover and respect existing patterns before implementing new code.

---

## End Goals (Success Criteria)

| Goal | Description | How to Measure |
|------|-------------|----------------|
| **Pattern Discovery** | Claude explores existing code before writing new code | Reduction in "had to revert and use existing pattern" situations; observe in next 3-5 feature implementations |
| **Doc Discoverability** | Claude finds relevant docs when needed; no redundant/conflicting docs | Manual test: give Claude a problem, see if it finds the right doc |
| **Minimal Effective Guidance** | Every instruction earns its place; no bloat diluting important rules | Track CLAUDE.md size vs. compliance rate; observe rule adherence |
| **Pipeline Reliability** | Automated quality gates catch issues before merge | GitHub Actions history; failed builds caught pre-merge |

---

## Evaluation Gates (All Proposals Must Pass)

Before accepting ANY change, it must pass these gates:

### Gate 1: Problem Evidence
- Is there a documented instance where this was a problem?
- Or is this theoretical/preventative?
- **Reject if:** No concrete example of the problem occurring

### Gate 2: Root Cause
- Does this address root cause or symptom?
- **Reject if:** Band-aid fix that doesn't solve underlying issue

### Gate 3: Claude Behavior Alignment
- Does this align with how Claude actually processes instructions?
- **Anthropic best practices:**
  - Instructions at the top of context are weighted more heavily
  - Specific examples are more effective than abstract rules
  - Shorter, focused guidance outperforms exhaustive lists
  - Repetition of critical rules helps retention
- **Reject if:** Works against Claude's natural behavior

### Gate 4: Maintenance Burden
- Will this need constant updating?
- Does it create documentation that can go stale?
- **Reject if:** Creates more maintenance than value

### Gate 5: Testability
- Can we verify this change has the intended effect?
- How will we know if it's working?
- **Reject if:** No way to validate effectiveness

---

## Review Process

| Phase | Description | Output |
|-------|-------------|--------|
| **1. Inventory** | Document what exists, note purpose of each item. No judgments yet. | Complete inventory list |
| **2. Gap Analysis** | Map each item to goals. Identify missing and redundant items. | Gap report |
| **3. Propose Changes** | Each suggestion includes: problem it solves (with example), which goal it serves, expected outcome, how to measure success. | Proposal list |
| **4. Evaluate Proposals** | Run each proposal through the 5 gates. User approves/declines. Document rationale. | Approved changes |
| **5. Implement & Validate** | Make approved changes. Test in real feature work. Iterate based on results. | Completed changes |

---

## Anthropic Best Practices (Reference)

1. **Front-load critical instructions** - Most important rules at top of CLAUDE.md
2. **Use examples over abstractions** - Show don't tell
3. **Keep context lean** - Claude performs better with focused vs. exhaustive guidance
4. **Explicit workflow triggers** - "Before implementing, ALWAYS..." is clearer than "consider exploring"
5. **Structured decision points** - Checklists Claude can follow mechanically

---

## Recommended Work Order

### 1. Claude Usage Improvements (RECOMMENDED FIRST)

**Rationale:** This directly addresses the core pain point. Improving Claude's discovery workflow will make all subsequent work more effective - including this very audit.

**Scope:**
- [ ] Review current `.claude/` structure and effectiveness
- [ ] Analyze CLAUDE.md for gaps in pattern discovery guidance
- [ ] Review/improve slash commands for pre-implementation discovery
- [ ] Consider adding a mandatory "explore existing patterns" step to workflows
- [ ] Evaluate if agents (design-architect, code-guardian) need pattern-awareness improvements
- [ ] Document existing patterns more explicitly so Claude can find them

### 2. Documentation Audit (SECOND)

**Rationale:** Once Claude workflows are improved, we ensure documentation supports those workflows effectively.

**Scope:**
- [ ] Inventory all documentation files (docs/, .claude/, root)
- [ ] Check for staleness (outdated information)
- [ ] Identify missing documentation
- [ ] Review cross-references and navigation
- [ ] Consolidate or remove redundant docs
- [ ] Ensure architecture patterns are discoverable
- [ ] Verify CLAUDE.md references are accurate

### 3. Pipeline Review (THIRD)

**Rationale:** Operational improvements after foundational docs/workflows are solid.

**Scope:**
- [ ] Audit GitHub Actions workflows
- [ ] Review release process automation
- [ ] Identify CI/CD gaps
- [ ] Check test automation coverage
- [ ] Review branch protection and merge requirements
- [ ] Document any missing pipeline documentation

---

## Approval Status

- [x] **Work order approved by user** (2025-01-26)
- [x] **Review framework approved by user** (2025-01-26)
- [ ] Phase 1: Inventory started
- [ ] Phase 1: Inventory complete
- [ ] Phase 2: Gap Analysis complete
- [ ] Phase 3: Proposals documented
- [ ] Phase 4: Proposals evaluated
- [ ] Phase 5: Implementation complete

---

## Inventory

*To be populated in Phase 1*

### .claude/ Directory
| File | Purpose | Notes |
|------|---------|-------|
| | | |

### docs/ Directory
| File | Purpose | Notes |
|------|---------|-------|
| | | |

### GitHub Actions
| Workflow | Purpose | Notes |
|----------|---------|-------|
| | | |

### Root Config Files
| File | Purpose | Notes |
|------|---------|-------|
| | | |

---

## Gap Analysis

*To be populated in Phase 2*

---

## Proposals

*To be populated in Phase 3*

| # | Problem | Proposal | Goal Served | Gates Passed | Status |
|---|---------|----------|-------------|--------------|--------|
| | | | | | |

---

## Decision Log

*Document approval/rejection decisions with rationale*

| Date | Proposal | Decision | Rationale |
|------|----------|----------|-----------|
| | | | |

---

## Notes

*Add notes and observations here as work progresses.*
