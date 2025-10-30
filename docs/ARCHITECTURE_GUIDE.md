# Architecture Documentation

> **Status:** Living Document - Update as architecture evolves

## Overview

This extension follows **Clean Architecture** principles with a **feature-first** organization. Think of it like a modular ASP.NET Core solution where each feature is self-contained with its own layers.

### For C# Developers

If you're coming from C#, here's the mental model:

| VS Code Extension | C# Equivalent |
|-------------------|---------------|
| Extension Host | ASP.NET Core Backend (runs in Node.js) |
| Webview | Blazor/React Frontend (HTML/JS in iframe) |
| postMessage API | SignalR/HTTP messages |
| Panel | Controller or Razor Page |
| Component | Razor Component or Partial View |
| Service | Service class (business logic) |
| Repository Pattern | Same - data access abstraction |

**Key Difference:** Extension Host and Webview run in **completely separate JavaScript contexts**. They cannot call each other's functions directly. All communication is via message passing (like HTTP requests, but in-memory).

---

## Core Principles

### 1. Separation of Concerns
- **Domain** = Business logic and entities (pure TypeScript, no UI, no API)
- **Application** = Use cases and orchestration (coordinates domain + infrastructure)
- **Presentation** = UI components and panels (VS Code webviews)
- **Infrastructure** = External dependencies (API calls, file system, VS Code API)

### 2. Dependency Rule
Dependencies point **inward**:
```text
Infrastructure ──→ Application ──→ Domain
Presentation ──→ Application ──→ Domain
```

- Domain has ZERO dependencies
- Application depends only on Domain
- Infrastructure implements interfaces defined in Domain
- Presentation depends on Application (via use cases/commands)

### 3. Framework Independence
- Domain logic must work without VS Code
- Domain logic must work without any UI framework
- Domain logic must be testable in isolation

---

## Layers Defined

### 🎯 Domain Layer

**Purpose:** Core business logic, entities, and rules. This is the heart of your application.

**Analogies:**
- C#: Entity Framework entities with actual behavior (NOT anemic POCOs)
- DDD: Aggregates, Value Objects, Domain Services

**Contains:**
- **Entities** - Objects with identity and behavior (e.g., `ImportJob`, `Solution`)
- **Value Objects** - Immutable objects defined by their values (e.g., `JobStatus`, `Progress`)
- **Domain Services** - Business logic that doesn't belong to a single entity
- **Domain Interfaces** - Contracts for infrastructure (e.g., `IImportJobRepository`)

**Rules:**
- ✅ Pure TypeScript/JavaScript - no external dependencies
- ✅ Business rules and validation
- ✅ Rich domain models with behavior (NOT anemic interfaces)
- ❌ NO imports from infrastructure, application, or presentation
- ❌ NO framework-specific code (VS Code, HTTP, etc.)
- ❌ NO UI concerns

**Example:**
```typescript
// ✅ GOOD - Rich domain model
export class ImportJob {
    constructor(
        public readonly id: string,
        public readonly solutionName: string,
        private readonly progress: number,
        private readonly startedOn: Date,
        private readonly completedOn?: Date
    ) {}

    getStatus(): JobStatus {
        if (this.completedOn) {
            return this.progress < 100
                ? JobStatus.Failed
                : JobStatus.Completed;
        }
        return this.progress > 0
            ? JobStatus.InProgress
            : JobStatus.Failed;
    }

    isComplete(): boolean {
        return this.completedOn !== undefined;
    }

    validate(): ValidationResult {
        // Business validation logic
    }
}

// ❌ BAD - Anemic model (just a data bag)
export interface ImportJob {
    id: string;
    solutionName?: string;
    progress?: number;
    startedOn?: string;
    completedOn?: string;
}
```

---

### 🎮 Application Layer

**Purpose:** Orchestrate domain logic and coordinate between layers. Think of this as your "use case" layer.

**Analogies:**
- C#: MediatR commands/queries, Application Services
- MVC: Controller actions (business logic extracted from controllers)
- CQRS: Command Handlers, Query Handlers

**Contains:**
- **Use Cases/Commands** - Single responsibility operations (e.g., `LoadImportJobsUseCase`)
- **DTOs/ViewModels** - Data transfer objects for presentation (e.g., `ImportJobViewModel`)
- **Mappers** - Transform domain ↔ DTO/ViewModel
- **Application Services** - Orchestrate multiple domain services

**Rules:**
- ✅ Can depend on Domain layer
- ✅ Defines interfaces for infrastructure (dependency inversion)
- ✅ Coordinates domain logic
- ✅ No business rules (those belong in Domain)
- ❌ NO direct UI code (no VS Code webview APIs)
- ❌ NO direct infrastructure code (no HTTP, no file I/O)

**Example:**
```typescript
// ✅ GOOD - Use case orchestrates domain + infrastructure
export class LoadImportJobsUseCase {
    constructor(
        private repository: IImportJobRepository, // Interface from domain
        private mapper: ImportJobViewModelMapper
    ) {}

    async execute(environmentId: string): Promise<ImportJobViewModel[]> {
        // 1. Get domain entities from repository
        const jobs = await this.repository.getByEnvironment(environmentId);

        // 2. Apply domain logic
        const activeJobs = jobs.filter(job => job.isRelevant());

        // 3. Transform to view models for presentation
        return activeJobs.map(job => this.mapper.toViewModel(job));
    }
}

// ViewModel (DTO for presentation layer)
export interface ImportJobViewModel {
    id: string;
    solutionName: string;
    progressDisplay: string; // "75.5%"
    statusLabel: string; // "In Progress"
    statusVariant: 'completed' | 'failed' | 'in-progress';
    startedOnDisplay: string; // "1/30/2025 10:30 AM"
}
```

---

### 🎨 Presentation Layer

**Purpose:** UI components and panels. Render data and capture user input.

**Analogies:**
- C#: Razor views, Blazor components, WPF XAML
- MVC: Views and View Models
- React: Components and props

**Contains:**
- **Panels** - Top-level UI containers (like Controllers or Pages)
- **Components** - Reusable UI elements (like Razor components)
- **Behaviors** - Client-side JavaScript for webview interactivity
- **View State** - UI-specific state (e.g., "is loading", "selected row")

**Rules:**
- ✅ Can depend on Application layer (use cases)
- ✅ Handles user interactions
- ✅ Renders data from ViewModels
- ✅ Manages UI state (loading, error, selected items)
- ❌ NO business logic (no calculations, no validation)
- ❌ NO direct data access (use Application layer)
- ❌ NO domain knowledge (doesn't know what "progress < 100" means)

**Example:**
```typescript
// ✅ GOOD - Panel delegates to use case
export class ImportJobViewerPanel extends BasePanel {
    constructor(
        private loadImportJobsUseCase: LoadImportJobsUseCase,
        private viewJobXmlCommand: ViewJobXmlCommand
    ) {
        super();
    }

    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        // Set UI state
        this.setLoading(true, 'Loading import jobs...');

        // Delegate to application layer
        const viewModels = await this.loadImportJobsUseCase.execute(environmentId);

        // Update UI
        this.dataTable.setData(viewModels);
        this.setLoading(false);
    }

    protected async handleViewXmlAction(jobId: string): Promise<void> {
        // Delegate to command
        await this.viewJobXmlCommand.execute(jobId);
    }
}

// ❌ BAD - Panel doing business logic
private calculateJobStatus(job: ImportJob): { label: string, variant: string } {
    if (job.completedon) {
        if (job.progress < 100) {
            return { label: 'Failed', variant: 'failed' };
        }
        return { label: 'Completed', variant: 'completed' };
    }
    // ... more business logic in UI layer
}
```

---

### 🔧 Infrastructure Layer

**Purpose:** External dependencies and implementation details. This is the "plumbing."

**Analogies:**
- C#: Entity Framework DbContext, HttpClient services, File I/O
- Repository implementations
- External API clients

**Contains:**
- **API Clients** - HTTP calls to Dataverse, Power Platform
- **Repositories** - Implement domain repository interfaces
- **External Services** - File system, VS Code API wrappers
- **Persistence** - State storage, settings, cache

**Rules:**
- ✅ Implements interfaces defined in Domain
- ✅ Handles external I/O (HTTP, file system, VS Code API)
- ✅ Converts external data to domain models
- ❌ NO business logic
- ❌ NO UI code

**Example:**
```typescript
// ✅ GOOD - Repository implements domain interface
export class ImportJobRepository implements IImportJobRepository {
    constructor(
        private apiClient: DataverseApiClient,
        private environmentService: EnvironmentService
    ) {}

    async getByEnvironment(environmentId: string): Promise<ImportJob[]> {
        // 1. Get environment details
        const env = await this.environmentService.getById(environmentId);

        // 2. Make API call
        const url = `${env.dataverseUrl}/api/data/v9.2/importjobs`;
        const response = await this.apiClient.get<ImportJobDto[]>(url);

        // 3. Map DTOs to domain entities
        return response.value.map(dto => this.toDomain(dto));
    }

    private toDomain(dto: ImportJobDto): ImportJob {
        return new ImportJob(
            dto.importjobid,
            dto.solutionname || 'Unknown',
            dto.progress || 0,
            new Date(dto.startedon),
            dto.completedon ? new Date(dto.completedon) : undefined
        );
    }
}
```

---

## Communication Patterns

### Extension Host ↔ Webview

**The Problem:** Extension Host (Node.js) and Webview (browser iframe) are **separate JavaScript contexts**. They cannot call each other's functions.

**The Solution:** Message passing via `postMessage` API (like SignalR, but simpler).

```
┌─────────────────────┐         postMessage        ┌─────────────────────┐
│  Extension Host     │◄──────────────────────────►│     Webview         │
│  (Node.js)          │                             │  (HTML/JS/CSS)      │
│                     │                             │                     │
│  - Panels           │                             │  - Components       │
│  - Services         │                             │  - Behaviors        │
│  - Business Logic   │                             │  - User Interaction │
└─────────────────────┘                             └─────────────────────┘
```

**Flow:**

1. **User action in webview** (button click)
   ```javascript
   // Webview JS
   vscode.postMessage({
       command: 'refresh-data',
       environmentId: '123'
   });
   ```

2. **Panel receives message** (Extension Host)
   ```typescript
   // Panel (Extension Host)
   protected async handleMessage(message: WebviewMessage): Promise<void> {
       switch (message.command) {
           case 'refresh-data':
               await this.handleRefresh(message.environmentId);
               break;
       }
   }
   ```

3. **Panel sends update back** (Extension Host → Webview)
   ```typescript
   // Panel (Extension Host)
   this.postMessage({
       command: 'update-data',
       componentId: 'importJobs-table',
       data: viewModels
   });
   ```

4. **Component behavior updates UI** (Webview)
   ```javascript
   // Behavior JS
   window.addEventListener('message', event => {
       const message = event.data;
       if (message.command === 'update-data') {
           updateTableRows(message.data);
       }
   });
   ```

---

## Pattern Recommendations

Based on C# experience and VS Code constraints:

### ✅ Use These Patterns

1. **Command Pattern** (like MediatR)
   - User actions = commands
   - Commands have single responsibility
   - Commands are testable

2. **Repository Pattern**
   - Abstract data access
   - Domain defines interfaces
   - Infrastructure implements

3. **Use Case Pattern** (Application Services)
   - Orchestrate domain logic
   - One use case = one user goal

4. **MVVM** (for components)
   - View = HTML + Behavior JS
   - ViewModel = Data shape for view
   - Model = Domain entity

5. **Factory Pattern**
   - ComponentFactory (already have)
   - ServiceFactory (already have)

### ⚠️ Reconsider These Patterns

1. **Event Bridge** (as currently implemented)
   - **Problem:** Adds indirection without clear benefit
   - **Alternative:** Direct message passing with command handlers
   - **Keep it if:** You need pub/sub for multiple listeners

---

## Next Steps

- Read [LAYER_RESPONSIBILITIES_GUIDE.md](./LAYER_RESPONSIBILITIES_GUIDE.md) for detailed rules
- Read [EXECUTION_PIPELINE_GUIDE.md](./EXECUTION_PIPELINE_GUIDE.md) for request flow examples
- Read [DIRECTORY_STRUCTURE_GUIDE.md](./DIRECTORY_STRUCTURE_GUIDE.md) for file organization
- Read [COMMUNICATION_PATTERNS.md](./COMMUNICATION_PATTERNS.md) for webview details

---

## Architectural Decision Records (ADRs)

Document major decisions in `/docs/adr/`:
- Why feature-first structure?
- Why command pattern over event bridge?
- Why rich domain models over anemic interfaces?
