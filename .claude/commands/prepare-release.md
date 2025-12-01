# Prepare Release - Version Release Preparation

Prepares all required files for a new version release.

---

## PURPOSE

This command ensures all release artifacts are properly created before merging to main:
- Version bump in package.json
- CHANGELOG.md updated with release date
- Release notes file created in docs/releases/
- All tests pass
- Compilation succeeds

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

## STEP 6: CREATE RELEASE NOTES

Check if `docs/releases/vX.Y.Z.md` exists:

1. **If exists:** Show user and ask if they want to regenerate
2. **If missing:** Create from CHANGELOG content

**Release notes template:**
```markdown
# Release vX.Y.Z - [Title from CHANGELOG]

**Release Date:** YYYY-MM-DD
**Version:** X.Y.Z
**Type:** [Major/Minor/Patch] Release

---

## Overview

[Brief summary extracted from CHANGELOG]

---

## Changes

[Copy relevant section from CHANGELOG.md]

---

## Upgrade Notes

No breaking changes. Simply update to enjoy the improvements.
```

Extract the changes from CHANGELOG.md for this version and populate the template.

---

## STEP 7: COMMIT CHANGES

If any files were modified (package.json, CHANGELOG.md, README.md, release notes):

1. Show user what changed
2. Ask: "Commit these release preparation changes?"
3. If yes, commit with message:
   ```
   chore: prepare release vX.Y.Z

   - Update version in package.json
   - Update CHANGELOG.md date
   - Update README.md version badge
   - Add release notes
   ```

---

## STEP 8: SUMMARY

Show completion summary:

```
✅ Release vX.Y.Z Preparation Complete

Files updated:
- package.json (version: X.Y.Z)
- CHANGELOG.md (date updated)
- docs/releases/vX.Y.Z.md (created)

Next steps:
1. Push changes: git push
2. Create PR to main (if on feature branch)
3. After merge, create GitHub Release with tag vX.Y.Z
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

**"Release notes already exist"**
- Ask user if they want to overwrite
- Show diff if regenerating

---

## EXAMPLE USAGE

```
User: /prepare-release 0.2.1

Claude: Checking prerequisites...
✅ No uncommitted changes
✅ Compilation successful
✅ All 845 tests pass

Checking CHANGELOG.md...
✅ Found version section [0.2.1]
✅ Changes documented
📝 Updated date to 2025-11-25

Checking package.json...
✅ Version already 0.2.1

Creating release notes...
📝 Created docs/releases/v0.2.1.md

Commit these changes? (y/n)
```

---

## RELATED COMMANDS

- `/code-review` - Review code before release
- `/comprehensive-review` - Full production readiness assessment

---

## REFERENCES

- CLAUDE.md - Release checklist section
- docs/RELEASE_GUIDE.md - Full release process
- docs/releases/README.md - Release notes format guide
