# Code Commenting Guide

**Purpose**: Establishes when, how, and why to write comments in the Power Platform Developer Suite codebase.

---

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
 * @see ARCHITECTURE_GUIDE.md for template method pattern details
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
    // TODO: Debugging - remove before commit
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

### Configuration Files (JSON, package.json)

**Use inline comments (JSON5) or adjacent docs**:
```json
{
  "scripts": {
    // Development build - USE THIS FOR TESTING
    // Includes source maps, skips minification
    "compile": "webpack --mode development",

    // Production build - for releases only
    // Minified, optimized, no source maps
    "package": "webpack --mode production"
  }
}
```

**Note**: Standard JSON doesn't support comments. Use `package.json` adjacent docs or migrate to JSON5 if needed.

---

## Special Cases

### File Header Comments

**Use for license, copyright, or module overview**:

```typescript
/**
 * @fileoverview BasePanel - Abstract base class for all webview panels
 *
 * Provides common functionality for panel lifecycle, state management,
 * and component composition. All panels MUST extend this class.
 *
 * @see ARCHITECTURE_GUIDE.md for template method pattern
 * @see PANEL_LAYOUT_GUIDE.md for panel structure requirements
 */

// Rest of file...
```

**Don't use for authorship** (git blame handles this):
```typescript
// ❌ BAD - Authorship in comments
/**
 * Created by: John Doe
 * Date: 2025-01-15
 * Modified by: Jane Smith on 2025-02-01
 */
```

---

### Warning Comments

**Use for dangerous operations**:

```typescript
// ⚠️ WARNING: Changing execution order requires restarting all plugins
// Dataverse caches plugin metadata aggressively
// Always test in dev environment before production deployment
async function updateExecutionOrder(pluginId: string, newOrder: number): Promise<void> {
    // ...
}
```

```typescript
// ⚠️ SECURITY: This endpoint bypasses permission checks
// Only call after validating user has explicit permission
// See: docs/SECURITY.md for permission validation patterns
private async deleteEntityBypassPermissions(entityId: string): Promise<void> {
    // ...
}
```

---

### Debug Comments

**Allowed temporarily, remove before commit**:

```typescript
// TODO: DEBUG - Remove before commit
console.log('User data:', user);
console.log('Computed value:', computeValue(user));

function processUser(user: User): void {
    // ...
}
```

**Pre-commit hook can catch these**:
```bash
#!/bin/sh
# Reject commits with debug comments
if git diff --cached | grep -i "TODO: DEBUG"; then
    echo "Error: Found DEBUG comment. Remove before committing."
    exit 1
fi
```

---

## Industry Best Practices Summary

### Clean Code (Robert C. Martin)
- Comments are often a code smell
- Prefer self-documenting code
- If code needs comment, refactor code first

### The Pragmatic Programmer (Hunt & Thomas)
- Comments explain WHY, not WHAT
- Document non-obvious decisions
- Keep comments close to code they describe

### Google Style Guides
- All public APIs must have documentation comments
- Inline comments for non-obvious code
- Avoid redundant comments

### Microsoft Guidelines
- Use XML/JSDoc comments for public APIs
- Explain complex algorithms
- Document external contracts
- Mark technical debt (TODO, FIXME)

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

## Enforcement & Validation

### ESLint Rules (Recommended)

```javascript
// .eslintrc.js
module.exports = {
    rules: {
        // Warn on TODO comments (require issue tracking)
        'no-warning-comments': ['warn', {
            terms: ['TODO', 'FIXME', 'HACK', 'XXX'],
            location: 'start'
        }],

        // Require JSDoc for public methods (can configure)
        'jsdoc/require-jsdoc': ['warn', {
            publicOnly: true,
            require: {
                FunctionDeclaration: true,
                MethodDefinition: true,
                ClassDeclaration: true
            }
        }]
    }
};
```

### Pre-commit Hook

```bash
#!/bin/sh
# Check for debug comments
if git diff --cached | grep -E "console\.log|debugger|TODO: DEBUG"; then
    echo "⚠️  Found debug code. Remove before committing."
    exit 1
fi

# Check for commented-out code blocks (heuristic)
if git diff --cached | grep -E "^[+]\s*//\s*(const|let|var|function|class)" | wc -l | grep -v "^0$"; then
    echo "⚠️  Found commented-out code. Delete it (git remembers)."
    exit 1
fi
```

### Code Review Checklist

During code review, verify:
- [ ] No obvious/redundant comments ("set x to 5")
- [ ] Public APIs have JSDoc/TSDoc
- [ ] Complex algorithms explained
- [ ] WHY comments for non-obvious decisions
- [ ] No commented-out code
- [ ] TODO/FIXME have issue numbers
- [ ] No outdated comments
- [ ] Regex patterns explained

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

## Examples from This Codebase

### ✅ Good Comment Examples

**1. Architecture Decision** (from BaseBehavior.js):
```javascript
/**
 * BaseBehavior - Abstract base class for component behaviors
 *
 * CRITICAL: All component behaviors MUST extend this class.
 *
 * TEMPLATE METHOD PATTERN:
 * Base class ALWAYS calls ALL lifecycle hooks (no if checks).
 * Subclasses override hooks as needed:
 * - createInstance() - Build instance structure
 * - findDOMElements() - Cache element references
 * - setupEventListeners() - Attach handlers
 * - onComponentUpdate() - Handle data updates (REQUIRED)
 * - cleanupInstance() - Resource cleanup
 *
 * WHY this pattern:
 * Before BaseBehavior, missing `case 'componentUpdate'` caused silent failures.
 * Template method + abstract onComponentUpdate() prevents this at design time.
 */
```

**2. Business Logic** (from PluginService.ts - hypothetical):
```typescript
/**
 * Sets plugin trace level for environment.
 *
 * DATAVERSE BEHAVIOR:
 * - Changes apply immediately but plugins cache metadata
 * - May take 5-10 minutes for running plugins to reflect change
 * - Requires prvConfigureTraceSettings privilege
 * - Trace logs auto-delete after 24 hours
 */
async setTraceLevel(environmentId: string, level: PluginTraceLevel): Promise<void> {
    // ...
}
```

**3. Workaround** (from SplitPanelBehavior.js):
```javascript
static showRightPanel(instance) {
    // Remove BOTH CSS class AND inline style
    // SplitPanelBehavior hides using both for reliability:
    // - CSS class: split-panel-right-hidden
    // - Inline style: display: none
    // Inline style overrides CSS due to specificity, must remove both
    instance.element.classList.remove('split-panel-right-hidden');
    instance.rightPanel.style.display = '';  // Remove inline style
}
```

---

## 🔗 See Also

- [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) - Documentation comment standards
- [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - Architectural decision documentation
- [CODE_MAINTENANCE_GUIDE.md](CODE_MAINTENANCE_GUIDE.md) - Technical debt tracking (TODO/FIXME)
