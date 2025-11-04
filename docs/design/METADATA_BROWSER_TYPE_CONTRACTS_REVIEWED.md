# Metadata Browser - Type Contracts (REVIEWED)

**Status:** Ready for Implementation
**Reviewer:** typescript-pro
**Review Date:** 2025-11-04

---

## Domain Layer - Type Definitions

### Value Types

```typescript
// domain/valueObjects/AttributeType.ts
export type AttributeType =
  | 'String'
  | 'Integer'
  | 'BigInt'
  | 'Decimal'
  | 'Double'
  | 'Money'
  | 'Boolean'
  | 'DateTime'
  | 'Lookup'
  | 'Picklist'
  | 'MultiSelectPicklist'
  | 'Memo'
  | 'UniqueIdentifier'
  | 'Owner'
  | 'Customer'
  | 'State'
  | 'Status'
  | 'Virtual'
  | 'File'
  | 'Image';

// domain/valueObjects/RelationshipType.ts
export type RelationshipType =
  | 'OneToMany'
  | 'ManyToOne'
  | 'ManyToMany';

// domain/valueObjects/EntityLogicalName.ts
declare const EntityLogicalNameBrand: unique symbol;
export type EntityLogicalName = string & { readonly [EntityLogicalNameBrand]: never };

export function createEntityLogicalName(value: string): EntityLogicalName {
  if (value.trim() === '') {
    throw new Error('Entity logical name cannot be empty');
  }
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error('Entity logical name must match pattern: [a-z_][a-z0-9_]*');
  }
  return value as EntityLogicalName;
}

// domain/valueObjects/EnvironmentId.ts
declare const EnvironmentIdBrand: unique symbol;
export type EnvironmentId = string & { readonly [EnvironmentIdBrand]: never };

export function createEnvironmentId(value: string): EnvironmentId {
  if (value.trim() === '') {
    throw new Error('Environment ID cannot be empty');
  }
  return value as EnvironmentId;
}
```

### Type Guards

```typescript
// domain/valueObjects/TypeGuards.ts
export function isAttributeType(value: string): value is AttributeType {
  const validTypes: readonly AttributeType[] = [
    'String', 'Integer', 'BigInt', 'Decimal', 'Double', 'Money',
    'Boolean', 'DateTime', 'Lookup', 'Picklist', 'MultiSelectPicklist',
    'Memo', 'UniqueIdentifier', 'Owner', 'Customer', 'State', 'Status',
    'Virtual', 'File', 'Image'
  ];
  return validTypes.includes(value as AttributeType);
}

export function isRelationshipType(value: string): value is RelationshipType {
  return value === 'OneToMany' || value === 'ManyToOne' || value === 'ManyToMany';
}
```

### Filter Options (Discriminated Unions)

```typescript
// domain/valueObjects/FilterOptions.ts
export type EntityOriginFilter =
  | { type: 'all' }
  | { type: 'customOnly' }
  | { type: 'systemOnly' };

export type EntityManagementFilter =
  | { type: 'all' }
  | { type: 'managedOnly' }
  | { type: 'unmanagedOnly' };

export class FilterOptions {
  private constructor(
    private readonly originFilter: EntityOriginFilter,
    private readonly managementFilter: EntityManagementFilter
  ) {}

  public static create(
    originFilter: EntityOriginFilter,
    managementFilter: EntityManagementFilter
  ): FilterOptions {
    return new FilterOptions(originFilter, managementFilter);
  }

  public static default(): FilterOptions {
    return new FilterOptions(
      { type: 'all' },
      { type: 'all' }
    );
  }

  public matchesOrigin(isCustomEntity: boolean): boolean {
    switch (this.originFilter.type) {
      case 'all':
        return true;
      case 'customOnly':
        return isCustomEntity;
      case 'systemOnly':
        return !isCustomEntity;
    }
  }

  public matchesManagement(isManaged: boolean): boolean {
    switch (this.managementFilter.type) {
      case 'all':
        return true;
      case 'managedOnly':
        return isManaged;
      case 'unmanagedOnly':
        return !isManaged;
    }
  }

  public getOriginFilter(): EntityOriginFilter {
    return this.originFilter;
  }

  public getManagementFilter(): EntityManagementFilter {
    return this.managementFilter;
  }
}
```

### Choice Option (Value Object Class)

```typescript
// domain/valueObjects/ChoiceOption.ts
export class ChoiceOption {
  private constructor(
    private readonly value: number,
    private readonly label: string
  ) {}

  public static create(value: number, label: string): ChoiceOption {
    if (value < 0) {
      throw new Error('Choice option value must be non-negative');
    }
    if (label.trim() === '') {
      throw new Error('Choice option label cannot be empty');
    }
    return new ChoiceOption(value, label);
  }

  public getValue(): number {
    return this.value;
  }

  public getLabel(): string {
    return this.label;
  }

  public equals(other: ChoiceOption): boolean {
    return this.value === other.value;
  }
}
```

---

## Domain Layer - Entities

### EntityMetadata

```typescript
// domain/entities/EntityMetadata.ts
export class EntityMetadata {
  constructor(
    private readonly logicalName: EntityLogicalName,
    private readonly displayName: string,
    private readonly isCustomEntity: boolean,
    private readonly isManaged: boolean,
    private readonly attributes: readonly AttributeMetadata[],
    private readonly keys: readonly KeyMetadata[],
    private readonly relationships: readonly RelationshipMetadata[],
    private readonly privileges: readonly PrivilegeMetadata[],
    private readonly primaryIdAttribute: string,
    private readonly primaryNameAttribute: string
  ) {}

  public static create(
    logicalName: EntityLogicalName,
    displayName: string,
    isCustomEntity: boolean,
    isManaged: boolean,
    attributes: readonly AttributeMetadata[],
    keys: readonly KeyMetadata[],
    relationships: readonly RelationshipMetadata[],
    privileges: readonly PrivilegeMetadata[],
    primaryIdAttribute: string,
    primaryNameAttribute: string
  ): EntityMetadata {
    if (displayName.trim() === '') {
      throw new Error('Entity display name cannot be empty');
    }

    const attributeNames = attributes.map(a => a.getLogicalName());
    if (!attributeNames.includes(primaryIdAttribute)) {
      throw new Error(`Primary ID attribute '${primaryIdAttribute}' not found in attributes`);
    }
    if (!attributeNames.includes(primaryNameAttribute)) {
      throw new Error(`Primary name attribute '${primaryNameAttribute}' not found in attributes`);
    }

    return new EntityMetadata(
      logicalName,
      displayName,
      isCustomEntity,
      isManaged,
      attributes,
      keys,
      relationships,
      privileges,
      primaryIdAttribute,
      primaryNameAttribute
    );
  }

  public isCustom(): boolean {
    return this.isCustomEntity;
  }

  public isSystemManaged(): boolean {
    return this.isManaged;
  }

  public getLogicalName(): EntityLogicalName {
    return this.logicalName;
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public getAttributes(): readonly AttributeMetadata[] {
    return this.attributes;
  }

  public getKeys(): readonly KeyMetadata[] {
    return this.keys;
  }

  public getRelationships(): readonly RelationshipMetadata[] {
    return this.relationships;
  }

  public getPrivileges(): readonly PrivilegeMetadata[] {
    return this.privileges;
  }

  public getPrimaryIdAttribute(): string {
    return this.primaryIdAttribute;
  }

  public getPrimaryNameAttribute(): string {
    return this.primaryNameAttribute;
  }

  public matchesSearchTerm(searchTerm: string): boolean {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return this.logicalName.toLowerCase().includes(lowerSearchTerm) ||
           this.displayName.toLowerCase().includes(lowerSearchTerm);
  }

  public matchesFilter(filter: FilterOptions): boolean {
    return filter.matchesOrigin(this.isCustomEntity) &&
           filter.matchesManagement(this.isManaged);
  }

  public getMakerUrl(baseUrl: string): string {
    return `${baseUrl}/main.aspx?pagetype=entityrecord&etn=${this.logicalName}`;
  }
}
```

### AttributeMetadata

```typescript
// domain/entities/AttributeMetadata.ts
export class AttributeMetadata {
  constructor(
    private readonly logicalName: string,
    private readonly displayName: string,
    private readonly attributeType: AttributeType,
    private readonly isCustomAttribute: boolean,
    private readonly isManaged: boolean,
    private readonly isPrimaryId: boolean,
    private readonly isPrimaryName: boolean,
    private readonly isRequired: boolean,
    private readonly isReadOnly: boolean,
    private readonly description?: string
  ) {}

  public static create(
    logicalName: string,
    displayName: string,
    attributeType: string,
    isCustomAttribute: boolean,
    isManaged: boolean,
    isPrimaryId: boolean,
    isPrimaryName: boolean,
    isRequired: boolean,
    isReadOnly: boolean,
    description?: string
  ): AttributeMetadata {
    if (!isAttributeType(attributeType)) {
      throw new Error(`Invalid attribute type: ${attributeType}`);
    }

    if (logicalName.trim() === '') {
      throw new Error('Attribute logical name cannot be empty');
    }

    if (displayName.trim() === '') {
      throw new Error('Attribute display name cannot be empty');
    }

    return new AttributeMetadata(
      logicalName,
      displayName,
      attributeType,
      isCustomAttribute,
      isManaged,
      isPrimaryId,
      isPrimaryName,
      isRequired,
      isReadOnly,
      description
    );
  }

  public getLogicalName(): string {
    return this.logicalName;
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public getAttributeType(): AttributeType {
    return this.attributeType;
  }

  public isCustom(): boolean {
    return this.isCustomAttribute;
  }

  public isSystemManaged(): boolean {
    return this.isManaged;
  }

  public isPrimary(): boolean {
    return this.isPrimaryId || this.isPrimaryName;
  }

  public isRequiredField(): boolean {
    return this.isRequired;
  }

  public isReadOnlyField(): boolean {
    return this.isReadOnly;
  }

  public getDescription(): string | undefined {
    return this.description;
  }
}
```

### RelationshipMetadata

```typescript
// domain/entities/RelationshipMetadata.ts
export class RelationshipMetadata {
  constructor(
    private readonly schemaName: string,
    private readonly relationshipType: RelationshipType,
    private readonly referencedEntity: EntityLogicalName,
    private readonly referencingEntity: EntityLogicalName,
    private readonly referencedAttribute: string,
    private readonly referencingAttribute: string
  ) {}

  public static create(
    schemaName: string,
    relationshipType: string,
    referencedEntity: EntityLogicalName,
    referencingEntity: EntityLogicalName,
    referencedAttribute: string,
    referencingAttribute: string
  ): RelationshipMetadata {
    if (!isRelationshipType(relationshipType)) {
      throw new Error(`Invalid relationship type: ${relationshipType}`);
    }

    if (schemaName.trim() === '') {
      throw new Error('Relationship schema name cannot be empty');
    }

    return new RelationshipMetadata(
      schemaName,
      relationshipType,
      referencedEntity,
      referencingEntity,
      referencedAttribute,
      referencingAttribute
    );
  }

  public getSchemaName(): string {
    return this.schemaName;
  }

  public getRelationshipType(): RelationshipType {
    return this.relationshipType;
  }

  public isOneToMany(): boolean {
    return this.relationshipType === 'OneToMany';
  }

  public isManyToOne(): boolean {
    return this.relationshipType === 'ManyToOne';
  }

  public isManyToMany(): boolean {
    return this.relationshipType === 'ManyToMany';
  }

  public getReferencedEntity(): EntityLogicalName {
    return this.referencedEntity;
  }

  public getReferencingEntity(): EntityLogicalName {
    return this.referencingEntity;
  }

  public getReferencedAttribute(): string {
    return this.referencedAttribute;
  }

  public getReferencingAttribute(): string {
    return this.referencingAttribute;
  }

  public getRelatedEntityName(fromEntity: EntityLogicalName): EntityLogicalName {
    return fromEntity === this.referencedEntity
      ? this.referencingEntity
      : this.referencedEntity;
  }
}
```

### ChoiceMetadata

```typescript
// domain/entities/ChoiceMetadata.ts
export class ChoiceMetadata {
  constructor(
    private readonly logicalName: string,
    private readonly displayName: string,
    private readonly isCustom: boolean,
    private readonly isManaged: boolean,
    private readonly options: readonly ChoiceOption[]
  ) {}

  public static create(
    logicalName: string,
    displayName: string,
    isCustom: boolean,
    isManaged: boolean,
    options: readonly ChoiceOption[]
  ): ChoiceMetadata {
    if (logicalName.trim() === '') {
      throw new Error('Choice logical name cannot be empty');
    }

    if (displayName.trim() === '') {
      throw new Error('Choice display name cannot be empty');
    }

    return new ChoiceMetadata(
      logicalName,
      displayName,
      isCustom,
      isManaged,
      options
    );
  }

  public getLogicalName(): string {
    return this.logicalName;
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public isCustomChoice(): boolean {
    return this.isCustom;
  }

  public isSystemManaged(): boolean {
    return this.isManaged;
  }

  public getOptions(): readonly ChoiceOption[] {
    return this.options;
  }

  public matchesSearchTerm(searchTerm: string): boolean {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return this.logicalName.toLowerCase().includes(lowerSearchTerm) ||
           this.displayName.toLowerCase().includes(lowerSearchTerm);
  }
}
```

---

## Domain Layer - Repository Interfaces

```typescript
// domain/repositories/IMetadataRepository.ts
export interface IMetadataRepository {
  findAllEntities(): Promise<readonly EntityMetadata[]>;
  findEntityByLogicalName(logicalName: EntityLogicalName): Promise<EntityMetadata | null>;
  findAllChoices(): Promise<readonly ChoiceMetadata[]>;
  findChoiceByLogicalName(logicalName: string): Promise<ChoiceMetadata | null>;
}

// domain/repositories/IFilterPreferencesRepository.ts
export interface IFilterPreferencesRepository {
  saveFilterPreferences(
    environmentId: EnvironmentId,
    filterOptions: FilterOptions
  ): Promise<void>;

  loadFilterPreferences(
    environmentId: EnvironmentId
  ): Promise<FilterOptions | null>;
}
```

---

## Application Layer - Use Cases

```typescript
// application/useCases/ListEntitiesUseCase.ts
export class ListEntitiesUseCase {
  constructor(
    private readonly metadataRepository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(): Promise<readonly EntityMetadata[]> {
    this.logger.info('ListEntitiesUseCase started');
    const entities = await this.metadataRepository.findAllEntities();
    this.logger.info('ListEntitiesUseCase completed', { count: entities.length });
    return entities;
  }
}

// application/useCases/GetEntityDetailsUseCase.ts
export class GetEntityDetailsUseCase {
  constructor(
    private readonly metadataRepository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(logicalName: EntityLogicalName): Promise<EntityMetadata | null> {
    this.logger.info('GetEntityDetailsUseCase started', { logicalName });
    const entity = await this.metadataRepository.findEntityByLogicalName(logicalName);
    this.logger.info('GetEntityDetailsUseCase completed');
    return entity;
  }
}

// application/useCases/SearchMetadataUseCase.ts
export class SearchMetadataUseCase {
  constructor(
    private readonly metadataRepository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(
    searchTerm: string,
    filterOptions: FilterOptions
  ): Promise<readonly EntityMetadata[]> {
    this.logger.info('SearchMetadataUseCase started', { searchTerm });

    const allEntities = await this.metadataRepository.findAllEntities();

    const filtered = allEntities.filter(entity =>
      entity.matchesSearchTerm(searchTerm) && entity.matchesFilter(filterOptions)
    );

    this.logger.info('SearchMetadataUseCase completed', { resultCount: filtered.length });
    return filtered;
  }
}

// application/useCases/SaveFilterPreferencesUseCase.ts
export class SaveFilterPreferencesUseCase {
  constructor(
    private readonly filterPreferencesRepository: IFilterPreferencesRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(
    environmentId: EnvironmentId,
    filterOptions: FilterOptions
  ): Promise<void> {
    this.logger.info('SaveFilterPreferencesUseCase started');
    await this.filterPreferencesRepository.saveFilterPreferences(environmentId, filterOptions);
    this.logger.info('SaveFilterPreferencesUseCase completed');
  }
}

// application/useCases/LoadFilterPreferencesUseCase.ts
export class LoadFilterPreferencesUseCase {
  constructor(
    private readonly filterPreferencesRepository: IFilterPreferencesRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(environmentId: EnvironmentId): Promise<FilterOptions> {
    this.logger.info('LoadFilterPreferencesUseCase started');
    const preferences = await this.filterPreferencesRepository.loadFilterPreferences(environmentId);
    this.logger.info('LoadFilterPreferencesUseCase completed');
    return preferences ?? FilterOptions.default();
  }
}
```

---

## Application Layer - ViewModels

```typescript
// application/viewModels/EntityViewModel.ts
export type EntityIcon = '🏷️' | '📋';

export interface EntityViewModel {
  readonly logicalName: string;
  readonly displayName: string;
  readonly isCustom: boolean;
  readonly isManaged: boolean;
  readonly icon: EntityIcon;
}

// application/viewModels/AttributeViewModel.ts
export interface AttributeViewModel {
  readonly logicalName: string;
  readonly displayName: string;
  readonly attributeType: AttributeType;
  readonly isCustom: boolean;
  readonly isRequired: boolean;
  readonly isReadOnly: boolean;
  readonly isPrimary: boolean;
}

// application/viewModels/RelationshipViewModel.ts
export interface RelationshipViewModel {
  readonly schemaName: string;
  readonly relationshipType: RelationshipType;
  readonly relatedEntity: string;
  readonly relatedAttribute: string;
}

// application/viewModels/KeyViewModel.ts
export interface KeyViewModel {
  readonly logicalName: string;
  readonly displayName: string;
  readonly keyAttributes: readonly string[];
}

// application/viewModels/PrivilegeViewModel.ts
export interface PrivilegeViewModel {
  readonly privilegeId: string;
  readonly name: string;
}

// application/viewModels/ChoiceViewModel.ts
export interface ChoiceViewModel {
  readonly logicalName: string;
  readonly displayName: string;
  readonly isCustom: boolean;
}

// application/viewModels/ChoiceOptionViewModel.ts
export interface ChoiceOptionViewModel {
  readonly value: number;
  readonly label: string;
}
```

---

## Type Safety Summary

### Critical Fixes Applied
- ✅ Union types for `AttributeType` and `RelationshipType`
- ✅ Branded types for `EntityLogicalName` and `EnvironmentId`
- ✅ Type guards for runtime validation
- ✅ `ChoiceOption` converted to value object class
- ✅ `FilterOptions` refactored to discriminated unions
- ✅ Consistent null/undefined semantics
- ✅ Validation in factory methods

### Null/Undefined Convention
- **`null`**: "Not found" from external systems (repository queries)
- **`undefined`**: Optional properties or parameters

### Type Safety Features
- Readonly arrays throughout
- Explicit return types on all public methods
- Private constructors with static factory methods
- Immutable value objects
- Exhaustive switch checks enabled by union types

### Ready for Implementation
All type contracts reviewed and approved. No blocking issues. Proceed with implementation starting from domain layer.
