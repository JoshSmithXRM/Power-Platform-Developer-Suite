# Technical Debt & Future Improvements

This document tracks known technical debt and future improvement opportunities that have been deferred for valid reasons.

**Goal**: Keep this document as small as possible. Items should only be listed here if they represent genuine architectural trade-offs or intentionally deferred work with clear reasoning.

---

## Summary

### Code Quality (1 issue)
1. **Cross-Feature DTO Coupling** - Persistence Inspector imports EnvironmentConnectionDto from environmentSetup feature. Infrastructure-to-infrastructure coupling is acceptable but could be improved with shared DTOs.

### Documentation (1 issue)
2. **CLEAN_ARCHITECTURE_GUIDE.md Length** - Documentation exceeds 1,708 lines (limit: 1,200). Wait until Data Panel Suite is complete before splitting into 3 separate guides.

### Architecture & Design (2 issues)
3. **IXmlFormatter Interface** - Suggested interface extraction unnecessary. XmlFormatter is infrastructure using concrete class correctly, no polymorphism needed.

4. **getValue() Pattern Without Branded Types** - Value objects return primitives without compile-time type branding. Zero bugs found in 100+ callsites, 6-8 hour refactor not justified.

### Deferred Refactoring (2 issues)
5. **Business Logic in Command Handlers** - extension.ts commands contain orchestration that belongs in use cases. Use cases exist but need integration work, defer until command testing sprint.

6. **Unsafe Type Assertions in API Service** - DataverseApiService uses `as T` without runtime validation. Repositories validate at mapping layer, external API contracts stable, zero bugs found.

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
`docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` is 1,403 lines, exceeding the DOCUMENTATION_STYLE_GUIDE.md hard limit of 1,200 lines.

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

### DateTimeFilter Mixed Concerns in Value Object

**Status**: Documented
**Priority**: Medium
**Effort**: Medium (2-3 hours)

**Issue:** DateTimeFilter value object mixes domain, presentation, and infrastructure concerns

**Location:**
- `src/shared/domain/valueObjects/DateTimeFilter.ts`
- `src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts`
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`

**Impact:**
- **Maintenance cost:** Format conversion logic scattered across domain value object
- **Bug risk:** Low - conversion logic is well-tested, but violates separation of concerns
- **Size:** ~100 lines across value object and usages

**Why It Exists:**
Initial DDD value object pattern with self-contained conversions (static factories + conversion methods). ESLint flagged violations because `toLocalDateTime`, `toODataFormat` belong in presentation/infrastructure, not domain.

**Proposed Solution:**
Extract format conversion to helper functions in appropriate layers:

```typescript
// Domain: Pure value object
class DateTimeFilter {
    static fromUtcIso(utcIso: string): DateTimeFilter
    getUtcIso(): string
    isBefore(other: DateTimeFilter): boolean
}

// Application layer: Conversion helpers
export function localDateTimeToUtc(local: string): string { }

// Infrastructure layer: OData helpers
export function formatDateForOData(utc: string): string { }
```

**When to Address:**
- Next refactoring cycle when touching this code
- When establishing consistent pattern for other value objects (DataverseUrl has same issue)

**Decision:** Defer because:
- Current implementation works correctly and is well-tested
- Service pattern would introduce unnecessary complexity
- Helper function extraction is simple refactor when needed

**Mitigations:**
- ESLint configured to allow factory methods
- Comprehensive test coverage prevents regression

---

## Deferred Refactoring

### Large Panel Files (600-800 lines)

**Status**: Accepted - Coordinator Pattern
**Priority**: Low
**Effort**: N/A (no action needed)

**Issue:** Four panel files exceed 600 lines, with the largest at 797 lines.

**Affected Files:**
- `src/features/metadataBrowser/presentation/panels/MetadataBrowserPanel.ts` - **797 lines**
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts` - **738 lines**
- `src/features/environmentSetup/presentation/panels/EnvironmentSetupPanelComposed.ts` - **615 lines**
- `src/features/connectionReferences/presentation/panels/ConnectionReferencesPanelComposed.ts` - **550 lines**

**Why This Is Acceptable:**

These panels follow the **Coordinator Pattern** with proper separation of concerns:

1. **MetadataBrowserPanel (797 lines)**
   - Coordinates 7 behaviors for complex metadata navigation
   - Manages dual-pane tree + detail view with search
   - Delegates to specialized behaviors (TreeBehavior, SearchBehavior, DetailPanelBehavior, etc.)
   - Panel itself is thin coordinator - behaviors contain actual logic

2. **PluginTraceViewerPanelComposed (738 lines)**
   - Coordinates 5 behaviors + 3 sections for trace management
   - Manages filter panel, trace table, detail view, timeline view
   - Each section/behavior is separately testable
   - Complex UI justified by feature richness

3. **EnvironmentSetupPanelComposed (615 lines)**
   - Multi-instance panel (not singleton) for concurrent environment editing
   - Manages form state, validation, connection testing, discovery
   - Delegates to 8 use cases for business logic
   - Form complexity requires coordination code

4. **ConnectionReferencesPanelComposed (550 lines)**
   - Coordinates export, filtering, solution selection
   - Manages relationship graph between flows and connections
   - Delegates to specialized mappers and services

**Coordinator Pattern Verification:**
- ✅ Each panel delegates to behaviors/sections
- ✅ Business logic in use cases, not panels
- ✅ Panels contain mostly: message routing, UI coordination, state synchronization
- ✅ Each behavior/section is separately testable
- ✅ No God Object anti-pattern (panels coordinate, don't implement)

**When to Refactor:**
- If panel exceeds 1,000 lines (extract more behaviors)
- If panel contains business logic (move to use cases/domain services)
- If panel responsibilities grow beyond coordination (extract new behaviors)

**Verdict:** Current sizes are justified by UI complexity and coordinator responsibilities. Splitting further would create artificial boundaries without improving maintainability.

---

### Business Logic in Command Handlers

**Status**: Ready to Address
**Priority**: Medium
**Effort**: Medium (4-6 hours)

**Issue:** `extension.ts` command handlers contain orchestration logic that belongs in use cases.

**Examples:**
- `testEnvironmentConnectionCommand` (lines 184-239): Loads credentials, handles auth methods
- `openMakerCommand` (lines 227-264): Builds URLs based on environment presence
- Command handlers mix UI concerns (prompts, progress) with business logic

**Current Violation:**
Commands orchestrate domain logic instead of delegating to use cases. Use cases exist but are not integrated.

**Decision:** Refactor to thin adapter pattern (approved by clean-architecture-guardian)

**Fix Strategy:**
1. Create `ICommandHandler` interface for command layer
2. Create `ICredentialPrompter` to extract credential input logic
3. Refactor commands to handle UI concerns only (progress, prompts, error messages)
4. Delegate business logic to use cases (`TestConnectionUseCase`, etc.)
5. Move auth method determination and token logic to domain services

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
