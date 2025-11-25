# Code Review Gateway Skill

**Auto-discovered when:** Feature implementation appears complete and ready for review

**Purpose:** Detect when code is ready for review and invoke code-guardian agent

**Invoked:** Automatically by Claude when implementation patterns indicate feature is complete

---

## When Claude Should Invoke This Skill

**✅ AUTO-INVOKE when Claude detects:**
- All 4 layers implemented (domain → app → infra → presentation)
- Tests written for domain and application layers
- Code compiles (`npm run compile` passes)
- Tests pass (`npm test` passes)
- User says "feature is done" or "ready for review"
- Last commit message indicates completion ("feat: ...", "Implement...")

**✅ USER explicitly requests:**
- "Review this code"
- "Is this ready for production?"
- "Check if I followed Clean Architecture"
- "Invoke code-guardian"

**❌ DON'T INVOKE when:**
- Feature incomplete (only domain or app layer done)
- Tests not written yet
- Code doesn't compile
- Tests failing
- User explicitly says "work in progress" or "not ready"
- In middle of refactoring

---

## Detection Criteria

### Ready for Review When:
1. ✅ All layers present:
   - `src/features/*/domain/*.ts` exists
   - `src/features/*/application/*.ts` exists
   - `src/features/*/infrastructure/*.ts` OR panel integration complete
   - `src/presentation/panels/*Panel.ts` exists (if UI feature)

2. ✅ Tests exist:
   - `src/features/*/domain/**/*.test.ts` files present
   - `src/features/*/application/**/*.test.ts` files present

3. ✅ Code quality:
   - `npm run compile` passes
   - `npm test` passes
   - No console.log in production code (ran cleanup-code skill)

4. ✅ User confirmation:
   - Manual testing complete (F5 testing done)
   - User says "ready" or "done" or "review"

### Not Ready When:
- ❌ Only partial implementation (domain + app, but no infra/presentation)
- ❌ No tests written
- ❌ Compilation errors
- ❌ Test failures
- ❌ User says "WIP" or "not done"

---

## Skill Process

**1. Check Prerequisites**
```bash
npm run compile  # Must pass
npm test         # Must pass
```

**2. Ask User about Manual Testing**
"Have you tested this feature manually with F5 in VS Code?"
- If NO: Request manual testing, don't proceed
- If YES: Continue to review

**3. Invoke code-guardian Agent**
Use Task tool to launch code-guardian with:
- Scope (uncommitted changes, last commit, feature directory)
- Changed files
- Prerequisites status (compile passed, tests passed, manual testing confirmed)

**4. Return Agent Decision**
- APPROVED ✅ → Code ready to commit/merge
- CHANGES REQUESTED ⚠️ → Fix issues, re-review

---

## code-guardian Agent Responsibilities

**Reviews:**
- Clean Architecture compliance (rich domain, layer separation, dependencies inward)
- SOLID principles
- Type safety (no any, explicit returns, proper null handling)
- Missing abstractions (anemic models, business logic in wrong layer)
- Security issues (secrets, validation, error handling)
- Test coverage (domain 100% target, use cases 90% target)
- Code quality (logging, comments, duplication)

**Output:** APPROVE or CHANGES REQUESTED with actionable feedback

---

## Typical Session

**Pre-Review Checks:** 1-2 minutes (compile + test)
**Agent Review:** 5-15 minutes (single feature)
**User Review:** 2-5 minutes (read findings)
**Total:** 10-25 minutes

---

## Differentiation from Comprehensive Review

| Single Agent Review (This Skill) | 8-Agent Comprehensive Review (/comprehensive-review) |
|----------------------------------|---------------------------------------------------|
| ✅ After each feature | ❌ Quarterly or pre-production only |
| ✅ 5-15 minutes | ❌ 15 minutes |
| ✅ 1x token cost | ❌ 8x token cost |
| ✅ 10-20 issues | ❌ 60-90 issues |
| ✅ Feature-scoped | ❌ Full codebase |
| ✅ code-guardian agent | ❌ 8 specialized agents |

**Use THIS skill for:** Regular feature reviews

**Use comprehensive review for:** Pre-production gates, quarterly audits, post-major-refactor

---

## Linked Resources

- Full Command: `.claude/commands/code-review.md`
- Agent: `.claude/agents/code-guardian.md`
- Standards: `CLAUDE.md`, `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- Comprehensive Review: `.claude/commands/comprehensive-review.md`

---

## Success Patterns

**Good Review Session:**
- Prerequisites pass
- Agent finds 5-15 meaningful issues
- Issues are specific and actionable
- User fixes critical issues
- Re-review approves
- Commit with confidence

**Red Flags:**
- Prerequisites fail (compile/test errors)
- Agent finds >50 issues (feature not ready)
- Issues are vague ("code quality could be better")
- User ignores critical findings

---

## Integration with Workflow

**Feature Development Flow:**
1. Design (if complex) → design-architect
2. Implement (domain → app → infra → presentation)
3. Write tests (domain + use cases)
4. **→ THIS SKILL auto-detects completion →**
5. Invoke code-guardian agent
6. Fix critical issues
7. Get APPROVE
8. Commit

**This skill bridges implementation → review automatically**

---

## Example Auto-Detection

**Claude observes:**
```
User just ran:
- npm run compile ✅ Passed
- npm test ✅ Passed

User said: "Alright, I think the metadata browser feature is done"

Git status shows:
- src/features/metadataBrowser/domain/*.ts (modified)
- src/features/metadataBrowser/application/*.ts (modified)
- src/features/metadataBrowser/infrastructure/*.ts (modified)
- src/presentation/panels/MetadataBrowserPanel.ts (modified)
- Tests in domain and application layers

Context: Feature spans all 4 layers, has tests, compiles, tests pass
```

**Claude action:**
"I notice the metadata browser feature appears complete (all 4 layers implemented, tests passing). Before committing, I should invoke the code-guardian agent for review. Have you tested this feature manually with F5?"

User: "Yes, tested thoroughly"

Claude: *Invokes code-guardian via Task tool*

---

## Notes

- This is a **gateway skill** - it doesn't do the review, it detects readiness and invokes the specialist (code-guardian agent)
- Auto-discovery reduces mental overhead (user doesn't need to remember to run review)
- Lightweight check (1-2 min prerequisites) before expensive review (5-15 min agent)
- Prevents wasting agent time on incomplete/broken code
