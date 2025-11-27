# Development Workflows

Comprehensive guide for feature development, bug fixes, and refactoring.

---

## Quick Reference

| Workflow | When to Use | Phases |
|----------|-------------|--------|
| **Full Feature** | New features, 3+ files | All 9 phases |
| **Simple Feature** | 1-2 files, clear pattern | Discovery → Implementation → Testing → Review |
| **Bug Fix** | Standard bugs | Discovery → Test → Fix → Review |
| **Hotfix** | Urgent/critical bugs | Streamlined 5-step |
| **Refactoring** | Pattern migrations, cleanup | Tests → Refactor → Tests → Review |

---

## Full Feature Development (9 Phases)

### Phase 1: Discovery (ALWAYS - Before Any Implementation)

**Purpose:** Explore existing patterns before creating new code.

```
□ Search codebase for similar patterns
  - Entities: "class.*Entity" in domain/
  - Panels: "*Panel*.ts" in presentation/
  - Use cases: "*UseCase.ts" in application/
□ Read relevant existing code
□ Check docs/ for existing designs or decisions
□ Document findings: "Found X, will reuse Y, need to create Z"
```

**Why this matters:** Prevents rebuilding existing patterns (e.g., web resource editing incident).

**Output:** Understanding of what exists, what to reuse, what to create.

---

### Phase 2: Requirements (Features, Not Bug Fixes)

**Purpose:** Define what success looks like before implementation.

| Complexity | Requirements Format |
|------------|---------------------|
| Simple (1-2 files) | Checklist in tracking doc |
| Medium (3-6 files) | Section in design doc |
| Complex (7+ files) | Separate `docs/work/[FEATURE]_REQUIREMENTS.md` |
| New panel | User stories + acceptance criteria |
| API integration | Endpoints, auth, error handling |

**Output:** Clear success criteria that can be verified.

---

### Phase 3: Design (If 3+ Files or Architectural Decisions)

**Purpose:** Architecture decisions and type contracts before implementation.

**Use `/design [feature]`** which:
1. Reads CLAUDE.md and templates
2. Invokes design-architect with project context
3. Saves to `docs/design/[FEATURE]_DESIGN.md`

**Design Doc Scope:**
- **Focus on MVP only** - What we're building now, not future possibilities
- Include "Future Enhancements" section for ideas that won't make MVP
- Design docs are temporary artifacts - deleted after implementation

**Slice-based approach:**
- Design MVP slice first (minimal end-to-end)
- Implement and ship slice
- Design next slice if needed
- Complex features: break into multiple slices (large designs fail)

**When to skip:** Simple features (1-2 files) - use extended thinking instead.

---

### Phase 4: Task Tracking (ALWAYS - Before Implementation)

**Purpose:** Create persistent tracking for cross-session work.

```
□ Create tracking doc: docs/work/[FEATURE]_TODO.md
□ Use template: .claude/templates/TASK_TRACKING_TEMPLATE.md
□ Break work into checkboxes by layer:
  - [ ] Domain implementation
  - [ ] Domain unit tests
  - [ ] Application implementation
  - [ ] Application unit tests
  - [ ] Infrastructure implementation
  - [ ] Presentation implementation
  - [ ] Integration tests (if panel/cross-layer)
  - [ ] E2E tests (if UI changes)
  - [ ] Code review
  - [ ] Manual testing (F5)
□ Commit tracking doc
```

**Keep in sync:** Update both TodoWrite (in-session) and tracking doc (persistent).

---

### Phase 5: Implementation (Inside-Out, Per Layer)

**Order:** Domain → Application → Infrastructure → Presentation

**Per layer:**
```
□ Implement layer code
□ Write unit tests for layer
□ npm run compile
□ npm test
□ Update tracking doc (check boxes)
□ Commit: "feat([feature]): implement [layer] layer"
```

**Layer responsibilities:**
- **Domain:** Rich entities with behavior, zero external dependencies
- **Application:** Use cases orchestrate only (NO business logic), ViewModels are DTOs
- **Infrastructure:** Implements domain interfaces, API calls
- **Presentation:** Uses use cases, maps to ViewModels, no business logic

**Coverage targets:**
- Domain: 100%
- Application: 90%
- Infrastructure: As needed (complex logic only)

---

### Phase 6: Testing (After All Layers Implemented)

**Purpose:** Verify implementation before review.

```
□ Unit tests pass: npm test (should pass from Phase 5)
□ Integration tests: Write if panel or cross-layer interactions
□ E2E tests: npm run e2e:smoke (if UI changes)
□ Update tracking doc
□ Commit tests if not already committed with layers
```

**E2E test guidance:**
| Bug/Feature Type | Unit Test | E2E Test |
|------------------|-----------|----------|
| Domain logic | ✅ Always | ❌ No |
| Use case | ✅ Always | ❌ No |
| Panel rendering | ✅ If possible | ✅ Yes |
| User workflow | ❌ Hard to unit test | ✅ Yes |
| Race condition/timing | ❌ Hard to unit test | ✅ Yes |

---

### Phase 7: Code Review (MANDATORY Before PR)

**Purpose:** Catch issues before merge.

**Prerequisites (must pass):**
```
□ npm run compile passes
□ npm test passes
□ Manual testing (F5) complete
□ Bugs found during testing fixed (tracked in TODO doc)
□ No any types or console.log
□ Domain entities have behavior methods
```

**Review:**
```
□ Run /code-review
□ Address any CHANGES REQUESTED
□ Get APPROVED status
□ Update tracking doc
```

---

### Phase 8: Final Commit & PR

**Purpose:** Merge to main via pull request.

```
□ Ensure all tracking doc boxes checked
□ Update CHANGELOG.md
□ Final commit if any remaining changes
□ Push branch: git push -u origin [branch]
□ Create PR: gh pr create --title "..." --body "..."
□ Verify CI passes
```

**PR creation uses `gh` CLI** (documented in CLAUDE.md).

---

### Phase 9: Cleanup (After Merge)

**Purpose:** Remove transient artifacts, preserve patterns and future ideas.

```
□ If design doc has reusable patterns:
  - Extract to docs/architecture/[PATTERN].md
□ If design doc has "Future Enhancements" section:
  - Migrate to docs/future/[FEATURE].md (create if doesn't exist)
  - Or add to existing feature file in docs/future/
□ Delete design doc (git rm docs/design/[FEATURE]_DESIGN.md)
□ Delete tracking doc (git rm docs/work/[FEATURE]_TODO.md)
□ Update any documentation affected by feature
```

**Design Doc Lifecycle:**
1. Created during Phase 3 (Design)
2. Used during implementation as reference
3. Patterns extracted to `docs/architecture/` during Phase 9
4. Future ideas migrated to `docs/future/` during Phase 9
5. Deleted before PR (git history preserves)

---

## Workflow Variants

### Simple Feature (1-2 Files)

Skip formal design and requirements. Use:
1. **Discovery** - Still explore existing patterns
2. **Implementation** - Implement with tests
3. **Testing** - Verify
4. **Review** - `/code-review`
5. **Commit** - Direct to branch or PR

---

### Bug Fix Workflow

Standard bugs (not urgent):

```
1. Discovery: What's broken? Where's the bug?
2. Write failing test that reproduces bug
3. Fix bug (test now passes)
4. npm test + npm run compile
5. /code-review (optional for minor fixes)
6. Commit with test
```

**E2E test for bugs:** Only if bug is UI/workflow/timing related.

---

### Hotfix Fast Path (Urgent Bugs)

For critical/production issues - streamlined process:

```
1. Discovery (quick): What's broken, where?
2. Create test to prove bug (unit or E2E)
3. Fix bug (test passes)
4. Quick review (focus: does it fix? does it break anything?)
5. Commit + PR
```

**Key differences from full workflow:**
- Skip requirements doc
- Skip design doc
- Skip full task tracking (checklist in PR description)
- Lighter review (fix-focused)

---

### Refactoring Workflow

```
1. Tests pass BEFORE refactoring (baseline)
2. Refactor incrementally
3. Tests pass AFTER refactoring (behavior unchanged)
4. /code-review (for major refactors)
5. Commit
```

**For pattern migrations** (e.g., "port X to PanelCoordinator"):
- Study reference implementation first (Discovery)
- Skip design phase (pattern already documented)
- Follow existing cookbook

---

## Parallel Work (Git Worktrees)

When working on multiple features simultaneously:

```
# Create worktree for feature
git worktree add ../project-feature-name feature/feature-name

# Symlink shared config (env vars, local settings)
# Each feature gets its own tracking doc
# Context switch = /clear + switch to worktree + read relevant TODO doc
```

**Note:** Symlinks for `.env` and `.claude/settings.local.json` should be set up in worktrees.

---

## Extended Thinking

Use when uncertain or evaluating options:

| Trigger | When | Duration |
|---------|------|----------|
| "think" | Standard reasoning | 10-20s |
| "think hard" | Thorough analysis | 30-60s |
| "think harder" | Deep architecture evaluation | 1-2min |
| "ultrathink" | Maximum reasoning (rare) | 2-5min |

---

## Session Habits

| When | Action |
|------|--------|
| **Start session** | CLAUDE.md auto-loaded, read tracking doc if continuing work |
| **Complex feature** | `/design` first (after Discovery) |
| **Before PR** | `/code-review` (mandatory) |
| **End session** | `/handoff` for context |
| **Context full** | `/clear` and restart |
| **Switching features** | `/clear`, switch branch/worktree, read new tracking doc |

---

## Commit Guidance

**Code changes:**
- Commit per layer during implementation
- Follow session pattern if established (user said "commit and proceed" = do it)
- Ask if unclear on significant code changes

**Documentation/planning:**
- Commit at logical checkpoints without asking
- After each completed phase
- When tracking doc is updated significantly

**Never commit:**
- Failing tests
- Compilation errors
- Incomplete implementations (unless WIP branch)

---

## Documentation Organization

| Location | Purpose | Audience |
|----------|---------|----------|
| `.claude/` | Claude-specific guidance | Claude (AI) |
| `docs/` | Project documentation | Humans |
| `docs/work/` | Active work tracking (transient) | Both |
| Root | High-level project files | Both |

---

## References

- `CLAUDE.md` - Project rules (NEVER/ALWAYS)
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Architecture patterns
- `docs/testing/TESTING_GUIDE.md` - Testing patterns
- `.claude/templates/TASK_TRACKING_TEMPLATE.md` - Tracking doc format
- `.claude/templates/TECHNICAL_DESIGN_TEMPLATE.md` - Design doc format
- `docs/BRANCH_STRATEGY.md` - Branch naming and workflow
