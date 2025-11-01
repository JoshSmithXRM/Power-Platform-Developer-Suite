# Clean Architecture Guide for Power Platform Developer Suite

**Practical guide to implementing Clean Architecture patterns in this codebase. All examples are from actual production code.**

---

## 🚀 Quick Reference

### Layer Dependency Rules
```
Presentation Layer  ────┐
                        ├──→ Application Layer ──→ Domain Layer (ZERO dependencies)
Infrastructure Layer ───┘
```

**Golden Rule:** All dependencies point INWARD. Domain has zero external dependencies.

### Where Things Live

| Concept | Layer | Example |
|---------|-------|---------|
| Business logic | Domain entities | `Environment.validateConfiguration()` |
| Orchestration | Application use cases | `SaveEnvironmentUseCase.execute()` |
| External APIs | Infrastructure repositories | `EnvironmentRepository.save()` |
| UI logic | Presentation panels | `EnvironmentSetupPanel.handleMessage()` |
| Contracts | Domain interfaces | `IEnvironmentRepository` |

### Key Patterns

**Rich Domain Models** - Entities with behavior methods, not just data
```typescript
✅ environment.requiresClientSecret()  // Entity knows its business rules
❌ if (env.authMethod === 'ServicePrincipal')  // Logic scattered everywhere
```

**Use Cases Orchestrate** - Coordinate entities, no business logic
```typescript
✅ const isValid = environment.validateConfiguration()  // Delegate to entity
❌ if (!env.name || env.name.length === 0)  // Business logic in use case
```

**Repository Interfaces in Domain** - Infrastructure implements
```typescript
✅ domain/interfaces/IEnvironmentRepository.ts  // Domain defines contract
   infrastructure/repositories/EnvironmentRepository.ts  // Infrastructure implements
❌ Importing vscode.Memento directly in domain  // Domain coupled to infrastructure
```

---

## 📖 Core Principles

### 1. Domain Layer Has Zero Dependencies

**What it means:** Domain entities, value objects, and interfaces import NOTHING from outer layers.

**Why it matters:** Domain represents pure business logic. If it depends on VS Code APIs, databases, or HTTP clients, you can't test business rules in isolation.

**How to verify:**
```typescript
// ✅ GOOD - Domain entity
import { EnvironmentName } from '../valueObjects/EnvironmentName';
import { DataverseUrl } from '../valueObjects/DataverseUrl';
// Only imports from domain layer

// ❌ BAD - Domain entity
import * as vscode from 'vscode';  // External dependency!
import { ILogger } from '../../../infrastructure/logging/ILogger';  // Outer layer!
```

**Real example from Environment entity:**
```typescript
// src/features/environmentSetup/domain/entities/Environment.ts
export class Environment {
    // No imports from infrastructure, presentation, or external libraries
    // Only domain value objects and interfaces

    public validateConfiguration(): ValidationResult {
        const errors: string[] = [];

        // Pure business logic - no infrastructure concerns
        if (!this.name.isValid()) {
            errors.push('Name is required');
        }

        if (this.authenticationMethod.requiresClientId() && !this.clientId) {
            errors.push('Client ID is required for Service Principal authentication');
        }

        return new ValidationResult(errors.length === 0, errors);
    }
}
```

---

### 2. Rich Domain Models (Not Anemic)

**What it means:** Entities contain behavior methods, not just getters/setters.

**Why it matters:** Business logic lives in domain entities where it belongs, not scattered across use cases or presentation layers.

**Anemic vs Rich:**

❌ **Anemic Model** (data bag with no behavior):
```typescript
export class Environment {
    public name: string;
    public dataverseUrl: string;
    public authMethod: string;
    public clientId?: string;
}

// Business logic ends up in use case or panel
if (env.authMethod === 'ServicePrincipal' && !env.clientId) {
    throw new Error('Client ID required');
}
```

✅ **Rich Model** (entity with behavior):
```typescript
export class Environment {
    constructor(
        private readonly id: EnvironmentId,
        private name: EnvironmentName,
        private dataverseUrl: DataverseUrl,
        private authenticationMethod: AuthenticationMethod,
        private clientId?: ClientId
    ) {
        this.validate();  // Enforce invariants
    }

    // Business logic lives in entity
    public requiresClientId(): boolean {
        return this.authenticationMethod.requiresClientId();
    }

    public requiresClientSecret(): boolean {
        return this.authenticationMethod.requiresClientSecret();
    }

    public validateConfiguration(): ValidationResult {
        // Complex validation logic belongs here
        const errors: string[] = [];

        if (this.requiresClientId() && !this.clientId) {
            errors.push('Client ID is required for Service Principal authentication');
        }

        return new ValidationResult(errors.length === 0, errors);
    }

    public activate(): void {
        // Business rule: only one environment can be active
        this.isActive = true;
        this.lastUsed = new Date();
    }
}
```

**Real examples from Environment entity:**

```typescript
// src/features/environmentSetup/domain/entities/Environment.ts

/**
 * Business logic: Determine if client secret is required
 * WHY: Different auth methods have different credential requirements
 */
public requiresClientSecret(): boolean {
    return this.authenticationMethod.isServicePrincipal();
}

/**
 * Business logic: Determine if password is required
 */
public requiresPassword(): boolean {
    return this.authenticationMethod.isUsernamePassword();
}

/**
 * Business logic: Get old client secret key for cleanup
 * WHY: When changing auth methods, we need to clean up orphaned secrets
 */
public getOldClientSecretKey(previousClientId?: ClientId): string | null {
    if (!previousClientId) {
        return null;
    }
    return `environment.${this.id.getValue()}.clientSecret.${previousClientId.getValue()}`;
}

/**
 * Business logic: Activate this environment
 * WHY: Only one environment can be active at a time
 */
public activate(): void {
    this.isActive = true;
    this.lastUsed = new Date();
}

/**
 * Business logic: Deactivate this environment
 */
public deactivate(): void {
    this.isActive = false;
}
```

**Key Insight:** Entity knows HOW to do things. Use cases orchestrate WHEN to do things.

---

### 3. Use Cases Orchestrate (No Business Logic)

**What it means:** Use cases coordinate domain entities and repositories. They contain ZERO business logic.

**Why it matters:** Business logic in use cases becomes duplicated and hard to maintain. Logic belongs in reusable domain entities.

**Use case responsibilities:**
- Fetch data from repositories
- Coordinate multiple entities
- Publish domain events
- Return results to presentation layer
- Handle errors and logging

**Use case non-responsibilities:**
- Validate business rules (delegate to entities)
- Calculate derived values (delegate to entities)
- Make business decisions (delegate to entities)

❌ **Bad - Business logic in use case:**
```typescript
export class SaveEnvironmentUseCase {
    public async execute(request: SaveEnvironmentRequest): Promise<void> {
        // ❌ Business logic in use case
        if (request.authMethod === 'ServicePrincipal' && !request.clientId) {
            throw new Error('Client ID required');
        }

        // ❌ Complex validation logic
        if (!request.name || request.name.length === 0 || request.name.length > 100) {
            throw new Error('Invalid name');
        }

        // ❌ Calculating derived values
        const isActive = request.isActive ?? false;
        const lastUsed = isActive ? new Date() : undefined;

        await this.repository.save(request);
    }
}
```

✅ **Good - Orchestration only:**
```typescript
export class SaveEnvironmentUseCase {
    constructor(
        private readonly repository: IEnvironmentRepository,
        private readonly validationService: EnvironmentValidationService,
        private readonly eventPublisher: IDomainEventPublisher,
        private readonly logger: ILogger
    ) {}

    public async execute(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
        const isUpdate = !!request.existingEnvironmentId;
        this.logger.debug(`SaveEnvironmentUseCase: ${isUpdate ? 'Updating' : 'Creating'} environment`);

        // Orchestration: Load existing environment if updating
        let previousEnvironment: Environment | null = null;
        if (isUpdate) {
            previousEnvironment = await this.repository.getById(
                new EnvironmentId(request.existingEnvironmentId!)
            );
        }

        // Orchestration: Create domain entity (validation happens in entity)
        let environment: Environment;
        try {
            environment = new Environment(
                isUpdate ? new EnvironmentId(request.existingEnvironmentId!) : EnvironmentId.generate(),
                new EnvironmentName(request.name),
                new DataverseUrl(request.dataverseUrl),
                new TenantId(request.tenantId),
                new AuthenticationMethod(request.authenticationMethod),
                new ClientId(request.publicClientId),
                previousEnvironment?.getIsActive() ?? false,
                previousEnvironment?.getLastUsed(),
                request.powerPlatformEnvironmentId,
                request.clientId ? new ClientId(request.clientId) : undefined,
                request.username
            );
        } catch (error) {
            // Validation failed - return error
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Invalid input data']
            };
        }

        // Orchestration: Gather validation data from repository
        const isNameUnique = await this.repository.isNameUnique(
            environment.getName(),
            environment.getId()
        );

        // Delegate validation to domain service (business logic)
        const validationResult = this.validationService.validateEnvironment(
            environment,
            isNameUnique,
            request.clientSecret,
            request.password
        );

        if (!validationResult.isValid) {
            return {
                success: false,
                errors: validationResult.errors
            };
        }

        // Orchestration: Save to repository
        await this.repository.save(environment);

        // Orchestration: Save credentials if provided
        if (request.clientSecret && environment.requiresClientSecret()) {
            await this.repository.saveClientSecret(environment.getId(), environment.getClientId()!, request.clientSecret);
        }

        if (request.password && environment.requiresPassword()) {
            await this.repository.savePassword(environment.getId(), environment.getUsername()!, request.password);
        }

        // Orchestration: Clean up old secrets (business logic is in entity method)
        const oldSecretKey = environment.getOldClientSecretKey(previousEnvironment?.getClientId());
        if (oldSecretKey) {
            await this.repository.deleteSecret(oldSecretKey);
        }

        // Orchestration: Publish domain events
        const event = isUpdate
            ? new EnvironmentUpdated(environment.getId().getValue(), environment.getName().getValue())
            : new EnvironmentCreated(environment.getId().getValue(), environment.getName().getValue());
        this.eventPublisher.publish(event);

        this.logger.info(`Environment ${isUpdate ? 'updated' : 'created'}: ${environment.getName().getValue()}`);

        return {
            success: true,
            environmentId: environment.getId().getValue()
        };
    }
}
```

**Key patterns in this use case:**
1. Orchestrates multiple steps (load, create, validate, save, publish)
2. Delegates all business logic to entities (`requiresClientSecret()`, `getOldClientSecretKey()`)
3. Uses domain services for complex validation
4. Handles errors and logging (infrastructure concerns)
5. No if/else logic based on business rules (uses entity methods)

---

### 4. Repository Pattern (Interfaces in Domain)

**What it means:** Domain defines repository contracts (interfaces). Infrastructure provides implementations.

**Why it matters:** Dependency inversion. Domain doesn't depend on infrastructure. Easy to test with mocks.

**Pattern:**

```
Domain Layer:
    src/features/environmentSetup/domain/interfaces/IEnvironmentRepository.ts
    ↓ defines contract ↓
Infrastructure Layer:
    src/features/environmentSetup/infrastructure/repositories/EnvironmentRepository.ts
    ↑ implements contract ↑
```

✅ **Good - Repository interface in domain:**
```typescript
// src/features/environmentSetup/domain/interfaces/IEnvironmentRepository.ts
export interface IEnvironmentRepository {
    /**
     * Retrieve all environments
     */
    getAll(): Promise<Environment[]>;

    /**
     * Retrieve environment by ID
     * @throws {DomainError} if environment not found
     */
    getById(id: EnvironmentId): Promise<Environment>;

    /**
     * Save environment (create or update)
     */
    save(environment: Environment): Promise<void>;

    /**
     * Delete environment
     */
    delete(id: EnvironmentId): Promise<void>;

    /**
     * Check if environment name is unique
     */
    isNameUnique(name: EnvironmentName, excludeId?: EnvironmentId): Promise<boolean>;

    /**
     * Save client secret to secure storage
     */
    saveClientSecret(environmentId: EnvironmentId, clientId: ClientId, secret: string): Promise<void>;

    /**
     * Retrieve client secret from secure storage
     * @returns {string | null} Secret if found, null otherwise
     */
    getClientSecret(environmentId: EnvironmentId, clientId: ClientId): Promise<string | null>;
}
```

**Implementation in infrastructure:**
```typescript
// src/features/environmentSetup/infrastructure/repositories/EnvironmentRepository.ts
import * as vscode from 'vscode';
import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentDomainMapper } from '../mappers/EnvironmentDomainMapper';

export class EnvironmentRepository implements IEnvironmentRepository {
    private static readonly ENVIRONMENTS_KEY = 'environments';

    constructor(
        private readonly globalState: vscode.Memento,
        private readonly secretStorage: vscode.SecretStorage,
        private readonly mapper: EnvironmentDomainMapper,
        private readonly logger: ILogger
    ) {}

    public async getAll(): Promise<Environment[]> {
        this.logger.debug('EnvironmentRepository: Loading all environments');

        const dto = this.globalState.get<EnvironmentConnectionDto[]>(
            EnvironmentRepository.ENVIRONMENTS_KEY,
            []
        );

        return dto.map(d => this.mapper.toDomain(d));
    }

    public async save(environment: Environment): Promise<void> {
        this.logger.debug(`EnvironmentRepository: Saving environment ${environment.getId().getValue()}`);

        const environments = await this.getAll();
        const existingIndex = environments.findIndex(
            e => e.getId().getValue() === environment.getId().getValue()
        );

        if (existingIndex >= 0) {
            environments[existingIndex] = environment;
        } else {
            environments.push(environment);
        }

        const dto = environments.map(e => this.mapper.toPersistence(e));
        await this.globalState.update(EnvironmentRepository.ENVIRONMENTS_KEY, dto);

        this.logger.info(`Environment saved: ${environment.getName().getValue()}`);
    }

    public async saveClientSecret(
        environmentId: EnvironmentId,
        clientId: ClientId,
        secret: string
    ): Promise<void> {
        const key = `environment.${environmentId.getValue()}.clientSecret.${clientId.getValue()}`;
        await this.secretStorage.store(key, secret);
        this.logger.debug(`Stored client secret for environment ${environmentId.getValue()}`);
    }

    public async getClientSecret(
        environmentId: EnvironmentId,
        clientId: ClientId
    ): Promise<string | null> {
        const key = `environment.${environmentId.getValue()}.clientSecret.${clientId.getValue()}`;
        return await this.secretStorage.get(key) ?? null;
    }

    // ... other methods
}
```

**Key benefits:**
1. Domain defines what it needs (contract)
2. Infrastructure knows how to do it (VS Code APIs)
3. Easy to test (mock the interface)
4. Easy to swap implementations (different storage mechanisms)

**Testing with mocks:**
```typescript
// Test use case with mocked repository
const mockRepository: IEnvironmentRepository = {
    getAll: jest.fn().mockResolvedValue([]),
    getById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    isNameUnique: jest.fn().mockResolvedValue(true),
    saveClientSecret: jest.fn(),
    getClientSecret: jest.fn()
};

const useCase = new SaveEnvironmentUseCase(
    mockRepository,
    validationService,
    eventPublisher,
    logger
);
```

---

### 5. Value Objects for Validation

**What it means:** Use value objects to encapsulate validation and business rules for primitive values.

**Why it matters:** Validation happens once (at construction). Invalid state is impossible. Type safety beyond primitives.

❌ **Bad - Primitive obsession:**
```typescript
export class Environment {
    constructor(
        public readonly id: string,
        public readonly name: string,  // Any string allowed!
        public readonly dataverseUrl: string,  // Could be invalid URL
        public readonly tenantId: string  // Could be malformed GUID
    ) {}
}

// Validation scattered everywhere
if (!name || name.length === 0) {
    throw new Error('Name required');
}
if (name.length > 100) {
    throw new Error('Name too long');
}
```

✅ **Good - Value objects with validation:**
```typescript
// src/features/environmentSetup/domain/valueObjects/EnvironmentName.ts
export class EnvironmentName {
    private static readonly MAX_LENGTH = 100;

    constructor(private readonly value: string) {
        this.validate();
    }

    private validate(): void {
        if (!this.value || this.value.trim().length === 0) {
            throw new DomainError('Environment name cannot be empty');
        }

        if (this.value.length > EnvironmentName.MAX_LENGTH) {
            throw new DomainError(`Environment name cannot exceed ${EnvironmentName.MAX_LENGTH} characters`);
        }
    }

    public getValue(): string {
        return this.value;
    }

    public equals(other: EnvironmentName): boolean {
        return this.value === other.value;
    }
}
```

```typescript
// src/features/environmentSetup/domain/valueObjects/DataverseUrl.ts
export class DataverseUrl {
    private static readonly DATAVERSE_DOMAINS = [
        '.crm.dynamics.com',
        '.crm2.dynamics.com',
        '.crm3.dynamics.com',
        '.crm4.dynamics.com',
        // ... other regions
    ];

    constructor(private readonly value: string) {
        this.validate();
    }

    private validate(): void {
        if (!this.value || this.value.trim().length === 0) {
            throw new DomainError('Dataverse URL cannot be empty');
        }

        // Ensure HTTPS
        if (!this.value.startsWith('https://')) {
            throw new DomainError('Dataverse URL must use HTTPS');
        }

        // Validate is actual Dataverse domain
        const isValidDomain = DataverseUrl.DATAVERSE_DOMAINS.some(domain =>
            this.value.includes(domain)
        );

        if (!isValidDomain) {
            throw new DomainError('Invalid Dataverse URL - must be a valid *.dynamics.com domain');
        }
    }

    public getValue(): string {
        return this.value;
    }

    /**
     * Business logic: Extract organization name from URL
     * WHY: API calls need the organization name
     */
    public getOrganizationName(): string {
        const match = this.value.match(/https:\/\/([^.]+)\./);
        return match ? match[1] : '';
    }

    /**
     * Business logic: Construct API base URL
     */
    public getApiBaseUrl(): string {
        return `${this.value}/api/data/v9.2`;
    }
}
```

```typescript
// src/features/environmentSetup/domain/valueObjects/TenantId.ts
export class TenantId {
    private static readonly GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    constructor(private readonly value: string) {
        this.validate();
    }

    private validate(): void {
        if (!this.value || this.value.trim().length === 0) {
            throw new DomainError('Tenant ID cannot be empty');
        }

        if (!TenantId.GUID_REGEX.test(this.value)) {
            throw new DomainError('Tenant ID must be a valid GUID');
        }
    }

    public getValue(): string {
        return this.value;
    }

    public equals(other: TenantId): boolean {
        return this.value.toLowerCase() === other.value.toLowerCase();
    }
}
```

**Using value objects in entities:**
```typescript
export class Environment {
    constructor(
        public readonly id: EnvironmentId,
        private name: EnvironmentName,  // Value object, not string
        private dataverseUrl: DataverseUrl,  // Value object, not string
        private tenantId: TenantId,  // Value object, not string
        private authenticationMethod: AuthenticationMethod,
        private publicClientId: ClientId,
        private isActive: boolean
    ) {
        // Value objects already validated on construction
        // No need to validate again here
    }

    // Type-safe getters
    public getName(): EnvironmentName {
        return this.name;
    }

    public getDataverseUrl(): DataverseUrl {
        return this.dataverseUrl;
    }

    // Can use value object methods
    public getApiBaseUrl(): string {
        return this.dataverseUrl.getApiBaseUrl();  // Delegate to value object
    }
}
```

**Benefits:**
1. Validation happens once (at construction)
2. Invalid state is impossible
3. Business logic encapsulated in value object
4. Type safety (can't mix up EnvironmentId and TenantId)
5. Reusable across entities

---

## 🏗️ Layer Architecture

### Domain Layer (Zero Dependencies)

**Location:** `src/features/{feature}/domain/`

**Structure:**
```
domain/
├── entities/           # Rich domain models with behavior
│   └── Environment.ts
├── valueObjects/       # Value objects with validation
│   ├── EnvironmentId.ts
│   ├── EnvironmentName.ts
│   ├── DataverseUrl.ts
│   ├── TenantId.ts
│   └── AuthenticationMethod.ts
├── services/           # Domain services (complex business logic involving multiple entities)
│   └── EnvironmentValidationService.ts
├── interfaces/         # Repository contracts defined by domain
│   ├── IEnvironmentRepository.ts
│   └── IDomainEventPublisher.ts
├── events/             # Domain events
│   ├── EnvironmentCreated.ts
│   └── EnvironmentUpdated.ts
└── errors/             # Domain-specific errors
    └── DomainError.ts
```

**Responsibilities:**
- Define business entities with behavior
- Enforce business invariants
- Validate business rules
- Define repository contracts
- Define domain events

**Non-responsibilities:**
- Persistence (infrastructure concern)
- API calls (infrastructure concern)
- UI rendering (presentation concern)
- Logging (infrastructure concern)

**Example: Domain Service**
```typescript
// src/features/environmentSetup/domain/services/EnvironmentValidationService.ts
export class EnvironmentValidationService {
    /**
     * Validate environment with external validation data
     * WHY: Some validation requires checking external state (uniqueness, existing credentials)
     * This is domain logic but needs data from repositories
     */
    public validateEnvironment(
        environment: Environment,
        isNameUnique: boolean,
        clientSecret?: string,
        password?: string
    ): ValidationResult {
        const errors: string[] = [];

        // Delegate to entity for internal validation
        const configResult = environment.validateConfiguration();
        if (!configResult.isValid) {
            errors.push(...configResult.errors);
        }

        // Business rule: name must be unique
        if (!isNameUnique) {
            errors.push('Environment name must be unique');
        }

        // Business rule: credentials must be provided when required
        if (environment.requiresClientSecret() && !clientSecret) {
            errors.push('Client Secret is required for Service Principal authentication');
        }

        if (environment.requiresPassword() && !password) {
            errors.push('Password is required for Username/Password authentication');
        }

        return new ValidationResult(errors.length === 0, errors);
    }
}
```

---

### Application Layer (Orchestration)

**Location:** `src/features/{feature}/application/`

**Structure:**
```
application/
├── useCases/           # Use cases orchestrate domain and infrastructure
│   ├── SaveEnvironmentUseCase.ts
│   ├── LoadEnvironmentsUseCase.ts
│   ├── DeleteEnvironmentUseCase.ts
│   └── TestConnectionUseCase.ts
├── dto/                # Data Transfer Objects (if needed for cross-layer communication)
│   └── EnvironmentConnectionDto.ts
├── interfaces/         # Application-level interfaces (event publishers, etc.)
│   └── IDomainEventPublisher.ts
└── errors/             # Application-specific errors
    └── ApplicationError.ts
```

**Responsibilities:**
- Orchestrate domain entities and repositories
- Coordinate multiple repositories
- Publish domain events
- Handle application-level errors
- Transaction boundaries (if applicable)

**Non-responsibilities:**
- Business logic (domain concern)
- Persistence details (infrastructure concern)
- UI logic (presentation concern)

**Example: Load Use Case**
```typescript
// src/features/environmentSetup/application/useCases/LoadEnvironmentsUseCase.ts
export class LoadEnvironmentsUseCase {
    constructor(
        private readonly repository: IEnvironmentRepository,
        private readonly logger: ILogger
    ) {}

    public async execute(): Promise<LoadEnvironmentsResponse> {
        this.logger.debug('LoadEnvironmentsUseCase: Loading all environments');

        try {
            // Orchestration: Fetch from repository
            const environments = await this.repository.getAll();

            // Orchestration: Map to response DTOs
            const environmentDtos = environments.map(env => ({
                id: env.getId().getValue(),
                name: env.getName().getValue(),
                dataverseUrl: env.getDataverseUrl().getValue(),
                tenantId: env.getTenantId().getValue(),
                authenticationMethod: env.getAuthenticationMethod().getType(),
                publicClientId: env.getPublicClientId().getValue(),
                isActive: env.getIsActive(),
                lastUsed: env.getLastUsed(),
                powerPlatformEnvironmentId: env.getPowerPlatformEnvironmentId(),
                clientId: env.getClientId()?.getValue(),
                username: env.getUsername()
            }));

            this.logger.info(`Loaded ${environments.length} environments`);

            return {
                success: true,
                environments: environmentDtos
            };
        } catch (error) {
            this.logger.error('LoadEnvironmentsUseCase: Failed to load environments', error);
            throw new ApplicationError('Failed to load environments', error);
        }
    }
}
```

---

### Infrastructure Layer (External Concerns)

**Location:** `src/features/{feature}/infrastructure/`

**Structure:**
```
infrastructure/
├── repositories/       # Repository implementations
│   └── EnvironmentRepository.ts
├── services/           # Infrastructure services (API clients, authentication)
│   ├── MsalAuthenticationService.ts
│   ├── PowerPlatformApiService.ts
│   └── WhoAmIService.ts
├── adapters/           # Adapters for external systems
│   └── VsCodeCancellationTokenAdapter.ts
├── mappers/            # Map between domain entities and DTOs
│   └── EnvironmentDomainMapper.ts
└── eventHandlers/      # Infrastructure event handlers
    └── AuthenticationCacheInvalidationHandler.ts
```

**Responsibilities:**
- Implement repository interfaces
- Handle external APIs (Dataverse, Power Platform)
- Manage authentication (MSAL)
- Map between domain entities and persistence DTOs
- Handle VS Code-specific concerns

**Non-responsibilities:**
- Business logic (domain concern)
- Orchestration (application concern)
- UI rendering (presentation concern)

**Example: Domain Mapper**
```typescript
// src/features/environmentSetup/infrastructure/mappers/EnvironmentDomainMapper.ts
export class EnvironmentDomainMapper {
    /**
     * Map persistence DTO to domain entity
     */
    public toDomain(dto: EnvironmentConnectionDto): Environment {
        return new Environment(
            new EnvironmentId(dto.id),
            new EnvironmentName(dto.name),
            new DataverseUrl(dto.dataverseUrl),
            new TenantId(dto.tenantId),
            new AuthenticationMethod(dto.authenticationMethod),
            new ClientId(dto.publicClientId),
            dto.isActive,
            dto.lastUsed ? new Date(dto.lastUsed) : undefined,
            dto.powerPlatformEnvironmentId,
            dto.clientId ? new ClientId(dto.clientId) : undefined,
            dto.username
        );
    }

    /**
     * Map domain entity to persistence DTO
     */
    public toPersistence(environment: Environment): EnvironmentConnectionDto {
        return {
            id: environment.getId().getValue(),
            name: environment.getName().getValue(),
            dataverseUrl: environment.getDataverseUrl().getValue(),
            tenantId: environment.getTenantId().getValue(),
            authenticationMethod: environment.getAuthenticationMethod().getType(),
            publicClientId: environment.getPublicClientId().getValue(),
            isActive: environment.getIsActive(),
            lastUsed: environment.getLastUsed()?.toISOString(),
            powerPlatformEnvironmentId: environment.getPowerPlatformEnvironmentId(),
            clientId: environment.getClientId()?.getValue(),
            username: environment.getUsername()
        };
    }
}
```

---

### Presentation Layer (UI)

**Location:** `src/features/{feature}/presentation/`

**Structure:**
```
presentation/
└── panels/             # VS Code webview panels
    └── EnvironmentSetupPanel.ts
```

**Responsibilities:**
- Handle user interactions
- Call use cases
- Render UI (webview HTML/React)
- Map responses to view models
- Display errors and loading states

**Non-responsibilities:**
- Business logic (domain concern)
- Orchestration (application concern)
- Persistence (infrastructure concern)

**Example: Panel**
```typescript
// src/features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts
export class EnvironmentSetupPanel {
    constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        private readonly loadEnvironmentByIdUseCase: LoadEnvironmentByIdUseCase,
        private readonly saveEnvironmentUseCase: SaveEnvironmentUseCase,
        private readonly deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
        private readonly testConnectionUseCase: TestConnectionUseCase,
        private readonly discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase,
        private readonly validateUniqueNameUseCase: ValidateUniqueNameUseCase,
        private readonly logger: ILogger
    ) {
        this.logger.debug('EnvironmentSetupPanel: Initializing');
        // Setup...
    }

    private async handleSaveEnvironment(message: SaveEnvironmentMessage): Promise<void> {
        this.logger.info('User initiated save environment');

        try {
            // Delegate to use case
            const response = await this.saveEnvironmentUseCase.execute({
                existingEnvironmentId: message.existingEnvironmentId,
                name: message.name,
                dataverseUrl: message.dataverseUrl,
                tenantId: message.tenantId,
                authenticationMethod: message.authenticationMethod,
                publicClientId: message.publicClientId,
                powerPlatformEnvironmentId: message.powerPlatformEnvironmentId,
                clientId: message.clientId,
                clientSecret: message.clientSecret,
                username: message.username,
                password: message.password
            });

            if (response.success) {
                this.logger.info('Environment saved successfully');
                vscode.window.showInformationMessage('Environment saved successfully');
                this.panel.webview.postMessage({
                    command: 'saveSuccess',
                    environmentId: response.environmentId
                });
            } else {
                this.logger.warn('Environment save validation failed', response.errors);
                this.panel.webview.postMessage({
                    command: 'validationErrors',
                    errors: response.errors
                });
            }
        } catch (error) {
            this.logger.error('Failed to save environment', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to save environment: ${message}`);
        }
    }
}
```

---

## 🎯 Decision Framework

### When to Create an Entity vs Value Object?

**Create an Entity when:**
- It has a unique identity (ID)
- Its identity persists over time
- It has a lifecycle (created, updated, deleted)
- Two instances with same data are NOT the same thing

**Example:** Environment (has ID, lifecycle, unique identity)

**Create a Value Object when:**
- It's defined by its attributes, not identity
- It's immutable
- Two instances with same data ARE the same thing
- It encapsulates validation or behavior for a primitive value

**Example:** EnvironmentName, DataverseUrl, TenantId (no identity, immutable, value-based equality)

---

### Where Does This Logic Go?

**Decision tree:**

```
Is it business logic that could change based on domain requirements?
    YES → Domain entity or value object
    NO  → Infrastructure or presentation

Does it involve coordinating multiple entities/repositories?
    YES → Use case (orchestration)
    NO  → Check next question

Does it need data from outside the entity (repository, external state)?
    YES → Domain service (if business logic) or Use case (if orchestration)
    NO  → Entity method

Does it interact with external systems (APIs, file system, database)?
    YES → Infrastructure repository or service
    NO  → Check next question

Is it UI-specific (rendering, user interaction)?
    YES → Presentation panel or component
    NO  → Domain entity or value object
```

**Examples:**

| Logic | Where it belongs | Why |
|-------|------------------|-----|
| Validate environment name length | `EnvironmentName` value object | Business rule, no external data needed |
| Determine if client secret required | `Environment` entity | Business rule based on auth method |
| Check if environment name is unique | `EnvironmentValidationService` | Business logic needing external state |
| Fetch environments from storage | `EnvironmentRepository` | Infrastructure concern |
| Coordinate save with validation | `SaveEnvironmentUseCase` | Orchestration of multiple steps |
| Display save errors to user | `EnvironmentSetupPanel` | UI concern |

---

## ✅ Real-World Examples from Codebase

### Example 1: Environment Entity (Rich Model)

**From:** `src/features/environmentSetup/domain/entities/Environment.ts`

**Demonstrates:**
- Rich domain model with behavior methods
- Value objects for validation
- Business logic in entity
- No infrastructure dependencies

```typescript
export class Environment {
    constructor(
        public readonly id: EnvironmentId,
        private name: EnvironmentName,
        private dataverseUrl: DataverseUrl,
        private tenantId: TenantId,
        private authenticationMethod: AuthenticationMethod,
        private publicClientId: ClientId,
        private isActive: boolean,
        private lastUsed?: Date,
        private powerPlatformEnvironmentId?: string,
        private clientId?: ClientId,
        private username?: string
    ) {
        this.validate();  // Enforce invariants
    }

    // Business logic: Validation
    public validateConfiguration(): ValidationResult {
        const errors: string[] = [];

        if (!this.name.isValid()) {
            errors.push('Name is required');
        }

        if (this.authenticationMethod.requiresTenantId() && !this.tenantId.isValid()) {
            errors.push('Tenant ID is required for Service Principal authentication');
        }

        if (this.authenticationMethod.requiresClientId() && !this.clientId) {
            errors.push('Client ID is required for Service Principal authentication');
        }

        if (this.authenticationMethod.requiresUsername() && !this.username) {
            errors.push('Username is required for Username/Password authentication');
        }

        return new ValidationResult(errors.length === 0, errors);
    }

    // Business logic: Credential requirements
    public requiresClientSecret(): boolean {
        return this.authenticationMethod.isServicePrincipal();
    }

    public requiresPassword(): boolean {
        return this.authenticationMethod.isUsernamePassword();
    }

    // Business logic: Activation state
    public activate(): void {
        this.isActive = true;
        this.lastUsed = new Date();
    }

    public deactivate(): void {
        this.isActive = false;
    }

    // Business logic: Secret key management
    public getClientSecretKey(): string {
        if (!this.clientId) {
            throw new DomainError('Cannot generate client secret key without client ID');
        }
        return `environment.${this.id.getValue()}.clientSecret.${this.clientId.getValue()}`;
    }

    public getPasswordKey(): string {
        if (!this.username) {
            throw new DomainError('Cannot generate password key without username');
        }
        return `environment.${this.id.getValue()}.password.${this.username}`;
    }

    public getOldClientSecretKey(previousClientId?: ClientId): string | null {
        if (!previousClientId) {
            return null;
        }
        return `environment.${this.id.getValue()}.clientSecret.${previousClientId.getValue()}`;
    }

    // ... Type-safe getters
}
```

**Key insights:**
- Entity knows how to validate itself
- Entity knows which credentials it needs
- Entity knows how to construct secret storage keys
- No dependencies on VS Code, storage, or external libraries

---

### Example 2: SaveEnvironmentUseCase (Orchestration)

**From:** `src/features/environmentSetup/application/useCases/SaveEnvironmentUseCase.ts`

**Demonstrates:**
- Use case orchestrates multiple steps
- Delegates all business logic to entities
- Coordinates repositories
- Publishes domain events

```typescript
export class SaveEnvironmentUseCase {
    constructor(
        private readonly repository: IEnvironmentRepository,
        private readonly validationService: EnvironmentValidationService,
        private readonly eventPublisher: IDomainEventPublisher,
        private readonly logger: ILogger
    ) {}

    public async execute(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
        const isUpdate = !!request.existingEnvironmentId;
        this.logger.debug(`SaveEnvironmentUseCase: ${isUpdate ? 'Updating' : 'Creating'} environment`);

        try {
            // Step 1: Load existing environment if updating
            let previousEnvironment: Environment | null = null;
            if (isUpdate) {
                previousEnvironment = await this.repository.getById(
                    new EnvironmentId(request.existingEnvironmentId!)
                );
            }

            // Step 2: Create domain entity (validation in entity constructor)
            const environmentId = isUpdate
                ? new EnvironmentId(request.existingEnvironmentId!)
                : EnvironmentId.generate();

            let environment: Environment;
            try {
                environment = new Environment(
                    environmentId,
                    new EnvironmentName(request.name),
                    new DataverseUrl(request.dataverseUrl),
                    new TenantId(request.tenantId),
                    new AuthenticationMethod(request.authenticationMethod),
                    new ClientId(request.publicClientId),
                    previousEnvironment?.getIsActive() ?? false,
                    previousEnvironment?.getLastUsed(),
                    request.powerPlatformEnvironmentId,
                    request.clientId ? new ClientId(request.clientId) : undefined,
                    request.username
                );
            } catch (error) {
                return {
                    success: false,
                    errors: [error instanceof Error ? error.message : 'Invalid input data']
                };
            }

            // Step 3: Gather validation data from repository
            const isNameUnique = await this.repository.isNameUnique(
                environment.getName(),
                environment.getId()
            );

            // Step 4: Validate using domain service (delegates to entity)
            const validationResult = this.validationService.validateEnvironment(
                environment,
                isNameUnique,
                request.clientSecret,
                request.password
            );

            if (!validationResult.isValid) {
                return {
                    success: false,
                    errors: validationResult.errors
                };
            }

            // Step 5: Save environment
            await this.repository.save(environment);

            // Step 6: Save credentials if provided
            // (Uses entity methods to determine what's needed)
            if (request.clientSecret && environment.requiresClientSecret()) {
                await this.repository.saveClientSecret(
                    environment.getId(),
                    environment.getClientId()!,
                    request.clientSecret
                );
            }

            if (request.password && environment.requiresPassword()) {
                await this.repository.savePassword(
                    environment.getId(),
                    environment.getUsername()!,
                    request.password
                );
            }

            // Step 7: Clean up old secrets (uses entity method)
            const oldSecretKey = environment.getOldClientSecretKey(previousEnvironment?.getClientId());
            if (oldSecretKey) {
                await this.repository.deleteSecret(oldSecretKey);
            }

            // Step 8: Publish domain events
            const event = isUpdate
                ? new EnvironmentUpdated(environment.getId().getValue(), environment.getName().getValue())
                : new EnvironmentCreated(environment.getId().getValue(), environment.getName().getValue());
            this.eventPublisher.publish(event);

            this.logger.info(`Environment ${isUpdate ? 'updated' : 'created'}: ${environment.getName().getValue()}`);

            return {
                success: true,
                environmentId: environment.getId().getValue()
            };
        } catch (error) {
            this.logger.error('SaveEnvironmentUseCase: Failed to save environment', error);
            throw new ApplicationError('Failed to save environment', error);
        }
    }
}
```

**Key insights:**
- Orchestrates 8 steps
- All business logic delegated to entities (`requiresClientSecret()`, `getOldClientSecretKey()`)
- No if/else based on business rules (uses entity methods)
- Coordinates multiple repositories
- Publishes domain events
- Handles errors and logging

---

### Example 3: Environment Repository (Infrastructure)

**From:** `src/features/environmentSetup/infrastructure/repositories/EnvironmentRepository.ts`

**Demonstrates:**
- Implementation of domain interface
- Uses VS Code APIs
- Maps between domain entities and DTOs
- Logging for infrastructure operations

```typescript
export class EnvironmentRepository implements IEnvironmentRepository {
    private static readonly ENVIRONMENTS_KEY = 'environments';

    constructor(
        private readonly globalState: vscode.Memento,
        private readonly secretStorage: vscode.SecretStorage,
        private readonly mapper: EnvironmentDomainMapper,
        private readonly logger: ILogger
    ) {}

    public async getAll(): Promise<Environment[]> {
        this.logger.debug('EnvironmentRepository: Loading all environments');

        const dto = this.globalState.get<EnvironmentConnectionDto[]>(
            EnvironmentRepository.ENVIRONMENTS_KEY,
            []
        );

        return dto.map(d => this.mapper.toDomain(d));
    }

    public async getById(id: EnvironmentId): Promise<Environment> {
        this.logger.debug(`EnvironmentRepository: Loading environment ${id.getValue()}`);

        const environments = await this.getAll();
        const environment = environments.find(e => e.getId().equals(id));

        if (!environment) {
            throw new DomainError(`Environment not found: ${id.getValue()}`);
        }

        return environment;
    }

    public async save(environment: Environment): Promise<void> {
        this.logger.debug(`EnvironmentRepository: Saving environment ${environment.getId().getValue()}`);

        const environments = await this.getAll();
        const existingIndex = environments.findIndex(
            e => e.getId().getValue() === environment.getId().getValue()
        );

        if (existingIndex >= 0) {
            environments[existingIndex] = environment;
        } else {
            environments.push(environment);
        }

        const dto = environments.map(e => this.mapper.toPersistence(e));
        await this.globalState.update(EnvironmentRepository.ENVIRONMENTS_KEY, dto);

        this.logger.info(`Environment saved: ${environment.getName().getValue()}`);
    }

    public async isNameUnique(name: EnvironmentName, excludeId?: EnvironmentId): Promise<boolean> {
        const environments = await this.getAll();

        return !environments.some(env =>
            env.getName().equals(name) &&
            (!excludeId || !env.getId().equals(excludeId))
        );
    }

    public async saveClientSecret(
        environmentId: EnvironmentId,
        clientId: ClientId,
        secret: string
    ): Promise<void> {
        const key = `environment.${environmentId.getValue()}.clientSecret.${clientId.getValue()}`;
        await this.secretStorage.store(key, secret);
        this.logger.debug(`Stored client secret for environment ${environmentId.getValue()}`);
    }

    public async getClientSecret(
        environmentId: EnvironmentId,
        clientId: ClientId
    ): Promise<string | null> {
        const key = `environment.${environmentId.getValue()}.clientSecret.${clientId.getValue()}`;
        return await this.secretStorage.get(key) ?? null;
    }

    public async deleteSecret(key: string): Promise<void> {
        await this.secretStorage.delete(key);
        this.logger.debug(`Deleted secret: ${key}`);
    }
}
```

**Key insights:**
- Implements domain interface
- Uses VS Code APIs (Memento, SecretStorage)
- Maps between domain entities and DTOs
- Logs infrastructure operations
- Domain doesn't know about VS Code

---

## 🚨 Common Mistakes

### Mistake 1: Business Logic in Use Case

❌ **Bad:**
```typescript
export class SaveEnvironmentUseCase {
    public async execute(request: SaveEnvironmentRequest): Promise<void> {
        // ❌ Business logic in use case
        if (request.authMethod === 'ServicePrincipal' && !request.clientId) {
            throw new Error('Client ID required for Service Principal');
        }

        if (!request.name || request.name.trim().length === 0) {
            throw new Error('Name is required');
        }

        if (request.name.length > 100) {
            throw new Error('Name too long');
        }

        await this.repository.save(request);
    }
}
```

✅ **Good:**
```typescript
export class SaveEnvironmentUseCase {
    public async execute(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
        // Orchestration: Create domain entity (validation in entity/value objects)
        try {
            const environment = new Environment(
                EnvironmentId.generate(),
                new EnvironmentName(request.name),  // Validation in value object
                new DataverseUrl(request.dataverseUrl),
                new TenantId(request.tenantId),
                new AuthenticationMethod(request.authMethod),
                new ClientId(request.publicClientId)
            );

            // Delegate validation to domain service
            const isNameUnique = await this.repository.isNameUnique(environment.getName());
            const validationResult = this.validationService.validateEnvironment(
                environment,
                isNameUnique,
                request.clientSecret
            );

            if (!validationResult.isValid) {
                return { success: false, errors: validationResult.errors };
            }

            await this.repository.save(environment);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Invalid data']
            };
        }
    }
}
```

---

### Mistake 2: Anemic Domain Model

❌ **Bad:**
```typescript
export class Environment {
    public id: string;
    public name: string;
    public authMethod: string;
    public clientId?: string;
    public isActive: boolean;
}

// Logic scattered everywhere
if (env.authMethod === 'ServicePrincipal' && !env.clientId) {
    throw new Error('Client ID required');
}
```

✅ **Good:**
```typescript
export class Environment {
    constructor(
        public readonly id: EnvironmentId,
        private name: EnvironmentName,
        private authenticationMethod: AuthenticationMethod,
        private clientId?: ClientId
    ) {
        this.validate();
    }

    // Business logic in entity
    public requiresClientId(): boolean {
        return this.authenticationMethod.requiresClientId();
    }

    public validateConfiguration(): ValidationResult {
        const errors: string[] = [];

        if (this.requiresClientId() && !this.clientId) {
            errors.push('Client ID is required for Service Principal authentication');
        }

        return new ValidationResult(errors.length === 0, errors);
    }
}
```

---

### Mistake 3: Domain Depending on Infrastructure

❌ **Bad:**
```typescript
// In domain entity
import * as vscode from 'vscode';
import { ILogger } from '../../../infrastructure/logging/ILogger';

export class Environment {
    constructor(
        private logger: ILogger  // ❌ Infrastructure dependency!
    ) {}

    public save(): void {
        this.logger.info('Saving environment');  // ❌ Infrastructure concern in domain
        vscode.window.showInformationMessage('Saved');  // ❌ VS Code API in domain
    }
}
```

✅ **Good:**
```typescript
// Domain entity has zero dependencies
export class Environment {
    constructor(
        public readonly id: EnvironmentId,
        private name: EnvironmentName
    ) {
        this.validate();
    }

    // Pure business logic, no infrastructure
    public validateConfiguration(): ValidationResult {
        const errors: string[] = [];

        if (!this.name.isValid()) {
            errors.push('Name is required');
        }

        return new ValidationResult(errors.length === 0, errors);
    }
}

// Use case handles logging and UI
export class SaveEnvironmentUseCase {
    constructor(
        private readonly repository: IEnvironmentRepository,
        private readonly logger: ILogger
    ) {}

    public async execute(request: SaveEnvironmentRequest): Promise<void> {
        const environment = new Environment(/* ... */);

        this.logger.info('Saving environment');
        await this.repository.save(environment);
        vscode.window.showInformationMessage('Saved');
    }
}
```

---

### Mistake 4: Repository Interface in Infrastructure

❌ **Bad:**
```typescript
// src/features/environmentSetup/infrastructure/interfaces/IEnvironmentRepository.ts
export interface IEnvironmentRepository {
    save(environment: Environment): Promise<void>;
}

// Domain imports from infrastructure!
import { IEnvironmentRepository } from '../../infrastructure/interfaces/IEnvironmentRepository';
```

✅ **Good:**
```typescript
// src/features/environmentSetup/domain/interfaces/IEnvironmentRepository.ts
export interface IEnvironmentRepository {
    save(environment: Environment): Promise<void>;
}

// Infrastructure imports from domain (dependency inversion)
import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { Environment } from '../../domain/entities/Environment';

export class EnvironmentRepository implements IEnvironmentRepository {
    public async save(environment: Environment): Promise<void> {
        // Implementation...
    }
}
```

---

### Mistake 5: Using Primitives Instead of Value Objects

❌ **Bad:**
```typescript
export class Environment {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly dataverseUrl: string
    ) {}
}

// Validation scattered everywhere
if (!name || name.length === 0) {
    throw new Error('Name required');
}
if (!url.startsWith('https://')) {
    throw new Error('URL must be HTTPS');
}
```

✅ **Good:**
```typescript
export class Environment {
    constructor(
        public readonly id: EnvironmentId,
        private name: EnvironmentName,  // Value object validates on construction
        private dataverseUrl: DataverseUrl  // Value object validates on construction
    ) {
        // No validation needed - value objects already validated
    }
}

// Create environment - throws if validation fails
const environment = new Environment(
    EnvironmentId.generate(),
    new EnvironmentName(userInput),  // Validates name
    new DataverseUrl(urlInput)  // Validates URL
);
```

---

## 🔗 See Also

- [CLAUDE.md](../../CLAUDE.md) - Essential rules and quick reference for AI assistants
- [LOGGING_GUIDE.md](LOGGING_GUIDE.md) - Logging architecture and layer boundaries
- [data-panel-suite-design.md](../design/data-panel-suite-design.md) - Comprehensive design applying these patterns
- [DOCUMENTATION_STYLE_GUIDE.md](../DOCUMENTATION_STYLE_GUIDE.md) - How to maintain documentation
