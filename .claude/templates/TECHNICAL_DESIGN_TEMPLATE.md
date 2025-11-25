# [Feature Name] - Technical Design

**Status:** Draft | In Review | Approved | Implemented
**Date:** YYYY-MM-DD
**Complexity:** Simple | Moderate | Complex

---

## Overview

**User Problem:** [What problem does this solve? 1-2 sentences]

**Solution:** [What are we building? 1-2 sentences]

**Value:** [Why does this matter? What's the impact? 1 sentence]

---

## Requirements

### Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### Non-Functional Requirements
- [ ] Performance requirements (if any)
- [ ] Security requirements (if any)
- [ ] Compatibility requirements (if any)

### Success Criteria
- [ ] User can accomplish X
- [ ] System handles Y correctly
- [ ] Feature works in scenario Z

---

## Implementation Slices (Vertical Slicing)

> **Key Principle:** Build working software in 30-60 minute increments. Each slice goes through all layers.

### MVP Slice (Slice 1): "[User can DO_THING]"
**Goal:** Simplest possible end-to-end functionality (walking skeleton)

**Domain:**
- Entity/ValueObject with minimal fields (2-3 fields only)
- Basic behavior methods

**Application:**
- Simple use case (no complex logic)
- Basic ViewModel

**Infrastructure:**
- Basic repository method (e.g., findAll())

**Presentation:**
- Simple HTML table or panel with 2-3 columns

**Result:** WORKING FEATURE ✅ (proves entire stack)

---

### Slice 2: "[User can DO_ANOTHER_THING]"
**Builds on:** Slice 1

**Domain:**
- Add 1-2 more fields or methods

**Application:**
- New use case OR extend existing ViewModel

**Infrastructure:**
- New repository method if needed

**Presentation:**
- Enhance UI with new capability

**Result:** ENHANCED FEATURE ✅

---

### Slice 3+: Additional Enhancements
[Continue pattern for each enhancement]

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - Panels orchestrate use cases (NO business logic)         │
│ - Maps domain entities → ViewModels (via injected mapper)  │
│ - HTML extracted to separate view files                    │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - Use cases orchestrate domain entities (NO business logic)│
│ - ViewModels are DTOs (no behavior)                        │
│ - Mappers transform domain → ViewModel                     │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - Rich entities with behavior (NOT anemic)                 │
│ - Value objects (immutable)                                 │
│ - Domain services (complex logic)                           │
│ - Repository interfaces (domain defines contracts)         │
│ - ZERO external dependencies                               │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - Repositories implement domain interfaces                 │
│ - External API integration                                  │
│ - Data persistence                                          │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction
✅ **CORRECT:**
- Presentation → Application → Domain
- Infrastructure → Domain
- All dependencies point INWARD

❌ **NEVER:**
- Domain → Any outer layer
- Application → Presentation
- Application → Infrastructure

---

## Type Contracts (Define BEFORE Implementation)

### Domain Layer Types

#### Entities
```typescript
// Rich entity with BEHAVIOR (not anemic)
export class [EntityName] {
  constructor(
    private readonly id: string,
    private readonly field1: Type1,
    private readonly field2: Type2
  ) {}

  // Rich behavior (business logic belongs here)
  public methodName(): ReturnType {
    // Business logic implementation
  }

  // Getters for immutable access
  public getId(): string { return this.id; }
  public getField1(): Type1 { return this.field1; }
}
```

#### Value Objects
```typescript
// Immutable value object
export class [ValueObjectName] {
  private constructor(private readonly value: Type) {}

  public static create(value: Type): [ValueObjectName] {
    // Validation logic
    return new [ValueObjectName](value);
  }

  public getValue(): Type { return this.value; }
}
```

#### Repository Interfaces
```typescript
// Domain defines the contract
export interface I[Entity]Repository {
  findAll(filter?: FilterType): Promise<readonly [Entity][]>;
  findById(id: string): Promise<[Entity] | null>;
  save(entity: [Entity]): Promise<void>;
  delete(id: string): Promise<void>;
}
```

---

### Application Layer Types

#### Use Cases
```typescript
export class [UseCase]UseCase {
  constructor(
    private readonly repository: I[Entity]Repository,
    private readonly logger: ILogger
  ) {}

  // Explicit return type REQUIRED
  public async execute(params: ParamType): Promise<ReturnType> {
    // Orchestrate domain entities (NO business logic here)
    this.logger.info('[UseCase] started', { params });

    const entity = await this.repository.findById(params.id);
    // Call domain methods (business logic is IN entity)
    const result = entity.domainMethod();

    this.logger.info('[UseCase] completed');
    return result;
  }
}
```

#### ViewModels
```typescript
// DTO for presentation (NO behavior)
export interface [Entity]ViewModel {
  readonly id: string;
  readonly displayField1: string;
  readonly displayField2: string;
}
```

#### Mappers
```typescript
export class [Entity]ViewModelMapper {
  // Transform only (NO sorting params, NO business logic)
  public toViewModel(entity: [Entity]): [Entity]ViewModel {
    return {
      id: entity.getId(),
      displayField1: entity.getField1(),
      displayField2: entity.getField2()
    };
  }

  public toViewModels(
    entities: readonly [Entity][]
  ): [Entity]ViewModel[] {
    return entities.map(e => this.toViewModel(e));
  }
}
```

---

### Infrastructure Layer Types

#### Repository Implementation
```typescript
export class Dataverse[Entity]Repository implements I[Entity]Repository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  public async findAll(filter?: FilterType): Promise<readonly [Entity][]> {
    this.logger.debug('Fetching entities from Dataverse', { filter });

    const response = await this.apiService.get<ApiDto[]>('/endpoint');

    // Map API DTO → Domain Entity
    return response.map(dto => this.mapToDomain(dto));
  }

  private mapToDomain(dto: ApiDto): [Entity] {
    // Transform infrastructure DTO to domain entity
    return new [Entity](dto.id, dto.field1, dto.field2);
  }
}
```

---

### Presentation Layer Types

#### Panel (PanelCoordinator Pattern)

**See:** `docs/architecture/PANEL_ARCHITECTURE.md` for comprehensive guide

```typescript
// Define command type (union of all commands)
type [Feature]PanelCommands = 'refresh' | 'export' | 'delete' | 'environmentChange';

export class [Feature]PanelComposed {
  public static readonly viewType = 'powerPlatformDevSuite.[feature]';
  private static panels = new Map<string, [Feature]PanelComposed>();

  private readonly coordinator: PanelCoordinator<[Feature]PanelCommands>;
  private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
  private currentEnvironmentId: string;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly useCase: [UseCase]UseCase,
    private readonly mapper: [Entity]ViewModelMapper,
    private readonly logger: ILogger,
    environmentId: string
  ) {
    this.currentEnvironmentId = environmentId;

    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri]
    };

    const result = this.createCoordinator();
    this.coordinator = result.coordinator;
    this.scaffoldingBehavior = result.scaffoldingBehavior;

    this.registerCommandHandlers();

    void this.initializeAndLoadData();
  }

  private createCoordinator(): {
    coordinator: PanelCoordinator<[Feature]PanelCommands>;
    scaffoldingBehavior: HtmlScaffoldingBehavior;
  } {
    // 1. Define sections
    const sections = [
      new ActionButtonsSection({
        buttons: [
          { id: 'refresh', label: 'Refresh' },
          { id: 'export', label: 'Export' }
        ]
      }, SectionPosition.Toolbar),
      new EnvironmentSelectorSection(), // Optional - if panel operates within environment
      new DataTableSection({
        viewType: [Feature]PanelComposed.viewType,
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'status', label: 'Status' }
        ],
        searchPlaceholder: '🔍 Search...',
        noDataMessage: 'No items found.'
      })
    ];

    // 2. Create composition behavior
    const compositionBehavior = new SectionCompositionBehavior(
      sections,
      PanelLayout.SingleColumn // or SplitHorizontal, SplitVertical
    );

    // 3. Resolve CSS modules
    const cssUris = resolveCssModules(
      {
        base: true,
        components: ['buttons', 'inputs'],
        sections: ['environment-selector', 'action-buttons', 'datatable']
      },
      this.extensionUri,
      this.panel.webview
    );

    // 4. Create scaffolding behavior
    const scaffoldingBehavior = new HtmlScaffoldingBehavior(
      this.panel.webview,
      compositionBehavior,
      {
        cssUris,
        jsUris: [
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
          ).toString(),
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'TableRenderer.js')
          ).toString()
        ],
        cspNonce: getNonce(),
        title: '[Feature]'
      }
    );

    // 5. Create coordinator
    const coordinator = new PanelCoordinator<[Feature]PanelCommands>({
      panel: this.panel,
      extensionUri: this.extensionUri,
      behaviors: [scaffoldingBehavior],
      logger: this.logger
    });

    return { coordinator, scaffoldingBehavior };
  }

  private registerCommandHandlers(): void {
    this.coordinator.registerHandler('refresh', async () => {
      await this.handleRefresh();
    });

    this.coordinator.registerHandler('environmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId) {
        await this.handleEnvironmentChange(environmentId);
      }
    });
  }

  private async handleRefresh(): Promise<void> {
    this.logger.debug('Refreshing data');

    try {
      // 1. Call use case (returns domain entities)
      const entities = await this.useCase.execute(this.currentEnvironmentId);

      // 2. Map to ViewModels
      const viewModels = entities.map(e => this.mapper.toViewModel(e));

      this.logger.info('Data loaded successfully', { count: viewModels.length });

      // 3. Send ViewModels to client (data-driven update - NO HTML re-render!)
      await this.panel.webview.postMessage({
        command: 'updateTableData',
        data: {
          viewModels,
          columns: this.getTableConfig().columns
        }
      });
    } catch (error: unknown) {
      this.logger.error('Error refreshing data', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to refresh: ${errorMessage}`);
    }
  }

  public static async createOrShow(/* ... */): Promise<[Feature]PanelComposed> {
    // Singleton pattern per environment
    const existingPanel = [Feature]PanelComposed.panels.get(environmentId);
    if (existingPanel) {
      existingPanel.panel.reveal();
      return existingPanel;
    }

    const panel = vscode.window.createWebviewPanel(/* ... */);
    const newPanel = new [Feature]PanelComposed(/* ... */);

    [Feature]PanelComposed.panels.set(environmentId, newPanel);
    panel.onDidDispose(() => {
      [Feature]PanelComposed.panels.delete(environmentId);
    });

    return newPanel;
  }
}
```

**Key Architecture Decisions:**
- **PanelCoordinator<TCommands>** - Type-safe command handling
- **Sections** - Composable UI (ActionButtonsSection, DataTableSection, custom)
- **SectionCompositionBehavior** - Arranges sections in layout
- **HtmlScaffoldingBehavior** - Wraps in HTML document
- **Data-driven updates** - postMessage with ViewModels (no HTML re-renders)
- **EnvironmentSelectorSection** - Optional (include if panel operates within environment)

---

## File Structure

```
src/features/[featureName]/
├── domain/
│   ├── entities/
│   │   └── [Entity].ts              # Rich model with behavior
│   ├── valueObjects/
│   │   └── [ValueObject].ts         # Immutable value object
│   ├── services/
│   │   └── [DomainService].ts       # Complex domain logic
│   └── interfaces/
│       └── I[Entity]Repository.ts   # Domain defines contract
│
├── application/
│   ├── useCases/
│   │   └── [UseCase].ts             # Orchestrates domain
│   ├── viewModels/
│   │   └── [Entity]ViewModel.ts     # DTOs for presentation
│   └── mappers/
│       └── [Entity]ViewModelMapper.ts
│
├── infrastructure/
│   └── repositories/
│       └── Dataverse[Entity]Repository.ts  # Implements interface
│
└── presentation/
    ├── panels/
    │   └── [Feature]PanelComposed.ts  # PanelCoordinator pattern (~300-400 lines)
    └── sections/                      # Optional - custom sections
        ├── [Feature]DetailSection.ts  # Feature-specific UI
        └── [Feature]ControlsSection.ts
```

**New Files:** [X] files
**Modified Files:** [Y] existing files
**Total:** [Z] files for this feature

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)
```typescript
// Test all entity behavior
describe('[Entity]', () => {
  describe('methodName', () => {
    it('should handle valid case', () => {
      const entity = new [Entity]('id', 'field1', 'field2');
      const result = entity.methodName();
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      // Test edge cases, validation, state transitions
    });
  });
});
```

### Application Tests (Target: 90% coverage)
```typescript
// Test use case orchestration
describe('[UseCase]', () => {
  let useCase: [UseCase];
  let mockRepository: jest.Mocked<I[Entity]Repository>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      save: jest.fn()
    } as any;
    useCase = new [UseCase](mockRepository, new NullLogger());
  });

  it('should orchestrate domain logic', async () => {
    mockRepository.findAll.mockResolvedValue([entity1, entity2]);

    await useCase.execute(params);

    expect(mockRepository.findAll).toHaveBeenCalled();
  });
});
```

### Infrastructure Tests (Optional - only for complex logic)
- Test complex query building
- Test DTO → Domain transformations
- Skip simple pass-through code

### Manual Testing Scenarios
1. **Happy path:** [Describe user flow]
2. **Error case:** [Describe error scenario]
3. **Edge case:** [Describe boundary condition]

---

## Dependencies & Prerequisites

### External Dependencies
- [ ] VS Code APIs: [list specific APIs]
- [ ] NPM packages: [list new packages if any]
- [ ] Dataverse APIs: [list endpoints]

### Internal Prerequisites
- [ ] Existing feature X must be completed
- [ ] Shared service Y must be available
- [ ] Configuration Z must be in place

### Breaking Changes
- [ ] None
- [ ] [Describe any breaking changes]

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [ ] Entities have behavior (not anemic data classes)
- [ ] Zero external dependencies (no imports from outer layers)
- [ ] Business logic in entities/domain services
- [ ] Repository interfaces defined in domain
- [ ] Value objects are immutable
- [ ] No logging (pure business logic)

**Application Layer:**
- [ ] Use cases orchestrate only (NO business logic)
- [ ] ViewModels are DTOs (no behavior)
- [ ] Mappers transform only (no sorting params)
- [ ] Logging at use case boundaries
- [ ] Explicit return types on all methods

**Infrastructure Layer:**
- [ ] Repositories implement domain interfaces
- [ ] Dependencies point inward (infra → domain)
- [ ] No business logic in repositories
- [ ] Logging for API calls

**Presentation Layer:**
- [ ] Panels use PanelCoordinator<TCommands> pattern
- [ ] Command type defined (union of command strings)
- [ ] Sections defined (ActionButtonsSection, DataTableSection, custom sections)
- [ ] Layout chosen (SingleColumn [default], SplitHorizontal, SplitVertical)
- [ ] Command handlers registered with coordinator
- [ ] EnvironmentSelectorSection included if panel operates within environment
- [ ] Data-driven updates via postMessage (no HTML re-renders)
- [ ] Panels call use cases only (NO business logic)
- [ ] Dependencies point inward (pres → app → domain)
- [ ] Logging for user actions

**Type Safety:**
- [ ] No `any` types without explicit justification
- [ ] Explicit return types on all public methods
- [ ] Proper null handling (no `!` assertions)
- [ ] Type guards for runtime safety

---

## Extension Integration Checklist

**REQUIRED for all panels/commands** - Ensure these are completed during implementation:

**Commands (for package.json):**
- [ ] Command ID defined: `power-platform-dev-suite.[feature]`
- [ ] Command ID (pick environment) defined: `power-platform-dev-suite.[feature]PickEnvironment`
- [ ] Command titles specified
- [ ] Activation events defined (if needed)
- [ ] Commands added to `"contributes.commands"` array

**Extension Registration (for extension.ts):**
- [ ] Feature initializer function created (`initialize[Feature]()`)
- [ ] Lazy imports with dynamic `import()` for performance
- [ ] Command handlers registered (both direct and pick-environment)
- [ ] Commands added to `context.subscriptions`
- [ ] Error handling in command handlers
- [ ] Environment picker logic implemented

**Verification:**
- [ ] `npm run compile` passes after package.json changes
- [ ] Command appears in Command Palette (Ctrl+Shift+P)
- [ ] Manual testing completed (F5, invoke command, panel opens)

> **Critical:** Do NOT skip this section. Missing registration means the feature won't be accessible to users.

---

## Key Architectural Decisions

> **Note:** This section is populated AFTER final approval. During iteration, architect review findings go in separate files under `docs/design/reviews/`.

### Decision 1: [Decision Title]
**Considered:** [What alternatives were considered]
**Chosen:** [What was chosen]
**Rationale:** [Why this decision was made]
**Tradeoffs:** [What we gave up, what we gained]

---

## Review & Approval

### Design Phase
- [ ] clean-architecture-guardian design review (all layers)
- [ ] typescript-pro type contract review
- [ ] Human approval of design

### Implementation Phase (per slice)
- [ ] Slice 1 implemented and reviewed
- [ ] Slice 2 implemented and reviewed
- [ ] [Continue for each slice]

### Final Approval
- [ ] All slices implemented
- [ ] Tests written and passing (npm test ✅)
- [ ] Manual testing completed
- [ ] Documentation updated (if new patterns)
- [ ] clean-architecture-guardian final approval

**Status:** Pending | Approved | Changes Requested
**Approver:** [Name]
**Date:** [Date]

---

## Open Questions

- [ ] Question 1: [Describe question]
- [ ] Question 2: [Describe question]

---

## References

- Related features: [Links to similar features]
- External documentation: [API docs, etc.]
- Design inspiration: [What patterns we're following]
- Workflow guide: `.claude/workflows/DESIGN_WORKFLOW.md`
