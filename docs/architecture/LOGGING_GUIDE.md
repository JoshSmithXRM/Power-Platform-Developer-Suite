# Logging Architecture for Power Platform Developer Suite

This document defines the logging architecture for the Power Platform Developer Suite VS Code extension, ensuring alignment with Clean Architecture principles while providing appropriate debugging and operational visibility.

---

## 🚀 Quick Reference

### Core Principles
- **Domain layer**: Zero logging (pure business logic)
- **Application layer**: Strategic logging at use case boundaries
- **Infrastructure layer**: Technical logging for external APIs
- **Presentation layer**: User action logging
- **Production**: VS Code OutputChannel only
- **Development**: console.log (temporary, remove before commit)
- **Webview**: Message bridge to OutputChannel + build-time DEV_MODE injection

### Where to Log

| Layer | What to Log | How |
|-------|-------------|-----|
| Domain | ❌ Nothing | Pure business logic |
| Application | ✅ Use case start/completion, orchestration failures | `logger.info()` |
| Infrastructure | ✅ API calls, authentication, storage operations | `logger.debug()` |
| Presentation | ✅ User actions, panel lifecycle, message errors | `logger.debug()` |
| Webview | ✅ User interactions, errors | `WebviewLogger` → postMessage |

### OutputChannel vs console.log

| Scenario | Use OutputChannel | Use console.log |
|----------|-------------------|-----------------|
| Production diagnostics | ✅ Yes | ❌ No |
| User troubleshooting | ✅ Yes | ❌ No |
| Development debugging | ❌ No | ✅ Yes (temp only) |
| Unit tests | ❌ No | ❌ No (use NullLogger) |
| Domain logic | ❌ No | ❌ No (pure code) |

---

## 📖 Detailed Guide

## Architecture Principles

### Dependency Inversion
Domain defines logging contracts through interfaces. Infrastructure provides implementations.

### Zero Domain Dependencies
Domain layer has no knowledge of VS Code APIs, console, or any concrete logging mechanism.

**❌ WRONG** - Domain entity with infrastructure dependency:
```typescript
export class Environment {
    public activate(): void {
        console.log('Activating environment'); // ❌ Infrastructure leak
        this.isActive = true;
    }
}
```

**✅ CORRECT** - Domain entity pure, logging at boundary:
```typescript
// Domain entity - pure business logic
export class Environment {
    public activate(): void {
        this.isActive = true;
        this.lastUsed = new Date();
    }
}

// Use case logs the operation
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

**Why**: Domain entities represent pure business concepts. Logging is an infrastructure concern. This separation enables:
- Domain logic testable without infrastructure
- Domain entities reusable in different contexts
- External dependencies flow inward through interfaces

---

## Layer Boundaries

### Domain Layer (Zero Logging)

**Rules:**
- ❌ NO direct logging in domain entities
- ❌ NO direct logging in domain services
- ✅ Return rich domain events
- ✅ Let outer layers handle logging

**Example:**
```typescript
// Domain Service - NO logging
export class StorageInspectionService {
    public async inspectStorage(): Promise<StorageCollection> {
        const globalState = await this.storageReader.readAllGlobalState();
        const secretKeys = await this.storageReader.readAllSecretKeys();

        const entries: StorageEntry[] = [];
        for (const [key, value] of globalState) {
            entries.push(StorageEntry.create(key, value, 'global'));
        }

        return StorageCollection.create(entries, protectedPatterns);
    }
}
```

### Application Layer (Strategic Logging)

**What to log:** Use case start/completion, parameters (sanitized), orchestration failures

```typescript
export class InspectStorageUseCase {
    constructor(
        private readonly storageInspectionService: StorageInspectionService,
        private readonly logger: ILogger
    ) {}

    public async execute(): Promise<StorageCollectionViewModel> {
        this.logger.debug('InspectStorageUseCase: Starting storage inspection');

        try {
            const collection = await this.storageInspectionService.inspectStorage();
            this.logger.info(`Storage inspected: ${collection.getAllEntries().length} entries found`);
            return StorageCollectionMapper.toViewModel(collection);
        } catch (error) {
            this.logger.error('InspectStorageUseCase: Failed to inspect storage', error);
            throw error;
        }
    }
}
```

### Infrastructure Layer (Technical Logging)

**What to log:** API calls, network errors, authentication flows, storage operations

```typescript
export class WhoAmIService implements IWhoAmIService {
    constructor(
        private readonly authService: IAuthenticationService,
        private readonly logger: ILogger
    ) {}

    public async testConnection(environment: Environment): Promise<WhoAmIResponse> {
        const url = environment.getDataverseUrl().getApiBaseUrl();
        this.logger.debug(`Testing connection to: ${url}`);

        try {
            const token = await this.authService.getAccessTokenForEnvironment(environment);
            const response = await fetch(url + '/WhoAmI', {
                headers: { 'Authorization': `Bearer ${token.substring(0, 10)}...` }
            });

            if (!response.ok) {
                this.logger.error(`WhoAmI API failed: ${response.status}`);
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

**What to log:** Command invocations, panel lifecycle, message errors, user actions

```typescript
export class PersistenceInspectorPanel {
    constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly logger: ILogger
    ) {
        this.logger.debug('PersistenceInspectorPanel: Initialized');
        this.panel.onDidDispose(() => this.logger.debug('PersistenceInspectorPanel: Disposed'));
    }

    private async handleMessage(message: unknown): Promise<void> {
        if (!this.isWebviewMessage(message)) {
            this.logger.warn('Received invalid message from webview', message);
            return;
        }

        this.logger.debug(`Handling webview command: ${message.command}`);

        try {
            // Handle message...
        } catch (error) {
            this.logger.error(`Error handling command ${message.command}`, error);
        }
    }
}
```

---

## Service Design

### ILogger Interface

```typescript
// src/infrastructure/logging/ILogger.ts
export interface ILogger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, error?: unknown): void;
}
```

### OutputChannelLogger Implementation

```typescript
// src/infrastructure/logging/OutputChannelLogger.ts
import * as vscode from 'vscode';
import { ILogger } from './ILogger';

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
        }
    }

    private log(level: string, message: string, args?: unknown[]): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] [${level}] ${message}`);

        if (args && args.length > 0) {
            args.forEach(arg => {
                this.outputChannel.appendLine(`  ${JSON.stringify(arg, null, 2)}`);
            });
        }
    }
}
```

### Test Implementations

```typescript
// NullLogger - discards all logs (for tests)
export class NullLogger implements ILogger {
    public debug(_message: string, ..._args: unknown[]): void {}
    public info(_message: string, ..._args: unknown[]): void {}
    public warn(_message: string, ..._args: unknown[]): void {}
    public error(_message: string, _error?: unknown): void {}
}

// SpyLogger - captures logs for assertions (for tests)
export class SpyLogger implements ILogger {
    public readonly debugMessages: string[] = [];
    public readonly infoMessages: string[] = [];
    public readonly warnMessages: string[] = [];
    public readonly errorMessages: string[] = [];

    public debug(message: string): void { this.debugMessages.push(message); }
    public info(message: string): void { this.infoMessages.push(message); }
    public warn(message: string): void { this.warnMessages.push(message); }
    public error(message: string): void { this.errorMessages.push(message); }
}
```

---

## Dependency Injection

### Extension Activation Pattern

```typescript
// src/extension.ts
export function activate(context: vscode.ExtensionContext): void {
    // Create OutputChannel (single instance for entire extension)
    const outputChannel = vscode.window.createOutputChannel('Power Platform Dev Suite');
    const logger = new OutputChannelLogger(outputChannel);

    logger.info('Extension activating...');

    // Inject logger into all dependencies
    const whoAmIService = new WhoAmIService(authService, logger);
    const testConnectionUseCase = new TestConnectionUseCase(whoAmIService, repository, logger);

    logger.info('Extension activated successfully');
    context.subscriptions.push(outputChannel);
}
```

### Why Injection, Not Global Singleton?

**❌ WRONG** - Global singleton (hard to test, hidden dependency):
```typescript
Logger.getInstance().info('Something happened');
```

**✅ CORRECT** - Constructor injection (testable, explicit dependency):
```typescript
constructor(private readonly logger: ILogger) {}

// Tests inject NullLogger or SpyLogger
const useCase = new TestConnectionUseCase(mockService, mockRepository, new NullLogger());
```

---

## Webview Logging (Special Case)

### The Challenge

Webviews run in an **isolated browser context** without Node.js or VS Code APIs. They cannot access OutputChannel directly.

**Solution:** Message bridge + build-time DEV_MODE injection
- **Production**: WebviewLogger → postMessage → Panel → ILogger → OutputChannel
- **Development**: Same + console.log (when DEV_MODE = true via webpack)

### Implementation

**1. Webpack Config** - Inject DEV_MODE at build time:
```javascript
// webpack.webview.config.js
plugins: [
    new webpack.DefinePlugin({
        'DEV_MODE': JSON.stringify(argv.mode !== 'production')
    })
]
```

**2. WebviewLogger** - Bridge to OutputChannel:
```javascript
// resources/webview/js/utils/WebviewLogger.js
class WebviewLogger {
    constructor(vscode, componentName) {
        this.vscode = vscode;
        this.componentName = componentName;
    }

    log(level, message, data) {
        // Production: Send to extension host
        this.vscode.postMessage({
            command: 'webview-log',
            level,
            message,
            componentName: this.componentName,
            data
        });

        // Development: Also log to console (DEV_MODE injected by webpack)
        if (DEV_MODE) {
            console[level](`[${this.componentName}] ${message}`, data);
        }
    }
}
```

**3. Panel Handler** - Forward to ILogger:
```typescript
interface WebviewLogMessage {
    command: 'webview-log';
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    componentName: string;
}

export class ExamplePanel {
    private async handleMessage(message: unknown): Promise<void> {
        if (isWebviewLogMessage(message)) {
            this.logger[message.level](`[Webview:${message.componentName}] ${message.message}`);
            return;
        }
        // ... other handlers
    }
}
```

**4. Usage** - Log user actions:
```javascript
const logger = new WebviewLogger(acquireVsCodeApi(), 'EnvironmentSetup');

// Production logging (always)
logger.info('User initiated save', { authMethod: authMethodSelect.value });

// Development-only (DEV_MODE injected by webpack)
if (DEV_MODE) {
    console.time('render');
}
renderForm();
if (DEV_MODE) {
    console.timeEnd('render');
}
```

---

## Summary

### Key Takeaways

1. **Domain Layer**: Zero logging. Pure business logic only.
2. **Application Layer**: Strategic logging at use case boundaries.
3. **Infrastructure Layer**: Technical logging for external APIs.
4. **Presentation Layer**: User action logging for panels.
5. **OutputChannel**: Production logging mechanism.
6. **console.log**: Development only, remove before commit.
7. **Webview Logging**: Message bridge to OutputChannel + build-time DEV_MODE injection.
8. **Dependency Injection**: Logger injected through constructors.
9. **Testing**: Use `NullLogger` for silence, `SpyLogger` for assertions.

---

## 🔗 See Also

- [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - Clean Architecture principles
- [ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md) - Error handling standards
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing strategies
