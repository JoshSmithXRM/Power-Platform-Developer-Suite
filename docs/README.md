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

## Webview Patterns

VS Code webview development patterns:

| Document | Purpose |
|----------|---------|
| [WEBVIEW_PATTERNS.md](architecture/WEBVIEW_PATTERNS.md) | Message contracts, CSS layout |
| [DATA_TABLE_PATTERN.md](architecture/DATA_TABLE_PATTERN.md) | Data table rendering |
| [STATIC_FACTORY_PATTERN.md](architecture/STATIC_FACTORY_PATTERN.md) | Panel singleton pattern |
| [KEYBOARD_SELECTION_PATTERN.md](architecture/KEYBOARD_SELECTION_PATTERN.md) | Keyboard navigation |
| [RENDERING_PATTERN_DECISION.md](architecture/RENDERING_PATTERN_DECISION.md) | Server vs client rendering |
| [RESIZABLE_DETAIL_PANEL_PATTERN.md](architecture/RESIZABLE_DETAIL_PANEL_PATTERN.md) | Resizable panels |

---

## Architecture Decision Records

| Document | Decision |
|----------|----------|
| [0001_ESLINT_SUPPRESSIONS.md](adr/0001_ESLINT_SUPPRESSIONS.md) | ESLint suppression policy |
| [0002_API_TYPE_ASSERTIONS.md](adr/0002_API_TYPE_ASSERTIONS.md) | API response type handling |
| [0003_REGEX_FETCHXML_PARSING.md](adr/0003_REGEX_FETCHXML_PARSING.md) | FetchXML parsing approach |
| [0004_MSAL_SKIPPED_TESTS.md](adr/0004_MSAL_SKIPPED_TESTS.md) | MSAL test handling |
| [0005_XML_FORMATTER_NO_INTERFACE.md](adr/0005_XML_FORMATTER_NO_INTERFACE.md) | XML formatter design |

---

## Testing

- **F5** - Primary testing method (Extension Development Host)
- **Unit tests** - For complex parsing/transformation logic only
- **E2E tests** - See [e2e/README.md](../e2e/README.md)

---

## Project Management

| Document | Purpose |
|----------|---------|
| [CHANGELOG.md](../CHANGELOG.md) | Version history |
| [RELEASE_GUIDE.md](RELEASE_GUIDE.md) | Release process |
| GitHub Issues | Feature tracking and bugs |

---

## Folder Structure

```
docs/
├── README.md              # This file
├── GETTING_STARTED.md     # Setup guide
├── RELEASE_GUIDE.md       # Release process
├── BRANCH_STRATEGY.md     # Git workflow
├── architecture/          # Webview patterns
└── adr/                   # Architecture decisions
```

---

## Documentation Style

See parent workspace: `../docs/DOCUMENTATION_STYLE_GUIDE.md`
