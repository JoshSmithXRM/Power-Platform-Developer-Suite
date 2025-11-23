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

**Design approach depends on feature complexity:**

| Complexity | Files | Approach | Duration |
|-----------|-------|----------|----------|
| **Simple** | 1-2 files | Use "think" or "think hard" | 5-10 min |
| **Medium** | 3-6 files | Slice-based design | 15-30 min per slice |
| **Complex** | 7+ files | Slice-based design + extended thinking | 30-60 min per slice |
| **Uncertain** | Any | "think harder" to evaluate options first | 10-20 min |

**Key Insight:** Large designs (12+ files, 100KB+) overwhelm Claude and lead to implementation failure. **Break into slices instead.**

---

### Phase 1: Design (Outside-In Thinking)

**Duration:** Varies by complexity and approach

#### Simple Features (Extended Thinking Only)

**For 1-2 file changes:**

**Approach:** Use extended thinking instead of formal design
```
Think about the best approach for {feature}.

Consider:
- Where does business logic live? (domain entity method)
- What's the use case orchestration? (coordinate domain)
- How does UI get data? (ViewModel mapping)

Then implement incrementally (domain → app → presentation).
```

**Extended thinking modes:**
- `"think"` - Standard (~10-20s extra reasoning)
- `"think hard"` - Thorough (~30-60s)
- `"think harder"` - Deep analysis (~1-2min)

**Output:** Mental model (no document), proceed to implementation

**Example:**
```
Think about adding a "Clear All" button to Persistence Inspector.

- Business rule: Can't clear protected keys (domain entity: StorageEntry.isProtected())
- Use case: ClearAllStorageUseCase coordinates validation + deletion
- UI: Button calls use case, shows confirmation dialog

Implement domain first.
```

---

#### Medium Features (Slice-Based Design)

**For 3-6 file features:**

**Problem:** Designing all files upfront creates large design docs → Claude fails to implement

**Solution:** Design and implement in slices (MVPs)

**Approach:**
1. **Think through ENTIRE feature conceptually** (high-level only)
2. **Design SLICE 1 in detail** (MVP - minimal viable implementation)
3. **Implement Slice 1** (domain → app → infra → presentation)
4. **Ship Slice 1** (working, tested, committed)
5. Repeat for Slice 2, 3, etc.

**Slice 1 (MVP):**
```
I need to design an Import Job Viewer.

FULL FEATURE (conceptual):
- List import jobs for selected environment
- Filter by status (pending/in-progress/completed/failed)
- View XML configuration for each job
- Real-time status updates
- Export to CSV

SLICE 1 (design in detail):
- List import jobs for selected environment
- Show status (no filtering yet)
- Basic panel UI (no real-time updates yet)

Please design ONLY Slice 1 (3-4 files: ImportJob entity, LoadImportJobsUseCase, ImportJobRepository interface, ImportJobViewerPanel)
```

**Benefits:**
- Small design (<30KB) Claude can implement successfully
- Ship value incrementally
- Iterate based on real usage
- Each slice is fully tested and production-ready

**Output:** Small design document per slice, delete after implementation

---

#### Complex Features (Slice-Based + Extended Thinking)

**For 7+ file features:**

**Approach:**
1. **"Think harder" about overall architecture first** (evaluate options)
2. **Break into 3-5 slices** (each shippable)
3. **Design each slice separately** (invoke design-architect per slice)
4. **Implement incrementally** (ship each slice)

**Example:**
```
Think harder about the best architecture for Metadata Browser.

Feature needs:
- Browse entities, attributes, relationships, choices
- Search/filter
- Save favorites
- Export metadata
- 20+ files total

Options:
1. Single panel with tabs (simpler, more coupling)
2. Multiple coordinated panels (more complex, better separation)
3. Tree view with detail panel (hybrid approach)

Evaluate trade-offs:
- Maintainability
- User experience
- Testability
- Future extensibility

[Claude thinks for 1-2 minutes, evaluates options]

Recommendation: Tree view with detail panel (Option 3)

Now let's design Slice 1: Entity browser only (no attributes/relationships yet)
```

**Benefits:**
- Extended thinking prevents wrong architectural choice
- Slices keep designs small and implementable
- Each slice delivers user value
- Can pivot between slices based on feedback

**Output:** Architectural decision + small designs per slice

---

#### Uncertain Approach (Think First, Design Later)

**When you don't know the best approach:**

**Don't immediately invoke design-architect. Use extended thinking first.**

**Example:**
```
Think harder about whether to use:
1. Singleton service with event emitter (current pattern)
2. VS Code WebviewViewProvider (official pattern)
3. Custom panel coordinator (hybrid)

for the new Data Inspector feature.

Evaluate:
- Alignment with VS Code best practices
- Migration path from current code
- Testability
- Future-proofing

[Claude evaluates for 1-2 min]

Recommendation: [Option with rationale]

Now design Slice 1 using that approach.
```

**Benefits:**
- Prevents designing down wrong path
- Explores trade-offs before committing
- Claude's extended thinking is excellent for architecture evaluation
- Saves time (don't design + implement + realize approach was wrong)

---

### Design Output & Retention

**After feature implementation complete:**

1. ✅ Feature works end-to-end
2. ✅ Tests pass (domain 100%, use cases 90%)
3. ✅ Manual testing complete (F5)
4. ✅ Code review approved (code-guardian)
5. ❌ **DELETE design document**

**Rationale:**
- Tests document behavior (executable specification)
- Architecture guides document patterns
- Design docs drift from implementation immediately
- Keeping designs creates bloat (see DOCUMENTATION_POLICY.md)

**Exception:** If design introduced NEW architectural pattern:
- Extract pattern to `docs/architecture/*.md`
- Delete design specifics
- Architecture guide is living document

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

### Bug Fix Examples from Production

#### Example 1: Domain Logic Bug (Value Object Validation)

**Bug**: EnvironmentName accepts empty string after trim

**Test (reproduces bug)**:
```typescript
// src/features/environmentSetup/domain/valueObjects/__tests__/EnvironmentName.test.ts
describe('EnvironmentName validation', () => {
  it('should reject whitespace-only names', () => {
    // Bug: This passes but should fail
    expect(() => new EnvironmentName('   ')).toThrow('Environment name cannot be empty');
  });
});
```

**Before (buggy)**:
```typescript
export class EnvironmentName {
  constructor(value: string) {
    if (!value) {  // ❌ Doesn't catch whitespace-only strings
      throw new DomainError('Environment name cannot be empty');
    }
    this.value = value.trim();
  }
}
```

**After (fixed)**:
```typescript
export class EnvironmentName {
  constructor(value: string) {
    if (!value || value.trim() === '') {  // ✅ Checks trimmed value
      throw new DomainError('Environment name cannot be empty');
    }
    this.value = value.trim();
  }
}
```

**Commit**:
```bash
git commit -m "fix(domain): reject whitespace-only environment names

- Check trimmed value before accepting
- Prevents creating environments with invisible names
- Test: EnvironmentName.test.ts"
```

---

#### Example 2: Use Case Bug (Sorting Logic)

**Bug**: Connection references sorted incorrectly (mixes managed/unmanaged)

**Test (reproduces bug)**:
```typescript
// src/features/connectionReferences/application/useCases/__tests__/ListConnectionReferencesUseCase.test.ts
describe('ListConnectionReferencesUseCase', () => {
  it('should sort unmanaged before managed', () => {
    const managed = createMockRef('cr-1', 'Managed', true);
    const unmanaged = createMockRef('cr-2', 'Unmanaged', false);

    mockRepository.findAll.mockResolvedValue([managed, unmanaged]);

    const result = await useCase.execute('env-123');

    // Bug: Managed appears first
    expect(result[0].logicalName).toBe('Unmanaged');  // ✅ Unmanaged should be first
  });
});
```

**Before (buggy)**:
```typescript
class ListConnectionReferencesUseCase {
  async execute(envId: string): Promise<ConnectionReferenceViewModel[]> {
    const refs = await this.repository.findAll(envId);

    // ❌ Wrong: Sorts by name only (ignores isManaged)
    return refs
      .map(ref => this.mapper.toViewModel(ref))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
}
```

**After (fixed)**:
```typescript
class ListConnectionReferencesUseCase {
  async execute(envId: string): Promise<ConnectionReferenceViewModel[]> {
    const refs = await this.repository.findAll(envId);

    // ✅ Delegate sorting to domain service
    const sorted = this.collectionService.sort(refs);

    return sorted.map(ref => this.mapper.toViewModel(ref));
  }
}

// Domain service handles business rule
class ConnectionReferenceCollectionService {
  sort(refs: ConnectionReference[]): ConnectionReference[] {
    return [...refs].sort((a, b) => {
      // Unmanaged first
      if (a.isManaged !== b.isManaged) {
        return a.isManaged ? 1 : -1;
      }
      // Then by name
      return a.displayName.localeCompare(b.displayName);
    });
  }
}
```

**Commit**:
```bash
git commit -m "fix(app): sort connection references by managed status

- Unmanaged solutions appear first
- Then sorted alphabetically by name
- Moved sorting logic to domain service
- Test: ListConnectionReferencesUseCase.test.ts"
```

---

#### Example 3: Repository Bug (Query Building)

**Bug**: Plugin trace filter builds invalid OData query for datetime

**Test (reproduces bug)**:
```typescript
// src/features/pluginTraceViewer/infrastructure/repositories/__tests__/DataversePluginTraceRepository.test.ts
describe('DataversePluginTraceRepository', () => {
  it('should build valid OData filter for datetime', () => {
    const filter = TraceFilter.create({
      createdAfter: new Date('2024-01-01T00:00:00Z')
    });

    mockApiService.get.mockResolvedValue({ value: [] });

    await repository.getTraces('env-123', filter);

    // Bug: Generates invalid OData (missing timezone)
    expect(mockApiService.get).toHaveBeenCalledWith(
      'env-123',
      expect.stringContaining("createdon ge 2024-01-01T00:00:00Z")  // ✅ ISO 8601 format
    );
  });
});
```

**Before (buggy)**:
```typescript
class TraceFilter {
  buildFilterExpression(): string {
    const conditions: string[] = [];

    if (this.createdAfter) {
      // ❌ Wrong: Missing 'Z' timezone suffix
      conditions.push(`createdon ge ${this.createdAfter.toISOString().slice(0, -5)}`);
    }

    return conditions.join(' and ');
  }
}
```

**After (fixed)**:
```typescript
class TraceFilter {
  buildFilterExpression(): string {
    const conditions: string[] = [];

    if (this.createdAfter) {
      // ✅ Correct: Full ISO 8601 with timezone
      conditions.push(`createdon ge ${this.createdAfter.toISOString()}`);
    }

    return conditions.join(' and ');
  }
}
```

**Commit**:
```bash
git commit -m "fix(domain): generate valid OData datetime filters

- Use full ISO 8601 format with timezone (Z)
- Fixes API 400 errors for datetime filters
- Test: DataversePluginTraceRepository.test.ts"
```

---

#### Example 4: Panel Bug (Async Initialization Race Condition)

**Bug**: Panel shows "No data" briefly before loading completes

**Test (reproduces bug)**:
```typescript
// src/features/metadataBrowser/presentation/panels/__tests__/MetadataBrowserPanel.integration.test.ts
describe('MetadataBrowserPanel', () => {
  it('should not show empty state during initialization', async () => {
    const entities = [createEntityTreeItem('account', 'Account')];
    mockLoadUseCase.execute.mockResolvedValue({ entities, choices: [] });

    await Panel.createOrShow(/* ... */);

    // Wait for async initialization
    await flushPromises();

    // Bug: "No data" message flashed during load
    expect(mockPanel.webview.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ command: 'showEmptyState' })
    );
  });
});
```

**Before (buggy)**:
```typescript
class MetadataBrowserPanel {
  private async initialize(): Promise<void> {
    // ❌ Shows empty state immediately
    this.showEmptyState();

    // Then loads data (causing flash)
    const data = await this.loadMetadataTreeUseCase.execute(this.environmentId);
    this.updateTreeView(data);
  }
}
```

**After (fixed)**:
```typescript
class MetadataBrowserPanel {
  private async initialize(): Promise<void> {
    // ✅ Show loading state first
    this.showLoadingState();

    try {
      const data = await this.loadMetadataTreeUseCase.execute(this.environmentId);

      if (data.entities.length === 0 && data.choices.length === 0) {
        this.showEmptyState();  // Only show if truly empty
      } else {
        this.updateTreeView(data);
      }
    } catch (error) {
      this.showErrorState(error);
    }
  }
}
```

**Commit**:
```bash
git commit -m "fix(ui): prevent empty state flash during panel initialization

- Show loading state during data fetch
- Only show empty state when data truly empty
- Improves perceived performance
- Test: MetadataBrowserPanel.integration.test.ts"
```

---

#### Example 5: Performance Bug (N+1 Query)

**Bug**: Loading 100 solution components makes 101 API calls (1 + 100)

**Test (reproduces bug)**:
```typescript
// src/shared/infrastructure/repositories/__tests__/DataverseApiSolutionComponentRepository.test.ts
describe('DataverseApiSolutionComponentRepository performance', () => {
  it('should fetch components with single query using $expand', async () => {
    mockApiService.get.mockResolvedValue({
      value: [
        { objectid: 'comp-1', componenttype: 1, objecttypecode: 'entity-1' },
        { objectid: 'comp-2', componenttype: 1, objecttypecode: 'entity-2' }
      ]
    });

    await repository.findComponentIdsBySolution('env-123', 'sol-1', 'customentity');

    // ✅ Should make only 2 API calls (ObjectTypeCode + components)
    expect(mockApiService.get).toHaveBeenCalledTimes(2);
  });
});
```

**Before (buggy - N+1 queries)**:
```typescript
class DataverseApiSolutionComponentRepository {
  async findComponentIdsBySolution(
    envId: string,
    solutionId: string,
    entityLogicalName: string
  ): Promise<string[]> {
    // Query 1: Get ObjectTypeCode
    const objectTypeCode = await this.getObjectTypeCode(envId, entityLogicalName);

    // Query 2: Get component IDs
    const components = await this.getComponents(envId, solutionId, objectTypeCode);

    // ❌ Bug: Then loops and fetches each component individually (N queries)
    const fullComponents = [];
    for (const comp of components) {
      const full = await this.apiService.get(`solutioncomponents(${comp.objectid})`);
      fullComponents.push(full);
    }

    return fullComponents.map(c => c.objectid);
  }
}
```

**After (fixed - 2 queries total)**:
```typescript
class DataverseApiSolutionComponentRepository {
  async findComponentIdsBySolution(
    envId: string,
    solutionId: string,
    entityLogicalName: string
  ): Promise<string[]> {
    // Query 1: Get ObjectTypeCode
    const objectTypeCode = await this.getObjectTypeCode(envId, entityLogicalName);

    if (objectTypeCode === null) {
      return [];
    }

    // Query 2: Get all component IDs in single query (no expand needed)
    const filter = `_solutionid_value eq ${solutionId} and componenttype eq ${objectTypeCode}`;
    const endpoint = `/api/data/v9.2/solutioncomponents?$select=objectid&$filter=${filter}`;

    const response = await this.apiService.get<ResponseDto>(envId, endpoint);

    // ✅ Fixed: Returns IDs directly (no additional queries)
    return response.value.map(sc => sc.objectid);
  }
}
```

**Commit**:
```bash
git commit -m "fix(perf): eliminate N+1 queries in solution component loading

- Reduced from 101 API calls to 2 calls
- Fetch all component IDs in single query
- Improves load time by 95% for large solutions
- Test: DataverseApiSolutionComponentRepository.test.ts"
```

---

#### Example 6: Edge Case Bug (Empty Array Handling)

**Bug**: Timeline hierarchy service crashes on empty trace array

**Test (reproduces bug)**:
```typescript
// src/features/pluginTraceViewer/domain/services/__tests__/TimelineHierarchyService.test.ts
describe('TimelineHierarchyService', () => {
  it('should handle empty trace array gracefully', () => {
    const service = new TimelineHierarchyService();

    // Bug: Crashes with "Cannot read property 'getTime' of undefined"
    const result = service.buildHierarchy([]);

    expect(result).toEqual([]);  // ✅ Should return empty array
  });
});
```

**Before (buggy)**:
```typescript
class TimelineHierarchyService {
  buildHierarchy(traces: readonly PluginTrace[]): readonly TimelineNode[] {
    // ❌ Bug: Doesn't check for empty array
    const timelineStart = Math.min(...traces.map(t => t.createdOn.getTime()));  // Crashes if empty
    const timelineEnd = Math.max(...traces.map(t => t.createdOn.getTime() + t.duration.milliseconds));
    const totalDuration = timelineEnd - timelineStart;

    // ...
  }
}
```

**After (fixed)**:
```typescript
class TimelineHierarchyService {
  buildHierarchy(traces: readonly PluginTrace[]): readonly TimelineNode[] {
    // ✅ Early return for empty array
    if (traces.length === 0) {
      return [];
    }

    const timelineStart = Math.min(...traces.map(t => t.createdOn.getTime()));
    const timelineEnd = Math.max(...traces.map(t => t.createdOn.getTime() + t.duration.milliseconds));
    const totalDuration = timelineEnd - timelineStart;

    // ...
  }
}
```

**Commit**:
```bash
git commit -m "fix(domain): handle empty trace array in timeline builder

- Early return prevents Math.min/max on empty array
- Fixes crash when no traces match filter
- Test: TimelineHierarchyService.test.ts"
```

---

## Refactoring Workflow

**Use for:** Improving code structure without changing behavior

**Duration:** 30 min - 2 hours

---

### ⚡ Special Case: Refactoring to Existing Pattern

**If you're porting/migrating code to an existing, documented pattern:**

**Examples:**
- "Port Environment Setup panel to universal panel pattern"
- "Migrate Connection References to PanelCoordinator"
- "Refactor Persistence Inspector to use existing framework"

**Streamlined Process:**

1. **Study reference implementation**
   - Read pattern guide (e.g., `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`)
   - Study working example (e.g., `SolutionsPanel.ts`)
   - Understand the pattern

2. **Map existing → new structure**
   ```
   Old manual routing → PanelCoordinator
   Old handlers → Registered commands
   Old view → Section
   ```

3. **Implement incrementally**
   - Small steps, test after each
   - Keep old file until new version works
   - Easy rollback if needed

4. **Skip design-architect**
   - Pattern already documented
   - Design would be redundant
   - Follow cookbook instead

5. **Invoke code-guardian for final review**
   - After refactoring complete
   - Verify pattern compliance
   - Get approval before deleting old file

**This is NOT standard refactoring - it's following an existing recipe.**

---

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
