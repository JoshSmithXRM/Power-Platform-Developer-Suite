# Claude Code Setup

Quick start for using Claude Code with this project.

---

## Project Context

This extension is a **UI shell** - VS Code panels that communicate with Dataverse via the MCP server. The complex business logic lives in the SDK/CLI, not here.

**For cross-repo work**, see the parent workspace (`../`) - it has cross-project coordination commands.

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project rules (auto-loaded every response) |
| `.claude/commands/` | Slash commands |
| `.claude/templates/` | Panel development templates |

---

## Available Commands

| Command | Purpose |
|---------|---------|
| `/new-panel [name]` | Scaffold new VS Code panel |
| `/prepare-pr` | Full PR validation (compile, tests, CHANGELOG) |
| `/prepare-release X.Y.Z` | Release prep (PR validation + version bump) |

**From parent workspace (`../`):**

| Command | Purpose |
|---------|---------|
| `/handoff` | Generate session summary |

---

## Quick Reference

| Task | Action |
|------|--------|
| New panel | `/new-panel [name]` |
| Before PR | `/prepare-pr` |
| For releases | `/prepare-release X.Y.Z` |
| Switching tasks | `/clear` |
| End session | `/handoff` from parent workspace |

---

## Development

```bash
npm run compile       # Full build (lint + tests)
npm run compile:fast  # Quick build (no lint/tests)
npm test              # Run tests
F5                    # Launch Extension Development Host
```

---

## Panel Templates

When building new panels, refer to:
- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` - Panel patterns
- `.claude/templates/PANEL_INITIALIZATION_PATTERN.md` - Initialization pattern (CRITICAL)

---

## References

- `CLAUDE.md` - Project rules
- `docs/architecture/` - Architecture guides
- `docs/testing/` - Testing guides
