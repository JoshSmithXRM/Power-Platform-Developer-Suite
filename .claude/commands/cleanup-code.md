# Code Cleanup - Comments & Logging

Perform systematic code cleanup for comments and logging standards.

---

## PURPOSE

Systematically find and fix:
- **Comment violations**: Placeholder comments, obvious comments, commented-out code
- **Logging violations**: Domain logging, console.log, missing ILogger, wrong levels
- **Logging format issues**: Capitalization, punctuation, string interpolation
- **Missing logging**: Areas that need logging but don't have it
- **Missing JSDoc**: Public APIs without documentation

Follows standards from CODE_QUALITY_GUIDE.md and LOGGING_GUIDE.md

---

## SCOPE

Ask user if not specified:

1. uncommitted - Only uncommitted changes (default)
2. feature/NAME - Specific feature directory
3. entire-project - All TypeScript files in src/
4. Custom - Specific path

---

## STEP 1: DETERMINE SCOPE

If user didn't specify scope, ask:
"What scope should I clean up? (uncommitted/feature/entire-project/custom)"

Get files to scan based on scope:
- uncommitted: git diff --name-only HEAD
- feature: All .ts files in src/features/FEATURE/
- entire-project: All .ts files in src/
- custom: User-specified path

---

## STEP 2: DISCOVERY

Search for violations in parallel using multiple Grep calls:

### COMMENT VIOLATIONS:
- Search for: `TODO|FIXME|HACK` without issue numbers
- Search for: Obvious comment patterns `(// Set|// Get|// Loop|// Handle|// Process|// Create|// Update|// Delete)`
- Search for: Commented-out code `//\s*(const|let|var|function|class|export)`

### LOGGING VIOLATIONS - ARCHITECTURE:
- Search for: `console\.(log|debug|info|warn|error)` in production code
- Search in domain layer: `src/*/domain/**/*.ts` for `logger\.|console\.`
- Search for: Use cases missing ILogger injection (constructor without `logger` parameter)

### LOGGING VIOLATIONS - MESSAGE FORMAT:
Read files and check for:
- **Lowercase start**: Messages starting with lowercase letter (e.g., `logger.info('environment activated')`)
- **Trailing period**: Messages ending with period (e.g., `logger.info('Environment activated.')`)
- **String interpolation**: Using template literals or concatenation for data (e.g., `` logger.info(`Deleted ${count} traces`) ``)
- **Vague messages**: Messages like "Done", "Processing", "Error occurred"

### LOGGING VIOLATIONS - WRONG LEVEL:
Check for common misuses:
- `logger.info()` for technical details (should be `debug`)
- `logger.debug()` for business events (should be `info`)
- `logger.error()` without passing error object
- No logging in use case try/catch blocks

### MISSING LOGGING:
Identify areas that should log but don't:
- Use case execute methods without start/completion logging
- Infrastructure API calls without debug logging
- Try/catch blocks without error logging
- Panel command handlers without debug logging

### MISSING JSDOC:
- Search for: `export class` without `/**` comment above
- Search for: `public.*\(` methods without `/**` comment above

### TRACE LOGGING OPPORTUNITIES (Suggestions, not violations):
Identify areas where trace logging could help troubleshooting:
- **Loops without logging**: `for.*\{` or `.map\(` or `.forEach\(` without `logger.trace` or `logger.debug`
- **Complex methods**: Methods with 5+ lines and multiple conditionals without entry/exit logging
- **API calls with responses**: Repository methods that return mapped data without trace of raw response
- **DTO mapping loops**: Loops that transform arrays of DTOs without per-item trace

**Note**: These are suggestions for deep troubleshooting, not required. Most code doesn't need trace logging.

Output: List all findings by file with line numbers, categorized by type

---

## STEP 3: ANALYSIS

Create TodoList with findings grouped by priority:

### CRITICAL (architecture violations - MUST FIX):
- Domain layer logging (violates Clean Architecture)
- console.log in production code (must remove)
- Missing error logging in try/catch blocks (loses errors silently)

### HIGH (quality issues - SHOULD FIX):
- Placeholder comments without context (TODO/FIXME without explanation)
- Commented-out code (delete - git remembers)
- Missing JSDoc on public APIs
- Wrong logging level (info for technical details, debug for business events)
- Missing use case logging (no start/completion logs)

### MEDIUM (formatting - NICE TO FIX):
- Obvious/redundant comments (remove if code is self-explanatory)
- Message format issues (lowercase start, trailing periods)
- String interpolation in log messages (use structured args)
- Vague log messages ("Done", "Processing")

### SUGGESTION (opportunities - OPTIONAL):
- Trace logging opportunities (loops, complex methods, raw data)
- Areas where trace could help troubleshooting but not required
- User can skip all suggestions without breaking standards

**Note**: Suggestions are presented with options (add trace, add debug summary, skip). User decides.

### Example TodoList Format:
```
CRITICAL:
- Fix domain logging in Environment.ts:45
- Remove console.log from PluginTraceViewModel.ts:120
- Add error logging to GetTracesUseCase.ts:87 try/catch

HIGH:
- Change logger.info to logger.debug in Repository.ts:52 (technical detail)
- Add use case completion logging to ExportTracesUseCase.ts:45
- Delete commented code in DataversePluginTraceRepository.ts:67

MEDIUM:
- Fix message capitalization in Panel.ts:102 ('environment activated' → 'Environment activated')
- Convert string interpolation to structured logging in UseCase.ts:34
- Remove obvious comment in Mapper.ts:28

SUGGESTION:
- Consider adding trace to loop in Repository.ts:95 (processes 100 DTOs)
- Consider adding method entry trace to complex validation in UseCase.ts:45
- Consider adding raw response trace to API call in Repository.ts:120
```

---

## STEP 4: REMEDIATION

Fix violations systematically, one todo at a time.

Mark each todo as completed immediately after fixing it.

---

### 1. DOMAIN LOGGING VIOLATIONS

**Pattern**: Domain entities or services with logging

**Fix**:
1. Remove logging from domain layer
2. Move logging to application layer (use case boundary)
3. Inject ILogger in use case if missing

**Example**:
```typescript
// ❌ BEFORE - Domain with logging
export class Environment {
    public activate(): void {
        console.log('Activating environment');
        this.isActive = true;
    }
}

// ✅ AFTER - Pure domain + use case logging
export class Environment {
    public activate(): void {
        this.isActive = true;
    }
}

// Use case logs the operation
export class ActivateEnvironmentUseCase {
    constructor(private readonly logger: ILogger) {}

    public async execute(id: string): Promise<void> {
        const env = await this.repository.getById(id);
        env.activate();
        await this.repository.save(env);
        this.logger.info('Environment activated successfully', { id });
    }
}
```

---

### 2. CONSOLE.LOG VIOLATIONS

**Pattern**: console.log, console.debug, etc. in production code

**Fix**:
1. If in domain: Remove entirely (domain has zero logging)
2. If in application/infrastructure/presentation: Replace with injected ILogger
3. If truly temporary debug code: Add `TODO: DEBUG - Remove before commit`

**Example**:
```typescript
// ❌ BEFORE
export class DataverseRepository {
    public async getTraces(): Promise<PluginTrace[]> {
        console.log('Fetching traces');
        const response = await this.api.get(endpoint);
        return response.value;
    }
}

// ✅ AFTER
export class DataverseRepository {
    constructor(private readonly logger: ILogger) {}

    public async getTraces(): Promise<PluginTrace[]> {
        this.logger.debug('Fetching plugin traces from Dataverse', { endpoint });
        const response = await this.api.get(endpoint);
        return response.value;
    }
}
```

---

### 3. WRONG LOGGING LEVEL

**Pattern**: Using wrong level for the context

**Rules**:
- **trace**: Extremely verbose (loop iterations, raw payloads, method entry/exit)
- **debug**: Technical details, method flow, API calls
- **info**: Business events, use case completion, state changes
- **warn**: Recoverable issues, fallbacks, missing optional config
- **error**: Failures, exceptions, data corruption

**Example - Technical detail using info**:
```typescript
// ❌ BEFORE - info for technical detail
this.logger.info(`Fetching traces from endpoint: ${endpoint}`);

// ✅ AFTER - debug for technical detail
this.logger.debug('Fetching plugin traces from Dataverse', { endpoint });
```

**Example - Business event using debug**:
```typescript
// ❌ BEFORE - debug for business completion
this.logger.debug('Exported traces to CSV');

// ✅ AFTER - info for business event
this.logger.info('Traces exported successfully', { format: 'csv', count: traces.length });
```

**Example - Loop iteration using debug**:
```typescript
// ❌ BEFORE - debug floods output with loop iterations
for (const trace of traces) {
    this.logger.debug('Processing trace', { traceId: trace.id });
    // process trace
}

// ✅ AFTER - trace for loop iterations (or remove entirely)
for (const trace of traces) {
    this.logger.trace('Processing trace', { traceId: trace.id });
    // process trace
}

// ✅ BETTER - Single debug before loop
this.logger.debug('Processing traces', { count: traces.length });
for (const trace of traces) {
    // process trace (no logging in loop)
}
```

---

### 4. MESSAGE FORMAT VIOLATIONS

**Pattern**: Incorrect capitalization, punctuation, or string interpolation

**Rules**:
- ✅ Start with capital letter
- ✅ No period at end
- ✅ Structured data in args object
- ❌ No string interpolation for data

**Example - Capitalization**:
```typescript
// ❌ BEFORE
this.logger.info('environment activated successfully');

// ✅ AFTER
this.logger.info('Environment activated successfully');
```

**Example - Trailing period**:
```typescript
// ❌ BEFORE
this.logger.info('Deleted 15 traces.');

// ✅ AFTER
this.logger.info('Deleted 15 traces');
```

**Example - String interpolation**:
```typescript
// ❌ BEFORE
this.logger.debug(`Deleting ${traceIds.length} traces from ${environmentId}`);

// ✅ AFTER
this.logger.debug('Deleting traces', { environmentId, count: traceIds.length });
```

**Example - Vague message**:
```typescript
// ❌ BEFORE
this.logger.debug('Processing');

// ✅ AFTER
this.logger.debug('Processing plugin traces for export', { format, count });
```

---

### 5. MISSING ERROR LOGGING

**Pattern**: Try/catch blocks without error logging

**Fix**: Always log errors with context

**Example**:
```typescript
// ❌ BEFORE - Silent failure
try {
    const traces = await this.repository.getTraces(envId, filter);
    return traces;
} catch (error) {
    throw error; // Error lost, no logging
}

// ✅ AFTER - Logged error
try {
    const traces = await this.repository.getTraces(envId, filter);
    return traces;
} catch (error) {
    this.logger.error('Failed to fetch plugin traces', error);
    throw error;
}
```

---

### 6. MISSING USE CASE LOGGING

**Pattern**: Use case execute methods without start/completion logging

**Fix**: Add info-level logs at boundaries

**Example**:
```typescript
// ❌ BEFORE - No logging
export class ExportTracesUseCase {
    public async execute(traces: PluginTrace[], format: string): Promise<void> {
        const exporter = this.getExporter(format);
        await exporter.export(traces);
    }
}

// ✅ AFTER - Boundary logging
export class ExportTracesUseCase {
    constructor(private readonly logger: ILogger) {}

    public async execute(traces: PluginTrace[], format: string): Promise<void> {
        this.logger.info('Exporting traces', { format, count: traces.length });

        try {
            const exporter = this.getExporter(format);
            await exporter.export(traces);

            this.logger.info('Traces exported successfully', { format, count: traces.length });
        } catch (error) {
            this.logger.error('Failed to export traces', error);
            throw error;
        }
    }
}
```

---

### 7. PLACEHOLDER COMMENTS

**Pattern**: TODO, FIXME, HACK without context

**Fix**:
1. Add context or remove
2. Format: `TODO(issue-123): Description` or `FIXME: What is broken and why`

---

### 8. COMMENTED-OUT CODE

**Pattern**: Lines starting with // that contain code

**Fix**: Delete (git history preserves it)

---

### 9. OBVIOUS COMMENTS

**Pattern**: Comments that just repeat what code does

**Fix**: Remove if code is self-explanatory

---

### 10. MISSING JSDOC

**Pattern**: Public methods or exported classes without documentation

**Fix**: Add JSDoc with description, @param, @returns, @throws

---

### 11. TRACE LOGGING SUGGESTIONS (Optional)

**Pattern**: Areas where trace logging could help troubleshooting

**Approach**: Present options, let user decide

#### Option 1: Add trace per-iteration (very verbose)

**When**: Deep troubleshooting of loop logic needed

```typescript
// Found: Loop without logging
const traces = response.value.map((dto) => this.mapToEntity(dto));

// OPTION 1: Add trace per-iteration
const traces = response.value.map((dto, index) => {
    this.logger.trace('Mapping DTO to entity', { index, total: response.value.length, dtoId: dto.id });
    return this.mapToEntity(dto);
});
```

**Trade-offs**:
- ✅ See every iteration
- ✅ Catch per-item issues
- ❌ Floods output (100 items = 100 log lines)
- ❌ Performance impact

#### Option 2: Add debug summary (recommended)

**When**: Want to know operation happened, not every iteration

```typescript
// OPTION 2: Add debug summary (recommended)
this.logger.debug('Mapping DTOs to entities', { count: response.value.length });
const traces = response.value.map((dto) => this.mapToEntity(dto));
```

**Trade-offs**:
- ✅ Clean, concise
- ✅ No performance impact
- ✅ Still provides context
- ❌ Can't see per-item details

#### Option 3: Add raw data trace (for API responses)

**When**: Need to see exact API response for debugging

```typescript
// OPTION 3: Add raw response trace
async getTraces(envId: string): Promise<PluginTrace[]> {
    const response = await this.apiService.get<DataverseResponse>(endpoint);

    this.logger.trace('Raw API response', { response }); // Add this

    return response.value.map(dto => this.mapToEntity(dto));
}
```

**Trade-offs**:
- ✅ See exact API contract
- ✅ Debug serialization issues
- ❌ Large payloads in logs
- ❌ Potential sensitive data exposure

#### Option 4: Skip (no logging needed)

**When**: Code is simple, rarely fails, well-tested

```typescript
// OPTION 4: Skip - no logging needed
const traces = response.value.map((dto) => this.mapToEntity(dto));
```

**Trade-offs**:
- ✅ Clean code
- ✅ No log noise
- ❌ Harder to troubleshoot if issues arise

#### How to present suggestions:

```typescript
// Example suggestion format
this.logger.info('Suggestion: Loop at Repository.ts:95 processes 100 DTOs without logging');
this.logger.info('Options:');
this.logger.info('  1. Add trace per-iteration (very verbose, for deep debugging)');
this.logger.info('  2. Add debug summary (recommended, concise)');
this.logger.info('  3. Add raw response trace (see API contract)');
this.logger.info('  4. Skip (no logging needed)');
this.logger.info('Which option? (Ask user)');
```

**Important**:
- Present all options
- Explain trade-offs
- Let user decide
- Don't force trace logging

---

## STEP 5: VALIDATION

After all fixes:

1. Run compilation check:
   npm run compile
   Must pass - if fails, fix compilation errors

2. Run tests:
   npm test
   Must pass - if fails, fix failing tests

3. Show summary of fixes:
   Example:
   Fixed 15 violations:
   - Removed 3 domain logging violations
   - Replaced 5 console.log with ILogger
   - Deleted 4 commented-out code blocks
   - Added 2 missing JSDoc comments
   - Removed 1 obvious comment

---

## STANDARDS REFERENCE

Follow these guides:
- docs/architecture/CODE_QUALITY_GUIDE.md - Comment standards
- docs/architecture/LOGGING_GUIDE.md - Logging architecture (includes levels & formatting)
- CLAUDE.md - Quick reference rules

### LOGGING ARCHITECTURE:
- **Domain layer**: Zero logging (pure business logic)
- **Application layer**: Strategic logging at boundaries (use case start/completion)
- **Infrastructure layer**: Technical logging (API calls, auth, storage)
- **Presentation layer**: User action logging
- **console.log**: Development only (MUST remove before commit)
- **ILogger**: Constructor injection (never global singleton)

### LOGGING LEVELS:
- **trace**: Extremely verbose (loop iterations, raw payloads, method entry/exit) - rarely used
- **debug**: Technical details, method flow, API calls
- **info**: Business events, use case completion, state changes
- **warn**: Recoverable issues, fallbacks, missing optional config
- **error**: Failures, exceptions, data corruption

### MESSAGE FORMATTING:
- ✅ Capitalize first letter (sentence case)
- ✅ No period at end
- ✅ Structured data in args object (not string interpolation)
- ✅ Action verb + target + context
- ✅ Present continuous for in-progress ("Fetching"), past tense for completed ("Fetched")
- ❌ No vague messages ("Done", "Processing")
- ❌ No string interpolation for data

### TRACE LOGGING GUIDANCE:
**When trace is valuable:**
- Deep troubleshooting sessions (reproduce prod bug locally with verbose logging)
- Understanding exact execution flow in complex algorithms
- Debugging integration issues (see raw API requests/responses)
- Performance profiling (measure time between trace points)

**When trace is overkill:**
- General instrumentation (use debug)
- Simple loops that rarely fail (use debug summary or skip)
- Well-tested code paths (trust the tests)
- Production monitoring (use info for business events)

**Rule**: Trace should be rare. If every method has trace logging, it's too much.

### COMMENT STANDARDS:
- Comments explain WHY, not WHAT
- Public APIs need JSDoc
- No placeholder comments (TODO without context)
- Delete commented code (git remembers)

---

## WORKFLOW

1. Discovery - Find all violations (parallel searches)
2. Analysis - Create TodoList with priorities (CRITICAL > HIGH > MEDIUM)
3. Remediation - Fix one todo at a time, mark completed immediately
4. Validation - Compile and test must pass
5. Summary - Report what was fixed

---

## EXAMPLE USAGE

User: /cleanup-code
System: Defaults to uncommitted changes, discovers violations, fixes them

User: /cleanup-code feature/pluginTraceViewer
System: Cleans specific feature directory

User: /cleanup-code entire-project
System: Cleans all TypeScript files in src/ (use with caution)

---

## IMPORTANT NOTES

1. Mark each todo completed IMMEDIATELY after fixing it (don't batch)
2. Run npm run compile after changes to domain/application layers
3. If unclear whether to keep/remove, explain options and ask user
4. Explain WHY each change improves code quality
5. Focus on CRITICAL and HIGH priority first, MEDIUM is optional

---

## TROUBLESHOOTING

"Too many violations found":
- Start with CRITICAL only
- Then HIGH
- Skip MEDIUM for now

"Compilation fails after fixes":
- Review last change
- Ensure imports are correct
- Check for missing dependencies

"Not sure if comment should be removed":
- Ask: Does code explain WHAT clearly?
- If yes: Remove comment
- If no: Keep comment or improve code clarity

---

## EXPECTED DURATION

- Discovery: 2-3 minutes
- Analysis: 1-2 minutes
- Remediation: 5-15 minutes (depends on violations found)
- Validation: 1-2 minutes
- Total: 10-20 minutes for typical cleanup

Worth it because improves code quality and enforces standards consistently.
