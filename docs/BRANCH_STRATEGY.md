# Branch Strategy

**Branching and merge conventions for the Power Platform Developer Suite.**

---

## Branch Naming Conventions

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features and enhancements | `feature/data-explorer-panel` |
| `fix/` | Bug fixes | `fix/solution-import-error` |
| `docs/` | Documentation changes | `docs/alm-documentation-review` |
| `hotfix/` | Urgent production fixes | `hotfix/critical-auth-failure` |
| `chore/` | Maintenance, dependencies, tooling | `chore/update-dependencies` |

### Naming Rules

- Use lowercase with hyphens: `feature/my-feature` not `feature/MyFeature`
- Be descriptive but concise: `feature/environment-variables` not `feature/env-vars`
- Include ticket/issue number when applicable: `fix/123-null-reference-error`

---

## Branch Workflow

```
main (protected)
  │
  ├── feature/new-panel ──────────► PR ──► merge to main
  │
  ├── fix/bug-123 ────────────────► PR ──► merge to main
  │
  └── hotfix/critical-issue ──────► PR ──► merge to main (expedited review)
```

### Rules

1. **No direct commits to main** - All changes via pull request
2. **Branch from main** - Always branch from latest main
3. **Keep branches short-lived** - Merge or close within days, not weeks
4. **Delete after merge** - Clean up merged branches (see below)

### Branch Deletion After Merge

**Always delete branches after merge.** GitHub auto-deletes branches when configured (Settings > General > "Automatically delete head branches").

**Why delete:**
- Reduces branch clutter (stale branches confuse contributors)
- Signals work is complete (no ambiguity about branch status)
- Branch history preserved in merge commit (nothing lost)
- Forces clean workflow (new work = new branch from main)

**Why NOT keep branches:**
- "In case we need it" - The merge commit preserves all history
- "For reference" - Use tags for releases, not branches
- "Still working on it" - Then don't merge yet

**Recovery:** If you accidentally delete a branch, the commits still exist. Use `git reflog` or find the merge commit.

---

## Merge Strategy

### Default: Regular Merge

Use regular merge commits for most PRs.

**Why:**
- Maintains collaboration history when multiple contributors work on a PR
- Enables surgical cherry-picks and reverts of individual commits
- Supports `git bisect` for regression hunting

**Viewing history:**
```bash
# Full history with all commits
git log --oneline

# Clean first-parent view (like squash but preserves detail)
git log --oneline --first-parent
```

### When to Squash Merge

Use squash merge for:
- Single-commit or trivial changes (typo fixes, config updates)
- PRs with messy/WIP commit history that wasn't cleaned up
- "Oops" fixes that don't warrant their own merge commit

### Never Force Push to Main

Force pushing to main is prohibited. If you need to fix something on main, create a new PR.

---

## Pull Request Requirements

### Before Opening PR

- [ ] All tests pass (`npm test`)
- [ ] Compilation succeeds (`npm run compile`)
- [ ] Manual testing completed (F5 in VS Code)
- [ ] CHANGELOG.md updated (if user-facing changes)

### PR Validation Pipeline

The `pr-validation.yml` workflow runs automatically:
- TypeScript compilation
- ESLint checks
- Unit tests
- E2E smoke tests

All checks must pass before merge.

### PR Description

Use this format:
```markdown
## Summary
Brief description of what this PR does.

## Changes
- List of key changes
- Organized by area/layer

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests (if applicable)
- [ ] E2E tests (if UI/workflow changes)
- [ ] Manual testing completed

## Related Issues
Closes #123 (if applicable)
```

---

## Release Process

### No Release Branches

We release directly from main using tags. Release branches add unnecessary complexity.

### Version Workflow

1. **During development:** `package.json` always has production version
2. **Before release PR:** Run `/prepare-release` command
   - Bumps version in `package.json`
   - Updates version in `README.md`
   - Updates `CHANGELOG.md` date
   - Creates release notes in `docs/releases/`
3. **After merge to main:** Create GitHub Release with tag `vX.X.X`
4. **GitHub Actions:** Automatically publishes to VS Code Marketplace

See [Release Guide](RELEASE_GUIDE.md) for detailed steps.

---

## Hotfix Process

For critical production issues requiring immediate fix:

1. **Branch:** `hotfix/description` from main
2. **Fix:** Minimal change to address issue
3. **Test:** Focused testing on the fix
4. **PR:** Expedited review (can be self-reviewed if truly urgent)
5. **Release:** Immediate version bump and release

Hotfixes skip the full 9-phase workflow but still require:
- Tests pass
- Compilation succeeds
- PR (no direct commits)

---

## Dependabot Configuration

### Auto-Merge Policy

| Update Type | Auto-Merge |
|-------------|------------|
| Patch versions (1.2.3 → 1.2.4) | ✅ Yes |
| Dev dependencies | ✅ Yes |
| Minor versions (1.2.0 → 1.3.0) | ❌ No - review required |
| Major versions (1.0.0 → 2.0.0) | ❌ No - review required |

### Configuration

Dependabot is configured in `.github/dependabot.yml` to:
- Check weekly for updates
- Group minor/patch updates where safe
- Require manual review for breaking changes

---

## Branch Protection (GitHub Settings)

### Main Branch Protection

Configure in GitHub repository settings:

- [x] Require pull request before merging
- [x] Require status checks to pass
  - [x] `build` (compilation)
  - [x] `test` (unit tests)
  - [x] `lint` (ESLint)
  - [x] `e2e` (smoke tests)
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings
- [ ] Require approvals (enable when team grows)

### Allowed Merge Methods

- [x] Allow merge commits (default)
- [x] Allow squash merging (for small PRs)
- [ ] Allow rebase merging (disabled - prefer merge commits)

---

## Git Worktrees (Parallel Development)

For working on multiple features simultaneously:

```bash
# Create worktree for second feature
git worktree add ../power-platform-feature-b feature/feature-b

# List worktrees
git worktree list

# Remove when done
git worktree remove ../power-platform-feature-b
```

**When to use:**
- Urgent hotfix while mid-feature
- Context switching between unrelated features
- Long-running feature that shouldn't block other work

---

## Quick Reference

| Action | Command |
|--------|---------|
| Create feature branch | `git checkout -b feature/name main` |
| Push and set upstream | `git push -u origin feature/name` |
| Create PR | `gh pr create --title "..." --body "..."` |
| Merge PR (regular) | Via GitHub UI or `gh pr merge --merge` |
| Merge PR (squash) | Via GitHub UI or `gh pr merge --squash` |
| Delete remote branch | `git push origin --delete feature/name` |
| Clean local branches | `git fetch --prune && git branch -d feature/name` |
