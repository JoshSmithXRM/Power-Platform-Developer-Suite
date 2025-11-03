# Comment and Logging Cleanup Prompt

**Purpose**: Reusable prompt for automated comment and logging cleanup on uncommitted changes. No review files - just fixes issues directly according to project standards.

---

## 🚀 Quick Reference

**What This Does**: Invokes `@agent-code-documenter` to automatically fix comment and logging issues in all uncommitted changes.

**Standards Applied**:
- Comments: Follow `docs/DOCUMENTATION_STYLE_GUIDE.md`
- Logging: Follow `docs/architecture/LOGGING_GUIDE.md`

**Execution Mode**: Direct fixes (no review files, no manual intervention needed)

**Scope**: Only uncommitted changes (git working directory)

---

## 📖 The Prompt

Copy and paste the following prompt to invoke automated cleanup:

```
@agent-code-documenter - Perform comment and logging cleanup on ALL uncommitted changes.

Standards to follow:
1. Comments: docs/DOCUMENTATION_STYLE_GUIDE.md
2. Logging: docs/architecture/LOGGING_GUIDE.md

Requirements:

Comment Cleanup:
✅ Add "Why" explanations for non-obvious code
✅ Keep public/protected method JSDoc comments
✅ Keep complex algorithm explanations
❌ Remove placeholder comments ("Handle event", "Process data", "TODO: implement")
❌ Remove obvious comments ("This is a class", "Get the value")
❌ Remove band-aid comments that excuse bad code

Logging Cleanup:
✅ Ensure domain layer has ZERO logging
✅ Ensure application layer logs at use case boundaries only
✅ Ensure infrastructure layer logs API calls, auth, storage (debug level)
✅ Ensure presentation layer logs user actions, panel lifecycle
✅ Replace console.log with ILogger (except temporary dev debugging)
✅ Replace Logger.getInstance() with injected ILogger
✅ Redact secrets/tokens (truncate to first 10 chars)
✅ Use NullLogger in test files

Execution:
- NO findings file - fix issues directly
- Only touch uncommitted changes (git working directory)
- Fix both TypeScript and documentation files
- Apply fixes that align with CLAUDE.md rules

When complete, summarize what was fixed.
```

---

## 📋 Example Usage

### Step 1: Make Changes

Edit files in your working directory (uncommitted changes).

### Step 2: Run Cleanup

Copy the prompt above and paste into Claude Code.

### Step 3: Review Summary

Read the summary of fixes applied:

```
Comment and Logging Cleanup Complete

Files Modified: 5

Comment Fixes Applied:
- Removed 8 placeholder comments ("Handle event", "Process data")
- Removed 12 obvious comments
- Added 3 "Why" explanations for complex logic
- Fixed 2 JSDoc comments with better descriptions

Logging Fixes Applied:
- Removed 2 console.log statements from production code
- Removed 4 logs from domain entities (moved to use case layer)
- Added ILogger injection to 2 use cases
- Redacted 1 token in log statement
- Replaced 3 Logger.getInstance() calls with injected logger

Files changed:
- src/domain/entities/Environment.ts (removed 2 logs)
- src/application/useCases/SaveEnvironmentUseCase.ts (added logger injection)
- src/infrastructure/services/AuthenticationService.ts (redacted token)
- src/presentation/panels/EnvironmentSetupPanel.ts (removed console.log)
- src/webview/components/DataTableView.ts (improved comments)
```

### Step 4: Review Changes

Use `git diff` to review the specific changes applied.

---

## 🎯 What Gets Fixed

### Comment Cleanup

#### ✅ Keeps (Good Comments)

**Public API Documentation**:
```typescript
/**
 * Activates the environment and updates last used timestamp.
 *
 * Why: Last used tracking enables smart environment suggestions.
 */
public activate(): void {
    this.isActive = true;
    this.lastUsed = new Date();
}
```

**Complex Logic Explanations**:
```typescript
// Use case-insensitive comparison because Dataverse entity names
// are case-insensitive but may vary in casing across API responses
const normalizedName = entityName.toLowerCase();
```

**Non-Obvious "Why" Comments**:
```typescript
// Delay initialization to avoid race condition with VSCode extension host
// See: https://github.com/microsoft/vscode/issues/12345
await new Promise(resolve => setTimeout(resolve, 100));
```

#### ❌ Removes (Bad Comments)

**Placeholder Comments**:
```typescript
// ❌ REMOVED
// Handle the event
private handleEvent(): void { ... }

// ❌ REMOVED
// Process the data
private processData(): void { ... }

// ❌ REMOVED
// TODO: implement this
private someMethod(): void { }
```

**Obvious Comments**:
```typescript
// ❌ REMOVED
// This is a class
export class Environment { }

// ❌ REMOVED
// Get the environment ID
public getId(): string {
    return this.id;  // What else would getId() do?
}

// ❌ REMOVED
// Loop through environments
for (const env of environments) { ... }
```

**Band-Aid Comments** (excuse for bad code):
```typescript
// ❌ REMOVED (fix the code instead)
// This is messy but it works
// Ignore this hack
// Don't ask why this is here
```

---

### Logging Cleanup

#### ✅ Fixes (Correct Patterns)

**Remove Logs from Domain**:
```typescript
// BEFORE (❌ Wrong)
export class Environment {
    public activate(): void {
        console.log('Activating environment');  // ❌ Infrastructure leak
        this.isActive = true;
    }
}

// AFTER (✅ Correct)
export class Environment {
    public activate(): void {
        // No logging - pure domain logic
        this.isActive = true;
        this.lastUsed = new Date();
    }
}

// Log moved to use case layer
export class ActivateEnvironmentUseCase {
    public async execute(id: string): Promise<void> {
        const env = await this.repository.getById(id);
        env.activate();
        await this.repository.save(env);
        this.logger.info(`Environment activated: ${id}`);  // ✅ Log at boundary
    }
}
```

**Replace Global Logger with Injection**:
```typescript
// BEFORE (❌ Wrong)
export class TestConnectionUseCase {
    public async execute(envId: string): Promise<void> {
        Logger.getInstance().info('Testing connection');  // ❌ Global singleton
    }
}

// AFTER (✅ Correct)
export class TestConnectionUseCase {
    constructor(
        private readonly whoAmIService: IWhoAmIService,
        private readonly logger: ILogger  // ✅ Injected
    ) {}

    public async execute(envId: string): Promise<void> {
        this.logger.info('Testing connection');
    }
}
```

**Redact Secrets**:
```typescript
// BEFORE (❌ Wrong)
this.logger.debug(`Token: ${accessToken}`);  // ❌ Full token exposed

// AFTER (✅ Correct)
this.logger.debug(`Token: ${accessToken.substring(0, 10)}...`);  // ✅ Truncated
```

**Remove console.log from Production**:
```typescript
// BEFORE (❌ Wrong)
export class EnvironmentSetupPanel {
    private handleSave(): void {
        console.log('Saving environment');  // ❌ console.log in production
        this.saveEnvironment();
    }
}

// AFTER (✅ Correct)
export class EnvironmentSetupPanel {
    constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly logger: ILogger  // ✅ Injected logger
    ) {}

    private handleSave(): void {
        this.logger.debug('User initiated save');  // ✅ OutputChannel
        this.saveEnvironment();
    }
}
```

**Use NullLogger in Tests**:
```typescript
// BEFORE (❌ Wrong)
it('should activate environment', () => {
    const useCase = new ActivateEnvironmentUseCase(
        mockRepository,
        Logger.getInstance()  // ❌ Real logger in tests
    );
});

// AFTER (✅ Correct)
it('should activate environment', () => {
    const useCase = new ActivateEnvironmentUseCase(
        mockRepository,
        new NullLogger()  // ✅ Silent logger for tests
    );
});
```

---

## 🚨 Edge Cases and Exceptions

### When console.log is OK

**Temporary Development Debugging**:
```typescript
// ✅ OK (but remove before commit)
if (DEV_MODE) {
    console.time('renderPerformance');
    this.render();
    console.timeEnd('renderPerformance');
}
```

**Webview with DEV_MODE Injection**:
```javascript
// ✅ OK (webpack injects DEV_MODE at build time)
if (DEV_MODE) {
    console.log('[DataTable] Rendering', this.state);
}
// Production: Use WebviewLogger instead
this.logger.debug('Rendering table', this.state);
```

### When Domain Logging Might Seem Needed

**❌ WRONG** - Log in domain entity:
```typescript
export class Environment {
    public activate(): void {
        if (this.isActive) {
            console.log('Already active');  // ❌ NO
            return;
        }
        this.isActive = true;
    }
}
```

**✅ CORRECT** - Return result, log at boundary:
```typescript
// Domain entity - pure logic
export class Environment {
    public activate(): ActivationResult {
        if (this.isActive) {
            return { success: false, reason: 'already-active' };
        }
        this.isActive = true;
        return { success: true };
    }
}

// Use case - logs the result
export class ActivateEnvironmentUseCase {
    public async execute(id: string): Promise<void> {
        const env = await this.repository.getById(id);
        const result = env.activate();

        if (!result.success) {
            this.logger.warn(`Environment ${id} already active`);
            return;
        }

        await this.repository.save(env);
        this.logger.info(`Environment ${id} activated`);
    }
}
```

### When to Keep TODOs

**❌ REMOVE** - Vague placeholders:
```typescript
// TODO: implement this
// TODO: fix this later
// TODO: handle error
```

**✅ KEEP** - Specific, tracked items with context:
```typescript
// TODO(#123): Add retry logic for transient network failures
// See: https://github.com/org/repo/issues/123
```

---

## ⚙️ Customization Options

### Target Specific Files

```
@agent-code-documenter - Perform comment and logging cleanup on these files:
- src/domain/entities/Environment.ts
- src/application/useCases/SaveEnvironmentUseCase.ts

[Rest of prompt unchanged]
```

### Comment Cleanup Only

```
@agent-code-documenter - Perform COMMENT cleanup only (skip logging) on all uncommitted changes.

Comment Standards: docs/DOCUMENTATION_STYLE_GUIDE.md

✅ Add "Why" explanations for non-obvious code
✅ Keep JSDoc for public/protected methods
❌ Remove placeholder comments
❌ Remove obvious comments
❌ Remove band-aid comments

NO logging changes. Only fix comments.
```

### Logging Cleanup Only

```
@agent-code-documenter - Perform LOGGING cleanup only (skip comments) on all uncommitted changes.

Logging Standards: docs/architecture/LOGGING_GUIDE.md

✅ Remove logs from domain layer
✅ Ensure use case boundary logging
✅ Replace console.log with ILogger
✅ Redact secrets/tokens
✅ Use NullLogger in tests

NO comment changes. Only fix logging.
```

---

## 🔍 Validation Checklist

After cleanup runs, verify the following:

### Comments
- [ ] No placeholder comments ("Handle event", "Process data")
- [ ] No obvious comments ("This is a class")
- [ ] All public/protected methods have JSDoc
- [ ] Complex algorithms have "Why" explanations
- [ ] No band-aid comments excusing bad code

### Logging
- [ ] Domain layer has zero logs (pure business logic)
- [ ] Application layer logs at use case boundaries
- [ ] Infrastructure layer logs API calls, auth, storage
- [ ] Presentation layer logs user actions, lifecycle
- [ ] No console.log in production code (except DEV_MODE guards)
- [ ] No Logger.getInstance() (all injected ILogger)
- [ ] All secrets/tokens redacted or truncated
- [ ] Test files use NullLogger or SpyLogger

---

## 🔗 See Also

- [DOCUMENTATION_STYLE_GUIDE.md](../DOCUMENTATION_STYLE_GUIDE.md) - Comment standards and conventions
- [LOGGING_GUIDE.md](../architecture/LOGGING_GUIDE.md) - Logging architecture and layer boundaries
- [CLAUDE.md](../../CLAUDE.md) - AI assistant instructions and coding rules
- [CODE_REVIEW_PROMPT.md](CODE_REVIEW_PROMPT.md) - Parallel agent code review prompt
