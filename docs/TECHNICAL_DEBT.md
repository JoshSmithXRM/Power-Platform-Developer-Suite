# Technical Debt & Future Improvements

This document tracks known technical debt and future improvement opportunities that have been deferred for valid reasons.

**Goal**: Keep this document as small as possible. Items should only be listed here if they represent genuine architectural trade-offs or intentionally deferred work with clear reasoning.

---

## Summary

### Code Quality (1 issue)
1. **Cross-Feature DTO Coupling** - Persistence Inspector imports EnvironmentConnectionDto from environmentSetup feature. Infrastructure-to-infrastructure coupling is acceptable but could be improved with shared DTOs.

### Documentation (1 issue)
2. **CLEAN_ARCHITECTURE_GUIDE.md Length** - Documentation exceeds 1,708 lines (limit: 1,200). Wait until Data Panel Suite is complete before splitting into 3 separate guides.

### Architecture & Design (4 issues)
3. **DataTablePanel SRP Violation** - Base class handles 8+ responsibilities (environment, search, sort, error, loading, HTML, routing, cancellation). Template Method pattern eliminates 950 lines of duplication across 2 panels, acceptable trade-off.

4. **DataTablePanel Generic Types** - Panel could use `<TData>` generic for stronger type safety. Current `unknown[]` works fine with zero bugs found, complexity not justified.

5. **IXmlFormatter Interface** - Suggested interface extraction unnecessary. XmlFormatter is infrastructure using concrete class correctly, no polymorphism needed.

6. **getValue() Pattern Without Branded Types** - Value objects return primitives without compile-time type branding. Zero bugs found in 100+ callsites, 6-8 hour refactor not justified.

7. **CSS Extraction from HTML Templates** - 200+ lines of CSS embedded in TypeScript strings. Standard VS Code pattern, not causing bugs, defer until 5+ webview templates exist.

### Deferred Refactoring (3 issues)
8. **Business Logic in Command Handlers** - extension.ts commands contain orchestration that belongs in use cases. Use cases exist but need integration work, defer until command testing sprint.

9. **Unsafe Type Assertions in API Service** - DataverseApiService uses `as T` without runtime validation. Repositories validate at mapping layer, external API contracts stable, zero bugs found.

10. **Long Repository Methods** - Save methods exceed 70+ lines with persistence + credential concerns mixed. Defer until repository testing improvements or new implementations.

---

## Code Quality

### Cross-Feature DTO Coupling in Persistence Inspector

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (15-20 minutes)

**Issue:**
The Persistence Inspector infrastructure layer directly references `EnvironmentConnectionDto` from the `environmentSetup` feature to derive secret keys. This creates cross-feature coupling at the infrastructure level.

**Current State:**
```typescript
// VsCodeStorageReader.ts (line 4)
import { EnvironmentConnectionDto } from '../../../environmentSetup/infrastructure/dtos/EnvironmentConnectionDto';

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
1. Create shared DTOs in `src/shared/application/`
2. Move environment-related DTOs to shared location
3. Both features reference shared DTOs instead of cross-feature imports

---

## Documentation

### CLEAN_ARCHITECTURE_GUIDE.md Exceeds Length Limit

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (2-3 hours to split properly)

**Issue:**
`docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` is 1,708 lines, exceeding the DOCUMENTATION_STYLE_GUIDE.md hard limit of 1,200 lines.

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
// DataTablePanel.ts (365 lines)
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

---

### IXmlFormatter Interface Extraction

**Status**: Will Not Implement
**Priority**: N/A
**Effort**: Low (1 hour)

**Why This Was Suggested:**
Clean Architecture Guardian suggested extracting an interface for `XmlFormatter` to follow the Dependency Inversion Principle more strictly.

**Why This Is Unnecessary:**

1. **XmlFormatter is already in infrastructure layer** (not domain)
   - Located at `src/shared/infrastructure/formatters/XmlFormatter.ts`
   - Infrastructure can use concrete classes without interfaces

2. **No multiple implementations needed**
   - XML formatting has one correct approach
   - No business reason to swap formatters (not like switching databases or APIs)
   - YAGNI principle applies

3. **Already highly testable**
   - Pure function with no dependencies
   - Easy to mock if needed
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

---

### getValue() Pattern in Value Objects

**Status**: Accepted Technical Debt
**Priority**: N/A
**Effort**: High (6-8 hours for 100+ callsites)

**Summary:**
All value objects in the domain layer use a `getValue()` method that returns primitive types (string, number) without branded type safety. This creates a theoretical risk of accidentally mixing incompatible value objects at compile time.

**Decision: Accept this pattern as-is.** The pragmatic benefits outweigh the theoretical type safety improvement.

**Current Pattern:**

Value objects wrap primitives with validation and expose them via `getValue()`:

```typescript
// src/features/environmentSetup/domain/valueObjects/EnvironmentId.ts
export class EnvironmentId {
    private readonly value: string;

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment ID cannot be empty');
        }
        this.value = value;
    }

    public getValue(): string {
        return this.value;
    }
}
```

**Scope:**
- **20 files** use the getValue() pattern across multiple value objects
- **100+ callsites** across application and infrastructure layers
- Examples: `EnvironmentId`, `DataverseUrl`, `ClientId`, `TenantId`, `EnvironmentName`, `StorageKey`

**The Type Safety Issue:**

TypeScript cannot distinguish between different value object types after `getValue()`:

```typescript
const envId = new EnvironmentId('env-123');
const clientId = new ClientId('client-456');

// Both return `string` - TypeScript allows this mistake:
const mixedUp: string = envId.getValue();
repository.saveClient(mixedUp);  // Runtime bug! Wrong ID type
```

**Alternative: Branded Types**

```typescript
// Branded type pattern
type Brand<K, T> = K & { __brand: T };

export class EnvironmentId {
    private readonly value: Brand<string, 'EnvironmentId'>;

    public getValue(): Brand<string, 'EnvironmentId'> {
        return this.value;
    }
}

// Now TypeScript prevents mixing:
saveEnvironment(envId.getValue());     // ✅ OK
saveEnvironment(clientId.getValue());  // ❌ Compile error!
```

**Why Not Implement:**

**Effort vs. Benefit Analysis:**

| Factor | Assessment |
|--------|------------|
| **Refactoring Scope** | 100+ callsites across 20+ files (6-8 hours) |
| **Breaking Changes** | All persistence layers, mappers, API services |
| **Runtime Safety** | No change (same validation, same runtime behavior) |
| **Compile Safety** | Marginal improvement (catches theoretical bugs only) |
| **Real Bugs Found** | Zero instances in codebase review |
| **Code Complexity** | Increases (branded types, type assertions at boundaries) |
| **Developer Experience** | Degrades (more boilerplate, harder onboarding) |

**Verdict:** 6-8 hours of work for zero observed bugs = not worth it.

**Why This Pattern is Safe:**

1. **Domain Validation Still Works**
   - Value objects validate on construction
   - Real-world bugs (empty strings, malformed URLs, invalid UUIDs) are all caught by domain validation, not by branded types

2. **Type Mixing is Rare**
   - `EnvironmentId` → only used with `IEnvironmentRepository`
   - `ClientId` → only used with `MsalAuthenticationService`
   - `DataverseUrl` → only used for API base URLs
   - The **semantic context prevents mistakes** more than type brands would

3. **Clean Architecture Protects Boundaries**
   - Infrastructure APIs require primitives
   - Value objects **must** unwrap to primitives at the boundary
   - Branded types just add ceremony without runtime benefit

**Accepted Trade-offs:**

| Aspect | Current Pattern | Branded Types |
|--------|----------------|---------------|
| **Type Safety** | Runtime (DomainError) | Runtime + Compile |
| **Bugs Prevented** | Invalid values | Invalid values + type mixing |
| **Developer Velocity** | Fast (simple pattern) | Slower (type wrangling) |
| **Refactoring Cost** | Low | High (100+ callsites) |
| **Bugs Found in Review** | 0 | 0 (theoretical only) |

**Decision: Current pattern wins on pragmatism.**

**When to Revisit:**

Consider branded types only if:
1. **Multiple bugs** are found due to ID mixing (none found in review)
2. **Major refactoring** is already planned (e.g., migrating persistence layer)
3. **New domain model** is being built from scratch (low refactoring cost)

Otherwise, **keep the current pattern indefinitely**.

---

### CSS Extraction from DataTablePanel

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (2-3 hours)

**Issue:**
DataTablePanel embeds HTML/CSS/JavaScript in TypeScript string literals (extracted to separate view file at `src/shared/infrastructure/ui/views/dataTable.ts`).

**Current State:**
```typescript
// src/shared/infrastructure/ui/views/dataTable.ts
export function renderDataTableHtml(...): string {
    return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                /* 200+ lines of CSS */
            </style>
        </head>
        <body>
            <!-- HTML -->
            <script>
                /* JavaScript */
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
Build-time template injection with webpack raw-loader

---


## Business Logic in Command Handlers

**Status**: Deferred
**Priority**: Medium
**Effort**: Medium (4-6 hours)

**Issue:** `extension.ts` command handlers contain orchestration logic that belongs in use cases.

**Examples:**
- `testEnvironmentConnectionCommand` (lines 183-236): Loads credentials, handles auth methods
- `openMakerCommand` (lines 264-292): Builds URLs based on environment presence
- `createGetEnvironments`/`createGetEnvironmentById` (lines 38-70): Mapping logic in composition root

**Why Deferred:**
- Use cases already exist and contain the logic (`TestConnectionUseCase`, etc.)
- Refactoring requires careful integration to avoid breaking existing functionality
- Lower priority than architectural violations (which are now fixed via ESLint)

**When to Address:**
- When adding tests for command handlers
- When refactoring `extension.ts` for length issues
- During next sprint focused on command layer cleanup

**Fix Strategy:**
1. Refactor `testEnvironmentConnectionCommand` to call `TestConnectionUseCase.execute()` directly
2. Create `GetMakerUrlUseCase` for URL building logic
3. Create `GetEnvironmentListUseCase` that returns ViewModels (not mapping in composition root)

---

### Unsafe Type Assertions in DataverseApiService

**Status**: Acknowledged - Acceptable Risk
**Priority**: Low
**Effort**: High (8-12 hours to implement full validation)

**Issue:** `DataverseApiService.request<T>()` returns `data as T` without runtime shape validation.

**Current Mitigation:**
- Basic validation: ensures response is non-null object
- Repositories use mappers that validate individual fields
- TypeScript provides compile-time safety for known APIs

**Why Not Fixed:**
- Adding Zod/AJV schema validation for every API response is substantial work
- Current approach hasn't caused bugs in practice
- External API contracts (Dataverse) are stable
- Repositories already validate data when mapping to domain entities

**When to Revisit:**
- If API contract violations cause runtime errors
- When adding integration tests that mock API responses
- If Microsoft changes Dataverse API contracts unexpectedly

**Recommended Solution (if implemented):**
```typescript
// Optional type guard parameter
async get<T>(
  environmentId: string,
  endpoint: string,
  typeGuard?: (data: unknown) => data is T,
  cancellationToken?: ICancellationToken
): Promise<T> {
  const data = await this.request(...);

  if (typeGuard && !typeGuard(data)) {
    throw new Error('API response validation failed');
  }

  return data as T;
}
```

---

### Long Repository Methods

**Status**: Deferred
**Priority**: Low
**Effort**: Medium (3-4 hours)

**Issue:** Repository save methods exceed 70+ lines with mixed concerns.

**Examples:**
- `EnvironmentRepository.save()` - Handles persistence + credential management
- `DataverseApiImportJobRepository` - Duplicate mapping logic

**When to Address:**
- When adding new repository implementations
- During repository testing improvements

---
