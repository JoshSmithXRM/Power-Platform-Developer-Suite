# Agent Usage Guide

## How to Use the code-reviewer Agent

### Quick Start

When you complete a task, I (the Builder agent) will automatically invoke the code-reviewer agent for you. You don't need to do anything manually!

---

## Automatic Review Flow

### What Happens:

1. **Builder (me) implements task** (30-60 min)
   - I write the code
   - I run `npm run compile` to verify
   - I prepare a handoff

2. **Builder invokes code-reviewer** (automatic)
   - I call the code-reviewer agent with context
   - I provide file paths and what was changed
   - Code-reviewer reads files and checks against checklist

3. **Code-reviewer responds** (10-15 min)
   - ✅ APPROVED → Ready to commit
   - ❌ REJECTED → I fix issues and resubmit
   - ⚠️ CHANGES REQUESTED → I improve and resubmit

4. **You commit when approved**
   ```bash
   git add .
   git commit -m "[title]

   [description]

   SOLID compliance: ✅ Reviewed"
   ```

---

## Example: Complete Task Cycle

### Step 1: You Give Me a Task
```
You: "Please implement Phase 1.1, Task 1: Extract message validation to BasePanel"
```

### Step 2: I Implement
```
Builder (me): "I've created isValidMessage() in BasePanel and updated
handleMessageInternal() to use it. Running compile... ✅ Success.

Let me invoke the code-reviewer agent to verify this follows SOLID principles."

[I automatically invoke code-reviewer agent]
```

### Step 3: Code-Reviewer Reviews
```
Code-Reviewer: "## REVIEW: APPROVED ✅

**Changes Reviewed:** Message validation extracted to BasePanel

**SOLID Compliance:**
- ✅ Type Safety: Explicit types, no any
- ✅ SRP: Single responsibility (validation only)
- ✅ DRY: Will eliminate 6 duplicate implementations

**Recommendation:** APPROVE - Ready to commit.

**Suggested Commit Message:**
```
Extract message validation to BasePanel

- Created isValidMessage() helper method
- Updated handleMessageInternal() to use helper
- Eliminates 6 duplicate implementations

SOLID compliance: ✅ Reviewed
```
```

### Step 4: I Report Back to You
```
Builder (me): "✅ Code-reviewer has approved the changes!

Ready to commit. Use this commit message:

Extract message validation to BasePanel

- Created isValidMessage() helper method
- Updated handleMessageInternal() to use helper
- Eliminates 6 duplicate implementations

SOLID compliance: ✅ Reviewed
```

### Step 5: You Commit
```bash
git add src/panels/base/BasePanel.ts
git commit -m "Extract message validation to BasePanel

- Created isValidMessage() helper method
- Updated handleMessageInternal() to use helper
- Eliminates 6 duplicate implementations

SOLID compliance: ✅ Reviewed"
```

---

## What If Code-Reviewer Rejects?

### Example: Rejection Scenario

```
Code-Reviewer: "## REVIEW: REJECTED ❌

**Issues Found:**

### 🚨 CRITICAL
1. **Type Safety Violation** (Line 45)
   - Found: `return data || null;`
   - Required: Explicit type with proper error handling
   - Fix: Define return type, throw error instead of returning null

**Next Steps:**
1. Fix issue 1
2. Resubmit for review
```

### I Fix and Resubmit
```
Builder (me): "Understood. I've fixed the type safety issue by defining
explicit return type and adding proper error handling.

[I automatically re-invoke code-reviewer]

Code-Reviewer: "## REVIEW: APPROVED ✅
[approval message...]"

Builder (me): "✅ Code-reviewer has approved the changes!
Ready to commit..."
```

---

## Manual Review (If Needed)

If you ever want to manually invoke the code-reviewer:

```
You: "@code-reviewer please review the changes I made to BasePanel.ts
I added a new method handleComponentEvent() and want to ensure it follows
SOLID principles."

[Code-reviewer will review and respond]
```

But in our workflow, I (Builder) will handle this automatically after each task.

---

## Reviewer Decision Types

### ✅ APPROVED
- **Meaning:** Code meets all standards, ready to commit
- **Your action:** Commit with provided message

### ❌ REJECTED
- **Meaning:** Critical violations found, must fix before proceeding
- **Your action:** Wait for me to fix and get re-approved

### ⚠️ CHANGES REQUESTED
- **Meaning:** Code works but could be improved
- **Your action:** Decide if you want me to fix now or later

---

## Tips

1. **Trust the process** - If code-reviewer rejects, there's a good reason
2. **Read the feedback** - Code-reviewer explains WHY, not just WHAT
3. **Learn from rejections** - Patterns get clearer over time
4. **Don't skip reviews** - Every task gets reviewed before commit

---

## Summary

**You don't need to invoke the agent manually.** I (Builder) will:
1. Implement your task
2. Automatically invoke code-reviewer
3. Fix any issues if rejected
4. Give you a ready-to-commit message when approved

Your job: **Give me tasks, commit when approved, repeat.**

Simple! 🎯
