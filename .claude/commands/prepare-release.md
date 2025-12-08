# Prepare Release - Version Release Preparation

Prepares all required files for a new version release.

---

## PURPOSE

This command ensures all release artifacts are properly created before merging to main:
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

## STEP 2: CHECK PREREQUISITES

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
   If coverage thresholds not met: Report which thresholds failed, STOP

   Current thresholds (from jest.config.js):
   - Global: 85% statements, 85% lines, 85% functions, 80% branches
   - Domain: 95% statements/lines/functions, 90% branches
   - Application: 90% statements/lines/functions, 85% branches

---

## STEP 3: VERIFY CHANGELOG

Read `CHANGELOG.md` and check:

1. **Version section exists:** Look for `## [X.Y.Z]` matching the target version
   - If missing: STOP and tell user to add changes to CHANGELOG first

2. **Has content:** The version section should have actual changes listed
   - If empty: STOP and tell user to document changes first

3. **Date placeholder:** Check if date shows placeholder or needs updating
   - Update date to today's date if needed: `## [X.Y.Z] - YYYY-MM-DD`

---

## STEP 4: CHECK/UPDATE PACKAGE.JSON VERSION

Read `package.json` and check version field:

1. If version matches target: Good, continue
2. If version differs: Update to target version
   ```json
   "version": "X.Y.Z"
   ```

---

## STEP 5: VERIFY README VERSION BADGE

Check `README.md` for version badge:

1. **Verify badge is dynamic:** Should use `github/package-json/v/JoshSmithXRM/Power-Platform-Developer-Suite`
2. **If static badge found:** Convert to dynamic format:
   ```markdown
   ![version](https://img.shields.io/github/package-json/v/JoshSmithXRM/Power-Platform-Developer-Suite)
   ```
3. **Dynamic badge auto-updates** from package.json on each push - no manual update needed

---

## STEP 6: CLEAN UP WORK TRACKING DOCUMENTS

Check for work tracking documents in `docs/work/`:

1. **List files:** `ls docs/work/*.md` (excluding README.md)
2. **If tracking docs exist for this branch/feature:**
   - Delete them with `git rm docs/work/[FEATURE]_TODO.md`
   - These are preserved in git history and no longer needed after release
3. **If no tracking docs:** Continue to next step

**Note:** Work tracking documents follow the pattern `docs/work/[FEATURE]_TODO.md` as defined in CLAUDE.md.

---

## STEP 7: COMMIT CHANGES

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

## STEP 8: SUMMARY

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

Claude: Checking prerequisites...
✅ No uncommitted changes
✅ Compilation successful
✅ All tests pass

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

See [CHANGELOG.md](https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/blob/main/CHANGELOG.md) for full details.
```

This avoids duplication while giving users a quick overview on the release page.

---

## RELATED COMMANDS

- `/code-review` - Review code before release
- `/comprehensive-review` - Full production readiness assessment

---

## REFERENCES

- CLAUDE.md - Release checklist section
- docs/RELEASE_GUIDE.md - Full release process
- CHANGELOG.md - Single source of truth for release notes
