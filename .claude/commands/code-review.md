# Code Review

Invoke code-guardian agent for comprehensive architecture review and approval.

## Usage

`/code-review [scope]`

If `$ARGUMENTS` not provided, ask for scope:
- `uncommitted` - Uncommitted changes (default)
- `committed` - Last commit
- `last-N` - Last N commits (e.g., `last-3`)
- `branch` - All commits on branch vs main
- `feature/NAME` - Specific feature directory

## Prerequisites

Before invoking code-guardian, verify:
1. `npm run compile` - Must pass
2. `npm test` - Must pass
3. Manual testing with F5 - Ask user to confirm

Stop if any prerequisite fails.

## Process

1. **Get changed files** based on scope (git diff/show commands)

2. **Invoke code-guardian** via Task tool:
   ```
   Review these changes for approval.

   Scope: [description]
   Changed files: [list]
   Prerequisites: compile ✓, tests ✓, manual testing ✓

   Review for:
   - Clean Architecture (rich domain, layer separation, dependency direction)
   - Type safety (no any, explicit returns, null handling)
   - Test coverage (domain 100%, use cases 90%)
   - Code quality (logging at boundaries, no console.log)

   Decision: APPROVE or CHANGES REQUESTED
   ```

3. **Return decision** to user

## Decisions

- **APPROVED**: Ready to commit/merge
- **CHANGES REQUESTED**: Fix issues, re-run prerequisites, re-run /code-review

## What code-guardian Checks

| Layer | Checks |
|-------|--------|
| Domain | Rich models with behavior, zero dependencies, no logging |
| Application | Use cases orchestrate only, ViewModels are DTOs, boundary logging |
| Infrastructure | Implements domain interfaces, handles external APIs |
| Presentation | Uses use cases, no business logic, no direct repo calls |
| General | No `any`, explicit returns, JSDoc on public APIs, tests exist |
