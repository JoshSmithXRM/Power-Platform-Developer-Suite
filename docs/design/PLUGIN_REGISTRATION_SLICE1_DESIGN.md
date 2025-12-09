# Plugin Registration Tool - Slice 1: Read-Only Browsing - Technical Design

**Status:** Draft
**Date:** 2025-12-08
**Complexity:** Complex
**Estimated Effort:** 14-18 hours (Slice 1 only, including Plugin Packages)

---

## Overview

**User Problem:** Developers need to view registered plugins, steps, and images in their Dataverse environment without leaving VS Code. Currently, they must launch the external Plugin Registration Tool.

**Solution:** Build a VS Code panel that displays the plugin registration hierarchy in a tree-based UI (Assemblies → Plugins → Steps → Images). Read-only browsing establishes the foundation for CRUD operations in future slices.

**Value:** Faster plugin development workflow. Developers can view plugin configurations alongside their code without context switching to external tools.

---

## Requirements

### Functional Requirements
- [ ] Display registered assemblies in hierarchical tree
- [ ] Show plugins nested under assemblies
- [ ] Show steps nested under plugins
- [ ] Show images nested under steps
- [ ] Display key metadata for each level (name, status, message, entity)
- [ ] Filter by solution (including Default Solution)
- [ ] Search/filter tree nodes
- [ ] Select node to view details in side panel
- [ ] Environment switching (panel per environment)

### Non-Functional Requirements
- [ ] Performance: Handle 100+ assemblies, 500+ steps
- [ ] Responsiveness: Tree loads in < 2 seconds
- [ ] Usability: Familiar tree-based navigation (like Metadata Browser)

### Success Criteria
- [ ] User can browse plugin registration hierarchy without external tools
- [ ] All registered components visible in tree
- [ ] Detail panel shows complete metadata
- [ ] Environment and solution switching work correctly

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can browse plugin registration hierarchy"
**Goal:** Read-only tree view with detail panel (walking skeleton)

**Domain:**
- PluginPackage entity (5 fields: id, name, version, isManaged, createdOn) - NEW!
- PluginAssembly entity (5-6 core fields: id, name, version, isolationMode, isManaged, packageId?)
- PluginType entity (3-4 fields: id, name, friendlyName, assemblyId)
- PluginStep entity (6-7 fields: id, name, messageId, entityId, stage, rank, isEnabled)
- StepImage entity (4-5 fields: id, name, imageType, entityAlias, stepId)
- Value objects: IsolationMode, ExecutionStage, ExecutionMode, ImageType
- Repository interfaces for all entities (5 total)

**Application:**
- LoadPluginRegistrationTreeUseCase (fetches all 5 levels)
- TreeItemViewModel (unified view model for tree nodes)
- PluginPackageViewModelMapper, PluginAssemblyViewModelMapper, PluginStepViewModelMapper, etc.

**Infrastructure:**
- DataversePluginPackageRepository (implements IPluginPackageRepository) - NEW!
- DataversePluginAssemblyRepository (implements IPluginAssemblyRepository)
- DataversePluginTypeRepository
- DataversePluginStepRepository
- DataverseStepImageRepository
- OData queries with $expand for hierarchical loading

**Presentation:**
- PluginRegistrationPanel using PanelCoordinator
- Custom PluginRegistrationTreeSection (left sidebar)
- Detail panel (right sidebar - optional for Slice 1)
- Commands: refresh, openMaker, environmentChange, solutionChange, selectNode

**Tree Hierarchy:**
```
├── Plugin Packages (grouped)
│   └── Package Name (v1.0.0)
│       └── Assembly Name
│           └── Plugin Type
│               └── Step (Message: Entity)
│                   └── Image (Pre/Post)
└── Standalone Assemblies (no package)
    └── Assembly Name
        └── Plugin Type
            └── Step (Message: Entity)
                └── Image (Pre/Post)
```

**Result:** WORKING READ-ONLY BROWSER ✅ (proves entire stack)

---

### Slice 2: "User can manage plugin steps" (Future)
**Builds on:** Slice 1

**Domain:**
- Add behavior methods: canEnable(), canDisable(), canDelete()
- Add validation logic for step configuration

**Application:**
- CreatePluginStepUseCase
- UpdatePluginStepUseCase
- DeletePluginStepUseCase
- EnablePluginStepUseCase

**Infrastructure:**
- Repository update methods (create, update, delete)

**Presentation:**
- Form panel for step creation/editing
- Context menu commands (enable, disable, delete)

**Result:** STEP MANAGEMENT ✅

---

### Slice 3: "User can register assemblies" (Future)
**Builds on:** Slice 2

**Domain:**
- Assembly validation (DLL parsing, plugin type discovery)
- SourceType value object (Database vs Disk)

**Application:**
- RegisterAssemblyUseCase (DLL upload)
- DiscoverPluginTypesUseCase

**Infrastructure:**
- Assembly file upload to Dataverse
- DLL reflection/parsing for plugin types

**Presentation:**
- Assembly registration wizard
- File picker for DLL selection

**Result:** ASSEMBLY REGISTRATION ✅

---

### Slice 4: "User can manage step images" (Future)
**Builds on:** Slice 3

**Domain:**
- Image attribute selection
- ImageType validation

**Application:**
- CreateStepImageUseCase
- UpdateStepImageUseCase
- DeleteStepImageUseCase

**Infrastructure:**
- Entity attribute metadata fetching

**Presentation:**
- Image editor form
- Attribute picker

**Result:** COMPLETE PLUGIN REGISTRATION TOOL ✅

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - PluginRegistrationPanel orchestrates use cases           │
│ - Custom tree section (packages → assemblies → plugins →   │
│   steps → images)                                          │
│ - Detail panel shows selected node metadata               │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - LoadPluginRegistrationTreeUseCase (orchestration only)   │
│ - TreeItemViewModel (DTO for tree nodes)                   │
│ - Mappers (domain → ViewModel)                             │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - PluginPackage, PluginAssembly, PluginType, PluginStep,  │
│   StepImage                                                │
│ - Rich entities with behavior (isEnabled(), canDelete())  │
│ - Value objects (IsolationMode, ExecutionStage, etc.)     │
│ - Repository interfaces (domain defines contracts)         │
│ - ZERO external dependencies                               │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - Repositories implement domain interfaces                 │
│ - Dataverse API integration                                 │
│ - OData queries for hierarchical loading                   │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction
✅ **CORRECT:**
- Presentation → Application → Domain
- Infrastructure → Domain
- All dependencies point INWARD

❌ **NEVER:**
- Domain → Any outer layer

---

## Type Contracts (Define BEFORE Implementation)

### Domain Layer Types

#### Entities

```typescript
/**
 * Represents a plugin package in Dataverse.
 * Plugin packages are containers for assemblies, supporting NuGet-based deployment.
 *
 * Business Rules:
 * - Packages can contain multiple assemblies
 * - Managed packages cannot be modified
 * - Package version determines update vs new registration
 *
 * Rich behavior (NOT anemic):
 * - canUpdate(): boolean (checks if managed)
 * - canDelete(): boolean (checks if has assemblies)
 * - getDisplayVersion(): string (formatted version)
 */
export class PluginPackage {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly uniqueName: string,
    private readonly version: string,
    private readonly isManaged: boolean,
    private readonly createdOn: Date,
    private readonly modifiedOn: Date
  ) {}

  /**
   * Business rule: Managed packages cannot be updated.
   */
  public canUpdate(): boolean {
    return !this.isManaged;
  }

  /**
   * Business rule: Packages with assemblies cannot be deleted.
   * Caller must pass assemblyCount from repository.
   *
   * @param assemblyCount - Number of assemblies in this package
   */
  public canDelete(assemblyCount: number): boolean {
    return !this.isManaged && assemblyCount === 0;
  }

  /**
   * Formats version for display.
   */
  public getDisplayVersion(): string {
    return this.version;
  }

  // Getters
  public getId(): string { return this.id; }
  public getName(): string { return this.name; }
  public getUniqueName(): string { return this.uniqueName; }
  public getVersion(): string { return this.version; }
  public isInManagedState(): boolean { return this.isManaged; }
  public getCreatedOn(): Date { return this.createdOn; }
  public getModifiedOn(): Date { return this.modifiedOn; }
}

/**
 * Represents a plugin assembly registered in Dataverse.
 *
 * Business Rules:
 * - Assemblies have unique IDs
 * - Assemblies may belong to a package (packageId) or be standalone (packageId = null)
 * - Managed assemblies cannot be modified
 * - Assembly version determines update vs new registration
 * - IsolationMode determines execution context (Sandbox vs None)
 *
 * Rich behavior (NOT anemic):
 * - canUpdate(): boolean (checks if managed)
 * - canDelete(): boolean (checks if has active steps)
 * - getDisplayVersion(): string (formatted version)
 * - isInPackage(): boolean (checks if part of a package)
 */
export class PluginAssembly {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly version: string,
    private readonly isolationMode: IsolationMode,
    private readonly isManaged: boolean,
    private readonly sourceType: SourceType,
    private readonly packageId: string | null, // null = standalone assembly
    private readonly createdOn: Date,
    private readonly modifiedOn: Date
  ) {}

  /**
   * Business rule: Managed assemblies cannot be updated.
   * Used by: UI to disable edit buttons
   */
  public canUpdate(): boolean {
    return !this.isManaged;
  }

  /**
   * Business rule: Assemblies with active steps cannot be deleted.
   * Caller must pass activeStepCount from repository.
   *
   * @param activeStepCount - Number of enabled steps in this assembly
   */
  public canDelete(activeStepCount: number): boolean {
    return !this.isManaged && activeStepCount === 0;
  }

  /**
   * Formats version for display.
   * Example: "1.0.0.0" → "1.0.0.0"
   */
  public getDisplayVersion(): string {
    return this.version;
  }

  /**
   * Business rule: Check if assembly belongs to a package.
   * Used by: Tree rendering to group assemblies under packages
   */
  public isInPackage(): boolean {
    return this.packageId !== null;
  }

  // Getters (NO business logic in getters)
  public getId(): string { return this.id; }
  public getName(): string { return this.name; }
  public getVersion(): string { return this.version; }
  public getIsolationMode(): IsolationMode { return this.isolationMode; }
  public isInManagedState(): boolean { return this.isManaged; }
  public getSourceType(): SourceType { return this.sourceType; }
  public getPackageId(): string | null { return this.packageId; }
  public getCreatedOn(): Date { return this.createdOn; }
  public getModifiedOn(): Date { return this.modifiedOn; }
}

/**
 * Represents a plugin type (class) within an assembly.
 *
 * Business Rules:
 * - Plugin types must belong to an assembly
 * - FriendlyName used for display in tree
 * - TypeName is the fully qualified class name
 */
export class PluginType {
  constructor(
    private readonly id: string,
    private readonly name: string, // TypeName (fully qualified class name)
    private readonly friendlyName: string,
    private readonly assemblyId: string,
    private readonly workflowActivityGroupName: string | null
  ) {}

  /**
   * Business rule: Determine if this is a workflow activity.
   * Used by: UI to show different icon
   */
  public isWorkflowActivity(): boolean {
    return this.workflowActivityGroupName !== null;
  }

  /**
   * Gets display name (prefers FriendlyName over TypeName).
   */
  public getDisplayName(): string {
    return this.friendlyName || this.name;
  }

  // Getters
  public getId(): string { return this.id; }
  public getName(): string { return this.name; }
  public getFriendlyName(): string { return this.friendlyName; }
  public getAssemblyId(): string { return this.assemblyId; }
  public getWorkflowActivityGroupName(): string | null {
    return this.workflowActivityGroupName;
  }
}

/**
 * Represents a registered plugin step.
 *
 * Business Rules:
 * - Steps execute at specific stages (PreValidation, PreOperation, PostOperation)
 * - Steps can be enabled/disabled
 * - Steps have execution mode (Sync vs Async)
 * - Steps have rank (execution order)
 * - Filtering attributes (for Update message only)
 *
 * Rich behavior:
 * - isEnabled(): boolean
 * - canEnable(): boolean (checks if disabled and not managed)
 * - canDisable(): boolean (checks if enabled and not managed)
 * - getExecutionOrder(): string (formatted stage + rank)
 */
export class PluginStep {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly pluginTypeId: string,
    private readonly messageId: string,
    private readonly messageName: string, // Denormalized for display
    private readonly primaryEntityId: string | null,
    private readonly primaryEntityLogicalName: string | null, // Denormalized
    private readonly stage: ExecutionStage,
    private readonly mode: ExecutionMode,
    private readonly rank: number,
    private readonly status: StepStatus,
    private readonly filteringAttributes: string | null, // Comma-separated
    private readonly isManaged: boolean,
    private readonly createdOn: Date
  ) {}

  /**
   * Business rule: Step is enabled if status is Enabled.
   */
  public isEnabled(): boolean {
    return this.status.isEnabled();
  }

  /**
   * Business rule: Can enable if disabled and not managed.
   */
  public canEnable(): boolean {
    return !this.isEnabled() && !this.isManaged;
  }

  /**
   * Business rule: Can disable if enabled and not managed.
   */
  public canDisable(): boolean {
    return this.isEnabled() && !this.isManaged;
  }

  /**
   * Business rule: Can delete if not managed.
   */
  public canDelete(): boolean {
    return !this.isManaged;
  }

  /**
   * Formats execution order for display.
   * Example: "PostOperation (40) - Rank 10"
   */
  public getExecutionOrder(): string {
    const stageName = this.stage.getName();
    const stageValue = this.stage.getValue();
    return `${stageName} (${stageValue}) - Rank ${this.rank}`;
  }

  /**
   * Gets filtering attributes as array.
   * Returns empty array if no filtering.
   */
  public getFilteringAttributesArray(): string[] {
    if (!this.filteringAttributes) {
      return [];
    }
    return this.filteringAttributes.split(',').map(attr => attr.trim());
  }

  // Getters
  public getId(): string { return this.id; }
  public getName(): string { return this.name; }
  public getPluginTypeId(): string { return this.pluginTypeId; }
  public getMessageId(): string { return this.messageId; }
  public getMessageName(): string { return this.messageName; }
  public getPrimaryEntityId(): string | null { return this.primaryEntityId; }
  public getPrimaryEntityLogicalName(): string | null {
    return this.primaryEntityLogicalName;
  }
  public getStage(): ExecutionStage { return this.stage; }
  public getMode(): ExecutionMode { return this.mode; }
  public getRank(): number { return this.rank; }
  public getStatus(): StepStatus { return this.status; }
  public getFilteringAttributes(): string | null { return this.filteringAttributes; }
  public isInManagedState(): boolean { return this.isManaged; }
  public getCreatedOn(): Date { return this.createdOn; }
}

/**
 * Represents a step image (pre-image or post-image).
 *
 * Business Rules:
 * - Images capture entity state before/after operation
 * - PreImage: Entity state before operation
 * - PostImage: Entity state after operation
 * - EntityAlias: Reference name for accessing image in plugin code
 * - Attributes: Comma-separated list of attributes to include
 */
export class StepImage {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly stepId: string,
    private readonly imageType: ImageType,
    private readonly entityAlias: string,
    private readonly attributes: string, // Comma-separated
    private readonly createdOn: Date
  ) {}

  /**
   * Gets image attributes as array.
   */
  public getAttributesArray(): string[] {
    if (!this.attributes) {
      return [];
    }
    return this.attributes.split(',').map(attr => attr.trim());
  }

  /**
   * Gets display name for image type.
   * Example: "PreImage" → "Pre-Image"
   */
  public getImageTypeDisplay(): string {
    return this.imageType.getDisplayName();
  }

  // Getters
  public getId(): string { return this.id; }
  public getName(): string { return this.name; }
  public getStepId(): string { return this.stepId; }
  public getImageType(): ImageType { return this.imageType; }
  public getEntityAlias(): string { return this.entityAlias; }
  public getAttributes(): string { return this.attributes; }
  public getCreatedOn(): Date { return this.createdOn; }
}
```

#### Value Objects

```typescript
/**
 * Isolation mode for plugin assembly.
 * Determines execution context.
 */
export class IsolationMode {
  public static readonly None = new IsolationMode(1, 'None');
  public static readonly Sandbox = new IsolationMode(2, 'Sandbox');

  private constructor(
    private readonly value: number,
    private readonly name: string
  ) {}

  public static fromValue(value: number): IsolationMode {
    if (value === 1) return IsolationMode.None;
    if (value === 2) return IsolationMode.Sandbox;
    throw new Error(`Invalid IsolationMode value: ${value}`);
  }

  public getValue(): number { return this.value; }
  public getName(): string { return this.name; }
}

/**
 * Source type for assembly storage.
 */
export class SourceType {
  public static readonly Database = new SourceType(0, 'Database');
  public static readonly Disk = new SourceType(1, 'Disk');
  public static readonly AzureWebApp = new SourceType(2, 'AzureWebApp');

  private constructor(
    private readonly value: number,
    private readonly name: string
  ) {}

  public static fromValue(value: number): SourceType {
    if (value === 0) return SourceType.Database;
    if (value === 1) return SourceType.Disk;
    if (value === 2) return SourceType.AzureWebApp;
    throw new Error(`Invalid SourceType value: ${value}`);
  }

  public getValue(): number { return this.value; }
  public getName(): string { return this.name; }
}

/**
 * Execution stage for plugin step.
 */
export class ExecutionStage {
  public static readonly PreValidation = new ExecutionStage(10, 'PreValidation');
  public static readonly PreOperation = new ExecutionStage(20, 'PreOperation');
  public static readonly PostOperation = new ExecutionStage(40, 'PostOperation');

  private constructor(
    private readonly value: number,
    private readonly name: string
  ) {}

  public static fromValue(value: number): ExecutionStage {
    if (value === 10) return ExecutionStage.PreValidation;
    if (value === 20) return ExecutionStage.PreOperation;
    if (value === 40) return ExecutionStage.PostOperation;
    throw new Error(`Invalid ExecutionStage value: ${value}`);
  }

  public getValue(): number { return this.value; }
  public getName(): string { return this.name; }
}

/**
 * Execution mode for plugin step.
 */
export class ExecutionMode {
  public static readonly Synchronous = new ExecutionMode(0, 'Synchronous');
  public static readonly Asynchronous = new ExecutionMode(1, 'Asynchronous');

  private constructor(
    private readonly value: number,
    private readonly name: string
  ) {}

  public static fromValue(value: number): ExecutionMode {
    if (value === 0) return ExecutionMode.Synchronous;
    if (value === 1) return ExecutionMode.Asynchronous;
    throw new Error(`Invalid ExecutionMode value: ${value}`);
  }

  public getValue(): number { return this.value; }
  public getName(): string { return this.name; }
  public isAsync(): boolean { return this.value === 1; }
}

/**
 * Status for plugin step.
 */
export class StepStatus {
  public static readonly Enabled = new StepStatus(0, 'Enabled');
  public static readonly Disabled = new StepStatus(1, 'Disabled');

  private constructor(
    private readonly value: number,
    private readonly name: string
  ) {}

  public static fromValue(value: number): StepStatus {
    if (value === 0) return StepStatus.Enabled;
    if (value === 1) return StepStatus.Disabled;
    throw new Error(`Invalid StepStatus value: ${value}`);
  }

  public getValue(): number { return this.value; }
  public getName(): string { return this.name; }
  public isEnabled(): boolean { return this.value === 0; }
}

/**
 * Image type for step image.
 */
export class ImageType {
  public static readonly PreImage = new ImageType(0, 'PreImage', 'Pre-Image');
  public static readonly PostImage = new ImageType(1, 'PostImage', 'Post-Image');

  private constructor(
    private readonly value: number,
    private readonly name: string,
    private readonly displayName: string
  ) {}

  public static fromValue(value: number): ImageType {
    if (value === 0) return ImageType.PreImage;
    if (value === 1) return ImageType.PostImage;
    throw new Error(`Invalid ImageType value: ${value}`);
  }

  public getValue(): number { return this.value; }
  public getName(): string { return this.name; }
  public getDisplayName(): string { return this.displayName; }
}
```

#### Repository Interfaces

```typescript
// src/features/pluginRegistration/domain/interfaces/IPluginPackageRepository.ts
export interface IPluginPackageRepository {
  /**
   * Find all packages in the environment.
   * Optionally filter by solution.
   */
  findAll(
    environmentId: string,
    solutionId?: string
  ): Promise<readonly PluginPackage[]>;

  /**
   * Find package by ID.
   */
  findById(
    environmentId: string,
    packageId: string
  ): Promise<PluginPackage | null>;

  /**
   * Count assemblies in a package.
   * Used for canDelete() business rule.
   */
  countAssemblies(
    environmentId: string,
    packageId: string
  ): Promise<number>;
}

// src/features/pluginRegistration/domain/interfaces/IPluginAssemblyRepository.ts
export interface IPluginAssemblyRepository {
  /**
   * Find all assemblies in the environment.
   * Optionally filter by solution.
   */
  findAll(
    environmentId: string,
    solutionId?: string
  ): Promise<readonly PluginAssembly[]>;

  /**
   * Find assemblies belonging to a specific package.
   */
  findByPackageId(
    environmentId: string,
    packageId: string
  ): Promise<readonly PluginAssembly[]>;

  /**
   * Find standalone assemblies (not in any package).
   * Optionally filter by solution.
   */
  findStandalone(
    environmentId: string,
    solutionId?: string
  ): Promise<readonly PluginAssembly[]>;

  /**
   * Find assembly by ID.
   */
  findById(
    environmentId: string,
    assemblyId: string
  ): Promise<PluginAssembly | null>;

  /**
   * Count active steps for an assembly.
   * Used for canDelete() business rule.
   */
  countActiveSteps(
    environmentId: string,
    assemblyId: string
  ): Promise<number>;
}

// src/features/pluginRegistration/domain/interfaces/IPluginTypeRepository.ts
export interface IPluginTypeRepository {
  /**
   * Find all plugin types in an assembly.
   */
  findByAssemblyId(
    environmentId: string,
    assemblyId: string
  ): Promise<readonly PluginType[]>;

  /**
   * Find plugin type by ID.
   */
  findById(
    environmentId: string,
    pluginTypeId: string
  ): Promise<PluginType | null>;
}

// src/features/pluginRegistration/domain/interfaces/IPluginStepRepository.ts
export interface IPluginStepRepository {
  /**
   * Find all steps for a plugin type.
   */
  findByPluginTypeId(
    environmentId: string,
    pluginTypeId: string
  ): Promise<readonly PluginStep[]>;

  /**
   * Find step by ID.
   */
  findById(
    environmentId: string,
    stepId: string
  ): Promise<PluginStep | null>;
}

// src/features/pluginRegistration/domain/interfaces/IStepImageRepository.ts
export interface IStepImageRepository {
  /**
   * Find all images for a step.
   */
  findByStepId(
    environmentId: string,
    stepId: string
  ): Promise<readonly StepImage[]>;

  /**
   * Find image by ID.
   */
  findById(
    environmentId: string,
    imageId: string
  ): Promise<StepImage | null>;
}
```

---

### Application Layer Types

#### Use Cases

```typescript
/**
 * Loads the complete plugin registration tree for an environment.
 *
 * Orchestrates: Repository fetches → Domain entity creation → Hierarchy building
 *
 * Returns hierarchical structure:
 * - Packages (with their assemblies)
 *   - Assemblies
 *     - PluginTypes
 *       - Steps
 *         - Images
 * - Standalone Assemblies (not in any package)
 *   - PluginTypes
 *     - Steps
 *       - Images
 */
export class LoadPluginRegistrationTreeUseCase {
  constructor(
    private readonly packageRepository: IPluginPackageRepository,
    private readonly assemblyRepository: IPluginAssemblyRepository,
    private readonly pluginTypeRepository: IPluginTypeRepository,
    private readonly stepRepository: IPluginStepRepository,
    private readonly imageRepository: IStepImageRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Executes the use case.
   *
   * @param environmentId - Target environment
   * @param solutionId - Optional solution filter
   * @returns Hierarchical tree data
   */
  public async execute(
    environmentId: string,
    solutionId?: string
  ): Promise<PluginRegistrationTree> {
    this.logger.info('LoadPluginRegistrationTreeUseCase: Loading tree', {
      environmentId,
      solutionId
    });

    // 1. Load packages and standalone assemblies in parallel
    const [packages, standaloneAssemblies] = await Promise.all([
      this.packageRepository.findAll(environmentId, solutionId),
      this.assemblyRepository.findStandalone(environmentId, solutionId)
    ]);

    // 2. For each package, load its assemblies
    const packageTrees = await Promise.all(
      packages.map(async (pkg) => {
        const assemblies = await this.assemblyRepository.findByPackageId(
          environmentId,
          pkg.getId()
        );

        const assemblyTrees = await this.loadAssemblyTrees(environmentId, assemblies);
        return { package: pkg, assemblies: assemblyTrees };
      })
    );

    // 3. Load standalone assembly trees
    const standaloneAssemblyTrees = await this.loadAssemblyTrees(
      environmentId,
      standaloneAssemblies
    );

    this.logger.info('LoadPluginRegistrationTreeUseCase: Tree loaded', {
      packageCount: packages.length,
      standaloneAssemblyCount: standaloneAssemblies.length
    });

    return new PluginRegistrationTree(packageTrees, standaloneAssemblyTrees);
  }

  /**
   * Loads the full tree for a set of assemblies (plugin types → steps → images).
   */
  private async loadAssemblyTrees(
    environmentId: string,
    assemblies: readonly PluginAssembly[]
  ): Promise<AssemblyTreeNode[]> {
    return Promise.all(
      assemblies.map(async (assembly) => {
        const pluginTypes = await this.pluginTypeRepository.findByAssemblyId(
          environmentId,
          assembly.getId()
        );

        const pluginTypeTrees = await Promise.all(
          pluginTypes.map(async (pluginType) => {
            const steps = await this.stepRepository.findByPluginTypeId(
              environmentId,
              pluginType.getId()
            );

            const stepTrees = await Promise.all(
              steps.map(async (step) => {
                const images = await this.imageRepository.findByStepId(
                  environmentId,
                  step.getId()
                );

                return { step, images: [...images] };
              })
            );

            return { pluginType, steps: stepTrees };
          })
        );

        return { assembly, pluginTypes: pluginTypeTrees };
      })
    );
  }
}

/**
 * Helper type for assembly tree nodes (reused in packages and standalone).
 */
type AssemblyTreeNode = {
  assembly: PluginAssembly;
  pluginTypes: ReadonlyArray<{
    pluginType: PluginType;
    steps: ReadonlyArray<{
      step: PluginStep;
      images: ReadonlyArray<StepImage>;
    }>;
  }>;
};

/**
 * Hierarchical tree structure returned by LoadPluginRegistrationTreeUseCase.
 *
 * Structure:
 * - packages: Plugin packages with their assemblies
 * - standaloneAssemblies: Assemblies not belonging to any package
 */
export class PluginRegistrationTree {
  constructor(
    private readonly packages: ReadonlyArray<{
      package: PluginPackage;
      assemblies: ReadonlyArray<AssemblyTreeNode>;
    }>,
    private readonly standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>
  ) {}

  public getPackages(): ReadonlyArray<{
    package: PluginPackage;
    assemblies: ReadonlyArray<AssemblyTreeNode>;
  }> {
    return this.packages;
  }

  public getStandaloneAssemblies(): ReadonlyArray<AssemblyTreeNode> {
    return this.standaloneAssemblies;
  }

  /**
   * Checks if tree has any content.
   */
  public isEmpty(): boolean {
    return this.packages.length === 0 && this.standaloneAssemblies.length === 0;
  }

  /**
   * Counts total nodes in the tree.
   * Used for logging and empty state detection.
   */
  public getTotalNodeCount(): number {
    let count = this.packages.length + this.standaloneAssemblies.length;

    // Count nodes in packages
    for (const packageNode of this.packages) {
      count += this.countAssemblyTreeNodes(packageNode.assemblies);
    }

    // Count nodes in standalone assemblies
    count += this.countAssemblyTreeNodes(this.standaloneAssemblies);

    return count;
  }

  private countAssemblyTreeNodes(assemblies: ReadonlyArray<AssemblyTreeNode>): number {
    let count = assemblies.length;

    for (const assemblyNode of assemblies) {
      count += assemblyNode.pluginTypes.length;

      for (const pluginTypeNode of assemblyNode.pluginTypes) {
        count += pluginTypeNode.steps.length;

        for (const stepNode of pluginTypeNode.steps) {
          count += stepNode.images.length;
        }
      }
    }

    return count;
  }
}
```

#### ViewModels

```typescript
/**
 * Unified view model for tree nodes.
 * Supports all 5 node types (Package, Assembly, PluginType, Step, Image).
 *
 * Flat structure for client-side tree rendering.
 */
export interface TreeItemViewModel {
  readonly id: string;
  readonly parentId: string | null;
  readonly type: 'package' | 'assembly' | 'pluginType' | 'step' | 'image';
  readonly name: string;
  readonly displayName: string; // Formatted for tree display
  readonly icon: string; // Icon name for tree
  readonly metadata: PackageMetadata | AssemblyMetadata | PluginTypeMetadata | StepMetadata | ImageMetadata;
  readonly isManaged: boolean;
  readonly children: TreeItemViewModel[]; // Nested children
}

/**
 * Package-specific metadata.
 */
export interface PackageMetadata {
  uniqueName: string;
  version: string;
  createdOn: string; // ISO 8601
  modifiedOn: string; // ISO 8601
  canUpdate: boolean;
  canDelete: boolean;
}

/**
 * Assembly-specific metadata.
 */
export interface AssemblyMetadata {
  version: string;
  isolationMode: string;
  sourceType: string;
  createdOn: string; // ISO 8601
  modifiedOn: string; // ISO 8601
  canUpdate: boolean;
  canDelete: boolean;
}

/**
 * Plugin type-specific metadata.
 */
export interface PluginTypeMetadata {
  typeName: string; // Fully qualified class name
  friendlyName: string;
  isWorkflowActivity: boolean;
  workflowActivityGroupName: string | null;
}

/**
 * Step-specific metadata.
 */
export interface StepMetadata {
  messageName: string;
  primaryEntityLogicalName: string | null;
  stage: string; // "PreValidation", "PreOperation", "PostOperation"
  mode: string; // "Synchronous", "Asynchronous"
  rank: number;
  isEnabled: boolean;
  filteringAttributes: string[]; // Array of attribute names
  executionOrder: string; // "PostOperation (40) - Rank 10"
  createdOn: string; // ISO 8601
  canEnable: boolean;
  canDisable: boolean;
  canDelete: boolean;
}

/**
 * Image-specific metadata.
 */
export interface ImageMetadata {
  imageType: string; // "Pre-Image", "Post-Image"
  entityAlias: string;
  attributes: string[]; // Array of attribute names
  createdOn: string; // ISO 8601
}

/**
 * Detail panel view model (optional for Slice 1).
 * Shows selected node's complete metadata.
 */
export interface DetailPanelViewModel {
  readonly nodeType: 'assembly' | 'pluginType' | 'step' | 'image';
  readonly title: string;
  readonly properties: DetailProperty[];
}

export interface DetailProperty {
  readonly label: string;
  readonly value: string;
  readonly copyable: boolean; // If true, show copy button
}
```

#### Mappers

```typescript
/**
 * Maps PluginPackage domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class PluginPackageViewModelMapper {
  public toTreeItem(
    pkg: PluginPackage,
    assemblies: TreeItemViewModel[],
    assemblyCount: number
  ): TreeItemViewModel {
    return {
      id: pkg.getId(),
      parentId: null,
      type: 'package',
      name: pkg.getName(),
      displayName: `${pkg.getName()} (${pkg.getDisplayVersion()})`,
      icon: pkg.isInManagedState() ? 'package-lock' : 'package',
      metadata: {
        uniqueName: pkg.getUniqueName(),
        version: pkg.getVersion(),
        createdOn: pkg.getCreatedOn().toISOString(),
        modifiedOn: pkg.getModifiedOn().toISOString(),
        canUpdate: pkg.canUpdate(),
        canDelete: pkg.canDelete(assemblyCount)
      },
      isManaged: pkg.isInManagedState(),
      children: assemblies
    };
  }
}

/**
 * Maps PluginAssembly domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class PluginAssemblyViewModelMapper {
  public toTreeItem(
    assembly: PluginAssembly,
    pluginTypes: TreeItemViewModel[],
    activeStepCount: number,
    parentPackageId: string | null = null // null for standalone assemblies
  ): TreeItemViewModel {
    return {
      id: assembly.getId(),
      parentId: parentPackageId,
      type: 'assembly',
      name: assembly.getName(),
      displayName: `${assembly.getName()} (${assembly.getDisplayVersion()})`,
      icon: assembly.isInManagedState() ? 'lock' : 'package',
      metadata: {
        version: assembly.getVersion(),
        isolationMode: assembly.getIsolationMode().getName(),
        sourceType: assembly.getSourceType().getName(),
        createdOn: assembly.getCreatedOn().toISOString(),
        modifiedOn: assembly.getModifiedOn().toISOString(),
        canUpdate: assembly.canUpdate(),
        canDelete: assembly.canDelete(activeStepCount)
      },
      isManaged: assembly.isInManagedState(),
      children: pluginTypes
    };
  }
}

/**
 * Maps PluginType domain entity to TreeItemViewModel.
 */
export class PluginTypeViewModelMapper {
  public toTreeItem(
    pluginType: PluginType,
    assemblyId: string,
    steps: TreeItemViewModel[]
  ): TreeItemViewModel {
    return {
      id: pluginType.getId(),
      parentId: assemblyId,
      type: 'pluginType',
      name: pluginType.getName(),
      displayName: pluginType.getDisplayName(),
      icon: pluginType.isWorkflowActivity() ? 'workflow' : 'plugin',
      metadata: {
        typeName: pluginType.getName(),
        friendlyName: pluginType.getFriendlyName(),
        isWorkflowActivity: pluginType.isWorkflowActivity(),
        workflowActivityGroupName: pluginType.getWorkflowActivityGroupName()
      },
      isManaged: false, // Plugin types don't have managed flag
      children: steps
    };
  }
}

/**
 * Maps PluginStep domain entity to TreeItemViewModel.
 */
export class PluginStepViewModelMapper {
  public toTreeItem(
    step: PluginStep,
    pluginTypeId: string,
    images: TreeItemViewModel[]
  ): TreeItemViewModel {
    const entityDisplay = step.getPrimaryEntityLogicalName() || 'none';

    return {
      id: step.getId(),
      parentId: pluginTypeId,
      type: 'step',
      name: step.getName(),
      displayName: `${step.getMessageName()}: ${entityDisplay}`,
      icon: step.isEnabled() ? 'step-enabled' : 'step-disabled',
      metadata: {
        messageName: step.getMessageName(),
        primaryEntityLogicalName: step.getPrimaryEntityLogicalName(),
        stage: step.getStage().getName(),
        mode: step.getMode().getName(),
        rank: step.getRank(),
        isEnabled: step.isEnabled(),
        filteringAttributes: step.getFilteringAttributesArray(),
        executionOrder: step.getExecutionOrder(),
        createdOn: step.getCreatedOn().toISOString(),
        canEnable: step.canEnable(),
        canDisable: step.canDisable(),
        canDelete: step.canDelete()
      },
      isManaged: step.isInManagedState(),
      children: images
    };
  }
}

/**
 * Maps StepImage domain entity to TreeItemViewModel.
 */
export class StepImageViewModelMapper {
  public toTreeItem(
    image: StepImage,
    stepId: string
  ): TreeItemViewModel {
    return {
      id: image.getId(),
      parentId: stepId,
      type: 'image',
      name: image.getName(),
      displayName: `${image.getEntityAlias()} (${image.getImageTypeDisplay()})`,
      icon: 'image',
      metadata: {
        imageType: image.getImageTypeDisplay(),
        entityAlias: image.getEntityAlias(),
        attributes: image.getAttributesArray(),
        createdOn: image.getCreatedOn().toISOString()
      },
      isManaged: false, // Images don't have managed flag
      children: [] // Leaf node
    };
  }
}

/**
 * Orchestrates all mappers to build tree.
 */
export class PluginRegistrationTreeMapper {
  constructor(
    private readonly packageMapper: PluginPackageViewModelMapper,
    private readonly assemblyMapper: PluginAssemblyViewModelMapper,
    private readonly pluginTypeMapper: PluginTypeViewModelMapper,
    private readonly stepMapper: PluginStepViewModelMapper,
    private readonly imageMapper: StepImageViewModelMapper
  ) {}

  /**
   * Converts domain tree to ViewModels.
   * Returns array with packages first, then standalone assemblies.
   */
  public toTreeItems(tree: PluginRegistrationTree): TreeItemViewModel[] {
    const items: TreeItemViewModel[] = [];

    // 1. Map packages with their assemblies
    for (const packageNode of tree.getPackages()) {
      const assemblyItems = this.mapAssemblyNodes(
        packageNode.assemblies,
        packageNode.package.getId() // parent is the package
      );

      items.push(
        this.packageMapper.toTreeItem(
          packageNode.package,
          assemblyItems,
          packageNode.assemblies.length
        )
      );
    }

    // 2. Map standalone assemblies (no parent)
    const standaloneItems = this.mapAssemblyNodes(
      tree.getStandaloneAssemblies(),
      null // no parent
    );
    items.push(...standaloneItems);

    return items;
  }

  private mapAssemblyNodes(
    assemblies: ReadonlyArray<AssemblyTreeNode>,
    parentPackageId: string | null
  ): TreeItemViewModel[] {
    return assemblies.map((assemblyNode) => {
      const pluginTypeItems = assemblyNode.pluginTypes.map((pluginTypeNode) => {
        const stepItems = pluginTypeNode.steps.map((stepNode) => {
          const imageItems = stepNode.images.map((image) =>
            this.imageMapper.toTreeItem(image, stepNode.step.getId())
          );

          return this.stepMapper.toTreeItem(
            stepNode.step,
            pluginTypeNode.pluginType.getId(),
            imageItems
          );
        });

        return this.pluginTypeMapper.toTreeItem(
          pluginTypeNode.pluginType,
          assemblyNode.assembly.getId(),
          stepItems
        );
      });

      const activeStepCount = this.countActiveSteps(assemblyNode);

      return this.assemblyMapper.toTreeItem(
        assemblyNode.assembly,
        pluginTypeItems,
        activeStepCount,
        parentPackageId
      );
    });
  }

  private countActiveSteps(assemblyNode: AssemblyTreeNode): number {
    let count = 0;
    for (const pluginTypeNode of assemblyNode.pluginTypes) {
      for (const stepNode of pluginTypeNode.steps) {
        if (stepNode.step.isEnabled()) {
          count++;
        }
      }
    }
    return count;
  }
}
```

---

### Infrastructure Layer Types

#### Dataverse DTOs

```typescript
/**
 * Dataverse API response for pluginpackage entity.
 */
export interface PluginPackageDto {
  pluginpackageid: string;
  name: string;
  uniquename: string;
  version: string;
  ismanaged: boolean;
  createdon: string; // ISO 8601
  modifiedon: string; // ISO 8601
}

/**
 * Dataverse API response for pluginassembly entity.
 */
export interface PluginAssemblyDto {
  pluginassemblyid: string;
  name: string;
  version: string;
  isolationmode: number; // 1 = None, 2 = Sandbox
  ismanaged: boolean;
  sourcetype: number; // 0 = Database, 1 = Disk, 2 = AzureWebApp
  _pluginpackageid_value: string | null; // FK to pluginpackage (null = standalone)
  createdon: string; // ISO 8601
  modifiedon: string; // ISO 8601
}

/**
 * Dataverse API response for plugintype entity.
 */
export interface PluginTypeDto {
  plugintypeid: string;
  typename: string; // Fully qualified class name
  friendlyname: string;
  pluginassemblyid: string;
  workflowactivitygroupname: string | null;
}

/**
 * Dataverse API response for sdkmessageprocessingstep entity.
 */
export interface PluginStepDto {
  sdkmessageprocessingstepid: string;
  name: string;
  plugintypeid: string;
  sdkmessageid: string;
  'sdkmessageid@OData.Community.Display.V1.FormattedValue'?: string; // Message name
  sdkmessagefilterid: string | null;
  'sdkmessagefilterid@OData.Community.Display.V1.FormattedValue'?: string; // Entity name
  stage: number; // 10 = PreValidation, 20 = PreOperation, 40 = PostOperation
  mode: number; // 0 = Synchronous, 1 = Asynchronous
  rank: number;
  statecode: number; // 0 = Enabled, 1 = Disabled
  filteringattributes: string | null; // Comma-separated
  ismanaged: boolean;
  createdon: string; // ISO 8601
}

/**
 * Dataverse API response for sdkmessageprocessingstepimage entity.
 */
export interface StepImageDto {
  sdkmessageprocessingstepimageid: string;
  name: string;
  sdkmessageprocessingstepid: string;
  imagetype: number; // 0 = PreImage, 1 = PostImage
  entityalias: string;
  attributes: string; // Comma-separated
  createdon: string; // ISO 8601
}
```

#### Repository Implementations

```typescript
/**
 * Dataverse repository for PluginPackage entities.
 * Implements IPluginPackageRepository interface.
 */
export class DataversePluginPackageRepository implements IPluginPackageRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  public async findAll(
    environmentId: string,
    solutionId?: string
  ): Promise<readonly PluginPackage[]> {
    this.logger.debug('DataversePluginPackageRepository: Fetching packages', {
      environmentId,
      solutionId
    });

    let query = 'pluginpackages?$select=pluginpackageid,name,uniquename,version,ismanaged,createdon,modifiedon';

    // Add solution filtering if specified
    if (solutionId && solutionId !== 'default') {
      query += `&$filter=pluginpackageid in (` +
        `select objectid from solutioncomponents ` +
        `where solutionid eq ${solutionId} and componenttype eq 10090)`;
    }

    const response = await this.apiService.get<{ value: PluginPackageDto[] }>(
      environmentId,
      query
    );

    return response.value.map((dto) => this.mapToDomain(dto));
  }

  public async findById(
    environmentId: string,
    packageId: string
  ): Promise<PluginPackage | null> {
    try {
      const response = await this.apiService.get<PluginPackageDto>(
        environmentId,
        `pluginpackages(${packageId})?$select=pluginpackageid,name,uniquename,version,ismanaged,createdon,modifiedon`
      );

      return this.mapToDomain(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  public async countAssemblies(
    environmentId: string,
    packageId: string
  ): Promise<number> {
    const query = `pluginassemblies?$select=pluginassemblyid&$filter=` +
      `_pluginpackageid_value eq ${packageId}&$count=true`;

    const response = await this.apiService.get<{ '@odata.count': number }>(
      environmentId,
      query
    );

    return response['@odata.count'];
  }

  private mapToDomain(dto: PluginPackageDto): PluginPackage {
    return new PluginPackage(
      dto.pluginpackageid,
      dto.name,
      dto.uniquename,
      dto.version,
      dto.ismanaged,
      new Date(dto.createdon),
      new Date(dto.modifiedon)
    );
  }
}

/**
 * Dataverse repository for PluginAssembly entities.
 * Implements IPluginAssemblyRepository interface.
 */
export class DataversePluginAssemblyRepository implements IPluginAssemblyRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  public async findAll(
    environmentId: string,
    solutionId?: string
  ): Promise<readonly PluginAssembly[]> {
    this.logger.debug('DataversePluginAssemblyRepository: Fetching assemblies', {
      environmentId,
      solutionId
    });

    let query = 'pluginassemblies?$select=pluginassemblyid,name,version,isolationmode,ismanaged,sourcetype,_pluginpackageid_value,createdon,modifiedon';

    // Add solution filtering if specified
    if (solutionId && solutionId !== 'default') {
      query += `&$filter=pluginassemblyid in (` +
        `select objectid from solutioncomponents ` +
        `where solutionid eq ${solutionId} and componenttype eq 91)`;
    }

    const response = await this.apiService.get<{ value: PluginAssemblyDto[] }>(
      environmentId,
      query
    );

    return response.value.map((dto) => this.mapToDomain(dto));
  }

  public async findByPackageId(
    environmentId: string,
    packageId: string
  ): Promise<readonly PluginAssembly[]> {
    this.logger.debug('DataversePluginAssemblyRepository: Fetching assemblies by package', {
      environmentId,
      packageId
    });

    const query = `pluginassemblies?$select=pluginassemblyid,name,version,isolationmode,ismanaged,sourcetype,_pluginpackageid_value,createdon,modifiedon` +
      `&$filter=_pluginpackageid_value eq ${packageId}`;

    const response = await this.apiService.get<{ value: PluginAssemblyDto[] }>(
      environmentId,
      query
    );

    return response.value.map((dto) => this.mapToDomain(dto));
  }

  public async findStandalone(
    environmentId: string,
    solutionId?: string
  ): Promise<readonly PluginAssembly[]> {
    this.logger.debug('DataversePluginAssemblyRepository: Fetching standalone assemblies', {
      environmentId,
      solutionId
    });

    let query = `pluginassemblies?$select=pluginassemblyid,name,version,isolationmode,ismanaged,sourcetype,_pluginpackageid_value,createdon,modifiedon` +
      `&$filter=_pluginpackageid_value eq null`;

    // Add solution filtering if specified
    if (solutionId && solutionId !== 'default') {
      query += ` and pluginassemblyid in (` +
        `select objectid from solutioncomponents ` +
        `where solutionid eq ${solutionId} and componenttype eq 91)`;
    }

    const response = await this.apiService.get<{ value: PluginAssemblyDto[] }>(
      environmentId,
      query
    );

    return response.value.map((dto) => this.mapToDomain(dto));
  }

  public async findById(
    environmentId: string,
    assemblyId: string
  ): Promise<PluginAssembly | null> {
    this.logger.debug('DataversePluginAssemblyRepository: Fetching assembly by ID', {
      environmentId,
      assemblyId
    });

    try {
      const response = await this.apiService.get<PluginAssemblyDto>(
        environmentId,
        `pluginassemblies(${assemblyId})?$select=pluginassemblyid,name,version,isolationmode,ismanaged,sourcetype,_pluginpackageid_value,createdon,modifiedon`
      );

      return this.mapToDomain(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  public async countActiveSteps(
    environmentId: string,
    assemblyId: string
  ): Promise<number> {
    this.logger.debug('DataversePluginAssemblyRepository: Counting active steps', {
      environmentId,
      assemblyId
    });

    const query = `sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid&$filter=` +
      `statecode eq 0 and ` +
      `plugintypeid/pluginassemblyid eq ${assemblyId}` +
      `&$count=true`;

    const response = await this.apiService.get<{ '@odata.count': number }>(
      environmentId,
      query
    );

    return response['@odata.count'];
  }

  private mapToDomain(dto: PluginAssemblyDto): PluginAssembly {
    return new PluginAssembly(
      dto.pluginassemblyid,
      dto.name,
      dto.version,
      IsolationMode.fromValue(dto.isolationmode),
      dto.ismanaged,
      SourceType.fromValue(dto.sourcetype),
      dto._pluginpackageid_value, // null for standalone assemblies
      new Date(dto.createdon),
      new Date(dto.modifiedon)
    );
  }
}

/**
 * Dataverse repository for PluginType entities.
 */
export class DataversePluginTypeRepository implements IPluginTypeRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  public async findByAssemblyId(
    environmentId: string,
    assemblyId: string
  ): Promise<readonly PluginType[]> {
    this.logger.debug('DataversePluginTypeRepository: Fetching plugin types', {
      environmentId,
      assemblyId
    });

    const query = `plugintypes?$select=plugintypeid,typename,friendlyname,pluginassemblyid,workflowactivitygroupname&$filter=pluginassemblyid eq ${assemblyId}`;

    const response = await this.apiService.get<{ value: PluginTypeDto[] }>(
      environmentId,
      query
    );

    return response.value.map((dto) => this.mapToDomain(dto));
  }

  public async findById(
    environmentId: string,
    pluginTypeId: string
  ): Promise<PluginType | null> {
    this.logger.debug('DataversePluginTypeRepository: Fetching plugin type by ID', {
      environmentId,
      pluginTypeId
    });

    try {
      const response = await this.apiService.get<PluginTypeDto>(
        environmentId,
        `plugintypes(${pluginTypeId})?$select=plugintypeid,typename,friendlyname,pluginassemblyid,workflowactivitygroupname`
      );

      return this.mapToDomain(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  private mapToDomain(dto: PluginTypeDto): PluginType {
    return new PluginType(
      dto.plugintypeid,
      dto.typename,
      dto.friendlyname,
      dto.pluginassemblyid,
      dto.workflowactivitygroupname
    );
  }
}

/**
 * Dataverse repository for PluginStep entities.
 */
export class DataversePluginStepRepository implements IPluginStepRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  public async findByPluginTypeId(
    environmentId: string,
    pluginTypeId: string
  ): Promise<readonly PluginStep[]> {
    this.logger.debug('DataversePluginStepRepository: Fetching steps', {
      environmentId,
      pluginTypeId
    });

    // Expand sdkmessageid and sdkmessagefilterid to get denormalized names
    const query = `sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid,name,plugintypeid,sdkmessageid,sdkmessagefilterid,stage,mode,rank,statecode,filteringattributes,ismanaged,createdon&$filter=plugintypeid eq ${pluginTypeId}&$expand=sdkmessageid($select=name),sdkmessagefilterid($select=primaryobjecttypecode)`;

    const response = await this.apiService.get<{ value: PluginStepDto[] }>(
      environmentId,
      query
    );

    return response.value.map((dto) => this.mapToDomain(dto));
  }

  public async findById(
    environmentId: string,
    stepId: string
  ): Promise<PluginStep | null> {
    this.logger.debug('DataversePluginStepRepository: Fetching step by ID', {
      environmentId,
      stepId
    });

    try {
      const query = `sdkmessageprocessingsteps(${stepId})?$select=sdkmessageprocessingstepid,name,plugintypeid,sdkmessageid,sdkmessagefilterid,stage,mode,rank,statecode,filteringattributes,ismanaged,createdon&$expand=sdkmessageid($select=name),sdkmessagefilterid($select=primaryobjecttypecode)`;

      const response = await this.apiService.get<PluginStepDto>(
        environmentId,
        query
      );

      return this.mapToDomain(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  private mapToDomain(dto: PluginStepDto): PluginStep {
    // Extract denormalized names from OData annotations
    const messageName = dto['sdkmessageid@OData.Community.Display.V1.FormattedValue'] ?? 'Unknown';
    const entityName = dto['sdkmessagefilterid@OData.Community.Display.V1.FormattedValue'] ?? null;

    return new PluginStep(
      dto.sdkmessageprocessingstepid,
      dto.name,
      dto.plugintypeid,
      dto.sdkmessageid,
      messageName,
      dto.sdkmessagefilterid,
      entityName,
      ExecutionStage.fromValue(dto.stage),
      ExecutionMode.fromValue(dto.mode),
      dto.rank,
      StepStatus.fromValue(dto.statecode),
      dto.filteringattributes,
      dto.ismanaged,
      new Date(dto.createdon)
    );
  }
}

/**
 * Dataverse repository for StepImage entities.
 */
export class DataverseStepImageRepository implements IStepImageRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  public async findByStepId(
    environmentId: string,
    stepId: string
  ): Promise<readonly StepImage[]> {
    this.logger.debug('DataverseStepImageRepository: Fetching images', {
      environmentId,
      stepId
    });

    const query = `sdkmessageprocessingstepimages?$select=sdkmessageprocessingstepimageid,name,sdkmessageprocessingstepid,imagetype,entityalias,attributes,createdon&$filter=sdkmessageprocessingstepid eq ${stepId}`;

    const response = await this.apiService.get<{ value: StepImageDto[] }>(
      environmentId,
      query
    );

    return response.value.map((dto) => this.mapToDomain(dto));
  }

  public async findById(
    environmentId: string,
    imageId: string
  ): Promise<StepImage | null> {
    this.logger.debug('DataverseStepImageRepository: Fetching image by ID', {
      environmentId,
      imageId
    });

    try {
      const response = await this.apiService.get<StepImageDto>(
        environmentId,
        `sdkmessageprocessingstepimages(${imageId})?$select=sdkmessageprocessingstepimageid,name,sdkmessageprocessingstepid,imagetype,entityalias,attributes,createdon`
      );

      return this.mapToDomain(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  private mapToDomain(dto: StepImageDto): StepImage {
    return new StepImage(
      dto.sdkmessageprocessingstepimageid,
      dto.name,
      dto.sdkmessageprocessingstepid,
      ImageType.fromValue(dto.imagetype),
      dto.entityalias,
      dto.attributes,
      new Date(dto.createdon)
    );
  }
}
```

---

### Presentation Layer Types

#### Panel (PanelCoordinator Pattern)

```typescript
/**
 * Commands supported by Plugin Registration panel.
 */
type PluginRegistrationCommands =
  | 'refresh'
  | 'openMaker'
  | 'environmentChange'
  | 'solutionChange'
  | 'selectNode'
  | 'filterTree';

/**
 * Plugin Registration panel using PanelCoordinator architecture.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 *
 * Features:
 * - Tree-based hierarchy (Assemblies → PluginTypes → Steps → Images)
 * - Solution filtering
 * - Environment switching
 * - Detail panel (future)
 *
 * Architecture:
 * - Uses PanelCoordinator for type-safe command handling
 * - Custom tree section (no shared tree section exists yet)
 * - Data-driven updates via postMessage
 */
export class PluginRegistrationPanel extends EnvironmentScopedPanel<PluginRegistrationPanel> {
  public static readonly viewType = 'powerPlatformDevSuite.pluginRegistration';
  private static panels = new Map<string, PluginRegistrationPanel>();

  private readonly coordinator: PanelCoordinator<PluginRegistrationCommands>;
  private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
  private currentEnvironmentId: string;
  private currentSolutionId: string = 'default';
  private selectedNodeId: string | null = null;

  private constructor(
    private readonly panel: SafeWebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
    private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
    private readonly loadTreeUseCase: LoadPluginRegistrationTreeUseCase,
    private readonly solutionRepository: ISolutionRepository,
    private readonly urlBuilder: IMakerUrlBuilder,
    private readonly treeMapper: PluginRegistrationTreeMapper,
    private readonly logger: ILogger,
    environmentId: string
  ) {
    super();
    this.currentEnvironmentId = environmentId;

    logger.debug('PluginRegistrationPanel: Initializing');

    // Configure webview
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

  protected reveal(column: vscode.ViewColumn): void {
    this.panel.reveal(column);
  }

  protected getCurrentEnvironmentId(): string {
    return this.currentEnvironmentId;
  }

  private createCoordinator(): {
    coordinator: PanelCoordinator<PluginRegistrationCommands>;
    scaffoldingBehavior: HtmlScaffoldingBehavior;
  } {
    // Define sections
    const sections = [
      new ActionButtonsSection({
        buttons: [
          { id: 'openMaker', label: 'Open in Maker' },
          { id: 'refresh', label: 'Refresh' }
        ]
      }, SectionPosition.Toolbar),

      new EnvironmentSelectorSection(),
      new SolutionFilterSection(),

      // Custom tree section (to be created)
      new PluginRegistrationTreeSection()
    ];

    // Create composition behavior
    const compositionBehavior = new SectionCompositionBehavior(
      sections,
      PanelLayout.SingleColumn
    );

    // Resolve CSS modules
    const cssUris = resolveCssModules(
      {
        base: true,
        components: ['buttons', 'inputs'],
        sections: ['environment-selector', 'solution-filter', 'action-buttons']
      },
      this.extensionUri,
      this.panel.webview
    );

    // Add feature-specific CSS
    const featureCssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'resources',
        'webview',
        'css',
        'features',
        'plugin-registration.css'
      )
    ).toString();

    // Create scaffolding behavior
    const scaffoldingConfig: HtmlScaffoldingConfig = {
      cssUris: [...cssUris, featureCssUri],
      jsUris: [
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
        ).toString(),
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'PluginRegistrationTreeBehavior.js')
        ).toString()
      ],
      cspNonce: getNonce(),
      title: 'Plugin Registration'
    };

    const scaffoldingBehavior = new HtmlScaffoldingBehavior(
      this.panel,
      compositionBehavior,
      scaffoldingConfig
    );

    // Create coordinator
    const coordinator = new PanelCoordinator<PluginRegistrationCommands>({
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

    this.coordinator.registerHandler('openMaker', async () => {
      await this.handleOpenMaker();
    });

    this.coordinator.registerHandler('environmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId) {
        await this.handleEnvironmentChange(environmentId);
      }
    });

    this.coordinator.registerHandler('solutionChange', async (data) => {
      const solutionId = (data as { solutionId?: string })?.solutionId;
      if (solutionId) {
        await this.handleSolutionChange(solutionId);
      }
    });

    this.coordinator.registerHandler('selectNode', async (data) => {
      const nodeId = (data as { nodeId?: string })?.nodeId;
      if (nodeId) {
        this.handleNodeSelection(nodeId);
      }
    });

    this.coordinator.registerHandler('filterTree', async (data) => {
      const query = (data as { query?: string })?.query;
      if (query !== undefined) {
        // Client-side tree filtering handled by PluginRegistrationTreeBehavior.js
        // No server-side action needed for Slice 1
        this.logger.debug('Tree filter query', { query });
      }
    });
  }

  private async initializeAndLoadData(): Promise<void> {
    // Initial render with loading state
    const environments = await this.getEnvironments();
    await this.scaffoldingBehavior.refresh({
      environments,
      currentEnvironmentId: this.currentEnvironmentId,
      solutions: [],
      currentSolutionId: this.currentSolutionId,
      isLoading: true
    });

    // Load solutions
    const solutions = await this.loadSolutions();

    // Update solutions dropdown
    await this.panel.postMessage({
      command: 'updateSolutionSelector',
      data: {
        solutions,
        currentSolutionId: this.currentSolutionId
      }
    });

    // Load tree data
    await this.handleRefresh();
  }

  private async loadSolutions(): Promise<SolutionOption[]> {
    try {
      return await this.solutionRepository.findAllForDropdown(
        this.currentEnvironmentId
      );
    } catch (error) {
      this.logger.error('Failed to load solutions', error);
      return [];
    }
  }

  private async handleRefresh(): Promise<void> {
    this.logger.debug('Refreshing plugin registration tree', {
      environmentId: this.currentEnvironmentId,
      solutionId: this.currentSolutionId
    });

    try {
      // Load tree from use case
      const tree = await this.loadTreeUseCase.execute(
        this.currentEnvironmentId,
        this.currentSolutionId === 'default' ? undefined : this.currentSolutionId
      );

      // Map to ViewModels
      const treeItems = this.treeMapper.toTreeItems(tree);

      this.logger.info('Plugin registration tree loaded', {
        nodeCount: tree.getTotalNodeCount()
      });

      // Send to client
      await this.panel.postMessage({
        command: 'updateTree',
        data: { treeItems }
      });
    } catch (error: unknown) {
      this.logger.error('Error loading plugin registration tree', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(
        `Failed to load plugin registration: ${errorMessage}`
      );
    }
  }

  private async handleOpenMaker(): Promise<void> {
    const environment = await this.getEnvironmentById(this.currentEnvironmentId);
    if (!environment?.powerPlatformEnvironmentId) {
      this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
      vscode.window.showErrorMessage(
        'Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.'
      );
      return;
    }

    // TODO: IMakerUrlBuilder needs buildPluginRegistrationUrl method
    const url = this.urlBuilder.buildPluginRegistrationUrl(
      environment.powerPlatformEnvironmentId,
      this.currentSolutionId
    );
    await vscode.env.openExternal(vscode.Uri.parse(url));
    this.logger.info('Opened plugin registration in Maker Portal');
  }

  private async handleEnvironmentChange(environmentId: string): Promise<void> {
    this.logger.debug('Environment changed', { environmentId });

    const oldEnvironmentId = this.currentEnvironmentId;
    this.currentEnvironmentId = environmentId;

    // Re-register panel in map
    this.reregisterPanel(
      PluginRegistrationPanel.panels,
      oldEnvironmentId,
      this.currentEnvironmentId
    );

    const environment = await this.getEnvironmentById(environmentId);
    if (environment) {
      this.panel.title = `Plugin Registration - ${environment.name}`;
    }

    // Reload solutions for new environment
    const solutions = await this.loadSolutions();

    await this.panel.postMessage({
      command: 'updateSolutionSelector',
      data: {
        solutions,
        currentSolutionId: this.currentSolutionId
      }
    });

    await this.handleRefresh();
  }

  private async handleSolutionChange(solutionId: string): Promise<void> {
    this.logger.debug('Solution changed', { solutionId });

    this.currentSolutionId = solutionId;
    await this.handleRefresh();
  }

  private handleNodeSelection(nodeId: string): void {
    this.logger.debug('Node selected', { nodeId });
    this.selectedNodeId = nodeId;

    // TODO: Future slice - load detail panel for selected node
  }

  public static async createOrShow(
    extensionUri: vscode.Uri,
    getEnvironments: () => Promise<EnvironmentOption[]>,
    getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
    loadTreeUseCase: LoadPluginRegistrationTreeUseCase,
    solutionRepository: ISolutionRepository,
    urlBuilder: IMakerUrlBuilder,
    treeMapper: PluginRegistrationTreeMapper,
    logger: ILogger,
    initialEnvironmentId?: string
  ): Promise<PluginRegistrationPanel> {
    return EnvironmentScopedPanel.createOrShowPanel({
      viewType: PluginRegistrationPanel.viewType,
      titlePrefix: 'Plugin Registration',
      extensionUri,
      getEnvironments,
      getEnvironmentById,
      initialEnvironmentId,
      panelFactory: (panel, envId) => new PluginRegistrationPanel(
        panel,
        extensionUri,
        getEnvironments,
        getEnvironmentById,
        loadTreeUseCase,
        solutionRepository,
        urlBuilder,
        treeMapper,
        logger,
        envId
      ),
      webviewOptions: {
        enableScripts: true,
        retainContextWhenHidden: true,
        enableFindWidget: true
      }
    }, PluginRegistrationPanel.panels);
  }
}
```

#### Custom Tree Section

```typescript
/**
 * Custom section that renders plugin registration tree.
 *
 * Layout:
 * - Tree search input
 * - Hierarchical tree (Assemblies → PluginTypes → Steps → Images)
 * - Expand/collapse nodes
 * - Icon-based visual hierarchy
 *
 * Client-side behavior loaded from PluginRegistrationTreeBehavior.js handles:
 * - Tree filtering
 * - Expand/collapse
 * - Node selection
 */
export class PluginRegistrationTreeSection implements ISection {
  readonly position = SectionPosition.Main;

  render(_data: SectionRenderData): string {
    return `
      <div class="plugin-registration-container">
        <!-- Tree Search -->
        <div class="tree-search-container">
          <input
            type="text"
            id="treeSearch"
            class="tree-search-input"
            placeholder="🔍 Filter plugin registration..."
            autocomplete="off"
          />
        </div>

        <!-- Tree Container -->
        <div class="tree-container" id="pluginTree">
          <div class="tree-loading">Loading plugin registration...</div>
        </div>

        <!-- Empty State -->
        <div class="tree-empty" id="treeEmpty" style="display: none;">
          <p>No plugin assemblies found.</p>
          <p class="help-text">Register assemblies using the Plugin Registration Tool or upload a DLL.</p>
        </div>
      </div>
    `;
  }
}
```

---

## File Structure

```
src/features/pluginRegistration/
├── domain/
│   ├── entities/
│   │   ├── PluginPackage.ts               # Rich entity with canUpdate(), canDelete()
│   │   ├── PluginAssembly.ts              # Rich entity with canUpdate(), canDelete(), isInPackage()
│   │   ├── PluginType.ts                  # Plugin class entity
│   │   ├── PluginStep.ts                  # Step entity with isEnabled(), canEnable()
│   │   └── StepImage.ts                   # Image entity
│   ├── valueObjects/
│   │   ├── IsolationMode.ts               # None | Sandbox
│   │   ├── SourceType.ts                  # Database | Disk | AzureWebApp
│   │   ├── ExecutionStage.ts              # PreValidation | PreOperation | PostOperation
│   │   ├── ExecutionMode.ts               # Synchronous | Asynchronous
│   │   ├── StepStatus.ts                  # Enabled | Disabled
│   │   └── ImageType.ts                   # PreImage | PostImage
│   └── interfaces/
│       ├── IPluginPackageRepository.ts    # Domain defines contract
│       ├── IPluginAssemblyRepository.ts
│       ├── IPluginTypeRepository.ts
│       ├── IPluginStepRepository.ts
│       └── IStepImageRepository.ts
│
├── application/
│   ├── useCases/
│   │   └── LoadPluginRegistrationTreeUseCase.ts  # Orchestrates hierarchical loading
│   ├── viewModels/
│   │   └── TreeItemViewModel.ts           # Unified tree node DTO
│   └── mappers/
│       ├── PluginPackageViewModelMapper.ts
│       ├── PluginAssemblyViewModelMapper.ts
│       ├── PluginTypeViewModelMapper.ts
│       ├── PluginStepViewModelMapper.ts
│       ├── StepImageViewModelMapper.ts
│       └── PluginRegistrationTreeMapper.ts  # Orchestrates all mappers
│
├── infrastructure/
│   └── repositories/
│       ├── DataversePluginPackageRepository.ts   # Implements interface
│       ├── DataversePluginAssemblyRepository.ts
│       ├── DataversePluginTypeRepository.ts
│       ├── DataversePluginStepRepository.ts
│       └── DataverseStepImageRepository.ts
│
└── presentation/
    ├── panels/
    │   └── PluginRegistrationPanel.ts     # PanelCoordinator pattern
    ├── sections/
    │   └── PluginRegistrationTreeSection.ts  # Custom tree section
    └── initialization/
        └── initializePluginRegistration.ts
```

**New Files:** ~30 files
**Modified Files:**
- `package.json` (commands)
- `extension.ts` (command registration)
- `src/shared/domain/interfaces/IMakerUrlBuilder.ts` (add buildPluginRegistrationUrl)

**Total:** ~33 files for Slice 1

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

```typescript
// Test PluginAssembly entity behavior
describe('PluginAssembly', () => {
  describe('canUpdate', () => {
    it('should return false for managed assemblies', () => {
      const assembly = new PluginAssembly(
        'id',
        'MyAssembly',
        '1.0.0.0',
        IsolationMode.Sandbox,
        true, // isManaged
        SourceType.Database,
        new Date(),
        new Date()
      );
      expect(assembly.canUpdate()).toBe(false);
    });

    it('should return true for unmanaged assemblies', () => {
      const assembly = new PluginAssembly(
        'id',
        'MyAssembly',
        '1.0.0.0',
        IsolationMode.Sandbox,
        false, // isManaged
        SourceType.Database,
        new Date(),
        new Date()
      );
      expect(assembly.canUpdate()).toBe(true);
    });
  });

  describe('canDelete', () => {
    it('should return false if has active steps', () => {
      const assembly = new PluginAssembly(
        'id',
        'MyAssembly',
        '1.0.0.0',
        IsolationMode.Sandbox,
        false,
        SourceType.Database,
        new Date(),
        new Date()
      );
      expect(assembly.canDelete(5)).toBe(false); // 5 active steps
    });

    it('should return true if no active steps and unmanaged', () => {
      const assembly = new PluginAssembly(
        'id',
        'MyAssembly',
        '1.0.0.0',
        IsolationMode.Sandbox,
        false,
        SourceType.Database,
        new Date(),
        new Date()
      );
      expect(assembly.canDelete(0)).toBe(true); // 0 active steps
    });
  });
});

// Test PluginStep entity behavior
describe('PluginStep', () => {
  describe('isEnabled', () => {
    it('should return true if status is Enabled', () => {
      const step = createPluginStep({ status: StepStatus.Enabled });
      expect(step.isEnabled()).toBe(true);
    });

    it('should return false if status is Disabled', () => {
      const step = createPluginStep({ status: StepStatus.Disabled });
      expect(step.isEnabled()).toBe(false);
    });
  });

  describe('canEnable', () => {
    it('should return true if disabled and unmanaged', () => {
      const step = createPluginStep({
        status: StepStatus.Disabled,
        isManaged: false
      });
      expect(step.canEnable()).toBe(true);
    });

    it('should return false if managed', () => {
      const step = createPluginStep({
        status: StepStatus.Disabled,
        isManaged: true
      });
      expect(step.canEnable()).toBe(false);
    });
  });

  describe('getExecutionOrder', () => {
    it('should format execution order correctly', () => {
      const step = createPluginStep({
        stage: ExecutionStage.PostOperation,
        rank: 10
      });
      expect(step.getExecutionOrder()).toBe('PostOperation (40) - Rank 10');
    });
  });
});
```

### Application Tests (Target: 90% coverage)

```typescript
// Test LoadPluginRegistrationTreeUseCase orchestration
describe('LoadPluginRegistrationTreeUseCase', () => {
  let useCase: LoadPluginRegistrationTreeUseCase;
  let mockAssemblyRepository: jest.Mocked<IPluginAssemblyRepository>;
  let mockPluginTypeRepository: jest.Mocked<IPluginTypeRepository>;
  let mockStepRepository: jest.Mocked<IPluginStepRepository>;
  let mockImageRepository: jest.Mocked<IStepImageRepository>;

  beforeEach(() => {
    mockAssemblyRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      countActiveSteps: jest.fn()
    } as any;
    mockPluginTypeRepository = {
      findByAssemblyId: jest.fn(),
      findById: jest.fn()
    } as any;
    mockStepRepository = {
      findByPluginTypeId: jest.fn(),
      findById: jest.fn()
    } as any;
    mockImageRepository = {
      findByStepId: jest.fn(),
      findById: jest.fn()
    } as any;

    useCase = new LoadPluginRegistrationTreeUseCase(
      mockAssemblyRepository,
      mockPluginTypeRepository,
      mockStepRepository,
      mockImageRepository,
      new NullLogger()
    );
  });

  it('should load hierarchical tree', async () => {
    const assembly = createPluginAssembly();
    const pluginType = createPluginType({ assemblyId: assembly.getId() });
    const step = createPluginStep({ pluginTypeId: pluginType.getId() });
    const image = createStepImage({ stepId: step.getId() });

    mockAssemblyRepository.findAll.mockResolvedValue([assembly]);
    mockPluginTypeRepository.findByAssemblyId.mockResolvedValue([pluginType]);
    mockStepRepository.findByPluginTypeId.mockResolvedValue([step]);
    mockImageRepository.findByStepId.mockResolvedValue([image]);

    const tree = await useCase.execute('env-id');

    expect(tree.getAssemblies()).toHaveLength(1);
    expect(tree.getTotalNodeCount()).toBe(4); // 1 assembly + 1 type + 1 step + 1 image
    expect(mockAssemblyRepository.findAll).toHaveBeenCalledWith('env-id', undefined);
  });

  it('should filter by solution', async () => {
    mockAssemblyRepository.findAll.mockResolvedValue([]);
    mockPluginTypeRepository.findByAssemblyId.mockResolvedValue([]);
    mockStepRepository.findByPluginTypeId.mockResolvedValue([]);
    mockImageRepository.findByStepId.mockResolvedValue([]);

    await useCase.execute('env-id', 'solution-id');

    expect(mockAssemblyRepository.findAll).toHaveBeenCalledWith('env-id', 'solution-id');
  });
});
```

### Infrastructure Tests (Optional - only for complex logic)
- Test DTO → Domain transformations
- Test value object mapping (ExecutionStage.fromValue, etc.)
- Skip simple pass-through code

### Manual Testing Scenarios

1. **Happy path:** Open panel → See assemblies → Expand assembly → See plugins → Expand plugin → See steps → Expand step → See images
2. **Solution filtering:** Change solution dropdown → Tree updates with filtered assemblies
3. **Environment switching:** Change environment → Tree reloads for new environment
4. **Empty state:** Environment with no plugins → Show empty state message
5. **Performance:** Environment with 100+ assemblies → Tree loads in < 2 seconds

---

## Dependencies & Prerequisites

### External Dependencies
- [ ] VS Code APIs: Webview, ViewColumn, ExtensionContext
- [ ] NPM packages: None (all existing)
- [ ] Dataverse APIs:
  - `pluginassemblies` entity
  - `plugintypes` entity
  - `sdkmessageprocessingsteps` entity
  - `sdkmessageprocessingstepimages` entity
  - `solutioncomponents` entity (for solution filtering)

### Internal Prerequisites
- [x] Existing shared infrastructure (PanelCoordinator, Sections, Behaviors)
- [x] DataverseApiService
- [x] Solution repository (for dropdown)
- [ ] IMakerUrlBuilder needs new method: `buildPluginRegistrationUrl()`

### Breaking Changes
- [ ] None

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] Entities have behavior (canUpdate, canEnable, isEnabled, etc.)
- [x] Entities validate invariants in constructor
- [x] Value objects are immutable
- [x] Repository interfaces defined in domain
- [x] ZERO external dependencies
- [x] Business rules documented in JSDoc

**Application Layer:**
- [x] Use cases orchestrate only (NO business logic)
- [x] ViewModels are DTOs (no behavior)
- [x] Mappers transform only
- [x] Dependencies injected (repositories, logger)
- [x] Explicit return types on all methods

**Infrastructure Layer:**
- [x] Repositories implement domain interfaces
- [x] Dependencies point inward (infra → domain)
- [x] No business logic in repositories
- [x] Logging for API calls

**Presentation Layer:**
- [x] Panel uses PanelCoordinator<TCommands> pattern
- [x] Command type defined (union of command strings)
- [x] Sections defined (ActionButtonsSection, custom tree section)
- [x] Layout chosen (SingleColumn)
- [x] Command handlers registered with coordinator
- [x] EnvironmentSelectorSection included
- [x] Data-driven updates via postMessage
- [x] Panels call use cases only (NO business logic)

**Type Safety:**
- [x] No `any` types
- [x] Explicit return types on all public methods
- [x] Proper null handling (no `!` assertions)
- [x] Type guards for runtime safety

---

## Extension Integration Checklist

**Commands (for package.json):**
- [ ] Command ID: `power-platform-dev-suite.pluginRegistration`
- [ ] Command ID (pick environment): `power-platform-dev-suite.pluginRegistrationPickEnvironment`
- [ ] Command titles specified
- [ ] Activation events defined
- [ ] Commands added to `"contributes.commands"` array

**Extension Registration (for extension.ts):**
- [ ] Feature initializer function created (`initializePluginRegistration()`)
- [ ] Lazy imports with dynamic `import()`
- [ ] Command handlers registered (both direct and pick-environment)
- [ ] Commands added to `context.subscriptions`
- [ ] Error handling in command handlers
- [ ] Environment picker logic implemented

**Verification:**
- [ ] `npm run compile` passes after package.json changes
- [ ] Command appears in Command Palette (Ctrl+Shift+P)
- [ ] Manual testing completed (F5, invoke command, panel opens)

---

## Key Architectural Decisions

### Decision 1: Hierarchical Loading Strategy
**Considered:**
- Single OData query with deep $expand
- Four separate queries (one per level)
- Hybrid approach (assemblies with $expand for types, then fetch steps/images)

**Chosen:** Four separate queries with parallel execution

**Rationale:**
- OData $expand depth limits (max 2 levels in some Dataverse configurations)
- Better performance for large datasets (avoid fetching unnecessary data)
- Easier to optimize individual queries
- Clearer separation of concerns in repositories

**Tradeoffs:**
- More API calls (but parallelized, so fast)
- Slightly more complex orchestration in use case
- **Gained:** Flexibility, performance, maintainability

---

### Decision 2: Tree vs Table UI
**Considered:**
- Data table with columns (like Web Resources panel)
- Hierarchical tree (like Metadata Browser)
- Split view (tree + table)

**Chosen:** Hierarchical tree

**Rationale:**
- Plugin registration is inherently hierarchical (Assemblies → Types → Steps → Images)
- Tree preserves parent-child relationships visually
- Easier to navigate complex plugin structures
- Matches Microsoft's Plugin Registration Tool UX (familiar)

**Tradeoffs:**
- **Lost:** Sortable columns, multi-column filtering
- **Gained:** Clear hierarchy visualization, familiar navigation

---

### Decision 3: Custom Tree Section vs Shared Tree Section
**Considered:**
- Create shared TreeSection in `src/shared/infrastructure/ui/sections/`
- Create custom PluginRegistrationTreeSection

**Chosen:** Custom tree section (for Slice 1)

**Rationale:**
- No existing shared tree section in codebase
- Creating shared tree section would expand scope significantly
- Can extract to shared section in future if another feature needs trees

**Tradeoffs:**
- **Lost:** Immediate reusability
- **Gained:** Faster implementation, no over-engineering

**Future Enhancement:** Extract to shared TreeSection if 2nd feature needs tree UI

---

### Decision 4: Detail Panel Inclusion in Slice 1
**Considered:**
- Include detail panel in Slice 1 (show selected node metadata)
- Defer detail panel to Slice 2

**Chosen:** Defer to future slice (out of scope for Slice 1)

**Rationale:**
- Slice 1 focus: read-only tree browsing (walking skeleton)
- Detail panel adds complexity without proving core architecture
- Tree display already shows key metadata inline (icons, badges)
- Can add detail panel incrementally in Slice 2

**Tradeoffs:**
- **Lost:** Full metadata visibility in Slice 1
- **Gained:** Faster delivery of MVP, simpler architecture proof

---

## Open Questions

- [x] **Q1:** Should we use deep $expand or separate queries for hierarchical loading?
  - **A:** Separate queries with parallel execution (see Decision 1)

- [x] **Q2:** Tree vs table UI?
  - **A:** Tree (see Decision 2)

- [ ] **Q3:** How to handle large trees (1000+ nodes)?
  - **Defer to implementation:** Start with simple rendering, optimize if performance issues arise. Consider virtual scrolling if needed.

- [ ] **Q4:** Solution filtering: client-side or server-side?
  - **A:** Server-side via OData filter on `solutioncomponents` table (like Web Resources panel)

- [x] **Q5:** Include detail panel in Slice 1?
  - **A:** No, defer to future slice (see Decision 4)

---

## Review & Approval

### Design Phase
- [ ] design-architect invoked
- [ ] Human approval of design

### Implementation Phase (Slice 1 only)
- [ ] Domain layer implemented (entities, value objects, repositories)
- [ ] Application layer implemented (use case, ViewModels, mappers)
- [ ] Infrastructure layer implemented (repository implementations)
- [ ] Presentation layer implemented (panel, tree section)
- [ ] Tests written and passing (`npm test`)
- [ ] Manual testing completed (F5, tree loads, solution filtering works)

### Final Approval
- [ ] All Slice 1 components implemented
- [ ] Tests passing
- [ ] `/code-review` - code-guardian APPROVED

**Status:** Draft
**Date:** 2025-12-08

---

## References

- Related features:
  - `src/features/metadataBrowser/` - Similar tree-based UI pattern
  - `src/features/webResources/` - Similar environment/solution filtering
- External documentation:
  - [Plugin Registration API](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/register-plug-in)
  - [SDK Message Processing Steps](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/understand-the-data-context#sdkmessageprocessingstep-entity)
- Design inspiration: Microsoft Plugin Registration Tool (PRT)
- Workflow guide: `.claude/WORKFLOW.md`
- Panel architecture: `docs/architecture/PANEL_ARCHITECTURE.md`
- Clean architecture: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
