# Metadata Browser - Clean Architecture Design

**Feature**: Metadata Browser
**Date**: 2025-11-02
**Status**: Approved for Implementation
**Architect Review**: Approved with revisions (incorporated)

---

## Overview

The Metadata Browser allows users to browse and inspect Power Platform metadata (entities, attributes, relationships, keys, privileges, and choices) in a read-only interface with search, filtering, and detail viewing capabilities.

---

## Requirements

### Functional Requirements

1. **Three-Panel Layout**
   - Left: Tree view with Tables/Choices + search/filter
   - Middle: Tabbed view with Attributes/Keys/Relationships/Privileges OR Choice Values
   - Right: Detail panel with Properties/Raw Data tabs (hidden by default)

2. **Left Panel (Tree View)**
   - Searchable/filterable tree of Tables and Choices
   - Display name + logical name visible
   - Icons: Custom (🏷️) vs System (📋) entities
   - **Quick Filters** (collapsed by default):
     - ☑ Custom / ☑ System
     - ☑ Managed / ☑ Unmanaged
   - Filter state persisted per environment (including collapsed state)

3. **Middle Panel (Tabbed Content)**
   - **For Entities**:
     - Tabs: [Attributes] [Keys] [Relationships] [Privileges]
     - Each tab shows a searchable/sortable data table
     - Attributes tab selected by default
   - **For Choices**:
     - Single view: Choice Values (Label, Value, Description)
     - Searchable/sortable data table

4. **Right Panel (Detail View)**
   - Hidden by default
   - Opens when user selects "View Details" from context menu
   - Tabs: [Properties] [Raw Data (JSON)]
   - Shows full metadata for selected attribute/relationship/etc.

5. **Top Actions**
   - Environment selector
   - Refresh button
   - Open in Maker button (navigates to entity list)

6. **Context Menu Actions**
   - View Details (opens right panel)
   - Copy Logical Name
   - Open in Maker (entity-specific)
   - Navigate to Related Entity (for relationships)

### Non-Functional Requirements

- Read-only (no mutations)
- Fast search/filter (client-side)
- Responsive layout
- Follows existing Clean Architecture patterns
- HTML extracted to view files (no HTML in TypeScript)

---

## Architecture

### Layer Structure

```
src/features/metadataBrowser/
├── domain/
│   ├── entities/
│   │   ├── EntityMetadata.ts          # Rich entity with behavior
│   │   ├── AttributeMetadata.ts       # Rich entity
│   │   ├── RelationshipMetadata.ts    # Rich entity
│   │   ├── KeyMetadata.ts             # Rich entity
│   │   ├── PrivilegeMetadata.ts       # Rich entity
│   │   └── ChoiceMetadata.ts          # Rich entity
│   ├── valueObjects/
│   │   ├── MetadataId.ts              # Type-safe GUID wrapper
│   │   ├── LogicalName.ts             # Type-safe name wrapper
│   │   └── MetadataFilterState.ts     # Filter state with business logic
│   └── interfaces/
│       └── IMetadataRepository.ts     # Repository contract
├── application/
│   ├── useCases/
│   │   ├── LoadEntityMetadataUseCase.ts
│   │   ├── LoadChoiceMetadataUseCase.ts
│   │   ├── ListEntitiesUseCase.ts
│   │   └── ListChoicesUseCase.ts
│   ├── viewModels/
│   │   ├── EntityTreeItemViewModel.ts
│   │   ├── ChoiceTreeItemViewModel.ts
│   │   ├── AttributeRowViewModel.ts
│   │   ├── KeyRowViewModel.ts
│   │   ├── RelationshipRowViewModel.ts
│   │   ├── PrivilegeRowViewModel.ts
│   │   └── ChoiceValueRowViewModel.ts
│   └── mappers/
│       └── MetadataViewModelMapper.ts
├── infrastructure/
│   └── repositories/
│       └── DataverseMetadataRepository.ts  # Implements IMetadataRepository
└── presentation/
    ├── panels/
    │   └── MetadataBrowserPanel.ts         # Custom panel (not DataTablePanel)
    ├── views/
    │   ├── metadataBrowserView.ts          # Main layout HTML
    │   ├── entityTreeView.ts               # Left panel HTML
    │   ├── tabContentView.ts               # Middle panel HTML
    │   └── detailPanelView.ts              # Right panel HTML
    └── behaviors/
        └── metadataBrowserBehavior.ts      # Client-side JavaScript
```

### Why NOT DataTablePanel?

- **Multiple data tables** (Attributes, Keys, Relationships, Privileges)
- **Three-panel layout** (tree + content + detail)
- **Complex interactions** (tree selection, tab switching, detail panel)
- **Custom state management** (filter preferences, collapsed sections)

**Solution**: Create custom panel following Clean Architecture, but reuse:
- View rendering patterns from `DataTablePanel`
- HTML view extraction approach
- Environment switching logic
- Error handling patterns

---

## Domain Layer Design

### Rich Entities with Behavior

#### EntityMetadata Entity

```typescript
// domain/entities/EntityMetadata.ts
export class EntityMetadata {
  constructor(
    private readonly logicalName: LogicalName,
    private readonly displayName: string,
    private readonly metadataId: MetadataId,
    private readonly isManaged: boolean,
    private readonly isCustomEntity: boolean,
    private readonly attributes: readonly AttributeMetadata[],
    private readonly keys: readonly KeyMetadata[],
    private readonly relationships: readonly RelationshipMetadata[],
    private readonly privileges: readonly PrivilegeMetadata[]
  ) {}

  // Rich behavior: domain logic belongs here
  getCustomAttributes(): AttributeMetadata[] {
    return this.attributes.filter(attr => attr.isCustom());
  }

  getRequiredAttributes(): AttributeMetadata[] {
    return this.attributes.filter(attr => attr.isRequired());
  }

  hasRelationshipTo(entityName: string): boolean {
    return this.relationships.some(rel =>
      rel.hasRelatedEntity(entityName)
    );
  }

  getPrimaryKey(): KeyMetadata | null {
    return this.keys.find(key => key.isPrimary()) ?? null;
  }

  // Getters for immutable access
  getLogicalName(): string { return this.logicalName.value; }
  getDisplayName(): string { return this.displayName; }
  getMetadataId(): string { return this.metadataId.value; }
  isManaged(): boolean { return this.isManaged; }
  isCustom(): boolean { return this.isCustomEntity; }
  getAttributes(): readonly AttributeMetadata[] { return this.attributes; }
  getKeys(): readonly KeyMetadata[] { return this.keys; }
  getRelationships(): readonly RelationshipMetadata[] { return this.relationships; }
  getPrivileges(): readonly PrivilegeMetadata[] { return this.privileges; }

  /**
   * Creates a lightweight EntityMetadata for tree view display.
   * Used by listEntities which doesn't fetch attributes/keys/etc.
   */
  static createLightweight(
    logicalName: LogicalName,
    displayName: string,
    metadataId: MetadataId,
    isManaged: boolean,
    isCustom: boolean
  ): EntityMetadata {
    return new EntityMetadata(
      logicalName,
      displayName,
      metadataId,
      isManaged,
      isCustom,
      [], // empty attributes
      [], // empty keys
      [], // empty relationships
      []  // empty privileges
    );
  }

  /**
   * Sorts entities by business rules: System entities first (alphabetically),
   * then custom entities (alphabetically).
   */
  static sort(entities: readonly EntityMetadata[]): EntityMetadata[] {
    if (!entities || entities.length === 0) {
      return [];
    }

    return [...entities].sort((a, b) => {
      // System entities before custom
      if (a.isCustom() !== b.isCustom()) {
        return a.isCustom() ? 1 : -1;
      }
      // Then alphabetically by display name
      return a.getDisplayName().localeCompare(b.getDisplayName());
    });
  }
}
```

#### AttributeMetadata Entity

```typescript
// domain/entities/AttributeMetadata.ts
export class AttributeMetadata {
  constructor(
    private readonly logicalName: LogicalName,
    private readonly displayName: string,
    private readonly attributeType: string,
    private readonly requiredLevel: RequiredLevel,
    private readonly maxLength: number | null,
    private readonly isCustomAttribute: boolean,
    private readonly isPrimaryId: boolean,
    private readonly isPrimaryName: boolean
  ) {}

  // Rich behavior: domain logic belongs here
  isCustom(): boolean {
    return this.isCustomAttribute;
  }

  isRequired(): boolean {
    return this.requiredLevel === RequiredLevel.ApplicationRequired ||
           this.requiredLevel === RequiredLevel.SystemRequired;
  }

  isPrimary(): boolean {
    return this.isPrimaryId || this.isPrimaryName;
  }

  canBeNull(): boolean {
    return this.requiredLevel === RequiredLevel.None;
  }

  // Getters for immutable access
  getLogicalName(): string { return this.logicalName.value; }
  getDisplayName(): string { return this.displayName; }
  getType(): string { return this.attributeType; }
  getRequiredLevel(): string { return this.requiredLevel.toString(); }
  getMaxLength(): number | null { return this.maxLength; }
}

// Value Object for Required Level
export enum RequiredLevel {
  None = 'None',
  SystemRequired = 'SystemRequired',
  ApplicationRequired = 'ApplicationRequired',
  Recommended = 'Recommended'
}
```

#### ChoiceMetadata Entity

```typescript
// domain/entities/ChoiceMetadata.ts
export class ChoiceMetadata {
  constructor(
    private readonly name: string,
    private readonly displayName: string,
    private readonly isManaged: boolean,
    private readonly isCustomOptionSet: boolean,
    private readonly options: readonly ChoiceOption[]
  ) {}

  // Rich behavior
  getOptionByValue(value: number): ChoiceOption | null {
    return this.options.find(opt => opt.value === value) ?? null;
  }

  hasOption(value: number): boolean {
    return this.options.some(opt => opt.value === value);
  }

  getActiveOptions(): ChoiceOption[] {
    return this.options.filter(opt => opt.isActive);
  }

  // Getters
  getName(): string { return this.name; }
  getDisplayName(): string { return this.displayName; }
  isManaged(): boolean { return this.isManaged; }
  isCustom(): boolean { return this.isCustomOptionSet; }
  getOptions(): readonly ChoiceOption[] { return this.options; }

  /**
   * Sorts choices alphabetically by display name.
   */
  static sort(choices: readonly ChoiceMetadata[]): ChoiceMetadata[] {
    if (!choices || choices.length === 0) {
      return [];
    }

    return [...choices].sort((a, b) =>
      a.getDisplayName().localeCompare(b.getDisplayName())
    );
  }
}

// Data Transfer Object (simple data structure, no validation needed for read-only display)
export interface ChoiceOption {
  readonly value: number;
  readonly label: string;
  readonly description: string;
  readonly isActive: boolean;
}
```

#### RelationshipMetadata Entity

```typescript
// domain/entities/RelationshipMetadata.ts
export class RelationshipMetadata {
  constructor(
    private readonly schemaName: string,
    private readonly relationshipType: RelationshipType,
    private readonly relatedEntityName: string,
    private readonly referencingAttribute: string,
    private readonly referencedEntity: string,
    private readonly cascadeConfiguration: CascadeConfiguration
  ) {}

  // Rich behavior: domain logic belongs here
  hasRelatedEntity(entityName: string): boolean {
    return this.relatedEntityName === entityName ||
           this.referencedEntity === entityName;
  }

  isManyToMany(): boolean {
    return this.relationshipType === RelationshipType.ManyToMany;
  }

  isOneToMany(): boolean {
    return this.relationshipType === RelationshipType.OneToMany;
  }

  isManyToOne(): boolean {
    return this.relationshipType === RelationshipType.ManyToOne;
  }

  // Getters for immutable access
  getSchemaName(): string { return this.schemaName; }
  getType(): string { return this.relationshipType.toString(); }
  getRelatedEntityName(): string { return this.relatedEntityName; }
  getReferencingAttribute(): string { return this.referencingAttribute; }
  getReferencedEntity(): string { return this.referencedEntity; }
  getCascadeConfiguration(): CascadeConfiguration { return this.cascadeConfiguration; }
}

// Value Objects
export enum RelationshipType {
  OneToMany = '1:N',
  ManyToOne = 'N:1',
  ManyToMany = 'N:N'
}

export interface CascadeConfiguration {
  readonly assign: CascadeType;
  readonly delete: CascadeType;
  readonly merge: CascadeType;
  readonly reparent: CascadeType;
  readonly share: CascadeType;
  readonly unshare: CascadeType;
}

export enum CascadeType {
  NoCascade = 'NoCascade',
  Cascade = 'Cascade',
  Active = 'Active',
  UserOwned = 'UserOwned',
  RemoveLink = 'RemoveLink',
  Restrict = 'Restrict'
}
```

#### KeyMetadata Entity

```typescript
// domain/entities/KeyMetadata.ts
export class KeyMetadata {
  constructor(
    private readonly logicalName: string,
    private readonly displayName: string,
    private readonly isPrimaryKey: boolean,
    private readonly keyAttributes: readonly string[]
  ) {}

  // Rich behavior: domain logic belongs here
  isPrimary(): boolean {
    return this.isPrimaryKey;
  }

  isAlternate(): boolean {
    return !this.isPrimaryKey;
  }

  containsAttribute(attributeName: string): boolean {
    return this.keyAttributes.includes(attributeName);
  }

  getAttributeCount(): number {
    return this.keyAttributes.length;
  }

  // Getters for immutable access
  getLogicalName(): string { return this.logicalName; }
  getDisplayName(): string { return this.displayName; }
  getAttributeNames(): readonly string[] { return this.keyAttributes; }
}
```

#### PrivilegeMetadata Entity

```typescript
// domain/entities/PrivilegeMetadata.ts
export class PrivilegeMetadata {
  constructor(
    private readonly privilegeId: string,
    private readonly name: string,
    private readonly privilegeType: PrivilegeType,
    private readonly accessRight: AccessRight,
    private readonly depth: PrivilegeDepth
  ) {}

  // Rich behavior: domain logic belongs here
  isReadOnly(): boolean {
    return this.privilegeType === PrivilegeType.None ||
           this.accessRight === AccessRight.None;
  }

  isBasicLevel(): boolean {
    return this.depth === PrivilegeDepth.Basic;
  }

  isGlobalLevel(): boolean {
    return this.depth === PrivilegeDepth.Global;
  }

  // Getters for immutable access
  getId(): string { return this.privilegeId; }
  getName(): string { return this.name; }
  getType(): string { return this.privilegeType.toString(); }
  getDepthLabel(): string { return this.depth.toString(); }
  getAccessRight(): string { return this.accessRight.toString(); }
}

// Value Objects
export enum PrivilegeType {
  None = 'None',
  Create = 'Create',
  Read = 'Read',
  Write = 'Write',
  Delete = 'Delete',
  Assign = 'Assign',
  Share = 'Share',
  Append = 'Append',
  AppendTo = 'AppendTo'
}

export enum AccessRight {
  None = 'None',
  ReadAccess = 'ReadAccess',
  WriteAccess = 'WriteAccess',
  AppendAccess = 'AppendAccess',
  AppendToAccess = 'AppendToAccess',
  CreateAccess = 'CreateAccess',
  DeleteAccess = 'DeleteAccess',
  ShareAccess = 'ShareAccess',
  AssignAccess = 'AssignAccess'
}

export enum PrivilegeDepth {
  Basic = 'Basic',
  Local = 'Local',
  Deep = 'Deep',
  Global = 'Global'
}
```

### Repository Interface (in Domain)

```typescript
// domain/interfaces/IMetadataRepository.ts
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

export interface IMetadataRepository {
  /**
   * Retrieves all entity definitions for tree display.
   * Returns lightweight EntityMetadata with only logicalName, displayName,
   * metadataId, isManaged, and isCustom populated. Collections (attributes,
   * keys, relationships, privileges) are empty arrays.
   *
   * Use getEntityMetadata() to fetch complete metadata for a specific entity.
   *
   * @param environmentId - Target environment ID
   * @param cancellationToken - Optional token to cancel the operation
   */
  listEntities(
    environmentId: string,
    cancellationToken?: ICancellationToken
  ): Promise<EntityMetadata[]>;

  /**
   * Retrieves complete entity metadata including all attributes, keys,
   * relationships, and privileges.
   * Used when displaying entity details in the middle panel.
   *
   * @param environmentId - Target environment ID
   * @param logicalName - Entity logical name
   * @param cancellationToken - Optional token to cancel the operation
   */
  getEntityMetadata(
    environmentId: string,
    logicalName: string,
    cancellationToken?: ICancellationToken
  ): Promise<EntityMetadata>;

  /**
   * Retrieves all global choice definitions for tree display.
   *
   * @param environmentId - Target environment ID
   * @param cancellationToken - Optional token to cancel the operation
   */
  listChoices(
    environmentId: string,
    cancellationToken?: ICancellationToken
  ): Promise<ChoiceMetadata[]>;

  /**
   * Retrieves complete choice metadata including all option values.
   *
   * @param environmentId - Target environment ID
   * @param name - Choice name
   * @param cancellationToken - Optional token to cancel the operation
   */
  getChoiceMetadata(
    environmentId: string,
    name: string,
    cancellationToken?: ICancellationToken
  ): Promise<ChoiceMetadata>;
}
```

---

## Application Layer Design

### Use Cases (Orchestration Only)

```typescript
// application/useCases/LoadEntityMetadataUseCase.ts
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';

export class LoadEntityMetadataUseCase {
  constructor(
    private readonly repository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  async execute(
    environmentId: string,
    logicalName: string,
    cancellationToken?: ICancellationToken
  ): Promise<EntityMetadata> {
    this.logger.info('Loading entity metadata', { environmentId, logicalName });

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    // Use case orchestrates - no business logic
    const metadata = await this.repository.getEntityMetadata(
      environmentId,
      logicalName,
      cancellationToken
    );

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    this.logger.info('Entity metadata loaded', {
      logicalName,
      attributeCount: metadata.getAttributes().length
    });

    return metadata;
  }
}

// application/useCases/ListEntitiesUseCase.ts
export class ListEntitiesUseCase {
  constructor(
    private readonly repository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  async execute(
    environmentId: string,
    cancellationToken?: ICancellationToken
  ): Promise<EntityMetadata[]> {
    this.logger.info('Listing entities', { environmentId });

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    const entities = await this.repository.listEntities(
      environmentId,
      cancellationToken
    );

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    this.logger.info('Entities listed', {
      count: entities.length
    });

    return entities;
  }
}
```

### ViewModels (DTOs for Presentation)

```typescript
// application/viewModels/FilterableItem.ts
/**
 * Base interface for tree items that can be filtered by custom/system and managed/unmanaged.
 * Used by MetadataFilterState.shouldShow() to apply domain filtering logic.
 */
export interface FilterableItem {
  readonly isCustom: boolean;
  readonly isManaged: boolean;
}

// application/viewModels/AttributeRowViewModel.ts
export interface AttributeRowViewModel {
  readonly id: string;              // LogicalName
  readonly displayName: string;
  readonly logicalName: string;
  readonly type: string;
  readonly required: string;        // "Application" | "None" | "System"
  readonly maxLength: string;       // "N/A" or number
}

// application/viewModels/EntityTreeItemViewModel.ts
export interface EntityTreeItemViewModel extends FilterableItem {
  readonly logicalName: string;
  readonly displayName: string;
  readonly metadataId: string;
  readonly icon: string;            // "🏷️" or "📋"
}

// application/viewModels/ChoiceTreeItemViewModel.ts
export interface ChoiceTreeItemViewModel extends FilterableItem {
  readonly name: string;
  readonly displayName: string;
  readonly icon: string;            // "🔽"
}

// application/viewModels/KeyRowViewModel.ts
export interface KeyRowViewModel {
  readonly id: string;
  readonly name: string;
  readonly type: string;            // "Primary" | "Alternate"
  readonly keyAttributes: string;   // Comma-separated attribute names
}

// application/viewModels/RelationshipRowViewModel.ts
export interface RelationshipRowViewModel {
  readonly id: string;
  readonly name: string;
  readonly type: string;            // "1:N" | "N:1" | "N:N"
  readonly relatedEntity: string;
  readonly referencingAttribute: string;
}

// application/viewModels/PrivilegeRowViewModel.ts
export interface PrivilegeRowViewModel {
  readonly id: string;
  readonly name: string;
  readonly privilegeType: string;
  readonly depth: string;           // "Basic, Local, Deep, Global"
}

// application/viewModels/ChoiceValueRowViewModel.ts
export interface ChoiceValueRowViewModel {
  readonly id: string;              // Value as string
  readonly label: string;
  readonly value: string;
  readonly description: string;
}
```

### Mappers (Transform Only)

```typescript
// application/mappers/MetadataViewModelMapper.ts
export class MetadataViewModelMapper {
  /**
   * Maps domain entities to tree item view models.
   * NO SORTING - caller sorts before/after mapping.
   */
  static toEntityTreeItems(
    entities: readonly EntityMetadata[]
  ): EntityTreeItemViewModel[] {
    if (!entities || entities.length === 0) {
      return [];
    }

    return entities.map(entity => ({
      logicalName: entity.getLogicalName(),
      displayName: entity.getDisplayName(),
      metadataId: entity.getMetadataId(),
      isManaged: entity.isManaged(),
      isCustom: entity.isCustom(),
      icon: entity.isCustom() ? '🏷️' : '📋'
    }));
  }

  /**
   * Maps choice metadata to tree item view models.
   */
  static toChoiceTreeItems(
    choices: readonly ChoiceMetadata[]
  ): ChoiceTreeItemViewModel[] {
    if (!choices || choices.length === 0) {
      return [];
    }

    return choices.map(choice => ({
      name: choice.getName(),
      displayName: choice.getDisplayName(),
      isManaged: choice.isManaged(),
      isCustom: choice.isCustom(),
      icon: '🔽'
    }));
  }

  /**
   * Maps attributes to table row view models.
   */
  static toAttributeRows(
    attributes: readonly AttributeMetadata[]
  ): AttributeRowViewModel[] {
    if (!attributes || attributes.length === 0) {
      return [];
    }

    return attributes.map(attr => ({
      id: attr.getLogicalName(),
      displayName: attr.getDisplayName(),
      logicalName: attr.getLogicalName(),
      type: attr.getType(),
      required: attr.getRequiredLevel(),
      maxLength: attr.getMaxLength()?.toString() ?? 'N/A'
    }));
  }

  /**
   * Maps keys to table row view models.
   */
  static toKeyRows(keys: readonly KeyMetadata[]): KeyRowViewModel[] {
    if (!keys || keys.length === 0) {
      return [];
    }

    return keys.map(key => ({
      id: key.getLogicalName(),
      name: key.getLogicalName(),
      type: key.isPrimary() ? 'Primary' : 'Alternate',
      keyAttributes: key.getAttributeNames().join(', ')
    }));
  }

  /**
   * Maps relationships to table row view models.
   */
  static toRelationshipRows(
    relationships: readonly RelationshipMetadata[]
  ): RelationshipRowViewModel[] {
    if (!relationships || relationships.length === 0) {
      return [];
    }

    return relationships.map(rel => ({
      id: rel.getSchemaName(),
      name: rel.getSchemaName(),
      type: rel.getType(),
      relatedEntity: rel.getRelatedEntityName(),
      referencingAttribute: rel.getReferencingAttribute()
    }));
  }

  /**
   * Maps privileges to table row view models.
   */
  static toPrivilegeRows(
    privileges: readonly PrivilegeMetadata[]
  ): PrivilegeRowViewModel[] {
    if (!privileges || privileges.length === 0) {
      return [];
    }

    return privileges.map(priv => ({
      id: priv.getId(),
      name: priv.getName(),
      privilegeType: priv.getType(),
      depth: priv.getDepthLabel()
    }));
  }

  /**
   * Maps choice options to table row view models.
   */
  static toChoiceValueRows(
    choice: ChoiceMetadata
  ): ChoiceValueRowViewModel[] {
    const options = choice.getOptions();

    if (!options || options.length === 0) {
      return [];
    }

    return options.map(opt => ({
      id: opt.value.toString(),
      label: opt.label,
      value: opt.value.toString(),
      description: opt.description
    }));
  }
}
```

---

## Infrastructure Layer Design

### Repository Implementation

```typescript
// infrastructure/repositories/DataverseMetadataRepository.ts
export class DataverseMetadataRepository implements IMetadataRepository {
  constructor(
    private readonly authService: IAuthenticationService,
    private readonly logger: ILogger
  ) {}

  async listEntities(
    environmentId: string,
    cancellationToken?: ICancellationToken
  ): Promise<EntityMetadata[]> {
    this.logger.debug('Fetching entity definitions from Dataverse API', { environmentId });

    const token = await this.authService.getAccessToken(environmentId);
    const environment = await this.authService.getEnvironment(environmentId);

    if (!environment) {
      throw new Error('Environment not found');
    }

    const url = `${environment.dataverseUrl}/api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName,MetadataId,IsManaged,IsCustomEntity`;

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch entities: ${response.statusText}`);
    }

    const data = await response.json();

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    // Map API response to domain entities using factory method
    return data.value.map((dto: EntityDefinitionDto) => {
      const logicalName = new LogicalName(dto.LogicalName);
      const metadataId = new MetadataId(dto.MetadataId);

      return EntityMetadata.createLightweight(
        logicalName,
        dto.DisplayName?.UserLocalizedLabel?.Label ?? dto.LogicalName,
        metadataId,
        dto.IsManaged ?? false,
        dto.IsCustomEntity ?? false
      );
    });
  }

  async getEntityMetadata(
    environmentId: string,
    logicalName: string,
    cancellationToken?: ICancellationToken
  ): Promise<EntityMetadata> {
    this.logger.debug('Fetching complete entity metadata from Dataverse API', {
      environmentId,
      logicalName
    });

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    // Fetch complete metadata with $expand for attributes, keys, etc.
    const token = await this.authService.getAccessToken(environmentId);
    const environment = await this.authService.getEnvironment(environmentId);

    if (!environment) {
      throw new Error('Environment not found');
    }

    const url = `${environment.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')?$expand=Attributes,Keys,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships,Privileges`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch entity metadata: ${response.statusText}`);
    }

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    const dto = await response.json();

    // Map to full domain entity
    return this.mapToCompleteEntityMetadata(dto);
  }

  /**
   * Maps complete Dataverse API response to full EntityMetadata domain entity.
   * Handles null/undefined values from API responses gracefully.
   * @private
   */
  private mapToCompleteEntityMetadata(dto: EntityDefinitionDto): EntityMetadata {
    const logicalName = new LogicalName(dto.LogicalName);
    const metadataId = new MetadataId(dto.MetadataId);

    // Map attributes
    const attributes = (dto.Attributes ?? []).map(attrDto =>
      this.mapToAttributeMetadata(attrDto)
    );

    // Map keys
    const keys = (dto.Keys ?? []).map(keyDto =>
      this.mapToKeyMetadata(keyDto)
    );

    // Map relationships (combine 1:N, N:1, N:N)
    const relationships = [
      ...(dto.OneToManyRelationships ?? []).map(rel => this.mapToRelationshipMetadata(rel, RelationshipType.OneToMany)),
      ...(dto.ManyToOneRelationships ?? []).map(rel => this.mapToRelationshipMetadata(rel, RelationshipType.ManyToOne)),
      ...(dto.ManyToManyRelationships ?? []).map(rel => this.mapToRelationshipMetadata(rel, RelationshipType.ManyToMany))
    ];

    // Map privileges
    const privileges = (dto.Privileges ?? []).map(privDto =>
      this.mapToPrivilegeMetadata(privDto)
    );

    return new EntityMetadata(
      logicalName,
      dto.DisplayName?.UserLocalizedLabel?.Label ?? dto.LogicalName,
      metadataId,
      dto.IsManaged ?? false,
      dto.IsCustomEntity ?? false,
      attributes,
      keys,
      relationships,
      privileges
    );
  }

  // ... other mapper methods (mapToAttributeMetadata, mapToKeyMetadata, etc.)
}
```

---

## Presentation Layer Design

### Panel (Orchestration)

```typescript
// presentation/panels/MetadataBrowserPanel.ts
export class MetadataBrowserPanel {
  private currentEnvironmentId: string | null = null;
  private selectedEntityLogicalName: string | null = null;
  private selectedChoiceName: string | null = null;
  private quickFiltersCollapsed: boolean = true;
  private filterState: MetadataFilterState = MetadataFilterState.createDefault();

  constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private readonly listEntitiesUseCase: ListEntitiesUseCase,
    private readonly listChoicesUseCase: ListChoicesUseCase,
    private readonly loadEntityMetadataUseCase: LoadEntityMetadataUseCase,
    private readonly loadChoiceMetadataUseCase: LoadChoiceMetadataUseCase,
    private readonly urlBuilder: IMakerUrlBuilder,
    private readonly logger: ILogger
  ) {
    // Initialize webview
    panel.webview.html = this.getHtmlContent();

    // Setup message handler
    panel.webview.onDidReceiveMessage(msg => this.handleMessage(msg));

    // Load initial data
    void this.initialize();
  }

  private getHtmlContent(): string {
    // Use view functions (HTML extracted to separate files)
    return renderMetadataBrowser({
      extensionUri: this.extensionUri,
      webview: this.panel.webview,
      quickFiltersCollapsed: this.quickFiltersCollapsed,
      filterState: this.filterState
    });
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.command) {
      case 'environmentChanged':
        await this.handleEnvironmentChanged(message.data.environmentId);
        break;

      case 'entitySelected':
        await this.handleEntitySelected(message.data.logicalName);
        break;

      case 'choiceSelected':
        await this.handleChoiceSelected(message.data.name);
        break;

      case 'tabChanged':
        // No server action needed - client-side only
        break;

      case 'filterChanged':
        await this.handleFilterChanged(message.data.filters);
        break;

      case 'viewDetails':
        await this.handleViewDetails(message.data.itemId);
        break;

      // ... other handlers
    }
  }

  private async handleEnvironmentChanged(environmentId: string): Promise<void> {
    // Load filter state for this environment
    this.filterState = await this.loadFilterState(environmentId);
    this.quickFiltersCollapsed = await this.loadQuickFiltersCollapsed(environmentId);

    this.currentEnvironmentId = environmentId;

    // Load entity/choice tree
    await this.loadTree();
  }

  private async loadTree(): Promise<void> {
    if (!this.currentEnvironmentId) {
      return;
    }

    try {
      const cancellationToken = this.createCancellationToken();

      // Use cases orchestrate domain logic
      const entities = await this.listEntitiesUseCase.execute(
        this.currentEnvironmentId,
        cancellationToken
      );
      const choices = await this.listChoicesUseCase.execute(
        this.currentEnvironmentId,
        cancellationToken
      );

      if (cancellationToken.isCancellationRequested) {
        return;
      }

      // Sort using domain static methods
      const sortedEntities = EntityMetadata.sort(entities);
      const sortedChoices = ChoiceMetadata.sort(choices);

      // Map to ViewModels
      const entityVMs = MetadataViewModelMapper.toEntityTreeItems(sortedEntities);
      const choiceVMs = MetadataViewModelMapper.toChoiceTreeItems(sortedChoices);

      // Apply filters using domain value object
      const filteredEntityVMs = this.applyFilters(entityVMs);
      const filteredChoiceVMs = this.applyFilters(choiceVMs);

      // Send to webview
      this.panel.webview.postMessage({
        command: 'populateTree',
        data: {
          entities: filteredEntityVMs,
          choices: filteredChoiceVMs
        }
      });
    } catch (error) {
      if (!(error instanceof OperationCancelledException)) {
        this.logger.error('Failed to load tree', error);
        this.handleError(error);
      }
    }
  }

  private async handleEntitySelected(logicalName: string): Promise<void> {
    if (!this.currentEnvironmentId) {
      return;
    }

    this.selectedEntityLogicalName = logicalName;
    this.selectedChoiceName = null;

    try {
      const cancellationToken = this.createCancellationToken();

      // Load full metadata
      const metadata = await this.loadEntityMetadataUseCase.execute(
        this.currentEnvironmentId,
        logicalName,
        cancellationToken
      );

      if (cancellationToken.isCancellationRequested) {
        return;
      }

      // Map to ViewModels for each tab
      const attributeVMs = MetadataViewModelMapper.toAttributeRows(metadata.getAttributes());
      const keyVMs = MetadataViewModelMapper.toKeyRows(metadata.getKeys());
      const relationshipVMs = MetadataViewModelMapper.toRelationshipRows(metadata.getRelationships());
      const privilegeVMs = MetadataViewModelMapper.toPrivilegeRows(metadata.getPrivileges());

      // Send to webview
      this.panel.webview.postMessage({
        command: 'showEntityMetadata',
        data: {
          displayName: metadata.getDisplayName(),
          attributes: attributeVMs,
          keys: keyVMs,
          relationships: relationshipVMs,
          privileges: privilegeVMs
        }
      });
    } catch (error) {
      if (!(error instanceof OperationCancelledException)) {
        this.logger.error('Failed to load entity metadata', error, { logicalName });
        this.handleError(error);
      }
    }
  }

  private applyFilters(
    items: readonly FilterableItem[]
  ): FilterableItem[] {
    if (!items || items.length === 0) {
      return [];
    }

    // Use domain value object for filtering logic
    return items.filter(item => this.filterState.shouldShow(item));
  }

  private async handleFilterChanged(filters: {
    showCustom: boolean;
    showSystem: boolean;
    showManaged: boolean;
    showUnmanaged: boolean;
  }): Promise<void> {
    // Update domain value object
    this.filterState = MetadataFilterState.fromPlainObject(filters);

    // Persist per environment
    if (this.currentEnvironmentId) {
      await this.saveFilterState(this.currentEnvironmentId, this.filterState);
    }

    // Reload tree with new filters
    await this.loadTree();
  }

  protected createCancellationToken(): VsCodeCancellationTokenAdapter {
    this.cancellationTokenSource?.cancel();
    this.cancellationTokenSource?.dispose();
    this.cancellationTokenSource = new vscode.CancellationTokenSource();
    return new VsCodeCancellationTokenAdapter(this.cancellationTokenSource.token);
  }

  // ... other methods
}
```

### Views (HTML Extracted)

```typescript
// presentation/views/metadataBrowserView.ts
export function renderMetadataBrowser(options: {
  extensionUri: vscode.Uri;
  webview: vscode.Webview;
  quickFiltersCollapsed: boolean;
  filterState: FilterState;
}): string {
  const { webview, extensionUri, quickFiltersCollapsed, filterState } = options;

  const cssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'css', 'metadata-browser.css')
  );

  const jsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'js', 'metadata-browser.js')
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${cssUri}">
  <title>Metadata Browser</title>
</head>
<body>
  <div class="metadata-browser">
    <!-- Top Actions -->
    <div class="top-actions">
      <button id="refresh-btn">🔄 Refresh</button>
      <button id="open-maker-btn">Open in Maker</button>
      <select id="environment-selector">
        <!-- Populated by JavaScript -->
      </select>
    </div>

    <!-- Three-panel layout -->
    <div class="panels-container">
      <!-- Left Panel -->
      ${renderTreePanel(quickFiltersCollapsed, filterState)}

      <!-- Middle Panel -->
      ${renderTabContent()}

      <!-- Right Panel (Detail) -->
      ${renderDetailPanel()}
    </div>
  </div>

  <script src="${jsUri}"></script>
</body>
</html>`;
}

// presentation/views/entityTreeView.ts
export function renderTreePanel(
  quickFiltersCollapsed: boolean,
  filterState: FilterState
): string {
  return `
    <div class="tree-panel">
      <!-- Quick Filters -->
      <div class="quick-filters ${quickFiltersCollapsed ? 'collapsed' : ''}">
        <div class="quick-filters-header" onclick="toggleQuickFilters()">
          <span class="icon">${quickFiltersCollapsed ? '▶' : '▼'}</span>
          Quick Filters
        </div>
        <div class="quick-filters-content">
          <label><input type="checkbox" id="filter-custom" ${filterState.showCustom ? 'checked' : ''}> Custom</label>
          <label><input type="checkbox" id="filter-system" ${filterState.showSystem ? 'checked' : ''}> System</label>
          <label><input type="checkbox" id="filter-managed" ${filterState.showManaged ? 'checked' : ''}> Managed</label>
          <label><input type="checkbox" id="filter-unmanaged" ${filterState.showUnmanaged ? 'checked' : ''}> Unmanaged</label>
        </div>
      </div>

      <!-- Search -->
      <input
        type="text"
        class="tree-search"
        id="tree-search"
        placeholder="🔍 Search tables and choices..."
      />

      <!-- Tree -->
      <div class="tree-container">
        <div class="tree-section">
          <div class="tree-section-header">TABLES</div>
          <ul id="tables-list">
            <!-- Populated by JavaScript -->
          </ul>
        </div>
        <div class="tree-section">
          <div class="tree-section-header">CHOICES</div>
          <ul id="choices-list">
            <!-- Populated by JavaScript -->
          </ul>
        </div>
      </div>
    </div>
  `;
}

// presentation/views/tabContentView.ts
export function renderTabContent(): string {
  return `
    <div class="tab-content-panel">
      <div class="selection-header">
        <span>Selected:</span>
        <span id="current-selection">None selected</span>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab active" data-tab="attributes">Attributes (<span id="attr-count">0</span>)</button>
        <button class="tab" data-tab="keys">Keys (<span id="key-count">0</span>)</button>
        <button class="tab" data-tab="relationships">Relationships (<span id="rel-count">0</span>)</button>
        <button class="tab" data-tab="privileges">Privileges (<span id="priv-count">0</span>)</button>
      </div>

      <!-- Tab Content -->
      <div class="tab-pane active" id="attributes-pane">
        <input type="text" class="table-search" placeholder="🔍 Search attributes..." />
        <div id="attributes-table">
          <!-- DataTable rendered here -->
        </div>
      </div>

      <div class="tab-pane" id="keys-pane">
        <input type="text" class="table-search" placeholder="🔍 Search keys..." />
        <div id="keys-table">
          <!-- DataTable rendered here -->
        </div>
      </div>

      <div class="tab-pane" id="relationships-pane">
        <input type="text" class="table-search" placeholder="🔍 Search relationships..." />
        <div id="relationships-table">
          <!-- DataTable rendered here -->
        </div>
      </div>

      <div class="tab-pane" id="privileges-pane">
        <input type="text" class="table-search" placeholder="🔍 Search privileges..." />
        <div id="privileges-table">
          <!-- DataTable rendered here -->
        </div>
      </div>
    </div>
  `;
}

// presentation/views/detailPanelView.ts
export function renderDetailPanel(): string {
  return `
    <div class="detail-panel hidden" id="detail-panel">
      <div class="detail-header">
        <span id="detail-title">Details</span>
        <button class="close-btn" onclick="closeDetailPanel()">×</button>
      </div>

      <div class="detail-tabs">
        <button class="detail-tab active" data-tab="properties">Properties</button>
        <button class="detail-tab" data-tab="json">Raw Data</button>
      </div>

      <div class="detail-content">
        <div class="detail-pane active" id="properties-pane">
          <!-- Properties table rendered here -->
        </div>
        <div class="detail-pane" id="json-pane">
          <!-- JSON viewer rendered here -->
        </div>
      </div>
    </div>
  `;
}
```

---

## State Persistence

### Filter State per Environment

```typescript
// domain/valueObjects/MetadataFilterState.ts
export class MetadataFilterState {
  constructor(
    private readonly showCustom: boolean,
    private readonly showSystem: boolean,
    private readonly showManaged: boolean,
    private readonly showUnmanaged: boolean
  ) {}

  /**
   * Checks if an item should be visible based on filter criteria.
   * Business rule: Item must match at least one type filter (custom/system)
   * AND one state filter (managed/unmanaged).
   */
  shouldShow(item: { isCustom: boolean; isManaged: boolean }): boolean {
    const typeMatch = (this.showCustom && item.isCustom) ||
                      (this.showSystem && !item.isCustom);
    const stateMatch = (this.showManaged && item.isManaged) ||
                       (this.showUnmanaged && !item.isManaged);
    return typeMatch && stateMatch;
  }

  // Getters
  getShowCustom(): boolean { return this.showCustom; }
  getShowSystem(): boolean { return this.showSystem; }
  getShowManaged(): boolean { return this.showManaged; }
  getShowUnmanaged(): boolean { return this.showUnmanaged; }

  /**
   * Creates a new filter state with updated values.
   * Returns new instance (immutable).
   */
  withChanges(updates: Partial<{
    showCustom: boolean;
    showSystem: boolean;
    showManaged: boolean;
    showUnmanaged: boolean;
  }>): MetadataFilterState {
    return new MetadataFilterState(
      updates.showCustom ?? this.showCustom,
      updates.showSystem ?? this.showSystem,
      updates.showManaged ?? this.showManaged,
      updates.showUnmanaged ?? this.showUnmanaged
    );
  }

  /**
   * Default filter state for new environments.
   */
  static createDefault(): MetadataFilterState {
    return new MetadataFilterState(
      true,  // showCustom
      true,  // showSystem
      false, // showManaged
      true   // showUnmanaged
    );
  }

  /**
   * Converts to plain object for serialization.
   */
  toPlainObject(): {
    showCustom: boolean;
    showSystem: boolean;
    showManaged: boolean;
    showUnmanaged: boolean;
  } {
    return {
      showCustom: this.showCustom,
      showSystem: this.showSystem,
      showManaged: this.showManaged,
      showUnmanaged: this.showUnmanaged
    };
  }

  /**
   * Creates from plain object (deserialization).
   */
  static fromPlainObject(obj: {
    showCustom: boolean;
    showSystem: boolean;
    showManaged: boolean;
    showUnmanaged: boolean;
  }): MetadataFilterState {
    return new MetadataFilterState(
      obj.showCustom,
      obj.showSystem,
      obj.showManaged,
      obj.showUnmanaged
    );
  }
}

// presentation/panels/MetadataBrowserPanel.ts
interface MetadataBrowserPreferences {
  filterState: {
    showCustom: boolean;
    showSystem: boolean;
    showManaged: boolean;
    showUnmanaged: boolean;
  };
  quickFiltersCollapsed: boolean;
  splitRatio?: number;
}

// Store in VS Code state storage, keyed by environment
private async saveFilterState(
  environmentId: string,
  filterState: MetadataFilterState
): Promise<void> {
  const key = `metadataBrowser.${environmentId}.preferences`;
  const prefs: MetadataBrowserPreferences = {
    filterState: filterState.toPlainObject(),
    quickFiltersCollapsed: this.quickFiltersCollapsed
  };
  await this.context.workspaceState.update(key, prefs);
}

private async loadFilterState(
  environmentId: string
): Promise<MetadataFilterState> {
  const key = `metadataBrowser.${environmentId}.preferences`;
  const prefs = this.context.workspaceState.get<MetadataBrowserPreferences>(key);

  if (!prefs || !prefs.filterState) {
    return MetadataFilterState.createDefault();
  }

  return MetadataFilterState.fromPlainObject(prefs.filterState);
}
```

---

## UI/UX Decisions Summary

1. ✅ **Full tabbed layout** for Attributes/Keys/Relationships/Privileges
2. ✅ **Quick filters at top** (Custom/System/Managed/Unmanaged) - collapsed by default
3. ✅ **Filter state persisted per environment** (including collapsed state)
4. ✅ **Better icons** using standard emojis
5. ✅ **Empty/error states** with helpful messaging
6. ❌ **Keyboard shortcuts** - skipped (not needed)
7. ❌ **Favorites/Recents** - skipped for now
8. ❌ **Copy as JSON/FetchXML** - skipped for now

---

## Why This Design Follows Clean Architecture

### ✅ Domain Layer Independence
- Rich entities with behavior (not anemic models)
- Zero dependencies on outer layers
- Repository interfaces defined in domain
- Value objects for type safety (MetadataId, LogicalName)

### ✅ Application Layer Orchestration
- Use cases coordinate domain entities only
- No business logic in use cases
- ViewModels are pure DTOs
- Mappers transform only (no sorting)

### ✅ Infrastructure Depends Inward
- Repository implements domain interface
- Talks to external API
- Maps API DTOs to domain entities

### ✅ Presentation Layer Separation
- Panel orchestrates use cases
- HTML extracted to view files (no HTML in TypeScript)
- Client-side behavior in separate files
- No business logic in panel

### ✅ Dependency Direction
```
Presentation → Application → Domain
Infrastructure → Domain
```

---

## Comparison with Existing Panels

### Similar to SolutionExplorer
- Same layer structure
- Use cases orchestrate
- ViewModels for presentation
- Repository pattern
- HTML extracted to views

### Different from SolutionExplorer
- **Does NOT extend DataTablePanel** (custom 3-panel layout)
- **Multiple data tables** (one per tab)
- **More complex state** (filters, tabs, detail panel)
- **Tree view** instead of single table

### Reuses Shared Infrastructure
- Environment selector component
- Error handling patterns
- Cancellation token pattern
- Logger injection
- URL builder for Maker links

---

## Open Questions

None - design is ready for architect review.

---

## Next Steps

1. ✅ Design document complete
2. ⏳ Submit to clean-architecture-guardian for review
3. ⏳ Address any architectural feedback
4. ⏳ Get final user approval
5. ⏳ Begin implementation

---

## References

- Existing: `src/features/solutionExplorer/`
- Base class: `src/shared/infrastructure/ui/DataTablePanel.ts`
- CLAUDE.md: Clean Architecture rules
