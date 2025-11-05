# Development Workflows

**All workflows for the Power Platform Developer Suite in one place.**

---

## 🎯 Quick Reference

**Need to:**
- Build a new feature? → [Feature Development Workflow](#feature-development-workflow)
- Fix a bug? → [Bug Fix Workflow](#bug-fix-workflow)
- Refactor code? → [Refactoring Workflow](#refactoring-workflow)
- Add tests? → [Testing Workflow](#testing-workflow)

---

## Feature Development Workflow

**Use for:** New features, enhancements, significant changes

**Philosophy:** Design outside-in (from user perspective), implement inside-out (from domain to presentation), review once per feature.

### When to Design First

**Create formal design for:**
- ✅ Complex features (4+ vertical slices)
- ✅ New architectural patterns
- ✅ Features touching multiple domains
- ✅ Uncertain approach

**Skip formal design for:**
- ❌ Simple features (1-2 slices, <1 hour)
- ❌ Adding button or column to existing panel
- ❌ Minor enhancements to existing features

---

### Phase 1: Design (Outside-In Thinking)

**Duration:** 30-60 min for complex features, 10 min for simple features

#### Complex Features (Formal Design)

**1. Invoke design-architect**
```
I need to design a {feature name} that {user goal}.

Requirements:
- {Requirement 1}
- {Requirement 2}
- {Requirement 3}

Please create a comprehensive design covering all four layers.
```

**2. design-architect delivers:**
- Panel mockup (HTML/UX)
- ViewModels (data shape for UI)
- Use cases (user operations)
- Domain entities (business rules with behavior)
- Type contracts (all interfaces upfront)
- Design document in `docs/design/{FEATURE}_DESIGN.md`

**3. Review and approve design**
- Read design document
- Ask questions if unclear
- Approve or request changes
- **DO NOT START IMPLEMENTING until design approved**

#### Simple Features (Mental Model)

**1. Sketch design yourself:**
- What will user see? (panel/UI)
- What data does UI need? (ViewModels)
- What operations exist? (use cases)
- What business rules? (domain entities)

**2. Keep it simple:**
- No formal design document needed
- Quick mental model sufficient
- Start implementing

**Output:** Design document (complex) OR mental model (simple)

---

### Phase 2: Implement (Inside-Out)

**Duration:** 2-3 hours for typical feature

**Key Principle:** Implement from core outward (domain → application → infrastructure → presentation)

#### Step 1: Domain Layer (30-45 min)

**Implement:**
- Entities with rich behavior (methods, not just data)
- Value objects (immutable, validated)
- Repository interfaces (defined in domain)
- Domain services (if complex logic)

**Example:**
```typescript
// src/features/importJobs/domain/entities/ImportJob.ts
export class ImportJob {
  constructor(
    private readonly id: string,
    private status: JobStatus,
    private readonly startedAt: Date,
    private readonly completedAt: Date | null
  ) {
    this.validateInvariants();
  }

  /**
   * Checks if import job is complete.
   *
   * Business rule: Job complete when status is Completed or Failed
   */
  public isComplete(): boolean {
    return this.status === JobStatus.Completed ||
           this.status === JobStatus.Failed;
  }

  public getDuration(): Duration {
    if (!this.completedAt) {
      throw new Error('Cannot calculate duration for incomplete job');
    }
    return Duration.between(this.startedAt, this.completedAt);
  }

  private validateInvariants(): void {
    if (this.completedAt && this.completedAt < this.startedAt) {
      throw new Error('Completion cannot be before start');
    }
  }
}
```

**Write tests:**
```typescript
// src/features/importJobs/domain/entities/__tests__/ImportJob.test.ts
describe('ImportJob', () => {
  it('should calculate duration for completed job', () => {
    const job = new ImportJob('123', JobStatus.Completed, startDate, endDate);
    expect(job.getDuration().inMinutes()).toBe(5);
  });

  it('should throw when calculating duration for incomplete job', () => {
    const job = new ImportJob('123', JobStatus.InProgress, startDate, null);
    expect(() => job.getDuration()).toThrow();
  });
});
```

**Validate:**
```bash
npm test          # Tests must pass ✅
npm run compile   # Must compile ✅
```

**Commit:**
```bash
git add src/features/importJobs/domain/
git commit -m "feat(domain): add ImportJob entity with behavior

- Business rules: status transitions, duration calculation
- Value object: JobStatus enum
- Repository interface: IImportJobRepository
- Tests: 100% coverage of business logic
- Test file: src/features/importJobs/domain/entities/__tests__/ImportJob.test.ts"
```

#### Step 2: Application Layer (30-45 min)

**Implement:**
- Use cases (orchestration only, NO business logic)
- ViewModels (DTOs for presentation)
- Mappers (domain → ViewModel transformation)
- Commands (user actions)

**Example:**
```typescript
// src/features/importJobs/application/useCases/LoadImportJobsUseCase.ts
export class LoadImportJobsUseCase {
  constructor(
    private readonly repo: IImportJobRepository,
    private readonly logger: ILogger
  ) {}

  async execute(envId: string): Promise<ImportJobViewModel[]> {
    this.logger.info('Loading import jobs', { envId });

    // 1. Fetch domain entities
    const jobs = await this.repo.findByEnvironment(envId);

    // 2. Map to ViewModels
    const viewModels = jobs.map(job =>
      ImportJobViewModelMapper.toViewModel(job)
    );

    this.logger.info('Loaded import jobs', { count: viewModels.length });
    return viewModels;
  }
}

// Mapper (transformation only)
export class ImportJobViewModelMapper {
  static toViewModel(job: ImportJob): ImportJobViewModel {
    return {
      id: job.getId(),
      solutionName: job.getSolutionName(),
      status: job.isComplete() ? 'Completed' : 'In Progress', // Uses domain method
      duration: job.isComplete() ? job.getDuration().format() : null,
      canViewXml: job.hasXmlConfig()
    };
  }
}
```

**Write tests:**
```typescript
// src/features/importJobs/application/useCases/__tests__/LoadImportJobsUseCase.test.ts
describe('LoadImportJobsUseCase', () => {
  it('should load jobs and map to ViewModels', async () => {
    const mockRepo = createMockRepository();
    const nullLogger = new NullLogger();

    const useCase = new LoadImportJobsUseCase(mockRepo, nullLogger);
    const viewModels = await useCase.execute('env-123');

    expect(viewModels).toHaveLength(2);
    expect(viewModels[0].status).toBe('Completed');
  });
});
```

**Validate:**
```bash
npm test          # Tests must pass ✅
npm run compile   # Must compile ✅
```

**Commit:**
```bash
git add src/features/importJobs/application/
git commit -m "feat(app): add import job use cases and ViewModels

- Use case: LoadImportJobsUseCase (orchestration only)
- ViewModels: ImportJobViewModel (DTO)
- Mappers: domain → ViewModel transformation
- Tests: 90% coverage of orchestration logic
- Test file: src/features/importJobs/application/useCases/__tests__/LoadImportJobsUseCase.test.ts"
```

#### Step 3: Infrastructure Layer (20-30 min)

**Implement:**
- Repositories (implement domain interfaces)
- API clients (external service communication)
- DTOs (external data structures)
- DTO → domain mappers

**Example:**
```typescript
// src/features/importJobs/infrastructure/repositories/ImportJobRepository.ts
export class ImportJobRepository implements IImportJobRepository {
  constructor(
    private readonly apiClient: DataverseClient,
    private readonly logger: ILogger
  ) {}

  async findByEnvironment(envId: string): Promise<ImportJob[]> {
    this.logger.debug('Fetching import jobs from API', { envId });

    const response = await this.apiClient.query<ImportJobDto>(
      `importjobs?$filter=_environmentid_value eq '${envId}'`
    );

    const jobs = response.value.map(dto =>
      ImportJobDtoMapper.toDomain(dto)
    );

    this.logger.debug('Fetched import jobs', { count: jobs.length });
    return jobs;
  }
}
```

**Validate:**
```bash
npm run compile   # Must compile ✅
```

**Commit:**
```bash
git add src/features/importJobs/infrastructure/
git commit -m "feat(infra): add ImportJobRepository implementation

- Implements IImportJobRepository interface from domain
- Dataverse API integration
- DTO mapping to domain entities"
```

#### Step 4: Presentation Layer (30-45 min)

**Implement:**
- Panels (use use cases, NO business logic)
- Components (if reusable)
- Event handlers (call use cases only)
- Registration (package.json, extension.ts)

**Example:**
```typescript
// src/presentation/panels/ImportJobViewerPanel.ts
export class ImportJobViewerPanel extends BasePanel {
  constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private readonly loadJobsUseCase: LoadImportJobsUseCase,
    private readonly viewXmlCommand: ViewJobXmlCommand
  ) {
    super(panel, extensionUri);
    this.initialize();
  }

  private async handleEnvironmentSelection(envId: string): Promise<void> {
    // Delegate to use case (no business logic here)
    const viewModels = await this.loadJobsUseCase.execute(envId);

    // Update UI only
    this.jobsTable.setData(viewModels);
  }

  private async handleViewXml(jobId: string): Promise<void> {
    // Delegate to command
    await this.viewXmlCommand.execute(jobId);
  }
}
```

**Register command:**
```json
// package.json
{
  "contributes": {
    "commands": [
      {
        "command": "powerPlatformDevSuite.viewImportJobs",
        "title": "Power Platform: View Import Jobs"
      }
    ]
  }
}
```

```typescript
// src/extension.ts
context.subscriptions.push(
  vscode.commands.registerCommand(
    'powerPlatformDevSuite.viewImportJobs',
    () => {
      ImportJobViewerPanel.createOrShow(context.extensionUri);
    }
  )
);
```

**Validate:**
```bash
npm run compile   # Must compile ✅
```

**Manual test:**
```
Press F5 → Extension Development Host launches
Ctrl+Shift+P → "Power Platform: View Import Jobs"
Verify feature works end-to-end ✅
```

**Commit:**
```bash
git add src/presentation/panels/ImportJobViewerPanel.ts package.json src/extension.ts
git commit -m "feat(presentation): add Import Job Viewer panel

- Panel uses LoadImportJobsUseCase (no business logic)
- Registered command: powerPlatformDevSuite.viewImportJobs
- Manual test: ✅ Feature works end-to-end"
```

---

### Phase 3: Review (Once Per Feature)

**Duration:** 5-15 min

**After all 4 layers implemented and compiled.**

**Invoke code-guardian:**
```
Review the Import Job Viewer feature for approval.

Files changed:
- src/features/importJobs/domain/
- src/features/importJobs/application/
- src/features/importJobs/infrastructure/
- src/presentation/panels/ImportJobViewerPanel.ts

Manual testing: ✅ Completed (feature works end-to-end)
```

**code-guardian reviews:**
- Architecture (Clean Architecture compliance)
- Type safety (no `any`, explicit returns)
- Tests (coverage, quality, passing)
- Code quality (logging, comments, duplication)
- Manual testing completed

**code-guardian responds:**
- **APPROVE** ✅ → Done! Feature ready to ship
- **CHANGES REQUESTED** ⚠️ → Fix critical issues and re-review

**If changes requested:**
1. Fix critical issues
2. Run `npm run compile` ✅
3. Re-invoke code-guardian
4. Get approval

**Output:** Approved feature ready to ship

---

### Phase 4: Documentation (Optional)

**Duration:** 10-20 min

**When:** New pattern introduced OR batch at end of sprint

**Invoke docs-generator (optional):**
```
Document the Import Job Viewer feature.

Focus on:
- Rich domain model (ImportJob entity)
- Use case orchestration pattern
- ViewModel mapping

Update:
- README.md (add feature to list)
- docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md (add example if new pattern)
```

**Output:** Updated documentation

---

## Bug Fix Workflow

**Use for:** Fixing bugs, addressing issues, correcting errors

**Duration:** 15-60 min

### Step 1: Reproduce Bug

**Write failing test that reproduces the bug:**
```typescript
// src/features/importJobs/domain/entities/__tests__/ImportJob.test.ts
it('should handle null completedAt when calculating duration', () => {
  const job = new ImportJob('123', JobStatus.InProgress, new Date(), null);

  // This currently throws, but shouldn't
  expect(() => job.getDuration()).toThrow('Cannot calculate duration for incomplete job');
});
```

**Run test:**
```bash
npm test  # Test should FAIL (reproduces bug)
```

### Step 2: Fix Bug

**Fix the issue:**
```typescript
// src/features/importJobs/domain/entities/ImportJob.ts
public getDuration(): Duration {
  if (!this.completedAt) {
    throw new Error('Cannot calculate duration for incomplete job');
  }
  return Duration.between(this.startedAt, this.completedAt);
}
```

### Step 3: Verify Fix

**Run tests:**
```bash
npm test          # Test should PASS ✅
npm run compile   # Must compile ✅
```

**Manual test:**
```
Press F5 → Verify bug is fixed ✅
```

### Step 4: Commit

```bash
git add .
git commit -m "fix: handle null completedAt in ImportJob.getDuration()

- Added null check before calculating duration
- Throws clear error for incomplete jobs
- Test: src/features/importJobs/domain/entities/__tests__/ImportJob.test.ts"
```

### Step 5: Review (Optional)

**For critical bugs or uncertain fixes, invoke code-guardian:**
```
Review the bug fix for Import Job duration calculation.

Files changed:
- src/features/importJobs/domain/entities/ImportJob.ts
- src/features/importJobs/domain/entities/__tests__/ImportJob.test.ts
```

**For simple bugs:**
- Skip review
- Commit and move on

---

## Refactoring Workflow

**Use for:** Improving code structure without changing behavior

**Duration:** 30 min - 2 hours

### Step 1: Tests Pass Before Refactoring

**Baseline behavior:**
```bash
npm test  # Must pass BEFORE refactoring ✅
```

**If tests don't exist:**
1. Write tests first
2. Get tests passing
3. THEN refactor

### Step 2: Refactor Incrementally

**Make small, focused changes:**

**Example: Moving business logic from use case to domain**

**Before (business logic in use case):**
```typescript
class LoadJobsUseCase {
  execute() {
    const jobs = await this.repo.findAll();

    // ❌ Business logic in use case
    return jobs.map(job => ({
      status: job.completedAt ? 'Done' : 'Pending'
    }));
  }
}
```

**After (business logic in domain):**
```typescript
// Domain entity
class ImportJob {
  public isComplete(): boolean {
    return this.status === JobStatus.Completed;
  }
}

// Use case (orchestration only)
class LoadJobsUseCase {
  execute() {
    const jobs = await this.repo.findAll();

    return jobs.map(job => ({
      status: job.isComplete() ? 'Completed' : 'Pending'
    }));
  }
}
```

### Step 3: Tests Pass After Refactoring

**Verify behavior unchanged:**
```bash
npm test          # Must pass AFTER refactoring ✅
npm run compile   # Must compile ✅
```

**Manual test:**
```
Press F5 → Verify feature still works ✅
```

### Step 4: Commit

```bash
git add .
git commit -m "refactor: move status logic from use case to domain

- Moved isComplete() logic to ImportJob entity
- Use case now orchestrates only (no business logic)
- Behavior unchanged (tests pass)"
```

### Step 5: Review (Optional)

**For major refactorings, invoke code-guardian:**
```
Review the refactoring that moved business logic to domain.

Files changed:
- src/features/importJobs/domain/entities/ImportJob.ts
- src/features/importJobs/application/useCases/LoadImportJobsUseCase.ts
```

---

## Testing Workflow

**Use for:** Adding tests to existing code

### Domain Entity Tests

**Target:** 100% coverage of business logic

```typescript
// src/features/importJobs/domain/entities/__tests__/ImportJob.test.ts
describe('ImportJob', () => {
  describe('isComplete', () => {
    it('should return true when status is Completed', () => {
      const job = new ImportJob('123', JobStatus.Completed, new Date(), new Date());
      expect(job.isComplete()).toBe(true);
    });

    it('should return true when status is Failed', () => {
      const job = new ImportJob('123', JobStatus.Failed, new Date(), new Date());
      expect(job.isComplete()).toBe(true);
    });

    it('should return false when status is InProgress', () => {
      const job = new ImportJob('123', JobStatus.InProgress, new Date(), null);
      expect(job.isComplete()).toBe(false);
    });
  });

  describe('getDuration', () => {
    it('should calculate duration for completed job', () => {
      const started = new Date('2025-01-01T10:00:00Z');
      const completed = new Date('2025-01-01T10:05:00Z');
      const job = new ImportJob('123', JobStatus.Completed, started, completed);

      expect(job.getDuration().inMinutes()).toBe(5);
    });

    it('should throw for incomplete job', () => {
      const job = new ImportJob('123', JobStatus.InProgress, new Date(), null);
      expect(() => job.getDuration()).toThrow();
    });
  });
});
```

### Use Case Tests

**Target:** 90% coverage of orchestration logic

```typescript
// src/features/importJobs/application/useCases/__tests__/LoadImportJobsUseCase.test.ts
describe('LoadImportJobsUseCase', () => {
  it('should load jobs and map to ViewModels', async () => {
    const mockJobs = [
      new ImportJob('1', JobStatus.Completed, new Date(), new Date()),
      new ImportJob('2', JobStatus.InProgress, new Date(), null)
    ];

    const mockRepo: IImportJobRepository = {
      findByEnvironment: jest.fn().mockResolvedValue(mockJobs)
    };

    const nullLogger = new NullLogger();
    const useCase = new LoadImportJobsUseCase(mockRepo, nullLogger);

    const result = await useCase.execute('env-123');

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('Completed');
    expect(result[1].status).toBe('In Progress');
    expect(mockRepo.findByEnvironment).toHaveBeenCalledWith('env-123');
  });

  it('should handle empty result', async () => {
    const mockRepo: IImportJobRepository = {
      findByEnvironment: jest.fn().mockResolvedValue([])
    };

    const useCase = new LoadImportJobsUseCase(mockRepo, new NullLogger());
    const result = await useCase.execute('env-123');

    expect(result).toHaveLength(0);
  });
});
```

### Run Tests

```bash
npm test          # Run all tests
npm test -- ImportJob.test.ts  # Run specific test file
```

---

## Common Patterns

### Pattern 1: Iterative Development

**For large features, break into vertical slices:**

**Slice 1 (MVP):**
- Core functionality only
- All 4 layers (minimal)
- Design → Implement → Review → Commit
- **Feature is shippable**

**Slice 2 (Enhancement):**
- Add filtering
- All 4 layers (if needed)
- Implement → Review → Commit
- **Feature improved**

**Slice 3 (Polish):**
- Add sorting, search
- Implement → Review → Commit
- **Feature complete**

### Pattern 2: Commit Frequency

**Commit often, commit small:**
- ✅ One commit per layer
- ✅ One commit per bug fix
- ✅ One commit per refactoring
- ❌ Don't batch 5 tasks into one commit

### Pattern 3: Branching Strategy

**Feature branches (optional):**
```bash
git checkout -b feature/import-job-viewer
# Implement feature
git checkout main
git merge feature/import-job-viewer
```

**Direct to main (simpler):**
```bash
# Work directly on main
# Commit frequently
# Push when feature complete
```

---

## Success Metrics

**Track after each session:**
- ✅ Features completed
- ✅ Commits made
- ✅ Tests written
- ✅ Code compiled
- ✅ Manual tests passed
- ✅ Code approved

**If uncertain or blocked → STOP, ask questions, don't push forward.**

---

## 🔗 See Also

- [AGENTS.md](AGENTS.md) - Guide to design-architect, code-guardian, docs-generator
- [CLAUDE.md](CLAUDE.md) - Project coding rules and architecture principles
- [docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md](../docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md) - Architecture patterns
- [docs/testing/TESTING_GUIDE.md](../docs/testing/TESTING_GUIDE.md) - Testing patterns and coverage
