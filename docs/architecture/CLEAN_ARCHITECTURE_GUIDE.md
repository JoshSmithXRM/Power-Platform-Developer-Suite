# Clean Architecture Guide for Power Platform Developer Suite

**Practical guide to implementing Clean Architecture patterns in this codebase.**

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
                // ... more value objects
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
            return { success: false, errors: validationResult.errors };
        }

        // Orchestration: Save to repository
        await this.repository.save(environment);

        // Orchestration: Save credentials if provided
        if (request.clientSecret && environment.requiresClientSecret()) {
            await this.repository.saveClientSecret(environment.getId(), environment.getClientId()!, request.clientSecret);
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

        return { success: true, environmentId: environment.getId().getValue() };
    }
}
```

**Key patterns:**
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

**Benefits:**
1. Validation happens once (at construction)
2. Invalid state is impossible
3. Business logic encapsulated in value object
4. Type safety (can't mix up EnvironmentId and TenantId)
5. Reusable across entities

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

## 🔗 See Also

- [CLEAN_ARCHITECTURE_EXAMPLES.md](CLEAN_ARCHITECTURE_EXAMPLES.md) - Real-world code examples from this codebase
- [CLEAN_ARCHITECTURE_PATTERNS.md](CLEAN_ARCHITECTURE_PATTERNS.md) - Common mistakes and anti-patterns to avoid
- [CLAUDE.md](../../CLAUDE.md) - Essential rules and quick reference
- [LOGGING_GUIDE.md](LOGGING_GUIDE.md) - Logging architecture and layer boundaries
- [DOCUMENTATION_STYLE_GUIDE.md](../DOCUMENTATION_STYLE_GUIDE.md) - How to maintain documentation
