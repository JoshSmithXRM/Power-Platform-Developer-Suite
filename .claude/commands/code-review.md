# Code Review - Comprehensive Architecture Review

Invokes the code-guardian agent to perform comprehensive code review for approval.

---

## PURPOSE

This command invokes the **code-guardian** agent to review code for:
- Clean Architecture compliance
- SOLID principles
- Type safety
- Missing abstractions
- Security issues
- Test coverage
- Code quality

Agent provides final decision: APPROVE or CHANGES REQUESTED

---

## SCOPE

Ask user if not specified:

1. uncommitted - All uncommitted changes (default)
2. committed - Last commit only
3. last-N - Last N commits (e.g., last-3)
4. branch - All commits on current branch vs main
5. feature/NAME - Specific feature directory
6. Custom - Specific commit SHA or path

---

## STEP 1: DETERMINE SCOPE

If user didn't specify scope, ask:
"What scope should I review? (uncommitted/committed/last-N/branch/feature/custom)"

Get changed files based on scope:
- uncommitted: git diff --name-only HEAD
- committed: git show --name-only --format="" HEAD
- last-N: git diff --name-only HEAD~N..HEAD
- branch: git diff --name-only main...HEAD
- feature: git diff --name-only HEAD -- src/features/FEATURE/

---

## STEP 2: CHECK PREREQUISITES

Run these checks in sequence:

1. Check compilation:
   npm run compile
   If fails: Report error, stop process

2. Check tests:
   npm test
   If fails: Report error, stop process

3. Ask about manual testing:
   "Have you tested these changes manually with F5 in VS Code?"
   If no: Request manual testing, stop process

Only proceed if ALL prerequisites pass.

---

## STEP 3: INVOKE CODE-GUARDIAN

Use the Task tool to invoke code-guardian agent with this prompt:

"Review the following changes for approval.

SCOPE: [describe scope - e.g., Last commit, uncommitted changes, etc.]

CHANGED FILES:
[list of files from git command]

PREREQUISITES:
- Compilation: Passed
- Tests: Passed
- Manual Testing: Confirmed by user

REVIEW FOCUS:
Perform comprehensive review covering:
1. Clean Architecture compliance (rich domain models, layer separation, dependencies point inward)
2. SOLID principles (Single Responsibility, Dependency Inversion, etc.)
3. Type safety (no any types, explicit return types, proper null handling)
4. Missing abstractions (anemic models, business logic in wrong layer, duplication)
5. Security issues (secrets in logs, validation, error handling)
6. Test coverage (domain 100% target, use cases 90% target)
7. Code quality (logging at boundaries, comment quality, no console.log)

Provide final decision: APPROVE or CHANGES REQUESTED with specific actionable feedback."

---

## STEP 4: RETURN AGENT DECISION

The code-guardian agent will provide one of:

APPROVED - Code meets all standards, ready to commit
CHANGES REQUESTED - Critical issues must be fixed before approval

Show the agent's full response to the user.

If CHANGES REQUESTED:
- Tell user to fix critical issues
- Run npm run compile and npm test
- Re-run this command for re-approval

If APPROVED:
- Tell user code is ready to commit/merge

---

## WHAT CODE-GUARDIAN REVIEWS

The agent checks:

DOMAIN LAYER:
- Rich models with behavior (not anemic data structures)
- Zero external dependencies
- Repository interfaces defined in domain
- No logging in domain

APPLICATION LAYER:
- Use cases orchestrate only (no business logic)
- ViewModels are DTOs (no behavior)
- Mappers transform only (no business decisions)
- Logging at use case boundaries

INFRASTRUCTURE LAYER:
- Repositories implement domain interfaces
- Handle external API calls
- No business logic

PRESENTATION LAYER:
- Panels use use cases
- Event handlers call use cases only
- No business logic in panels
- No direct repository calls

TYPE SAFETY:
- No any types
- Explicit return types on public methods
- Proper null handling (no non-null assertions)

TESTS:
- Domain entities have tests (100% target)
- Use cases have tests (90% target)
- Tests pass
- Tests use NullLogger

CODE QUALITY:
- JSDoc on public/protected methods
- Why comments for non-obvious code
- No placeholder comments
- No duplication (3+ times)
- No console.log in production code

SECURITY:
- Secrets redacted in logs
- Proper validation
- Safe error handling

---

## COMMON VIOLATIONS DETECTED

Agent will catch:
- Anemic domain models (interfaces or classes with only getters)
- Business logic in use cases (calculations, validations)
- Domain depending on infrastructure
- Logging in domain layer
- Using any types
- Missing tests for domain/use cases
- Placeholder comments
- console.log in production code

---

## WORKFLOW INTEGRATION

This command is used AFTER implementation, BEFORE committing:

1. Implement feature (domain -> app -> infra -> presentation)
2. Write tests
3. Run this command (get approval)
4. Fix any issues if CHANGES REQUESTED
5. Re-run until APPROVED
6. Commit code

---

## EXAMPLE USAGE

User: /code-review uncommitted
System: Checks prerequisites, invokes code-guardian, returns decision

User: /code-review committed
System: Reviews last commit

User: /code-review last-3
System: Reviews last 3 commits

User: /code-review feature/importJobs
System: Reviews specific feature directory

---

## TROUBLESHOOTING

"Code doesn't compile":
- Fix compilation errors first
- Run npm run compile until it passes
- Then re-run code-review

"Tests fail":
- Fix failing tests first
- Run npm test until all pass
- Then re-run code-review

"Too many changes":
- Break into smaller commits
- Review each commit separately
- Better: Commit per layer

---

## REFERENCES

Agent reviews against these standards:
- CLAUDE.md - Project coding rules
- docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md - Architecture patterns
- docs/architecture/CODE_QUALITY_GUIDE.md - Code quality standards
- docs/architecture/LOGGING_GUIDE.md - Logging by layer
- docs/testing/TESTING_GUIDE.md - Testing expectations

---

## EXPECTED DURATION

- Prerequisites: 1-2 minutes
- Agent review: 5-15 minutes
- Total: 10-20 minutes for typical feature

Worth it because catches issues before commit and maintains quality standards.
