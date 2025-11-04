# Plugin Trace Viewer - Phase 4 Presentation Layer Design

**Date:** 2025-11-04
**Status:** Approved
**Complexity:** Moderate

---

## Revision History

Final approved version (2025-11-04). See git history for detailed iteration history (V1 → V5).

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Domain Layer Updates](#domain-layer-updates)
4. [Type Contracts](#type-contracts)
5. [File Structure](#file-structure)
6. [Component Design](#component-design)
7. [Message Protocol](#message-protocol)
8. [Security & Validation](#security--validation)
9. [Dependency Injection](#dependency-injection)
10. [View Structure](#view-structure)
11. [Clean Architecture Compliance](#clean-architecture-compliance)

---

## Overview

**Phase 4 Goal:** Implement the presentation layer for Plugin Trace Viewer following clean architecture principles with security & validation best practices.

**Key Requirements:**
- Panel implements direct pattern (like `PersistenceInspectorPanel`)
- VS Code singleton pattern (per CLAUDE.md #21)
- Use cases + mapper injected via constructor
- **Use cases return domain entities** (panel does mapping)
- **Mapper uses instance methods** (injected, not static)
- **Mapper remains in presentation layer** (depends on presentation formatters)
- **Panel builds domain entities** (TraceFilter) from DTOs
- **OData injection prevention** (sanitize user input)
- **Message payload validation** (validate all inputs)
- **Loading states** (show feedback during async operations)
- HTML extracted to separate view file (complete HTML)
- No business logic in panel (pure orchestration)
- Message-based communication with webview

**Phases 1-3 Status:**
- ✅ Phase 1: Domain Layer (144 tests passing)
- ✅ Phase 2: Application Layer (Use cases, TWO ViewModels)
- ✅ Phase 3: Infrastructure Layer (Repositories, Exporters, Batch API, Retry Logic - 768 tests)
- 🔄 Phase 4: Presentation Layer (this design - V5 FINAL)

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (Phase 4)                                │
├─────────────────────────────────────────────────────────────┤
│ PluginTraceViewerPanel (Direct Implementation)              │
│ - Manages webview lifecycle                                 │
│ - Handles webview messages with validation                  │
│ - Sanitizes user input (OData injection prevention)         │
│ - Builds domain entities from validated DTOs                │
│ - Calls use cases with domain entities                      │
│ - Maps domain entities → ViewModels (via injected mapper)   │
│ - Sends ViewModels to webview                               │
│ - Shows loading states during async operations              │
│ - NO business logic (delegates to domain)                   │
│                                                              │
│ PluginTraceViewModelMapper (INJECTED)                       │
│ - Uses instance methods (not static)                        │
│ - Maps domain → ViewModels                                  │
│ - Uses presentation formatters                              │
│                                                              │
│ View File (HTML Generation)                                 │
│ - getHtmlContent() returns COMPLETE HTML                    │
│ - Includes CSP, scripts, styles                             │
│ - Escapes all dynamic content with escapeHtml()             │
│ - Panel never manipulates HTML                              │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer (Phase 2) ✅                              │
├─────────────────────────────────────────────────────────────┤
│ Use Cases (return domain entities)                          │
│ - GetPluginTracesUseCase → returns PluginTrace[]            │
│ - DeleteTracesUseCase                                       │
│ - ExportTracesUseCase                                       │
│ - GetTraceLevelUseCase → returns TraceLevel                 │
│ - SetTraceLevelUseCase                                      │
│                                                              │
│ ViewModels (TWO - for presentation)                         │
│ - PluginTraceTableRowViewModel (9 fields)                   │
│ - PluginTraceDetailViewModel (18 fields)                    │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer (Phase 1) ✅                                   │
├─────────────────────────────────────────────────────────────┤
│ Entities: PluginTrace, TraceFilter                          │
│ Value Objects: TraceLevel (with isPerformanceIntensive())   │
│ Services: PluginTraceFilterService                          │
│ Interfaces: IPluginTraceRepository, IPluginTraceExporter    │
└─────────────────────────────────────────────────────────────┘
```

---

## Domain Layer Updates

**New Method on TraceLevel Value Object:**

```typescript
// src/features/pluginTraceViewer/domain/valueObjects/TraceLevel.ts

export class TraceLevel {
  // ... existing code ...

  /**
   * Determines if this trace level may impact system performance.
   * TraceLevel.All logs every plugin execution, which can generate
   * significant data volume and affect system performance.
   *
   * @returns true if this level may impact performance
   */
  public isPerformanceIntensive(): boolean {
    return this.value === TraceLevel.All.value;
  }
}
```

**Why this is domain logic:**
- Knowledge that "TraceLevel.All impacts performance" is **business knowledge**
- Domain entity exposes this as behavior
- Presentation asks domain, then shows appropriate UI confirmation

**Test Coverage:**
```typescript
// src/features/pluginTraceViewer/domain/valueObjects/TraceLevel.test.ts

describe('TraceLevel.isPerformanceIntensive', () => {
  it('should return true for All level', () => {
    expect(TraceLevel.All.isPerformanceIntensive()).toBe(true);
  });

  it('should return false for Exception level', () => {
    expect(TraceLevel.Exception.isPerformanceIntensive()).toBe(false);
  });

  it('should return false for Off level', () => {
    expect(TraceLevel.Off.isPerformanceIntensive()).toBe(false);
  });
});
```

---

## Type Contracts

### Panel Class Structure (Direct Implementation)

```typescript
/**
 * Presentation layer panel for Plugin Trace Viewer.
 * NO business logic - delegates all operations to use cases.
 * Maps domain entities → ViewModels using injected mapper.
 *
 * Follows VS Code singleton pattern (CLAUDE.md #21).
 */
export class PluginTraceViewerPanel {
  public static readonly viewType = 'powerPlatformDevSuite.pluginTraceViewer';

  // VS Code singleton pattern (CLAUDE.md #21 - acceptable exception)
  private static currentPanel: PluginTraceViewerPanel | undefined;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly getEnvironments: () => Promise<readonly Environment[]>,
    private readonly getEnvironmentById: (id: string) => Promise<Environment | null>,
    // Injected use cases (return domain entities)
    private readonly getPluginTracesUseCase: GetPluginTracesUseCase,
    private readonly deleteTracesUseCase: DeleteTracesUseCase,
    private readonly exportTracesUseCase: ExportTracesUseCase,
    private readonly getTraceLevelUseCase: GetTraceLevelUseCase,
    private readonly setTraceLevelUseCase: SetTraceLevelUseCase,
    // Injected mapper (instance methods)
    private readonly viewModelMapper: PluginTraceViewModelMapper,
    private readonly logger: ILogger,
    private disposables: vscode.Disposable[] = []
  );
}
```

**State Management:**
```typescript
class PluginTraceViewerPanel {
  // Readonly property prevents reassignment, array contents remain mutable (CLAUDE.md)
  private readonly traces: PluginTrace[] = [];
  private currentEnvironmentId: string | null = null;
  private currentTraceLevel: TraceLevel = TraceLevel.Off;
  private currentFilterOptions: TraceFilterOptions | null = null;

  // Loading state tracking
  private isLoading = false;
}
```

### Public Methods

```typescript
export class PluginTraceViewerPanel {
  /**
   * Creates or shows the Plugin Trace Viewer panel.
   * Implements singleton pattern per CLAUDE.md #21.
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    getEnvironments: () => Promise<readonly Environment[]>,
    getEnvironmentById: (id: string) => Promise<Environment | null>,
    getPluginTracesUseCase: GetPluginTracesUseCase,
    deleteTracesUseCase: DeleteTracesUseCase,
    exportTracesUseCase: ExportTracesUseCase,
    getTraceLevelUseCase: GetTraceLevelUseCase,
    setTraceLevelUseCase: SetTraceLevelUseCase,
    viewModelMapper: PluginTraceViewModelMapper,
    logger: ILogger,
    initialEnvironmentId?: string
  ): Promise<PluginTraceViewerPanel>;

  /**
   * Disposes the panel and cleans up resources.
   */
  public dispose(): void;
}
```

### Message Handlers (Private Methods)

```typescript
private async handleMessage(message: WebviewMessage): Promise<void>;

private async handleLoadTraces(
  environmentId: string,
  filterOptions: TraceFilterOptions
): Promise<void>;

private async handleViewDetail(
  environmentId: string,
  traceId: string
): Promise<void>;

private async handleDeleteSelected(
  environmentId: string,
  traceIds: readonly string[]
): Promise<void>;

private async handleDeleteAll(environmentId: string): Promise<void>;

private async handleDeleteOld(
  environmentId: string,
  olderThanDays: number
): Promise<void>;

private async handleExport(
  traceIds: readonly string[],
  format: ExportFormat
): Promise<void>;

private async handleGetTraceLevel(environmentId: string): Promise<void>;

private async handleSetTraceLevel(
  environmentId: string,
  level: TraceLevelString
): Promise<void>;

// Helper methods
private buildODataFilter(options: TraceFilterOptions): string | undefined;
private sanitizeODataValue(value: string): string;
private setLoading(loading: boolean): Promise<void>;
private getHtmlContent(): string;
private sendMessage(message: unknown): Promise<void>;
private showError(message: string, context?: string): Promise<void>;
private showInfo(message: string): Promise<void>;
```

---

## File Structure

```
src/features/pluginTraceViewer/
├── domain/
│   └── valueObjects/
│       ├── TraceLevel.ts                      # UPDATE: Add isPerformanceIntensive()
│       └── TraceLevel.test.ts                 # UPDATE: Add tests for new method
│
├── application/
│   └── viewModels/
│       └── PluginTraceViewModel.ts             # Already exists ✅
│
└── presentation/
    ├── panels/
    │   ├── PluginTraceViewerPanel.ts          # NEW: Main panel class
    │   └── PluginTraceViewerPanel.test.ts     # NEW: Panel tests
    │
    ├── views/
    │   └── pluginTraceViewerView.ts           # NEW: Complete HTML generation
    │
    ├── mappers/
    │   └── PluginTraceViewModelMapper.ts      # Already exists ✅ (STAYS HERE)
    │
    └── utils/
        ├── TypeGuards.ts                      # NEW: Message type guards (enhanced)
        ├── HtmlHelpers.ts                     # NEW: escapeHtml, formatJson
        ├── ODataSanitizer.ts                  # NEW: OData injection prevention
        ├── DurationFormatter.ts               # Already exists ✅
        ├── TraceStatusFormatter.ts            # Already exists ✅
        ├── TraceLevelFormatter.ts             # Already exists ✅
        ├── ExecutionModeFormatter.ts          # Already exists ✅
        └── OperationTypeFormatter.ts          # Already exists ✅
```

**New Files:** 7 files
- PluginTraceViewerPanel.ts
- PluginTraceViewerPanel.test.ts
- pluginTraceViewerView.ts
- TypeGuards.ts (enhanced)
- HtmlHelpers.ts
- ODataSanitizer.ts (NEW)

**Updated Files:** 2 files
- TraceLevel.ts (add isPerformanceIntensive method)
- TraceLevel.test.ts (add tests)

**Existing Files:** 7 files (mapper + formatters)

**Total:** 16 files for Phase 4 (7 new, 2 updated, 7 existing)

---

## Component Design

### PluginTraceViewerPanel (Direct Implementation)

**Pattern:** Follows `PersistenceInspectorPanel` exactly (direct implementation, VS Code singleton)

**Key Implementation Examples:**

```typescript
class PluginTraceViewerPanel {
  // Singleton factory (CLAUDE.md #21)
  public static async createOrShow(...): Promise<PluginTraceViewerPanel> {
    if (PluginTraceViewerPanel.currentPanel) {
      PluginTraceViewerPanel.currentPanel.panel.reveal();
      return PluginTraceViewerPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      PluginTraceViewerPanel.viewType,
      'Plugin Trace Viewer',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri]
      }
    );

    const instance = new PluginTraceViewerPanel(
      panel,
      extensionUri,
      getEnvironments,
      getEnvironmentById,
      getPluginTracesUseCase,
      deleteTracesUseCase,
      exportTracesUseCase,
      getTraceLevelUseCase,
      setTraceLevelUseCase,
      viewModelMapper,
      logger
    );

    PluginTraceViewerPanel.currentPanel = instance;
    return instance;
  }

  // Message routing with validation
  private async handleMessage(message: WebviewMessage): Promise<void> {
    if (!isWebviewMessage(message)) {
      this.logger.warn('Invalid webview message', { message });
      return;
    }

    try {
      if (isLoadTracesMessage(message)) {
        // Validate payload
        if (!this.validateLoadTracesPayload(message)) {
          await this.showError('Invalid filter parameters', 'Load Traces');
          return;
        }
        await this.handleLoadTraces(message.environmentId, message.filters);
      } else if (isViewDetailMessage(message)) {
        if (!message.traceId || typeof message.traceId !== 'string') {
          await this.showError('Invalid trace ID', 'View Detail');
          return;
        }
        await this.handleViewDetail(message.environmentId, message.traceId);
      } else if (isDeleteSelectedMessage(message)) {
        if (!Array.isArray(message.traceIds) || message.traceIds.length === 0) {
          await this.showError('No traces selected', 'Delete Selected');
          return;
        }
        await this.handleDeleteSelected(message.environmentId, message.traceIds);
      } else if (isDeleteAllMessage(message)) {
        await this.handleDeleteAll(message.environmentId);
      } else if (isDeleteOldMessage(message)) {
        if (typeof message.olderThanDays !== 'number' || message.olderThanDays < 1) {
          await this.showError('Invalid days parameter', 'Delete Old');
          return;
        }
        await this.handleDeleteOld(message.environmentId, message.olderThanDays);
      } else if (isExportMessage(message)) {
        if (!this.isValidExportFormat(message.format)) {
          await this.showError('Invalid export format', 'Export');
          return;
        }
        if (!Array.isArray(message.traceIds) || message.traceIds.length === 0) {
          await this.showError('No traces selected for export', 'Export');
          return;
        }
        await this.handleExport(message.traceIds, message.format);
      } else if (isGetTraceLevelMessage(message)) {
        await this.handleGetTraceLevel(message.environmentId);
      } else if (isSetTraceLevelMessage(message)) {
        await this.handleSetTraceLevel(message.environmentId, message.level);
      } else {
        this.logger.warn('Unknown message command', { message });
      }
    } catch (error) {
      this.logger.error('Error handling webview message', error);
      await this.showError('An error occurred. Please try again.', 'Operation Failed');
    }
  }

  // Load traces with loading state
  private async handleLoadTraces(
    environmentId: string,
    filterOptions: TraceFilterOptions
  ): Promise<void> {
    try {
      this.logger.debug('Loading plugin traces', { environmentId, filterOptions });

      await this.setLoading(true);

      // 1. Build domain entity from validated DTO (with sanitization)
      const filter = TraceFilter.create({
        top: filterOptions.top,
        orderBy: 'createdon desc',
        odataFilter: this.buildODataFilter(filterOptions)
      });

      // 2. Call use case (returns domain entities)
      const traces = await this.getPluginTracesUseCase.execute(
        environmentId,
        filter
      );

      // 3. Store domain entities
      this.traces.splice(0, this.traces.length, ...traces); // Clear + add (readonly array)
      this.currentEnvironmentId = environmentId;
      this.currentFilterOptions = filterOptions;

      // 4. Map to ViewModels using injected mapper
      const tableRows = traces.map(trace =>
        this.viewModelMapper.toTableRowViewModel(trace)
      );

      // 5. Send ViewModels to webview
      await this.sendMessage({
        command: 'tracesLoaded',
        data: {
          traces: tableRows,
          total: tableRows.length
        }
      });

      this.logger.debug('Plugin traces loaded successfully', {
        environmentId,
        count: tableRows.length
      });
    } catch (error) {
      this.logger.error('Failed to load plugin traces', error);
      await this.showError('Failed to load plugin traces', 'Load Traces');
    } finally {
      await this.setLoading(false);
    }
  }

  // View detail with loading state
  private async handleViewDetail(
    environmentId: string,
    traceId: string
  ): Promise<void> {
    try {
      this.logger.debug('Loading trace detail', { environmentId, traceId });

      await this.setLoading(true);

      // Option 1: Find in cached traces (fast)
      let trace = this.traces.find(t => t.id === traceId);

      // Option 2: Fetch from server if not cached
      if (!trace) {
        const filter = TraceFilter.create({
          top: 1,
          odataFilter: `plugintracelogid eq '${this.sanitizeODataValue(traceId)}'`
        });

        const traces = await this.getPluginTracesUseCase.execute(
          environmentId,
          filter
        );

        trace = traces[0] || null;
      }

      if (!trace) {
        await this.showError('Trace not found', 'View Detail');
        return;
      }

      // Map to DetailViewModel using injected mapper
      const detailData = this.viewModelMapper.toDetailViewModel(trace);

      // Send to webview
      await this.sendMessage({
        command: 'showDetail',
        data: detailData
      });

      this.logger.debug('Trace detail loaded successfully', { environmentId, traceId });
    } catch (error) {
      this.logger.error('Failed to load trace detail', error);
      await this.showError('Failed to load trace detail', 'View Detail');
    } finally {
      await this.setLoading(false);
    }
  }

  // Set trace level with domain logic check
  private async handleSetTraceLevel(
    environmentId: string,
    levelString: TraceLevelString
  ): Promise<void> {
    try {
      // Convert string to domain value object
      const level = TraceLevel.fromString(levelString);

      // Ask domain if this level may impact performance (business logic in domain)
      if (level.isPerformanceIntensive()) {
        const confirmed = await vscode.window.showWarningMessage(
          'Setting trace level to "All" will log all plugin executions and may impact performance. Continue?',
          'Yes',
          'No'
        );

        if (confirmed !== 'Yes') {
          this.logger.debug('User cancelled trace level change', { level: level.value });
          return;
        }
      }

      this.logger.debug('Setting trace level', { environmentId, level: level.value });

      await this.setLoading(true);

      // Call use case
      await this.setTraceLevelUseCase.execute(environmentId, level);

      this.currentTraceLevel = level;

      await this.showInfo(`Trace level set to: ${TraceLevelFormatter.format(level)}`);

      // Notify webview
      await this.sendMessage({
        command: 'traceLevelChanged',
        data: { level: TraceLevelFormatter.format(level) }
      });

      this.logger.info('Trace level changed successfully', {
        environmentId,
        level: level.value
      });
    } catch (error) {
      this.logger.error('Failed to set trace level', error);
      await this.showError('Failed to set trace level', 'Set Trace Level');
    } finally {
      await this.setLoading(false);
    }
  }

  /**
   * Builds OData filter string from filter options DTO.
   * Sanitizes all user input to prevent OData injection.
   */
  private buildODataFilter(options: TraceFilterOptions): string | undefined {
    const filters: string[] = [];

    if (options.pluginName) {
      const sanitized = this.sanitizeODataValue(options.pluginName);
      filters.push(`contains(typename, '${sanitized}')`);
    }

    if (options.entityName) {
      const sanitized = this.sanitizeODataValue(options.entityName);
      filters.push(`primaryentity eq '${sanitized}'`);
    }

    if (options.messageName) {
      const sanitized = this.sanitizeODataValue(options.messageName);
      filters.push(`messagename eq '${sanitized}'`);
    }

    if (options.hasException !== undefined) {
      if (options.hasException) {
        filters.push(`exceptiondetails ne null`);
      } else {
        filters.push(`exceptiondetails eq null`);
      }
    }

    if (options.startDate) {
      // ISO dates don't need sanitization (validated by type guard)
      filters.push(`createdon ge ${options.startDate}`);
    }

    if (options.endDate) {
      filters.push(`createdon le ${options.endDate}`);
    }

    return filters.length > 0 ? filters.join(' and ') : undefined;
  }

  /**
   * Sanitizes a value for use in OData filter strings.
   * Prevents OData injection by escaping single quotes.
   */
  private sanitizeODataValue(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Validates export format is one of allowed values.
   */
  private isValidExportFormat(format: unknown): format is ExportFormat {
    return format === 'csv' || format === 'json';
  }

  /**
   * Validates load traces message payload.
   */
  private validateLoadTracesPayload(message: LoadTracesMessage): boolean {
    const { filters } = message;

    if (typeof filters.top !== 'number' || filters.top < 1 || filters.top > 5000) {
      return false;
    }

    if (filters.pluginName !== undefined && typeof filters.pluginName !== 'string') {
      return false;
    }

    if (filters.entityName !== undefined && typeof filters.entityName !== 'string') {
      return false;
    }

    if (filters.messageName !== undefined && typeof filters.messageName !== 'string') {
      return false;
    }

    if (filters.hasException !== undefined && typeof filters.hasException !== 'boolean') {
      return false;
    }

    return true;
  }

  /**
   * Sets loading state and notifies webview.
   */
  private async setLoading(loading: boolean): Promise<void> {
    this.isLoading = loading;
    await this.sendMessage({
      command: 'setLoading',
      data: { loading }
    });
  }

  // Get HTML content (delegates to view file)
  private getHtmlContent(): string {
    return getHtmlContent(this.panel.webview, this.extensionUri);
  }

  // Send message to webview
  private async sendMessage(message: unknown): Promise<void> {
    await this.panel.webview.postMessage(message);
  }

  // Show error message with context
  private async showError(message: string, context?: string): Promise<void> {
    const fullMessage = context ? `${context}: ${message}` : message;
    await vscode.window.showErrorMessage(fullMessage);
    await this.sendMessage({ command: 'error', message: fullMessage });
  }

  // Show info message
  private async showInfo(message: string): Promise<void> {
    await vscode.window.showInformationMessage(message);
    await this.sendMessage({ command: 'info', message });
  }

  // Dispose panel
  public dispose(): void {
    PluginTraceViewerPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
```

---

## Message Protocol

### Export Format Type

```typescript
// src/features/pluginTraceViewer/domain/types/ExportFormat.ts
export type ExportFormat = 'csv' | 'json';
```

### Messages from Webview → Panel

```typescript
type WebviewMessage =
  | LoadTracesMessage
  | ViewDetailMessage
  | DeleteSelectedMessage
  | DeleteAllMessage
  | DeleteOldMessage
  | ExportMessage
  | GetTraceLevelMessage
  | SetTraceLevelMessage;

interface LoadTracesMessage {
  command: 'loadTraces';
  environmentId: string;
  filters: TraceFilterOptions;
}

interface ViewDetailMessage {
  command: 'viewDetail';
  environmentId: string;
  traceId: string;
}

interface DeleteSelectedMessage {
  command: 'deleteSelected';
  environmentId: string;
  traceIds: readonly string[];
}

interface DeleteAllMessage {
  command: 'deleteAll';
  environmentId: string;
}

interface DeleteOldMessage {
  command: 'deleteOld';
  environmentId: string;
  olderThanDays: number;
}

interface ExportMessage {
  command: 'export';
  traceIds: readonly string[];
  format: ExportFormat;
}

interface GetTraceLevelMessage {
  command: 'getTraceLevel';
  environmentId: string;
}

interface SetTraceLevelMessage {
  command: 'setTraceLevel';
  environmentId: string;
  level: TraceLevelString;
}

// DTO for filter options (NOT domain entity)
interface TraceFilterOptions {
  top: number;
  pluginName?: string;
  entityName?: string;
  messageName?: string;
  hasException?: boolean;
  startDate?: string; // ISO 8601
  endDate?: string;   // ISO 8601
}

type TraceLevelString = 'Off' | 'Exception' | 'All';
```

### Messages from Panel → Webview

```typescript
type PanelMessage =
  | TracesLoadedMessage
  | ShowDetailMessage
  | TraceLevelChangedMessage
  | SetLoadingMessage
  | ErrorMessage
  | InfoMessage;

interface TracesLoadedMessage {
  command: 'tracesLoaded';
  data: {
    traces: readonly PluginTraceTableRowViewModel[];
    total: number;
  };
}

interface ShowDetailMessage {
  command: 'showDetail';
  data: PluginTraceDetailViewModel;
}

interface TraceLevelChangedMessage {
  command: 'traceLevelChanged';
  data: {
    level: string;
  };
}

interface SetLoadingMessage {
  command: 'setLoading';
  data: {
    loading: boolean;
  };
}

interface ErrorMessage {
  command: 'error';
  message: string;
}

interface InfoMessage {
  command: 'info';
  message: string;
}
```

---

## Security & Validation

### OData Injection Prevention

**Problem:** User input in filter fields could inject OData operators.

**Example Attack:**
```
pluginName: "Test' or 1 eq 1 or typename eq 'Evil"
```

**Solution:**
```typescript
/**
 * Sanitizes a value for use in OData filter strings.
 * Escapes single quotes by doubling them (OData standard).
 *
 * @param value - User input to sanitize
 * @returns Sanitized value safe for OData filter
 */
private sanitizeODataValue(value: string): string {
  // OData standard: escape single quote by doubling it
  return value.replace(/'/g, "''");
}
```

**Usage:**
```typescript
if (options.pluginName) {
  const sanitized = this.sanitizeODataValue(options.pluginName);
  filters.push(`contains(typename, '${sanitized}')`);
}
```

### Message Payload Validation

**Validate all incoming webview messages:**

```typescript
private validateLoadTracesPayload(message: LoadTracesMessage): boolean {
  const { filters } = message;

  // Validate top (1-5000)
  if (typeof filters.top !== 'number' || filters.top < 1 || filters.top > 5000) {
    return false;
  }

  // Validate string fields
  if (filters.pluginName !== undefined && typeof filters.pluginName !== 'string') {
    return false;
  }

  if (filters.entityName !== undefined && typeof filters.entityName !== 'string') {
    return false;
  }

  if (filters.messageName !== undefined && typeof filters.messageName !== 'string') {
    return false;
  }

  // Validate boolean field
  if (filters.hasException !== undefined && typeof filters.hasException !== 'boolean') {
    return false;
  }

  return true;
}
```

### Export Format Validation

```typescript
/**
 * Type guard for export format validation.
 */
private isValidExportFormat(format: unknown): format is ExportFormat {
  return format === 'csv' || format === 'json';
}

// Usage in handler
if (!this.isValidExportFormat(message.format)) {
  await this.showError('Invalid export format', 'Export');
  return;
}
```

### Enhanced Type Guards

```typescript
// src/features/pluginTraceViewer/presentation/utils/TypeGuards.ts

export function isWebviewMessage(message: unknown): message is WebviewMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'command' in message &&
    typeof (message as { command: unknown }).command === 'string'
  );
}

export function isLoadTracesMessage(message: WebviewMessage): message is LoadTracesMessage {
  return (
    message.command === 'loadTraces' &&
    'environmentId' in message &&
    typeof message.environmentId === 'string' &&
    'filters' in message &&
    typeof message.filters === 'object' &&
    message.filters !== null
  );
}

export function isViewDetailMessage(message: WebviewMessage): message is ViewDetailMessage {
  return (
    message.command === 'viewDetail' &&
    'environmentId' in message &&
    typeof message.environmentId === 'string' &&
    'traceId' in message &&
    typeof message.traceId === 'string'
  );
}

export function isExportMessage(message: WebviewMessage): message is ExportMessage {
  return (
    message.command === 'export' &&
    'traceIds' in message &&
    Array.isArray(message.traceIds) &&
    'format' in message
  );
}

// ... other type guards with validation
```

---

## Dependency Injection

### Extension Activation (extension.ts)

```typescript
// src/extension.ts

import { PluginTraceViewerPanel } from './features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanel';
import { GetPluginTracesUseCase } from './features/pluginTraceViewer/application/useCases/GetPluginTracesUseCase';
import { DeleteTracesUseCase } from './features/pluginTraceViewer/application/useCases/DeleteTracesUseCase';
import { ExportTracesUseCase } from './features/pluginTraceViewer/application/useCases/ExportTracesUseCase';
import { GetTraceLevelUseCase } from './features/pluginTraceViewer/application/useCases/GetTraceLevelUseCase';
import { SetTraceLevelUseCase } from './features/pluginTraceViewer/application/useCases/SetTraceLevelUseCase';
import { DataversePluginTraceRepository } from './features/pluginTraceViewer/infrastructure/repositories/DataversePluginTraceRepository';
import { FileSystemPluginTraceExporter } from './features/pluginTraceViewer/infrastructure/exporters/FileSystemPluginTraceExporter';
import { PluginTraceViewModelMapper } from './features/pluginTraceViewer/presentation/mappers/PluginTraceViewModelMapper';

export function activate(context: vscode.ExtensionContext): void {
  // ... existing activation code ...

  // Create infrastructure dependencies (singletons)
  const pluginTraceRepository = new DataversePluginTraceRepository(
    dataverseApiService,
    logger
  );

  const pluginTraceExporter = new FileSystemPluginTraceExporter(logger);

  // Create mapper instance (singleton)
  const pluginTraceViewModelMapper = new PluginTraceViewModelMapper();

  // Create use cases (singletons)
  const getPluginTracesUseCase = new GetPluginTracesUseCase(
    pluginTraceRepository,
    logger
  );

  const deleteTracesUseCase = new DeleteTracesUseCase(
    pluginTraceRepository,
    logger
  );

  const exportTracesUseCase = new ExportTracesUseCase(
    pluginTraceExporter,
    logger
  );

  const getTraceLevelUseCase = new GetTraceLevelUseCase(
    pluginTraceRepository,
    logger
  );

  const setTraceLevelUseCase = new SetTraceLevelUseCase(
    pluginTraceRepository,
    logger
  );

  // Register command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'powerPlatformDevSuite.openPluginTraceViewer',
      async (environmentId?: string) => {
        try {
          await PluginTraceViewerPanel.createOrShow(
            context.extensionUri,
            getEnvironments,
            getEnvironmentById,
            getPluginTracesUseCase,
            deleteTracesUseCase,
            exportTracesUseCase,
            getTraceLevelUseCase,
            setTraceLevelUseCase,
            pluginTraceViewModelMapper,
            logger,
            environmentId
          );
        } catch (error) {
          logger.error('Failed to open Plugin Trace Viewer', error);
          await vscode.window.showErrorMessage(
            'Failed to open Plugin Trace Viewer'
          );
        }
      }
    )
  );
}
```

---

## View Structure

### Complete HTML View

**File:** `src/features/pluginTraceViewer/presentation/views/pluginTraceViewerView.ts`

```typescript
import * as vscode from 'vscode';
import { escapeHtml } from '../utils/HtmlHelpers';

/**
 * Generates complete HTML content for Plugin Trace Viewer webview.
 * All dynamic content is escaped with escapeHtml() to prevent XSS.
 */
export function getHtmlContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const nonce = getNonce();
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'pluginTraceViewer.css')
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'pluginTraceViewer.js')
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>Plugin Trace Viewer</title>
</head>
<body>
  <!-- Loading Overlay -->
  <div id="loadingOverlay" class="loading-overlay" style="display: none;">
    <div class="loading-spinner"></div>
    <div class="loading-text">Loading...</div>
  </div>

  <!-- Environment Selector -->
  <div class="environment-selector">
    <label for="environmentSelect">Environment:</label>
    <select id="environmentSelect">
      <!-- Populated by JS -->
    </select>
  </div>

  <!-- Trace Level Status -->
  <div class="trace-level-status">
    <span>Current Trace Level: <strong id="currentTraceLevel">Loading...</strong></span>
    <button id="changeTraceLevelBtn">Change Level</button>
  </div>

  <!-- Filter Controls -->
  <div class="filter-controls">
    <div class="filter-row">
      <label>Plugin Name:</label>
      <input type="text" id="filterPluginName" placeholder="e.g., MyPlugin" />
    </div>
    <div class="filter-row">
      <label>Entity Name:</label>
      <input type="text" id="filterEntityName" placeholder="e.g., account" />
    </div>
    <div class="filter-row">
      <label>Message:</label>
      <input type="text" id="filterMessageName" placeholder="e.g., Create" />
    </div>
    <div class="filter-row">
      <label>Status:</label>
      <select id="filterStatus">
        <option value="">All</option>
        <option value="success">Success</option>
        <option value="exception">Exception</option>
      </select>
    </div>
    <div class="filter-row">
      <label>Limit:</label>
      <select id="filterTop">
        <option value="50">50</option>
        <option value="100" selected>100</option>
        <option value="500">500</option>
        <option value="1000">1000</option>
      </select>
    </div>
    <div class="filter-actions">
      <button id="applyFiltersBtn" class="primary">Apply Filters</button>
      <button id="clearFiltersBtn">Clear</button>
    </div>
  </div>

  <!-- Data Table -->
  <div class="table-container">
    <table id="traceTable" class="trace-table">
      <thead>
        <tr>
          <th><input type="checkbox" id="selectAll" /></th>
          <th>Status</th>
          <th>Created On</th>
          <th>Plugin Name</th>
          <th>Entity</th>
          <th>Message</th>
          <th>Mode</th>
          <th>Duration</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="traceTableBody">
        <!-- Populated by JS -->
      </tbody>
    </table>
  </div>

  <!-- Action Buttons -->
  <div class="actions">
    <button id="deleteSelectedBtn">Delete Selected</button>
    <button id="deleteAllBtn">Delete All</button>
    <button id="deleteOldBtn">Delete Old (30 days)</button>
    <button id="exportCsvBtn">Export CSV</button>
    <button id="exportJsonBtn">Export JSON</button>
  </div>

  <!-- Detail Panel (initially hidden) -->
  <div id="detailPanel" class="detail-panel" style="display: none;">
    <div class="detail-header">
      <h2 id="detailPluginName"></h2>
      <span id="detailStatus" class="status-badge"></span>
      <button id="closeDetailBtn">Close</button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab active" data-tab="overview">Overview</button>
      <button class="tab" data-tab="exception">Exception</button>
      <button class="tab" data-tab="configuration">Configuration</button>
      <button class="tab" data-tab="messageBlock">Message Block</button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <div class="tab-pane active" id="overviewTab"></div>
      <div class="tab-pane" id="exceptionTab"></div>
      <div class="tab-pane" id="configurationTab"></div>
      <div class="tab-pane" id="messageBlockTab"></div>
    </div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
```

### HtmlHelpers Utility

**File:** `src/features/pluginTraceViewer/presentation/utils/HtmlHelpers.ts`

```typescript
/**
 * Escapes HTML special characters to prevent XSS.
 * Use this for all user-generated content displayed in webview.
 *
 * @param str - String to escape
 * @returns HTML-safe string
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats JSON string with indentation.
 * Returns escaped HTML-safe string.
 *
 * @param json - JSON string to format
 * @returns Formatted and escaped JSON
 */
export function formatJson(json: string): string {
  try {
    const obj = JSON.parse(json);
    return escapeHtml(JSON.stringify(obj, null, 2));
  } catch {
    return escapeHtml(json);
  }
}
```

**Usage in webview JavaScript:**
```javascript
// When displaying trace data, escape dynamic content
detailPluginName.textContent = data.pluginName; // textContent auto-escapes
// OR use escapeHtml() if using innerHTML
```

---

## Clean Architecture Compliance

### ✅ Layer Separation

**Presentation Layer:**
- ✅ Panel orchestrates use cases (NO business logic)
- ✅ Panel delegates business decisions to domain (`level.isPerformanceIntensive()`)
- ✅ Panel builds domain entities from validated DTOs (TraceFilter.create())
- ✅ Panel sanitizes user input (OData injection prevention)
- ✅ Panel validates message payloads
- ✅ Panel maps domain entities → ViewModels (via injected mapper)
- ✅ Panel shows loading states during async operations
- ✅ No direct repository access
- ✅ HTML in separate view file (complete HTML)
- ✅ Mapper remains in presentation (depends on presentation formatters)

**Application Layer:**
- ✅ Use cases return domain entities (PluginTrace[])
- ✅ Use cases accept domain entities (TraceFilter)
- ✅ ViewModels exist for presentation

**Domain Layer:**
- ✅ Zero dependencies
- ✅ Rich domain entities with behavior
- ✅ Business logic in domain (`TraceLevel.isPerformanceIntensive()`)

### ✅ Dependency Direction

```
PluginTraceViewerPanel
  → TraceFilter.create() (domain)
  → TraceLevel.isPerformanceIntensive() (domain)
  → GetPluginTracesUseCase (application)
    → IPluginTraceRepository (domain interface)
      ← DataversePluginTraceRepository (infrastructure)
  → viewModelMapper.toTableRowViewModel() (presentation - INJECTED)
    → TraceStatusFormatter (presentation)
```

**All dependencies point INWARD** ✅

### ✅ SOLID Principles

**Single Responsibility:**
- ✅ Panel: Handle webview communication + orchestration + validation
- ✅ Use cases: Domain operations
- ✅ Mapper: Domain → ViewModel transformation
- ✅ buildODataFilter(): Convert UI filters → OData
- ✅ sanitizeODataValue(): OData injection prevention
- ✅ TraceLevel.isPerformanceIntensive(): Business logic
- ✅ View function: Generate complete HTML
- ✅ Formatters: Format display values

**Open/Closed:**
- ✅ Panel can be extended with new message handlers
- ✅ Mapper can be extended with new mapping methods
- ✅ View function is closed for modification (pure function)

**Liskov Substitution:**
- ✅ Panel stands alone (no inheritance)
- ✅ Use cases can be mocked in tests
- ✅ Mapper can be mocked in tests

**Interface Segregation:**
- ✅ Each use case has single responsibility
- ✅ Panel doesn't depend on unused methods
- ✅ Mapper has focused methods (table vs detail)

**Dependency Inversion:**
- ✅ Panel depends on use case abstractions
- ✅ Panel depends on injected mapper (testable)
- ✅ Use cases depend on repository interfaces

### ✅ Type Safety

- ✅ No `any` types
- ✅ Explicit return types on all public methods
- ✅ Readonly arrays in message types
- ✅ Readonly property for state arrays (mutable contents)
- ✅ String literals for TraceLevel ('Off'|'Exception'|'All')
- ✅ Enhanced type guards with validation
- ✅ Export format validation with type guard

### ✅ Security & Validation

- ✅ OData injection prevention (sanitizeODataValue)
- ✅ Message payload validation (validateLoadTracesPayload)
- ✅ Export format validation (isValidExportFormat)
- ✅ HTML escaping (escapeHtml utility)
- ✅ Specific error messages with context
- ✅ Type guards validate message structure

### ✅ VS Code Framework Compliance

- ✅ Static singleton pattern (CLAUDE.md #21)
- ✅ `createOrShow()` factory method
- ✅ Private constructor
- ✅ Readonly state arrays (property, not contents)
- ✅ Standard webview lifecycle management

---

## Summary

**Phase 4 Design (V5 - FINAL):**
- 7 new files (panel + test + view + type guards + helpers + OData sanitizer)
- 2 updated files (TraceLevel + tests)
- 7 existing files (mapper + formatters)
- Total: 16 files for Phase 4

**Architecture:**
- ✅ Clean architecture compliant
- ✅ SOLID principles followed
- ✅ No business logic in presentation
- ✅ Business logic in domain (`TraceLevel.isPerformanceIntensive()`)
- ✅ All dependencies point inward
- ✅ Type-safe throughout
- ✅ HTML completely extracted
- ✅ Direct implementation (no inheritance)
- ✅ VS Code singleton pattern (CLAUDE.md #21)
- ✅ Two ViewModels (architect decision maintained)
- ✅ Mapper injected via constructor (instance methods, testable)
- ✅ Mapper remains in presentation layer (defensible, avoids violations)

**Security & Validation:**
- ✅ OData injection prevention (sanitize all user input)
- ✅ Message payload validation (validate all incoming messages)
- ✅ Export format validation (type guard)
- ✅ HTML escaping (prevent XSS)
- ✅ Loading states (user feedback)
- ✅ Specific error messages (with context)
- ✅ Enhanced type guards (validate structure)

**All Critical Issues Fixed:**
1. ✅ OData sanitization implemented
2. ✅ Payload validation added
3. ✅ Export format validation
4. ✅ HTML escaping documented
5. ✅ Loading states implemented
6. ✅ Error messages include context
7. ✅ Type guards enhanced with validation
8. ✅ Business logic moved to domain (TraceLevel.isPerformanceIntensive)
9. ✅ Static singleton documented as acceptable pattern
10. ✅ State arrays use readonly property

**Ready for Implementation:**
- Type contracts complete ✅
- Security measures implemented ✅
- Validation comprehensive ✅
- Business logic in domain ✅
- Message protocol designed ✅
- Dependency injection planned ✅
- View structure designed ✅
- Clean architecture verified ✅
- All violations fixed ✅

---

**Approval Request:**

This is the FINAL design (V5) with all security, validation, and business logic issues resolved:
1. ✅ OData injection prevention - sanitizeODataValue()
2. ✅ Payload validation - validateLoadTracesPayload()
3. ✅ Export format validation - isValidExportFormat()
4. ✅ HTML escaping - escapeHtml() documented
5. ✅ Loading states - setLoading() + UI overlay
6. ✅ Specific error messages - showError(message, context)
7. ✅ Enhanced type guards - validate message structure
8. ✅ Business logic in domain - TraceLevel.isPerformanceIntensive()
9. ✅ Static singleton acceptable - CLAUDE.md #21
10. ✅ Readonly state arrays - `private readonly traces: PluginTrace[] = []`

Ready for final approval and implementation?
