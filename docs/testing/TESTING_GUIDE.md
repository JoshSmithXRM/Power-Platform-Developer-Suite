# Testing Guide

**Purpose**: Comprehensive guide to testing patterns and practices for the Power Platform Developer Suite.

---

## 🚀 Quick Reference

**Testing Strategy**: **Inverted Testing Pyramid**
- Heavy testing at domain/application layers
- Light testing at infrastructure layer
- Minimal testing at presentation layer

**Coverage Targets**:
- Domain Layer: **95-100%** (business logic critical)
- Application Layer: **85-95%** (orchestration verification)
- Infrastructure Layer: **70-85%** (complex transformations only)
- Presentation Layer: **<50%** (manual testing preferred)

**Key Principles**:
- ✅ Write tests AFTER implementation, BEFORE review
- ✅ Tests document expected behavior
- ✅ Tests prevent regression
- ✅ Test business logic, not implementation details

---

## 📊 Coverage Thresholds

Jest is configured with the following coverage thresholds:

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85
  },
  './src/**/domain/**/*.ts': {
    branches: 90,
    functions: 95,
    lines: 95,
    statements: 95
  },
  './src/**/application/**/*.ts': {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90
  }
}
```

**Run coverage**:
```bash
npm run test:coverage
```

---

## 🎯 What to Test (By Layer)

### Domain Layer (100% coverage target)

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

### Application Layer (90% coverage target)

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

### Infrastructure Layer (70% coverage target)

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

### Presentation Layer (<50% coverage target)

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

Create reusable factories for domain entities:

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

### Mock Helpers

```typescript
function createMockLogger(): jest.Mocked<ILogger> {
  return {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  } as jest.Mocked<ILogger>;
}

function createMockRepository(): jest.Mocked<IImportJobRepository> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn()
  } as jest.Mocked<IImportJobRepository>;
}
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

See [BUG_FIX_WORKFLOW.md](../../.claude/workflows/BUG_FIX_WORKFLOW.md) for complete pattern.

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

### 1. Aim for High Domain Coverage
```
Domain Layer:    95-100% ← Critical
Application:     85-95%  ← Important
Infrastructure:  70-85%  ← Selective
Presentation:    <50%    ← Manual
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

- [NEW_FEATURE_WORKFLOW.md](../../.claude/workflows/NEW_FEATURE_WORKFLOW.md) - Testing in feature workflow
- [BUG_FIX_WORKFLOW.md](../../.claude/workflows/BUG_FIX_WORKFLOW.md) - Test-driven bug fixes
- [REFACTORING_WORKFLOW.md](../../.claude/workflows/REFACTORING_WORKFLOW.md) - Testing during refactoring
- [CLAUDE.md](../../CLAUDE.md) - Testing rules and principles

---

**Remember**: Tests are documentation. They show how the code is intended to be used and what behavior is expected.
