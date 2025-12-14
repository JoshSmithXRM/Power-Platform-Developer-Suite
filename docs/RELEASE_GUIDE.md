# Release Guide

Complete guide for creating and publishing releases of Power Platform Developer Suite.

---

## Overview

This guide covers the full release lifecycle from version bumping to marketplace publishing. It consolidates version management, GitHub releases, and marketplace deployment workflows.

**Audience:** Project maintainers with release permissions

---

## Version Management

### Semantic Versioning

We follow [Semantic Versioning (semver)](https://semver.org/) with format `MAJOR.MINOR.PATCH`:

- **MAJOR** (1.0.0): Breaking changes, major architectural rewrites
- **MINOR** (0.2.0): New features, significant refactors (backward compatible)
- **PATCH** (0.1.1): Bug fixes, minor improvements

**Pre-1.0 exceptions:**
- Breaking changes allowed in MINOR versions (0.x.y)
- 0.x.y signals "API not stable yet"
- Version 1.0.0 signals "production-ready, stable API"

### Version File: package.json

**Single source of truth:**
```json
{
  "name": "power-platform-developer-suite",
  "version": "0.2.0",  ← This is the production version
  "publisher": "JoshSmithXRM"
}
```

**Critical Rule:** `package.json` version is ALWAYS the production version. Never commit dev suffixes (e.g., `0.2.0-dev.1`).

---

## Development vs Production Builds

### Development (99% of Time)

**Use F5 (Extension Development Host):**
```bash
# Terminal 1: Watch mode
npm run watch

# VS Code: Press F5
# Launches Extension Development Host for testing
```

**Benefits:**
- ✅ Instant reload on code changes
- ✅ Full debugging support
- ✅ No packaging required
- ✅ Fastest iteration cycle

### Production Testing (Rare)

**Use Local Installation:**
```bash
# Build, package, and install locally
npm run local
```

**What this does:**
1. Reads version from `package.json` (e.g., `0.2.0`)
2. Increments counter in `.dev-version` (e.g., `3`)
3. Temporarily modifies `package.json` to `0.2.0-dev.3`
4. Builds and packages extension
5. **Immediately restores** `package.json` to `0.2.0`
6. Installs `.vsix` in main VS Code

**Result:**
- Extensions panel shows: `0.2.0-dev.3` (clearly marked as dev build)
- `package.json` shows: `0.2.0` (production version, safe to commit)
- `.dev-version` shows: `3` (counter for next build)
- Git status: Clean (no package.json modifications)

**When to use:**
- Final production testing before release
- Testing VSIX packaging issues
- Validating marketplace-like installation

**Revert to marketplace version:**
```bash
npm run marketplace
```

### Node.js Version Requirements

**For Development (F5):**
- Any Node.js version works (18.x, 20.x, 22.x)

**For Packaging (.vsix creation):**
- **Use Node.js 20.x**: `nvm use 20`
- Node.js 22+ has module resolution issues with vsce

---

## Release Process

### Overview

**Three stages:**
1. **Preparation** - Test, document, finalize code
2. **Version Bump** - Update version numbers, commit
3. **Publish** - Create GitHub release (auto-publishes to marketplace)

### Stage 1: Preparation

#### 1.1 Complete All Work

- [ ] All features implemented and merged to `main`
- [ ] All tests passing (`npm test`)
- [ ] Zero TypeScript errors (`npm run compile`)
- [ ] Zero ESLint violations (`npm run lint`)
- [ ] Manual testing complete (F5 testing)

#### 1.2 Update CHANGELOG.md

**Add new version section:**

```markdown
## [0.2.0] - 2025-11-24

### Added
- Feature 1
- Feature 2

### Changed
- Refactored X to use Y pattern

### Fixed
- Bug fix 1
- Bug fix 2

### Breaking Changes
- Breaking change description
```

**Format:**
- Follow [Keep a Changelog](https://keepachangelog.com/) standard
- Use categories: Added, Changed, Deprecated, Removed, Fixed, Security
- Be concise but descriptive
- Include file paths or issue numbers when helpful

**Checklist:**
- [ ] Version number matches upcoming release
- [ ] Date is accurate
- [ ] All significant changes documented
- [ ] Breaking changes clearly marked
- [ ] User impact explained (if applicable)

#### 1.3 Create Release Notes (Major/Minor Only)

For major and minor releases, create detailed release notes:

```bash
# Copy template
cp docs/releases/RELEASE_NOTES_GUIDE.md docs/releases/v0.2.0.md

# Edit with comprehensive details
code docs/releases/v0.2.0.md
```

**See:** [Release Notes Guide](./releases/RELEASE_NOTES_GUIDE.md)

**Checklist:**
- [ ] Release notes created (for major/minor releases)
- [ ] Code examples included
- [ ] Migration guide provided (if breaking changes)
- [ ] Benefits and metrics documented
- [ ] Links to architecture guides added

#### 1.4 Final Testing

**Production-like test:**
```bash
npm run local          # Install local build
# Test all features in main VS Code
npm run marketplace    # Revert to marketplace version
```

**Checklist:**
- [ ] Local build installs successfully
- [ ] All panels open and function correctly
- [ ] No console errors (Help → Toggle Developer Tools)
- [ ] Authentication works for all methods
- [ ] Export features work (solutions, metadata, traces)

### Stage 2: Version Bump

#### 2.1 Update package.json

**On main branch:**
```bash
git checkout main
git pull origin main

# Edit package.json manually
# Change "version": "0.1.1" → "0.2.0"

git add package.json
git commit -m "Bump version to v0.2.0"
git push origin main
```

**DO NOT:**
- ❌ Bump version on feature branches
- ❌ Create git tags manually (GitHub Actions handles this)
- ❌ Use `npm version` command (we manage versioning manually)

#### 2.2 Verify Changes

```bash
# Check git log
git log -1

# Verify package.json
cat package.json | grep version
```

**Should see:**
```json
"version": "0.2.0",
```

### Stage 3: Publish

#### 3.1 Create GitHub Release

1. **Go to GitHub**: https://github.com/joshsmithxrm/power-platform-developer-suite/releases
2. **Click**: "Draft a new release"
3. **Fill in details**:
   - **Tag**: `v0.2.0` (create new tag from main)
   - **Target**: `main` branch
   - **Title**: `v0.2.0` or `v0.2.0 - Clean Architecture Refactor`
   - **Description**: Copy from CHANGELOG.md or link to release notes
4. **Preview**: Review formatting
5. **Click**: "Publish release"

**Example Description:**
```markdown
# v0.2.0 - Clean Architecture Refactor

Complete architectural transformation to Clean Architecture with rich domain models, comprehensive testing, and proper separation of concerns.

## Highlights

- 🏗️ Clean Architecture implementation across all features
- ✅ 168 test files with 85%+ coverage
- 📚 13,873 lines of architecture documentation
- 🔄 9 features restructured to Clean Architecture

## Documentation

- **[Full Release Notes](https://github.com/joshsmithxrm/power-platform-developer-suite/blob/main/docs/releases/v0.2.0.md)** - Technical deep-dive
- **[CHANGELOG](https://github.com/joshsmithxrm/power-platform-developer-suite/blob/main/CHANGELOG.md#020---2025-11-24)** - User-facing summary

## Installation

Update via VS Code Extensions panel or:

​```bash
code --install-extension JoshSmithXRM.power-platform-developer-suite --force
​```
```

#### 3.2 Automatic Marketplace Publishing

**GitHub Actions workflow triggers automatically:**
1. GitHub Release published
2. Workflow runs: `.github/workflows/publish.yml`
3. Steps:
   - Checkout code
   - Install dependencies (`npm ci`)
   - Run tests (`npm test`)
   - Build extension (`npm run compile`)
   - Package extension (`vsce package`)
   - Publish to marketplace (`vsce publish`)
4. Extension appears in VS Code Marketplace within 5-10 minutes

**Monitor workflow:**
- Go to: GitHub → Actions → "Publish Extension" workflow
- Watch for completion (green checkmark)
- Check for errors (red X)

**Checklist:**
- [ ] GitHub release created
- [ ] Workflow completed successfully
- [ ] Extension visible in marketplace (within 10 minutes)

#### 3.3 Verify Marketplace Publication

**Check marketplace listing:**
1. Go to: https://marketplace.visualstudio.com/items?itemName=JoshSmithXRM.power-platform-developer-suite
2. Verify:
   - Version number matches release (e.g., `0.2.0`)
   - Description updated (if changed)
   - Changelog visible
   - Install button works

**Test installation:**
```bash
# Uninstall current version
code --uninstall-extension JoshSmithXRM.power-platform-developer-suite

# Install from marketplace
code --install-extension JoshSmithXRM.power-platform-developer-suite

# Verify version
code --list-extensions --show-versions | grep power-platform-developer-suite
```

**Expected:** Should show `JoshSmithXRM.power-platform-developer-suite@0.2.0`

### Stage 4: Post-Release

#### 4.1 Announce Release

**Channels (if applicable):**
- GitHub Discussions
- Social media (Twitter/LinkedIn)
- Project website/blog
- Power Platform community forums

**Template:**
```
🎉 Power Platform Developer Suite v0.2.0 Released!

Complete Clean Architecture refactor with:
- 🏗️ Rich domain models across all features
- ✅ 168 tests with 85%+ coverage
- 📚 13,873 lines of new documentation

Read the full release notes: [link]
Install now: [marketplace link]

#PowerPlatform #VSCode
```

#### 4.2 Monitor for Issues

**First 48 hours:**
- Watch GitHub Issues for bug reports
- Monitor VS Code ratings/reviews
- Check GitHub Actions for workflow failures

**If critical bug found:**
1. Fix immediately on `main`
2. Create patch release (e.g., `0.2.1`)
3. Follow same release process (fast-track)

#### 4.3 Update Documentation

- [ ] Update `docs/releases/README.md` index with new version
- [ ] Link CHANGELOG.md entry to release notes (if created)
- [ ] Archive old release notes (if 10+ releases exist)

---

## Release Checklist (Complete)

### Pre-Release

- [ ] All features complete and merged to `main`
- [ ] Tests passing (`npm test`)
- [ ] Build successful (`npm run compile`)
- [ ] Lint passing (`npm run lint`)
- [ ] Manual testing complete (F5)
- [ ] CHANGELOG.md updated with new version
- [ ] Release notes created (for major/minor)
- [ ] Local build tested (`npm run local`)

### Version Bump

- [ ] On `main` branch
- [ ] `package.json` version updated
- [ ] Changes committed and pushed
- [ ] No uncommitted changes

### Publish

- [ ] GitHub release created
- [ ] Tag created (`v0.2.0`)
- [ ] Release description complete
- [ ] Workflow completed successfully (GitHub Actions)
- [ ] Extension visible in marketplace
- [ ] Marketplace version verified

### Post-Release

- [ ] Release announced (if applicable)
- [ ] Monitoring for issues (first 48 hours)
- [ ] Release notes index updated
- [ ] No critical bugs reported

---

## Rollback Procedures

### If Published Version Has Critical Bug

**Option 1: Patch Release (Preferred)**
1. Fix bug on `main`
2. Create patch release immediately (e.g., `0.2.1`)
3. Publish following normal process
4. Update CHANGELOG with fix and mark as critical

**Option 2: Unpublish (Last Resort)**

⚠️ **WARNING:** Unpublishing breaks users who already installed. Only for severe security issues.

```bash
# Requires marketplace PAT
vsce unpublish JoshSmithXRM.power-platform-developer-suite@0.2.0
```

**Then:**
1. Fix issue
2. Republish corrected version
3. Notify users via GitHub issue

### If GitHub Release Has Error

**Edit the release:**
1. Go to GitHub → Releases
2. Click "Edit" on the release
3. Update description
4. Save changes

**Tag cannot be changed** - if tag is wrong, must delete and recreate.

---

## Troubleshooting

### Publish Workflow Fails: "Tests failed"

**Cause:** Tests failing in CI (even if passing locally)

**Fix:**
1. Run `npm test` locally to reproduce
2. Fix failing tests
3. Commit and push
4. Delete and recreate GitHub release (triggers workflow again)

### Publish Workflow Fails: "vsce publish failed"

**Cause:** Invalid PAT or marketplace account issue

**Fix:**
1. Verify `ADO_MARKETPLACE_PAT` secret in GitHub settings
2. Check PAT has not expired
3. Verify marketplace publisher account

### Marketplace Shows Old Version

**Cause:** Caching or propagation delay

**Fix:**
- Wait 10-15 minutes for marketplace to update
- Hard refresh marketplace page (Ctrl+Shift+R)
- Check workflow actually completed successfully

### Version Number Mismatch

**Symptoms:** Marketplace shows `0.2.0-dev.3` instead of `0.2.0`

**Cause:** Built from wrong branch or `package.json` had dev suffix

**Fix:**
1. Verify `package.json` on `main` has clean version (no suffixes)
2. Delete and recreate GitHub release (rebuilds from clean main)
3. Contact marketplace support if persists

---

## Automated Version Bump (Alternative)

Instead of manual version bumping, use the GitHub Actions workflow:

```bash
# Go to: GitHub → Actions → "Version Bump"
# Click: "Run workflow"
# Select: "minor" (for 0.1.1 → 0.2.0)
# Click: "Run workflow"
```

**What this does:**
1. Runs tests and build
2. Bumps version in `package.json`
3. Commits and tags
4. Creates GitHub release
5. Triggers marketplace publish

**When to use:**
- Quick patch releases
- Simple version bumps without complex release notes

**When NOT to use:**
- Major releases (need manual release notes)
- Releases requiring detailed changelog updates

---

## Release Cadence

**Recommended schedule:**

- **Major** (x.0.0): Annually or less (breaking changes)
- **Minor** (0.x.0): Monthly or quarterly (new features)
- **Patch** (0.0.x): As needed (bug fixes, weekly if needed)

**Current stage:** Pre-1.0 (0.x.y releases)
- Minor releases may include breaking changes
- Faster iteration expected
- Version 1.0.0 signals "production-ready, stable"

---

## Pre-Release Channel (Future)

**Planned:** Beta/preview releases for early testing

**Format:** `0.3.0-beta.1`, `0.3.0-rc.1`

**See:** [ALM_DEVOPS.md](./future/ALM_DEVOPS.md#pre-release-channel-support)

---

## Related Documentation

- **[Release Notes Guide](./releases/RELEASE_NOTES_GUIDE.md)** - How to write release notes
- **[CHANGELOG.md](../CHANGELOG.md)** - Release history
- **[CLAUDE.md](../CLAUDE.md#version-management--local-installation)** - Quick reference for version management
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contributor guidelines

---

## Questions?

- **Release process issues**: Open a GitHub Issue
- **Marketplace problems**: Contact VS Code Marketplace support
- **Version strategy discussions**: Open a GitHub Discussion

---

**Following this guide ensures smooth, reliable releases with minimal user disruption.**
