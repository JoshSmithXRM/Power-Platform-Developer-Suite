# Layer Responsibilities

> **Purpose:** Define exactly what belongs in each layer and what doesn't.

## Table of Contents
- [Domain Layer](#domain-layer)
- [Application Layer](#application-layer)
- [Presentation Layer](#presentation-layer)
- [Infrastructure Layer](#infrastructure-layer)
- [Quick Reference](#quick-reference)

---

## Domain Layer

**Location:** `src/features/{feature}/domain/`

**Purpose:** Core business logic, entities, and rules. The heart of the application.

### ✅ Domain Layer Contains

#### 1. Entities
Objects with identity and lifecycle. Rich models with behavior.

```typescript
// ✅ GOOD - Entity with behavior
export class ImportJob {
    constructor(
        public readonly id: string,
        private readonly solutionName: string,
        private progress: Progress, // Value object
        private readonly startedOn: Date,
        private completedOn?: Date
    ) {
        this.validate();
    }

    // Business logic belongs here
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

    // Domain validation
    private validate(): void {
        if (!this.solutionName || this.solutionName.trim() === '') {
            throw new DomainError('Solution name is required');
        }
        if (this.startedOn > new Date()) {
            throw new DomainError('Start date cannot be in the future');
        }
    }

    // Business operations
    markAsCompleted(completionDate: Date): void {
        if (this.isCompleted()) {
            throw new DomainError('Job is already completed');
        }
        this.completedOn = completionDate;
    }
}
```

#### 2. Value Objects
Immutable objects defined by their values, not identity.

```typescript
// ✅ GOOD - Value object with behavior
export class Progress {
    private readonly value: number;

    constructor(value: number) {
        if (value < 0 || value > 100) {
            throw new DomainError('Progress must be between 0 and 100');
        }
        this.value = value;
    }

    getValue(): number {
        return this.value;
    }

    isComplete(): boolean {
        return this.value === 100;
    }

    hasStarted(): boolean {
        return this.value > 0;
    }

    toPercentageString(): string {
        return `${this.value}%`;
    }

    equals(other: Progress): boolean {
        return this.value === other.value;
    }
}

// Enums are also value objects
export enum JobStatus {
    Pending = 'Pending',
    InProgress = 'InProgress',
    Completed = 'Completed',
    Failed = 'Failed'
}
```

#### 3. Domain Services
Business logic that doesn't naturally fit in a single entity.

```typescript
// ✅ GOOD - Domain service for cross-entity logic
export class ImportJobDomainService {
    canRetryJob(job: ImportJob, maxRetries: number): boolean {
        return job.getStatus() === JobStatus.Failed &&
               job.getRetryCount() < maxRetries;
    }

    calculateEstimatedCompletion(job: ImportJob): Date | null {
        if (job.isCompleted()) return null;

        const progress = job.getProgress().getValue();
        const elapsed = Date.now() - job.getStartedOn().getTime();
        const rate = progress / elapsed;
        const remaining = (100 - progress) / rate;

        return new Date(Date.now() + remaining);
    }
}
```

#### 4. Domain Interfaces (for Infrastructure)
Define contracts that infrastructure must implement.

```typescript
// ✅ GOOD - Repository interface (defined in domain, implemented in infrastructure)
export interface IImportJobRepository {
    getById(id: string): Promise<ImportJob | null>;
    getByEnvironment(environmentId: string): Promise<ImportJob[]>;
    save(job: ImportJob): Promise<void>;
    delete(id: string): Promise<void>;
}

// ✅ GOOD - Domain service interface
export interface IXmlFormatterService {
    format(xml: string): string;
    validate(xml: string): ValidationResult;
}
```

### ❌ Domain Layer Does NOT Contain

- ❌ HTTP calls, API clients, fetch/axios
- ❌ File I/O, database access
- ❌ VS Code API (`vscode.window`, `vscode.workspace`, etc.)
- ❌ UI components, HTML generation
- ❌ Framework-specific code
- ❌ External library dependencies (except pure utilities)
- ❌ Presentation formatting (date formatting, currency, etc.)

```typescript
// ❌ BAD - Domain entity with infrastructure concerns
export class ImportJob {
    async loadFromApi(environmentId: string): Promise<void> {
        // ❌ NO! API calls don't belong in domain
        const response = await fetch(`/api/jobs/${environmentId}`);
        // ...
    }

    toHtml(): string {
        // ❌ NO! HTML generation doesn't belong in domain
        return `<div>${this.solutionName}</div>`;
    }
}
```

---

## Application Layer

**Location:** `src/features/{feature}/application/`

**Purpose:** Orchestrate domain logic and coordinate between layers. Think "use cases."

### ✅ Application Layer Contains

#### 1. Use Cases / Commands
Single-responsibility operations that accomplish a user goal.

```typescript
// ✅ GOOD - Use case orchestrates domain + infrastructure
export class LoadImportJobsUseCase {
    constructor(
        private readonly repository: IImportJobRepository,
        private readonly mapper: ImportJobViewModelMapper,
        private readonly logger: ILogger
    ) {}

    async execute(request: LoadImportJobsRequest): Promise<LoadImportJobsResponse> {
        this.logger.info('Loading import jobs', { environmentId: request.environmentId });

        try {
            // 1. Get domain entities
            const jobs = await this.repository.getByEnvironment(request.environmentId);

            // 2. Apply domain logic (filtering, sorting)
            const activeJobs = jobs
                .filter(job => !job.isArchived())
                .sort((a, b) => b.getStartedOn().getTime() - a.getStartedOn().getTime());

            // 3. Transform to view models
            const viewModels = activeJobs.map(job => this.mapper.toViewModel(job));

            this.logger.info('Import jobs loaded', { count: viewModels.length });

            return {
                jobs: viewModels,
                totalCount: viewModels.length
            };

        } catch (error) {
            this.logger.error('Failed to load import jobs', error);
            throw new ApplicationError('Failed to load import jobs', error);
        }
    }
}

// Request/Response DTOs
export interface LoadImportJobsRequest {
    environmentId: string;
}

export interface LoadImportJobsResponse {
    jobs: ImportJobViewModel[];
    totalCount: number;
}
```

#### 2. Commands (for actions with side effects)
User actions that change state.

```typescript
// ✅ GOOD - Command for user action
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

        // 2. Get XML data
        const xml = job.getXmlData();
        if (!xml) {
            throw new ApplicationError('Job has no XML data');
        }

        // 3. Format using domain service
        const formatted = this.xmlFormatter.format(xml);

        // 4. Open in editor (infrastructure concern)
        await this.documentService.openInEditor(formatted, 'xml');

        this.logger.info('Job XML opened in editor');
    }
}

export interface ViewJobXmlRequest {
    jobId: string;
}
```

#### 3. ViewModels (DTOs for presentation)
Data shapes optimized for UI display.

```typescript
// ✅ GOOD - ViewModel with presentation-ready data
export interface ImportJobViewModel {
    id: string;
    solutionName: string;

    // Pre-formatted for display
    progressDisplay: string; // "75.5%"
    startedOnDisplay: string; // "1/30/2025 10:30 AM"
    completedOnDisplay: string; // "1/30/2025 11:15 AM" or "In Progress"

    // UI state
    statusLabel: string; // "Completed", "Failed", "In Progress"
    statusVariant: 'completed' | 'failed' | 'in-progress' | 'pending';

    // Actions
    canViewXml: boolean;
    canRetry: boolean;
}
```

#### 4. Mappers
Transform between domain models and ViewModels.

```typescript
// ✅ GOOD - Mapper handles transformation
export class ImportJobViewModelMapper {
    toViewModel(job: ImportJob): ImportJobViewModel {
        const status = job.getStatus();
        const progress = job.getProgress();

        return {
            id: job.id,
            solutionName: job.getSolutionName(),

            // Format for display
            progressDisplay: progress.toPercentageString(),
            startedOnDisplay: this.formatDate(job.getStartedOn()),
            completedOnDisplay: job.isCompleted()
                ? this.formatDate(job.getCompletedOn()!)
                : 'In Progress',

            // Map domain status to UI
            statusLabel: this.getStatusLabel(status),
            statusVariant: this.getStatusVariant(status),

            // Business rules determine UI capabilities
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

### ❌ Application Layer Does NOT Contain

- ❌ Business rules (those belong in Domain)
- ❌ UI components, HTML generation
- ❌ Direct API calls (use repositories)
- ❌ Direct file I/O
- ❌ VS Code-specific UI APIs

```typescript
// ❌ BAD - Use case with business logic
export class LoadImportJobsUseCase {
    async execute(environmentId: string): Promise<ImportJobViewModel[]> {
        const jobs = await this.repository.getByEnvironment(environmentId);

        return jobs.map(job => {
            // ❌ NO! Business logic belongs in domain
            let status = 'Unknown';
            if (job.completedon) {
                status = job.progress < 100 ? 'Failed' : 'Completed';
            }

            return { ...job, status };
        });
    }
}
```

---

## Presentation Layer

**Location:** `src/features/{feature}/presentation/`

**Purpose:** UI components and panels. Render data and capture user input.

### ✅ Presentation Layer Contains

#### 1. Panels (Extension Host side)
Top-level UI containers that orchestrate components and handle user actions.

```typescript
// ✅ GOOD - Panel delegates to use cases
export class ImportJobViewerPanel extends BasePanel {
    private readonly loadJobsUseCase: LoadImportJobsUseCase;
    private readonly viewXmlCommand: ViewJobXmlCommand;

    constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        // Use cases injected
        loadJobsUseCase: LoadImportJobsUseCase,
        viewXmlCommand: ViewJobXmlCommand
    ) {
        super(panel, extensionUri);
        this.loadJobsUseCase = loadJobsUseCase;
        this.viewXmlCommand = viewXmlCommand;
    }

    // Hook called when environment changes
    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        // Set loading state
        this.setLoading(true, 'Loading import jobs...');

        try {
            // Delegate to use case
            const response = await this.loadJobsUseCase.execute({ environmentId });

            // Update UI with ViewModels
            this.dataTable.setData(response.jobs);
            this.setLoading(false);

        } catch (error) {
            this.handleError(error, 'Failed to load import jobs');
        }
    }

    // Handle user actions
    protected async handleViewXml(jobId: string): Promise<void> {
        try {
            // Delegate to command
            await this.viewXmlCommand.execute({ jobId });

        } catch (error) {
            this.handleError(error, 'Failed to view XML');
        }
    }
}
```

#### 2. Components (Extension Host side)
Reusable UI building blocks that generate HTML and manage state.

```typescript
// ✅ GOOD - Component generates HTML, no business logic
export class DataTableComponent extends BaseComponent<DataTableConfig> {
    private data: unknown[] = [];

    setData(data: unknown[]): void {
        this.data = data;
        this.notifyUpdate(); // Triggers event bridge update
    }

    generateHTML(): string {
        return this.view.generateHTML();
    }

    setLoading(isLoading: boolean, message?: string): void {
        this.config.loading = isLoading;
        this.config.loadingMessage = message;
        this.notifyUpdate();
    }

    // No business logic - just UI state management
}
```

#### 3. Behaviors (Webview side - JavaScript)
Client-side scripts that add interactivity to components.

```javascript
// ✅ GOOD - Behavior handles user interaction and updates DOM
class DataTableBehavior extends BaseBehavior {
    getComponentType() {
        return 'DataTable';
    }

    onComponentUpdate(data) {
        // Update table rows
        this.updateRows(data.rows);

        // Update loading state
        if (data.loading) {
            this.showLoadingIndicator(data.loadingMessage);
        } else {
            this.hideLoadingIndicator();
        }
    }

    setupEventHandlers() {
        // Handle row clicks
        this.element.addEventListener('click', (e) => {
            if (e.target.matches('.row-action')) {
                const rowId = e.target.dataset.rowId;
                const action = e.target.dataset.action;

                // Send message to extension host
                vscode.postMessage({
                    command: 'row-action',
                    componentId: this.componentId,
                    rowId,
                    action
                });
            }
        });
    }

    // Pure DOM manipulation - no business logic
    updateRows(rows) {
        const tbody = this.element.querySelector('tbody');
        tbody.innerHTML = rows.map(row => this.renderRow(row)).join('');
    }
}
```

### ❌ Presentation Layer Does NOT Contain

- ❌ Business logic (status calculation, validation)
- ❌ Data transformation (use ViewModels from Application layer)
- ❌ Direct API calls
- ❌ Repository access

```typescript
// ❌ BAD - Panel calculating status
protected async onEnvironmentChanged(environmentId: string): Promise<void> {
    const jobs = await this.repository.getByEnvironment(environmentId);

    // ❌ NO! Business logic in presentation
    const tableData = jobs.map(job => {
        let status = 'Unknown';
        if (job.completedon) {
            status = job.progress < 100 ? 'Failed' : 'Completed';
        }
        return { ...job, status };
    });

    this.dataTable.setData(tableData);
}

// ✅ GOOD - Panel uses ViewModels
protected async onEnvironmentChanged(environmentId: string): Promise<void> {
    const response = await this.loadJobsUseCase.execute({ environmentId });
    this.dataTable.setData(response.jobs); // Already transformed
}
```

---

## Infrastructure Layer

**Location:** `src/features/{feature}/infrastructure/` and `src/infrastructure/`

**Purpose:** Implementation of external dependencies. The "plumbing."

### ✅ Infrastructure Layer Contains

#### 1. Repositories (implement domain interfaces)
Data access implementations.

```typescript
// ✅ GOOD - Repository implements domain interface
export class ImportJobRepository implements IImportJobRepository {
    constructor(
        private readonly apiClient: IDataverseApiClient,
        private readonly logger: ILogger
    ) {}

    async getById(id: string): Promise<ImportJob | null> {
        this.logger.debug('Fetching import job', { id });

        const url = `/api/data/v9.2/importjobs(${id})`;
        const dto = await this.apiClient.get<ImportJobDto>(url);

        return dto ? this.toDomain(dto) : null;
    }

    async getByEnvironment(environmentId: string): Promise<ImportJob[]> {
        this.logger.debug('Fetching import jobs for environment', { environmentId });

        const url = `/api/data/v9.2/importjobs?$filter=_environmentid_value eq '${environmentId}'`;
        const response = await this.apiClient.get<ODataResponse<ImportJobDto>>(url);

        return response.value.map(dto => this.toDomain(dto));
    }

    async save(job: ImportJob): Promise<void> {
        const dto = this.toDto(job);
        await this.apiClient.post('/api/data/v9.2/importjobs', dto);
    }

    // Map external DTO to domain entity
    private toDomain(dto: ImportJobDto): ImportJob {
        return new ImportJob(
            dto.importjobid,
            dto.solutionname || 'Unknown',
            new Progress(dto.progress || 0),
            new Date(dto.startedon),
            dto.completedon ? new Date(dto.completedon) : undefined
        );
    }

    // Map domain entity to external DTO
    private toDto(job: ImportJob): ImportJobDto {
        return {
            importjobid: job.id,
            solutionname: job.getSolutionName(),
            progress: job.getProgress().getValue(),
            startedon: job.getStartedOn().toISOString(),
            completedon: job.isCompleted() ? job.getCompletedOn()!.toISOString() : undefined
        };
    }
}

// DTO matches external API shape
interface ImportJobDto {
    importjobid: string;
    solutionname?: string;
    progress?: number;
    startedon: string;
    completedon?: string;
}
```

#### 2. API Clients
HTTP communication with external services.

```typescript
// ✅ GOOD - API client handles HTTP concerns
export class DataverseApiClient implements IDataverseApiClient {
    constructor(
        private readonly authService: IAuthenticationService,
        private readonly logger: ILogger
    ) {}

    async get<T>(url: string): Promise<T> {
        const token = await this.authService.getAccessToken();

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new ApiError(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    // post, put, delete, etc.
}
```

#### 3. External Service Implementations
File system, VS Code APIs, etc.

```typescript
// ✅ GOOD - VS Code document service
export class VsCodeDocumentService implements IDocumentService {
    async openInEditor(content: string, language: string): Promise<void> {
        const document = await vscode.workspace.openTextDocument({
            content,
            language
        });

        await vscode.window.showTextDocument(document);
    }

    async saveToFile(content: string, filePath: string): Promise<void> {
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(filePath),
            Buffer.from(content, 'utf8')
        );
    }
}
```

### ❌ Infrastructure Layer Does NOT Contain

- ❌ Business logic
- ❌ UI components
- ❌ Use cases or commands

---

## Quick Reference

### Where Does This Go?

| Code | Layer | Why |
|------|-------|-----|
| `class ImportJob` with `getStatus()` | Domain | Entity with behavior |
| `enum JobStatus` | Domain | Value object |
| `interface IImportJobRepository` | Domain | Contract (dependency inversion) |
| `class LoadImportJobsUseCase` | Application | Orchestrates domain + infrastructure |
| `interface ImportJobViewModel` | Application | DTO for presentation |
| `class ImportJobViewModelMapper` | Application | Transform domain ↔ ViewModel |
| `class ImportJobViewerPanel` | Presentation | UI container |
| `class DataTableComponent` | Presentation | Reusable UI component |
| `class ImportJobRepository` | Infrastructure | Implements domain interface |
| `class DataverseApiClient` | Infrastructure | HTTP calls |
| Date formatting logic | Application (Mapper) | Presentation concern |
| Status calculation | Domain (Entity) | Business logic |
| XML formatting | Infrastructure (Service) | Technical operation |

---

## Validation Checklist

Before committing code, ask:

### Domain Layer
- [ ] Contains only pure business logic
- [ ] No external dependencies (VS Code, HTTP, etc.)
- [ ] Entities have behavior, not just properties
- [ ] Can be unit tested without mocks

### Application Layer
- [ ] No business logic (delegates to domain)
- [ ] No direct infrastructure code (uses interfaces)
- [ ] Use cases are single responsibility
- [ ] ViewModels contain display-ready data

### Presentation Layer
- [ ] No business logic
- [ ] No status calculations
- [ ] No data transformation
- [ ] Delegates to use cases/commands

### Infrastructure Layer
- [ ] Implements domain interfaces
- [ ] No business logic
- [ ] Handles external I/O only
