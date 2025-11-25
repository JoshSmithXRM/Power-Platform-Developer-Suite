# Clean Architecture Patterns & Anti-Patterns

**Common mistakes to avoid and patterns to follow when implementing Clean Architecture.**

**See also:**
- [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md) - Core principles
- [CLEAN_ARCHITECTURE_EXAMPLES.md](CLEAN_ARCHITECTURE_EXAMPLES.md) - Production code examples

---

## 🚨 Common Mistakes

### Mistake 1: Business Logic in Use Case

**The Problem:** Use cases contain if/else business logic instead of delegating to entities.

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

**Why this matters:**
- Business logic in use cases gets duplicated across multiple use cases
- Hard to test business rules in isolation
- Logic scattered across layers instead of centralized in domain

---

### Mistake 2: Anemic Domain Model

**The Problem:** Entities are just data bags with no behavior methods.

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

// In another file
if (env.authMethod === 'ServicePrincipal') {
    await saveClientSecret(env.clientId);
}

// In yet another file
const isActive = env.authMethod === 'ServicePrincipal' ? checkServicePrincipal() : checkUserAuth();
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

// Usage - clean and centralized
if (environment.requiresClientId()) {
    await repository.saveClientSecret(environment.getClientId()!);
}
```

**Why this matters:**
- Business rules are centralized and reusable
- Easy to test (test the entity, not scattered logic)
- Self-documenting (entity methods describe behavior)

---

### Mistake 3: Domain Depending on Infrastructure

**The Problem:** Domain entities import from infrastructure or use external libraries.

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

**Why this matters:**
- Domain becomes testable in isolation (no mocks for VS Code APIs)
- Domain can be reused in different contexts (CLI, web, desktop)
- Clear separation of concerns

---

### Mistake 4: Repository Interface in Infrastructure

**The Problem:** Repository interface lives in infrastructure, so domain imports from outer layer.

❌ **Bad:**
```typescript
// src/features/environmentSetup/infrastructure/interfaces/IEnvironmentRepository.ts
export interface IEnvironmentRepository {
    save(environment: Environment): Promise<void>;
}

// Domain imports from infrastructure!
import { IEnvironmentRepository } from '../../infrastructure/interfaces/IEnvironmentRepository';
```

**Dependency direction:** Domain → Infrastructure (WRONG!)

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

**Dependency direction:** Infrastructure → Domain (CORRECT!)

**Why this matters:**
- Dependency Inversion Principle enforced
- Domain doesn't depend on outer layers
- Easy to swap implementations (different storage, different APIs)

---

### Mistake 5: Using Primitives Instead of Value Objects

**The Problem:** Entities use primitive types (string, number) instead of value objects.

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
if (name.length > 100) {
    throw new Error('Name too long');
}
if (!url.startsWith('https://')) {
    throw new Error('URL must be HTTPS');
}

// Risk of mixing up values
const envId = '123';
const tenantId = '456';
repository.save(tenantId);  // ❌ Oops! Wrong ID, TypeScript can't catch this
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

// Type safety prevents mixing IDs
const envId = new EnvironmentId('123');
const tenantId = new TenantId('456');
repository.save(tenantId);  // ✅ Compile error! Wrong type
```

**Why this matters:**
- Validation happens once at construction (no scattered validation)
- Type safety beyond primitives (can't mix up EnvironmentId and TenantId)
- Encapsulated business logic (URL parsing, GUID validation, etc.)
- Invalid state is impossible

---

### Mistake 6: Primitive Obsession in Domain

**The Problem:** Passing primitives through multiple layers instead of domain objects.

❌ **Bad:**
```typescript
// Use case
const result = await this.repository.save(
    environmentId.getValue(),  // Unwrapping to primitive
    name.getValue(),
    url.getValue()
);

// Repository
public async save(id: string, name: string, url: string): Promise<void> {
    // Have to re-validate primitives or trust they're valid
    if (!id || !name || !url) {
        throw new Error('Invalid data');
    }
    // ...
}
```

✅ **Good:**
```typescript
// Use case
const environment = new Environment(environmentId, name, url);
await this.repository.save(environment);  // Pass domain object

// Repository
public async save(environment: Environment): Promise<void> {
    // No validation needed - environment is already valid
    const dto = this.mapper.toPersistence(environment);
    await this.globalState.update(ENVIRONMENTS_KEY, dto);
}
```

**Why this matters:**
- No repeated validation at layer boundaries
- Type safety throughout the application
- Domain objects carry business meaning, not just data

---

### Mistake 7: Mapping in Wrong Layer

**The Problem:** Domain entities know how to map themselves to DTOs or presentation formats.

❌ **Bad:**
```typescript
// In domain entity
export class Environment {
    // ❌ Domain entity knows about persistence format
    public toDto(): EnvironmentConnectionDto {
        return {
            id: this.id.getValue(),
            name: this.name.getValue(),
            dataverseUrl: this.dataverseUrl.getValue()
        };
    }

    // ❌ Domain entity knows about presentation format
    public toViewModel(): EnvironmentViewModel {
        return {
            id: this.id.getValue(),
            displayName: this.name.getValue(),
            status: this.isActive ? 'Active' : 'Inactive'
        };
    }
}
```

✅ **Good:**
```typescript
// Domain entity - pure business logic
export class Environment {
    // Only type-safe getters
    public getId(): EnvironmentId {
        return this.id;
    }

    public getName(): EnvironmentName {
        return this.name;
    }

    public getIsActive(): boolean {
        return this.isActive;
    }
}

// Infrastructure mapper - maps between domain and persistence
export class EnvironmentDomainMapper {
    public toPersistence(environment: Environment): EnvironmentConnectionDto {
        return {
            id: environment.getId().getValue(),
            name: environment.getName().getValue(),
            dataverseUrl: environment.getDataverseUrl().getValue()
        };
    }
}

// Application mapper - maps between domain and presentation
export class EnvironmentViewModelMapper {
    public toViewModel(environment: Environment): EnvironmentViewModel {
        return {
            id: environment.getId().getValue(),
            displayName: environment.getName().getValue(),
            status: environment.getIsActive() ? 'Active' : 'Inactive'
        };
    }
}
```

**Why this matters:**
- Domain doesn't know about external formats (DTO structure, UI requirements)
- Mappers can be changed without touching domain
- Clear layer boundaries

---

### Mistake 8: God Object Use Case

**The Problem:** Use case does too much - validation, orchestration, formatting, logging, etc.

❌ **Bad:**
```typescript
export class SaveEnvironmentUseCase {
    public async execute(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
        // ❌ Validation logic
        if (!request.name || request.name.length === 0) {
            return { success: false, errors: ['Name is required'] };
        }
        if (request.name.length > 100) {
            return { success: false, errors: ['Name too long'] };
        }
        if (request.authMethod === 'ServicePrincipal' && !request.clientId) {
            return { success: false, errors: ['Client ID required'] };
        }

        // ❌ Business logic
        const isActive = request.isActive ?? false;
        const lastUsed = isActive ? new Date() : undefined;

        // ❌ Formatting logic
        const displayName = request.name.trim().toUpperCase();

        // ❌ Multiple repository calls (should be in entity or domain service)
        await this.repository.save(request);
        await this.repository.saveClientSecret(request.clientId, request.clientSecret);
        await this.repository.activateEnvironment(request.id);

        // ❌ Complex logging
        this.logger.info(`Saved environment: ${displayName}`);
        this.logger.debug(`Active: ${isActive}, Last Used: ${lastUsed}`);

        return { success: true };
    }
}
```

✅ **Good:**
```typescript
export class SaveEnvironmentUseCase {
    public async execute(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
        // Orchestration only - create domain entity
        let environment: Environment;
        try {
            environment = new Environment(
                EnvironmentId.generate(),
                new EnvironmentName(request.name),  // Validation in value object
                new DataverseUrl(request.dataverseUrl),
                // ... more value objects
            );
        } catch (error) {
            return { success: false, errors: [error.message] };
        }

        // Orchestration - validate with domain service
        const validationResult = this.validationService.validateEnvironment(environment);
        if (!validationResult.isValid) {
            return { success: false, errors: validationResult.errors };
        }

        // Orchestration - save
        await this.repository.save(environment);

        // Orchestration - save credentials (entity knows what's needed)
        if (environment.requiresClientSecret()) {
            await this.repository.saveClientSecret(
                environment.getId(),
                environment.getClientId()!,
                request.clientSecret
            );
        }

        // Simple logging
        this.logger.info(`Environment saved: ${environment.getName().getValue()}`);

        return { success: true, environmentId: environment.getId().getValue() };
    }
}
```

**Why this matters:**
- Use case focuses on orchestration, not logic
- Business logic is testable in isolation (in entities)
- Use case is thin and easy to understand

---

### Mistake 9: Tight Coupling Between Features

**The Problem:** One feature directly imports and uses another feature's domain entities or use cases.

❌ **Bad:**
```typescript
// In MetadataBrowser feature
import { Environment } from '../../environmentSetup/domain/entities/Environment';
import { SaveEnvironmentUseCase } from '../../environmentSetup/application/useCases/SaveEnvironmentUseCase';

export class MetadataBrowserPanel {
    constructor(
        private readonly saveEnvironmentUseCase: SaveEnvironmentUseCase  // ❌ Feature coupling
    ) {}

    public async handleSaveMetadata(): Promise<void> {
        // ❌ Using another feature's domain entity
        const env = new Environment(...);
        await this.saveEnvironmentUseCase.execute(...);
    }
}
```

✅ **Good:**
```typescript
// Shared application service or event-based communication
export class EnvironmentService {
    constructor(
        private readonly saveEnvironmentUseCase: SaveEnvironmentUseCase
    ) {}

    public async saveEnvironment(data: EnvironmentData): Promise<void> {
        await this.saveEnvironmentUseCase.execute(data);
    }
}

// MetadataBrowser uses shared service
export class MetadataBrowserPanel {
    constructor(
        private readonly environmentService: EnvironmentService  // ✅ Shared service
    ) {}

    public async handleSaveMetadata(): Promise<void> {
        // Uses abstraction, not direct feature coupling
        await this.environmentService.saveEnvironment(...);
    }
}
```

**Better alternative - Domain Events:**
```typescript
// MetadataBrowser publishes event
this.eventPublisher.publish(new EnvironmentChangeRequested(envId, changes));

// EnvironmentSetup listens for event
export class EnvironmentChangeRequestedHandler {
    constructor(
        private readonly saveEnvironmentUseCase: SaveEnvironmentUseCase
    ) {}

    public async handle(event: EnvironmentChangeRequested): Promise<void> {
        await this.saveEnvironmentUseCase.execute({
            id: event.environmentId,
            ...event.changes
        });
    }
}
```

**Why this matters:**
- Features remain independent and testable
- Can deploy features separately
- No circular dependencies

---

## ✅ Recommended Patterns

### Pattern 1: Static Factory Methods for Complex Construction

**When to use:** Entity has many parameters or complex construction logic.

✅ **Good:**
```typescript
export class PluginTrace {
    private constructor(
        private readonly id: string,
        private readonly pluginName: string,
        // ... 24 more parameters
    ) {}

    // Static factory with named parameters
    static create(params: {
        id: string;
        pluginName: string;
        entityName: string | null;
        messageName: string;
        // ... more parameters
    }): PluginTrace {
        // Validation before construction
        validateRequiredField('PluginTrace', 'id', params.id);
        validateRequiredField('PluginTrace', 'pluginName', params.pluginName);

        // Apply defaults
        const stage = params.stage ?? 0;
        const depth = params.depth ?? 1;

        // Normalize values
        const executionMode = ExecutionMode.from(params.mode);

        return new PluginTrace(
            params.id,
            params.pluginName,
            // ... more parameters
        );
    }
}
```

**Benefits:**
- Clear intent with named constructor (`.create()`)
- Validation before construction
- Defaults applied in one place
- Type narrowing for complex types

---

### Pattern 2: Domain Services for Cross-Entity Logic

**When to use:** Business logic involves multiple entities or needs external state.

✅ **Good:**
```typescript
// Domain service
export class EnvironmentValidationService {
    /**
     * Validate environment with external state
     * WHY: Uniqueness check requires querying other environments
     */
    public validateEnvironment(
        environment: Environment,
        isNameUnique: boolean,
        clientSecret?: string
    ): ValidationResult {
        const errors: string[] = [];

        // Delegate to entity for internal validation
        const configResult = environment.validateConfiguration();
        if (!configResult.isValid) {
            errors.push(...configResult.errors);
        }

        // Business rule requiring external state
        if (!isNameUnique) {
            errors.push('Environment name must be unique');
        }

        // Business rule for credentials
        if (environment.requiresClientSecret() && !clientSecret) {
            errors.push('Client Secret is required');
        }

        return new ValidationResult(errors.length === 0, errors);
    }
}
```

**Why this works:**
- Domain logic stays in domain layer
- Entity handles internal validation
- Domain service handles cross-entity or external-state validation
- Still testable (mock the external state parameter)

---

### Pattern 3: Value Object Collections

**When to use:** Need to work with multiple value objects as a group.

✅ **Good:**
```typescript
export class EnvironmentCollection {
    private constructor(
        private readonly environments: readonly Environment[]
    ) {}

    static create(environments: Environment[]): EnvironmentCollection {
        return new EnvironmentCollection(environments);
    }

    // Business logic for collection
    public findActiveEnvironment(): Environment | null {
        return this.environments.find(env => env.getIsActive()) ?? null;
    }

    public count(): number {
        return this.environments.length;
    }

    public hasEnvironmentWithName(name: EnvironmentName): boolean {
        return this.environments.some(env => env.getName().equals(name));
    }

    // Returns new collection (immutable)
    public activateEnvironment(id: EnvironmentId): EnvironmentCollection {
        const updated = this.environments.map(env => {
            if (env.getId().equals(id)) {
                env.activate();
                return env;
            } else {
                env.deactivate();
                return env;
            }
        });

        return new EnvironmentCollection(updated);
    }
}
```

**Benefits:**
- Collection behavior is encapsulated
- Immutable (returns new collection)
- Business rules for collections in one place

---

## 🔗 See Also

- [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md) - Core principles and decision framework
- [CLEAN_ARCHITECTURE_EXAMPLES.md](CLEAN_ARCHITECTURE_EXAMPLES.md) - Production code examples
- [CLAUDE.md](../../CLAUDE.md) - Essential rules for AI assistants
- [LOGGING_GUIDE.md](LOGGING_GUIDE.md) - Logging by layer
