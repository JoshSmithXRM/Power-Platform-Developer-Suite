# Testing Guide

**Purpose**: Comprehensive guide to testing patterns and practices for the Power Platform Developer Suite.

---

## 🚀 Quick Reference

**Testing Strategy**: **Stabilization-First Testing**
- Explore and iterate freely (no tests during exploration)
- Write tests AFTER F5 validation confirms design
- Tests lock in behavior, prevent regression
- Tests required before PR (not before F5)

**Coverage Guidelines** (not blocking requirements):
- Domain Layer: **80%+** (business rules, after stabilization)
- Application Layer: **70%+** (complex orchestration only)
- Infrastructure Layer: **As needed** (complex transformations only)
- Presentation Layer: **F5 is the test** (skip unit tests)

**Key Principles**:
- ✅ Write tests AFTER F5 validation, BEFORE review/PR
- ✅ Tests document expected behavior
- ✅ Tests prevent regression
- ✅ Test business logic, not implementation details
- ✅ Trust your experience during exploration - formalize with tests after

---

## 📊 Coverage Guidelines

Coverage is a guideline, not a gate. Focus on testing **valuable logic**, not hitting numbers.

**Target coverage by layer:**

| Layer | Target | What to Test |
|-------|--------|--------------|
| Domain | 80%+ | Business rules, validation, state machines |
| Application | 70%+ | Complex orchestration, error handling |
| Infrastructure | As needed | Complex transformations only |
| Presentation | 0% | F5 manual testing is more effective |

**Run coverage**:
```bash
npm run test:coverage
```

**Philosophy**: High coverage on code that matters > 100% coverage on everything.

---

## 🔄 When to Write Tests

**The key insight**: Tests lock in behavior. Don't lock in behavior you're still exploring.

### Exploration Phase (No Tests Required)
During implementation and F5 iteration:
- Focus on getting to F5 fast
- Pivot freely without rewriting tests
- Only write tests for logic you're uncertain about

**Optional tests during exploration:**
- Complex validation with many edge cases
- State machines / status transitions
- Math or date calculations

### Stabilization Phase (Tests Required)
After F5 validation confirms the design:
- Write tests for domain business rules
- Write tests for complex orchestration
- Tests become regression protection
- Required before code review / PR

**Test priority (what to test first):**
1. **Domain business rules** - validation, calculations, state machines
2. **Complex use cases** - anything that broke during F5 iteration
3. **Mappers with transformations** - non-trivial data shaping
4. **Skip** - simple pass-through, getters, VS Code wrappers

### Regression Phase (Ongoing)
When bugs are found:
- Write test that reproduces the bug
- Fix bug (test passes)
- Commit both together

This is test-driven bug fixing - you're already doing this. It works.

---

## 🎯 What to Test (By Layer)

### Domain Layer (80%+ coverage target)

**ALWAYS test**:
- ✅ Entity behavior methods
- ✅ Business rule validation
- ✅ State transitions
- ✅ Value object immutability
- ✅ Domain service complex logic

**Example - Entity Testing**:
```typescript
// src/features/importJobs/domain/entities/ImportJob.test.ts
describe('ImportJob', () => {
  // Test data factory
  function createValidImportJob(): ImportJob {
    return new ImportJob(
      new ImportJobId('job-123'),
      new SolutionName('TestSolution'),
      new Progress(0),
      JobStatus.Pending
    );
  }

  describe('isComplete', () => {
    it('should return true when progress is 100', () => {
      const job = createValidImportJob();
      job.updateProgress(new Progress(100));

      expect(job.isComplete()).toBe(true);
    });

    it('should return false when progress is less than 100', () => {
      const job = createValidImportJob();
      job.updateProgress(new Progress(50));

      expect(job.isComplete()).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return Completed when progress is 100', () => {
      const job = createValidImportJob();
      job.updateProgress(new Progress(100));

      expect(job.getStatus()).toBe(JobStatus.Completed);
    });

    it('should return InProgress when progress is between 0 and 100', () => {
      const job = createValidImportJob();
      job.updateProgress(new Progress(50));

      expect(job.getStatus()).toBe(JobStatus.InProgress);
    });

    it('should return Pending when progress is 0', () => {
      const job = createValidImportJob();

      expect(job.getStatus()).toBe(JobStatus.Pending);
    });
  });
});
```

**Example - Value Object Testing**:
```typescript
// src/features/importJobs/domain/valueObjects/Progress.test.ts
describe('Progress', () => {
  describe('constructor', () => {
    it('should create valid progress', () => {
      const progress = new Progress(50);

      expect(progress.getValue()).toBe(50);
    });

    it('should throw when value is negative', () => {
      expect(() => new Progress(-1)).toThrow('Progress must be between 0 and 100');
    });

    it('should throw when value exceeds 100', () => {
      expect(() => new Progress(101)).toThrow('Progress must be between 0 and 100');
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const progress = new Progress(50);
      const value = progress.getValue();

      // No setter exists - TypeScript enforces immutability
      expect(value).toBe(50);
    });
  });
});
```

---

### Application Layer (70%+ coverage target)

**ALWAYS test**:
- ✅ Use case orchestration flow
- ✅ Error handling paths
- ✅ Mapper transformations
- ✅ ViewModel correctness

**Example - Use Case Testing**:
```typescript
// src/features/importJobs/application/useCases/LoadImportJobsUseCase.test.ts
describe('LoadImportJobsUseCase', () => {
  let useCase: LoadImportJobsUseCase;
  let mockRepository: jest.Mocked<IImportJobRepository>;
  let mockMapper: jest.Mocked<ImportJobViewModelMapper>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn()
    } as jest.Mocked<IImportJobRepository>;

    mockMapper = {
      toViewModel: jest.fn()
    } as unknown as jest.Mocked<ImportJobViewModelMapper>;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as unknown as jest.Mocked<ILogger>;

    useCase = new LoadImportJobsUseCase(mockRepository, mockMapper, mockLogger);
  });

  describe('execute', () => {
    it('should load jobs, map to ViewModels, and return sorted by date', async () => {
      // Arrange
      const job1 = createImportJob('1', new Date('2024-01-01'));
      const job2 = createImportJob('2', new Date('2024-01-02'));
      const jobs = [job1, job2];

      mockRepository.findAll.mockResolvedValue(jobs);
      mockMapper.toViewModel.mockImplementation(job => ({
        id: job.getId().getValue(),
        // ... other fields
      }));

      // Act
      const result = await useCase.execute();

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockMapper.toViewModel).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2'); // Sorted desc by date
      expect(result[1].id).toBe('1');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Loaded 2 import jobs'
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockRepository.findAll.mockRejectedValue(new Error('DB error'));

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow('DB error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load import jobs',
        expect.any(Error)
      );
    });

    it('should return empty array when no jobs exist', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith('Loaded 0 import jobs');
    });
  });
});
```

**Example - Mapper Testing**:
```typescript
// src/features/importJobs/application/mappers/ImportJobViewModelMapper.test.ts
describe('ImportJobViewModelMapper', () => {
  describe('toViewModel', () => {
    it('should map domain entity to ViewModel', () => {
      // Arrange
      const job = createValidImportJob();

      // Act
      const viewModel = ImportJobViewModelMapper.toViewModel(job);

      // Assert
      expect(viewModel).toEqual({
        id: 'job-123',
        solutionName: 'TestSolution',
        progress: 0,
        status: 'Pending',
        createdOn: expect.any(String)
      });
    });

    it('should map completed job correctly', () => {
      // Arrange
      const job = createValidImportJob();
      job.updateProgress(new Progress(100));

      // Act
      const viewModel = ImportJobViewModelMapper.toViewModel(job);

      // Assert
      expect(viewModel.progress).toBe(100);
      expect(viewModel.status).toBe('Completed');
    });
  });
});
```

---

### Infrastructure Layer (as needed)

**Test when**:
- ✅ Complex query building
- ✅ Complex data transformations
- ✅ DTO → Domain entity mapping
- ✅ Error handling for API failures

**Skip testing**:
- ❌ Simple pass-through repositories
- ❌ Direct API calls (use integration tests)

**Example - Repository Testing**:
```typescript
// src/features/importJobs/infrastructure/repositories/DataverseApiImportJobRepository.test.ts
describe('DataverseApiImportJobRepository', () => {
  let repository: DataverseApiImportJobRepository;
  let mockApiClient: jest.Mocked<IDataverseApiClient>;

  beforeEach(() => {
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn()
    } as jest.Mocked<IDataverseApiClient>;

    repository = new DataverseApiImportJobRepository(mockApiClient);
  });

  describe('findAll', () => {
    it('should transform API DTOs to domain entities', async () => {
      // Arrange
      const apiResponse = {
        value: [
          {
            importjobid: 'job-123',
            solutionname: 'TestSolution',
            progress: 0.0,
            statuscode: 1
          }
        ]
      };
      mockApiClient.get.mockResolvedValue(apiResponse);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ImportJob);
      expect(result[0].getId().getValue()).toBe('job-123');
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/importjobs?$select=importjobid,solutionname,progress,statuscode'
      );
    });

    it('should handle API errors', async () => {
      // Arrange
      mockApiClient.get.mockRejectedValue(new Error('401 Unauthorized'));

      // Act & Assert
      await expect(repository.findAll()).rejects.toThrow('401 Unauthorized');
    });
  });
});
```

---

### Presentation Layer (F5 is the test)

**Test when**:
- ✅ Complex view rendering logic
- ✅ Reusable UI components
- ✅ View helpers with logic

**Skip testing**:
- ❌ Panels (prefer manual testing)
- ❌ VS Code API calls
- ❌ Simple event handlers

**Example - View Helper Testing**:
```typescript
// src/shared/infrastructure/ui/views/toolbarButtons.test.ts
describe('createToolbarButton', () => {
  it('should generate correct HTML for button', () => {
    const html = createToolbarButton('test-id', 'Test Label', 'icon-test');

    expect(html).toContain('id="test-id"');
    expect(html).toContain('Test Label');
    expect(html).toContain('icon-test');
  });

  it('should escape HTML in label', () => {
    const html = createToolbarButton('id', '<script>alert("XSS")</script>', 'icon');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
```

---

## ❌ What NOT to Test (Anti-Patterns)

### 1. Thin Wrappers
```typescript
// ❌ DON'T test this
public async save(env: Environment): Promise<void> {
  await this.storage.set(env.getId(), env);  // Direct delegation
}
```

### 2. Simple Getters/Setters
```typescript
// ❌ DON'T test this
public getName(): EnvironmentName {
  return this.name;  // TypeScript already validates
}
```

### 3. VS Code API Calls
```typescript
// ❌ DON'T test this
public show(): void {
  vscode.window.showInformationMessage('Hello');  // Hard to mock, low value
}
```

### 4. Obvious Behavior
```typescript
// ❌ DON'T test this
constructor(private readonly logger: ILogger) {}  // No logic
```

---

## 🛠️ Testing Utilities

### Test Data Factories

**Purpose**: Create realistic test data consistently across tests

#### Pattern 1: Simple Factory Function

**When to use**: Simple entities with few fields

```typescript
// src/features/importJobs/domain/entities/ImportJob.test.ts
function createValidImportJob(overrides?: Partial<ImportJobProps>): ImportJob {
  return new ImportJob(
    overrides?.id ?? new ImportJobId('job-123'),
    overrides?.solutionName ?? new SolutionName('TestSolution'),
    overrides?.progress ?? new Progress(0),
    overrides?.status ?? JobStatus.Pending
  );
}

// Usage
const job = createValidImportJob({ progress: new Progress(50) });
```

#### Pattern 2: Integration Test Data Factories

**When to use**: Integration tests needing realistic domain entities

```typescript
// ConnectionReferences integration test factory
function createMockConnectionReference(
  id: string,
  logicalName: string,
  displayName: string
): ConnectionReference {
  return new ConnectionReference(
    id,
    logicalName,
    displayName,
    'connector-123',
    'connection-456',
    false,
    new Date()
  );
}

// CloudFlow integration test factory
function createMockFlow(
  id: string,
  name: string,
  connectionRefName: string
): CloudFlow {
  const clientData = JSON.stringify({
    properties: {
      connectionReferences: {
        [connectionRefName]: {
          connection: {
            connectionReferenceLogicalName: connectionRefName
          }
        }
      }
    }
  });

  return new CloudFlow(
    id,
    name,
    new Date(),
    false,
    'John Doe',
    clientData
  );
}

// Usage in tests
const mockRef = createMockConnectionReference('cr-1', 'cr_test', 'Test CR');
const mockFlow = createMockFlow('flow-1', 'Test Flow', 'cr_test');
```

#### Pattern 3: ViewModel Factories

**When to use**: Testing mappers or UI components

```typescript
// Entity tree item factory
function createEntityTreeItem(
  logicalName: string,
  displayName: string
): EntityTreeItemViewModel {
  return {
    id: logicalName,
    displayName,
    logicalName,
    isCustom: false,
    icon: '📋'
  };
}

// Attribute row factory
function createAttributeRow(
  logicalName: string,
  displayName: string,
  type: string = 'String'
): AttributeRowViewModel {
  return {
    id: logicalName,
    logicalName,
    displayName,
    type,
    required: 'None',
    maxLength: '-',
    isLinkable: true,
    metadata: {} as never
  };
}

// Usage
const entityItem = createEntityTreeItem('account', 'Account');
const attribute = createAttributeRow('name', 'Account Name');
```

#### Pattern 4: Builder Pattern for Complex Objects

**When to use**: Complex objects with many optional fields

```typescript
class EnvironmentBuilder {
  private name = 'Test Environment';
  private dataverseUrl = 'https://test.crm.dynamics.com';
  private tenantId = 'tenant-123';
  private authMethod = AuthenticationMethodType.Interactive;
  private publicClientId = 'client-123';
  private powerPlatformEnvId?: string;

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withDataverseUrl(url: string): this {
    this.dataverseUrl = url;
    return this;
  }

  withServicePrincipal(clientId: string): this {
    this.authMethod = AuthenticationMethodType.ServicePrincipal;
    this.publicClientId = clientId;
    return this;
  }

  build(): Environment {
    return Environment.create({
      name: this.name,
      dataverseUrl: this.dataverseUrl,
      tenantId: this.tenantId,
      authenticationMethod: this.authMethod,
      publicClientId: this.publicClientId,
      powerPlatformEnvironmentId: this.powerPlatformEnvId
    });
  }
}

// Usage
const env = new EnvironmentBuilder()
  .withName('Production')
  .withServicePrincipal('sp-client-123')
  .build();
```

### Shared Testing Setup Helpers

**Location**: `src/shared/testing/setup/`

These helpers provide consistent mock setup across the codebase:

#### Pattern 1: Logger Setup

```typescript
// src/shared/testing/setup/loggerSetup.ts
export function createMockLogger(): jest.Mocked<ILogger> {
  return {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  } as jest.Mocked<ILogger>;
}

// Usage
import { createMockLogger } from '../../../shared/testing/setup';

beforeEach(() => {
  mockLogger = createMockLogger();
});
```

#### Pattern 2: Dataverse API Service Setup

```typescript
// src/shared/testing/setup/dataverseApiServiceSetup.ts
export function createMockDataverseApiService(): jest.Mocked<IDataverseApiService> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    batchDelete: jest.fn()
  } as jest.Mocked<IDataverseApiService>;
}

// Usage
import { createMockDataverseApiService } from '../../../shared/testing/setup';

beforeEach(() => {
  mockApiService = createMockDataverseApiService();
});
```

#### Pattern 3: Cancellation Token Setup

```typescript
// src/shared/testing/setup/cancellationTokenSetup.ts
export function createMockCancellationToken(
  isCancelled = false
): jest.Mocked<ICancellationToken> {
  return {
    isCancellationRequested: isCancelled,
    onCancellationRequested: jest.fn()
  } as jest.Mocked<ICancellationToken>;
}

// Usage for testing cancellation
const mockToken = createMockCancellationToken(true);
await expect(useCase.execute('env-123', mockToken))
  .rejects.toThrow(OperationCancelledException);
```

#### Pattern 4: Repository Setup

```typescript
// src/shared/testing/setup/repositorySetup.ts
export function createMockRepository<T>(): jest.Mocked<T> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn()
  } as jest.Mocked<T>;
}

// Usage with specific repository interface
const mockSolutionRepo = createMockRepository<ISolutionRepository>();
mockSolutionRepo.findAll.mockResolvedValue([createMockSolution()]);
```

### Mock Factory Patterns

#### Pattern 1: Environment Mock Factory

```typescript
function createMockEnvironment(
  id: string,
  name: string,
  ppEnvId?: string
): jest.Mocked<Environment> {
  return {
    getId: jest.fn().mockReturnValue(new EnvironmentId(id)),
    getName: jest.fn().mockReturnValue(new EnvironmentName(name)),
    getDataverseUrl: jest.fn().mockReturnValue('https://test.crm.dynamics.com'),
    getPowerPlatformEnvironmentId: jest.fn().mockReturnValue(ppEnvId),
    getAuthenticationMethod: jest.fn().mockReturnValue(
      AuthenticationMethod.create(AuthenticationMethodType.Interactive)
    )
  } as never;
}
```

#### Pattern 2: Use Case Mock Factory

```typescript
function createMockLoadUseCase<TResponse>(): jest.Mocked<{ execute: jest.Mock<Promise<TResponse>> }> {
  return {
    execute: jest.fn()
  };
}

// Usage
const mockLoadUseCase = createMockLoadUseCase<EntityMetadata[]>();
mockLoadUseCase.execute.mockResolvedValue([createMockEntity()]);
```

#### Pattern 3: Panel State Repository Mock

```typescript
function createMockPanelStateRepository(): jest.Mocked<IPanelStateRepository> {
  return {
    load: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined)
  } as jest.Mocked<IPanelStateRepository>;
}

// Usage with persisted state
mockPanelStateRepository.load.mockResolvedValueOnce({
  selectedSolutionId: 'sol-123',
  lastUpdated: new Date().toISOString()
});
```

### Test Helper Functions

#### flushPromises Helper

**Purpose**: Ensure all async operations complete before assertions

```typescript
/**
 * Flushes all pending promises in the event loop.
 * Use when testing async initialization or command handling.
 */
async function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(() => {
      setImmediate(() => {
        setImmediate(() => {
          resolve();
        });
      });
    });
  });
}

// Usage
it('should load data asynchronously', async () => {
  await Panel.createOrShow(/* ... */);
  await flushPromises();  // ✅ Wait for async initialization

  expect(mockUseCase.execute).toHaveBeenCalled();
});
```

#### assertDefined Helper

**Purpose**: Type-safe assertion that value is not null/undefined

```typescript
export function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('Expected value to be defined');
  }
}

// Usage
const result = await repository.findById('id-123');
assertDefined(result);  // ✅ TypeScript knows result is not null
expect(result.getId()).toBe('id-123');
```

---

## 🔄 Test-Driven Bug Fixes

For bug fixes, write the test FIRST:

```typescript
// 1. Write failing test
it('should not throw when activating environment twice', () => {
  const env = createValidEnvironment();
  env.activate();

  // Bug: This throws error, should not
  expect(() => env.activate()).not.toThrow();
});

// 2. Run test - FAILS ❌
// 3. Fix bug
// 4. Run test - PASSES ✅
```

See [Bug Fix Workflow](../../.claude/WORKFLOW.md#bug-fix-workflow) for complete pattern.

---

## 📈 Running Tests

### Run all tests
```bash
npm test
```

### Watch mode (during development)
```bash
npm run test:watch
```

### Coverage report
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- ImportJob.test.ts
```

### Run tests matching pattern
```bash
npm test -- --testNamePattern="should load jobs"
```

---

## 🎯 Coverage Best Practices

### 1. Test What Matters
```
Domain Layer:    80%+ ← Business rules, validation
Application:     70%+ ← Complex orchestration only
Infrastructure:  As needed ← Complex transformations
Presentation:    F5  ← Manual testing preferred
```

### 2. Track Coverage Trends
```bash
# View coverage summary
npm run test:coverage

# Open HTML report
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

### 3. Coverage ≠ Quality
- 100% coverage doesn't mean bug-free
- Focus on testing behavior, not implementation
- Test edge cases and error paths

---

## 🔗 See Also

- [Feature Development Workflow](../../.claude/WORKFLOW.md#feature-development-workflow) - Testing in feature workflow
- [Bug Fix Workflow](../../.claude/WORKFLOW.md#bug-fix-workflow) - Test-driven bug fixes
- [Refactoring Workflow](../../.claude/WORKFLOW.md#refactoring-workflow) - Testing during refactoring
- [CLAUDE.md](../../CLAUDE.md) - Testing rules and principles

---

**Remember**: Tests are documentation. They show how the code is intended to be used and what behavior is expected.
