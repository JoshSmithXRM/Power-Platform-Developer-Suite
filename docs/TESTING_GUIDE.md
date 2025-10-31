# Testing Guide

> **Purpose:** Document testing strategy and patterns for the Power Platform Developer Suite.

## Table of Contents
- [Overview](#overview)
- [Framework Choice](#framework-choice)
- [Setup Instructions](#setup-instructions)
- [Testing Strategy by Layer](#testing-strategy-by-layer)
- [Testing Patterns](#testing-patterns)
- [Running Tests](#running-tests)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Overview

### For C# Developers

If you've used XUnit or MSTest, Vitest will feel familiar:

| C# Testing | TypeScript (Vitest) |
|------------|---------------------|
| `[Fact]` | `test()` or `it()` |
| `[Theory]` | `test.each()` |
| `Assert.Equal()` | `expect().toBe()` |
| `Assert.Throws()` | `expect(() => ...).toThrow()` |
| Moq (`Mock<T>`) | `vi.fn()` |
| `new Mock<IRepository>()` | `{ method: vi.fn() }` |
| Test class | `describe()` block |
| Setup/Teardown | `beforeEach()` / `afterEach()` |

**Key Difference:** TypeScript tests are function-based, not class-based. Use `describe()` blocks to group related tests.

---

## Framework Choice

### Why Vitest?

**Chosen:** Vitest (over Jest, Mocha, or VS Code test runner)

**Reasons:**
- ✅ **Faster** - Uses Vite for blazing-fast test execution
- ✅ **Better TypeScript support** - First-class TS support, minimal config
- ✅ **Jest-compatible API** - Easy migration if needed
- ✅ **Modern** - Built for modern JavaScript/TypeScript projects
- ✅ **Watch mode** - Instant feedback during development

**Two-Tier Approach:**

1. **Unit Tests (Vitest)** - Domain and Application layers
   - Fast, isolated tests
   - No VS Code dependencies
   - Run constantly during development

2. **Integration Tests (VS Code Test Runner)** - Deferred
   - Test actual VS Code integration
   - Slower (spins up VS Code instance)
   - Add later when needed

---

## Setup Instructions

### 1. Install Vitest

```bash
npm install --save-dev vitest @vitest/ui
npm install --save-dev @types/node
```

### 2. Create Vitest Config

Create `vitest.config.ts` in project root:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.{test,spec}.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'out/',
                '**/*.d.ts',
                '**/*.config.ts',
                '**/dist/**',
            ],
        },
    },
});
```

### 3. Update package.json Scripts

Add to `package.json`:

```json
{
    "scripts": {
        "test": "vitest run",
        "test:watch": "vitest",
        "test:ui": "vitest --ui",
        "test:coverage": "vitest run --coverage"
    }
}
```

### 4. Update TypeScript Config

Add to `tsconfig.json` (or create `tsconfig.test.json`):

```json
{
    "compilerOptions": {
        "types": ["vitest/globals", "node"]
    }
}
```

---

## Testing Strategy by Layer

### Domain Layer Tests

**What to test:**
- ✅ Business logic in entities
- ✅ Value object validation
- ✅ Domain service calculations
- ✅ Domain rules and invariants

**How to test:**
- Direct instantiation (no mocks needed)
- Pure logic tests
- Fast and isolated

**C# Analogy:** Like testing POCOs with business logic (not EF entities)

---

### Application Layer Tests

**What to test:**
- ✅ Use case orchestration
- ✅ Mapping domain → ViewModel
- ✅ Command execution flow
- ✅ Error handling

**How to test:**
- Mock repository interfaces
- Mock domain services (if needed)
- Verify correct methods called
- Assert on ViewModels returned

**C# Analogy:** Like testing MediatR handlers with mocked repositories

---

### Infrastructure Layer Tests

**Status:** Deferred

**When to add:**
- When you need to test repository implementations
- When you need to test API client logic

**How to test:**
- Mock HTTP responses (MSW library)
- Or use real test APIs (integration tests)

---

### Presentation Layer Tests

**Status:** Deferred

**When to add:**
- When you need to test panel logic
- When you need to test VS Code integration

**How to test:**
- Use `@vscode/test-electron`
- Spins up real VS Code instance
- Slower, used for E2E tests

---

## Testing Patterns

### Pattern 1: Testing Domain Entities

**Location:** `src/features/{feature}/domain/entities/__tests__/{Entity}.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { ImportJob } from '../ImportJob';
import { Progress } from '../../valueObjects/Progress';
import { JobStatus } from '../../valueObjects/JobStatus';

describe('ImportJob', () => {
    describe('getStatus', () => {
        test('returns Completed when job is completed with 100% progress', () => {
            // Arrange
            const progress = new Progress(100);
            const job = new ImportJob(
                '123',
                'MySolution',
                progress,
                new Date('2025-01-01'),
                new Date('2025-01-02') // completedOn
            );

            // Act
            const status = job.getStatus();

            // Assert
            expect(status).toBe(JobStatus.Completed);
        });

        test('returns Failed when job is completed with progress < 100', () => {
            // Arrange
            const progress = new Progress(50);
            const job = new ImportJob(
                '123',
                'MySolution',
                progress,
                new Date('2025-01-01'),
                new Date('2025-01-02')
            );

            // Act
            const status = job.getStatus();

            // Assert
            expect(status).toBe(JobStatus.Failed);
        });

        test('returns InProgress when job is not completed and progress > 0', () => {
            // Arrange
            const progress = new Progress(50);
            const job = new ImportJob(
                '123',
                'MySolution',
                progress,
                new Date('2025-01-01')
                // No completedOn
            );

            // Act
            const status = job.getStatus();

            // Assert
            expect(status).toBe(JobStatus.InProgress);
        });
    });

    describe('constructor validation', () => {
        test('throws when solution name is empty', () => {
            // Arrange & Act & Assert
            expect(() => new ImportJob(
                '123',
                '', // Empty name
                new Progress(0),
                new Date()
            )).toThrow('Solution name is required');
        });

        test('throws when start date is in the future', () => {
            const futureDate = new Date(Date.now() + 86400000);

            expect(() => new ImportJob(
                '123',
                'MySolution',
                new Progress(0),
                futureDate
            )).toThrow('Start date cannot be in the future');
        });
    });

    describe('markAsCompleted', () => {
        test('sets completion date when job is not completed', () => {
            // Arrange
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(100),
                new Date('2025-01-01')
            );
            const completionDate = new Date('2025-01-02');

            // Act
            job.markAsCompleted(completionDate);

            // Assert
            expect(job.isCompleted()).toBe(true);
            expect(job.getCompletedOn()).toEqual(completionDate);
        });

        test('throws when job is already completed', () => {
            // Arrange
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(100),
                new Date('2025-01-01'),
                new Date('2025-01-02') // Already completed
            );

            // Act & Assert
            expect(() => job.markAsCompleted(new Date()))
                .toThrow('Job is already completed');
        });
    });
});
```

**C# Equivalent:**

```csharp
// XUnit
public class ImportJobTests
{
    [Fact]
    public void GetStatus_WhenCompletedWith100Progress_ReturnsCompleted()
    {
        // Arrange
        var progress = new Progress(100);
        var job = new ImportJob("123", "MySolution", progress,
            new DateTime(2025, 1, 1), new DateTime(2025, 1, 2));

        // Act
        var status = job.GetStatus();

        // Assert
        Assert.Equal(JobStatus.Completed, status);
    }

    [Fact]
    public void Constructor_WhenSolutionNameEmpty_ThrowsException()
    {
        // Arrange, Act & Assert
        Assert.Throws<DomainException>(() =>
            new ImportJob("123", "", new Progress(0), DateTime.Now));
    }
}
```

---

### Pattern 2: Testing Value Objects

**Location:** `src/features/{feature}/domain/valueObjects/__tests__/{ValueObject}.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { Progress } from '../Progress';

describe('Progress', () => {
    describe('constructor validation', () => {
        test('throws when value is below 0', () => {
            expect(() => new Progress(-1))
                .toThrow('Progress must be between 0 and 100');
        });

        test('throws when value is above 100', () => {
            expect(() => new Progress(101))
                .toThrow('Progress must be between 0 and 100');
        });

        test('accepts valid values (0-100)', () => {
            expect(() => new Progress(0)).not.toThrow();
            expect(() => new Progress(50)).not.toThrow();
            expect(() => new Progress(100)).not.toThrow();
        });
    });

    describe('isComplete', () => {
        test('returns true when value is 100', () => {
            const progress = new Progress(100);
            expect(progress.isComplete()).toBe(true);
        });

        test('returns false when value is less than 100', () => {
            const progress = new Progress(99);
            expect(progress.isComplete()).toBe(false);
        });
    });

    describe('hasStarted', () => {
        test('returns true when value is greater than 0', () => {
            const progress = new Progress(1);
            expect(progress.hasStarted()).toBe(true);
        });

        test('returns false when value is 0', () => {
            const progress = new Progress(0);
            expect(progress.hasStarted()).toBe(false);
        });
    });

    describe('equals', () => {
        test('returns true when values are equal', () => {
            const progress1 = new Progress(50);
            const progress2 = new Progress(50);
            expect(progress1.equals(progress2)).toBe(true);
        });

        test('returns false when values are different', () => {
            const progress1 = new Progress(50);
            const progress2 = new Progress(60);
            expect(progress1.equals(progress2)).toBe(false);
        });
    });
});
```

---

### Pattern 3: Testing Use Cases (with Mocks)

**Location:** `src/features/{feature}/application/useCases/__tests__/{UseCase}.test.ts`

```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LoadImportJobsUseCase } from '../LoadImportJobsUseCase';
import { IImportJobRepository } from '../../../domain/interfaces/IImportJobRepository';
import { ImportJob } from '../../../domain/entities/ImportJob';
import { Progress } from '../../../domain/valueObjects/Progress';
import { ImportJobViewModelMapper } from '../../mappers/ImportJobViewModelMapper';

describe('LoadImportJobsUseCase', () => {
    // Mock repository (like Moq in C#)
    let mockRepository: IImportJobRepository;
    let mapper: ImportJobViewModelMapper;
    let useCase: LoadImportJobsUseCase;

    beforeEach(() => {
        // Create mock repository with all interface methods
        mockRepository = {
            getById: vi.fn(),
            getByEnvironment: vi.fn(),
            save: vi.fn(),
            delete: vi.fn(),
        };

        mapper = new ImportJobViewModelMapper();
        useCase = new LoadImportJobsUseCase(mockRepository, mapper);
    });

    test('returns view models for all jobs in environment', async () => {
        // Arrange
        const mockJobs = [
            new ImportJob(
                '1',
                'Solution1',
                new Progress(100),
                new Date('2025-01-01'),
                new Date('2025-01-02')
            ),
            new ImportJob(
                '2',
                'Solution2',
                new Progress(50),
                new Date('2025-01-01')
            ),
        ];

        // Setup mock (like Moq: mock.Setup(x => x.GetByEnvironment()).ReturnsAsync())
        vi.mocked(mockRepository.getByEnvironment)
            .mockResolvedValue(mockJobs);

        // Act
        const result = await useCase.execute({ environmentId: 'env-123' });

        // Assert
        expect(result.jobs).toHaveLength(2);
        expect(result.jobs[0].solutionName).toBe('Solution1');
        expect(result.jobs[0].statusLabel).toBe('Completed');
        expect(result.jobs[1].solutionName).toBe('Solution2');
        expect(result.jobs[1].statusLabel).toBe('In Progress');

        // Verify repository was called correctly
        expect(mockRepository.getByEnvironment).toHaveBeenCalledWith('env-123');
        expect(mockRepository.getByEnvironment).toHaveBeenCalledTimes(1);
    });

    test('returns empty array when no jobs found', async () => {
        // Arrange
        vi.mocked(mockRepository.getByEnvironment)
            .mockResolvedValue([]);

        // Act
        const result = await useCase.execute({ environmentId: 'env-123' });

        // Assert
        expect(result.jobs).toHaveLength(0);
    });

    test('filters out jobs that are not relevant', async () => {
        // Arrange
        const mockJobs = [
            new ImportJob('1', 'Relevant', new Progress(100), new Date()),
            // Assume there's a method on ImportJob that determines relevance
        ];

        vi.mocked(mockRepository.getByEnvironment)
            .mockResolvedValue(mockJobs);

        // Act
        const result = await useCase.execute({ environmentId: 'env-123' });

        // Assert - only relevant jobs returned
        expect(result.jobs.length).toBeGreaterThanOrEqual(0);
    });

    test('throws when repository fails', async () => {
        // Arrange
        vi.mocked(mockRepository.getByEnvironment)
            .mockRejectedValue(new Error('Database connection failed'));

        // Act & Assert
        await expect(useCase.execute({ environmentId: 'env-123' }))
            .rejects
            .toThrow('Database connection failed');
    });
});
```

**C# Equivalent:**

```csharp
// MSTest with Moq
[TestClass]
public class LoadImportJobsUseCaseTests
{
    private Mock<IImportJobRepository> _mockRepository;
    private ImportJobViewModelMapper _mapper;
    private LoadImportJobsUseCase _useCase;

    [TestInitialize]
    public void Setup()
    {
        _mockRepository = new Mock<IImportJobRepository>();
        _mapper = new ImportJobViewModelMapper();
        _useCase = new LoadImportJobsUseCase(_mockRepository.Object, _mapper);
    }

    [TestMethod]
    public async Task Execute_ReturnsViewModelsForAllJobs()
    {
        // Arrange
        var mockJobs = new List<ImportJob> { ... };
        _mockRepository
            .Setup(x => x.GetByEnvironment("env-123"))
            .ReturnsAsync(mockJobs);

        // Act
        var result = await _useCase.Execute(new LoadImportJobsRequest
        {
            EnvironmentId = "env-123"
        });

        // Assert
        Assert.AreEqual(2, result.Jobs.Count);
        _mockRepository.Verify(x => x.GetByEnvironment("env-123"), Times.Once);
    }
}
```

---

### Pattern 4: Testing Mappers

**Location:** `src/features/{feature}/application/mappers/__tests__/{Mapper}.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { ImportJobViewModelMapper } from '../ImportJobViewModelMapper';
import { ImportJob } from '../../../domain/entities/ImportJob';
import { Progress } from '../../../domain/valueObjects/Progress';
import { JobStatus } from '../../../domain/valueObjects/JobStatus';

describe('ImportJobViewModelMapper', () => {
    const mapper = new ImportJobViewModelMapper();

    test('maps completed job to view model with correct display values', () => {
        // Arrange
        const job = new ImportJob(
            '123',
            'MySolution',
            new Progress(100),
            new Date('2025-01-30T10:30:00'),
            new Date('2025-01-30T11:00:00')
        );

        // Act
        const viewModel = mapper.toViewModel(job);

        // Assert
        expect(viewModel).toEqual({
            id: '123',
            solutionName: 'MySolution',
            progressDisplay: '100%',
            statusLabel: 'Completed',
            statusVariant: 'completed',
            startedOnDisplay: '1/30/2025 10:30 AM',
            completedOnDisplay: '1/30/2025 11:00 AM',
        });
    });

    test('maps in-progress job without completedOn', () => {
        // Arrange
        const job = new ImportJob(
            '123',
            'MySolution',
            new Progress(50),
            new Date('2025-01-30T10:30:00')
        );

        // Act
        const viewModel = mapper.toViewModel(job);

        // Assert
        expect(viewModel.statusLabel).toBe('In Progress');
        expect(viewModel.statusVariant).toBe('in-progress');
        expect(viewModel.completedOnDisplay).toBeUndefined();
    });

    test('maps failed job correctly', () => {
        // Arrange
        const job = new ImportJob(
            '123',
            'MySolution',
            new Progress(50),
            new Date('2025-01-30T10:30:00'),
            new Date('2025-01-30T10:45:00') // Completed but not 100%
        );

        // Act
        const viewModel = mapper.toViewModel(job);

        // Assert
        expect(viewModel.statusLabel).toBe('Failed');
        expect(viewModel.statusVariant).toBe('failed');
    });
});
```

---

### Pattern 5: Using Test Data Builders (Optional)

For complex entities, create test data builders:

```typescript
// src/features/importJobs/domain/entities/__tests__/ImportJobBuilder.ts
import { ImportJob } from '../ImportJob';
import { Progress } from '../../valueObjects/Progress';

export class ImportJobBuilder {
    private id = '123';
    private solutionName = 'TestSolution';
    private progress = new Progress(0);
    private startedOn = new Date('2025-01-01');
    private completedOn?: Date;

    withId(id: string): this {
        this.id = id;
        return this;
    }

    withSolutionName(name: string): this {
        this.solutionName = name;
        return this;
    }

    withProgress(value: number): this {
        this.progress = new Progress(value);
        return this;
    }

    completed(): this {
        this.completedOn = new Date('2025-01-02');
        return this;
    }

    build(): ImportJob {
        return new ImportJob(
            this.id,
            this.solutionName,
            this.progress,
            this.startedOn,
            this.completedOn
        );
    }
}

// Usage in tests
test('example with builder', () => {
    const job = new ImportJobBuilder()
        .withSolutionName('MySolution')
        .withProgress(100)
        .completed()
        .build();

    expect(job.getStatus()).toBe(JobStatus.Completed);
});
```

**C# Equivalent:**

```csharp
// Fluent builder pattern (like NBuilder or custom builders)
var job = new ImportJobBuilder()
    .WithSolutionName("MySolution")
    .WithProgress(100)
    .Completed()
    .Build();
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Watch Mode (Auto-rerun on Changes)

```bash
npm run test:watch
```

### Interactive UI

```bash
npm run test:ui
```

Opens browser with test results, coverage, and interactive debugging.

### Coverage Report

```bash
npm run test:coverage
```

Generates coverage report in `coverage/` folder.

### Run Specific Test File

```bash
npm test ImportJob.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- -t "getStatus"
```

Runs only tests with "getStatus" in the name.

---

## Best Practices

### ✅ DO

1. **Test business logic thoroughly**
   ```typescript
   // ✅ Good - Test important business rules
   test('cannot mark completed job as completed again', () => {
       const job = new ImportJobBuilder().completed().build();
       expect(() => job.markAsCompleted(new Date())).toThrow();
   });
   ```

2. **Use Arrange-Act-Assert pattern**
   ```typescript
   test('example', () => {
       // Arrange - Set up test data
       const job = new ImportJob(...);

       // Act - Execute the operation
       const status = job.getStatus();

       // Assert - Verify the result
       expect(status).toBe(JobStatus.Completed);
   });
   ```

3. **Test edge cases and boundaries**
   ```typescript
   test.each([
       [0, true],    // Min valid
       [100, true],  // Max valid
       [-1, false],  // Below min
       [101, false], // Above max
   ])('Progress(%i) validity is %s', (value, isValid) => {
       if (isValid) {
           expect(() => new Progress(value)).not.toThrow();
       } else {
           expect(() => new Progress(value)).toThrow();
       }
   });
   ```

4. **Mock dependencies at boundaries**
   ```typescript
   // ✅ Good - Mock repository interface
   const mockRepo: IImportJobRepository = {
       getById: vi.fn(),
       getByEnvironment: vi.fn(),
   };
   ```

5. **Test one thing per test**
   ```typescript
   // ✅ Good - Single assertion
   test('returns Completed when job is done', () => {
       const job = ...;
       expect(job.getStatus()).toBe(JobStatus.Completed);
   });

   // ✅ Good - Separate test for different scenario
   test('returns Failed when job is done but incomplete', () => {
       const job = ...;
       expect(job.getStatus()).toBe(JobStatus.Failed);
   });
   ```

---

### ❌ DON'T

1. **Don't test framework code**
   ```typescript
   // ❌ Bad - Testing TypeScript itself
   test('array push works', () => {
       const arr = [];
       arr.push(1);
       expect(arr.length).toBe(1);
   });
   ```

2. **Don't test implementation details**
   ```typescript
   // ❌ Bad - Testing private method indirectly
   test('calculates internal state correctly', () => {
       const job = new ImportJob(...);
       // Don't test internals, test observable behavior
   });
   ```

3. **Don't write brittle tests**
   ```typescript
   // ❌ Bad - Depends on specific date formatting
   expect(viewModel.startedOnDisplay).toBe('January 30, 2025 at 10:30:00 AM');

   // ✅ Good - Test that date is present
   expect(viewModel.startedOnDisplay).toBeTruthy();
   expect(viewModel.startedOnDisplay).toContain('1/30/2025');
   ```

4. **Don't skip AAA pattern**
   ```typescript
   // ❌ Bad - Hard to read
   test('job status', () => {
       expect(new ImportJob('1', 'Sol', new Progress(100),
           new Date(), new Date()).getStatus()).toBe(JobStatus.Completed);
   });

   // ✅ Good - Clear Arrange, Act, Assert
   test('returns Completed when job is done', () => {
       const job = new ImportJob(...);
       const status = job.getStatus();
       expect(status).toBe(JobStatus.Completed);
   });
   ```

5. **Don't mock what you don't own**
   ```typescript
   // ❌ Bad - Mocking Date
   vi.mock('Date');

   // ✅ Good - Use dependency injection for time
   class ImportJob {
       constructor(
           private timeProvider: ITimeProvider = new SystemTimeProvider()
       ) {}
   }
   ```

---

## Examples

### Complete Example: Domain Entity Test Suite

```typescript
// src/features/importJobs/domain/entities/__tests__/ImportJob.test.ts
import { describe, test, expect } from 'vitest';
import { ImportJob } from '../ImportJob';
import { Progress } from '../../valueObjects/Progress';
import { JobStatus } from '../../valueObjects/JobStatus';
import { DomainError } from '../../../../../core/domain/errors/DomainError';

describe('ImportJob', () => {
    describe('constructor', () => {
        test('creates valid job with all parameters', () => {
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(50),
                new Date('2025-01-01')
            );

            expect(job.getId()).toBe('123');
            expect(job.getSolutionName()).toBe('MySolution');
        });

        test('throws when solution name is empty', () => {
            expect(() => new ImportJob(
                '123',
                '',
                new Progress(0),
                new Date()
            )).toThrow(DomainError);
        });

        test('throws when solution name is whitespace', () => {
            expect(() => new ImportJob(
                '123',
                '   ',
                new Progress(0),
                new Date()
            )).toThrow('Solution name is required');
        });

        test('throws when start date is in future', () => {
            const futureDate = new Date(Date.now() + 86400000);
            expect(() => new ImportJob(
                '123',
                'MySolution',
                new Progress(0),
                futureDate
            )).toThrow('Start date cannot be in the future');
        });
    });

    describe('getStatus', () => {
        test('returns Completed when completedOn is set and progress is 100', () => {
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(100),
                new Date('2025-01-01'),
                new Date('2025-01-02')
            );

            expect(job.getStatus()).toBe(JobStatus.Completed);
        });

        test('returns Failed when completedOn is set but progress < 100', () => {
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(50),
                new Date('2025-01-01'),
                new Date('2025-01-02')
            );

            expect(job.getStatus()).toBe(JobStatus.Failed);
        });

        test('returns InProgress when completedOn is not set and progress > 0', () => {
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(50),
                new Date('2025-01-01')
            );

            expect(job.getStatus()).toBe(JobStatus.InProgress);
        });

        test('returns Pending when completedOn is not set and progress is 0', () => {
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(0),
                new Date('2025-01-01')
            );

            expect(job.getStatus()).toBe(JobStatus.Pending);
        });
    });

    describe('isCompleted', () => {
        test('returns true when completedOn is set', () => {
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(100),
                new Date('2025-01-01'),
                new Date('2025-01-02')
            );

            expect(job.isCompleted()).toBe(true);
        });

        test('returns false when completedOn is not set', () => {
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(50),
                new Date('2025-01-01')
            );

            expect(job.isCompleted()).toBe(false);
        });
    });

    describe('markAsCompleted', () => {
        test('sets completedOn when job is not completed', () => {
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(100),
                new Date('2025-01-01')
            );

            const completionDate = new Date('2025-01-02');
            job.markAsCompleted(completionDate);

            expect(job.isCompleted()).toBe(true);
            expect(job.getCompletedOn()).toEqual(completionDate);
        });

        test('throws when job is already completed', () => {
            const job = new ImportJob(
                '123',
                'MySolution',
                new Progress(100),
                new Date('2025-01-01'),
                new Date('2025-01-02')
            );

            expect(() => job.markAsCompleted(new Date()))
                .toThrow('Job is already completed');
        });
    });
});
```

---

## Common Testing Scenarios

### Scenario 1: Testing Async Use Cases

```typescript
test('loads jobs asynchronously', async () => {
    mockRepository.getByEnvironment.mockResolvedValue([mockJob]);

    const result = await useCase.execute({ environmentId: 'env-123' });

    expect(result.jobs).toHaveLength(1);
});
```

### Scenario 2: Testing Error Handling

```typescript
test('handles repository errors gracefully', async () => {
    mockRepository.getByEnvironment.mockRejectedValue(
        new Error('Network error')
    );

    await expect(useCase.execute({ environmentId: 'env-123' }))
        .rejects
        .toThrow('Network error');
});
```

### Scenario 3: Testing Multiple Scenarios (Parameterized Tests)

```typescript
test.each([
    [0, JobStatus.Pending],
    [50, JobStatus.InProgress],
    [100, JobStatus.Completed],
])('job with %i% progress has status %s', (progressValue, expectedStatus) => {
    const job = new ImportJob(
        '123',
        'MySolution',
        new Progress(progressValue),
        new Date()
    );

    expect(job.getStatus()).toBe(expectedStatus);
});
```

### Scenario 4: Testing Value Object Equality

```typescript
test('value objects with same value are equal', () => {
    const progress1 = new Progress(50);
    const progress2 = new Progress(50);

    expect(progress1.equals(progress2)).toBe(true);
});
```

---

## Quick Reference: Test File Locations

| What to Test | File Location |
|--------------|---------------|
| Domain Entity | `src/features/{feature}/domain/entities/__tests__/{Entity}.test.ts` |
| Value Object | `src/features/{feature}/domain/valueObjects/__tests__/{ValueObject}.test.ts` |
| Domain Service | `src/features/{feature}/domain/services/__tests__/{Service}.test.ts` |
| Use Case | `src/features/{feature}/application/useCases/__tests__/{UseCase}.test.ts` |
| Command | `src/features/{feature}/application/commands/__tests__/{Command}.test.ts` |
| Mapper | `src/features/{feature}/application/mappers/__tests__/{Mapper}.test.ts` |

---

## Vitest Cheat Sheet

```typescript
// Imports
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Test structure
describe('Feature', () => {
    test('does something', () => {
        expect(result).toBe(expected);
    });
});

// Assertions
expect(value).toBe(expected);              // ===
expect(value).toEqual(expected);           // Deep equality
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toContain(item);
expect(array).toHaveLength(3);
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('error message');

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();

// Mocking
const mockFn = vi.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue(42);            // Async
mockFn.mockRejectedValue(new Error());   // Async error
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg');
expect(mockFn).toHaveBeenCalledTimes(3);

// Setup/Teardown
beforeEach(() => { /* runs before each test */ });
afterEach(() => { /* runs after each test */ });

// Skip/Only
test.skip('skipped test', () => {});
test.only('only run this test', () => {});
```

---

## 🔗 See Also

- [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md) - Clean Architecture overview
- [LAYER_RESPONSIBILITIES_GUIDE.md](./LAYER_RESPONSIBILITIES_GUIDE.md) - What belongs in each layer
- [DIRECTORY_STRUCTURE_GUIDE.md](./DIRECTORY_STRUCTURE_GUIDE.md) - Where to place test files
