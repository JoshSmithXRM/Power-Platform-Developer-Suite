# Dynamics DevTools

## Project Overview
A comprehensive VSCode extension for Microsoft Dynamics 365 / Power Platform development and administration. Provides a unified toolkit with modern UI components for managing environments, browsing metadata, monitoring solutions, and performing common development tasks.

## Features

### ✅ **Production Ready**
- **Environment Management** - Add, configure, and switch between multiple Dynamics 365 environments
- **Solution Explorer** - Browse, export, and manage Dynamics 365 solutions with advanced filtering
- **Import Job Viewer** - Monitor solution import status and troubleshoot failures with detailed logs
- **Environment Setup** - Guided configuration wizard with connection testing

### 🚧 **Framework Ready** (UI Complete, API Integration Pending)
- **Metadata Browser** - Explore entity metadata and schema information
- **Query Data** - Execute OData queries and analyze results
- **Connection References Manager** - Manage connection references across environments
- **Environment Variables Manager** - Configure environment-specific variables
- **Plugin Trace Viewer** - Analyze plugin execution traces and performance

### 🎨 **Modern UI**
- Clean, responsive interface following VS Code design principles
- Advanced data tables with sorting, filtering, and context menus
- Environment selector with connection status indicators
- Consistent theming that adapts to VS Code themes

### 🏗️ **Robust Architecture**
- Modular service-based architecture with dependency injection
- Shared utilities for consistent UI components and functionality
- State persistence across VS Code sessions
- Comprehensive error handling and user feedback

## Prerequisites
- **Node.js** (includes npm)
  - Download and install from [https://nodejs.org/](https://nodejs.org/)
- **VSCode**
  - Download from [https://code.visualstudio.com/](https://code.visualstudio.com/)

## Installation & Usage

### **Option 1: Install from VSIX (Recommended for Testing)**
1. **Download the latest release** or build from source (see Development Setup below)
2. **Install the extension**
   ```bash
   code --install-extension dynamics-devtools-0.0.1.vsix
   ```
3. **Restart VS Code** or reload the window (`Ctrl+Shift+P` → "Developer: Reload Window")
4. **Open Dynamics DevTools** - Look for the wrench icon (🔧) in the VS Code activity bar

### **Getting Started**
1. **Add an Environment** - Click the "+" button in the Environments section
2. **Configure Authentication** - Choose between Service Principal or Interactive auth
3. **Test Connection** - Verify your environment is accessible
4. **Explore Tools** - Use the tools section to open panels for various tasks

### **Available Tools**
- **Solution Explorer** - Right-click environments to browse solutions
- **Import Job Viewer** - Monitor active and completed import jobs
- **Query Data** - Execute custom OData queries against your environment
- **Metadata Browser** - Explore entity definitions and relationships
- **Connection References** - Manage connection references (coming soon)
- **Environment Variables** - Configure environment-specific settings (coming soon)
- **Plugin Traces** - View plugin execution logs and performance (coming soon)

## Development Setup

### **Building from Source**
1. **Clone the repository**
   ```bash
   git clone https://github.com/JoshSmithXRM/Dynamics-DevTools.git
   cd Dynamics-DevTools
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Build the extension**
   ```bash
   npm run compile
   # Or use VS Code task: "Build Extension"
   ```
4. **Package the extension** (optional)
   ```bash
   npm install -g @vscode/vsce
   vsce package
   ```

### **Development Workflow**
1. **Open in VS Code**
   ```bash
   code .
   ```
2. **Start watch mode** for automatic compilation
   ```bash
   npm run watch
   # Or use VS Code task: "Watch"
   ```
3. **Launch Extension Development Host**
   - Press `F5` in VS Code
   - Or use Command Palette: "Debug: Start Debugging"
4. **Test your changes** in the Extension Development Host window

### **Project Structure**
- `/src/panels/` - Webview panels (Solution Explorer, Query Data, etc.)
- `/src/services/` - Business logic and API services
- `/src/commands/` - VS Code command handlers
- `/src/providers/` - Tree view data providers
- `/src/webview/components/` - Shared UI utilities and styling

## Architecture

This extension follows a clean, modular architecture:

- **Service Layer** - Business logic and API interactions with dependency injection
- **Panel System** - Webview-based UI panels extending a common base class
- **Shared Utilities** - Reusable components for tables, environment selectors, and styling
- **State Management** - Persistent UI state across VS Code sessions

For detailed architecture information, see [ARCHITECTURE_GUIDE.md](./docs/ARCHITECTURE_GUIDE.md).

## Troubleshooting

### **Installation Issues**
- If `npm` or `npx` is not recognized, install Node.js and restart your terminal/VS Code
- For TypeScript errors, ensure you have run `npm install` to install dev dependencies
- If the extension doesn't appear, restart VS Code after installation

### **Authentication Issues**
- Verify your environment URL is correct (should end with .crm.dynamics.com or similar)
- For Service Principal auth, ensure the app registration has appropriate permissions
- Test connection after adding an environment to verify authentication

### **Performance Issues**
- Large datasets may take time to load - use built-in filtering to improve performance
- If panels become unresponsive, try refreshing the environment connection
- Check VS Code Developer Tools (Help → Toggle Developer Tools) for error messages

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Review the architecture** - See [ARCHITECTURE_GUIDE.md](./docs/ARCHITECTURE_GUIDE.md) for patterns and conventions
2. **Follow established patterns** - New panels should extend BasePanel and use shared utilities  
3. **Test thoroughly** - Verify functionality across multiple environments and authentication methods
4. **Update documentation** - Keep README and architecture docs current with changes

### **Development Guidelines**
- Use the ServiceFactory for dependency injection
- Follow the standard panel structure with environment selectors
- Use shared utilities (TableUtils, PanelUtils) for consistent UI
- Implement proper error handling and user feedback
- Test with both Service Principal and Interactive authentication

## Release Notes & Where to Find Changes

For authoritative, versioned change history see `CHANGELOG.md` (Keep a Changelog format).  
Development implementation status and internal guidance for Copilot live in `.github/copilot-instructions.md`.  
Use GitHub Releases for user-facing announcements generated from the changelog.

## License
MIT
