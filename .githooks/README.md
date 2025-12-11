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
| `.mcp.json` | `$HOME/.ppds-mcp.json` | MCP server configuration (Dataverse connection) |
| `.env.e2e.local` | Main repo's `.env.e2e.local` | E2E test credentials (Dataverse connection) |

**Note:** These symlinks are only created if:
- The source file exists
- The target doesn't already exist
- You're in a worktree (not the main repo)

The hook fails gracefully - if source files don't exist, nothing happens.

## Main Repo Setup (Per Machine)

The post-checkout hook only runs for worktrees. For the main repo on each machine, manually create symlinks:

**Windows (Git Bash / PowerShell with Developer Mode):**
```bash
# Claude settings
mklink .claude\settings.local.json %USERPROFILE%\.ppds-claude-settings.json

# MCP configuration
mklink .mcp.json %USERPROFILE%\.ppds-mcp.json
```

**macOS/Linux:**
```bash
# Claude settings
ln -s ~/.ppds-claude-settings.json .claude/settings.local.json

# MCP configuration
ln -s ~/.ppds-mcp.json .mcp.json
```

## Creating Source Files

### Claude Settings (Optional)

Create `~/.ppds-claude-settings.json`:

```json
{
  "apiKey": "your-anthropic-api-key"
}
```

### MCP Configuration (Optional)

Create `~/.ppds-mcp.json` for Claude Code MCP server integration:

```json
{
  "mcpServers": {
    "dataverse": {
      "type": "stdio",
      "command": "Microsoft.PowerPlatform.Dataverse.MCP",
      "args": [
        "--ConnectionUrl", "https://make.powerautomate.com/environments/<your-env-id>/connections?apiName=shared_commondataserviceforapps&connectionName=<your-connection-id>",
        "--MCPServerName", "DataverseMCPServer",
        "--TenantId", "<your-tenant-id>",
        "--BackendProtocol", "HTTP"
      ],
      "env": {}
    }
  }
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
