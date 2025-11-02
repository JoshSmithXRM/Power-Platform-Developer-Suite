# Technical Debt & Future Improvements

This document tracks known technical debt and future improvement opportunities that have been deferred for valid reasons.

## Code Quality

### Cross-Feature DTO Coupling in Persistence Inspector

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (15-20 minutes)

**Issue:**
The Persistence Inspector infrastructure layer directly references `EnvironmentConnectionDto` from the `environmentSetup` feature to derive secret keys. This creates cross-feature coupling at the infrastructure level.

**Current State:**
```typescript
// VsCodeStorageReader.ts
import { EnvironmentConnectionDto } from '../../../environmentSetup/application/dto/EnvironmentConnectionDto';

public async readAllSecretKeys(): Promise<string[]> {
    const environments = this.globalState.get<EnvironmentConnectionDto[]>(
        VsCodeStorageReader.ENVIRONMENTS_KEY, []
    );
    // Derives secret keys from environment structure
}
```

**Why Deferred:**
- Persistence Inspector is a debug tool that needs to understand environment structure
- Infrastructure-to-infrastructure coupling is acceptable in Clean Architecture
- Only one feature currently needs this pattern
- "Don't abstract until you need it twice" principle

**When to Address:**
- When a 3rd feature needs to read environment data
- When environment DTO structure changes frequently
- During refactoring sprint focused on shared infrastructure

**Recommended Solution:**
1. Create shared DTOs in `src/shared/domain/` or `src/shared/application/`
2. Move environment-related DTOs to shared location
3. Both features reference shared DTOs instead of cross-feature imports

**Related Review Finding:**
Clean Architecture Guardian - Optional Improvement #1

---

## Documentation

### CLEAN_ARCHITECTURE_GUIDE.md Exceeds Length Limit

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (2-3 hours to split properly)

**Issue:**
`docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` is 1,709 lines, exceeding the DOCUMENTATION_STYLE_GUIDE.md hard limit of 1,200 lines.

**Current State:**
- Comprehensive guide with Quick Reference, 5 core principles, layer architecture, decision frameworks, 3 real-world examples, and 5 common mistakes
- All examples from actual production code (Environment entity, SaveEnvironmentUseCase, EnvironmentRepository)
- Well-structured with progressive disclosure
- Highly valuable reference document

**Why Deferred:**
- Content quality is exceptional (scored 88/100 in review)
- Document is navigable with Quick Reference section
- Style guide allows comprehensive guides as exception
- Not enough architectural patterns documented yet (only Environment feature fully implemented)
- Better to split after Data Panel Suite is implemented (more patterns to organize)

**When to Address:**
- After Data Panel Suite implementation (will have more examples and patterns)
- When document approaches 2,000 lines
- When adding significantly more content

**Recommended Solution:**
Split into 3 documents (~500-600 lines each):
1. `CLEAN_ARCHITECTURE_GUIDE.md` - Principles, layer overview, decision framework
2. `CLEAN_ARCHITECTURE_EXAMPLES.md` - Detailed real-world examples (Environment, Data Panels)
3. `CLEAN_ARCHITECTURE_PATTERNS.md` - Common mistakes, value objects, rich models

**Related Review Finding:**
Code review by primary developer - scored 88/100, exceeded 1200 line hard limit

---

## Architecture & Design Patterns

### DataTablePanel SRP Violation (Template Method Pattern Trade-off)

**Status**: Accepted Trade-off
**Priority**: Low
**Effort**: High (8-12 hours)

**Issue:**
`DataTablePanel` violates Single Responsibility Principle by handling 8+ responsibilities:
- Environment management
- Search functionality
- Sorting
- Error handling
- Loading states
- HTML generation
- Message routing
- Cancellation token management

**Current State:**
```typescript
// DataTablePanel.ts (750+ lines)
export abstract class DataTablePanel {
    // Handles all table-related responsibilities
}
```

**Why Deferred:**
- **Massive DRY benefit**: Eliminated 950 lines of duplication across panels
- Only 2 panel types currently exist (ImportJobViewer, SolutionExplorer)
- Both panels have identical needs (search, sort, environment switching)
- Template Method pattern is working well for current use cases
- Code explicitly documents this trade-off with TODO comment

**When to Address:**
When a 3rd panel type emerges that doesn't fit the current pattern (e.g., panel without search/sort, or with fundamentally different table behavior).

**Recommended Solution:**
Refactor to composition-based approach:

```typescript
// Behavior components
interface ISearchBehavior {
    filter(data: unknown[], query: string): unknown[];
}

interface ISortBehavior {
    sort(data: unknown[], column: string, direction: 'asc' | 'desc'): unknown[];
}

interface IEnvironmentSwitchBehavior {
    switchEnvironment(environmentId: string): Promise<void>;
}

// Composable panel base
export abstract class BasePanelWithBehaviors {
    constructor(
        private searchBehavior?: ISearchBehavior,
        private sortBehavior?: ISortBehavior,
        private environmentBehavior?: IEnvironmentSwitchBehavior
    ) {}
}
```

**Related Review Finding:**
Code Quality Review - Critical Issue #2 (Acknowledged trade-off)

---

### Generic Type Parameters on DataTablePanel

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (3-4 hours)

**Issue:**
DataTablePanel could use generic type parameters for stronger compile-time type safety:

**Current State:**
```typescript
export abstract class DataTablePanel {
    protected abstract loadData(): Promise<void>;
    protected sendData(data: unknown[]): void { /* ... */ }
}
```

**Proposed Enhancement:**
```typescript
export abstract class DataTablePanel<TData = unknown> {
    protected abstract loadData(): Promise<TData[]>;
    protected sendData(data: TData[]): void { /* ... */ }
}

// Usage
export class ImportJobViewerPanel extends DataTablePanel<ImportJobViewModel> {
    // Now type-safe! TypeScript enforces return type of loadData()
}
```

**Why Deferred:**
- **Adds complexity**: Generic type parameters increase cognitive load for developers
- **Minimal benefit**: Current `unknown[]` approach is working fine with proper type narrowing at usage sites
- **Type safety exists**: Derived classes already have type-safe implementations (they call their mappers which return typed ViewModels)
- **No bugs found**: The lack of generics hasn't caused any runtime errors or confusion

**Trade-off Analysis:**
- ✅ **Benefit**: Stronger compile-time guarantees, better IntelliSense
- ❌ **Cost**: More complex base class signature, harder to understand for new developers
- ❌ **Cost**: Refactoring effort across all derived classes
- **Verdict**: Cost > Benefit for current codebase

**When to Address:**
- When we have 5+ panel types and type confusion becomes an actual problem
- During a broader TypeScript enhancement initiative
- When developers report confusion or bugs related to data typing

**Related Review Finding:**
TypeScript Pro Review - Medium Priority Issue #8

---

### IXmlFormatter Interface Extraction

**Status**: Will Not Implement
**Priority**: N/A
**Effort**: Low (1 hour)

**Why This Was Suggested:**
Clean Architecture Guardian suggested extracting an interface for `XmlFormatter` to follow the Dependency Inversion Principle more strictly:

```typescript
// Domain layer
export interface IXmlFormatter {
    format(xml: string): string;
}

// Infrastructure layer
export class XmlFormatter implements IXmlFormatter {
    format(xml: string): string { /* ... */ }
}
```

**Why This Is Unnecessary:**

1. **XmlFormatter is already in infrastructure layer** (not domain)
   - After code review fixes, moved from `src/shared/domain/services/` to `src/shared/infrastructure/formatters/`
   - Infrastructure can use concrete classes without interfaces

2. **No multiple implementations needed**
   - XML formatting has one correct approach
   - No business reason to swap formatters (not like switching databases or APIs)
   - YAGNI principle applies

3. **Already highly testable**
   - Pure function with no dependencies
   - Easy to mock if needed (just pass a mock object with `format()` method)
   - Current tests work perfectly without interface

4. **Adding interface would be cargo cult DIP**
   - DIP is for **protecting domain from infrastructure changes**
   - XmlFormatter is infrastructure, injected into other infrastructure
   - No domain layer in this dependency chain

**When Interface WOULD Be Needed:**
- If we needed JsonFormatter, YamlFormatter, and wanted polymorphism
- If domain layer depended on formatting (it doesn't)
- If we had multiple implementations with different trade-offs

**Verdict:** Interface would add ceremony without benefit. XmlFormatter is correctly placed in infrastructure and correctly injected as concrete class.

**Related Review Finding:**
Clean Architecture Guardian - Recommendation #4

---

### Branded Types for Environment IDs

**Status**: Will Not Implement
**Priority**: N/A
**Effort**: Medium (1-2 hours)

**Why This Was Suggested:**
TypeScript Pro suggested using branded types to prevent ID confusion:

```typescript
type EnvironmentId = string & { readonly __brand: 'EnvironmentId' };
type SolutionId = string & { readonly __brand: 'SolutionId' };
type ImportJobId = string & { readonly __brand: 'ImportJobId' };

function switchEnvironment(envId: EnvironmentId) { /* ... */ }

// Type error: can't pass SolutionId where EnvironmentId expected
switchEnvironment(solutionId); // ❌ Compile error
```

**Why This Is Overkill:**

1. **No actual bugs found**
   - Codebase has been in development for months
   - Zero incidents of passing wrong ID type
   - Clear naming prevents confusion (`environmentId`, `solutionId`, `importJobId`)

2. **Runtime cost with no runtime benefit**
   - Branded types require helper functions to create branded values
   - Adds boilerplate at every ID usage site
   - IDs come from external APIs (Dataverse) as plain strings
   - Would need to brand at every API boundary

3. **False sense of security**
   - Branded types are compile-time only (erased at runtime)
   - User could still send wrong GUID from API
   - Real safety comes from API validation, not type system

4. **Developer experience penalty**
   ```typescript
   // Without branded types (current)
   const envId = environment.id;
   await switchEnvironment(envId); // ✅ Works

   // With branded types
   const envId = createEnvironmentId(environment.id); // Extra ceremony
   await switchEnvironment(envId);
   ```

**When Branded Types WOULD Help:**
- Large codebase with 10+ ID types and frequent ID confusion bugs
- Financial/healthcare apps where passing wrong ID has severe consequences
- When you're already using branded types extensively (consistency)

**Codebase Size Matters:**
- Small codebase (< 50k LOC): Branded types = overkill
- Medium codebase (50-200k LOC): Evaluate based on actual bugs
- Large codebase (200k+ LOC): Consider for critical IDs

**Current codebase:** ~15k LOC → **Branded types are premature optimization**

**Verdict:** Clear naming conventions (`environmentId`, `solutionId`) provide 80% of the benefit with 0% of the cost. Not worth the overhead.

**Related Review Finding:**
TypeScript Pro Review - Low Priority Issue #14

---

### CSS Extraction from DataTablePanel

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (2-3 hours)

**Issue:**
DataTablePanel embeds 400+ lines of HTML/CSS/JavaScript in TypeScript string literals.

**Current State:**
```typescript
// DataTablePanel.ts:295-709
private getHtmlContent(): string {
    return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                /* 200+ lines of CSS */
            </style>
        </head>
        <body>
            <!-- 200+ lines of HTML -->
            <script>
                /* 100+ lines of JavaScript */
            </script>
        </body>
        </html>`;
}
```

**Problems:**
- No syntax highlighting for HTML/CSS/JS
- Hard to maintain mixed concerns (TypeScript + HTML + CSS + JS)
- No HTML/CSS validation during development
- Difficult to see diffs in code reviews

**What Extraction Would Look Like:**

### Option 1: Separate Template Files
```typescript
// DataTablePanel.ts
private getHtmlContent(): string {
    const templatePath = vscode.Uri.joinPath(
        this.extensionUri,
        'resources',
        'webview',
        'templates',
        'datatable.html'
    );

    const template = fs.readFileSync(templatePath.fsPath, 'utf-8');

    // Inject dynamic values
    return this.injectConfig(template);
}

// resources/webview/templates/datatable.html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="{{datatableCssUri}}">
    <link rel="stylesheet" href="{{customCss}}">
</head>
<!-- Full HTML with {{placeholder}} syntax -->
</html>
```

**Pros:**
- ✅ Proper syntax highlighting
- ✅ Better separation of concerns
- ✅ Easier to maintain HTML/CSS

**Cons:**
- ❌ Requires template engine or manual string replacement
- ❌ Another place to look when debugging
- ❌ More complex build/packaging

### Option 2: Template Literals with Tagged Templates
```typescript
// DataTablePanel.ts
import { html, css } from './templateHelpers';

private getHtmlContent(): string {
    return html`
        <!DOCTYPE html>
        <html>
        <head>
            ${css`
                .toolbar { /* ... */ }
            `}
        </head>
        </html>
    `;
}
```

**Pros:**
- ✅ Better syntax highlighting with lit-html VS Code extension
- ✅ Still in TypeScript (single file to debug)

**Cons:**
- ❌ Requires template helper library
- ❌ Still mixing concerns in one file

### Option 3: Build-Time Template Injection
```typescript
// Build script injects HTML at compile time
import htmlTemplate from './templates/datatable.html';

private getHtmlContent(): string {
    return htmlTemplate
        .replace('{{title}}', this.config.title)
        .replace('{{columns}}', JSON.stringify(this.config.columns));
}
```

**Pros:**
- ✅ Clean separation
- ✅ Syntax highlighting
- ✅ Type-safe at runtime

**Cons:**
- ❌ More complex webpack/build config
- ❌ Another build step to maintain

**Why Deferred:**
- **Standard VS Code pattern**: Embedding HTML in TypeScript is the recommended approach for webview panels
- **Not causing bugs**: Current approach works reliably
- **Other priorities**: Architecture improvements more valuable than HTML extraction
- **Minimal team**: Setup cost not justified for solo/small team

**When to Address:**
- When HTML grows beyond 1000 lines
- When we have 5+ different webview templates
- When frontend developer joins team (they'll want separate files)
- During major webview refactoring initiative

**Recommended Solution (if implemented):**
**Option 3 (Build-Time Injection)** - Best balance of separation and VS Code compatibility

**Related Review Finding:**
Code Quality Review - Moderate Issue #7

---

### Other deferred items will be added here as they arise

