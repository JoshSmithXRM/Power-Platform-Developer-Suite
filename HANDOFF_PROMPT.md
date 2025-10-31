# Handoff Prompt for Next Session

> **Copy this entire prompt into your next Claude Code conversation**

---

## 🎯 Current Task

**Implement ImportJobViewer as Clean Architecture Reference Implementation**

We're ready to start coding! This will be our first feature built with Clean Architecture from scratch.

---

## 📍 Where We Are

### Completed This Session

**Documentation & .claude Setup ✅**
- Created CLAUDE_SETUP_GUIDE.md (Anthropic best practices for agents)
- Updated CLAUDE.md (removed old world, 84 lines of Clean Architecture truth)
- Updated WORKFLOW_GUIDE.md (Clean Architecture workflow)
- Updated all agents:
  - architect.md - Designs domain/application/infrastructure/presentation layers
  - code-reviewer.md - Catches anemic models, wrong business logic placement
  - docs-generator.md - Already current, follows DOCUMENTATION_STYLE_GUIDE.md

**Key Decisions:**
- CLAUDE.md doc links don't work (Claude won't read them proactively)
- Keep CLAUDE.md minimal (20-50 lines recommended, ours is 84)
- Iterate based on effectiveness, not speculation

---

## 🏗️ Architecture We're Implementing

**Clean Architecture with Feature-First Organization**

```
src/features/importJobs/
├── domain/
│   ├── entities/
│   │   └── ImportJob.ts          (rich model with behavior)
│   ├── valueObjects/
│   │   ├── JobStatus.ts           (enum or value object)
│   │   └── Progress.ts            (immutable, validates 0-100)
│   └── interfaces/
│       └── IImportJobRepository.ts (domain defines contract)
├── application/
│   ├── useCases/
│   │   └── LoadImportJobsUseCase.ts (orchestrate, no business logic)
│   ├── commands/
│   │   └── ViewJobXmlCommand.ts
│   ├── viewModels/
│   │   └── ImportJobViewModel.ts  (DTO for presentation)
│   └── mappers/
│       └── ImportJobViewModelMapper.ts (domain → ViewModel)
├── infrastructure/
│   ├── repositories/
│   │   └── ImportJobRepository.ts  (implements IImportJobRepository)
│   └── dtos/
│       └── ImportJobDto.ts         (API response model)
└── presentation/
    └── ImportJobViewerPanel.ts      (calls use cases, NO business logic)
```

**Dependency Rule:** Infrastructure/Presentation → Application → Domain

---

## 💡 What Makes This Different

### Old World (What We're NOT Doing)
- ❌ Services with business logic
- ❌ Anemic models (just data, no behavior)
- ❌ Panels with business logic
- ❌ BasePanel, ComponentFactory, BaseBehavior patterns (we don't know if they exist)

### New World (Clean Architecture)
- ✅ **Domain entities with behavior** - `ImportJob.getStatus()`, `isComplete()`, `getDuration()`
- ✅ **Use cases orchestrate** - Coordinate domain entities, no business logic
- ✅ **ViewModels are DTOs** - Presentation-ready data, no behavior
- ✅ **Dependency inward** - Domain has ZERO dependencies

---

## 📋 Implementation Steps

### Phase 1: Domain Layer (Start Here)
```
Goal: Rich domain model with behavior (NOT anemic)

Files to create:
1. src/features/importJobs/domain/entities/ImportJob.ts
   - Constructor with validation
   - getStatus(): JobStatus (business logic here!)
   - isComplete(): boolean
   - getDuration(): number (calculated property)

2. src/features/importJobs/domain/valueObjects/JobStatus.ts
   - Enum or value object (Pending, InProgress, Completed, Failed)

3. src/features/importJobs/domain/valueObjects/Progress.ts
   - Immutable, validates 0-100 in constructor

4. src/features/importJobs/domain/interfaces/IImportJobRepository.ts
   - Domain defines contract: loadJobs(), getById(), etc.

CHECKPOINT: code-reviewer checks
- ✅ ImportJob has behavior (not anemic)
- ✅ NO dependencies on outer layers
- ✅ Business logic in entity methods

Commit: "feat(domain): add ImportJob entity with rich behavior"
```

### Phase 2: Application Layer
```
Goal: Use cases that orchestrate (no business logic)

Files to create:
1. src/features/importJobs/application/useCases/LoadImportJobsUseCase.ts
   - Calls repository.loadJobs()
   - Maps domain → ViewModel
   - NO business logic (that's in domain)

2. src/features/importJobs/application/viewModels/ImportJobViewModel.ts
   - DTO with presentation-ready data
   - NO behavior (just data)

3. src/features/importJobs/application/mappers/ImportJobViewModelMapper.ts
   - toViewModel(job: ImportJob): ImportJobViewModel

CHECKPOINT: code-reviewer checks
- ✅ Use case orchestrates only (no complex logic)
- ✅ ViewModel is DTO (no behavior)
- ✅ Depends on domain ONLY

Commit: "feat(application): add import job use cases and ViewModels"
```

### Phase 3: Infrastructure Layer
```
Goal: Implement domain interfaces

Files to create:
1. src/features/importJobs/infrastructure/repositories/ImportJobRepository.ts
   - Implements IImportJobRepository
   - Calls API
   - Maps DTO → domain entity

2. src/features/importJobs/infrastructure/dtos/ImportJobDto.ts
   - API response model
   - Maps to domain entity

CHECKPOINT: code-reviewer checks
- ✅ Implements domain interface
- ✅ NO business logic (fetch/persist only)

Commit: "feat(infrastructure): add ImportJobRepository"
```

### Phase 4: Presentation Layer
```
Goal: Panel that calls use cases (NO business logic)

Files to create:
1. src/features/importJobs/presentation/ImportJobViewerPanel.ts
   - Calls LoadImportJobsUseCase
   - Displays ViewModels
   - NO business logic in panel

CHECKPOINT: code-reviewer checks
- ✅ Panel calls use cases (not domain directly)
- ✅ NO business logic in panel
- ✅ Depends on application ONLY

Commit: "feat(presentation): add ImportJobViewerPanel"
```

---

## 🎓 Key Concepts to Remember

### Rich Domain Models
**❌ Anemic (just data):**
```typescript
class ImportJob {
  id: string;
  status: string;
  progress: number;
}
```

**✅ Rich (with behavior):**
```typescript
class ImportJob {
  constructor(
    public readonly id: string,
    private status: JobStatus,
    private progress: number
  ) {}

  getStatus(): JobStatus {
    // Business logic here!
    if (this.progress === 100) {
      return JobStatus.Completed;
    }
    return this.progress > 0 ? JobStatus.InProgress : JobStatus.Pending;
  }

  isComplete(): boolean {
    return this.progress === 100;
  }
}
```

### Use Cases Orchestrate (Don't Implement)
**❌ Business logic in use case:**
```typescript
class LoadImportJobsUseCase {
  async execute() {
    const jobs = await repo.loadJobs();
    // ❌ Business logic here!
    const completed = jobs.filter(j => j.progress === 100);
    return completed;
  }
}
```

**✅ Use case orchestrates:**
```typescript
class LoadImportJobsUseCase {
  async execute() {
    const jobs = await repo.loadJobs();
    // ✅ Use domain behavior
    const completed = jobs.filter(j => j.isComplete());
    return jobs.map(j => mapper.toViewModel(j));
  }
}
```

---

## 🚫 Common Pitfalls to Avoid

1. **Anemic domain models** - Entities must have behavior, not just getters/setters
2. **Business logic in use cases** - Move complex logic to domain entities
3. **Business logic in panels** - Panels call use cases, no logic
4. **Wrong dependency direction** - Domain never imports from outer layers
5. **Skipping code-reviewer** - ALWAYS run code-reviewer before committing

---

## 🔧 Development Commands

```bash
# Compile (includes ESLint)
npm run compile

# Test extension
# Press F5 in VS Code to launch extension host
```

---

## 📖 Reference Files

**Architecture:**
- `docs/ARCHITECTURE_GUIDE.md` - Clean Architecture overview (C# analogies)
- `docs/LAYER_RESPONSIBILITIES_GUIDE.md` - What goes in each layer
- `docs/DIRECTORY_STRUCTURE_GUIDE.md` - Feature-first organization

**Workflow:**
- `.claude/WORKFLOW_GUIDE.md` - Multi-agent workflow (design → implement → review)
- `CLAUDE.md` - Quick reference (84 lines of truth)

**Agent Help:**
- `docs/CLAUDE_SETUP_GUIDE.md` - How agents work, best practices

---

## 🎯 Success Criteria

ImportJobViewer is complete when:

**Domain Layer:**
- [ ] ImportJob entity has rich behavior (getStatus, isComplete, getDuration)
- [ ] Progress value object is immutable, validates 0-100
- [ ] IImportJobRepository interface defined in domain
- [ ] NO dependencies on outer layers

**Application Layer:**
- [ ] LoadImportJobsUseCase orchestrates (no business logic)
- [ ] ImportJobViewModel is DTO (no behavior)
- [ ] Mapper converts domain → ViewModel
- [ ] Depends on domain ONLY

**Infrastructure Layer:**
- [ ] ImportJobRepository implements domain interface
- [ ] Maps DTO → domain entity
- [ ] NO business logic

**Presentation Layer:**
- [ ] Panel calls use cases (not domain directly)
- [ ] NO business logic in panel
- [ ] Depends on application ONLY

**Validation:**
- [ ] `npm run compile` succeeds (no errors)
- [ ] code-reviewer approves each layer
- [ ] F5 manual test works (can view import jobs)

---

## 🚀 Start Here

**First command:**
```
You: "Let's implement the ImportJob domain layer as designed. Start with the ImportJob entity."

Claude (architect): [Designs domain layer]
Claude (builder): [Implements ImportJob.ts]
Claude (code-reviewer): [Reviews for anemic models, checks behavior exists]
```

**Expected flow:**
1. Architect designs domain layer (entities, value objects, interfaces)
2. Builder implements
3. code-reviewer checks for anemic models, business logic placement
4. Commit if approved
5. Repeat for application, infrastructure, presentation layers

---

## 💬 Questions to Ask If Stuck

1. **"Does this entity have behavior?"** - If not, it's anemic
2. **"Is there business logic in this use case?"** - Should be in domain
3. **"Does domain import anything from outer layers?"** - Should be ZERO
4. **"Is this ViewModel a DTO?"** - Should have no behavior

---

## 📅 Last Context

- Working directory: `C:\VS\Power-Platform-Developer-Suite`
- Branch: `feature/pluginregistration` (will create new branch for import jobs)
- Current git status: Some docs modified (CLAUDE.md, WORKFLOW_GUIDE.md, agents)
- Last commit: Phase 1.4 complete

---

## 🎯 Your First Task

**Invoke architect agent to design the ImportJob domain layer:**

```
You: "Design the domain layer for the ImportJob feature. We need to track import jobs with status, progress, and timing. Make sure the entity has rich behavior (not anemic)."
```

**Let architect read ARCHITECTURE_GUIDE.md and design following Clean Architecture principles.**

**After design is approved, implement domain layer first. Then application, then infrastructure, then presentation.**

---

**Remember:** This is our **reference implementation**. Get it right, and all other features will follow this pattern.

**You've got this. Let's build Clean Architecture! 🎯**
