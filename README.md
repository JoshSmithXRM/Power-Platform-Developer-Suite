# Power Platform Developer Suite

![version](https://img.shields.io/github/package-json/v/JoshSmithXRM/Power-Platform-Developer-Suite)
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

## 🏗️ Architecture

Built with **Clean Architecture** principles for maintainability and testability:

- **Rich Domain Models** - Business logic in domain entities with behavior, not scattered across layers
- **Dependency Inversion** - All dependencies point inward toward domain (zero external dependencies)
- **Comprehensive Testing** - 168 test files with 85%+ coverage across domain and application layers
- **Feature Isolation** - Each feature is self-contained with clear boundaries

**Project Structure:**
```
src/features/{feature}/
  ├── domain/          # Business logic (zero external dependencies)
  ├── application/     # Use cases and orchestration
  ├── infrastructure/  # Dataverse API, authentication, storage
  └── presentation/    # VS Code panels and webviews
```

**Learn more:** [Clean Architecture Guide](docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md)

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
npm run compile  # TypeScript compilation
npm test         # Run full test suite (168 tests)
```

**Coverage Targets:**
- Domain layer: 95-100%
- Application layer: 85-95%
- Infrastructure layer: 70-85%

**Requirements:**
- Node.js 20.x (recommended) or 18.x
- Note: Node.js 22+ has module resolution issues with vsce packaging tools

**Run in Development**
- Start watch mode: `npm run watch`
- Launch Extension Development Host: press **F5**

**Local Extension Installation**

Install your local development version in VS Code (as if published):
```bash
npm run local
```
This builds, packages, and installs the extension locally. Use it to test your changes in your actual VS Code environment.

Revert to the published marketplace version:
```bash
npm run marketplace
```
This uninstalls your local version and reinstalls the official published version from the VS Code Marketplace.

**When to Use Each:**
- **F5 (Extension Development Host)**: Active development with hot reload - fastest iteration
- **`npm run local`**: Test production-like build in your main VS Code - validate packaging
- **`npm run marketplace`**: Return to stable published version - when local has issues

## 📚 Documentation

### Architecture & Patterns
- **[Clean Architecture Guide](docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md)** - Core principles, layer responsibilities, decision framework
- **[Clean Architecture Examples](docs/architecture/CLEAN_ARCHITECTURE_EXAMPLES.md)** - Real code examples from the codebase
- **[Value Object Patterns](docs/architecture/VALUE_OBJECT_PATTERNS.md)** - Immutable validated primitives
- **[Domain Service Patterns](docs/architecture/DOMAIN_SERVICE_PATTERNS.md)** - Complex business logic patterns
- **[Repository Patterns](docs/architecture/REPOSITORY_PATTERNS.md)** - Data access and API integration

### Testing
- **[Testing Guide](docs/testing/TESTING_GUIDE.md)** - Unit testing patterns, test factories, mocking
- **[Integration Testing Guide](docs/testing/INTEGRATION_TESTING_GUIDE.md)** - Panel integration tests, message passing

### Development Workflows
- **[Workflow Guide](.claude/WORKFLOW.md)** - Feature development, bug fixes, refactoring patterns
- **[CLAUDE.md](CLAUDE.md)** - Quick reference for AI assistants and development rules

### Changelog & Features
- **[CHANGELOG.md](CHANGELOG.md)** - Detailed release history and feature documentation

## 🚨 Troubleshooting

- **Extension not visible**: Reload window (Ctrl+Shift+P → "Reload Window")
- **Authentication issues**: Verify environment URL and app registration permissions
- **Console errors**: Help → Toggle Developer Tools → Console tab

## 🤝 Contributing

Follow Clean Architecture patterns in the [Architecture Guides](./docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md). Open PRs against `main` and add entries under `[Unreleased]` in [`CHANGELOG.md`](./CHANGELOG.md).

---
**License:** MIT | **Publisher:** JoshSmithXRM
