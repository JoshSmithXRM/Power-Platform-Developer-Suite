# Clean Architecture Examples

**Real-world code examples from the Power Platform Developer Suite codebase demonstrating Clean Architecture patterns.**

**See also:** [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md) - Core principles and patterns

---

## 🏗️ Layer Architecture Examples

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

## ✅ Complete Examples from Production Code

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

## 🔗 See Also

- [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md) - Core principles and decision framework
- [CLEAN_ARCHITECTURE_PATTERNS.md](CLEAN_ARCHITECTURE_PATTERNS.md) - Common mistakes and anti-patterns
- [LOGGING_GUIDE.md](LOGGING_GUIDE.md) - Logging by layer
- [CLAUDE.md](../../CLAUDE.md) - Essential rules
