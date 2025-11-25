# Repository Patterns

**Comprehensive guide to repository implementation in the Power Platform Developer Suite.**

---

## Quick Reference

**Repository Responsibilities (ONLY these)**:
1. ✅ Execute infrastructure queries (API calls, file I/O, storage access)
2. ✅ Map DTOs to domain entities (using injected mappers or inline)
3. ✅ Handle infrastructure errors (normalize, log, rethrow)
4. ✅ Manage caching (when appropriate)
5. ❌ **NEVER** business logic or validation (belongs in domain)
6. ❌ **NEVER** complex transformations (belongs in domain services)

**Key Principles**:
```typescript
// ✅ CORRECT: Repository with injected dependencies
export class DataverseApiSolutionRepository implements ISolutionRepository {
    constructor(
        private readonly apiService: IDataverseApiService,
        private readonly logger: ILogger
    ) {}

    async findAll(environmentId: string): Promise<Solution[]> {
        const response = await this.apiService.get<ResponseDto>(env, endpoint);
        return response.value.map(dto => this.mapToEntity(dto)); // DTO → Domain
    }

    private mapToEntity(dto: SolutionDto): Solution {
        return Solution.create({
            id: dto.solutionid,
            uniqueName: dto.uniquename,
            // ... map all fields
        });
    }
}
```

**When to Cache**:
- ✅ Metadata (changes rarely, fetched frequently)
- ✅ Reference data (lookups, option sets)
- ❌ Transactional data (traces, records)
- ❌ User-specific data (environments, settings)

**Performance Optimization**:
```typescript
// List view: Selective fields (faster)
$select=id,name,version,ismanaged

// Detail view: All fields (complete data)
$select=id,name,version,ismanaged,description,messageblock,configuration

// Use $expand for related data (1 request vs N+1)
$expand=Attributes,OneToManyRelationships,ManyToManyRelationships
```

---

## Table of Contents

1. [Repository Responsibilities](#repository-responsibilities)
2. [DTO Mapping Patterns](#dto-mapping-patterns)
3. [Query Building Patterns](#query-building-patterns)
4. [Caching Strategies](#caching-strategies)
5. [Batch Operations](#batch-operations)
6. [Production Examples](#production-examples)
7. [Anti-Patterns](#anti-patterns)
8. [Testing Repositories](#testing-repositories)

---

## Repository Responsibilities

### What Repositories DO

**1. Execute Infrastructure Operations**
```typescript
// API calls
const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);

// File I/O
const content = await fs.readFile(filePath, 'utf-8');

// VS Code Storage
const data = this.globalState.get<Dto[]>(STORAGE_KEY, []);
```

**2. Map DTOs to Domain Entities**
```typescript
// Simple mapping (inline)
private mapToEntity(dto: PluginTraceDto): PluginTrace {
    return PluginTrace.create({
        id: dto.plugintracelogid,
        createdOn: new Date(dto.createdon),
        duration: Duration.fromMilliseconds(dto.performanceexecutionduration),
        operationType: OperationType.fromNumber(dto.operationtype)
    });
}

// Complex mapping (injected mapper)
constructor(
    private readonly apiService: IDataverseApiService,
    private readonly mapper: EntityMetadataMapper,  // Injected
    private readonly logger: ILogger
) {}

const entity = this.mapper.mapDtoToEntity(dto);
```

**3. Handle Infrastructure Errors**
```typescript
try {
    const response = await this.apiService.get<ResponseDto>(env, endpoint);
    return response.value.map(dto => this.mapToEntity(dto));
} catch (error) {
    const normalizedError = normalizeError(error);  // Normalize
    this.logger.error('Failed to fetch solutions', normalizedError);  // Log
    throw normalizedError;  // Rethrow (let use case handle)
}
```

**4. Manage Caching (When Appropriate)**
```typescript
async getEntityWithAttributes(environmentId: string, logicalName: LogicalName): Promise<EntityMetadata> {
    // Check cache first
    const cached = this.getFromCache(environmentId, logicalName.getValue());
    if (cached) {
        return cached;
    }

    // Fetch from API
    const entity = await this.fetchFromApi(environmentId, logicalName);

    // Cache the result
    this.setCache(environmentId, logicalName.getValue(), entity);

    return entity;
}
```

### What Repositories DON'T DO

❌ **NO Business Logic**
```typescript
// ❌ WRONG: Validation in repository
async save(environment: Environment): Promise<void> {
    if (!environment.getName().getValue()) {
        throw new Error('Name is required');  // ❌ Business rule
    }
    // ...
}

// ✅ CORRECT: Validation in domain entity
class Environment {
    constructor(name: EnvironmentName) {
        if (!name.getValue()) {
            throw new DomainError('Name is required');  // ✅ Domain validates
        }
    }
}
```

❌ **NO Complex Transformations**
```typescript
// ❌ WRONG: Sorting/filtering in repository
async findAll(): Promise<Solution[]> {
    const response = await this.apiService.get<ResponseDto>(env, endpoint);
    const solutions = response.value.map(dto => this.mapToEntity(dto));

    // ❌ Business logic: sorting by business rules
    return solutions.sort((a, b) => {
        if (a.isManaged !== b.isManaged) return a.isManaged ? 1 : -1;
        return a.friendlyName.localeCompare(b.friendlyName);
    });
}

// ✅ CORRECT: Let domain service handle sorting
async findAll(): Promise<Solution[]> {
    const response = await this.apiService.get<ResponseDto>(env, endpoint);
    return response.value.map(dto => this.mapToEntity(dto));  // Just map
}

// Use case orchestrates domain service for sorting
const solutions = await this.repository.findAll(environmentId);
const sorted = this.collectionService.sort(solutions);  // ✅ Domain service
```

❌ **NO Presentation Logic**
```typescript
// ❌ WRONG: Formatting for display in repository
private mapToEntity(dto: SolutionDto): Solution {
    return Solution.create({
        // ❌ Presentation logic
        displayName: dto.ismanaged
            ? `${dto.friendlyname} (Managed)`
            : dto.friendlyname
    });
}

// ✅ CORRECT: Map raw data, format in ViewModel mapper
private mapToEntity(dto: SolutionDto): Solution {
    return Solution.create({
        friendlyName: dto.friendlyname,  // ✅ Raw data
        isManaged: dto.ismanaged
    });
}
```

---

## DTO Mapping Patterns

### Pattern 1: Inline Mapping (Simple Cases)

**When to use**: Simple 1:1 field mappings, no complex transformations

```typescript
export class DataversePluginTraceRepository implements IPluginTraceRepository {
    constructor(
        private readonly apiService: IDataverseApiService,
        private readonly logger: ILogger
    ) {}

    async getTraces(environmentId: string, filter: TraceFilter): Promise<readonly PluginTrace[]> {
        const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);
        return response.value.map(dto => this.mapToEntity(dto));
    }

    // ✅ Simple inline mapping
    private mapToEntity(dto: PluginTraceDto): PluginTrace {
        return PluginTrace.create({
            id: dto.plugintracelogid,
            createdOn: new Date(dto.createdon),
            pluginName: dto.typename,
            entityName: dto.primaryentity,
            messageName: dto.messagename,
            operationType: OperationType.fromNumber(dto.operationtype),  // VO factory
            mode: ExecutionMode.fromNumber(dto.mode),
            depth: dto.depth,
            duration: Duration.fromMilliseconds(dto.performanceexecutionduration),
            exceptionDetails: dto.exceptiondetails ?? null
        });
    }
}
```

**Why inline is acceptable here**:
- ✅ Simple field-to-field mapping
- ✅ Only repository uses this DTO type
- ✅ No shared mapping logic across features
- ✅ Value Object factories handle domain-specific logic

### Pattern 2: Injected Mapper (Complex Cases)

**When to use**: Complex mappings, shared DTOs, bidirectional mapping (domain → DTO → domain)

```typescript
export class EnvironmentRepository implements IEnvironmentRepository {
    constructor(
        private readonly globalState: vscode.Memento,
        private readonly secrets: vscode.SecretStorage,
        private readonly mapper: EnvironmentDomainMapper,  // ✅ Injected mapper
        private readonly logger: ILogger
    ) {}

    async getAll(): Promise<Environment[]> {
        const dtos = await this.loadDtos();
        return dtos.map(dto => this.mapper.toDomain(dto));  // ✅ Delegate to mapper
    }

    async save(environment: Environment): Promise<void> {
        const dto = this.mapper.toDto(environment);  // ✅ Bidirectional mapping
        await this.saveDtos([...existingDtos, dto]);
    }
}
```

**Why injected mapper is needed**:
- ✅ Bidirectional mapping (domain ↔ DTO)
- ✅ Complex transformation logic
- ✅ Shared across multiple repositories
- ✅ Easier to test mapper in isolation

### Pattern 3: Infrastructure Mapper (OData/API-Specific)

**When to use**: Complex API schemas, nested relationships, enrichment patterns

```typescript
export class DataverseEntityMetadataRepository implements IEntityMetadataRepository {
    constructor(
        private readonly apiService: IDataverseApiService,
        private readonly entityMapper: EntityMetadataMapper,  // ✅ Complex mapper
        private readonly optionSetMapper: OptionSetMetadataMapper,
        private readonly logger: ILogger
    ) {}

    async getEntityWithAttributes(environmentId: string, logicalName: LogicalName): Promise<EntityMetadata> {
        const dto = await this.apiService.get<EntityMetadataDto>(environmentId, endpoint);

        // ✅ Enrichment pattern: Fetch additional data before mapping
        await this.enrichAttributesWithOptionSets(environmentId, logicalName.getValue(), dto);

        // ✅ Delegate complex mapping to specialist mapper
        return this.entityMapper.mapDtoToEntityWithAttributes(dto);
    }

    private async enrichAttributesWithOptionSets(
        environmentId: string,
        entityLogicalName: string,
        entityDto: EntityMetadataDto
    ): Promise<void> {
        // Fetch all option set types in parallel
        const [picklistResponse, stateResponse, statusResponse] = await Promise.all([
            this.apiService.get<{ value: AttributeMetadataDto[] }>(
                environmentId,
                `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet`
            ),
            // ... other types
        ]);

        // Merge option set data into main attributes
        for (const attr of entityDto.Attributes) {
            const enrichedAttr = optionSetAttrMap.get(attr.LogicalName);
            if (enrichedAttr?.OptionSet) {
                attr.OptionSet = enrichedAttr.OptionSet;  // ✅ Enrichment
            }
        }
    }
}
```

**See**: `docs/architecture/MAPPER_PATTERNS.md` for detailed mapper guidance

---

## Query Building Patterns

### Pattern 1: Static Query (Simple)

**When to use**: Fixed query parameters, no dynamic filters

```typescript
async findAll(environmentId: string): Promise<Solution[]> {
    const endpoint = '/api/data/v9.2/solutions?' +
        '$select=solutionid,uniquename,friendlyname,version,ismanaged,_publisherid_value,installedon,description&' +
        '$expand=publisherid($select=friendlyname)&' +
        '$orderby=installedon desc';

    const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);
    return response.value.map(dto => this.mapToEntity(dto));
}
```

### Pattern 2: Dynamic Query (Filter Object)

**When to use**: User-driven filters, optional parameters

```typescript
async getTraces(environmentId: string, filter: TraceFilter): Promise<readonly PluginTrace[]> {
    // Build select fields
    const selectFields = ['plugintracelogid', 'createdon', 'typename', 'depth'].join(',');

    // Build query parameters
    const queryParams: string[] = [
        `$select=${selectFields}`,
        `$top=${filter.top}`
    ];

    if (filter.orderBy) {
        queryParams.push(`$orderby=${filter.orderBy}`);
    }

    // ✅ Delegate filter expression building to domain entity
    const odataFilter = filter.buildFilterExpression();  // Domain knows OData rules
    if (odataFilter) {
        queryParams.push(`$filter=${odataFilter}`);
    }

    const endpoint = `/api/data/v9.2/plugintracelogs?${queryParams.join('&')}`;
    const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);

    return response.value.map(dto => this.mapToEntity(dto));
}
```

**Why this works**:
- ✅ Repository coordinates query building
- ✅ Domain entity (`TraceFilter`) knows OData syntax rules
- ✅ No business logic in repository (just assembly)

### Pattern 3: Selective Field Fetching (Optimization)

**When to use**: Different views need different data granularity

```typescript
export class DataversePluginTraceRepository implements IPluginTraceRepository {
    // List view: Minimal fields (fast)
    async getTraces(environmentId: string, filter: TraceFilter): Promise<readonly PluginTrace[]> {
        const selectFields = [
            'plugintracelogid',
            'createdon',
            'typename',
            'depth',
            'performanceexecutionduration',
            'exceptiondetails'  // Small field, needed for status determination
            // ❌ Exclude large fields: messageblock, configuration, profile
        ].join(',');

        const endpoint = `/api/data/v9.2/plugintracelogs?$select=${selectFields}&$top=${filter.top}`;
        // ...
    }

    // Detail view: All fields (complete)
    async getTraceById(environmentId: string, traceId: string): Promise<PluginTrace | null> {
        const selectFields = [
            'plugintracelogid',
            'createdon',
            'typename',
            'depth',
            'performanceexecutionduration',
            'messageblock',           // ✅ Include large fields for detail view
            'configuration',
            'secureconfiguration',
            'profile'
        ].join(',');

        const endpoint = `/api/data/v9.2/plugintracelogs(${traceId})?$select=${selectFields}`;
        // ...
    }
}
```

**Performance Impact**:
- List view with 100 traces: ~50KB payload (minimal fields)
- List view with 100 traces: ~500KB payload (all fields) = **10x larger**
- Detail view with 1 trace: ~5KB payload (acceptable)

### Pattern 4: Multi-Step Queries

**When to use**: Need intermediate data to build final query

```typescript
export class DataverseApiSolutionComponentRepository implements ISolutionComponentRepository {
    async findComponentIdsBySolution(
        environmentId: string,
        solutionId: string,
        entityLogicalName: string
    ): Promise<string[]> {
        // Step 1: Get ObjectTypeCode for entity logical name
        const objectTypeCode = await this.getObjectTypeCode(environmentId, entityLogicalName);

        if (objectTypeCode === null) {
            this.logger.warn('Cannot fetch solution components - no ObjectTypeCode', { entityLogicalName });
            return [];
        }

        // Step 2: Use ObjectTypeCode in solution components query
        const filter = `_solutionid_value eq ${solutionId} and componenttype eq ${objectTypeCode}`;
        const endpoint = `/api/data/v9.2/solutioncomponents?$select=objectid&$filter=${filter}`;

        const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);
        return response.value.map(sc => sc.objectid);
    }

    async getObjectTypeCode(environmentId: string, entityLogicalName: string): Promise<number | null> {
        const filter = `LogicalName eq '${entityLogicalName}'`;
        const endpoint = `/api/data/v9.2/EntityDefinitions?$select=ObjectTypeCode&$filter=${filter}`;

        const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);
        return response.value[0]?.ObjectTypeCode ?? null;
    }
}
```

**Why multi-step is acceptable**:
- ✅ First query result needed for second query (true dependency)
- ✅ Cannot be done in single OData query
- ✅ Logged and easy to debug
- ❌ **Don't** use when single query with `$expand` would work (slower)

---

## Caching Strategies

### When to Cache

**✅ Cache Metadata** (changes rarely, fetched frequently):
```typescript
// Entity metadata: Structure changes infrequently
// Global choices: Option sets rarely change
// User doesn't expect real-time updates
private static readonly CACHE_DURATION_MS = 5 * 60 * 1000;  // 5 minutes
```

**❌ Don't Cache Transactional Data**:
```typescript
// ❌ Plugin traces: Real-time debugging data
// ❌ Environment variables: User expects fresh data
// ❌ Solution components: Changes during development
```

### Caching Pattern (5-Minute Expiration)

```typescript
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class DataverseEntityMetadataRepository implements IEntityMetadataRepository {
    private static readonly CACHE_DURATION_MS = 5 * 60 * 1000;  // 5 minutes
    private readonly entityCache = new Map<string, CacheEntry<EntityMetadata>>();

    async getEntityWithAttributes(environmentId: string, logicalName: LogicalName): Promise<EntityMetadata> {
        // 1. Check cache first
        const cached = this.getFromCache(environmentId, logicalName.getValue());
        if (cached) {
            this.logger.debug('Using cached entity metadata', { logicalName: logicalName.getValue() });
            return cached;
        }

        // 2. Fetch from API
        this.logger.debug('Fetching entity from API (cache miss)', { logicalName: logicalName.getValue() });
        const entity = await this.fetchEntityFromApi(environmentId, logicalName);

        // 3. Store in cache
        this.setCache(environmentId, logicalName.getValue(), entity);

        return entity;
    }

    private getCacheKey(environmentId: string, logicalName: string): string {
        return `${environmentId}:${logicalName}`;  // Composite key
    }

    private getFromCache(environmentId: string, logicalName: string): EntityMetadata | null {
        const key = this.getCacheKey(environmentId, logicalName);
        const entry = this.entityCache.get(key);

        if (!entry) {
            return null;  // Cache miss
        }

        // Check expiration
        if (!this.isCacheValid(entry.timestamp)) {
            this.entityCache.delete(key);
            this.logger.debug('Cache entry expired', { environmentId, logicalName });
            return null;
        }

        return entry.data;
    }

    private isCacheValid(timestamp: number): boolean {
        return Date.now() - timestamp < DataverseEntityMetadataRepository.CACHE_DURATION_MS;
    }

    private setCache(environmentId: string, logicalName: string, data: EntityMetadata): void {
        const key = this.getCacheKey(environmentId, logicalName);
        this.entityCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // ✅ Provide manual cache clear for user refresh
    public clearCache(): void {
        const cacheSize = this.entityCache.size;
        this.entityCache.clear();
        this.logger.info('Entity metadata cache cleared', { clearedEntries: cacheSize });
    }
}
```

**Cache Key Strategy**:
- ✅ Composite key: `${environmentId}:${logicalName}` (multi-tenant safe)
- ✅ Timestamp-based expiration (simple, effective)
- ✅ Manual clear for user-initiated refresh

---

## Batch Operations

### Batch Delete Pattern

**When to use**: Deleting multiple records efficiently

```typescript
export class DataversePluginTraceRepository implements IPluginTraceRepository {
    private static readonly BATCH_DELETE_SIZE = 100;  // Safe batch size

    async deleteTraces(environmentId: string, traceIds: readonly string[]): Promise<number> {
        this.logger.debug('Deleting traces in batches', { total: traceIds.length });

        const batchSize = DataversePluginTraceRepository.BATCH_DELETE_SIZE;
        let totalDeleted = 0;

        // Process in batches
        for (let i = 0; i < traceIds.length; i += batchSize) {
            const batch = traceIds.slice(i, i + batchSize);

            try {
                const deletedCount = await this.apiService.batchDelete(
                    environmentId,
                    'plugintracelogs',
                    batch
                );

                totalDeleted += deletedCount;

                this.logger.debug('Batch delete progress', {
                    deleted: totalDeleted,
                    total: traceIds.length,
                    batchSize: batch.length
                });
            } catch (error) {
                // ✅ Continue with remaining batches (partial success)
                this.logger.error('Batch delete failed, continuing', error);
            }
        }

        this.logger.info('Batch delete completed', {
            deleted: totalDeleted,
            total: traceIds.length,
            successRate: `${(totalDeleted / traceIds.length * 100).toFixed(1)}%`
        });

        return totalDeleted;
    }

    async deleteAllTraces(environmentId: string): Promise<number> {
        // 1. Fetch IDs only (minimal payload)
        const endpoint = '/api/data/v9.2/plugintracelogs?$select=plugintracelogid';
        const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);

        const traceIds = response.value.map(dto => dto.plugintracelogid);

        // 2. Delegate to batch delete
        return await this.deleteTraces(environmentId, traceIds);
    }
}
```

**Batch Size Guidelines**:
- Dataverse limit: 1000 records per batch
- Recommended: 100 records (safer, better error recovery)
- Timeout risk: Larger batches more likely to fail

---

## Production Examples

### Example 1: Simple CRUD Repository

**File**: `src/features/solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.ts`

```typescript
export class DataverseApiSolutionRepository implements ISolutionRepository {
    constructor(
        private readonly apiService: IDataverseApiService,
        private readonly logger: ILogger
    ) {}

    async findAll(environmentId: string): Promise<Solution[]> {
        this.logger.debug('Fetching solutions from Dataverse', { environmentId });

        try {
            const endpoint = '/api/data/v9.2/solutions?' +
                '$select=solutionid,uniquename,friendlyname,version,ismanaged,_publisherid_value,installedon,description&' +
                '$expand=publisherid($select=friendlyname)&' +
                '$orderby=installedon desc';

            const response = await this.apiService.get<SolutionsResponse>(environmentId, endpoint);

            const solutions = response.value.map(dto => this.mapToEntity(dto));

            this.logger.debug('Fetched solutions', { count: solutions.length });
            return solutions;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch solutions', normalizedError);
            throw normalizedError;
        }
    }

    private mapToEntity(dto: SolutionDto): Solution {
        return Solution.create({
            id: dto.solutionid,
            uniqueName: dto.uniquename,
            friendlyName: dto.friendlyname,
            version: dto.version,
            isManaged: dto.ismanaged,
            publisherId: dto._publisherid_value,
            publisherName: dto.publisherid?.friendlyname ?? 'Unknown',
            installedOn: dto.installedon ? new Date(dto.installedon) : null,
            description: dto.description ?? ''
        });
    }
}
```

**Key Points**:
- ✅ Constructor injection (apiService, logger)
- ✅ Inline mapping (simple 1:1 fields)
- ✅ Error normalization and logging
- ✅ $expand for related data (publisher)

### Example 2: VS Code Storage Repository

**File**: `src/features/environmentSetup/infrastructure/repositories/EnvironmentRepository.ts`

```typescript
export class EnvironmentRepository implements IEnvironmentRepository {
    private static readonly STORAGE_KEY = 'power-platform-dev-suite-environments';
    private static readonly SECRET_PREFIX_CLIENT = 'power-platform-dev-suite-secret-';
    private static readonly SECRET_PREFIX_PASSWORD = 'power-platform-dev-suite-password-';

    constructor(
        private readonly globalState: vscode.Memento,
        private readonly secrets: vscode.SecretStorage,
        private readonly mapper: EnvironmentDomainMapper,  // ✅ Injected mapper
        private readonly logger: ILogger
    ) {}

    async getAll(): Promise<Environment[]> {
        this.logger.debug('Loading environments from storage');

        try {
            const dtos = await this.loadDtos();
            const environments = dtos.map(dto => this.mapper.toDomain(dto));

            this.logger.debug('Loaded environments', { count: environments.length });
            return environments;
        } catch (error) {
            this.logger.error('Failed to load environments', error);
            throw error;
        }
    }

    async save(
        environment: Environment,
        clientSecret?: string,
        password?: string,
        preserveExistingCredentials = false
    ): Promise<void> {
        const envId = environment.getId().getValue();

        this.logger.debug('Saving environment', {
            id: envId,
            name: environment.getName().getValue(),
            hasClientSecret: !!clientSecret,
            hasPassword: !!password
        });

        try {
            const dtos = await this.loadDtos();
            const existingIndex = dtos.findIndex(d => d.id === envId);

            // ✅ Use mapper for bidirectional mapping
            const dto = this.mapper.toDto(environment);

            // ✅ Handle secrets separately (SecretStorage)
            const authMethod = environment.getAuthenticationMethod();
            if (authMethod.requiresClientCredentials()) {
                const clientId = environment.getClientId()?.getValue();
                if (clientId) {
                    const secretKey = `${EnvironmentRepository.SECRET_PREFIX_CLIENT}${clientId}`;
                    if (clientSecret) {
                        await this.secrets.store(secretKey, clientSecret);
                    }
                }
            }

            // Update or insert DTO
            if (existingIndex >= 0) {
                dtos[existingIndex] = dto;
            } else {
                dtos.push(dto);
            }

            await this.saveDtos(dtos);

            this.logger.info('Environment saved', { name: environment.getName().getValue() });
        } catch (error) {
            this.logger.error('Failed to save environment', error);
            throw error;
        }
    }

    async delete(id: EnvironmentId): Promise<void> {
        this.logger.debug('Deleting environment', { id: id.getValue() });

        try {
            const dtos = await this.loadDtos();
            const environment = await this.getById(id);

            // ✅ Clean up associated secrets
            if (environment) {
                const secretKeys = environment.getRequiredSecretKeys();
                await this.deleteSecrets(secretKeys);
            }

            const filtered = dtos.filter(d => d.id !== id.getValue());
            await this.saveDtos(filtered);

            this.logger.info('Environment deleted', { id: id.getValue() });
        } catch (error) {
            this.logger.error('Failed to delete environment', error);
            throw error;
        }
    }

    private async loadDtos(): Promise<EnvironmentConnectionDto[]> {
        return this.globalState.get<EnvironmentConnectionDto[]>(
            EnvironmentRepository.STORAGE_KEY,
            []
        );
    }

    private async saveDtos(dtos: EnvironmentConnectionDto[]): Promise<void> {
        await this.globalState.update(EnvironmentRepository.STORAGE_KEY, dtos);
    }

    private async deleteSecrets(secretKeys: string[]): Promise<void> {
        for (const key of secretKeys) {
            await this.secrets.delete(key);
        }
    }
}
```

**Key Points**:
- ✅ VS Code storage (globalState + SecretStorage)
- ✅ Injected mapper (bidirectional: domain ↔ DTO)
- ✅ Credential management (secrets separate from DTOs)
- ✅ Cleanup on delete (secrets + DTOs)

### Example 3: Repository with Caching

**File**: `src/features/metadataBrowser/infrastructure/repositories/DataverseEntityMetadataRepository.ts`

```typescript
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class DataverseEntityMetadataRepository implements IEntityMetadataRepository {
    private static readonly CACHE_DURATION_MS = 5 * 60 * 1000;  // 5 minutes
    private readonly entityCache = new Map<string, CacheEntry<EntityMetadata>>();

    constructor(
        private readonly apiService: IDataverseApiService,
        private readonly entityMapper: EntityMetadataMapper,
        private readonly optionSetMapper: OptionSetMetadataMapper,
        private readonly logger: ILogger
    ) {}

    async getEntityWithAttributes(environmentId: string, logicalName: LogicalName): Promise<EntityMetadata> {
        // 1. Check cache
        const cached = this.getFromCache(environmentId, logicalName.getValue());
        if (cached) {
            this.logger.debug('Cache hit', { logicalName: logicalName.getValue() });
            return cached;
        }

        this.logger.debug('Cache miss - fetching from API', { logicalName: logicalName.getValue() });

        try {
            // 2. Fetch using $expand (single request, optimal performance)
            const endpoint = `/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName.getValue()}')` +
                '?$expand=Attributes,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships,Keys';

            const dto = await this.apiService.get<EntityMetadataDto>(environmentId, endpoint);

            // 3. Enrich with additional data (option sets)
            await this.enrichAttributesWithOptionSets(environmentId, logicalName.getValue(), dto);

            // 4. Map to domain entity
            const entity = this.entityMapper.mapDtoToEntityWithAttributes(dto);

            // 5. Cache the result
            this.setCache(environmentId, logicalName.getValue(), entity);

            return entity;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch entity', normalizedError);
            throw normalizedError;
        }
    }

    private async enrichAttributesWithOptionSets(
        environmentId: string,
        entityLogicalName: string,
        entityDto: EntityMetadataDto
    ): Promise<void> {
        if (!entityDto.Attributes || entityDto.Attributes.length === 0) {
            return;
        }

        try {
            const baseUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')`;

            // ✅ Fetch all option set types in parallel (performance optimization)
            const [picklistResponse, stateResponse, statusResponse, booleanResponse] = await Promise.all([
                this.apiService.get<{ value: AttributeMetadataDto[] }>(
                    environmentId,
                    `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet`
                ),
                this.apiService.get<{ value: AttributeMetadataDto[] }>(
                    environmentId,
                    `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StateAttributeMetadata?$expand=OptionSet`
                ),
                this.apiService.get<{ value: AttributeMetadataDto[] }>(
                    environmentId,
                    `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$expand=OptionSet`
                ),
                this.apiService.get<{ value: AttributeMetadataDto[] }>(
                    environmentId,
                    `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$expand=OptionSet`
                )
            ]);

            // ✅ Merge option set data into main attributes (enrichment pattern)
            const optionSetAttrMap = new Map<string, AttributeMetadataDto>();
            const allAttrs = [
                ...(picklistResponse?.value || []),
                ...(stateResponse?.value || []),
                ...(statusResponse?.value || []),
                ...(booleanResponse?.value || [])
            ];

            for (const attr of allAttrs) {
                optionSetAttrMap.set(attr.LogicalName, attr);
            }

            for (const attr of entityDto.Attributes) {
                const enrichedAttr = optionSetAttrMap.get(attr.LogicalName);
                if (enrichedAttr?.OptionSet) {
                    attr.OptionSet = enrichedAttr.OptionSet;
                }
            }

            this.logger.debug('Enriched attributes with option sets', {
                enrichedCount: optionSetAttrMap.size
            });
        } catch (error) {
            this.logger.warn('Failed to enrich attributes', { error });
            // ✅ Don't throw - continue with partial data
        }
    }

    private getCacheKey(environmentId: string, logicalName: string): string {
        return `${environmentId}:${logicalName}`;
    }

    private getFromCache(environmentId: string, logicalName: string): EntityMetadata | null {
        const key = this.getCacheKey(environmentId, logicalName);
        const entry = this.entityCache.get(key);

        if (!entry) {
            return null;
        }

        if (!this.isCacheValid(entry.timestamp)) {
            this.entityCache.delete(key);
            return null;
        }

        return entry.data;
    }

    private isCacheValid(timestamp: number): boolean {
        return Date.now() - timestamp < DataverseEntityMetadataRepository.CACHE_DURATION_MS;
    }

    private setCache(environmentId: string, logicalName: string, data: EntityMetadata): void {
        const key = this.getCacheKey(environmentId, logicalName);
        this.entityCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    public clearCache(): void {
        this.entityCache.clear();
        this.logger.info('Cache cleared');
    }
}
```

**Key Points**:
- ✅ 5-minute cache for metadata (changes rarely)
- ✅ Composite cache key (environmentId + logicalName)
- ✅ Enrichment pattern (parallel fetches for option sets)
- ✅ Manual cache clear (user refresh)
- ✅ $expand for optimal performance (1 request vs N+1)

### Example 4: Query Building with Filters

**File**: `src/features/pluginTraceViewer/infrastructure/repositories/DataversePluginTraceRepository.ts`

```typescript
export class DataversePluginTraceRepository implements IPluginTraceRepository {
    async getTraces(environmentId: string, filter: TraceFilter): Promise<readonly PluginTrace[]> {
        // ✅ Selective field fetching for list view (performance)
        const selectFields = [
            'plugintracelogid',
            'createdon',
            'typename',
            'primaryentity',
            'messagename',
            'operationtype',
            'mode',
            'depth',
            'performanceexecutionduration',
            'exceptiondetails',  // Small field, needed for status
            'correlationid'      // Needed for timeline/related features
            // ❌ Exclude large fields: messageblock, configuration, profile
        ].join(',');

        const queryParams: string[] = [
            `$select=${selectFields}`,
            `$top=${filter.top}`
        ];

        if (filter.orderBy) {
            queryParams.push(`$orderby=${filter.orderBy}`);
        }

        // ✅ Delegate OData filter building to domain entity
        const odataFilter = filter.buildFilterExpression();
        if (odataFilter) {
            queryParams.push(`$filter=${odataFilter}`);
            this.logger.info('Applied filter', {
                expression: odataFilter,
                activeConditions: filter.getActiveFilterCount()
            });
        }

        const endpoint = `/api/data/v9.2/plugintracelogs?${queryParams.join('&')}`;

        this.logger.info('Fetching traces', { environmentId, endpoint });

        try {
            const response = await this.apiService.get<DataversePluginTraceLogsResponse>(
                environmentId,
                endpoint
            );

            const traces = response.value.map(dto => this.mapToEntity(dto));

            this.logger.debug('Fetched traces', { count: traces.length });
            return traces;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch traces', normalizedError);
            throw normalizedError;
        }
    }

    async getTraceById(environmentId: string, traceId: string): Promise<PluginTrace | null> {
        // ✅ All fields for detail view
        const selectFields = [
            'plugintracelogid',
            'createdon',
            'typename',
            'primaryentity',
            'messagename',
            'operationtype',
            'mode',
            'depth',
            'performanceexecutionduration',
            'messageblock',           // ✅ Include large fields
            'configuration',
            'secureconfiguration',
            'profile'
        ].join(',');

        const endpoint = `/api/data/v9.2/plugintracelogs(${traceId})?$select=${selectFields}`;

        try {
            const dto = await this.apiService.get<DataversePluginTraceLogDto>(environmentId, endpoint);
            return this.mapToEntity(dto);
        } catch (error) {
            const normalizedError = normalizeError(error);

            // ✅ Handle 404 gracefully (return null instead of throwing)
            if (this.isNotFoundError(normalizedError)) {
                this.logger.debug('Trace not found', { traceId });
                return null;
            }

            this.logger.error('Failed to fetch trace', normalizedError);
            throw normalizedError;
        }
    }

    private mapToEntity(dto: DataversePluginTraceLogDto): PluginTrace {
        return PluginTrace.create({
            id: dto.plugintracelogid,
            createdOn: new Date(dto.createdon),
            pluginName: dto.typename,
            entityName: dto.primaryentity,
            messageName: dto.messagename,
            operationType: OperationType.fromNumber(dto.operationtype),  // ✅ VO factory
            mode: ExecutionMode.fromNumber(dto.mode),
            depth: dto.depth,
            duration: Duration.fromMilliseconds(dto.performanceexecutionduration),
            exceptionDetails: dto.exceptiondetails ?? null
        });
    }

    private isNotFoundError(error: Error): boolean {
        return error.message.includes('404') || error.message.includes('not found');
    }
}
```

**Key Points**:
- ✅ Selective field fetching (list vs detail)
- ✅ Domain entity builds OData filter expression
- ✅ Graceful 404 handling (return null)
- ✅ Value Object factories for type-safe mapping

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Business Logic in Repository

**Problem**: Repository makes business decisions

```typescript
// ❌ WRONG: Filtering by business rules in repository
async findActiveSolutions(environmentId: string): Promise<Solution[]> {
    const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);
    const solutions = response.value.map(dto => this.mapToEntity(dto));

    // ❌ Business logic: What defines "active"?
    return solutions.filter(s =>
        !s.isManaged &&
        s.installedOn !== null &&
        s.version !== '1.0.0.0'
    );
}
```

**Solution**: Let domain service or use case handle filtering

```typescript
// ✅ CORRECT: Repository fetches all, domain service filters
async findAll(environmentId: string): Promise<Solution[]> {
    const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);
    return response.value.map(dto => this.mapToEntity(dto));
}

// Domain service handles "active" definition
class SolutionFilterService {
    filterActive(solutions: Solution[]): Solution[] {
        return solutions.filter(s =>
            !s.isManaged() &&
            s.hasBeenInstalled() &&
            !s.isDefaultVersion()  // ✅ Domain methods
        );
    }
}
```

### ❌ Anti-Pattern 2: Mapping in Constructor

**Problem**: Repository instantiates domain entities directly in loops

```typescript
// ❌ WRONG: Verbose, error-prone, hard to test
async findAll(environmentId: string): Promise<Solution[]> {
    const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);

    return response.value.map(dto => {
        // ❌ Direct instantiation (bypasses validation, static factories)
        return new Solution(
            dto.solutionid,
            dto.uniquename,
            dto.friendlyname,
            dto.version,
            dto.ismanaged,
            dto._publisherid_value,
            dto.publisherid?.friendlyname ?? 'Unknown',
            dto.installedon ? new Date(dto.installedon) : null,
            dto.description ?? ''
        );
    });
}
```

**Solution**: Use static factory method or mapper

```typescript
// ✅ CORRECT: Factory method (centralized, validated, testable)
async findAll(environmentId: string): Promise<Solution[]> {
    const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);
    return response.value.map(dto => this.mapToEntity(dto));
}

private mapToEntity(dto: SolutionDto): Solution {
    return Solution.create({  // ✅ Static factory
        id: dto.solutionid,
        uniqueName: dto.uniquename,
        friendlyName: dto.friendlyname,
        version: dto.version,
        isManaged: dto.ismanaged,
        publisherId: dto._publisherid_value,
        publisherName: dto.publisherid?.friendlyname ?? 'Unknown',
        installedOn: dto.installedon ? new Date(dto.installedon) : null,
        description: dto.description ?? ''
    });
}
```

### ❌ Anti-Pattern 3: Not Using $expand (N+1 Queries)

**Problem**: Fetching related data in loops

```typescript
// ❌ WRONG: N+1 query problem
async findAll(environmentId: string): Promise<Solution[]> {
    // 1 query for solutions
    const solutionsResponse = await this.apiService.get<ResponseDto>(
        environmentId,
        '/api/data/v9.2/solutions?$select=solutionid,uniquename,_publisherid_value'
    );

    const solutions: Solution[] = [];

    // N queries for publishers (one per solution)
    for (const solutionDto of solutionsResponse.value) {
        const publisherResponse = await this.apiService.get<PublisherDto>(
            environmentId,
            `/api/data/v9.2/publishers(${solutionDto._publisherid_value})?$select=friendlyname`
        );

        solutions.push(Solution.create({
            id: solutionDto.solutionid,
            uniqueName: solutionDto.uniquename,
            publisherName: publisherResponse.friendlyname
        }));
    }

    return solutions;
}
```

**Solution**: Use $expand for single query

```typescript
// ✅ CORRECT: Single query with $expand
async findAll(environmentId: string): Promise<Solution[]> {
    const endpoint = '/api/data/v9.2/solutions?' +
        '$select=solutionid,uniquename,_publisherid_value&' +
        '$expand=publisherid($select=friendlyname)';  // ✅ Single query

    const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);

    return response.value.map(dto => Solution.create({
        id: dto.solutionid,
        uniqueName: dto.uniquename,
        publisherName: dto.publisherid?.friendlyname ?? 'Unknown'
    }));
}
```

### ❌ Anti-Pattern 4: Caching Transactional Data

**Problem**: Caching data that should be real-time

```typescript
// ❌ WRONG: Caching plugin traces (real-time debugging data)
private readonly traceCache = new Map<string, PluginTrace[]>();

async getTraces(environmentId: string, filter: TraceFilter): Promise<readonly PluginTrace[]> {
    const cacheKey = `${environmentId}:${filter.top}`;

    if (this.traceCache.has(cacheKey)) {
        return this.traceCache.get(cacheKey)!;  // ❌ Stale debugging data
    }

    const traces = await this.fetchFromApi(environmentId, filter);
    this.traceCache.set(cacheKey, traces);
    return traces;
}
```

**Solution**: No caching for transactional/real-time data

```typescript
// ✅ CORRECT: Always fetch fresh traces (real-time debugging)
async getTraces(environmentId: string, filter: TraceFilter): Promise<readonly PluginTrace[]> {
    const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);
    return response.value.map(dto => this.mapToEntity(dto));
}
```

### ❌ Anti-Pattern 5: Complex Transformations in Repository

**Problem**: Repository doing domain service work

```typescript
// ❌ WRONG: Building hierarchies in repository
async getTraces(environmentId: string): Promise<readonly TimelineNode[]> {
    const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);
    const traces = response.value.map(dto => this.mapToEntity(dto));

    // ❌ Complex transformation (hierarchy building is domain logic)
    const roots: TimelineNode[] = [];
    const depthStack: TimelineNode[] = [];

    for (const trace of traces) {
        const node = TimelineNode.create(trace, [], trace.depth, 0, 0);
        if (trace.depth === 0) {
            roots.push(node);
            depthStack[0] = node;
        } else {
            const parent = depthStack[trace.depth - 1];
            if (parent) {
                const updatedChildren = [...parent.children, node];
                depthStack[trace.depth - 1] = parent.withChildren(updatedChildren);
            }
        }
    }

    return roots;
}
```

**Solution**: Repository fetches, domain service transforms

```typescript
// ✅ CORRECT: Repository fetches traces
async getTraces(environmentId: string, filter: TraceFilter): Promise<readonly PluginTrace[]> {
    const response = await this.apiService.get<ResponseDto>(environmentId, endpoint);
    return response.value.map(dto => this.mapToEntity(dto));
}

// ✅ Domain service builds hierarchy (use case orchestrates)
class TimelineHierarchyService {
    buildHierarchy(traces: readonly PluginTrace[]): readonly TimelineNode[] {
        // Complex domain logic here
    }
}

// Use case orchestrates
const traces = await this.repository.getTraces(environmentId, filter);
const hierarchy = this.hierarchyService.buildHierarchy(traces);  // ✅ Domain service
```

---

## Testing Repositories

### Pattern 1: Mock IDataverseApiService

**Setup helpers**:
```typescript
// src/shared/testing/setup/dataverseApiServiceSetup.ts
export function createMockDataverseApiService(): jest.Mocked<IDataverseApiService> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
        batchDelete: jest.fn()
    };
}
```

**Test example**:
```typescript
describe('DataverseApiSolutionRepository', () => {
    let repository: DataverseApiSolutionRepository;
    let mockApiService: jest.Mocked<IDataverseApiService>;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        mockApiService = createMockDataverseApiService();
        mockLogger = createMockLogger();
        repository = new DataverseApiSolutionRepository(mockApiService, mockLogger);
    });

    describe('findAll', () => {
        it('should fetch solutions and map to domain entities', async () => {
            // Arrange
            const mockResponse = {
                value: [
                    {
                        solutionid: 'sol-1',
                        uniquename: 'TestSolution',
                        friendlyname: 'Test Solution',
                        version: '1.0.0.0',
                        ismanaged: false,
                        _publisherid_value: 'pub-1',
                        installedon: '2024-01-15T10:00:00Z',
                        description: 'Test',
                        publisherid: { friendlyname: 'Test Publisher' }
                    }
                ]
            };

            mockApiService.get.mockResolvedValue(mockResponse);

            // Act
            const result = await repository.findAll('env-123');

            // Assert
            expect(mockApiService.get).toHaveBeenCalledWith(
                'env-123',
                expect.stringContaining('/api/data/v9.2/solutions')
            );
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(Solution);
            expect(result[0]?.id).toBe('sol-1');
            expect(result[0]?.uniqueName).toBe('TestSolution');
        });

        it('should handle null installedOn date', async () => {
            // Arrange
            const mockResponse = {
                value: [{
                    solutionid: 'sol-1',
                    uniquename: 'Test',
                    friendlyname: 'Test',
                    version: '1.0',
                    ismanaged: false,
                    _publisherid_value: 'pub-1',
                    installedon: null,  // ✅ Test null handling
                    description: 'Test',
                    publisherid: { friendlyname: 'Publisher' }
                }]
            };

            mockApiService.get.mockResolvedValue(mockResponse);

            // Act
            const result = await repository.findAll('env-123');

            // Assert
            expect(result[0]?.installedOn).toBeNull();
        });

        it('should log and rethrow API errors', async () => {
            // Arrange
            const error = new Error('API request failed');
            mockApiService.get.mockRejectedValue(error);

            // Act & Assert
            await expect(repository.findAll('env-123')).rejects.toThrow('API request failed');
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to fetch solutions from Dataverse API',
                error
            );
        });
    });
});
```

### Pattern 2: Test Caching Logic

```typescript
describe('DataverseEntityMetadataRepository', () => {
    let repository: DataverseEntityMetadataRepository;
    let mockApiService: jest.Mocked<IDataverseApiService>;

    beforeEach(() => {
        mockApiService = createMockDataverseApiService();
        repository = new DataverseEntityMetadataRepository(
            mockApiService,
            new EntityMetadataMapper(),
            new OptionSetMetadataMapper(),
            createMockLogger()
        );
    });

    describe('caching', () => {
        it('should cache entity metadata for 5 minutes', async () => {
            // Arrange
            const mockDto = createMockEntityMetadataDto('account');
            mockApiService.get.mockResolvedValue(mockDto);

            // Act - First call (cache miss)
            const result1 = await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Act - Second call (cache hit)
            const result2 = await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Assert
            expect(mockApiService.get).toHaveBeenCalledTimes(1);  // ✅ Only 1 API call
            expect(result1).toBe(result2);  // ✅ Same instance
        });

        it('should refetch after cache expiration', async () => {
            // Arrange
            const mockDto = createMockEntityMetadataDto('account');
            mockApiService.get.mockResolvedValue(mockDto);

            // Act - First call
            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Simulate time passing (5+ minutes)
            jest.advanceTimersByTime(5 * 60 * 1000 + 1);

            // Act - Second call after expiration
            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Assert
            expect(mockApiService.get).toHaveBeenCalledTimes(2);  // ✅ 2 API calls
        });

        it('should clear cache on manual clear', async () => {
            // Arrange
            const mockDto = createMockEntityMetadataDto('account');
            mockApiService.get.mockResolvedValue(mockDto);

            // Act - First call (cache miss)
            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Clear cache
            repository.clearCache();

            // Act - Second call (cache miss after clear)
            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Assert
            expect(mockApiService.get).toHaveBeenCalledTimes(2);  // ✅ 2 API calls
        });
    });
});
```

### Pattern 3: Test Batch Operations

```typescript
describe('DataversePluginTraceRepository', () => {
    let repository: DataversePluginTraceRepository;
    let mockApiService: jest.Mocked<IDataverseApiService>;

    beforeEach(() => {
        mockApiService = createMockDataverseApiService();
        repository = new DataversePluginTraceRepository(mockApiService, createMockLogger());
    });

    describe('deleteTraces', () => {
        it('should delete traces in batches of 100', async () => {
            // Arrange
            const traceIds = Array.from({ length: 250 }, (_, i) => `trace-${i}`);
            mockApiService.batchDelete.mockResolvedValue(100);  // Each batch deletes 100

            // Act
            const deletedCount = await repository.deleteTraces('env-123', traceIds);

            // Assert
            expect(mockApiService.batchDelete).toHaveBeenCalledTimes(3);  // 3 batches (100, 100, 50)
            expect(deletedCount).toBe(250);  // ✅ All deleted
        });

        it('should continue with remaining batches if one fails', async () => {
            // Arrange
            const traceIds = Array.from({ length: 200 }, (_, i) => `trace-${i}`);
            mockApiService.batchDelete
                .mockResolvedValueOnce(100)  // First batch succeeds
                .mockRejectedValueOnce(new Error('Network error'))  // Second batch fails
                .mockResolvedValueOnce(0);  // Third batch (not called, only 200 total)

            // Act
            const deletedCount = await repository.deleteTraces('env-123', traceIds);

            // Assert
            expect(mockApiService.batchDelete).toHaveBeenCalledTimes(2);
            expect(deletedCount).toBe(100);  // ✅ Partial success
        });
    });
});
```

**See**: `docs/testing/TESTING_GUIDE.md` for comprehensive testing patterns

---

## Summary

**Repository Checklist**:
- ✅ Constructor injection (IDataverseApiService, ILogger, optional mapper)
- ✅ DTO → Domain mapping (inline for simple, injected mapper for complex)
- ✅ Error normalization and logging
- ✅ Cache only metadata (5-minute expiration)
- ✅ Selective field fetching ($select for list vs detail)
- ✅ Use $expand for related data (avoid N+1)
- ✅ Batch operations for bulk deletes (100 records per batch)
- ❌ NO business logic or validation
- ❌ NO complex transformations (delegate to domain services)
- ❌ NO presentation logic (delegate to mappers)

**Performance Optimization**:
- Use $expand vs multiple queries (2x+ faster)
- Selective field fetching (10x payload reduction)
- Caching for metadata (5-minute duration)
- Batch operations for bulk operations (100 record batches)

**Related Guides**:
- `docs/architecture/MAPPER_PATTERNS.md` - Mapper delegation patterns
- `docs/architecture/DOMAIN_SERVICE_PATTERNS.md` - Business logic patterns
- `docs/architecture/VALUE_OBJECT_PATTERNS.md` - VO factory methods
- `docs/testing/TESTING_GUIDE.md` - Repository testing patterns
