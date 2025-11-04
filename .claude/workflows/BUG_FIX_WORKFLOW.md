# Bug Fix Workflow

**Purpose**: Quick, safe workflow for fixing bugs with minimal overhead while maintaining code quality.

---

## 🚀 Quick Reference

**Time Estimate**: 25-30 minutes per bug (with test)

**Process**:
1. Write failing test (5 min) ← NEW
2. Implement fix (15 min)
3. Verify test passes (30 sec)
4. Compile (30 sec)
5. Review (2-5 min)
6. Commit with test (3 min)
7. Manual test (5 min)

**Key Principles**:
- ✅ Write failing test first (reproduces bug)
- ✅ Fix makes test pass
- ✅ Test prevents regression
- ✅ Compile immediately after fix
- ✅ Minimal reviews (skip architecture review if not changing layers)
- ❌ Don't add new features during bug fixes

---

## 🧪 Test-Driven Bug Fix Workflow (RECOMMENDED)

**Total Time**: ~25 mins

### Step 1: Write Failing Test (5 min)

**1.1 Reproduce Bug with Test**
- [ ] Create/update test file for buggy component
- [ ] Write test that reproduces exact bug scenario
- [ ] Run test - should FAIL for same reason bug occurs
- [ ] Document expected vs actual behavior in test

**Example**:
```typescript
describe('Environment.activate', () => {
  it('should not throw when activating environment twice', () => {
    const env = createValidEnvironment();
    env.activate();

    // Bug: This throws error, should not
    expect(() => env.activate()).not.toThrow();
  });
});
```

**1.2 Verify Test Fails**
```bash
npm test
```
- [ ] Test fails ❌ (reproduces bug)
- [ ] Failure message matches bug behavior

---

### Step 2: Fix Bug (10 min)

**2.1 Implement Fix**
- [ ] Edit the specific file(s) causing the issue
- [ ] Keep changes minimal (fix bug only)
- [ ] Follow Clean Architecture rules for the layer

**2.2 Verify Test Passes**
```bash
npm test
```
- [ ] Test passes ✅ (bug fixed)
- [ ] All other tests still pass ✅

---

### Step 3: Compile & Review (3 min)

```bash
npm run compile  # Includes tests + lint
```

**3.1 Compile**
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] All tests pass ✅

**3.2 Review (Optional)**

For simple fixes, skip review. For complex fixes:
```
@agent-clean-architecture-guardian - Quick review of bug fix:
- [file paths]

Verify:
- Bug fixed correctly
- No architecture violations introduced
- Test verifies bug is fixed
```

---

### Step 4: Commit with Test (3 min)

```bash
git add [files]
git commit -m "fix: [bug description]

Previous behavior: [what was wrong]
New behavior: [expected behavior]
Root cause: [why bug occurred]

Test: [TestFile.test.ts] - '[test description]'

Reviewed-by: clean-architecture-guardian ✅"
```

**Example**:
```bash
git commit -m "fix: allow multiple environment activations

Previous behavior: Threw error on second activation
New behavior: Idempotent activation (no error)
Root cause: Missing check for already-active state

Test: Environment.test.ts - 'should not throw when activating twice'

Reviewed-by: clean-architecture-guardian ✅"
```

---

### Step 5: Manual Test (5 min)

- [ ] F5 in VS Code
- [ ] Reproduce original bug scenario
- [ ] Verify bug is fixed
- [ ] Check OutputChannel for proper logging

---

**Why This Approach**:
- ✅ Test proves bug exists
- ✅ Test proves bug is fixed
- ✅ Test prevents regression (bug won't come back)
- ✅ Test documents expected behavior
- ✅ Confidence in fix

---

## 📖 Standard Bug Fix Workflow

### Step 1: Reproduce the Bug (5 min)

**1.1 Verify Bug Report**
- [ ] Read bug report/issue
- [ ] Identify steps to reproduce
- [ ] Confirm expected vs actual behavior

**1.2 Reproduce Locally**
- [ ] F5 in VS Code (launch extension)
- [ ] Follow reproduction steps
- [ ] Observe the bug
- [ ] Check OutputChannel for errors

**1.3 Identify Root Cause**
- [ ] Add temporary logging if needed (console.log)
- [ ] Identify which layer has the issue:
  - Domain layer (business logic bug)
  - Application layer (orchestration bug)
  - Infrastructure layer (API/storage bug)
  - Presentation layer (UI bug)
- [ ] Pinpoint the exact file and line

---

### Step 2: Implement Fix (15 min)

**2.1 Make Minimal Changes**

Focus on fixing ONLY the bug:
- [ ] Edit the specific file(s) causing the issue
- [ ] Keep changes as small as possible
- [ ] Don't refactor unrelated code
- [ ] Don't add new features

**2.2 Follow Clean Architecture Rules**

**If bug is in Domain Layer**:
- [ ] Fix business logic
- [ ] Ensure no infrastructure dependencies added
- [ ] Keep domain pure (no logging)

**If bug is in Application Layer**:
- [ ] Fix orchestration logic
- [ ] Ensure no business logic added to use case
- [ ] Log at boundaries if adding error handling

**If bug is in Infrastructure Layer**:
- [ ] Fix API calls, storage operations, etc.
- [ ] Log errors appropriately
- [ ] Redact secrets/tokens in logs

**If bug is in Presentation Layer**:
- [ ] Fix UI logic
- [ ] Ensure panels still call use cases (no business logic)
- [ ] Log user actions if relevant

**2.3 Remove Temporary Debugging Code**
- [ ] Remove all console.log statements added during debugging
- [ ] Remove commented-out code
- [ ] Clean up any temporary variables

---

### Step 3: Compile (30 sec)

```bash
npm run compile
```

**Checklist**:
- [ ] Zero TypeScript compilation errors
- [ ] Zero ESLint errors
- [ ] No new warnings introduced

**If compilation fails**:
- Fix errors immediately
- Re-run `npm run compile`
- Don't proceed until compilation succeeds

---

### Step 4: Review (2-5 min)

**Decision Tree**:

#### Simple Bug (typo, null check, off-by-one)?
→ **Minimal Review**
```
@agent-clean-architecture-guardian - Quick review of bug fix:
- [file path]

Bug: [brief description]
Fix: [brief description]

Verify fix is minimal and correct.
Provide: APPROVE / CHANGES REQUESTED / REJECT
```
**Time**: 2 min

---

#### Type-Related Bug (wrong type, missing null check, type assertion)?
→ **Type Safety Review**
```
@agent-typescript-pro - Review bug fix for type safety:
- [file path]

Bug: [description]
Fix: [description]

Focus on:
- Type correctness
- Null handling
- No new `any` types

Create brief review or provide inline feedback.
```

Then final approval:
```
@agent-clean-architecture-guardian - Final approval after typescript-pro review.
```
**Time**: 5 min

---

#### Architecture-Impacting Bug (changing layer boundaries, adding dependencies)?
→ **Full Review** (same as new feature)
```
@agent-typescript-pro - Review [file path]
@agent-clean-architecture-guardian - Review [file path]
@agent-clean-architecture-guardian - Final approval
```
**Time**: 10 min

**Warning**: If bug fix requires architecture changes, consider if it's really a bug or a missing feature.

---

### Step 5: Commit (3 min)

**Commit Message Format**:
```bash
git add [files]
git commit -m "fix: [brief description of bug]

[Detailed explanation of what was wrong and how it was fixed]

Fixes #[issue-number] (if applicable)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Examples**:

**Simple fix**:
```bash
git commit -m "fix: null reference in ImportJobRepository

Added null check before accessing jobData.status property.
jobData can be null when API returns incomplete data.

Fixes #123"
```

**Type fix**:
```bash
git commit -m "fix: incorrect return type in EnvironmentRepository

Changed findById return type from Environment | undefined to Environment | null
for consistency with IRepository interface.

Reviewed-by: typescript-pro ✅"
```

**Logic fix**:
```bash
git commit -m "fix: environment activation not updating lastUsed timestamp

Environment.activate() now correctly updates this.lastUsed = new Date().
Previous implementation only set isActive flag.

Fixes #456"
```

---

### Step 6: Manual Test (5 min)

**6.1 Test the Specific Bug Scenario**
- [ ] F5 in VS Code
- [ ] Follow exact reproduction steps from Step 1
- [ ] Verify bug is fixed
- [ ] Verify no new bugs introduced

**6.2 Test Related Scenarios**
- [ ] Test edge cases related to the fix
- [ ] Test error paths if fix added error handling
- [ ] Verify OutputChannel logs (if applicable)

**6.3 Regression Check (if significant fix)**
- [ ] Test other features that use the same code
- [ ] Verify no unintended side effects

---

## 🎯 Quick Bug Fix Workflow (Simple Bugs)

**Use when**: Typo, simple null check, obvious logic error

### Minimal Process (15-20 min)

```
1. Reproduce bug (3 min)
2. Fix bug (10 min)
3. npm run compile ✅ (30 sec)
4. code-reviewer quick approval (2 min)
5. Commit (2 min)
6. Manual test (3 min)

Total: ~20 mins
```

**Skip**:
- typescript-pro review (unless type-related)
- clean-architecture-guardian review (unless changing layers)
- Detailed documentation

---

## ⚠️ When Bug Fix Becomes Feature Work

**Red Flags** (bug fix is actually feature work):

### 🚨 Bug Fix is Too Large
- Changing 5+ files
- Adding new classes/interfaces
- Refactoring significant code
- Estimated time >1 hour

**Action**: Convert to feature work, use NEW_FEATURE_WORKFLOW.md

---

### 🚨 Bug Reveals Architecture Issue
- Domain layer has infrastructure dependencies
- Business logic in presentation layer
- Use case contains complex logic

**Action**:
1. Create technical debt issue
2. Apply minimal band-aid fix now
3. Schedule proper refactor using REFACTORING_WORKFLOW.md

---

### 🚨 "Fix" Adds New Behavior
- Adding validation that didn't exist
- Adding new error messages
- Changing user-facing behavior

**Action**: This is a feature, use NEW_FEATURE_WORKFLOW.md

---

## 📋 Bug Fix Checklist

Before committing, verify:

### Code Quality
- [ ] Fix is minimal (only touches bug-related code)
- [ ] No refactoring of unrelated code
- [ ] No new features added
- [ ] All console.log debugging removed
- [ ] Comments explain WHY if non-obvious

### Compilation
- [ ] npm run compile succeeds ✅
- [ ] Zero new TypeScript errors
- [ ] Zero new ESLint warnings

### Architecture (if changed)
- [ ] Domain layer still has zero dependencies
- [ ] No business logic added to use cases
- [ ] No business logic added to panels
- [ ] Logging only at boundaries

### Testing
- [ ] Bug scenario tested and fixed
- [ ] Edge cases tested
- [ ] No regression in related features
- [ ] OutputChannel logs reviewed

### Documentation
- [ ] Commit message explains bug and fix
- [ ] Issue linked (Fixes #123)
- [ ] Code comments added if fix is non-obvious

---

## 🔄 Hotfix Workflow (Production Bugs)

**Use when**: Critical production bug requiring immediate fix

### Expedited Process (30 min)

**1. Create Hotfix Branch**
```bash
git checkout main
git pull
git checkout -b hotfix/[bug-description]
```

**2. Reproduce & Fix (15 min)**
- Reproduce bug
- Implement minimal fix
- npm run compile ✅

**3. Minimal Review (5 min)**
```
@agent-clean-architecture-guardian - URGENT: Review hotfix for production bug.
File: [file path]
Bug: [description]
Fix: [description]

Provide APPROVE/REJECT only (no detailed review).
```

**4. Test (5 min)**
- Manual test of bug scenario
- Quick regression test of critical paths

**5. Merge to Main (3 min)**
```bash
git add .
git commit -m "hotfix: [critical bug description]

[Explanation]

URGENT: Production issue"

git checkout main
git merge hotfix/[bug-description]
git push
```

**6. Deploy & Monitor (5 min)**
- Deploy to production
- Monitor for new issues
- Verify fix in production

**7. Follow-Up**
- [ ] Create issue for proper fix (if hotfix was a band-aid)
- [ ] Schedule refactor if architecture issue revealed
- [ ] Document in CHANGELOG.md

---

## 💡 Bug Fix Patterns

### Pattern 1: Null Check Addition

**Before** (bug):
```typescript
public getStatus(): string {
    return this.data.status; // ❌ data can be null
}
```

**After** (fix):
```typescript
public getStatus(): string | null {
    if (this.data === null) {
        return null;
    }
    return this.data.status;
}
```

**Review needed**: typescript-pro (verify null handling)

---

### Pattern 2: Off-By-One Error

**Before** (bug):
```typescript
for (let i = 0; i <= items.length; i++) { // ❌ i should be < not <=
    process(items[i]);
}
```

**After** (fix):
```typescript
for (let i = 0; i < items.length; i++) {
    process(items[i]);
}
```

**Review needed**: code-reviewer only (minimal review)

---

### Pattern 3: Missing Error Handling

**Before** (bug):
```typescript
public async loadData(): Promise<void> {
    const data = await this.api.fetch(); // ❌ No error handling
    this.data = data;
}
```

**After** (fix):
```typescript
public async loadData(): Promise<void> {
    try {
        const data = await this.api.fetch();
        this.data = data;
        this.logger.info('Data loaded successfully');
    } catch (error) {
        this.logger.error('Failed to load data', error);
        throw new Error('Unable to load data');
    }
}
```

**Review needed**: typescript-pro (verify error type), code-reviewer

---

### Pattern 4: Logic Error in Domain

**Before** (bug):
```typescript
public activate(): void {
    this.isActive = true;
    // ❌ Missing: this.lastUsed update
}
```

**After** (fix):
```typescript
public activate(): void {
    this.isActive = true;
    this.lastUsed = new Date(); // Business rule: track last used
}
```

**Review needed**: clean-architecture-guardian (verify business logic placement)

---

## 🚨 Common Bug Fix Mistakes

### ❌ Mistake 1: Adding Features During Bug Fix

**Wrong**:
```typescript
// Bug: Environment not activating
public activate(): void {
    this.isActive = true;
    this.lastUsed = new Date();
    this.notifySubscribers(); // ❌ NEW FEATURE (event notification)
    this.validateConfiguration(); // ❌ NEW FEATURE (validation)
}
```

**Right**:
```typescript
// Bug: Environment not activating
public activate(): void {
    this.isActive = true;
    this.lastUsed = new Date(); // Fix: update timestamp
}
```

---

### ❌ Mistake 2: Refactoring Unrelated Code

**Wrong**:
```diff
  public getStatus(): string {
+   // Refactored entire method while fixing bug
+   const statusMap = {
+     pending: 'Pending',
+     completed: 'Completed'
+   };
+   return statusMap[this.status] ?? 'Unknown';
-   return this.data.status; // Original bug: missing null check
  }
```

**Right**:
```diff
  public getStatus(): string | null {
+   if (this.data === null) return null; // Minimal fix
    return this.data.status;
  }
```

---

### ❌ Mistake 3: Skipping Compilation

**Wrong**:
```
Fix bug → Commit → Push
```

**Right**:
```
Fix bug → npm run compile ✅ → Review → Commit → Test → Push
```

---

### ❌ Mistake 4: Vague Commit Messages

**Wrong**:
```bash
git commit -m "fix bug"
git commit -m "oops"
git commit -m "fix issue"
```

**Right**:
```bash
git commit -m "fix: null reference in Environment.activate()

Added null check for this.data before accessing properties.
Data can be null when environment is created but not yet configured.

Fixes #123"
```

---

## 🔗 See Also

- [NEW_FEATURE_WORKFLOW.md](NEW_FEATURE_WORKFLOW.md) - For larger changes requiring architecture review
- [REFACTORING_WORKFLOW.md](REFACTORING_WORKFLOW.md) - For fixing architecture issues
- [AGENT_ROLES.md](../AGENT_ROLES.md) - Understanding reviewer roles
- [WORKFLOW_GUIDE.md](../WORKFLOW_GUIDE.md) - Comprehensive workflow guide
- [LOGGING_GUIDE.md](../../docs/architecture/LOGGING_GUIDE.md) - Proper logging patterns
