# Shared Git Hooks

## Setup (One-time)

```bash
git config core.hooksPath .githooks
```

## Windows Requirements

**Developer Mode must be enabled** for symlinks to work without Administrator privileges:

1. Open **Settings** > **Privacy & Security** > **For developers**
2. Enable **Developer Mode**

Without Developer Mode, the post-checkout hook will fail to create symlinks.

## Hooks

### post-checkout

Automatically symlinks gitignored files from main repo to worktrees:

| File | Example | Purpose |
|------|---------|---------|
| `.mcp.json` | `.mcp.example.json` | Dataverse MCP connection |
| `.claude/settings.local.json` | `.claude/settings.local.example.json` | Claude Code settings |
| `.env.e2e.local` | `.env.e2e.local.example` | E2E test credentials |

All files live in main repo (gitignored). Worktrees get symlinks automatically.

## Local Files Setup (Main Repo Only)

Create these files in main repo using the examples as templates:

| Create | From Example |
|--------|--------------|
| `.mcp.json` | `.mcp.example.json` |
| `.claude/settings.local.json` | `.claude/settings.local.example.json` |
| `.env.e2e.local` | `.env.e2e.local.example` |

Worktrees will automatically get **symlinks** to the main repo files.

## Troubleshooting

**Symlinks not created?**
- Verify Developer Mode is enabled (Windows)
- Verify source files exist in main repo
- Check hook output during `git worktree add`

**Manual symlink creation (if hook fails):**
```bash
cd /path/to/worktree
MSYS=winsymlinks:nativestrict ln -s /path/to/main-repo/.mcp.json .mcp.json
```
