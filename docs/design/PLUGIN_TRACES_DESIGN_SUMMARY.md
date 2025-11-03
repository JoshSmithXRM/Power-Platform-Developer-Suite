# Plugin Trace Viewer - Design Summary for Architect

## Executive Summary

This document provides a complete overview of the Plugin Trace Viewer feature requirements, clean architecture mapping, and reusable components for the architect to design the implementation.

**Documents:**
1. **PLUGIN_TRACES_REQUIREMENTS.md** - Complete functional requirements
2. **PLUGIN_TRACES_ARCHITECTURE_MAPPING.md** - Clean architecture layer mapping
3. **This document** - Summary + reusable components + next steps

---

## Feature Overview

The Plugin Trace Viewer is a diagnostic tool for viewing, filtering, analyzing, and managing Dataverse plugin execution traces. It's similar to the existing Solution Explorer but focused on runtime diagnostics.

**Key Capabilities:**
- View plugin execution traces with advanced filtering
- Analyze trace details across multiple tabs (Configuration, Execution, Timeline, Related, Raw Data)
- Manage trace level settings (Off/Exception/All)
- Delete traces (single, all, old)
- Export traces (CSV/JSON)
- Auto-refresh for live monitoring
- Timeline visualization for correlated traces

---

## Reusable Components (Critical for Abstraction)

### 1. JsonViewerComponent (HIGHEST PRIORITY)

**Current State:** Exists in `src/components/viewers/JsonViewer/`

**Required Changes:**
- ✅ Ensure ZERO panel-specific dependencies
- ✅ Generic interface accepting any JSON-serializable data
- ✅ CSS using variables (theme-aware, no hardcoded colors)
- ✅ Clean API: `setData(data: any)`, `getData()`, `clear()`

**Usage Locations:**
1. Plugin Trace Viewer - Raw Data tab
2. Solution Explorer - Entity details (future)
3. Any panel needing JSON display

**Interface:**
```typescript
interface JsonViewerConfig {
  id: string;
  data: any;
  collapsible?: boolean;
  showCopy?: boolean;
  maxHeight?: string | 'none';
  theme?: 'dark' | 'light' | 'auto';
}

class JsonViewerComponent {
  constructor(config: JsonViewerConfig);
  generateHTML(): string;
  setData(data: any): void;
  getData(): any;
  clear(): void;
  collapse(): void;
  expand(): void;
}
```

**Testing Reusability:**
- Can it display PluginTrace objects? ✓
- Can it display Solution metadata? ✓
- Can it display arbitrary API responses? ✓
- Does it have any reference to "trace", "plugin", or "solution"? ✗ (should be NO)

---

### 2. TimelineBehavior (Client-Side Component)

**Current State:** Exists in `TEMP/templates/resources/webview/js/components/TimelineBehavior.js`

**Required Changes:**
- ✅ Make generic (not plugin-trace specific)
- ✅ Accept any array of items with: `timestamp`, `label`, `status`, `id`
- ✅ Callback for item click
- ✅ CSS using variables

**Interface:**
```typescript
interface TimelineItem {
  id: string;
  timestamp: Date | string;
  label: string;
  status: 'success' | 'error' | 'warning' | 'info';
  duration?: string;
  metadata?: Record<string, string>;
}

interface TimelineConfig {
  containerId: string;
  items: TimelineItem[];
  onItemClick?: (id: string) => void;
  groupBy?: 'hour' | 'day' | 'none';
}

class TimelineBehavior {
  static renderTimeline(config: TimelineConfig): void;
}
```

**Usage Locations:**
1. Plugin Trace Viewer - Timeline tab (traces with same correlation ID)
2. Solution Import History - Timeline of import events (future)
3. Async Job Monitor - Timeline of job stages (future)

---

### 3. SplitPanelBehavior (Client-Side Component)

**Current State:** Exists in `resources/webview/js/components/SplitPanelBehavior.js`

**Status:** Already generic, but verify:
- ✅ No panel-specific code
- ✅ Works with any left/right panel content
- ✅ Persists split ratio
- ✅ Supports hiding/showing right panel

**Usage Locations:**
1. Plugin Trace Viewer - Main table + detail panel
2. Solution Explorer - Entity tree + details (future)
3. Any master-detail layout

---

### 4. FilterPanelComponent (Existing Component)

**Current State:** Exists in `src/components/panels/FilterPanel/`

**Status:** Already generic and reusable!

**Usage Locations:**
1. Plugin Trace Viewer
2. Solution Explorer (future)
3. Any list/table that needs filtering

**Verification:**
- ✅ Accepts field definitions via config
- ✅ No domain-specific logic
- ✅ Returns generic FilterCondition objects
- ✅ Handles quick filters + advanced filters

---

### 5. DataTableComponent (Existing Component)

**Current State:** Exists in `src/components/tables/DataTable/`

**Status:** Already generic and reusable!

**Usage Locations:**
1. Plugin Trace Viewer
2. Solution Explorer
3. Any tabular data display

**Verification:**
- ✅ Column definitions via config
- ✅ Generic data rows
- ✅ Sorting, searching, context menu
- ✅ No domain-specific logic

---

## Domain Model Design

### Core Entity: PluginTrace

**Rich Model (Not Anemic!)** - See CLAUDE.md Rule #6

```typescript
export class PluginTrace {
  private constructor(
    public readonly id: string,
    public readonly createdOn: Date,
    public readonly pluginName: string,
    public readonly entityName: string | null,
    public readonly messageName: string,
    public readonly duration: Duration,
    public readonly mode: ExecutionMode,
    public readonly depth: number,
    public readonly exceptionDetails: string | null,
    public readonly correlationId: CorrelationId | null,
    // ... other properties
  ) {}

  // Business logic methods (NOT in use cases or panels!)
  hasException(): boolean {
    return this.exceptionDetails !== null &&
           this.exceptionDetails.trim().length > 0;
  }

  isSuccessful(): boolean {
    return !this.hasException();
  }

  getStatus(): TraceStatus {
    return this.hasException()
      ? TraceStatus.Exception
      : TraceStatus.Success;
  }

  isRelatedTo(other: PluginTrace): boolean {
    return this.correlationId !== null &&
           this.correlationId.equals(other.correlationId);
  }

  isNested(): boolean {
    return this.depth > 1;
  }

  isSynchronous(): boolean {
    return this.mode.equals(ExecutionMode.Synchronous);
  }

  // Factory method (validation + creation)
  static create(params: PluginTraceParams): PluginTrace {
    if (!params.id || params.id.trim().length === 0) {
      throw new Error('Trace ID is required');
    }

    return new PluginTrace(
      params.id,
      params.createdOn,
      params.pluginName ?? '',
      params.entityName ?? null,
      params.messageName ?? '',
      params.duration,
      params.mode,
      params.depth ?? 1,
      params.exceptionDetails ?? null,
      params.correlationId ?? null,
      // ...
    );
  }
}
```

**Why Methods?**
- Business rules belong in domain entities
- Prevents code duplication
- Easy to test
- Self-documenting

**Bad Example (Anemic Model):**
```typescript
// ❌ DON'T DO THIS
interface PluginTrace {
  id: string;
  exceptionDetails: string;
  // ... just properties
}

// Logic scattered in use cases/panels:
if (trace.exceptionDetails && trace.exceptionDetails.trim().length > 0) {
  // ... duplicated everywhere
}
```

**Good Example (Rich Model):**
```typescript
// ✅ DO THIS
if (trace.hasException()) {
  // Clean, testable, reusable
}
```

---

### Value Objects

**Duration**
```typescript
export class Duration {
  private constructor(public readonly milliseconds: number) {
    if (milliseconds < 0) {
      throw new Error('Duration cannot be negative');
    }
  }

  static fromMilliseconds(ms: number): Duration {
    return new Duration(ms);
  }

  format(): string {
    if (this.milliseconds < 1000) {
      return `${this.milliseconds}ms`;
    } else if (this.milliseconds < 60000) {
      return `${(this.milliseconds / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(this.milliseconds / 60000);
      const seconds = ((this.milliseconds % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }

  isSlowerThan(other: Duration): boolean {
    return this.milliseconds > other.milliseconds;
  }
}
```

**TraceLevel**
```typescript
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

  equals(other: TraceLevel): boolean {
    return this.value === other.value;
  }
}
```

**Why Value Objects?**
- Type safety (can't pass wrong number)
- Encapsulate formatting logic
- Express domain concepts
- Immutable

---

## Use Case Examples

**GetPluginTracesUseCase** (Application Layer)

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
    this.logger.info('Getting plugin traces', {
      environmentId: params.environmentId
    });

    // Orchestration ONLY - no business logic!
    const traces = await this.repository.getTraces(
      params.environmentId,
      params.filter ?? TraceFilter.default()
    );

    this.logger.info('Retrieved traces', { count: traces.length });

    // Return domain entities (not ViewModels!)
    return traces;
  }
}
```

**Key Points:**
- ✅ Orchestrates repository call
- ✅ Logs at use case boundary
- ✅ Returns domain entities
- ✅ No business logic (filtering, validation done elsewhere)
- ✅ Injected dependencies (ILogger, not global Logger)

**Bad Example:**
```typescript
// ❌ DON'T DO THIS
async execute(params) {
  const traces = await this.repository.getTraces(params.environmentId);

  // ❌ Business logic in use case!
  const filtered = traces.filter(t => {
    if (params.exceptionOnly && (!t.exceptionDetails || t.exceptionDetails.trim() === '')) {
      return false;
    }
    return true;
  });

  // ❌ Formatting in use case!
  return filtered.map(t => ({
    ...t,
    duration: t.duration < 1000 ? `${t.duration}ms` : `${t.duration/1000}s`
  }));
}
```

**Good Example:**
```typescript
// ✅ DO THIS
async execute(params) {
  // Repository handles filtering via TraceFilter object
  const filter = TraceFilter.create({ exceptionOnly: params.exceptionOnly });
  const traces = await this.repository.getTraces(params.environmentId, filter);
  return traces; // Domain entities with rich methods
}

// Formatting happens in:
// - Domain entity: trace.duration.format()
// - ViewModel mapper: PluginTraceViewModelMapper.toViewModel(trace)
```

---

## Panel Design Pattern

**PluginTraceViewerPanel** (Presentation Layer)

```typescript
export class PluginTraceViewerPanel extends BasePanel {
  constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,

    // Inject use cases (NOT services!)
    private readonly getTracesUseCase: GetPluginTracesUseCase,
    private readonly setTraceLevelUseCase: SetTraceLevelUseCase,
    private readonly deleteTracesUseCase: DeleteTracesUseCase,
    private readonly exportTracesUseCase: ExportTracesUseCase,

    // Inject logger
    private readonly logger: ILogger
  ) {
    super(panel, extensionUri);
  }

  // Handle user actions (UI concern)
  private async handleRefresh(): Promise<void> {
    if (!this.currentEnvironmentId) return;

    try {
      // 1. Show loading (UI concern)
      this.dataTableComponent?.setLoading(true);

      // 2. Call use case (orchestration)
      const traces = await this.getTracesUseCase.execute({
        environmentId: this.currentEnvironmentId,
        filter: this.buildFilterFromUI()
      });

      // 3. Map to ViewModels (presentation concern)
      const viewModels = traces.map(trace =>
        PluginTraceViewModelMapper.toTableRowViewModel(trace)
      );

      // 4. Update UI
      this.dataTableComponent?.setData(viewModels);
      this.dataTableComponent?.setLoading(false);
    } catch (error) {
      this.logger.error('Failed to load traces', error as Error);
      this.showError('Failed to load traces');
    }
  }

  // User warnings (UI concern, not use case)
  private async handleSetTraceLevel(level: TraceLevel): Promise<void> {
    if (!this.currentEnvironmentId) return;

    // ✅ UI concern: warn about performance
    if (level.equals(TraceLevel.All)) {
      const result = await vscode.window.showWarningMessage(
        'Setting trace level to "All" can impact performance. Continue?',
        'Yes',
        'No'
      );
      if (result !== 'Yes') return;
    }

    try {
      // ✅ Use case: just set the level
      await this.setTraceLevelUseCase.execute({
        environmentId: this.currentEnvironmentId,
        level: level
      });

      // ✅ UI concern: show success
      vscode.window.showInformationMessage('Trace level updated');

      // ✅ UI concern: auto-refresh
      setTimeout(() => this.handleRefresh(), 1000);
    } catch (error) {
      this.logger.error('Failed to set trace level', error as Error);
      this.showError('Failed to set trace level');
    }
  }

  // NO business logic in panel!
  // ❌ Don't check if trace has exception (use trace.hasException())
  // ❌ Don't format duration (use trace.duration.format())
  // ❌ Don't build OData filters (use PluginTraceFilterService)
  // ✅ DO call use cases
  // ✅ DO map to ViewModels
  // ✅ DO handle user interactions
  // ✅ DO update UI components
}
```

---

## ViewModel Pattern

**Why ViewModels?**
- Domain entities don't know about HTML/CSS/presentation
- Presentation needs different shape (formatted strings, HTML badges)
- Clear separation of concerns

**Example:**

```typescript
// Domain entity
class PluginTrace {
  duration: Duration;
  mode: ExecutionMode;

  hasException(): boolean { ... }
  getStatus(): TraceStatus { ... }
}

// ViewModel (presentation layer)
interface PluginTraceTableRowViewModel {
  id: string;
  status: string; // "Success" | "Exception"
  statusBadgeHtml: string; // "<span class='badge'>..."
  duration: string; // "125ms" (formatted)
  mode: string; // "Sync" (display name)
}

// Mapper (presentation layer)
class PluginTraceViewModelMapper {
  static toTableRowViewModel(trace: PluginTrace): PluginTraceTableRowViewModel {
    return {
      id: trace.id,
      status: trace.getStatus().getDisplayName(),
      statusBadgeHtml: this.createStatusBadge(trace.getStatus()),
      duration: trace.duration.format(),
      mode: trace.mode.getDisplayName()
    };
  }

  private static createStatusBadge(status: TraceStatus): string {
    const cssClass = status.getBadgeClass(); // From value object!
    return `<span class="status-badge ${cssClass}">...`;
  }
}
```

**Panel Usage:**
```typescript
// ✅ Good
const traces = await this.getTracesUseCase.execute(...);
const viewModels = traces.map(t => PluginTraceViewModelMapper.toTableRowViewModel(t));
this.dataTableComponent.setData(viewModels);

// ❌ Bad - formatting in panel
const viewModels = traces.map(t => ({
  id: t.id,
  duration: t.duration < 1000 ? `${t.duration}ms` : `${t.duration/1000}s` // DON'T!
}));
```

---

## Key Architectural Principles

### 1. Dependency Rule
All dependencies point INWARD toward domain.

```
Infrastructure → Domain ✅
Application → Domain ✅
Presentation → Application → Domain ✅
Domain → Infrastructure ❌ NEVER
Domain → Application ❌ NEVER
```

### 2. Rich Domain Models (Not Anemic)
Business logic in entities, not use cases or panels.

```typescript
// ✅ Good
if (trace.hasException()) {
  // Business rule encapsulated in entity
}

// ❌ Bad
if (trace.exceptionDetails && trace.exceptionDetails.trim().length > 0) {
  // Business rule scattered everywhere
}
```

### 3. Use Cases Orchestrate Only
No business logic, just coordination.

```typescript
// ✅ Good - Orchestration
async execute(params) {
  const traces = await this.repository.getTraces(params.environmentId);
  return traces;
}

// ❌ Bad - Business logic
async execute(params) {
  const traces = await this.repository.getTraces(params.environmentId);
  return traces.filter(t => t.exceptionDetails.length > 0); // DON'T!
}
```

### 4. Repository Pattern
Domain defines interface, infrastructure implements.

```typescript
// Domain layer
export interface IPluginTraceRepository {
  getTraces(environmentId: string, filter: TraceFilter): Promise<PluginTrace[]>;
}

// Infrastructure layer
export class DataversePluginTraceRepository implements IPluginTraceRepository {
  async getTraces(environmentId: string, filter: TraceFilter): Promise<PluginTrace[]> {
    // API calls here
  }
}
```

### 5. ViewModels for Presentation
Domain entities → ViewModels → UI

```typescript
Domain Entity (PluginTrace)
  ↓
ViewModel Mapper
  ↓
ViewModel (PluginTraceTableRowViewModel)
  ↓
DataTableComponent
```

### 6. HTML in View Files
No HTML in panel .ts files.

```typescript
// ✅ Good
// src/presentation/views/PluginTraceDetailView.ts
export class PluginTraceDetailView {
  static renderConfigurationTab(trace: PluginTraceDetailViewModel): string {
    return `<div>...</div>`;
  }
}

// ❌ Bad
// src/panels/PluginTraceViewerPanel.ts
const html = `<div>...</div>`; // DON'T put HTML here!
```

---

## Implementation Checklist for Architect

### Phase 1: Domain Layer (Foundation)
- [ ] Create PluginTrace entity with rich methods
- [ ] Create Value Objects (TraceLevel, TraceStatus, ExecutionMode, Duration, CorrelationId)
- [ ] Create IPluginTraceRepository interface
- [ ] Create IPluginTraceExporter interface
- [ ] Create PluginTraceFilterService (domain service)
- [ ] Write unit tests for domain layer (pure functions, no mocks)

### Phase 2: Application Layer (Use Cases)
- [ ] Create GetPluginTracesUseCase
- [ ] Create GetTraceLevelUseCase
- [ ] Create SetTraceLevelUseCase
- [ ] Create DeleteTracesUseCase
- [ ] Create ExportTracesUseCase
- [ ] Write use case tests (mock repositories)

### Phase 3: Infrastructure Layer (Implementation)
- [ ] Create DataversePluginTraceRepository (implements IPluginTraceRepository)
- [ ] Create PluginTraceMapper (API ↔ Domain)
- [ ] Create FileSystemPluginTraceExporter (implements IPluginTraceExporter)
- [ ] Write integration tests

### Phase 4: Presentation Layer (UI)
- [ ] Create PluginTraceViewModel interfaces
- [ ] Create PluginTraceViewModelMapper
- [ ] Create PluginTraceDetailView (HTML templates)
- [ ] Update PluginTraceViewerPanel (inject use cases, map ViewModels)
- [ ] Write component tests

### Phase 5: Reusable Components (Critical!)
- [ ] Verify JsonViewerComponent is generic (no panel-specific code)
- [ ] Verify TimelineBehavior is generic (accepts generic items)
- [ ] Verify SplitPanelBehavior is generic
- [ ] Test reusability in multiple contexts
- [ ] Document component interfaces

### Phase 6: Integration & Testing
- [ ] Wire up dependency injection (use cases → repositories)
- [ ] End-to-end testing (panel → use cases → repository → API)
- [ ] Performance testing (1000+ traces)
- [ ] Error handling verification
- [ ] State persistence testing

---

## Critical Design Questions for Architect

### 1. Dependency Injection Setup
**Question:** How to inject use cases into panel?

**Options:**
A. Factory pattern (current ServiceFactory)
B. Constructor injection
C. Hybrid (factory for singletons, constructor for use cases)

**Recommendation:** Hybrid
- Use ServiceFactory for infrastructure (repositories, API clients)
- Inject use cases in panel constructor
- Easy to test, clear dependencies

### 2. TraceFilter Design
**Question:** Where does TraceFilter live?

**Answer:** Domain layer (it's a domain concept)

```typescript
// src/domain/entities/TraceFilter.ts
export class TraceFilter {
  private constructor(
    public readonly top: number,
    public readonly odataFilter?: string
  ) {}

  static default(): TraceFilter {
    return new TraceFilter(100);
  }

  static create(params: {
    exceptionOnly?: boolean;
    quickFilters?: string[];
    advancedFilters?: FilterCondition[];
  }): TraceFilter {
    // Build OData filter using PluginTraceFilterService
    const odataFilter = PluginTraceFilterService.buildODataFilter(params);
    return new TraceFilter(100, odataFilter);
  }
}
```

### 3. Error Handling Strategy
**Question:** Where to handle API errors?

**Layers:**
- **Repository:** Catch HTTP errors, throw domain exceptions
- **Use Case:** Log errors, re-throw
- **Panel:** Catch errors, show user-friendly messages

Example:
```typescript
// Repository
async getTraces(): Promise<PluginTrace[]> {
  try {
    const response = await fetch(...);
    if (!response.ok) {
      throw new PluginTraceApiError(`API error: ${response.status}`);
    }
    return this.mapper.toDomain(response.data);
  } catch (error) {
    throw new PluginTraceRepositoryError('Failed to get traces', error);
  }
}

// Use Case
async execute(): Promise<PluginTrace[]> {
  try {
    const traces = await this.repository.getTraces(...);
    this.logger.info('Traces retrieved', { count: traces.length });
    return traces;
  } catch (error) {
    this.logger.error('Get traces failed', error);
    throw error; // Re-throw for panel to handle
  }
}

// Panel
async handleRefresh(): Promise<void> {
  try {
    const traces = await this.getTracesUseCase.execute(...);
    this.updateUI(traces);
  } catch (error) {
    vscode.window.showErrorMessage('Failed to load traces. Check output for details.');
  }
}
```

### 4. Testing Strategy
**Question:** What level of test coverage?

**Recommendation:**
- Domain Layer: 100% (pure functions, easy to test)
- Application Layer: 90%+ (use case tests with mocks)
- Infrastructure Layer: Integration tests (against mock API)
- Presentation Layer: Component tests (mock use cases)

---

## Next Steps

1. **Review documents with user** (this step)
2. **Architect creates detailed implementation plan**
   - File-by-file breakdown
   - Interface definitions
   - Test strategy
3. **Implement in phases** (domain → application → infrastructure → presentation)
4. **Code review at each phase** (use code-reviewer agent)
5. **Integration testing**
6. **Documentation**

---

## Questions for Architect to Answer

1. **Dependency Injection:** How to wire up use cases into panel? Factory or constructor?
2. **State Management:** Where to store auto-refresh interval? Panel or preference service?
3. **Testing:** What testing framework for domain layer? (Jest? Mocha?)
4. **Error Types:** Create domain-specific exceptions? (PluginTraceNotFoundError, etc.)
5. **Logging:** Use injected ILogger everywhere? (Yes, per CLAUDE.md)
6. **Validation:** Where to validate filter inputs? (Domain service? Use case?)
7. **Caching:** Should repository cache traces? (Probably not, panel handles refresh)

---

## Success Criteria

✅ All CLAUDE.md rules followed
✅ Zero business logic in panels or use cases
✅ Rich domain models with behavior
✅ Clean dependency direction (inward)
✅ Reusable components (JsonViewer, Timeline)
✅ Testable at every layer
✅ HTML in separate view files
✅ ViewModels for presentation
✅ Type-safe (explicit return types, no `any`)

---

## Summary

This design provides a solid foundation for implementing the Plugin Trace Viewer following clean architecture principles. The key innovations are:

1. **Rich domain model** - PluginTrace entity with business logic methods
2. **Value objects** - Type-safe, self-documenting (Duration, TraceLevel, etc.)
3. **Use case pattern** - Clear orchestration, no business logic
4. **Repository pattern** - Clean abstraction over Dataverse API
5. **ViewModel pattern** - Separation of domain and presentation
6. **Reusable components** - JsonViewer, Timeline abstracted for reuse
7. **Clean dependencies** - All dependencies point inward to domain

The architect should now have everything needed to create a detailed implementation plan and file structure.
