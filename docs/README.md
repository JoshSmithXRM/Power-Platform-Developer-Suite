# Power Platform Developer Suite - Architecture Documentation

> **Purpose:** Clean Architecture documentation for building features with TypeScript in VS Code extensions.

---

## 🎯 Start Here

**If you're new to this codebase:**

1. **Read [CLAUDE.md](../CLAUDE.md)** - Non-negotiable rules for AI and developers
2. **Read [ARCHITECTURAL_DECISION_RECORDS.md](./ARCHITECTURAL_DECISION_RECORDS.md)** - Why we made key decisions
3. **Read [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md)** - Understand the layers
4. **Read [LAYER_RESPONSIBILITIES_GUIDE.md](./LAYER_RESPONSIBILITIES_GUIDE.md)** - Know what goes where
5. **Start building** - Implement your first feature following the patterns

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[CLAUDE.md](../CLAUDE.md)** | ⚠️ **Essential rules** - Read first |
| **[ARCHITECTURAL_DECISION_RECORDS.md](./ARCHITECTURAL_DECISION_RECORDS.md)** | Why we chose feature-first, rich models, TypeScript strict mode |
| [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md) | Architecture overview and principles |
| [LAYER_RESPONSIBILITIES_GUIDE.md](./LAYER_RESPONSIBILITIES_GUIDE.md) | Detailed layer rules with examples |
| [DIRECTORY_STRUCTURE_GUIDE.md](./DIRECTORY_STRUCTURE_GUIDE.md) | Feature-first file organization |
| [DOCUMENTATION_REVIEW_FINDINGS.md](./DOCUMENTATION_REVIEW_FINDINGS.md) | Agent review findings (reference) |

---

## 🏗️ Architecture at a Glance

### Layers

```
┌─────────────────────────────────────────────────────────┐
│                  Presentation Layer                     │
│  Panels, Components (delegate to use cases)             │
└───────────────────┬─────────────────────────────────────┘
                    │ Uses
┌───────────────────▼─────────────────────────────────────┐
│                  Application Layer                      │
│  Use Cases, Commands, ViewModels (orchestrate)          │
└───────────────────┬─────────────────────────────────────┘
                    │ Uses
┌───────────────────▼─────────────────────────────────────┐
│                    Domain Layer                         │
│  Entities, Value Objects (business logic)               │
└─────────────────────────────────────────────────────────┘
                    ▲
                    │ Implements interfaces
┌───────────────────┴─────────────────────────────────────┐
│                Infrastructure Layer                      │
│  Repositories, API Clients (external dependencies)      │
└─────────────────────────────────────────────────────────┘
```

**Dependency Rule:** Dependencies point inward. Domain has ZERO dependencies.

---

## 📁 Directory Structure

**Feature-First Organization:**

```
src/
├── core/                    # Shared kernel (cross-cutting)
│   ├── domain/             # Base entities, value objects
│   ├── application/        # Base use cases, commands
│   └── presentation/       # Base panels, components
├── features/               # Feature modules
│   ├── importJobs/
│   │   ├── domain/        # Business logic
│   │   ├── application/   # Use cases, ViewModels
│   │   ├── presentation/  # Panels, components
│   │   └── infrastructure/# Repositories, API
│   └── solutions/
│       ├── domain/
│       ├── application/
│       ├── presentation/
│       └── infrastructure/
├── infrastructure/         # Cross-cutting infrastructure
│   ├── api/               # DataverseApiClient
│   ├── logging/           # LoggerService
│   └── state/             # StateManager
└── shared/                # Utilities
    ├── utils/
    ├── types/
    └── constants/
```

See [DIRECTORY_STRUCTURE_GUIDE.md](./DIRECTORY_STRUCTURE_GUIDE.md) for complete details.

**Why feature-first?** See [ADR-001](./ARCHITECTURAL_DECISION_RECORDS.md#adr-001-feature-first-directory-organization)

---

## 🧠 Key Principles

### 1. Rich Domain Models (Not Anemic)

```typescript
// ❌ NEVER - Anemic model (just data)
interface ImportJob {
    progress?: number;
    completedOn?: string;
}

// ✅ ALWAYS - Rich model (with behavior)
class ImportJob {
    constructor(
        public readonly id: string,
        private progress: number,
        private completedOn?: Date
    ) {}

    getStatus(): JobStatus {
        if (this.completedOn) {
            return this.progress < 100 ? JobStatus.Failed : JobStatus.Completed;
        }
        return this.progress > 0 ? JobStatus.InProgress : JobStatus.Pending;
    }

    isEligibleForRetry(): boolean {
        return this.getStatus() === JobStatus.Failed;
    }
}
```

**Why?** See [ADR-002](./ARCHITECTURAL_DECISION_RECORDS.md#adr-002-rich-domain-models-over-anemic-models)

### 2. Use Cases Orchestrate (No Business Logic)

```typescript
// ✅ Use case orchestrates domain and infrastructure
export class LoadImportJobsUseCase {
    constructor(
        private repo: IImportJobRepository,
        private mapper: ImportJobViewModelMapper
    ) {}

    async execute(request: { envId: string }): Promise<ImportJobViewModel[]> {
        const jobs = await this.repo.getByEnvironment(request.envId);
        const activeJobs = jobs.filter(job => !job.isArchived()); // ← Domain method
        return activeJobs.map(job => this.mapper.toViewModel(job));
    }
}
```

### 3. TypeScript Strict Mode

- ✅ Explicit return types on all public methods
- ✅ No `any` - use `unknown` with type guards
- ✅ Strict null checks
- ✅ All CLAUDE.md rules enforced

**Why?** See [ADR-003](./ARCHITECTURAL_DECISION_RECORDS.md#adr-003-typescript-strict-mode)

### 4. Domain Has Zero Dependencies

```typescript
// ❌ NEVER - Domain importing infrastructure
import { DataverseApiClient } from '../../infrastructure/api/DataverseApiClient';

// ✅ ALWAYS - Domain only imports from domain
import { JobStatus } from './valueObjects/JobStatus';
import { BaseEntity } from '../../../core/domain/entities/BaseEntity';
```

**Why?** See [ADR-005](./ARCHITECTURAL_DECISION_RECORDS.md#adr-005-domain-has-zero-external-dependencies)

---

## 🚫 Common Mistakes

### Mistake 1: Business Logic in Panel
```typescript
// ❌ BAD - Business logic in presentation
const status = job.progress < 100 ? 'Failed' : 'Completed';

// ✅ GOOD - Business logic in domain
const status = job.getStatus();
```

### Mistake 2: Use Case Contains Business Logic
```typescript
// ❌ BAD - Use case has business logic
async execute(request: LoadJobsRequest): Promise<JobViewModel[]> {
    const jobs = await this.repo.getAll();
    // ❌ Don't calculate status here
    return jobs.map(j => ({
        status: j.progress < 100 ? 'Failed' : 'Completed'
    }));
}

// ✅ GOOD - Use case orchestrates, domain has logic
async execute(request: LoadJobsRequest): Promise<JobViewModel[]> {
    const jobs = await this.repo.getAll();
    return jobs.map(j => this.mapper.toViewModel(j)); // ← Mapper uses job.getStatus()
}
```

### Mistake 3: Cross-Feature Imports
```typescript
// ❌ BAD - importJobs importing from solutions
import { Solution } from '../../solutions/domain/entities/Solution';

// ✅ GOOD - Use shared interfaces from core/
import { ISolutionProvider } from '../../../core/domain/interfaces/ISolutionProvider';
```

**Why?** See [ADR-006](./ARCHITECTURAL_DECISION_RECORDS.md#adr-006-feature-independence-no-cross-feature-imports)

---

## ✅ Pre-Commit Checklist

**Domain Layer:**
- [ ] Entities have behavior (methods), not just data
- [ ] No external dependencies (no imports from outer layers)
- [ ] Business logic is in domain, not use cases or panels

**Application Layer:**
- [ ] Use cases orchestrate (no business logic)
- [ ] ViewModels contain display-ready data only
- [ ] Explicit return types on all methods

**Presentation Layer:**
- [ ] Panels delegate to use cases (no business logic)
- [ ] No domain logic in panels

**Infrastructure Layer:**
- [ ] Implements domain interfaces
- [ ] Transforms DTOs to domain entities

**TypeScript:**
- [ ] Explicit return types on all public methods
- [ ] No `any` (use `unknown` with type guards)
- [ ] Strict mode compatible

---

## 📖 For C# Developers

This architecture will feel familiar if you've built ASP.NET Core with Clean Architecture or DDD applications.

**Key mappings:**

| C# | TypeScript Equivalent |
|----|----------------------|
| Entity (EF Core) | Domain Entity |
| DbContext / Repository | Repository (implements interface) |
| MediatR Command/Query | Use Case / Command |
| ViewModel / DTO | ViewModel |
| Controller | Panel |

---

## 🚀 Development

```bash
# Compile TypeScript
npm run compile

# Watch mode
npm run watch
```

---

## 🎯 Architecture Goals

- ✅ **Maintainability** - Easy to change and extend
- ✅ **Testability** - Domain logic testable without mocks
- ✅ **Type Safety** - Catch bugs at compile time
- ✅ **Feature Independence** - Add features without affecting others
- ✅ **Framework Independence** - Domain survives framework changes

---

## 📞 Questions?

1. Check [CLAUDE.md](../CLAUDE.md) for rules
2. Check [ARCHITECTURAL_DECISION_RECORDS.md](./ARCHITECTURAL_DECISION_RECORDS.md) for "why" decisions
3. Check [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md) for patterns
4. Search existing code for examples

**Building from scratch?** Follow the architecture patterns as you implement features. Document new patterns when they emerge, not before.
