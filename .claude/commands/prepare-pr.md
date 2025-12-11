# Prepare PR - Pre-Pull Request Validation

Validates that a branch is ready for a pull request to main.

---

## PURPOSE

This command catches issues BEFORE creating a PR, preventing CI failures and wasted review cycles. Use before ANY PR to main, not just releases.

**What it checks:**
- Compilation succeeds
- All tests pass
- Coverage thresholds met (with explicit numbers)
- CHANGELOG updated and matches commits
- No uncommitted changes

**When to use:**
- Before creating any PR to main
- After finishing implementation, before `/code-review`
- When you want to verify everything is ready

---

## STEP 1: CHECK UNCOMMITTED CHANGES

```bash
git status --porcelain
```

- If clean: Continue
- If uncommitted changes: WARN user and ask if they want to continue or commit first

---

## STEP 2: RUN COMPILATION

```bash
npm run compile
```

**Output:**
```
Compilation Check:
✓ TypeScript compilation successful
✓ ESLint passed
```

If fails: Show error, STOP

---

## STEP 3: RUN TESTS WITH COVERAGE

```bash
npm test -- --coverage
```

**IMPORTANT: Display coverage summary with actual numbers:**

```
Test Results:
✓ 8030 tests passed (0 failed)

Coverage Check:
✓ Global statements: 87.2% (threshold: 85%)
✓ Global branches: 82.1% (threshold: 80%)
✓ Global functions: 86.5% (threshold: 85%)
✓ Global lines: 87.0% (threshold: 85%)
✓ Domain statements: 96.3% (threshold: 95%)
✓ Application statements: 91.4% (threshold: 90%)
```

If ANY threshold fails:
- Show EXACTLY which threshold failed
- Example: `✗ Domain statements: 93.2% (threshold: 95%) - FAILED by 1.8%`
- STOP - coverage must be fixed before PR

---

## STEP 4: RUN E2E SMOKE TESTS

```bash
npm run e2e:smoke
```

**Purpose:** Verify extension loads, commands register, and basic UI works.

**Output:**
```
E2E Smoke Tests:
✓ Extension activates successfully
✓ Commands registered
✓ Screenshots captured to e2e/screenshots/
```

**If fails:**
- Check `e2e/screenshots/` for visual state
- Check `e2e/results/claude-results.json` for detailed logs
- Common issues: Panel initialization, missing dependencies, webview errors

**Note:** E2E tests are supplementary to F5 testing, not a replacement.
Skip this step if E2E infrastructure is not set up or if changes don't affect UI.

---

## STEP 5: VERIFY CHANGELOG AGAINST COMMITS

**This is the critical step that prevents incomplete CHANGELOGs.**

1. **Get commits since main:**
   ```bash
   git log main..HEAD --oneline --no-merges
   ```

2. **Display commits:**
   ```
   Commits on this branch (5 total):
   - abc1234 feat: add new panel for X
   - def5678 fix: resolve null reference in Y
   - ghi9012 refactor: extract Z to domain service
   - jkl3456 test: add tests for Z
   - mno7890 docs: update README
   ```

3. **Read CHANGELOG.md** and show relevant entries:
   ```
   CHANGELOG [Unreleased] section:
   ### Added
   - New panel for X

   ### Fixed
   - Null reference in Y
   ```

4. **Cross-reference and flag potential gaps:**
   ```
   Commit → CHANGELOG mapping:
   ✓ abc1234 feat: add new panel for X → Added: New panel for X
   ✓ def5678 fix: resolve null reference in Y → Fixed: Null reference in Y
   ? ghi9012 refactor: extract Z to domain service → (internal, may not need entry)
   ? jkl3456 test: add tests for Z → (tests, typically not in CHANGELOG)
   ? mno7890 docs: update README → (docs, may not need entry)
   ```

5. **Require explicit confirmation:**

   Ask: "Does the CHANGELOG accurately reflect all user-facing changes? [y/n]"

   - If no: STOP - tell user to update CHANGELOG under [Unreleased]
   - If yes: Continue

**Guidance on what needs CHANGELOG entries:**
- ✓ New features (feat:)
- ✓ Bug fixes (fix:)
- ✓ Breaking changes
- ✓ Deprecations
- ? Refactoring (only if user-visible behavior changed)
- ? Documentation (only if significant user docs)
- ✗ Tests (internal)
- ✗ CI/tooling changes (internal)
- ✗ Code style/formatting (internal)

---

## STEP 6: CODE REVIEW (Mandatory)

**Prerequisites from Steps 1-5 must pass before code review.**

1. **Invoke code-guardian agent:**
   Use the Task tool with `subagent_type='code-guardian'` to review all changes.

2. **Review scope:**
   - Clean Architecture compliance (layer separation, dependency direction)
   - Type safety (no `any`, explicit returns)
   - Test coverage for changes
   - Code quality (no duplication, proper abstractions)

3. **Decision gate:**
   - If **APPROVED**: Continue to summary
   - If **CHANGES REQUESTED**: STOP and report required changes

---

## STEP 7: SUMMARY

Show final status:

```
PR Readiness Check Complete
===========================

✓ Uncommitted changes: None
✓ Compilation: Passed
✓ Tests: 8030 passed
✓ Coverage: All thresholds met
✓ E2E Smoke: Passed
✓ CHANGELOG: Verified against 5 commits
✓ Code Review: APPROVED

Ready to create PR!

Next step:
Create PR: gh pr create --title "..." --body "..."
```

If any check failed:
```
PR Readiness Check: FAILED
==========================

✓ Uncommitted changes: None
✓ Compilation: Passed
✗ Coverage: Domain statements 93.2% (threshold: 95%)
- E2E Smoke: Not run (blocked by earlier failure)
- CHANGELOG: Not checked (blocked by earlier failure)
- Code Review: Not run (blocked by earlier failure)

Fix the issues above and re-run /prepare-pr
```

---

## ERROR HANDLING

**"Coverage threshold not met"**
- Write more tests for uncovered code
- Focus on the specific area that failed (domain, application, etc.)
- Run `npm test -- --coverage --collectCoverageFrom='src/features/X/**'` to focus

**"CHANGELOG missing entries"**
- Add entries under `## [Unreleased]` section
- Follow Keep a Changelog format
- Only document user-facing changes

**"Compilation failed"**
- Fix TypeScript errors first
- Run `npm run compile` to see full error output

---

## DIFFERENCE FROM /prepare-release

| Aspect | /prepare-pr | /prepare-release |
|--------|-------------|------------------|
| **When** | Any PR to main | Version releases only |
| **Code review** | Includes code-guardian | Includes code-guardian |
| **E2E smoke tests** | Yes (if applicable) | Yes (if applicable) |
| **Version bump** | No | Yes |
| **CHANGELOG date** | No change | Updates date |
| **Package.json** | No change | Updates version |
| **README badge** | No check | Verifies dynamic badge |
| **Work tracking cleanup** | No | Removes docs/work/*.md |

**Typical flow:**
- **Regular PRs:** `/prepare-pr` → Create PR
- **Release PRs:** `/prepare-release X.Y.Z` → Create PR

---

## RELATED COMMANDS

- `/code-review` - Standalone architecture review (now included in /prepare-pr)
- `/prepare-release` - Full release preparation (includes everything + version bump)
- `/handoff` - Session summary for context transfer

---

## EXAMPLE USAGE

```
User: /prepare-pr

Claude: Checking PR readiness...

Step 1: Uncommitted changes
✓ Working directory clean

Step 2: Compilation
Running npm run compile...
✓ TypeScript compilation successful
✓ ESLint passed

Step 3: Tests with coverage
Running npm test -- --coverage...
✓ 8030 tests passed

Coverage Check:
✓ Global statements: 87.2% (threshold: 85%)
✓ Global branches: 82.1% (threshold: 80%)
✓ Domain statements: 96.3% (threshold: 95%)
✓ Application statements: 91.4% (threshold: 90%)

Step 4: E2E Smoke Tests
Running npm run e2e:smoke...
✓ Extension activates
✓ Commands registered
✓ Screenshots saved

Step 5: CHANGELOG verification
Commits on this branch (3 total):
- abc1234 feat: add deployment settings panel
- def5678 fix: environment switching race condition
- ghi9012 test: add deployment settings tests

CHANGELOG [Unreleased] section:
### Added
- Deployment Settings panel for managing environment variables

### Fixed
- Race condition when switching environments

Commit → CHANGELOG mapping:
✓ abc1234 → Added: Deployment Settings panel
✓ def5678 → Fixed: Race condition
? ghi9012 → (tests, not needed in CHANGELOG)

Does the CHANGELOG accurately reflect all user-facing changes? [y/n]

User: y

Claude: Step 6: Code Review
Running code-guardian review...
[Invokes code-guardian agent]
✓ Code Review: APPROVED

PR Readiness Check Complete
===========================

✓ Uncommitted changes: None
✓ Compilation: Passed
✓ Tests: 8030 passed
✓ Coverage: All thresholds met
✓ E2E Smoke: Passed
✓ CHANGELOG: Verified against 3 commits
✓ Code Review: APPROVED

Ready to create PR!

Next step:
Create PR: gh pr create --title "..." --body "..."
```
