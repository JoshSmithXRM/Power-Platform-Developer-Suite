# Execution Pipeline

> **Purpose:** Show how requests flow through the architecture with concrete examples.

## Table of Contents
- [Overview](#overview)
- [Example 1: Loading Import Jobs](#example-1-loading-import-jobs)
- [Example 2: Viewing Job XML](#example-2-viewing-job-xml)
- [Example 3: Refreshing Data](#example-3-refreshing-data)
- [Communication Flow](#communication-flow)

---

## Overview

Requests flow through layers in a predictable pattern:

```
User Action (Webview)
    ↓
Panel (Extension Host)
    ↓
Use Case / Command (Application Layer)
    ↓
Repository / Service (Infrastructure Layer)
    ↓
External API (Dataverse)
    ↓
Domain Entity (Domain Layer)
    ↓
ViewModel (Application Layer)
    ↓
Component Update (Presentation Layer)
    ↓
UI Update (Webview)
```

**Key Principle:** Data flows through layers, each transforming it appropriately:
- **Infrastructure** → Domain entities
- **Domain** → Business logic applied
- **Application** → ViewModels
- **Presentation** → HTML/UI state

---

## Example 1: Loading Import Jobs

**User Story:** User selects an environment, and import jobs are loaded and displayed.

### Step-by-Step Flow

#### 1. User Action (Webview)

**Location:** `resources/webview/js/components/selectors/EnvironmentSelectorBehavior.js`

```javascript
class EnvironmentSelectorBehavior extends BaseBehavior {
    setupEventHandlers() {
        this.select.addEventListener('change', (e) => {
            const environmentId = e.target.value;

            // Send message to extension host
            vscode.postMessage({
                command: 'environment-changed',
                environmentId: environmentId
            });
        });
    }
}
```

**Output:** Message sent to extension host

---

#### 2. Panel Receives Message (Extension Host)

**Location:** `src/features/importJobs/presentation/ImportJobViewerPanel.ts`

```typescript
export class ImportJobViewerPanel extends BasePanel {
    // BasePanel routes 'environment-changed' to this hook
    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        this.logger.info('Environment changed', { environmentId });

        // Set UI to loading state
        this.setComponentLoading(true, 'Loading import jobs...');

        try {
            // Delegate to use case
            await this.loadImportJobs(environmentId);

        } catch (error) {
            this.handleError(error, 'Failed to load import jobs');
        }
    }

    private async loadImportJobs(environmentId: string): Promise<void> {
        // Call use case
        const response = await this.loadImportJobsUseCase.execute({
            environmentId
        });

        // Update component with ViewModels
        this.dataTableComponent.setData(response.jobs);
        this.setComponentLoading(false);
    }
}
```

**Output:** Use case invoked

---

#### 3. Use Case Executes (Application Layer)

**Location:** `src/features/importJobs/application/useCases/LoadImportJobsUseCase.ts`

```typescript
export class LoadImportJobsUseCase {
    constructor(
        private readonly repository: IImportJobRepository,
        private readonly mapper: ImportJobViewModelMapper,
        private readonly logger: ILogger
    ) {}

    async execute(request: LoadImportJobsRequest): Promise<LoadImportJobsResponse> {
        this.logger.info('Loading import jobs', { environmentId: request.environmentId });

        // 1. Get domain entities from repository
        const jobs = await this.repository.getByEnvironment(request.environmentId);

        this.logger.debug('Retrieved jobs from repository', { count: jobs.length });

        // 2. Apply domain logic (filtering, sorting)
        const activeJobs = jobs
            .filter(job => !job.isArchived()) // Domain logic
            .sort((a, b) => b.getStartedOn().getTime() - a.getStartedOn().getTime());

        // 3. Transform to ViewModels
        const viewModels = activeJobs.map(job => this.mapper.toViewModel(job));

        this.logger.info('Import jobs loaded', { count: viewModels.length });

        return {
            jobs: viewModels,
            totalCount: viewModels.length
        };
    }
}
```

**Output:** Repository called

---

#### 4. Repository Fetches Data (Infrastructure Layer)

**Location:** `src/features/importJobs/infrastructure/ImportJobRepository.ts`

```typescript
export class ImportJobRepository implements IImportJobRepository {
    constructor(
        private readonly apiClient: IDataverseApiClient,
        private readonly environmentService: IEnvironmentService,
        private readonly logger: ILogger
    ) {}

    async getByEnvironment(environmentId: string): Promise<ImportJob[]> {
        this.logger.debug('Fetching import jobs from API', { environmentId });

        // 1. Get environment details (for API URL)
        const environment = await this.environmentService.getById(environmentId);
        if (!environment) {
            throw new InfrastructureError(`Environment not found: ${environmentId}`);
        }

        // 2. Build API URL
        const url = `${environment.dataverseUrl}/api/data/v9.2/importjobs?` +
                    `$select=importjobid,solutionname,progress,startedon,completedon&` +
                    `$orderby=startedon desc`;

        // 3. Make API call
        const response = await this.apiClient.get<ODataResponse<ImportJobDto>>(url);

        this.logger.debug('API response received', { count: response.value.length });

        // 4. Transform DTOs to domain entities
        return response.value.map(dto => this.toDomain(dto));
    }

    private toDomain(dto: ImportJobDto): ImportJob {
        // Map API DTO to rich domain entity
        return new ImportJob(
            dto.importjobid,
            dto.solutionname || 'Unknown',
            new Progress(dto.progress || 0), // Value object
            new Date(dto.startedon),
            dto.completedon ? new Date(dto.completedon) : undefined
        );
    }
}
```

**Output:** Array of `ImportJob` domain entities

---

#### 5. Domain Entities Have Behavior (Domain Layer)

**Location:** `src/features/importJobs/domain/entities/ImportJob.ts`

```typescript
export class ImportJob {
    constructor(
        public readonly id: string,
        private readonly solutionName: string,
        private progress: Progress,
        private readonly startedOn: Date,
        private completedOn?: Date,
        private archived: boolean = false
    ) {
        this.validate();
    }

    // Business logic: Determine job status
    getStatus(): JobStatus {
        if (this.isCompleted()) {
            return this.progress.isComplete()
                ? JobStatus.Completed
                : JobStatus.Failed;
        }

        return this.progress.hasStarted()
            ? JobStatus.InProgress
            : JobStatus.Pending;
    }

    isCompleted(): boolean {
        return this.completedOn !== undefined;
    }

    isArchived(): boolean {
        return this.archived;
    }

    getProgress(): Progress {
        return this.progress;
    }

    getSolutionName(): string {
        return this.solutionName;
    }

    getStartedOn(): Date {
        return this.startedOn;
    }

    getCompletedOn(): Date | undefined {
        return this.completedOn;
    }

    hasXmlData(): boolean {
        // Business rule: Only completed jobs have XML
        return this.isCompleted();
    }

    private validate(): void {
        if (!this.solutionName || this.solutionName.trim() === '') {
            throw new DomainError('Solution name is required');
        }
        if (this.startedOn > new Date()) {
            throw new DomainError('Start date cannot be in the future');
        }
    }
}
```

**Output:** Rich domain entities with behavior

---

#### 6. Mapper Transforms to ViewModels (Application Layer)

**Location:** `src/features/importJobs/application/mappers/ImportJobViewModelMapper.ts`

```typescript
export class ImportJobViewModelMapper {
    toViewModel(job: ImportJob): ImportJobViewModel {
        // Get data from domain entity
        const status = job.getStatus();
        const progress = job.getProgress();

        // Transform to presentation-ready format
        return {
            id: job.id,
            solutionName: job.getSolutionName(),

            // Format dates for display
            progressDisplay: progress.toPercentageString(), // "75.5%"
            startedOnDisplay: this.formatDate(job.getStartedOn()),
            completedOnDisplay: job.isCompleted()
                ? this.formatDate(job.getCompletedOn()!)
                : 'In Progress',

            // Map domain status to UI
            statusLabel: this.getStatusLabel(status),
            statusVariant: this.getStatusVariant(status),

            // Determine UI capabilities from business rules
            canViewXml: job.hasXmlData(),
            canRetry: status === JobStatus.Failed
        };
    }

    private formatDate(date: Date): string {
        return date.toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    private getStatusLabel(status: JobStatus): string {
        switch (status) {
            case JobStatus.Completed: return 'Completed';
            case JobStatus.Failed: return 'Failed';
            case JobStatus.InProgress: return 'In Progress';
            case JobStatus.Pending: return 'Pending';
        }
    }

    private getStatusVariant(status: JobStatus): ImportJobViewModel['statusVariant'] {
        switch (status) {
            case JobStatus.Completed: return 'completed';
            case JobStatus.Failed: return 'failed';
            case JobStatus.InProgress: return 'in-progress';
            case JobStatus.Pending: return 'pending';
        }
    }
}
```

**Output:** Array of `ImportJobViewModel` (presentation-ready)

---

#### 7. Component Updates (Presentation Layer)

**Location:** `src/core/presentation/components/DataTableComponent.ts`

```typescript
export class DataTableComponent extends BaseComponent<DataTableConfig> {
    setData(data: unknown[]): void {
        // Store ViewModels
        this.config.data = data;

        // Trigger event bridge to update webview
        this.notifyUpdate();
    }

    private notifyUpdate(): void {
        // Event bridge sends update message to webview
        this.emit('update', {
            componentId: this.config.id,
            data: this.config.data
        });
    }
}
```

**Output:** Message sent to webview

---

#### 8. Behavior Updates UI (Webview)

**Location:** `resources/webview/js/components/tables/DataTableBehavior.js`

```javascript
class DataTableBehavior extends BaseBehavior {
    getComponentType() {
        return 'DataTable';
    }

    onComponentUpdate(data) {
        // Receive ViewModels from extension host
        const rows = data.data;

        // Update DOM
        this.updateTableRows(rows);
    }

    updateTableRows(rows) {
        const tbody = this.element.querySelector('tbody');

        // Generate HTML from ViewModels (already formatted)
        tbody.innerHTML = rows.map(row => `
            <tr data-row-id="${row.id}">
                <td>${row.solutionName}</td>
                <td class="text-center">${row.progressDisplay}</td>
                <td>${row.startedOnDisplay}</td>
                <td>${row.completedOnDisplay}</td>
                <td class="text-center">
                    <span class="status-badge status-badge--${row.statusVariant}">
                        ${row.statusLabel}
                    </span>
                </td>
                <td class="actions">
                    ${row.canViewXml ? '<button data-action="viewXml">View XML</button>' : ''}
                    ${row.canRetry ? '<button data-action="retry">Retry</button>' : ''}
                </td>
            </tr>
        `).join('');
    }
}
```

**Output:** UI updated with data

---

### Summary: Data Transformations

```
API DTO (Infrastructure)
    {
        importjobid: "abc-123",
        solutionname: "My Solution",
        progress: 75.5,
        startedon: "2025-01-30T10:00:00Z",
        completedon: null
    }
        ↓ Repository.toDomain()

Domain Entity (Domain)
    ImportJob {
        id: "abc-123",
        solutionName: "My Solution",
        progress: Progress(75.5),
        startedOn: Date(2025-01-30T10:00:00Z),
        completedOn: undefined,
        getStatus(): JobStatus.InProgress
    }
        ↓ Mapper.toViewModel()

ViewModel (Application)
    ImportJobViewModel {
        id: "abc-123",
        solutionName: "My Solution",
        progressDisplay: "75.5%",
        startedOnDisplay: "1/30/2025 10:00 AM",
        completedOnDisplay: "In Progress",
        statusLabel: "In Progress",
        statusVariant: "in-progress",
        canViewXml: false,
        canRetry: false
    }
        ↓ Component.setData()

HTML (Presentation)
    <tr>
        <td>My Solution</td>
        <td>75.5%</td>
        <td>1/30/2025 10:00 AM</td>
        <td>In Progress</td>
        <td><span class="status-badge status-badge--in-progress">In Progress</span></td>
        <td></td>
    </tr>
```

---

## Example 2: Viewing Job XML

**User Story:** User right-clicks a job row and selects "View XML."

### Step-by-Step Flow

#### 1. User Action (Webview)

```javascript
// DataTableBehavior.js
setupEventHandlers() {
    this.element.addEventListener('contextmenu', (e) => {
        if (e.target.matches('.table-row')) {
            this.showContextMenu(e, e.target.dataset.rowId);
        }
    });
}

handleContextMenuClick(action, rowId) {
    // Send command to extension host
    vscode.postMessage({
        command: 'table-context-menu',
        componentId: this.componentId,
        action: action, // 'viewXml'
        rowId: rowId
    });
}
```

---

#### 2. Panel Handles Message (Extension Host)

```typescript
// ImportJobViewerPanel.ts
protected async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.command) {
        case 'table-context-menu':
            await this.handleContextMenuAction(
                message.action,
                message.rowId
            );
            break;
    }
}

private async handleContextMenuAction(action: string, rowId: string): Promise<void> {
    if (action === 'viewXml') {
        // Delegate to command
        await this.viewJobXmlCommand.execute({ jobId: rowId });
    }
}
```

---

#### 3. Command Executes (Application Layer)

```typescript
// ViewJobXmlCommand.ts
export class ViewJobXmlCommand {
    constructor(
        private readonly repository: IImportJobRepository,
        private readonly xmlFormatter: IXmlFormatterService,
        private readonly documentService: IDocumentService,
        private readonly logger: ILogger
    ) {}

    async execute(request: ViewJobXmlRequest): Promise<void> {
        this.logger.info('Viewing job XML', { jobId: request.jobId });

        // 1. Get domain entity
        const job = await this.repository.getById(request.jobId);
        if (!job) {
            throw new ApplicationError(`Job not found: ${request.jobId}`);
        }

        // 2. Business rule check
        if (!job.hasXmlData()) {
            throw new ApplicationError('Job has no XML data available');
        }

        // 3. Get XML from domain
        const xml = job.getXmlData();

        // 4. Format using infrastructure service
        const formatted = await this.xmlFormatter.format(xml);

        // 5. Open in editor (infrastructure)
        await this.documentService.openInEditor(formatted, 'xml');

        this.logger.info('Job XML opened in editor');
    }
}
```

---

#### 4. Infrastructure Services Execute

```typescript
// ImportJobRepository.ts
async getById(id: string): Promise<ImportJob | null> {
    const url = `/api/data/v9.2/importjobs(${id})?$select=importjobid,data,...`;
    const dto = await this.apiClient.get<ImportJobDto>(url);
    return dto ? this.toDomain(dto) : null;
}

// XmlFormatterService.ts (implements IXmlFormatterService)
export class XmlFormatterService implements IXmlFormatterService {
    async format(xml: string): Promise<string> {
        // XML formatting logic
        return formattedXml;
    }
}

// VsCodeDocumentService.ts (implements IDocumentService)
export class VsCodeDocumentService implements IDocumentService {
    async openInEditor(content: string, language: string): Promise<void> {
        const document = await vscode.workspace.openTextDocument({
            content,
            language
        });
        await vscode.window.showTextDocument(document);
    }
}
```

---

## Example 3: Refreshing Data

**User Story:** User clicks the refresh button.

### Step-by-Step Flow

#### 1. User Action (Webview)

```javascript
// ActionBarBehavior.js
setupEventHandlers() {
    this.element.addEventListener('click', (e) => {
        if (e.target.matches('.action-button')) {
            const actionId = e.target.dataset.actionId;

            vscode.postMessage({
                command: 'action-clicked',
                componentId: this.componentId,
                actionId: actionId // 'refresh'
            });
        }
    });
}
```

---

#### 2. Panel Handles Message (Extension Host)

```typescript
// BasePanel.ts handles common actions
protected async handleMessage(message: WebviewMessage): Promise<void> {
    if (message.command === 'action-clicked' && message.actionId === 'refresh') {
        // Standard refresh action
        await this.handleRefresh();
        return;
    }

    // Delegate to child panel
    await this.handlePanelSpecificMessage(message);
}

// BasePanel provides refresh implementation
protected async handleRefresh(): Promise<void> {
    const environmentId = this.getCurrentEnvironmentId();
    if (!environmentId) {
        this.showWarning('Please select an environment first');
        return;
    }

    // Reload data for current environment
    await this.loadEnvironmentData(environmentId);
}

// ImportJobViewerPanel implements the hook
protected async loadEnvironmentData(environmentId: string): Promise<void> {
    // Same flow as initial load
    const response = await this.loadImportJobsUseCase.execute({ environmentId });
    this.dataTableComponent.setData(response.jobs);
}
```

---

## Communication Flow

### Extension Host → Webview

```typescript
// Panel (Extension Host)
this.postMessage({
    command: 'update-component',
    componentId: 'importJobs-table',
    data: viewModels
});
```

```javascript
// Behavior (Webview)
window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.command === 'update-component') {
        const behavior = findBehavior(message.componentId);
        behavior.onComponentUpdate(message.data);
    }
});
```

### Webview → Extension Host

```javascript
// Behavior (Webview)
vscode.postMessage({
    command: 'environment-changed',
    environmentId: '123'
});
```

```typescript
// Panel (Extension Host)
this.panel.webview.onDidReceiveMessage(async (message) => {
    await this.handleMessage(message);
});
```

---

## Key Takeaways

1. **Each layer transforms data appropriately**
   - Infrastructure: DTO → Domain Entity
   - Application: Domain Entity → ViewModel
   - Presentation: ViewModel → HTML

2. **Business logic lives in Domain**
   - `job.getStatus()` not `calculateStatus(job)`
   - `job.hasXmlData()` not `job.isCompleted()`

3. **Use Cases orchestrate, don't implement**
   - Call repository, apply domain logic, map to ViewModels
   - No business rules in use cases

4. **Panels delegate, don't implement**
   - Call use cases/commands
   - Update components with ViewModels
   - Handle UI state (loading, errors)

5. **Communication is one-way**
   - Extension Host → Webview: postMessage with data
   - Webview → Extension Host: postMessage with commands
   - No direct function calls across boundary
