# Power Platform Developer Suite

![version](https://img.shields.io/github/package-json/v/JoshSmithXRM/Power-Platform-Developer-Suite)
![license](https://img.shields.io/badge/license-MIT-green)
[![changelog](https://img.shields.io/badge/changelog-CHANGELOG-blue)](./CHANGELOG.md)

Comprehensive VS Code extension for Power Platform development and administration - your complete toolkit for Dynamics 365, Dataverse, and Power Platform solutions.

## Key Features

**Data Explorer**
- SQL and FetchXML query execution against Dataverse
- Visual Query Builder with point-and-click interface
- IntelliSense autocomplete for entities and attributes
- Notebooks (.ppdsnb) for saving and sharing queries
- Export results to CSV, JSON, or query to FetchXML/SQL

**Web Resources**
- Browse, edit, and publish web resources directly in VS Code
- Syntax highlighting for JavaScript, CSS, HTML, and XML
- Conflict detection prevents accidental overwrites
- Unpublished changes detection with diff view

**Solution Explorer**
- Browse, filter, and export solutions
- Open directly in Maker or Classic interfaces
- Real-time solution analysis

**Metadata Browser**
- Three-panel interface for exploring Dataverse entities
- Browse Tables, Columns, Keys, Relationships, and Privileges
- Smart caching for instant navigation
- Export metadata to JSON

**Plugin Trace Viewer**
- Analyze plugin execution with advanced filtering
- Environment trace level management (Off/Exception/All)
- Export traces to CSV with syntax-highlighted stack traces

**Connection References Manager**
- Browse Power Automate flows and connection relationships
- Solution-based filtering with "Open in Maker" functionality
- Sync deployment settings for ALM workflows

**Environment Variables Manager**
- Manage environment-specific configuration
- View definitions, current values, and defaults
- Deployment settings sync for automated scenarios

**Import Job Viewer**
- Monitor solution imports with real-time status
- View detailed logs and XML configurations

**Environment Management**
- Connect using 4 authentication methods (Service Principal, Interactive, Username/Password, Device Code)
- Multi-environment support with easy switching
- Set default environment with ordering controls

## Quick Start

1. **Install** from VS Code Marketplace (search "Power Platform Developer Suite")
2. **Add Environment** - Click the + icon in the Environments panel or run `Power Platform: Add Environment` from Command Palette
3. **Configure** - Enter your environment URL (e.g., `https://yourorg.crm.dynamics.com`) and choose authentication method
4. **Test Connection** - Verify credentials work before saving
5. **Start Using** - Click any tool in the sidebar to begin

**Tip:** Service Principal auth is recommended for CI/CD and shared development. Interactive auth is easiest for individual use.

## Settings

Configure the extension via VS Code Settings (`Ctrl+,` → search "Power Platform"):

| Setting | Default | Description |
|---------|---------|-------------|
| `pluginTrace.defaultLimit` | 100 | Number of traces to fetch (1-5000) |
| `pluginTrace.batchDeleteSize` | 100 | Records deleted per batch (50-1000) |
| `pluginTrace.defaultDeleteOldDays` | 30 | Default days for "delete old traces" (1-365) |
| `virtualTable.initialPageSize` | 100 | Records on first page (10-500) |
| `virtualTable.backgroundPageSize` | 500 | Records per background fetch (100-2000) |
| `virtualTable.maxCachedRecords` | 10000 | Max records in memory (100-100000) |
| `webResources.cacheTTL` | 60 | Content cache duration in seconds (10-600) |
| `metadata.cacheDuration` | 300 | Metadata cache duration in seconds (60-3600) |
| `api.maxRetries` | 3 | Retry attempts for API failures (0-10) |

## Requirements

**Power Platform Access:**
- Dataverse environment with Web API enabled
- User account with appropriate security roles (System Customizer or higher recommended)
- For Service Principal: Azure AD app registration with Dataverse API permissions

**Authentication Methods:**
| Method | Best For | Setup Required |
|--------|----------|----------------|
| Service Principal | CI/CD, shared dev | Azure AD app registration |
| Interactive | Individual developers | None (uses browser) |
| Username/Password | Service accounts | User credentials |
| Device Code | Headless environments | None |

## Installation

**From VS Code Marketplace:**
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Power Platform Developer Suite"
4. Click Install

## Troubleshooting

- **Extension not visible**: Reload window (`Ctrl+Shift+P` → "Reload Window")
- **Authentication issues**: Verify environment URL format (`https://org.crm.dynamics.com`) and check app registration permissions
- **Console errors**: Help → Toggle Developer Tools → Console tab
- **Slow loading**: Adjust `virtualTable.initialPageSize` setting for your connection speed

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, coding standards, and pull request guidelines.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history and feature documentation.

---
**License:** MIT | **Publisher:** JoshSmithXRM
