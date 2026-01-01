# Prepare Release - Version Release Preparation

Prepares all required files for a new version release.

---

## Purpose

Ensures all release artifacts are properly created before merging to main:
- Version bump in package.json
- CHANGELOG.md updated with release date
- All tests pass
- Compilation succeeds

---

## Arguments

```
/prepare-release 0.2.1    # Prepare release for version 0.2.1
/prepare-release          # Will prompt for version number
```

---

## Step 1: Get Version Number

If version not provided, ask: "What version are you releasing? (e.g., 0.2.1)"

Validate format: X.Y.Z (semver)

---

## Step 2: Run PR Checks

Same as `/prepare-pr`:
1. Check for uncommitted changes
2. Run `npm run compile`
3. Run `npm test -- --coverage`

If any fail: STOP

---

## Step 3: Verify CHANGELOG

1. Get commits since main
2. Cross-reference with CHANGELOG.md
3. Ask: "Does CHANGELOG accurately reflect all user-facing changes? [y/n]"

---

## Step 4: Update CHANGELOG Date

Update the version section date:
```markdown
## [X.Y.Z] - YYYY-MM-DD
```

---

## Step 5: Update package.json Version

```json
"version": "X.Y.Z"
```

---

## Step 6: Commit Changes

If files were modified:
```
chore: prepare release vX.Y.Z

- Update version in package.json
- Update CHANGELOG.md date
```

---

## Step 7: Summary

```
✅ Release vX.Y.Z Preparation Complete

Files updated:
- package.json (version: X.Y.Z)
- CHANGELOG.md (date updated)

Next steps:
1. Push changes: git push
2. Create PR to main
3. After merge, create GitHub Release with tag vX.Y.Z
```

---

## GitHub Release Notes

When creating the GitHub release after merge:

```markdown
## Highlights

- [Main feature 1]
- [Main feature 2]

See [CHANGELOG.md](link) for full details.
```
