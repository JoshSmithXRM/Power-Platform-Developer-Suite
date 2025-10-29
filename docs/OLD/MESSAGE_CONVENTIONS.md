# Message Conventions

**Last Updated**: 2025-10-27
**Status**: ✅ Official Standard

---

## Overview

This document defines the messaging conventions for communication between the Extension Host (TypeScript) and Webview (JavaScript) contexts. Consistent message naming and structure is critical for maintainability.

**See Also**: [EXECUTION_CONTEXTS.md](EXECUTION_CONTEXTS.md) for understanding the two execution environments.

---

## Core Principles

1. **Kebab-Case Naming** - All message commands use kebab-case (hyphens), NOT camelCase
2. **Namespaced Actions** - Component-specific messages use component prefix
3. **Consistent Structure** - All messages follow the same shape
4. **Type Safety** - Message interfaces define structure
5. **Bidirectional Flow** - Messages flow both directions (Extension Host ↔ Webview)

---

## Message Naming: Kebab-Case MANDATORY

### ✅ Correct: Kebab-Case (hyphens)

```typescript
// Extension Host → Webview
case 'environment-changed':
case 'environment-selected':
case 'component-event':
case 'filter-panel-collapsed':
case 'data-loaded':
case 'trace-level-set':

// Webview → Extension Host
case 'load-traces':
case 'delete-trace':
case 'set-trace-level':
case 'apply-filters':
case 'export-to-csv':
```

### ❌ Wrong: CamelCase (forbidden)

```typescript
// ❌ DON'T USE THESE
case 'environmentChanged':    // Wrong!
case 'componentEvent':        // Wrong!
case 'filterPanelCollapsed':  // Wrong!
case 'loadTraces':            // Wrong!
```

**Why**:
- Consistency with web standards (HTML attributes, CSS classes use kebab-case)
- Easier to read (`environment-changed` vs `environmentChanged`)
- Prevents confusion between TypeScript property names and message strings
- Enforces clear separation between code and protocol

---

## Standard Message Structure

### Extension Host → Webview

```typescript
interface WebviewMessage {
    command: string;           // Message type (kebab-case)
    action?: string;          // Alternative to 'command', used interchangeably
    data?: unknown;           // Payload (typed based on command)
    componentId?: string;     // For component-specific messages
    eventType?: string;       // For component events
}

// Example
{
    command: 'environment-changed',
    data: {
        environmentId: 'abc-123',
        environmentName: 'Development'
    }
}

{
    action: 'error',
    message: 'Failed to load data: Network timeout'
}

{
    command: 'component-event',
    componentId: 'plugin-trace-table',
    eventType: 'data-updated',
    data: {
        rowCount: 42
    }
}
```

### Webview → Extension Host

```typescript
// Send from webview
vscode.postMessage({
    command: 'load-traces',
    data: {
        environmentId: 'abc-123',
        filters: { level: 'error' }
    }
});

vscode.postMessage({
    command: 'delete-trace',
    data: {
        traceId: 'xyz-789'
    }
});
```

---

## Environment Change Messages

**CRITICAL**: Environment changes must handle BOTH message formats for compatibility.

### Pattern: Handle Both Cases

```typescript
// In panel message handler
protected async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    const action = message.action || message.command;

    switch (action) {
        // BOTH environment-selected AND environment-changed
        case 'environment-selected':
        case 'environment-changed':
            // Extract environment ID from either location
            const envId = message.data?.environmentId || message.environmentId;
            if (envId) {
                await this.handleEnvironmentChanged(envId);
            }
            break;
    }
}
```

**Why Both**:
- `environment-selected` - Sent by EnvironmentSelectorComponent
- `environment-changed` - Sent by some legacy/panel-specific code
- Handling both ensures compatibility and smooth operation

**Environment Change Data**:
```typescript
// Format sent by EnvironmentSelectorComponent
{
    command: 'environment-selected',
    data: {
        environmentId: 'abc-123',
        environmentName: 'Development',
        dataverseUrl: 'https://org.crm.dynamics.com'
    }
}

// Format sent by some panels
{
    command: 'environment-changed',
    environmentId: 'abc-123'
}
```

---

## Component Event Messages

Components communicate via event bridges, which translate to messages:

### Component → Panel (via Event Bridge)

```typescript
// Component fires event
this.emit('data-updated', {
    rowCount: tableData.length,
    hasSelection: selectedRows.length > 0
});

// Translates to message sent to webview
{
    command: 'component-event',
    componentId: 'plugin-trace-table',
    eventType: 'data-updated',
    data: {
        rowCount: 42,
        hasSelection: true
    }
}
```

### Panel → Component (via Component Methods)

```typescript
// Panel updates component (triggers event bridge internally)
this.dataTable.setData(newData);

// Component sends event bridge message to webview
{
    command: 'component-event',
    componentId: 'plugin-trace-table',
    eventType: 'data-updated',
    data: { ... }
}
```

**Event Type Naming**: Use kebab-case for consistency
- ✅ `data-updated`
- ✅ `selection-changed`
- ✅ `filter-applied`
- ❌ `dataUpdated`
- ❌ `selectionChanged`

---

## Action Messages (Extension Host → Webview)

### Success Actions

```typescript
// Data loaded successfully
{
    action: 'tracesLoaded',  // ⚠️ Legacy camelCase (being phased out)
    count: 42
}

// Better: Use kebab-case
{
    action: 'traces-loaded',
    count: 42,
    hasResults: true
}

// Settings updated
{
    action: 'trace-level-set',
    level: 'all',
    displayName: 'All Traces'
}
```

### Error Actions

```typescript
{
    action: 'error',
    message: 'Failed to load traces: Network timeout'
}
```

### Info Actions

```typescript
{
    action: 'info',
    message: 'No traces found matching filters'
}
```

---

## Command Messages (Webview → Extension Host)

### Data Loading Commands

```typescript
// Load data
{
    command: 'load-traces',
    data: {
        environmentId: 'abc-123',
        filters: {
            level: 'error',
            entityName: 'account'
        }
    }
}

// Refresh data
{
    command: 'refresh',
    data: {
        environmentId: 'abc-123'
    }
}
```

### CRUD Commands

```typescript
// Delete
{
    command: 'delete-trace',
    data: {
        traceId: 'xyz-789'
    }
}

// Delete multiple
{
    command: 'delete-all-traces',
    data: {
        environmentId: 'abc-123'
    }
}

// Update
{
    command: 'set-trace-level',
    data: {
        environmentId: 'abc-123',
        level: 'error'
    }
}
```

### Export Commands

```typescript
{
    command: 'export-to-csv',
    data: {
        selectedOnly: false,
        includeRelated: true
    }
}

{
    command: 'export-selected',
    data: {
        traceIds: ['id1', 'id2', 'id3']
    }
}
```

### UI State Commands

```typescript
{
    command: 'filter-panel-collapsed',
    data: {
        collapsed: true
    }
}

{
    command: 'section-toggle',
    data: {
        sectionId: 'attributes',
        collapsed: false
    }
}
```

---

## Dropdown Item Click Messages

When action bar dropdowns are clicked:

```typescript
{
    command: 'dropdown-item-clicked',
    componentId: 'plugin-trace-action-bar',
    data: {
        actionId: 'trace-level',
        itemId: 'all'
    }
}
```

**Handler Pattern**:
```typescript
private async handleDropdownItemClicked(message: WebviewMessage): Promise<void> {
    const { componentId, data } = message;

    if (componentId === 'plugin-trace-action-bar') {
        const { actionId, itemId } = data;

        switch (actionId) {
            case 'trace-level':
                await this.handleSetTraceLevel(itemId);
                break;

            case 'delete':
                await this.handleDeleteAction(itemId);
                break;
        }
    }
}
```

---

## Row Action Messages

When table rows are clicked or actions are triggered:

```typescript
{
    command: 'row-action',
    componentId: 'plugin-trace-table',
    data: {
        action: 'view-details',
        rowId: 'trace-123',
        rowData: { ... }
    }
}

{
    command: 'row-action',
    componentId: 'metadata-attributes-table',
    data: {
        action: 'copy-logical-name',
        rowId: 'attr-456',
        rowData: {
            logicalName: 'new_customfield',
            displayName: 'Custom Field'
        }
    }
}
```

---

## Message Namespace Conventions

### Component-Specific Messages

Prefix with component type for clarity:

```typescript
// Plugin Trace Viewer
'load-traces'
'delete-trace'
'set-trace-level'
'trace-level-set'

// Metadata Browser
'load-entity-metadata'
'load-choice-metadata'
'copy-logical-name'
'open-in-maker'

// Solution Explorer
'load-solutions'
'export-solution'
'import-solution'
```

### Global Messages (All Panels)

```typescript
'environment-selected'
'environment-changed'
'refresh'
'component-event'
'error'
'info'
'warning'
```

---

## Type Safety for Messages

Define message interfaces for type safety:

```typescript
// Message types
interface EnvironmentChangedMessage {
    command: 'environment-changed' | 'environment-selected';
    data?: {
        environmentId: string;
        environmentName?: string;
        dataverseUrl?: string;
    };
    environmentId?: string;  // Alternative location
}

interface LoadTracesMessage {
    command: 'load-traces';
    data: {
        environmentId: string;
        filters?: {
            level?: string;
            entityName?: string;
            startDate?: string;
            endDate?: string;
        };
    };
}

interface DeleteTraceMessage {
    command: 'delete-trace';
    data: {
        traceId: string;
    };
}

// Union type for all messages
type WebviewMessage =
    | EnvironmentChangedMessage
    | LoadTracesMessage
    | DeleteTraceMessage
    | ComponentEventMessage
    | ...;
```

**Usage**:
```typescript
protected async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    const action = message.action || message.command;

    switch (action) {
        case 'load-traces': {
            const msg = message as LoadTracesMessage;
            await this.handleLoadTraces(
                msg.data.environmentId,
                msg.data.filters
            );
            break;
        }
    }
}
```

---

## Common Patterns

### Pattern: Command + Success/Error Response

```typescript
// 1. Webview sends command
vscode.postMessage({
    command: 'load-traces',
    data: { environmentId: 'abc-123' }
});

// 2. Extension Host processes and responds with success
panel.postMessage({
    action: 'traces-loaded',
    count: 42,
    hasResults: true
});

// OR responds with error
panel.postMessage({
    action: 'error',
    message: 'Failed to load traces: Network timeout'
});
```

### Pattern: Request + Response Correlation

For operations that need correlation:

```typescript
// Webview sends with request ID
vscode.postMessage({
    command: 'load-traces',
    requestId: 'req-12345',
    data: { environmentId: 'abc-123' }
});

// Extension Host responds with same ID
panel.postMessage({
    action: 'traces-loaded',
    requestId: 'req-12345',
    count: 42
});

// Webview handler can correlate
if (message.requestId === pendingRequest.requestId) {
    // Handle response for specific request
}
```

---

## Migration Guide: CamelCase → Kebab-Case

If you find camelCase messages in code:

### Before (Wrong)
```typescript
case 'loadTraces':
    await this.handleLoadTraces(message.data);
    break;

vscode.postMessage({
    command: 'deleteTrace',
    data: { traceId }
});
```

### After (Correct)
```typescript
case 'load-traces':
    await this.handleLoadTraces(message.data);
    break;

vscode.postMessage({
    command: 'delete-trace',
    data: { traceId }
});
```

**Note**: During migration, you may need to temporarily handle both:
```typescript
case 'loadTraces':      // Legacy
case 'load-traces':     // New standard
    await this.handleLoadTraces(message.data);
    break;
```

---

## Anti-Patterns to Avoid

### ❌ Don't Use Mixed Naming

```typescript
// ❌ BAD - Inconsistent naming
case 'load-traces':      // kebab-case
case 'deleteTrace':      // camelCase - WRONG!
case 'set_trace_level':  // snake_case - WRONG!
```

### ❌ Don't Omit Data Wrapper

```typescript
// ❌ BAD - Data scattered across message
{
    command: 'load-traces',
    environmentId: 'abc-123',    // Should be in data
    filters: { ... }             // Should be in data
}

// ✅ GOOD - Data in 'data' property
{
    command: 'load-traces',
    data: {
        environmentId: 'abc-123',
        filters: { ... }
    }
}
```

### ❌ Don't Create Vague Commands

```typescript
// ❌ BAD - Too vague
{
    command: 'update',
    data: { ... }
}

// ✅ GOOD - Specific and clear
{
    command: 'set-trace-level',
    data: { level: 'error' }
}
```

---

## Quick Reference

### Message Direction

| Direction | How to Send |
|-----------|-------------|
| Extension Host → Webview | `this.postMessage({ ... })` |
| Webview → Extension Host | `vscode.postMessage({ ... })` |

### Message Properties

| Property | Required | Type | Purpose |
|----------|----------|------|---------|
| `command` | ✅ Yes* | string | Message type (kebab-case) |
| `action` | ✅ Yes* | string | Alternative to command |
| `data` | ⚠️ Usually | object | Message payload |
| `componentId` | ⚠️ Sometimes | string | For component messages |
| `eventType` | ⚠️ Sometimes | string | For component events |

*Either `command` OR `action` required (not both)

### Common Commands

**Data Operations**:
- `load-{entity}` - Load data
- `refresh` - Refresh current view
- `delete-{entity}` - Delete single item
- `delete-all-{entity}` - Delete multiple

**UI Operations**:
- `section-toggle` - Collapse/expand section
- `filter-panel-collapsed` - Filter panel state
- `row-action` - Table row action

**Settings Operations**:
- `set-{setting}` - Update setting
- `save-settings` - Save all settings

**Export Operations**:
- `export-to-csv` - Export to CSV
- `export-selected` - Export selection

---

## References

- [EXECUTION_CONTEXTS.md](EXECUTION_CONTEXTS.md) - Extension Host vs Webview
- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Component communication
- [ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md) - Error messages

---

**Status**: ✅ Official Standard
**Last Updated**: 2025-10-27
