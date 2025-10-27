# Error Handling Patterns

**Last Updated**: 2025-10-27
**Status**: ✅ Official Standard

---

## Overview

This document defines the official error handling patterns for the Power Platform Developer Suite. All panels, components, and services must follow these patterns for consistency and maintainability.

**Target Audience**: Developers, Power Platform administrators, and technical power users. Error messages should be **technical but actionable**.

---

## Core Principles

1. **Type-Safe Error Handling** - Always use `unknown` in catch blocks
2. **Rich Error Context** - Log comprehensive metadata for debugging
3. **Context-Aware Notifications** - Use appropriate notification method for severity
4. **Fail Fast** - Stop on errors, don't cascade null references
5. **User Empowerment** - Give technical users actionable information

---

## Standard Error Handling Pattern

### ✅ Basic Pattern (All async operations)

```typescript
try {
    const data = await this.service.getData(environmentId);
    this.dataTable.setData(data);

} catch (error: unknown) {
    // 1. Extract error message with type safety
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 2. Log with rich context
    this.componentLogger.error('Failed to load data', error as Error, {
        environmentId,
        operation: 'loadData',
        timestamp: new Date().toISOString()
    });

    // 3. Notify user (in-panel for recoverable errors)
    this.postMessage({
        action: 'error',
        message: `Failed to load data: ${errorMessage}`
    });
}
```

**Required Elements**:
- ✅ `catch (error: unknown)` - Never `any`
- ✅ Type guard: `error instanceof Error ? error.message : 'Unknown error'`
- ✅ `this.componentLogger.error()` with context metadata
- ✅ User notification via `postMessage()` or `vscode.window.showErrorMessage()`

---

## Notification Strategy: Context-Aware

### 🔵 In-Panel Errors (Recoverable)

**Use**: `this.postMessage({ action: 'error', message: '...' })`

**When**:
- Data loading failures (can retry)
- Filter/search returns no results
- Operation failed but panel remains functional
- User can take action to resolve (change filter, switch environment, retry)

**Example**:
```typescript
try {
    const traces = await this.pluginTraceService.getPluginTraceLogs(environmentId, filters);
    if (traces.length === 0) {
        this.postMessage({
            action: 'info',
            message: 'No traces found matching filters'
        });
    }
    this.dataTable.setData(traces);
} catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.componentLogger.error('Failed to load traces', error as Error, { environmentId });

    // In-panel error - user can retry or adjust filters
    this.postMessage({
        action: 'error',
        message: `Failed to load traces: ${errorMessage}`
    });
}
```

**Why**: Non-intrusive, contextual, user stays in flow. Panel remains usable.

---

### 🔴 Critical Errors (System Failures)

**Use**: `vscode.window.showErrorMessage('...')`

**When**:
- Authentication/authorization failures
- Environment not found or unreachable
- Panel initialization failures
- Missing required configuration
- Cannot proceed without user intervention

**Example**:
```typescript
try {
    const environment = await this.authService.getEnvironment(environmentId);
    if (!environment) {
        throw new Error('Environment not found');
    }

    const token = await this.authService.getAccessToken(environmentId);
    if (!token) {
        throw new Error('Authentication required');
    }

} catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.componentLogger.error('Critical initialization failure', error as Error, {
        environmentId,
        operation: 'initialize'
    });

    // Critical error - user must fix external issue
    vscode.window.showErrorMessage(
        `Cannot initialize panel: ${errorMessage}. Please check environment configuration.`
    );
}
```

**Why**: Demands immediate attention. User cannot proceed without resolving. Toast notification ensures visibility even if user switched tabs.

---

### ⚠️ Don't Use Both (Avoid Redundancy)

```typescript
// ❌ BAD - Redundant notifications
catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.postMessage({ action: 'error', message: errorMessage });
    vscode.window.showErrorMessage(errorMessage);  // Don't duplicate!
}

// ✅ GOOD - Pick one based on severity
catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (this.isCriticalError(error)) {
        vscode.window.showErrorMessage(errorMessage);  // Critical only
    } else {
        this.postMessage({ action: 'error', message: errorMessage });  // Recoverable only
    }
}
```

---

## Success Notifications: Only When Needed

### ✅ Send Success Messages When:

**Webview needs state that component event bridge doesn't provide**

```typescript
// ✅ YES - Webview needs count, completion status
try {
    const traces = await this.pluginTraceService.getPluginTraceLogs(...);
    this.dataTable.setData(tableData);  // Event bridge updates table

    // But webview also needs:
    // - Count for display badge
    // - Completion flag to hide loading spinner
    // - Enable/disable actions based on result
    this.postMessage({
        action: 'tracesLoaded',
        count: traces.length,
        hasResults: traces.length > 0
    });
} catch (error: unknown) { ... }

// ✅ YES - Multi-step operation completed
try {
    await this.pluginTraceService.setTraceLevel(environmentId, newLevel);

    // Webview needs confirmation to:
    // - Update UI state (button labels, etc.)
    // - Show success message to user
    // - Proceed to next step in workflow
    this.postMessage({
        action: 'traceLevelSet',
        level: newLevel,
        displayName: this.pluginTraceService.getTraceLevelDisplayName(newLevel)
    });
} catch (error: unknown) { ... }
```

### ❌ Don't Send When:

**Component event bridge already handles it**

```typescript
// ❌ NO - Event bridge already notifies webview
try {
    const entities = await this.metadataService.getEntityMetadata(...);
    this.dataTable.setData(entities);  // Event bridge triggers 'data-updated'

    // Don't send: this.postMessage({ action: 'loaded' });  ← Redundant!
} catch (error: unknown) { ... }

// ❌ NO - Component handles its own state
try {
    this.environmentSelector.setSelectedEnvironment(envId);  // Event bridge handles it

    // Don't send: this.postMessage({ action: 'environmentSelected' });  ← Redundant!
} catch (error: unknown) { ... }
```

### 📋 Decision Matrix

| Scenario | Send Success? | Reason |
|----------|---------------|--------|
| Data loaded into table | ❌ No | Event bridge updates table automatically |
| Data loaded + count needed | ✅ Yes | Webview needs count for UI (badge, status) |
| Selector value changed | ❌ No | Event bridge handles selector state |
| Multi-step operation done | ✅ Yes | Webview needs to advance workflow |
| Settings saved | ✅ Yes | User needs confirmation feedback |
| Record deleted | ✅ Yes | Webview needs to refresh + confirm |
| Filter applied | ❌ No | Event bridge re-renders filtered table |

---

## Error Context Metadata

### ✅ Always Include

Every error log should include:

```typescript
this.componentLogger.error('Operation failed', error as Error, {
    // Operation context
    operation: 'loadTraces',           // What operation failed

    // Request context
    environmentId,                     // What environment
    entityLogicalName,                 // What entity (if applicable)
    filterId,                         // What filter (if applicable)

    // Component context
    componentId: this.componentId,     // Which component
    panelId: this.panelId,            // Which panel instance

    // Timing
    timestamp: new Date().toISOString(), // When it failed

    // Additional context (optional but helpful)
    requestUrl: url,                   // API endpoint (if applicable)
    statusCode: response.status        // HTTP status (if applicable)
});
```

**Why**: When users report bugs, we need complete context to reproduce and fix.

---

## Error Boundary Pattern (DRY)

For panels with many async operations, use a reusable error handler:

```typescript
export abstract class BasePanel {
    /**
     * Execute async operation with standardized error handling
     */
    protected async executeWithErrorHandling<T>(
        operation: () => Promise<T>,
        operationName: string,
        metadata: Record<string, unknown>,
        isCritical: boolean = false
    ): Promise<T | null> {
        try {
            return await operation();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Always log
            this.componentLogger.error(`${operationName} failed`, error as Error, {
                operation: operationName,
                isCritical,
                ...metadata
            });

            // Notify based on severity
            if (isCritical) {
                vscode.window.showErrorMessage(
                    `${operationName} failed: ${errorMessage}`
                );
            } else {
                this.postMessage({
                    action: 'error',
                    message: `${operationName} failed: ${errorMessage}`
                });
            }

            return null;
        }
    }
}

// Usage in panels
const data = await this.executeWithErrorHandling(
    () => this.service.getData(environmentId),
    'Load plugin traces',
    { environmentId, filterCount: filters.length },
    false  // Not critical
);

if (!data) {
    return; // Error already handled and logged
}

// Continue with data
this.dataTable.setData(data);
```

**Benefits**:
- ✅ DRY - No repeated error handling boilerplate
- ✅ Consistency - All errors handled identically
- ✅ Easy enhancement - Add retry logic, telemetry in one place
- ✅ Type-safe - Generic return type `T | null`

---

## Error Messages for Technical Users

**Target Audience**: Developers, admins, power users who understand technical concepts.

### ✅ Good Messages (Technical + Actionable)

```typescript
// ✅ Technical detail + what to do
'Failed to fetch entity metadata: 401 Unauthorized. Token may be expired - reconnect to environment.'

// ✅ Specific error + context
'Failed to load traces: Request timed out after 15s. Check network connection or Dataverse service health.'

// ✅ API error + suggestion
'Failed to delete trace: 403 Forbidden. User lacks prvDeletePluginTraceLog privilege.'

// ✅ System state + action
'Cannot load solution: Environment "dev" not found in configuration. Add environment via Environment Setup.'
```

### ❌ Avoid

```typescript
// ❌ Too vague, no context
'An error occurred'

// ❌ Technical jargon without explanation
'ECONNRESET'  // What does this mean? What should I do?

// ❌ Overly simplified (our users are technical)
'Something went wrong'  // This is a developer tool, be specific!

// ❌ No actionable guidance
'Failed to load data'  // Failed why? What can I do about it?
```

### Template for Technical Error Messages

```
{Operation} failed: {Specific Error}. {Actionable Guidance}

Examples:
"Load metadata failed: 404 Not Found. Entity 'customentity' may not exist in this environment."
"Authentication failed: Token expired. Reconnect to environment in Environment Setup."
"Delete operation failed: 403 Forbidden. Check user privileges in Dataverse security roles."
```

---

## Prevent Error Cascades

### ✅ Guard Against Null After Error

```typescript
// ✅ GOOD - Stop early, don't cascade
async loadData(environmentId: string): Promise<void> {
    const environment = await this.getEnvironment(environmentId);
    if (!environment) {
        return; // Stop here, getEnvironment() already logged error
    }

    const token = await this.getToken(environment);
    if (!token) {
        return; // Stop here, getToken() already logged error
    }

    // Safe to proceed - both values guaranteed non-null
    const data = await this.fetchData(token, environment);
    this.dataTable.setData(data);
}

// ❌ BAD - Cascading null reference errors
async loadData(environmentId: string): Promise<void> {
    const environment = await this.getEnvironment(environmentId);
    const token = await this.getToken(environment);  // ← Crashes if environment is null!
    const data = await this.fetchData(token, environment);  // ← Crashes if token is null!

    // User sees 3 errors for 1 root cause!
}
```

**Why**: One root cause should not trigger multiple error messages. Fail fast, fail cleanly.

---

## Error Severity Classification

Use severity levels to categorize errors:

```typescript
enum ErrorSeverity {
    INFO = 'info',           // Expected, informational (e.g., no results found)
    WARNING = 'warning',     // Unexpected but recoverable (e.g., partial data)
    ERROR = 'error',         // Operation failed, user can retry (e.g., network)
    CRITICAL = 'critical'    // System failure, requires intervention (e.g., auth)
}

private handleError(
    error: unknown,
    severity: ErrorSeverity,
    operation: string,
    metadata?: Record<string, unknown>
): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Always log with severity
    this.componentLogger.error(`${operation} failed`, error as Error, {
        severity,
        operation,
        ...metadata
    });

    // Notify based on severity
    switch (severity) {
        case ErrorSeverity.INFO:
            this.postMessage({ action: 'info', message: errorMessage });
            break;

        case ErrorSeverity.WARNING:
            this.postMessage({ action: 'warning', message: errorMessage });
            break;

        case ErrorSeverity.ERROR:
            this.postMessage({ action: 'error', message: errorMessage });
            break;

        case ErrorSeverity.CRITICAL:
            // Critical gets both in-panel AND toast
            this.postMessage({ action: 'error', message: errorMessage });
            vscode.window.showErrorMessage(`${operation} failed: ${errorMessage}`);
            break;
    }
}

// Usage
this.handleError(
    error,
    ErrorSeverity.ERROR,
    'Load plugin traces',
    { environmentId, filterCount }
);
```

---

## Common Error Scenarios

### Authentication Errors

```typescript
try {
    const token = await this.authService.getAccessToken(environmentId);
} catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.componentLogger.error('Authentication failed', error as Error, { environmentId });

    // Critical - user must reauthenticate
    vscode.window.showErrorMessage(
        `Authentication failed: ${errorMessage}. Reconnect to environment in Environment Setup.`
    );
}
```

### Network Errors

```typescript
try {
    const response = await fetch(url, { signal: controller.signal });
} catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        this.componentLogger.error('Request timeout', error as Error, { url });
        this.postMessage({
            action: 'error',
            message: `Request timed out after 15s. Check network connection.`
        });
    } else {
        this.componentLogger.error('Network error', error as Error, { url });
        this.postMessage({
            action: 'error',
            message: `Network error: ${errorMessage}`
        });
    }
}
```

### API Errors (Dataverse)

```typescript
try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
        const error = new Error(`API request failed: ${response.status} ${response.statusText}`);
        this.componentLogger.error('Dataverse API error', error, {
            url,
            status: response.status,
            statusText: response.statusText
        });

        // Provide specific guidance based on status
        let message = `API error: ${response.status} ${response.statusText}.`;
        if (response.status === 401) {
            message += ' Token expired - reconnect to environment.';
        } else if (response.status === 403) {
            message += ' Insufficient privileges - check security roles.';
        } else if (response.status === 404) {
            message += ' Resource not found - it may have been deleted.';
        }

        this.postMessage({ action: 'error', message });
        return;
    }

} catch (error: unknown) { ... }
```

### Validation Errors

```typescript
if (!environmentId) {
    this.componentLogger.warn('Missing required parameter', { operation: 'loadData' });
    this.postMessage({
        action: 'error',
        message: 'Environment ID is required. Please select an environment.'
    });
    return;
}

if (filters.length === 0) {
    this.componentLogger.info('No filters provided', { operation: 'loadData' });
    this.postMessage({
        action: 'info',
        message: 'No filters applied - showing all records.'
    });
    // Continue with operation
}
```

---

## References

- [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - Component architecture
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Development standards
- [EXECUTION_CONTEXTS.md](EXECUTION_CONTEXTS.md) - Extension Host vs Webview
- [MESSAGE_CONVENTIONS.md](MESSAGE_CONVENTIONS.md) - Message patterns

---

**Status**: ✅ Official Standard
**Last Updated**: 2025-10-27
