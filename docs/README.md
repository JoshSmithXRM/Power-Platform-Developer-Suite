# Power Platform Developer Suite - Architecture Documentation

> **Purpose:** Comprehensive architecture documentation for building features with Clean Architecture principles.

---

## 🎯 Start Here

If you're new to this codebase or implementing a new feature:

1. **Read [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md)** - Understand the big picture
2. **Read [LAYER_RESPONSIBILITIES_GUIDE.md](./LAYER_RESPONSIBILITIES_GUIDE.md)** - Know what goes where
3. **Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Checklists and common patterns
4. **Start building** - Follow the step-by-step guide in Quick Reference

---

## 📚 Documentation Structure

### Core Concepts

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md) | Architecture overview, principles, layer definitions | **Start here** - Understand the foundation |
| [LAYER_RESPONSIBILITIES_GUIDE.md](./LAYER_RESPONSIBILITIES_GUIDE.md) | Detailed rules for each layer with examples | When deciding where code belongs |
| [EXECUTION_PIPELINE_GUIDE.md](./EXECUTION_PIPELINE_GUIDE.md) | How requests flow through layers with real examples | When understanding how features work |
| [DIRECTORY_STRUCTURE_GUIDE.md](./DIRECTORY_STRUCTURE_GUIDE.md) | File organization and naming conventions | When creating new files |
| [COMMUNICATION_PATTERNS.md](./COMMUNICATION_PATTERNS.md) | Extension Host ↔ Webview communication | When working with panels/components |
| [LOGGING_GUIDE.md](./LOGGING_GUIDE.md) | Logging standards and best practices | When adding logging to code |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Cheat sheet, checklists, common mistakes | **Reference frequently** |

---

## 🚀 Quick Start

### I Want To...

#### Implement a New Feature
1. Read [QUICK_REFERENCE.md § Implementing a New Feature](./QUICK_REFERENCE.md#-implementing-a-new-feature)
2. Follow the step-by-step guide
3. Use checklists before committing

#### Understand How Panels Work
1. Read [ARCHITECTURE_GUIDE.md § Communication Patterns](./ARCHITECTURE_GUIDE.md#communication-patterns)
2. Read [COMMUNICATION_PATTERNS.md](./COMMUNICATION_PATTERNS.md)
3. Look at [EXECUTION_PIPELINE_GUIDE.md § Example 1](./EXECUTION_PIPELINE_GUIDE.md#example-1-loading-import-jobs)

#### Know Where to Put Code
1. Read [LAYER_RESPONSIBILITIES_GUIDE.md](./LAYER_RESPONSIBILITIES_GUIDE.md)
2. Use the [Quick Reference § Where Does This Go?](./QUICK_REFERENCE.md#where-does-this-go) table

#### Fix Legacy Code
1. Understand [ARCHITECTURE_GUIDE.md § Layers Defined](./ARCHITECTURE_GUIDE.md#layers-defined)
2. Identify violations in [QUICK_REFERENCE.md § Common Mistakes](./QUICK_REFERENCE.md#-common-mistakes)
3. Refactor one layer at a time (see Migration Strategy)

#### Add Logging
1. Read [LOGGING_GUIDE.md](./LOGGING_GUIDE.md)
2. Use [LOGGING_GUIDE.md § Common Logging Scenarios](./LOGGING_GUIDE.md#common-logging-scenarios)

---

## 🏗️ Architecture at a Glance

### Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                      │
│  Panels, Components, Behaviors                              │
│  - ImportJobViewerPanel                                     │
│  - DataTableComponent                                       │
└───────────────────┬─────────────────────────────────────────┘
                    │ Uses
┌───────────────────▼─────────────────────────────────────────┐
│                    Application Layer                         │
│  Use Cases, Commands, ViewModels, Mappers                   │
│  - LoadImportJobsUseCase                                    │
│  - ViewJobXmlCommand                                        │
│  - ImportJobViewModel                                       │
└───────────────────┬─────────────────────────────────────────┘
                    │ Uses
┌───────────────────▼─────────────────────────────────────────┐
│                      Domain Layer                           │
│  Entities, Value Objects, Domain Services                   │
│  - ImportJob (entity)                                       │
│  - JobStatus (value object)                                 │
└─────────────────────────────────────────────────────────────┘
                    ▲
                    │ Implements interfaces
┌───────────────────┴─────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  Repositories, API Clients, External Services               │
│  - ImportJobRepository                                      │
│  - DataverseApiClient                                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User clicks button (Webview)
    ↓ postMessage
Panel receives message (Extension Host)
    ↓ delegates
Use Case executes (Application Layer)
    ↓ calls
Repository fetches data (Infrastructure Layer)
    ↓ transforms
Domain Entity (Domain Layer)
    ↓ applies business logic
Use Case maps to ViewModel (Application Layer)
    ↓ returns
Panel updates component (Presentation Layer)
    ↓ postMessage
Webview updates UI (Behavior)
```

See [EXECUTION_PIPELINE_GUIDE.md](./EXECUTION_PIPELINE_GUIDE.md) for detailed examples.

---

## 🧠 Key Principles

### 1. Separation of Concerns
- **Domain** = Business logic (pure TypeScript)
- **Application** = Orchestration (use cases, commands)
- **Presentation** = UI (panels, components, behaviors)
- **Infrastructure** = External dependencies (API, file system, VS Code)

### 2. Dependency Rule
```
Infrastructure ──→ Application ──→ Domain
Presentation ──→ Application ──→ Domain
```

**Dependencies point inward.** Domain has ZERO dependencies.

### 3. Rich Domain Models
```typescript
// ❌ Anemic model
interface ImportJob {
    progress?: number;
    completedon?: string;
}

// ✅ Rich model
class ImportJob {
    getStatus(): JobStatus { /* logic */ }
    isCompleted(): boolean { /* logic */ }
}
```

### 4. Command Pattern for Actions
```typescript
// User action → Command
await this.viewJobXmlCommand.execute({ jobId });
```

### 5. ViewModels for Presentation
```typescript
// Domain → ViewModel → UI
const viewModel = this.mapper.toViewModel(entity);
this.component.setData(viewModel);
```

See [ARCHITECTURE_GUIDE.md § Core Principles](./ARCHITECTURE_GUIDE.md#core-principles) for more.

---

## 📁 Directory Structure

```
src/
├── core/              # Shared base classes
├── features/          # Feature modules (domain, application, presentation, infrastructure)
│   ├── importJobs/
│   ├── solutions/
│   └── environments/
├── infrastructure/    # Cross-cutting infrastructure
└── shared/            # Utilities and helpers
```

See [DIRECTORY_STRUCTURE_GUIDE.md](./DIRECTORY_STRUCTURE_GUIDE.md) for complete structure.

---

## ✅ Pre-Commit Checklist

Before committing:

### Domain Layer
- [ ] Entities have behavior (not just properties)
- [ ] No external dependencies
- [ ] Business logic is in domain

### Application Layer
- [ ] Use cases orchestrate (don't implement)
- [ ] ViewModels contain display-ready data
- [ ] No business logic

### Presentation Layer
- [ ] Panels delegate to use cases
- [ ] No business logic
- [ ] Logs user actions

### Infrastructure Layer
- [ ] Implements domain interfaces
- [ ] Transforms DTOs to domain entities

### Logging
- [ ] Appropriate log levels
- [ ] Rich context (IDs, names, counts)

See [QUICK_REFERENCE.md § Pre-Commit Checklist](./QUICK_REFERENCE.md#-pre-commit-checklist) for complete list.

---

## 🚫 Common Mistakes

### Mistake 1: Business Logic in Panel
```typescript
// ❌ BAD
const status = job.progress < 100 ? 'Failed' : 'Completed';

// ✅ GOOD
const status = job.getStatus();
```

### Mistake 2: Anemic Domain Model
```typescript
// ❌ BAD
interface ImportJob { progress?: number; }

// ✅ GOOD
class ImportJob { getStatus(): JobStatus { /* logic */ } }
```

### Mistake 3: Wrong Dependencies
```typescript
// ❌ BAD - Domain calling API
class ImportJob {
    async load() { await fetch(...); }
}

// ✅ GOOD - Repository implements interface
class ImportJobRepository implements IImportJobRepository {
    async getById(id: string): Promise<ImportJob | null> { /* ... */ }
}
```

See [QUICK_REFERENCE.md § Common Mistakes](./QUICK_REFERENCE.md#-common-mistakes) for more.

---

## 📖 For C# Developers

This architecture will feel familiar if you've built:
- **ASP.NET Core with Clean Architecture**
- **Domain-Driven Design (DDD) applications**
- **CQRS with MediatR**

Key mappings:

| C# | TypeScript Equivalent |
|----|----------------------|
| Entity Framework entity | Domain entity |
| DbContext | Repository |
| MediatR Command | Use Case / Command |
| ViewModel | ViewModel |
| Controller | Panel |
| SignalR Hub | postMessage handler |

See [ARCHITECTURE_GUIDE.md § For C# Developers](./ARCHITECTURE_GUIDE.md#for-c-developers).

---

## 🔄 Migration Strategy

Migrating legacy code:

1. **Start with one feature** (e.g., Import Jobs)
2. **Extract domain entities** from services
3. **Create use cases** to orchestrate
4. **Move infrastructure code** to repositories
5. **Update panels** to use use cases
6. **Test and commit**
7. **Repeat for next feature**

See [DIRECTORY_STRUCTURE_GUIDE.md § Migration Strategy](./DIRECTORY_STRUCTURE_GUIDE.md#migration-strategy).

---

## 🎓 Learning Path

### Week 1: Understand Architecture
- [ ] Read ARCHITECTURE_GUIDE.md
- [ ] Read LAYER_RESPONSIBILITIES_GUIDE.md
- [ ] Study EXECUTION_PIPELINE_GUIDE.md examples

### Week 2: Implement Simple Feature
- [ ] Choose a small feature to refactor
- [ ] Extract domain entity
- [ ] Create use case
- [ ] Update panel
- [ ] Follow checklists

### Week 3: Build New Feature
- [ ] Use QUICK_REFERENCE.md guide
- [ ] Build feature from scratch
- [ ] Apply all patterns

### Week 4: Review and Refine
- [ ] Review with team
- [ ] Document learnings
- [ ] Update architecture docs if needed

---

## 🛠️ Tools and Utilities

### Recommended VS Code Extensions
- **ESLint** - Enforce code standards
- **TypeScript Hero** - Auto-import organization
- **Better Comments** - Categorize comments
- **Error Lens** - Inline error display

### TypeScript Configuration
- Strict mode enabled
- No implicit any
- Explicit function return types

### Logging
- Structured logging with context objects
- Appropriate log levels (INFO, DEBUG, ERROR)
- No sensitive data in logs

See [LOGGING_GUIDE.md](./LOGGING_GUIDE.md).

---

## 🤝 Contributing

When adding to this documentation:

1. **Keep it practical** - Show examples, not just theory
2. **Use C# analogies** - Team is C# developers
3. **Include checklists** - Make it actionable
4. **Show anti-patterns** - Teach what NOT to do
5. **Update index** - Add new docs to this README

---

## 📞 Questions?

If something is unclear:

1. Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) first
2. Search existing docs
3. Ask the team
4. Update docs with the answer

**Remember:** If you had the question, someone else will too. Document it!

---

## 🎯 Goals

This architecture aims to:

- ✅ **Maintainability** - Easy to change and extend
- ✅ **Testability** - Domain logic is testable without mocks
- ✅ **Scalability** - Add features without affecting others
- ✅ **Clarity** - Code is self-documenting
- ✅ **Quality** - Fewer bugs through strong types and separation

---

## 🚀 Status

Initial architecture documentation complete.
