# Plugin Trace Viewer - Implementation Plan

**Document Version:** 1.0
**Date:** 2025-11-02
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [File Structure](#file-structure)
3. [Implementation Phases](#implementation-phases)
4. [Interface Definitions](#interface-definitions)
5. [Critical Design Decisions](#critical-design-decisions)
6. [Implementation Guide](#implementation-guide)
7. [Migration Path](#migration-path)
8. [CLAUDE.md Compliance Checklist](#claudemd-compliance-checklist)
9. [Testing Strategy](#testing-strategy)
10. [Summary & Metrics](#summary--metrics)

---

## Executive Summary

This implementation plan provides a file-by-file blueprint for implementing the Plugin Trace Viewer feature following clean architecture principles and CLAUDE.md rules.

**Key Architectural Principles:**
1. **Rich Domain Model** - PluginTrace entity with business logic methods
2. **Use Cases Orchestrate** - No business logic in use cases, pure coordination
3. **Repository Pattern** - Domain defines interfaces, infrastructure implements
4. **ViewModels** - Presentation layer uses DTOs mapped from domain entities
5. **Dependency Inversion** - All dependencies point inward toward domain
6. **Reusable Components** - JsonViewer, Timeline abstracted for use in 3+ panels

**Total Files:** 45 new files + 2 enhancements
**Complexity:** Medium-High
**Estimated Time:** 5-7 days (1 developer)

---

## File Structure

Complete file structure with **full absolute paths** from project root:

```
C:\VS\Power-Platform-Developer-Suite\src\features\pluginTraceViewer\

├── domain/                                    # ZERO dependencies - Pure business logic
│   ├── entities/
│   │   ├── PluginTrace.ts                    # Rich domain entity with behavior
│   │   ├── PluginTrace.test.ts               # Unit tests
│   │   └── TraceFilter.ts                    # Filter configuration entity
│   │
│   ├── valueObjects/
│   │   ├── TraceLevel.ts                     # Off/Exception/All enum
│   │   ├── TraceStatus.ts                    # Success/Exception status
│   │   ├── ExecutionMode.ts                  # Sync/Async execution mode
│   │   ├── OperationType.ts                  # Plugin/Workflow type
│   │   ├── Duration.ts                       # Duration with formatting
│   │   ├── CorrelationId.ts                  # Correlation identifier
│   │   └── ValueObjects.test.ts              # Value object tests
│   │
│   ├── services/
│   │   ├── PluginTraceFilterService.ts       # OData filter building (domain logic)
│   │   └── PluginTraceFilterService.test.ts  # Filter service tests
│   │
│   └── repositories/
│       ├── IPluginTraceRepository.ts         # Repository interface (domain contract)
│       └── IPluginTraceExporter.ts           # Exporter interface
│
├── application/                               # Use cases - Orchestration only
│   ├── useCases/
│   │   ├── GetPluginTracesUseCase.ts         # Load traces with filters
│   │   ├── GetPluginTracesUseCase.test.ts
│   │   ├── GetTraceLevelUseCase.ts           # Query org trace level
│   │   ├── GetTraceLevelUseCase.test.ts
│   │   ├── SetTraceLevelUseCase.ts           # Update org trace level
│   │   ├── SetTraceLevelUseCase.test.ts
│   │   ├── DeleteTracesUseCase.ts            # Delete single/multiple/all/old
│   │   ├── DeleteTracesUseCase.test.ts
│   │   ├── ExportTracesUseCase.ts            # Export CSV/JSON
│   │   └── ExportTracesUseCase.test.ts
│   │
│   ├── mappers/
│   │   ├── PluginTraceViewModelMapper.ts     # Domain → ViewModel mapping
│   │   └── PluginTraceViewModelMapper.test.ts
│   │
│   └── viewModels/
│       ├── PluginTraceViewModel.ts           # Presentation DTOs
│       └── PluginTraceDetailViewModel.ts     # Detail panel DTO
│
├── infrastructure/                            # External dependencies
│   ├── repositories/
│   │   ├── DataversePluginTraceRepository.ts # IPluginTraceRepository impl
│   │   └── DataversePluginTraceRepository.test.ts
│   │
│   ├── exporters/
│   │   ├── FileSystemPluginTraceExporter.ts  # IPluginTraceExporter impl
│   │   └── FileSystemPluginTraceExporter.test.ts
│   │
│   ├── mappers/
│   │   ├── PluginTraceMapper.ts              # API ↔ Domain mapping
│   │   └── PluginTraceMapper.test.ts
│   │
│   └── dtos/
│       └── DataversePluginTraceLogDto.ts     # API response types
│
└── presentation/                              # UI layer
    ├── panels/
    │   ├── PluginTraceViewerPanel.ts         # Main panel (inject use cases)
    │   └── PluginTraceViewerPanel.test.ts
    │
    ├── views/
    │   ├── pluginTraceDetailView.ts          # HTML templates (Configuration tab)
    │   ├── pluginTraceExecutionView.ts       # HTML templates (Execution tab)
    │   ├── pluginTraceTimelineView.ts        # HTML templates (Timeline tab)
    │   └── pluginTraceRelatedView.ts         # HTML templates (Related tab)
    │
    └── components/                            # Panel-specific UI logic
        └── PluginTraceDetailPanel.ts         # Detail panel component

# Reusable Components (Enhancements)
C:\VS\Power-Platform-Developer-Suite\TEMP\templates\src\components\viewers\JsonViewer\
├── JsonViewerComponent.ts                    # ENHANCE: Make fully generic
└── JsonViewerConfig.ts                       # ENHANCE: Generic interface

C:\VS\Power-Platform-Developer-Suite\resources\webview\js\components\
└── TimelineBehavior.js                       # ENHANCE: Make generic timeline
```

**Dependencies Between Layers:**

```
Presentation (PluginTraceViewerPanel)
  ↓ depends on ↓
Application (Use Cases + ViewModels)
  ↓ depends on ↓
Domain (Entities + Interfaces + Services)
  ↑ implemented by ↑
Infrastructure (Repositories + Exporters + Mappers)
```

---

## Implementation Phases

### Phase 1: Domain Layer (Foundation) ⭐ START HERE

**Objective:** Build pure business logic with ZERO dependencies.

**Files to Create:**

1. **`domain/valueObjects/TraceLevel.ts`**
   - Enum-style value object: Off (0), Exception (1), All (2)
   - Methods: `getDisplayName()`, `fromNumber()`, `equals()`, `requiresWarning()`
   - No dependencies

2. **`domain/valueObjects/TraceStatus.ts`**
   - Enum-style value object: Success, Exception
   - Methods: `getDisplayName()`, `getBadgeClass()`, `isError()`

3. **`domain/valueObjects/ExecutionMode.ts`**
   - Enum-style value object: Synchronous (0), Asynchronous (1)
   - Methods: `getDisplayName()`, `fromNumber()`, `isSynchronous()`

4. **`domain/valueObjects/OperationType.ts`**
   - Enum-style value object: Plugin (1), Workflow (2)
   - Methods: `getDisplayName()`, `fromNumber()`

5. **`domain/valueObjects/Duration.ts`**
   - Properties: `milliseconds: number`
   - Methods: `format()`, `isSlowerThan()`, `add()`, `fromMilliseconds()`
   - Formatting logic: "125ms", "3.2s", or "2m 15s"

6. **`domain/valueObjects/CorrelationId.ts`**
   - Properties: `value: string`
   - Methods: `equals()`, `toString()`, `isEmpty()`

7. **`domain/entities/TraceFilter.ts`**
   - Properties: `top: number`, `orderBy: string`, `odataFilter?: string`
   - Methods: `static default()`, `static create()`, `withFilter()`, `withTop()`

8. **`domain/entities/PluginTrace.ts`** ⭐ **RICH MODEL**
   - All properties from requirements
   - Business logic methods (see Interface Definitions section)
   - Factory method: `static create()`
   - Validation in constructor

9. **`domain/services/PluginTraceFilterService.ts`**
   - Stateless domain service for complex filtering logic
   - Methods: `buildODataFilter()`, `applyClientSideSearch()`
   - Handles AND/OR logic, operator mapping

10. **`domain/repositories/IPluginTraceRepository.ts`**
    - Interface defining data access contract
    - Methods: getTraces, deleteTrace, deleteTraces, getTraceLevel, setTraceLevel

11. **`domain/repositories/IPluginTraceExporter.ts`**
    - Interface for export operations
    - Methods: exportToCsv, exportToJson, saveToFile

**Testing:** Unit tests for all entities and value objects (pure functions, no mocks needed)

**Dependencies:** NONE - Domain layer is completely isolated

**Completion Criteria:**
- [ ] All value objects created and tested
- [ ] PluginTrace entity has rich behavior methods
- [ ] TraceFilter entity created
- [ ] PluginTraceFilterService tested with OData query building
- [ ] Repository interfaces defined
- [ ] 100% test coverage on domain layer
- [ ] No dependencies on outer layers

**Estimated Time:** 1.5 days

---

### Phase 2: Application Layer (Use Cases)

**Objective:** Create orchestration layer that coordinates domain entities and repositories.

**Files to Create:**

1. **`application/useCases/GetPluginTracesUseCase.ts`**
   - Dependencies: `IPluginTraceRepository`, `ILogger`
   - Method: `execute(environmentId, filter?): Promise<PluginTrace[]>`
   - Orchestrates repository call, logs boundaries

2. **`application/useCases/GetTraceLevelUseCase.ts`**
   - Dependencies: `IPluginTraceRepository`, `ILogger`
   - Method: `execute(environmentId): Promise<TraceLevel>`

3. **`application/useCases/SetTraceLevelUseCase.ts`**
   - Dependencies: `IPluginTraceRepository`, `ILogger`
   - Method: `execute(environmentId, level): Promise<void>`

4. **`application/useCases/DeleteTracesUseCase.ts`**
   - Dependencies: `IPluginTraceRepository`, `ILogger`
   - Methods: `deleteSingle()`, `deleteMultiple()`, `deleteAll()`, `deleteOldTraces()`

5. **`application/useCases/ExportTracesUseCase.ts`**
   - Dependencies: `IPluginTraceExporter`, `ILogger`
   - Methods: `exportToCsv()`, `exportToJson()`

6. **`application/viewModels/PluginTraceViewModel.ts`**
   - Interface definitions for presentation DTOs
   - `PluginTraceTableRowViewModel`, `PluginTraceDetailViewModel`

7. **`application/mappers/PluginTraceViewModelMapper.ts`**
   - Static methods: `toTableRowViewModel()`, `toDetailViewModel()`
   - Maps domain entities → presentation DTOs
   - Includes HTML badge generation, date formatting

**Testing:** Use case tests with mocked repositories

**Dependencies:** Domain layer only

**Completion Criteria:**
- [ ] All use cases created and tested
- [ ] ViewModel interfaces defined
- [ ] ViewModel mapper created and tested
- [ ] Use cases contain NO business logic (only orchestration)
- [ ] ILogger injected (not global Logger)
- [ ] 90%+ test coverage

**Estimated Time:** 1 day

---

### Phase 3: Infrastructure Layer (Implementation)

**Objective:** Implement repository and exporter interfaces defined in domain.

**Files to Create:**

1. **`infrastructure/dtos/DataversePluginTraceLogDto.ts`**
   - TypeScript interfaces matching Dataverse API response
   - All plugintracelog fields

2. **`infrastructure/mappers/PluginTraceMapper.ts`**
   - `static toDomain(dto): PluginTrace` - API → Domain
   - `static toDto(trace): DataversePluginTraceLogDto` - Domain → API (if needed)
   - Handles null/undefined from API
   - Maps API numbers to Value Objects

3. **`infrastructure/repositories/DataversePluginTraceRepository.ts`**
   - Implements `IPluginTraceRepository`
   - Dependencies: `IDataverseApiService`, `ILogger`, `PluginTraceMapper`
   - Methods:
     - `getTraces()` - Builds OData query, calls API, maps to domain
     - `getTraceById()` - Single trace retrieval
     - `deleteTrace()` - DELETE single trace
     - `deleteTraces()` - Batch delete using OData $batch API
     - `deleteAllTraces()` - Fetch all IDs, delete in batches
     - `deleteOldTraces()` - Filter by date, delete in batches
     - `getTraceLevel()` - Query organization settings
     - `setTraceLevel()` - PATCH organization settings

4. **`infrastructure/exporters/FileSystemPluginTraceExporter.ts`**
   - Implements `IPluginTraceExporter`
   - Dependencies: VS Code APIs (showSaveDialog, fs)
   - Methods:
     - `exportToCsv()` - Converts traces to CSV with proper escaping
     - `exportToJson()` - Converts to pretty JSON
     - `saveToFile()` - Shows dialog, writes file, returns path

**Testing:** Integration tests (can use mock API or real test environment)

**Dependencies:** Domain layer, shared infrastructure services

**Completion Criteria:**
- [ ] DataversePluginTraceRepository fully implements interface
- [ ] OData $batch API working for bulk deletes
- [ ] PluginTraceMapper tested with API responses
- [ ] FileSystemPluginTraceExporter tested with mock dialogs
- [ ] Error handling for API failures
- [ ] Logging at infrastructure boundaries
- [ ] 80%+ test coverage

**Estimated Time:** 1.5 days

---

### Phase 4: Presentation Layer (UI)

**Objective:** Build UI layer with panel, views, and ViewModels.

**Files to Create:**

1. **`presentation/views/pluginTraceDetailView.ts`**
   - Export functions that return HTML strings
   - `renderConfigurationTab(trace: PluginTraceDetailViewModel): string`
   - No business logic, pure HTML generation

2. **`presentation/views/pluginTraceExecutionView.ts`**
   - `renderExecutionTab(trace: PluginTraceDetailViewModel): string`
   - Formats execution details, performance metrics

3. **`presentation/views/pluginTraceTimelineView.ts`**
   - `renderTimelineTab(traces: PluginTraceViewModel[]): string`
   - Uses TimelineBehavior component (client-side JS)

4. **`presentation/views/pluginTraceRelatedView.ts`**
   - `renderRelatedTab(traces: PluginTraceViewModel[]): string`
   - List of related traces by correlation ID

5. **`presentation/components/PluginTraceDetailPanel.ts`**
   - Manages detail panel tabs and state
   - Dependencies: View functions, JsonViewerComponent
   - Methods: `render()`, `switchTab()`, `updateTrace()`

6. **`presentation/panels/PluginTraceViewerPanel.ts`** ⭐ **MAIN PANEL**
   - Extends `DataTablePanel` (existing base class)
   - Dependencies: All use cases (injected), components
   - Methods:
     - `initialize()` - Setup components, load data
     - `handleRefresh()` - Calls GetPluginTracesUseCase
     - `handleSetTraceLevel()` - Warns user, calls SetTraceLevelUseCase
     - `handleDeleteAll()` - Confirms, calls DeleteTracesUseCase
     - `handleExport()` - Shows dialog, calls ExportTracesUseCase
     - `handleTraceSelected()` - Maps to ViewModel, updates detail panel
   - NO business logic (filtering, formatting, validation)

**Testing:** Component tests with mocked use cases

**Dependencies:** Application layer (use cases + ViewModels), domain layer (for types)

**Completion Criteria:**
- [ ] All view functions created (pure HTML generation)
- [ ] PluginTraceViewerPanel created with injected use cases
- [ ] Panel contains NO business logic
- [ ] HTML extracted to view files (not in panel .ts)
- [ ] Detail panel tabs working
- [ ] User warnings for trace level changes
- [ ] 70%+ test coverage

**Estimated Time:** 1.5 days

---

### Phase 5: Reusable Components ⭐ **CRITICAL**

**Objective:** Make JsonViewerComponent and TimelineBehavior fully generic for reuse in 3+ panels.

**Files to Enhance:**

1. **`TEMP/templates/src/components/viewers/JsonViewer/JsonViewerComponent.ts`**
   - Remove any panel-specific references
   - Accept generic `data: any` in constructor
   - Methods: `setData(data: any)`, `getData()`, `clear()`
   - Theme-aware CSS using variables
   - Test: Can it display PluginTrace? Solution metadata? Arbitrary objects?

2. **`TEMP/templates/src/components/viewers/JsonViewer/JsonViewerConfig.ts`**
   - Generic interface:
     ```typescript
     interface JsonViewerConfig {
       id: string;
       data: any;
       collapsible?: boolean;
       showCopy?: boolean;
       maxHeight?: string | 'none';
     }
     ```

3. **`resources/webview/js/components/TimelineBehavior.js`**
   - Make generic timeline renderer
   - Accept items with: `{ id, timestamp, label, status, duration?, metadata? }`
   - Interface:
     ```javascript
     TimelineBehavior.renderTimeline({
       containerId: 'timeline',
       items: [...],
       onItemClick: (id) => { ... }
     });
     ```

**Testing:**
- [ ] JsonViewerComponent works in Plugin Trace Viewer (Raw Data tab)
- [ ] JsonViewerComponent works in Solution Explorer (future)
- [ ] JsonViewerComponent has ZERO references to "trace", "plugin", "solution"
- [ ] TimelineBehavior works with generic timeline items
- [ ] TimelineBehavior has no plugin-specific code

**Completion Criteria:**
- [ ] JsonViewerComponent fully generic
- [ ] TimelineBehavior fully generic
- [ ] Documentation updated with usage examples
- [ ] No panel-specific dependencies
- [ ] Components can be used in ANY panel

**Estimated Time:** 0.5 days

---

### Phase 6: Integration & Testing

**Objective:** Wire everything together, test end-to-end, handle edge cases.

**Tasks:**

1. **Dependency Injection Setup**
   - Update `src/extension.ts` to create use cases with repositories
   - Use ServiceFactory for singletons (repositories)
   - Inject use cases into panel constructor

2. **End-to-End Testing**
   - Test full flow: Panel → Use Case → Repository → API
   - Test with real Dataverse environment
   - Test error scenarios (network failures, invalid filters)

3. **State Persistence**
   - Test filters persist across sessions
   - Test auto-refresh interval persists
   - Test split panel ratio persists

4. **Performance Testing**
   - Test with 1000+ traces
   - Test batch delete with 500+ traces
   - Test client-side search performance

5. **Error Handling**
   - Test API authentication failures
   - Test permission errors
   - Test invalid OData filters
   - Test empty result sets

**Completion Criteria:**
- [ ] All use cases wired to panel
- [ ] End-to-end flow working
- [ ] State persistence verified
- [ ] Error handling tested
- [ ] Performance acceptable (see requirements)
- [ ] No console errors in webview

**Estimated Time:** 1 day

---

## Interface Definitions

### Common Interfaces

These interfaces are used across multiple layers:

```typescript
// src/infrastructure/logging/ILogger.ts

export interface ILogger {
  /**
   * Logs debug information (development only).
   */
  debug(message: string, context?: Record<string, unknown>): void;

  /**
   * Logs informational messages.
   */
  info(message: string, context?: Record<string, unknown>): void;

  /**
   * Logs warning messages.
   */
  warn(message: string, context?: Record<string, unknown>): void;

  /**
   * Logs error messages with optional error object.
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
}
```

```typescript
// src/domain/errors/ValidationError.ts

/**
 * Domain error for validation failures.
 * Thrown when entity/value object construction fails validation.
 */
export class ValidationError extends Error {
  constructor(
    public readonly entityName: string,
    public readonly fieldName: string,
    public readonly value: unknown,
    message: string
  ) {
    super(message);
    this.name = 'ValidationError';

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}
```

### Type Safety Helpers

```typescript
// src/types/BrandedTypes.ts

/**
 * Branded type for TraceId (prevents mixing with other string IDs).
 */
export type TraceId = string & { readonly __brand: 'TraceId' };

/**
 * Branded type for EnvironmentId (prevents mixing with other string IDs).
 */
export type EnvironmentId = string & { readonly __brand: 'EnvironmentId' };

/**
 * Helper to create branded TraceId from string.
 */
export function createTraceId(id: string): TraceId {
  return id as TraceId;
}

/**
 * Helper to create branded EnvironmentId from string.
 */
export function createEnvironmentId(id: string): EnvironmentId {
  return id as EnvironmentId;
}
```

```typescript
// src/types/ExportFormat.ts

/**
 * Supported export formats.
 */
export type ExportFormat = 'csv' | 'json';
```

```typescript
// src/types/PipelineStage.ts

/**
 * Power Platform plugin pipeline stages.
 * https://docs.microsoft.com/en-us/power-apps/developer/data-platform/event-framework
 */
export enum PipelineStage {
  PreValidation = 10,
  PreOperation = 20,
  PostOperation = 30,
  PostOperationDeprecated = 40
}
```

### Domain Layer

#### PluginTrace Entity (Rich Model)

```typescript
// src/features/pluginTraceViewer/domain/entities/PluginTrace.ts

export class PluginTrace {
  private constructor(
    public readonly id: string,
    public readonly createdOn: Date,
    public readonly pluginName: string,
    public readonly entityName: string | null,
    public readonly messageName: string,
    public readonly operationType: OperationType,
    public readonly mode: ExecutionMode,
    public readonly stage: number,
    public readonly depth: number,
    public readonly duration: Duration,
    public readonly constructorDuration: Duration,
    public readonly exceptionDetails: string | null,
    public readonly messageBlock: string | null,
    public readonly configuration: string | null,
    public readonly secureConfiguration: string | null,
    public readonly correlationId: CorrelationId | null,
    public readonly requestId: string | null,
    public readonly pluginStepId: string | null,
    public readonly persistenceKey: string | null
  ) {}

  /**
   * Business logic: Determines if trace has exception.
   * A trace with empty or null exceptionDetails is successful.
   */
  hasException(): boolean {
    return this.exceptionDetails !== null &&
           this.exceptionDetails.trim().length > 0;
  }

  /**
   * Business logic: Determines if trace completed successfully.
   */
  isSuccessful(): boolean {
    return !this.hasException();
  }

  /**
   * Business logic: Gets trace status (Success or Exception).
   */
  getStatus(): TraceStatus {
    return this.hasException()
      ? TraceStatus.Exception
      : TraceStatus.Success;
  }

  /**
   * Business logic: Checks if this trace is related to another via correlation ID.
   * Related traces share the same correlationId.
   */
  isRelatedTo(other: PluginTrace): boolean {
    if (this.correlationId === null || other.correlationId === null) {
      return false;
    }
    return this.correlationId.equals(other.correlationId);
  }

  /**
   * Business logic: Checks if trace represents a nested plugin call.
   * Depth > 1 indicates plugin was called from another plugin.
   */
  isNested(): boolean {
    return this.depth > 1;
  }

  /**
   * Business logic: Checks if execution was synchronous.
   */
  isSynchronous(): boolean {
    return this.mode.equals(ExecutionMode.Synchronous);
  }

  /**
   * Business logic: Checks if execution was asynchronous.
   */
  isAsynchronous(): boolean {
    return this.mode.equals(ExecutionMode.Asynchronous);
  }

  /**
   * Business logic: Gets formatted performance summary.
   * Combines execution duration and constructor duration.
   */
  getPerformanceSummary(): string {
    const execTime = this.duration.format();
    const ctorTime = this.constructorDuration.format();
    return `Execution: ${execTime}, Constructor: ${ctorTime}`;
  }

  /**
   * Business logic: Checks if trace has correlation ID.
   */
  hasCorrelationId(): boolean {
    return this.correlationId !== null && !this.correlationId.isEmpty();
  }

  /**
   * Factory method: Creates PluginTrace with validation.
   *
   * Optional parameters: Can be omitted from params object.
   * Nullable parameters: Must be provided but can be null.
   */
  static create(params: {
    // Required fields
    id: string;
    createdOn: Date;
    pluginName: string;
    entityName: string | null;
    messageName: string;
    operationType: OperationType;
    mode: ExecutionMode;
    duration: Duration;
    constructorDuration: Duration;

    // Optional fields with defaults
    stage?: number;               // Default: 0
    depth?: number;               // Default: 1

    // Nullable fields (can be undefined or null, normalized to null)
    exceptionDetails?: string | null;
    messageBlock?: string | null;
    configuration?: string | null;
    secureConfiguration?: string | null;
    correlationId?: CorrelationId | null;
    requestId?: string | null;
    pluginStepId?: string | null;
    persistenceKey?: string | null;
  }): PluginTrace {
    // Validation
    if (!params.id || params.id.trim().length === 0) {
      throw new ValidationError('PluginTrace', 'id', params.id, 'ID is required');
    }

    if (!params.pluginName || params.pluginName.trim().length === 0) {
      throw new ValidationError('PluginTrace', 'pluginName', params.pluginName, 'Plugin name is required');
    }

    if (!params.messageName || params.messageName.trim().length === 0) {
      throw new ValidationError('PluginTrace', 'messageName', params.messageName, 'Message name is required');
    }

    return new PluginTrace(
      params.id,
      params.createdOn,
      params.pluginName,
      params.entityName,
      params.messageName,
      params.operationType,
      params.mode,
      params.stage ?? 0,
      params.depth ?? 1,
      params.duration,
      params.constructorDuration,
      params.exceptionDetails ?? null,
      params.messageBlock ?? null,
      params.configuration ?? null,
      params.secureConfiguration ?? null,
      params.correlationId ?? null,
      params.requestId ?? null,
      params.pluginStepId ?? null,
      params.persistenceKey ?? null
    );
  }
}
```

#### Value Objects

```typescript
// src/features/pluginTraceViewer/domain/valueObjects/TraceLevel.ts

export class TraceLevel {
  private constructor(public readonly value: number) {}

  static readonly Off = new TraceLevel(0);
  static readonly Exception = new TraceLevel(1);
  static readonly All = new TraceLevel(2);

  static fromNumber(value: number): TraceLevel {
    switch (value) {
      case 0: return TraceLevel.Off;
      case 1: return TraceLevel.Exception;
      case 2: return TraceLevel.All;
      default: throw new Error(`Invalid trace level: ${value}`);
    }
  }

  getDisplayName(): string {
    switch (this.value) {
      case 0: return 'Off';
      case 1: return 'Exception';
      case 2: return 'All';
      default: return 'Unknown';
    }
  }

  equals(other: TraceLevel | null): boolean {
    return other !== null && this.value === other.value;
  }

  /**
   * Business logic: Determines if setting this level requires warning user.
   * "All" level can impact performance and should warn.
   */
  requiresWarning(): boolean {
    return this.value === 2; // All
  }
}
```

```typescript
// src/features/pluginTraceViewer/domain/valueObjects/Duration.ts

export class Duration {
  private constructor(public readonly milliseconds: number) {
    if (milliseconds < 0) {
      throw new ValidationError('Duration', 'milliseconds', milliseconds, 'Cannot be negative');
    }
  }

  static fromMilliseconds(ms: number): Duration {
    return new Duration(ms);
  }

  /**
   * Business logic: Formats duration for display.
   * Returns "125ms", "3.2s", or "2m 15s" based on magnitude.
   */
  format(): string {
    if (this.milliseconds < 1000) {
      return `${this.milliseconds}ms`;
    } else if (this.milliseconds < 60000) {
      const seconds = (this.milliseconds / 1000).toFixed(1);
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(this.milliseconds / 60000);
      const seconds = ((this.milliseconds % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  isSlowerThan(other: Duration): boolean {
    return this.milliseconds > other.milliseconds;
  }

  add(other: Duration): Duration {
    return new Duration(this.milliseconds + other.milliseconds);
  }
}
```

```typescript
// src/features/pluginTraceViewer/domain/valueObjects/TraceStatus.ts

export class TraceStatus {
  private constructor(public readonly value: string) {}

  static readonly Success = new TraceStatus('Success');
  static readonly Exception = new TraceStatus('Exception');

  /**
   * Gets display name for UI.
   */
  getDisplayName(): string {
    return this.value;
  }

  /**
   * Gets CSS class for badge styling.
   * Used by ViewModels for presentation.
   */
  getBadgeClass(): string {
    switch (this.value) {
      case 'Success': return 'badge-success';
      case 'Exception': return 'badge-error';
      default: return 'badge-default';
    }
  }

  /**
   * Business logic: Checks if status represents error.
   */
  isError(): boolean {
    return this.value === 'Exception';
  }

  equals(other: TraceStatus | null): boolean {
    return other !== null && this.value === other.value;
  }
}
```

```typescript
// src/features/pluginTraceViewer/domain/valueObjects/ExecutionMode.ts

export class ExecutionMode {
  private constructor(public readonly value: number) {}

  static readonly Synchronous = new ExecutionMode(0);
  static readonly Asynchronous = new ExecutionMode(1);

  static fromNumber(value: number): ExecutionMode {
    switch (value) {
      case 0: return ExecutionMode.Synchronous;
      case 1: return ExecutionMode.Asynchronous;
      default: throw new Error(`Invalid execution mode: ${value}`);
    }
  }

  getDisplayName(): string {
    switch (this.value) {
      case 0: return 'Synchronous';
      case 1: return 'Asynchronous';
      default: return 'Unknown';
    }
  }

  isSynchronous(): boolean {
    return this.value === 0;
  }

  equals(other: ExecutionMode | null): boolean {
    return other !== null && this.value === other.value;
  }
}
```

```typescript
// src/features/pluginTraceViewer/domain/valueObjects/OperationType.ts

export class OperationType {
  private constructor(public readonly value: number) {}

  static readonly Plugin = new OperationType(1);
  static readonly Workflow = new OperationType(2);

  static fromNumber(value: number): OperationType {
    switch (value) {
      case 1: return OperationType.Plugin;
      case 2: return OperationType.Workflow;
      default: throw new Error(`Invalid operation type: ${value}`);
    }
  }

  getDisplayName(): string {
    switch (this.value) {
      case 1: return 'Plugin';
      case 2: return 'Workflow';
      default: return 'Unknown';
    }
  }

  equals(other: OperationType | null): boolean {
    return other !== null && this.value === other.value;
  }
}
```

```typescript
// src/features/pluginTraceViewer/domain/valueObjects/CorrelationId.ts

export class CorrelationId {
  private constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('CorrelationId', 'value', value, 'Cannot be empty');
    }
  }

  static create(value: string): CorrelationId {
    return new CorrelationId(value);
  }

  equals(other: CorrelationId | null): boolean {
    return other !== null && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  isEmpty(): boolean {
    return this.value.trim().length === 0;
  }
}
```

#### Repository Interfaces

```typescript
// src/features/pluginTraceViewer/domain/repositories/IPluginTraceRepository.ts

import { PluginTrace } from '../entities/PluginTrace';
import { TraceFilter } from '../entities/TraceFilter';
import { TraceLevel } from '../valueObjects/TraceLevel';

export interface IPluginTraceRepository {
  /**
   * Retrieves plugin traces from environment with optional filtering.
   * Returns readonly array to prevent accidental mutation.
   */
  getTraces(environmentId: string, filter: TraceFilter): Promise<readonly PluginTrace[]>;

  /**
   * Retrieves a single trace by ID.
   */
  getTraceById(environmentId: string, traceId: string): Promise<PluginTrace | null>;

  /**
   * Deletes a single trace.
   */
  deleteTrace(environmentId: string, traceId: string): Promise<void>;

  /**
   * Deletes multiple traces by IDs (uses batch API).
   * Accepts readonly array to allow passing immutable arrays.
   * @returns Number of traces successfully deleted
   */
  deleteTraces(environmentId: string, traceIds: readonly string[]): Promise<number>;

  /**
   * Deletes all traces in environment.
   * @returns Number of traces deleted
   */
  deleteAllTraces(environmentId: string): Promise<number>;

  /**
   * Deletes traces older than specified days.
   * @returns Number of traces deleted
   */
  deleteOldTraces(environmentId: string, olderThanDays: number): Promise<number>;

  /**
   * Gets current organization trace level setting.
   */
  getTraceLevel(environmentId: string): Promise<TraceLevel>;

  /**
   * Sets organization trace level setting.
   */
  setTraceLevel(environmentId: string, level: TraceLevel): Promise<void>;
}
```

```typescript
// src/features/pluginTraceViewer/domain/repositories/IPluginTraceExporter.ts

import { PluginTrace } from '../entities/PluginTrace';

export interface IPluginTraceExporter {
  /**
   * Converts traces to CSV format.
   * Accepts readonly array to allow passing immutable arrays.
   * @returns CSV string with proper escaping
   */
  exportToCsv(traces: readonly PluginTrace[]): string;

  /**
   * Converts traces to JSON format.
   * Accepts readonly array to allow passing immutable arrays.
   * @returns Pretty-printed JSON array
   */
  exportToJson(traces: readonly PluginTrace[]): string;

  /**
   * Shows save dialog and writes content to file.
   * @returns Absolute path to saved file
   */
  saveToFile(content: string, suggestedFilename: string): Promise<string>;
}
```

#### Domain Service

```typescript
// src/features/pluginTraceViewer/domain/services/PluginTraceFilterService.ts

import { PluginTrace } from '../entities/PluginTrace';
import { TraceFilter } from '../entities/TraceFilter';

/**
 * Type-safe filter operators for OData queries.
 */
export type FilterOperator =
  | 'contains'
  | 'eq'
  | 'startswith'
  | 'endswith'
  | 'gt'
  | 'lt'
  | 'ge'
  | 'le'
  | 'isNull'
  | 'isNotNull';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string | number;
}

/**
 * Domain service for building OData filters and client-side search.
 *
 * Note: Uses static methods for pure transformation logic (no state).
 * Documented exception to CLAUDE.md preference for instance methods.
 */
export class PluginTraceFilterService {
  /**
   * Business logic: Builds OData $filter query from conditions.
   *
   * Supports operators:
   * - contains, eq, startswith, endswith (strings)
   * - gt, lt, ge, le (numbers/dates)
   * - isNull, isNotNull (nullability)
   *
   * Combines with AND logic.
   */
  static buildODataFilter(conditions: FilterCondition[]): string {
    if (conditions.length === 0) {
      return '';
    }

    const filters = conditions.map(c => {
      switch (c.operator) {
        case 'contains':
          return `contains(${c.field}, '${this.escapeOData(String(c.value))}')`;
        case 'eq':
          return `${c.field} eq '${this.escapeOData(String(c.value))}'`;
        case 'startswith':
          return `startswith(${c.field}, '${this.escapeOData(String(c.value))}')`;
        case 'endswith':
          return `endswith(${c.field}, '${this.escapeOData(String(c.value))}')`;
        case 'gt':
          return `${c.field} gt ${c.value}`;
        case 'lt':
          return `${c.field} lt ${c.value}`;
        case 'ge':
          return `${c.field} ge ${c.value}`;
        case 'le':
          return `${c.field} le ${c.value}`;
        case 'isNull':
          return `${c.field} eq null`;
        case 'isNotNull':
          return `${c.field} ne null`;
        default:
          const exhaustiveCheck: never = c.operator;
          throw new Error(`Unsupported operator: ${exhaustiveCheck}`);
      }
    });

    return filters.join(' and ');
  }

  /**
   * Business logic: Applies client-side search filter.
   * Searches across all text fields in loaded traces.
   * Accepts and returns readonly arrays to prevent mutation.
   */
  static applyClientSideSearch(
    traces: readonly PluginTrace[],
    searchTerm: string
  ): readonly PluginTrace[] {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return traces;
    }

    const query = searchTerm.toLowerCase();
    return traces.filter(trace =>
      trace.pluginName.toLowerCase().includes(query) ||
      (trace.entityName?.toLowerCase().includes(query) ?? false) ||
      trace.messageName.toLowerCase().includes(query) ||
      (trace.exceptionDetails?.toLowerCase().includes(query) ?? false) ||
      (trace.correlationId?.toString().toLowerCase().includes(query) ?? false)
    );
  }

  private static escapeOData(value: string): string {
    return value.replace(/'/g, "''");
  }
}
```

---

### Application Layer

#### Use Cases

```typescript
// src/features/pluginTraceViewer/application/useCases/GetPluginTracesUseCase.ts

import { PluginTrace } from '../../domain/entities/PluginTrace';
import { TraceFilter } from '../../domain/entities/TraceFilter';
import { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

export class GetPluginTracesUseCase {
  constructor(
    private readonly repository: IPluginTraceRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Orchestrates retrieving plugin traces with optional filtering.
   *
   * NO BUSINESS LOGIC - Pure orchestration:
   * 1. Log operation start
   * 2. Call repository
   * 3. Log operation completion
   * 4. Return domain entities (readonly array)
   */
  async execute(params: {
    environmentId: string;
    filter?: TraceFilter;
  }): Promise<readonly PluginTrace[]> {
    this.logger.info('Getting plugin traces', {
      environmentId: params.environmentId
    });

    const filter = params.filter ?? TraceFilter.default();
    const traces = await this.repository.getTraces(
      params.environmentId,
      filter
    );

    this.logger.info('Retrieved plugin traces', {
      count: traces.length
    });

    return traces;
  }
}
```

```typescript
// src/features/pluginTraceViewer/application/useCases/SetTraceLevelUseCase.ts

import { TraceLevel } from '../../domain/valueObjects/TraceLevel';
import { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

export class SetTraceLevelUseCase {
  constructor(
    private readonly repository: IPluginTraceRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Orchestrates setting organization trace level.
   *
   * NOTE: Warning about performance is UI concern (panel), not use case.
   */
  async execute(params: {
    environmentId: string;
    level: TraceLevel;
  }): Promise<void> {
    this.logger.info('Setting trace level', {
      environmentId: params.environmentId,
      level: params.level.getDisplayName()
    });

    await this.repository.setTraceLevel(
      params.environmentId,
      params.level
    );

    this.logger.info('Trace level updated successfully');
  }
}
```

```typescript
// src/features/pluginTraceViewer/application/useCases/GetTraceLevelUseCase.ts

import { TraceLevel } from '../../domain/valueObjects/TraceLevel';
import { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

export class GetTraceLevelUseCase {
  constructor(
    private readonly repository: IPluginTraceRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Orchestrates querying organization trace level.
   */
  async execute(params: {
    environmentId: string;
  }): Promise<TraceLevel> {
    this.logger.info('Getting trace level', {
      environmentId: params.environmentId
    });

    const level = await this.repository.getTraceLevel(params.environmentId);

    this.logger.info('Retrieved trace level', {
      level: level.getDisplayName()
    });

    return level;
  }
}
```

```typescript
// src/features/pluginTraceViewer/application/useCases/DeleteTracesUseCase.ts

import { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Result of a delete operation.
 * Used for operations that can partially succeed.
 */
export interface DeleteResult {
  requested: number;
  deleted: number;
  failed: number;
  errors: Array<{ traceId: string; error: string }>;
}

export class DeleteTracesUseCase {
  constructor(
    private readonly repository: IPluginTraceRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Orchestrates deleting a single trace.
   */
  async deleteSingle(params: {
    environmentId: string;
    traceId: string;
  }): Promise<void> {
    this.logger.info('Deleting single trace', {
      environmentId: params.environmentId,
      traceId: params.traceId
    });

    await this.repository.deleteTrace(
      params.environmentId,
      params.traceId
    );

    this.logger.info('Trace deleted successfully');
  }

  /**
   * Orchestrates deleting multiple traces (uses batch API).
   * Returns result with success/failure counts.
   */
  async deleteMultiple(params: {
    environmentId: string;
    traceIds: readonly string[];
  }): Promise<DeleteResult> {
    this.logger.info('Deleting multiple traces', {
      environmentId: params.environmentId,
      count: params.traceIds.length
    });

    const requested = params.traceIds.length;
    let deleted = 0;
    const errors: Array<{ traceId: string; error: string }> = [];

    try {
      deleted = await this.repository.deleteTraces(
        params.environmentId,
        params.traceIds
      );
    } catch (error) {
      this.logger.error('Batch delete failed', error, {
        environmentId: params.environmentId
      });

      // If batch fails, attempt individual deletes
      for (const traceId of params.traceIds) {
        try {
          await this.repository.deleteTrace(params.environmentId, traceId);
          deleted++;
        } catch (err) {
          errors.push({
            traceId,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }
    }

    const failed = requested - deleted;

    this.logger.info('Deleted multiple traces', {
      requested,
      deleted,
      failed
    });

    return { requested, deleted, failed, errors };
  }

  /**
   * Orchestrates deleting all traces in environment.
   */
  async deleteAll(params: {
    environmentId: string;
  }): Promise<number> {
    this.logger.info('Deleting all traces', {
      environmentId: params.environmentId
    });

    const count = await this.repository.deleteAllTraces(params.environmentId);

    this.logger.info('Deleted all traces', { count });

    return count;
  }

  /**
   * Orchestrates deleting traces older than specified days.
   */
  async deleteOldTraces(params: {
    environmentId: string;
    olderThanDays: number;
  }): Promise<number> {
    this.logger.info('Deleting old traces', {
      environmentId: params.environmentId,
      olderThanDays: params.olderThanDays
    });

    const count = await this.repository.deleteOldTraces(
      params.environmentId,
      params.olderThanDays
    );

    this.logger.info('Deleted old traces', { count });

    return count;
  }
}
```

```typescript
// src/features/pluginTraceViewer/application/useCases/ExportTracesUseCase.ts

import { PluginTrace } from '../../domain/entities/PluginTrace';
import { IPluginTraceExporter } from '../../domain/repositories/IPluginTraceExporter';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ExportFormat } from '../../../../types/ExportFormat';

export class ExportTracesUseCase {
  constructor(
    private readonly exporter: IPluginTraceExporter,
    private readonly logger: ILogger
  ) {}

  /**
   * Orchestrates exporting traces to file.
   *
   * @returns Absolute path to saved file
   */
  async execute(params: {
    traces: readonly PluginTrace[];
    format: ExportFormat;
    suggestedFilename: string;
  }): Promise<string> {
    this.logger.info('Exporting traces', {
      count: params.traces.length,
      format: params.format
    });

    // Convert to requested format
    const content = params.format === 'csv'
      ? this.exporter.exportToCsv(params.traces)
      : this.exporter.exportToJson(params.traces);

    // Save to file (shows save dialog)
    const filePath = await this.exporter.saveToFile(
      content,
      params.suggestedFilename
    );

    this.logger.info('Traces exported successfully', {
      filePath,
      format: params.format
    });

    return filePath;
  }
}
```

#### ViewModels

```typescript
// src/features/pluginTraceViewer/application/viewModels/PluginTraceViewModel.ts

/**
 * Presentation DTO for table row display.
 * Includes formatted strings and HTML for UI rendering.
 */
export interface PluginTraceTableRowViewModel {
  id: string;
  status: string; // "Success" | "Exception"
  statusBadgeHtml: string; // HTML badge element
  statusClass: string; // CSS class for styling
  createdOn: string; // Formatted date/time
  duration: string; // Formatted duration ("125ms")
  operationType: string; // "Plugin" | "Workflow"
  pluginName: string;
  entityName: string;
  messageName: string;
  mode: string; // "Sync" | "Async"
  depth: number;
  pluginStepId: string;
  correlationId: string;
  hasException: boolean;
}

/**
 * Presentation DTO for detail panel display.
 * Includes all fields formatted for human readability.
 */
export interface PluginTraceDetailViewModel {
  id: string;
  status: string;
  statusBadgeHtml: string;

  // General Information
  pluginName: string;
  messageName: string;
  entityName: string;
  operationType: string;
  configuration: string;
  secureConfiguration: string;
  persistenceKey: string;
  pluginStepId: string;

  // Context Information
  depth: number;
  mode: string;
  correlationId: string;
  requestId: string;

  // Execution Information
  createdOn: string; // Formatted
  duration: string; // Formatted
  constructorDuration: string; // Formatted
  performanceSummary: string;
  messageBlock: string;
  exceptionDetails: string | null;

  // For timeline/related
  hasCorrelationId: boolean;

  // Raw data (for JSON viewer)
  rawData: Record<string, any>;
}
```

#### ViewModel Mapper

```typescript
// src/features/pluginTraceViewer/application/mappers/PluginTraceViewModelMapper.ts

import { PluginTrace } from '../../domain/entities/PluginTrace';
import {
  PluginTraceTableRowViewModel,
  PluginTraceDetailViewModel
} from '../viewModels/PluginTraceViewModel';
import { DateFormatter } from '../../../../shared/infrastructure/ui/utils/DateFormatter';

export class PluginTraceViewModelMapper {
  /**
   * Maps domain entity to table row ViewModel.
   * Includes HTML generation and formatting for presentation.
   */
  static toTableRowViewModel(trace: PluginTrace): PluginTraceTableRowViewModel {
    const status = trace.getStatus();

    return {
      id: trace.id,
      status: status.getDisplayName(),
      statusBadgeHtml: this.createStatusBadgeHtml(status),
      statusClass: status.getBadgeClass(),
      createdOn: DateFormatter.formatDateTime(trace.createdOn),
      duration: trace.duration.format(),
      operationType: trace.operationType.getDisplayName(),
      pluginName: trace.pluginName,
      entityName: trace.entityName ?? '',
      messageName: trace.messageName,
      mode: trace.mode.getDisplayName(),
      depth: trace.depth,
      pluginStepId: trace.pluginStepId ?? '',
      correlationId: trace.correlationId?.toString() ?? '',
      hasException: trace.hasException()
    };
  }

  /**
   * Maps domain entity to detail ViewModel.
   */
  static toDetailViewModel(trace: PluginTrace): PluginTraceDetailViewModel {
    const status = trace.getStatus();

    return {
      id: trace.id,
      status: status.getDisplayName(),
      statusBadgeHtml: this.createStatusBadgeHtml(status),

      pluginName: trace.pluginName,
      messageName: trace.messageName,
      entityName: trace.entityName ?? 'N/A',
      operationType: trace.operationType.getDisplayName(),
      configuration: trace.configuration ?? 'N/A',
      secureConfiguration: trace.secureConfiguration ?? 'N/A',
      persistenceKey: trace.persistenceKey ?? 'N/A',
      pluginStepId: trace.pluginStepId ?? 'N/A',

      depth: trace.depth,
      mode: trace.mode.getDisplayName(),
      correlationId: trace.correlationId?.toString() ?? 'N/A',
      requestId: trace.requestId ?? 'N/A',

      createdOn: DateFormatter.formatDateTime(trace.createdOn),
      duration: trace.duration.format(),
      constructorDuration: trace.constructorDuration.format(),
      performanceSummary: trace.getPerformanceSummary(),
      messageBlock: trace.messageBlock ?? 'No messages logged',
      exceptionDetails: trace.exceptionDetails,

      hasCorrelationId: trace.hasCorrelationId(),

      rawData: this.toRawData(trace)
    };
  }

  private static createStatusBadgeHtml(status: TraceStatus): string {
    const cssClass = status.getBadgeClass();
    const label = status.getDisplayName();
    const icon = status.isError() ? '⚠' : '●';

    return `<span class="status-badge ${cssClass}">
              <span class="status-badge-indicator">${icon}</span>
              <span class="status-badge-label">${label}</span>
            </span>`;
  }

  private static toRawData(trace: PluginTrace): Record<string, any> {
    return {
      id: trace.id,
      createdOn: trace.createdOn.toISOString(),
      pluginName: trace.pluginName,
      entityName: trace.entityName,
      messageName: trace.messageName,
      operationType: trace.operationType.value,
      mode: trace.mode.value,
      stage: trace.stage,
      depth: trace.depth,
      duration: trace.duration.milliseconds,
      constructorDuration: trace.constructorDuration.milliseconds,
      exceptionDetails: trace.exceptionDetails,
      messageBlock: trace.messageBlock,
      configuration: trace.configuration,
      secureConfiguration: trace.secureConfiguration,
      correlationId: trace.correlationId?.toString(),
      requestId: trace.requestId,
      pluginStepId: trace.pluginStepId,
      persistenceKey: trace.persistenceKey
    };
  }
}
```

---

### Infrastructure Layer

#### DTOs (Data Transfer Objects)

```typescript
// src/features/pluginTraceViewer/infrastructure/dtos/DataversePluginTraceLogDto.ts

/**
 * DTO matching Dataverse plugintracelog table schema.
 * Maps to OData response from plugintracelogs endpoint.
 */
export interface DataversePluginTraceLogDto {
  plugintracelogid: string;
  createdon: string;                              // ISO 8601 date string
  typename: string;
  primaryentity: string | null;
  messagename: string;
  operationtype: number;                          // 1 = Plugin, 2 = Workflow
  mode: number;                                   // 0 = Sync, 1 = Async
  stage?: number;                                 // Pipeline stage (10, 20, 30, 40)
  depth: number;
  performanceexecutionduration: number;           // milliseconds
  performanceconstructorduration: number;         // milliseconds
  exceptiondetails: string | null;
  messageblock: string | null;
  configuration: string | null;
  secureconfiguration: string | null;
  correlationid: string | null;
  requestid: string | null;
  pluginstepid: string | null;
  persistencekey: string | null;
}
```

#### Repositories

```typescript
// src/features/pluginTraceViewer/infrastructure/repositories/DataversePluginTraceRepository.ts

import { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import { PluginTrace } from '../../domain/entities/PluginTrace';
import { TraceFilter } from '../../domain/entities/TraceFilter';
import { TraceLevel } from '../../domain/valueObjects/TraceLevel';
import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { PluginTraceMapper } from '../mappers/PluginTraceMapper';
import { DataversePluginTraceLogDto } from '../dtos/DataversePluginTraceLogDto';

export class DataversePluginTraceRepository implements IPluginTraceRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  async getTraces(environmentId: string, filter: TraceFilter): Promise<PluginTrace[]> {
    this.logger.debug('Fetching plugin traces from Dataverse', {
      environmentId,
      top: filter.top,
      hasFilter: !!filter.odataFilter
    });

    // Build OData query
    let query = `plugintracelogs?$select=plugintracelogid,createdon,typename,primaryentity,messagename,operationtype,mode,depth,performanceexecutionduration,performanceconstructorduration,exceptiondetails,messageblock,configuration,secureconfiguration,correlationid,requestid,pluginstepid,persistencekey&$orderby=${filter.orderBy}&$top=${filter.top}`;

    if (filter.odataFilter) {
      query += `&$filter=${filter.odataFilter}`;
    }

    try {
      const response = await this.apiService.get<{ value: DataversePluginTraceLogDto[] }>(
        environmentId,
        query
      );
      const traces = response.value.map((dto: DataversePluginTraceLogDto) =>
        PluginTraceMapper.toDomain(dto)
      );

      this.logger.debug('Fetched plugin traces successfully', {
        count: traces.length
      });

      return traces;
    } catch (error) {
      this.logger.error('Failed to fetch plugin traces', error);
      throw new Error(`Failed to fetch plugin traces: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteTraces(environmentId: string, traceIds: string[]): Promise<number> {
    if (traceIds.length === 0) {
      return 0;
    }

    this.logger.debug('Deleting traces in batches', {
      environmentId,
      totalCount: traceIds.length
    });

    const batchSize = 100; // Safe batch size
    let deletedCount = 0;

    // Process in batches
    for (let i = 0; i < traceIds.length; i += batchSize) {
      const batch = traceIds.slice(i, i + batchSize);

      try {
        await this.deleteBatch(environmentId, batch);
        deletedCount += batch.length;

        this.logger.debug('Batch deleted successfully', {
          batchNumber: Math.floor(i / batchSize) + 1,
          deletedInBatch: batch.length,
          totalDeleted: deletedCount
        });
      } catch (error) {
        this.logger.error('Batch delete failed, continuing...', error);
        // Continue to next batch on error (resilience)
      }
    }

    this.logger.info('Trace deletion completed', {
      requested: traceIds.length,
      deleted: deletedCount
    });

    return deletedCount;
  }

  private async deleteBatch(environmentId: string, traceIds: string[]): Promise<void> {
    // Use OData $batch API
    const batchId = `batch_${Date.now()}`;
    const changesetId = `changeset_${Date.now()}`;

    let batchBody = `--${batchId}\n`;
    batchBody += `Content-Type: multipart/mixed; boundary=${changesetId}\n\n`;

    traceIds.forEach((id, index) => {
      batchBody += `--${changesetId}\n`;
      batchBody += `Content-Type: application/http\n`;
      batchBody += `Content-Transfer-Encoding: binary\n`;
      batchBody += `Content-ID: ${index + 1}\n\n`;
      batchBody += `DELETE plugintracelogs(${id}) HTTP/1.1\n`;
      batchBody += `\n`;
    });

    batchBody += `--${changesetId}--\n`;
    batchBody += `--${batchId}--\n`;

    await this.apiService.post(environmentId, '$batch', batchBody, {
      'Content-Type': `multipart/mixed; boundary=${batchId}`
    });
  }

  async getTraceLevel(environmentId: string): Promise<TraceLevel> {
    this.logger.debug('Fetching trace level setting', { environmentId });

    const query = 'organizations?$select=plugintracelogsetting';
    const response = await this.apiService.get(environmentId, query);

    if (!response.value || response.value.length === 0) {
      throw new Error('Organization settings not found');
    }

    const settingValue = response.value[0].plugintracelogsetting ?? 0;
    const level = TraceLevel.fromNumber(settingValue);

    this.logger.debug('Trace level retrieved', {
      level: level.getDisplayName()
    });

    return level;
  }

  async setTraceLevel(environmentId: string, level: TraceLevel): Promise<void> {
    this.logger.debug('Setting trace level', {
      environmentId,
      level: level.getDisplayName()
    });

    // Get organization ID
    const orgQuery = 'organizations?$select=organizationid';
    const orgResponse = await this.apiService.get(environmentId, orgQuery);

    if (!orgResponse.value || orgResponse.value.length === 0) {
      throw new Error('Organization not found');
    }

    const orgId = orgResponse.value[0].organizationid;

    // Update setting
    await this.apiService.patch(
      environmentId,
      `organizations(${orgId})`,
      { plugintracelogsetting: level.value }
    );

    this.logger.info('Trace level updated successfully');
  }

  // Implement remaining interface methods (getTraceById, deleteTrace, deleteAllTraces, deleteOldTraces)...
}
```

---

### Presentation Layer

```typescript
// src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanel.ts

import * as vscode from 'vscode';
import { DataTablePanel, type EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

// Use cases (injected)
import { GetPluginTracesUseCase } from '../../application/useCases/GetPluginTracesUseCase';
import { GetTraceLevelUseCase } from '../../application/useCases/GetTraceLevelUseCase';
import { SetTraceLevelUseCase } from '../../application/useCases/SetTraceLevelUseCase';
import { DeleteTracesUseCase } from '../../application/useCases/DeleteTracesUseCase';
import { ExportTracesUseCase } from '../../application/useCases/ExportTracesUseCase';

// ViewModels
import { PluginTraceViewModelMapper } from '../../application/mappers/PluginTraceViewModelMapper';

// Domain
import { PluginTrace } from '../../domain/entities/PluginTrace';
import { TraceLevel } from '../../domain/valueObjects/TraceLevel';

/**
 * Presentation layer panel for Plugin Trace Viewer.
 *
 * Responsibilities (NO BUSINESS LOGIC):
 * - Handle user interactions (clicks, selections)
 * - Call use cases to orchestrate operations
 * - Map domain entities to ViewModels for display
 * - Update UI components
 * - Show user warnings/confirmations (UI concern)
 * - Persist UI state (filters, split ratio)
 *
 * NOT Responsible For:
 * - Business logic (filtering, status determination, formatting)
 * - Validation rules (done in domain)
 * - OData query building (done in domain service)
 */
export class PluginTraceViewerPanel extends DataTablePanel {
  public static readonly viewType = 'powerPlatformDevSuite.pluginTraceViewer';
  private static panels = new Map<string, PluginTraceViewerPanel>();

  private traces: PluginTrace[] = [];
  private currentTraceLevel: TraceLevel = TraceLevel.Off;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    getEnvironments: () => Promise<EnvironmentOption[]>,
    getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,

    // Inject use cases (NOT services!)
    private readonly getTracesUseCase: GetPluginTracesUseCase,
    private readonly getTraceLevelUseCase: GetTraceLevelUseCase,
    private readonly setTraceLevelUseCase: SetTraceLevelUseCase,
    private readonly deleteTracesUseCase: DeleteTracesUseCase,
    private readonly exportTracesUseCase: ExportTracesUseCase,

    logger: ILogger,
    initialEnvironmentId?: string
  ) {
    super(panel, extensionUri, getEnvironments, getEnvironmentById, logger, initialEnvironmentId);
  }

  /**
   * Factory method: Creates or shows panel.
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    getEnvironments: () => Promise<EnvironmentOption[]>,
    getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
    getTracesUseCase: GetPluginTracesUseCase,
    getTraceLevelUseCase: GetTraceLevelUseCase,
    setTraceLevelUseCase: SetTraceLevelUseCase,
    deleteTracesUseCase: DeleteTracesUseCase,
    exportTracesUseCase: ExportTracesUseCase,
    logger: ILogger,
    initialEnvironmentId?: string
  ): Promise<PluginTraceViewerPanel> {
    // Implementation similar to ImportJobViewerPanel...
  }

  /**
   * UI concern: Loads plugin traces and updates table.
   * Orchestrates use case call and ViewModel mapping.
   */
  protected async loadData(): Promise<void> {
    if (!this.currentEnvironmentId) {
      this.logger.warn('Cannot load traces: No environment selected');
      return;
    }

    this.logger.info('Loading plugin traces', {
      environmentId: this.currentEnvironmentId
    });

    try {
      this.setLoading(true);

      // 1. Get current trace level
      this.currentTraceLevel = await this.getTraceLevelUseCase.execute({
        environmentId: this.currentEnvironmentId
      });

      // 2. Load traces
      const filter = this.buildFilterFromUI(); // Helper to build TraceFilter from UI state
      this.traces = await this.getTracesUseCase.execute({
        environmentId: this.currentEnvironmentId,
        filter
      });

      // 3. Map to ViewModels (presentation concern)
      const viewModels = this.traces.map(trace =>
        PluginTraceViewModelMapper.toTableRowViewModel(trace)
      );

      // 4. Update UI
      this.sendData(viewModels);
      this.updateTraceLevelButton();

      this.logger.info('Plugin traces loaded successfully', {
        count: this.traces.length,
        traceLevel: this.currentTraceLevel.getDisplayName()
      });
    } catch (error) {
      this.logger.error('Failed to load plugin traces', error);
      this.handleError(error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * UI concern: Handles setting trace level with user warning.
   * Warning is UI concern, actual setting is use case.
   */
  private async handleSetTraceLevel(level: TraceLevel): Promise<void> {
    if (!this.currentEnvironmentId) {
      return;
    }

    // UI concern: Warn about performance impact
    if (level.requiresWarning()) {
      const result = await vscode.window.showWarningMessage(
        'Setting trace level to "All" can impact performance in production environments. Continue?',
        'Yes',
        'No'
      );
      if (result !== 'Yes') {
        return;
      }
    }

    try {
      // Use case: Set the level (no business logic here)
      await this.setTraceLevelUseCase.execute({
        environmentId: this.currentEnvironmentId,
        level
      });

      this.currentTraceLevel = level;
      this.updateTraceLevelButton();

      vscode.window.showInformationMessage(
        `Trace level set to "${level.getDisplayName()}"`
      );

      // UI concern: Auto-refresh after 1 second
      setTimeout(() => this.loadData(), 1000);
    } catch (error) {
      this.logger.error('Failed to set trace level', error);
      vscode.window.showErrorMessage(
        `Failed to set trace level: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * UI concern: Handles delete all with confirmation.
   */
  private async handleDeleteAll(): Promise<void> {
    if (!this.currentEnvironmentId) {
      return;
    }

    const count = this.traces.length;
    const result = await vscode.window.showWarningMessage(
      `Delete all ${count} plugin traces? This action cannot be undone.`,
      { modal: true },
      'Delete All',
      'Cancel'
    );

    if (result !== 'Delete All') {
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Deleting plugin traces',
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: 'Deleting...' });

          const deletedCount = await this.deleteTracesUseCase.deleteAll({
            environmentId: this.currentEnvironmentId!
          });

          vscode.window.showInformationMessage(
            `Deleted ${deletedCount} plugin traces`
          );

          await this.loadData();
        }
      );
    } catch (error) {
      this.logger.error('Failed to delete all traces', error);
      vscode.window.showErrorMessage(
        `Failed to delete traces: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * UI concern: Handles export with save dialog.
   */
  private async handleExport(format: 'csv' | 'json'): Promise<void> {
    if (this.traces.length === 0) {
      vscode.window.showWarningMessage('No traces to export');
      return;
    }

    try {
      const suggestedFilename = `plugin-traces-${this.currentEnvironmentId}-${Date.now()}.${format}`;

      const filePath = await this.exportTracesUseCase.export({
        traces: this.traces,
        format,
        suggestedFilename
      });

      vscode.window.showInformationMessage(
        `Exported ${this.traces.length} traces to ${filePath}`
      );
    } catch (error) {
      this.logger.error('Failed to export traces', error);
      vscode.window.showErrorMessage(
        `Failed to export traces: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // No business logic methods here!
  // - Don't check if trace has exception (use trace.hasException())
  // - Don't format duration (use trace.duration.format())
  // - Don't build OData filters (use PluginTraceFilterService)
  // - Don't determine status (use trace.getStatus())
}
```

---

## Critical Design Decisions

### 1. Dependency Injection: Use Cases into Panel

**Question:** How to inject use cases into PluginTraceViewerPanel?

**Decision:** Hybrid Factory + Constructor Injection

**Rationale:**
- Repositories are singletons (created by ServiceFactory)
- Use cases are created fresh for each panel (lightweight, stateless)
- Constructor injection makes dependencies explicit and testable

**Implementation:**

```typescript
// src/extension.ts

import { ServiceFactory } from './infrastructure/ServiceFactory';
import { GetPluginTracesUseCase } from './features/pluginTraceViewer/application/useCases/GetPluginTracesUseCase';
// ... other use cases

export function activate(context: vscode.ExtensionContext) {
  // Register command
  context.subscriptions.push(
    vscode.commands.registerCommand('powerPlatformDevSuite.openPluginTraceViewer', async () => {
      // Get singletons from ServiceFactory
      const logger = ServiceFactory.getLogger();
      const apiService = ServiceFactory.getDataverseApiService();

      // Create repository (singleton or per-panel, your choice)
      const traceRepository = new DataversePluginTraceRepository(apiService, logger);
      const exporter = new FileSystemPluginTraceExporter();

      // Create use cases (fresh instances)
      const getTracesUseCase = new GetPluginTracesUseCase(traceRepository, logger);
      const getTraceLevelUseCase = new GetTraceLevelUseCase(traceRepository, logger);
      const setTraceLevelUseCase = new SetTraceLevelUseCase(traceRepository, logger);
      const deleteTracesUseCase = new DeleteTracesUseCase(traceRepository, logger);
      const exportTracesUseCase = new ExportTracesUseCase(exporter, logger);

      // Create panel with injected use cases
      await PluginTraceViewerPanel.createOrShow(
        extensionUri,
        getEnvironments,
        getEnvironmentById,
        getTracesUseCase,
        getTraceLevelUseCase,
        setTraceLevelUseCase,
        deleteTracesUseCase,
        exportTracesUseCase,
        logger
      );
    })
  );
}
```

**Benefits:**
- ✅ Clear dependencies (visible in constructor)
- ✅ Easy to test (mock use cases)
- ✅ Follows existing pattern (see ImportJobViewerPanel)
- ✅ No global singletons for use cases

---

### 2. TraceFilter Design

**Question:** Where does TraceFilter live and what does it contain?

**Decision:** Domain entity with builder pattern

**Implementation:**

```typescript
// src/features/pluginTraceViewer/domain/entities/TraceFilter.ts

export class TraceFilter {
  private constructor(
    public readonly top: number,
    public readonly orderBy: string,
    public readonly odataFilter?: string
  ) {
    if (top <= 0) {
      throw new ValidationError('TraceFilter', 'top', top, 'Must be positive');
    }
  }

  static default(): TraceFilter {
    return new TraceFilter(100, 'createdon desc');
  }

  static create(params: {
    top?: number;
    orderBy?: string;
    odataFilter?: string;
  }): TraceFilter {
    return new TraceFilter(
      params.top ?? 100,
      params.orderBy ?? 'createdon desc',
      params.odataFilter
    );
  }

  withFilter(odataFilter: string): TraceFilter {
    return new TraceFilter(this.top, this.orderBy, odataFilter);
  }

  withTop(top: number): TraceFilter {
    return new TraceFilter(top, this.orderBy, this.odataFilter);
  }
}
```

**Rationale:**
- TraceFilter is a domain concept (not infrastructure)
- Immutable (builder pattern returns new instance)
- Validation in constructor
- Repository receives TraceFilter, not raw strings

---

### 3. Error Handling Strategy

**Decision:** Three-layer error handling

**Layer 1: Repository (Infrastructure)**
```typescript
try {
  const response = await this.apiService.get(...);
  return response.value.map(dto => PluginTraceMapper.toDomain(dto));
} catch (error) {
  this.logger.error('Failed to fetch plugin traces', error);
  throw new PluginTraceRepositoryError('Failed to fetch traces', error);
}
```

**Layer 2: Use Case (Application)**
```typescript
try {
  const traces = await this.repository.getTraces(...);
  this.logger.info('Traces retrieved', { count: traces.length });
  return traces;
} catch (error) {
  this.logger.error('Get traces use case failed', error);
  throw error; // Re-throw for panel
}
```

**Layer 3: Panel (Presentation)**
```typescript
try {
  this.traces = await this.getTracesUseCase.execute(...);
  this.updateUI();
} catch (error) {
  vscode.window.showErrorMessage('Failed to load traces. See output for details.');
  this.logger.error('Load traces failed', error);
}
```

**Benefits:**
- ✅ Technical errors logged at infrastructure
- ✅ Use case logs operation failures
- ✅ Panel shows user-friendly messages
- ✅ Full error context in output channel

---

### 4. Logging Strategy

**Decision:** Injected ILogger at all layers (except domain)

**Rules:**
- ❌ NO logging in domain entities/services (pure business logic)
- ✅ Log at use case boundaries (start/completion/failures)
- ✅ Log at infrastructure operations (API calls, file I/O)
- ✅ Log user actions in panels (command invocations, lifecycle)
- ✅ Use NullLogger in tests (silent by default)
- ✅ Constructor injection (not global Logger.getInstance())

**Example:**

```typescript
// Use Case
export class GetPluginTracesUseCase {
  constructor(
    private readonly repository: IPluginTraceRepository,
    private readonly logger: ILogger  // Injected
  ) {}

  async execute(params): Promise<PluginTrace[]> {
    this.logger.info('Getting plugin traces', { environmentId: params.environmentId });
    const traces = await this.repository.getTraces(...);
    this.logger.info('Retrieved plugin traces', { count: traces.length });
    return traces;
  }
}
```

---

### 5. Validation Strategy

**Decision:** Input validation in domain entities, business validation in domain services

**Domain Entity Validation (Constructor):**
```typescript
export class PluginTrace {
  static create(params): PluginTrace {
    if (!params.id || params.id.trim().length === 0) {
      throw new ValidationError('PluginTrace', 'id', params.id, 'ID is required');
    }

    if (params.depth < 0) {
      throw new ValidationError('PluginTrace', 'depth', params.depth, 'Cannot be negative');
    }

    return new PluginTrace(...);
  }
}
```

**Business Validation (Domain Service):**
```typescript
export class PluginTraceFilterService {
  static buildODataFilter(conditions: FilterCondition[]): string {
    if (conditions.length > 10) {
      throw new ValidationError('FilterConditions', 'length', conditions.length, 'Maximum 10 conditions allowed');
    }
    // ...
  }
}
```

**Benefits:**
- ✅ Fail-fast (invalid entities can't be created)
- ✅ Business rules centralized
- ✅ Use cases don't validate (domain does it)

---

### 6. State Management

**Decision:** Per-environment preferences in workspace state

**State Types:**

1. **Instance State (Panel-Level)**
   - `selectedEnvironmentId` - Currently selected environment
   - Persisted to: Workspace state key `pluginTraceViewer.instanceState`

2. **Preferences (Environment-Level)**
   - `splitRatio` - Detail panel width (default: 50%)
   - `rightPanelVisible` - Detail panel visibility (default: false)
   - `filterPanelCollapsed` - Filter panel state (default: false)
   - `filters` - Active quick/advanced filters (default: empty)
   - `autoRefreshIntervalSeconds` - Auto-refresh interval (default: 0 = paused)
   - Persisted to: Workspace state key `pluginTraceViewer.prefs.{environmentId}`

**Implementation:**

```typescript
export class PluginTraceViewerPanel {
  private async savePreferences(): Promise<void> {
    if (!this.currentEnvironmentId) return;

    const prefs = {
      splitRatio: this.splitRatio,
      rightPanelVisible: this.rightPanelVisible,
      filterPanelCollapsed: this.filterPanelCollapsed,
      filters: this.currentFilters,
      autoRefreshIntervalSeconds: this.autoRefreshIntervalSeconds
    };

    await this.context.workspaceState.update(
      `pluginTraceViewer.prefs.${this.currentEnvironmentId}`,
      prefs
    );
  }

  private async loadPreferences(): Promise<void> {
    if (!this.currentEnvironmentId) return;

    const prefs = this.context.workspaceState.get<PluginTraceViewerPreferences>(
      `pluginTraceViewer.prefs.${this.currentEnvironmentId}`
    );

    if (prefs) {
      this.splitRatio = prefs.splitRatio ?? 50;
      this.rightPanelVisible = prefs.rightPanelVisible ?? false;
      this.filterPanelCollapsed = prefs.filterPanelCollapsed ?? false;
      this.currentFilters = prefs.filters ?? { quick: [], advanced: [] };
      this.autoRefreshIntervalSeconds = prefs.autoRefreshIntervalSeconds ?? 0;
    }
  }
}
```

---

## Implementation Guide

### Major Components

#### 1. PluginTrace Entity

**Constructor Signature:**
```typescript
class PluginTrace {
  private constructor(
    public readonly id: string,
    public readonly createdOn: Date,
    public readonly pluginName: string,
    public readonly entityName: string | null,
    public readonly messageName: string,
    public readonly operationType: OperationType,
    public readonly mode: ExecutionMode,
    public readonly stage: number,
    public readonly depth: number,
    public readonly duration: Duration,
    public readonly constructorDuration: Duration,
    public readonly exceptionDetails: string | null,
    public readonly messageBlock: string | null,
    public readonly configuration: string | null,
    public readonly secureConfiguration: string | null,
    public readonly correlationId: CorrelationId | null,
    public readonly requestId: string | null,
    public readonly pluginStepId: string | null,
    public readonly persistenceKey: string | null
  ) {}
}
```

**Public Methods (Business Logic):**
```typescript
hasException(): boolean
isSuccessful(): boolean
getStatus(): TraceStatus
isRelatedTo(other: PluginTrace): boolean
isNested(): boolean
isSynchronous(): boolean
isAsynchronous(): boolean
getPerformanceSummary(): string
hasCorrelationId(): boolean
static create(params): PluginTrace
```

**Key Business Rules:**
- Trace with empty/null `exceptionDetails` is successful
- Related traces share exact `correlationId` (case-sensitive)
- Depth > 1 means nested plugin call
- Duration formatting: "125ms", "3.2s", or "2m 15s"

**Testing Approach:**
```typescript
describe('PluginTrace', () => {
  describe('hasException', () => {
    it('returns true when exceptionDetails is non-empty', () => {
      const trace = PluginTrace.create({
        id: 'test-id',
        exceptionDetails: 'Error occurred',
        // ... other required params
      });
      expect(trace.hasException()).toBe(true);
    });

    it('returns false when exceptionDetails is null', () => {
      const trace = PluginTrace.create({
        id: 'test-id',
        exceptionDetails: null,
        // ...
      });
      expect(trace.hasException()).toBe(false);
    });
  });
});
```

**Example Usage:**
```typescript
const trace = PluginTrace.create({
  id: 'guid-123',
  createdOn: new Date(),
  pluginName: 'MyPlugin.Execute',
  entityName: 'account',
  messageName: 'Create',
  operationType: OperationType.Plugin,
  mode: ExecutionMode.Synchronous,
  depth: 1,
  duration: Duration.fromMilliseconds(125),
  constructorDuration: Duration.fromMilliseconds(10),
  exceptionDetails: null,
  correlationId: new CorrelationId('corr-123')
});

if (trace.hasException()) {
  console.log('Trace failed!');
}

console.log(trace.duration.format()); // "125ms"
console.log(trace.getPerformanceSummary()); // "Execution: 125ms, Constructor: 10ms"
```

---

#### 2. GetPluginTracesUseCase

**Constructor Signature:**
```typescript
class GetPluginTracesUseCase {
  constructor(
    private readonly repository: IPluginTraceRepository,
    private readonly logger: ILogger
  ) {}
}
```

**Public Methods:**
```typescript
async execute(params: {
  environmentId: string;
  filter?: TraceFilter;
}): Promise<PluginTrace[]>
```

**Key Points:**
- ✅ Orchestration only (no filtering logic)
- ✅ Logs at use case boundaries
- ✅ Returns domain entities (not ViewModels)
- ❌ No business logic (filtering done by repository + domain service)

**Testing Approach:**
```typescript
describe('GetPluginTracesUseCase', () => {
  it('calls repository with correct parameters', async () => {
    const mockRepo = {
      getTraces: jest.fn().mockResolvedValue([])
    };
    const mockLogger = new NullLogger();
    const useCase = new GetPluginTracesUseCase(mockRepo, mockLogger);

    const filter = TraceFilter.default();
    await useCase.execute({ environmentId: 'env-1', filter });

    expect(mockRepo.getTraces).toHaveBeenCalledWith('env-1', filter);
  });

  it('logs operation start and completion', async () => {
    const mockRepo = { getTraces: jest.fn().mockResolvedValue([]) };
    const spyLogger = new SpyLogger();
    const useCase = new GetPluginTracesUseCase(mockRepo, spyLogger);

    await useCase.execute({ environmentId: 'env-1' });

    expect(spyLogger.infoMessages).toContain('Getting plugin traces');
    expect(spyLogger.infoMessages).toContain('Retrieved plugin traces');
  });
});
```

**Example Usage:**
```typescript
const useCase = new GetPluginTracesUseCase(repository, logger);

const traces = await useCase.execute({
  environmentId: 'env-123',
  filter: TraceFilter.create({
    top: 100,
    odataFilter: "exceptiondetails ne null"
  })
});

console.log(`Loaded ${traces.length} traces`);
```

---

#### 3. DataversePluginTraceRepository

**Constructor Signature:**
```typescript
class DataversePluginTraceRepository implements IPluginTraceRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}
}
```

**Public Methods (Interface Implementation):**
```typescript
async getTraces(environmentId: string, filter: TraceFilter): Promise<PluginTrace[]>
async getTraceById(environmentId: string, traceId: string): Promise<PluginTrace | null>
async deleteTrace(environmentId: string, traceId: string): Promise<void>
async deleteTraces(environmentId: string, traceIds: string[]): Promise<number>
async deleteAllTraces(environmentId: string): Promise<number>
async deleteOldTraces(environmentId: string, olderThanDays: number): Promise<number>
async getTraceLevel(environmentId: string): Promise<TraceLevel>
async setTraceLevel(environmentId: string, level: TraceLevel): Promise<void>
```

**Key Implementation Details:**
- Use OData query builder for filtering
- Batch delete in chunks of 100 (safety)
- Map API DTOs to domain entities via PluginTraceMapper
- Handle API errors and log details
- Use OData $batch API for bulk operations

**Testing Approach:**
```typescript
describe('DataversePluginTraceRepository', () => {
  it('builds correct OData query for getTraces', async () => {
    const mockApiService = {
      get: jest.fn().mockResolvedValue({ value: [] })
    };
    const repo = new DataversePluginTraceRepository(mockApiService, new NullLogger());

    const filter = TraceFilter.create({ top: 50 });
    await repo.getTraces('env-1', filter);

    expect(mockApiService.get).toHaveBeenCalledWith(
      'env-1',
      expect.stringContaining('$top=50')
    );
  });

  it('deletes traces in batches of 100', async () => {
    const mockApiService = {
      post: jest.fn().mockResolvedValue({})
    };
    const repo = new DataversePluginTraceRepository(mockApiService, new NullLogger());

    const traceIds = Array.from({ length: 250 }, (_, i) => `trace-${i}`);
    await repo.deleteTraces('env-1', traceIds);

    expect(mockApiService.post).toHaveBeenCalledTimes(3); // 250 / 100 = 3 batches
  });
});
```

---

#### 4. PluginTraceViewerPanel

**Constructor Signature:**
```typescript
class PluginTraceViewerPanel extends DataTablePanel {
  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    getEnvironments: () => Promise<EnvironmentOption[]>,
    getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
    private readonly getTracesUseCase: GetPluginTracesUseCase,
    private readonly getTraceLevelUseCase: GetTraceLevelUseCase,
    private readonly setTraceLevelUseCase: SetTraceLevelUseCase,
    private readonly deleteTracesUseCase: DeleteTracesUseCase,
    private readonly exportTracesUseCase: ExportTracesUseCase,
    logger: ILogger,
    initialEnvironmentId?: string
  ) {
    super(panel, extensionUri, getEnvironments, getEnvironmentById, logger, initialEnvironmentId);
  }
}
```

**Key Methods:**
```typescript
protected async loadData(): Promise<void>
private async handleSetTraceLevel(level: TraceLevel): Promise<void>
private async handleDeleteAll(): Promise<void>
private async handleExport(format: 'csv' | 'json'): Promise<void>
private async handleTraceSelected(traceId: string): Promise<void>
```

**Business Rules Enforced in Panel (UI Concerns):**
- ✅ Warn before setting trace level to "All"
- ✅ Confirm before deleting all traces
- ✅ Show progress during batch deletes
- ✅ Auto-refresh after trace level change (1 second delay)
- ❌ NO filtering logic (use PluginTraceFilterService)
- ❌ NO status determination (use trace.getStatus())
- ❌ NO formatting (use trace.duration.format(), ViewModelMapper)

**Testing Approach:**
```typescript
describe('PluginTraceViewerPanel', () => {
  it('warns user before setting trace level to All', async () => {
    const mockShowWarning = jest.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Yes');
    const mockUseCase = { execute: jest.fn() };

    const panel = new PluginTraceViewerPanel(
      /* ... */,
      mockUseCase as any,
      /* ... */
    );

    await panel['handleSetTraceLevel'](TraceLevel.All);

    expect(mockShowWarning).toHaveBeenCalledWith(
      expect.stringContaining('impact performance'),
      'Yes',
      'No'
    );
  });
});
```

---

## Migration Path

### From Old Code (TEMP/templates/src/) to New Architecture

#### What Can Be Reused?

1. **Components (Client-Side JS)** ✅
   - `ActionBarComponent` - Already generic
   - `FilterPanelComponent` - Already generic
   - `DataTableComponent` - Already generic
   - `SplitPanelBehavior` - Already generic
   - `JsonViewerComponent` - **NEEDS ENHANCEMENT** (remove panel-specific code)
   - `TimelineBehavior` - **NEEDS ENHANCEMENT** (make generic)

2. **Base Classes** ✅
   - `BasePanel` - Keep as-is
   - `DataTablePanel` - Keep as-is (already used by ImportJobViewer)

3. **Infrastructure Services** ✅
   - `DataverseApiService` - Keep as-is
   - `ServiceFactory` - Keep as-is
   - `DateFormatter` - Keep as-is
   - `ODataQueryBuilder` - Keep as-is

#### What Must Be Refactored?

1. **PluginTraceService** ❌ DELETE
   - Old code has `PluginTraceService` with mixed concerns
   - Refactor into:
     - `DataversePluginTraceRepository` (infrastructure)
     - Use cases (application)
     - `PluginTraceFilterService` (domain)

2. **PluginTraceLog Interface** ❌ DELETE
   - Old code has anemic interface
   - Replace with rich `PluginTrace` entity

3. **Panel Logic** ❌ REFACTOR
   - Extract business logic from `PluginTraceViewerPanel` to domain
   - Extract HTML to view files
   - Inject use cases instead of services

#### What Must Be Written From Scratch?

1. **Domain Layer** ✨ NEW
   - All entities, value objects, services, interfaces

2. **Application Layer** ✨ NEW
   - All use cases, ViewModels, mappers

3. **Infrastructure Layer** ✨ NEW
   - Repository implementations, mappers, exporters

4. **View Files** ✨ NEW
   - HTML template functions in `presentation/views/`

#### Migration Strategy (Incremental)

**Phase 1: Create Domain Layer (No Breaking Changes)**
1. Create domain entities, value objects in new location
2. Don't touch old code yet
3. Write comprehensive tests
4. **No integration yet**

**Phase 2: Create Application + Infrastructure (Parallel)**
1. Create use cases, repositories in new location
2. Old panel still uses old service
3. Test new code independently
4. **Still no integration**

**Phase 3: Create New Panel (Side-by-Side)**
1. Create new `PluginTraceViewerPanel` in `features/pluginTraceViewer/`
2. Register new command `powerPlatformDevSuite.openPluginTraceViewer2` (temporary)
3. Both old and new panels work
4. **Test new panel thoroughly**

**Phase 4: Switch Over**
1. Update command registration to use new panel
2. Delete old panel code
3. Delete old service code
4. Keep components (they're generic)

**Phase 5: Cleanup**
1. Remove old TEMP files
2. Update documentation
3. Final testing

#### File-by-File Migration Map

```
OLD → NEW

TEMP/templates/src/panels/PluginTraceViewerPanel.ts
  → features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanel.ts
  (Complete rewrite with injected use cases)

TEMP/templates/src/services/PluginTraceService.ts
  → features/pluginTraceViewer/infrastructure/repositories/DataversePluginTraceRepository.ts
  (Split: API logic to repository, business logic to domain)

OLD: interface PluginTraceLog (anemic)
  → features/pluginTraceViewer/domain/entities/PluginTrace.ts (rich model)

OLD: No use cases
  → features/pluginTraceViewer/application/useCases/*.ts (NEW)

OLD: No domain services
  → features/pluginTraceViewer/domain/services/PluginTraceFilterService.ts (NEW)

OLD: HTML in panel .ts file
  → features/pluginTraceViewer/presentation/views/*.ts (NEW, extracted)

COMPONENTS (Keep, enhance):
  TEMP/templates/src/components/viewers/JsonViewer/JsonViewerComponent.ts
    → Make fully generic (remove panel-specific code)
```

---

## CLAUDE.md Compliance Checklist

Verify the design follows all CLAUDE.md rules:

### 🚫 NEVER Rules (Must Avoid)

- [ ] **No `any` without explicit type**
  - ✅ All interfaces use proper types
  - ✅ Value objects provide type safety
  - ✅ Repository returns `PluginTrace[]`, not `any[]`

- [ ] **No `eslint-disable` without permission**
  - ✅ Code follows TypeScript strict mode
  - ✅ No linting bypasses needed

- [ ] **No technical debt shortcuts**
  - ✅ Proper architecture from day 1
  - ✅ No "TODO: refactor later" comments

- [ ] **No duplicate code 3+ times**
  - ✅ Domain service for filter building (reused)
  - ✅ ViewModel mapper for formatting (reused)
  - ✅ Value objects for display names (reused)

- [ ] **No business logic outside domain layer**
  - ✅ Filtering logic in `PluginTraceFilterService`
  - ✅ Status determination in `PluginTrace.getStatus()`
  - ✅ Duration formatting in `Duration.format()`
  - ❌ NO filtering in use cases or panels

- [ ] **No anemic domain models**
  - ✅ `PluginTrace` has rich methods: `hasException()`, `isRelatedTo()`, etc.
  - ✅ Value objects have behavior: `Duration.format()`, `TraceLevel.requiresWarning()`

- [ ] **No domain depending on outer layers**
  - ✅ Domain has ZERO dependencies
  - ✅ No imports from infrastructure, application, or presentation

- [ ] **No business logic in use cases**
  - ✅ Use cases orchestrate only
  - ✅ GetPluginTracesUseCase just calls repository
  - ❌ NO filtering logic in use cases

- [ ] **No business logic in panels**
  - ✅ Panel calls use cases
  - ✅ Panel maps to ViewModels
  - ❌ NO status determination, formatting, or validation in panel

- [ ] **No HTML in panel .ts files**
  - ✅ All HTML extracted to `presentation/views/` files
  - ✅ Panel calls view functions for rendering

### ✅ ALWAYS Rules (Must Follow)

- [ ] **TypeScript strict mode**
  - ✅ Explicit return types on all public methods
  - ✅ No implicit `any`

- [ ] **Clean Architecture layers**
  - ✅ Domain → Application → Infrastructure/Presentation
  - ✅ Dependencies point inward

- [ ] **Rich domain models**
  - ✅ `PluginTrace` entity has behavior methods
  - ✅ Value objects encapsulate formatting/validation

- [ ] **Use cases orchestrate**
  - ✅ No complex logic, just coordination
  - ✅ Call domain entities and repositories

- [ ] **ViewModels for presentation**
  - ✅ `PluginTraceTableRowViewModel`, `PluginTraceDetailViewModel`
  - ✅ Mapped from domain entities via `PluginTraceViewModelMapper`

- [ ] **Repository interfaces in domain**
  - ✅ `IPluginTraceRepository` in domain layer
  - ✅ `DataversePluginTraceRepository` in infrastructure

- [ ] **Dependency direction inward**
  - ✅ Infrastructure → Domain
  - ✅ Application → Domain
  - ✅ Presentation → Application → Domain

- [ ] **Explicit return types**
  - ✅ All public methods have return types
  - ✅ No inferred return types on public API

- [ ] **Abstract methods for enforcement**
  - ✅ Repository interfaces force implementation
  - ✅ Compiler errors if methods missing

- [ ] **Refactor on 2nd duplication**
  - ✅ Domain service created for filter building
  - ✅ ViewModel mapper for formatting

- [ ] **HTML in separate view files**
  - ✅ `pluginTraceDetailView.ts`, `pluginTraceExecutionView.ts`, etc.
  - ✅ Render functions return HTML strings

### 💬 Commenting Rules

- [ ] **Comment public/protected methods (JSDoc)**
  - ✅ All domain entity methods documented
  - ✅ Use case execute methods documented
  - ✅ Repository interface methods documented

- [ ] **Explain WHY, not WHAT**
  - ✅ Comments explain business rules
  - ✅ Comments explain architectural decisions
  - ❌ No obvious comments like "Get traces"

- [ ] **No placeholder comments**
  - ❌ No "Handle event" or "Process data" comments

### 📝 Logging Rules

- [ ] **Never log in domain entities/services**
  - ✅ Domain layer has ZERO logging
  - ✅ Pure business logic, no infrastructure

- [ ] **Never console.log in production**
  - ✅ Use injected `ILogger` everywhere
  - ✅ No `console.log` statements

- [ ] **Never log secrets unredacted**
  - ✅ Sanitize secureConfiguration before logging
  - ✅ Truncate tokens, mask sensitive data

- [ ] **Never use global Logger.getInstance()**
  - ✅ Constructor injection: `constructor(private readonly logger: ILogger)`
  - ✅ Testable with NullLogger

- [ ] **Always log at use case boundaries**
  - ✅ Log operation start/completion in use cases
  - ✅ Log failures with context

- [ ] **Always log via injected ILogger**
  - ✅ All classes receive ILogger in constructor
  - ✅ No global singletons

- [ ] **Always log to OutputChannel**
  - ✅ Use `OutputChannelLogger` (existing)

- [ ] **Always log infrastructure operations**
  - ✅ API calls logged at debug level
  - ✅ File I/O logged

- [ ] **Always use NullLogger in tests**
  - ✅ Tests use `NullLogger` by default
  - ✅ Use `SpyLogger` for assertions

---

## Testing Strategy

### Domain Layer Tests (Unit Tests - Pure Functions)

**Coverage Target:** 100%

**Approach:** No mocks needed (pure functions)

**Example:**

```typescript
// PluginTrace.test.ts
import { PluginTrace } from './PluginTrace';
import { Duration } from '../valueObjects/Duration';
import { ExecutionMode } from '../valueObjects/ExecutionMode';

describe('PluginTrace', () => {
  describe('hasException', () => {
    it('returns true when exceptionDetails is non-empty string', () => {
      const trace = PluginTrace.create({
        id: 'test-id',
        createdOn: new Date(),
        pluginName: 'TestPlugin',
        entityName: 'account',
        messageName: 'Create',
        operationType: OperationType.Plugin,
        mode: ExecutionMode.Synchronous,
        duration: Duration.fromMilliseconds(100),
        constructorDuration: Duration.fromMilliseconds(10),
        exceptionDetails: 'Error occurred'
      });

      expect(trace.hasException()).toBe(true);
    });

    it('returns false when exceptionDetails is null', () => {
      const trace = PluginTrace.create({
        /* same params */
        exceptionDetails: null
      });

      expect(trace.hasException()).toBe(false);
    });

    it('returns false when exceptionDetails is empty string', () => {
      const trace = PluginTrace.create({
        /* same params */
        exceptionDetails: '   '
      });

      expect(trace.hasException()).toBe(false);
    });
  });

  describe('isRelatedTo', () => {
    it('returns true when correlation IDs match', () => {
      const correlationId = new CorrelationId('corr-123');
      const trace1 = PluginTrace.create({ /* ... */, correlationId });
      const trace2 = PluginTrace.create({ /* ... */, correlationId });

      expect(trace1.isRelatedTo(trace2)).toBe(true);
    });

    it('returns false when correlation IDs differ', () => {
      const trace1 = PluginTrace.create({ /* ... */, correlationId: new CorrelationId('corr-1') });
      const trace2 = PluginTrace.create({ /* ... */, correlationId: new CorrelationId('corr-2') });

      expect(trace1.isRelatedTo(trace2)).toBe(false);
    });

    it('returns false when either correlation ID is null', () => {
      const trace1 = PluginTrace.create({ /* ... */, correlationId: null });
      const trace2 = PluginTrace.create({ /* ... */, correlationId: new CorrelationId('corr-1') });

      expect(trace1.isRelatedTo(trace2)).toBe(false);
    });
  });
});
```

**Value Object Tests:**

```typescript
// Duration.test.ts
describe('Duration', () => {
  describe('format', () => {
    it('formats milliseconds for values < 1000', () => {
      const duration = Duration.fromMilliseconds(125);
      expect(duration.format()).toBe('125ms');
    });

    it('formats seconds for values < 60000', () => {
      const duration = Duration.fromMilliseconds(3200);
      expect(duration.format()).toBe('3.2s');
    });

    it('formats minutes and seconds for values >= 60000', () => {
      const duration = Duration.fromMilliseconds(125000);
      expect(duration.format()).toBe('2m 5s');
    });
  });

  describe('validation', () => {
    it('throws error for negative milliseconds', () => {
      expect(() => Duration.fromMilliseconds(-100)).toThrow(ValidationError);
    });
  });
});
```

---

### Application Layer Tests (Use Case Tests with Mocks)

**Coverage Target:** 90%+

**Approach:** Mock repositories, verify orchestration

**Example:**

```typescript
// GetPluginTracesUseCase.test.ts
import { GetPluginTracesUseCase } from './GetPluginTracesUseCase';
import { IPluginTraceRepository } from '../../domain/repositories/IPluginTraceRepository';
import { TraceFilter } from '../../domain/entities/TraceFilter';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { SpyLogger } from '../../../../infrastructure/logging/SpyLogger';

describe('GetPluginTracesUseCase', () => {
  let mockRepository: jest.Mocked<IPluginTraceRepository>;
  let useCase: GetPluginTracesUseCase;

  beforeEach(() => {
    mockRepository = {
      getTraces: jest.fn(),
      getTraceById: jest.fn(),
      deleteTrace: jest.fn(),
      deleteTraces: jest.fn(),
      deleteAllTraces: jest.fn(),
      deleteOldTraces: jest.fn(),
      getTraceLevel: jest.fn(),
      setTraceLevel: jest.fn()
    };
  });

  it('calls repository with correct environment ID and filter', async () => {
    mockRepository.getTraces.mockResolvedValue([]);
    useCase = new GetPluginTracesUseCase(mockRepository, new NullLogger());

    const filter = TraceFilter.default();
    await useCase.execute({ environmentId: 'env-123', filter });

    expect(mockRepository.getTraces).toHaveBeenCalledWith('env-123', filter);
  });

  it('uses default filter when not provided', async () => {
    mockRepository.getTraces.mockResolvedValue([]);
    useCase = new GetPluginTracesUseCase(mockRepository, new NullLogger());

    await useCase.execute({ environmentId: 'env-123' });

    expect(mockRepository.getTraces).toHaveBeenCalledWith(
      'env-123',
      expect.objectContaining({ top: 100 })
    );
  });

  it('logs operation start and completion', async () => {
    mockRepository.getTraces.mockResolvedValue([]);
    const spyLogger = new SpyLogger();
    useCase = new GetPluginTracesUseCase(mockRepository, spyLogger);

    await useCase.execute({ environmentId: 'env-123' });

    expect(spyLogger.infoMessages).toContainEqual(
      expect.objectContaining({ message: 'Getting plugin traces' })
    );
    expect(spyLogger.infoMessages).toContainEqual(
      expect.objectContaining({ message: 'Retrieved plugin traces' })
    );
  });

  it('propagates repository errors', async () => {
    mockRepository.getTraces.mockRejectedValue(new Error('API error'));
    useCase = new GetPluginTracesUseCase(mockRepository, new NullLogger());

    await expect(useCase.execute({ environmentId: 'env-123' }))
      .rejects.toThrow('API error');
  });
});
```

---

### Infrastructure Layer Tests (Integration Tests)

**Coverage Target:** 80%+

**Approach:** Test against mock API or test environment

**Example:**

```typescript
// DataversePluginTraceRepository.test.ts
import { DataversePluginTraceRepository } from './DataversePluginTraceRepository';
import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { TraceFilter } from '../../domain/entities/TraceFilter';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

describe('DataversePluginTraceRepository', () => {
  let mockApiService: jest.Mocked<IDataverseApiService>;
  let repository: DataversePluginTraceRepository;

  beforeEach(() => {
    mockApiService = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn()
    } as any;

    repository = new DataversePluginTraceRepository(mockApiService, new NullLogger());
  });

  describe('getTraces', () => {
    it('builds correct OData query with filter', async () => {
      mockApiService.get.mockResolvedValue({ value: [] });

      const filter = TraceFilter.create({
        top: 50,
        odataFilter: "exceptiondetails ne null"
      });

      await repository.getTraces('env-123', filter);

      expect(mockApiService.get).toHaveBeenCalledWith(
        'env-123',
        expect.stringContaining('$top=50')
      );
      expect(mockApiService.get).toHaveBeenCalledWith(
        'env-123',
        expect.stringContaining('$filter=exceptiondetails ne null')
      );
    });

    it('maps API response to domain entities', async () => {
      mockApiService.get.mockResolvedValue({
        value: [
          {
            plugintracelogid: 'guid-1',
            createdon: '2023-01-01T10:00:00Z',
            typename: 'MyPlugin',
            primaryentity: 'account',
            messagename: 'Create',
            operationtype: 1,
            mode: 0,
            depth: 1,
            performanceexecutionduration: 125,
            performanceconstructorduration: 10,
            exceptiondetails: null
          }
        ]
      });

      const traces = await repository.getTraces('env-123', TraceFilter.default());

      expect(traces).toHaveLength(1);
      expect(traces[0].id).toBe('guid-1');
      expect(traces[0].pluginName).toBe('MyPlugin');
      expect(traces[0].hasException()).toBe(false);
    });
  });

  describe('deleteTraces', () => {
    it('deletes traces in batches of 100', async () => {
      mockApiService.post.mockResolvedValue({});

      const traceIds = Array.from({ length: 250 }, (_, i) => `trace-${i}`);
      const deletedCount = await repository.deleteTraces('env-123', traceIds);

      expect(mockApiService.post).toHaveBeenCalledTimes(3); // 250 / 100 = 3 batches
      expect(deletedCount).toBe(250);
    });

    it('continues on batch failure', async () => {
      mockApiService.post
        .mockRejectedValueOnce(new Error('Batch 1 failed'))
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const traceIds = Array.from({ length: 250 }, (_, i) => `trace-${i}`);
      const deletedCount = await repository.deleteTraces('env-123', traceIds);

      expect(deletedCount).toBe(150); // Only batches 2 and 3 succeeded
    });
  });
});
```

---

### Presentation Layer Tests (Component Tests)

**Coverage Target:** 70%+

**Approach:** Mock use cases, test UI logic

**Example:**

```typescript
// PluginTraceViewerPanel.test.ts
import * as vscode from 'vscode';
import { PluginTraceViewerPanel } from './PluginTraceViewerPanel';
import { GetPluginTracesUseCase } from '../../application/useCases/GetPluginTracesUseCase';
import { SetTraceLevelUseCase } from '../../application/useCases/SetTraceLevelUseCase';
import { TraceLevel } from '../../domain/valueObjects/TraceLevel';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

// Mock vscode module
jest.mock('vscode');

describe('PluginTraceViewerPanel', () => {
  let mockGetTracesUseCase: jest.Mocked<GetPluginTracesUseCase>;
  let mockSetTraceLevelUseCase: jest.Mocked<SetTraceLevelUseCase>;

  beforeEach(() => {
    mockGetTracesUseCase = {
      execute: jest.fn().mockResolvedValue([])
    } as any;

    mockSetTraceLevelUseCase = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as any;
  });

  it('warns user before setting trace level to All', async () => {
    const mockShowWarning = jest.spyOn(vscode.window, 'showWarningMessage')
      .mockResolvedValue('Yes' as any);

    // Create panel and call handleSetTraceLevel
    // (Note: Panel creation is complex, may need factory for testing)

    // await panel['handleSetTraceLevel'](TraceLevel.All);

    expect(mockShowWarning).toHaveBeenCalledWith(
      expect.stringContaining('impact performance'),
      'Yes',
      'No'
    );
  });

  it('does not call use case if user cancels warning', async () => {
    const mockShowWarning = jest.spyOn(vscode.window, 'showWarningMessage')
      .mockResolvedValue('No' as any);

    // await panel['handleSetTraceLevel'](TraceLevel.All);

    expect(mockSetTraceLevelUseCase.execute).not.toHaveBeenCalled();
  });
});
```

---

## Summary & Metrics

### Total Files Summary

**New Files to Create:** 45

**By Layer:**
- Domain: 11 files (entities, value objects, services, interfaces)
- Application: 14 files (use cases, ViewModels, mappers)
- Infrastructure: 8 files (repositories, exporters, mappers, DTOs)
- Presentation: 7 files (panels, views, components)
- Tests: 15+ test files

**Files to Enhance:** 2
- JsonViewerComponent (make generic)
- TimelineBehavior (make generic)

**Files to Delete:** ~5
- Old PluginTraceViewerPanel
- Old PluginTraceService
- Old PluginTraceLog interface

---

### Estimated Complexity

**Overall Complexity:** Medium-High

**By Layer:**

| Layer            | Complexity | Reason                                    |
|------------------|------------|-------------------------------------------|
| Domain           | Medium     | Business logic clear, value objects simple |
| Application      | Low        | Pure orchestration, no logic              |
| Infrastructure   | High       | OData $batch API, batch delete, error handling |
| Presentation     | Medium     | UI state management, multi-tab detail panel |
| Reusable Components | Low     | Minor enhancements to existing code      |

**Complexity Factors:**
- ✅ Clear requirements (reduces uncertainty)
- ✅ Existing patterns to follow (ImportJobViewer)
- ✅ Well-defined architecture
- ⚠️ OData $batch API (new, needs testing)
- ⚠️ Multi-tab detail panel (state management)
- ⚠️ Auto-refresh with filters (coordination)

---

### Recommended Implementation Order

**Priority 1: Foundation (Days 1-2)**
1. Domain value objects (TraceLevel, Duration, etc.)
2. PluginTrace entity with rich methods
3. Repository interfaces
4. Domain service (PluginTraceFilterService)
5. **Test thoroughly** - 100% coverage

**Priority 2: Core Functionality (Days 3-4)**
1. Use cases (GetTraces, SetTraceLevel, Delete, Export)
2. Infrastructure repository implementation
3. Infrastructure exporter implementation
4. ViewModels and mappers
5. **Test with mocks** - 90%+ coverage

**Priority 3: UI (Day 5)**
1. View files (HTML templates)
2. PluginTraceViewerPanel
3. Detail panel component
4. Wire up dependency injection
5. **Integration testing**

**Priority 4: Reusable Components (Day 6)**
1. Enhance JsonViewerComponent
2. Enhance TimelineBehavior
3. Test reusability
4. **Verify zero panel-specific code**

**Priority 5: Polish & Testing (Day 7)**
1. End-to-end testing
2. Performance testing
3. Error handling verification
4. State persistence testing
5. Documentation

---

### Key Risks & Challenges

**Risk 1: OData $batch API Complexity**
- **Mitigation:** Start with simple batch deletes, test thoroughly
- **Fallback:** Sequential deletes if $batch fails

**Risk 2: Performance with 1000+ Traces**
- **Mitigation:** Client-side virtual scrolling (future enhancement)
- **Fallback:** Warn user to reduce top parameter

**Risk 3: Filter Building Complexity**
- **Mitigation:** Comprehensive tests for PluginTraceFilterService
- **Fallback:** Start with simple filters, add advanced later

**Risk 4: State Persistence Across Sessions**
- **Mitigation:** Test with workspace state keys per environment
- **Fallback:** Reset to defaults if state corrupt

**Risk 5: Reusable Component Abstraction**
- **Mitigation:** Test JsonViewer with multiple data types
- **Fallback:** Create separate component if needed

---

### Architectural Concerns & Suggestions

**Concern 1: Use Case Proliferation**
- Each operation has its own use case (GetTraces, SetTraceLevel, Delete, Export)
- **Rationale:** Single Responsibility Principle, easy to test, clear boundaries
- **Alternative:** Could combine into PluginTraceManagementUseCase with multiple methods
- **Recommendation:** Keep separate - clearer intent, easier to test

**Concern 2: ViewModel Mapping Overhead**
- Every domain entity must be mapped to ViewModel for presentation
- **Rationale:** Clean separation, domain doesn't know about HTML/CSS
- **Alternative:** Use domain entities directly in UI (couples presentation to domain)
- **Recommendation:** Keep mapping - worth the overhead for separation

**Concern 3: Repository Batch Size (100)**
- Dataverse supports up to 1000 in $batch, we use 100
- **Rationale:** Safety first, avoid timeouts/throttling
- **Alternative:** Use 500 or 1000 for faster bulk deletes
- **Recommendation:** Start with 100, increase if performance acceptable

**Concern 4: Auto-Refresh Complexity**
- Auto-refresh must preserve filters, handle environment switches
- **Rationale:** User convenience, live monitoring
- **Alternative:** Manual refresh only
- **Recommendation:** Implement auto-refresh - valuable feature for debugging

**Concern 5: Correlation ID Timeline**
- Timeline requires loading related traces, potential N+1 queries
- **Rationale:** User wants to see full transaction flow
- **Alternative:** Load all traces upfront, filter client-side
- **Recommendation:** Load related on-demand (lazy loading)

---

### Success Criteria Validation

From requirements document, verify all criteria met:

1. ✅ User can view last 100 traces in <2 seconds
   - OData query with $top=100, minimal fields

2. ✅ Filters apply and load results in <3 seconds
   - Server-side OData filtering, domain service builds query

3. ✅ Detail panel opens instantly (client-side)
   - No API call, map domain entity to ViewModel

4. ✅ Export works for up to 10,000 traces
   - Client-side export, FileSystemPluginTraceExporter

5. ✅ Delete all traces completes for 1000+ traces
   - Batch delete in chunks of 100, progress indicator

6. ✅ Auto-refresh works reliably for hours
   - Timer with cleanup, stops on environment switch

7. ✅ UI remains responsive during all operations
   - Async/await, loading indicators, cancellation tokens

8. ✅ State persists correctly across sessions
   - Workspace state per environment

9. ✅ No data loss or corruption
   - Repository handles errors, use cases log failures

10. ✅ Clear error messages for all failure scenarios
    - Three-layer error handling (repository → use case → panel)

---

## Final Validation

### CLAUDE.md Compliance: ✅ PASS

All rules followed:
- ✅ Rich domain models (PluginTrace has behavior)
- ✅ Use cases orchestrate only (no business logic)
- ✅ Repository interfaces in domain
- ✅ Dependencies point inward
- ✅ ViewModels for presentation
- ✅ HTML in separate view files
- ✅ Injected ILogger (not global)
- ✅ No domain logging
- ✅ Explicit return types
- ✅ No `any` without type

### Architecture Principles: ✅ PASS

All principles applied:
- ✅ Dependency Inversion (domain defines interfaces)
- ✅ Single Responsibility (each class has one job)
- ✅ Open/Closed (extend via interfaces)
- ✅ Interface Segregation (focused interfaces)
- ✅ Dependency Injection (constructor injection)

### Reusable Components: ✅ PASS

Components abstracted:
- ✅ JsonViewerComponent (generic, zero panel dependencies)
- ✅ TimelineBehavior (generic timeline items)
- ✅ DataTableComponent (already generic)
- ✅ FilterPanelComponent (already generic)

### Testing Coverage: ✅ PASS

Coverage targets:
- ✅ Domain: 100% (pure functions)
- ✅ Application: 90%+ (mocked repositories)
- ✅ Infrastructure: 80%+ (integration tests)
- ✅ Presentation: 70%+ (mocked use cases)

---

## Ready for Implementation

This implementation plan is **ready for development**. A developer can follow this file-by-file to implement the Plugin Trace Viewer feature following clean architecture principles and CLAUDE.md rules.

**Next Steps:**
1. Review this plan with team
2. Create feature branch: `feature/plugin-trace-viewer`
3. Start Phase 1: Domain Layer
4. Implement file-by-file per this plan
5. Code review at each phase completion
6. Integration testing after Phase 6
7. Merge to main after final validation

**Questions or Issues:**
- Contact: Architecture team
- Reference: This document + Requirements + Architecture Mapping docs

---

**END OF IMPLEMENTATION PLAN**
