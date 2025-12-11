# Shared Git Hooks

## Setup (One-time)

```bash
git config core.hooksPath .githooks
```

## Hooks

### post-checkout

Automatically symlinks gitignored files from main repo to worktrees:

| File | Example | Purpose |
|------|---------|---------|
| `.mcp.json` | `.mcp.example.json` | Dataverse MCP connection |
| `.claude/settings.local.json` | `.claude/settings.local.example.json` | Claude Code settings |
| `.env.e2e.local` | `.env.e2e.example` | E2E test credentials |

All files live in main repo (gitignored). Worktrees get symlinks automatically.

## Local Files Setup (Main Repo Only)

Create these files in main repo using the examples as templates:

| Create | From Example |
|--------|--------------|
| `.mcp.json` | `.mcp.example.json` |
| `.claude/settings.local.json` | `.claude/settings.local.example.json` |
| `.env.e2e.local` | `.env.e2e.example` |

Worktrees will automatically get **symlinks** to the main repo files.
