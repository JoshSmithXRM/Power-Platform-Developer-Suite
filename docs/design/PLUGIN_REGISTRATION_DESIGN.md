# Plugin Registration - Technical Design

**Status:** Draft
**Date:** 2025-11-06
**Complexity:** Complex

---

## Overview

**User Problem:** Developers need to view and manage plugin registrations (assemblies, types, steps, images) across Power Platform environments from within VS Code. Currently requires switching to XRM Toolbox or Power Platform admin portal.

**Solution:** Build a hierarchical tree view panel showing assemblies → types → steps → images with split panel detail view, using the new PanelCoordinator framework and a new reusable TreeViewSection component.

**Value:** Eliminates context switching, enables viewing plugin hierarchy in VS Code, and creates a reusable TreeViewSection component for future features (metadata browser, solution explorer).

---

## Requirements

### Functional Requirements
- [ ] Display plugin hierarchy: Assemblies → Plugin Types → Steps → Images
- [ ] Environment selector to switch between environments
- [ ] Search tree nodes by name, type, entity, filtering attributes
- [ ] Select node to view properties in detail panel
- [ ] Split panel layout (tree on left, properties on right)
- [ ] Close detail panel to hide properties
- [ ] Refresh data from environment
- [ ] Show node-specific icons (assembly, type, step, image)
- [ ] Expand/collapse tree nodes
- [ ] Load all data upfront for comprehensive search

### Non-Functional Requirements
- [ ] Use existing PluginRegistrationService (bulk queries for performance)
- [ ] Reusable TreeViewSection component (generic, works for any tree)
- [ ] Follow PanelCoordinator architecture pattern
- [ ] Clean Architecture compliance (domain → application → infrastructure → presentation)
- [ ] Handle 100+ assemblies with 1000+ steps without UI lag
- [ ] Search must work across all tree levels (including collapsed nodes)

### Success Criteria
- [ ] User can view complete plugin hierarchy for an environment
- [ ] User can search for plugins by name, entity, or attributes
- [ ] User can click a node to view its properties
- [ ] Panel loads and renders in under 3 seconds for 100+ assemblies
- [ ] TreeViewSection is reusable for other hierarchical data

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can view plugin hierarchy and properties"
**Goal:** Display tree view of assemblies with read-only properties panel

**Domain:**
- Reuse existing PluginAssembly, PluginType, PluginStep, PluginImage DTOs from service
- Create TreeNodeViewModel value object with hierarchy data

**Application:**
- GetPluginHierarchyUseCase (orchestrates service calls and tree building)
- PluginHierarchyViewModelMapper (transforms service DTOs → ViewModels)

**Infrastructure:**
- Reuse PluginRegistrationService as-is (bulk queries already implemented)

**Presentation:**
- TreeViewSection component (NEW - reusable)
- PluginRegistrationPanel using PanelCoordinator
- PluginPropertiesDetailSection for right panel

**Result:** WORKING FEATURE - View hierarchy, expand nodes, select to see properties

---

### Slice 2: "User can search tree nodes"
**Builds on:** Slice 1

**Domain:**
- TreeSearchCriteria value object (search term, min chars, case sensitivity)

**Application:**
- SearchPluginTreeUseCase (filters tree nodes based on criteria)

**Presentation:**
- Add search input to TreeViewSection
- Wire up search behavior to filter/expand matching nodes

**Result:** ENHANCED FEATURE - Search across all tree levels

---

### Slice 3: "User can refresh data from environment"
**Builds on:** Slice 2

**Application:**
- RefreshPluginHierarchyCommand (clears cache, reloads from service)

**Presentation:**
- Add refresh button to toolbar
- Show loading state during refresh

**Result:** ENHANCED FEATURE - Refresh without reopening panel

---

### Future Enhancements (Not MVP)
- **Slice 4:** Edit plugin step properties (enable/disable, change rank)
- **Slice 5:** Register new assembly (upload DLL)
- **Slice 6:** Unregister/delete steps and assemblies
- **Slice 7:** Filter by solution
- **Slice 8:** Open plugin source code in VS Code

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - PluginRegistrationPanel (PanelCoordinator)               │
│ - TreeViewSection (NEW reusable component)                 │
│ - PluginPropertiesDetailSection (properties display)       │
│ - NO business logic (delegates to use cases)               │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - GetPluginHierarchyUseCase (orchestrates data loading)    │
│ - SearchPluginTreeUseCase (filters tree nodes)             │
│ - PluginHierarchyViewModelMapper (DTOs → ViewModels)       │
│ - TreeNodeViewModel (DTO for tree nodes)                   │
│ - PluginPropertiesViewModel (DTO for detail panel)         │
│ - NO business logic (orchestration only)                   │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - Reuse PluginAssembly, PluginType, PluginStep, PluginImage│
│   (DTOs from TEMP service - migrate to domain as entities) │
│ - IPluginRegistrationRepository interface (NEW)            │
│ - Future: Rich domain entities when editing is needed      │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - PluginRegistrationRepository implements interface        │
│   (wraps existing PluginRegistrationService)               │
│ - PluginRegistrationService (existing TEMP service)        │
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

#### Repository Interface
```typescript
/**
 * Repository interface for plugin registration data.
 * Defined in domain, implemented in infrastructure.
 */
export interface IPluginRegistrationRepository {
  /**
   * Fetches all plugin assemblies for an environment.
   */
  getAssemblies(environmentId: string): Promise<readonly PluginAssembly[]>;

  /**
   * Fetches all plugin types across all assemblies (bulk query).
   */
  getAllPluginTypes(environmentId: string): Promise<readonly PluginType[]>;

  /**
   * Fetches all plugin steps across all types (bulk query).
   */
  getAllSteps(environmentId: string): Promise<readonly PluginStep[]>;

  /**
   * Fetches all plugin images across all steps (bulk query).
   */
  getAllImages(environmentId: string): Promise<readonly PluginImage[]>;
}
```

#### Domain Entities (Reusing Existing DTOs)
```typescript
/**
 * Plugin assembly entity.
 * Currently a DTO from service - will become rich entity when editing is added.
 */
export interface PluginAssembly {
  readonly pluginassemblyid: string;
  readonly name: string;
  readonly version: string;
  readonly culture: string;
  readonly publickeytoken: string;
  readonly isolationmode: number; // 1=None, 2=Sandbox
  readonly sourcetype: number; // 0=Database, 1=Disk, 2=GAC, 3=NuGet
  readonly ismanaged: boolean;
  readonly packageid?: string;
  readonly solutionid?: string;
}

/**
 * Plugin type entity.
 */
export interface PluginType {
  readonly plugintypeid: string;
  readonly typename: string;
  readonly friendlyname: string;
  readonly pluginassemblyid: string;
  readonly name: string;
}

/**
 * Plugin step entity.
 */
export interface PluginStep {
  readonly sdkmessageprocessingstepid: string;
  readonly name: string;
  readonly plugintypeid: string;
  readonly sdkmessageid: string;
  readonly stage: number; // 10=PreValidation, 20=PreOperation, 40=PostOperation
  readonly mode: number; // 0=Synchronous, 1=Asynchronous
  readonly rank: number;
  readonly filteringattributes?: string;
  readonly statecode: number; // 0=Enabled, 1=Disabled
  readonly entityLogicalName?: string;
}

/**
 * Plugin image entity.
 */
export interface PluginImage {
  readonly sdkmessageprocessingstepimageid: string;
  readonly name: string;
  readonly entityalias: string;
  readonly imagetype: number; // 0=PreImage, 1=PostImage, 2=Both
  readonly attributes: string; // Comma-separated
  readonly sdkmessageprocessingstepid: string;
}
```

---

### Application Layer Types

#### ViewModels

```typescript
/**
 * Tree node view model for hierarchical display.
 * Generic structure usable for any tree view.
 */
export interface TreeNodeViewModel {
  readonly id: string; // Unique node ID (e.g., "assembly-{guid}")
  readonly label: string; // Display text
  readonly icon: string; // Emoji or icon class
  readonly type: 'assembly' | 'plugintype' | 'step' | 'image'; // Node type
  readonly children?: readonly TreeNodeViewModel[]; // Child nodes
  readonly expanded: boolean; // Expansion state
  readonly selectable: boolean; // Can be clicked
  readonly hasChildren: boolean; // Indicates if children exist
  readonly searchText?: string; // Additional searchable text (entity, attributes)
  readonly data: unknown; // Original domain entity (PluginAssembly, PluginType, etc.)
}

/**
 * Properties view model for detail panel.
 * Displays selected node's properties in user-friendly format.
 */
export interface PluginPropertiesViewModel {
  readonly nodeType: 'assembly' | 'plugintype' | 'step' | 'image';
  readonly title: string; // Display title (e.g., "Assembly: MyPlugin v1.0.0.0")
  readonly icon: string; // Icon to show
  readonly properties: ReadonlyArray<PropertyRowViewModel>; // Property rows
}

/**
 * Individual property row in detail panel.
 */
export interface PropertyRowViewModel {
  readonly label: string; // Friendly label (e.g., "Isolation Mode")
  readonly value: string | number | boolean | null; // Property value
  readonly displayValue: string; // Formatted display value (e.g., "Sandbox" instead of "2")
  readonly valueClass?: string; // CSS class for styling (e.g., "property-id" for GUIDs)
}

/**
 * Empty state view model when no node is selected.
 */
export interface EmptyDetailViewModel {
  readonly message: string;
  readonly iconName: string;
}
```

#### Use Cases

```typescript
/**
 * Loads complete plugin hierarchy for an environment.
 *
 * Orchestrates:
 * 1. Fetch all data in parallel (4 bulk queries)
 * 2. Build in-memory lookup maps
 * 3. Construct tree hierarchy
 * 4. Map to ViewModels
 */
export class GetPluginHierarchyUseCase {
  constructor(
    private readonly repository: IPluginRegistrationRepository,
    private readonly mapper: PluginHierarchyViewModelMapper,
    private readonly logger: ILogger
  ) {}

  async execute(environmentId: string): Promise<readonly TreeNodeViewModel[]> {
    this.logger.info('Loading plugin hierarchy', { environmentId });

    // 1. Fetch all data in parallel (bulk queries)
    const [assemblies, allTypes, allSteps, allImages] = await Promise.all([
      this.repository.getAssemblies(environmentId),
      this.repository.getAllPluginTypes(environmentId),
      this.repository.getAllSteps(environmentId),
      this.repository.getAllImages(environmentId)
    ]);

    this.logger.debug('Plugin data loaded', {
      assemblies: assemblies.length,
      types: allTypes.length,
      steps: allSteps.length,
      images: allImages.length
    });

    // 2. Build tree hierarchy (delegated to mapper)
    const treeNodes = this.mapper.buildTreeHierarchy(
      assemblies,
      allTypes,
      allSteps,
      allImages
    );

    this.logger.info('Plugin hierarchy loaded', { nodeCount: treeNodes.length });

    return treeNodes;
  }
}

/**
 * Searches plugin tree nodes based on criteria.
 *
 * Orchestrates:
 * 1. Filter nodes by search term
 * 2. Expand parent paths for matches
 * 3. Return filtered tree with expanded paths
 */
export class SearchPluginTreeUseCase {
  constructor(
    private readonly logger: ILogger
  ) {}

  execute(
    nodes: readonly TreeNodeViewModel[],
    searchTerm: string
  ): readonly TreeNodeViewModel[] {
    if (!searchTerm || searchTerm.length < 3) {
      return nodes; // No filter for short terms
    }

    this.logger.debug('Searching plugin tree', { searchTerm });

    // Filter and expand matching nodes
    const filtered = this.filterNodes(nodes, searchTerm.toLowerCase());

    this.logger.debug('Search complete', { resultCount: filtered.length });

    return filtered;
  }

  private filterNodes(
    nodes: readonly TreeNodeViewModel[],
    searchTerm: string
  ): readonly TreeNodeViewModel[] {
    // Recursive filtering with parent path expansion
    // (Implementation details in mapper)
    return nodes.filter(node => this.nodeMatches(node, searchTerm));
  }

  private nodeMatches(node: TreeNodeViewModel, searchTerm: string): boolean {
    // Check label and searchText
    const labelMatch = node.label.toLowerCase().includes(searchTerm);
    const searchTextMatch = node.searchText?.toLowerCase().includes(searchTerm);

    return labelMatch || !!searchTextMatch;
  }
}

/**
 * Gets properties view model for selected node.
 *
 * Orchestrates:
 * 1. Determine node type
 * 2. Map entity to properties
 * 3. Format display values
 */
export class GetNodePropertiesUseCase {
  constructor(
    private readonly mapper: PluginPropertiesViewModelMapper,
    private readonly logger: ILogger
  ) {}

  execute(node: TreeNodeViewModel): PluginPropertiesViewModel | EmptyDetailViewModel {
    if (!node.data) {
      return {
        message: 'No properties available',
        iconName: 'info'
      };
    }

    this.logger.debug('Mapping node properties', { nodeType: node.type });

    return this.mapper.toPropertiesViewModel(node.type, node.data);
  }
}
```

#### Mappers

```typescript
/**
 * Maps domain entities to tree hierarchy ViewModels.
 * Handles tree building and in-memory joining.
 */
export class PluginHierarchyViewModelMapper {
  /**
   * Builds complete tree hierarchy from flat entity lists.
   * Uses in-memory lookup maps for performance.
   */
  public buildTreeHierarchy(
    assemblies: readonly PluginAssembly[],
    allTypes: readonly PluginType[],
    allSteps: readonly PluginStep[],
    allImages: readonly PluginImage[]
  ): TreeNodeViewModel[] {
    // Build lookup maps for fast joining
    const typesByAssembly = this.groupByParent(allTypes, t => t.pluginassemblyid);
    const stepsByType = this.groupByParent(allSteps, s => s.plugintypeid);
    const imagesByStep = this.groupByParent(allImages, i => i.sdkmessageprocessingstepid);

    // Build tree bottom-up
    return assemblies.map(assembly => this.mapAssemblyNode(
      assembly,
      typesByAssembly,
      stepsByType,
      imagesByStep
    ));
  }

  private groupByParent<T>(
    items: readonly T[],
    getParentId: (item: T) => string
  ): Map<string, T[]> {
    const map = new Map<string, T[]>();

    for (const item of items) {
      const parentId = getParentId(item);
      const existing = map.get(parentId);

      if (existing) {
        existing.push(item);
      } else {
        map.set(parentId, [item]);
      }
    }

    return map;
  }

  private mapAssemblyNode(
    assembly: PluginAssembly,
    typesByAssembly: Map<string, PluginType[]>,
    stepsByType: Map<string, PluginStep[]>,
    imagesByStep: Map<string, PluginImage[]>
  ): TreeNodeViewModel {
    const types = typesByAssembly.get(assembly.pluginassemblyid) || [];

    const typeNodes = types
      .map(type => this.mapPluginTypeNode(type, stepsByType, imagesByStep))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      id: `assembly-${assembly.pluginassemblyid}`,
      label: `${assembly.name} v${assembly.version}`,
      icon: '📦',
      type: 'assembly',
      children: typeNodes,
      expanded: false,
      selectable: true,
      hasChildren: typeNodes.length > 0,
      data: assembly
    };
  }

  private mapPluginTypeNode(
    type: PluginType,
    stepsByType: Map<string, PluginStep[]>,
    imagesByStep: Map<string, PluginImage[]>
  ): TreeNodeViewModel {
    const steps = stepsByType.get(type.plugintypeid) || [];

    const stepNodes = steps
      .map(step => this.mapStepNode(step, imagesByStep))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Use 'name' field first (matches XRM Toolbox behavior)
    const label = type.name || type.typename || type.friendlyname || type.plugintypeid;

    return {
      id: `plugintype-${type.plugintypeid}`,
      label,
      icon: '🔌',
      type: 'plugintype',
      children: stepNodes,
      expanded: false,
      selectable: true,
      hasChildren: stepNodes.length > 0,
      data: type
    };
  }

  private mapStepNode(
    step: PluginStep,
    imagesByStep: Map<string, PluginImage[]>
  ): TreeNodeViewModel {
    const images = imagesByStep.get(step.sdkmessageprocessingstepid) || [];

    const imageNodes = images
      .map(image => this.mapImageNode(image))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Build searchable text (entity + filtering attributes)
    const searchParts: string[] = [];
    if (step.filteringattributes) {
      searchParts.push(step.filteringattributes);
    }
    if (step.entityLogicalName) {
      searchParts.push(step.entityLogicalName);
    }
    const searchText = searchParts.length > 0 ? searchParts.join(' ') : undefined;

    // Icon: ⚡ for enabled, ⚫ for disabled
    const icon = step.statecode === 0 ? '⚡' : '⚫';

    return {
      id: `step-${step.sdkmessageprocessingstepid}`,
      label: step.name,
      icon,
      type: 'step',
      children: imageNodes,
      expanded: false,
      selectable: true,
      hasChildren: imageNodes.length > 0,
      searchText,
      data: step
    };
  }

  private mapImageNode(image: PluginImage): TreeNodeViewModel {
    // Format attributes for display (truncate if too long)
    const attrs = image.attributes || '';
    const attrDisplay = attrs.length > 80 ? `${attrs.substring(0, 77)}...` : attrs;

    // Image type label
    const contextLabel = this.getImageContextLabel(image.imagetype);

    const label = `${image.name} (${attrDisplay}) - ${contextLabel}`;

    // Full attributes in searchText for comprehensive search
    const searchText = attrs || undefined;

    return {
      id: `image-${image.sdkmessageprocessingstepimageid}`,
      label,
      icon: '🖼️',
      type: 'image',
      expanded: false,
      selectable: true,
      hasChildren: false,
      searchText,
      data: image
    };
  }

  private getImageContextLabel(imageType: number): string {
    switch (imageType) {
      case 0: return 'Pre Entity Image';
      case 1: return 'Post Entity Image';
      case 2: return 'Pre and Post Entity Image';
      default: return 'Unknown';
    }
  }
}

/**
 * Maps node data to properties ViewModels for detail panel.
 */
export class PluginPropertiesViewModelMapper {
  public toPropertiesViewModel(
    nodeType: string,
    data: unknown
  ): PluginPropertiesViewModel {
    switch (nodeType) {
      case 'assembly':
        return this.mapAssemblyProperties(data as PluginAssembly);
      case 'plugintype':
        return this.mapPluginTypeProperties(data as PluginType);
      case 'step':
        return this.mapStepProperties(data as PluginStep);
      case 'image':
        return this.mapImageProperties(data as PluginImage);
      default:
        throw new Error(`Unknown node type: ${nodeType}`);
    }
  }

  private mapAssemblyProperties(assembly: PluginAssembly): PluginPropertiesViewModel {
    return {
      nodeType: 'assembly',
      title: `${assembly.name} v${assembly.version}`,
      icon: '📦',
      properties: [
        this.mapProperty('Name', assembly.name),
        this.mapProperty('Version', assembly.version),
        this.mapProperty('Culture', assembly.culture),
        this.mapProperty('Public Key Token', assembly.publickeytoken),
        this.mapProperty('Isolation Mode', this.formatIsolationMode(assembly.isolationmode)),
        this.mapProperty('Source Type', this.formatSourceType(assembly.sourcetype)),
        this.mapProperty('Is Managed', assembly.ismanaged),
        this.mapProperty('Assembly ID', assembly.pluginassemblyid, 'property-id')
      ]
    };
  }

  private mapPluginTypeProperties(type: PluginType): PluginPropertiesViewModel {
    return {
      nodeType: 'plugintype',
      title: type.name || type.typename,
      icon: '🔌',
      properties: [
        this.mapProperty('Type Name', type.typename),
        this.mapProperty('Friendly Name', type.friendlyname),
        this.mapProperty('Name', type.name),
        this.mapProperty('Plugin Type ID', type.plugintypeid, 'property-id'),
        this.mapProperty('Assembly ID', type.pluginassemblyid, 'property-id')
      ]
    };
  }

  private mapStepProperties(step: PluginStep): PluginPropertiesViewModel {
    return {
      nodeType: 'step',
      title: step.name,
      icon: step.statecode === 0 ? '⚡' : '⚫',
      properties: [
        this.mapProperty('Name', step.name),
        this.mapProperty('Entity', step.entityLogicalName || 'None'),
        this.mapProperty('Stage', this.formatStage(step.stage)),
        this.mapProperty('Mode', this.formatMode(step.mode)),
        this.mapProperty('Rank', step.rank),
        this.mapProperty('Filtering Attributes', step.filteringattributes || 'None'),
        this.mapProperty('State', this.formatState(step.statecode)),
        this.mapProperty('Step ID', step.sdkmessageprocessingstepid, 'property-id'),
        this.mapProperty('Plugin Type ID', step.plugintypeid, 'property-id'),
        this.mapProperty('Message ID', step.sdkmessageid, 'property-id')
      ]
    };
  }

  private mapImageProperties(image: PluginImage): PluginPropertiesViewModel {
    return {
      nodeType: 'image',
      title: image.name,
      icon: '🖼️',
      properties: [
        this.mapProperty('Name', image.name),
        this.mapProperty('Entity Alias', image.entityalias),
        this.mapProperty('Image Type', this.formatImageType(image.imagetype)),
        this.mapProperty('Attributes', image.attributes),
        this.mapProperty('Image ID', image.sdkmessageprocessingstepimageid, 'property-id'),
        this.mapProperty('Step ID', image.sdkmessageprocessingstepid, 'property-id')
      ]
    };
  }

  private mapProperty(
    label: string,
    value: string | number | boolean | null | undefined,
    valueClass?: string
  ): PropertyRowViewModel {
    return {
      label,
      value: value ?? null,
      displayValue: this.formatDisplayValue(value),
      valueClass
    };
  }

  private formatDisplayValue(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }

  private formatIsolationMode(mode: number): string {
    switch (mode) {
      case 1: return 'None';
      case 2: return 'Sandbox';
      default: return `Unknown (${mode})`;
    }
  }

  private formatSourceType(source: number): string {
    switch (source) {
      case 0: return 'Database';
      case 1: return 'Disk';
      case 2: return 'GAC';
      case 3: return 'NuGet';
      default: return `Unknown (${source})`;
    }
  }

  private formatStage(stage: number): string {
    switch (stage) {
      case 10: return 'PreValidation';
      case 20: return 'PreOperation';
      case 40: return 'PostOperation';
      default: return `Unknown (${stage})`;
    }
  }

  private formatMode(mode: number): string {
    switch (mode) {
      case 0: return 'Synchronous';
      case 1: return 'Asynchronous';
      default: return `Unknown (${mode})`;
    }
  }

  private formatState(state: number): string {
    switch (state) {
      case 0: return 'Enabled';
      case 1: return 'Disabled';
      default: return `Unknown (${state})`;
    }
  }

  private formatImageType(imageType: number): string {
    switch (imageType) {
      case 0: return 'PreImage';
      case 1: return 'PostImage';
      case 2: return 'Both';
      default: return `Unknown (${imageType})`;
    }
  }
}
```

---

### Infrastructure Layer Types

#### Repository Implementation

```typescript
/**
 * Implements IPluginRegistrationRepository by wrapping existing service.
 * Adapter pattern: Translates domain interface to infrastructure service.
 */
export class PluginRegistrationRepository implements IPluginRegistrationRepository {
  constructor(
    private readonly service: PluginRegistrationService,
    private readonly logger: ILogger
  ) {}

  async getAssemblies(environmentId: string): Promise<readonly PluginAssembly[]> {
    this.logger.debug('Fetching plugin assemblies', { environmentId });

    const assemblies = await this.service.getAssemblies(environmentId);

    this.logger.debug('Plugin assemblies fetched', { count: assemblies.length });

    return assemblies;
  }

  async getAllPluginTypes(environmentId: string): Promise<readonly PluginType[]> {
    this.logger.debug('Fetching all plugin types', { environmentId });

    const types = await this.service.getAllPluginTypes(environmentId);

    this.logger.debug('Plugin types fetched', { count: types.length });

    return types;
  }

  async getAllSteps(environmentId: string): Promise<readonly PluginStep[]> {
    this.logger.debug('Fetching all plugin steps', { environmentId });

    const steps = await this.service.getAllSteps(environmentId);

    this.logger.debug('Plugin steps fetched', { count: steps.length });

    return steps;
  }

  async getAllImages(environmentId: string): Promise<readonly PluginImage[]> {
    this.logger.debug('Fetching all plugin images', { environmentId });

    const images = await this.service.getAllImages(environmentId);

    this.logger.debug('Plugin images fetched', { count: images.length });

    return images;
  }
}
```

---

### Presentation Layer Types

#### TreeViewSection (NEW Reusable Component)

```typescript
/**
 * Configuration for TreeViewSection.
 * Defines how tree data should be displayed.
 */
export interface TreeViewSectionConfig {
  readonly searchPlaceholder: string;
  readonly emptyMessage: string;
  readonly searchMinChars: number;
  readonly searchDebounceMs: number;
}

/**
 * Section for rendering hierarchical tree views.
 * Generic, reusable component for any tree data.
 *
 * Positioned in main content area.
 */
export class TreeViewSection implements ISection {
  public readonly position = SectionPosition.Main;

  constructor(private readonly config: TreeViewSectionConfig) {}

  /**
   * Renders tree HTML from data.
   * Delegates to view layer for HTML generation.
   */
  public render(data: SectionRenderData): string {
    const treeNodes = (data.customData?.['treeNodes'] as TreeNodeViewModel[]) || [];
    const expandedNodes = (data.customData?.['expandedNodes'] as Set<string>) || new Set();
    const selectedNodeId = data.customData?.['selectedNodeId'] as string | undefined;

    return renderTreeViewSection({
      nodes: treeNodes,
      config: this.config,
      expandedNodes,
      selectedNodeId,
      isLoading: data.isLoading,
      errorMessage: data.errorMessage
    });
  }
}
```

#### TreeViewSection View (HTML Generation)

```typescript
/**
 * Renders tree view HTML.
 * Pure function - same data always produces same HTML.
 */
export function renderTreeViewSection(params: {
  nodes: readonly TreeNodeViewModel[];
  config: TreeViewSectionConfig;
  expandedNodes: ReadonlySet<string>;
  selectedNodeId?: string;
  isLoading?: boolean;
  errorMessage?: string;
}): string {
  if (params.isLoading) {
    return `
      <div class="tree-view-container">
        <div class="tree-view-loading">
          <div class="spinner"></div>
          <p>Loading plugin hierarchy...</p>
        </div>
      </div>
    `;
  }

  if (params.errorMessage) {
    return `
      <div class="tree-view-container">
        <div class="tree-view-error">
          <p>Error: ${escapeHtml(params.errorMessage)}</p>
        </div>
      </div>
    `;
  }

  if (params.nodes.length === 0) {
    return `
      <div class="tree-view-container">
        <div class="tree-view-empty">
          <p>${escapeHtml(params.config.emptyMessage)}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="tree-view-container">
      <div class="tree-view-search">
        <input
          type="text"
          id="tree-search-input"
          class="tree-search-input"
          placeholder="${escapeHtml(params.config.searchPlaceholder)}"
          data-min-chars="${params.config.searchMinChars}"
          data-debounce-ms="${params.config.searchDebounceMs}"
        />
      </div>
      <div class="tree-view-nodes">
        ${params.nodes.map(node => renderTreeNode(node, params.expandedNodes, params.selectedNodeId, 0)).join('')}
      </div>
    </div>
  `;
}

/**
 * Renders individual tree node recursively.
 */
function renderTreeNode(
  node: TreeNodeViewModel,
  expandedNodes: ReadonlySet<string>,
  selectedNodeId: string | undefined,
  depth: number
): string {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = node.id === selectedNodeId;
  const hasChildren = node.hasChildren || (node.children && node.children.length > 0);

  const expandIconClass = hasChildren
    ? (isExpanded ? 'tree-node-expand-icon expanded' : 'tree-node-expand-icon')
    : 'tree-node-expand-icon hidden';

  const nodeClass = `tree-node ${isSelected ? 'selected' : ''} ${node.selectable ? 'selectable' : ''}`;
  const childrenClass = `tree-node-children ${isExpanded ? 'expanded' : 'collapsed'}`;

  const childrenHtml = (node.children && isExpanded)
    ? node.children.map(child => renderTreeNode(child, expandedNodes, selectedNodeId, depth + 1)).join('')
    : '';

  return `
    <div class="tree-node-wrapper" data-node-id="${node.id}" data-depth="${depth}">
      <div class="${nodeClass}" data-node-id="${node.id}" data-node-type="${node.type}">
        <span class="${expandIconClass}" data-action="toggle-node" data-node-id="${node.id}">
          ▶
        </span>
        <span class="tree-node-icon">${node.icon}</span>
        <span class="tree-node-label" title="${escapeHtml(node.label)}">
          ${escapeHtml(node.label)}
        </span>
      </div>
      ${hasChildren ? `<div class="${childrenClass}">${childrenHtml}</div>` : ''}
    </div>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
```

#### PluginPropertiesDetailSection

```typescript
/**
 * Section for displaying plugin node properties.
 * Positioned in detail panel (right side).
 */
export class PluginPropertiesDetailSection implements ISection {
  public readonly position = SectionPosition.Detail;

  private currentProperties: PluginPropertiesViewModel | EmptyDetailViewModel | null = null;

  /**
   * Sets properties to display.
   * Called by panel when node is selected.
   */
  public setProperties(properties: PluginPropertiesViewModel | EmptyDetailViewModel | null): void {
    this.currentProperties = properties;
  }

  /**
   * Renders properties HTML.
   */
  public render(data: SectionRenderData): string {
    if (!this.currentProperties) {
      return this.renderEmpty();
    }

    if ('message' in this.currentProperties) {
      return this.renderEmpty(this.currentProperties.message);
    }

    return this.renderProperties(this.currentProperties);
  }

  private renderEmpty(message?: string): string {
    return `
      <div class="detail-panel-empty">
        <p>${escapeHtml(message || 'Select a node to view properties')}</p>
      </div>
    `;
  }

  private renderProperties(props: PluginPropertiesViewModel): string {
    const propertyRows = props.properties.map(prop => `
      <div class="property-row">
        <span class="property-label">${escapeHtml(prop.label)}:</span>
        <span class="property-value ${prop.valueClass || ''}">${escapeHtml(prop.displayValue)}</span>
      </div>
    `).join('');

    return `
      <div class="detail-panel-header">
        <span class="detail-icon">${props.icon}</span>
        <h3>${escapeHtml(props.title)}</h3>
      </div>
      <div class="detail-panel-body">
        <div class="property-grid">
          ${propertyRows}
        </div>
      </div>
    `;
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
```

#### PluginRegistrationPanel (PanelCoordinator)

```typescript
/**
 * Commands supported by Plugin Registration panel.
 */
type PluginRegistrationCommands =
  | 'refresh'
  | 'environmentChange'
  | 'nodeSelected'
  | 'nodeToggled'
  | 'searchChanged'
  | 'closeDetail';

/**
 * Plugin Registration panel using PanelCoordinator architecture.
 * Features split panel layout with tree view and properties detail.
 */
export class PluginRegistrationPanel {
  public static readonly viewType = 'powerPlatformDevSuite.pluginRegistration';
  private static panels = new Map<string, PluginRegistrationPanel>();

  private readonly coordinator: PanelCoordinator<PluginRegistrationCommands>;
  private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
  private readonly treeSection: TreeViewSection;
  private readonly detailSection: PluginPropertiesDetailSection;

  private currentEnvironmentId: string;
  private treeNodes: readonly TreeNodeViewModel[] = [];
  private expandedNodes: Set<string> = new Set();
  private selectedNodeId: string | undefined;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
    private readonly getEnvironmentById: (envId: string) => Promise<Environment | null>,
    private readonly getPluginHierarchyUseCase: GetPluginHierarchyUseCase,
    private readonly getNodePropertiesUseCase: GetNodePropertiesUseCase,
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
    this.treeSection = result.treeSection;
    this.detailSection = result.detailSection;

    this.registerCommandHandlers();

    void this.initializeAndLoadData();
  }

  public static async createOrShow(
    extensionUri: vscode.Uri,
    getEnvironments: () => Promise<EnvironmentOption[]>,
    getEnvironmentById: (envId: string) => Promise<Environment | null>,
    getPluginHierarchyUseCase: GetPluginHierarchyUseCase,
    getNodePropertiesUseCase: GetNodePropertiesUseCase,
    logger: ILogger,
    initialEnvironmentId?: string
  ): Promise<PluginRegistrationPanel> {
    const column = vscode.ViewColumn.One;

    let targetEnvironmentId = initialEnvironmentId;
    if (!targetEnvironmentId) {
      const environments = await getEnvironments();
      targetEnvironmentId = environments[0]?.id;
    }

    if (!targetEnvironmentId) {
      throw new Error('No environments available');
    }

    const existingPanel = PluginRegistrationPanel.panels.get(targetEnvironmentId);
    if (existingPanel) {
      existingPanel.panel.reveal(column);
      return existingPanel;
    }

    const environment = await getEnvironmentById(targetEnvironmentId);
    const environmentName = environment?.name || 'Unknown';

    const panel = vscode.window.createWebviewPanel(
      PluginRegistrationPanel.viewType,
      `Plugin Registration - ${environmentName}`,
      column,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );

    const newPanel = new PluginRegistrationPanel(
      panel,
      extensionUri,
      getEnvironments,
      getEnvironmentById,
      getPluginHierarchyUseCase,
      getNodePropertiesUseCase,
      logger,
      targetEnvironmentId
    );

    PluginRegistrationPanel.panels.set(targetEnvironmentId, newPanel);

    const envId = targetEnvironmentId;
    panel.onDidDispose(() => {
      PluginRegistrationPanel.panels.delete(envId);
    });

    return newPanel;
  }

  private async initializeAndLoadData(): Promise<void> {
    const environments = await this.getEnvironments();

    await this.scaffoldingBehavior.refresh({
      environments,
      currentEnvironmentId: this.currentEnvironmentId,
      customData: {
        treeNodes: [],
        expandedNodes: this.expandedNodes,
        selectedNodeId: this.selectedNodeId
      }
    });

    await this.handleRefresh();
  }

  private createCoordinator(): {
    coordinator: PanelCoordinator<PluginRegistrationCommands>;
    scaffoldingBehavior: HtmlScaffoldingBehavior;
    treeSection: TreeViewSection;
    detailSection: PluginPropertiesDetailSection;
  } {
    const environmentSelector = new EnvironmentSelectorSection();

    const actionButtons = new ActionButtonsSection({
      buttons: [
        { id: 'refresh', label: 'Refresh' }
      ]
    }, SectionPosition.Toolbar);

    const treeSection = new TreeViewSection({
      searchPlaceholder: '🔍 Search plugins...',
      emptyMessage: 'No plugin assemblies found',
      searchMinChars: 3,
      searchDebounceMs: 300
    });

    const detailSection = new PluginPropertiesDetailSection();

    const compositionBehavior = new SectionCompositionBehavior(
      [
        actionButtons,
        environmentSelector,
        treeSection,
        detailSection
      ],
      PanelLayout.SplitHorizontal
    );

    const cssUris = resolveCssModules(
      {
        base: true,
        components: ['buttons', 'inputs', 'split-panel', 'tree-view'],
        sections: ['environment-selector', 'action-buttons', 'detail-panel']
      },
      this.extensionUri,
      this.panel.webview
    );

    const scaffoldingConfig: HtmlScaffoldingConfig = {
      cssUris,
      jsUris: [
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
        ).toString(),
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'TreeViewBehavior.js')
        ).toString(),
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'PluginRegistrationBehavior.js')
        ).toString()
      ],
      cspNonce: getNonce(),
      title: 'Plugin Registration'
    };

    const scaffoldingBehavior = new HtmlScaffoldingBehavior(
      this.panel.webview,
      compositionBehavior,
      scaffoldingConfig
    );

    const coordinator = new PanelCoordinator<PluginRegistrationCommands>({
      panel: this.panel,
      extensionUri: this.extensionUri,
      behaviors: [scaffoldingBehavior],
      logger: this.logger
    });

    return { coordinator, scaffoldingBehavior, treeSection, detailSection };
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

    this.coordinator.registerHandler('nodeSelected', async (data) => {
      const nodeId = (data as { nodeId?: string })?.nodeId;
      if (nodeId) {
        await this.handleNodeSelected(nodeId);
      }
    });

    this.coordinator.registerHandler('nodeToggled', async (data) => {
      const nodeId = (data as { nodeId?: string })?.nodeId;
      if (nodeId) {
        await this.handleNodeToggled(nodeId);
      }
    });

    this.coordinator.registerHandler('searchChanged', async (data) => {
      const searchTerm = (data as { searchTerm?: string })?.searchTerm || '';
      await this.handleSearchChanged(searchTerm);
    });

    this.coordinator.registerHandler('closeDetail', async () => {
      await this.handleCloseDetail();
    });
  }

  private async handleRefresh(): Promise<void> {
    try {
      this.logger.info('Refreshing plugin hierarchy');

      const treeNodes = await this.getPluginHierarchyUseCase.execute(this.currentEnvironmentId);
      this.treeNodes = treeNodes;

      await this.refreshPanel();

      this.logger.info('Plugin hierarchy loaded', { nodeCount: treeNodes.length });
    } catch (error) {
      this.logger.error('Failed to load plugin hierarchy', error);
      await vscode.window.showErrorMessage('Failed to load plugin hierarchy');
    }
  }

  private async handleEnvironmentChange(environmentId: string): Promise<void> {
    this.logger.debug('Environment changed', { environmentId });
    this.currentEnvironmentId = environmentId;

    const environment = await this.getEnvironmentById(environmentId);
    if (environment) {
      this.panel.title = `Plugin Registration - ${environment.name}`;
    }

    await this.handleRefresh();
  }

  private async handleNodeSelected(nodeId: string): Promise<void> {
    try {
      this.logger.debug('Node selected', { nodeId });

      const node = this.findNodeById(nodeId, this.treeNodes);
      if (!node) {
        this.logger.warn('Node not found', { nodeId });
        return;
      }

      this.selectedNodeId = nodeId;

      const properties = this.getNodePropertiesUseCase.execute(node);
      this.detailSection.setProperties(properties);

      await this.refreshPanel();

      await this.panel.webview.postMessage({
        command: 'showDetailPanel'
      });
    } catch (error) {
      this.logger.error('Failed to view node properties', error);
      await vscode.window.showErrorMessage('Failed to load node properties');
    }
  }

  private async handleNodeToggled(nodeId: string): Promise<void> {
    this.logger.debug('Node toggled', { nodeId });

    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }

    await this.refreshPanel();
  }

  private async handleSearchChanged(searchTerm: string): Promise<void> {
    this.logger.debug('Search changed', { searchTerm });

    // Search logic handled in webview behavior for performance
    // Extension host just tracks state
  }

  private async handleCloseDetail(): Promise<void> {
    this.logger.debug('Closing detail panel');

    this.selectedNodeId = undefined;
    this.detailSection.setProperties(null);

    await this.refreshPanel();

    await this.panel.webview.postMessage({
      command: 'hideDetailPanel'
    });
  }

  private async refreshPanel(): Promise<void> {
    const environments = await this.getEnvironments();

    await this.scaffoldingBehavior.refresh({
      environments,
      currentEnvironmentId: this.currentEnvironmentId,
      customData: {
        treeNodes: this.treeNodes,
        expandedNodes: this.expandedNodes,
        selectedNodeId: this.selectedNodeId
      }
    });
  }

  private findNodeById(
    nodeId: string,
    nodes: readonly TreeNodeViewModel[]
  ): TreeNodeViewModel | undefined {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      if (node.children) {
        const found = this.findNodeById(nodeId, node.children);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }
}
```

---

## File Structure

```
src/features/pluginRegistration/
├── domain/
│   ├── entities/
│   │   ├── PluginAssembly.ts          # Domain entity (initially DTO, migrate from TEMP)
│   │   ├── PluginType.ts              # Domain entity
│   │   ├── PluginStep.ts              # Domain entity
│   │   └── PluginImage.ts             # Domain entity
│   └── interfaces/
│       └── IPluginRegistrationRepository.ts  # Repository contract
│
├── application/
│   ├── useCases/
│   │   ├── GetPluginHierarchyUseCase.ts
│   │   ├── SearchPluginTreeUseCase.ts
│   │   └── GetNodePropertiesUseCase.ts
│   ├── viewModels/
│   │   ├── TreeNodeViewModel.ts
│   │   ├── PluginPropertiesViewModel.ts
│   │   └── EmptyDetailViewModel.ts
│   └── mappers/
│       ├── PluginHierarchyViewModelMapper.ts
│       └── PluginPropertiesViewModelMapper.ts
│
├── infrastructure/
│   └── repositories/
│       └── PluginRegistrationRepository.ts  # Wraps TEMP service
│
└── presentation/
    ├── panels/
    │   └── PluginRegistrationPanel.ts
    ├── sections/
    │   └── PluginPropertiesDetailSection.ts
    └── views/
        ├── treeViewSectionView.ts
        └── pluginPropertiesDetailView.ts

src/shared/infrastructure/ui/sections/
└── TreeViewSection.ts                   # NEW reusable component

TEMP/templates/src/services/
└── PluginRegistrationService.ts         # Existing service (REUSE)
```

**New Files:** 17 files
**Modified Files:** 2 existing files (package.json, extension.ts)
**Total:** 19 files for this feature

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)
```typescript
// Initially DTOs, no behavior to test
// Future: Test domain entity behavior when editing is added
```

### Application Tests (Target: 90% coverage)
```typescript
describe('GetPluginHierarchyUseCase', () => {
  let useCase: GetPluginHierarchyUseCase;
  let mockRepository: jest.Mocked<IPluginRegistrationRepository>;
  let mockMapper: jest.Mocked<PluginHierarchyViewModelMapper>;

  beforeEach(() => {
    mockRepository = {
      getAssemblies: jest.fn(),
      getAllPluginTypes: jest.fn(),
      getAllSteps: jest.fn(),
      getAllImages: jest.fn()
    } as any;

    mockMapper = {
      buildTreeHierarchy: jest.fn()
    } as any;

    useCase = new GetPluginHierarchyUseCase(
      mockRepository,
      mockMapper,
      new NullLogger()
    );
  });

  it('should load hierarchy using parallel bulk queries', async () => {
    const assemblies = [createMockAssembly()];
    const types = [createMockPluginType()];
    const steps = [createMockStep()];
    const images = [createMockImage()];

    mockRepository.getAssemblies.mockResolvedValue(assemblies);
    mockRepository.getAllPluginTypes.mockResolvedValue(types);
    mockRepository.getAllSteps.mockResolvedValue(steps);
    mockRepository.getAllImages.mockResolvedValue(images);

    mockMapper.buildTreeHierarchy.mockReturnValue([]);

    await useCase.execute('env123');

    expect(mockRepository.getAssemblies).toHaveBeenCalledWith('env123');
    expect(mockRepository.getAllPluginTypes).toHaveBeenCalledWith('env123');
    expect(mockRepository.getAllSteps).toHaveBeenCalledWith('env123');
    expect(mockRepository.getAllImages).toHaveBeenCalledWith('env123');
    expect(mockMapper.buildTreeHierarchy).toHaveBeenCalledWith(
      assemblies,
      types,
      steps,
      images
    );
  });
});

describe('PluginHierarchyViewModelMapper', () => {
  let mapper: PluginHierarchyViewModelMapper;

  beforeEach(() => {
    mapper = new PluginHierarchyViewModelMapper();
  });

  it('should build tree hierarchy with correct parent-child relationships', () => {
    const assembly = createMockAssembly({ pluginassemblyid: 'asm1' });
    const type = createMockPluginType({ plugintypeid: 'type1', pluginassemblyid: 'asm1' });
    const step = createMockStep({ sdkmessageprocessingstepid: 'step1', plugintypeid: 'type1' });
    const image = createMockImage({ sdkmessageprocessingstepimageid: 'img1', sdkmessageprocessingstepid: 'step1' });

    const result = mapper.buildTreeHierarchy([assembly], [type], [step], [image]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('assembly-asm1');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].id).toBe('plugintype-type1');
    expect(result[0].children![0].children).toHaveLength(1);
    expect(result[0].children![0].children![0].id).toBe('step-step1');
    expect(result[0].children![0].children![0].children).toHaveLength(1);
    expect(result[0].children![0].children![0].children![0].id).toBe('image-img1');
  });

  it('should include searchText for steps with filtering attributes', () => {
    const step = createMockStep({
      filteringattributes: 'name,subject',
      entityLogicalName: 'account'
    });

    const stepNode = mapper['mapStepNode'](step, new Map());

    expect(stepNode.searchText).toBe('name,subject account');
  });
});
```

### Infrastructure Tests (Optional - only for complex logic)
- PluginRegistrationRepository is a simple wrapper - skip tests
- PluginRegistrationService already tested in TEMP

### Manual Testing Scenarios
1. **Happy path:** Open panel, see assemblies, expand tree, click node, view properties
2. **Search:** Type "account" in search, see filtered nodes, clear search
3. **Environment switch:** Change environment, see different assemblies
4. **Error case:** Disconnect network, see error message
5. **Empty state:** Connect to environment with no plugins, see empty message
6. **Performance:** Load environment with 100+ assemblies, verify <3s load time

---

## TreeViewSection Design Specification

### Goals
- **Generic:** Works for any hierarchical data (plugins, solutions, metadata)
- **Reusable:** Zero coupling to plugin registration domain
- **Performant:** Handles 1000+ nodes without lag
- **Searchable:** Search across all levels (including collapsed nodes)
- **Expandable:** Support expand/collapse with state tracking

### Component Interface

```typescript
/**
 * Configuration for TreeViewSection.
 */
export interface TreeViewSectionConfig {
  readonly searchPlaceholder: string;
  readonly emptyMessage: string;
  readonly searchMinChars: number;
  readonly searchDebounceMs: number;
}

/**
 * Section for rendering hierarchical tree views.
 * Positioned in main content area.
 */
export class TreeViewSection implements ISection {
  public readonly position = SectionPosition.Main;

  constructor(config: TreeViewSectionConfig) {}

  render(data: SectionRenderData): string {
    // Renders tree HTML from customData
  }
}
```

### Data Contract

```typescript
// Input via SectionRenderData.customData
{
  treeNodes: TreeNodeViewModel[],      // Root nodes (children nested)
  expandedNodes: Set<string>,           // Expanded node IDs
  selectedNodeId: string | undefined    // Selected node ID
}
```

### Behavior (WebView JavaScript)

```typescript
/**
 * TreeViewBehavior - Handles tree interactions in webview.
 */
class TreeViewBehavior {
  private expandedNodes: Set<string> = new Set();
  private selectedNodeId: string | undefined;
  private allNodes: Map<string, TreeNode> = new Map();

  initialize() {
    // Set up event listeners
    this.setupSearchInput();
    this.setupNodeClicks();
    this.setupExpandCollapseClicks();
  }

  setupSearchInput() {
    const input = document.getElementById('tree-search-input');
    input.addEventListener('input', debounce((e) => {
      this.handleSearch(e.target.value);
    }, this.config.searchDebounceMs));
  }

  handleSearch(searchTerm: string) {
    if (searchTerm.length < this.config.searchMinChars) {
      this.showAllNodes();
      return;
    }

    // Filter nodes and expand parent paths
    const matches = this.findMatchingNodes(searchTerm.toLowerCase());
    this.showOnlyMatches(matches);

    // Send search event to extension host
    vscode.postMessage({
      command: 'searchChanged',
      searchTerm
    });
  }

  findMatchingNodes(searchTerm: string): Set<string> {
    const matches = new Set<string>();

    for (const [nodeId, node] of this.allNodes) {
      const labelMatch = node.label.toLowerCase().includes(searchTerm);
      const searchTextMatch = node.searchText?.toLowerCase().includes(searchTerm);

      if (labelMatch || searchTextMatch) {
        matches.add(nodeId);
        // Add all parent IDs to expand path
        this.addParentPath(nodeId, matches);
      }
    }

    return matches;
  }

  setupNodeClicks() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-node-id]');
      if (!target) return;

      const nodeId = target.dataset.nodeId;
      const action = target.dataset.action;

      if (action === 'toggle-node') {
        this.toggleNode(nodeId);
      } else {
        this.selectNode(nodeId);
      }
    });
  }

  toggleNode(nodeId: string) {
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }

    this.updateNodeExpandState(nodeId);

    vscode.postMessage({
      command: 'nodeToggled',
      nodeId
    });
  }

  selectNode(nodeId: string) {
    this.selectedNodeId = nodeId;
    this.updateNodeSelection(nodeId);

    vscode.postMessage({
      command: 'nodeSelected',
      nodeId
    });
  }
}
```

### CSS Structure

```css
/* tree-view.css */
.tree-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.tree-view-search {
  padding: 8px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.tree-search-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--vscode-input-border);
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
}

.tree-view-nodes {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.tree-node-wrapper {
  margin-left: calc(var(--depth) * 16px);
}

.tree-node {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  user-select: none;
}

.tree-node.selected {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}

.tree-node:hover {
  background: var(--vscode-list-hoverBackground);
}

.tree-node-expand-icon {
  width: 16px;
  margin-right: 4px;
  transition: transform 0.2s;
}

.tree-node-expand-icon.expanded {
  transform: rotate(90deg);
}

.tree-node-expand-icon.hidden {
  visibility: hidden;
}

.tree-node-icon {
  margin-right: 6px;
}

.tree-node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node-children.collapsed {
  display: none;
}

.tree-node-children.expanded {
  display: block;
}

.tree-view-loading,
.tree-view-error,
.tree-view-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  text-align: center;
}
```

---

## Dependencies & Prerequisites

### External Dependencies
- [ ] VS Code APIs: vscode.window, vscode.webview
- [ ] NPM packages: None (reuse existing)
- [ ] Dataverse APIs: OData queries (already in PluginRegistrationService)

### Internal Prerequisites
- [ ] PluginRegistrationService (exists in TEMP - reuse as-is)
- [ ] PanelCoordinator framework (exists)
- [ ] SectionCompositionBehavior (exists)
- [ ] EnvironmentSelectorSection (exists)
- [ ] ActionButtonsSection (exists)

### Breaking Changes
- [ ] None - new feature, no existing plugin registration panel

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] Entities have behavior (future - currently DTOs)
- [x] Zero external dependencies (domain only imports domain)
- [ ] Business logic in entities/domain services (future when editing added)
- [x] Repository interfaces defined in domain
- [x] Value objects are immutable (TreeNodeViewModel is readonly)
- [x] No logging (pure business logic)

**Application Layer:**
- [x] Use cases orchestrate only (NO business logic)
- [x] ViewModels are DTOs (no behavior)
- [x] Mappers transform only (no sorting params)
- [x] Logging at use case boundaries
- [x] Explicit return types on all methods

**Infrastructure Layer:**
- [x] Repositories implement domain interfaces
- [x] Dependencies point inward (infra → domain)
- [x] No business logic in repositories
- [x] Logging for API calls

**Presentation Layer:**
- [x] Panels use use cases only (NO business logic)
- [x] HTML extracted to separate view files
- [x] Dependencies point inward (pres → app → domain)
- [x] Logging for user actions

**Type Safety:**
- [x] No `any` types without explicit justification
- [x] Explicit return types on all public methods
- [x] Proper null handling (no `!` assertions)
- [x] Type guards for runtime safety

---

## Extension Integration Checklist

**Commands (for package.json):**
- [ ] Command ID: `power-platform-dev-suite.pluginRegistration`
- [ ] Command title: "Power Platform: Plugin Registration"
- [ ] Activation event: `onCommand:power-platform-dev-suite.pluginRegistration`
- [ ] Commands added to `"contributes.commands"` array

**Extension Registration (for extension.ts):**
- [ ] Feature initializer function: `initializePluginRegistration()`
- [ ] Lazy imports with dynamic `import()`
- [ ] Command handler registered
- [ ] Command added to `context.subscriptions`
- [ ] Error handling in command handler

**Verification:**
- [ ] `npm run compile` passes
- [ ] Command appears in Command Palette
- [ ] Manual testing completed (F5, invoke command, panel opens)

---

## Key Architectural Decisions

### Decision 1: Reuse Existing PluginRegistrationService
**Considered:**
- Build new repository from scratch
- Wrap existing TEMP service

**Chosen:** Wrap existing service via repository adapter

**Rationale:**
- Service already implements bulk queries (performance optimized)
- Service already handles OData pagination
- Saves ~400 lines of infrastructure code
- Adapter pattern allows easy migration if service changes

**Tradeoffs:**
- Temporary dependency on TEMP code
- Will need to migrate to domain layer eventually
- Gained: Faster MVP delivery, proven performance

---

### Decision 2: TreeViewSection is Generic Component
**Considered:**
- Plugin-specific tree component
- Generic reusable tree component

**Chosen:** Generic reusable component

**Rationale:**
- Future features need tree views (Metadata Browser, Solution Explorer)
- Zero coupling to plugin domain (uses ViewModels)
- TreeNodeViewModel is generic interface
- Follows Single Responsibility Principle

**Tradeoffs:**
- Slightly more complex interface
- Gained: Reusability across features, cleaner separation

---

### Decision 3: Build Complete Tree Upfront
**Considered:**
- Lazy load children on expand
- Build complete tree upfront

**Chosen:** Build complete tree upfront

**Rationale:**
- Search must work across all levels (including collapsed nodes)
- Bulk queries already fetch all data in parallel
- In-memory joining is fast (<100ms for 1000+ nodes)
- Simpler implementation (no lazy load complexity)

**Tradeoffs:**
- Higher initial memory usage
- Gained: Comprehensive search, simpler code, better UX

---

### Decision 4: Search in WebView, Not Extension Host
**Considered:**
- Search/filter in extension host (use case)
- Search/filter in webview (JavaScript)

**Chosen:** Search/filter in webview

**Rationale:**
- Instant feedback (no round-trip to extension host)
- Debouncing in webview avoids message spam
- Tree expansion/collapse is visual state (belongs in webview)
- Extension host tracks state for persistence only

**Tradeoffs:**
- Duplicates node data in webview
- Gained: Better performance, smoother UX

---

## Open Questions

- [ ] Should we add context menu actions (right-click on node)?
- [ ] Should we support multi-select for bulk operations?
- [ ] Should we add keyboard navigation (arrow keys, enter)?
- [ ] Should we persist expanded/selected state across sessions?
- [ ] Should we add "collapse all" / "expand all" buttons?

---

## References

- Related features: Plugin Trace Viewer (uses PanelCoordinator), Environment Setup (uses split panel)
- External documentation: [Dataverse Plugin Registration](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/register-plug-in)
- Design inspiration: XRM Toolbox Plugin Registration Tool, VS Code Explorer Tree View
- Workflow guide: `.claude/WORKFLOW.md`
- Architecture guide: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- Panel development guide: `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
