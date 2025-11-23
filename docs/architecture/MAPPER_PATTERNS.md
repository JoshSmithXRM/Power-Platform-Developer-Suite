# Mapper Patterns

**Master guide for mapper design and implementation in the Power Platform Developer Suite.**

Mappers are pure transformation layers between domain entities and ViewModels/DTOs. This guide shows when to use them, how to handle sorting correctly, and common pitfalls to avoid.

---

## Quick Reference

### When to Use Mappers

✅ **DO use mappers when:**
- Transforming domain entities to ViewModels (presentation layer)
- Transforming domain entities to DTOs (file export, API responses)
- Transforming infrastructure DTOs to domain entities (repository layer)
- Converting between domain vocabulary and external formats

❌ **DON'T use mappers for:**
- Business logic → Use domain services or entities
- Orchestration → Use cases (application layer)
- Data validation → Value objects or entities
- Filtering/querying → Use domain services or repositories

### Mapper Responsibilities

**✅ Mappers ONLY:**
- Transform data structure (entity → ViewModel)
- Format values for display (dates, numbers, booleans)
- Escape HTML for security (XSS prevention)
- Handle null/undefined values

**❌ Mappers NEVER:**
- Contain business logic
- Make repository calls
- Perform validation (delegate to domain)
- Sort ViewModels after mapping

### Sorting Pattern (CRITICAL)

```typescript
// ✅ CORRECT: Sort domain entities, then map to ViewModels
public toViewModels(entities: Entity[], shouldSort = false): ViewModel[] {
    const entitiesToMap = shouldSort ? this.collectionService.sort(entities) : entities;
    return entitiesToMap.map(e => this.toViewModel(e));
}

// ❌ WRONG: Map first, then sort ViewModels
public toViewModels(entities: Entity[]): ViewModel[] {
    const viewModels = entities.map(e => this.toViewModel(e));
    return viewModels.sort((a, b) => ...); // ❌ Business logic in mapper!
}
```

### Anti-Patterns to Avoid

❌ **Business logic in mappers** (sorting, filtering, validation)
❌ **ViewModels sorting themselves** (ViewModels are DTOs, not entities)
❌ **Use cases sorting ViewModels** (should sort domain entities, not ViewModels)
❌ **Multiple transformation paths** (one canonical way to map)

---

## Table of Contents

1. [Mapper Responsibilities](#mapper-responsibilities-1)
2. [Sorting Decision Tree](#sorting-decision-tree)
3. [ViewModel Mapper Pattern](#viewmodel-mapper-pattern)
4. [Deployment Settings Mapper Pattern](#deployment-settings-mapper-pattern)
5. [Infrastructure Mapper Pattern](#infrastructure-mapper-pattern)
6. [Production Examples](#production-examples)
7. [Anti-Patterns](#anti-patterns)
8. [Testing Mappers](#testing-mappers)

---

## Mapper Responsibilities

### Transform Only

**✅ Correct - Pure Transformation:**
```typescript
export class EnvironmentListViewModelMapper {
    public toViewModel(environment: Environment): EnvironmentListViewModel {
        const lastUsed = environment.getLastUsed();

        // ✅ Pure transformation - just mapping properties
        return {
            id: environment.getId().getValue(),
            name: environment.getName().getValue(),
            dataverseUrl: environment.getDataverseUrl().getValue(),
            authenticationMethod: environment.getAuthenticationMethod().toString(),
            isActive: environment.getIsActive(),
            lastUsedDisplay: RelativeTimeFormatter.formatRelativeTime(lastUsed), // ✅ Formatting
            statusBadge: environment.getIsActive() ? 'active' : 'inactive', // ✅ Simple logic
            ...(lastUsed !== undefined && { lastUsedTimestamp: lastUsed.getTime() })
        };
    }
}
```

**❌ Wrong - Business Logic:**
```typescript
// ❌ Business logic in mapper
export class EnvironmentListViewModelMapper {
    public toViewModel(environment: Environment): EnvironmentListViewModel {
        // ❌ Validation logic belongs in entity or domain service
        if (!environment.getName().getValue()) {
            throw new Error('Name is required');
        }

        // ❌ Complex business rules belong in entity
        const isExpired = environment.getLastUsed()
            && (Date.now() - environment.getLastUsed()!.getTime()) > 30 * 24 * 60 * 60 * 1000;

        return {
            id: environment.getId().getValue(),
            name: environment.getName().getValue(),
            // ... more properties
            isExpired // ❌ Business logic
        };
    }
}
```

---

## Sorting Decision Tree

### The Correct Flow

```
┌─────────────────────────────────────────────────────────┐
│ User requests data                                      │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Use Case: Orchestrates (no sorting)                    │
│ - Calls repository to get domain entities               │
│ - NO sorting logic here                                 │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Domain Collection Service: Sorts (if needed)            │
│ - Business rules for sort order                         │
│ - Returns sorted domain entities                        │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Mapper: Transforms (takes shouldSort flag)             │
│ - If shouldSort, delegates to collection service        │
│ - Transforms domain entities → ViewModels               │
│ - NO sorting of ViewModels                              │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ ViewModel: Immutable DTO (already sorted)               │
│ - Plain object, no methods                              │
│ - NO sorting logic in ViewModel                         │
└─────────────────────────────────────────────────────────┘
```

### Decision Matrix: Where Does Sorting Happen?

| Layer | Should Sort? | Why? |
|-------|-------------|------|
| **Use Case** | ❌ **NO** | Orchestration only, no business logic |
| **Domain Service** | ✅ **YES** | Business rules for sort order |
| **Mapper** | ⚠️ **Delegates** | Calls domain service if shouldSort=true |
| **ViewModel** | ❌ **NO** | DTOs are immutable, no methods |
| **Panel/UI** | ❌ **NO** | Already sorted, just render |

---

## ViewModel Mapper Pattern

### Pattern 1: Mapper with Domain Service Delegation (Preferred)

**When to use:** Complex sorting logic, business-specific sort order

```typescript
import { Solution } from '../../domain/entities/Solution';
import { SolutionViewModel } from '../viewModels/SolutionViewModel';
import type { SolutionCollectionService } from '../../domain/services/SolutionCollectionService';

/**
 * Maps Solution domain entities to SolutionViewModel presentation DTOs.
 */
export class SolutionViewModelMapper {
    constructor(private readonly collectionService: SolutionCollectionService) {}

    /**
     * Maps a single Solution entity to a ViewModel.
     */
    toViewModel(solution: Solution): SolutionViewModel {
        return {
            id: solution.id,
            uniqueName: solution.uniqueName,
            friendlyName: solution.friendlyName,
            version: solution.version,
            isManaged: solution.isManaged ? 'Managed' : 'Unmanaged',
            publisherName: solution.publisherName,
            installedOn: DateFormatter.formatDate(solution.installedOn),
            description: solution.description,
            modifiedOn: DateFormatter.formatDate(solution.modifiedOn),
            isVisible: solution.isVisible ? 'Yes' : 'No'
        };
    }

    /**
     * Maps an array of Solution entities to ViewModels.
     *
     * @param solutions - Array of Solution entities
     * @param shouldSort - If true, sorts solutions (Default first, then alphabetically)
     * @returns Array of view models
     */
    toViewModels(solutions: Solution[], shouldSort = false): SolutionViewModel[] {
        // ✅ CORRECT: Sort entities first (delegate to domain service)
        const solutionsToMap = shouldSort ? this.collectionService.sort(solutions) : solutions;

        // ✅ CORRECT: Then map to ViewModels
        return solutionsToMap.map(solution => this.toViewModel(solution));
    }
}
```

**Why this pattern?**
- ✅ Business logic (sorting) stays in domain layer
- ✅ Mapper remains pure transformation
- ✅ Easy to test (mock domain service)
- ✅ Reusable sorting logic (use in multiple mappers)

---

### Pattern 2: Mapper with Inline Sorting (Acceptable for Simple Cases)

**When to use:** Simple presentation sorting, no complex business rules

```typescript
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentListViewModel } from '../viewModels/EnvironmentListViewModel';

export class EnvironmentListViewModelMapper {
    /**
     * Maps domain entities to view models.
     *
     * @param environments - Domain entities to transform
     * @param shouldSort - If true, sorts by last used (most recent first), then by name
     * @returns Array of view models
     */
    public toViewModels(environments: Environment[], shouldSort = false): EnvironmentListViewModel[] {
        const viewModels = environments.map(env => this.toViewModel(env));

        // ⚠️ ACCEPTABLE: Simple presentation sorting (last used, then name)
        // This is presentation logic, not business logic
        return shouldSort ? this.sortByLastUsedThenName(viewModels) : viewModels;
    }

    public toViewModel(environment: Environment): EnvironmentListViewModel {
        const lastUsed = environment.getLastUsed();
        return {
            id: environment.getId().getValue(),
            name: environment.getName().getValue(),
            dataverseUrl: environment.getDataverseUrl().getValue(),
            authenticationMethod: environment.getAuthenticationMethod().toString(),
            isActive: environment.getIsActive(),
            lastUsedDisplay: RelativeTimeFormatter.formatRelativeTime(lastUsed),
            statusBadge: environment.getIsActive() ? 'active' : 'inactive',
            ...(lastUsed !== undefined && { lastUsedTimestamp: lastUsed.getTime() })
        };
    }

    /**
     * Sorts view models by last used (most recent first), then alphabetically by name.
     * This is a presentation concern - different views may want different sort orders.
     */
    private sortByLastUsedThenName(viewModels: EnvironmentListViewModel[]): EnvironmentListViewModel[] {
        return viewModels.sort((a, b) => {
            // Both have last used - most recent first
            if (a.lastUsedTimestamp && b.lastUsedTimestamp) {
                return b.lastUsedTimestamp - a.lastUsedTimestamp;
            }
            // Only 'a' has last used - 'a' comes first
            if (a.lastUsedTimestamp) return -1;
            // Only 'b' has last used - 'b' comes first
            if (b.lastUsedTimestamp) return 1;
            // Neither has last used - sort alphabetically by name
            return a.name.localeCompare(b.name);
        });
    }
}
```

**When is inline sorting acceptable?**
- ✅ Simple UI-specific sorting (most recent first, alphabetical)
- ✅ No complex business rules
- ✅ Sorting logic stays private in mapper
- ❌ NOT for business-specific sorting (Default solution first, etc.)

---

## Deployment Settings Mapper Pattern

**Purpose:** Transform domain entities to deployment settings JSON format (for file export)

```typescript
import type { EnvironmentVariable } from '../../domain/entities/EnvironmentVariable';
import type { EnvironmentVariableEntry } from '../../../../shared/domain/entities/DeploymentSettings';

/**
 * Maps EnvironmentVariable domain entities to deployment settings entry format.
 *
 * Responsibilities:
 * - Transform domain entities to deployment settings JSON structure
 * - Handle null values by converting to empty strings for valid JSON
 * - Use effective value (current value if set, otherwise default value)
 */
export class EnvironmentVariableToDeploymentSettingsMapper {
    /**
     * Maps a single environment variable to deployment settings entry format.
     */
    toDeploymentSettingsEntry(environmentVariable: EnvironmentVariable): EnvironmentVariableEntry {
        return {
            SchemaName: environmentVariable.schemaName,
            Value: environmentVariable.getEffectiveValue() ?? '' // ✅ Delegate to entity
        };
    }

    /**
     * Maps an array of environment variables to deployment settings entries.
     *
     * NOTE: No sorting here - caller sorts domain entities before passing them.
     */
    toDeploymentSettingsEntries(environmentVariables: EnvironmentVariable[]): EnvironmentVariableEntry[] {
        return environmentVariables.map(ev => this.toDeploymentSettingsEntry(ev));
    }
}
```

**Key points:**
- ✅ No sorting - assumes caller sorted domain entities
- ✅ Delegates logic to entity (`getEffectiveValue()`)
- ✅ Handles null conversion for JSON format
- ✅ Pure transformation

---

## Infrastructure Mapper Pattern

**Purpose:** Transform infrastructure DTOs to domain entities (repository layer)

```typescript
import type { EntityMetadataDto } from '../dtos/EntityMetadataDto';
import { EntityMetadata } from '../../domain/entities/EntityMetadata';
import { SchemaName } from '../../domain/valueObjects/SchemaName';
import { LogicalName } from '../../domain/valueObjects/LogicalName';

/**
 * Maps infrastructure DTOs from Dataverse API to domain entities.
 *
 * Responsibilities:
 * - Transform API response DTOs to domain entities
 * - Extract nested data from complex DTO structures
 * - Handle API-specific edge cases (null labels, missing properties)
 * - Create value objects from primitive values
 */
export class EntityMetadataMapper {
    /**
     * Maps Dataverse API DTO to domain entity.
     */
    toDomain(dto: EntityMetadataDto): EntityMetadata {
        // ✅ Extract and transform
        const schemaName = new SchemaName(dto.SchemaName);
        const logicalName = new LogicalName(dto.LogicalName);
        const displayName = this.extractLabel(dto.DisplayName);

        // ✅ Delegate complex extraction to private methods
        const attributes = this.mapAttributes(dto.Attributes);
        const relationships = this.mapRelationships(dto.ManyToManyRelationships);

        // ✅ Create domain entity
        return EntityMetadata.create(
            schemaName,
            logicalName,
            displayName,
            attributes,
            relationships
        );
    }

    /**
     * Extracts localized label from complex DTO structure.
     * Handles API edge case where label can be null or missing.
     */
    private extractLabel(labelDto: { LocalizedLabels?: Array<{ Label: string }> } | null): string {
        return labelDto?.LocalizedLabels?.[0]?.Label ?? '';
    }

    private mapAttributes(attributeDtos: AttributeMetadataDto[]): AttributeMetadata[] {
        return attributeDtos.map(dto => this.attributeMapper.toDomain(dto));
    }

    private mapRelationships(relationshipDtos: RelationshipMetadataDto[]): Relationship[] {
        return relationshipDtos.map(dto => this.relationshipMapper.toDomain(dto));
    }
}
```

**Key points:**
- ✅ Handles DTO complexity (nested structures, null labels)
- ✅ Creates value objects from primitive values
- ✅ Delegates to specialized mappers for nested objects
- ✅ No business logic - pure transformation

---

## Production Examples

### Example 1: SolutionViewModelMapper (Domain Service Delegation)

**File**: `src/features/solutionExplorer/application/mappers/SolutionViewModelMapper.ts`

```typescript
import { Solution } from '../../domain/entities/Solution';
import { SolutionViewModel } from '../viewModels/SolutionViewModel';
import type { SolutionCollectionService } from '../../domain/services/SolutionCollectionService';

export class SolutionViewModelMapper {
    constructor(private readonly collectionService: SolutionCollectionService) {}

    toViewModel(solution: Solution): SolutionViewModel {
        const escapedName = escapeHtml(solution.friendlyName);
        const escapedId = escapeHtml(solution.id);

        return {
            id: solution.id,
            uniqueName: solution.uniqueName,
            friendlyName: solution.friendlyName,
            friendlyNameHtml: `<a href="#" class="solution-link" data-command="openInMaker" data-solution-id="${escapedId}">${escapedName}</a>`,
            version: solution.version,
            isManaged: solution.isManaged ? 'Managed' : 'Unmanaged',
            publisherName: solution.publisherName,
            installedOn: DateFormatter.formatDate(solution.installedOn),
            description: solution.description,
            modifiedOn: DateFormatter.formatDate(solution.modifiedOn),
            isVisible: solution.isVisible ? 'Yes' : 'No',
            isApiManaged: solution.isApiManaged ? 'Yes' : 'No'
        };
    }

    /**
     * Maps solutions to ViewModels with optional sorting.
     *
     * @param solutions - Domain entities
     * @param shouldSort - If true, sorts (Default first, then alphabetically) using domain service
     */
    toViewModels(solutions: Solution[], shouldSort = false): SolutionViewModel[] {
        // ✅ Delegate sorting to domain service
        const solutionsToMap = shouldSort ? this.collectionService.sort(solutions) : solutions;

        // ✅ Map sorted entities to ViewModels
        return solutionsToMap.map(solution => this.toViewModel(solution));
    }
}
```

---

### Example 2: EnvironmentVariableViewModelMapper (Domain Service Delegation)

**File**: `src/features/environmentVariables/application/mappers/EnvironmentVariableViewModelMapper.ts`

```typescript
import { EnvironmentVariable } from '../../domain/entities/EnvironmentVariable';
import { EnvironmentVariableViewModel } from '../viewModels/EnvironmentVariableViewModel';
import { EnvironmentVariableCollectionService } from '../../domain/services/EnvironmentVariableCollectionService';

export class EnvironmentVariableViewModelMapper {
    constructor(private readonly collectionService: EnvironmentVariableCollectionService) {}

    toViewModel(envVar: EnvironmentVariable): EnvironmentVariableViewModel {
        return {
            definitionId: envVar.definitionId,
            schemaName: envVar.schemaName,
            displayName: envVar.displayName,
            type: EnvironmentVariableTypeFormatter.formatTypeName(envVar.type),
            currentValue: envVar.currentValue ?? '',
            defaultValue: envVar.defaultValue ?? '',
            isManaged: envVar.isManaged ? 'Managed' : 'Unmanaged',
            description: envVar.description,
            modifiedOn: DateFormatter.formatDate(envVar.modifiedOn)
        };
    }

    /**
     * Maps environment variables to ViewModels with optional sorting.
     *
     * @param envVars - Domain entities
     * @param shouldSort - If true, sorts alphabetically by schemaName using domain service
     */
    toViewModels(envVars: EnvironmentVariable[], shouldSort = false): EnvironmentVariableViewModel[] {
        // ✅ Delegate sorting to domain service
        const varsToMap = shouldSort ? this.collectionService.sort(envVars) : envVars;

        // ✅ Map sorted entities to ViewModels
        return varsToMap.map(envVar => this.toViewModel(envVar));
    }
}
```

---

### Example 3: EnvironmentListViewModelMapper (Inline Sorting)

**File**: `src/features/environmentSetup/application/mappers/EnvironmentListViewModelMapper.ts`

```typescript
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentListViewModel } from '../viewModels/EnvironmentListViewModel';

export class EnvironmentListViewModelMapper {
    /**
     * Maps environments to ViewModels with optional sorting.
     *
     * @param environments - Domain entities
     * @param shouldSort - If true, sorts by last used (most recent first), then by name
     */
    public toViewModels(environments: Environment[], shouldSort = false): EnvironmentListViewModel[] {
        const viewModels = environments.map(env => this.toViewModel(env));

        // ⚠️ Inline sorting acceptable for simple presentation logic
        return shouldSort ? this.sortByLastUsedThenName(viewModels) : viewModels;
    }

    public toViewModel(environment: Environment): EnvironmentListViewModel {
        const lastUsed = environment.getLastUsed();
        return {
            id: environment.getId().getValue(),
            name: environment.getName().getValue(),
            dataverseUrl: environment.getDataverseUrl().getValue(),
            authenticationMethod: environment.getAuthenticationMethod().toString(),
            isActive: environment.getIsActive(),
            lastUsedDisplay: RelativeTimeFormatter.formatRelativeTime(lastUsed),
            statusBadge: environment.getIsActive() ? 'active' : 'inactive',
            ...(lastUsed !== undefined && { lastUsedTimestamp: lastUsed.getTime() })
        };
    }

    /**
     * Simple presentation sorting - last used first, then alphabetically.
     * This is acceptable inline because it's pure presentation logic, not business logic.
     */
    private sortByLastUsedThenName(viewModels: EnvironmentListViewModel[]): EnvironmentListViewModel[] {
        return viewModels.sort((a, b) => {
            if (a.lastUsedTimestamp && b.lastUsedTimestamp) {
                return b.lastUsedTimestamp - a.lastUsedTimestamp;
            }
            if (a.lastUsedTimestamp) return -1;
            if (b.lastUsedTimestamp) return 1;
            return a.name.localeCompare(b.name);
        });
    }
}
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Sorting in Use Case

**Bad:**
```typescript
// ❌ Use case contains business logic (sorting)
export class ListSolutionsUseCase {
    public async execute(): Promise<SolutionViewModel[]> {
        const solutions = await this.repository.getAll();

        // ❌ Sorting logic in use case - should be in domain service or mapper
        const sorted = solutions.sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.friendlyName.localeCompare(b.friendlyName);
        });

        // ❌ Mapping after sorting - wrong order
        return sorted.map(s => this.mapper.toViewModel(s));
    }
}
```

**Good:**
```typescript
// ✅ Use case orchestrates only - sorting delegated
export class ListSolutionsUseCase {
    public async execute(): Promise<SolutionViewModel[]> {
        const solutions = await this.repository.getAll();

        // ✅ Delegate sorting + mapping to mapper
        return this.mapper.toViewModels(solutions, true);
    }
}

// ✅ Mapper delegates sorting to domain service
export class SolutionViewModelMapper {
    toViewModels(solutions: Solution[], shouldSort = false): SolutionViewModel[] {
        const solutionsToMap = shouldSort ? this.collectionService.sort(solutions) : solutions;
        return solutionsToMap.map(s => this.toViewModel(s));
    }
}
```

---

### ❌ Anti-Pattern 2: Sorting ViewModels

**Bad:**
```typescript
// ❌ Mapper sorts ViewModels after transformation
export class SolutionViewModelMapper {
    toViewModels(solutions: Solution[]): SolutionViewModel[] {
        // ❌ Map first
        const viewModels = solutions.map(s => this.toViewModel(s));

        // ❌ Then sort ViewModels - business logic after transformation!
        return viewModels.sort((a, b) => {
            if (a.isManaged === 'Managed' && b.isManaged !== 'Managed') return -1;
            if (a.isManaged !== 'Managed' && b.isManaged === 'Managed') return 1;
            return a.friendlyName.localeCompare(b.friendlyName);
        });
    }
}
```

**Good:**
```typescript
// ✅ Mapper sorts entities first, then transforms
export class SolutionViewModelMapper {
    toViewModels(solutions: Solution[], shouldSort = false): SolutionViewModel[] {
        // ✅ Sort entities first (delegate to domain service)
        const solutionsToMap = shouldSort ? this.collectionService.sort(solutions) : solutions;

        // ✅ Then map to ViewModels
        return solutionsToMap.map(s => this.toViewModel(s));
    }
}
```

---

### ❌ Anti-Pattern 3: Business Logic in Mapper

**Bad:**
```typescript
// ❌ Business logic in mapper
export class EnvironmentVariableViewModelMapper {
    toViewModel(envVar: EnvironmentVariable): EnvironmentVariableViewModel {
        // ❌ Complex business logic - belongs in entity or domain service
        const isOverridden = envVar.currentValue !== null
            && envVar.currentValue !== envVar.defaultValue
            && envVar.currentValue.trim() !== '';

        // ❌ Validation - belongs in entity
        if (envVar.isSecret() && envVar.currentValue) {
            throw new Error('Secret values should not be exported');
        }

        return {
            definitionId: envVar.definitionId,
            schemaName: envVar.schemaName,
            isOverridden, // ❌ Business logic result
            // ... more properties
        };
    }
}
```

**Good:**
```typescript
// ✅ Pure transformation - delegates logic to entity
export class EnvironmentVariableViewModelMapper {
    toViewModel(envVar: EnvironmentVariable): EnvironmentVariableViewModel {
        return {
            definitionId: envVar.definitionId,
            schemaName: envVar.schemaName,
            displayName: envVar.displayName,
            type: EnvironmentVariableTypeFormatter.formatTypeName(envVar.type),
            currentValue: envVar.currentValue ?? '', // ✅ Simple null handling
            defaultValue: envVar.defaultValue ?? '',
            isManaged: envVar.isManaged ? 'Managed' : 'Unmanaged', // ✅ Simple formatting
            description: envVar.description,
            modifiedOn: DateFormatter.formatDate(envVar.modifiedOn) // ✅ Delegate to formatter
        };
    }
}
```

---

## Testing Mappers

### Test Coverage Checklist

For each mapper, test:

✅ **Property mapping** - All properties correctly mapped
✅ **Null handling** - Null/undefined values handled gracefully
✅ **Formatting** - Dates, booleans, numbers formatted correctly
✅ **HTML escaping** - XSS prevention (if generating HTML)
✅ **Sorting** - `shouldSort=true` delegates to domain service correctly
✅ **Edge cases** - Empty arrays, special characters, boundary values

### Example Test: SolutionViewModelMapper

```typescript
import { SolutionViewModelMapper } from './SolutionViewModelMapper';
import { SolutionCollectionService } from '../../domain/services/SolutionCollectionService';
import { createMockSolution } from '../../../shared/testing';

describe('SolutionViewModelMapper', () => {
    let mapper: SolutionViewModelMapper;
    let collectionService: SolutionCollectionService;

    beforeEach(() => {
        collectionService = new SolutionCollectionService();
        mapper = new SolutionViewModelMapper(collectionService);
    });

    describe('toViewModel', () => {
        it('should map all properties correctly', () => {
            const solution = createMockSolution({
                id: '12345',
                uniqueName: 'TestSolution',
                friendlyName: 'Test Solution',
                version: '1.0.0.0',
                isManaged: true,
                publisherName: 'Test Publisher'
            });

            const viewModel = mapper.toViewModel(solution);

            expect(viewModel.id).toBe('12345');
            expect(viewModel.uniqueName).toBe('TestSolution');
            expect(viewModel.friendlyName).toBe('Test Solution');
            expect(viewModel.version).toBe('1.0.0.0');
            expect(viewModel.isManaged).toBe('Managed');
            expect(viewModel.publisherName).toBe('Test Publisher');
        });

        it('should escape HTML in friendlyName', () => {
            const solution = createMockSolution({
                friendlyName: '<script>alert("XSS")</script>'
            });

            const viewModel = mapper.toViewModel(solution);

            expect(viewModel.friendlyNameHtml).not.toContain('<script>');
            expect(viewModel.friendlyNameHtml).toContain('&lt;script&gt;');
        });

        it('should format boolean as string', () => {
            const managed = createMockSolution({ isManaged: true });
            const unmanaged = createMockSolution({ isManaged: false });

            expect(mapper.toViewModel(managed).isManaged).toBe('Managed');
            expect(mapper.toViewModel(unmanaged).isManaged).toBe('Unmanaged');
        });
    });

    describe('toViewModels', () => {
        it('should map array of solutions', () => {
            const solutions = [
                createMockSolution({ id: '1', friendlyName: 'Solution 1' }),
                createMockSolution({ id: '2', friendlyName: 'Solution 2' })
            ];

            const viewModels = mapper.toViewModels(solutions);

            expect(viewModels).toHaveLength(2);
            expect(viewModels[0]?.friendlyName).toBe('Solution 1');
            expect(viewModels[1]?.friendlyName).toBe('Solution 2');
        });

        it('should sort solutions when shouldSort=true', () => {
            const solutions = [
                createMockSolution({ friendlyName: 'Zebra', isDefault: false }),
                createMockSolution({ friendlyName: 'Default', isDefault: true }),
                createMockSolution({ friendlyName: 'Alpha', isDefault: false })
            ];

            const viewModels = mapper.toViewModels(solutions, true);

            // Default solution should be first
            expect(viewModels[0]?.friendlyName).toBe('Default');
            // Others alphabetically
            expect(viewModels[1]?.friendlyName).toBe('Alpha');
            expect(viewModels[2]?.friendlyName).toBe('Zebra');
        });

        it('should NOT sort when shouldSort=false', () => {
            const solutions = [
                createMockSolution({ friendlyName: 'Zebra' }),
                createMockSolution({ friendlyName: 'Alpha' })
            ];

            const viewModels = mapper.toViewModels(solutions, false);

            // Order should be preserved
            expect(viewModels[0]?.friendlyName).toBe('Zebra');
            expect(viewModels[1]?.friendlyName).toBe('Alpha');
        });

        it('should handle empty array', () => {
            const viewModels = mapper.toViewModels([]);

            expect(viewModels).toHaveLength(0);
        });
    });
});
```

---

## Summary

### Mapper Checklist

When creating a mapper, ensure:

✅ **Pure transformation**: No business logic, just mapping properties
✅ **Sort entities, not ViewModels**: Sort domain entities before mapping
✅ **Delegate to domain services**: Use collection services for complex sorting
✅ **`shouldSort` parameter**: Allow callers to control sorting
✅ **Null handling**: Convert null/undefined to sensible defaults
✅ **HTML escaping**: Prevent XSS when generating HTML
✅ **Formatters**: Delegate formatting to utility classes
✅ **Comprehensive tests**: Test mapping, sorting, null handling, edge cases

### Decision Tree: When to Sort?

```
Where should sorting logic go?
├─ Complex business rules (Default first, etc.)? → Domain Service
└─ Simple presentation sorting (last used first)? → Mapper (inline, private method)

When should sorting happen?
├─ BEFORE mapping → Sort domain entities ✅
└─ AFTER mapping → Sort ViewModels ❌
```

### Common Mistakes

❌ **Don't:**
- Sort ViewModels after mapping
- Put sorting logic in use cases
- Include business logic in mappers
- Map then sort (wrong order!)

✅ **Do:**
- Sort domain entities before mapping
- Delegate sorting to domain services
- Keep mappers pure transformation
- Use `shouldSort` parameter pattern

---

**See Also:**
- [DOMAIN_SERVICE_PATTERNS.md](DOMAIN_SERVICE_PATTERNS.md) - Collection services for sorting
- [VALUE_OBJECT_PATTERNS.md](VALUE_OBJECT_PATTERNS.md) - Value objects in transformations
- [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md) - Mappers in Clean Architecture
- [TESTING_GUIDE.md](../testing/TESTING_GUIDE.md) - Testing mappers comprehensively
