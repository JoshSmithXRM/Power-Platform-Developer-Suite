# Directory Structure

> **Purpose:** Define the file organization for feature-first Clean Architecture.

## Overview

We use **feature-first** organization with layers inside each feature. Shared code lives in `core/` and `infrastructure/`.

### Philosophy

**C# Analogy:** Think of this like a .NET solution with multiple projects:
- Each feature = a mini-library with its own layers
- `core/` = shared class library (like `MyApp.Core`)
- `infrastructure/` = infrastructure library (like `MyApp.Infrastructure`)

---

## Directory Layout

```
src/
├── core/                                    # Shared kernel (cross-cutting)
│   ├── domain/                             # Base entities, value objects, interfaces
│   │   ├── entities/
│   │   │   └── BaseEntity.ts
│   │   ├── valueObjects/
│   │   │   └── BaseValueObject.ts
│   │   └── errors/
│   │       ├── DomainError.ts
│   │       └── ValidationError.ts
│   │
│   ├── application/                        # Base use cases, command infrastructure
│   │   ├── useCases/
│   │   │   └── BaseUseCase.ts
│   │   ├── commands/
│   │   │   └── BaseCommand.ts
│   │   └── mappers/
│   │       └── BaseMapper.ts
│   │
│   └── presentation/                       # Base components, base panels
│       ├── panels/
│       │   ├── BasePanel.ts
│       │   └── PanelConfig.ts
│       ├── components/
│       │   ├── BaseComponent.ts
│       │   └── ComponentConfig.ts
│       └── behaviors/
│           └── BaseBehavior.js
│
├── features/                                # Feature modules (business domains)
│   ├── importJobs/                         # Import Jobs feature
│   │   ├── domain/                         # Business logic & entities
│   │   │   ├── entities/
│   │   │   │   └── ImportJob.ts            # Rich domain entity
│   │   │   ├── valueObjects/
│   │   │   │   ├── Progress.ts
│   │   │   │   └── JobStatus.ts
│   │   │   ├── services/
│   │   │   │   └── ImportJobDomainService.ts
│   │   │   └── interfaces/                 # Contracts for infrastructure
│   │   │       ├── IImportJobRepository.ts
│   │   │       └── IXmlFormatterService.ts
│   │   │
│   │   ├── application/                    # Use cases & orchestration
│   │   │   ├── useCases/
│   │   │   │   └── LoadImportJobsUseCase.ts
│   │   │   ├── commands/
│   │   │   │   ├── ViewJobXmlCommand.ts
│   │   │   │   └── RetryJobCommand.ts
│   │   │   ├── mappers/
│   │   │   │   └── ImportJobViewModelMapper.ts
│   │   │   ├── viewModels/
│   │   │   │   └── ImportJobViewModel.ts
│   │   │   └── dtos/
│   │   │       ├── LoadImportJobsRequest.ts
│   │   │       └── LoadImportJobsResponse.ts
│   │   │
│   │   ├── presentation/                   # UI components & panels
│   │   │   ├── panels/
│   │   │   │   └── ImportJobViewerPanel.ts
│   │   │   ├── components/
│   │   │   │   └── JobStatusBadge.ts
│   │   │   └── behaviors/
│   │   │       └── ImportJobTableBehavior.js
│   │   │
│   │   └── infrastructure/                 # Data access & external services
│   │       ├── repositories/
│   │       │   └── ImportJobRepository.ts
│   │       ├── dtos/
│   │       │   └── ImportJobDto.ts         # API response shape
│   │       └── services/
│   │           └── XmlFormatterService.ts
│   │
│   ├── solutions/                          # Solutions feature
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── Solution.ts
│   │   │   ├── valueObjects/
│   │   │   │   └── SolutionType.ts
│   │   │   └── interfaces/
│   │   │       └── ISolutionRepository.ts
│   │   ├── application/
│   │   │   ├── useCases/
│   │   │   │   ├── LoadSolutionsUseCase.ts
│   │   │   │   └── ExportSolutionUseCase.ts
│   │   │   ├── mappers/
│   │   │   │   └── SolutionViewModelMapper.ts
│   │   │   └── viewModels/
│   │   │       └── SolutionViewModel.ts
│   │   ├── presentation/
│   │   │   ├── panels/
│   │   │   │   └── SolutionExplorerPanel.ts
│   │   │   └── components/
│   │   │       └── SolutionTreeView.ts
│   │   └── infrastructure/
│   │       └── repositories/
│   │           └── SolutionRepository.ts
│   │
│   ├── environments/                       # Environments feature
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── Environment.ts
│   │   │   └── interfaces/
│   │   │       └── IEnvironmentRepository.ts
│   │   ├── application/
│   │   │   ├── useCases/
│   │   │   │   └── LoadEnvironmentsUseCase.ts
│   │   │   └── viewModels/
│   │   │       └── EnvironmentViewModel.ts
│   │   ├── presentation/
│   │   │   └── components/
│   │   │       └── EnvironmentSelector.ts
│   │   └── infrastructure/
│   │       └── repositories/
│   │           └── EnvironmentRepository.ts
│   │
│   └── pluginRegistration/                 # Plugin Registration feature
│       ├── domain/
│       ├── application/
│       ├── presentation/
│       └── infrastructure/
│
├── infrastructure/                          # Cross-cutting infrastructure
│   ├── api/                                # HTTP & API clients
│   │   ├── DataverseApiClient.ts
│   │   ├── ApiError.ts
│   │   └── ApiResponse.ts
│   │
│   ├── logging/                            # Logging infrastructure
│   │   ├── LoggerService.ts
│   │   ├── ConsoleLogger.ts
│   │   └── FileLogger.ts
│   │
│   ├── state/                              # State management
│   │   ├── StateManager.ts
│   │   ├── PersistenceService.ts
│   │   └── CacheService.ts
│   │
│   ├── vscode/                             # VS Code API wrappers
│   │   ├── VsCodeDocumentService.ts
│   │   ├── VsCodeWindowService.ts
│   │   └── VsCodeWorkspaceService.ts
│   │
│   └── auth/                               # Authentication
│       ├── AuthenticationService.ts
│       └── TokenCache.ts
│
├── shared/                                  # Shared utilities & helpers
│   ├── utils/
│   │   ├── DateUtils.ts
│   │   ├── StringUtils.ts
│   │   └── ValidationUtils.ts
│   │
│   ├── types/                              # Shared type definitions
│   │   ├── CommonTypes.ts
│   │   └── WebviewMessage.ts
│   │
│   ├── constants/
│   │   ├── ApiConstants.ts
│   │   └── UiConstants.ts
│   │
│   └── factories/                          # Factories for DI
│       ├── ServiceFactory.ts
│       └── ComponentFactory.ts
│
├── extension.ts                             # VS Code extension entry point
└── commands/                                # VS Code command registrations
    ├── registerPanelCommands.ts
    └── registerUtilityCommands.ts

resources/
└── webview/                                 # Webview resources (static assets)
    ├── css/
    │   ├── base/
    │   │   ├── component-base.css
    │   │   └── panel-base.css
    │   └── components/
    │       ├── data-table.css
    │       └── status-badge.css
    │
    └── js/
        ├── utils/
        │   ├── ComponentUtils.js
        │   └── BaseBehavior.js
        └── components/
            ├── tables/
            │   └── DataTableBehavior.js
            └── selectors/
                └── EnvironmentSelectorBehavior.js

docs/                                        # Documentation
├── ARCHITECTURE.md
├── LAYER_RESPONSIBILITIES.md
├── EXECUTION_PIPELINE.md
├── DIRECTORY_STRUCTURE.md
├── COMMUNICATION_PATTERNS.md
└── adr/                                     # Architectural Decision Records
    ├── 001-feature-first-structure.md
    └── 002-command-pattern.md
```

---

## File Naming Conventions

### TypeScript Files (Extension Host)

| Type | Naming Convention | Example |
|------|-------------------|---------|
| Entity | PascalCase | `ImportJob.ts` |
| Value Object | PascalCase | `Progress.ts`, `JobStatus.ts` |
| Interface (Domain) | IPascalCase | `IImportJobRepository.ts` |
| Use Case | PascalCaseUseCase | `LoadImportJobsUseCase.ts` |
| Command | PascalCaseCommand | `ViewJobXmlCommand.ts` |
| ViewModel | PascalCaseViewModel | `ImportJobViewModel.ts` |
| Mapper | PascalCaseMapper | `ImportJobViewModelMapper.ts` |
| Panel | PascalCasePanel | `ImportJobViewerPanel.ts` |
| Component | PascalCaseComponent | `DataTableComponent.ts` |
| Repository | PascalCaseRepository | `ImportJobRepository.ts` |
| Service | PascalCaseService | `XmlFormatterService.ts` |
| DTO | PascalCaseDto | `ImportJobDto.ts` |
| Error | PascalCaseError | `DomainError.ts`, `ApiError.ts` |

### JavaScript Files (Webview)

| Type | Naming Convention | Example |
|------|-------------------|---------|
| Behavior | PascalCaseBehavior.js | `DataTableBehavior.js` |
| Utility | PascalCase.js | `ComponentUtils.js` |

### CSS Files

| Type | Naming Convention | Example |
|------|-------------------|---------|
| Component styles | kebab-case.css | `data-table.css` |
| Base styles | kebab-case.css | `component-base.css` |

---

## File Organization Rules

### 1. Domain Layer Files

**Entities** - `domain/entities/`
- One entity per file
- Entity name = file name
- Contains business logic

**Value Objects** - `domain/valueObjects/`
- One value object per file
- Immutable classes or enums

**Interfaces** - `domain/interfaces/`
- Contracts for infrastructure
- Start with `I` prefix

**Domain Services** - `domain/services/`
- Business logic that spans multiple entities
- Suffix with `DomainService`

### 2. Application Layer Files

**Use Cases** - `application/useCases/`
- One use case per file
- Suffix with `UseCase`
- Named after user action: `LoadImportJobsUseCase`

**Commands** - `application/commands/`
- One command per file
- Suffix with `Command`
- Named after action: `ViewJobXmlCommand`

**ViewModels** - `application/viewModels/`
- One ViewModel per entity/aggregate
- Suffix with `ViewModel`

**Mappers** - `application/mappers/`
- One mapper per entity
- Suffix with `Mapper`

**DTOs** - `application/dtos/`
- Request/Response objects for use cases
- Suffix with `Request` or `Response`

### 3. Presentation Layer Files

**Panels** - `presentation/panels/`
- One panel per file
- Suffix with `Panel`

**Components** - `presentation/components/`
- One component per file
- Suffix with `Component`

**Behaviors** - `presentation/behaviors/`
- One behavior per file
- Suffix with `Behavior.js`

### 4. Infrastructure Layer Files

**Repositories** - `infrastructure/repositories/`
- One repository per aggregate root
- Implements domain interface
- Suffix with `Repository`

**DTOs** - `infrastructure/dtos/`
- API response shapes
- Suffix with `Dto`

**Services** - `infrastructure/services/`
- External service implementations
- Suffix with `Service`

---

## Import Path Examples

### Within Same Feature

```typescript
// From presentation to application
import { LoadImportJobsUseCase } from '../../application/useCases/LoadImportJobsUseCase';

// From application to domain
import { ImportJob } from '../../domain/entities/ImportJob';
import { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';

// From infrastructure to domain
import { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';
```

### Cross-Feature (Avoid if Possible)

```typescript
// Use shared abstractions from core/ instead
import { BaseEntity } from '../../../core/domain/entities/BaseEntity';

// Or depend on shared infrastructure
import { IDataverseApiClient } from '../../../infrastructure/api/IDataverseApiClient';
```

### From Core

```typescript
// From feature to core
import { BasePanel } from '../../../core/presentation/panels/BasePanel';
import { BaseUseCase } from '../../../core/application/useCases/BaseUseCase';
```

---

## Feature Independence Rules

1. **Features should be self-contained**
   - Each feature has its own domain, application, presentation, infrastructure
   - Avoid cross-feature dependencies

2. **Shared code goes in core/ or infrastructure/**
   - Base classes → `core/`
   - Cross-cutting services → `infrastructure/`

3. **Use interfaces for feature communication**
   ```typescript
   // ❌ BAD - Direct feature dependency
   import { Solution } from '../../solutions/domain/entities/Solution';

   // ✅ GOOD - Shared interface in core
   import { ISolutionProvider } from '../../../core/domain/interfaces/ISolutionProvider';
   ```

4. **Features can share infrastructure**
   ```typescript
   // ✅ OK - Shared infrastructure
   import { DataverseApiClient } from '../../../infrastructure/api/DataverseApiClient';
   ```

---

## Migration Strategy

When refactoring existing code:

1. **Create feature folder**
   ```
   src/features/importJobs/
   ```

2. **Move files to appropriate layers**
   - `ImportJobService.ts` → Split into:
     - `domain/entities/ImportJob.ts` (entity)
     - `application/useCases/LoadImportJobsUseCase.ts` (use case)
     - `infrastructure/repositories/ImportJobRepository.ts` (repository)

3. **Update imports**
   - Use relative paths within feature
   - Absolute paths for core/infrastructure

4. **Test in isolation**
   - Each layer should be testable independently

---

## Quick Reference: Where Does This File Go?

| File Content | Location |
|--------------|----------|
| `class ImportJob` with business logic | `features/importJobs/domain/entities/ImportJob.ts` |
| `enum JobStatus` | `features/importJobs/domain/valueObjects/JobStatus.ts` |
| `interface IImportJobRepository` | `features/importJobs/domain/interfaces/IImportJobRepository.ts` |
| `class LoadImportJobsUseCase` | `features/importJobs/application/useCases/LoadImportJobsUseCase.ts` |
| `class ViewJobXmlCommand` | `features/importJobs/application/commands/ViewJobXmlCommand.ts` |
| `interface ImportJobViewModel` | `features/importJobs/application/viewModels/ImportJobViewModel.ts` |
| `class ImportJobViewModelMapper` | `features/importJobs/application/mappers/ImportJobViewModelMapper.ts` |
| `class ImportJobViewerPanel` | `features/importJobs/presentation/panels/ImportJobViewerPanel.ts` |
| `class JobStatusBadge` | `features/importJobs/presentation/components/JobStatusBadge.ts` |
| `class ImportJobRepository` | `features/importJobs/infrastructure/repositories/ImportJobRepository.ts` |
| `interface ImportJobDto` | `features/importJobs/infrastructure/dtos/ImportJobDto.ts` |
| `class DataverseApiClient` | `infrastructure/api/DataverseApiClient.ts` |
| `class LoggerService` | `infrastructure/logging/LoggerService.ts` |
| `class BasePanel` | `core/presentation/panels/BasePanel.ts` |
| `class BaseEntity` | `core/domain/entities/BaseEntity.ts` |
| `class DateUtils` | `shared/utils/DateUtils.ts` |

---

## VS Code Workspace Organization

For easier navigation, configure VS Code:

```json
// .vscode/settings.json
{
    "explorer.fileNesting.enabled": true,
    "explorer.fileNesting.patterns": {
        "*.ts": "${capture}.js, ${capture}.js.map",
        "*UseCase.ts": "${capture}Request.ts, ${capture}Response.ts"
    },
    "files.exclude": {
        "**/out": true,
        "**/node_modules": true
    }
}
```

This groups related files together in the explorer.
