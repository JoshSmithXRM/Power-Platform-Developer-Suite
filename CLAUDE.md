# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Security Rules (Non-Negotiable)

- **Never log, expose, or exfiltrate** tokens, credentials, or sensitive data
- **Use VS Code SecretStorage** for all sensitive information storage
- **All API calls** must go through AuthenticationService - never create alternate auth patterns
- **Validate all user inputs** before making API calls
- **No external network calls** except through proper authentication channels
- **Ask clarifying questions** when requirements are ambiguous

## Development Commands

**Build and Development:**
```bash
npm install              # Install dependencies
npm run compile          # Development build
npm run watch            # Watch mode for development 
npm run package          # Production build with webpack (includes TypeScript type checking)
```

**Extension Testing:**
```bash
npm run vsce-package     # Create .vsix package
npm run test-release     # Build, package, and install locally
npm run clean-install    # Uninstall and reinstall fresh
code --install-extension power-platform-developer-suite-0.1.4.vsix  # Manual install
```

**Development Workflow:**
- Use `npm run watch` for continuous compilation during development
- Press F5 in VS Code to launch Extension Development Host
- Use VS Code task "Build Extension" for webpack compilation

## Architecture Overview

This VS Code extension for Microsoft Dynamics 365/Power Platform follows a modular architecture with clean separation of concerns:

### Core Structure
- **panels/** - Webview panels extending BasePanel (7 panels implemented)
- **services/** - Business logic with dependency injection via ServiceFactory
- **components/** - Reusable UI generation via ComponentFactory  
- **providers/** - VS Code tree view providers (environments, tools)
- **commands/** - Command handlers organized by domain
- **resources/webview/** - Shared client-side utilities and CSS

### Key Architectural Patterns

**Panel Development:**
- All panels extend `BasePanel` class with consistent structure
- Use `ServiceFactory` for dependency injection - never direct instantiation
- Include common webview resources via `getCommonWebviewResources()`
- Follow standard message handling pattern with try/catch error handling

**Service Layer:**
- Services accept dependencies through constructor (especially AuthenticationService)
- Register all services in ServiceFactory with proper initialization
- Focus on single responsibility per service
- Use AuthenticationService for all token management

**UI Components:**
- Use `ComponentFactory` for environment selectors and data tables
- Include shared utilities: TableUtils, PanelUtils, EnvironmentSelectorUtils
- Table data MUST have 'id' property for row actions to work
- Support HTML content in table cells for badges and formatting

**Client-Side Utilities:**
- **PanelUtils** - Common operations (loading states, messaging, error handling)
- **TableUtils** - Complete table functionality (sorting, filtering, row actions, context menus)  
- **EnvironmentSelectorUtils** - Multi-instance environment selector management

### Critical Requirements

**For Table Implementation:**
```javascript
// Data objects MUST have 'id' property for row actions
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

**State Management:**
- Use StateService for UI state persistence (not data caching)
- Always make fresh API calls, only cache UI preferences
- Save panel state: selected environment, sort settings, view config

## API Guidelines

**OData Query Best Practices:**
- Use `$select` to limit fields and improve performance
- Apply `$top` for pagination, `$orderby` for sorting
- Use `$expand` judiciously for related entities
- Server-side filtering preferred over client-side

**Authentication:**
- All API calls go through AuthenticationService
- Never create alternate authentication patterns
- Use proper token management with environment-specific tokens

## Security Requirements

- Never log tokens, credentials, or sensitive data
- Use VS Code SecretStorage for sensitive information
- All external API calls must go through proper authentication
- Validate all user inputs before API calls

## Development Guidelines

**File Organization:**
- Keep files small and single-purpose
- Follow established patterns in existing panels
- Use composition over inheritance
- Maintain consistent naming conventions

**Error Handling:**
- Implement comprehensive try/catch in message handlers
- Provide user-friendly error messages
- Use PanelUtils.showError() for consistent error display

**Testing:**
- Test with multiple environments and authentication methods
- Verify table functionality with row actions and context menus
- Test error scenarios and edge cases

## Webpack Bundling

Extension uses webpack for production optimization:
- Single bundled output: `dist/extension.js`  
- 92% size reduction (127KB vs 1.64MB)
- All dependencies bundled except VS Code API
- Source maps for debugging support

## Change Management Process

**Always Required for Changes:**
1. Update `CHANGELOG.md` under `[Unreleased]` section using Keep a Changelog format
2. Use semantic categories: Added, Changed, Fixed, Deprecated, Removed, Security, Technical
3. Run build verification: `npm run package`
4. Test extension functionality in Extension Development Host (F5)

**Verification Checklist Before Completion:**
- [ ] Build completes successfully (`npm run package`)
- [ ] TypeScript compilation passes (verified by webpack build)
- [ ] Extension loads without errors in Development Host
- [ ] CHANGELOG.md updated with changes
- [ ] All modified functionality tested

## Workflow Guidelines

**Making Code Changes:**
- Make minimal, well-scoped changes that preserve existing APIs
- Follow established patterns in existing files
- Test changes in Extension Development Host (F5) before completion
- Report build status and list modified files when done

**Communication Style:**
- Provide brief plan, execute changes, report results
- Keep responses concise and focused
- Include build/test status in completion reports