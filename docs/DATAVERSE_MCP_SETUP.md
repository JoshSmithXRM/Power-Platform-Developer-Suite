# Connecting Claude Code to Dataverse via MCP

This guide walks through setting up the Microsoft Dataverse MCP (Model Context Protocol) server to allow Claude Code to interact with your Dataverse environment using natural language.

## Prerequisites

- .NET SDK 8.0
- Claude Code CLI installed
- Access to a Power Platform environment

## Step 1: Install the Dataverse MCP Local Proxy

```powershell
# Install .NET SDK 8.0 (if not already installed)
winget install Microsoft.DotNet.SDK.8

# Install the Dataverse MCP proxy tool
dotnet tool install --global --add-source https://api.nuget.org/v3/index.json Microsoft.PowerPlatform.Dataverse.MCP
```

## Step 2: Get Your Tenant ID

1. Go to [make.powerapps.com](https://make.powerapps.com)
2. Click **Settings** (gear icon) in the top right
3. Select **Session details**
4. Copy the **Tenant ID** GUID

Example: `e517f5e3-af19-48fe-866b-dce8a2dc516a`

## Step 3: Create a Dataverse Connection in Power Automate

1. Go to [make.powerautomate.com](https://make.powerautomate.com)
2. Click **Connections** in the left sidebar
3. Click **+ New connection**
4. Search for **Microsoft Dataverse** and select it
5. Complete the connection setup (sign in with your credentials)
6. Once created, click on the connection to open its details
7. Look at the browser URL - it will look like:
   ```
   https://make.powerapps.com/environments/{environment-id}/connections/shared_commondataserviceforapps/{connection-id}/details
   ```
8. Note down the **environment-id** and **connection-id** from the URL

## Step 4: Construct the Connection URL

The MCP proxy requires a specific URL format with query parameters:

```
https://make.powerautomate.com/environments/{environment-id}/connections?apiName=shared_commondataserviceforapps&connectionName={connection-id}
```

Example:
```
https://make.powerautomate.com/environments/48ea4fa2-b5b7-e805-8dc7-3b5406fd8d11/connections?apiName=shared_commondataserviceforapps&connectionName=a7005de458614c3986f5b0dfd1724472
```

**Important:** The URL format uses query parameters (`?apiName=...&connectionName=...`), NOT a path format. This is a common mistake that causes "Missing apiName" errors.

## Step 5: Add the MCP Server to Claude Code

The easiest way is to edit your `~/.claude.json` file directly (the `&` character in the URL can cause issues with shell parsing):

Find your project entry and add the `mcpServers` configuration:

```json
{
  "projects": {
    "C:\\VS\\Your-Project": {
      "mcpServers": {
        "dataverse": {
          "command": "Microsoft.PowerPlatform.Dataverse.MCP",
          "args": [
            "--ConnectionUrl",
            "https://make.powerautomate.com/environments/{environment-id}/connections?apiName=shared_commondataserviceforapps&connectionName={connection-id}",
            "--MCPServerName",
            "DataverseMCPServer",
            "--TenantId",
            "{your-tenant-id}",
            "--BackendProtocol",
            "HTTP"
          ]
        }
      }
    }
  }
}
```

Alternatively, you can try using the CLI (may have issues with the `&` character):

```bash
claude mcp add dataverse -- Microsoft.PowerPlatform.Dataverse.MCP --ConnectionUrl "https://make.powerautomate.com/environments/{env-id}/connections?apiName=shared_commondataserviceforapps&connectionName={conn-id}" --MCPServerName "DataverseMCPServer" --TenantId "{tenant-id}" --BackendProtocol HTTP
```

## Step 6: Verify the Connection

```bash
claude mcp list
```

You should see:
```
dataverse: Microsoft.PowerPlatform.Dataverse.MCP ... - ✓ Connected
```

## Step 7: Restart Claude Code

Start a new Claude Code session for the MCP tools to become available.

## Usage

Once connected, you can ask Claude things like:

- "list tables in Dataverse"
- "describe the account table"
- "show me my contacts"
- "how many accounts do I have"
- "create a new contact named John Smith"

The first time you use it, you may be prompted to authenticate via browser (Microsoft login).

## Available Tools

The Dataverse MCP provides these tools:

| Tool | Description |
|------|-------------|
| `list_tables` | List all tables in the Dataverse environment |
| `describe_table` | Get the schema definition of a table |
| `read_query` | Execute SELECT queries to read data |
| `create_record` | Insert a new row into a table |
| `update_record` | Update an existing row |
| `delete_record` | Delete a row (requires user approval) |
| `create_table` | Create a new table |
| `update_table` | Add columns to an existing table |
| `delete_table` | Delete a table (requires user approval) |
| `list_knowledge_sources` | List configured knowledge sources |
| `retrieve_knowledge` | Search across knowledge sources |
| `list_prompts` | List available AI prompts |
| `execute_prompt` | Execute an AI prompt |

## Troubleshooting

### "Invalid URL format. Missing apiName" Error

Your `--ConnectionUrl` is in the wrong format. Make sure you're using query parameters:

**Wrong:**
```
https://make.powerapps.com/environments/{env}/connections/shared_commondataserviceforapps/{conn}/details
```

**Correct:**
```
https://make.powerautomate.com/environments/{env}/connections?apiName=shared_commondataserviceforapps&connectionName={conn}
```

### "Failed to connect" Status

1. Verify the Dataverse MCP proxy is installed: `dotnet tool list -g | findstr dataverse`
2. Check your Tenant ID is correct
3. Ensure your connection in Power Automate is still valid
4. Try running the proxy manually to see detailed errors:
   ```powershell
   Microsoft.PowerPlatform.Dataverse.MCP --ConnectionUrl "..." --TenantId "..." --BackendProtocol HTTP
   ```

### Authentication Issues

The MCP uses interactive authentication. If you're having trouble:
1. Make sure you're signed into the same Microsoft account in your browser
2. Check that the Dataverse connection in Power Automate uses the same account

## Optional: Power Platform Admin Center Settings

By default, the Dataverse MCP server is enabled for Microsoft Copilot Studio. For non-Microsoft clients like Claude, you may need to enable it in PPAC:

1. Go to [admin.powerplatform.microsoft.com](https://admin.powerplatform.microsoft.com)
2. **Manage** > **Environments** > Select your environment
3. **Settings** > **Product** > **Features**
4. Find **Dataverse Model Context Protocol**
5. Enable "Allow MCP clients to interact with Dataverse MCP server"
6. (Optional) Click **Advanced Settings** to manage allowed MCP clients

Note: In testing, the MCP worked without explicitly enabling these settings, but they may be required depending on your environment configuration.

## References

- [Microsoft Dataverse MCP Documentation](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-mcp)
- [Connect to Dataverse with MCP (non-Microsoft clients)](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-mcp-other-clients)
- [Dataverse MCP Server Blog Post](https://www.microsoft.com/en-us/power-platform/blog/2025/07/07/dataverse-mcp/)
- [DEV Community: URL Format Fix](https://dev.to/_neronotte/dataverse-mcp-server-configuration-failed-3ip5)
