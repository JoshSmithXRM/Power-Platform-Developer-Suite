# Metadata Browser - Technical Design

**Status:** Draft
**Date:** 2025-11-08
**Complexity:** Complex

---

## Overview

**User Problem:** Developers need to quickly browse and inspect Dataverse entity metadata (entities, attributes, relationships, keys, privileges, global option sets) without leaving VS Code or navigating to the Power Apps Maker portal.

**Solution:** A three-panel layout providing (1) tree navigation for entities/choices, (2) tabbed tables showing attributes/relationships/keys/privileges, and (3) a detail panel for viewing full metadata properties when clicking on specific items.

**Value:** Eliminates context switching, accelerates development workflows, and provides instant access to metadata critical for plugin development, custom APIs, and data modeling.

---

## Requirements

### Functional Requirements
- [ ] Display hierarchical tree of all entities and global option sets in left panel
- [ ] Show entity metadata in tabbed tables (Attributes, Relationships, Keys, Privileges)
- [ ] Display detail information for selected metadata item in right panel
- [ ] Support environment switching (metadata is environment-specific)
- [ ] Support search/filter in entity tree
- [ ] Preserve selected entity when refreshing
- [ ] Support both system entities and custom entities with visual distinction
- [ ] Handle loading states gracefully (tree, tables, detail panel)

### Non-Functional Requirements
- [ ] Performance: Load entity tree in < 3 seconds for environments with 1000+ entities
- [ ] Performance: Switch tabs client-side (no backend call)
- [ ] Performance: Load entity metadata (attributes/relationships) in < 2 seconds
- [ ] UX: Preserve scroll position when switching between entity details
- [ ] UX: Show visual feedback during async operations (loading spinners)
- [ ] Compatibility: Works across all supported Dataverse regions

### Success Criteria
- [ ] User can browse all entities in selected environment
- [ ] User can view attributes, relationships, keys, and privileges for any entity
- [ ] User can see detailed information for specific metadata items
- [ ] User can search/filter entities by name
- [ ] Panel maintains state (selected entity, active tab) during session
- [ ] System handles large metadata sets (1000+ entities, 500+ attributes per entity)

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can view entity tree and basic attributes"
**Goal:** Prove entire stack with simplest end-to-end functionality

**Domain:**
- `EntityMetadata` entity (minimal: logicalName, displayName, isCustomEntity)
- `AttributeMetadata` entity (minimal: logicalName, displayName, attributeType)
- `IEntityMetadataRepository` interface (single method: `getAllEntities()`)

**Application:**
- `LoadEntityTreeUseCase` - Fetch all entities
- `LoadEntityAttributesUseCase` - Fetch attributes for one entity
- `EntityTreeItemViewModel` (minimal: id, label, isCustom)
- `EntityAttributeViewModel` (minimal: logicalName, displayName, type)

**Infrastructure:**
- `DataverseEntityMetadataRepository` - Implements repository interface
- Fetch entities via Dataverse Web API: `GET /api/data/v9.2/EntityDefinitions`
- Fetch attributes via: `GET /api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes`

**Presentation:**
- `MetadataBrowserPanel` with PanelCoordinator
- `MetadataTreeSection` (left panel)
- `MetadataAttributeTableSection` (middle panel, single tab)
- Three-panel layout template in `SectionCompositionBehavior`
- Client-side tree renderer (JS)
- Client-side table renderer (reuse existing DataTableSection patterns)

**Result:** WORKING FEATURE ✅ User can browse entity tree and view attributes table

---

### Slice 2: "User can view relationships, keys, and privileges"
**Builds on:** Slice 1

**Domain:**
- `RelationshipMetadata` entity (fields: schemaName, relatedEntity, relationshipType)
- `KeyMetadata` entity (fields: logicalName, keyAttributes)
- `PrivilegeMetadata` entity (fields: name, privilegeType)
- Expand `IEntityMetadataRepository` (add methods for relationships/keys/privileges)

**Application:**
- `LoadEntityRelationshipsUseCase`
- `LoadEntityKeysUseCase`
- `LoadEntityPrivilegesUseCase`
- ViewModels: `EntityRelationshipViewModel`, `EntityKeyViewModel`, `EntityPrivilegeViewModel`

**Infrastructure:**
- Add repository methods:
  - `getRelationships(logicalName)`
  - `getKeys(logicalName)`
  - `getPrivileges(logicalName)`
- API calls to fetch relationships/keys/privileges

**Presentation:**
- Add tabs to middle panel (Attributes | Relationships | Keys | Privileges)
- Client-side tab switching (no backend calls)
- Sections: `MetadataRelationshipTableSection`, `MetadataKeyTableSection`, `MetadataPrivilegeTableSection`

**Result:** ENHANCED FEATURE ✅ User can view all entity metadata types

---

### Slice 3: "User can view detailed metadata in right panel"
**Builds on:** Slice 2

**Domain:**
- Expand entities with full properties:
  - `AttributeMetadata`: Add all properties (isRequired, maxLength, format, etc.)
  - `RelationshipMetadata`: Add all properties (cascadeConfiguration, etc.)
  - `KeyMetadata`: Add all properties
  - `PrivilegeMetadata`: Add all properties

**Application:**
- ViewModels for detail panels:
  - `AttributeDetailViewModel`
  - `RelationshipDetailViewModel`
  - `KeyDetailViewModel`
  - `PrivilegeDetailViewModel`

**Presentation:**
- `MetadataDetailSection` (right panel)
- Commands: `viewAttributeDetail`, `viewRelationshipDetail`, etc.
- Client-side detail renderer
- Show/hide detail panel dynamically

**Result:** ENHANCED FEATURE ✅ User can drill into metadata details

---

### Slice 4: "User can view global option sets"
**Builds on:** Slice 3

**Domain:**
- `GlobalOptionSetMetadata` entity
- `OptionMetadata` entity (for option values)
- Expand `IEntityMetadataRepository.getAllEntities()` to include global option sets

**Application:**
- `LoadGlobalOptionSetsUseCase`
- `GlobalOptionSetViewModel`
- `OptionValueViewModel`

**Infrastructure:**
- API call: `GET /api/data/v9.2/GlobalOptionSetDefinitions`

**Presentation:**
- Update tree to show "Global Option Sets" node
- Add table for option values
- Detail panel for option set metadata

**Result:** ENHANCED FEATURE ✅ User can browse global option sets

---

### Slice 5: "User can search/filter entities and persist state"
**Builds on:** Slice 4

**Domain:**
- `EntityTreeFilter` value object (search text, filter flags)

**Application:**
- Expand `LoadEntityTreeUseCase` to accept filter
- State persistence in `IPanelStateRepository`

**Infrastructure:**
- No changes (filtering is in-memory on frontend)

**Presentation:**
- Add search input to tree header
- Client-side filtering (instant feedback)
- Persist: selected entity, active tab, detail panel state

**Result:** ENHANCED FEATURE ✅ User can find entities quickly and maintain context

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - MetadataBrowserPanel (PanelCoordinator)                  │
│ - Sections: Tree, Tables (tabs), Detail                    │
│ - Client-side renderers (JS)                               │
│ - NO business logic                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - Use cases orchestrate (LoadEntityTree, LoadAttributes)   │
│ - ViewModels are DTOs (no behavior)                        │
│ - Mappers transform domain → ViewModel                     │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - Rich entities: EntityMetadata, AttributeMetadata, etc.   │
│ - Business rules (isSystemEntity, isCustom, isRequired)    │
│ - Repository interfaces (IEntityMetadataRepository)        │
│ - ZERO external dependencies                               │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - DataverseEntityMetadataRepository                        │
│ - Dataverse Web API integration                            │
│ - DTO → Domain mapping                                     │
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
/**
 * Represents Dataverse entity metadata.
 *
 * Business Rules:
 * - System entities (out-of-box) cannot be deleted
 * - Custom entities have 'new_' prefix or publisher prefix
 * - Entity logical name is immutable
 * - Entity can have 0 to N attributes, relationships, keys, privileges
 *
 * Rich behavior (NOT anemic):
 * - isSystemEntity(): boolean
 * - isCustomEntity(): boolean
 * - hasAttributes(): boolean
 * - getAttributeCount(): number
 */
export class EntityMetadata {
  constructor(
    private readonly logicalName: LogicalName,
    private readonly schemaName: SchemaName,
    private readonly displayName: DisplayName,
    private readonly pluralName: DisplayName,
    private readonly description: string | null,
    private readonly entitySetName: string,
    private readonly isCustomEntity: boolean,
    private readonly objectTypeCode: number | null,
    private readonly primaryIdAttribute: string | null,
    private readonly primaryNameAttribute: string | null,
    private readonly ownershipType: OwnershipType,
    private readonly attributes: readonly AttributeMetadata[]
  ) {
    this.validateInvariants();
  }

  /**
   * Validates business rules on construction.
   */
  private validateInvariants(): void {
    if (this.attributes.some(attr => attr.getEntityLogicalName().getValue() !== this.logicalName.getValue())) {
      throw new Error('All attributes must belong to this entity');
    }
  }

  /**
   * Business rule: System entities are created by Microsoft (not custom)
   */
  public isSystemEntity(): boolean {
    return !this.isCustomEntity;
  }

  /**
   * Business rule: Check if entity has attributes
   */
  public hasAttributes(): boolean {
    return this.attributes.length > 0;
  }

  /**
   * Get number of attributes
   */
  public getAttributeCount(): number {
    return this.attributes.length;
  }

  /**
   * Get attributes filtered by type
   */
  public getAttributesByType(type: AttributeType): readonly AttributeMetadata[] {
    return this.attributes.filter(attr => attr.getType().equals(type));
  }

  // Getters (NO business logic in getters)
  public getLogicalName(): LogicalName { return this.logicalName; }
  public getSchemaName(): SchemaName { return this.schemaName; }
  public getDisplayName(): DisplayName { return this.displayName; }
  public getPluralName(): DisplayName { return this.pluralName; }
  public getDescription(): string | null { return this.description; }
  public getEntitySetName(): string { return this.entitySetName; }
  public getIsCustomEntity(): boolean { return this.isCustomEntity; }
  public getObjectTypeCode(): number | null { return this.objectTypeCode; }
  public getPrimaryIdAttribute(): string | null { return this.primaryIdAttribute; }
  public getPrimaryNameAttribute(): string | null { return this.primaryNameAttribute; }
  public getOwnershipType(): OwnershipType { return this.ownershipType; }
  public getAttributes(): readonly AttributeMetadata[] { return this.attributes; }
}

/**
 * Represents entity attribute metadata.
 *
 * Business Rules:
 * - System attributes (created by platform) cannot be deleted
 * - Custom attributes have 'new_' prefix or publisher prefix
 * - Required attributes cannot have null values in records
 * - String attributes have max length constraint
 * - Lookup attributes reference another entity
 *
 * Rich behavior:
 * - isSystemAttribute(): boolean
 * - isCustomAttribute(): boolean
 * - isRequired(): boolean
 * - isLookup(): boolean
 * - hasMaxLength(): boolean
 */
export class AttributeMetadata {
  constructor(
    private readonly logicalName: LogicalName,
    private readonly schemaName: SchemaName,
    private readonly displayName: DisplayName,
    private readonly description: string | null,
    private readonly attributeType: AttributeType,
    private readonly isCustomAttribute: boolean,
    private readonly isRequiredLevel: RequiredLevel,
    private readonly entityLogicalName: LogicalName,
    private readonly maxLength: number | null,
    private readonly format: string | null,
    private readonly lookupTargetEntity: LogicalName | null,
    private readonly optionSetName: string | null
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    // Business rule: String attributes with maxLength must have positive value
    if (this.maxLength !== null && this.maxLength <= 0) {
      throw new Error('Max length must be positive');
    }

    // Business rule: Lookup attributes must have target entity
    if (this.attributeType.isLookup() && !this.lookupTargetEntity) {
      throw new Error('Lookup attributes must have target entity');
    }

    // Business rule: Picklist/MultiSelectPicklist must have option set
    if (this.attributeType.isOptionSet() && !this.optionSetName) {
      throw new Error('Option set attributes must have option set name');
    }
  }

  /**
   * Business rule: System attributes created by platform
   */
  public isSystemAttribute(): boolean {
    return !this.isCustomAttribute;
  }

  /**
   * Business rule: Required attributes cannot be null in records
   */
  public isRequired(): boolean {
    return this.isRequiredLevel.isRequired();
  }

  /**
   * Business rule: Check if attribute is a lookup
   */
  public isLookup(): boolean {
    return this.attributeType.isLookup();
  }

  /**
   * Business rule: Check if attribute has max length constraint
   */
  public hasMaxLength(): boolean {
    return this.maxLength !== null;
  }

  /**
   * Get formatted type display
   */
  public getTypeDisplay(): string {
    if (this.isLookup() && this.lookupTargetEntity) {
      return `Lookup (${this.lookupTargetEntity.getValue()})`;
    }
    return this.attributeType.getDisplayName();
  }

  // Getters
  public getLogicalName(): LogicalName { return this.logicalName; }
  public getSchemaName(): SchemaName { return this.schemaName; }
  public getDisplayName(): DisplayName { return this.displayName; }
  public getDescription(): string | null { return this.description; }
  public getType(): AttributeType { return this.attributeType; }
  public getIsCustomAttribute(): boolean { return this.isCustomAttribute; }
  public getRequiredLevel(): RequiredLevel { return this.isRequiredLevel; }
  public getEntityLogicalName(): LogicalName { return this.entityLogicalName; }
  public getMaxLength(): number | null { return this.maxLength; }
  public getFormat(): string | null { return this.format; }
  public getLookupTargetEntity(): LogicalName | null { return this.lookupTargetEntity; }
  public getOptionSetName(): string | null { return this.optionSetName; }
}

/**
 * Represents entity relationship metadata.
 *
 * Business Rules:
 * - Relationship must have valid referenced and referencing entities
 * - Relationship type determines cardinality (OneToMany, ManyToOne, ManyToMany)
 * - Cascade configuration determines behavior on parent delete/update
 *
 * Rich behavior:
 * - isOneToMany(): boolean
 * - isManyToOne(): boolean
 * - isManyToMany(): boolean
 * - getCascadeDeleteBehavior(): CascadeBehavior
 */
export class RelationshipMetadata {
  constructor(
    private readonly schemaName: SchemaName,
    private readonly relationshipType: RelationshipType,
    private readonly referencedEntity: LogicalName,
    private readonly referencedAttribute: LogicalName,
    private readonly referencingEntity: LogicalName,
    private readonly referencingAttribute: LogicalName,
    private readonly cascadeConfiguration: CascadeConfiguration
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    // Business rule: Referenced and referencing entities must be different for hierarchical
    if (this.relationshipType.isHierarchical()) {
      if (this.referencedEntity.equals(this.referencingEntity)) {
        throw new Error('Hierarchical relationships must reference different entities');
      }
    }
  }

  /**
   * Business rule: Check if relationship is one-to-many
   */
  public isOneToMany(): boolean {
    return this.relationshipType.isOneToMany();
  }

  /**
   * Business rule: Check if relationship is many-to-one
   */
  public isManyToOne(): boolean {
    return this.relationshipType.isManyToOne();
  }

  /**
   * Business rule: Check if relationship is many-to-many
   */
  public isManyToMany(): boolean {
    return this.relationshipType.isManyToMany();
  }

  /**
   * Get cascade delete behavior
   */
  public getCascadeDeleteBehavior(): CascadeBehavior {
    return this.cascadeConfiguration.getDeleteBehavior();
  }

  /**
   * Get display representation of relationship
   */
  public getRelationshipDisplay(): string {
    const type = this.relationshipType.getDisplayName();
    return `${this.referencedEntity.getValue()} → ${this.referencingEntity.getValue()} (${type})`;
  }

  // Getters
  public getSchemaName(): SchemaName { return this.schemaName; }
  public getRelationshipType(): RelationshipType { return this.relationshipType; }
  public getReferencedEntity(): LogicalName { return this.referencedEntity; }
  public getReferencedAttribute(): LogicalName { return this.referencedAttribute; }
  public getReferencingEntity(): LogicalName { return this.referencingEntity; }
  public getReferencingAttribute(): LogicalName { return this.referencingAttribute; }
  public getCascadeConfiguration(): CascadeConfiguration { return this.cascadeConfiguration; }
}

/**
 * Represents entity key metadata.
 *
 * Business Rules:
 * - Alternate keys must have at least one attribute
 * - Key attributes must belong to the entity
 * - Keys enforce uniqueness constraints
 *
 * Rich behavior:
 * - hasMultipleAttributes(): boolean
 * - getAttributeCount(): number
 */
export class KeyMetadata {
  constructor(
    private readonly logicalName: LogicalName,
    private readonly displayName: DisplayName,
    private readonly entityLogicalName: LogicalName,
    private readonly keyAttributes: readonly LogicalName[]
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (this.keyAttributes.length === 0) {
      throw new Error('Key must have at least one attribute');
    }
  }

  /**
   * Business rule: Check if key uses multiple attributes
   */
  public hasMultipleAttributes(): boolean {
    return this.keyAttributes.length > 1;
  }

  /**
   * Get number of attributes in key
   */
  public getAttributeCount(): number {
    return this.keyAttributes.length;
  }

  /**
   * Get formatted attribute list
   */
  public getAttributeListDisplay(): string {
    return this.keyAttributes.map(attr => attr.getValue()).join(', ');
  }

  // Getters
  public getLogicalName(): LogicalName { return this.logicalName; }
  public getDisplayName(): DisplayName { return this.displayName; }
  public getEntityLogicalName(): LogicalName { return this.entityLogicalName; }
  public getKeyAttributes(): readonly LogicalName[] { return this.keyAttributes; }
}

/**
 * Represents entity privilege metadata.
 *
 * Business Rules:
 * - Privileges define security permissions for entity operations
 * - Privilege types: Create, Read, Write, Delete, Append, AppendTo, Assign, Share
 *
 * Rich behavior:
 * - isCreatePrivilege(): boolean
 * - isReadPrivilege(): boolean
 * - etc.
 */
export class PrivilegeMetadata {
  constructor(
    private readonly privilegeId: string,
    private readonly name: string,
    private readonly privilegeType: PrivilegeType,
    private readonly canBeBasic: boolean,
    private readonly canBeLocal: boolean,
    private readonly canBeDeep: boolean,
    private readonly canBeGlobal: boolean
  ) {}

  /**
   * Business rule: Check if privilege is Create
   */
  public isCreatePrivilege(): boolean {
    return this.privilegeType.isCreate();
  }

  /**
   * Business rule: Check if privilege is Read
   */
  public isReadPrivilege(): boolean {
    return this.privilegeType.isRead();
  }

  /**
   * Get available depth levels
   */
  public getAvailableDepths(): string[] {
    const depths: string[] = [];
    if (this.canBeBasic) depths.push('Basic');
    if (this.canBeLocal) depths.push('Local');
    if (this.canBeDeep) depths.push('Deep');
    if (this.canBeGlobal) depths.push('Global');
    return depths;
  }

  // Getters
  public getPrivilegeId(): string { return this.privilegeId; }
  public getName(): string { return this.name; }
  public getPrivilegeType(): PrivilegeType { return this.privilegeType; }
  public getCanBeBasic(): boolean { return this.canBeBasic; }
  public getCanBeLocal(): boolean { return this.canBeLocal; }
  public getCanBeDeep(): boolean { return this.canBeDeep; }
  public getCanBeGlobal(): boolean { return this.canBeGlobal; }
}

/**
 * Represents global option set metadata.
 *
 * Business Rules:
 * - Global option sets are reusable across multiple entities
 * - Option values must have unique integer values
 * - Option labels are localizable
 *
 * Rich behavior:
 * - hasOptions(): boolean
 * - getOptionCount(): number
 * - findOptionByValue(value): OptionMetadata | null
 */
export class GlobalOptionSetMetadata {
  constructor(
    private readonly name: string,
    private readonly displayName: DisplayName,
    private readonly description: string | null,
    private readonly isCustom: boolean,
    private readonly options: readonly OptionMetadata[]
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    // Business rule: Option values must be unique
    const values = this.options.map(opt => opt.getValue());
    const uniqueValues = new Set(values);
    if (values.length !== uniqueValues.size) {
      throw new Error('Option values must be unique');
    }
  }

  /**
   * Business rule: Check if option set has options
   */
  public hasOptions(): boolean {
    return this.options.length > 0;
  }

  /**
   * Get number of options
   */
  public getOptionCount(): number {
    return this.options.length;
  }

  /**
   * Find option by value
   */
  public findOptionByValue(value: number): OptionMetadata | null {
    return this.options.find(opt => opt.getValue() === value) || null;
  }

  // Getters
  public getName(): string { return this.name; }
  public getDisplayName(): DisplayName { return this.displayName; }
  public getDescription(): string | null { return this.description; }
  public getIsCustom(): boolean { return this.isCustom; }
  public getOptions(): readonly OptionMetadata[] { return this.options; }
}

/**
 * Represents option metadata (option set value).
 *
 * Rich behavior:
 * - None (simple value object)
 */
export class OptionMetadata {
  constructor(
    private readonly value: number,
    private readonly label: string,
    private readonly description: string | null
  ) {}

  // Getters
  public getValue(): number { return this.value; }
  public getLabel(): string { return this.label; }
  public getDescription(): string | null { return this.description; }
}
```

#### Value Objects

```typescript
/**
 * Value object for entity/attribute logical name.
 * Immutable, validated on construction.
 */
export class LogicalName {
  private constructor(private readonly value: string) {}

  public static create(value: string): LogicalName {
    if (!value || value.trim().length === 0) {
      throw new Error('Logical name cannot be empty');
    }

    // Business rule: Logical names are lowercase, no spaces
    if (value !== value.toLowerCase() || value.includes(' ')) {
      throw new Error('Logical name must be lowercase with no spaces');
    }

    return new LogicalName(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: LogicalName): boolean {
    return this.value === other.value;
  }
}

/**
 * Value object for schema name.
 * Immutable, validated on construction.
 */
export class SchemaName {
  private constructor(private readonly value: string) {}

  public static create(value: string): SchemaName {
    if (!value || value.trim().length === 0) {
      throw new Error('Schema name cannot be empty');
    }

    return new SchemaName(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: SchemaName): boolean {
    return this.value === other.value;
  }
}

/**
 * Value object for display name.
 * Immutable, validated on construction.
 */
export class DisplayName {
  private constructor(private readonly value: string) {}

  public static create(value: string): DisplayName {
    if (!value || value.trim().length === 0) {
      throw new Error('Display name cannot be empty');
    }

    return new DisplayName(value);
  }

  public getValue(): string {
    return this.value;
  }
}

/**
 * Value object for attribute type.
 * Represents the data type of an attribute.
 */
export class AttributeType {
  private static readonly LOOKUP_TYPES = ['Lookup', 'Customer', 'Owner'];
  private static readonly OPTION_SET_TYPES = ['Picklist', 'MultiSelectPicklist', 'Status', 'State'];

  private constructor(private readonly value: string) {}

  public static create(value: string): AttributeType {
    if (!value || value.trim().length === 0) {
      throw new Error('Attribute type cannot be empty');
    }

    return new AttributeType(value);
  }

  /**
   * Business rule: Check if attribute is a lookup type
   */
  public isLookup(): boolean {
    return AttributeType.LOOKUP_TYPES.includes(this.value);
  }

  /**
   * Business rule: Check if attribute is an option set type
   */
  public isOptionSet(): boolean {
    return AttributeType.OPTION_SET_TYPES.includes(this.value);
  }

  public getValue(): string {
    return this.value;
  }

  public getDisplayName(): string {
    return this.value;
  }

  public equals(other: AttributeType): boolean {
    return this.value === other.value;
  }
}

/**
 * Value object for required level.
 * Determines if an attribute is required in records.
 */
export class RequiredLevel {
  private static readonly REQUIRED_VALUES = ['ApplicationRequired', 'SystemRequired'];

  private constructor(private readonly value: string) {}

  public static create(value: string): RequiredLevel {
    return new RequiredLevel(value);
  }

  /**
   * Business rule: Check if attribute is required
   */
  public isRequired(): boolean {
    return RequiredLevel.REQUIRED_VALUES.includes(this.value);
  }

  public getValue(): string {
    return this.value;
  }

  public getDisplayName(): string {
    if (this.value === 'ApplicationRequired') return 'Business Required';
    if (this.value === 'SystemRequired') return 'System Required';
    if (this.value === 'Recommended') return 'Business Recommended';
    return 'Optional';
  }
}

/**
 * Value object for ownership type.
 */
export enum OwnershipType {
  UserOwned = 'UserOwned',
  TeamOwned = 'TeamOwned',
  OrganizationOwned = 'OrganizationOwned',
  None = 'None'
}

/**
 * Value object for relationship type.
 */
export class RelationshipType {
  private constructor(private readonly value: string) {}

  public static create(value: string): RelationshipType {
    return new RelationshipType(value);
  }

  public isOneToMany(): boolean {
    return this.value === 'OneToManyRelationship';
  }

  public isManyToOne(): boolean {
    return this.value === 'ManyToOneRelationship';
  }

  public isManyToMany(): boolean {
    return this.value === 'ManyToManyRelationship';
  }

  public isHierarchical(): boolean {
    return this.value === 'OneToManyRelationship' || this.value === 'ManyToOneRelationship';
  }

  public getValue(): string {
    return this.value;
  }

  public getDisplayName(): string {
    if (this.isOneToMany()) return '1:N';
    if (this.isManyToOne()) return 'N:1';
    if (this.isManyToMany()) return 'N:N';
    return this.value;
  }
}

/**
 * Value object for cascade configuration.
 */
export class CascadeConfiguration {
  constructor(
    private readonly deleteBehavior: CascadeBehavior,
    private readonly assignBehavior: CascadeBehavior,
    private readonly shareBehavior: CascadeBehavior,
    private readonly unshareBehavior: CascadeBehavior,
    private readonly reparentBehavior: CascadeBehavior,
    private readonly mergeBehavior: CascadeBehavior
  ) {}

  public getDeleteBehavior(): CascadeBehavior {
    return this.deleteBehavior;
  }

  public getAssignBehavior(): CascadeBehavior {
    return this.assignBehavior;
  }

  public getShareBehavior(): CascadeBehavior {
    return this.shareBehavior;
  }

  public getUnshareBehavior(): CascadeBehavior {
    return this.unshareBehavior;
  }

  public getReparentBehavior(): CascadeBehavior {
    return this.reparentBehavior;
  }

  public getMergeBehavior(): CascadeBehavior {
    return this.mergeBehavior;
  }
}

/**
 * Value object for cascade behavior.
 */
export enum CascadeBehavior {
  Cascade = 'Cascade',
  Active = 'Active',
  UserOwned = 'UserOwned',
  RemoveLink = 'RemoveLink',
  Restrict = 'Restrict',
  NoCascade = 'NoCascade'
}

/**
 * Value object for privilege type.
 */
export class PrivilegeType {
  private constructor(private readonly value: string) {}

  public static create(value: string): PrivilegeType {
    return new PrivilegeType(value);
  }

  public isCreate(): boolean {
    return this.value === 'Create';
  }

  public isRead(): boolean {
    return this.value === 'Read';
  }

  public isWrite(): boolean {
    return this.value === 'Write';
  }

  public isDelete(): boolean {
    return this.value === 'Delete';
  }

  public isAppend(): boolean {
    return this.value === 'Append';
  }

  public isAppendTo(): boolean {
    return this.value === 'AppendTo';
  }

  public isAssign(): boolean {
    return this.value === 'Assign';
  }

  public isShare(): boolean {
    return this.value === 'Share';
  }

  public getValue(): string {
    return this.value;
  }

  public getDisplayName(): string {
    return this.value;
  }
}
```

#### Repository Interfaces

```typescript
/**
 * Repository interface for entity metadata.
 * Defined in domain, implemented in infrastructure.
 */
export interface IEntityMetadataRepository {
  /**
   * Retrieve all entity metadata for an environment.
   * Includes entity-level information and counts (no full attribute lists).
   *
   * @param environmentId - Environment ID
   * @returns Array of EntityMetadata (summary level)
   */
  getAllEntities(environmentId: string): Promise<readonly EntityMetadata[]>;

  /**
   * Retrieve full entity metadata including all attributes.
   *
   * @param environmentId - Environment ID
   * @param logicalName - Entity logical name
   * @returns EntityMetadata with full attribute collection
   */
  getEntityWithAttributes(environmentId: string, logicalName: string): Promise<EntityMetadata>;

  /**
   * Retrieve relationships for an entity.
   *
   * @param environmentId - Environment ID
   * @param logicalName - Entity logical name
   * @returns Array of RelationshipMetadata
   */
  getEntityRelationships(environmentId: string, logicalName: string): Promise<readonly RelationshipMetadata[]>;

  /**
   * Retrieve keys for an entity.
   *
   * @param environmentId - Environment ID
   * @param logicalName - Entity logical name
   * @returns Array of KeyMetadata
   */
  getEntityKeys(environmentId: string, logicalName: string): Promise<readonly KeyMetadata[]>;

  /**
   * Retrieve privileges for an entity.
   *
   * @param environmentId - Environment ID
   * @param logicalName - Entity logical name
   * @returns Array of PrivilegeMetadata
   */
  getEntityPrivileges(environmentId: string, logicalName: string): Promise<readonly PrivilegeMetadata[]>;

  /**
   * Retrieve all global option sets.
   *
   * @param environmentId - Environment ID
   * @returns Array of GlobalOptionSetMetadata
   */
  getAllGlobalOptionSets(environmentId: string): Promise<readonly GlobalOptionSetMetadata[]>;
}
```

---

### Application Layer Types

#### Use Cases

```typescript
/**
 * Loads entity tree for environment.
 * Orchestrates repository fetch → domain entity validation → ViewModel mapping.
 *
 * NO business logic - orchestration only.
 */
export class LoadEntityTreeUseCase {
  constructor(
    private readonly repository: IEntityMetadataRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Execute use case.
   * Returns ViewModels for tree display (summary level, no full attribute lists).
   */
  public async execute(environmentId: string): Promise<EntityTreeItemViewModel[]> {
    this.logger.info('Loading entity tree', { environmentId });

    // Orchestration: Fetch domain entities from repository
    const entities = await this.repository.getAllEntities(environmentId);

    // Orchestration: Map to ViewModels
    const viewModels = entities.map(entity =>
      EntityTreeItemViewModelMapper.toViewModel(entity)
    );

    this.logger.info('Entity tree loaded', { count: viewModels.length });
    return viewModels;
  }
}

/**
 * Loads entity attributes for selected entity.
 * Orchestrates: Repository fetch → Domain entity → ViewModel mapping.
 */
export class LoadEntityAttributesUseCase {
  constructor(
    private readonly repository: IEntityMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(environmentId: string, logicalName: string): Promise<EntityAttributeViewModel[]> {
    this.logger.info('Loading entity attributes', { environmentId, logicalName });

    // Orchestration: Fetch entity with full attributes
    const entity = await this.repository.getEntityWithAttributes(environmentId, logicalName);

    // Orchestration: Map to ViewModels
    const viewModels = entity.getAttributes().map(attr =>
      EntityAttributeViewModelMapper.toViewModel(attr)
    );

    this.logger.info('Entity attributes loaded', { count: viewModels.length });
    return viewModels;
  }
}

/**
 * Loads entity relationships for selected entity.
 */
export class LoadEntityRelationshipsUseCase {
  constructor(
    private readonly repository: IEntityMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(environmentId: string, logicalName: string): Promise<EntityRelationshipViewModel[]> {
    this.logger.info('Loading entity relationships', { environmentId, logicalName });

    const relationships = await this.repository.getEntityRelationships(environmentId, logicalName);

    const viewModels = relationships.map(rel =>
      EntityRelationshipViewModelMapper.toViewModel(rel)
    );

    this.logger.info('Entity relationships loaded', { count: viewModels.length });
    return viewModels;
  }
}

/**
 * Loads entity keys for selected entity.
 */
export class LoadEntityKeysUseCase {
  constructor(
    private readonly repository: IEntityMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(environmentId: string, logicalName: string): Promise<EntityKeyViewModel[]> {
    this.logger.info('Loading entity keys', { environmentId, logicalName });

    const keys = await this.repository.getEntityKeys(environmentId, logicalName);

    const viewModels = keys.map(key =>
      EntityKeyViewModelMapper.toViewModel(key)
    );

    this.logger.info('Entity keys loaded', { count: viewModels.length });
    return viewModels;
  }
}

/**
 * Loads entity privileges for selected entity.
 */
export class LoadEntityPrivilegesUseCase {
  constructor(
    private readonly repository: IEntityMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(environmentId: string, logicalName: string): Promise<EntityPrivilegeViewModel[]> {
    this.logger.info('Loading entity privileges', { environmentId, logicalName });

    const privileges = await this.repository.getEntityPrivileges(environmentId, logicalName);

    const viewModels = privileges.map(priv =>
      EntityPrivilegeViewModelMapper.toViewModel(priv)
    );

    this.logger.info('Entity privileges loaded', { count: viewModels.length });
    return viewModels;
  }
}

/**
 * Loads global option sets.
 */
export class LoadGlobalOptionSetsUseCase {
  constructor(
    private readonly repository: IEntityMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(environmentId: string): Promise<GlobalOptionSetViewModel[]> {
    this.logger.info('Loading global option sets', { environmentId });

    const optionSets = await this.repository.getAllGlobalOptionSets(environmentId);

    const viewModels = optionSets.map(optionSet =>
      GlobalOptionSetViewModelMapper.toViewModel(optionSet)
    );

    this.logger.info('Global option sets loaded', { count: viewModels.length });
    return viewModels;
  }
}
```

#### ViewModels

```typescript
/**
 * ViewModel for entity tree item (left panel).
 * DTO for presentation - NO behavior.
 */
export interface EntityTreeItemViewModel {
  readonly id: string; // Logical name
  readonly label: string; // Display name
  readonly isCustom: boolean;
  readonly iconName: string; // 'entity-system' | 'entity-custom'
  readonly attributeCount: number; // For tooltip display
}

/**
 * ViewModel for entity attribute (middle panel table row).
 * DTO for presentation - NO behavior.
 */
export interface EntityAttributeViewModel {
  readonly logicalName: string;
  readonly schemaName: string;
  readonly displayName: string;
  readonly type: string; // Human-readable type (e.g., "String", "Lookup (account)")
  readonly isRequired: boolean;
  readonly isCustom: boolean;
  readonly maxLength: string | null; // Formatted as string ("100" or null)
}

/**
 * ViewModel for entity relationship (middle panel table row).
 * DTO for presentation - NO behavior.
 */
export interface EntityRelationshipViewModel {
  readonly schemaName: string;
  readonly relationshipType: string; // "1:N", "N:1", "N:N"
  readonly referencedEntity: string;
  readonly referencingEntity: string;
  readonly cascadeDelete: string; // "Cascade", "Restrict", etc.
}

/**
 * ViewModel for entity key (middle panel table row).
 * DTO for presentation - NO behavior.
 */
export interface EntityKeyViewModel {
  readonly logicalName: string;
  readonly displayName: string;
  readonly attributes: string; // Comma-separated attribute list
  readonly attributeCount: number;
}

/**
 * ViewModel for entity privilege (middle panel table row).
 * DTO for presentation - NO behavior.
 */
export interface EntityPrivilegeViewModel {
  readonly privilegeId: string;
  readonly name: string;
  readonly privilegeType: string; // "Create", "Read", "Write", etc.
  readonly availableDepths: string; // "Basic, Local, Deep, Global"
}

/**
 * ViewModel for global option set (tree item).
 * DTO for presentation - NO behavior.
 */
export interface GlobalOptionSetViewModel {
  readonly name: string;
  readonly displayName: string;
  readonly isCustom: boolean;
  readonly optionCount: number;
}

/**
 * ViewModel for attribute detail (right panel).
 * DTO for presentation - NO behavior.
 */
export interface AttributeDetailViewModel {
  readonly logicalName: string;
  readonly schemaName: string;
  readonly displayName: string;
  readonly description: string | null;
  readonly type: string;
  readonly isRequired: boolean;
  readonly isCustom: boolean;
  readonly maxLength: string | null;
  readonly format: string | null;
  readonly lookupTargetEntity: string | null;
  readonly optionSetName: string | null;
  readonly entityLogicalName: string;
}

/**
 * ViewModel for relationship detail (right panel).
 * DTO for presentation - NO behavior.
 */
export interface RelationshipDetailViewModel {
  readonly schemaName: string;
  readonly relationshipType: string;
  readonly referencedEntity: string;
  readonly referencedAttribute: string;
  readonly referencingEntity: string;
  readonly referencingAttribute: string;
  readonly cascadeDelete: string;
  readonly cascadeAssign: string;
  readonly cascadeShare: string;
  readonly cascadeUnshare: string;
  readonly cascadeReparent: string;
  readonly cascadeMerge: string;
}

/**
 * ViewModel for key detail (right panel).
 * DTO for presentation - NO behavior.
 */
export interface KeyDetailViewModel {
  readonly logicalName: string;
  readonly displayName: string;
  readonly entityLogicalName: string;
  readonly attributes: string[]; // Array of attribute logical names
  readonly attributeCount: number;
}

/**
 * ViewModel for privilege detail (right panel).
 * DTO for presentation - NO behavior.
 */
export interface PrivilegeDetailViewModel {
  readonly privilegeId: string;
  readonly name: string;
  readonly privilegeType: string;
  readonly canBeBasic: boolean;
  readonly canBeLocal: boolean;
  readonly canBeDeep: boolean;
  readonly canBeGlobal: boolean;
  readonly availableDepths: string[];
}
```

#### Mappers

```typescript
/**
 * Maps EntityMetadata domain entity to EntityTreeItemViewModel.
 * Transform only - NO business logic.
 */
export class EntityTreeItemViewModelMapper {
  public static toViewModel(entity: EntityMetadata): EntityTreeItemViewModel {
    return {
      id: entity.getLogicalName().getValue(),
      label: entity.getDisplayName().getValue(),
      isCustom: entity.getIsCustomEntity(),
      iconName: entity.isSystemEntity() ? 'entity-system' : 'entity-custom',
      attributeCount: entity.getAttributeCount()
    };
  }
}

/**
 * Maps AttributeMetadata domain entity to EntityAttributeViewModel.
 * Transform only - NO business logic.
 */
export class EntityAttributeViewModelMapper {
  public static toViewModel(attribute: AttributeMetadata): EntityAttributeViewModel {
    return {
      logicalName: attribute.getLogicalName().getValue(),
      schemaName: attribute.getSchemaName().getValue(),
      displayName: attribute.getDisplayName().getValue(),
      type: attribute.getTypeDisplay(), // Uses domain method for formatted type
      isRequired: attribute.isRequired(), // Uses domain method
      isCustom: attribute.getIsCustomAttribute(),
      maxLength: attribute.hasMaxLength() ? attribute.getMaxLength()!.toString() : null
    };
  }

  /**
   * Maps AttributeMetadata to detail ViewModel.
   */
  public static toDetailViewModel(attribute: AttributeMetadata): AttributeDetailViewModel {
    return {
      logicalName: attribute.getLogicalName().getValue(),
      schemaName: attribute.getSchemaName().getValue(),
      displayName: attribute.getDisplayName().getValue(),
      description: attribute.getDescription(),
      type: attribute.getTypeDisplay(),
      isRequired: attribute.isRequired(),
      isCustom: attribute.getIsCustomAttribute(),
      maxLength: attribute.hasMaxLength() ? attribute.getMaxLength()!.toString() : null,
      format: attribute.getFormat(),
      lookupTargetEntity: attribute.getLookupTargetEntity()?.getValue() || null,
      optionSetName: attribute.getOptionSetName(),
      entityLogicalName: attribute.getEntityLogicalName().getValue()
    };
  }
}

/**
 * Maps RelationshipMetadata domain entity to EntityRelationshipViewModel.
 * Transform only - NO business logic.
 */
export class EntityRelationshipViewModelMapper {
  public static toViewModel(relationship: RelationshipMetadata): EntityRelationshipViewModel {
    return {
      schemaName: relationship.getSchemaName().getValue(),
      relationshipType: relationship.getRelationshipType().getDisplayName(),
      referencedEntity: relationship.getReferencedEntity().getValue(),
      referencingEntity: relationship.getReferencingEntity().getValue(),
      cascadeDelete: relationship.getCascadeDeleteBehavior().toString()
    };
  }

  /**
   * Maps RelationshipMetadata to detail ViewModel.
   */
  public static toDetailViewModel(relationship: RelationshipMetadata): RelationshipDetailViewModel {
    const cascade = relationship.getCascadeConfiguration();
    return {
      schemaName: relationship.getSchemaName().getValue(),
      relationshipType: relationship.getRelationshipType().getDisplayName(),
      referencedEntity: relationship.getReferencedEntity().getValue(),
      referencedAttribute: relationship.getReferencedAttribute().getValue(),
      referencingEntity: relationship.getReferencingEntity().getValue(),
      referencingAttribute: relationship.getReferencingAttribute().getValue(),
      cascadeDelete: cascade.getDeleteBehavior().toString(),
      cascadeAssign: cascade.getAssignBehavior().toString(),
      cascadeShare: cascade.getShareBehavior().toString(),
      cascadeUnshare: cascade.getUnshareBehavior().toString(),
      cascadeReparent: cascade.getReparentBehavior().toString(),
      cascadeMerge: cascade.getMergeBehavior().toString()
    };
  }
}

/**
 * Maps KeyMetadata domain entity to EntityKeyViewModel.
 * Transform only - NO business logic.
 */
export class EntityKeyViewModelMapper {
  public static toViewModel(key: KeyMetadata): EntityKeyViewModel {
    return {
      logicalName: key.getLogicalName().getValue(),
      displayName: key.getDisplayName().getValue(),
      attributes: key.getAttributeListDisplay(), // Uses domain method
      attributeCount: key.getAttributeCount()
    };
  }

  /**
   * Maps KeyMetadata to detail ViewModel.
   */
  public static toDetailViewModel(key: KeyMetadata): KeyDetailViewModel {
    return {
      logicalName: key.getLogicalName().getValue(),
      displayName: key.getDisplayName().getValue(),
      entityLogicalName: key.getEntityLogicalName().getValue(),
      attributes: key.getKeyAttributes().map(attr => attr.getValue()),
      attributeCount: key.getAttributeCount()
    };
  }
}

/**
 * Maps PrivilegeMetadata domain entity to EntityPrivilegeViewModel.
 * Transform only - NO business logic.
 */
export class EntityPrivilegeViewModelMapper {
  public static toViewModel(privilege: PrivilegeMetadata): EntityPrivilegeViewModel {
    return {
      privilegeId: privilege.getPrivilegeId(),
      name: privilege.getName(),
      privilegeType: privilege.getPrivilegeType().getDisplayName(),
      availableDepths: privilege.getAvailableDepths().join(', ')
    };
  }

  /**
   * Maps PrivilegeMetadata to detail ViewModel.
   */
  public static toDetailViewModel(privilege: PrivilegeMetadata): PrivilegeDetailViewModel {
    return {
      privilegeId: privilege.getPrivilegeId(),
      name: privilege.getName(),
      privilegeType: privilege.getPrivilegeType().getDisplayName(),
      canBeBasic: privilege.getCanBeBasic(),
      canBeLocal: privilege.getCanBeLocal(),
      canBeDeep: privilege.getCanBeDeep(),
      canBeGlobal: privilege.getCanBeGlobal(),
      availableDepths: privilege.getAvailableDepths()
    };
  }
}

/**
 * Maps GlobalOptionSetMetadata domain entity to GlobalOptionSetViewModel.
 * Transform only - NO business logic.
 */
export class GlobalOptionSetViewModelMapper {
  public static toViewModel(optionSet: GlobalOptionSetMetadata): GlobalOptionSetViewModel {
    return {
      name: optionSet.getName(),
      displayName: optionSet.getDisplayName().getValue(),
      isCustom: optionSet.getIsCustom(),
      optionCount: optionSet.getOptionCount()
    };
  }
}
```

---

### Infrastructure Layer Types

#### Repository Implementation

```typescript
/**
 * Implements IEntityMetadataRepository using Dataverse Web API.
 * Maps between Dataverse DTOs and domain entities.
 */
export class DataverseEntityMetadataRepository implements IEntityMetadataRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  public async getAllEntities(environmentId: string): Promise<readonly EntityMetadata[]> {
    this.logger.debug('Fetching all entities from Dataverse', { environmentId });

    // Fetch entities (summary level, no full attribute expansion)
    const response = await this.apiService.get<EntityDefinitionDto[]>(
      environmentId,
      '/EntityDefinitions',
      {
        $select: 'LogicalName,SchemaName,DisplayName,LogicalCollectionName,Description,IsCustomEntity,ObjectTypeCode,PrimaryIdAttribute,PrimaryNameAttribute,OwnershipType',
        $filter: 'IsValidForAdvancedFind eq true' // Exclude system tables
      }
    );

    // Map DTOs to domain entities
    return response.map(dto => this.mapEntitySummaryToDomain(dto));
  }

  public async getEntityWithAttributes(environmentId: string, logicalName: string): Promise<EntityMetadata> {
    this.logger.debug('Fetching entity with attributes', { environmentId, logicalName });

    // Fetch entity with full attribute expansion
    const response = await this.apiService.get<EntityDefinitionDto>(
      environmentId,
      `/EntityDefinitions(LogicalName='${logicalName}')`,
      {
        $expand: 'Attributes($select=LogicalName,SchemaName,DisplayName,Description,AttributeType,IsCustomAttribute,RequiredLevel,MaxLength,Format,Targets,OptionSet)'
      }
    );

    // Map DTO to domain entity with full attributes
    return this.mapEntityWithAttributesToDomain(response);
  }

  public async getEntityRelationships(environmentId: string, logicalName: string): Promise<readonly RelationshipMetadata[]> {
    this.logger.debug('Fetching entity relationships', { environmentId, logicalName });

    // Fetch one-to-many relationships
    const oneToManyResponse = await this.apiService.get<OneToManyRelationshipDto[]>(
      environmentId,
      `/EntityDefinitions(LogicalName='${logicalName}')/OneToManyRelationships`,
      {
        $select: 'SchemaName,ReferencedEntity,ReferencedAttribute,ReferencingEntity,ReferencingAttribute,CascadeConfiguration'
      }
    );

    // Fetch many-to-one relationships
    const manyToOneResponse = await this.apiService.get<ManyToOneRelationshipDto[]>(
      environmentId,
      `/EntityDefinitions(LogicalName='${logicalName}')/ManyToOneRelationships`,
      {
        $select: 'SchemaName,ReferencedEntity,ReferencedAttribute,ReferencingEntity,ReferencingAttribute,CascadeConfiguration'
      }
    );

    // Fetch many-to-many relationships
    const manyToManyResponse = await this.apiService.get<ManyToManyRelationshipDto[]>(
      environmentId,
      `/EntityDefinitions(LogicalName='${logicalName}')/ManyToManyRelationships`,
      {
        $select: 'SchemaName,Entity1LogicalName,Entity2LogicalName,IntersectEntityName'
      }
    );

    // Map all relationships to domain
    const oneToMany = oneToManyResponse.map(dto => this.mapOneToManyRelationshipToDomain(dto));
    const manyToOne = manyToOneResponse.map(dto => this.mapManyToOneRelationshipToDomain(dto));
    const manyToMany = manyToManyResponse.map(dto => this.mapManyToManyRelationshipToDomain(dto));

    return [...oneToMany, ...manyToOne, ...manyToMany];
  }

  public async getEntityKeys(environmentId: string, logicalName: string): Promise<readonly KeyMetadata[]> {
    this.logger.debug('Fetching entity keys', { environmentId, logicalName });

    const response = await this.apiService.get<EntityKeyDto[]>(
      environmentId,
      `/EntityDefinitions(LogicalName='${logicalName}')/Keys`,
      {
        $select: 'LogicalName,DisplayName,KeyAttributes'
      }
    );

    return response.map(dto => this.mapKeyToDomain(dto, logicalName));
  }

  public async getEntityPrivileges(environmentId: string, logicalName: string): Promise<readonly PrivilegeMetadata[]> {
    this.logger.debug('Fetching entity privileges', { environmentId, logicalName });

    const response = await this.apiService.get<PrivilegeDto[]>(
      environmentId,
      `/EntityDefinitions(LogicalName='${logicalName}')/Privileges`,
      {
        $select: 'PrivilegeId,Name,PrivilegeType,CanBeBasic,CanBeLocal,CanBeDeep,CanBeGlobal'
      }
    );

    return response.map(dto => this.mapPrivilegeToDomain(dto));
  }

  public async getAllGlobalOptionSets(environmentId: string): Promise<readonly GlobalOptionSetMetadata[]> {
    this.logger.debug('Fetching global option sets', { environmentId });

    const response = await this.apiService.get<GlobalOptionSetDto[]>(
      environmentId,
      '/GlobalOptionSetDefinitions',
      {
        $select: 'Name,DisplayName,Description,IsCustomOptionSet',
        $expand: 'Options($select=Value,Label,Description)'
      }
    );

    return response.map(dto => this.mapGlobalOptionSetToDomain(dto));
  }

  /**
   * Map entity summary DTO to domain entity (no attributes).
   */
  private mapEntitySummaryToDomain(dto: EntityDefinitionDto): EntityMetadata {
    return new EntityMetadata(
      LogicalName.create(dto.LogicalName),
      SchemaName.create(dto.SchemaName),
      DisplayName.create(dto.DisplayName?.UserLocalizedLabel?.Label || dto.LogicalName),
      DisplayName.create(dto.LogicalCollectionName?.UserLocalizedLabel?.Label || dto.LogicalName),
      dto.Description?.UserLocalizedLabel?.Label || null,
      dto.LogicalCollectionName?.UserLocalizedLabel?.Label || dto.LogicalName,
      dto.IsCustomEntity || false,
      dto.ObjectTypeCode || null,
      dto.PrimaryIdAttribute || null,
      dto.PrimaryNameAttribute || null,
      this.mapOwnershipType(dto.OwnershipType),
      [] // No attributes in summary
    );
  }

  /**
   * Map entity DTO with attributes to domain entity.
   */
  private mapEntityWithAttributesToDomain(dto: EntityDefinitionDto): EntityMetadata {
    const attributes = (dto.Attributes || []).map(attrDto => this.mapAttributeToDomain(attrDto, dto.LogicalName));

    return new EntityMetadata(
      LogicalName.create(dto.LogicalName),
      SchemaName.create(dto.SchemaName),
      DisplayName.create(dto.DisplayName?.UserLocalizedLabel?.Label || dto.LogicalName),
      DisplayName.create(dto.LogicalCollectionName?.UserLocalizedLabel?.Label || dto.LogicalName),
      dto.Description?.UserLocalizedLabel?.Label || null,
      dto.LogicalCollectionName?.UserLocalizedLabel?.Label || dto.LogicalName,
      dto.IsCustomEntity || false,
      dto.ObjectTypeCode || null,
      dto.PrimaryIdAttribute || null,
      dto.PrimaryNameAttribute || null,
      this.mapOwnershipType(dto.OwnershipType),
      attributes
    );
  }

  /**
   * Map attribute DTO to domain entity.
   */
  private mapAttributeToDomain(dto: AttributeDto, entityLogicalName: string): AttributeMetadata {
    return new AttributeMetadata(
      LogicalName.create(dto.LogicalName),
      SchemaName.create(dto.SchemaName),
      DisplayName.create(dto.DisplayName?.UserLocalizedLabel?.Label || dto.LogicalName),
      dto.Description?.UserLocalizedLabel?.Label || null,
      AttributeType.create(dto.AttributeType),
      dto.IsCustomAttribute || false,
      RequiredLevel.create(dto.RequiredLevel?.Value || 'None'),
      LogicalName.create(entityLogicalName),
      dto.MaxLength || null,
      dto.Format || null,
      dto.Targets && dto.Targets.length > 0 ? LogicalName.create(dto.Targets[0]) : null,
      dto.OptionSet?.Name || null
    );
  }

  /**
   * Map relationship DTOs to domain entities.
   */
  private mapOneToManyRelationshipToDomain(dto: OneToManyRelationshipDto): RelationshipMetadata {
    return new RelationshipMetadata(
      SchemaName.create(dto.SchemaName),
      RelationshipType.create('OneToManyRelationship'),
      LogicalName.create(dto.ReferencedEntity),
      LogicalName.create(dto.ReferencedAttribute),
      LogicalName.create(dto.ReferencingEntity),
      LogicalName.create(dto.ReferencingAttribute),
      this.mapCascadeConfiguration(dto.CascadeConfiguration)
    );
  }

  private mapManyToOneRelationshipToDomain(dto: ManyToOneRelationshipDto): RelationshipMetadata {
    return new RelationshipMetadata(
      SchemaName.create(dto.SchemaName),
      RelationshipType.create('ManyToOneRelationship'),
      LogicalName.create(dto.ReferencedEntity),
      LogicalName.create(dto.ReferencedAttribute),
      LogicalName.create(dto.ReferencingEntity),
      LogicalName.create(dto.ReferencingAttribute),
      this.mapCascadeConfiguration(dto.CascadeConfiguration)
    );
  }

  private mapManyToManyRelationshipToDomain(dto: ManyToManyRelationshipDto): RelationshipMetadata {
    // Many-to-many relationships don't have cascade configuration
    const emptyCascade = new CascadeConfiguration(
      CascadeBehavior.NoCascade,
      CascadeBehavior.NoCascade,
      CascadeBehavior.NoCascade,
      CascadeBehavior.NoCascade,
      CascadeBehavior.NoCascade,
      CascadeBehavior.NoCascade
    );

    return new RelationshipMetadata(
      SchemaName.create(dto.SchemaName),
      RelationshipType.create('ManyToManyRelationship'),
      LogicalName.create(dto.Entity1LogicalName),
      LogicalName.create(dto.Entity1LogicalName), // Dummy attribute
      LogicalName.create(dto.Entity2LogicalName),
      LogicalName.create(dto.Entity2LogicalName), // Dummy attribute
      emptyCascade
    );
  }

  /**
   * Map key DTO to domain entity.
   */
  private mapKeyToDomain(dto: EntityKeyDto, entityLogicalName: string): KeyMetadata {
    const attributes = dto.KeyAttributes.map(attr => LogicalName.create(attr));

    return new KeyMetadata(
      LogicalName.create(dto.LogicalName),
      DisplayName.create(dto.DisplayName?.UserLocalizedLabel?.Label || dto.LogicalName),
      LogicalName.create(entityLogicalName),
      attributes
    );
  }

  /**
   * Map privilege DTO to domain entity.
   */
  private mapPrivilegeToDomain(dto: PrivilegeDto): PrivilegeMetadata {
    return new PrivilegeMetadata(
      dto.PrivilegeId,
      dto.Name,
      PrivilegeType.create(dto.PrivilegeType),
      dto.CanBeBasic || false,
      dto.CanBeLocal || false,
      dto.CanBeDeep || false,
      dto.CanBeGlobal || false
    );
  }

  /**
   * Map global option set DTO to domain entity.
   */
  private mapGlobalOptionSetToDomain(dto: GlobalOptionSetDto): GlobalOptionSetMetadata {
    const options = (dto.Options || []).map(optDto =>
      new OptionMetadata(
        optDto.Value,
        optDto.Label?.UserLocalizedLabel?.Label || optDto.Value.toString(),
        optDto.Description?.UserLocalizedLabel?.Label || null
      )
    );

    return new GlobalOptionSetMetadata(
      dto.Name,
      DisplayName.create(dto.DisplayName?.UserLocalizedLabel?.Label || dto.Name),
      dto.Description?.UserLocalizedLabel?.Label || null,
      dto.IsCustomOptionSet || false,
      options
    );
  }

  /**
   * Map cascade configuration DTO to value object.
   */
  private mapCascadeConfiguration(dto: CascadeConfigurationDto): CascadeConfiguration {
    return new CascadeConfiguration(
      this.mapCascadeBehavior(dto.Delete),
      this.mapCascadeBehavior(dto.Assign),
      this.mapCascadeBehavior(dto.Share),
      this.mapCascadeBehavior(dto.Unshare),
      this.mapCascadeBehavior(dto.Reparent),
      this.mapCascadeBehavior(dto.Merge)
    );
  }

  /**
   * Map cascade behavior string to enum.
   */
  private mapCascadeBehavior(value: string): CascadeBehavior {
    switch (value) {
      case 'Cascade': return CascadeBehavior.Cascade;
      case 'Active': return CascadeBehavior.Active;
      case 'UserOwned': return CascadeBehavior.UserOwned;
      case 'RemoveLink': return CascadeBehavior.RemoveLink;
      case 'Restrict': return CascadeBehavior.Restrict;
      case 'NoCascade': return CascadeBehavior.NoCascade;
      default: return CascadeBehavior.NoCascade;
    }
  }

  /**
   * Map ownership type string to enum.
   */
  private mapOwnershipType(value: string): OwnershipType {
    switch (value) {
      case 'UserOwned': return OwnershipType.UserOwned;
      case 'TeamOwned': return OwnershipType.TeamOwned;
      case 'OrganizationOwned': return OwnershipType.OrganizationOwned;
      case 'None': return OwnershipType.None;
      default: return OwnershipType.None;
    }
  }
}
```

#### DTOs

```typescript
/**
 * DTO for entity definition from Dataverse Web API.
 */
export interface EntityDefinitionDto {
  LogicalName: string;
  SchemaName: string;
  DisplayName?: LocalizedLabelDto;
  LogicalCollectionName?: LocalizedLabelDto;
  Description?: LocalizedLabelDto;
  IsCustomEntity?: boolean;
  ObjectTypeCode?: number;
  PrimaryIdAttribute?: string;
  PrimaryNameAttribute?: string;
  OwnershipType?: string;
  Attributes?: AttributeDto[];
}

/**
 * DTO for attribute metadata from Dataverse Web API.
 */
export interface AttributeDto {
  LogicalName: string;
  SchemaName: string;
  DisplayName?: LocalizedLabelDto;
  Description?: LocalizedLabelDto;
  AttributeType: string;
  IsCustomAttribute?: boolean;
  RequiredLevel?: { Value: string };
  MaxLength?: number;
  Format?: string;
  Targets?: string[];
  OptionSet?: { Name: string };
}

/**
 * DTO for one-to-many relationship from Dataverse Web API.
 */
export interface OneToManyRelationshipDto {
  SchemaName: string;
  ReferencedEntity: string;
  ReferencedAttribute: string;
  ReferencingEntity: string;
  ReferencingAttribute: string;
  CascadeConfiguration: CascadeConfigurationDto;
}

/**
 * DTO for many-to-one relationship from Dataverse Web API.
 */
export interface ManyToOneRelationshipDto {
  SchemaName: string;
  ReferencedEntity: string;
  ReferencedAttribute: string;
  ReferencingEntity: string;
  ReferencingAttribute: string;
  CascadeConfiguration: CascadeConfigurationDto;
}

/**
 * DTO for many-to-many relationship from Dataverse Web API.
 */
export interface ManyToManyRelationshipDto {
  SchemaName: string;
  Entity1LogicalName: string;
  Entity2LogicalName: string;
  IntersectEntityName: string;
}

/**
 * DTO for cascade configuration from Dataverse Web API.
 */
export interface CascadeConfigurationDto {
  Delete: string;
  Assign: string;
  Share: string;
  Unshare: string;
  Reparent: string;
  Merge: string;
}

/**
 * DTO for entity key from Dataverse Web API.
 */
export interface EntityKeyDto {
  LogicalName: string;
  DisplayName?: LocalizedLabelDto;
  KeyAttributes: string[];
}

/**
 * DTO for privilege from Dataverse Web API.
 */
export interface PrivilegeDto {
  PrivilegeId: string;
  Name: string;
  PrivilegeType: string;
  CanBeBasic?: boolean;
  CanBeLocal?: boolean;
  CanBeDeep?: boolean;
  CanBeGlobal?: boolean;
}

/**
 * DTO for global option set from Dataverse Web API.
 */
export interface GlobalOptionSetDto {
  Name: string;
  DisplayName?: LocalizedLabelDto;
  Description?: LocalizedLabelDto;
  IsCustomOptionSet?: boolean;
  Options?: OptionDto[];
}

/**
 * DTO for option metadata from Dataverse Web API.
 */
export interface OptionDto {
  Value: number;
  Label?: LocalizedLabelDto;
  Description?: LocalizedLabelDto;
}

/**
 * DTO for localized label from Dataverse Web API.
 */
export interface LocalizedLabelDto {
  UserLocalizedLabel?: {
    Label: string;
  };
}
```

---

### Presentation Layer Types

#### Panel

```typescript
/**
 * Commands supported by Metadata Browser panel.
 */
type MetadataBrowserCommands =
  | 'environmentChange'
  | 'refresh'
  | 'selectEntity'
  | 'switchTab'
  | 'viewAttributeDetail'
  | 'viewRelationshipDetail'
  | 'viewKeyDetail'
  | 'viewPrivilegeDetail'
  | 'closeDetail'
  | 'searchEntities';

/**
 * Metadata Browser panel using PanelCoordinator architecture.
 * Features three-panel layout: tree + tabs + detail.
 */
export class MetadataBrowserPanel {
  public static readonly viewType = 'powerPlatformDevSuite.metadataBrowser';
  private static panels = new Map<string, MetadataBrowserPanel>();

  private readonly coordinator: PanelCoordinator<MetadataBrowserCommands>;
  private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
  private currentEnvironmentId: string;
  private currentEntityLogicalName: string | null = null;
  private currentTab: 'attributes' | 'relationships' | 'keys' | 'privileges' = 'attributes';

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
    private readonly getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
    private readonly loadEntityTreeUseCase: LoadEntityTreeUseCase,
    private readonly loadEntityAttributesUseCase: LoadEntityAttributesUseCase,
    private readonly loadEntityRelationshipsUseCase: LoadEntityRelationshipsUseCase,
    private readonly loadEntityKeysUseCase: LoadEntityKeysUseCase,
    private readonly loadEntityPrivilegesUseCase: LoadEntityPrivilegesUseCase,
    private readonly logger: ILogger,
    private readonly panelStateRepository: IPanelStateRepository | null,
    environmentId: string
  ) {
    this.currentEnvironmentId = environmentId;
    this.logger.debug('MetadataBrowserPanel: Initialized');

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

  public static async createOrShow(
    extensionUri: vscode.Uri,
    getEnvironments: () => Promise<EnvironmentOption[]>,
    getEnvironmentById: (envId: string) => Promise<{ id: string; name: string } | null>,
    loadEntityTreeUseCase: LoadEntityTreeUseCase,
    loadEntityAttributesUseCase: LoadEntityAttributesUseCase,
    loadEntityRelationshipsUseCase: LoadEntityRelationshipsUseCase,
    loadEntityKeysUseCase: LoadEntityKeysUseCase,
    loadEntityPrivilegesUseCase: LoadEntityPrivilegesUseCase,
    logger: ILogger,
    initialEnvironmentId?: string,
    panelStateRepository?: IPanelStateRepository
  ): Promise<MetadataBrowserPanel> {
    const column = vscode.ViewColumn.One;

    let targetEnvironmentId = initialEnvironmentId;
    if (!targetEnvironmentId) {
      const environments = await getEnvironments();
      targetEnvironmentId = environments[0]?.id;
    }

    if (!targetEnvironmentId) {
      throw new Error('No environments available');
    }

    const existingPanel = MetadataBrowserPanel.panels.get(targetEnvironmentId);
    if (existingPanel) {
      existingPanel.panel.reveal(column);
      return existingPanel;
    }

    const environment = await getEnvironmentById(targetEnvironmentId);
    const environmentName = environment?.name || 'Unknown';

    const panel = vscode.window.createWebviewPanel(
      MetadataBrowserPanel.viewType,
      `Metadata Browser - ${environmentName}`,
      column,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );

    const newPanel = new MetadataBrowserPanel(
      panel,
      extensionUri,
      getEnvironments,
      getEnvironmentById,
      loadEntityTreeUseCase,
      loadEntityAttributesUseCase,
      loadEntityRelationshipsUseCase,
      loadEntityKeysUseCase,
      loadEntityPrivilegesUseCase,
      logger,
      panelStateRepository || null,
      targetEnvironmentId
    );

    MetadataBrowserPanel.panels.set(targetEnvironmentId, newPanel);

    panel.onDidDispose(() => {
      MetadataBrowserPanel.panels.delete(targetEnvironmentId);
    });

    return newPanel;
  }

  private async initializeAndLoadData(): Promise<void> {
    const environments = await this.getEnvironments();

    // Initial render (empty state)
    await this.scaffoldingBehavior.refresh({
      environments,
      currentEnvironmentId: this.currentEnvironmentId,
      treeData: [],
      tableData: [],
      state: {
        selectedEntity: this.currentEntityLogicalName,
        activeTab: this.currentTab
      }
    });

    // Load entity tree
    await this.handleLoadEntityTree();
  }

  private createCoordinator(): {
    coordinator: PanelCoordinator<MetadataBrowserCommands>;
    scaffoldingBehavior: HtmlScaffoldingBehavior;
  } {
    const environmentSelector = new EnvironmentSelectorSection();
    const actionButtons = new ActionButtonsSection({
      buttons: [
        { id: 'refresh', label: 'Refresh' }
      ]
    }, SectionPosition.Toolbar);

    const treeSection = new MetadataTreeSection();
    const tabsSection = new MetadataTabsSection(); // Middle panel with tabs
    const detailSection = new MetadataDetailSection(); // Right panel

    const compositionBehavior = new SectionCompositionBehavior(
      [
        actionButtons,
        environmentSelector,
        treeSection,
        tabsSection,
        detailSection
      ],
      PanelLayout.ThreePanel // NEW LAYOUT
    );

    const cssUris = resolveCssModules(
      {
        base: true,
        components: ['buttons', 'inputs', 'three-panel', 'tree'],
        sections: ['environment-selector', 'action-buttons', 'datatable']
      },
      this.extensionUri,
      this.panel.webview
    );

    const featureCssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'metadata-browser.css')
    ).toString();

    const scaffoldingConfig: HtmlScaffoldingConfig = {
      cssUris: [...cssUris, featureCssUri],
      jsUris: [
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
        ).toString(),
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'MetadataTreeRenderer.js')
        ).toString(),
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'MetadataTabsRenderer.js')
        ).toString(),
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'MetadataDetailRenderer.js')
        ).toString()
      ],
      cspNonce: getNonce(),
      title: 'Metadata Browser'
    };

    const scaffoldingBehavior = new HtmlScaffoldingBehavior(
      this.panel.webview,
      compositionBehavior,
      scaffoldingConfig
    );

    const coordinator = new PanelCoordinator<MetadataBrowserCommands>({
      panel: this.panel,
      extensionUri: this.extensionUri,
      behaviors: [scaffoldingBehavior],
      logger: this.logger
    });

    return { coordinator, scaffoldingBehavior };
  }

  private registerCommandHandlers(): void {
    this.coordinator.registerHandler('refresh', async () => {
      await this.handleLoadEntityTree();
    });

    this.coordinator.registerHandler('environmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId) {
        await this.handleEnvironmentChange(environmentId);
      }
    });

    this.coordinator.registerHandler('selectEntity', async (data) => {
      const logicalName = (data as { logicalName?: string })?.logicalName;
      if (logicalName) {
        await this.handleSelectEntity(logicalName);
      }
    });

    this.coordinator.registerHandler('switchTab', async (data) => {
      const tab = (data as { tab?: string })?.tab as 'attributes' | 'relationships' | 'keys' | 'privileges';
      if (tab) {
        await this.handleSwitchTab(tab);
      }
    });

    this.coordinator.registerHandler('viewAttributeDetail', async (data) => {
      const logicalName = (data as { logicalName?: string })?.logicalName;
      if (logicalName) {
        await this.handleViewAttributeDetail(logicalName);
      }
    });

    this.coordinator.registerHandler('viewRelationshipDetail', async (data) => {
      const schemaName = (data as { schemaName?: string })?.schemaName;
      if (schemaName) {
        await this.handleViewRelationshipDetail(schemaName);
      }
    });

    this.coordinator.registerHandler('viewKeyDetail', async (data) => {
      const logicalName = (data as { logicalName?: string })?.logicalName;
      if (logicalName) {
        await this.handleViewKeyDetail(logicalName);
      }
    });

    this.coordinator.registerHandler('viewPrivilegeDetail', async (data) => {
      const privilegeId = (data as { privilegeId?: string })?.privilegeId;
      if (privilegeId) {
        await this.handleViewPrivilegeDetail(privilegeId);
      }
    });

    this.coordinator.registerHandler('closeDetail', async () => {
      await this.handleCloseDetail();
    });

    this.coordinator.registerHandler('searchEntities', async (data) => {
      const searchText = (data as { searchText?: string })?.searchText;
      await this.handleSearchEntities(searchText || '');
    });
  }

  private async handleLoadEntityTree(): Promise<void> {
    try {
      this.logger.info('Loading entity tree');

      const viewModels = await this.loadEntityTreeUseCase.execute(this.currentEnvironmentId);

      // Data-driven update: Send tree data to frontend
      await this.panel.webview.postMessage({
        command: 'updateTree',
        data: {
          entities: viewModels
        }
      });
    } catch (error) {
      this.logger.error('Failed to load entity tree', error);
      await vscode.window.showErrorMessage('Failed to load entity tree');
    }
  }

  private async handleEnvironmentChange(environmentId: string): Promise<void> {
    this.logger.debug('Environment changed', { environmentId });

    try {
      this.currentEnvironmentId = environmentId;
      this.currentEntityLogicalName = null;

      const environment = await this.getEnvironmentById(environmentId);
      if (environment) {
        this.panel.title = `Metadata Browser - ${environment.name}`;
      }

      await this.handleLoadEntityTree();
    } catch (error) {
      this.logger.error('Failed to change environment', error);
      await vscode.window.showErrorMessage('Failed to change environment');
    }
  }

  private async handleSelectEntity(logicalName: string): Promise<void> {
    try {
      this.logger.info('Entity selected', { logicalName });

      this.currentEntityLogicalName = logicalName;
      this.currentTab = 'attributes'; // Reset to attributes tab

      // Load attributes for selected entity
      await this.loadCurrentTabData();
    } catch (error) {
      this.logger.error('Failed to load entity metadata', error);
      await vscode.window.showErrorMessage('Failed to load entity metadata');
    }
  }

  private async handleSwitchTab(tab: 'attributes' | 'relationships' | 'keys' | 'privileges'): Promise<void> {
    try {
      this.logger.debug('Switching tab', { tab });

      this.currentTab = tab;

      // Load data for new tab
      await this.loadCurrentTabData();
    } catch (error) {
      this.logger.error('Failed to switch tab', error);
      await vscode.window.showErrorMessage('Failed to switch tab');
    }
  }

  private async loadCurrentTabData(): Promise<void> {
    if (!this.currentEntityLogicalName) {
      return;
    }

    let viewModels: unknown[];

    switch (this.currentTab) {
      case 'attributes':
        viewModels = await this.loadEntityAttributesUseCase.execute(
          this.currentEnvironmentId,
          this.currentEntityLogicalName
        );
        break;
      case 'relationships':
        viewModels = await this.loadEntityRelationshipsUseCase.execute(
          this.currentEnvironmentId,
          this.currentEntityLogicalName
        );
        break;
      case 'keys':
        viewModels = await this.loadEntityKeysUseCase.execute(
          this.currentEnvironmentId,
          this.currentEntityLogicalName
        );
        break;
      case 'privileges':
        viewModels = await this.loadEntityPrivilegesUseCase.execute(
          this.currentEnvironmentId,
          this.currentEntityLogicalName
        );
        break;
    }

    // Data-driven update: Send tab data to frontend
    await this.panel.webview.postMessage({
      command: 'updateTabData',
      data: {
        tab: this.currentTab,
        rows: viewModels
      }
    });
  }

  private async handleViewAttributeDetail(logicalName: string): Promise<void> {
    // Load full attribute detail and show in right panel
    // Implementation deferred to Slice 3
  }

  private async handleViewRelationshipDetail(schemaName: string): Promise<void> {
    // Load full relationship detail and show in right panel
    // Implementation deferred to Slice 3
  }

  private async handleViewKeyDetail(logicalName: string): Promise<void> {
    // Load full key detail and show in right panel
    // Implementation deferred to Slice 3
  }

  private async handleViewPrivilegeDetail(privilegeId: string): Promise<void> {
    // Load full privilege detail and show in right panel
    // Implementation deferred to Slice 3
  }

  private async handleCloseDetail(): Promise<void> {
    await this.panel.webview.postMessage({
      command: 'hideDetailPanel'
    });
  }

  private async handleSearchEntities(searchText: string): Promise<void> {
    // Client-side filtering (instant feedback)
    // No backend call needed
    await this.panel.webview.postMessage({
      command: 'filterTree',
      data: {
        searchText
      }
    });
  }
}
```

#### Sections

```typescript
/**
 * Section for entity tree (left panel).
 */
export class MetadataTreeSection implements ISection {
  public readonly position = SectionPosition.Main; // Will be overridden by three-panel layout

  public render(data: SectionRenderData): string {
    const treeData = data.treeData || [];

    return `
      <div class="tree-container">
        <div class="tree-header">
          <input
            type="text"
            id="entitySearch"
            placeholder="Search entities..."
            class="tree-search"
          />
        </div>
        <div id="entityTree" class="tree-view">
          <!-- Tree rendered by MetadataTreeRenderer.js -->
        </div>
      </div>
    `;
  }
}

/**
 * Section for tabbed tables (middle panel).
 */
export class MetadataTabsSection implements ISection {
  public readonly position = SectionPosition.Main;

  public render(data: SectionRenderData): string {
    return `
      <div class="tabs-container">
        <div class="tabs-header">
          <button class="tab-button active" data-tab="attributes">Attributes</button>
          <button class="tab-button" data-tab="relationships">Relationships</button>
          <button class="tab-button" data-tab="keys">Keys</button>
          <button class="tab-button" data-tab="privileges">Privileges</button>
        </div>
        <div class="tabs-content">
          <div id="attributesTab" class="tab-pane active">
            <table id="attributesTable" class="metadata-table">
              <!-- Table rendered by MetadataTabsRenderer.js -->
            </table>
          </div>
          <div id="relationshipsTab" class="tab-pane hidden">
            <table id="relationshipsTable" class="metadata-table">
              <!-- Table rendered by MetadataTabsRenderer.js -->
            </table>
          </div>
          <div id="keysTab" class="tab-pane hidden">
            <table id="keysTable" class="metadata-table">
              <!-- Table rendered by MetadataTabsRenderer.js -->
            </table>
          </div>
          <div id="privilegesTab" class="tab-pane hidden">
            <table id="privilegesTable" class="metadata-table">
              <!-- Table rendered by MetadataTabsRenderer.js -->
            </table>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Section for detail panel (right panel).
 */
export class MetadataDetailSection implements ISection {
  public readonly position = SectionPosition.Detail;

  public render(data: SectionRenderData): string {
    return `
      <div class="detail-container hidden">
        <div class="detail-header">
          <button id="closeDetailBtn" class="close-button">×</button>
        </div>
        <div id="detailContent" class="detail-content">
          <!-- Detail rendered by MetadataDetailRenderer.js -->
        </div>
      </div>
    `;
  }
}
```

---

## Three-Panel Layout

### Layout Template (New)

The three-panel layout needs to be added to `SectionCompositionBehavior`:

```typescript
/**
 * Three-panel layout template (for Metadata Browser).
 * Left panel (tree) + Middle panel (tabs) + Right panel (detail).
 */
private threePanelTemplate(): string {
  return `
    <div class="panel-container three-panel">
      <div class="toolbar-section"><!-- TOOLBAR --></div>
      <div class="header-section"><!-- HEADER --></div>
      <div class="content-three-panel">
        <div class="left-panel"><!-- LEFT --></div>
        <div class="middle-panel"><!-- MAIN --></div>
        <div class="right-panel hidden"><!-- DETAIL --></div>
      </div>
    </div>
  `;
}
```

### CSS Structure

```css
/* Three-panel layout */
.panel-container.three-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.content-three-panel {
  display: grid;
  grid-template-columns: 300px 1fr 400px;
  flex: 1;
  overflow: hidden;
  gap: 1px;
  background: var(--vscode-panel-border);
}

.left-panel {
  background: var(--vscode-editor-background);
  overflow-y: auto;
  border-right: 1px solid var(--vscode-panel-border);
}

.middle-panel {
  background: var(--vscode-editor-background);
  overflow-y: auto;
}

.right-panel {
  background: var(--vscode-editor-background);
  overflow-y: auto;
  border-left: 1px solid var(--vscode-panel-border);
}

.right-panel.hidden {
  display: none;
  grid-column: 3 / 4;
}

/* When detail panel is shown */
.content-three-panel.detail-visible {
  grid-template-columns: 250px 1fr 450px;
}

.content-three-panel.detail-visible .right-panel {
  display: block;
}
```

---

## File Structure

```
src/features/metadataBrowser/
├── domain/
│   ├── entities/
│   │   ├── EntityMetadata.ts
│   │   ├── AttributeMetadata.ts
│   │   ├── RelationshipMetadata.ts
│   │   ├── KeyMetadata.ts
│   │   ├── PrivilegeMetadata.ts
│   │   ├── GlobalOptionSetMetadata.ts
│   │   └── OptionMetadata.ts
│   ├── valueObjects/
│   │   ├── LogicalName.ts
│   │   ├── SchemaName.ts
│   │   ├── DisplayName.ts
│   │   ├── AttributeType.ts
│   │   ├── RequiredLevel.ts
│   │   ├── RelationshipType.ts
│   │   ├── CascadeConfiguration.ts
│   │   └── PrivilegeType.ts
│   └── interfaces/
│       └── IEntityMetadataRepository.ts
│
├── application/
│   ├── useCases/
│   │   ├── LoadEntityTreeUseCase.ts
│   │   ├── LoadEntityAttributesUseCase.ts
│   │   ├── LoadEntityRelationshipsUseCase.ts
│   │   ├── LoadEntityKeysUseCase.ts
│   │   ├── LoadEntityPrivilegesUseCase.ts
│   │   └── LoadGlobalOptionSetsUseCase.ts
│   ├── viewModels/
│   │   ├── EntityTreeItemViewModel.ts
│   │   ├── EntityAttributeViewModel.ts
│   │   ├── EntityRelationshipViewModel.ts
│   │   ├── EntityKeyViewModel.ts
│   │   ├── EntityPrivilegeViewModel.ts
│   │   ├── GlobalOptionSetViewModel.ts
│   │   ├── AttributeDetailViewModel.ts
│   │   ├── RelationshipDetailViewModel.ts
│   │   ├── KeyDetailViewModel.ts
│   │   └── PrivilegeDetailViewModel.ts
│   └── mappers/
│       ├── EntityTreeItemViewModelMapper.ts
│       ├── EntityAttributeViewModelMapper.ts
│       ├── EntityRelationshipViewModelMapper.ts
│       ├── EntityKeyViewModelMapper.ts
│       ├── EntityPrivilegeViewModelMapper.ts
│       └── GlobalOptionSetViewModelMapper.ts
│
├── infrastructure/
│   ├── repositories/
│   │   └── DataverseEntityMetadataRepository.ts
│   └── dtos/
│       ├── EntityDefinitionDto.ts
│       ├── AttributeDto.ts
│       ├── RelationshipDto.ts
│       ├── EntityKeyDto.ts
│       ├── PrivilegeDto.ts
│       └── GlobalOptionSetDto.ts
│
└── presentation/
    ├── panels/
    │   └── MetadataBrowserPanel.ts
    ├── sections/
    │   ├── MetadataTreeSection.ts
    │   ├── MetadataTabsSection.ts
    │   └── MetadataDetailSection.ts
    └── renderers/ (TypeScript → compiled to JS)
        ├── MetadataTreeRenderer.ts
        ├── MetadataTabsRenderer.ts
        └── MetadataDetailRenderer.ts
```

**New Files:** 47 files
**Modified Files:**
- `src/shared/infrastructure/ui/behaviors/SectionCompositionBehavior.ts` (add three-panel template)
- `src/shared/infrastructure/ui/types/PanelLayout.ts` (already has ThreePanel enum)
**Total:** 49 files for this feature

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

```typescript
describe('EntityMetadata', () => {
  describe('isSystemEntity', () => {
    it('should return true when isCustomEntity is false', () => {
      const entity = new EntityMetadata(
        LogicalName.create('account'),
        SchemaName.create('Account'),
        DisplayName.create('Account'),
        DisplayName.create('Accounts'),
        null,
        'accounts',
        false, // isCustomEntity = false
        1,
        'accountid',
        'name',
        OwnershipType.UserOwned,
        []
      );

      expect(entity.isSystemEntity()).toBe(true);
    });

    it('should return false when isCustomEntity is true', () => {
      const entity = new EntityMetadata(
        LogicalName.create('new_customentity'),
        SchemaName.create('new_customentity'),
        DisplayName.create('Custom Entity'),
        DisplayName.create('Custom Entities'),
        null,
        'new_customentities',
        true, // isCustomEntity = true
        10001,
        'new_customentityid',
        'new_name',
        OwnershipType.UserOwned,
        []
      );

      expect(entity.isSystemEntity()).toBe(false);
    });
  });

  describe('getAttributeCount', () => {
    it('should return correct attribute count', () => {
      const attributes = [
        createTestAttribute('attr1'),
        createTestAttribute('attr2'),
        createTestAttribute('attr3')
      ];

      const entity = createTestEntity({ attributes });

      expect(entity.getAttributeCount()).toBe(3);
    });
  });

  describe('getAttributesByType', () => {
    it('should filter attributes by type', () => {
      const stringAttr = createTestAttribute('name', 'String');
      const lookupAttr = createTestAttribute('parentaccountid', 'Lookup');
      const integerAttr = createTestAttribute('numberofemployees', 'Integer');

      const entity = createTestEntity({
        attributes: [stringAttr, lookupAttr, integerAttr]
      });

      const lookupAttributes = entity.getAttributesByType(AttributeType.create('Lookup'));

      expect(lookupAttributes).toHaveLength(1);
      expect(lookupAttributes[0].getLogicalName().getValue()).toBe('parentaccountid');
    });
  });
});

describe('AttributeMetadata', () => {
  describe('isRequired', () => {
    it('should return true for ApplicationRequired', () => {
      const attribute = createTestAttribute('name', 'String', 'ApplicationRequired');

      expect(attribute.isRequired()).toBe(true);
    });

    it('should return true for SystemRequired', () => {
      const attribute = createTestAttribute('accountid', 'Uniqueidentifier', 'SystemRequired');

      expect(attribute.isRequired()).toBe(true);
    });

    it('should return false for None', () => {
      const attribute = createTestAttribute('description', 'Memo', 'None');

      expect(attribute.isRequired()).toBe(false);
    });
  });

  describe('getTypeDisplay', () => {
    it('should return formatted lookup type with target entity', () => {
      const attribute = new AttributeMetadata(
        LogicalName.create('parentaccountid'),
        SchemaName.create('ParentAccountId'),
        DisplayName.create('Parent Account'),
        null,
        AttributeType.create('Lookup'),
        false,
        RequiredLevel.create('None'),
        LogicalName.create('account'),
        null,
        null,
        LogicalName.create('account'), // lookup target
        null
      );

      expect(attribute.getTypeDisplay()).toBe('Lookup (account)');
    });

    it('should return simple type display for non-lookup', () => {
      const attribute = createTestAttribute('name', 'String');

      expect(attribute.getTypeDisplay()).toBe('String');
    });
  });
});

describe('LogicalName', () => {
  describe('create', () => {
    it('should create valid logical name', () => {
      const logicalName = LogicalName.create('account');

      expect(logicalName.getValue()).toBe('account');
    });

    it('should throw error for empty string', () => {
      expect(() => LogicalName.create('')).toThrow('Logical name cannot be empty');
    });

    it('should throw error for uppercase letters', () => {
      expect(() => LogicalName.create('Account')).toThrow('Logical name must be lowercase with no spaces');
    });

    it('should throw error for spaces', () => {
      expect(() => LogicalName.create('new entity')).toThrow('Logical name must be lowercase with no spaces');
    });
  });
});
```

### Application Tests (Target: 90% coverage)

```typescript
describe('LoadEntityTreeUseCase', () => {
  let useCase: LoadEntityTreeUseCase;
  let mockRepository: jest.Mocked<IEntityMetadataRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockRepository = {
      getAllEntities: jest.fn()
    } as any;
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    } as any;
    useCase = new LoadEntityTreeUseCase(mockRepository, mockLogger);
  });

  it('should load entity tree and map to ViewModels', async () => {
    const entities = [
      createTestEntity({ logicalName: 'account', isCustom: false }),
      createTestEntity({ logicalName: 'new_customentity', isCustom: true })
    ];

    mockRepository.getAllEntities.mockResolvedValue(entities);

    const result = await useCase.execute('env-123');

    expect(mockRepository.getAllEntities).toHaveBeenCalledWith('env-123');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('account');
    expect(result[0].isCustom).toBe(false);
    expect(result[1].id).toBe('new_customentity');
    expect(result[1].isCustom).toBe(true);
  });

  it('should log loading events', async () => {
    mockRepository.getAllEntities.mockResolvedValue([]);

    await useCase.execute('env-123');

    expect(mockLogger.info).toHaveBeenCalledWith('Loading entity tree', { environmentId: 'env-123' });
    expect(mockLogger.info).toHaveBeenCalledWith('Entity tree loaded', { count: 0 });
  });
});

describe('EntityAttributeViewModelMapper', () => {
  it('should map AttributeMetadata to ViewModel', () => {
    const attribute = createTestAttribute('name', 'String', 'ApplicationRequired');

    const viewModel = EntityAttributeViewModelMapper.toViewModel(attribute);

    expect(viewModel.logicalName).toBe('name');
    expect(viewModel.type).toBe('String');
    expect(viewModel.isRequired).toBe(true);
    expect(viewModel.isCustom).toBe(false);
  });

  it('should format maxLength as string', () => {
    const attribute = new AttributeMetadata(
      LogicalName.create('name'),
      SchemaName.create('Name'),
      DisplayName.create('Name'),
      null,
      AttributeType.create('String'),
      false,
      RequiredLevel.create('None'),
      LogicalName.create('account'),
      100, // maxLength
      null,
      null,
      null
    );

    const viewModel = EntityAttributeViewModelMapper.toViewModel(attribute);

    expect(viewModel.maxLength).toBe('100');
  });

  it('should handle null maxLength', () => {
    const attribute = createTestAttribute('description', 'Memo');

    const viewModel = EntityAttributeViewModelMapper.toViewModel(attribute);

    expect(viewModel.maxLength).toBeNull();
  });
});
```

### Infrastructure Tests (Optional - only for complex logic)

Test repository mapping logic if complex. Skip simple pass-through code.

```typescript
describe('DataverseEntityMetadataRepository', () => {
  describe('mapAttributeToDomain', () => {
    it('should map attribute DTO to domain entity', () => {
      const dto: AttributeDto = {
        LogicalName: 'name',
        SchemaName: 'Name',
        DisplayName: { UserLocalizedLabel: { Label: 'Account Name' } },
        Description: null,
        AttributeType: 'String',
        IsCustomAttribute: false,
        RequiredLevel: { Value: 'ApplicationRequired' },
        MaxLength: 100,
        Format: null,
        Targets: null,
        OptionSet: null
      };

      const repository = new DataverseEntityMetadataRepository(mockApiService, mockLogger);
      const attribute = (repository as any).mapAttributeToDomain(dto, 'account');

      expect(attribute.getLogicalName().getValue()).toBe('name');
      expect(attribute.getType().getValue()).toBe('String');
      expect(attribute.isRequired()).toBe(true);
      expect(attribute.getMaxLength()).toBe(100);
    });
  });
});
```

### Manual Testing Scenarios

1. **Happy path: Browse entity metadata**
   - Open Metadata Browser for environment
   - Select "account" entity in tree
   - View attributes tab (should show all account attributes)
   - Switch to Relationships tab (should show all relationships)
   - Switch to Keys tab (should show alternate keys)
   - Switch to Privileges tab (should show security privileges)
   - Click attribute display name (should open detail panel)
   - Close detail panel

2. **Edge case: Large entity (1000+ attributes)**
   - Select entity with many attributes (e.g., custom entity with extensive metadata)
   - Verify table loads in < 2 seconds
   - Verify scroll performance is smooth

3. **Edge case: Empty environment**
   - Connect to environment with no custom entities
   - Verify tree shows only system entities
   - Verify no errors

4. **Error case: API failure**
   - Disconnect network
   - Refresh entity tree
   - Verify error message displayed
   - Reconnect network and retry

5. **Search functionality**
   - Type "account" in search box
   - Verify tree filters instantly (client-side)
   - Verify search highlights matches

---

## Dependencies & Prerequisites

### External Dependencies
- [ ] VS Code APIs: Webview, WebviewPanel
- [ ] Dataverse Web API: EntityDefinitions endpoint
- [ ] No new NPM packages required

### Internal Prerequisites
- [ ] `PanelCoordinator` framework (exists)
- [ ] `SectionCompositionBehavior` (needs three-panel layout added)
- [ ] `IDataverseApiService` (exists)
- [ ] `ILogger` (exists)

### Breaking Changes
- [ ] None

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] Entities have behavior (not anemic data classes)
- [x] Zero external dependencies (no imports from outer layers)
- [x] Business logic in entities/domain services
- [x] Repository interfaces defined in domain
- [x] Value objects are immutable
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
- [x] HTML extracted to separate view files (sections/renderers)
- [x] Dependencies point inward (pres → app → domain)
- [x] Logging for user actions

**Type Safety:**
- [x] No `any` types without explicit justification
- [x] Explicit return types on all public methods
- [x] Proper null handling (no `!` assertions)
- [x] Type guards for runtime safety

---

## Extension Integration Checklist

**REQUIRED for all panels/commands:**

**Commands (for package.json):**
- [ ] Command ID defined: `power-platform-dev-suite.metadataBrowser`
- [ ] Command ID (pick environment): `power-platform-dev-suite.metadataBrowserPickEnvironment`
- [ ] Command titles specified
- [ ] Activation events defined
- [ ] Commands added to `"contributes.commands"` array

**Extension Registration (for extension.ts):**
- [ ] Feature initializer function created (`initializeMetadataBrowser()`)
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

### Decision 1: Three-Panel Layout
**Considered:** Two-panel layout (tree + tabs), separate detail window
**Chosen:** Three-panel layout (tree + tabs + detail)
**Rationale:**
- Keeps all metadata visible in single view
- No context switching between windows
- Pattern familiar from IDEs (VS Code, IntelliJ)
**Tradeoffs:**
- More complex layout code (new template in SectionCompositionBehavior)
- Requires CSS grid for responsive behavior
- Gained: Better UX, all info visible simultaneously

### Decision 2: Client-Side Tab Switching
**Considered:** Backend call per tab, full page refresh per tab
**Chosen:** Client-side tab switching (no backend call)
**Rationale:**
- Instant feedback (no network latency)
- Preserves scroll position and selection
- Reduces API calls
**Tradeoffs:**
- Requires all tab data loaded upfront
- Gained: Better performance and UX

### Decision 3: Repository Returns Full Entities
**Considered:** Repository returns DTOs, use cases map to domain
**Chosen:** Repository returns domain entities
**Rationale:**
- Infrastructure layer owns DTO → domain mapping
- Use cases work with rich domain entities (business logic available)
- Follows dependency inversion (infra implements domain contract)
**Tradeoffs:**
- Repository has more responsibility (mapping logic)
- Gained: Clean separation, use cases work with rich models

### Decision 4: Tree Search is Client-Side
**Considered:** Backend filtering via API, client-side filtering
**Chosen:** Client-side filtering
**Rationale:**
- Entity tree is small (typically < 1000 entities)
- Instant feedback (no network latency)
- Simpler implementation
**Tradeoffs:**
- All entities loaded upfront (acceptable for typical environments)
- Gained: Better UX (instant search)

---

## Review & Approval

### Design Phase
- [ ] design-architect design review (all layers)
- [ ] Human approval of design

### Implementation Phase (per slice)
- [ ] Slice 1 implemented and reviewed
- [ ] Slice 2 implemented and reviewed
- [ ] Slice 3 implemented and reviewed
- [ ] Slice 4 implemented and reviewed
- [ ] Slice 5 implemented and reviewed

### Final Approval
- [ ] All slices implemented
- [ ] Tests written and passing (npm test)
- [ ] Manual testing completed
- [ ] Documentation updated (if new patterns)
- [ ] code-guardian final approval

**Status:** Pending
**Approver:** [Name]
**Date:** [Date]

---

## Open Questions

- [ ] **Question 1:** Should global option sets appear in tree under separate "Global Option Sets" node, or mixed with entities?
  - **Recommendation:** Separate node for clarity

- [ ] **Question 2:** Should detail panel show raw JSON option for advanced users?
  - **Recommendation:** Yes, add "View JSON" button in detail panel (future enhancement)

- [ ] **Question 3:** Should tree support multi-select for comparing multiple entities?
  - **Recommendation:** No, keep simple for MVP. Can add in future enhancement.

- [ ] **Question 4:** Should we cache entity metadata to avoid repeated API calls?
  - **Recommendation:** Yes, add caching in Slice 6 (post-MVP). Cache invalidation on refresh.

- [ ] **Question 5:** Should middle panel tables support sorting/filtering?
  - **Recommendation:** Yes, reuse existing DataTableSection patterns which support sorting.

---

## References

- Related features: Plugin Trace Viewer (split panel pattern)
- External documentation: [Dataverse Web API - EntityDefinitions](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/entitymetadata)
- Design inspiration: VS Code Explorer (three-panel layout)
- Workflow guide: `.claude/WORKFLOW.md`
- Panel patterns: `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
- Clean Architecture: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
