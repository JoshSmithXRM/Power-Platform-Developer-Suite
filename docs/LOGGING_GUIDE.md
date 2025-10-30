# Logging Guide

> **Purpose:** Define logging standards, levels, and best practices.

## Overview

Logging helps us:
- **Debug issues** - Trace execution flow
- **Monitor behavior** - Track performance and errors
- **Audit actions** - Record user operations

### Logging Philosophy

**Good logging:**
- ✅ Tells a story of what happened
- ✅ Provides context (IDs, names, counts)
- ✅ Uses appropriate log levels
- ✅ Is actionable

**Bad logging:**
- ❌ Spams console with noise
- ❌ Missing critical information
- ❌ Wrong log levels
- ❌ Unhelpful messages ("Error occurred")

---

## Log Levels

### TRACE (Most Verbose)

**When:** Very detailed diagnostic information for debugging complex issues.

**Use sparingly** - Usually disabled in production.

```typescript
this.logger.trace('Entering calculateStatus method', {
    progress: job.progress,
    completedOn: job.completedOn
});
```

**Examples:**
- Method entry/exit with parameters
- Loop iterations
- Detailed state transitions

---

### DEBUG

**When:** Diagnostic information useful for developers.

**Default level during development.**

```typescript
this.logger.debug('Environment found', {
    environmentId: environment.id,
    environmentName: environment.name,
    dataverseUrl: environment.dataverseUrl
});

this.logger.debug('Retrieved jobs from repository', {
    count: jobs.length,
    filteredCount: activeJobs.length
});
```

**Examples:**
- Key method executions
- Intermediate results
- Configuration values
- Search results

---

### INFO

**When:** Significant events in normal operation.

**Default level in production.**

```typescript
this.logger.info('Loading import jobs', {
    environmentId: request.environmentId
});

this.logger.info('Import jobs loaded successfully', {
    environmentId: request.environmentId,
    count: response.jobs.length
});

this.logger.info('User opened Solution Explorer panel');
```

**Examples:**
- User actions (opened panel, clicked button)
- Successful operations
- Key milestones
- Configuration changes

---

### WARN

**When:** Something unexpected but recoverable happened.

**Indicates potential issues** that should be investigated.

```typescript
this.logger.warn('No solutions found for environment', {
    environmentId: environmentId,
    environmentName: environment.name
});

this.logger.warn('API response missing expected field', {
    field: 'solutionname',
    jobId: dto.importjobid
});

this.logger.warn('Using cached data due to API timeout', {
    environmentId: environmentId,
    cacheAge: cacheAgeMs
});
```

**Examples:**
- Missing optional data
- Fallback to defaults
- Retries
- Deprecated API usage
- Performance degradation

---

### ERROR

**When:** An error occurred that prevents an operation from completing.

**Requires attention** - something broke.

```typescript
this.logger.error('Failed to load import jobs', error, {
    environmentId: request.environmentId,
    errorMessage: error.message
});

this.logger.error('API request failed', error, {
    url: url,
    status: response.status,
    statusText: response.statusText
});

this.logger.error('Failed to parse XML data', error, {
    jobId: jobId,
    xmlLength: xmlData.length
});
```

**Examples:**
- API failures
- Parse errors
- Validation failures
- Unhandled exceptions
- Failed operations

**Always include:**
- The error object
- Context (what were we trying to do?)
- Relevant IDs

---

## Logging Patterns

### Pattern 1: Operation Start and End

Log the start and end of significant operations.

```typescript
// ✅ GOOD - Start and end with context
export class LoadImportJobsUseCase {
    async execute(request: LoadImportJobsRequest): Promise<LoadImportJobsResponse> {
        // Log operation start
        this.logger.info('Loading import jobs', {
            environmentId: request.environmentId
        });

        try {
            const jobs = await this.repository.getByEnvironment(request.environmentId);

            // Log success with results
            this.logger.info('Import jobs loaded successfully', {
                environmentId: request.environmentId,
                count: jobs.length
            });

            return { jobs };

        } catch (error) {
            // Log failure with error
            this.logger.error('Failed to load import jobs', error, {
                environmentId: request.environmentId
            });
            throw error;
        }
    }
}
```

---

### Pattern 2: Layer-Appropriate Logging

Different layers log different things.

#### Domain Layer

**Minimal logging** - Domain should be pure logic.

```typescript
// Domain Entity
export class ImportJob {
    getStatus(): JobStatus {
        // ❌ NO logging in domain - pure logic
        if (this.isCompleted()) {
            return this.progress.isComplete()
                ? JobStatus.Completed
                : JobStatus.Failed;
        }
        return JobStatus.InProgress;
    }
}
```

#### Application Layer

**Operation-level logging** - What use case is executing.

```typescript
// Use Case
export class LoadImportJobsUseCase {
    async execute(request: LoadImportJobsRequest): Promise<LoadImportJobsResponse> {
        // ✅ Log operation
        this.logger.info('Loading import jobs', { environmentId: request.environmentId });

        const jobs = await this.repository.getByEnvironment(request.environmentId);

        // ✅ Log results
        this.logger.debug('Jobs retrieved from repository', {
            count: jobs.length
        });

        const viewModels = jobs.map(job => this.mapper.toViewModel(job));

        // ✅ Log completion
        this.logger.info('Import jobs loaded', {
            count: viewModels.length
        });

        return { jobs: viewModels };
    }
}
```

#### Infrastructure Layer

**Technical details** - API calls, database queries.

```typescript
// Repository
export class ImportJobRepository {
    async getByEnvironment(environmentId: string): Promise<ImportJob[]> {
        // ✅ Log infrastructure operation
        this.logger.debug('Fetching import jobs from API', {
            environmentId: environmentId
        });

        const url = `${environment.dataverseUrl}/api/data/v9.2/importjobs`;

        // ✅ Log technical details
        this.logger.debug('Making API request', {
            method: 'GET',
            url: url
        });

        const response = await this.apiClient.get<ODataResponse<ImportJobDto>>(url);

        // ✅ Log response
        this.logger.debug('API response received', {
            count: response.value.length,
            statusCode: 200
        });

        return response.value.map(dto => this.toDomain(dto));
    }
}
```

#### Presentation Layer

**User interactions** - What the user did.

```typescript
// Panel
export class ImportJobViewerPanel {
    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        // ✅ Log user action
        this.logger.info('User changed environment', {
            environmentId: environmentId
        });

        await this.loadImportJobs(environmentId);
    }

    private async handleViewXml(jobId: string): Promise<void> {
        // ✅ Log user action
        this.logger.info('User requested job XML', {
            jobId: jobId
        });

        try {
            await this.viewJobXmlCommand.execute({ jobId });
        } catch (error) {
            // ✅ Log UI-level error
            this.logger.error('Failed to view job XML', error, { jobId });
            vscode.window.showErrorMessage('Failed to open XML viewer');
        }
    }
}
```

---

### Pattern 3: Context-Rich Messages

Always include relevant context.

```typescript
// ❌ BAD - No context
this.logger.info('Jobs loaded');
this.logger.error('Failed', error);

// ✅ GOOD - Rich context
this.logger.info('Import jobs loaded', {
    environmentId: environmentId,
    environmentName: environment.name,
    count: jobs.length,
    durationMs: Date.now() - startTime
});

this.logger.error('Failed to load import jobs', error, {
    environmentId: environmentId,
    environmentName: environment.name,
    attemptCount: retryCount,
    errorType: error.constructor.name
});
```

---

### Pattern 4: Performance Logging

Track slow operations.

```typescript
export class LoadImportJobsUseCase {
    async execute(request: LoadImportJobsRequest): Promise<LoadImportJobsResponse> {
        const startTime = Date.now();

        this.logger.info('Loading import jobs', { environmentId: request.environmentId });

        const jobs = await this.repository.getByEnvironment(request.environmentId);
        const viewModels = jobs.map(job => this.mapper.toViewModel(job));

        const durationMs = Date.now() - startTime;

        // Log performance
        this.logger.info('Import jobs loaded', {
            environmentId: request.environmentId,
            count: viewModels.length,
            durationMs: durationMs
        });

        // Warn if slow
        if (durationMs > 5000) {
            this.logger.warn('Load operation was slow', {
                environmentId: request.environmentId,
                durationMs: durationMs,
                threshold: 5000
            });
        }

        return { jobs: viewModels };
    }
}
```

---

### Pattern 5: Error Logging

Include full error details.

```typescript
try {
    const data = await this.apiClient.get(url);
    return data;

} catch (error) {
    // ✅ GOOD - Full error context
    this.logger.error('API request failed', error as Error, {
        url: url,
        method: 'GET',
        errorMessage: (error as Error).message,
        errorStack: (error as Error).stack,
        environmentId: environmentId
    });

    // Re-throw or handle
    throw new InfrastructureError('Failed to fetch import jobs', error);
}
```

---

## Logger Creation

### In Classes

```typescript
export class ImportJobRepository {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;

    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('ImportJobRepository');
        }
        return this._logger;
    }

    // Use: this.logger.info(...)
}
```

### In Panels (BasePanel)

```typescript
export class ImportJobViewerPanel extends BasePanel {
    // BasePanel provides this.componentLogger

    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        this.componentLogger.info('Environment changed', { environmentId });
    }
}
```

---

## What NOT to Log

### ❌ Sensitive Information

```typescript
// ❌ BAD - Logging secrets
this.logger.info('Token retrieved', {
    token: accessToken // ❌ NEVER log tokens
});

// ✅ GOOD - Log non-sensitive data
this.logger.info('Token retrieved', {
    tokenLength: accessToken.length,
    expiresIn: expiresIn
});
```

### ❌ Excessive Logging in Loops

```typescript
// ❌ BAD - Log every iteration
jobs.forEach(job => {
    this.logger.debug('Processing job', { jobId: job.id }); // ❌ Spam!
    // process...
});

// ✅ GOOD - Log summary
this.logger.debug('Processing jobs', { count: jobs.length });
jobs.forEach(job => { /* process */ });
this.logger.debug('Jobs processed', { count: jobs.length });
```

### ❌ Obvious Information

```typescript
// ❌ BAD - Useless log
this.logger.info('Method called'); // ❌ What method? Why?

// ✅ GOOD - Meaningful log
this.logger.info('Loading import jobs', { environmentId: environmentId });
```

---

## Log Level Configuration

### Development

```typescript
// Verbose logging during development
LoggerService.setLevel('DEBUG');
```

### Production

```typescript
// Less verbose in production
LoggerService.setLevel('INFO');
```

### Debugging Issues

```typescript
// Trace level for deep debugging
LoggerService.setLevel('TRACE');
```

---

## Common Logging Scenarios

### User Action

```typescript
protected async handleRefresh(): Promise<void> {
    this.logger.info('User clicked refresh button', {
        panelType: this.constructor.name,
        currentEnvironment: this.currentEnvironmentId
    });

    await this.loadEnvironmentData(this.currentEnvironmentId!);
}
```

### API Call

```typescript
async getImportJobs(environmentId: string): Promise<ImportJob[]> {
    this.logger.debug('Fetching import jobs', { environmentId });

    try {
        const response = await this.apiClient.get<ODataResponse<ImportJobDto>>(url);

        this.logger.debug('Import jobs fetched', {
            environmentId,
            count: response.value.length
        });

        return response.value.map(dto => this.toDomain(dto));

    } catch (error) {
        this.logger.error('Failed to fetch import jobs', error, {
            environmentId,
            url
        });
        throw error;
    }
}
```

### Data Transformation

```typescript
toViewModel(job: ImportJob): ImportJobViewModel {
    this.logger.trace('Mapping job to view model', {
        jobId: job.id,
        status: job.getStatus()
    });

    return {
        id: job.id,
        solutionName: job.getSolutionName(),
        statusLabel: this.getStatusLabel(job.getStatus())
        // ...
    };
}
```

### Validation

```typescript
private validate(): void {
    if (!this.solutionName || this.solutionName.trim() === '') {
        this.logger.warn('Validation failed: Solution name is required', {
            jobId: this.id
        });
        throw new ValidationError('Solution name is required');
    }
}
```

---

## Structured Logging

Always use structured logging with context objects.

```typescript
// ❌ BAD - String interpolation
this.logger.info(`Loading jobs for environment ${environmentId}`);

// ✅ GOOD - Structured context
this.logger.info('Loading jobs for environment', {
    environmentId: environmentId
});
```

**Why?** Structured logging allows:
- Filtering by field
- Aggregation
- Searchability
- Log analytics

---

## Key Takeaways

1. **Use appropriate log levels** - INFO for significant events, DEBUG for diagnostics
2. **Include context** - IDs, names, counts, durations
3. **Log operation boundaries** - Start and end of operations
4. **Don't log sensitive data** - Tokens, passwords, PII
5. **Layer-appropriate logging** - Different layers log different things
6. **Structured logging** - Use context objects, not string interpolation
7. **Performance matters** - Track slow operations
8. **Errors need context** - What were we trying to do when it failed?
