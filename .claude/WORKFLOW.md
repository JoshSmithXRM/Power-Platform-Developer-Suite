# Development Workflows

Quick reference for feature development, bug fixes, and refactoring.

---

## Feature Development

**Philosophy:** Design outside-in, implement inside-out, review once.

### When to Design

| Complexity | Files | Approach |
|------------|-------|----------|
| Simple | 1-2 | Extended thinking ("think hard"), no formal design |
| Medium | 3-6 | `/design` for first slice only |
| Complex | 7+ | Break into slices, design each separately |
| Uncertain | Any | "think harder" to evaluate options first |

**Key insight:** Large designs (12+ files) fail. Break into shippable slices instead.

### Design Phase

**Use `/design [feature]`** which:
1. Reads CLAUDE.md and templates
2. Invokes design-architect with project context
3. Saves to `docs/design/FEATURE_DESIGN.md`

**Slice-based approach:**
- Design MVP slice first (minimal end-to-end)
- Implement and ship slice
- Design next slice
- Delete design doc when feature complete (tests are the spec)

### Implementation Phase (Inside-Out)

```
Domain → Application → Infrastructure → Presentation
```

**Per layer:**
1. Implement layer
2. Write tests (domain 100%, use cases 90%)
3. `npm run compile`
4. Commit

**Layer responsibilities:**
- **Domain:** Rich entities with behavior, zero dependencies
- **Application:** Use cases orchestrate (no business logic), ViewModels are DTOs
- **Infrastructure:** Implements domain interfaces
- **Presentation:** Uses use cases, no business logic

### Review Phase

**Before `/code-review`:**
- [ ] `npm run compile` passes
- [ ] `npm test` passes
- [ ] Manual testing (F5) complete
- [ ] No `any` or `console.log`
- [ ] Domain entities have behavior methods

**After approval:** Commit and push.

---

## Bug Fix Workflow

1. **Write failing test** that reproduces bug
2. **Fix bug** (test passes)
3. **Verify:** `npm test` + `npm run compile`
4. **Commit** with test
5. **Review** (optional, for critical bugs): `/code-review`

---

## Refactoring Workflow

1. **Tests pass before** refactoring
2. **Refactor** incrementally
3. **Tests pass after** (behavior unchanged)
4. **Commit**
5. **Review** (optional, for major refactors): `/code-review`

**For pattern migrations** (e.g., "port X to PanelCoordinator"):
- Study reference implementation
- Skip design phase (pattern already documented)
- Follow cookbook incrementally

---

## Extended Thinking

Use when uncertain or evaluating options:

| Trigger | When |
|---------|------|
| "think" | Standard reasoning (10-20s) |
| "think hard" | Thorough analysis (30-60s) |
| "think harder" | Deep architecture evaluation (1-2min) |

---

## Session Habits

- **Start:** CLAUDE.md auto-loaded
- **Complex feature:** `/design` first
- **Before commit:** `/code-review`
- **End session:** `/handoff`
- **Context full:** `/clear`

---

## References

- `CLAUDE.md` - Project rules
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Patterns
- `docs/testing/TESTING_GUIDE.md` - Testing
- `.claude/templates/` - Design templates
