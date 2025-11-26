# Claude Code Commands

Custom slash commands for this project.

## Available Commands

### Design & Development
| Command | Purpose |
|---------|---------|
| `/design [feature]` | Invoke design-architect for feature design |
| `/new-panel [name]` | Scaffold new VS Code panel with Clean Architecture |

### Code Quality
| Command | Purpose |
|---------|---------|
| `/cleanup-code [scope]` | Find/fix logging and comment violations |
| `/code-review [scope]` | Invoke code-guardian for approval |
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

### `/fix-technical-debt`
**Purpose:** Interactively fix technical debt items - select item → verify → plan → implement → review
**Frequency:** As needed per sprint planning
**Duration:** 2-6 hours (depends on item complexity)

### `/prepare-release`
**Purpose:** Prepare all release artifacts (version bump, changelog date, release notes)
**Frequency:** Before each version release
**Duration:** 2-5 minutes

---

## Typical Workflows

**New Feature:**
1. `/design` - Create technical design
2. Implement inside-out
3. `/cleanup-code uncommitted` - Fix violations
4. `/code-review` - Get approval

**New Panel:**
1. `/new-panel` - Design + scaffold
2. Implement per design
3. `/code-review` - Get approval

**Sprint Maintenance:**
1. `/review-technical-debt` - Audit items
2. `/fix-technical-debt` - Address priority debt

**Session End:**
1. `/handoff` - Capture context
2. `/clear` - Reset for next task

---

## Best Practices

**Before Feature Complete:**
1. `/cleanup-code` - Fix code quality issues
2. `/code-review` - Get code-guardian approval

**Quarterly Maintenance:**
1. `/review-technical-debt` - Clean up resolved issues
2. `/comprehensive-review` - Full codebase audit (if needed)

**Sprint Planning:**
1. `/fix-technical-debt` - Address priority debt items

**Before Release:**
1. `/prepare-release X.Y.Z` - Bump version, create release notes
2. Push and merge PR to main
3. Create GitHub Release with tag

## Git Hooks

Pre-commit hook installed at `.git/hooks/pre-commit`:
- Runs `npm run compile` before each commit
- Blocks commit if compilation fails
