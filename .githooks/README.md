# Shared Git Hooks

This directory contains shared git hooks that help with development workflow.

## Setup (One-time)

Run this command to enable shared hooks:

```bash
git config core.hooksPath .githooks
```

## Hooks

### post-checkout

Automatically creates symlinks when creating worktrees:

| Target | Source | Purpose |
|--------|--------|---------|
| `.claude/settings.local.json` | `$HOME/.ppds-claude-settings.json` | Claude Code settings (API keys, preferences) |
| `.env.e2e.local` | Main repo's `.env.e2e.local` | E2E test credentials (Dataverse connection) |

**Note:** These symlinks are only created if:
- The source file exists
- The target doesn't already exist
- You're in a worktree (not the main repo)

The hook fails gracefully - if source files don't exist, nothing happens.

## Creating Source Files

### Claude Settings (Optional)

Create `~/.ppds-claude-settings.json`:

```json
{
  "apiKey": "your-anthropic-api-key"
}
```

### E2E Test Credentials (Optional)

Create `.env.e2e.local` in the main repo root:

```bash
PPDS_TEST_ENV_NAME=My Test Environment
PPDS_TEST_DATAVERSE_URL=https://your-org.crm.dynamics.com
PPDS_TEST_TENANT_ID=your-tenant-id
PPDS_TEST_CLIENT_ID=your-client-id
PPDS_TEST_CLIENT_SECRET=your-client-secret
PPDS_TEST_PP_ENV_ID=your-environment-id
```
