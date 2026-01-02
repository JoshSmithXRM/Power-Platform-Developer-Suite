# Claude Code Commands

Custom slash commands for this project.

---

## Available Commands

| Command | Purpose |
|---------|---------|
| `/new-panel [name]` | Scaffold new VS Code panel |
| `/prepare-pr` | Full PR validation (compile, tests, CHANGELOG) |
| `/prepare-release X.Y.Z` | Release prep (PR validation + version bump) |

---

## Usage

### `/new-panel [name]`

Scaffolds a new VS Code panel with the singleton pattern.

```
/new-panel Plugin Registration
```

Creates basic panel structure in `src/features/[name]/`.

### `/prepare-pr`

Run before any PR to main:
1. Check for uncommitted changes
2. Run `npm run compile`
3. Run `npm test -- --coverage`
4. Verify CHANGELOG updated

### `/prepare-release X.Y.Z`

Run before version releases:
1. Everything in `/prepare-pr`
2. Bump version in package.json
3. Update CHANGELOG date

---

## Typical Workflows

**New Feature:**
1. Implement code
2. F5 test manually
3. Add tests if complex
4. `/prepare-pr`
5. Create PR

**New Panel:**
1. `/new-panel [name]`
2. Implement panel
3. F5 test
4. `/prepare-pr`
5. Create PR

**Release:**
1. `/prepare-release X.Y.Z`
2. Push and create PR
3. After merge, create GitHub Release
