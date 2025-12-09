# Solution Diff - Component-Level Comparison (Slice 3)

**Status:** Draft
**Date:** 2025-12-09
**Complexity:** Moderate

---

## Overview

**User Problem:** After seeing solution metadata differences (version mismatch), ALM teams need to understand WHAT changed at the component level (which entities, flows, plugins were added/removed/modified) to properly troubleshoot deployment issues and configuration drift.

**Solution:** Extend existing Solution Diff panel to compare solution COMPONENTS between two environments, categorizing them as Added (in target only), Removed (in source only), or Same (in both environments). Display component counts by type with expandable sections showing component names.

**Value:** Transforms Solution Diff from "versions don't match" to "here are the 3 entities and 2 flows that are different" - enabling teams to pinpoint actual configuration drift in seconds rather than manual inspection across environments.

---

## Business Value

**Problem:** Slice 1 shows THAT solutions differ, but not WHAT differs. Teams still need to manually inspect both environments to find actual changes.

**Solution:** Component-level diff shows exactly which entities, flows, plugins, web resources, etc. were added, removed, or exist in both environments.

**Impact:**
- Reduces troubleshooting time from 10+ minutes to 30 seconds
- Eliminates manual environment inspection
- Provides actionable diff data for deployment decisions

---

## Complexity Assessment

**Complexity:** Moderate

**Rationale:**
- Extends existing domain model (SolutionComparison) with component comparison
- Reuses existing ISolutionComponentRepository (already implemented)
- Moderate domain logic: component categorization (Added/Removed/Same)
- Moderate presentation: expandable sections by component type
- NO deep schema comparison (deferred to Slice 4)

**NOT Complex because:**
- Repository already exists (no new Dataverse API integration)
- Component types are simple enumerations (1=Entity, 29=Flow, etc.)
- UI is expandable lists (not complex visualizations)
- Business rules are straightforward (set operations on component IDs)

---

## Implementation Slices

### MVP Slice (Slice 3)
**Goal:** Show component counts and names categorized by Added/Removed/Same

**Domain:**
- Extend `SolutionComparison` entity with component comparison
- `SolutionComponent` entity (componentType, objectId, displayName)
- `ComponentDiff` value object (categorizes Added/Removed/Same)
- `ComponentType` enum (Entity, Flow, Plugin, WebResource, etc.)

**Application:**
- Extend `CompareSolutionMetadataUseCase` to include components OR create new `CompareSolutionComponentsUseCase`
- Extend `SolutionComparisonViewModel` with component diff data
- New mapper: `ComponentDiffViewModelMapper`

**Infrastructure:**
- Reuse existing `DataverseApiSolutionComponentRepository`
- Add new method to fetch ALL components for a solution (not filtered by entity type)

**Presentation:**
- Extend `SolutionComparisonSection` with expandable component sections
- Show component type headings (Entities: 15, Flows: 3, Plugins: 2)
- Expandable sections: Added (green), Removed (red), Same (gray)

**Result:** COMPONENT-LEVEL DIFF ✅

---

### Future Enhancements
- **Slice 4:** Deep component comparison (entity schema diff, flow definition diff)
- **Slice 5:** Export component diff report (JSON, CSV)

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - SolutionComparisonSection (extend with component UI)     │
│ - Expandable sections by component type                    │
│ - Color coding: Added (green), Removed (red), Same (gray)  │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - CompareSolutionComponentsUseCase (orchestrates)          │
│ - ComponentDiffViewModel (DTO for display)                 │
│ - ComponentDiffViewModelMapper (transform)                 │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - SolutionComponent entity (represents a component)        │
│ - ComponentDiff value object (categorizes differences)     │
│ - ComponentType enum (Entity, Flow, Plugin, etc.)          │
│ - ComponentComparison entity (compares component lists)    │
│ - ISolutionComponentRepository (extend interface)          │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - DataverseApiSolutionComponentRepository (extend)         │
│ - Add findAllComponentsForSolution() method                │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction
✅ **CORRECT:**
- Presentation → Application → Domain
- Infrastructure → Domain
- All dependencies point INWARD

---

## Type Contracts (Define BEFORE Implementation)

### Domain Layer Types

#### Enums

**ComponentType.ts**
```typescript
/**
 * Enumeration of Power Platform solution component types.
 *
 * Based on Dataverse componenttype field in solutioncomponent table.
 * @see https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/solutioncomponent
 */
export enum ComponentType {
  /** Custom or system entity (componenttype = 1) */
  Entity = 1,

  /** Workflow or Cloud Flow (componenttype = 29) */
  Workflow = 29,

  /** Web Resource (componenttype = 61) */
  WebResource = 61,

  /** Plugin Assembly (componenttype = 91) */
  PluginAssembly = 91,

  /** SDK Message Processing Step (Plugin Step) (componenttype = 92) */
  PluginStep = 92,

  /** Model-Driven App (componenttype = 80) */
  ModelDrivenApp = 80,

  /** Canvas App (componenttype = 300) */
  CanvasApp = 300,

  /** Environment Variable Definition (componenttype = 380) */
  EnvironmentVariable = 380,

  /** Connection Reference (componenttype = 381) */
  ConnectionReference = 381,

  /** View (SavedQuery) (componenttype = 26) */
  View = 26,

  /** Form (SystemForm) (componenttype = 60) */
  Form = 60,

  /** Other/Unknown component type */
  Other = 0
}

/**
 * Maps componenttype number to ComponentType enum.
 */
export function mapComponentType(componentTypeCode: number): ComponentType {
  // Check if the code matches a known ComponentType enum value
  const knownTypes = Object.values(ComponentType).filter(v => typeof v === 'number') as number[];
  if (knownTypes.includes(componentTypeCode)) {
    return componentTypeCode as ComponentType;
  }
  return ComponentType.Other;
}

/**
 * Gets display name for a component type.
 */
export function getComponentTypeDisplayName(type: ComponentType): string {
  switch (type) {
    case ComponentType.Entity: return 'Entities';
    case ComponentType.Workflow: return 'Flows';
    case ComponentType.WebResource: return 'Web Resources';
    case ComponentType.PluginAssembly: return 'Plugin Assemblies';
    case ComponentType.PluginStep: return 'Plugin Steps';
    case ComponentType.ModelDrivenApp: return 'Model-Driven Apps';
    case ComponentType.CanvasApp: return 'Canvas Apps';
    case ComponentType.EnvironmentVariable: return 'Environment Variables';
    case ComponentType.ConnectionReference: return 'Connection References';
    case ComponentType.View: return 'Views';
    case ComponentType.Form: return 'Forms';
    case ComponentType.Other: return 'Other Components';
  }
}
```

#### Entities

**SolutionComponent.ts**
```typescript
import { ComponentType } from '../enums/ComponentType';

/**
 * Domain entity representing a Power Platform solution component.
 *
 * Responsibilities:
 * - Encapsulate component metadata (type, ID, name)
 * - Provide component categorization
 * - Support component comparison
 *
 * Business Rules:
 * - objectId is unique within an environment but differs across environments
 * - displayName is for UI display only (may be null for some component types)
 * - componentType determines component behavior and category
 */
export class SolutionComponent {
  /**
   * Creates a new SolutionComponent.
   *
   * @param objectId - Component object ID (GUID)
   * @param componentType - Component type code (maps to ComponentType enum)
   * @param displayName - Human-readable name (null if unavailable)
   * @param solutionId - Parent solution ID
   * @throws {Error} When objectId or solutionId is empty
   */
  constructor(
    private readonly objectId: string,
    private readonly componentType: ComponentType,
    private readonly displayName: string | null,
    private readonly solutionId: string
  ) {
    this.validateInvariants();
  }

  /**
   * Validates business rules on construction.
   */
  private validateInvariants(): void {
    if (this.objectId.trim() === '') {
      throw new Error('Component objectId cannot be empty');
    }

    if (this.solutionId.trim() === '') {
      throw new Error('Component solutionId cannot be empty');
    }
  }

  /**
   * Gets a display name for this component.
   *
   * Business Rule: Falls back to objectId if displayName is null
   */
  public getDisplayName(): string {
    return this.displayName ?? this.objectId;
  }

  /**
   * Checks if this component matches another by objectId.
   *
   * Business Rule: Components are matched by objectId (case-insensitive)
   * Used for cross-environment comparison.
   */
  public matchesById(other: SolutionComponent): boolean {
    return this.objectId.toLowerCase() === other.objectId.toLowerCase();
  }

  /**
   * Checks if this component is of a specific type.
   */
  public isType(type: ComponentType): boolean {
    return this.componentType === type;
  }

  // Getters (NO business logic in getters)
  public getObjectId(): string { return this.objectId; }
  public getComponentType(): ComponentType { return this.componentType; }
  public getSolutionId(): string { return this.solutionId; }
}
```

**ComponentComparison.ts**
```typescript
import { SolutionComponent } from './SolutionComponent';
import { ComponentDiff } from '../valueObjects/ComponentDiff';
import { ComponentType } from '../enums/ComponentType';

/**
 * Domain entity representing a component-level comparison between two solutions.
 *
 * Responsibilities:
 * - Compare component lists from source and target solutions
 * - Categorize components as Added, Removed, or Same
 * - Group components by type for organized display
 *
 * Business Rules:
 * - Components are matched by objectId (case-insensitive)
 * - Added: In target but NOT in source
 * - Removed: In source but NOT in target
 * - Same: In both source AND target
 */
export class ComponentComparison {
  private readonly diff: ComponentDiff;

  /**
   * Creates a new ComponentComparison.
   *
   * @param sourceComponents - Components from source solution
   * @param targetComponents - Components from target solution
   * @param sourceSolutionId - Source solution GUID
   * @param targetSolutionId - Target solution GUID
   */
  constructor(
    private readonly sourceComponents: readonly SolutionComponent[],
    private readonly targetComponents: readonly SolutionComponent[],
    private readonly sourceSolutionId: string,
    private readonly targetSolutionId: string
  ) {
    this.diff = this.calculateDiff();
  }

  /**
   * Calculates component differences between source and target.
   *
   * Business Logic:
   * - Categorize components as Added, Removed, or Same
   * - Group by component type
   */
  private calculateDiff(): ComponentDiff {
    const sourceIds = new Set(this.sourceComponents.map(c => c.getObjectId().toLowerCase()));
    const targetIds = new Set(this.targetComponents.map(c => c.getObjectId().toLowerCase()));

    // Added: In target but NOT in source
    const added = this.targetComponents.filter(c =>
      !sourceIds.has(c.getObjectId().toLowerCase())
    );

    // Removed: In source but NOT in target
    const removed = this.sourceComponents.filter(c =>
      !targetIds.has(c.getObjectId().toLowerCase())
    );

    // Same: In both source AND target (use source components)
    const same = this.sourceComponents.filter(c =>
      targetIds.has(c.getObjectId().toLowerCase())
    );

    return new ComponentDiff(added, removed, same);
  }

  /**
   * Checks if there are any component differences.
   *
   * Business Rule: No differences means all components are in both solutions
   */
  public hasDifferences(): boolean {
    return this.diff.getAdded().length > 0 || this.diff.getRemoved().length > 0;
  }

  /**
   * Gets total component count in source solution.
   */
  public getSourceComponentCount(): number {
    return this.sourceComponents.length;
  }

  /**
   * Gets total component count in target solution.
   */
  public getTargetComponentCount(): number {
    return this.targetComponents.length;
  }

  /**
   * Gets components grouped by type for organized display.
   *
   * Business Rule: Group by ComponentType, sorted by type name
   */
  public getComponentsByType(): Map<ComponentType, {
    added: SolutionComponent[];
    removed: SolutionComponent[];
    same: SolutionComponent[];
  }> {
    const groups = new Map<ComponentType, {
      added: SolutionComponent[];
      removed: SolutionComponent[];
      same: SolutionComponent[];
    }>();

    // Initialize groups for all component types present
    const allTypes = new Set<ComponentType>([
      ...this.diff.getAdded().map(c => c.getComponentType()),
      ...this.diff.getRemoved().map(c => c.getComponentType()),
      ...this.diff.getSame().map(c => c.getComponentType())
    ]);

    for (const type of allTypes) {
      groups.set(type, {
        added: this.diff.getAdded().filter(c => c.isType(type)),
        removed: this.diff.getRemoved().filter(c => c.isType(type)),
        same: this.diff.getSame().filter(c => c.isType(type))
      });
    }

    return groups;
  }

  // Getters (NO business logic in getters)
  public getDiff(): ComponentDiff { return this.diff; }
  public getSourceSolutionId(): string { return this.sourceSolutionId; }
  public getTargetSolutionId(): string { return this.targetSolutionId; }
}
```

#### Value Objects

**ComponentDiff.ts**
```typescript
import { SolutionComponent } from '../entities/SolutionComponent';

/**
 * Value object representing the categorized differences between component lists.
 *
 * Immutable, encapsulates categorization logic.
 *
 * Responsibilities:
 * - Store categorized component lists (Added, Removed, Same)
 * - Provide summary statistics
 */
export class ComponentDiff {
  /**
   * Creates a new ComponentDiff.
   *
   * @param added - Components added (in target only)
   * @param removed - Components removed (in source only)
   * @param same - Components unchanged (in both)
   */
  constructor(
    private readonly added: readonly SolutionComponent[],
    private readonly removed: readonly SolutionComponent[],
    private readonly same: readonly SolutionComponent[]
  ) {
    // Make defensive copies to ensure immutability
    this.added = [...added];
    this.removed = [...removed];
    this.same = [...same];
  }

  /**
   * Gets summary of component differences.
   *
   * @returns Human-readable summary string
   */
  public getSummary(): string {
    if (this.added.length === 0 && this.removed.length === 0) {
      return 'No component differences';
    }

    const parts: string[] = [];
    if (this.added.length > 0) {
      parts.push(`${this.added.length} added`);
    }
    if (this.removed.length > 0) {
      parts.push(`${this.removed.length} removed`);
    }
    if (this.same.length > 0) {
      parts.push(`${this.same.length} unchanged`);
    }

    return parts.join(', ');
  }

  /**
   * Gets total number of components across all categories.
   */
  public getTotalCount(): number {
    return this.added.length + this.removed.length + this.same.length;
  }

  // Getters (NO business logic in getters)
  public getAdded(): readonly SolutionComponent[] { return this.added; }
  public getRemoved(): readonly SolutionComponent[] { return this.removed; }
  public getSame(): readonly SolutionComponent[] { return this.same; }
}
```

#### Repository Interfaces

**ISolutionComponentRepository.ts** (EXTEND existing interface)
```typescript
// ADD new method to existing interface in src/shared/domain/interfaces/ISolutionComponentRepository.ts

/**
 * Finds ALL components for a specific solution (all component types).
 * Returns component metadata including type, objectId, and optional display name.
 *
 * @param environmentId - Environment GUID
 * @param solutionId - Solution GUID
 * @param options - Optional query options
 * @param cancellationToken - Optional cancellation token
 * @returns Array of solution component DTOs
 */
findAllComponentsForSolution(
  environmentId: string,
  solutionId: string,
  options?: QueryOptions,
  cancellationToken?: ICancellationToken
): Promise<SolutionComponentDto[]>;

/**
 * DTO for solution component data (minimal metadata).
 */
export interface SolutionComponentDto {
  /** Component object ID (GUID) */
  readonly objectId: string;

  /** Component type code (maps to ComponentType enum) */
  readonly componentType: number;

  /** Optional display name (null if not available) */
  readonly displayName: string | null;

  /** Parent solution ID */
  readonly solutionId: string;
}
```

---

### Application Layer Types

#### Use Cases

**CompareSolutionComponentsUseCase.ts**
```typescript
import { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { ComponentComparison } from '../../domain/entities/ComponentComparison';
import { SolutionComponent } from '../../domain/entities/SolutionComponent';
import { mapComponentType } from '../../domain/enums/ComponentType';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

/**
 * Use case: Compare solution components between two environments.
 *
 * Orchestrates:
 * 1. Fetch components from source solution
 * 2. Fetch components from target solution
 * 3. Map DTOs to domain entities
 * 4. Create ComponentComparison entity
 * 5. Return comparison entity
 *
 * Business logic is IN ComponentComparison entity, NOT here.
 */
export class CompareSolutionComponentsUseCase {
  constructor(
    private readonly componentRepository: ISolutionComponentRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Executes component comparison.
   *
   * @param sourceEnvironmentId - Source environment GUID
   * @param targetEnvironmentId - Target environment GUID
   * @param sourceSolutionId - Source solution GUID
   * @param targetSolutionId - Target solution GUID (may differ from source)
   * @param cancellationToken - Optional cancellation token
   * @returns ComponentComparison entity with diff results
   */
  public async execute(
    sourceEnvironmentId: string,
    targetEnvironmentId: string,
    sourceSolutionId: string,
    targetSolutionId: string,
    cancellationToken?: ICancellationToken
  ): Promise<ComponentComparison> {
    this.logger.info('Comparing solution components', {
      sourceEnvironmentId,
      targetEnvironmentId,
      sourceSolutionId,
      targetSolutionId
    });

    // Fetch components from both solutions in parallel for performance
    const [sourceDtos, targetDtos] = await Promise.all([
      this.componentRepository.findAllComponentsForSolution(
        sourceEnvironmentId,
        sourceSolutionId,
        undefined,
        cancellationToken
      ),
      this.componentRepository.findAllComponentsForSolution(
        targetEnvironmentId,
        targetSolutionId,
        undefined,
        cancellationToken
      )
    ]);

    // Map DTOs to domain entities
    const sourceComponents = sourceDtos.map(dto =>
      new SolutionComponent(
        dto.objectId,
        mapComponentType(dto.componentType),
        dto.displayName,
        dto.solutionId
      )
    );

    const targetComponents = targetDtos.map(dto =>
      new SolutionComponent(
        dto.objectId,
        mapComponentType(dto.componentType),
        dto.displayName,
        dto.solutionId
      )
    );

    // Domain entity handles comparison logic
    const comparison = new ComponentComparison(
      sourceComponents,
      targetComponents,
      sourceSolutionId,
      targetSolutionId
    );

    this.logger.info('Component comparison completed', {
      sourceCount: comparison.getSourceComponentCount(),
      targetCount: comparison.getTargetComponentCount(),
      hasDifferences: comparison.hasDifferences()
    });

    return comparison;
  }
}
```

#### ViewModels

**ComponentDiffViewModel.ts**
```typescript
/**
 * ViewModel for displaying component comparison in panel.
 *
 * DTO only - NO behavior.
 */
export interface ComponentDiffViewModel {
  /** Summary message (e.g., "5 added, 3 removed, 10 unchanged") */
  readonly summary: string;

  /** Total component count across all categories */
  readonly totalCount: number;

  /** Components grouped by type */
  readonly componentsByType: ComponentTypeGroupViewModel[];

  /** Source solution component count */
  readonly sourceComponentCount: number;

  /** Target solution component count */
  readonly targetComponentCount: number;
}

/**
 * ViewModel for a component type group (e.g., "Entities").
 */
export interface ComponentTypeGroupViewModel {
  /** Component type code (for internal use) */
  readonly type: number;

  /** Display name (e.g., "Entities", "Flows", "Web Resources") */
  readonly displayName: string;

  /** Components added (in target only) */
  readonly added: ComponentViewModel[];

  /** Components removed (in source only) */
  readonly removed: ComponentViewModel[];

  /** Components unchanged (in both) */
  readonly same: ComponentViewModel[];

  /** Total count for this type */
  readonly totalCount: number;

  /** Has differences flag (for UI filtering) */
  readonly hasDifferences: boolean;
}

/**
 * ViewModel for a single component.
 */
export interface ComponentViewModel {
  /** Component object ID */
  readonly objectId: string;

  /** Display name (or objectId if name unavailable) */
  readonly displayName: string;

  /** Component type code */
  readonly componentType: number;
}
```

#### Mappers

**ComponentDiffViewModelMapper.ts**
```typescript
import { ComponentComparison } from '../../domain/entities/ComponentComparison';
import { SolutionComponent } from '../../domain/entities/SolutionComponent';
import { ComponentType, getComponentTypeDisplayName } from '../../domain/enums/ComponentType';
import {
  ComponentDiffViewModel,
  ComponentTypeGroupViewModel,
  ComponentViewModel
} from '../viewModels/ComponentDiffViewModel';

/**
 * Mapper: Transform domain ComponentComparison → ViewModel.
 *
 * Transformation only - NO business logic.
 */
export class ComponentDiffViewModelMapper {
  /**
   * Transforms ComponentComparison entity to ViewModel.
   */
  public static toViewModel(comparison: ComponentComparison): ComponentDiffViewModel {
    const diff = comparison.getDiff();
    const groupedByType = comparison.getComponentsByType();

    const componentsByType: ComponentTypeGroupViewModel[] = [];

    // Transform each component type group
    for (const [type, components] of groupedByType.entries()) {
      componentsByType.push({
        type,
        displayName: getComponentTypeDisplayName(type),
        added: components.added.map(c => this.toComponentViewModel(c)),
        removed: components.removed.map(c => this.toComponentViewModel(c)),
        same: components.same.map(c => this.toComponentViewModel(c)),
        totalCount: components.added.length + components.removed.length + components.same.length,
        hasDifferences: components.added.length > 0 || components.removed.length > 0
      });
    }

    // Sort groups by display name
    componentsByType.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return {
      summary: diff.getSummary(),
      totalCount: diff.getTotalCount(),
      componentsByType,
      sourceComponentCount: comparison.getSourceComponentCount(),
      targetComponentCount: comparison.getTargetComponentCount()
    };
  }

  /**
   * Transforms SolutionComponent entity to ComponentViewModel.
   */
  private static toComponentViewModel(component: SolutionComponent): ComponentViewModel {
    return {
      objectId: component.getObjectId(),
      displayName: component.getDisplayName(),
      componentType: component.getComponentType()
    };
  }
}
```

---

### Infrastructure Layer Types

#### Repository Implementation

**DataverseApiSolutionComponentRepository.ts** (EXTEND existing implementation)

Add new method to existing class:

```typescript
/**
 * Finds ALL components for a specific solution (all component types).
 *
 * Returns minimal metadata: objectId, componentType, displayName (if available).
 *
 * NOTE: displayName is NOT available in solutioncomponent table.
 * For MVP, we return objectId as displayName.
 * Future enhancement: Join with entity metadata tables for actual names.
 */
public async findAllComponentsForSolution(
  environmentId: string,
  solutionId: string,
  options?: QueryOptions,
  cancellationToken?: ICancellationToken
): Promise<SolutionComponentDto[]> {
  this.logger.debug('Fetching all solution components from Dataverse API', {
    environmentId,
    solutionId
  });

  const defaultOptions: QueryOptions = {
    select: ['solutioncomponentid', 'objectid', 'componenttype'],
    filter: `_solutionid_value eq ${solutionId}`
  };

  const mergedOptions: QueryOptions = {
    ...defaultOptions,
    ...options
  };

  const queryString = ODataQueryBuilder.build(mergedOptions);
  const initialEndpoint = `/api/data/v9.2/solutioncomponents${queryString ? '?' + queryString : ''}`;

  CancellationHelper.throwIfCancelled(cancellationToken);

  try {
    // Fetch all pages - Dataverse defaults to 5000 records per page
    const allComponents: SolutionComponentDto[] = [];
    let currentEndpoint: string | null = initialEndpoint;
    let pageCount = 0;

    while (currentEndpoint !== null) {
      CancellationHelper.throwIfCancelled(cancellationToken);

      const response: SolutionComponentsResponse = await this.apiService.get<SolutionComponentsResponse>(
        environmentId,
        currentEndpoint,
        cancellationToken
      );

      CancellationHelper.throwIfCancelled(cancellationToken);

      const pageComponents = response.value.map((dto: SolutionComponentDto) => ({
        objectId: dto.objectid,
        componentType: dto.componenttype,
        displayName: null, // Not available in solutioncomponent table (MVP limitation)
        solutionId
      }));

      allComponents.push(...pageComponents);
      pageCount++;

      // Check for next page
      const nextLink: string | undefined = response['@odata.nextLink'];
      if (nextLink) {
        const url: URL = new URL(nextLink);
        currentEndpoint = url.pathname + url.search;
      } else {
        currentEndpoint = null;
      }
    }

    this.logger.debug('Fetched all solution components from Dataverse', {
      environmentId,
      solutionId,
      count: allComponents.length,
      pages: pageCount
    });

    return allComponents;
  } catch (error) {
    const normalizedError = normalizeError(error);
    this.logger.error('Failed to fetch solution components from Dataverse API', normalizedError);
    throw normalizedError;
  }
}
```

**SolutionComponentDto interface** (add to same file):
```typescript
/**
 * DTO for solution component data (returned by repository).
 */
export interface SolutionComponentDto {
  readonly objectId: string;
  readonly componentType: number;
  readonly displayName: string | null;
  readonly solutionId: string;
}
```

---

### Presentation Layer Types

#### Panel Extension

**SolutionDiffPanelComposed.ts** (MODIFY existing panel)

Changes required:
1. Add `CompareSolutionComponentsUseCase` as dependency
2. Add component comparison to `handleCompare()` method
3. Pass component diff data to `SolutionComparisonSection`

```typescript
// NEW: Add use case dependency
private readonly compareComponentsUseCase: CompareSolutionComponentsUseCase;

private constructor(
  // ... existing params ...
  compareComponentsUseCase: CompareSolutionComponentsUseCase
) {
  // ... existing initialization ...
  this.compareComponentsUseCase = compareComponentsUseCase;
}

private async handleCompare(): Promise<void> {
  if (this.selectedSolutionUniqueName === null) {
    this.logger.warn('Compare called without solution selected');
    return;
  }

  // ... existing loading state setup ...

  try {
    // Execute metadata comparison (existing)
    const metadataComparison = await this.compareUseCase.execute(
      this.sourceEnvironmentId,
      this.targetEnvironmentId,
      this.selectedSolutionUniqueName
    );

    // Map to ViewModel
    const comparisonViewModel = SolutionComparisonViewModelMapper.toViewModel(metadataComparison);

    // NEW: Execute component comparison (if both solutions exist)
    let componentDiffViewModel: ComponentDiffViewModel | null = null;

    if (metadataComparison.getSourceSolution() !== null &&
        metadataComparison.getTargetSolution() !== null) {

      const sourceSolutionId = metadataComparison.getSourceSolution()!.id;
      const targetSolutionId = metadataComparison.getTargetSolution()!.id;

      const componentComparison = await this.compareComponentsUseCase.execute(
        this.sourceEnvironmentId,
        this.targetEnvironmentId,
        sourceSolutionId,
        targetSolutionId
      );

      componentDiffViewModel = ComponentDiffViewModelMapper.toViewModel(componentComparison);
    }

    this.logger.info('Comparison completed', {
      status: comparisonViewModel.status,
      differences: comparisonViewModel.differences.length,
      componentDiffAvailable: componentDiffViewModel !== null
    });

    // Update UI with results (pass componentDiff to section)
    await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
      selectedSolutionUniqueName: this.selectedSolutionUniqueName ?? undefined,
      comparisonViewModel: comparisonViewModel ?? undefined,
      componentDiffViewModel: componentDiffViewModel ?? undefined // NEW
    }));
  } catch (error) {
    // ... existing error handling ...
  }
}
```

#### Section Extension

**SolutionComparisonSection.ts** (MODIFY existing section)

Add component diff rendering after metadata comparison:

```typescript
public render(data: SectionRenderData): string {
  const custom = (data.customData ?? {}) as SolutionComparisonCustomData;
  const comparison = custom.comparisonViewModel;
  const componentDiff = custom.componentDiffViewModel; // NEW

  // ... existing solution selector HTML ...

  if (!comparison) {
    return `
      ${selectorHtml}
      <div class="comparison-placeholder">
        <p>Select a solution to compare between environments.</p>
      </div>
    `;
  }

  // ... existing metadata comparison HTML ...

  // NEW: Component diff section (only if available)
  let componentDiffHtml = '';
  if (componentDiff) {
    componentDiffHtml = renderComponentDiff(componentDiff);
  }

  return `
    ${selectorHtml}
    <div class="comparison-results">
      <!-- Existing metadata comparison -->
      ${metadataHtml}

      <!-- NEW: Component diff section -->
      ${componentDiffHtml}
    </div>
  `;
}
```

**componentDiffView.ts** (NEW view helper)

```typescript
import { ComponentDiffViewModel, ComponentTypeGroupViewModel } from '../../application/viewModels/ComponentDiffViewModel';

/**
 * Renders component diff section with expandable component type groups.
 */
export function renderComponentDiff(diff: ComponentDiffViewModel): string {
  return `
    <div class="component-diff-section">
      <h4>Component Comparison</h4>
      <div class="component-summary">
        ${diff.summary} (${diff.sourceComponentCount} in source, ${diff.targetComponentCount} in target)
      </div>

      <div class="component-type-groups">
        ${diff.componentsByType.map(group => renderComponentTypeGroup(group)).join('')}
      </div>
    </div>
  `;
}

/**
 * Renders a component type group (e.g., "Entities").
 */
function renderComponentTypeGroup(group: ComponentTypeGroupViewModel): string {
  if (group.totalCount === 0) {
    return ''; // Don't render empty groups
  }

  const hasChanges = group.hasDifferences;
  const expandedClass = hasChanges ? 'expanded' : '';

  return `
    <details class="component-type-group ${expandedClass}" ${hasChanges ? 'open' : ''}>
      <summary>
        <span class="component-type-name">${group.displayName}</span>
        <span class="component-type-counts">
          ${group.added.length > 0 ? `<span class="count-added">+${group.added.length}</span>` : ''}
          ${group.removed.length > 0 ? `<span class="count-removed">-${group.removed.length}</span>` : ''}
          ${group.same.length > 0 ? `<span class="count-same">${group.same.length} unchanged</span>` : ''}
        </span>
      </summary>

      <div class="component-lists">
        ${renderComponentList('Added', group.added, 'added')}
        ${renderComponentList('Removed', group.removed, 'removed')}
        ${renderComponentList('Unchanged', group.same, 'same')}
      </div>
    </details>
  `;
}

/**
 * Renders a list of components (Added, Removed, or Same).
 */
function renderComponentList(
  label: string,
  components: ComponentViewModel[],
  cssClass: string
): string {
  if (components.length === 0) {
    return '';
  }

  return `
    <div class="component-list component-list-${cssClass}">
      <h5>${label} (${components.length})</h5>
      <ul>
        ${components.map(c => `
          <li>
            <span class="component-name">${c.displayName}</span>
            <span class="component-id">${c.objectId}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}
```

#### CSS Extension

**solution-diff.css** (ADD to existing file)

```css
/* Component Diff Section */
.component-diff-section {
  margin-top: 2rem;
  padding: 1rem;
  border-top: 1px solid var(--vscode-panel-border);
}

.component-summary {
  font-size: 0.95rem;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 1rem;
}

/* Component Type Groups */
.component-type-groups {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.component-type-group {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 0.5rem;
}

.component-type-group summary {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  padding: 0.5rem;
}

.component-type-group summary:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.component-type-name {
  font-size: 1rem;
}

.component-type-counts {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
}

.count-added {
  color: var(--vscode-testing-iconPassed);
}

.count-removed {
  color: var(--vscode-testing-iconFailed);
}

.count-same {
  color: var(--vscode-descriptionForeground);
}

/* Component Lists */
.component-lists {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--vscode-editor-background);
}

.component-list h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.component-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.component-list li {
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.component-list-added li {
  background-color: rgba(0, 255, 0, 0.1);
  border-left: 3px solid var(--vscode-testing-iconPassed);
}

.component-list-removed li {
  background-color: rgba(255, 0, 0, 0.1);
  border-left: 3px solid var(--vscode-testing-iconFailed);
}

.component-list-same li {
  background-color: var(--vscode-editor-background);
  border-left: 3px solid var(--vscode-descriptionForeground);
}

.component-name {
  font-weight: 500;
}

.component-id {
  font-size: 0.85rem;
  color: var(--vscode-descriptionForeground);
  font-family: var(--vscode-editor-font-family);
}
```

---

## File Structure

**NEW FILES (Slice 3):**

```
src/features/solutionDiff/
├── domain/
│   ├── entities/
│   │   ├── SolutionComponent.ts              # NEW
│   │   └── ComponentComparison.ts            # NEW
│   ├── valueObjects/
│   │   └── ComponentDiff.ts                  # NEW
│   └── enums/
│       └── ComponentType.ts                  # NEW
│
├── application/
│   ├── useCases/
│   │   └── CompareSolutionComponentsUseCase.ts  # NEW
│   ├── viewModels/
│   │   └── ComponentDiffViewModel.ts         # NEW
│   └── mappers/
│       └── ComponentDiffViewModelMapper.ts   # NEW
│
├── infrastructure/
│   # NO NEW FILES - extend DataverseApiSolutionComponentRepository
│
└── presentation/
    ├── panels/
    │   └── SolutionDiffPanelComposed.ts      # MODIFIED (add component comparison)
    ├── sections/
    │   └── SolutionComparisonSection.ts      # MODIFIED (add component diff rendering)
    └── views/
        └── componentDiffView.ts              # NEW (HTML rendering)
```

**MODIFIED FILES:**
- `src/features/solutionDiff/presentation/panels/SolutionDiffPanelComposed.ts` - Add component comparison call
- `src/features/solutionDiff/presentation/sections/SolutionComparisonSection.ts` - Add component diff rendering
- `src/shared/domain/interfaces/ISolutionComponentRepository.ts` - Add `findAllComponentsForSolution()` method
- `src/shared/infrastructure/repositories/DataverseApiSolutionComponentRepository.ts` - Implement new method
- `resources/webview/css/features/solution-diff.css` - Add component diff styles

**NEW FILES:** 7 files
**MODIFIED FILES:** 5 files
**TOTAL:** 12 files for Slice 3

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

**SolutionComponent.test.ts**
```typescript
describe('SolutionComponent', () => {
  it('should create valid component', () => {
    const component = new SolutionComponent(
      'obj-123',
      ComponentType.Entity,
      'Account',
      'sol-456'
    );

    expect(component.getObjectId()).toBe('obj-123');
    expect(component.getComponentType()).toBe(ComponentType.Entity);
    expect(component.getDisplayName()).toBe('Account');
  });

  it('should fall back to objectId when displayName is null', () => {
    const component = new SolutionComponent(
      'obj-123',
      ComponentType.Entity,
      null,
      'sol-456'
    );

    expect(component.getDisplayName()).toBe('obj-123');
  });

  it('should match components by objectId (case-insensitive)', () => {
    const component1 = new SolutionComponent('OBJ-123', ComponentType.Entity, 'Account', 'sol-1');
    const component2 = new SolutionComponent('obj-123', ComponentType.Entity, 'Account', 'sol-2');

    expect(component1.matchesById(component2)).toBe(true);
  });

  it('should throw when objectId is empty', () => {
    expect(() => new SolutionComponent('', ComponentType.Entity, 'Account', 'sol-456'))
      .toThrow('Component objectId cannot be empty');
  });
});
```

**ComponentComparison.test.ts**
```typescript
describe('ComponentComparison', () => {
  it('should categorize components as added', () => {
    const sourceComponents: SolutionComponent[] = [];
    const targetComponents = [
      new SolutionComponent('obj-1', ComponentType.Entity, 'Account', 'sol-target')
    ];

    const comparison = new ComponentComparison(sourceComponents, targetComponents, 'sol-source', 'sol-target');

    expect(comparison.getDiff().getAdded()).toHaveLength(1);
    expect(comparison.getDiff().getRemoved()).toHaveLength(0);
    expect(comparison.getDiff().getSame()).toHaveLength(0);
  });

  it('should categorize components as removed', () => {
    const sourceComponents = [
      new SolutionComponent('obj-1', ComponentType.Entity, 'Account', 'sol-source')
    ];
    const targetComponents: SolutionComponent[] = [];

    const comparison = new ComponentComparison(sourceComponents, targetComponents, 'sol-source', 'sol-target');

    expect(comparison.getDiff().getAdded()).toHaveLength(0);
    expect(comparison.getDiff().getRemoved()).toHaveLength(1);
    expect(comparison.getDiff().getSame()).toHaveLength(0);
  });

  it('should categorize components as same', () => {
    const sourceComponents = [
      new SolutionComponent('obj-1', ComponentType.Entity, 'Account', 'sol-source')
    ];
    const targetComponents = [
      new SolutionComponent('obj-1', ComponentType.Entity, 'Account', 'sol-target')
    ];

    const comparison = new ComponentComparison(sourceComponents, targetComponents, 'sol-source', 'sol-target');

    expect(comparison.getDiff().getAdded()).toHaveLength(0);
    expect(comparison.getDiff().getRemoved()).toHaveLength(0);
    expect(comparison.getDiff().getSame()).toHaveLength(1);
  });

  it('should group components by type', () => {
    const sourceComponents = [
      new SolutionComponent('obj-1', ComponentType.Entity, 'Account', 'sol-source'),
      new SolutionComponent('obj-2', ComponentType.Workflow, 'Flow1', 'sol-source')
    ];
    const targetComponents = [
      new SolutionComponent('obj-1', ComponentType.Entity, 'Account', 'sol-target')
    ];

    const comparison = new ComponentComparison(sourceComponents, targetComponents, 'sol-source', 'sol-target');
    const groups = comparison.getComponentsByType();

    expect(groups.size).toBe(2); // Entity and Workflow
    expect(groups.get(ComponentType.Entity)?.same).toHaveLength(1);
    expect(groups.get(ComponentType.Workflow)?.removed).toHaveLength(1);
  });
});
```

### Application Tests (Target: 90% coverage)

**CompareSolutionComponentsUseCase.test.ts**
```typescript
describe('CompareSolutionComponentsUseCase', () => {
  let useCase: CompareSolutionComponentsUseCase;
  let mockRepository: jest.Mocked<ISolutionComponentRepository>;

  beforeEach(() => {
    mockRepository = {
      findAllComponentsForSolution: jest.fn()
    } as any;
    useCase = new CompareSolutionComponentsUseCase(mockRepository, new NullLogger());
  });

  it('should orchestrate component comparison', async () => {
    const sourceDtos = [
      { objectId: 'obj-1', componentType: 1, displayName: 'Account', solutionId: 'sol-source' }
    ];
    const targetDtos = [
      { objectId: 'obj-2', componentType: 1, displayName: 'Contact', solutionId: 'sol-target' }
    ];

    mockRepository.findAllComponentsForSolution
      .mockResolvedValueOnce(sourceDtos)
      .mockResolvedValueOnce(targetDtos);

    const comparison = await useCase.execute('env-source', 'env-target', 'sol-source', 'sol-target');

    expect(comparison.hasDifferences()).toBe(true);
    expect(comparison.getSourceComponentCount()).toBe(1);
    expect(comparison.getTargetComponentCount()).toBe(1);
    expect(mockRepository.findAllComponentsForSolution).toHaveBeenCalledTimes(2);
  });
});
```

### Manual Testing Scenarios (Slice 3)

1. **Component diff with changes:**
   - Select solution with different components in source vs target
   - Verify component type groups display correctly
   - Verify Added (green), Removed (red), Same (gray) categorization
   - Verify counts match actual component lists

2. **Component diff with no changes:**
   - Select solution with identical components in both environments
   - Verify "No component differences" summary
   - Verify all components shown as "Unchanged"

3. **Solution with many component types:**
   - Select solution with entities, flows, plugins, web resources
   - Verify all component types grouped separately
   - Verify expandable sections work correctly

4. **Solution-only scenarios:**
   - Select solution that exists only in source (SourceOnly status)
   - Verify component diff NOT shown (only metadata comparison)
   - Same for target-only solution

---

## Dependencies & Prerequisites

### External Dependencies
- VS Code APIs: None new
- NPM packages: None new
- Dataverse APIs:
  - `GET /api/data/v9.2/solutioncomponents?$filter=_solutionid_value eq {solutionId}` (EXISTING)

### Internal Prerequisites
- [x] `ISolutionComponentRepository` exists (shared)
- [x] `DataverseApiSolutionComponentRepository` exists (shared)
- [x] Slice 1 (metadata comparison) complete
- [x] `SolutionDiffPanelComposed` exists
- [x] `SolutionComparisonSection` exists

### Breaking Changes
- [ ] None - extends existing functionality

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] Entities have behavior (SolutionComponent.matchesById(), ComponentComparison.getComponentsByType())
- [x] Zero external dependencies (no imports from outer layers)
- [x] Business logic in entities (component categorization in ComponentComparison)
- [x] Repository interfaces extended in domain (ISolutionComponentRepository)
- [x] Value objects are immutable (ComponentDiff with readonly arrays)
- [x] No logging (pure business logic)

**Application Layer:**
- [x] Use cases orchestrate only (NO business logic - just fetches and delegates to entity)
- [x] ViewModels are DTOs (no behavior)
- [x] Mappers transform only (no sorting params, no business logic)
- [x] Logging at use case boundaries
- [x] Explicit return types on all methods

**Infrastructure Layer:**
- [x] Repositories implement domain interfaces (extends existing)
- [x] Dependencies point inward (infra → domain)
- [x] No business logic in repositories
- [x] Logging for API calls

**Presentation Layer:**
- [x] Panels use PanelCoordinator<TCommands> pattern (existing)
- [x] Sections render ViewModels (no business logic)
- [x] Data-driven updates via postMessage (no HTML re-renders)
- [x] Dependencies point inward (pres → app → domain)
- [x] Logging for user actions

**Type Safety:**
- [x] No `any` types without explicit justification
- [x] Explicit return types on all public methods
- [x] Proper null handling (explicit checks, no `!` assertions in production code)
- [x] Type guards for runtime safety (ComponentType enum mapping)

---

## Key Architectural Decisions

### Decision 1: Component Matching by ObjectId
**Considered:**
- Option A: Match by objectId (GUID)
- Option B: Match by displayName
- Option C: Match by combination (type + name)

**Chosen:** Option A - Match by objectId (case-insensitive)

**Rationale:**
- objectId is unique and stable across environments for SAME component
- displayName may not be available for all component types
- displayName can be changed by users (unreliable)

**Tradeoffs:**
- **Gave up:** Human-readable matching (easier debugging)
- **Gained:** Reliable, accurate component matching

---

### Decision 2: No Deep Schema Comparison in Slice 3
**Considered:**
- Option A: Include entity schema diff in Slice 3
- Option B: Component-level diff only (show added/removed)
- Option C: Component diff + basic metadata (e.g., modified date)

**Chosen:** Option B - Component-level diff only

**Rationale:**
- Deep schema comparison adds significant complexity (schema queries, field comparisons)
- Component-level diff solves 80% of user need ("what changed?")
- Keeps Slice 3 focused and deliverable (8-10 hours)

**Tradeoffs:**
- **Gave up:** Deep insight into schema changes
- **Gained:** Fast time-to-value; proven architecture before tackling complexity

---

### Decision 3: displayName = null for MVP
**Considered:**
- Option A: Fetch display names from entity metadata tables (complex joins)
- Option B: Return null for displayName, use objectId as fallback
- Option C: Skip displayName entirely

**Chosen:** Option B - Return null, fallback to objectId

**Rationale:**
- solutioncomponent table does NOT contain display names
- Fetching names requires additional queries to entity-specific tables (complex, slow)
- objectId is always available and unique
- Future enhancement: Fetch names for better UX

**Tradeoffs:**
- **Gave up:** User-friendly component names in MVP
- **Gained:** Simple implementation; fast queries; extensible for future enhancement

---

### Decision 4: Group Components by Type
**Considered:**
- Option A: Flat list of all components
- Option B: Group by type with expandable sections
- Option C: Separate tabs per component type

**Chosen:** Option B - Group by type with expandable sections

**Rationale:**
- Solutions often have 50-200 components (flat list overwhelming)
- Grouping by type provides organization (Entities, Flows, Plugins)
- Expandable sections allow users to focus on changed types only
- Single-page view (no tab switching)

**Tradeoffs:**
- **Gave up:** Simplicity of flat list
- **Gained:** Organized, scannable UI; focus on changes

---

## Open Questions

- [ ] **Q1: Should we fetch actual component names (e.g., entity logical names)?**
  - **Decision:** TBD. For MVP, use objectId. Future enhancement: Add name resolution.

- [ ] **Q2: Should component groups be sorted by change count (most changes first)?**
  - **Decision:** TBD. Current design sorts alphabetically. Could add "Sort by changes" toggle.

- [ ] **Q3: Should "Same" components be collapsed by default?**
  - **Decision:** TBD. Current design collapses all groups except those with changes (hasDifferences = true).

---

## References

- Related features:
  - Slice 1 (metadata comparison) - `docs/design/SOLUTION_DIFF_DESIGN.md`
  - `ISolutionComponentRepository` - `src/shared/domain/interfaces/ISolutionComponentRepository.ts`
- External documentation:
  - [Solution Component Reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/solutioncomponent)
  - [Component Type Codes](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/solutioncomponent#componenttype-choicesoptions)
- Design inspiration:
  - Git diff visualization (Added/Removed/Unchanged)
  - VS Code File Explorer (expandable sections)
- Workflow guide: `.claude/WORKFLOW.md`
- Panel architecture: `docs/architecture/PANEL_ARCHITECTURE.md`
- Clean Architecture: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
