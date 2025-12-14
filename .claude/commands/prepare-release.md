# Prepare Release - Version Release Preparation

Prepares all required files for a new version release.

---

## PURPOSE

This command ensures all release artifacts are properly created before merging to main:
- **Code review passed** (mandatory gate)
- Version bump in package.json
- CHANGELOG.md updated with release date
- Work tracking documents cleaned up
- All tests pass
- Coverage thresholds met
- Compilation succeeds

**Note:** Release notes live in CHANGELOG.md (single source of truth). GitHub releases should summarize highlights and link to CHANGELOG.

---

## ARGUMENTS

The command accepts an optional version number:
- `/prepare-release 0.2.1` - Prepare release for version 0.2.1
- `/prepare-release` - Will prompt for version number

---

## STEP 1: GET VERSION NUMBER

If version not provided as argument, ask:
"What version are you releasing? (e.g., 0.2.1)"

Validate version format: X.Y.Z (semver)

---

## STEP 2: RUN CODE REVIEW (Mandatory)

**Code review is mandatory before any PR to main.** This step ensures architectural compliance, type safety, and code quality.

1. **Invoke code-guardian agent:**
   Use the Task tool with `subagent_type='code-guardian'` to review all changes in the current branch compared to main.

2. **Review scope:**
   - Clean Architecture compliance (layer separation, dependency direction)
   - Type safety (no `any`, explicit returns)
   - Test coverage for changes
   - Code quality (no duplication, proper abstractions)
   - Security concerns

3. **Decision gate:**
   - If **APPROVED**: Continue to next step
   - If **CHANGES REQUESTED**: STOP and report required changes. User must fix issues and re-run `/prepare-release`

**Note:** This step cannot be skipped. Per CLAUDE.md: "Before PR | `/code-review` (mandatory)"

---

## STEP 3: CHECK PREREQUISITES

Run these checks and STOP if any fail:

1. **Check for uncommitted changes:**
   ```bash
   git status --porcelain
   ```
   If there are uncommitted changes, warn user and ask if they want to continue.

2. **Run compilation:**
   ```bash
   npm run compile
   ```
   If fails: Report error, STOP

3. **Run tests:**
   ```bash
   npm test
   ```
   If fails: Report error, STOP

4. **Run tests with coverage:**
   ```bash
   npm test -- --coverage
   ```

   **IMPORTANT: Display coverage summary explicitly:**
   ```
   Coverage Check:
   ✓ Global: 87.2% statements (threshold: 85%)
   ✓ Global: 82.1% branches (threshold: 80%)
   ✓ Domain: 96.3% statements (threshold: 95%)
   ✓ Application: 91.4% statements (threshold: 90%)
   ```

   If ANY threshold fails:
   - Show EXACTLY which threshold failed and by how much
   - Example: "✗ Domain: 93.2% statements (threshold: 95%) - FAILED by 1.8%"
   - STOP - coverage must be fixed before release

   Current thresholds (from jest.config.js):
   - Global: 85% statements, 85% lines, 85% functions, 80% branches
   - Domain: 95% statements/lines/functions, 90% branches
   - Application: 90% statements/lines/functions, 85% branches

---

## STEP 4: VERIFY CHANGELOG AGAINST COMMITS

**This step ensures the CHANGELOG accurately reflects what's being released.**

1. **Get all commits since main:**
   ```bash
   git log main..HEAD --oneline --no-merges
   ```

2. **Display commits to user:**
   ```
   Commits to be included in this release:
   - abc1234 feat: add new panel for X
   - def5678 fix: resolve null reference in Y
   - ghi9012 refactor: extract Z to domain service
   ```

3. **Read CHANGELOG.md** and cross-reference:
   - For each commit, verify there's a corresponding CHANGELOG entry
   - Group by category (Added, Changed, Fixed, etc.)
   - Flag any commits that appear missing

4. **Show comparison:**
   ```
   CHANGELOG entries found:
   - Added: New panel for X ← matches abc1234
   - Fixed: Null reference in Y ← matches def5678

   Potentially missing:
   - ghi9012 refactor: extract Z to domain service (may not need entry if internal)
   ```

5. **Require explicit confirmation:**
   Ask: "Does this CHANGELOG accurately reflect all user-facing changes? [y/n]"
   - If no: STOP - user must update CHANGELOG first
   - If yes: Continue to next step

**This step cannot be skipped.** The CHANGELOG is the user-facing record of changes.

---

## STEP 5: VERIFY CHANGELOG FORMAT

Read `CHANGELOG.md` and check:

1. **Version section exists:** Look for `## [X.Y.Z]` matching the target version
   - If missing: STOP and tell user to add changes to CHANGELOG first

2. **Has content:** The version section should have actual changes listed
   - If empty: STOP and tell user to document changes first

3. **Date placeholder:** Check if date shows placeholder or needs updating
   - Update date to today's date if needed: `## [X.Y.Z] - YYYY-MM-DD`

---

## STEP 6: CHECK/UPDATE PACKAGE.JSON VERSION

Read `package.json` and check version field:

1. If version matches target: Good, continue
2. If version differs: Update to target version
   ```json
   "version": "X.Y.Z"
   ```

---

## STEP 7: VERIFY README VERSION BADGE

Check `README.md` for version badge:

1. **Verify badge is dynamic:** Should use `github/package-json/v/joshsmithxrm/power-platform-developer-suite`
2. **If static badge found:** Convert to dynamic format:
   ```markdown
   ![version](https://img.shields.io/github/package-json/v/joshsmithxrm/power-platform-developer-suite)
   ```
3. **Dynamic badge auto-updates** from package.json on each push - no manual update needed

---

## STEP 8: CLEAN UP WORK TRACKING DOCUMENTS

Check for work tracking documents in `docs/work/`:

1. **List files:** `ls docs/work/*.md` (excluding README.md)
2. **If tracking docs exist for this branch/feature:**
   - Delete them with `git rm docs/work/[FEATURE]_TODO.md`
   - These are preserved in git history and no longer needed after release
3. **If no tracking docs:** Continue to next step

**Note:** Work tracking documents follow the pattern `docs/work/[FEATURE]_TODO.md` as defined in CLAUDE.md.

---

## STEP 9: COMMIT CHANGES

If any files were modified (package.json, CHANGELOG.md):

1. Show user what changed
2. Ask: "Commit these release preparation changes?"
3. If yes, commit with message:
   ```
   chore: prepare release vX.Y.Z

   - Update version in package.json
   - Update CHANGELOG.md date
   - Remove work tracking docs (if any)
   ```

---

## STEP 10: SUMMARY

Show completion summary:

```
✅ Release vX.Y.Z Preparation Complete

Files updated:
- package.json (version: X.Y.Z)
- CHANGELOG.md (date updated)
- docs/work/[FEATURE]_TODO.md (removed, if existed)

Next steps:
1. Push changes: git push
2. Create PR to main (if on feature branch)
3. After merge, create GitHub Release:
   - Tag: vX.Y.Z
   - Title: vX.Y.Z - [Brief description]
   - Body: Summary of highlights + "See CHANGELOG.md for full details"
4. GitHub Actions will auto-publish to marketplace
```

---

## ERROR HANDLING

**"Code review: CHANGES REQUESTED"**
- Address all issues raised by code-guardian
- Re-run `/prepare-release` after fixes
- Code review must pass before release can proceed

**"CHANGELOG missing version section"**
- User must add changes to CHANGELOG.md first
- Show example of expected format

**"Tests failing"**
- Fix tests before preparing release
- Run `npm test` to see failures

**"Compilation errors"**
- Fix TypeScript errors first
- Run `npm run compile` to see errors

---

## EXAMPLE USAGE

```
User: /prepare-release 0.4.0

Claude: Running code review (mandatory)...
[Invokes code-guardian agent to review changes]
✅ Code Review: APPROVED

Checking prerequisites...
✅ No uncommitted changes
✅ Compilation successful
✅ All tests pass
✅ Coverage thresholds met

Checking CHANGELOG.md...
✅ Found version section [0.4.0]
✅ Changes documented
📝 Updated date to 2025-12-15

Checking package.json...
📝 Updated version to 0.4.0

Cleaning up work tracking...
🗑️ Removed docs/work/DEPLOYMENT_SETTINGS_TODO.md

Commit these changes? (y/n)
```

---

## GITHUB RELEASE NOTES

When creating the GitHub release after merge, write a brief summary:

```markdown
## Highlights

- [Main feature 1]
- [Main feature 2]
- [Key bug fixes]

See [CHANGELOG.md](https://github.com/joshsmithxrm/power-platform-developer-suite/blob/main/CHANGELOG.md) for full details.
```

This avoids duplication while giving users a quick overview on the release page.

---

## RELATED COMMANDS

- `/code-review` - Standalone code review (now built into prepare-release as Step 2)
- `/comprehensive-review` - Full production readiness assessment (quarterly, pre-production)

---

## REFERENCES

- CLAUDE.md - Release checklist section
- docs/RELEASE_GUIDE.md - Full release process
- CHANGELOG.md - Single source of truth for release notes
