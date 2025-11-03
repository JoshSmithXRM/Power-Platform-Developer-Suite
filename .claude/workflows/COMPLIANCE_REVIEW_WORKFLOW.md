# Compliance Review Workflow

**Purpose**: Iterative review/fix loop for achieving architecture and type safety compliance on existing code.

---

## 🚀 Quick Reference

**Use this workflow when:**
- You have uncommitted changes that need compliance review
- Post-implementation cleanup (already built, need to fix violations)
- Legacy code refactoring (fixing old code to meet current standards)
- Pre-commit validation (ensure no violations before commit)
- After bulk changes (verify compliance after large refactoring)

**Process:**
```
Review → Fix Issues → Re-Review → Fix Remaining → ... → APPROVE ✅
```

**Exit Criteria:**
- ✅ clean-architecture-guardian: APPROVE
- ✅ typescript-pro: APPROVE (OPTIONAL - only if type safety reviewed)
- ✅ `npm run compile` succeeds
- ✅ All issues resolved

**Reviewers:**
- clean-architecture-guardian: ALWAYS (architecture compliance + final approval)
- typescript-pro: OPTIONAL (include if you changed types, added methods, or want comprehensive review)

**Time Estimate:**
- Simple (1-3 issues): 15-30 min
- Moderate (5-10 issues): 45-90 min
- Complex (15+ issues): 2-3 hours

---

## 📖 When to Use This Workflow

### ✅ Good Use Cases

**Post-Implementation Cleanup**
```
You: "I just implemented the plugin registration feature.
     Review it and help me fix compliance issues."
```

**Legacy Code Refactoring**
```
You: "The ImportJob feature has architecture violations.
     Clean it up until it's compliant."
```

**Pre-Commit Validation**
```
You: "I'm about to commit.
     Review everything and fix any issues first."
```

**After Bulk Changes**
```
You: "I refactored all the mappers.
     Make sure they're compliant now."
```

### ❌ Wrong Use Cases

**During New Feature Development**
- Use NEW_FEATURE_WORKFLOW.md instead (layer-by-layer with reviews)
- Don't build entire feature then review - review per layer

**For Small Bug Fixes**
- Use BUG_FIX_WORKFLOW.md instead
- Bug fixes typically need minimal review

**For Incremental Refactoring**
- Use REFACTORING_WORKFLOW.md instead
- That workflow handles step-by-step changes better

---

## 🚨 Common Mistakes (Anti-Patterns)

### ❌ Mistake 1: Vague Agent Invocation

**WRONG - What happened to the user:**
```
User: "Review uncommitted changes and fix compliance issues until APPROVE"

Claude: [Invokes agent with vague prompt: "Review uncommitted changes for compliance"]

Agent Output:
Todos:
☐ Review uncommitted changes for compliance issues
☐ Fix identified compliance issues
☐ Get final approval from clean-architecture-guardian

[No review file created]
[No specific file:line issues listed]
[Generic todos that don't help]
```

**Problem:** Agent was invoked without explicit instructions to create review FILE with specific issues.

**RIGHT - What should happen:**
```
User: "Review uncommitted changes and fix compliance issues until APPROVE"

Claude: [Invokes agent with EXPLICIT prompt including format template]

Agent Output:
Created file: docs/codereview/clean-arch-guardian-review-2025-11-03.md

File contains:
- Production Readiness: 6/10
- Environment.ts:45 - Business logic in getter (CRITICAL)
- SaveEnvironmentUseCase.ts:23 - Missing return type (CRITICAL)
- ImportJob.ts:67 - Static utility method (MODERATE)
[... 10 more specific issues with file:line]

[Claude then creates todos FROM the review file issues]
```

**Fix:** I (Claude) must include explicit format template in Task tool prompt. See Phase 1.1 for correct invocation.

---

### ❌ Mistake 2: Creating Generic Todos Instead of Specific Issues

**WRONG:**
```
Todos:
☐ Fix compliance issues
☐ Review code quality
☐ Get approval
```

**Problem:** Doesn't tell you WHAT to fix or WHERE.

**RIGHT:**
```
Todos:
☐ Environment.ts:45 - Business logic in getter
☐ SaveEnvironmentUseCase.ts:23 - Missing return type
☐ ImportJob.ts:67 - Static utility method on entity
```

**Fix:** I (Claude) must parse the review file and extract specific file:line issues to create todos. See Phase 1.4.

---

### ❌ Mistake 3: Agent Creates Todos Instead of Review File

**WRONG:**
```
Agent directly creates todos without review file.
```

**Problem:** No persistent record of issues, no production readiness score, no severity categorization.

**RIGHT:**
```
Agent creates review FILE: docs/codereview/clean-arch-guardian-review-{YYYY-MM-DD}.md
Then Claude reads the file and creates todos from it.
```

**Fix:** Agent's job is to create review FILE, Claude's job is to create todos from the file.

---

## 🔄 The Workflow

### Phase 1: Initial Review (5-10 min)

**1.1 Invoke Reviewers with Explicit Instructions**

When you say: "Review uncommitted changes for compliance"

I (Claude) will use the Task tool to invoke reviewers in parallel with EXPLICIT prompts:

**Task 1: Invoke clean-architecture-guardian**
```
Subagent: clean-architecture-guardian
Description: Review uncommitted changes for architecture compliance

Prompt:
Review all uncommitted changes for Clean Architecture compliance.

Create review file: docs/codereview/clean-arch-guardian-review-{YYYY-MM-DD}.md

Use this format:

# Clean Architecture Guardian Review - {YYYY-MM-DD}

## Production Readiness: X/10

**Rationale**: [1 sentence explaining the score]

## Issues Found

### CRITICAL

**{file}:{line}** - {Brief issue description}
- **Problem**: {What's wrong - 1-2 sentences}
- **Fix**: {Specific fix - 1-2 sentences}
- **Rationale**: {Why it matters - 1 sentence}

### MODERATE

[Same format as CRITICAL]

### MINOR

[Same format as CRITICAL]

## Final Status

**Status**: APPROVE / CHANGES REQUESTED / REJECT

Focus on:
- Layer boundary violations (business logic in wrong layer)
- Dependency direction (must point inward toward domain)
- Domain purity (zero external dependencies)
- Anemic vs rich domain models
- SOLID principles
- Code quality (duplication, naming, complexity)

Be specific: Include file paths and line numbers for every issue.
```

**Task 2: Invoke typescript-pro (OPTIONAL - include if type safety needed)**
```
Subagent: typescript-pro
Description: Review uncommitted changes for type safety

Prompt:
Review all uncommitted changes for TypeScript type safety.

Create review file: docs/codereview/typescript-pro-review-{YYYY-MM-DD}.md

Use same format as clean-architecture-guardian review file.

Focus on:
- Missing explicit return types on public methods
- `any` usage without justification
- Non-null assertions (`!`) without validation
- Proper null handling (null vs undefined consistency)
- Type narrowing and type guards
- Generic constraints
- VS Code extension API type usage

Be specific: Include file paths and line numbers for every issue.

Provide: APPROVE / CHANGES REQUESTED / REJECT
```

**1.2 Wait for Review Files**

Both agents will create review files:
- `docs/codereview/clean-arch-guardian-review-{YYYY-MM-DD}.md`
- `docs/codereview/typescript-pro-review-{YYYY-MM-DD}.md` (if invoked)

**1.3 Read Review Results**

I'll read both review files using the Read tool and parse:
- Production readiness score
- Issue counts by severity (CRITICAL / MODERATE / MINOR)
- All specific file:line issues

**Example Output I'll Show You:**
```
Review Results:

clean-architecture-guardian: CHANGES REQUESTED (8 issues)
- Production Readiness: 6/10
- CRITICAL: 2 issues
- MODERATE: 4 issues
- MINOR: 2 issues

typescript-pro: CHANGES REQUESTED (5 issues)
- CRITICAL: 2 issues
- MODERATE: 3 issues
- MINOR: 0 issues

Total Issues: 13 (4 CRITICAL, 7 MODERATE, 2 MINOR)
```

**1.4 Create Todo List with TodoWrite**

I'll use the TodoWrite tool to create a todo list from the review file issues:

```markdown
## Compliance Issues to Fix

### CRITICAL (fix first)
- [ ] Environment.ts:45 - Business logic in getter
- [ ] SaveEnvironmentUseCase.ts:23 - Missing return type
- [ ] ImportJob.ts:67 - Static utility method on entity
- [ ] EnvironmentRepository.ts:34 - Domain depends on infrastructure

### MODERATE
- [ ] EnvironmentRepository.ts:67 - Non-null assertion without check
- [ ] ImportJobFactory.ts:23 - Using `any` type
- [ ] SolutionMapper.ts:45 - Mapper has sorting logic
... (10 more)

### MINOR
- [ ] ImportJob.ts:12 - Missing JSDoc comment
- [ ] Environment.ts:89 - Obvious comment
```

**IMPORTANT:** I must extract specific file:line issues from the review files, NOT create generic todos like "Fix compliance issues".

---

### Phase 2: Fix Issues (30-90 min)

**2.1 Fix Issues One by One Using Edit Tool**

I'll work through the todo list systematically:

**For each issue:**
1. Use TodoWrite to mark issue as `in_progress`
2. Read the affected file using Read tool
3. Fix the specific issue using Edit tool
4. Use TodoWrite to mark issue as `completed`
5. Move to next issue

**Example:**
```
[TodoWrite: Mark "Environment.ts:45 - Business logic in getter" as in_progress]

Issue: Environment.ts:45 has business logic in getter
Fix: Move logic to domain method

[Read: src/features/environmentSetup/domain/entities/Environment.ts]
[Edit: Move validation logic from getter to validate() method]

[TodoWrite: Mark "Environment.ts:45 - Business logic in getter" as completed ✅]
```

**2.2 Compile After All Fixes**

After all issues in todo list are marked completed:

```bash
npm run compile
```

If compilation fails:
- Fix compilation errors using Edit tool
- Re-run compile
- Don't proceed until compile succeeds ✅

---

### Phase 3: Re-Review (5 min)

**3.1 Invoke Reviewers Again with Explicit Instructions**

I'll use the Task tool to invoke reviewers again:

**Task: Re-invoke clean-architecture-guardian**
```
Subagent: clean-architecture-guardian
Description: Re-review fixes from previous compliance review

Prompt:
Re-review all uncommitted changes.

Previous review file: docs/codereview/clean-arch-guardian-review-{YYYY-MM-DD}.md

Check if issues from the previous review have been resolved.

Create review file: docs/codereview/clean-arch-guardian-review-{YYYY-MM-DD}-iteration-2.md

Use same format as previous review.

Compare against previous issues and verify:
- CRITICAL issues are resolved
- MODERATE issues are resolved
- MINOR issues are resolved
- No new issues introduced

Provide: APPROVE / CHANGES REQUESTED / REJECT
```

**3.2 Analyze Re-Review Results**

**Outcome A: APPROVE ✅**
```
Status: APPROVE
All issues resolved. Code is compliant and ready for commit.
```
→ **Exit workflow** (Phase 4)

**Outcome B: CHANGES REQUESTED (remaining issues)**
```
Status: CHANGES REQUESTED

Remaining Issues (3):
- Environment.ts:45 - Business logic still in presentation layer
- ImportJob.ts:23 - Static method not fully refactored
- SaveEnvironmentUseCase.ts:67 - Added return type but it's wrong
```
→ **Return to Phase 2** (fix remaining issues)

**Outcome C: REJECT ❌**
```
Status: REJECT

Fundamental architecture violation:
- Domain layer imports from infrastructure layer
- This requires major refactoring, not simple fixes
```
→ **Need major refactor** - Use REFACTORING_WORKFLOW.md

---

### Phase 4: Exit - APPROVE Status (2 min)

**4.1 Verification**

All criteria met:
- ✅ clean-architecture-guardian: APPROVE
- ✅ typescript-pro: APPROVE
- ✅ `npm run compile` succeeds
- ✅ All todos completed

**4.2 Summary**

I'll provide final summary:
```
All compliance issues resolved ✅

Review Status:
- clean-architecture-guardian: APPROVE (0 issues remaining)
- typescript-pro: APPROVE (0 issues remaining)
- Compilation: SUCCESS

Files modified: 8
Issues fixed: 13 (4 CRITICAL, 7 MODERATE, 2 MINOR)
Iterations: 2

Ready to commit.
```

**4.3 Optional: Commit**

```bash
git add .
git commit -m "refactor: fix compliance violations

- Moved business logic from use cases to domain entities
- Added explicit return types to all public methods
- Removed static utility methods from entities
- Fixed dependency direction violations

Reviewed-by: clean-architecture-guardian, typescript-pro ✅"
```

---

## 🎯 Iteration Loop Example

### Iteration 1

```
You: Review uncommitted changes and fix compliance issues

Me: [Invokes reviewers]

Results:
- clean-architecture-guardian: CHANGES REQUESTED (8 issues)
- typescript-pro: 5 issues

[Creates todo list with 13 items]
[Fixes all 13 issues]
[Marks all todos completed]
[Runs npm run compile ✅]

Re-reviewing...
```

### Iteration 2

```
Me: [Re-invokes reviewers]

Results:
- clean-architecture-guardian: CHANGES REQUESTED (2 issues remaining)
- typescript-pro: APPROVE ✅

Remaining Issues:
1. Environment.ts:45 - Business logic still in getter
2. ImportJob.ts:23 - Static method partially refactored

[Fixes 2 remaining issues]
[Runs npm run compile ✅]

Re-reviewing...
```

### Iteration 3

```
Me: [Re-invokes reviewers]

Results:
- clean-architecture-guardian: APPROVE ✅
- typescript-pro: APPROVE ✅

All compliance issues resolved!
Ready to commit.
```

**Total**: 3 iterations, 45 minutes, 13 issues fixed → APPROVE

---

## 📋 Quick Prompts You Can Use

### Full Compliance Review (Architecture + Type Safety)
```
Review uncommitted changes and fix all compliance issues until APPROVE
```
**Invokes:** clean-architecture-guardian + typescript-pro

---

### Architecture Review Only (Default - Recommended)
```
Review uncommitted changes for architecture compliance.
Fix issues until APPROVE.
```
**Invokes:** clean-architecture-guardian only

**Use when:**
- You only moved code between layers
- You're fixing architecture violations
- Type safety not a concern (code already compiles)

---

### Type Safety Review Only (Rare)
```
Review uncommitted changes for type safety only.
Fix issues until APPROVE.
```
**Invokes:** typescript-pro only

**Use when:**
- Architecture is already compliant
- You only changed types/interfaces
- You want to focus exclusively on TypeScript patterns

---

### Review Only (No Fixes - You Fix Manually)
```
Review uncommitted changes for compliance.
Create todo list of issues but don't fix them yet.
```
**Invokes:** Reviewers create files, I create todos, but I don't fix

---

### Re-review After Manual Fixes
```
Re-review the changes - I fixed the issues from the last review
```
**Invokes:** Same reviewers as previous iteration

---

### Specific Files Only
```
Review these files for compliance and fix issues until APPROVE:
- src/domain/entities/Environment.ts
- src/application/useCases/SaveEnvironmentUseCase.ts
```
**Invokes:** clean-architecture-guardian (and optionally typescript-pro)

---

## 🔍 Tracking Progress with TodoWrite

I'll use the TodoWrite tool to show real-time progress:

### Initial Todo List
```markdown
## Compliance Review - Iteration 1

Status: 13 issues found

- [ ] Environment.ts:45 - Business logic in getter (CRITICAL)
- [ ] SaveEnvironmentUseCase.ts:23 - Missing return type (CRITICAL)
- [ ] ImportJob.ts:67 - Static utility method (CRITICAL)
- [ ] EnvironmentRepository.ts:34 - Domain depends on infrastructure (CRITICAL)
- [ ] EnvironmentRepository.ts:67 - Non-null assertion (MODERATE)
... (8 more)
```

### During Fixes
```markdown
## Compliance Review - Iteration 1

Status: Fixing issues (5/13 completed)

- [x] Environment.ts:45 - Business logic in getter ✅
- [x] SaveEnvironmentUseCase.ts:23 - Missing return type ✅
- [x] ImportJob.ts:67 - Static utility method ✅
- [x] EnvironmentRepository.ts:34 - Domain depends on infrastructure ✅
- [in_progress] EnvironmentRepository.ts:67 - Non-null assertion
- [ ] ImportJobFactory.ts:23 - Using `any` type
... (7 more)
```

### After Re-review
```markdown
## Compliance Review - Iteration 2

Status: 2 issues remaining from re-review

- [ ] Environment.ts:45 - Business logic still in presentation layer
- [ ] ImportJob.ts:23 - Static method not fully refactored
```

### Final
```markdown
## Compliance Review - Complete ✅

Status: APPROVE from all reviewers

Issues fixed: 13
Iterations: 2
Time: 45 minutes
```

---

## ⚠️ Common Scenarios

### Scenario 1: Never-Ending Loop

**Problem:**
```
Iteration 1: 10 issues → Fix all → Re-review
Iteration 2: 8 issues (some new!) → Fix all → Re-review
Iteration 3: 6 issues (still new ones!) → ...
```

**Why it happens:**
- Fixing one violation creates new violations
- Architectural debt is deep (band-aids on band-aids)

**Solution:**
```
You: "We're in a loop. Stop fixing and show me the pattern."

Me: [Analyzes issues]

"Pattern identified: All issues stem from domain entities
depending on infrastructure. This needs REFACTORING_WORKFLOW.md
with complete dependency inversion, not incremental fixes."
```

→ Switch to REFACTORING_WORKFLOW.md for major restructuring

---

### Scenario 2: REJECT Status

**What it means:**
```
Status: REJECT

Fundamental architecture violation:
Domain layer has direct dependency on presentation layer.
This violates Clean Architecture dependency rules.
```

**This is NOT fixable with simple edits.**

**Solution:**
1. Stop compliance review workflow
2. Switch to REFACTORING_WORKFLOW.md
3. Plan major refactoring (dependency inversion)
4. Execute refactoring incrementally
5. Then return to compliance review

---

### Scenario 3: Too Many Issues (20+)

**Problem:**
```
Review Results:
- 23 CRITICAL issues
- 45 MODERATE issues
- 12 MINOR issues

Total: 80 issues
```

**This will take 4+ hours to fix.**

**Solution - Prioritize:**
```
You: "Focus on CRITICAL issues only first.
     We'll do MODERATE and MINOR in separate session."

Me: [Fixes 23 CRITICAL issues]
[Gets to CHANGES REQUESTED with only MODERATE/MINOR remaining]

You: "Good. Commit this. We'll fix MODERATE issues tomorrow."
```

**Incremental compliance is OK** - don't need perfection in one session.

---

### Scenario 4: Conflicting Reviewer Advice

**Problem:**
```
clean-architecture-guardian says:
"Move sorting logic from mapper to domain service"

typescript-pro says:
"Mapper is correctly typed, no changes needed"
```

**Solution:**
1. clean-architecture-guardian wins on architecture decisions
2. typescript-pro wins on type safety decisions
3. If conflict, clean-architecture-guardian has final approval

**Rationale:** Type safety serves architecture, not vice versa.

---

## 💡 Pro Tips

### Tip 1: Start with CRITICAL Issues Only

Don't try to fix everything at once:

```
You: "Review and fix CRITICAL issues only.
     We'll do MODERATE and MINOR later."
```

This gets to APPROVE faster (only blocking issues fixed).

---

### Tip 2: Group Similar Issues

If you see pattern:
```
- Environment.ts:23 - Missing return type
- Solution.ts:45 - Missing return type
- ImportJob.ts:67 - Missing return type
... (8 more "missing return type")
```

Fix all at once:
```
Me: "I see 11 instances of missing return types.
     I'll fix all of them together."

[Fixes all 11 in one pass]
```

Faster than one-by-one.

---

### Tip 3: Compile Frequently During Fixes

Don't wait until all issues fixed:

```
[Fix 5 issues]
npm run compile ✅

[Fix 5 more issues]
npm run compile ✅

[Fix remaining 3 issues]
npm run compile ✅
```

Catches errors early (easier to debug).

---

### Tip 4: Commit After Each Iteration

After each re-review that shows progress:

```
Iteration 1: 13 issues → 3 issues
[Commit: "refactor: fix 10 compliance issues"]

Iteration 2: 3 issues → 0 issues
[Commit: "refactor: fix remaining 3 compliance issues"]
```

**Benefits:**
- Can rollback if iteration goes wrong
- Shows progress in git history
- Easier to review later

---

## 🚨 When to Stop and Switch Workflows

### Switch to REFACTORING_WORKFLOW.md if:
- ❌ REJECT status (fundamental violations)
- ❌ Loop never ends (new issues keep appearing)
- ❌ Issues require major restructuring (not simple fixes)

### Switch to NEW_FEATURE_WORKFLOW.md if:
- ❌ Fixing violations requires adding new features
- ❌ Need to redesign architecture from scratch

### Switch to BUG_FIX_WORKFLOW.md if:
- ❌ Compliance fixes break functionality
- ❌ Need to fix bugs before continuing compliance work

---

## 🔗 See Also

- [NEW_FEATURE_WORKFLOW.md](NEW_FEATURE_WORKFLOW.md) - Layer-by-layer development with reviews
- [REFACTORING_WORKFLOW.md](REFACTORING_WORKFLOW.md) - Incremental refactoring for major changes
- [BUG_FIX_WORKFLOW.md](BUG_FIX_WORKFLOW.md) - Quick bug fixes
- [AGENT_ROLES.md](../AGENT_ROLES.md) - Understanding reviewer vs implementer roles
- [CLAUDE.md](../../CLAUDE.md) - Coding rules and principles
- [ARCHITECTURE_GUIDE.md](../../docs/architecture/ARCHITECTURE_GUIDE.md) - Clean Architecture principles
