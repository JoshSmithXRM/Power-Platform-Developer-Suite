# Quick Reference Guide

> **Purpose:** Quick cheat sheet for implementing features following Clean Architecture.

## 📚 Documentation Index

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture overview and principles
- [LAYER_RESPONSIBILITIES.md](./LAYER_RESPONSIBILITIES.md) - What goes in each layer
- [EXECUTION_PIPELINE.md](./EXECUTION_PIPELINE.md) - How requests flow through layers
- [DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md) - File organization
- [COMMUNICATION_PATTERNS.md](./COMMUNICATION_PATTERNS.md) - Webview ↔ Extension Host
- [LOGGING_GUIDE.md](./LOGGING_GUIDE.md) - Logging standards
- **This file** - Quick reference and checklists

---

## 🎯 Implementing a New Feature

### Step 1: Create Feature Structure

```bash
src/features/{featureName}/
├── domain/
│   ├── entities/
│   ├── valueObjects/
│   ├── services/
│   └── interfaces/
├── application/
│   ├── useCases/
│   ├── commands/
│   ├── mappers/
│   └── viewModels/
├── presentation/
│   ├── panels/
│   ├── components/
│   └── behaviors/
└── infrastructure/
    ├── repositories/
    ├── dtos/
    └── services/
```

---

### Step 2: Domain Layer (Bottom-Up)

#### 2.1 Create Entity

```typescript
// src/features/importJobs/domain/entities/ImportJob.ts
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

    // Business logic
    getStatus(): JobStatus {
        if (this.isCompleted()) {
            return this.progress.isComplete()
                ? JobStatus.Completed
                : JobStatus.Failed;
        }
        return JobStatus.InProgress;
    }

    isCompleted(): boolean {
        return this.completedOn !== undefined;
    }

    // Private validation
    private validate(): void {
        if (!this.solutionName || this.solutionName.trim() === '') {
            throw new DomainError('Solution name is required');
        }
    }
}
```

**Checklist:**
- [ ] Entity has constructor with required fields
- [ ] Entity has business logic methods
- [ ] Entity validates itself
- [ ] Entity has NO external dependencies
- [ ] Entity is testable without mocks

---

#### 2.2 Create Value Objects

```typescript
// src/features/importJobs/domain/valueObjects/Progress.ts
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

    equals(other: Progress): boolean {
        return this.value === other.value;
    }
}

// src/features/importJobs/domain/valueObjects/JobStatus.ts
export enum JobStatus {
    Pending = 'Pending',
    InProgress = 'InProgress',
    Completed = 'Completed',
    Failed = 'Failed'
}
```

**Checklist:**
- [ ] Value object is immutable
- [ ] Value object validates itself
- [ ] Value object has equals() method
- [ ] Value object has business logic methods

---

#### 2.3 Create Domain Interfaces

```typescript
// src/features/importJobs/domain/interfaces/IImportJobRepository.ts
export interface IImportJobRepository {
    getById(id: string): Promise<ImportJob | null>;
    getByEnvironment(environmentId: string): Promise<ImportJob[]>;
    save(job: ImportJob): Promise<void>;
}
```

**Checklist:**
- [ ] Interface defines contract for infrastructure
- [ ] Methods return domain entities (not DTOs)
- [ ] Interface is in domain layer

---

### Step 3: Infrastructure Layer

#### 3.1 Create Repository Implementation

```typescript
// src/features/importJobs/infrastructure/repositories/ImportJobRepository.ts
export class ImportJobRepository implements IImportJobRepository {
    constructor(
        private readonly apiClient: IDataverseApiClient,
        private readonly logger: ILogger
    ) {}

    async getByEnvironment(environmentId: string): Promise<ImportJob[]> {
        this.logger.debug('Fetching import jobs', { environmentId });

        const url = `/api/data/v9.2/importjobs?$filter=_environmentid_value eq '${environmentId}'`;
        const response = await this.apiClient.get<ODataResponse<ImportJobDto>>(url);

        return response.value.map(dto => this.toDomain(dto));
    }

    private toDomain(dto: ImportJobDto): ImportJob {
        return new ImportJob(
            dto.importjobid,
            dto.solutionname || 'Unknown',
            new Progress(dto.progress || 0),
            new Date(dto.startedon),
            dto.completedon ? new Date(dto.completedon) : undefined
        );
    }
}

// src/features/importJobs/infrastructure/dtos/ImportJobDto.ts
export interface ImportJobDto {
    importjobid: string;
    solutionname?: string;
    progress?: number;
    startedon: string;
    completedon?: string;
}
```

**Checklist:**
- [ ] Repository implements domain interface
- [ ] Repository uses DTOs for API responses
- [ ] Repository transforms DTOs to domain entities
- [ ] Repository logs operations

---

### Step 4: Application Layer

#### 4.1 Create ViewModel

```typescript
// src/features/importJobs/application/viewModels/ImportJobViewModel.ts
export interface ImportJobViewModel {
    id: string;
    solutionName: string;

    // Pre-formatted for display
    progressDisplay: string; // "75.5%"
    startedOnDisplay: string; // "1/30/2025 10:00 AM"
    completedOnDisplay: string; // "1/30/2025 11:00 AM"

    // UI state
    statusLabel: string; // "Completed"
    statusVariant: 'completed' | 'failed' | 'in-progress' | 'pending';

    // Actions
    canViewXml: boolean;
    canRetry: boolean;
}
```

**Checklist:**
- [ ] ViewModel contains display-ready data
- [ ] ViewModel has no business logic
- [ ] ViewModel has UI-specific fields (statusVariant, canViewXml)

---

#### 4.2 Create Mapper

```typescript
// src/features/importJobs/application/mappers/ImportJobViewModelMapper.ts
export class ImportJobViewModelMapper {
    toViewModel(job: ImportJob): ImportJobViewModel {
        const status = job.getStatus();

        return {
            id: job.id,
            solutionName: job.getSolutionName(),
            progressDisplay: job.getProgress().toPercentageString(),
            startedOnDisplay: this.formatDate(job.getStartedOn()),
            completedOnDisplay: job.isCompleted()
                ? this.formatDate(job.getCompletedOn()!)
                : 'In Progress',
            statusLabel: this.getStatusLabel(status),
            statusVariant: this.getStatusVariant(status),
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
        // Map enum to display string
    }

    private getStatusVariant(status: JobStatus): ImportJobViewModel['statusVariant'] {
        // Map enum to UI variant
    }
}
```

**Checklist:**
- [ ] Mapper transforms domain → ViewModel
- [ ] Mapper handles all formatting (dates, numbers)
- [ ] Mapper has NO business logic

---

#### 4.3 Create Use Case

```typescript
// src/features/importJobs/application/useCases/LoadImportJobsUseCase.ts
export class LoadImportJobsUseCase {
    constructor(
        private readonly repository: IImportJobRepository,
        private readonly mapper: ImportJobViewModelMapper,
        private readonly logger: ILogger
    ) {}

    async execute(request: LoadImportJobsRequest): Promise<LoadImportJobsResponse> {
        this.logger.info('Loading import jobs', { environmentId: request.environmentId });

        // 1. Get domain entities
        const jobs = await this.repository.getByEnvironment(request.environmentId);

        // 2. Apply domain logic
        const activeJobs = jobs
            .filter(job => !job.isArchived())
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

// Request/Response DTOs
export interface LoadImportJobsRequest {
    environmentId: string;
}

export interface LoadImportJobsResponse {
    jobs: ImportJobViewModel[];
    totalCount: number;
}
```

**Checklist:**
- [ ] Use case orchestrates (doesn't implement) logic
- [ ] Use case calls repository for data
- [ ] Use case applies domain logic (filtering, sorting)
- [ ] Use case transforms to ViewModels
- [ ] Use case logs operations
- [ ] Use case has Request/Response DTOs

---

#### 4.4 Create Command (for actions)

```typescript
// src/features/importJobs/application/commands/ViewJobXmlCommand.ts
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
            throw new ApplicationError('Job has no XML data');
        }

        // 3. Get data and format
        const xml = job.getXmlData();
        const formatted = await this.xmlFormatter.format(xml);

        // 4. Open in editor
        await this.documentService.openInEditor(formatted, 'xml');

        this.logger.info('Job XML opened');
    }
}

export interface ViewJobXmlRequest {
    jobId: string;
}
```

**Checklist:**
- [ ] Command has single responsibility
- [ ] Command validates business rules
- [ ] Command logs operations
- [ ] Command has Request DTO

---

### Step 5: Presentation Layer

#### 5.1 Create Panel

```typescript
// src/features/importJobs/presentation/panels/ImportJobViewerPanel.ts
export class ImportJobViewerPanel extends BasePanel {
    private dataTableComponent!: DataTableComponent;

    constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private readonly loadJobsUseCase: LoadImportJobsUseCase,
        private readonly viewXmlCommand: ViewJobXmlCommand
    ) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), {
            viewType: 'importJobViewer',
            title: 'Import Job Viewer'
        });

        this.initializeComponents();
        this.initialize();
    }

    private initializeComponents(): void {
        this.environmentSelectorComponent = this.componentFactory.createEnvironmentSelector({
            id: 'importJobs-envSelector',
            label: 'Environment',
            onChange: async (environmentId: string) => {
                await this.processEnvironmentSelection(environmentId);
            }
        });

        this.dataTableComponent = this.componentFactory.createDataTable({
            id: 'importJobs-table',
            columns: [ /* ... */ ],
            data: []
        });
    }

    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        this.componentLogger.info('Environment changed', { environmentId });

        this.dataTableComponent.setLoading(true, 'Loading import jobs...');

        try {
            const response = await this.loadJobsUseCase.execute({ environmentId });
            this.dataTableComponent.setData(response.jobs);
            this.dataTableComponent.setLoading(false);

        } catch (error) {
            this.handleError(error, 'Failed to load import jobs');
        }
    }

    protected async handleOtherComponentEvent(
        componentId: string,
        eventType: string,
        data?: unknown
    ): Promise<void> {
        if (componentId === 'importJobs-table' && eventType === 'contextMenuItemClicked') {
            const { itemId, rowData } = data as { itemId?: string; rowData?: { id?: string } };

            if (itemId === 'viewXml' && rowData?.id) {
                await this.handleViewXml(rowData.id);
            }
        }
    }

    private async handleViewXml(jobId: string): Promise<void> {
        this.componentLogger.info('User requested XML', { jobId });

        try {
            await this.viewXmlCommand.execute({ jobId });
        } catch (error) {
            this.handleError(error, 'Failed to view XML');
        }
    }

    protected getHtmlContent(): string {
        return PanelComposer.compose(
            [this.environmentSelectorComponent, this.dataTableComponent],
            this.getCommonWebviewResources(),
            'Import Job Viewer'
        );
    }
}
```

**Checklist:**
- [ ] Panel extends BasePanel
- [ ] Panel uses dependency injection (use cases in constructor)
- [ ] Panel creates components via ComponentFactory
- [ ] Panel delegates to use cases/commands
- [ ] Panel has NO business logic
- [ ] Panel logs user actions
- [ ] Panel handles errors with user-friendly messages

---

#### 5.2 Create Behavior (Webview)

```javascript
// resources/webview/js/components/tables/ImportJobTableBehavior.js
class ImportJobTableBehavior extends BaseBehavior {
    getComponentType() {
        return 'DataTable';
    }

    onComponentUpdate(data) {
        if (data.loading) {
            this.showLoadingIndicator(data.loadingMessage);
        } else {
            this.hideLoadingIndicator();
            this.updateTableRows(data.data);
        }
    }

    setupEventHandlers() {
        this.element.addEventListener('contextmenu', (e) => {
            if (e.target.matches('.table-row')) {
                this.showContextMenu(e, e.target.dataset.rowId);
            }
        });
    }

    handleContextMenuClick(itemId, rowId) {
        vscode.postMessage({
            command: 'component-event',
            data: {
                componentId: this.componentId,
                eventType: 'contextMenuItemClicked',
                data: {
                    itemId: itemId,
                    rowData: { id: rowId }
                }
            }
        });
    }

    updateTableRows(rows) {
        const tbody = this.element.querySelector('tbody');
        tbody.innerHTML = rows.map(row => this.renderRow(row)).join('');
    }

    renderRow(row) {
        return `
            <tr data-row-id="${row.id}">
                <td>${row.solutionName}</td>
                <td>${row.progressDisplay}</td>
                <td>${row.startedOnDisplay}</td>
                <td>
                    <span class="status-badge status-badge--${row.statusVariant}">
                        ${row.statusLabel}
                    </span>
                </td>
            </tr>
        `;
    }
}

// Register
ComponentUtils.registerBehavior(new ImportJobTableBehavior());
```

**Checklist:**
- [ ] Behavior extends BaseBehavior
- [ ] Behavior implements getComponentType()
- [ ] Behavior implements onComponentUpdate()
- [ ] Behavior sets up event handlers
- [ ] Behavior sends messages to extension host
- [ ] Behavior has NO business logic

---

## ✅ Pre-Commit Checklist

Before committing new code:

### Domain Layer
- [ ] Entities have behavior (not just properties)
- [ ] Value objects are immutable
- [ ] No external dependencies (VS Code, HTTP, etc.)
- [ ] Business logic is in domain
- [ ] Can be unit tested without mocks

### Application Layer
- [ ] Use cases orchestrate (don't implement)
- [ ] ViewModels contain display-ready data
- [ ] Mappers handle all formatting
- [ ] No business logic
- [ ] Use cases log operations

### Presentation Layer
- [ ] Panels delegate to use cases
- [ ] No business logic
- [ ] No status calculations
- [ ] Logs user actions
- [ ] Error handling with user messages

### Infrastructure Layer
- [ ] Implements domain interfaces
- [ ] DTOs match API shape
- [ ] Transforms DTOs to domain entities
- [ ] Logs technical operations

### Logging
- [ ] Appropriate log levels
- [ ] Rich context (IDs, names, counts)
- [ ] No sensitive data
- [ ] Structured logging

---

## 🚫 Common Mistakes

### Mistake 1: Business Logic in Panel

```typescript
// ❌ BAD
protected async onEnvironmentChanged(environmentId: string): Promise<void> {
    const jobs = await this.repository.getByEnvironment(environmentId);

    const tableData = jobs.map(job => {
        let status = 'Unknown';
        if (job.completedon) {
            status = job.progress < 100 ? 'Failed' : 'Completed';
        }
        return { ...job, status };
    });

    this.dataTable.setData(tableData);
}

// ✅ GOOD
protected async onEnvironmentChanged(environmentId: string): Promise<void> {
    const response = await this.loadJobsUseCase.execute({ environmentId });
    this.dataTable.setData(response.jobs);
}
```

---

### Mistake 2: Anemic Domain Model

```typescript
// ❌ BAD - Just a data bag
export interface ImportJob {
    id: string;
    progress?: number;
    completedon?: string;
}

// ✅ GOOD - Rich model with behavior
export class ImportJob {
    getStatus(): JobStatus {
        // Business logic here
    }

    isCompleted(): boolean {
        // Business logic here
    }
}
```

---

### Mistake 3: Wrong Dependencies

```typescript
// ❌ BAD - Domain depending on infrastructure
import { DataverseApiClient } from '../../../infrastructure/api/DataverseApiClient';

export class ImportJob {
    async load(): Promise<void> {
        // Domain should NOT call API
    }
}

// ✅ GOOD - Infrastructure implementing domain interface
// Domain defines interface
export interface IImportJobRepository {
    getById(id: string): Promise<ImportJob | null>;
}

// Infrastructure implements
export class ImportJobRepository implements IImportJobRepository {
    // Implementation here
}
```

---

## 📖 Where to Find Things

| Need to... | Look in... |
|------------|------------|
| Add business logic | `domain/entities/*.ts` |
| Create value object | `domain/valueObjects/*.ts` |
| Define repository interface | `domain/interfaces/I*Repository.ts` |
| Implement repository | `infrastructure/repositories/*Repository.ts` |
| Create use case | `application/useCases/*UseCase.ts` |
| Create command | `application/commands/*Command.ts` |
| Define ViewModel | `application/viewModels/*ViewModel.ts` |
| Create mapper | `application/mappers/*Mapper.ts` |
| Create panel | `presentation/panels/*Panel.ts` |
| Create component | `presentation/components/*Component.ts` |
| Create behavior | `presentation/behaviors/*Behavior.js` |

---

## 🎓 For C# Developers

| C# Concept | TypeScript Equivalent |
|------------|----------------------|
| Entity Framework entity | Domain entity (with behavior) |
| POCO | DTO (data transfer object) |
| DbContext | Repository |
| MediatR Command | Use Case / Command |
| ViewModel | ViewModel |
| AutoMapper | Mapper class |
| Controller | Panel |
| Razor Component | Component + Behavior |
| SignalR Hub | postMessage handler |
| IActionResult | WebviewMessage |

---

## 💡 Quick Tips

1. **Entities have behavior** - `job.getStatus()` not `calculateStatus(job)`
2. **Use cases orchestrate** - They coordinate, not implement
3. **ViewModels are display-ready** - No formatting in panel
4. **Panels delegate** - Call use cases, update components
5. **Rich logging** - Include context (IDs, names, counts)
6. **Message passing** - Extension Host ↔ Webview communication
7. **Feature-first** - Keep features self-contained
8. **Test domain** - Domain should be easily testable
