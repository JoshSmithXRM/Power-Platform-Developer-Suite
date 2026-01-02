# Prepare PR - Pre-Pull Request Validation

Validates that a branch is ready for a pull request to main.

---

## Purpose

Catches issues BEFORE creating a PR, preventing CI failures. Use before ANY PR to main.

---

## Step 1: Check Uncommitted Changes

```bash
git status --porcelain
```

- If clean: Continue
- If uncommitted changes: Warn user, ask if they want to continue or commit first

---

## Step 2: Run Compilation

```bash
npm run compile
```

If fails: Show error, STOP

---

## Step 3: Run Tests with Coverage

```bash
npm test -- --coverage
```

Display coverage summary. If any threshold fails: STOP

---

## Step 4: Verify CHANGELOG

1. Get commits since main:
   ```bash
   git log main..HEAD --oneline --no-merges
   ```

2. Read CHANGELOG.md and cross-reference commits

3. Ask: "Does the CHANGELOG accurately reflect all user-facing changes? [y/n]"
   - If no: STOP - tell user to update CHANGELOG
   - If yes: Continue

**What needs CHANGELOG entries:**
- ✓ New features (feat:)
- ✓ Bug fixes (fix:)
- ✓ Breaking changes
- ✗ Tests, CI, refactoring (internal)

---

## Step 5: Summary

Show final status:

```
PR Readiness Check Complete
===========================

✓ Uncommitted changes: None
✓ Compilation: Passed
✓ Tests: All passed
✓ Coverage: Thresholds met
✓ CHANGELOG: Verified

Ready to create PR!
```

---

## Difference from /prepare-release

| Aspect | /prepare-pr | /prepare-release |
|--------|-------------|------------------|
| When | Any PR to main | Version releases only |
| Version bump | No | Yes |
| CHANGELOG date | No change | Updates date |
