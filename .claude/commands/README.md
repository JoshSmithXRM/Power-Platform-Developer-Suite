# Claude Code Commands

Custom slash commands for this project.

## Available Commands

### Design & Development
| Command | Purpose |
|---------|---------|
| `/design [feature]` | Invoke design-architect for feature design |
| `/new-panel [name]` | Scaffold new VS Code panel with Clean Architecture |

### Code Quality & PR Validation
| Command | Purpose |
|---------|---------|
| `/cleanup-code [scope]` | Find/fix logging and comment violations |
| `/prepare-pr` | Full PR validation (compile, tests, coverage, CHANGELOG, code review) |
| `/code-review [scope]` | Standalone code review (now included in /prepare-pr) |
| `/comprehensive-review` | 8-agent parallel codebase review (quarterly) |

### Technical Debt
| Command | Purpose |
|---------|---------|
| `/review-technical-debt` | Audit debt items, clean up resolved |
| `/fix-technical-debt` | Interactive debt item resolution |

### Release Management
| Command | Purpose |
|---------|---------|
| `/prepare-release` | Prepare version release (bump version, create release notes, update changelog) |

### Session Management
| Command | Purpose |
|---------|---------|
| `/handoff` | Generate session summary for context handoff |

## Usage

### `/prepare-pr`
**Purpose:** Full PR validation before creating any pull request
**What it checks:**
- Compilation (npm run compile)
- Tests with coverage (explicit numbers shown)
- CHANGELOG vs git log cross-reference
- Code review (code-guardian approval)

**Frequency:** Before every PR to main
**Duration:** 3-10 minutes (depends on test suite size and review scope)

### `/prepare-release`
**Purpose:** Prepare all release artifacts (everything in /prepare-pr + version bump)
**Frequency:** Before each version release
**Duration:** 5-15 minutes

### `/fix-technical-debt`
**Purpose:** Interactively fix technical debt items - select item → verify → plan → implement → review
**Frequency:** As needed per sprint planning
**Duration:** 2-6 hours (depends on item complexity)

---

## Typical Workflows

**New Feature:**
1. `/design` - Create technical design
2. Implement inside-out
3. `/cleanup-code uncommitted` - Fix violations
4. `/prepare-pr` - Full validation + code review
5. Create PR

**New Panel:**
1. `/new-panel` - Design + scaffold
2. Implement per design
3. `/prepare-pr` - Full validation + code review
4. Create PR

**Sprint Maintenance:**
1. `/review-technical-debt` - Audit items
2. `/fix-technical-debt` - Address priority debt

**Session End:**
1. `/handoff` - Capture context
2. `/clear` - Reset for next task

---

## Best Practices

**Before Any PR:**
1. `/cleanup-code` - Fix code quality issues
2. `/prepare-pr` - Full validation (compile, tests, coverage, CHANGELOG, code review)

**Quarterly Maintenance:**
1. `/review-technical-debt` - Clean up resolved issues
2. `/comprehensive-review` - Full codebase audit (if needed)

**Sprint Planning:**
1. `/fix-technical-debt` - Address priority debt items

**Before Release:**
1. `/prepare-release X.Y.Z` - Full validation + version bump
2. Push and merge PR to main
3. Create GitHub Release with tag

## Git Hooks

Pre-commit hook installed at `.git/hooks/pre-commit`:
- Runs `npm run compile` before each commit
- Blocks commit if compilation fails
