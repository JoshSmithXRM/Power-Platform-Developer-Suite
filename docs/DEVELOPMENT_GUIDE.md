# Development Guide

This guide covers the practical aspects of developing with the Power Platform Developer Suite codebase, including setup, workflow, debugging, and deployment.

## Development Environment Setup

### Prerequisites
- Node.js (16.x or later)
- VS Code with recommended extensions
- Git for version control

### Initial Setup
```bash
# Clone and setup
git clone <repository-url>
cd power-platform-developer-suite
npm install

# Verify setup
npm run compile
```

### Recommended VS Code Extensions
- **TypeScript and JavaScript Language Features** (built-in)
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Test runner integration

## Development Workflow

### Build Commands

```bash
# Development builds
npm run compile          # Compile TypeScript (development mode)
npm run watch           # Watch mode for continuous compilation

# Production builds  
npm run package         # Webpack production build with optimization
npm run vsce-package    # Create .vsix package for distribution

# Testing and quality
npm run test           # Run test suite
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

### Development Cycle

1. **Start watch mode**: `npm run watch`
2. **Launch Extension Development Host**: Press `F5` in VS Code
3. **Make changes**: Edit source files
4. **Test changes**: Use Extension Development Host
5. **Debug**: Use VS Code debugger or browser DevTools
6. **Package and test**: `npm run test-release`

### Hot Reloading
- **Extension Host changes**: Reload Extension Development Host (`Ctrl+R`)
- **Webview changes**: Refresh webview or reload Extension Development Host
- **Configuration changes**: Restart Extension Development Host

## Project Structure Navigation

### Core Directories
```
src/
├── panels/              # Webview panels (UI orchestration)
├── components/          # Reusable UI components
│   ├── base/           # Base classes and interfaces
│   ├── selectors/      # Environment, solution selectors
│   ├── tables/         # Data tables and grids
│   └── forms/          # Action bars, forms
├── services/           # Business logic and API services
├── factories/          # Object creation and composition
├── providers/          # VS Code tree view providers
└── commands/           # Command handlers

resources/webview/
├── css/                # Component styling
└── js/                 # Webview behavior scripts

docs/                   # Documentation
```

### Finding Components
- **By functionality**: Browse `src/components/[category]/`
- **By panel usage**: Check panel imports and composition
- **By factory method**: Search ComponentFactory methods

## Debugging Strategies

### Extension Host Debugging

**VS Code Debugger (Recommended)**:
1. Set breakpoints in TypeScript files
2. Press `F5` to launch Extension Development Host
3. Debugger attaches automatically
4. Use VS Code Debug Console for inspection

**Logging**:
```typescript
// Use component logger in Extension Host with appropriate levels
this.componentLogger.trace('Component lifecycle event', { componentId }); // UI lifecycle
this.componentLogger.debug('Component state changed', { newState });      // Development info
this.componentLogger.info('User action completed', { actionId });         // Business events
this.componentLogger.warn('Recoverable issue detected', { issue });       // Non-critical issues
this.componentLogger.error('Operation failed', error, { context });       // Failures

// View logs in VS Code Output panel: "Power Platform Developer Suite"
```

**Log Level Guidelines**:
- **TRACE**: UI lifecycle events (dropdowns open/close, focus changes)
- **DEBUG**: State changes, method entry/exit, user input processing
- **INFO**: Business events, user actions with business impact, successful operations
- **WARN**: Recoverable issues, missing optional data, fallback behaviors
- **ERROR**: Failures requiring user attention, unrecoverable errors

### Webview Debugging

**Browser DevTools**:
1. Open Extension Development Host
2. Open target panel/webview
3. Press `Ctrl+Shift+I` to open DevTools
4. Set breakpoints in behavior scripts
5. Use Console for live debugging

**Console Logging**:
```javascript
// In webview behavior scripts
console.log('Component initialized:', componentId);
console.log('Message received:', message);
```

**Component Event Logging Patterns**:
```typescript
// Panel message handlers - log based on business significance
private async handleComponentEvent(message: WebviewMessage): Promise<void> {
    const { componentId, eventType, data } = message.data || {};
    
    if (eventType === 'selectionChanged') {
        // Business event - INFO level
        this.componentLogger.info(`Selection: ${data.selectedItem?.name}`, { 
            itemId: data.selectedItem?.id 
        });
    } else if (eventType === 'search') {
        // User input - DEBUG level
        this.componentLogger.debug(`Search: "${data.query}"`, { componentId });
    } else {
        // UI lifecycle - TRACE level  
        this.componentLogger.trace(`Event: ${componentId}/${eventType}`);
    }
}
```

### Common Debug Scenarios

**Component not updating**:
1. Check event bridge setup in panel
2. Verify message handling in behavior script
3. Confirm component ID consistency
4. Check for JavaScript errors in DevTools

**Panel not loading**:
1. Check constructor parameters
2. Verify service dependencies
3. Review HTML generation in getHtmlContent()
4. Check for TypeScript compilation errors

**Service errors**:
1. Check authentication tokens
2. Verify API endpoint URLs
3. Review network requests in DevTools
4. Check service error handling

## Testing Approach

### Unit Testing

**Component Tests**:
```typescript
// Test component business logic
describe('DataTableComponent', () => {
    it('should emit update event when data changes', () => {
        const component = new DataTableComponent(mockConfig);
        const updateSpy = jest.fn();
        component.on('update', updateSpy);
        
        component.setData(testData);
        
        expect(updateSpy).toHaveBeenCalled();
    });
});
```

**Service Tests**:
```typescript
// Test service business logic with mocked dependencies
describe('EnvironmentService', () => {
    it('should fetch environments from API', async () => {
        const mockAuthService = {
            getToken: jest.fn().mockResolvedValue('mock-token')
        };
        
        const service = new EnvironmentService(mockAuthService);
        const environments = await service.getEnvironments();
        
        expect(environments).toHaveLength(2);
    });
});
```

### Integration Testing

**Panel Testing**:
```typescript
// Test panel composition and message handling
describe('EnvironmentVariablesPanel', () => {
    it('should compose components correctly', () => {
        const panel = new EnvironmentVariablesPanel(mockWebviewPanel, mockUri);
        const html = panel.getHtmlContent();
        
        expect(html).toContain('data-component-type="EnvironmentSelector"');
        expect(html).toContain('data-component-type="DataTable"');
    });
});
```

### Test Organization
```
src/
├── components/
│   └── DataTable/
│       ├── DataTableComponent.ts
│       └── DataTableComponent.test.ts    # Unit tests
├── panels/
│   └── EnvironmentVariablesPanel.test.ts  # Integration tests
└── services/
    └── EnvironmentService.test.ts         # Service tests
```

## Code Quality Standards

### TypeScript Configuration
- **Strict mode enabled**: Full type checking
- **No implicit any**: All types must be explicit
- **Unused locals/parameters**: Compiler errors for unused code

### Linting Rules
```json
{
  "@typescript-eslint/no-unused-vars": "error",
  "@typescript-eslint/explicit-function-return-type": "warn",
  "@typescript-eslint/no-explicit-any": "warn",
  "prefer-const": "error"
}
```

### Code Formatting
- **Prettier configuration**: Consistent code style
- **Line length**: 100 characters maximum
- **Indentation**: 2 spaces for TypeScript, 4 spaces for JSON

### Import Organization
```typescript
// 1. Node.js imports
import * as vscode from 'vscode';
import * as path from 'path';

// 2. Internal imports (absolute paths)
import { BasePanel } from '../base/BasePanel';
import { ComponentFactory } from '../../factories/ComponentFactory';

// 3. Type-only imports
import type { DataTableConfig } from './DataTableConfig';
```

## Error Handling Patterns

### Service Layer Errors
```typescript
export class DataService {
    async fetchData(params: any): Promise<DataResult> {
        try {
            const response = await this.apiCall(params);
            return this.processResponse(response);
        } catch (error) {
            this.logger.error('Data fetch failed', error, { params });
            
            // Return error object instead of throwing
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }
}
```

### Panel Layer Error Handling
```typescript
export class MyPanel extends BasePanel {
    private async loadData(): Promise<void> {
        try {
            const result = await this.dataService.fetchData(params);
            
            if (!result.success) {
                this.showError(result.error);
                return;
            }
            
            this.updateComponents(result.data);
        } catch (error) {
            this.componentLogger.error('Panel data loading failed', error);
            this.showError('Failed to load data. Please try again.');
        }
    }
    
    private showError(message: string): void {
        this.postMessage({
            command: 'show-error',
            message: message
        });
    }
}
```

### Component Error States
```typescript
export class BaseComponent extends EventEmitter {
    protected handleError(error: Error, context: string): void {
        this.setState({ 
            error: {
                message: error.message,
                context: context,
                recoverable: true
            }
        });
        
        this.notifyError(error, context);
    }
}
```

## Performance Guidelines

### Component Updates
- **Use event bridges**: Avoid full HTML regeneration
- **Batch updates**: Combine multiple state changes
- **Debounce user input**: Prevent excessive API calls

### Memory Management
```typescript
export class BasePanel {
    dispose(): void {
        // Clean up component instances
        this.components.forEach(component => component.dispose());
        
        // Remove event listeners
        this.panel.onDidDispose(() => this.cleanup());
        
        // Clear references
        this.components.clear();
    }
}
```

### Bundle Optimization
- **Tree shaking**: Remove unused code
- **Code splitting**: Separate vendor dependencies
- **Source maps**: Debug production builds

## Deployment Process

### Local Testing
```bash
# Full test cycle
npm run compile
npm run test
npm run package
npm run vsce-package

# Install locally for testing
code --install-extension power-platform-developer-suite-*.vsix
```

### Release Preparation
1. **Update version**: Increment version in `package.json`
2. **Update changelog**: Document changes in `CHANGELOG.md`
3. **Run full test suite**: `npm run test`
4. **Create release package**: `npm run vsce-package`
5. **Test package installation**: Install and verify functionality

### Debugging Production Issues
- **Source maps**: Available for production debugging
- **Logging**: Review VS Code extension logs
- **User reports**: Gather reproduction steps
- **Error telemetry**: Monitor for common failure patterns

## Common Development Tasks

### Adding a New Component
1. Create four-file structure in `src/components/[category]/[ComponentName]/`
2. Implement BaseComponent interface
3. Add factory method in ComponentFactory
4. Create webview behavior script
5. Add component styling
6. Write unit tests

### Adding a New Panel
1. Extend BasePanel class
2. Compose from existing components
3. Implement message handlers
4. Add command registration
5. Update package.json contributions
6. Write integration tests

### Modifying Existing Components
1. Update component logic
2. Modify view rendering if needed
3. Update behavior script if needed
4. Update configuration interface
5. Run existing tests
6. Update tests if needed

### Debugging Steps
1. **Identify layer**: Extension Host vs Webview
2. **Check logs**: Component logger or browser console
3. **Verify data flow**: Service → Panel → Component
4. **Test isolation**: Unit test individual components
5. **Check dependencies**: Services, factories, configuration

## Related Documentation

This development guide provides the foundation for effective development within the Power Platform Developer Suite architecture. For architectural and design guidance:

- **[Architecture Guide](ARCHITECTURE_GUIDE.md)** - Architectural decisions, SOLID principles, and design patterns
- **[Component Patterns](COMPONENT_PATTERNS.md)** - Component design patterns and implementation guidelines  
- **[Styling Patterns](STYLING_PATTERNS.md)** - CSS architecture and visual consistency standards

Follow these patterns and practices to maintain code quality and consistency across the extension.