# Metadata Browser - Implementation Prompt

**Design Document:** `docs/design/metadata-browser-architecture.md`
**Status:** Architect Approved - Ready for Implementation
**Date:** 2025-11-03

---

## Overview

Implement the Metadata Browser feature for the Power Platform Developer Suite following the approved Clean Architecture design. This is a **read-only** browser for viewing Dataverse metadata (entities, attributes, relationships, keys, privileges, and global choices).

---

## Critical Rules (MUST Follow)

### From CLAUDE.md:

1. ✅ **Rich domain models** - Entities with behavior, not just data
2. ✅ **Use cases orchestrate only** - No business logic in use cases
3. ✅ **Business logic in domain** - Sorting, filtering, validation in domain entities
4. ✅ **HTML in separate view files** - Extract all HTML to `presentation/views/`
5. ✅ **No `any` types** - Use proper interfaces or `unknown` with narrowing
6. ✅ **Explicit return types** - All public/protected methods
7. ✅ **Readonly arrays** - `readonly AttributeMetadata[]` pattern
8. ✅ **Logging via ILogger** - Constructor injection, not global singleton
9. ✅ **Cancellation tokens** - All async operations support cancellation
10. ✅ **Defensive null checks** - Check for null/undefined in all mappers and methods

### Architecture Pattern:

Follow the **exact same structure** as `src/features/solutionExplorer/`:
```
solutionExplorer/
├── domain/
│   ├── entities/Solution.ts
│   ├── interfaces/ISolutionRepository.ts
├── application/
│   ├── useCases/ListSolutionsUseCase.ts
│   ├── viewModels/SolutionViewModel.ts
│   └── mappers/SolutionViewModelMapper.ts
├── infrastructure/
│   └── repositories/DataverseApiSolutionRepository.ts
└── presentation/
    └── panels/SolutionExplorerPanel.ts
```

---

## Implementation Order

**CRITICAL: Implement in this order to maintain Clean Architecture:**

### Phase 1: Domain Layer (Foundation)

**Goal:** Create the business logic foundation with zero dependencies.

1. **Value Objects** (simplest, no dependencies):
   ```
   src/features/metadataBrowser/domain/valueObjects/
   ├── MetadataId.ts
   ├── LogicalName.ts
   └── MetadataFilterState.ts
   ```
   - Start with `MetadataId` and `LogicalName` (similar to existing patterns)
   - Then `MetadataFilterState` with `shouldShow()` method

2. **Domain Entities** (build up from simple to complex):
   ```
   src/features/metadataBrowser/domain/entities/
   ├── AttributeMetadata.ts      # Start here (simpler)
   ├── KeyMetadata.ts             # Then this
   ├── PrivilegeMetadata.ts       # Then this
   ├── RelationshipMetadata.ts    # Then this
   ├── ChoiceMetadata.ts          # Then this
   └── EntityMetadata.ts          # Last (depends on others)
   ```

   **For each entity:**
   - Constructor with `readonly` parameters
   - Rich behavior methods (business logic)
   - Getters for immutable access
   - Static factory methods (e.g., `createLightweight()`)
   - Static `sort()` method if applicable

3. **Repository Interface**:
   ```
   src/features/metadataBrowser/domain/interfaces/IMetadataRepository.ts
   ```
   - Define contract with all methods
   - Include cancellation token parameters
   - Add comprehensive JSDoc

**Verification:** Domain layer compiles with zero external dependencies ✅

---

### Phase 2: Application Layer (Use Cases & ViewModels)

**Goal:** Orchestrate domain logic and transform to presentation format.

1. **ViewModels** (DTOs):
   ```
   src/features/metadataBrowser/application/viewModels/
   ├── FilterableItem.ts             # Base interface
   ├── EntityTreeItemViewModel.ts    # Extends FilterableItem
   ├── ChoiceTreeItemViewModel.ts    # Extends FilterableItem
   ├── AttributeRowViewModel.ts
   ├── KeyRowViewModel.ts
   ├── RelationshipRowViewModel.ts
   ├── PrivilegeRowViewModel.ts
   └── ChoiceValueRowViewModel.ts
   ```

2. **Mappers** (Transform only, no logic):
   ```
   src/features/metadataBrowser/application/mappers/
   └── MetadataViewModelMapper.ts
   ```
   - Static methods for each transformation
   - Defensive null checks at start of each method
   - NO sorting (caller sorts before/after)

3. **Use Cases** (Orchestration):
   ```
   src/features/metadataBrowser/application/useCases/
   ├── ListEntitiesUseCase.ts
   ├── ListChoicesUseCase.ts
   ├── LoadEntityMetadataUseCase.ts
   └── LoadChoiceMetadataUseCase.ts
   ```

   **For each use case:**
   - Constructor injection: `IMetadataRepository`, `ILogger`
   - `execute()` method with cancellation token
   - Log at start/completion
   - Check cancellation before/after async operations
   - Throw `OperationCancelledException` if cancelled

**Verification:** Application layer compiles and only depends on domain ✅

---

### Phase 3: Infrastructure Layer (External Dependencies)

**Goal:** Implement repository to communicate with Dataverse API.

1. **Repository Implementation**:
   ```
   src/features/metadataBrowser/infrastructure/repositories/
   └── DataverseMetadataRepository.ts
   ```

   **Implementation Details:**
   - Implements `IMetadataRepository` interface
   - Constructor injection: `IAuthenticationService`, `ILogger`
   - Use Dataverse Web API: `/api/data/v9.2/EntityDefinitions`
   - Implement all methods:
     - `listEntities()` - Fetch with `$select=LogicalName,DisplayName,MetadataId,IsManaged,IsCustomEntity`
     - `getEntityMetadata()` - Fetch with `$expand=Attributes,Keys,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships,Privileges`
     - `listChoices()` - Fetch global optionsets
     - `getChoiceMetadata()` - Fetch specific optionset with options
   - Map API DTOs to domain entities
   - Handle null/undefined with `??` operator
   - Check cancellation token before/after network calls
   - Use `EntityMetadata.createLightweight()` for tree view

2. **API DTO Interfaces** (if needed):
   ```
   src/features/metadataBrowser/infrastructure/repositories/dtos/
   ├── EntityDefinitionDto.ts
   ├── AttributeMetadataDto.ts
   └── etc...
   ```

**Verification:** Repository compiles and implements all interface methods ✅

---

### Phase 4: Presentation Layer (UI)

**Goal:** Create the three-panel interface and user interactions.

1. **View Files** (HTML extraction):
   ```
   src/features/metadataBrowser/presentation/views/
   ├── metadataBrowserView.ts      # Main layout
   ├── entityTreeView.ts            # Left panel (tree + filters)
   ├── tabContentView.ts            # Middle panel (tabs + tables)
   └── detailPanelView.ts           # Right panel (properties/JSON)
   ```

   Each file exports a render function that returns HTML string.

2. **Panel** (Orchestration):
   ```
   src/features/metadataBrowser/presentation/panels/
   └── MetadataBrowserPanel.ts
   ```

   **Implementation Details:**
   - Constructor injection: All use cases, `IMakerUrlBuilder`, `ILogger`, `vscode.ExtensionContext`
   - State management:
     - `currentEnvironmentId`
     - `selectedEntityLogicalName`
     - `selectedChoiceName`
     - `filterState: MetadataFilterState`
     - `quickFiltersCollapsed: boolean`
   - Message handlers for webview communication
   - Load/save filter state per environment using `context.workspaceState`
   - Use `EntityMetadata.sort()` for sorting
   - Use `filterState.shouldShow()` for filtering
   - Handle cancellation tokens
   - Error handling with `OperationCancelledException` check

3. **CSS** (Styling):
   ```
   resources/webview/css/metadata-browser.css
   ```

   Three-panel layout with:
   - Collapsible left panel (tree view)
   - Tabbed middle panel (attributes/keys/relationships/privileges)
   - Hideable right panel (detail view)
   - Quick filters at top of left panel

4. **Client-Side JavaScript** (Behavior):
   ```
   resources/webview/js/metadata-browser.js
   ```

   - Tree selection handling
   - Tab switching
   - Search/filter in tables
   - Detail panel open/close
   - Quick filters toggle
   - Message passing to extension host

**Verification:** UI renders and interacts correctly ✅

---

### Phase 5: Integration & Registration

**Goal:** Wire everything together and register commands.

1. **Command Registration**:
   ```
   src/commands/metadataBrowser/MetadataBrowserCommands.ts
   ```

   Register command: `power-platform-dev-suite.openMetadataBrowser`

2. **Dependency Injection Setup**:
   - Create repository instance
   - Create use cases with dependencies
   - Pass to panel constructor

3. **package.json Updates**:
   - Add command to `contributes.commands`
   - Add command to appropriate menu contexts

**Verification:** Command shows in VS Code command palette ✅

---

## Key Implementation Details

### 1. Filter State Persistence

Store per environment using VS Code workspace state:

```typescript
// Save
private async saveFilterState(environmentId: string, filterState: MetadataFilterState): Promise<void> {
  const key = `metadataBrowser.${environmentId}.preferences`;
  const prefs = {
    filterState: filterState.toPlainObject(),
    quickFiltersCollapsed: this.quickFiltersCollapsed
  };
  await this.context.workspaceState.update(key, prefs);
}

// Load
private async loadFilterState(environmentId: string): Promise<MetadataFilterState> {
  const key = `metadataBrowser.${environmentId}.preferences`;
  const prefs = this.context.workspaceState.get<MetadataBrowserPreferences>(key);

  if (!prefs || !prefs.filterState) {
    return MetadataFilterState.createDefault();
  }

  return MetadataFilterState.fromPlainObject(prefs.filterState);
}
```

### 2. Cancellation Token Handling

All async operations must check cancellation:

```typescript
async execute(environmentId: string, cancellationToken?: ICancellationToken): Promise<EntityMetadata[]> {
  this.logger.info('Listing entities', { environmentId });

  if (cancellationToken?.isCancellationRequested) {
    throw new OperationCancelledException();
  }

  const entities = await this.repository.listEntities(environmentId, cancellationToken);

  if (cancellationToken?.isCancellationRequested) {
    throw new OperationCancelledException();
  }

  this.logger.info('Entities listed', { count: entities.length });
  return entities;
}
```

### 3. Defensive Null Checks

All mappers must check for null/empty:

```typescript
static toAttributeRows(attributes: readonly AttributeMetadata[]): AttributeRowViewModel[] {
  if (!attributes || attributes.length === 0) {
    return [];
  }

  return attributes.map(attr => ({
    id: attr.getLogicalName(),
    displayName: attr.getDisplayName(),
    // ... rest of mapping
  }));
}
```

### 4. Domain Sorting

Use static methods in domain:

```typescript
// In panel (presentation layer)
const sortedEntities = EntityMetadata.sort(entities);
const sortedChoices = ChoiceMetadata.sort(choices);

// NOT this:
// const sorted = [...entities].sort((a, b) => ...) ❌
```

### 5. Repository Null Handling

Use nullish coalescing:

```typescript
return EntityMetadata.createLightweight(
  logicalName,
  dto.DisplayName?.UserLocalizedLabel?.Label ?? dto.LogicalName,  // ✅
  metadataId,
  dto.IsManaged ?? false,  // ✅
  dto.IsCustomEntity ?? false  // ✅
);
```

---

## Testing Strategy

### Unit Tests

1. **Domain Entities** - Test business logic:
   ```typescript
   describe('EntityMetadata', () => {
     it('should identify custom attributes', () => {
       const entity = new EntityMetadata(/* ... */);
       const customAttrs = entity.getCustomAttributes();
       expect(customAttrs).toHaveLength(2);
     });
   });
   ```

2. **Value Objects** - Test filtering logic:
   ```typescript
   describe('MetadataFilterState', () => {
     it('should filter custom entities correctly', () => {
       const filterState = new MetadataFilterState(true, false, false, true);
       const item = { isCustom: true, isManaged: false };
       expect(filterState.shouldShow(item)).toBe(true);
     });
   });
   ```

3. **Mappers** - Test transformations:
   ```typescript
   describe('MetadataViewModelMapper', () => {
     it('should map entities to tree items', () => {
       const entities = [/* ... */];
       const viewModels = MetadataViewModelMapper.toEntityTreeItems(entities);
       expect(viewModels).toHaveLength(2);
       expect(viewModels[0].icon).toBe('🏷️');
     });
   });
   ```

### Integration Tests

Test repository with mock API responses.

---

## Common Pitfalls to Avoid

### ❌ DON'T:

1. **Put business logic in use cases**
   ```typescript
   // ❌ WRONG
   async execute(environmentId: string): Promise<EntityMetadata[]> {
     const entities = await this.repository.listEntities(environmentId);
     return entities.filter(e => e.isCustom); // ❌ Business logic in use case
   }
   ```

2. **Sort in mappers**
   ```typescript
   // ❌ WRONG
   static toEntityTreeItems(entities: readonly EntityMetadata[]): EntityTreeItemViewModel[] {
     return entities.sort(...).map(...); // ❌ Sorting in mapper
   }
   ```

3. **Put HTML in TypeScript**
   ```typescript
   // ❌ WRONG
   const html = '<div class="panel">...</div>'; // ❌ HTML in .ts file
   ```

4. **Use non-null assertion**
   ```typescript
   // ❌ WRONG
   const name = entity.displayName!; // ❌ Non-null assertion
   ```

5. **Forget cancellation checks**
   ```typescript
   // ❌ WRONG
   async execute(environmentId: string, cancellationToken?: ICancellationToken): Promise<void> {
     await this.repository.fetch(environmentId); // ❌ No cancellation check
   }
   ```

### ✅ DO:

1. **Put business logic in domain**
   ```typescript
   // ✅ CORRECT
   class EntityMetadata {
     getCustomAttributes(): AttributeMetadata[] {
       return this.attributes.filter(attr => attr.isCustom());
     }
   }
   ```

2. **Sort using domain static methods**
   ```typescript
   // ✅ CORRECT
   const sortedEntities = EntityMetadata.sort(entities);
   ```

3. **Extract HTML to view files**
   ```typescript
   // ✅ CORRECT - in presentation/views/entityTreeView.ts
   export function renderTreePanel(): string {
     return `<div class="panel">...</div>`;
   }
   ```

4. **Use explicit null checks**
   ```typescript
   // ✅ CORRECT
   if (!entity.displayName) {
     return 'Unknown';
   }
   return entity.displayName;
   ```

5. **Always check cancellation**
   ```typescript
   // ✅ CORRECT
   if (cancellationToken?.isCancellationRequested) {
     throw new OperationCancelledException();
   }
   ```

---

## Reference Implementations

### Study These Files:

1. **Domain Entity**: `src/features/solutionExplorer/domain/entities/Solution.ts`
   - Rich behavior example
   - Static methods pattern
   - Version validation

2. **Repository Interface**: `src/features/solutionExplorer/domain/interfaces/ISolutionRepository.ts`
   - Contract definition
   - JSDoc comments
   - Cancellation token usage

3. **Use Case**: `src/features/solutionExplorer/application/useCases/ListSolutionsUseCase.ts`
   - Orchestration pattern
   - Logging at boundaries
   - Error handling

4. **Mapper**: `src/features/solutionExplorer/application/mappers/SolutionViewModelMapper.ts`
   - Transformation pattern
   - Null checks
   - Static methods

5. **Repository**: `src/features/solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.ts`
   - API communication
   - DTO mapping
   - Error handling

6. **Panel**: `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanel.ts`
   - Panel orchestration
   - Message handling
   - State management

---

## Build & Test Commands

```bash
# Compile TypeScript
npm run compile

# Run tests
npm test

# Lint code
npm run lint

# Watch mode (development)
npm run watch
```

---

## Success Criteria

### Phase 1 (Domain) ✅
- [ ] All 6 domain entities compile without errors
- [ ] All entities have rich behavior methods
- [ ] All entities use readonly parameters
- [ ] Static factory methods implemented
- [ ] Static sort methods implemented
- [ ] Domain layer has zero external dependencies

### Phase 2 (Application) ✅
- [ ] All ViewModels defined
- [ ] FilterableItem interface used correctly
- [ ] All mappers have defensive null checks
- [ ] All use cases check cancellation tokens
- [ ] All use cases log at boundaries
- [ ] Application layer only depends on domain

### Phase 3 (Infrastructure) ✅
- [ ] Repository implements all interface methods
- [ ] API calls use correct Dataverse endpoints
- [ ] Null handling with ?? operator
- [ ] Cancellation token checks before/after network calls
- [ ] Proper error handling

### Phase 4 (Presentation) ✅
- [ ] HTML extracted to view files
- [ ] Panel orchestrates use cases
- [ ] Filter state persists per environment
- [ ] Three-panel layout renders correctly
- [ ] All user interactions work

### Phase 5 (Integration) ✅
- [ ] Command registered in package.json
- [ ] Dependency injection wired correctly
- [ ] Command appears in VS Code
- [ ] Feature works end-to-end

---

## Final Checklist Before Committing

- [ ] All files compile without errors
- [ ] All tests pass
- [ ] ESLint shows no errors
- [ ] No `any` types used
- [ ] All public methods have explicit return types
- [ ] All HTML extracted to view files
- [ ] CLAUDE.md rules followed
- [ ] Code reviewed by clean-architecture-guardian agent
- [ ] Feature tested manually in VS Code
- [ ] Documentation updated

---

## When You're Ready to Implement

1. **Start with Domain Layer** - Build the foundation
2. **Test Each Entity** - Ensure behavior works correctly
3. **Build Application Layer** - Use cases and mappers
4. **Implement Repository** - Connect to Dataverse API
5. **Create UI** - Panel, views, and client-side behavior
6. **Test End-to-End** - Verify everything works
7. **Submit for Code Review** - Use code-reviewer agent

**Remember:** Clean Architecture is about **layering and dependencies**. Each layer builds on the previous one, and dependencies only point inward. Follow the implementation order strictly.

**Good luck!** 🚀
