# Multi-Agent Workflow Guide

**How to use Architect + Builder + Reviewer + Docs Generator agents for development**

---

## Current Agent Setup

We have **3 specialized agents** configured:

1. **architect** (`.claude/agents/architect.md`)
   - **When:** Before starting new features or major refactors
   - **Purpose:** Design solutions following SOLID/DRY/YAGNI principles
   - **Output:** Detailed implementation specifications

2. **code-reviewer** (`.claude/agents/code-reviewer.md`)
   - **When:** After implementing code, before committing
   - **Purpose:** Enforce architectural principles and code quality
   - **Output:** APPROVE/REJECT/CHANGES REQUESTED

3. **docs-generator** (`.claude/agents/docs-generator.md`)
   - **When:** After code is approved, or when patterns change
   - **Purpose:** Create/update documentation following style guide
   - **Output:** Documentation files matching project standards

### Future Agents (Not Yet Implemented)

**test-writer** - Will create unit/integration tests
- Blocked on: Need to set up test infrastructure (Jest/Mocha)
- Value: Automated test coverage for services/panels

**test-validator** - Will run automated tests
- Blocked on: Need test-writer to create tests first
- Value: Automated validation before commits (currently manual)

---

## Complete Workflow

### For New Features

```
1. architect designs solution
   ↓
2. Builder implements (you or Claude)
   ↓
3. code-reviewer reviews
   ↓
4. docs-generator documents
   ↓
5. Commit & push
```

### For Refactoring/Bug Fixes

```
1. Builder implements (skip architect for small changes)
   ↓
2. code-reviewer reviews
   ↓
3. docs-generator updates (if patterns changed)
   ↓
4. Commit & push
```

---

## Quick Start Examples

### Example 1: Small Refactor (No Architect Needed)

**Step 1: Builder Implements**
```
You: "Extract message validation to BasePanel"

Builder:
- Implements isValidMessage() method
- Runs npm run compile ✅
- Invokes code-reviewer automatically
```

**Step 2: Code Reviewer Approves**
```
code-reviewer: "✅ APPROVED - Ready to commit"
```

**Step 3: You Commit**
```bash
git commit -m "Extract message validation to BasePanel"
```

**Total time:** ~30-45 mins

---

### Example 2: New Feature (Full Agent Flow)

**Step 1: Architect Designs**
```
You: "I need to add bulk export feature to solution explorer"

architect:
- Researches existing architecture
- Designs service layer (ExportService + models)
- Designs panel layer (ExportPanel + components)
- Designs behavior layer (exportBehavior.js)
- Outputs detailed specification

Time: ~20-30 mins
```

**Step 2: Builder Implements**
```
You: "Implement the ExportService as designed by architect"

Builder:
- Creates ExportService with typed models
- Implements export methods
- Runs npm run compile ✅
- Invokes code-reviewer

Time: ~30-60 mins (per component)
```

**Step 3: Code Reviewer Approves**
```
code-reviewer: "✅ APPROVED - Ready to commit"
```

**Step 4: Docs Generator Documents**
```
You: "Document the new export pattern we just added"

docs-generator:
- Creates/updates EXPORT_PATTERNS.md
- Adds examples from actual code
- Follows style guide
- Updates cross-references

Time: ~15-20 mins
```

**Step 5: You Commit Everything**
```bash
git add .
git commit -m "feat: add bulk export feature

- ExportService with typed models
- ExportPanel with UI components
- Documentation for export patterns

Reviewed-by: code-reviewer ✅
Documented-by: docs-generator ✅"
```

**Total time:** ~2-3 hours (for full feature)

---

### Example 3: Quick Bug Fix (Minimal Flow)

**Step 1: Builder Fixes**
```
You: "Fix the null reference error in PluginRegistrationPanel line 245"

Builder:
- Fixes the bug
- Runs npm run compile ✅
- Invokes code-reviewer

Time: ~10-15 mins
```

**Step 2: Code Reviewer Approves**
```
code-reviewer: "✅ APPROVED - Ready to commit"
```

**Step 3: You Commit**
```bash
git commit -m "fix: null reference in PluginRegistrationPanel

Added null check before accessing property"
```

**Total time:** ~15-20 mins

---

## When to Use Each Agent

### Use architect When:
✅ Building new features (not just fixing bugs)
✅ Major refactors affecting multiple files
✅ Unsure how to structure the solution
✅ Need to ensure SOLID compliance upfront
❌ Skip for: Bug fixes, small refactors, one-file changes

### Use code-reviewer When:
✅ **ALWAYS** - After every code change before commit
✅ Builder automatically invokes it
✅ Catches violations before they merge

### Use docs-generator When:
✅ New patterns introduced
✅ Feature documentation needed
✅ Existing docs are outdated
✅ After architectural changes
❌ Skip for: Bug fixes that don't change patterns

---

## Detailed Walkthrough: Using All 3 Agents

### Scenario: Add Environment Comparison Feature

**Phase 1: Design (architect)**

```
You: "@architect I need users to compare two environments side by side.
Show differences in plugins, workflows, and solutions."
```

**architect researches:**
- Reads ARCHITECTURE_GUIDE.md
- Searches for similar comparison panels
- Identifies reusable services

**architect outputs:**
```markdown
# Design Specification: Environment Comparison

## Architecture
- ComparisonService (fetch data for 2 environments)
- ComparisonPanel (orchestrate UI)
- DiffViewerComponent (show differences)
- comparisonBehavior.js (handle interactions)

## Models
interface EnvironmentComparison {
  left: EnvironmentData;
  right: EnvironmentData;
  differences: Difference[];
}

[... detailed spec ...]
```

**You review and approve design.**

---

**Phase 2: Implementation (builder + code-reviewer)**

```
You: "Implement ComparisonService as specified by architect"

builder:
1. Creates src/models/EnvironmentComparison.ts
2. Creates src/services/ComparisonService.ts
3. Implements methods with typed returns
4. Runs npm run compile ✅
5. Invokes code-reviewer

code-reviewer:
- Checks type safety ✅
- Checks SOLID compliance ✅
- Checks no `any` usage ✅

code-reviewer: "✅ APPROVED"
```

**You commit:**
```bash
git commit -m "feat: add ComparisonService with typed models"
```

**Repeat for panel, component, behavior...**

---

**Phase 3: Documentation (docs-generator)**

```
You: "@docs-generator Document the environment comparison feature we just built"

docs-generator:
1. Reads ComparisonService, ComparisonPanel, etc.
2. Creates COMPARISON_PATTERNS.md
3. Adds real code examples
4. Follows style guide (✅/❌ pattern, no dates, etc.)
5. Updates cross-references
6. Updates README.md index

docs-generator outputs:
"Created COMPARISON_PATTERNS.md (~600 lines)
Updated README.md with new doc link"
```

**You commit:**
```bash
git commit -m "docs: add environment comparison patterns

Documented ComparisonService usage and panel integration"
```

---

**Phase 4: Manual Testing (You)**

```
1. Press F5 to launch extension
2. Open comparison panel
3. Select two environments
4. Verify differences show correctly
5. Test edge cases
```

**If bugs found:** Go back to Phase 2, fix, re-review, re-commit.

---

## Session Structure (Updated)

### Work Session (2-3 hours max)

**For Feature Development:**
```
Hour 1:
├─ architect designs solution (30 min)
├─ Review design (15 min)
└─ Plan implementation tasks (15 min)

Hour 2:
├─ Builder implements Part 1 (30 min)
├─ code-reviewer reviews (automatic, ~2 min)
├─ Commit (3 min)
├─ Builder implements Part 2 (30 min)
├─ code-reviewer reviews (automatic, ~2 min)
└─ Commit (3 min)

Hour 3:
├─ Builder implements Part 3 (30 min)
├─ code-reviewer reviews (automatic, ~2 min)
├─ Commit (3 min)
├─ docs-generator documents feature (20 min)
└─ Commit docs (5 min)

Result: 1 design spec, 3 code commits, 1 doc commit
```

**For Refactoring:**
```
Hour 1:
├─ Task 1: Builder implements (30 min)
├─ Task 1: code-reviewer reviews (auto)
└─ Task 1: Commit (5 min)

Hour 2:
├─ Task 2: Builder implements (30 min)
├─ Task 2: code-reviewer reviews (auto)
└─ Task 2: Commit (5 min)

Hour 3:
├─ Task 3: Builder implements (30 min)
├─ Task 3: code-reviewer reviews (auto)
└─ Task 3: Commit (5 min)

Result: 3 tasks done, 3 commits, fully reviewed
```

**Break between sessions!** Don't do 8 hours straight.

---

## How To Invoke Agents

### Via Claude Code CLI (Current Setup)

Agents are stored in `.claude/agents/` and invoked using the `Task` tool:

**Example: Invoke architect**
```
You: "I need to design a new data export feature"

Builder (Claude Code): "Let me invoke the architect agent to design this"
[Uses Task tool with architect agent]

architect: [Returns design specification]
```

**Example: Invoke code-reviewer** (usually automatic)
```
Builder: "I've implemented the feature. Let me invoke code-reviewer"
[Uses Task tool with code-reviewer agent]

code-reviewer: [Returns APPROVE/REJECT]
```

**Example: Invoke docs-generator**
```
You: "Document the export pattern we just built"

Builder: "Let me invoke docs-generator"
[Uses Task tool with docs-generator agent]

docs-generator: [Creates/updates documentation]
```

### Agent Invocation Patterns

**Automatic Invocation (code-reviewer)**
- Builder automatically invokes code-reviewer after implementing
- You don't need to ask for it explicitly
- Happens before every commit

**Manual Invocation (architect, docs-generator)**
- You request these agents when needed
- Builder uses Task tool to invoke them
- Results returned to main session

**Direct Invocation (Advanced)**
- You can invoke agents directly with `@architect` syntax
- Useful for complex design discussions
- Returns control to you immediately

---

## Task Size Guidelines

### ✅ Good Task Size (30-60 mins)
- Extract one method to base class
- Add type definitions for one service
- Delete duplicate utility file
- Make one behavior extend BaseBehavior

### ❌ Too Large (>2 hours)
- Refactor all services at once
- Implement entire Phase 1.1
- Fix all DRY violations simultaneously

### 🎯 Perfect Task
- **Scope:** One file changed, or one method in base class + updates to children
- **Time:** 30-60 minutes including review
- **Commits:** One task = one commit
- **Review:** Can be reviewed in 10-15 minutes

---

## Session Structure

### Work Session (2-3 hours max)

```
Hour 1:
├─ Task 1: Builder implements (30 min)
├─ Task 1: Reviewer reviews (10 min)
└─ Task 1: Commit (5 min)

Hour 2:
├─ Task 2: Builder implements (30 min)
├─ Task 2: Reviewer reviews (10 min)
└─ Task 2: Commit (5 min)

Hour 3:
├─ Task 3: Builder implements (30 min)
├─ Task 3: Reviewer reviews (10 min)
└─ Task 3: Commit (5 min)

Result: 3 tasks done, 3 commits, fully reviewed
```

**Break between sessions!** Don't do 8 hours straight.

---

## Handling Disagreements

### Builder vs Reviewer Conflict

**Scenario:** Reviewer rejects, Builder thinks it's correct

**Resolution:**
1. Builder explains reasoning: "I used `any` here because..."
2. Reviewer explains concern: "This violates ISP because..."
3. **You (human) decide:** Read both arguments, make call
4. Update rules if needed (document exception in CLAUDE.md)

**Example:**
```
Builder: "I used `any` for EventEmitter signature to match Node.js"
Reviewer: "REJECT - no `any` allowed"
You: "This is valid - update CLAUDE.md to document this exception"
→ Builder adds comment + eslint-disable
→ Reviewer approves with exception noted
```

---

## Progress Tracking

Use this checklist structure (updated after each task):

```markdown
## Phase 0: Workflow Setup ✅ COMPLETE
- [x] Enable TypeScript strict mode
- [x] Add ESLint rules
- [x] Simplify CLAUDE.md
- [x] Create templates
- [x] Add review checklist

## Phase 1: Foundation 🚧 IN PROGRESS

### 1.1: BasePanel Abstraction
- [x] Extract message validation (commit: abc123)
- [ ] Extract component event handling
- [ ] Extract environment change handling
- [ ] Add hook methods for child panels
- [ ] Update 8 child panels to use new base methods

### 1.2: Service Type Safety
- [ ] Define models for PluginRegistrationService
- [ ] Define models for MetadataService
- [ ] ... (continue for all services)

### 1.3: BaseBehavior Enforcement
- [ ] Update environmentSetupBehavior.js
- [ ] Update metadataBrowserBehavior.js
- [ ] ... (continue for all behaviors)

### 1.4: Delete Duplicate PanelUtils
- [ ] Audit which PanelUtils is used
- [ ] Delete duplicate
- [ ] Update imports
```

---

## Tips for Success

### 1. Commit Early, Commit Often
- One task = one commit
- Never batch 5 tasks into one commit
- Easy to rollback if something breaks

### 2. Test After Each Commit
```bash
npm run compile  # Must succeed
code .           # Launch VS Code
# F5 to test extension
# Manually verify changed feature works
```

### 3. Keep Notes
Create `SESSION_NOTES.md`:
```
## Session 2024-10-29 (Saturday Morning)

**Goal:** Phase 1.1 - Extract message validation

**Completed:**
- [x] isValidMessage() extracted (commit: abc123)
- [x] 6 panels updated to use helper (commit: def456)

**Blocked:** None

**Next Session:** Extract component event handling
```

### 4. Take Breaks
- Every 2-3 hours: Take 15-minute break
- Every 6 hours: Stop for the day
- Don't burn out - this is a marathon, not sprint

### 5. Celebrate Small Wins
- Each approved commit is progress
- Track lines of code deleted (duplication removed)
- Track reduction in complexity

---

## Rollback Plan (If Things Break)

### Quick Rollback
```bash
git log --oneline  # Find last good commit
git reset --hard abc123  # Rollback to that commit
```

### Safer: Branch Strategy
```bash
# Before starting phase
git checkout -b refactor/phase-1-1
# Work on branch, commit frequently
# When phase complete and tested:
git checkout main
git merge refactor/phase-1-1
```

---

## Success Metrics

Track these after each session:

- **Tasks completed:** [number]
- **Commits made:** [number]
- **Lines deleted (duplication):** [number]
- **Compilation errors:** [should be 0]
- **Manual test result:** [pass/fail]
- **Feeling:** [confident/uncertain/confused]

If "Feeling" is uncertain/confused → STOP, ask questions, don't push forward.

---

## Summary

**The workflow is:**

**For New Features:**
1. architect designs solution (~30 min)
2. Review design and approve (~15 min)
3. Builder implements in small chunks (~30 min each)
4. code-reviewer auto-reviews each chunk (~2 min)
5. Commit if approved (~5 min)
6. Repeat steps 3-5 until feature complete
7. docs-generator documents patterns (~20 min)
8. Commit docs (~5 min)

**For Refactoring/Bug Fixes:**
1. Builder implements (~30 min)
2. code-reviewer auto-reviews (~2 min)
3. Commit if approved (~5 min)
4. docs-generator updates docs if patterns changed (~20 min)
5. Commit docs (~5 min)

**The keys are:**
- **architect for design** - Plan before coding (new features only)
- **Small batches** - One task at a time, easy to review
- **code-reviewer always** - Catch violations before they merge
- **docs-generator after** - Document new patterns immediately
- **Commit frequently** - Easy rollback if something breaks
- **Manual test after commit** - F5 in VS Code, verify it works
- **Take breaks** - Avoid burnout, this is a marathon

**Current Validation:**
- ✅ TypeScript compilation (`npm run compile`)
- ✅ ESLint rules (part of compile)
- ✅ Manual testing (F5 in VS Code)
- ⏳ Unit tests (future: test-writer + test-validator)

**You've got this. Start with ONE task today.**
