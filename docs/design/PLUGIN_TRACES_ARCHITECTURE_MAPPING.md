# Plugin Trace Viewer - Clean Architecture Mapping

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION                            │
│  ├── panels/PluginTraceViewerPanel.ts                       │
│  ├── presentation/views/PluginTraceDetailView.ts (HTML)     │
│  └── presentation/viewmodels/PluginTraceViewModel.ts        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION                             │
│  ├── usecases/pluginTrace/GetPluginTracesUseCase.ts        │
│  ├── usecases/pluginTrace/GetTraceLevelUseCase.ts          │
│  ├── usecases/pluginTrace/SetTraceLevelUseCase.ts          │
│  ├── usecases/pluginTrace/DeleteTracesUseCase.ts           │
│  └── usecases/pluginTrace/ExportTracesUseCase.ts           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        DOMAIN                                │
│  ├── entities/PluginTrace.ts (Rich model with behavior)     │
│  ├── valueobjects/TraceLevel.ts                             │
│  ├── valueobjects/TraceStatus.ts                            │
│  ├── valueobjects/ExecutionMode.ts                          │
│  ├── valueobjects/Duration.ts                               │
│  ├── valueobjects/CorrelationId.ts                          │
│  ├── services/PluginTraceFilterService.ts                   │
│  └── repositories/IPluginTraceRepository.ts (interface)     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                            │
│  ├── repositories/DataversePluginTraceRepository.ts         │
│  ├── mappers/PluginTraceMapper.ts (API → Domain)            │
│  └── api/DataverseApiClient.ts                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer Breakdown

### 1. DOMAIN LAYER (Zero Dependencies)

#### Entities

**PluginTrace** (Rich Domain Model)
- Location: `src/domain/entities/PluginTrace.ts`
- Responsibility: Core business logic for plugin traces
- Properties: All trace data + computed properties
- Methods (Behavior):
  - `hasException(): boolean` - Determines if trace has errors
  - `isSuccessful(): boolean` - Opposite of hasException
  - `getStatus(): TraceStatus` - Returns Success or Exception status
  - `getDurationFormatted(): string` - Formats duration for display
  - `getPerformanceSummary(): string` - Combines execution + constructor duration
  - `isRelatedTo(other: PluginTrace): boolean` - Checks correlation ID match
  - `isNested(): boolean` - Checks if depth > 1
  - `isSynchronous(): boolean` - Checks if mode === Synchronous
  - `isAsynchronous(): boolean` - Checks if mode === Asynchronous
  - `static create(params): PluginTrace` - Factory method for creation

**Why Rich Model?**
- Business rules belong in domain, not use cases
- Entities know how to validate and compute their own state
- Prevents anemic domain models
- Enables reusability across use cases

Example:
```typescript
export class PluginTrace {
  private constructor(
    public readonly id: string,
    public readonly createdOn: Date,
    public readonly pluginName: string,
    public readonly duration: Duration,
    public readonly mode: ExecutionMode,
    public readonly exceptionDetails: string | null,
    public readonly correlationId: CorrelationId | null,
    // ... other properties
  ) {}

  hasException(): boolean {
    return this.exceptionDetails !== null && this.exceptionDetails.trim().length > 0;
  }

  getStatus(): TraceStatus {
    return this.hasException() ? TraceStatus.Exception : TraceStatus.Success;
  }

  isRelatedTo(other: PluginTrace): boolean {
    return this.correlationId !== null &&
           this.correlationId.equals(other.correlationId);
  }

  // Factory method (domain logic)
  static create(params: PluginTraceParams): PluginTrace {
    // Validation logic here
    return new PluginTrace(...);
  }
}
```

---

#### Value Objects

**TraceLevel** (Enum Value Object)
- Location: `src/domain/valueobjects/TraceLevel.ts`
- Values: Off (0), Exception (1), All (2)
- Methods:
  - `getDisplayName(): string`
  - `static fromNumber(value: number): TraceLevel`
  - `equals(other: TraceLevel): boolean`

**TraceStatus** (Enum Value Object)
- Location: `src/domain/valueobjects/TraceStatus.ts`
- Values: Success, Exception
- Methods:
  - `getDisplayName(): string`
  - `getBadgeClass(): string` - Returns CSS class for badge

**ExecutionMode** (Enum Value Object)
- Location: `src/domain/valueobjects/ExecutionMode.ts`
- Values: Synchronous (0), Asynchronous (1)
- Methods:
  - `getDisplayName(): string`
  - `static fromNumber(value: number): ExecutionMode`

**Duration** (Value Object)
- Location: `src/domain/valueobjects/Duration.ts`
- Properties: `milliseconds: number`
- Methods:
  - `format(): string` - Returns "125ms", "3.2s", or "2m 15s"
  - `isSlowerThan(other: Duration): boolean`
  - `add(other: Duration): Duration`

**CorrelationId** (Value Object)
- Location: `src/domain/valueobjects/CorrelationId.ts`
- Properties: `value: string`
- Methods:
  - `equals(other: CorrelationId | null): boolean`
  - `toString(): string`

**Why Value Objects?**
- Encapsulate formatting/display logic
- Type safety (can't pass wrong number to TraceLevel)
- Business rules in one place
- Immutable and safe to share

---

#### Domain Services

**PluginTraceFilterService** (Domain Service)
- Location: `src/domain/services/PluginTraceFilterService.ts`
- Responsibility: Complex filtering logic (business rule)
- Methods:
  - `buildODataFilter(conditions: FilterCondition[]): string` - Constructs OData filter string with AND/OR logic
  - `applyClientSideFilter(traces: PluginTrace[], searchTerm: string): PluginTrace[]` - Client-side filtering

**Why Domain Service?**
- Filtering is business logic (which fields can be filtered, how operators work)
- Not owned by a single entity
- Needs to operate on multiple traces
- Stateless operation

---

#### Repository Interfaces

**IPluginTraceRepository** (Interface)
- Location: `src/domain/repositories/IPluginTraceRepository.ts`
- Dependency Rule: Domain defines the contract, infrastructure implements it
- Methods:
  ```typescript
  export interface IPluginTraceRepository {
    getTraces(environmentId: string, filter: TraceFilter): Promise<PluginTrace[]>;
    getTraceById(environmentId: string, traceId: string): Promise<PluginTrace | null>;
    deleteTrace(environmentId: string, traceId: string): Promise<void>;
    deleteTraces(environmentId: string, traceIds: string[]): Promise<number>;
    deleteAllTraces(environmentId: string): Promise<number>;
    deleteOldTraces(environmentId: string, olderThanDays: number): Promise<number>;
    getTraceLevel(environmentId: string): Promise<TraceLevel>;
    setTraceLevel(environmentId: string, level: TraceLevel): Promise<void>;
  }
  ```

**IPluginTraceExporter** (Interface)
- Location: `src/domain/repositories/IPluginTraceExporter.ts`
- Methods:
  ```typescript
  export interface IPluginTraceExporter {
    exportToCsv(traces: PluginTrace[]): string;
    exportToJson(traces: PluginTrace[]): string;
    saveToFile(content: string, suggestedFilename: string): Promise<string>;
  }
  ```

**Why Interfaces in Domain?**
- Dependency Inversion Principle
- Domain doesn't depend on infrastructure
- Easy to test (mock implementations)
- Infrastructure implements these contracts

---

### 2. APPLICATION LAYER (Use Cases)

Use cases **orchestrate** domain entities and repositories. They contain **no business logic**, only coordination.

#### GetPluginTracesUseCase
- Location: `src/application/usecases/pluginTrace/GetPluginTracesUseCase.ts`
- Responsibility: Coordinate retrieving traces with filters
- Dependencies: `IPluginTraceRepository`
- Flow:
  1. Validate inputs (environment ID exists)
  2. Call repository with filter
  3. Return domain entities (no transformation)

```typescript
export class GetPluginTracesUseCase {
  constructor(
    private readonly repository: IPluginTraceRepository,
    private readonly logger: ILogger
  ) {}

  async execute(params: {
    environmentId: string;
    filter?: TraceFilter;
  }): Promise<PluginTrace[]> {
    this.logger.info('Getting plugin traces', { environmentId: params.environmentId });

    // Orchestration only - no business logic
    const traces = await this.repository.getTraces(
      params.environmentId,
      params.filter ?? TraceFilter.default()
    );

    this.logger.info('Retrieved plugin traces', { count: traces.length });
    return traces;
  }
}
```

---

#### GetTraceLevelUseCase
- Location: `src/application/usecases/pluginTrace/GetTraceLevelUseCase.ts`
- Responsibility: Get current organization trace level
- Dependencies: `IPluginTraceRepository`, `ILogger`
- Flow:
  1. Validate environment ID
  2. Call repository
  3. Return TraceLevel value object

---

#### SetTraceLevelUseCase
- Location: `src/application/usecases/pluginTrace/SetTraceLevelUseCase.ts`
- Responsibility: Set organization trace level
- Dependencies: `IPluginTraceRepository`, `ILogger`
- Flow:
  1. Validate inputs
  2. Call repository to update
  3. Log success
  4. Return void

**Business Rule Check:** Should we warn about performance impact?
- **NO!** That's presentation layer concern (user interaction)
- Use case just sets the value
- Panel decides whether to warn user

---

#### DeleteTracesUseCase
- Location: `src/application/usecases/pluginTrace/DeleteTracesUseCase.ts`
- Responsibility: Delete traces (single, multiple, all, old)
- Dependencies: `IPluginTraceRepository`, `ILogger`
- Methods:
  - `deleteSingle(environmentId: string, traceId: string): Promise<void>`
  - `deleteMultiple(environmentId: string, traceIds: string[]): Promise<number>`
  - `deleteAll(environmentId: string): Promise<number>`
  - `deleteOldTraces(environmentId: string, olderThanDays: number): Promise<number>`

Flow (deleteAll example):
1. Log operation start
2. Call repository.deleteAllTraces()
3. Log deleted count
4. Return count

**Confirmation?** No - that's presentation concern (user interaction)

---

#### ExportTracesUseCase
- Location: `src/application/usecases/pluginTrace/ExportTracesUseCase.ts`
- Responsibility: Export traces to file
- Dependencies: `IPluginTraceExporter`, `ILogger`
- Methods:
  - `exportToCsv(traces: PluginTrace[], filename: string): Promise<string>`
  - `exportToJson(traces: PluginTrace[], filename: string): Promise<string>`

Flow:
1. Validate traces not empty
2. Call exporter to convert to format
3. Call exporter to save to file
4. Return saved file path

---

### 3. INFRASTRUCTURE LAYER

#### Repositories (Implementation)

**DataversePluginTraceRepository**
- Location: `src/infrastructure/repositories/DataversePluginTraceRepository.ts`
- Implements: `IPluginTraceRepository`
- Responsibility: Communicate with Dataverse API
- Dependencies: `IAuthenticationService`, `ILogger`, `PluginTraceMapper`

Methods:
- `getTraces()` - Builds OData query, calls API, maps to domain entities
- `deleteTraces()` - Uses OData $batch API for bulk deletes
- `getTraceLevel()` - Queries organization settings
- `setTraceLevel()` - PATCH organization settings

**Key Points:**
- All API logic here (no API calls in domain or application)
- Maps API responses to domain entities via mapper
- Handles API errors and retries
- Injects ILogger (not global Logger)

---

#### Mappers

**PluginTraceMapper**
- Location: `src/infrastructure/mappers/PluginTraceMapper.ts`
- Responsibility: Convert between Dataverse API format and domain entities
- Methods:
  - `toDomain(apiResponse: DataversePluginTraceLogResponse): PluginTrace` - API → Domain
  - `fromDomain(trace: PluginTrace): DataversePluginTraceLogRequest` - Domain → API (if needed for updates)

Example:
```typescript
export class PluginTraceMapper {
  static toDomain(api: DataversePluginTraceLogResponse): PluginTrace {
    return PluginTrace.create({
      id: api.plugintracelogid,
      createdOn: new Date(api.createdon),
      pluginName: api.typename ?? '',
      entityName: api.primaryentity ?? '',
      messageName: api.messagename ?? '',
      mode: ExecutionMode.fromNumber(api.mode ?? 0),
      duration: new Duration(api.performanceexecutionduration ?? 0),
      exceptionDetails: api.exceptiondetails || null,
      correlationId: api.correlationid ? new CorrelationId(api.correlationid) : null,
      // ... map all fields
    });
  }
}
```

**Why Mapper?**
- Keeps domain clean (no API types in domain)
- Single place for conversion logic
- Easy to test
- API changes don't affect domain

---

#### Exporters

**FileSystemPluginTraceExporter**
- Location: `src/infrastructure/exporters/FileSystemPluginTraceExporter.ts`
- Implements: `IPluginTraceExporter`
- Responsibility: Export traces to files
- Dependencies: VS Code APIs (fs, showSaveDialog)

Methods:
- `exportToCsv()` - Converts traces to CSV string
- `exportToJson()` - Converts traces to JSON string
- `saveToFile()` - Shows save dialog, writes file

---

### 4. PRESENTATION LAYER

#### Panel

**PluginTraceViewerPanel**
- Location: `src/panels/PluginTraceViewerPanel.ts`
- Extends: `BasePanel`
- Responsibility: Coordinate UI, handle user interactions, orchestrate use cases
- Dependencies: Use cases (injected), Components (composition)

**IMPORTANT:** No business logic in panel!
- ✅ Handle user clicks
- ✅ Call use cases
- ✅ Transform domain entities to ViewModels
- ✅ Update UI components
- ❌ Filtering logic
- ❌ Duration formatting
- ❌ Status determination
- ❌ Validation rules

Methods:
- `initialize()` - Setup components, load initial data
- `handleRefresh()` - Calls GetPluginTracesUseCase
- `handleSetTraceLevel()` - Warns user (UI concern), calls SetTraceLevelUseCase
- `handleDeleteAll()` - Shows confirmation (UI concern), calls DeleteTracesUseCase
- `handleExport()` - Shows save dialog (UI concern), calls ExportTracesUseCase
- `handleTraceSelected()` - Maps to ViewModel, updates detail panel

---

#### ViewModels

**PluginTraceViewModel**
- Location: `src/presentation/viewmodels/PluginTraceViewModel.ts`
- Responsibility: Data Transfer Object for presentation
- Source: Mapped from PluginTrace domain entity

```typescript
export interface PluginTraceViewModel {
  id: string;
  status: string; // "Success" | "Exception"
  statusBadgeHtml: string; // HTML for badge
  createdon: string; // Formatted date
  duration: string; // Formatted duration
  operationType: string; // "Plugin" | "Workflow"
  pluginName: string;
  entityName: string;
  messageName: string;
  mode: string; // "Sync" | "Async"
  depth: number;
  hasException: boolean;
  // ... all properties needed for display
}
```

**PluginTraceViewModelMapper**
- Location: `src/presentation/viewmodels/PluginTraceViewModelMapper.ts`
- Methods:
  - `toViewModel(trace: PluginTrace): PluginTraceViewModel`
  - `toTableRowViewModel(trace: PluginTrace): PluginTraceTableRowViewModel`
  - `toDetailViewModel(trace: PluginTrace): PluginTraceDetailViewModel`

Example:
```typescript
export class PluginTraceViewModelMapper {
  static toTableRowViewModel(trace: PluginTrace): PluginTraceTableRowViewModel {
    return {
      id: trace.id,
      status: trace.getStatus().getDisplayName(),
      statusBadgeHtml: this.createStatusBadgeHtml(trace.getStatus()),
      createdon: this.formatDate(trace.createdOn),
      duration: trace.duration.format(),
      operationType: this.getOperationTypeLabel(trace.operationType),
      pluginName: trace.pluginName,
      mode: trace.mode.getDisplayName(),
      // ... all fields
    };
  }

  private static createStatusBadgeHtml(status: TraceStatus): string {
    const cssClass = status.getBadgeClass();
    const label = status.getDisplayName();
    return `<span class="status-badge ${cssClass}">
              <span class="status-badge-indicator"></span>
              <span class="status-badge-label">${label}</span>
            </span>`;
  }
}
```

**Why ViewModels?**
- Presentation needs different shape than domain (HTML, formatted strings)
- Domain entities shouldn't know about HTML/CSS
- Clean separation of concerns
- Easy to test presentation logic

---

#### Views (HTML Templates)

**PluginTraceDetailView**
- Location: `src/presentation/views/PluginTraceDetailView.ts`
- Responsibility: Generate HTML for detail panel tabs
- Methods:
  - `renderConfigurationTab(trace: PluginTraceDetailViewModel): string`
  - `renderExecutionTab(trace: PluginTraceDetailViewModel): string`
  - `renderRelatedTab(related: PluginTraceViewModel[]): string`

**Why separate view files?**
- CLAUDE.md Rule #10: "HTML in separate view files"
- Keeps panel TypeScript files clean
- Easier to maintain HTML
- Better IDE support for HTML

Example:
```typescript
export class PluginTraceDetailView {
  static renderConfigurationTab(trace: PluginTraceDetailViewModel): string {
    return `
      <div class="detail-section">
        <div class="detail-section-title">General</div>
        <div class="detail-grid">
          <div class="detail-label">Type Name</div>
          <div class="detail-value">${trace.pluginName}</div>
          <!-- ... -->
        </div>
      </div>
    `;
  }
}
```

---

## Dependency Flow

```
Panel (Presentation)
  │
  ├─→ Use Cases (Application)
  │     │
  │     └─→ Domain Entities + Repository Interface (Domain)
  │           │
  │           └─→ Repository Implementation (Infrastructure)
  │
  └─→ ViewModels (Presentation)
        │
        └─→ Domain Entities (Domain)
```

**Key Rules:**
1. Domain has ZERO dependencies (pure business logic)
2. Application depends on Domain only
3. Infrastructure implements Domain interfaces
4. Presentation depends on Application + Domain (for ViewModels)
5. All dependencies point INWARD toward Domain

---

## Shared/Reusable Components

### JSON Viewer Component

**Requirements:**
- Must work in Plugin Trace Viewer (Raw Data tab)
- Must work in Solution Explorer (future)
- Must work in any panel needing JSON display
- ZERO panel-specific dependencies

**Design:**
- Component: `JsonViewerComponent` (existing, enhance if needed)
- Location: `src/components/viewers/JsonViewer/`
- Interface: Clean, simple
  ```typescript
  interface JsonViewerConfig {
    id: string;
    data: any;
    collapsible?: boolean;
    showCopy?: boolean;
    maxHeight?: string | 'none';
  }
  ```
- Usage:
  ```typescript
  const jsonViewer = new JsonViewerComponent({
    id: 'myJsonViewer',
    data: myObject,
    collapsible: true,
    showCopy: false
  });

  panel.appendChild(jsonViewer.generateHTML());
  jsonViewer.setData(newObject); // Update data
  ```

**Key Points:**
- Component doesn't know about PluginTrace, Solution, or any domain entity
- Accepts generic `any` type for data
- Renders any JSON-serializable object
- Styling uses CSS variables (theme-aware)

---

## Testing Strategy

### Domain Layer (Pure Unit Tests)
- Test PluginTrace entity methods (hasException, isRelatedTo, etc.)
- Test Value Objects (Duration.format(), TraceLevel.fromNumber(), etc.)
- Test Domain Services (PluginTraceFilterService.buildODataFilter())
- No mocks needed (pure functions)

### Application Layer (Use Case Tests)
- Test use case orchestration
- Mock repository interfaces
- Verify correct repository methods called
- Verify logging

### Infrastructure Layer (Integration Tests)
- Test repository against real/mock Dataverse API
- Test mapper conversions
- Test error handling

### Presentation Layer (Component Tests)
- Test ViewModel mapping
- Test panel event handlers
- Test view HTML generation
- Mock use cases

---

## File Structure

```
src/
├── domain/
│   ├── entities/
│   │   └── PluginTrace.ts
│   ├── valueobjects/
│   │   ├── TraceLevel.ts
│   │   ├── TraceStatus.ts
│   │   ├── ExecutionMode.ts
│   │   ├── Duration.ts
│   │   └── CorrelationId.ts
│   ├── services/
│   │   └── PluginTraceFilterService.ts
│   └── repositories/
│       ├── IPluginTraceRepository.ts
│       └── IPluginTraceExporter.ts
│
├── application/
│   └── usecases/
│       └── pluginTrace/
│           ├── GetPluginTracesUseCase.ts
│           ├── GetTraceLevelUseCase.ts
│           ├── SetTraceLevelUseCase.ts
│           ├── DeleteTracesUseCase.ts
│           └── ExportTracesUseCase.ts
│
├── infrastructure/
│   ├── repositories/
│   │   └── DataversePluginTraceRepository.ts
│   ├── mappers/
│   │   └── PluginTraceMapper.ts
│   └── exporters/
│       └── FileSystemPluginTraceExporter.ts
│
├── presentation/
│   ├── viewmodels/
│   │   ├── PluginTraceViewModel.ts
│   │   └── PluginTraceViewModelMapper.ts
│   └── views/
│       └── PluginTraceDetailView.ts
│
└── panels/
    └── PluginTraceViewerPanel.ts
```

---

## Migration Strategy (From Old Code)

1. **Create Domain Layer First**
   - Extract PluginTrace entity from old interface
   - Add rich methods (hasException, getStatus, etc.)
   - Create Value Objects
   - Define repository interfaces

2. **Create Application Layer**
   - Convert service methods to use cases
   - One use case per operation
   - Inject repository interfaces

3. **Create Infrastructure Layer**
   - Move API calls to repository implementation
   - Create mapper to convert API → Domain
   - Implement exporter

4. **Update Presentation Layer**
   - Keep existing panel structure (extends BasePanel)
   - Add ViewModel mapping
   - Extract HTML to view files
   - Inject use cases (not services)

5. **Update Components**
   - Ensure JsonViewerComponent is generic
   - Remove any panel-specific code
   - Test reusability

---

## Key Architectural Decisions

### Why Rich Domain Models?
- **CLAUDE.md Rule #6:** "Rich domain models - Entities with behavior, not just data"
- Business logic belongs in domain, not scattered across use cases
- Easier to test business rules
- Prevents duplication

### Why Value Objects?
- Type safety (can't pass wrong primitive)
- Encapsulate formatting logic
- Immutable and safe
- Express domain concepts clearly

### Why Use Cases (Not Services)?
- **CLAUDE.md Rule #4:** "Use cases orchestrate only, no complex logic"
- Each use case = one user intention
- Easy to understand flow
- Easy to test
- Clear boundaries

### Why Repository Pattern?
- **CLAUDE.md Rule #6:** "Repository interfaces in domain"
- **CLAUDE.md Rule #7:** "Dependency direction inward"
- Domain doesn't depend on infrastructure
- Easy to swap implementations (testing, different APIs)
- Single place for data access

### Why ViewModels?
- **CLAUDE.md Rule #5:** "ViewModels for presentation"
- Domain entities don't know about HTML/CSS/formatting
- Presentation can have different shape than domain
- Easy to test presentation logic separately

### Why No HTML in Panel .ts Files?
- **CLAUDE.md Rule #10:** "HTML in separate view files"
- Cleaner code
- Better maintainability
- IDE support for HTML syntax

---

## Summary

This architecture follows clean architecture principles and CLAUDE.md rules:

✅ Rich domain models with behavior
✅ Use cases orchestrate, no business logic
✅ Repository interfaces in domain
✅ Dependencies point inward
✅ ViewModels for presentation
✅ HTML in separate view files
✅ No business logic in panels
✅ Proper abstraction for reusable components
✅ Clear separation of concerns
✅ Testable at every layer

Next step: Create detailed implementation plan with file-by-file breakdown.
