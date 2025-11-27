# Design Documents

**Technical designs for Power Platform Developer Suite features.**

---

## Active Designs

### Virtual Data Table Infrastructure

**Problem:** Current DataTableSection loads ALL records (70k+) into memory, causing browser freezes and memory issues.

**Solution:** Virtual scrolling with server-side pagination, client-side caching, and intelligent search fallback.

**Status:** Ready for Review | **Date:** 2025-11-27

**Documents:**
1. **[Quick Reference Card](./VIRTUAL_DATA_TABLE_QUICK_REF.md)** ⭐ START HERE (5-minute cheat sheet)
2. **[Executive Summary](./VIRTUAL_DATA_TABLE_SUMMARY.md)** (10-minute overview)
3. **[Architecture Diagrams](./VIRTUAL_DATA_TABLE_DIAGRAMS.md)** (visual data flows)
4. **[Full Technical Design](./VIRTUAL_DATA_TABLE_DESIGN.md)** (comprehensive spec)

**Key Stats:**
- **Performance:** 10x faster initial load (10s → 2s)
- **Memory:** 95% reduction (500MB → 25MB)
- **Implementation:** 6-8 hours total, ~30 min per panel migration
- **Complexity:** Complex (8 new files, 2 modified)

**Implementation Status:**
- ✅ Domain layer: CAN START NOW (not blocked)
- ❌ Application/Infrastructure: BLOCKED by `feature/configuration-settings`

---

## Design Document Lifecycle

### 1. Draft Phase
- Design created by `design-architect` agent
- Technical design template followed
- All 4 layers designed (outside-in approach)
- Type contracts defined upfront

### 2. Review Phase
- Human reviews design documents
- Approve or request changes
- Iterate until approved

### 3. Implementation Phase
- Implement in slices (inside-out: domain → app → infra → presentation)
- Commit per layer
- Tests written AFTER implementation, BEFORE review

### 4. Approval Phase
- Manual testing complete (F5, verify in Extension Development Host)
- `/code-review` - code-guardian approval
- CHANGELOG.md updated

### 5. Merge Phase
- PR created and merged
- Design docs archived or deleted

### 6. Cleanup Phase (After Merge)
- Extract reusable patterns → `docs/architecture/`
- Extract future ideas → `docs/future/`
- Delete design docs (preserved in git history)

---

## Design Document Templates

- **[TECHNICAL_DESIGN_TEMPLATE.md](../../.claude/templates/TECHNICAL_DESIGN_TEMPLATE.md)** - Standard template for feature designs
- **[PANEL_DEVELOPMENT_GUIDE.md](../../.claude/templates/PANEL_DEVELOPMENT_GUIDE.md)** - Panel-specific decision guide

---

## When to Create a Design Document

**CREATE DESIGN FOR:**
- ✅ Complex features (7+ files, touches multiple domains)
- ✅ New architectural patterns (first time implementing)
- ✅ Significant technical decisions (affects future features)
- ✅ Uncertain approach (multiple ways to solve, need to evaluate)

**SKIP DESIGN FOR:**
- ❌ Simple features (1-2 files, single domain)
- ❌ Bug fixes (write failing test, fix bug)
- ❌ Small refactorings (improve existing code)
- ❌ Adding button/column to existing panel (trivial UI change)

**When in doubt:** Use "think hard" or "think harder" mode instead of full design.

---

## Design Document Naming

**Convention:** `{FEATURE}_DESIGN.md`

**Examples:**
- `VIRTUAL_DATA_TABLE_DESIGN.md`
- `CONFIGURATION_SETTINGS_DESIGN.md`
- `SOLUTION_PACKAGER_DESIGN.md`

**Supporting docs:**
- `{FEATURE}_SUMMARY.md` - Executive summary
- `{FEATURE}_DIAGRAMS.md` - Visual diagrams
- `{FEATURE}_QUICK_REF.md` - Implementation cheat sheet

---

## Design Review Process

### Invoking design-architect

```
/design {feature description}
```

**Example:**
```
/design Virtual Data Table infrastructure for 70k+ record datasets with server-side pagination, virtual scrolling, and intelligent caching
```

**What happens:**
1. `design-architect` agent analyzes requirements
2. Explores existing code patterns
3. Designs outside-in (UI → ViewModels → Use Cases → Domain)
4. Creates comprehensive design document
5. Returns for human review

### Human Review Checklist

**Architecture:**
- [ ] Clean Architecture compliant (dependencies point inward)
- [ ] Domain has ZERO external dependencies
- [ ] Rich domain models (entities have behavior, not just data)
- [ ] Use cases orchestrate only (NO business logic)
- [ ] Repository interfaces in domain layer

**Design Quality:**
- [ ] Type contracts defined upfront (all interfaces)
- [ ] Implementation slices identified (MVP + enhancements)
- [ ] Testing strategy documented
- [ ] Performance targets quantified
- [ ] Migration path clear (for existing code)

**Completeness:**
- [ ] Business value explained (why build this?)
- [ ] All 4 layers designed (domain, app, infra, presentation)
- [ ] Open questions documented
- [ ] Dependencies identified
- [ ] Breaking changes noted (if any)

---

## Related Documentation

**Architecture Guides:**
- [CLEAN_ARCHITECTURE_GUIDE.md](../architecture/CLEAN_ARCHITECTURE_GUIDE.md) - Core principles
- [PANEL_ARCHITECTURE.md](../architecture/PANEL_ARCHITECTURE.md) - Panel composition patterns
- [CODE_QUALITY_GUIDE.md](../architecture/CODE_QUALITY_GUIDE.md) - Comment & quality standards
- [LOGGING_GUIDE.md](../architecture/LOGGING_GUIDE.md) - Logging by layer

**Workflow Guides:**
- [WORKFLOW.md](../../.claude/WORKFLOW.md) - Feature development workflow
- [TESTING_GUIDE.md](../testing/TESTING_GUIDE.md) - Unit testing patterns
- [INTEGRATION_TESTING_GUIDE.md](../testing/INTEGRATION_TESTING_GUIDE.md) - Panel integration tests

**Planning Docs:**
- [docs/future/](../future/) - Planned features and improvements

---

## Archive

**Completed designs are deleted after PR merge.**

Rationale:
- Git history preserves design docs
- Reduces documentation noise
- Forces extraction of reusable patterns to `docs/architecture/`
- Encourages "living" architecture docs over static design docs

**To view archived designs:** `git log -- docs/design/`
