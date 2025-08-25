# GitHub Copilot Instructions for Dynamics DevTools

## Project Overview
This is a comprehensive VS Code extension for Microsoft Dynamics 365 / Power Platform development and administration. The extension provides a unified toolkit with modern UI components for managing environments, browsing metadata, monitoring solutions, and performing common development tasks.

**📚 For complete project information, see:**
- **[README.md](../README.md)** - Installation, usage, and getting started guide
- **[docs/ARCHITECTURE_GUIDE.md](../docs/ARCHITECTURE_GUIDE.md)** - Comprehensive architecture patterns and development guidelines

## Current Implementation Status
✅ **All 7 panels implemented** following consistent architecture patterns:
- **Production Ready**: Solution Explorer, Import Job Viewer, Query Data, Metadata Browser, Environment Setup
- **Framework Ready**: Connection References Manager, Environment Variables Manager, Plugin Trace Viewer

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
  - Workarounds for known issues or API limitations
  - "Why" explanations when the "what" is clear but the reasoning isn't
  - External dependencies or integration quirks
  - Performance optimizations that trade readability for speed
- **Use descriptive variable and function names**
- **Prefer composition over inheritance** (except for UI panels)
- **Keep functions small and focused**
- **Use TypeScript types extensively** for better developer experience

### 3. Decision Making Process
- **Do NOT over-engineer solutions** - prefer simple, working implementations
- **Always consult before making architectural decisions**
- **Discuss breaking changes or new patterns before implementation**
- **Follow existing patterns unless there's a compelling reason to change**
- **Reference the [ARCHITECTURE_GUIDE.md](../docs/ARCHITECTURE_GUIDE.md)** for established patterns and best practices

## Dynamics 365 & OData API Guidelines

### Required Reading
Before working with Dynamics/Power Platform APIs, reference these official Microsoft docs:
- [OData CLI Getting Started](https://learn.microsoft.com/en-us/odata/odatacli/getting-started)
- [OData Get Data Concepts](https://learn.microsoft.com/en-us/odata/concepts/get-data)
- [OData Query Options Overview](https://learn.microsoft.com/en-us/odata/concepts/queryoptions-overview)
- [OData Query Options Usage](https://learn.microsoft.com/en-us/odata/concepts/queryoptions-usage)

### API Best Practices
- **Always use `$select`** to specify required fields only
- **Use `$top` and `$skip`** for pagination (note: some entities like `importjobs` don't support `$skip`)
- **Use `$orderby`** for consistent data ordering
- **Use `$expand`** for related data when needed
- **Include `$count=true`** when pagination info is needed
- **Handle API errors gracefully** with user-friendly messages

### Authentication & Token Management
- **Use the existing `AuthenticationService`** - do not create new auth patterns
- **Cache tokens appropriately** through the service
- **Handle token expiration** and refresh automatically
- **Test authentication flows** with different auth methods

## UI Development Guidelines

### Panel Development
- **Extend `BasePanel`** for all new webview panels
- **Use the established message passing pattern** between extension and webview
- **Implement proper disposal** to prevent memory leaks
- **Follow VS Code theming** using CSS variables (`var(--vscode-*)`)
- **Make UIs responsive** and accessible

### Environment Handling
- **Always validate environment selection** before API calls
- **Cache environment data** when appropriate
- **Provide clear environment status feedback** to users
- **Handle environment switching** gracefully

### Error Handling
- **Show user-friendly error messages** in VS Code notifications
- **Log detailed errors** to console for debugging
- **Gracefully handle network failures** and timeouts
- **Provide fallback behavior** when possible

## Performance Considerations

### Data Loading
- **Load data efficiently** - avoid unnecessary API calls
- **Implement caching** for frequently accessed data
- **Use pagination** when supported by the API
- **Show loading states** to users during API calls

### Memory Management
- **Dispose of panels properly** when closed
- **Clean up event listeners** and subscriptions
- **Avoid memory leaks** in long-running operations

## Testing Guidelines

### Manual Testing
- **Test with multiple environments** (dev, prod, different auth methods)
- **Test error scenarios** (network failures, auth failures, etc.)
- **Test with large datasets** to ensure performance
- **Test UI responsiveness** on different screen sizes

### Code Quality
- **Ensure TypeScript compilation** without errors or warnings
- **Follow existing naming conventions**
- **Maintain consistent code formatting**
- **Keep functions focused** and testable

## Security Considerations

### Authentication
- **Never log sensitive data** (tokens, passwords, secrets)
- **Use secure storage** for credentials via VS Code's `SecretStorage`
- **Validate user inputs** before processing
- **Handle authentication state** properly

### API Interactions
- **Validate API responses** before processing
- **Sanitize user inputs** in OData queries
- **Use HTTPS endpoints** only
- **Follow principle of least privilege** in API permissions

## Common Patterns to Follow

### Panel Creation
```typescript
export class NewPanel extends BasePanel {
    public static readonly viewType = 'newPanel';
    
    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const panel = BasePanel.createWebviewPanel({
            viewType: NewPanel.viewType,
            title: 'Panel Title'
        });
        new NewPanel(panel, extensionUri, authService);
    }
    
    protected async handleMessage(message: WebviewMessage): Promise<void> {
        // Handle webview messages
    }
    
    protected getHtmlContent(): string {
        // Return HTML content
    }
}
```

### Command Registration
```typescript
export class DomainCommands {
    constructor(private authService: AuthenticationService, private context: vscode.ExtensionContext) {}
    
    public registerCommands(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand('dynamics-devtools.commandName', () => {
                // Command implementation
            })
        ];
    }
}
```

## Communication Guidelines

### Response Style
- **Keep responses concise and focused** on the specific task at hand
- **Do NOT provide task summaries** unless explicitly requested by the user
- **Confirm completion** with a brief statement like "Done" or "Updated successfully"
- **Only elaborate** when the user asks for explanations or details

### Testing & Validation
- **Inform the user when to test the build** instead of running tests automatically
- **Let the user validate functionality** and report results back
- **Wait for user confirmation** before proceeding with dependent changes

## What NOT to Do

### Anti-Patterns
- ❌ Don't create monolithic files (keep under 500 lines when possible)
- ❌ Don't duplicate code across panels - use base classes or utilities
- ❌ Don't hardcode URLs or configuration - use environment settings
- ❌ Don't ignore errors silently - always provide user feedback
- ❌ Don't create new authentication patterns - use existing service
- ❌ Don't add features without considering existing users' workflows

### Performance Anti-Patterns
- ❌ Don't load all data without pagination
- ❌ Don't make unnecessary API calls
- ❌ Don't block the UI thread with long-running operations
- ❌ Don't create memory leaks with uncleaned event listeners

## Project-Specific Knowledge

### Key Extension Points
- **Environment Management**: All auth and environment switching
- **Solution Operations**: Import, export, and solution management
- **Data Browsing**: Entity/table exploration and querying
- **Import Job Monitoring**: Solution import status and history

### Important Files to Understand
- `AuthenticationService.ts` - Handles all authentication flows
- `BasePanel.ts` - Foundation for all UI panels
- `extension.ts` - Main entry point and registration
- `EnvironmentsProvider.ts` - Environment tree view logic

### Common User Workflows
1. **Setup**: Add environment → Test connection → Use tools
2. **Solution Work**: Browse solutions → Open in Maker/Classic → Monitor imports
3. **Data Exploration**: Browse entities → Query data → Export results
4. **Troubleshooting**: View import jobs → Check status → Review errors

Remember: This extension is used by developers working with Microsoft Dynamics 365 and Power Platform. Users expect professional, reliable tools that integrate well with their existing development workflows.

## 📚 Essential Documentation

For comprehensive information about this project:

1. **[README.md](../README.md)** - Start here for:
   - Project overview and features
   - Installation and usage instructions
   - Development setup and workflow
   - Troubleshooting guide

2. **[docs/ARCHITECTURE_GUIDE.md](../docs/ARCHITECTURE_GUIDE.md)** - Essential for development:
   - Complete architecture patterns and principles
   - Panel implementation guidelines
   - Service layer patterns and best practices
   - Shared utilities documentation
   - Code examples and templates
