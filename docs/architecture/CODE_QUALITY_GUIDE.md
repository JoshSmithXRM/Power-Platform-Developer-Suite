# Code Quality Guide

This document defines code quality standards for the Power Platform Developer Suite, covering comments, naming conventions, and code organization patterns.

---

## 🚀 Quick Reference

### Core Principles
- **Code as documentation**: Write self-explanatory code first, comment only when necessary
- **Comment WHY, not WHAT**: Explain rationale, not mechanics
- **Public APIs need docs**: All public methods require JSDoc/TSDoc
- **No placeholder comments**: "Handle event" / "Process data" add no value
- **Delete commented code**: Git history preserves everything

### When to Comment

| Scenario | Required | Example |
|----------|----------|---------|
| Public API (methods, classes) | ✅ Yes | JSDoc with @param, @returns |
| Complex algorithm | ✅ Yes | Explain approach, not line-by-line |
| Regular expressions | ✅ Yes | Always explain pattern |
| WHY (non-obvious decision) | ✅ Yes | Performance choice, workaround |
| Architecture decision | ✅ Yes | Why inheritance vs composition |
| Business rule | ✅ Yes | External constraints, domain rules |
| TODO/FIXME/HACK | ✅ Yes | With issue number or removal date |
| Obvious code | ❌ No | Let code speak for itself |
| Bad code band-aid | ❌ No | Refactor code instead |
| Changelog | ❌ No | Use git commit messages |

### Logging Quick Reference

**See [LOGGING_GUIDE.md](LOGGING_GUIDE.md) for complete architecture**

| Layer | Logging | How |
|-------|---------|-----|
| Domain | ❌ Never | Pure business logic, zero infrastructure |
| Application | ✅ Use case boundaries | Injected `ILogger`, info/debug/error |
| Infrastructure | ✅ API calls, auth | Injected `ILogger`, debug level |
| Presentation | ✅ User actions | Injected `ILogger`, debug level |
| Tests | ❌ Use `NullLogger` | Silent by default |
| Development | ⚠️ `console.log` only | Remove before commit |

**NEVER:**
- ❌ `console.log` in production code
- ❌ Logging in domain entities/services
- ❌ Global `Logger.getInstance()`
- ❌ Unredacted secrets/tokens

---

## 📖 Detailed Guide

## Philosophy: Code as Documentation

### Core Principle

**"Comments are a failure to express yourself in code" - Robert C. Martin (Clean Code)**

But also...

**"Comments should explain WHY, not WHAT" - The Pragmatic Programmer**

### The Balance

```typescript
// ❌ BAD - Comment explains WHAT (code already does this)
// Loop through users and print their names
users.forEach(user => {
    console.log(user.name);
});

// ✅ GOOD - No comment needed, code is self-documenting
users.forEach(user => {
    console.log(user.name);
});

// ✅ GOOD - Comment explains WHY (not obvious from code)
// Process users in memory instead of database to avoid N+1 queries
// benchmarked at 10x faster for <1000 users (see perf/user-processing.md)
users.forEach(user => {
    console.log(user.name);
});
```

**Your approach is correct**: Write code that reads like a book, add comments only when code alone can't convey the intent.

---

## When to Comment (The ONLY Valid Reasons)

### 1. **Public API Documentation** (Required)

**All public APIs MUST have JSDoc/TSDoc**:
- Classes and their purpose
- Public methods, parameters, and return types
- Configuration interfaces
- Component contracts

**Why**: Other developers (including AI assistants) need to understand how to use your API without reading implementation.

**TypeScript Example**:
```typescript
/**
 * Creates and manages data table components for displaying tabular data.
 *
 * @example
 * ```typescript
 * const table = ComponentFactory.createDataTable({
 *     id: 'myTable',
 *     columns: [{ key: 'name', label: 'Name' }],
 *     data: rows
 * });
 * ```
 */
export class DataTableComponent extends BaseComponent<TableRow[]> {
    /**
     * Updates table data and triggers re-render via event bridge.
     *
     * @param data - Array of table rows with 'id' property required
     * @throws {Error} If data is missing 'id' property on any row
     */
    public setData(data: TableRow[]): void {
        this.validateData(data);
        this.data = [...data];
        this.notifyUpdate();
    }
}
```

**JavaScript Example (Webview Behaviors)**:
```javascript
/**
 * DataTableBehavior - Webview behavior for DataTable component
 *
 * Extends BaseBehavior to enforce componentUpdate pattern and provide
 * consistent lifecycle management across all table instances.
 *
 * @see BaseBehavior for lifecycle hooks
 * @see COMPONENT_PATTERNS.md for usage examples
 */
class DataTableBehavior extends BaseBehavior {
    /**
     * Get component type identifier (REQUIRED by BaseBehavior)
     * @returns {string} Component type for message routing
     */
    static getComponentType() {
        return 'DataTable';
    }
}
```

---

### 2. **WHY, Not WHAT** (Explain Rationale)

**Comment when decision is non-obvious**:

```typescript
// ✅ GOOD - Explains WHY we do something counter-intuitive
export class EnvironmentSelectorComponent {
    public setSelectedEnvironment(environmentId: string | null): void {
        this.selectedEnvironmentId = environmentId;
        this.notifyUpdate();

        // Trigger onChange callback even for programmatic selection
        // Ensures panel loads data on initial auto-select (not just user clicks)
        // Without this, panels open empty until user manually changes environment
        if (this.config.onChange) {
            this.config.onChange(environmentId || '');
        }
    }
}
```

```typescript
// ✅ GOOD - Explains performance decision
private generateHTML(data: TableRow[]): string {
    // Use template literals instead of DOM manipulation for initial render
    // 5x faster for >100 rows (see benchmarks/table-rendering.md)
    return data.map(row => `<tr>...</tr>`).join('');
}
```

```typescript
// ✅ GOOD - Explains workaround for external bug
private async fetchWithRetry(url: string): Promise<Response> {
    // Retry once on 429 (rate limit) because Dataverse API
    // sometimes returns 429 even when rate limit not actually hit
    // See: https://github.com/microsoft/PowerApps-Samples/issues/123
    try {
        return await fetch(url);
    } catch (error) {
        if (error.status === 429) {
            await this.delay(1000);
            return await fetch(url);
        }
        throw error;
    }
}
```

---

### 3. **Complex Algorithms** (Explain the Logic)

**When code is inherently complex, comment the approach**:

```typescript
// ✅ GOOD - Complex algorithm explained
/**
 * Calculates optimal panel split ratio based on content size.
 *
 * Algorithm:
 * 1. Measure content in both panels
 * 2. Calculate ratio that avoids scrolling if possible
 * 3. Clamp ratio to 20/80 - 80/20 range (prevent tiny panels)
 * 4. Snap to common ratios (50/50, 60/40, 70/30) if within 5%
 *
 * @param leftContent - Content size in pixels
 * @param rightContent - Content size in pixels
 * @returns Percentage for left panel (e.g., 60 for 60/40 split)
 */
private calculateOptimalSplit(leftContent: number, rightContent: number): number {
    const totalContent = leftContent + rightContent;
    const idealRatio = (leftContent / totalContent) * 100;

    // Clamp to prevent unusable panels
    const clampedRatio = Math.max(20, Math.min(80, idealRatio));

    // Snap to common ratios if close (better UX consistency)
    const commonRatios = [50, 60, 70];
    for (const ratio of commonRatios) {
        if (Math.abs(clampedRatio - ratio) < 5) {
            return ratio;
        }
    }

    return Math.round(clampedRatio);
}
```

---

### 4. **Regular Expressions** (Almost Always Need Explanation)

**Regex is write-only code - ALWAYS comment**:

```typescript
// ✅ GOOD - Regex explained
// Match Dataverse entity logical names: lowercase letters, numbers, underscores
// Must start with letter, end with letter or number
// Examples: "account", "new_customentity", "cr123_field"
const entityNamePattern = /^[a-z][a-z0-9_]*[a-z0-9]$/;
```

```typescript
// ✅ GOOD - Complex regex with breakdown
// Extract environment ID from Dataverse URL
// Format: https://{orgname}.crm.dynamics.com or https://{orgname}.{region}.dynamics.com
// Captures: orgname (group 1), optional region (group 2)
// Examples:
//   - "https://contoso.crm.dynamics.com" → "contoso"
//   - "https://contoso.crm4.dynamics.com" → "contoso"
const urlPattern = /https:\/\/([a-z0-9-]+)\.(?:crm\d*|([a-z0-9]+))\.dynamics\.com/i;
```

---

### 5. **Architecture Decisions** (Document Critical Choices)

**Major architectural decisions deserve explanation**:

```typescript
/**
 * BasePanel - Abstract base class for all webview panels
 *
 * ARCHITECTURE DECISION:
 * Panels extend BasePanel rather than composition because:
 * 1. VS Code WebviewPanel API expects single class per panel
 * 2. Lifecycle tightly coupled (dispose, state management)
 * 3. Inheritance provides template method pattern for initialization
 *
 * Alternative considered: Composition with PanelManager
 * Rejected because: Would create indirection without benefits
 *
 * @see CLEAN_ARCHITECTURE_GUIDE.md for template method pattern details
 */
export abstract class BasePanel<TInstanceState, TPreferences> {
    // ...
}
```

```javascript
// ARCHITECTURE DECISION: BaseBehavior uses static methods, not instances
//
// Why static:
// 1. Behaviors are singletons per component type (no need for instances)
// 2. Simpler message routing (direct static calls)
// 3. Matches VS Code webview patterns (no module system)
//
// Tradeoff: Can't use traditional OOP patterns (inheritance, polymorphism)
// Benefit: Simpler, more explicit, easier to debug
class BaseBehavior {
    static instances = new Map();
    // ...
}
```

---

### 6. **TODOs, FIXMEs, HACKs** (Technical Debt)

**Mark technical debt explicitly**:

```typescript
// TODO(issue-123): Refactor to use event bridge instead of direct DOM manipulation
// Current approach works but bypasses component lifecycle
// Blocked by: Need to implement custom event type in ComponentUtils
updateTableCell(rowId: string, column: string, value: string): void {
    const cell = document.querySelector(`[data-row="${rowId}"] [data-column="${column}"]`);
    if (cell) {
        cell.textContent = value;
    }
}
```

```typescript
// FIXME: Memory leak - event listeners not cleaned up on panel dispose
// Reproduce: Open/close panel 10+ times, check Chrome Task Manager
// Impact: ~2MB per open/close cycle
// Priority: High (affects long-running sessions)
private setupEventListeners(): void {
    this.panel.webview.onDidReceiveMessage(message => {
        this.handleMessage(message);
    });
}
```

```typescript
// HACK: Workaround for VS Code API limitation
// VS Code doesn't expose webview ready state, so we poll
// See: https://github.com/microsoft/vscode/issues/12345
// Remove when issue is resolved
private waitForWebviewReady(): Promise<void> {
    return new Promise((resolve) => {
        const checkReady = setInterval(() => {
            this.postMessage({ command: 'ping' });
        }, 100);

        this.once('pong', () => {
            clearInterval(checkReady);
            resolve();
        });
    });
}
```

**Format for Technical Debt Comments**:
```
// TODO(issue-number): What needs to be done
// FIXME: What's broken and why
// HACK: Why this workaround exists and when to remove
// XXX: Extreme warning about dangerous code
```

---

### 7. **Non-Obvious Business Logic** (Domain Knowledge)

**When business rules aren't obvious from code**:

```typescript
// ✅ GOOD - Business rule explained
private validatePluginRegistration(plugin: PluginRegistration): void {
    // Dataverse constraint: Plugin assemblies must be signed with strong name
    // This is a platform requirement, not our validation logic
    // See: https://docs.microsoft.com/power-apps/developer/data-platform/register-plug-in
    if (!plugin.assembly.isStrongNameSigned) {
        throw new Error('Plugin assembly must be signed with strong name key');
    }

    // Execution order must be unique per stage/entity/message combination
    // Duplicate execution orders cause non-deterministic plugin execution
    // Platform allows duplicates but causes runtime issues
    this.validateExecutionOrderUnique(plugin);
}
```

---

### 8. **Integration Points** (External System Contracts)

**Document assumptions about external systems**:

```typescript
// ✅ GOOD - External API contract documented
/**
 * Fetches plugin trace logs from Dataverse Web API.
 *
 * DATAVERSE API CONTRACT:
 * - Returns max 5000 records per request (platform limitation)
 * - Pagination via @odata.nextLink in response
 * - Trace logs auto-deleted after 24 hours (platform behavior)
 * - Requires prvReadPluginTraceLog privilege
 *
 * @param environmentId - Target environment
 * @param filters - OData filter parameters
 * @returns Array of trace log records (max 5000, paginate for more)
 */
async getPluginTraceLogs(
    environmentId: string,
    filters: TraceFilters
): Promise<PluginTraceLog[]> {
    // ...
}
```

---

## When NOT to Comment (Anti-Patterns)

### ❌ **Don't Comment the Obvious**

```typescript
// ❌ BAD - Comment states exactly what code does
// Set the name to John
const name = 'John';

// ❌ BAD - Comment just repeats method name
// Get user by ID
function getUserById(id: string): User {
    // ...
}

// ❌ BAD - Comment adds no information
// Loop through items
items.forEach(item => {
    process(item);
});
```

**Fix**: Remove the comment, let code speak for itself.

---

### ❌ **Don't Use Comments to Band-Aid Bad Code**

```typescript
// ❌ BAD - Comment trying to explain confusing code
// Check if user is admin or has permission and is active and not deleted
if (u.r === 'a' || (u.p && u.s === 1 && !u.d)) {
    // ...
}

// ✅ GOOD - Refactor code to be self-explanatory (no comment needed)
const isAdmin = user.role === 'admin';
const hasActivePermission = user.hasPermission && user.isActive && !user.isDeleted;
if (isAdmin || hasActivePermission) {
    // ...
}
```

**Rule**: If you're about to write a comment explaining bad code, refactor the code instead.

---

### ❌ **Don't Comment Out Code**

```typescript
// ❌ BAD - Commented out code
function loadData() {
    // const oldWay = fetchDataSync();
    // return transformData(oldWay);

    return fetchDataAsync();
}
```

**Fix**: Delete it. Git history preserves everything.

**Exception**: Short-term debugging (delete before committing):
```typescript
function loadData() {
    // TODO: DEBUG - remove before commit
    // console.log('Loading data...');
    return fetchDataAsync();
}
```

---

### ❌ **Don't Write Changelog Comments**

```typescript
// ❌ BAD - Changelog in code
// 2025-01-15: Added error handling (John Doe)
// 2025-01-20: Fixed null reference bug (Jane Smith)
// 2025-02-01: Refactored for performance (John Doe)
function processData(data: any[]): void {
    // ...
}
```

**Fix**: Use git commit messages. They're designed for this.

---

### ❌ **Don't Document Bad Names**

```typescript
// ❌ BAD - Comment compensating for bad naming
// Gets the user's full name (first name + last name)
function get(u: User): string {
    return `${u.fn} ${u.ln}`;
}

// ✅ GOOD - Good naming makes comment unnecessary
function getFullName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
}
```

**Rule**: If you need a comment to explain what a variable/function does, rename it.

---

## Code Comment Styles

### TypeScript (Extension Host)

**Use TSDoc for public APIs**:
```typescript
/**
 * Creates environment selector component instance.
 *
 * @param config - Configuration object with id, label, and onChange callback
 * @returns Configured EnvironmentSelectorComponent instance
 * @throws {Error} If config.id is missing or duplicate
 *
 * @example
 * ```typescript
 * const selector = ComponentFactory.createEnvironmentSelector({
 *     id: 'myPanel-envSelector',
 *     label: 'Environment',
 *     onChange: (envId) => this.loadData(envId)
 * });
 * ```
 */
public createEnvironmentSelector(
    config: EnvironmentSelectorConfig
): EnvironmentSelectorComponent {
    // ...
}
```

**Use inline comments for WHY**:
```typescript
private processData(data: any[]): ProcessedData[] {
    // Process in chunks to avoid blocking event loop
    // Tested with 10k items: chunking keeps UI responsive
    const chunkSize = 100;
    return this.processInChunks(data, chunkSize);
}
```

---

### JavaScript (Webview Behaviors)

**Use JSDoc for class/method documentation**:
```javascript
/**
 * Handles user interaction with data table component.
 *
 * Implements BaseBehavior pattern to ensure consistent lifecycle
 * management and enforce componentUpdate handling.
 *
 * @extends BaseBehavior
 */
class DataTableBehavior extends BaseBehavior {
    /**
     * Handle component data updates from Extension Host.
     *
     * @param {Object} instance - Component instance from instances Map
     * @param {Array} data - Table row data
     */
    static onComponentUpdate(instance, data) {
        // ...
    }
}
```

---

## Logging Standards

**See [LOGGING_GUIDE.md](LOGGING_GUIDE.md) for comprehensive architecture details.**

### Quick Rules

**NEVER log in domain layer**:
```typescript
// ❌ WRONG - Domain entity with logging
export class Environment {
    public activate(): void {
        console.log('Activating environment'); // ❌ Infrastructure leak
        this.isActive = true;
    }
}

// ✅ CORRECT - Domain entity pure, logging at boundary
export class Environment {
    public activate(): void {
        this.isActive = true; // Pure domain logic
    }
}

// Application layer logs the operation
export class ActivateEnvironmentUseCase {
    public async execute(id: string): Promise<void> {
        const env = await this.repository.getById(id);
        env.activate(); // Pure domain method
        await this.repository.save(env);
        this.logger.info(`Environment activated: ${id}`); // ✅ Log here
    }
}
```

**Inject ILogger, never use global singleton**:
```typescript
// ❌ WRONG - Global singleton
Logger.getInstance().info('Something happened');

// ✅ CORRECT - Constructor injection
constructor(private readonly logger: ILogger) {}
```

**Remove console.log before commit**:
```typescript
// ⚠️ TEMPORARY ONLY - Must remove before commit
console.log('Debug:', value);

// ✅ PRODUCTION - Use injected ILogger
this.logger.debug('Processing value', { value });
```

---

## Decision Tree: Should I Write a Comment?

```
Is this public API (class, method, interface)?
├─ YES → Write JSDoc/TSDoc documentation
└─ NO → Continue...

Is the code's purpose obvious from reading it?
├─ YES → DON'T comment
└─ NO → Continue...

Can I make the code more obvious (rename, refactor)?
├─ YES → Refactor code, DON'T comment
└─ NO → Continue...

Does code involve:
├─ Complex algorithm? → Comment explaining approach
├─ Business rule? → Comment explaining rule
├─ Workaround/hack? → Comment explaining why and when to remove
├─ Performance optimization? → Comment with benchmark data
├─ Integration contract? → Comment documenting external expectations
├─ Non-obvious WHY? → Comment explaining rationale
└─ None of above? → DON'T comment
```

---

## Comment Maintenance Rules

### 1. **Update Comments When Code Changes**

```typescript
// ❌ BAD - Outdated comment
// Returns user's email address
function getUserName(user: User): string {  // Changed from email to name!
    return user.name;
}

// ✅ GOOD - Comment updated with code
// Returns user's display name (firstName + lastName)
function getUserName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
}
```

**Rule**: If you change code, update or remove related comments.

---

### 2. **Remove Comments That Become Obvious**

```typescript
// Before refactor - comment needed
// Extract user's first name from full name string
const firstName = fullName.split(' ')[0];

// After refactor - comment now redundant, remove it
const firstName = extractFirstName(fullName);
```

---

### 3. **Consolidate Scattered Comments**

```typescript
// ❌ BAD - Fragmented explanation
// Check user permissions
const hasPermission = checkPermission(user);
// Validate user is active
const isActive = user.status === 'active';
// Ensure not deleted
const notDeleted = !user.deleted;

// ✅ GOOD - Single coherent comment
// User must be active, have permission, and not deleted to access admin panel
const canAccessAdmin = checkPermission(user) &&
                       user.status === 'active' &&
                       !user.deleted;
```

---

## 🔗 See Also

- [LOGGING_GUIDE.md](LOGGING_GUIDE.md) - Comprehensive logging architecture
- [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md) - Architecture patterns
- [DOCUMENTATION_STYLE_GUIDE.md](../DOCUMENTATION_STYLE_GUIDE.md) - Markdown documentation standards
- [TESTING_GUIDE.md](../testing/TESTING_GUIDE.md) - Testing patterns
