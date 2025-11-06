# Agent Guide

**Simple guide to using the three specialized agents in this project.**

---

## 🤖 Available Agents

We have **3 specialized agents**:

1. **design-architect** - Creates comprehensive feature designs (BEFORE implementation)
2. **code-guardian** - Reviews code and provides final approval (AFTER implementation)
3. **docs-generator** - Creates/updates documentation (OPTIONAL, when needed)

---

## design-architect

**Purpose:** Outside-in feature design

**When to invoke:** BEFORE implementing complex features

**What it does:**
- Designs from user perspective (panel → ViewModels → use cases → domain)
- Creates panel mockups (HTML/UX)
- Defines ViewModels (data shape for UI)
- Defines use cases (user operations)
- Designs domain entities with rich behavior
- Defines all type contracts upfront
- Creates design document

**Invoke for:**
- ✅ Complex features (4+ vertical slices)
- ✅ New architectural patterns
- ✅ Features touching multiple domains
- ✅ Uncertain approach

**Skip for:**
- ❌ Simple features (1-2 slices, <1 hour)
- ❌ Bug fixes
- ❌ Small refactorings
- ❌ Adding button/column to existing panel
- ❌ **Refactoring to existing patterns** (see below)

**IMPORTANT: Refactoring to Existing Patterns**

When refactoring/porting/migrating code to an **existing, documented pattern**, skip design-architect:

**Skip design-architect when:**
- ✅ Pattern already documented (e.g., PanelCoordinator in PANEL_DEVELOPMENT_GUIDE.md)
- ✅ Reference implementation exists (e.g., SolutionsPanel.ts)
- ✅ You're following a "cookbook" (established recipe)
- ✅ Task is "Port X to pattern Y" or "Migrate X to Y"

**Instead:**
1. Study reference implementation
2. Map existing structure → new structure
3. Implement incrementally
4. Test after each step
5. Invoke code-guardian for final review

**Recommended prompt for refactorings:**
```
Refactor {ComponentName} to use {ExistingPattern} pattern.

Reference:
- Pattern guide: .claude/templates/{PATTERN_GUIDE}.md
- Working example: {ReferenceFile}.ts

This is a refactoring to an existing pattern - skip design phase.
Follow the refactoring workflow in .claude/WORKFLOW.md.
```

**Examples:**

❌ **Don't invoke for:**
```
"Port Environment Setup panel to universal panel pattern (follow SolutionsPanel.ts)"
"Migrate Connection References to PanelCoordinator pattern"
"Refactor Persistence Inspector to use universal pattern"
```

✅ **Do invoke for:**
```
"Design a new universal panel pattern for all panels to follow"
"Design Import Job Viewer feature (new functionality)"
"Design metadata caching architecture (new pattern)"
```

**How to invoke:**
```
I need to design a {feature name} that {user goal}.

Requirements:
- {Requirement 1}
- {Requirement 2}
- {Requirement 3}

Please create a comprehensive design covering all four layers.
```

**Output:** Design document in `docs/design/{FEATURE}_DESIGN.md`

**Example:**
```
I need to design an Import Job Viewer that lets users monitor solution imports.

Requirements:
- Display list of import jobs for selected environment
- Show status (pending/in-progress/completed/failed)
- View XML configuration for each job
- Real-time status updates

Please create a comprehensive design covering all four layers.
```

---

## code-guardian

**Purpose:** Comprehensive code review and final approval

**When to invoke:** AFTER feature is fully implemented (all 4 layers)

**What it does:**
- Reviews architecture (Clean Architecture compliance)
- Reviews type safety (no `any`, explicit returns)
- Reviews tests (coverage, quality, passing)
- Reviews code quality (logging, comments, duplication)
- Verifies manual testing completed
- Provides **APPROVE** or **CHANGES REQUESTED** decision
- **Returns results to main session** (user handles commits manually)

**Invoke for:**
- ✅ Every feature (before committing)
- ✅ Major refactorings
- ✅ Uncertain fixes
- ✅ When you want approval before committing

**Skip for:**
- ❌ During implementation (let implementer finish first)
- ❌ Incomplete features (missing layers)
- ❌ Code that doesn't compile

**How to invoke:**
```
Review the {feature name} implementation for approval.

Files changed:
- src/features/{feature}/domain/
- src/features/{feature}/application/
- src/features/{feature}/infrastructure/
- src/presentation/panels/{Panel}.ts

Manual testing: ✅ Completed (feature works end-to-end)
```

**Output:** APPROVE ✅ or CHANGES REQUESTED ⚠️ with detailed findings

**Example:**
```
Review the Import Job Viewer feature for approval.

Files changed:
- src/features/importJobs/domain/
- src/features/importJobs/application/
- src/features/importJobs/infrastructure/
- src/presentation/panels/ImportJobViewerPanel.ts

Manual testing: ✅ Completed (feature works end-to-end)
```

**After Review:**
- Agent returns verdict and findings to main session
- Main session presents results to user
- User reviews feedback
- If APPROVED: User commits manually
- If CHANGES REQUESTED: User fixes issues, then decides whether to re-review

---

## docs-generator

**Purpose:** Documentation creation and updates

**When to invoke:** AFTER feature complete (OPTIONAL, when needed)

**What it does:**
- Creates new documentation files
- Updates existing documentation
- Adds feature to README
- Creates architecture examples
- Follows DOCUMENTATION_STYLE_GUIDE.md

**Invoke for:**
- ✅ New architectural patterns introduced
- ✅ Documentation needs updating
- ✅ Feature added to README
- ✅ Batch documentation at end of sprint

**Skip for:**
- ❌ Every small feature
- ❌ Bug fixes (usually)
- ❌ Before feature is approved

**How to invoke:**
```
Document the {feature name} feature.

Focus on:
- {Aspect 1 to document}
- {Aspect 2 to document}

Update:
- README.md (add feature to list)
- docs/architecture/ARCHITECTURE_GUIDE.md (add example if new pattern)
```

**Output:** Created/updated documentation files

**Example:**
```
Document the Import Job Viewer feature.

Focus on:
- Rich domain model (ImportJob entity)
- Use case orchestration pattern
- ViewModel mapping

Update:
- README.md (add feature to list)
- docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md (add example if new pattern)
```

---

## Typical Feature Flow

**Here's how agents work together in a typical feature:**

```
┌─────────────────────────────────────────────┐
│ 1. DESIGN PHASE                             │
│    (Complex features only)                  │
├─────────────────────────────────────────────┤
│                                             │
│ You: "I need to design {feature}..."       │
│                                             │
│ design-architect:                           │
│ ├─ Creates outside-in design                │
│ ├─ All 4 layers defined                    │
│ ├─ Type contracts complete                 │
│ └─ Design doc created                       │
│                                             │
│ You: Review and approve design              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 2. IMPLEMENTATION PHASE                     │
│    (Inside-out: domain → app → infra → UI) │
├─────────────────────────────────────────────┤
│                                             │
│ You implement (or builder agent):          │
│ ├─ Domain layer → test → compile → commit  │
│ ├─ Application layer → test → compile → commit │
│ ├─ Infrastructure layer → compile → commit │
│ └─ Presentation layer → compile → manual test → commit │
│                                             │
│ Result: Working feature, 4 clean commits   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 3. REVIEW PHASE                             │
│    (Once per feature)                       │
├─────────────────────────────────────────────┤
│                                             │
│ You: "Review {feature} for approval..."    │
│                                             │
│ code-guardian:                              │
│ ├─ Reviews all 4 layers                    │
│ ├─ Checks architecture, types, tests       │
│ ├─ Returns verdict + findings              │
│ └─ Decision: APPROVE or CHANGES REQUESTED  │
│                                             │
│ Main session:                               │
│ └─ Presents findings to user               │
│                                             │
│ You (user):                                 │
│ ├─ Review feedback                          │
│ ├─ If APPROVED: Commit manually             │
│ └─ If CHANGES: Fix → Re-review (optional)  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 4. DOCUMENTATION PHASE (OPTIONAL)           │
│    (Batch at end of sprint)                │
├─────────────────────────────────────────────┤
│                                             │
│ You: "Document {feature}..."                │
│                                             │
│ docs-generator:                             │
│ ├─ Updates README                           │
│ ├─ Adds architecture examples              │
│ └─ Creates pattern documentation           │
│                                             │
│ Result: Updated documentation               │
└─────────────────────────────────────────────┘
```

**Key Points:**
- design-architect invoked **ONCE** before implementation (complex features only)
- code-guardian invoked **ONCE** after all 4 layers implemented
- docs-generator invoked **OPTIONALLY** when documentation needed
- **Total:** 1-2 agent invocations per feature (down from 12+ in old system)

---

## Quick Decision Matrix

| Scenario | Agent | When |
|----------|-------|------|
| Starting complex feature | design-architect | Before implementation |
| Starting simple feature | None | Sketch mental model yourself |
| Finished implementing | code-guardian | After all layers complete |
| Feature approved | docs-generator (optional) | When docs needed |
| Fixing bug | code-guardian (optional) | Only if uncertain |
| Refactoring | code-guardian (optional) | Only if major |
| Documentation needed | docs-generator | Anytime docs needed |

---

## Agent Responsibilities

### design-architect
- ✅ Creates comprehensive designs
- ✅ Defines all type contracts
- ✅ Works outside-in (user → tech)
- ❌ Does NOT implement code
- ❌ Does NOT review code

**Tools:** Read, Grep, Glob (research only, no editing)

### code-guardian
- ✅ Reviews architecture compliance
- ✅ Reviews type safety
- ✅ Reviews tests and quality
- ✅ Provides final APPROVE or CHANGES REQUESTED verdict
- ✅ Returns findings to main session
- ❌ Does NOT implement code
- ❌ Does NOT design features
- ❌ Does NOT commit or create commit messages

**Tools:** Read, Grep, Glob (review only, no editing or git commands)

### docs-generator
- ✅ Creates documentation files
- ✅ Updates existing docs
- ✅ Follows style guide
- ❌ Does NOT review code
- ❌ Does NOT design features

**Tools:** Read, Write, Edit, Grep, Glob (implements docs)

---

## Success Patterns

### Pattern 1: Complex Feature
```
design-architect → YOU implement → code-guardian → docs-generator (optional)
```

### Pattern 2: Simple Feature
```
YOU implement → code-guardian
```

### Pattern 3: Bug Fix
```
YOU fix → code-guardian (optional, only if uncertain)
```

### Pattern 4: Refactoring
```
YOU refactor → code-guardian (optional, only if major)
```

---

## Getting Help

**Confused about which agent to use?**
1. Check the "Quick Decision Matrix" above
2. When in doubt: Ask the user
3. If still unsure: Read [WORKFLOW.md](WORKFLOW.md) for detailed workflows

**Agent not working as expected?**
1. Check agent file in `.claude/agents/{agent-name}.md`
2. Verify you're invoking with correct format
3. Ensure prerequisites met (e.g., code compiles before review)

**Need to modify an agent?**
1. Edit `.claude/agents/{agent-name}.md`
2. Update description (affects when agent is suggested)
3. Update instructions (affects what agent does)
4. Test changes on simple task

---

## 🔗 See Also

- [WORKFLOW.md](WORKFLOW.md) - Complete workflow guides for features, bugs, refactoring
- [CLAUDE.md](../CLAUDE.md) - Project coding rules and architecture principles
- [.claude/agents/](agents/) - Agent prompt files (design-architect, code-guardian, docs-generator)
- [docs/DOCUMENTATION_STYLE_GUIDE.md](../docs/DOCUMENTATION_STYLE_GUIDE.md) - Documentation standards
