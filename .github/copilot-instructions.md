# GitHub Copilot Instructions for Dynamics DevTools

## Project Overview
This is a comprehensive VS Code extension for Microsoft Dynamics 365 / Power Platform development and administration. The extension provides a unified toolkit with modern UI components for managing environments, browsing metadata, monitoring solutions, and performing common development tasks.

**📚 For complete project information, see:**
- **[README.md](../README.md)** - Installation, usage, and getting started guide
- **[docs/ARCHITECTURE_GUIDE.md](../docs/ARCHITECTURE_GUIDE.md)** - Comprehensive architecture patterns and development guidelines

## Current Implementation Status
For the authoritative, versioned implementation status and release history see `CHANGELOG.md`.

Use this file for short, actionable developer hints and Copilot-specific instructions (e.g., which APIs are safe to call, which panels are scaffold-only, and where to find mocks/stubs).

## Release Notes & Change Management

Following industry best practices based on [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/) standards.

### Documentation Hierarchy
- **[CHANGELOG.md](../CHANGELOG.md)** - Authoritative technical record following Keep a Changelog format
- **GitHub Releases** - User-focused release announcements generated from changelog
-- **README.md** - Current stable feature status and getting started guide

### Standard Release Process
1. **During Development**: Track all changes in `[Unreleased]` section of CHANGELOG.md
2. **Pre-Release**: Move unreleased changes to new versioned section with ISO date (YYYY-MM-DD)
3. **Release**: Create GitHub Release referencing changelog with user-focused highlights
4. **Post-Release**: Update README.md feature status if significant changes occurred

### Keep a Changelog Categories
Use semantic categories in CHANGELOG.md entries:
- **Added** - New features and capabilities
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Features removed in this release
- **Fixed** - Bug fixes and corrections
- **Security** - Security vulnerability fixes
- **Technical** - Internal changes, architecture improvements, build system updates

### Content Strategy Guidelines
- **CHANGELOG.md**: Technical accuracy, comprehensive change tracking, developer-focused
- **GitHub Releases**: User impact, benefits, breaking changes, migration guidance
- **README.md**: Honest feature status, clear capability descriptions
- **Version Numbers**: Follow semantic versioning (MAJOR.MINOR.PATCH)

## Core Development Principles

### 1. File Organization & Architecture
- **Follow the established modular architecture** documented in [ARCHITECTURE_GUIDE.md](../docs/ARCHITECTURE_GUIDE.md)
- **Split files logically** following the patterns in `/src` directory:
  - `panels/` - UI components extending `BasePanel` (7 panels implemented)
  - `commands/` - Command handlers organized by domain
  - `providers/` - Tree view data providers
  - `services/` - Business logic and API interactions with dependency injection
  - `webview/components/` - Shared utilities (TableUtils, PanelUtils, etc.)
  - `types/` - Shared TypeScript types and interfaces
- **Single Responsibility**: Each file should have one clear purpose
- **Consistent Structure**: New panels should extend `BasePanel` class
- **Dependency Injection**: Use ServiceFactory for all service dependencies

### 2. Code Style Guidelines
- **Prefer self-documenting code** - use clear, descriptive naming over excessive commenting
- **Strategic comments are welcome** for:
  - Complex algorithms or business logic that isn't immediately obvious
  - Public API contracts and integration points
  - Workarounds for known platform limitations
- **Maintain consistent naming** following existing patterns in the codebase
- **Use TypeScript strictly** with proper type definitions

### 3. Security & Privacy Requirements
- **Never log tokens, credentials, or sensitive data**
- **Use VS Code SecretStorage** for all sensitive information
- **All API calls through AuthenticationService** - no alternate auth patterns
- **Validate user inputs** before API interactions
- **External calls only through proper authentication channels**

## Development Commands

```bash
npm install              # Install dependencies
npm run compile          # Development build
npm run watch            # Watch mode for development
npm run package          # Production build with webpack (includes TypeScript type checking)
npm run vsce-package     # Create .vsix package
npm run test-release     # Build, package, and install locally
```

**Development Workflow:**
- Use `npm run watch` for continuous compilation
- Press F5 to launch Extension Development Host
- Use VS Code "Build Extension" task for webpack compilation

## Core Development Principles (Concise)

- **Follow modular architecture** documented in `docs/ARCHITECTURE_GUIDE.md`
- **Keep files small and single-purpose** - prefer composition over inheritance
- **Use ServiceFactory** for dependency injection and shared services
- **All panels extend BasePanel** with consistent structure and message handling
- **Use shared utilities**: TableUtils, PanelUtils, EnvironmentSelectorUtils

## Critical Technical Requirements

**Table Implementation (REQUIRED):**
```javascript
// Data MUST have 'id' property for row actions to work
const tableData = items.map(item => ({
    id: item.primaryKey,     // Required for TableUtils
    status: calculateStatus(item),  // Can contain HTML badges
    ...item
}));

// Initialize with action handlers
TableUtils.initializeTable('tableId', {
    onRowAction: handleRowAction  // (actionId, rowData) => void
});
```

**Panel Development Pattern:**
- Extend `BasePanel` class with dependency injection via ServiceFactory
- Include common webview resources via `getCommonWebviewResources()`
- Follow standard message handling with try/catch error handling
- Use StateService for UI state persistence (not data caching)

## API & Dynamics Guidelines

- **OData queries**: Use `$select`, `$top`, `$orderby`, `$expand` appropriately
- **Server-side pagination preferred** - be aware some entities have quirks
- **AuthenticationService only** for token management - no alternate patterns
- **Fresh API calls always** - only cache UI preferences, not data

## UI & Panel Guidelines

- **Extend BasePanel** for all webview panels with established message-passing pattern
- **Use ComponentFactory** for environment selectors and data tables
- **Include shared utilities**: TableUtils, PanelUtils, EnvironmentSelectorUtils
- **Ensure proper disposal** of panels and listeners to avoid memory leaks
- **Table data requirements**: MUST have 'id' property for row actions
- **Support HTML content** in table cells for badges and formatting

## Hard Rules (Non-Negotiable)

- **Never exfiltrate secrets, credentials, or sensitive data**
- **No external network calls** except when explicitly requested and permitted
- **Never paste raw patch diffs or terminal commands** - use repository workflows
- **Ask clarifying questions** when requirements are ambiguous
- **Use VS Code SecretStorage** for all sensitive data storage

## Quick Reference — Do / Don't

**DO:**
- Reuse existing utilities (`TableUtils`, `PanelUtils`, `EnvironmentSelectorUtils`)
- Follow established architectural patterns in existing panels
- Update `CHANGELOG.md` under `[Unreleased]` for all changes
- Run build verification before completion (`npm run package`)
- Test in Extension Development Host (F5) before marking complete

**DON'T:**
- Invent new authentication patterns - use AuthenticationService only
- Hardcode URLs or connection strings
- Modify large unrelated files - keep changes focused
- Create direct service instances - use ServiceFactory dependency injection
- Cache API data - only persist UI state preferences

## Communication & response style
- Provide a one-line plan, a short checklist of steps, then perform edits. Keep messages concise.
- When editing code, report build/typecheck status and list the files changed.

## Change tracking
- Always update `CHANGELOG.md` under `[Unreleased]` for development changes. Move entries to a versioned section when releasing.

## Webpack Bundling

Extension uses webpack for production optimization:
- Single bundled output: `dist/extension.js`
- 92% size reduction (127KB vs 1.64MB)
- All dependencies bundled except VS Code API
- Source maps for debugging support
