# Power Platform Developer Suite - Documentation

**Master index for all project documentation.**

---

## Documentation Standards

### Naming Convention

All documentation files use **SCREAMING_SNAKE_CASE.md**:
- `FEATURE_NAME_DESIGN.md` - Design documents
- `PATTERN_NAME_PATTERNS.md` - Pattern guides
- `TOPIC_GUIDE.md` - How-to guides

### Folder Structure

```
docs/
├── README.md              # This file - master index
├── architecture/          # Architecture patterns and guides (permanent)
├── design/                # Feature designs (temporary - deleted after implementation)
├── requirements/          # Feature requirements (kept as documentation)
├── future/                # Planned enhancements by feature area
├── testing/               # Testing guides
├── releases/              # Release notes
├── technical-debt/        # Technical debt tracking
├── quality/               # Quality reviews
└── work/                  # Active work tracking (transient)
```

### Document Lifecycle

| Type | Location | Lifecycle |
|------|----------|-----------|
| Architecture patterns | `docs/architecture/` | Permanent - evolves with codebase |
| Design docs | `docs/design/` | Temporary - deleted after implementation |
| Requirements | `docs/requirements/` | Kept as feature documentation |
| Future enhancements | `docs/future/` | Updated as items are implemented |
| Work tracking | `docs/work/` | Deleted before PR merge |

---

## Quick Navigation

### By Audience

**For AI Assistants:**
- [CLAUDE.md](../CLAUDE.md) - Essential rules and patterns (start here)
- [.claude/WORKFLOW.md](../.claude/WORKFLOW.md) - 9-phase development workflow

**For Developers:**
- [GETTING_STARTED.md](GETTING_STARTED.md) - Setup and authentication
- [RELEASE_GUIDE.md](RELEASE_GUIDE.md) - Release process
- [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md) - Git workflow and branching

---

## Architecture Documentation

### Core Guides
| Document | Purpose |
|----------|---------|
| [CLEAN_ARCHITECTURE_GUIDE.md](architecture/CLEAN_ARCHITECTURE_GUIDE.md) | Core architecture patterns |
| [CODE_QUALITY_GUIDE.md](architecture/CODE_QUALITY_GUIDE.md) | Code quality and comment standards |
| [LOGGING_GUIDE.md](architecture/LOGGING_GUIDE.md) | Logging by layer |

### Pattern Guides
| Document | Purpose |
|----------|---------|
| [VALUE_OBJECT_PATTERNS.md](architecture/VALUE_OBJECT_PATTERNS.md) | Immutable value objects |
| [DOMAIN_SERVICE_PATTERNS.md](architecture/DOMAIN_SERVICE_PATTERNS.md) | Domain services and collections |
| [MAPPER_PATTERNS.md](architecture/MAPPER_PATTERNS.md) | DTO ↔ Domain mapping |
| [REPOSITORY_PATTERNS.md](architecture/REPOSITORY_PATTERNS.md) | Repository implementation |

### UI/Presentation Patterns
| Document | Purpose |
|----------|---------|
| [PANEL_ARCHITECTURE.md](architecture/PANEL_ARCHITECTURE.md) | Panel composition |
| [WEBVIEW_PATTERNS.md](architecture/WEBVIEW_PATTERNS.md) | Webview message contracts |
| [STATIC_FACTORY_PATTERN.md](architecture/STATIC_FACTORY_PATTERN.md) | Panel createOrShow pattern |
| [RESIZABLE_DETAIL_PANEL_INDEX.md](architecture/RESIZABLE_DETAIL_PANEL_INDEX.md) | Resizable panel pattern (index) |

### Other Patterns
| Document | Purpose |
|----------|---------|
| [ODATA_DOMAIN_PATTERN.md](architecture/ODATA_DOMAIN_PATTERN.md) | OData query building |
| [RENDERING_PATTERN_DECISION.md](architecture/RENDERING_PATTERN_DECISION.md) | HTML vs data-driven decision |

---

## Testing Documentation

| Document | Purpose |
|----------|---------|
| [TESTING_GUIDE.md](testing/TESTING_GUIDE.md) | Unit testing patterns |
| [INTEGRATION_TESTING_GUIDE.md](testing/INTEGRATION_TESTING_GUIDE.md) | Panel integration tests |
| [e2e/README.md](../e2e/README.md) | E2E testing with Playwright |

---

## Feature Documentation

### Active Design Docs
Design documents for features currently in development:

| Document | Feature | Status |
|----------|---------|--------|
| [DATA_EXPLORER_DESIGN.md](design/DATA_EXPLORER_DESIGN.md) | Data Explorer panel | In Development |
| [DATA_EXPLORER_INTELLISENSE_DESIGN_V2.md](design/DATA_EXPLORER_INTELLISENSE_DESIGN_V2.md) | IntelliSense for SQL editor | Planned |
| [METADATA_BROWSER_PRESENTATION_DESIGN.md](design/METADATA_BROWSER_PRESENTATION_DESIGN.md) | Metadata Browser | In Development |
| [FILTER_PANEL_IMPROVEMENTS_DESIGN.md](design/FILTER_PANEL_IMPROVEMENTS_DESIGN.md) | Filter panel enhancements | Planned |
| [WEBVIEW_TYPESCRIPT_MIGRATION_DESIGN.md](design/WEBVIEW_TYPESCRIPT_MIGRATION_DESIGN.md) | TypeScript webview migration | Future |

### Requirements
| Document | Feature |
|----------|---------|
| [METADATA_BROWSER_REQUIREMENTS.md](requirements/METADATA_BROWSER_REQUIREMENTS.md) | Metadata Browser |
| [METADATA_BROWSER_PRESENTATION_REQUIREMENTS.md](requirements/METADATA_BROWSER_PRESENTATION_REQUIREMENTS.md) | Metadata Browser Presentation |

### Future Enhancements
Planned features organized by area - see [docs/future/README.md](future/README.md):

| Area | Key Features |
|------|--------------|
| [DATA_MANAGEMENT.md](future/DATA_MANAGEMENT.md) | Data Explorer, SQL4CDS, Record Cloning |
| [DEVELOPMENT_TOOLS.md](future/DEVELOPMENT_TOOLS.md) | Plugin Registration, Web Resources |
| [ALM_DEVOPS.md](future/ALM_DEVOPS.md) | Deployment promotion, Solution Diff |
| [ADMINISTRATION.md](future/ADMINISTRATION.md) | Connection Manager, Async Jobs, Security |
| [OBSERVABILITY.md](future/OBSERVABILITY.md) | Flow History, Telemetry |
| [INFRASTRUCTURE.md](future/INFRASTRUCTURE.md) | Testing infrastructure, Multi-environment |

---

## Project Management

| Document | Purpose |
|----------|---------|
| [technical-debt/README.md](technical-debt/README.md) | Technical debt tracking (categorized) |
| [CHANGELOG.md](../CHANGELOG.md) | Version history |
| [RELEASE_GUIDE.md](RELEASE_GUIDE.md) | Release process |
| [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md) | Git branching and merging |

---

## I want to...

| Goal | Document |
|------|----------|
| Understand codebase architecture | [CLEAN_ARCHITECTURE_GUIDE.md](architecture/CLEAN_ARCHITECTURE_GUIDE.md) |
| Learn coding standards | [CLAUDE.md](../CLAUDE.md) |
| Implement a value object | [VALUE_OBJECT_PATTERNS.md](architecture/VALUE_OBJECT_PATTERNS.md) |
| Create a domain service | [DOMAIN_SERVICE_PATTERNS.md](architecture/DOMAIN_SERVICE_PATTERNS.md) |
| Map domain to ViewModels | [MAPPER_PATTERNS.md](architecture/MAPPER_PATTERNS.md) |
| Implement a repository | [REPOSITORY_PATTERNS.md](architecture/REPOSITORY_PATTERNS.md) |
| Build a new panel | [PANEL_ARCHITECTURE.md](architecture/PANEL_ARCHITECTURE.md) |
| Write unit tests | [TESTING_GUIDE.md](testing/TESTING_GUIDE.md) |
| Write integration tests | [INTEGRATION_TESTING_GUIDE.md](testing/INTEGRATION_TESTING_GUIDE.md) |
| Write E2E tests | [e2e/README.md](../e2e/README.md) |
| Add logging | [LOGGING_GUIDE.md](architecture/LOGGING_GUIDE.md) |
| Prepare a release | [RELEASE_GUIDE.md](RELEASE_GUIDE.md) |
| Understand git workflow | [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md) |

---

## Claude-Specific Documentation

Located in `.claude/` folder:

| Document | Purpose |
|----------|---------|
| [WORKFLOW.md](../.claude/WORKFLOW.md) | 9-phase development workflow |
| [TROUBLESHOOTING.md](../.claude/TROUBLESHOOTING.md) | Common problems and solutions |
| [agents/](../.claude/agents/) | Agent definitions (code-guardian, design-architect) |
| [commands/](../.claude/commands/) | Slash commands |
| [templates/](../.claude/templates/) | Templates for designs, tracking, panels |

---

## Documentation Maintenance

### Adding New Documentation

1. Follow naming convention: `SCREAMING_SNAKE_CASE.md`
2. Place in appropriate folder based on type
3. Add entry to this README.md
4. Use real code examples from codebase

### Document Quality Standards

- Real code examples from `src/`
- ✅/❌ pattern for good/bad examples
- "Why" explanations for decisions
- No duplication (link to canonical source)

### Style Guide

See [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) for detailed formatting rules.
