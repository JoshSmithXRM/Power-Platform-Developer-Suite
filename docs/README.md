# Power Platform Developer Suite - Documentation

**Documentation for the VS Code extension.**

---

## Quick Navigation

**For AI Assistants:**
- [CLAUDE.md](../CLAUDE.md) - Project rules and patterns

**For Developers:**
- [GETTING_STARTED.md](GETTING_STARTED.md) - Setup and authentication
- [RELEASE_GUIDE.md](RELEASE_GUIDE.md) - Release process
- [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md) - Git workflow

---

## Architecture Documentation

### Panel Patterns
| Document | Purpose |
|----------|---------|
| [PANEL_ARCHITECTURE.md](architecture/PANEL_ARCHITECTURE.md) | Panel composition patterns |
| [WEBVIEW_PATTERNS.md](architecture/WEBVIEW_PATTERNS.md) | Webview message contracts |
| [STATIC_FACTORY_PATTERN.md](architecture/STATIC_FACTORY_PATTERN.md) | Panel createOrShow pattern |

### Code Quality
| Document | Purpose |
|----------|---------|
| [CODE_QUALITY_GUIDE.md](architecture/CODE_QUALITY_GUIDE.md) | Code quality standards |
| [LOGGING_GUIDE.md](architecture/LOGGING_GUIDE.md) | Logging patterns |

---

## Testing Documentation

| Document | Purpose |
|----------|---------|
| [TESTING_GUIDE.md](testing/TESTING_GUIDE.md) | Unit testing patterns |
| [INTEGRATION_TESTING_GUIDE.md](testing/INTEGRATION_TESTING_GUIDE.md) | Panel integration tests |
| [e2e/README.md](../e2e/README.md) | E2E testing with Playwright |

---

## Project Management

| Document | Purpose |
|----------|---------|
| [CHANGELOG.md](../CHANGELOG.md) | Version history |
| [RELEASE_GUIDE.md](RELEASE_GUIDE.md) | Release process |
| [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md) | Git branching |

---

## Claude-Specific Documentation

Located in `.claude/` folder:

| Document | Purpose |
|----------|---------|
| [commands/](../.claude/commands/) | Slash commands |
| [templates/](../.claude/templates/) | Panel development templates |

---

## Folder Structure

```
docs/
├── README.md              # This file
├── architecture/          # Panel and code patterns
├── testing/               # Testing guides
├── future/                # Planned enhancements
└── technical-debt/        # Technical debt tracking
```

---

## Documentation Style

See the parent workspace documentation style guide at `../docs/DOCUMENTATION_STYLE_GUIDE.md`.
