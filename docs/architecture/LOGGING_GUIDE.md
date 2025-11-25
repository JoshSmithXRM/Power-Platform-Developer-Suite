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

### Logging Levels Quick Guide

| Level | Use For | Example |
|-------|---------|---------|
| **trace** | Extremely verbose diagnostics | `"Processing trace 5 of 100"` |
| **debug** | Technical details, method flow | `"Fetching plugin traces from Dataverse"` |
| **info** | Business events, completions | `"Environment activated successfully"` |
| **warn** | Recoverable issues, fallbacks | `"Trace level not found, defaulting to 'Off'"` |
| **error** | Failures, exceptions | `"Failed to fetch plugin traces"` |

### Message Format Rules

- ✅ **Capitalize** first letter
- ✅ **No period** at end
- ✅ **Structured data** in args object
- ✅ **Action verb** + target + context
- ❌ **No string interpolation** for data

### Where to Log

| Layer | What to Log | Level |
|-------|-------------|-------|
| Domain | ❌ Nothing | Pure business logic |
| Application | ✅ Use case start/completion, orchestration failures | `info`, `error` |
| Infrastructure | ✅ API calls, authentication, storage operations | `debug`, `trace`, `error` |
| Presentation | ✅ User actions, panel lifecycle, message errors | `debug`, `warn` |
| Webview | ✅ User interactions, errors | `WebviewLogger` → postMessage |

**Note**: `trace` level is rarely needed - use only for deep diagnostic scenarios like debugging raw API responses or detailed loop execution.

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

## Logging Levels

### When to Use Each Level

| Level | Purpose | Use When | Examples |
|-------|---------|----------|----------|
| **trace** | Extremely verbose diagnostics | • Loop iterations<br>• Method entry/exit (every call)<br>• Raw payloads/responses<br>• Step-by-step execution flow<br>• Deep troubleshooting only | `"Processing trace 5 of 100"`<br>`"Entering mapToEntity()"`<br>`"Raw API response: {...}"` |
| **debug** | Diagnostic details for troubleshooting | • Method flow (significant calls)<br>• Conditional branches<br>• Technical details<br>• API calls (without raw data) | `"Fetching plugin traces from Dataverse"`<br>`"Filtering 50 traces by correlation ID"` |
| **info** | Significant business events | • Use case completion<br>• Successful operations<br>• State changes<br>• Key milestones | `"Environment activated successfully"`<br>`"Exported 25 traces to CSV"` |
| **warn** | Unexpected but recoverable | • Deprecated features used<br>• Missing optional config<br>• Fallback behavior<br>• Invalid user input | `"Environment missing Power Platform ID, cannot open Maker portal"`<br>`"Trace level setting not found, defaulting to 'Off'"` |
| **error** | Failures requiring attention | • Use case failures<br>• API errors<br>• Authentication failures<br>• Data corruption | `"Failed to fetch plugin traces from Dataverse"`<br>`"Connection test failed: 401 Unauthorized"` |

### Trace vs Debug: When to Use Each

**Use trace() for:**
- Loop iterations: `logger.trace('Processing trace', { index: i, total: traces.length })`
- Method entry/exit: `logger.trace('Entering validateEnvironment', { envId })`
- Raw data dumps: `logger.trace('API response', { rawResponse })`
- Step-by-step execution: `logger.trace('Step 3: Validating authentication token')`

**Use debug() for:**
- High-level flow: `logger.debug('Validating 5 environments')`
- Significant operations: `logger.debug('Fetching plugin traces from Dataverse', { filter })`
- Technical details: `logger.debug('Using cached authentication token', { expiresIn })`

**Rule of thumb**: If enabling the log would flood the output with hundreds of messages, use `trace()`. If it provides useful diagnostic info without overwhelming output, use `debug()`.

---

## Message Formatting Standards

### Capitalization Rules

1. **Start with capital letter** (sentence case)
2. **Entity names capitalized** (proper nouns)
3. **Technical terms as-is** (e.g., API, JSON, CSV)

**✅ GOOD:**
```typescript
logger.info('Environment activated successfully');
logger.debug('Fetching plugin traces from Dataverse');
logger.error('Failed to parse JSON response');
```

**❌ BAD:**
```typescript
logger.info('environment activated successfully'); // Missing capital
logger.debug('Fetching Plugin Traces From Dataverse'); // Over-capitalized
logger.error('failed to parse json response'); // Wrong case
```

### Punctuation Rules

1. **No period at end** (consistency, cleaner output)
2. **Colons for context** (key: value pairs)
3. **Quotes for user input** (distinguish from system values)

**✅ GOOD:**
```typescript
logger.info('Deleted 15 trace(s)'); // No period
logger.debug('Testing connection to environment', { envId }); // Colon in structured data
logger.warn('Invalid trace level provided: "InvalidLevel"'); // Quotes for user input
```

**❌ BAD:**
```typescript
logger.info('Deleted 15 trace(s).'); // Unnecessary period
logger.debug('Testing connection to environment ' + envId); // String concat instead of structured
logger.warn('Invalid trace level provided InvalidLevel'); // No quotes, unclear
```

### Message Structure

**Pattern**: `Action + Target + Context`

1. **Action verb** (present continuous for in-progress, past tense for completed)
2. **Target** (what's being acted upon)
3. **Context** (relevant details in structured args)

**✅ GOOD:**
```typescript
// In-progress (present continuous)
logger.debug('Fetching plugin traces from Dataverse', { environmentId, filter });

// Completed (past tense or "successfully")
logger.info('Plugin traces fetched successfully', { count: traces.length });

// Failed (past tense + "failed")
logger.error('Failed to fetch plugin traces', error);
```

**❌ BAD:**
```typescript
logger.debug('Getting traces'); // Vague, no context
logger.info('Done'); // Meaningless
logger.error('Error occurred'); // No details
```

### Structured Logging

**Use structured args for data** (not string interpolation)

**✅ GOOD:**
```typescript
logger.debug('Deleting traces', { environmentId, count: traceIds.length });
logger.info('Trace level updated', { level: level.value, environmentId });
```

**❌ BAD:**
```typescript
logger.debug(`Deleting ${traceIds.length} traces from ${environmentId}`);
logger.info('Trace level updated to ' + level.value + ' for ' + environmentId);
```

**Why?** Structured logging:
- Easier to parse programmatically
- Better for log aggregation tools
- Cleaner output formatting
- Consistent key naming

### Component Prefixes

**Use prefixes for disambiguation** (especially in large files)

**✅ GOOD:**
```typescript
// In use case
logger.debug('GetPluginTracesUseCase: Fetching traces', { filter });

// In repository
logger.debug('DataversePluginTraceRepository: Executing query', { endpoint });

// In panel
logger.debug('PluginTraceViewerPanel: Handling refresh command');
```

**When to use:**
- Multiple similar classes in call stack
- Deep call chains (know which layer logged)
- Debugging specific component behavior

**When to skip:**
- Context is obvious (e.g., error message in use case already clear)
- Short-lived operations (e.g., mapper transformations)

---

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
    trace(message: string, ...args: unknown[]): void;  // Extremely verbose
    debug(message: string, ...args: unknown[]): void;  // Verbose diagnostics
    info(message: string, ...args: unknown[]): void;   // Business events
    warn(message: string, ...args: unknown[]): void;   // Recoverable issues
    error(message: string, error?: unknown): void;     // Failures
}
```

### OutputChannelLogger Implementation

```typescript
// src/infrastructure/logging/OutputChannelLogger.ts
import * as vscode from 'vscode';
import { ILogger } from './ILogger';

export class OutputChannelLogger implements ILogger {
    constructor(private readonly outputChannel: vscode.LogOutputChannel) {}

    public trace(message: string, ...args: unknown[]): void {
        // Use VS Code's native trace level (extremely verbose)
        this.outputChannel.trace(this.formatMessage(message, args));
    }

    public debug(message: string, ...args: unknown[]): void {
        this.outputChannel.debug(this.formatMessage(message, args));
    }

    public info(message: string, ...args: unknown[]): void {
        this.outputChannel.info(this.formatMessage(message, args));
    }

    public warn(message: string, ...args: unknown[]): void {
        this.outputChannel.warn(this.formatMessage(message, args));
    }

    public error(message: string, error?: unknown): void {
        if (error instanceof Error) {
            this.outputChannel.error(`${message}: ${error.message}`);
            if (error.stack) {
                this.outputChannel.error(error.stack);
            }
        } else {
            this.outputChannel.error(message);
        }
    }

    private formatMessage(message: string, args: unknown[]): string {
        if (args.length === 0) return message;
        const argsStr = args.map(arg => JSON.stringify(arg, null, 2)).join('\n');
        return `${message}\n${argsStr}`;
    }
}
```

**Note**: VS Code's `LogOutputChannel` automatically adds timestamps and level prefixes. Users can filter by log level in the Output panel dropdown.

### Test Implementations

```typescript
// NullLogger - discards all logs (for tests)
export class NullLogger implements ILogger {
    public trace(_message: string, ..._args: unknown[]): void {}
    public debug(_message: string, ..._args: unknown[]): void {}
    public info(_message: string, ..._args: unknown[]): void {}
    public warn(_message: string, ..._args: unknown[]): void {}
    public error(_message: string, _error?: unknown): void {}
}

// SpyLogger - captures logs for assertions (for tests)
export class SpyLogger implements ILogger {
    public readonly traceMessages: string[] = [];
    public readonly debugMessages: string[] = [];
    public readonly infoMessages: string[] = [];
    public readonly warnMessages: string[] = [];
    public readonly errorMessages: string[] = [];

    public trace(message: string): void { this.traceMessages.push(message); }
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
