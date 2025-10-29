# Multi-Agent Workflow Guide

**How to use Builder + Reviewer agents for this refactor**

---

## Quick Start: Your First Task

### Step 1: Start Builder Agent (Current Session)

**You say to Builder:**
```
I want to implement Phase 1.1, Task 1: Extract message validation to BasePanel.

Please:
1. Create isValidMessage() method in BasePanel
2. Update handleMessageInternal() to use it
3. Ensure it compiles

Work on ONLY this task. When done, prepare handoff for reviewer.
```

### Step 2: Builder Implements & Hands Off

**Builder does:**
- Makes the changes
- Runs `npm run compile` to verify
- Creates handoff message

**Builder outputs:**
```
✅ Task completed: Message validation extracted to BasePanel

**Changes Made:**
- Added isValidMessage() to BasePanel (lines 150-165)
- Updated handleMessageInternal() to use helper (line 145)
- Compiles successfully

**Files Changed:**
- src/panels/base/BasePanel.ts (modified)

**Ready for Review:**
Please review src/panels/base/BasePanel.ts, specifically:
- isValidMessage() method (lines 150-165)
- Check for SOLID compliance, no `any` usage, proper abstraction

**Handoff to Reviewer** 👉
```

### Step 3: Switch to Reviewer Agent

**You open NEW chat/agent session** and say:
```
You are the Architecture Reviewer. Please review this change:

Context: Builder extracted message validation to BasePanel
Files changed: src/panels/base/BasePanel.ts
Changes: Added isValidMessage() method (lines 150-165)

Instructions: See .claude/REVIEWER_INSTRUCTIONS.md
Review checklist: Ensure SOLID compliance, no `any`, proper abstraction

Please review and output APPROVE or REJECT.
```

### Step 4: Reviewer Reviews

**Reviewer reads:**
- The changed file
- Checks against SOLID checklist
- Outputs verdict

**Reviewer outputs:**
```
## REVIEW: APPROVED ✅

**SOLID Compliance:**
- ✅ SRP: Single responsibility (message validation only)
- ✅ Type safety: No `any`, explicit types
- ✅ DRY: Will eliminate 6 duplicate implementations

**Recommendation:** APPROVE - Ready to commit.
```

### Step 5: You Commit

If APPROVED:
```bash
git add src/panels/base/BasePanel.ts
git commit -m "Extract message validation to BasePanel

- Added isValidMessage() helper
- Eliminates 6 duplicate implementations

Reviewed-by: Architecture Reviewer ✅"
```

If REJECTED:
- Go back to Builder agent
- Say: "Reviewer rejected with feedback: [paste feedback]"
- Builder fixes issues
- Re-submit to reviewer

### Step 6: Update Progress

Mark task as complete in your tracking system (see below).

---

## How To Use Multiple Agents in Claude

### Option A: Multiple Tabs/Windows
1. Open Builder agent in Tab 1
2. Open Reviewer agent in Tab 2
3. Copy-paste handoff messages between tabs
4. **Pros:** Easy, visual separation
5. **Cons:** Manual copy-paste

### Option B: Single Chat with Role-Switching
1. Say: "Switch to Builder mode" or "Switch to Reviewer mode"
2. Agent changes role based on instruction
3. **Pros:** Single thread, easier history
4. **Cons:** Same agent might miss own mistakes (less effective)

### Option C: API/CLI (Advanced)
1. Use Claude API to automate handoffs
2. **Pros:** Fully automated
3. **Cons:** Requires setup

**Recommendation for you:** Start with Option A (multiple tabs). It's simple and effective.

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
1. Pick small task from checklist
2. Builder implements (~30 min)
3. Reviewer reviews (~10 min)
4. Commit if approved (~5 min)
5. Repeat

**The keys are:**
- Small batches (one task at a time)
- Review before commit (catch issues early)
- Commit frequently (easy rollback)
- Test after each commit (catch regressions)
- Take breaks (avoid burnout)

**You've got this. Start with ONE task today.**
