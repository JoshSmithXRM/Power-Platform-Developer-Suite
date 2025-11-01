# Logging Architecture for Power Platform Developer Suite

## Executive Summary

This document defines the logging architecture for the Power Platform Developer Suite VS Code extension, ensuring alignment with Clean Architecture principles while providing appropriate debugging and operational visibility.

**Key Principles:**
- Domain layer remains pure with zero dependencies on infrastructure
- Logging is treated as a cross-cutting concern
- VS Code OutputChannel for user-visible diagnostics
- console.log for development debugging only
- Dependency injection for testability and flexibility

---

## Table of Contents

1. [Architecture Principles](#architecture-principles)
2. [Layer Boundaries](#layer-boundaries)
3. [VS Code OutputChannel vs console.log](#vs-code-outputchannel-vs-consolelog)
4. [Service Design](#service-design)
5. [Dependency Management](#dependency-management)
6. [Implementation Examples](#implementation-examples)
7. [Testing Strategy](#testing-strategy)
8. [Migration Guide](#migration-guide)

---

## Architecture Principles

### Core Tenets

1. **Dependency Inversion**: Domain defines logging contracts through interfaces. Infrastructure provides implementations.

2. **Zero Domain Dependencies**: Domain layer has no knowledge of VS Code APIs, console, or any concrete logging mechanism.

3. **Cross-Cutting Concern**: Logging is infrastructure concern that should not pollute business logic.

4. **Selective Logging**: Log strategically at layer boundaries and critical decision points, not everywhere.

5. **Testability**: All logging dependencies are injectable and mockable.

### Why This Matters

**Clean Architecture requires:**
- Domain entities and services contain pure business logic
- External dependencies flow inward through interfaces
- Infrastructure adapts external systems to domain contracts

**Logging done wrong:**
```typescript
// WRONG: Domain entity with infrastructure dependency
export class Environment {
    public activate(): void {
        console.log('Activating environment'); // ❌ Infrastructure leak
        this.isActive = true;
    }
}
```

**Logging done right:**
```typescript
// RIGHT: Domain entity pure, logging at boundary
export class Environment {
    public activate(): void {
        // Pure business logic only
        this.isActive = true;
        this.lastUsed = new Date();
    }
}

// Use case logs the operation (orchestration layer)
export class ActivateEnvironmentUseCase {
    constructor(
        private readonly repository: IEnvironmentRepository,
        private readonly logger: ILogger
    ) {}

    public async execute(id: string): Promise<void> {
        const env = await this.repository.getById(id);
        env.activate(); // Pure domain method
        await this.repository.save(env);
        this.logger.info(`Environment activated: ${id}`);
    }
}
```

---

## Layer Boundaries

### Domain Layer (Zero Logging)

**Rules:**
- NO direct logging in domain entities
- NO direct logging in domain services
- NO logging interfaces defined in domain (unless logging is a domain concept)

**Why:**
Domain entities represent pure business concepts. Logging is an infrastructure concern.

**When you need visibility:**
- Return rich domain events
- Use method return values to communicate state
- Let outer layers handle logging

**Example:**
```typescript
// Domain Entity - NO logging
export class StorageEntry {
    public isProtected(): boolean {
        return this._key.isProtectedEnvironmentsKey();
    }

    public canBeCleared(): boolean {
        return !this.isProtected();
    }

    // Business logic only - no logging
}

// Domain Service - NO logging
export class StorageInspectionService {
    public async inspectStorage(): Promise<StorageCollection> {
        const globalState = await this.storageReader.readAllGlobalState();
        const secretKeys = await this.storageReader.readAllSecretKeys();

        const entries: StorageEntry[] = [];
        for (const [key, value] of globalState) {
            entries.push(StorageEntry.create(key, value, 'global'));
        }

        // Pure coordination - no logging
        return StorageCollection.create(entries, protectedPatterns);
    }
}
```

### Application Layer (Strategic Logging)

**Rules:**
- Log at use case boundaries (entry/exit)
- Log orchestration failures
- Log domain events being published
- Use injected logger interface

**Why:**
Use cases orchestrate domain operations. This is the right place to observe what the application is doing.

**What to log:**
- Use case execution start/completion
- Parameters (sanitized - no secrets!)
- Results (success/failure)
- Domain events being raised

**Example:**
```typescript
export class InspectStorageUseCase {
    constructor(
        private readonly storageInspectionService: StorageInspectionService,
        private readonly eventPublisher: IDomainEventPublisher,
        private readonly logger: ILogger
    ) {}

    public async execute(): Promise<StorageCollectionViewModel> {
        this.logger.debug('InspectStorageUseCase: Starting storage inspection');

        try {
            // Orchestrate domain operations
            const collection = await this.storageInspectionService.inspectStorage();

            // Log summary (not full data)
            const entries = collection.getAllEntries();
            this.logger.info(`Storage inspected: ${entries.length} entries found`);

            // Raise domain event
            this.eventPublisher.publish(
                new StorageInspected(entries.length, globalCount, secretCount)
            );

            // Map and return
            return StorageCollectionMapper.toViewModel(collection);
        } catch (error) {
            this.logger.error('InspectStorageUseCase: Failed to inspect storage', error);
            throw error;
        }
    }
}
```

### Infrastructure Layer (Technical Logging)

**Rules:**
- Log external API calls (HTTP, Dataverse, etc.)
- Log authentication attempts/failures
- Log resource access (file I/O, storage operations)
- Log technical errors with context

**Why:**
Infrastructure deals with external systems. This is where technical failures occur.

**What to log:**
- External API requests/responses (sanitized)
- Network errors
- Authentication flows
- Storage operations
- Adapter translations

**Example:**
```typescript
export class WhoAmIService implements IWhoAmIService {
    constructor(
        private readonly authService: IAuthenticationService,
        private readonly logger: ILogger
    ) {}

    public async testConnection(
        environment: Environment,
        clientSecret?: string,
        password?: string
    ): Promise<WhoAmIResponse> {
        const url = environment.getDataverseUrl().getApiBaseUrl();
        this.logger.debug(`Testing connection to: ${url}`);

        try {
            const token = await this.authService.getAccessTokenForEnvironment(
                environment,
                clientSecret,
                password
            );

            this.logger.debug('Access token acquired successfully');

            const response = await fetch(url + '/WhoAmI', {
                headers: {
                    'Authorization': `Bearer ${token.substring(0, 10)}...`, // Truncate in logs
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                this.logger.error(
                    `WhoAmI API failed: ${response.status} ${response.statusText}`
                );
                throw new Error(`API returned ${response.status}`);
            }

            this.logger.info('Connection test successful');
            return await response.json();

        } catch (error) {
            this.logger.error('Connection test failed', error);
            throw error;
        }
    }
}
```

### Presentation Layer (User-Facing Logging)

**Rules:**
- Log user actions (command execution)
- Log panel lifecycle events
- Log webview communication errors
- Use VS Code's info/warning/error messages for user feedback

**Why:**
Presentation layer handles user interactions. Logs help diagnose UI issues.

**What to log:**
- Command invocations
- Panel open/close
- Message handling errors
- Unexpected user actions

**Example:**
```typescript
export class PersistenceInspectorPanel {
    constructor(
        private readonly panel: vscode.WebviewPanel,
        // ... use cases ...
        private readonly logger: ILogger
    ) {
        this.logger.debug('PersistenceInspectorPanel: Initialized');
        this.panel.onDidDispose(() => {
            this.logger.debug('PersistenceInspectorPanel: Disposed');
            this.dispose();
        });
    }

    private async handleMessage(message: unknown): Promise<void> {
        if (!this.isWebviewMessage(message)) {
            this.logger.warn('Received invalid message from webview', message);
            return;
        }

        this.logger.debug(`Handling webview command: ${message.command}`);

        try {
            switch (message.command) {
                case 'refresh':
                    await this.handleRefresh();
                    break;
                // ...
            }
        } catch (error) {
            this.logger.error(`Error handling command ${message.command}`, error);
            this.handleError(error);
        }
    }

    private async handleClearEntry(key: string): Promise<void> {
        this.logger.info(`User initiated clear for key: ${key}`);

        try {
            await this.clearStorageEntryUseCase.execute(key);
            this.logger.info(`Successfully cleared key: ${key}`);
            vscode.window.showInformationMessage(`Cleared: ${key}`);
        } catch (error) {
            this.logger.error(`Failed to clear key: ${key}`, error);
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to clear: ${message}`);
        }
    }
}
```

---

## VS Code OutputChannel vs console.log

### Decision Matrix

| Scenario | Use OutputChannel | Use console.log | Use Neither |
|----------|-------------------|-----------------|-------------|
| Production diagnostics | ✅ Yes | ❌ No | |
| User troubleshooting | ✅ Yes | ❌ No | |
| Extension operations | ✅ Yes | ❌ No | |
| API request/response | ✅ Yes | ❌ No | |
| Development debugging | ❌ No | ✅ Yes (temp only) | |
| Unit tests | ❌ No | ❌ No | ✅ Mock logger |
| Domain logic | ❌ No | ❌ No | ✅ Pure code |

### VS Code OutputChannel

**When to use:**
- Production logging visible to users
- Operational diagnostics
- Extension lifecycle events
- External API interactions
- Authentication flows
- Error tracking

**Characteristics:**
- Persistent across sessions
- User can open and view
- Survives extension reload
- Can be cleared by user
- Searchable in Output panel

**Example:**
```typescript
// In extension activation
const outputChannel = vscode.window.createOutputChannel('Power Platform Dev Suite');
const logger = new OutputChannelLogger(outputChannel);

// Throughout application
logger.info('Extension activated');
logger.debug('Loading environments from storage');
logger.error('Failed to authenticate', error);
```

### console.log

**When to use:**
- Temporary debugging during development
- Quick checks in breakpoint-free debugging
- Investigating test failures locally

**When NOT to use:**
- Production code
- Committed code (remove before commit)
- User-facing diagnostics

**Characteristics:**
- Only visible in Extension Host Debug Console
- Not available to end users
- Lost on extension reload
- No structure or levels

**Example:**
```typescript
// TEMPORARY - Remove before commit
console.log('DEBUG: Token length:', token.length);
console.log('DEBUG: Response structure:', JSON.stringify(response, null, 2));
```

### Decision Boundaries

```
┌─────────────────────────────────────────────────────┐
│                   Your Code                         │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Domain Layer                                │  │
│  │  - No logging                                │  │
│  │  - Pure business logic                       │  │
│  └──────────────────────────────────────────────┘  │
│                        ▲                            │
│                        │ (interfaces)               │
│  ┌──────────────────────────────────────────────┐  │
│  │  Application Layer                           │  │
│  │  - Strategic logging via ILogger             │  │
│  │  - Use case boundaries                       │  │
│  └──────────────────────────────────────────────┘  │
│                        ▲                            │
│                        │ (implementations)          │
│  ┌──────────────────────────────────────────────┐  │
│  │  Infrastructure & Presentation               │  │
│  │  - Technical logging via ILogger             │  │
│  │  - External APIs, storage, panels            │  │
│  └──────────────────────────────────────────────┘  │
│                        │                            │
└────────────────────────┼────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│ OutputChannel│                  │  console.log │
│              │                  │              │
│ - Production │                  │ - Dev only   │
│ - User-facing│                  │ - Temporary  │
│ - Persistent │                  │ - Remove     │
└──────────────┘                  └──────────────┘
```

---

## Service Design

### Interface Definition

Define logging interface in **shared infrastructure** layer (not domain):

**Location:** `src/infrastructure/logging/ILogger.ts`

```typescript
/**
 * Logger interface for cross-cutting logging concerns
 * Abstraction over VS Code OutputChannel and other logging mechanisms
 */
export interface ILogger {
    /**
     * Log debug information (verbose, development details)
     */
    debug(message: string, ...args: unknown[]): void;

    /**
     * Log informational messages (normal operations)
     */
    info(message: string, ...args: unknown[]): void;

    /**
     * Log warnings (non-critical issues)
     */
    warn(message: string, ...args: unknown[]): void;

    /**
     * Log errors (failures requiring attention)
     */
    error(message: string, error?: unknown): void;
}
```

### Implementation

**Location:** `src/infrastructure/logging/OutputChannelLogger.ts`

```typescript
import * as vscode from 'vscode';
import { ILogger } from './ILogger';

/**
 * Logger implementation using VS Code OutputChannel
 * Provides structured logging visible to users
 */
export class OutputChannelLogger implements ILogger {
    constructor(private readonly outputChannel: vscode.OutputChannel) {}

    public debug(message: string, ...args: unknown[]): void {
        this.log('DEBUG', message, args);
    }

    public info(message: string, ...args: unknown[]): void {
        this.log('INFO', message, args);
    }

    public warn(message: string, ...args: unknown[]): void {
        this.log('WARN', message, args);
    }

    public error(message: string, error?: unknown): void {
        this.log('ERROR', message);
        if (error instanceof Error) {
            this.outputChannel.appendLine(`  ${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(`  ${error.stack}`);
            }
        } else if (error) {
            this.outputChannel.appendLine(`  ${String(error)}`);
        }
    }

    private log(level: string, message: string, args?: unknown[]): void {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] ${message}`;

        this.outputChannel.appendLine(formattedMessage);

        if (args && args.length > 0) {
            args.forEach(arg => {
                this.outputChannel.appendLine(`  ${this.stringify(arg)}`);
            });
        }
    }

    private stringify(value: unknown): string {
        try {
            if (typeof value === 'string') return value;
            if (typeof value === 'number') return String(value);
            if (typeof value === 'boolean') return String(value);
            if (value === null) return 'null';
            if (value === undefined) return 'undefined';
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    }
}
```

### Null Logger (Testing)

**Location:** `src/infrastructure/logging/NullLogger.ts`

```typescript
import { ILogger } from './ILogger';

/**
 * Null logger implementation for testing
 * Discards all log messages
 */
export class NullLogger implements ILogger {
    public debug(_message: string, ..._args: unknown[]): void {
        // No-op
    }

    public info(_message: string, ..._args: unknown[]): void {
        // No-op
    }

    public warn(_message: string, ..._args: unknown[]): void {
        // No-op
    }

    public error(_message: string, _error?: unknown): void {
        // No-op
    }
}
```

### Spy Logger (Testing)

**Location:** `src/infrastructure/logging/SpyLogger.ts`

```typescript
import { ILogger } from './ILogger';

/**
 * Spy logger implementation for testing
 * Captures all log messages for assertion
 */
export class SpyLogger implements ILogger {
    public readonly debugMessages: string[] = [];
    public readonly infoMessages: string[] = [];
    public readonly warnMessages: string[] = [];
    public readonly errorMessages: string[] = [];

    public debug(message: string, ..._args: unknown[]): void {
        this.debugMessages.push(message);
    }

    public info(message: string, ..._args: unknown[]): void {
        this.infoMessages.push(message);
    }

    public warn(message: string, ..._args: unknown[]): void {
        this.warnMessages.push(message);
    }

    public error(message: string, _error?: unknown): void {
        this.errorMessages.push(message);
    }

    public reset(): void {
        this.debugMessages.length = 0;
        this.infoMessages.length = 0;
        this.warnMessages.length = 0;
        this.errorMessages.length = 0;
    }
}
```

---

## Dependency Management

### Injection Strategy

**Principle:** Logger is injected as a dependency, not accessed globally.

### Extension Activation (Composition Root)

**Location:** `src/extension.ts`

```typescript
export function activate(context: vscode.ExtensionContext): void {
    // ========================================
    // Logging Infrastructure
    // ========================================

    // Create OutputChannel (single instance for entire extension)
    const outputChannel = vscode.window.createOutputChannel('Power Platform Dev Suite');
    const logger = new OutputChannelLogger(outputChannel);

    logger.info('Extension activating...');

    // ========================================
    // Dependency Injection Setup
    // ========================================

    // Infrastructure Layer (with logger)
    const environmentRepository = new EnvironmentRepository(
        context.globalState,
        context.secrets,
        environmentDomainMapper,
        logger
    );

    const whoAmIService = new WhoAmIService(authService, logger);
    const powerPlatformApiService = new PowerPlatformApiService(authService, logger);

    // Application Layer (with logger)
    const testConnectionUseCase = new TestConnectionUseCase(
        whoAmIService,
        environmentRepository,
        logger
    );

    // Presentation Layer (with logger)
    const addEnvironmentCommand = vscode.commands.registerCommand(
        'power-platform-dev-suite.addEnvironment',
        () => {
            logger.debug('Add Environment command invoked');
            EnvironmentSetupPanel.createOrShow(
                context.extensionUri,
                loadEnvironmentByIdUseCase,
                saveEnvironmentUseCase,
                // ... other dependencies
                logger
            );
        }
    );

    logger.info('Extension activated successfully');

    // Dispose OutputChannel on deactivation
    context.subscriptions.push(outputChannel);
}
```

### Constructor Injection Pattern

**Use Cases:**
```typescript
export class TestConnectionUseCase {
    constructor(
        private readonly whoAmIService: IWhoAmIService,
        private readonly repository: IEnvironmentRepository,
        private readonly logger: ILogger  // Injected dependency
    ) {}

    public async execute(request: TestConnectionRequest): Promise<TestConnectionResponse> {
        this.logger.debug('TestConnectionUseCase: Starting connection test');

        try {
            // Business logic...
            this.logger.info('Connection test successful');
            return { success: true };
        } catch (error) {
            this.logger.error('Connection test failed', error);
            throw error;
        }
    }
}
```

**Infrastructure Services:**
```typescript
export class WhoAmIService implements IWhoAmIService {
    constructor(
        private readonly authService: IAuthenticationService,
        private readonly logger: ILogger  // Injected dependency
    ) {}

    public async testConnection(environment: Environment): Promise<WhoAmIResponse> {
        this.logger.debug(`Testing connection to ${environment.getName().getValue()}`);

        // Implementation...
    }
}
```

**Panels:**
```typescript
export class PersistenceInspectorPanel {
    private constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        private readonly inspectStorageUseCase: InspectStorageUseCase,
        // ... other use cases
        private readonly logger: ILogger,  // Injected dependency
        private disposables: vscode.Disposable[] = []
    ) {
        this.logger.debug('PersistenceInspectorPanel: Initializing');
        // Setup...
    }
}
```

### Why Not Global Logger?

**Avoid this anti-pattern:**
```typescript
// ❌ WRONG: Global singleton
export class Logger {
    private static instance: Logger;

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
}

// Usage
Logger.getInstance().info('Something happened');
```

**Problems with global logger:**
1. Hard to test (can't inject mock)
2. Hidden dependency (not visible in constructor)
3. Tight coupling to implementation
4. Violates dependency inversion
5. Makes unit testing difficult

**Correct pattern:**
```typescript
// ✅ RIGHT: Injected dependency
constructor(private readonly logger: ILogger) {}

// Tests can inject NullLogger or SpyLogger
const useCase = new TestConnectionUseCase(
    mockWhoAmIService,
    mockRepository,
    new NullLogger()  // No log noise in tests
);
```

---

## Implementation Examples

### Example 1: Use Case with Strategic Logging

```typescript
export class SaveEnvironmentUseCase {
    constructor(
        private readonly repository: IEnvironmentRepository,
        private readonly validationService: EnvironmentValidationService,
        private readonly eventPublisher: IDomainEventPublisher,
        private readonly logger: ILogger
    ) {}

    public async execute(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
        this.logger.debug('SaveEnvironmentUseCase: Starting save operation');

        try {
            // Step 1: Create/load environment
            let environment: Environment;
            if (request.existingEnvironmentId) {
                this.logger.debug('Loading existing environment');
                environment = await this.repository.getById(
                    new EnvironmentId(request.existingEnvironmentId)
                );
            } else {
                this.logger.debug('Creating new environment');
                environment = new Environment(/* ... */);
            }

            // Step 2: Validate
            this.logger.debug('Validating environment configuration');
            const validationResult = this.validationService.validate(environment);

            if (!validationResult.isValid) {
                this.logger.warn('Environment validation failed');
                return { success: false, errors: validationResult.errors };
            }

            // Step 3: Save
            this.logger.debug('Saving environment to repository');
            await this.repository.save(environment);

            this.logger.info(`Environment saved: ${environment.getName().getValue()}`);

            return { success: true, environmentId: environment.getId().getValue() };

        } catch (error) {
            this.logger.error('SaveEnvironmentUseCase: Failed to save', error);
            throw error;
        }
    }
}
```

### Example 2: Repository with Storage Logging

```typescript
export class EnvironmentRepository implements IEnvironmentRepository {
    constructor(
        private readonly globalState: vscode.Memento,
        private readonly secretStorage: vscode.SecretStorage,
        private readonly mapper: EnvironmentDomainMapper,
        private readonly logger: ILogger
    ) {}

    public async save(environment: Environment): Promise<void> {
        const id = environment.getId().getValue();
        this.logger.debug(`Saving environment: ${id}`);

        try {
            const environments = await this.getAll();
            const existingIndex = environments.findIndex(
                e => e.getId().getValue() === id
            );

            if (existingIndex >= 0) {
                this.logger.debug(`Updating existing environment: ${id}`);
                environments[existingIndex] = environment;
            } else {
                this.logger.debug(`Adding new environment: ${id}`);
                environments.push(environment);
            }

            const dto = environments.map(e => this.mapper.toPersistence(e));
            await this.globalState.update(STORAGE_KEY, dto);

            this.logger.info(`Environment saved: ${environment.getName().getValue()}`);

        } catch (error) {
            this.logger.error(`Failed to save environment: ${id}`, error);
            throw error;
        }
    }
}
```

---

## Testing Strategy

### Unit Tests with Mock Logger

```typescript
describe('TestConnectionUseCase', () => {
    let mockWhoAmIService: IWhoAmIService;
    let mockRepository: IEnvironmentRepository;
    let logger: SpyLogger;
    let useCase: TestConnectionUseCase;

    beforeEach(() => {
        mockWhoAmIService = { testConnection: jest.fn() };
        mockRepository = { getById: jest.fn(), getClientSecret: jest.fn() };
        logger = new SpyLogger();

        useCase = new TestConnectionUseCase(
            mockWhoAmIService,
            mockRepository,
            logger
        );
    });

    it('should log success when connection test succeeds', async () => {
        // Arrange
        (mockWhoAmIService.testConnection as jest.Mock).mockResolvedValue({
            userId: 'test-user-id'
        });

        // Act
        await useCase.execute({ name: 'Test', /* ... */ });

        // Assert
        expect(logger.infoMessages).toContain('Connection test successful');
    });
});
```

---

## Migration Guide

### Step 1: Add Logging Infrastructure

Create logging interfaces and implementations in `src/infrastructure/logging/`.

### Step 2: Update Extension Activation

```typescript
export function activate(context: vscode.ExtensionContext): void {
    const outputChannel = vscode.window.createOutputChannel('Power Platform Dev Suite');
    const logger = new OutputChannelLogger(outputChannel);

    logger.info('Extension activating...');

    // Pass logger to all dependencies...

    context.subscriptions.push(outputChannel);
}
```

### Step 3: Update Constructor Signatures

Add `logger: ILogger` parameter to all services, use cases, and panels.

### Step 4: Add Logging Statements

Follow patterns from examples above.

### Step 5: Update Tests

```typescript
const useCase = new TestConnectionUseCase(
    mockWhoAmIService,
    mockRepository,
    new NullLogger()  // Add logger
);
```

### Step 6: Remove console.log

Search and replace all `console.log` with appropriate logger calls.

---

## Webview Logging (Special Case)

### The Webview Challenge

VS Code webviews present a unique architectural constraint: they run in an **isolated browser context** without access to Node.js or VS Code APIs.

**The Problem:**
```
┌─────────────────────────────────────────┐
│       VS Code Extension Host            │
│       (Node.js context)                 │
│  ✅ Has: OutputChannel, ILogger, APIs   │
└─────────────────┬───────────────────────┘
                  │ postMessage only
                  ▼
┌─────────────────────────────────────────┐
│          Webview Panel                  │
│          (Browser context)              │
│  ❌ No: VS Code APIs, OutputChannel     │
│  ✅ Has: postMessage, console.log       │
└─────────────────────────────────────────┘
```

- Webviews cannot access `vscode.window.createOutputChannel()`
- Can only communicate via `postMessage` (async, one-way)
- `console.log` only visible in DevTools (requires user to manually open)
- Need production diagnostics for debugging user issues

**This conflicts with the main recommendation:** "console.log for development only (remove before commit)"

### Recommended Solution: Message Bridge with Build-Time Injection

**Architecture:**
1. **Production Logging**: WebviewLogger sends messages to extension host → ILogger → OutputChannel
2. **Development Logging**: Build-time flag enables console.log in addition to message bridge
3. **No Manual Checks**: Webpack DefinePlugin injects `DEV_MODE` at build time

**Why build-time injection:**
- ✅ Impossible to accidentally commit wrong setting
- ✅ Automatically correct for dev vs production builds
- ✅ No manual checks or pipeline validation needed (YAGNI)
- ✅ Leverages existing webpack build process

### Implementation

#### 1. Webpack Configuration

Add to webpack config for webview bundles:

```javascript
// webpack.config.js (webview bundle)
const webpack = require('webpack');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        // ... existing config
        plugins: [
            new webpack.DefinePlugin({
                'DEV_MODE': JSON.stringify(!isProduction)
            })
        ]
    };
};
```

This replaces `DEV_MODE` at build time:
- Development builds: `DEV_MODE` → `true`
- Production builds: `DEV_MODE` → `false`

#### 2. WebviewLogger Class

**File:** `resources/webview/js/utils/WebviewLogger.js`

```javascript
/**
 * WebviewLogger - Production logging for webviews
 * Bridges webview logs to extension host's OutputChannel via postMessage
 * DEV_MODE is injected at build time by webpack DefinePlugin
 */
class WebviewLogger {
    /**
     * @param {ReturnType<typeof acquireVsCodeApi>} vscode - VS Code API instance
     * @param {string} componentName - Component identifier (e.g., 'EnvironmentSetup')
     */
    constructor(vscode, componentName) {
        this.vscode = vscode;
        this.componentName = componentName;
    }

    debug(message, context) {
        this.log('debug', message, context);
    }

    info(message, context) {
        this.log('info', message, context);
    }

    warn(message, context) {
        this.log('warn', message, context);
    }

    error(message, error) {
        this.log('error', message, this.serializeError(error));
    }

    log(level, message, data) {
        // Send to extension host (production logging)
        this.vscode.postMessage({
            command: 'webview-log',
            level,
            message,
            componentName: this.componentName,
            data,
            timestamp: new Date().toISOString()
        });

        // In development, ALSO log to console (DEV_MODE injected by webpack)
        if (DEV_MODE) {
            const formatted = `[${this.componentName}] ${message}`;
            switch (level) {
                case 'debug': console.log(formatted, data); break;
                case 'info': console.info(formatted, data); break;
                case 'warn': console.warn(formatted, data); break;
                case 'error': console.error(formatted, data); break;
            }
        }
    }

    serializeError(error) {
        if (!error) return undefined;
        if (error instanceof Error) {
            return {
                message: error.message,
                name: error.name,
                stack: error.stack
            };
        }
        return { message: String(error) };
    }
}

window.WebviewLogger = WebviewLogger;
```

#### 3. Panel Message Handler

**Add to any panel that uses webviews:**

```typescript
import { ILogger } from '../../../../infrastructure/logging/ILogger';

interface WebviewLogMessage {
    command: 'webview-log';
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    componentName: string;
    data?: unknown;
    timestamp: string;
}

function isWebviewLogMessage(message: unknown): message is WebviewLogMessage {
    return typeof message === 'object'
        && message !== null
        && 'command' in message
        && message.command === 'webview-log'
        && 'level' in message
        && 'message' in message;
}

export class ExamplePanel {
    private constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly logger: ILogger,
        // ... other dependencies
    ) {
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            this.disposables
        );
    }

    private async handleMessage(message: unknown): Promise<void> {
        // Handle webview logs FIRST (before other messages)
        if (isWebviewLogMessage(message)) {
            this.handleWebviewLog(message);
            return;
        }

        // ... other message handlers
    }

    private handleWebviewLog(message: WebviewLogMessage): void {
        const prefix = `[Webview:${message.componentName}]`;
        const logMessage = `${prefix} ${message.message}`;

        switch (message.level) {
            case 'debug':
                this.logger.debug(logMessage, message.data);
                break;
            case 'info':
                this.logger.info(logMessage, message.data);
                break;
            case 'warn':
                this.logger.warn(logMessage, message.data);
                break;
            case 'error':
                this.logger.error(logMessage, message.data);
                break;
        }
    }
}
```

#### 4. Webview Usage

```javascript
// resources/webview/js/behaviors/EnvironmentSetupBehavior.js
(function() {
    'use strict';

    const vscode = acquireVsCodeApi();
    const logger = new WebviewLogger(vscode, 'EnvironmentSetup');

    // Production logging (always active)
    saveButton.addEventListener('click', () => {
        logger.info('User initiated save', {
            authMethod: authMethodSelect.value
        });
        saveEnvironment();
    });

    // Development logging (DEV_MODE injected by webpack)
    if (DEV_MODE) {
        console.log('Form element:', form);
        console.time('render');
    }

    renderForm();

    if (DEV_MODE) {
        console.timeEnd('render');
    }

    // Error handling
    try {
        // ... operation
    } catch (error) {
        logger.error('Operation failed', error);

        if (DEV_MODE) {
            console.error('Full error context:', {
                error,
                formState: getFormState()
            });
        }
    }
})();
```

### OutputChannel Format

Webview logs appear in OutputChannel with clear prefix:

```
[2025-11-01 10:15:23] [INFO] Extension activated
[2025-11-01 10:15:25] [INFO] [Webview:EnvironmentSetup] Form submitted
[2025-11-01 10:15:26] [DEBUG] [Webview:EnvironmentSetup] Validation passed
[2025-11-01 10:15:27] [INFO] SaveEnvironmentUseCase: Starting save operation
[2025-11-01 10:15:28] [ERROR] [Webview:EnvironmentSetup] Invalid URL
```

**Benefits:**
- Users see webview logs in OutputChannel (not trapped in DevTools)
- Clear attribution: webview vs extension host
- Chronological ordering shows interaction flow

### Decision Criteria for Webviews

**Use WebviewLogger (Message Bridge):**
- ✅ User actions (button clicks, form submissions)
- ✅ Form validation results
- ✅ Error conditions users might report
- ✅ State transitions
- ✅ Production diagnostics

**Use console.log (wrapped in `if (DEV_MODE)`):**
- ✅ DOM element inspection
- ✅ Event debugging
- ✅ Performance profiling (`console.time/timeEnd`)
- ✅ Complex object exploration

**Use Both for critical paths:**
```javascript
function testConnection() {
    logger.info('Testing connection', { url: dataverseUrl });

    if (DEV_MODE) {
        console.time('connection-test');
    }

    // ... perform test ...

    if (DEV_MODE) {
        console.timeEnd('connection-test');
    }
}
```

### Webview Logging Best Practices

1. **Sanitize sensitive data** - Never log secrets, tokens, or passwords
   ```javascript
   // ❌ BAD
   logger.info('Saving', { clientSecret: secret });

   // ✅ GOOD
   logger.info('Saving', { hasClientSecret: !!secret });
   ```

2. **Structured context objects** - Use objects, not string concatenation
   ```javascript
   // ✅ GOOD
   logger.info('Form submitted', { authMethod: 'ServicePrincipal', isEdit: false });

   // ❌ BAD
   logger.info('Submitted form with ServicePrincipal auth (edit mode)');
   ```

3. **Development logging pattern** - Always wrap in DEV_MODE check
   ```javascript
   if (DEV_MODE) {
       console.log('Debug info:', complexObject);
   }
   ```

### Integration Checklist

When adding webview logging to a panel:

- [ ] Configure webpack with DefinePlugin for DEV_MODE injection
- [ ] Add WebviewLogger.js to resources/webview/js/utils/
- [ ] Load WebviewLogger in panel's HTML (before behavior scripts)
- [ ] Create WebviewLogger instance in behavior script
- [ ] Add isWebviewLogMessage type guard to panel
- [ ] Add handleWebviewLog method to panel
- [ ] Handle webview-log messages FIRST in message handler
- [ ] Add production logging for user actions
- [ ] Wrap development console.log in `if (DEV_MODE)` blocks
- [ ] Test logs appear in OutputChannel with correct prefix
- [ ] Build production bundle and verify DEV_MODE is false

---

## Summary

### Key Takeaways

1. **Domain Layer**: Zero logging. Pure business logic only.
2. **Application Layer**: Strategic logging at use case boundaries.
3. **Infrastructure Layer**: Technical logging for external APIs.
4. **Presentation Layer**: User action logging for panels.
5. **OutputChannel**: Production logging mechanism.
6. **console.log**: Development only, remove before commit.
7. **Webview Logging (Special Case)**: Message bridge to OutputChannel + build-time DEV_MODE injection.
8. **Dependency Injection**: Logger injected through constructors.
9. **Testing**: Use `NullLogger` for silence, `SpyLogger` for assertions.

### Webview Logging Summary

- **Problem**: Webviews cannot access OutputChannel directly
- **Solution**: Message bridge via postMessage + webpack DefinePlugin for DEV_MODE
- **Decision**: YAGNI on manual checks/pipelines - build-time injection handles it
- **Production**: WebviewLogger → postMessage → Panel → ILogger → OutputChannel
- **Development**: Same as production + console.log (when DEV_MODE = true)

---

**Document Version:** 1.1
**Last Updated:** 2025-11-01
**Author:** Clean Architecture Guardian
**Changes:** Added Webview Logging section with build-time injection approach
