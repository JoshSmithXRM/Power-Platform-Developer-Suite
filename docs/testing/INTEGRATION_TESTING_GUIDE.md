# Integration Testing Guide

**Comprehensive guide to integration testing in the Power Platform Developer Suite.**

---

## Quick Reference

**Integration Testing Philosophy**:
- Test **multiple layers working together**, not individual units
- Focus on **workflows and interactions** between components
- Verify **behavior**, not implementation details
- Use **real dependencies** where possible, mock infrastructure boundaries

**Types of Integration Tests** (from integration scope perspective):
1. **Panel Integration Tests**: Panel + Behaviors + Coordinator + Use Cases → Test full UI workflow
2. **Use Case Integration Tests**: Use Case + Domain Services + Repositories → Test business logic flow
3. **Repository Integration Tests**: Repository + Mapper + API Service → Test data access layer

**Test File Naming**:
```
✅ PanelName.integration.test.ts       (Panel integration tests)
✅ UseCaseName.integration.test.ts     (Use case integration tests - rare)
✅ RepositoryName.integration.test.ts  (Repository integration tests - rare)
❌ FeatureName.test.ts                 (Unit test, not integration)
```

**When to Write Integration Tests**:
```typescript
// ✅ Write integration tests for:
- Panel initialization workflows (createOrShow → loadData → postMessage)
- Multi-step user interactions (save → validate → refresh → updateUI)
- State persistence across panel lifecycle
- Error recovery workflows
- Command handling with multiple use case calls

// ❌ Don't write integration tests for:
- Simple domain logic (write unit tests instead)
- Individual mapper methods (unit tests)
- Single-purpose utility functions (unit tests)
```

**Integration Test Structure**:
```typescript
describe('FeaturePanel Integration Tests', () => {
    // 1. Setup: Mock infrastructure boundaries (VS Code API, file system)
    beforeEach(() => {
        mockVsCodeModule();
        mockInfrastructureDependencies();
    });

    // 2. Test workflows: Panel initialization, commands, state changes
    describe('Panel Initialization', () => {
        it('should load data and update UI on initialization', async () => {
            // ...
        });
    });

    // 3. Test error scenarios: Graceful degradation, user feedback
    describe('Error Handling', () => {
        it('should show error message and continue when data load fails', async () => {
            // ...
        });
    });
});
```

---

## Table of Contents

1. [Integration Testing Philosophy](#integration-testing-philosophy)
2. [Panel Integration Tests](#panel-integration-tests)
3. [VS Code Mocking Patterns](#vs-code-mocking-patterns)
4. [Test Helpers and Utilities](#test-helpers-and-utilities)
5. [Testing Panel Initialization](#testing-panel-initialization)
6. [Testing Command Handling](#testing-command-handling)
7. [Testing State Persistence](#testing-state-persistence)
8. [Testing Error Scenarios](#testing-error-scenarios)
9. [Production Examples](#production-examples)
10. [Anti-Patterns](#anti-patterns)
11. [Performance Considerations](#performance-considerations)

---

## Integration Testing Philosophy

### What is Integration Testing?

**Integration tests verify that multiple components work together correctly.**

```typescript
// ❌ Unit Test: Tests single class in isolation
describe('Environment', () => {
    it('should validate name length', () => {
        const name = new EnvironmentName('Test');
        expect(name.getValue()).toBe('Test');
    });
});

// ✅ Integration Test: Tests multiple components working together
describe('EnvironmentSetupPanel Integration', () => {
    it('should save environment and refresh tree view', async () => {
        // Tests: Panel → SaveEnvironmentUseCase → Repository → VS Code API
        const panel = await createPanel();
        await panel.handleSaveCommand(saveRequest);

        expect(mockRepository.save).toHaveBeenCalled();
        expect(mockVsCode.commands.executeCommand).toHaveBeenCalledWith('refreshEnvironments');
    });
});
```

### Integration Test Scope

**What to include in integration tests**:
- ✅ **Real domain entities** (no mocks for business logic)
- ✅ **Real use cases** (orchestration logic)
- ✅ **Real mappers** (transformation logic)
- ✅ **Real domain services** (business rules)
- ❌ **Mock infrastructure** (VS Code API, file system, network)
- ❌ **Mock repositories** (data access layer)

**Example scope**:
```typescript
// ✅ REAL (tested together)
Panel → Behaviors → Coordinator → Use Cases → Domain Services → Entities

// ❌ MOCKED (infrastructure boundaries)
Repositories, VS Code API, File System, Network Calls
```

### Benefits of Integration Tests

1. **Catch Integration Bugs**: Errors that only appear when components interact
2. **Document Workflows**: Show how features work end-to-end
3. **Refactoring Safety**: Verify behavior unchanged across multiple components
4. **Realistic Scenarios**: Test actual user workflows, not isolated units

---

## Panel Integration Tests

### Panel Test Structure

**Recommended test suite structure**:
```typescript
describe('PanelName Integration Tests', () => {
    // Test fixtures
    let mockExtensionUri: Uri;
    let mockPanel: jest.Mocked<WebviewPanel>;
    let mockUseCases: MockedUseCases;
    let mockRepositories: MockedRepositories;
    let messageHandlers: Map<string, MessageHandler>;

    beforeEach(() => {
        // Setup mocks
    });

    describe('Panel Initialization', () => {
        it('should create panel with correct configuration', () => {});
        it('should load initial data on initialization', async () => {});
        it('should handle initialization errors gracefully', async () => {});
        it('should restore persisted state on initialization', async () => {});
    });

    describe('Command Handling', () => {
        it('should handle save command successfully', async () => {});
        it('should handle delete command with confirmation', async () => {});
        it('should validate data before executing command', async () => {});
    });

    describe('State Persistence', () => {
        it('should persist user selections to workspace state', async () => {});
        it('should restore previous selections on panel reopen', async () => {});
    });

    describe('Error Handling', () => {
        it('should show error message when use case fails', async () => {});
        it('should recover gracefully from partial failures', async () => {});
    });

    describe('Singleton Pattern', () => {
        it('should reuse existing panel when opened twice', () => {});
        it('should create separate panels for different contexts', () => {});
    });

    describe('Full Integration Scenarios', () => {
        it('should coordinate full workflow from initialization to save', async () => {});
    });
});
```

### Panel Initialization Testing

**Pattern**: Test that panel initializes correctly and loads data

```typescript
describe('Panel Initialization', () => {
    it('should create panel with correct view type and options', async () => {
        const panel = await PanelName.createOrShow(
            mockExtensionUri,
            mockGetEnvironments,
            mockUseCases,
            mockLogger,
            'env-123'
        );

        // ✅ Verify panel creation
        expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
            'powerPlatformDevSuite.panelType',
            expect.stringContaining('Panel Title'),
            ViewColumn.One,
            expect.objectContaining({
                enableScripts: true,
                retainContextWhenHidden: true,
                enableFindWidget: true
            })
        );

        // ✅ Verify webview options
        expect(mockPanel.webview.options).toMatchObject({
            enableScripts: true,
            localResourceRoots: [mockExtensionUri]
        });
    });

    it('should load initial data and update UI on initialization', async () => {
        const mockData = createMockData();
        mockUseCase.execute.mockResolvedValue(mockData);

        await PanelName.createOrShow(/* ... */);

        // Wait for async initialization
        await flushPromises();

        // ✅ Verify use case called
        expect(mockUseCase.execute).toHaveBeenCalledWith('env-123');

        // ✅ Verify UI updated
        expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
            command: 'updateData',
            data: expect.objectContaining(mockData)
        });
    });

    it('should handle initialization errors gracefully', async () => {
        const error = new Error('Failed to load data');
        mockUseCase.execute.mockRejectedValue(error);

        await PanelName.createOrShow(/* ... */);
        await flushPromises();

        // ✅ Verify error shown to user
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining('Failed to load data')
        );

        // ✅ Verify panel still created (graceful degradation)
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    });
});
```

### Singleton Pattern Testing

**Pattern**: Verify panel singleton behavior

```typescript
describe('Singleton Pattern', () => {
    it('should return same panel instance when opened twice for same environment', async () => {
        const panel1 = await PanelName.createOrShow(/* ... */, 'env-123');
        const panel2 = await PanelName.createOrShow(/* ... */, 'env-123');

        expect(panel1).toBe(panel2);
        expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
        expect(mockPanel.reveal).toHaveBeenCalled();  // Second call reveals existing panel
    });

    it('should create separate panel instances for different environments', async () => {
        const panel1 = await PanelName.createOrShow(/* ... */, 'env-123');

        // Create new mock panel for second instance
        const mockPanel2 = createMockPanel();
        vscode.window.createWebviewPanel.mockReturnValue(mockPanel2);

        const panel2 = await PanelName.createOrShow(/* ... */, 'env-456');

        expect(panel1).not.toBe(panel2);
        expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
    });

    it('should allow creating new panel after disposal', async () => {
        const panel1 = await PanelName.createOrShow(/* ... */, 'env-123');

        // Simulate panel disposal
        mockPanel.dispose();

        // Create new mock panel for second instance
        const mockPanel2 = createMockPanel();
        vscode.window.createWebviewPanel.mockReturnValue(mockPanel2);

        const panel2 = await PanelName.createOrShow(/* ... */, 'env-123');

        expect(panel1).not.toBe(panel2);
        expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
    });
});
```

---

## VS Code Mocking Patterns

### Mocking the VS Code Module

**Standard VS Code mock pattern** (used in all panel integration tests):

```typescript
// Mock VS Code module at top of test file
const ViewColumn = {
    One: 1,
    Two: 2,
    Three: 3
};

jest.mock('vscode', () => ({
    ViewColumn: {
        One: 1,
        Two: 2,
        Three: 3
    },
    Uri: {
        file: (path: string): unknown => ({ fsPath: path }),
        joinPath: (...paths: unknown[]): unknown => paths[0],
        parse: (uri: string): unknown => ({ toString: () => uri })
    },
    window: {
        createWebviewPanel: jest.fn(),
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showQuickPick: jest.fn(),
        withProgress: jest.fn()
    },
    commands: {
        executeCommand: jest.fn()
    },
    env: {
        openExternal: jest.fn()
    }
}), { virtual: true });

// Import the mocked vscode module
const vscode = require('vscode') as {
    window: {
        createWebviewPanel: jest.Mock;
        showInformationMessage: jest.Mock;
        // ... other methods
    };
    commands: { executeCommand: jest.Mock };
    env: { openExternal: jest.Mock };
    ViewColumn: typeof ViewColumn;
};
```

### Mocking WebviewPanel

**Pattern**: Create realistic mock panel with webview support

```typescript
interface MockWebviewPanel {
    viewType: string;
    title: string;
    webview: {
        options: { enableScripts?: boolean; localResourceRoots?: Uri[] };
        onDidReceiveMessage: jest.Mock;
        postMessage: jest.Mock;
        asWebviewUri: jest.Mock;
    };
    onDidDispose: jest.Mock;
    reveal: jest.Mock;
    dispose: jest.Mock;
}

function createMockPanel(): MockWebviewPanel {
    let disposeCallback: (() => void) | undefined;
    let messageCallback: ((message: unknown) => void) | undefined;

    return {
        viewType: 'test-panel',
        title: 'Test Panel',
        webview: {
            options: {},
            onDidReceiveMessage: jest.fn((callback: (message: unknown) => void) => {
                messageCallback = callback;  // Store for manual triggering
                return { dispose: jest.fn() } as Disposable;
            }),
            postMessage: jest.fn().mockResolvedValue(true),
            asWebviewUri: jest.fn((uri: Uri) => uri)
        },
        onDidDispose: jest.fn((callback: () => void) => {
            disposeCallback = callback;
            return { dispose: jest.fn() } as Disposable;
        }),
        reveal: jest.fn(),
        dispose: jest.fn(() => {
            if (disposeCallback) {
                disposeCallback();
            }
        })
    };
}
```

### Mocking Workspace State

**Pattern**: Create in-memory state storage for testing persistence

```typescript
function createMockWorkspaceState(): Memento {
    const stateStore = new Map<string, unknown>();

    return {
        get: jest.fn((key: string, defaultValue?: unknown) => {
            const value = stateStore.get(key);
            return value !== undefined ? value : defaultValue;
        }),
        update: jest.fn((key: string, value: unknown) => {
            stateStore.set(key, value);
            return Promise.resolve();
        }),
        keys: jest.fn(() => Array.from(stateStore.keys()))
    } as Memento;
}
```

---

## Test Helpers and Utilities

### flushPromises Helper

**Purpose**: Ensure all pending async operations complete before assertions

```typescript
/**
 * Flushes all pending promises in the event loop.
 * Ensures async initialization completes before continuing.
 */
async function flushPromises(): Promise<void> {
    return new Promise((resolve) => {
        setImmediate(() => {
            setImmediate(() => {
                setImmediate(() => {
                    resolve();
                });
            });
        });
    });
}

// Usage
it('should load data asynchronously', async () => {
    await PanelName.createOrShow(/* ... */);

    // Wait for async initialization to complete
    await flushPromises();

    expect(mockUseCase.execute).toHaveBeenCalled();
    expect(mockPanel.webview.postMessage).toHaveBeenCalled();
});
```

### createPanelAndWait Helper

**Purpose**: Create panel and wait for initialization in one step

```typescript
async function createPanelAndWait(): Promise<PanelType> {
    const panel = await PanelName.createOrShow(
        mockExtensionUri,
        mockGetEnvironments,
        mockGetEnvironmentById,
        mockUseCases,
        mockLogger,
        TEST_ENVIRONMENT_ID
    );

    // Wait for async initialization (initializeAndLoadData) to complete
    await flushPromises();

    return panel;
}

// Usage
it('should initialize panel with data', async () => {
    await createPanelAndWait();

    expect(mockUseCase.execute).toHaveBeenCalled();
});
```

### Message Handler Access Helper

**Purpose**: Access registered message handlers for testing

```typescript
let messageHandlers: Map<string, (data: unknown) => Promise<void>>;

beforeEach(() => {
    messageHandlers = new Map();

    mockWebview.onDidReceiveMessage.mockImplementation((handler) => {
        const wrappedHandler = async (data: unknown) => {
            const msg = data as { command: string; data?: unknown };
            await handler(msg);
        };
        messageHandlers.set('messageHandler', wrappedHandler);
        return { dispose: jest.fn() } as Disposable;
    });
});

// Usage
it('should handle save command', async () => {
    await createPanelAndWait();

    const handler = messageHandlers.get('messageHandler');
    await handler!({ command: 'saveEnvironment', data: saveRequest });

    expect(mockSaveUseCase.execute).toHaveBeenCalled();
});
```

### Test Data Factories

**Purpose**: Create realistic test data consistently

```typescript
// Entity factory
function createMockConnectionReference(
    id: string,
    logicalName: string,
    displayName: string
): ConnectionReference {
    return new ConnectionReference(
        id,
        logicalName,
        displayName,
        'connector-123',
        'connection-456',
        false,
        new Date()
    );
}

// ViewModel factory
function createEntityTreeItem(logicalName: string, displayName: string): EntityTreeItemViewModel {
    return {
        id: logicalName,
        displayName,
        logicalName,
        isCustom: false,
        icon: '📋'
    };
}

// Environment factory
function createMockEnvironment(id: string, name: string, ppEnvId?: string): jest.Mocked<Environment> {
    return {
        getName: jest.fn().mockReturnValue(new EnvironmentName(name)),
        getPowerPlatformEnvironmentId: jest.fn().mockReturnValue(ppEnvId)
    } as never;
}

// Usage
it('should display connection references', async () => {
    const mockRef = createMockConnectionReference('cr-1', 'cr_test', 'Test CR');
    mockUseCase.execute.mockResolvedValue({ connectionReferences: [mockRef] });

    await createPanelAndWait();

    expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
            data: expect.arrayContaining([
                expect.objectContaining({ logicalName: 'cr_test' })
            ])
        })
    );
});
```

---

## Testing Panel Initialization

### Pattern 1: Basic Initialization

```typescript
it('should initialize panel with environment name in title', async () => {
    const panel = await PanelName.createOrShow(
        mockExtensionUri,
        mockGetEnvironments,
        mockGetEnvironmentById,
        mockUseCases,
        mockLogger,
        'env-123'
    );

    await flushPromises();

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'powerPlatformDevSuite.panelType',
        expect.stringContaining('Environment 1'),  // Environment name in title
        ViewColumn.One,
        expect.any(Object)
    );
});
```

### Pattern 2: Data Loading on Initialization

```typescript
it('should load environments, solutions, and data on initialization', async () => {
    const mockData = createMockData();
    mockListUseCase.execute.mockResolvedValue(mockData);

    await createPanelAndWait();

    // ✅ Verify data loading sequence
    expect(mockGetEnvironments).toHaveBeenCalled();
    expect(mockSolutionRepository.findAllForDropdown).toHaveBeenCalledWith('env-123');
    expect(mockListUseCase.execute).toHaveBeenCalledWith('env-123', undefined, expect.any(Object));

    // ✅ Verify UI updated
    expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: 'htmlUpdated'
    });
});
```

### Pattern 3: State Restoration on Initialization

```typescript
it('should load persisted state on initialization', async () => {
    mockPanelStateRepository.load.mockResolvedValueOnce({
        selectedSolutionId: 'sol-123',
        lastUpdated: new Date().toISOString()
    });

    await createPanelAndWait();

    // ✅ Verify state loaded
    expect(mockPanelStateRepository.load).toHaveBeenCalledWith({
        panelType: 'connectionReferences',
        environmentId: 'env-123'
    });

    // ✅ Verify state applied
    expect(mockListUseCase.execute).toHaveBeenCalledWith(
        'env-123',
        'sol-123',  // ✅ Solution ID from persisted state
        expect.any(Object)
    );
});
```

### Pattern 4: Error Handling During Initialization

```typescript
it('should handle data loading errors gracefully during initialization', async () => {
    mockListUseCase.execute.mockRejectedValueOnce(new Error('API Error'));

    await createPanelAndWait();

    // ✅ Panel still created despite error
    expect(vscode.window.createWebviewPanel).toHaveBeenCalled();

    // ✅ Error logged (but not thrown)
    expect(mockLogger.error).toHaveBeenCalled();

    // ✅ UI still updated (with empty data or error state)
    expect(mockPanel.webview.postMessage).toHaveBeenCalled();
});
```

---

## Testing Command Handling

### Pattern 1: Simple Command Execution

```typescript
it('should execute save command successfully', async () => {
    const saveRequest = createMockSaveRequest();
    const saveResponse = { success: true, environmentId: 'env-new-123' };

    mockSaveUseCase.execute.mockResolvedValue(saveResponse);

    await createPanelAndWait();

    // Simulate save command from webview
    const handler = messageHandlers.get('messageHandler');
    await handler!({ command: 'saveEnvironment', data: saveRequest });

    // ✅ Verify use case called with correct data
    expect(mockSaveUseCase.execute).toHaveBeenCalledWith({
        ...saveRequest,
        preserveExistingCredentials: true
    });

    // ✅ Verify success message shown
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Environment saved successfully'
    );

    // ✅ Verify refresh command triggered
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'power-platform-dev-suite.refreshEnvironments'
    );
});
```

### Pattern 2: Command with Validation Errors

```typescript
it('should handle validation errors when executing command', async () => {
    const invalidRequest = { name: '', dataverseUrl: 'invalid' };
    const saveResponse = {
        success: false,
        errors: ['Name is required', 'Invalid Dataverse URL']
    };

    mockSaveUseCase.execute.mockResolvedValue(saveResponse);

    await createPanelAndWait();

    const handler = messageHandlers.get('messageHandler');
    await handler!({ command: 'saveEnvironment', data: invalidRequest });

    // ✅ Verify errors sent back to webview
    expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: 'environment-saved',
        data: {
            success: false,
            errors: ['Name is required', 'Invalid Dataverse URL']
        }
    });

    // ✅ Verify no success message
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
});
```

### Pattern 3: Command with Confirmation Dialog

```typescript
it('should delete environment after user confirmation', async () => {
    mockLoadUseCase.execute.mockResolvedValue(createMockEnvironment());
    vscode.window.showWarningMessage.mockResolvedValue('Delete');  // User confirms

    await createPanelAndWait();

    const handler = messageHandlers.get('messageHandler');
    await handler!({ command: 'deleteEnvironment' });

    // ✅ Verify confirmation shown
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'Are you sure you want to delete this environment? This action cannot be undone.',
        { modal: true },
        'Delete'
    );

    // ✅ Verify delete executed
    expect(mockDeleteUseCase.execute).toHaveBeenCalledWith({ environmentId: 'env-123' });

    // ✅ Verify success feedback
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Environment deleted successfully'
    );
});

it('should cancel deletion when user declines confirmation', async () => {
    vscode.window.showWarningMessage.mockResolvedValue(undefined);  // User cancels

    await createPanelAndWait();

    const handler = messageHandlers.get('messageHandler');
    await handler!({ command: 'deleteEnvironment' });

    // ✅ Verify delete NOT executed
    expect(mockDeleteUseCase.execute).not.toHaveBeenCalled();
});
```

### Pattern 4: Multi-Step Command

```typescript
it('should export connection references to deployment settings file', async () => {
    const mockConnectionRef = createMockConnectionReference('cr-1', 'cr_test', 'Test CR');
    mockListUseCase.execute.mockResolvedValueOnce({
        connectionReferences: [mockConnectionRef]
    });

    const exportResult = {
        filePath: '/path/to/deploymentsettings.json',
        added: 1,
        removed: 0,
        preserved: 0
    };
    mockExportUseCase.execute.mockResolvedValueOnce(exportResult);

    await createPanelAndWait();

    const handler = messageHandlers.get('messageHandler');
    await handler!({ command: 'syncDeploymentSettings' });

    // ✅ Step 1: Export use case called
    expect(mockExportUseCase.execute).toHaveBeenCalledWith(
        [mockConnectionRef],
        'deploymentsettings.json'
    );

    // ✅ Step 2: Success message with details
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Synced deployment settings: 1 added, 0 removed, 0 preserved'
    );
});
```

---

## Testing State Persistence

### Pattern 1: State Save on User Action

```typescript
it('should persist solution selection when user changes filter', async () => {
    await createPanelAndWait();

    const handler = messageHandlers.get('messageHandler');
    await handler!({
        command: 'solutionChange',
        solutionId: 'sol-123'
    });

    // ✅ Verify state saved
    expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
        { panelType: 'connectionReferences', environmentId: 'env-123' },
        expect.objectContaining({ selectedSolutionId: 'sol-123' })
    );
});
```

### Pattern 2: State Clear on Reset

```typescript
it('should clear panel state when filter is cleared', async () => {
    await createPanelAndWait();

    const handler = messageHandlers.get('messageHandler');
    await handler!({
        command: 'solutionChange',
        solutionId: undefined  // Clear filter
    });

    // ✅ Verify state cleared
    expect(mockPanelStateRepository.clear).toHaveBeenCalledWith({
        panelType: 'connectionReferences',
        environmentId: 'env-123'
    });
});
```

### Pattern 3: State Restoration on Panel Reopen

```typescript
it('should restore detail panel width from persisted state', async () => {
    const persistedState = {
        env1: {
            selectedSolutionId: '',
            detailPanelWidth: 350
        }
    };

    mockWorkspaceState.get.mockImplementation((key) => {
        if (key === 'panel-state-powerPlatformDevSuite.metadataBrowser') {
            return persistedState;
        }
        return {};
    });

    await createPanelAndWait();

    // ✅ Verify width restored
    expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: 'restoreDetailPanelWidth',
        data: { width: 350 }
    });
});
```

---

## Testing Error Scenarios

### Pattern 1: Use Case Failures

```typescript
it('should show error message when use case fails', async () => {
    const error = new Error('API request failed');
    mockLoadUseCase.execute.mockRejectedValue(error);

    await createPanelAndWait();

    const handler = messageHandlers.get('messageHandler');
    await handler!({ command: 'refresh' });

    // ✅ Verify error shown to user
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('API request failed')
    );

    // ✅ Verify error logged
    expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to'),
        error
    );
});
```

### Pattern 2: Partial Failures (Graceful Degradation)

```typescript
it('should handle solution loading errors gracefully', async () => {
    mockSolutionRepository.findAllForDropdown.mockRejectedValueOnce(
        new Error('Solution API Error')
    );

    // Data loading should continue despite solution loading failure
    mockListUseCase.execute.mockResolvedValue({ connectionReferences: [] });

    await createPanelAndWait();

    // ✅ Panel initialized despite error
    expect(mockListUseCase.execute).toHaveBeenCalled();

    // ✅ Error logged but not shown (non-critical)
    expect(mockLogger.error).toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
});
```

### Pattern 3: Missing Data Handling

```typescript
it('should handle empty data list gracefully', async () => {
    mockListUseCase.execute.mockResolvedValueOnce({
        relationships: [],
        connectionReferences: []
    });

    await createPanelAndWait();

    // ✅ Panel successfully initializes with no data
    expect(mockListUseCase.execute).toHaveBeenCalled();
    expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: 'htmlUpdated'
    });
});

it('should show warning when exporting with no data', async () => {
    mockListUseCase.execute.mockResolvedValueOnce({
        connectionReferences: []
    });

    await createPanelAndWait();

    const handler = messageHandlers.get('messageHandler');
    await handler!({ command: 'syncDeploymentSettings' });

    // ✅ Verify warning shown
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No connection references to export.'
    );

    // ✅ Verify export NOT executed
    expect(mockExportUseCase.execute).not.toHaveBeenCalled();
});
```

---

## Production Examples

### Example 1: ConnectionReferencesPanelComposed Integration Test

**File**: `src/features/connectionReferences/presentation/panels/ConnectionReferencesPanelComposed.integration.test.ts`

**Key patterns**:
```typescript
describe('ConnectionReferencesPanelComposed Integration Tests', () => {
    beforeEach(() => {
        // ✅ Reset static panel map between tests
        (ConnectionReferencesPanelComposed as unknown as { panels: Map<string, unknown> }).panels = new Map();

        // ✅ Setup mock environments
        mockEnvironments = [
            { id: 'env1', name: 'Environment 1', url: 'https://env1.crm.dynamics.com' },
            { id: 'env2', name: 'Environment 2', url: 'https://env2.crm.dynamics.com' }
        ];

        // ✅ Mock getEnvironments callback
        mockGetEnvironments = jest.fn().mockResolvedValue(mockEnvironments);

        // ✅ Mock panel with disposable callback tracking
        mockPanel = {
            webview: {
                postMessage: jest.fn().mockResolvedValue(true),
                onDidReceiveMessage: jest.fn(() => {
                    return { dispose: jest.fn() } as Disposable;
                })
            },
            onDidDispose: jest.fn((callback: () => void) => {
                disposableCallback = callback;
                return { dispose: jest.fn() } as Disposable;
            })
        } as unknown as jest.Mocked<WebviewPanel>;
    });

    it('should load environments, solutions, and connection references on initialization', async () => {
        await createPanelAndWait();

        expect(mockGetEnvironments).toHaveBeenCalled();
        expect(mockSolutionRepository.findAllForDropdown).toHaveBeenCalledWith('env-123');
        expect(mockListConnectionReferencesUseCase.execute).toHaveBeenCalledWith(
            'env-123',
            undefined,
            expect.any(Object)
        );
    });

    it('should use solution unique name in export filename when solution is selected', async () => {
        mockPanelStateRepository.load.mockResolvedValueOnce({
            selectedSolutionId: 'sol1'
        });

        await createPanelAndWait();

        const handler = messageHandlers.get('messageHandler');
        await handler!({ command: 'syncDeploymentSettings' });

        expect(mockExportUseCase.execute).toHaveBeenCalledWith(
            expect.any(Array),
            'sol_one.deploymentsettings.json'  // ✅ Uses solution unique name
        );
    });
});
```

**What this tests**:
- ✅ Panel initialization with environment context
- ✅ Data loading sequence (environments → solutions → connection references)
- ✅ Solution filtering integration
- ✅ Export to deployment settings with dynamic filename
- ✅ State persistence across panel lifecycle

### Example 2: EnvironmentSetupPanelComposed Integration Test

**File**: `src/features/environmentSetup/presentation/panels/EnvironmentSetupPanelComposed.integration.test.ts`

**Key patterns**:
```typescript
describe('EnvironmentSetupPanelComposed Integration Tests', () => {
    beforeEach(() => {
        // ✅ Mock withProgress for long-running operations
        vscode.window.withProgress.mockImplementation((_options, task) => {
            return task({ report: jest.fn() }, {} as CancellationToken);
        });
    });

    it('should register edit session when editing existing environment', () => {
        PanelName.createOrShow(/* ... */, 'env-123');

        const result = checkConcurrentEditUseCase.execute({ environmentId: 'env-123' });
        expect(result.isBeingEdited).toBe(true);
        expect(result.canEdit).toBe(false);
    });

    it('should prevent concurrent edits of same environment', () => {
        const panel1 = PanelName.createOrShow(/* ... */, 'env-123');
        const panel2 = PanelName.createOrShow(/* ... */, 'env-123');

        // ✅ Should reuse existing panel instead of creating new one
        expect(panel1).toBe(panel2);
        expect(mockPanel.reveal).toHaveBeenCalled();
        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
    });

    it('should update existing environment successfully', async () => {
        mockLoadEnvironmentByIdUseCase.execute.mockResolvedValue(/* ... */);

        await createPanelAndWait();

        const handler = messageHandlers.get('messageHandler');
        await handler!({ command: 'saveEnvironment', data: saveRequest });

        expect(mockSaveEnvironmentUseCase.execute).toHaveBeenCalledWith({
            ...saveRequest,
            existingEnvironmentId: 'env-123',  // ✅ Edit mode includes ID
            preserveExistingCredentials: true
        });
    });
});
```

**What this tests**:
- ✅ Concurrent edit prevention (singleton per environment)
- ✅ Edit session lifecycle (register on open, unregister on dispose)
- ✅ Save vs update logic (new environment vs existing)
- ✅ Validation error handling
- ✅ Delete confirmation workflow

### Example 3: MetadataBrowserPanel Integration Test

**File**: `src/features/metadataBrowser/presentation/panels/MetadataBrowserPanel.integration.test.ts`

**Key patterns**:
```typescript
describe('MetadataBrowserPanel Integration Tests', () => {
    beforeEach(() => {
        // ✅ Clear singleton panels map
        const panelsMap = (MetadataBrowserPanel as never)['panels'] as Map<string, MetadataBrowserPanel>;
        if (panelsMap) {
            panelsMap.clear();
        }

        // ✅ Message handlers map for command testing
        messageHandlers = new Map();

        mockWebview.onDidReceiveMessage.mockImplementation((handler) => {
            const wrappedHandler = async (data: unknown) => {
                const msg = data as { command: string; data?: unknown };
                await handler(msg);
            };
            messageHandlers.set('messageHandler', wrappedHandler);
            return { dispose: jest.fn() } as Disposable;
        });
    });

    it('should clear cache and reload tree when environment changes', async () => {
        await createPanelAndWait();

        mockEntityMetadataRepository.clearCache.mockClear();
        mockLoadMetadataTreeUseCase.execute.mockClear();

        const handler = messageHandlers.get('messageHandler');
        await handler!({ command: 'environmentChange', data: { environmentId: 'env2' } });

        // ✅ Cache cleared before reload
        expect(mockEntityMetadataRepository.clearCache).toHaveBeenCalled();

        // ✅ Tree reloaded with new environment
        expect(mockLoadMetadataTreeUseCase.execute).toHaveBeenCalledWith('env2');

        // ✅ Panel title updated
        expect(mockPanel.title).toBe('Metadata - Environment 2');
    });

    it('should navigate to related entity when relationship is clicked', async () => {
        await createPanelAndWait();

        const handler = messageHandlers.get('messageHandler');
        await handler!({ command: 'navigateToEntity', data: { logicalName: 'contact' } });

        expect(mockLoadEntityMetadataUseCase.execute).toHaveBeenCalledWith('env1', 'contact');
    });
});
```

**What this tests**:
- ✅ Environment switching workflow (clear cache → reload data → update UI)
- ✅ Entity selection and metadata loading
- ✅ Choice selection and option loading
- ✅ Navigation between related entities
- ✅ Refresh functionality (cache clear + reload)
- ✅ State persistence (selected tab, detail panel width)

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Testing Implementation Details

**Problem**: Test tied to internal implementation instead of behavior

```typescript
// ❌ WRONG: Testing internal method calls
it('should call handleSaveCommand method', async () => {
    const spy = jest.spyOn(panel as never, 'handleSaveCommand');
    await panel.handleSaveCommand(saveRequest);
    expect(spy).toHaveBeenCalled();  // ❌ Useless test
});

// ✅ CORRECT: Test observable behavior
it('should save environment and show success message', async () => {
    await panel.handleSaveCommand(saveRequest);

    expect(mockSaveUseCase.execute).toHaveBeenCalledWith(saveRequest);
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Environment saved successfully'
    );
});
```

### ❌ Anti-Pattern 2: Over-Mocking

**Problem**: Mocking components that should be tested together

```typescript
// ❌ WRONG: Mocking domain entities and services (should be real)
const mockEnvironment = {
    getName: jest.fn().mockReturnValue('Test'),
    validate: jest.fn().mockReturnValue({ isValid: true })  // ❌ Mock domain logic
};

// ✅ CORRECT: Use real domain entities
const environment = Environment.create({
    name: 'Test',
    dataverseUrl: 'https://test.crm.dynamics.com',
    // ...
});

// Domain validation happens naturally
const result = environment.validate();
expect(result.isValid).toBe(true);
```

### ❌ Anti-Pattern 3: Not Waiting for Async Operations

**Problem**: Assertions run before async operations complete

```typescript
// ❌ WRONG: Missing await
it('should load data', async () => {
    createPanel();  // ❌ Not awaited

    expect(mockUseCase.execute).toHaveBeenCalled();  // ❌ Fails - not executed yet
});

// ✅ CORRECT: Await async operations
it('should load data', async () => {
    await createPanelAndWait();  // ✅ Wait for initialization

    expect(mockUseCase.execute).toHaveBeenCalled();  // ✅ Works
});
```

### ❌ Anti-Pattern 4: Testing Too Much in One Test

**Problem**: Single test covers multiple unrelated behaviors

```typescript
// ❌ WRONG: Testing initialization, save, delete, and refresh in one test
it('should handle full workflow', async () => {
    const panel = await createPanel();
    expect(panel).toBeDefined();  // Initialization

    await panel.save(saveRequest);
    expect(mockSaveUseCase.execute).toHaveBeenCalled();  // Save

    await panel.delete(id);
    expect(mockDeleteUseCase.execute).toHaveBeenCalled();  // Delete

    await panel.refresh();
    expect(mockLoadUseCase.execute).toHaveBeenCalled();  // Refresh

    // ❌ If any step fails, entire test fails - hard to debug
});

// ✅ CORRECT: Separate tests for each behavior
it('should initialize panel', async () => { /* ... */ });
it('should save environment', async () => { /* ... */ });
it('should delete environment', async () => { /* ... */ });
it('should refresh data', async () => { /* ... */ });
```

### ❌ Anti-Pattern 5: Brittle Mocks

**Problem**: Mocks break when implementation details change

```typescript
// ❌ WRONG: Testing exact message format
expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
    command: 'htmlUpdated',
    html: expect.stringContaining('<table>'),  // ❌ Brittle - HTML structure
    styles: expect.stringContaining('color: red')  // ❌ Brittle - CSS
});

// ✅ CORRECT: Test logical data, not formatting
expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
    command: 'htmlUpdated',
    data: expect.objectContaining({
        entities: expect.arrayContaining([
            expect.objectContaining({ logicalName: 'account' })
        ])
    })
});
```

---

## Performance Considerations

### Test Isolation

**Problem**: Tests interfering with each other due to shared state

**Solution**: Reset static state between tests
```typescript
beforeEach(() => {
    // ✅ Clear singleton panel maps
    (PanelName as unknown as { panels: Map<string, unknown> }).panels = new Map();

    // ✅ Clear mocks
    jest.clearAllMocks();

    // ✅ Reset in-memory stores
    stateStore.clear();
});
```

### Parallel Test Execution

**Problem**: Integration tests running too slowly

**Solution**: Run independent tests in parallel (Jest default), group related tests
```typescript
// ✅ Group related tests to share setup
describe('Connection Reference Operations', () => {
    // All tests share same setup
    beforeEach(() => { /* ... */ });

    it('should load connection references', async () => { /* ... */ });
    it('should filter by solution', async () => { /* ... */ });
    it('should export to deployment settings', async () => { /* ... */ });
});

// ✅ Separate group for different context
describe('Environment Change', () => {
    beforeEach(() => { /* ... */ });

    it('should reload data when environment changes', async () => { /* ... */ });
});
```

### Mock Complexity

**Problem**: Complex mock setup slows down tests

**Solution**: Use helper factories, share common mocks
```typescript
// ✅ Shared mock factories in src/shared/testing/setup/
import {
    createMockDataverseApiService,
    createMockLogger,
    createMockCancellationToken
} from 'src/shared/testing/setup';

beforeEach(() => {
    mockApiService = createMockDataverseApiService();
    mockLogger = createMockLogger();
    mockCancellationToken = createMockCancellationToken();
});
```

**See**: `src/shared/testing/setup/index.ts` for reusable test utilities

---

## Summary

**Integration Test Checklist**:
- ✅ Test **workflows** (initialization → data loading → UI update)
- ✅ Test **command handling** (user action → use case → feedback)
- ✅ Test **state persistence** (save state → reload panel → state restored)
- ✅ Test **error scenarios** (use case fails → error shown → graceful recovery)
- ✅ Test **singleton pattern** (same context → same panel, different context → new panel)
- ✅ Use **real domain entities** (no mocks for business logic)
- ✅ Mock **infrastructure boundaries** (VS Code API, file system, network)
- ✅ Wait for **async operations** (flushPromises, createPanelAndWait)
- ✅ Use **test helpers** (data factories, mock creators)
- ❌ Don't test **implementation details** (internal method calls)
- ❌ Don't **over-mock** (mock only infrastructure, not domain)
- ❌ Don't write **brittle tests** (test behavior, not format)

**Related Guides**:
- `docs/testing/TESTING_GUIDE.md` - Unit testing patterns
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Layer responsibilities
- `.claude/WORKFLOW.md` - Test-driven bug fix workflow
