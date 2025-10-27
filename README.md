# Power Platform Developer Suite

![version](https://img.shields.io/badge/version-0.0.2-blue)
![license](https://img.shields.io/badge/license-MIT-green)
[![changelog](https://img.shields.io/badge/changelog-CHANGELOG-blue)](./CHANGELOG.md)

Comprehensive VS Code extension for Power Platform development and administration - your complete toolkit for Dynamics 365, Dataverse, and Power Platform solutions.

## 🚀 Key Features

**🔌 Environment Management**
- Connect using 4 authentication methods (Service Principal, Interactive, Username/Password, Device Code)
- Multi-environment support with easy switching

**📦 Solution Explorer**
- Browse, filter, export solutions
- Open directly in Maker or Classic interfaces
- Real-time solution analysis

**🔍 Metadata Browser**
- Comprehensive three-panel interface for exploring Dataverse entities
- Browse Tables → Columns, Keys, Relationships, Privileges with detailed properties
- Smart caching for instant navigation and export to JSON

**🔧 Plugin Trace Viewer**
- Analyze plugin execution with advanced filtering
- Environment trace level management (Off/Exception/All)
- Export traces to CSV with syntax-highlighted stack traces

**🔗 Connection References Manager**
- Browse Power Automate flows and connection relationships
- Solution-based filtering with "Open in Maker" functionality
- Sync deployment settings for ALM workflows

**⚙️ Environment Variables Manager**
- Manage environment-specific configuration
- View definitions, current values, and defaults
- Deployment settings sync for automated scenarios

**📥 Import Job Viewer**
- Monitor solution imports with real-time status
- View detailed logs and XML configurations

## 📥 Installation

**From VS Code Marketplace (Recommended)**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Power Platform Developer Suite"
4. Click Install

**From VSIX (Development/Testing)**
```bash
code --install-extension power-platform-developer-suite-0.0.1.vsix
```

## 🛠️ Development

**From Source**
```bash
git clone https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite.git
cd Power-Platform-Developer-Suite
npm install
npm run compile
```

**Run in Development**
- Start watch mode: `npm run watch`
- Launch Extension Development Host: press **F5**

## 🔗 Documentation

- **Full feature details**: [`CHANGELOG.md`](./CHANGELOG.md)
- **Architecture guide**: [`docs/ARCHITECTURE_GUIDE.md`](./docs/ARCHITECTURE_GUIDE.md)
- **Development patterns**: [`.github/copilot-instructions.md`](./.github/copilot-instructions.md)

## 🚨 Troubleshooting

- **Extension not visible**: Reload window (Ctrl+Shift+P → "Reload Window")
- **Authentication issues**: Verify environment URL and app registration permissions
- **Console errors**: Help → Toggle Developer Tools → Console tab

## 🤝 Contributing

Follow patterns in [`docs/ARCHITECTURE_GUIDE.md`](./docs/ARCHITECTURE_GUIDE.md). Open PRs against `main` and add entries under `[Unreleased]` in [`CHANGELOG.md`](./CHANGELOG.md).

---
**License:** MIT | **Publisher:** JoshSmithXRM
