# Metadata Browser - Technical Design

**Status:** Draft
**Date:** 2025-11-06
**Complexity:** Complex

---

## Overview

**User Problem:** Power Platform developers need to explore Dataverse table and choice (option set) metadata to understand schema structure, relationships, and properties for development and troubleshooting. Currently, they must use Power Apps Maker Portal or manually query APIs, which is slow and context-switching.

**Solution:** A 3-panel VS Code tool that provides fast, searchable access to entity metadata (attributes, keys, relationships, privileges) and global choices, with drill-down capabilities and quick navigation.

**Value:** Reduces context switching, accelerates schema discovery, and provides detailed metadata inspection within the developer's IDE, improving productivity for plugin development, data modeling, and troubleshooting.

---

## Requirements

### Functional Requirements
- [ ] Browse hierarchical tree of all tables and global choices in an environment
- [ ] Search/filter tree by display name or logical name
- [ ] Select table to view attributes, keys, relationships, and privileges
- [ ] Select choice to view option values
- [ ] Drill down into specific attribute or relationship details (Properties and Raw JSON tabs)
- [ ] Navigate to related entities from relationship rows
- [ ] Copy logical names to clipboard
- [ ] Open selected entity in Power Apps Maker Portal
- [ ] Refresh metadata to see latest schema changes
- [ ] Persist panel preferences per environment (collapsed sections, split ratios, left panel state)

### Non-Functional Requirements
- [ ] Tree loads in <2 seconds (all entities + choices)
- [ ] Entity metadata loads in <3 seconds (parallel API calls)
- [ ] UI remains responsive during data fetch (loading states)
- [ ] Client-side caching with 5-minute timeout
- [ ] Keyboard shortcuts for detail panel (Ctrl+A to select all)
- [ ] Accessible UI (ARIA labels, keyboard navigation)

### Success Criteria
- [ ] User can browse and search 300+ tables in <2 seconds
- [ ] User can view entity attributes without leaving VS Code
- [ ] User can drill down into attribute details via context menu
- [ ] User can navigate from relationship to related entity
- [ ] Preferences persist across sessions per environment
- [ ] All use case tests pass (90%+ coverage target)
- [ ] Domain entity tests pass (100% coverage target)

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can browse entity tree and view attributes"
**Goal:** Simplest end-to-end functionality (walking skeleton)

**Domain:**
- `EntityMetadata` entity with minimal fields (logicalName, displayName, isCustom)
- `AttributeMetadata` entity with basic fields (logicalName, displayName, attributeType)
- `IMetadataRepository` interface with `getEntityDefinitions()` and `getEntityAttributes()`

**Application:**
- `LoadEntityTreeUseCase` - Load all entities and choices
- `LoadEntityMetadataUseCase` - Load attributes for selected entity
- `EntityTreeItemViewModel` - DTO for tree items
- `AttributeViewModel` - DTO for attribute table rows

**Infrastructure:**
- `DataverseMetadataRepository` - Implement `getEntityDefinitions()` and `getEntityAttributes()` methods
- API calls to Dataverse metadata endpoints

**Presentation:**
- `MetadataBrowserPanel` - 3-panel layout (tree, content, detail - detail hidden initially)
- Entity tree on left (tables + choices sections)
- Attributes table in center (collapsible section)
- Search filter for tree

**Result:** WORKING FEATURE ✅ (user can select entity and see attributes table)

---

### Slice 2: "User can view keys, relationships, and privileges"
**Builds on:** Slice 1

**Domain:**
- `KeyMetadata` entity (name, type, keyAttributes)
- `RelationshipMetadata` entity (name, type, relatedEntity, referencingAttribute)
- `PrivilegeMetadata` entity (name, privilegeType, depth)

**Application:**
- Update `LoadEntityMetadataUseCase` to load all metadata sections in parallel
- `KeyViewModel`, `RelationshipViewModel`, `PrivilegeViewModel` DTOs

**Infrastructure:**
- Add repository methods: `getEntityKeys()`, `getRelationships()`, `getEntityPrivileges()`
- Parallel Promise.all() for efficient loading

**Presentation:**
- Add Keys, Relationships, Privileges sections (collapsible)
- Section headers show counts
- Default collapsed state (only attributes expanded)

**Result:** ENHANCED FEATURE ✅ (full entity metadata visible)

---

### Slice 3: "User can view choice metadata"
**Builds on:** Slice 2

**Domain:**
- `ChoiceMetadata` entity (name, displayName, isCustom)
- `ChoiceValueMetadata` entity (label, value, description)

**Application:**
- `LoadChoiceMetadataUseCase` - Load choice values
- `ChoiceValueViewModel` - DTO for choice values table

**Infrastructure:**
- `getGlobalOptionSets()` method
- `getOptionSetMetadata(name)` method

**Presentation:**
- Choice tree items with icon (🔽)
- Choice values section (only visible when choice selected)
- Mode switching (entity-mode vs choice-mode CSS classes)

**Result:** ENHANCED FEATURE ✅ (choices browsable)

---

### Slice 4: "User can drill down into details"
**Builds on:** Slice 3

**Domain:**
- No changes (metadata already loaded)

**Application:**
- No new use cases (detail view uses cached metadata)

**Presentation:**
- Split panel behavior (middle + right panels)
- Detail panel with two tabs (Properties, Raw Data)
- Context menu on attribute and relationship rows ("View Details")
- Properties tab: Flat table rendering all fields
- Raw Data tab: JSON viewer component
- Close button and keyboard shortcuts

**Result:** ENHANCED FEATURE ✅ (detailed inspection available)

---

### Slice 5: "User can navigate and refresh"
**Builds on:** Slice 4

**Domain:**
- No changes

**Application:**
- `NavigateToRelatedEntityUseCase` - Load entity by logical name from relationship row
- `RefreshMetadataUseCase` - Clear cache and reload current selection

**Infrastructure:**
- Cache invalidation method

**Presentation:**
- "Open Related Entity" context menu on relationships
- "Open in Maker" action bar button
- "Refresh" action bar button
- Copy logical name context menu
- Environment selector integration

**Result:** COMPLETE FEATURE ✅ (full functionality)

---

### Slice 6: "Preferences persist per environment"
**Builds on:** Slice 5

**Domain:**
- No changes (preferences are infrastructure concern)

**Application:**
- No changes

**Infrastructure:**
- Extend StateManager for per-environment preferences

**Presentation:**
- Persist collapsed sections state
- Persist split panel ratio
- Persist left panel collapsed state
- Load preferences on environment switch

**Result:** POLISHED FEATURE ✅ (user experience optimized)

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - MetadataBrowserPanel orchestrates use cases               │
│ - Maps domain entities → ViewModels (via mappers)          │
│ - HTML extracted to separate view file                     │
│ - Tree interaction behavior in JavaScript                  │
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
│ - Value objects (immutable, validated)                     │
│ - Repository interfaces (domain defines contracts)         │
│ - ZERO external dependencies                               │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - DataverseMetadataRepository implements domain interface  │
│ - Dataverse API integration                                 │
│ - DTO mapping (API → Domain entities)                      │
│ - Caching with 5-minute timeout                            │
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
 * Represents Dataverse entity (table) metadata with rich behavior.
 *
 * Business Rules:
 * - Custom entities have logical names with prefixes (e.g., "new_", "cr123_")
 * - System entities are predefined by Microsoft (e.g., "account", "contact")
 * - Entity type determines available metadata sections
 *
 * Rich behavior (NOT anemic):
 * - isCustomEntity(): boolean
 * - isSystemEntity(): boolean
 * - hasAttributes(): boolean
 * - requiresFullLoad(): boolean
 */
export class EntityMetadata {
  constructor(
    private readonly metadataId: string,
    private readonly logicalName: string,
    private readonly schemaName: string,
    private readonly displayName: string,
    private readonly description: string,
    private readonly entitySetName: string,
    private readonly primaryIdAttribute: string,
    private readonly primaryNameAttribute: string | null,
    private readonly isManaged: boolean,
    private readonly isCustomizable: boolean,
    private readonly objectTypeCode: number
  ) {
    this.validateInvariants();
  }

  /**
   * Validates business invariants on construction.
   * @throws {ValidationError} if invariants violated
   */
  private validateInvariants(): void {
    if (!this.logicalName || this.logicalName.trim().length === 0) {
      throw new ValidationError('EntityMetadata', 'logicalName', this.logicalName, 'Cannot be empty');
    }

    if (!this.metadataId || this.metadataId.trim().length === 0) {
      throw new ValidationError('EntityMetadata', 'metadataId', this.metadataId, 'Cannot be empty');
    }
  }

  /**
   * Determines if entity is custom (created by user/partner).
   *
   * Business Rule: Custom entities have prefixes in logical name
   *
   * @returns True if custom entity, false if system entity
   */
  public isCustomEntity(): boolean {
    // Custom entities have prefixes like "new_", "cr123_"
    return /^[a-z]+\d*_/.test(this.logicalName);
  }

  /**
   * Determines if entity is system entity (predefined by Microsoft).
   */
  public isSystemEntity(): boolean {
    return !this.isCustomEntity();
  }

  /**
   * Gets display label for tree rendering.
   *
   * @returns Display name or logical name if display name unavailable
   */
  public getDisplayLabel(): string {
    return this.displayName && this.displayName.trim().length > 0
      ? this.displayName
      : this.logicalName;
  }

  /**
   * Gets icon for tree rendering based on entity type.
   *
   * @returns Emoji icon (🏷️ for custom, 📋 for system)
   */
  public getIcon(): string {
    return this.isCustomEntity() ? '🏷️' : '📋';
  }

  // Type-safe getters
  public getMetadataId(): string { return this.metadataId; }
  public getLogicalName(): string { return this.logicalName; }
  public getSchemaName(): string { return this.schemaName; }
  public getDisplayName(): string { return this.displayName; }
  public getDescription(): string { return this.description; }
  public getEntitySetName(): string { return this.entitySetName; }
  public getPrimaryIdAttribute(): string { return this.primaryIdAttribute; }
  public getPrimaryNameAttribute(): string | null { return this.primaryNameAttribute; }
  public getIsManaged(): boolean { return this.isManaged; }
  public getIsCustomizable(): boolean { return this.isCustomizable; }
  public getObjectTypeCode(): number { return this.objectTypeCode; }
}
```

```typescript
/**
 * Represents entity attribute (field) metadata with behavior.
 *
 * Business Rules:
 * - Required level determines if field is mandatory
 * - Attribute type determines available properties (maxLength, targets, etc.)
 * - String attributes have maxLength constraint
 * - Lookup attributes have Targets array
 *
 * Rich behavior:
 * - isRequired(): boolean
 * - isString(): boolean
 * - isLookup(): boolean
 * - isPicklist(): boolean
 * - getRequiredLevelLabel(): string
 */
export class AttributeMetadata {
  constructor(
    private readonly metadataId: string,
    private readonly logicalName: string,
    private readonly schemaName: string,
    private readonly displayName: string,
    private readonly description: string,
    private readonly attributeType: string,
    private readonly attributeTypeName: string,
    private readonly requiredLevel: RequiredLevel,
    private readonly isCustomAttribute: boolean,
    private readonly isManaged: boolean,
    private readonly isPrimaryId: boolean,
    private readonly isPrimaryName: boolean,
    private readonly maxLength: number | null = null,
    private readonly targets: string[] | null = null,
    private readonly optionSet: OptionSetMetadata | null = null
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (!this.logicalName || this.logicalName.trim().length === 0) {
      throw new ValidationError('AttributeMetadata', 'logicalName', this.logicalName, 'Cannot be empty');
    }
  }

  /**
   * Determines if attribute is required.
   *
   * Business Rule: SystemRequired and ApplicationRequired are both mandatory
   */
  public isRequired(): boolean {
    return this.requiredLevel === RequiredLevel.SystemRequired ||
           this.requiredLevel === RequiredLevel.ApplicationRequired;
  }

  /**
   * Checks if attribute is string type with maxLength constraint.
   */
  public isString(): boolean {
    return this.attributeType === 'String' || this.attributeTypeName === 'StringType';
  }

  /**
   * Checks if attribute is lookup (foreign key).
   */
  public isLookup(): boolean {
    return this.attributeType === 'Lookup' || this.attributeTypeName === 'LookupType';
  }

  /**
   * Checks if attribute is picklist (dropdown).
   */
  public isPicklist(): boolean {
    return this.attributeType === 'Picklist' || this.attributeTypeName === 'PicklistType';
  }

  /**
   * Gets user-friendly required level label.
   *
   * @returns Label for UI display
   */
  public getRequiredLevelLabel(): string {
    switch (this.requiredLevel) {
      case RequiredLevel.None:
        return 'Optional';
      case RequiredLevel.SystemRequired:
        return 'System Required';
      case RequiredLevel.ApplicationRequired:
        return 'Business Required';
      case RequiredLevel.Recommended:
        return 'Business Recommended';
      default:
        return 'Unknown';
    }
  }

  /**
   * Gets max length value or placeholder.
   *
   * @returns Max length number or '-' if not applicable
   */
  public getMaxLengthDisplay(): string {
    return this.maxLength !== null ? this.maxLength.toString() : '-';
  }

  /**
   * Gets display label for tree/table rendering.
   */
  public getDisplayLabel(): string {
    return this.displayName && this.displayName.trim().length > 0
      ? this.displayName
      : this.logicalName;
  }

  // Type-safe getters
  public getMetadataId(): string { return this.metadataId; }
  public getLogicalName(): string { return this.logicalName; }
  public getSchemaName(): string { return this.schemaName; }
  public getDisplayName(): string { return this.displayName; }
  public getDescription(): string { return this.description; }
  public getAttributeType(): string { return this.attributeType; }
  public getAttributeTypeName(): string { return this.attributeTypeName; }
  public getRequiredLevel(): RequiredLevel { return this.requiredLevel; }
  public getIsCustomAttribute(): boolean { return this.isCustomAttribute; }
  public getIsManaged(): boolean { return this.isManaged; }
  public getIsPrimaryId(): boolean { return this.isPrimaryId; }
  public getIsPrimaryName(): boolean { return this.isPrimaryName; }
  public getMaxLength(): number | null { return this.maxLength; }
  public getTargets(): string[] | null { return this.targets; }
  public getOptionSet(): OptionSetMetadata | null { return this.optionSet; }
}
```

```typescript
/**
 * Represents entity key metadata (primary or alternate keys).
 *
 * Business Rules:
 * - Single attribute key = Primary key
 * - Multiple attribute key = Alternate key
 *
 * Rich behavior:
 * - isPrimaryKey(): boolean
 * - isAlternateKey(): boolean
 * - getKeyAttributesDisplay(): string
 */
export class KeyMetadata {
  constructor(
    private readonly metadataId: string,
    private readonly logicalName: string,
    private readonly schemaName: string,
    private readonly displayName: string,
    private readonly keyAttributes: string[],
    private readonly isManaged: boolean,
    private readonly entityKeyIndexStatus: string
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (!this.keyAttributes || this.keyAttributes.length === 0) {
      throw new ValidationError('KeyMetadata', 'keyAttributes', this.keyAttributes, 'Must have at least one attribute');
    }
  }

  /**
   * Determines if key is primary key.
   *
   * Business Rule: Single attribute keys are typically primary keys
   */
  public isPrimaryKey(): boolean {
    return this.keyAttributes.length === 1;
  }

  /**
   * Determines if key is alternate key.
   */
  public isAlternateKey(): boolean {
    return this.keyAttributes.length > 1;
  }

  /**
   * Gets type label for UI display.
   *
   * @returns 'Primary' or 'Alternate'
   */
  public getTypeLabel(): string {
    return this.isPrimaryKey() ? 'Primary' : 'Alternate';
  }

  /**
   * Gets comma-separated list of key attributes.
   *
   * @returns Attribute names joined by ', '
   */
  public getKeyAttributesDisplay(): string {
    return this.keyAttributes.join(', ');
  }

  public getDisplayLabel(): string {
    return this.displayName && this.displayName.trim().length > 0
      ? this.displayName
      : this.logicalName;
  }

  // Type-safe getters
  public getMetadataId(): string { return this.metadataId; }
  public getLogicalName(): string { return this.logicalName; }
  public getSchemaName(): string { return this.schemaName; }
  public getDisplayName(): string { return this.displayName; }
  public getKeyAttributes(): string[] { return this.keyAttributes; }
  public getIsManaged(): boolean { return this.isManaged; }
  public getEntityKeyIndexStatus(): string { return this.entityKeyIndexStatus; }
}
```

```typescript
/**
 * Represents entity relationship metadata (1:N, N:1, N:N).
 *
 * Business Rules:
 * - 1:N = One-to-Many (parent to children)
 * - N:1 = Many-to-One (child to parent)
 * - N:N = Many-to-Many (via intersect entity)
 *
 * Rich behavior:
 * - isOneToMany(): boolean
 * - isManyToOne(): boolean
 * - isManyToMany(): boolean
 * - getRelatedEntityName(): string
 */
export class RelationshipMetadata {
  constructor(
    private readonly metadataId: string,
    private readonly schemaName: string,
    private readonly relationshipType: RelationshipType,
    private readonly referencedEntity: string,
    private readonly referencingEntity: string,
    private readonly referencingAttribute: string,
    private readonly isManaged: boolean,
    private readonly isCustomRelationship: boolean,
    private readonly entity1LogicalName: string | null = null,
    private readonly entity2LogicalName: string | null = null,
    private readonly intersectEntityName: string | null = null
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (!this.schemaName || this.schemaName.trim().length === 0) {
      throw new ValidationError('RelationshipMetadata', 'schemaName', this.schemaName, 'Cannot be empty');
    }

    if (this.relationshipType === RelationshipType.ManyToMany) {
      if (!this.entity1LogicalName || !this.entity2LogicalName) {
        throw new ValidationError('RelationshipMetadata', 'entity1/entity2', null, 'Required for N:N relationships');
      }
    }
  }

  /**
   * Checks if relationship is One-to-Many (1:N).
   */
  public isOneToMany(): boolean {
    return this.relationshipType === RelationshipType.OneToMany;
  }

  /**
   * Checks if relationship is Many-to-One (N:1).
   */
  public isManyToOne(): boolean {
    return this.relationshipType === RelationshipType.ManyToOne;
  }

  /**
   * Checks if relationship is Many-to-Many (N:N).
   */
  public isManyToMany(): boolean {
    return this.relationshipType === RelationshipType.ManyToMany;
  }

  /**
   * Gets relationship type label for UI.
   *
   * @returns '1:N', 'N:1', or 'N:N'
   */
  public getTypeLabel(): string {
    switch (this.relationshipType) {
      case RelationshipType.OneToMany:
        return '1:N';
      case RelationshipType.ManyToOne:
        return 'N:1';
      case RelationshipType.ManyToMany:
        return 'N:N';
      default:
        return 'Unknown';
    }
  }

  /**
   * Gets related entity name for display.
   *
   * For N:N, returns both entities with separator.
   */
  public getRelatedEntityDisplay(): string {
    if (this.isManyToMany()) {
      return `${this.entity1LogicalName} ↔ ${this.entity2LogicalName}`;
    }

    return this.referencedEntity;
  }

  /**
   * Gets referencing attribute display.
   *
   * For N:N, returns intersect entity name.
   */
  public getReferencingAttributeDisplay(): string {
    if (this.isManyToMany() && this.intersectEntityName) {
      return this.intersectEntityName;
    }

    return this.referencingAttribute;
  }

  /**
   * Gets list of related entity names for navigation.
   *
   * For N:N, returns both entities. For 1:N/N:1, returns single entity.
   *
   * @returns Array of entity logical names
   */
  public getNavigableEntityNames(): string[] {
    if (this.isManyToMany()) {
      return [this.entity1LogicalName!, this.entity2LogicalName!];
    }

    return [this.referencedEntity];
  }

  // Type-safe getters
  public getMetadataId(): string { return this.metadataId; }
  public getSchemaName(): string { return this.schemaName; }
  public getRelationshipType(): RelationshipType { return this.relationshipType; }
  public getReferencedEntity(): string { return this.referencedEntity; }
  public getReferencingEntity(): string { return this.referencingEntity; }
  public getReferencingAttribute(): string { return this.referencingAttribute; }
  public getIsManaged(): boolean { return this.isManaged; }
  public getIsCustomRelationship(): boolean { return this.isCustomRelationship; }
  public getEntity1LogicalName(): string | null { return this.entity1LogicalName; }
  public getEntity2LogicalName(): string | null { return this.entity2LogicalName; }
  public getIntersectEntityName(): string | null { return this.intersectEntityName; }
}
```

```typescript
/**
 * Represents entity privilege metadata (CRUD permissions).
 *
 * Business Rules:
 * - Privileges define security depth (Basic, Local, Deep, Global)
 * - Each privilege type (Create, Read, Update, Delete) has separate permissions
 *
 * Rich behavior:
 * - getDepthLabel(): string
 * - hasBasicDepth(): boolean
 * - hasLocalDepth(): boolean
 * - hasDeepDepth(): boolean
 * - hasGlobalDepth(): boolean
 */
export class PrivilegeMetadata {
  constructor(
    private readonly privilegeId: string,
    private readonly name: string,
    private readonly privilegeType: string,
    private readonly canBeBasic: boolean,
    private readonly canBeLocal: boolean,
    private readonly canBeDeep: boolean,
    private readonly canBeGlobal: boolean
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (!this.privilegeId || this.privilegeId.trim().length === 0) {
      throw new ValidationError('PrivilegeMetadata', 'privilegeId', this.privilegeId, 'Cannot be empty');
    }
  }

  /**
   * Gets comma-separated list of available depth levels.
   *
   * @returns 'Basic, Local, Deep, Global' (as applicable)
   */
  public getDepthLabel(): string {
    const depths: string[] = [];

    if (this.canBeBasic) depths.push('Basic');
    if (this.canBeLocal) depths.push('Local');
    if (this.canBeDeep) depths.push('Deep');
    if (this.canBeGlobal) depths.push('Global');

    return depths.length > 0 ? depths.join(', ') : 'None';
  }

  // Depth check methods
  public hasBasicDepth(): boolean { return this.canBeBasic; }
  public hasLocalDepth(): boolean { return this.canBeLocal; }
  public hasDeepDepth(): boolean { return this.canBeDeep; }
  public hasGlobalDepth(): boolean { return this.canBeGlobal; }

  // Type-safe getters
  public getPrivilegeId(): string { return this.privilegeId; }
  public getName(): string { return this.name; }
  public getPrivilegeType(): string { return this.privilegeType; }
  public getCanBeBasic(): boolean { return this.canBeBasic; }
  public getCanBeLocal(): boolean { return this.canBeLocal; }
  public getCanBeDeep(): boolean { return this.canBeDeep; }
  public getCanBeGlobal(): boolean { return this.canBeGlobal; }
}
```

```typescript
/**
 * Represents global option set (choice) metadata.
 *
 * Business Rules:
 * - Global choices are reusable across entities
 * - Each option has numeric value and label
 *
 * Rich behavior:
 * - isCustomChoice(): boolean
 * - hasOptions(): boolean
 * - getOptionCount(): number
 */
export class ChoiceMetadata {
  constructor(
    private readonly metadataId: string,
    private readonly name: string,
    private readonly displayName: string,
    private readonly description: string,
    private readonly isCustomOptionSet: boolean,
    private readonly isManaged: boolean,
    private readonly isGlobal: boolean,
    private readonly options: OptionMetadata[]
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new ValidationError('ChoiceMetadata', 'name', this.name, 'Cannot be empty');
    }
  }

  /**
   * Checks if choice is custom (user/partner created).
   */
  public isCustomChoice(): boolean {
    return this.isCustomOptionSet;
  }

  /**
   * Checks if choice has options.
   */
  public hasOptions(): boolean {
    return this.options && this.options.length > 0;
  }

  /**
   * Gets number of options in choice.
   */
  public getOptionCount(): number {
    return this.options ? this.options.length : 0;
  }

  /**
   * Gets display label for tree rendering.
   */
  public getDisplayLabel(): string {
    return this.displayName && this.displayName.trim().length > 0
      ? this.displayName
      : this.name;
  }

  /**
   * Gets icon for tree rendering based on choice type.
   *
   * @returns Emoji icon (🔽 for all choices)
   */
  public getIcon(): string {
    return '🔽';
  }

  // Type-safe getters
  public getMetadataId(): string { return this.metadataId; }
  public getName(): string { return this.name; }
  public getDisplayName(): string { return this.displayName; }
  public getDescription(): string { return this.description; }
  public getIsCustomOptionSet(): boolean { return this.isCustomOptionSet; }
  public getIsManaged(): boolean { return this.isManaged; }
  public getIsGlobal(): boolean { return this.isGlobal; }
  public getOptions(): OptionMetadata[] { return this.options; }
}
```

```typescript
/**
 * Represents a single option within a choice.
 *
 * Business Rules:
 * - Each option has unique numeric value
 * - Label is displayed to users
 */
export class OptionMetadata {
  constructor(
    private readonly value: number,
    private readonly label: string,
    private readonly description: string,
    private readonly color: string | null,
    private readonly isManaged: boolean
  ) {
    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (this.value === null || this.value === undefined) {
      throw new ValidationError('OptionMetadata', 'value', this.value, 'Cannot be null');
    }
  }

  /**
   * Gets display label for option.
   */
  public getDisplayLabel(): string {
    return this.label && this.label.trim().length > 0
      ? this.label
      : this.value.toString();
  }

  /**
   * Gets description display value.
   */
  public getDescriptionDisplay(): string {
    return this.description && this.description.trim().length > 0
      ? this.description
      : '';
  }

  // Type-safe getters
  public getValue(): number { return this.value; }
  public getLabel(): string { return this.label; }
  public getDescription(): string { return this.description; }
  public getColor(): string | null { return this.color; }
  public getIsManaged(): boolean { return this.isManaged; }
}
```

#### Value Objects

```typescript
/**
 * Required level enum for attributes.
 */
export enum RequiredLevel {
  None = 'None',
  SystemRequired = 'SystemRequired',
  ApplicationRequired = 'ApplicationRequired',
  Recommended = 'Recommended'
}

/**
 * Relationship type enum.
 */
export enum RelationshipType {
  OneToMany = 'OneToMany',
  ManyToOne = 'ManyToOne',
  ManyToMany = 'ManyToMany'
}
```

#### Repository Interfaces

```typescript
/**
 * Repository interface for metadata operations.
 *
 * Defined in domain layer, implemented by infrastructure.
 */
export interface IMetadataRepository {
  /**
   * Retrieve all entity definitions for an environment.
   *
   * @param environmentId - Environment ID
   * @returns Array of entity metadata
   */
  getEntityDefinitions(environmentId: string): Promise<EntityMetadata[]>;

  /**
   * Retrieve all global option sets (choices) for an environment.
   *
   * @param environmentId - Environment ID
   * @returns Array of choice metadata
   */
  getGlobalOptionSets(environmentId: string): Promise<ChoiceMetadata[]>;

  /**
   * Retrieve complete metadata for a specific entity.
   *
   * Includes attributes, keys, relationships, privileges.
   *
   * @param environmentId - Environment ID
   * @param entityLogicalName - Entity logical name
   * @returns Complete entity metadata
   */
  getCompleteEntityMetadata(
    environmentId: string,
    entityLogicalName: string
  ): Promise<CompleteEntityMetadata>;

  /**
   * Retrieve entity attributes with expanded option set data.
   *
   * @param environmentId - Environment ID
   * @param entityLogicalName - Entity logical name
   * @returns Array of attribute metadata
   */
  getEntityAttributes(
    environmentId: string,
    entityLogicalName: string
  ): Promise<AttributeMetadata[]>;

  /**
   * Retrieve entity keys.
   *
   * @param environmentId - Environment ID
   * @param entityLogicalName - Entity logical name
   * @returns Array of key metadata
   */
  getEntityKeys(
    environmentId: string,
    entityLogicalName: string
  ): Promise<KeyMetadata[]>;

  /**
   * Retrieve entity relationships (1:N, N:1, N:N).
   *
   * @param environmentId - Environment ID
   * @param entityLogicalName - Entity logical name
   * @returns Array of relationship metadata
   */
  getEntityRelationships(
    environmentId: string,
    entityLogicalName: string
  ): Promise<RelationshipMetadata[]>;

  /**
   * Retrieve entity privileges.
   *
   * @param environmentId - Environment ID
   * @param entityLogicalName - Entity logical name
   * @returns Array of privilege metadata
   */
  getEntityPrivileges(
    environmentId: string,
    entityLogicalName: string
  ): Promise<PrivilegeMetadata[]>;

  /**
   * Retrieve choice metadata with options.
   *
   * @param environmentId - Environment ID
   * @param choiceName - Choice name
   * @returns Choice metadata with options
   */
  getOptionSetMetadata(
    environmentId: string,
    choiceName: string
  ): Promise<ChoiceMetadata>;

  /**
   * Clear cache for environment (used by refresh).
   *
   * @param environmentId - Environment ID
   */
  clearCache(environmentId: string): void;
}

/**
 * Aggregate containing complete entity metadata.
 */
export interface CompleteEntityMetadata {
  readonly entity: EntityMetadata;
  readonly attributes: AttributeMetadata[];
  readonly keys: KeyMetadata[];
  readonly relationships: RelationshipMetadata[];
  readonly privileges: PrivilegeMetadata[];
}
```

---

### Application Layer Types

#### Use Cases

```typescript
/**
 * Load entity and choice tree for an environment.
 *
 * Orchestrates: Repository fetch → Sort by logical name → Map to ViewModels
 */
export class LoadEntityTreeUseCase {
  constructor(
    private readonly repository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(environmentId: string): Promise<EntityTreeResponse> {
    this.logger.info('Loading entity tree', { environmentId });

    try {
      // Orchestration: Fetch entities and choices in parallel
      const [entities, choices] = await Promise.all([
        this.repository.getEntityDefinitions(environmentId),
        this.repository.getGlobalOptionSets(environmentId)
      ]);

      // Orchestration: Sort by logical name (domain provides method)
      const sortedEntities = entities.sort((a, b) =>
        a.getLogicalName().localeCompare(b.getLogicalName())
      );

      const sortedChoices = choices.sort((a, b) =>
        a.getName().localeCompare(b.getName())
      );

      // Orchestration: Map to ViewModels
      const entityViewModels = sortedEntities.map(entity =>
        EntityTreeItemViewModelMapper.toViewModel(entity)
      );

      const choiceViewModels = sortedChoices.map(choice =>
        ChoiceTreeItemViewModelMapper.toViewModel(choice)
      );

      this.logger.info('Entity tree loaded', {
        entitiesCount: entityViewModels.length,
        choicesCount: choiceViewModels.length
      });

      return {
        entities: entityViewModels,
        choices: choiceViewModels
      };
    } catch (error) {
      this.logger.error('Failed to load entity tree', error as Error, { environmentId });
      throw error;
    }
  }
}

/**
 * Response DTO for entity tree.
 */
export interface EntityTreeResponse {
  readonly entities: EntityTreeItemViewModel[];
  readonly choices: ChoiceTreeItemViewModel[];
}
```

```typescript
/**
 * Load complete metadata for selected entity.
 *
 * Orchestrates: Parallel repository fetches → Map to ViewModels
 */
export class LoadEntityMetadataUseCase {
  constructor(
    private readonly repository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(request: LoadEntityMetadataRequest): Promise<EntityMetadataResponse> {
    this.logger.info('Loading entity metadata', {
      environmentId: request.environmentId,
      entityLogicalName: request.entityLogicalName
    });

    try {
      // Orchestration: Load complete metadata (repository does parallel fetch internally)
      const completeMetadata = await this.repository.getCompleteEntityMetadata(
        request.environmentId,
        request.entityLogicalName
      );

      // Orchestration: Map to ViewModels
      const attributeViewModels = completeMetadata.attributes.map(attr =>
        AttributeViewModelMapper.toViewModel(attr)
      );

      const keyViewModels = completeMetadata.keys.map(key =>
        KeyViewModelMapper.toViewModel(key)
      );

      const relationshipViewModels = completeMetadata.relationships.map(rel =>
        RelationshipViewModelMapper.toViewModel(rel)
      );

      const privilegeViewModels = completeMetadata.privileges.map(priv =>
        PrivilegeViewModelMapper.toViewModel(priv)
      );

      this.logger.info('Entity metadata loaded', {
        attributesCount: attributeViewModels.length,
        keysCount: keyViewModels.length,
        relationshipsCount: relationshipViewModels.length,
        privilegesCount: privilegeViewModels.length
      });

      return {
        entity: EntityViewModelMapper.toViewModel(completeMetadata.entity),
        attributes: attributeViewModels,
        keys: keyViewModels,
        relationships: relationshipViewModels,
        privileges: privilegeViewModels
      };
    } catch (error) {
      this.logger.error('Failed to load entity metadata', error as Error, {
        environmentId: request.environmentId,
        entityLogicalName: request.entityLogicalName
      });
      throw error;
    }
  }
}

export interface LoadEntityMetadataRequest {
  readonly environmentId: string;
  readonly entityLogicalName: string;
}

export interface EntityMetadataResponse {
  readonly entity: EntityViewModel;
  readonly attributes: AttributeViewModel[];
  readonly keys: KeyViewModel[];
  readonly relationships: RelationshipViewModel[];
  readonly privileges: PrivilegeViewModel[];
}
```

```typescript
/**
 * Load choice metadata with options.
 *
 * Orchestrates: Repository fetch → Sort options by value → Map to ViewModels
 */
export class LoadChoiceMetadataUseCase {
  constructor(
    private readonly repository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(request: LoadChoiceMetadataRequest): Promise<ChoiceMetadataResponse> {
    this.logger.info('Loading choice metadata', {
      environmentId: request.environmentId,
      choiceName: request.choiceName
    });

    try {
      // Orchestration: Fetch choice metadata
      const choice = await this.repository.getOptionSetMetadata(
        request.environmentId,
        request.choiceName
      );

      // Orchestration: Sort options by value
      const sortedOptions = choice.getOptions().sort((a, b) =>
        a.getValue() - b.getValue()
      );

      // Orchestration: Map to ViewModels
      const optionViewModels = sortedOptions.map(option =>
        OptionViewModelMapper.toViewModel(option)
      );

      this.logger.info('Choice metadata loaded', {
        optionsCount: optionViewModels.length
      });

      return {
        choice: ChoiceViewModelMapper.toViewModel(choice),
        options: optionViewModels
      };
    } catch (error) {
      this.logger.error('Failed to load choice metadata', error as Error, {
        environmentId: request.environmentId,
        choiceName: request.choiceName
      });
      throw error;
    }
  }
}

export interface LoadChoiceMetadataRequest {
  readonly environmentId: string;
  readonly choiceName: string;
}

export interface ChoiceMetadataResponse {
  readonly choice: ChoiceViewModel;
  readonly options: OptionViewModel[];
}
```

```typescript
/**
 * Navigate to related entity from relationship row.
 *
 * Orchestrates: Parse entity names → Load target entity metadata
 */
export class NavigateToRelatedEntityUseCase {
  constructor(
    private readonly loadEntityMetadataUseCase: LoadEntityMetadataUseCase,
    private readonly logger: ILogger
  ) {}

  public async execute(request: NavigateToRelatedEntityRequest): Promise<EntityMetadataResponse> {
    this.logger.info('Navigating to related entity', {
      environmentId: request.environmentId,
      targetEntityLogicalName: request.targetEntityLogicalName
    });

    // Orchestration: Delegate to load entity metadata use case
    return await this.loadEntityMetadataUseCase.execute({
      environmentId: request.environmentId,
      entityLogicalName: request.targetEntityLogicalName
    });
  }
}

export interface NavigateToRelatedEntityRequest {
  readonly environmentId: string;
  readonly targetEntityLogicalName: string;
}
```

```typescript
/**
 * Refresh metadata (clear cache and reload current selection).
 *
 * Orchestrates: Clear cache → Reload tree and current selection
 */
export class RefreshMetadataUseCase {
  constructor(
    private readonly repository: IMetadataRepository,
    private readonly loadEntityTreeUseCase: LoadEntityTreeUseCase,
    private readonly logger: ILogger
  ) {}

  public async execute(environmentId: string): Promise<EntityTreeResponse> {
    this.logger.info('Refreshing metadata', { environmentId });

    try {
      // Orchestration: Clear cache
      this.repository.clearCache(environmentId);

      // Orchestration: Reload tree
      const treeResponse = await this.loadEntityTreeUseCase.execute(environmentId);

      this.logger.info('Metadata refreshed successfully');

      return treeResponse;
    } catch (error) {
      this.logger.error('Failed to refresh metadata', error as Error, { environmentId });
      throw error;
    }
  }
}
```

#### ViewModels (DTOs)

```typescript
/**
 * ViewModel for entity tree items.
 *
 * Simple DTO with no behavior (mapped from EntityMetadata).
 */
export interface EntityTreeItemViewModel {
  readonly logicalName: string;
  readonly displayName: string;
  readonly metadataId: string;
  readonly isCustom: boolean;
  readonly icon: string; // 🏷️ or 📋
}

/**
 * ViewModel for choice tree items.
 */
export interface ChoiceTreeItemViewModel {
  readonly name: string;
  readonly displayName: string;
  readonly isCustom: boolean;
  readonly icon: string; // 🔽
}

/**
 * ViewModel for entity details (header).
 */
export interface EntityViewModel {
  readonly logicalName: string;
  readonly displayName: string;
  readonly schemaName: string;
  readonly description: string;
  readonly entitySetName: string;
  readonly primaryIdAttribute: string;
  readonly primaryNameAttribute: string | null;
}

/**
 * ViewModel for attribute table rows.
 */
export interface AttributeViewModel {
  readonly id: string; // metadataId (for context menu)
  readonly displayName: string;
  readonly logicalName: string;
  readonly attributeType: string;
  readonly requiredLevel: string; // User-friendly label
  readonly maxLength: string; // '-' if not applicable
}

/**
 * ViewModel for key table rows.
 */
export interface KeyViewModel {
  readonly id: string; // metadataId
  readonly name: string;
  readonly type: string; // 'Primary' or 'Alternate'
  readonly keyAttributes: string; // Comma-separated
}

/**
 * ViewModel for relationship table rows.
 */
export interface RelationshipViewModel {
  readonly id: string; // schemaName (for context menu)
  readonly name: string; // schemaName
  readonly type: string; // '1:N', 'N:1', 'N:N'
  readonly relatedEntity: string; // Display format (with ↔ for N:N)
  readonly referencingAttribute: string; // Attribute or intersect entity
}

/**
 * ViewModel for privilege table rows.
 */
export interface PrivilegeViewModel {
  readonly id: string; // privilegeId
  readonly name: string;
  readonly privilegeType: string;
  readonly depth: string; // 'Basic, Local, Deep, Global'
}

/**
 * ViewModel for choice details (header).
 */
export interface ChoiceViewModel {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
}

/**
 * ViewModel for choice option table rows.
 */
export interface OptionViewModel {
  readonly id: string; // value (as string)
  readonly label: string;
  readonly value: string; // Numeric value as string
  readonly description: string;
}
```

#### Mappers

```typescript
/**
 * Mapper for EntityMetadata → EntityTreeItemViewModel.
 *
 * Transforms only (NO business logic).
 */
export class EntityTreeItemViewModelMapper {
  public static toViewModel(entity: EntityMetadata): EntityTreeItemViewModel {
    return {
      logicalName: entity.getLogicalName(),
      displayName: entity.getDisplayLabel(), // Entity method
      metadataId: entity.getMetadataId(),
      isCustom: entity.isCustomEntity(), // Entity method
      icon: entity.getIcon() // Entity method
    };
  }
}

/**
 * Mapper for AttributeMetadata → AttributeViewModel.
 */
export class AttributeViewModelMapper {
  public static toViewModel(attribute: AttributeMetadata): AttributeViewModel {
    return {
      id: attribute.getMetadataId(),
      displayName: attribute.getDisplayLabel(), // Entity method
      logicalName: attribute.getLogicalName(),
      attributeType: attribute.getAttributeType(),
      requiredLevel: attribute.getRequiredLevelLabel(), // Entity method
      maxLength: attribute.getMaxLengthDisplay() // Entity method
    };
  }
}

/**
 * Mapper for KeyMetadata → KeyViewModel.
 */
export class KeyViewModelMapper {
  public static toViewModel(key: KeyMetadata): KeyViewModel {
    return {
      id: key.getMetadataId(),
      name: key.getDisplayLabel(), // Entity method
      type: key.getTypeLabel(), // Entity method
      keyAttributes: key.getKeyAttributesDisplay() // Entity method
    };
  }
}

/**
 * Mapper for RelationshipMetadata → RelationshipViewModel.
 */
export class RelationshipViewModelMapper {
  public static toViewModel(relationship: RelationshipMetadata): RelationshipViewModel {
    return {
      id: relationship.getSchemaName(),
      name: relationship.getSchemaName(),
      type: relationship.getTypeLabel(), // Entity method
      relatedEntity: relationship.getRelatedEntityDisplay(), // Entity method
      referencingAttribute: relationship.getReferencingAttributeDisplay() // Entity method
    };
  }
}

/**
 * Mapper for PrivilegeMetadata → PrivilegeViewModel.
 */
export class PrivilegeViewModelMapper {
  public static toViewModel(privilege: PrivilegeMetadata): PrivilegeViewModel {
    return {
      id: privilege.getPrivilegeId(),
      name: privilege.getName(),
      privilegeType: privilege.getPrivilegeType(),
      depth: privilege.getDepthLabel() // Entity method
    };
  }
}

/**
 * Mapper for ChoiceMetadata → ChoiceTreeItemViewModel.
 */
export class ChoiceTreeItemViewModelMapper {
  public static toViewModel(choice: ChoiceMetadata): ChoiceTreeItemViewModel {
    return {
      name: choice.getName(),
      displayName: choice.getDisplayLabel(), // Entity method
      isCustom: choice.isCustomChoice(), // Entity method
      icon: choice.getIcon() // Entity method
    };
  }
}

/**
 * Mapper for OptionMetadata → OptionViewModel.
 */
export class OptionViewModelMapper {
  public static toViewModel(option: OptionMetadata): OptionViewModel {
    return {
      id: option.getValue().toString(),
      label: option.getDisplayLabel(), // Entity method
      value: option.getValue().toString(),
      description: option.getDescriptionDisplay() // Entity method
    };
  }
}

/**
 * Mapper for EntityMetadata → EntityViewModel.
 */
export class EntityViewModelMapper {
  public static toViewModel(entity: EntityMetadata): EntityViewModel {
    return {
      logicalName: entity.getLogicalName(),
      displayName: entity.getDisplayLabel(),
      schemaName: entity.getSchemaName(),
      description: entity.getDescription(),
      entitySetName: entity.getEntitySetName(),
      primaryIdAttribute: entity.getPrimaryIdAttribute(),
      primaryNameAttribute: entity.getPrimaryNameAttribute()
    };
  }
}

/**
 * Mapper for ChoiceMetadata → ChoiceViewModel.
 */
export class ChoiceViewModelMapper {
  public static toViewModel(choice: ChoiceMetadata): ChoiceViewModel {
    return {
      name: choice.getName(),
      displayName: choice.getDisplayLabel(),
      description: choice.getDescription()
    };
  }
}
```

---

### Infrastructure Layer Types

#### Repository Implementation

```typescript
/**
 * Dataverse metadata repository implementation.
 *
 * Implements domain interface, uses Dataverse APIs.
 */
export class DataverseMetadataRepository implements IMetadataRepository {
  private static readonly CACHE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly cache = new Map<string, CachedMetadataEntry>();

  constructor(
    private readonly authService: IAuthenticationService,
    private readonly logger: ILogger
  ) {}

  /**
   * Get entity definitions from Dataverse API.
   */
  public async getEntityDefinitions(environmentId: string): Promise<EntityMetadata[]> {
    const cacheKey = `${environmentId}:entityDefinitions`;
    const cached = this.getCached<EntityMetadata[]>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached entity definitions', { environmentId });
      return cached;
    }

    this.logger.debug('Fetching entity definitions from API', { environmentId });

    const environment = await this.getEnvironment(environmentId);
    const token = await this.authService.getAccessToken(environmentId);

    const url = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions?$select=MetadataId,LogicalName,SchemaName,DisplayName,Description,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,IsManaged,IsCustomizable,ObjectTypeCode`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch entity definitions: ${response.statusText}`);
    }

    const data = await response.json();
    const dtos = data.value as EntityDefinitionDto[];

    // Map DTOs to domain entities
    const entities = dtos.map(dto => this.mapEntityDtoToDomain(dto));

    this.setCached(cacheKey, entities);

    this.logger.info('Entity definitions loaded', { count: entities.length });

    return entities;
  }

  /**
   * Get complete entity metadata (parallel fetch for performance).
   */
  public async getCompleteEntityMetadata(
    environmentId: string,
    entityLogicalName: string
  ): Promise<CompleteEntityMetadata> {
    this.logger.debug('Fetching complete entity metadata', { environmentId, entityLogicalName });

    // Fetch all metadata sections in parallel
    const [entity, attributes, keys, relationships, privileges] = await Promise.all([
      this.getEntityDefinition(environmentId, entityLogicalName),
      this.getEntityAttributes(environmentId, entityLogicalName),
      this.getEntityKeys(environmentId, entityLogicalName),
      this.getEntityRelationships(environmentId, entityLogicalName),
      this.getEntityPrivileges(environmentId, entityLogicalName)
    ]);

    this.logger.info('Complete entity metadata loaded', {
      attributesCount: attributes.length,
      keysCount: keys.length,
      relationshipsCount: relationships.length,
      privilegesCount: privileges.length
    });

    return {
      entity,
      attributes,
      keys,
      relationships,
      privileges
    };
  }

  /**
   * Get entity attributes with expanded option set data.
   */
  public async getEntityAttributes(
    environmentId: string,
    entityLogicalName: string
  ): Promise<AttributeMetadata[]> {
    const cacheKey = `${environmentId}:attributes:${entityLogicalName}`;
    const cached = this.getCached<AttributeMetadata[]>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached attributes', { environmentId, entityLogicalName });
      return cached;
    }

    this.logger.debug('Fetching entity attributes from API', { environmentId, entityLogicalName });

    const environment = await this.getEnvironment(environmentId);
    const token = await this.authService.getAccessToken(environmentId);
    const baseUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')`;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0'
    };

    // Parallel fetch: normal attributes + OptionSet-based attributes with expanded data
    const [
      normalResponse,
      picklistResponse,
      stateResponse,
      statusResponse,
      booleanResponse,
      multiSelectResponse
    ] = await Promise.all([
      fetch(`${baseUrl}/Attributes?$orderby=LogicalName`, { headers }),
      fetch(`${baseUrl}/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet&$orderby=LogicalName`, { headers }),
      fetch(`${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StateAttributeMetadata?$expand=OptionSet&$orderby=LogicalName`, { headers }),
      fetch(`${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$expand=OptionSet&$orderby=LogicalName`, { headers }),
      fetch(`${baseUrl}/Attributes/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$expand=OptionSet&$orderby=LogicalName`, { headers }),
      fetch(`${baseUrl}/Attributes/Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet&$orderby=LogicalName`, { headers })
    ]);

    if (!normalResponse.ok) {
      throw new Error(`Failed to fetch entity attributes: ${normalResponse.statusText}`);
    }

    const normalData = await normalResponse.json();
    const attributeDtos = normalData.value as AttributeMetadataDto[];

    // Merge OptionSet data from typed queries
    await this.mergeOptionSetData(attributeDtos, picklistResponse, 'PicklistAttributeMetadata');
    await this.mergeOptionSetData(attributeDtos, stateResponse, 'StateAttributeMetadata');
    await this.mergeOptionSetData(attributeDtos, statusResponse, 'StatusAttributeMetadata');
    await this.mergeOptionSetData(attributeDtos, booleanResponse, 'BooleanAttributeMetadata');
    await this.mergeOptionSetData(attributeDtos, multiSelectResponse, 'MultiSelectPicklistAttributeMetadata');

    // Map DTOs to domain entities
    const attributes = attributeDtos.map(dto => this.mapAttributeDtoToDomain(dto));

    this.setCached(cacheKey, attributes);

    this.logger.info('Entity attributes loaded', { count: attributes.length });

    return attributes;
  }

  /**
   * Clear cache for environment.
   */
  public clearCache(environmentId: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${environmentId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    this.logger.info('Cache cleared', { environmentId, keysCleared: keysToDelete.length });
  }

  // Private helper methods for caching, DTO mapping, etc.

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > DataverseMetadataRepository.CACHE_TIMEOUT_MS;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCached<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async getEnvironment(environmentId: string): Promise<Environment> {
    // Implementation: Get environment from authentication service
    const environments = await this.authService.getEnvironments();
    const environment = environments.find(env => env.id === environmentId);

    if (!environment) {
      throw new Error(`Environment not found: ${environmentId}`);
    }

    return environment;
  }

  private mapEntityDtoToDomain(dto: EntityDefinitionDto): EntityMetadata {
    return new EntityMetadata(
      dto.MetadataId,
      dto.LogicalName,
      dto.SchemaName,
      dto.DisplayName?.UserLocalizedLabel?.Label || dto.LogicalName,
      dto.Description?.UserLocalizedLabel?.Label || '',
      dto.EntitySetName,
      dto.PrimaryIdAttribute,
      dto.PrimaryNameAttribute || null,
      dto.IsManaged,
      dto.IsCustomizable?.Value || false,
      dto.ObjectTypeCode
    );
  }

  private mapAttributeDtoToDomain(dto: AttributeMetadataDto): AttributeMetadata {
    return new AttributeMetadata(
      dto.MetadataId,
      dto.LogicalName,
      dto.SchemaName,
      dto.DisplayName?.UserLocalizedLabel?.Label || dto.LogicalName,
      dto.Description?.UserLocalizedLabel?.Label || '',
      dto.AttributeType,
      dto.AttributeTypeName?.Value || dto.AttributeType,
      this.mapRequiredLevel(dto.RequiredLevel?.Value),
      dto.IsCustomAttribute || false,
      dto.IsManaged || false,
      dto.IsPrimaryId || false,
      dto.IsPrimaryName || false,
      dto.MaxLength || null,
      dto.Targets || null,
      dto.OptionSet ? this.mapOptionSetDtoToDomain(dto.OptionSet) : null
    );
  }

  private mapRequiredLevel(value: string | undefined): RequiredLevel {
    switch (value) {
      case 'None':
        return RequiredLevel.None;
      case 'SystemRequired':
        return RequiredLevel.SystemRequired;
      case 'ApplicationRequired':
        return RequiredLevel.ApplicationRequired;
      case 'Recommended':
        return RequiredLevel.Recommended;
      default:
        return RequiredLevel.None;
    }
  }

  private mapOptionSetDtoToDomain(dto: OptionSetMetadataDto): OptionSetMetadata {
    // Implementation: Map option set DTO to domain entity
    // Simplified for brevity
    return {
      metadataId: dto.MetadataId,
      name: dto.Name,
      displayName: dto.DisplayName?.UserLocalizedLabel?.Label || dto.Name,
      options: (dto.Options || []).map(optDto => this.mapOptionDtoToDomain(optDto))
    };
  }

  private mapOptionDtoToDomain(dto: OptionMetadataDto): OptionMetadata {
    return new OptionMetadata(
      dto.Value,
      dto.Label?.UserLocalizedLabel?.Label || '',
      dto.Description?.UserLocalizedLabel?.Label || '',
      dto.Color || null,
      dto.IsManaged || false
    );
  }

  private async mergeOptionSetData(
    attributes: AttributeMetadataDto[],
    response: Response,
    typeName: string
  ): Promise<void> {
    if (!response.ok) {
      this.logger.warn(`Failed to fetch ${typeName}, continuing without OptionSet data`, {
        status: response.status
      });
      return;
    }

    const data = await response.json();
    const typedAttributes = data.value as AttributeMetadataDto[];

    // Create map for fast lookup
    const typedMap = new Map<string, AttributeMetadataDto>(
      typedAttributes.map(attr => [attr.MetadataId, attr])
    );

    // Merge OptionSet data into main attributes array
    let mergedCount = 0;
    attributes.forEach(attr => {
      const typedAttr = typedMap.get(attr.MetadataId);
      if (typedAttr && typedAttr.OptionSet) {
        attr.OptionSet = typedAttr.OptionSet;
        mergedCount++;
      }
    });

    this.logger.debug(`Merged ${typeName}`, {
      merged: mergedCount,
      total: typedAttributes.length
    });
  }

  // Additional methods: getEntityKeys, getEntityRelationships, getEntityPrivileges, etc.
  // Implementation follows same pattern as above
}

/**
 * Cache entry for metadata.
 */
interface CachedMetadataEntry {
  data: unknown;
  timestamp: number;
}

/**
 * DTOs for Dataverse API responses.
 */
interface EntityDefinitionDto {
  MetadataId: string;
  LogicalName: string;
  SchemaName: string;
  DisplayName: { UserLocalizedLabel: { Label: string } };
  Description: { UserLocalizedLabel: { Label: string } };
  EntitySetName: string;
  PrimaryIdAttribute: string;
  PrimaryNameAttribute: string | null;
  IsManaged: boolean;
  IsCustomizable: { Value: boolean };
  ObjectTypeCode: number;
}

interface AttributeMetadataDto {
  MetadataId: string;
  LogicalName: string;
  SchemaName: string;
  DisplayName: { UserLocalizedLabel: { Label: string } };
  Description: { UserLocalizedLabel: { Label: string } };
  AttributeType: string;
  AttributeTypeName: { Value: string };
  RequiredLevel: { Value: string };
  IsCustomAttribute: boolean;
  IsManaged: boolean;
  IsPrimaryId: boolean;
  IsPrimaryName: boolean;
  MaxLength?: number;
  Targets?: string[];
  OptionSet?: OptionSetMetadataDto;
}

interface OptionSetMetadataDto {
  MetadataId: string;
  Name: string;
  DisplayName: { UserLocalizedLabel: { Label: string } };
  Options: OptionMetadataDto[];
}

interface OptionMetadataDto {
  Value: number;
  Label: { UserLocalizedLabel: { Label: string } };
  Description: { UserLocalizedLabel: { Label: string } };
  Color: string | null;
  IsManaged: boolean;
}

// Additional DTOs for keys, relationships, privileges, choices, etc.
```

---

### Presentation Layer Types

#### Panel

```typescript
/**
 * Metadata Browser panel.
 *
 * Uses use cases for orchestration (NO business logic).
 */
export class MetadataBrowserPanel extends BasePanel {
  public static readonly viewType = 'powerPlatformDevSuite.metadataBrowser';
  private static currentPanel: MetadataBrowserPanel | undefined;

  private readonly loadEntityTreeUseCase: LoadEntityTreeUseCase;
  private readonly loadEntityMetadataUseCase: LoadEntityMetadataUseCase;
  private readonly loadChoiceMetadataUseCase: LoadChoiceMetadataUseCase;
  private readonly navigateToRelatedEntityUseCase: NavigateToRelatedEntityUseCase;
  private readonly refreshMetadataUseCase: RefreshMetadataUseCase;

  // State
  private selectedEntityLogicalName?: string;
  private selectedChoiceName?: string;
  private collapsedSections: Set<string> = new Set(['keys', 'relationships', 'privileges', 'choices']);

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    loadEntityTreeUseCase: LoadEntityTreeUseCase,
    loadEntityMetadataUseCase: LoadEntityMetadataUseCase,
    loadChoiceMetadataUseCase: LoadChoiceMetadataUseCase,
    navigateToRelatedEntityUseCase: NavigateToRelatedEntityUseCase,
    refreshMetadataUseCase: RefreshMetadataUseCase,
    logger: ILogger
  ) {
    super(panel, extensionUri, ServiceFactory.getAuthService(), {
      viewType: MetadataBrowserPanel.viewType,
      title: 'Metadata Browser'
    });

    this.loadEntityTreeUseCase = loadEntityTreeUseCase;
    this.loadEntityMetadataUseCase = loadEntityMetadataUseCase;
    this.loadChoiceMetadataUseCase = loadChoiceMetadataUseCase;
    this.navigateToRelatedEntityUseCase = navigateToRelatedEntityUseCase;
    this.refreshMetadataUseCase = refreshMetadataUseCase;

    this.componentLogger = logger;

    this.panel.onDidDispose(() => {
      MetadataBrowserPanel.currentPanel = undefined;
    });

    this.initializeComponents();
    this.initialize();
  }

  /**
   * Factory method (singleton pattern).
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    useCases: MetadataBrowserUseCases,
    logger: ILogger
  ): void {
    if (MetadataBrowserPanel.currentPanel) {
      MetadataBrowserPanel.currentPanel.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      MetadataBrowserPanel.viewType,
      'Metadata Browser',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
      }
    );

    const instance = new MetadataBrowserPanel(
      panel,
      extensionUri,
      useCases.loadEntityTreeUseCase,
      useCases.loadEntityMetadataUseCase,
      useCases.loadChoiceMetadataUseCase,
      useCases.navigateToRelatedEntityUseCase,
      useCases.refreshMetadataUseCase,
      logger
    );

    MetadataBrowserPanel.currentPanel = instance;
  }

  /**
   * Handle user actions from webview.
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.command) {
        case 'select-entity':
          await this.handleEntitySelection(message.data);
          break;

        case 'select-choice':
          await this.handleChoiceSelection(message.data);
          break;

        case 'view-details':
          await this.handleViewDetails(message.data);
          break;

        case 'navigate-to-related-entity':
          await this.handleNavigateToRelatedEntity(message.data);
          break;

        case 'copy-logical-name':
          await this.handleCopyLogicalName(message.data);
          break;

        case 'open-in-maker':
          await this.handleOpenInMaker();
          break;

        case 'refresh':
          await this.handleRefresh();
          break;

        case 'toggle-section':
          this.handleToggleSection(message.data);
          break;

        default:
          this.componentLogger.warn('Unknown message command', { command: message.command });
      }
    } catch (error) {
      this.componentLogger.error('Error handling message', error as Error, { command: message.command });
      this.postMessage({
        command: 'error',
        message: 'An error occurred while processing your request'
      });
    }
  }

  private async handleEntitySelection(data: unknown): Promise<void> {
    const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
    if (!selectedEnvironment) return;

    if (!data || typeof data !== 'object') return;

    const entityData = data as Record<string, unknown>;
    const { logicalName } = entityData;
    if (!logicalName) return;

    this.componentLogger.info('User selected entity', { logicalName });

    // Show loading state
    this.setLoadingState(true);

    try {
      // Delegate to use case
      const response = await this.loadEntityMetadataUseCase.execute({
        environmentId: selectedEnvironment.id,
        entityLogicalName: logicalName as string
      });

      // Update UI with ViewModels
      this.updateEntityMetadata(response);

      this.selectedEntityLogicalName = logicalName as string;
      this.selectedChoiceName = undefined;

    } catch (error) {
      this.componentLogger.error('Failed to load entity metadata', error as Error, { logicalName });
      vscode.window.showErrorMessage(`Failed to load entity metadata: ${(error as Error).message}`);
    } finally {
      this.setLoadingState(false);
    }
  }

  private async handleChoiceSelection(data: unknown): Promise<void> {
    const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
    if (!selectedEnvironment) return;

    if (!data || typeof data !== 'object') return;

    const choiceData = data as Record<string, unknown>;
    const { name } = choiceData;
    if (!name) return;

    this.componentLogger.info('User selected choice', { name });

    this.setLoadingState(true);

    try {
      // Delegate to use case
      const response = await this.loadChoiceMetadataUseCase.execute({
        environmentId: selectedEnvironment.id,
        choiceName: name as string
      });

      // Update UI with ViewModels
      this.updateChoiceMetadata(response);

      this.selectedChoiceName = name as string;
      this.selectedEntityLogicalName = undefined;

    } catch (error) {
      this.componentLogger.error('Failed to load choice metadata', error as Error, { name });
      vscode.window.showErrorMessage(`Failed to load choice metadata: ${(error as Error).message}`);
    } finally {
      this.setLoadingState(false);
    }
  }

  private async handleNavigateToRelatedEntity(data: unknown): Promise<void> {
    const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
    if (!selectedEnvironment) return;

    if (!data || typeof data !== 'object') return;

    const navData = data as Record<string, unknown>;
    const { targetEntityLogicalName } = navData;
    if (!targetEntityLogicalName) return;

    this.componentLogger.info('User navigating to related entity', { targetEntityLogicalName });

    this.setLoadingState(true);

    try {
      // Delegate to use case
      const response = await this.navigateToRelatedEntityUseCase.execute({
        environmentId: selectedEnvironment.id,
        targetEntityLogicalName: targetEntityLogicalName as string
      });

      // Update UI with ViewModels
      this.updateEntityMetadata(response);

      this.selectedEntityLogicalName = targetEntityLogicalName as string;

    } catch (error) {
      this.componentLogger.error('Failed to navigate to related entity', error as Error, { targetEntityLogicalName });
      vscode.window.showErrorMessage(`Failed to navigate to entity: ${(error as Error).message}`);
    } finally {
      this.setLoadingState(false);
    }
  }

  private async handleRefresh(): Promise<void> {
    const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
    if (!selectedEnvironment) return;

    this.componentLogger.info('User triggered refresh');

    try {
      // Delegate to use case (clears cache and reloads tree)
      await this.refreshMetadataUseCase.execute(selectedEnvironment.id);

      // Reload current selection if any
      if (this.selectedEntityLogicalName) {
        await this.handleEntitySelection({ logicalName: this.selectedEntityLogicalName });
      } else if (this.selectedChoiceName) {
        await this.handleChoiceSelection({ name: this.selectedChoiceName });
      }

      vscode.window.showInformationMessage('Metadata refreshed successfully');

    } catch (error) {
      this.componentLogger.error('Failed to refresh metadata', error as Error);
      vscode.window.showErrorMessage(`Failed to refresh metadata: ${(error as Error).message}`);
    }
  }

  private async handleCopyLogicalName(data: unknown): Promise<void> {
    if (!data || typeof data !== 'object') return;

    const copyData = data as Record<string, unknown>;
    const { logicalName } = copyData;
    if (!logicalName) return;

    await vscode.env.clipboard.writeText(String(logicalName));
    vscode.window.showInformationMessage(`Copied logical name: ${logicalName}`);
  }

  private async handleOpenInMaker(): Promise<void> {
    const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
    if (!selectedEnvironment || !selectedEnvironment.environmentId) {
      vscode.window.showErrorMessage('Environment ID not found');
      return;
    }

    const url = `https://make.powerapps.com/environments/${selectedEnvironment.environmentId}/entities`;
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  private handleToggleSection(data: unknown): void {
    if (!data || typeof data !== 'object') return;

    const toggleData = data as Record<string, unknown>;
    const { sectionId } = toggleData;
    if (!sectionId) return;

    if (this.collapsedSections.has(sectionId as string)) {
      this.collapsedSections.delete(sectionId as string);
    } else {
      this.collapsedSections.add(sectionId as string);
    }

    // Save preferences
    this.savePreferences();
  }

  private updateEntityMetadata(response: EntityMetadataResponse): void {
    // Send ViewModels to webview for rendering
    this.postMessage({
      command: 'update-entity-metadata',
      data: {
        entity: response.entity,
        attributes: response.attributes,
        keys: response.keys,
        relationships: response.relationships,
        privileges: response.privileges
      }
    });
  }

  private updateChoiceMetadata(response: ChoiceMetadataResponse): void {
    // Send ViewModels to webview for rendering
    this.postMessage({
      command: 'update-choice-metadata',
      data: {
        choice: response.choice,
        options: response.options
      }
    });
  }

  private setLoadingState(loading: boolean): void {
    this.postMessage({
      command: 'set-loading',
      loading
    });
  }

  // Additional helper methods for HTML generation, component initialization, etc.
}

/**
 * Use cases bundle for panel construction.
 */
export interface MetadataBrowserUseCases {
  readonly loadEntityTreeUseCase: LoadEntityTreeUseCase;
  readonly loadEntityMetadataUseCase: LoadEntityMetadataUseCase;
  readonly loadChoiceMetadataUseCase: LoadChoiceMetadataUseCase;
  readonly navigateToRelatedEntityUseCase: NavigateToRelatedEntityUseCase;
  readonly refreshMetadataUseCase: RefreshMetadataUseCase;
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
│   │   ├── KeyMetadata.ts
│   │   ├── RelationshipMetadata.ts
│   │   ├── PrivilegeMetadata.ts
│   │   ├── ChoiceMetadata.ts
│   │   └── OptionMetadata.ts
│   ├── valueObjects/
│   │   └── RequiredLevel.ts
│   │   └── RelationshipType.ts
│   ├── interfaces/
│   │   └── IMetadataRepository.ts
│   └── types/
│       └── CompleteEntityMetadata.ts
│
├── application/
│   ├── useCases/
│   │   ├── LoadEntityTreeUseCase.ts
│   │   ├── LoadEntityMetadataUseCase.ts
│   │   ├── LoadChoiceMetadataUseCase.ts
│   │   ├── NavigateToRelatedEntityUseCase.ts
│   │   └── RefreshMetadataUseCase.ts
│   ├── viewModels/
│   │   ├── EntityTreeItemViewModel.ts
│   │   ├── ChoiceTreeItemViewModel.ts
│   │   ├── EntityViewModel.ts
│   │   ├── AttributeViewModel.ts
│   │   ├── KeyViewModel.ts
│   │   ├── RelationshipViewModel.ts
│   │   ├── PrivilegeViewModel.ts
│   │   ├── ChoiceViewModel.ts
│   │   └── OptionViewModel.ts
│   └── mappers/
│       ├── EntityTreeItemViewModelMapper.ts
│       ├── ChoiceTreeItemViewModelMapper.ts
│       ├── EntityViewModelMapper.ts
│       ├── AttributeViewModelMapper.ts
│       ├── KeyViewModelMapper.ts
│       ├── RelationshipViewModelMapper.ts
│       ├── PrivilegeViewModelMapper.ts
│       ├── ChoiceViewModelMapper.ts
│       └── OptionViewModelMapper.ts
│
├── infrastructure/
│   └── repositories/
│       └── DataverseMetadataRepository.ts
│
└── presentation/
    ├── panels/
    │   └── MetadataBrowserPanel.ts
    └── views/
        └── metadataBrowserView.ts            # HTML generation (extracted from panel)
```

**New Files:** ~40 files
**Modified Files:** 0 existing files (new feature)
**Total:** ~40 files for this feature

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

```typescript
// Test entity behavior
describe('EntityMetadata', () => {
  describe('isCustomEntity', () => {
    it('should return true for custom entity with prefix', () => {
      const entity = new EntityMetadata(
        'guid',
        'new_customentity',
        'CustomEntity',
        'Custom Entity',
        '',
        'new_customentities',
        'new_customentityid',
        null,
        false,
        true,
        10001
      );

      expect(entity.isCustomEntity()).toBe(true);
    });

    it('should return false for system entity without prefix', () => {
      const entity = new EntityMetadata(
        'guid',
        'account',
        'Account',
        'Account',
        '',
        'accounts',
        'accountid',
        'name',
        false,
        true,
        1
      );

      expect(entity.isCustomEntity()).toBe(false);
    });
  });

  describe('getIcon', () => {
    it('should return custom icon for custom entity', () => {
      const entity = new EntityMetadata(/* custom entity params */);
      expect(entity.getIcon()).toBe('🏷️');
    });

    it('should return system icon for system entity', () => {
      const entity = new EntityMetadata(/* system entity params */);
      expect(entity.getIcon()).toBe('📋');
    });
  });

  describe('validateInvariants', () => {
    it('should throw ValidationError when logicalName is empty', () => {
      expect(() => {
        new EntityMetadata('guid', '', 'Schema', 'Display', '', 'set', 'id', null, false, true, 1);
      }).toThrow(ValidationError);
    });
  });
});

describe('AttributeMetadata', () => {
  describe('isRequired', () => {
    it('should return true for SystemRequired', () => {
      const attribute = new AttributeMetadata(
        'guid',
        'name',
        'Name',
        'Name',
        '',
        'String',
        'StringType',
        RequiredLevel.SystemRequired,
        false,
        false,
        false,
        false
      );

      expect(attribute.isRequired()).toBe(true);
    });

    it('should return false for None', () => {
      const attribute = new AttributeMetadata(/* params with RequiredLevel.None */);
      expect(attribute.isRequired()).toBe(false);
    });
  });

  describe('getMaxLengthDisplay', () => {
    it('should return number as string when maxLength exists', () => {
      const attribute = new AttributeMetadata(/* params with maxLength: 100 */);
      expect(attribute.getMaxLengthDisplay()).toBe('100');
    });

    it('should return dash when maxLength is null', () => {
      const attribute = new AttributeMetadata(/* params with maxLength: null */);
      expect(attribute.getMaxLengthDisplay()).toBe('-');
    });
  });
});

describe('KeyMetadata', () => {
  describe('isPrimaryKey', () => {
    it('should return true for single attribute key', () => {
      const key = new KeyMetadata('guid', 'key', 'Key', 'Key', ['accountid'], false, 'Active');
      expect(key.isPrimaryKey()).toBe(true);
    });

    it('should return false for multiple attribute key', () => {
      const key = new KeyMetadata('guid', 'key', 'Key', 'Key', ['field1', 'field2'], false, 'Active');
      expect(key.isPrimaryKey()).toBe(false);
    });
  });

  describe('validateInvariants', () => {
    it('should throw ValidationError when keyAttributes is empty', () => {
      expect(() => {
        new KeyMetadata('guid', 'key', 'Key', 'Key', [], false, 'Active');
      }).toThrow(ValidationError);
    });
  });
});

describe('RelationshipMetadata', () => {
  describe('getRelatedEntityDisplay', () => {
    it('should return single entity for 1:N relationship', () => {
      const rel = new RelationshipMetadata(
        'guid',
        'account_contact',
        RelationshipType.OneToMany,
        'account',
        'contact',
        'parentaccountid',
        false,
        false
      );

      expect(rel.getRelatedEntityDisplay()).toBe('account');
    });

    it('should return both entities with separator for N:N relationship', () => {
      const rel = new RelationshipMetadata(
        'guid',
        'account_contact',
        RelationshipType.ManyToMany,
        '',
        '',
        '',
        false,
        false,
        'account',
        'contact',
        'accountcontact'
      );

      expect(rel.getRelatedEntityDisplay()).toBe('account ↔ contact');
    });
  });

  describe('getNavigableEntityNames', () => {
    it('should return single entity for 1:N relationship', () => {
      const rel = new RelationshipMetadata(/* 1:N params */);
      expect(rel.getNavigableEntityNames()).toEqual(['account']);
    });

    it('should return both entities for N:N relationship', () => {
      const rel = new RelationshipMetadata(/* N:N params */);
      expect(rel.getNavigableEntityNames()).toEqual(['account', 'contact']);
    });
  });
});

describe('PrivilegeMetadata', () => {
  describe('getDepthLabel', () => {
    it('should return comma-separated depth levels', () => {
      const priv = new PrivilegeMetadata('guid', 'prvRead', 'Read', true, true, false, false);
      expect(priv.getDepthLabel()).toBe('Basic, Local');
    });

    it('should return None when no depth levels available', () => {
      const priv = new PrivilegeMetadata('guid', 'prvRead', 'Read', false, false, false, false);
      expect(priv.getDepthLabel()).toBe('None');
    });
  });
});

describe('ChoiceMetadata', () => {
  describe('getOptionCount', () => {
    it('should return number of options', () => {
      const options = [
        new OptionMetadata(1, 'Option 1', '', null, false),
        new OptionMetadata(2, 'Option 2', '', null, false)
      ];
      const choice = new ChoiceMetadata('guid', 'status', 'Status', '', true, false, true, options);

      expect(choice.getOptionCount()).toBe(2);
    });

    it('should return 0 when no options', () => {
      const choice = new ChoiceMetadata('guid', 'status', 'Status', '', true, false, true, []);
      expect(choice.getOptionCount()).toBe(0);
    });
  });
});
```

### Application Tests (Target: 90% coverage)

```typescript
// Test use case orchestration
describe('LoadEntityTreeUseCase', () => {
  let useCase: LoadEntityTreeUseCase;
  let mockRepository: jest.Mocked<IMetadataRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockRepository = {
      getEntityDefinitions: jest.fn(),
      getGlobalOptionSets: jest.fn(),
      getCompleteEntityMetadata: jest.fn(),
      getEntityAttributes: jest.fn(),
      getEntityKeys: jest.fn(),
      getEntityRelationships: jest.fn(),
      getEntityPrivileges: jest.fn(),
      getOptionSetMetadata: jest.fn(),
      clearCache: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn()
    };

    useCase = new LoadEntityTreeUseCase(mockRepository, mockLogger);
  });

  it('should orchestrate entity and choice loading', async () => {
    const entities = [
      new EntityMetadata('guid1', 'account', 'Account', 'Account', '', 'accounts', 'accountid', 'name', false, true, 1),
      new EntityMetadata('guid2', 'contact', 'Contact', 'Contact', '', 'contacts', 'contactid', 'fullname', false, true, 2)
    ];

    const choices = [
      new ChoiceMetadata('guid3', 'status', 'Status', '', true, false, true, [])
    ];

    mockRepository.getEntityDefinitions.mockResolvedValue(entities);
    mockRepository.getGlobalOptionSets.mockResolvedValue(choices);

    const result = await useCase.execute('env-123');

    expect(mockRepository.getEntityDefinitions).toHaveBeenCalledWith('env-123');
    expect(mockRepository.getGlobalOptionSets).toHaveBeenCalledWith('env-123');
    expect(result.entities).toHaveLength(2);
    expect(result.choices).toHaveLength(1);
    expect(mockLogger.info).toHaveBeenCalledWith('Entity tree loaded', expect.any(Object));
  });

  it('should sort entities by logical name', async () => {
    const entities = [
      new EntityMetadata('guid1', 'contact', 'Contact', 'Contact', '', 'contacts', 'contactid', 'fullname', false, true, 2),
      new EntityMetadata('guid2', 'account', 'Account', 'Account', '', 'accounts', 'accountid', 'name', false, true, 1)
    ];

    mockRepository.getEntityDefinitions.mockResolvedValue(entities);
    mockRepository.getGlobalOptionSets.mockResolvedValue([]);

    const result = await useCase.execute('env-123');

    expect(result.entities[0].logicalName).toBe('account');
    expect(result.entities[1].logicalName).toBe('contact');
  });

  it('should throw error when repository fails', async () => {
    mockRepository.getEntityDefinitions.mockRejectedValue(new Error('API error'));

    await expect(useCase.execute('env-123')).rejects.toThrow('API error');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe('LoadEntityMetadataUseCase', () => {
  let useCase: LoadEntityMetadataUseCase;
  let mockRepository: jest.Mocked<IMetadataRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockRepository = {
      getEntityDefinitions: jest.fn(),
      getGlobalOptionSets: jest.fn(),
      getCompleteEntityMetadata: jest.fn(),
      getEntityAttributes: jest.fn(),
      getEntityKeys: jest.fn(),
      getEntityRelationships: jest.fn(),
      getEntityPrivileges: jest.fn(),
      getOptionSetMetadata: jest.fn(),
      clearCache: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn()
    };

    useCase = new LoadEntityMetadataUseCase(mockRepository, mockLogger);
  });

  it('should orchestrate complete entity metadata loading', async () => {
    const entity = new EntityMetadata('guid', 'account', 'Account', 'Account', '', 'accounts', 'accountid', 'name', false, true, 1);
    const attributes = [
      new AttributeMetadata('guid1', 'name', 'Name', 'Name', '', 'String', 'StringType', RequiredLevel.None, false, false, false, false, 100)
    ];
    const keys: KeyMetadata[] = [];
    const relationships: RelationshipMetadata[] = [];
    const privileges: PrivilegeMetadata[] = [];

    const completeMetadata: CompleteEntityMetadata = {
      entity,
      attributes,
      keys,
      relationships,
      privileges
    };

    mockRepository.getCompleteEntityMetadata.mockResolvedValue(completeMetadata);

    const result = await useCase.execute({
      environmentId: 'env-123',
      entityLogicalName: 'account'
    });

    expect(mockRepository.getCompleteEntityMetadata).toHaveBeenCalledWith('env-123', 'account');
    expect(result.attributes).toHaveLength(1);
    expect(mockLogger.info).toHaveBeenCalledWith('Entity metadata loaded', expect.any(Object));
  });
});
```

### Manual Testing Scenarios

1. **Happy path - Browse and view entity metadata:**
   - Open Metadata Browser panel
   - Select environment from dropdown
   - See tree populated with 300+ tables and choices
   - Type "account" in search box → See filtered results
   - Click "Account" entity → See attributes table with 50+ attributes
   - Expand Keys section → See primary key
   - Expand Relationships section → See 1:N and N:1 relationships
   - Expand Privileges section → See CRUD privileges

2. **Happy path - Drill down into attribute details:**
   - Select entity (e.g., "Account")
   - Right-click on "name" attribute → Click "View Details"
   - See detail panel open on right side
   - See Properties tab showing all attribute properties in flat table
   - Click "Raw Data" tab → See JSON structure
   - Press Ctrl+A → See all text selected
   - Click X button → See detail panel close

3. **Happy path - Navigate to related entity:**
   - Select entity (e.g., "Contact")
   - Expand Relationships section
   - Right-click on "account_contact" relationship → Click "Open Related Entity"
   - See "Account" entity load with its metadata

4. **Happy path - Browse choices:**
   - Click "Status" choice in tree
   - See Choice Values section expand
   - See option values (Active, Inactive) in table

5. **Error case - Invalid environment:**
   - Select environment with invalid credentials
   - See error notification: "Failed to load tables and choices"

6. **Edge case - Large entity with 100+ attributes:**
   - Select "Opportunity" entity
   - See all attributes load within 3 seconds
   - Scroll through attributes table → Verify sorting and filtering work

7. **Persistence - Preferences saved per environment:**
   - Collapse Keys section
   - Resize detail panel split ratio to 60/40
   - Collapse left panel
   - Switch to different environment
   - Switch back to original environment
   - Verify: Keys section collapsed, split ratio 60/40, left panel collapsed

---

## Dependencies & Prerequisites

### External Dependencies
- [ ] VS Code APIs: Webview, SecretStorage, Commands
- [ ] NPM packages: None (uses existing dependencies)
- [ ] Dataverse APIs:
  - GET EntityDefinitions
  - GET EntityDefinitions(LogicalName)/Attributes (with type casting for OptionSet expansion)
  - GET EntityDefinitions(LogicalName)/Keys
  - GET EntityDefinitions(LogicalName)/OneToManyRelationships
  - GET EntityDefinitions(LogicalName)/ManyToOneRelationships
  - GET EntityDefinitions(LogicalName)/ManyToManyRelationships
  - GET EntityDefinitions(LogicalName)/Privileges
  - GET GlobalOptionSetDefinitions
  - GET GlobalOptionSetDefinitions(Name)

### Internal Prerequisites
- [ ] Existing panel framework (BasePanel, ComponentFactory, PanelComposer)
- [ ] Existing components (EnvironmentSelector, ActionBar, DataTable, JsonViewer, SplitPanel)
- [ ] StateManager for per-environment preferences
- [ ] Logger for diagnostics
- [ ] AuthenticationService for token acquisition

### Breaking Changes
- [ ] None (new feature)

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
- [ ] Command ID defined: `power-platform-dev-suite.metadataBrowser`
- [ ] Command title specified: "Power Platform: Metadata Browser"
- [ ] Command added to `"contributes.commands"` array

**Extension Registration (for extension.ts):**
- [ ] Feature initializer function created (`initializeMetadataBrowser()`)
- [ ] Lazy imports with dynamic `import()` for performance
- [ ] Command handler registered
- [ ] Command added to `context.subscriptions`
- [ ] Error handling in command handler

**Verification:**
- [ ] `npm run compile` passes after package.json changes
- [ ] Command appears in Command Palette (Ctrl+Shift+P)
- [ ] Manual testing completed (F5, invoke command, panel opens)

---

## Key Architectural Decisions

### Decision 1: Rich Domain Models vs Anemic DTOs
**Considered:** Anemic DTOs with logic in use cases
**Chosen:** Rich domain entities with behavior methods
**Rationale:**
- Business logic centralized in entities (single source of truth)
- Reduces duplication across use cases
- Easier to test (pure business logic)
- Follows Clean Architecture principles
**Tradeoffs:** Slightly more complex entity classes, but much simpler use cases and mappers

### Decision 2: Parallel API Fetching for Entity Metadata
**Considered:** Sequential API calls, Single API call with all data
**Chosen:** Parallel Promise.all() for attributes, keys, relationships, privileges
**Rationale:**
- Significant performance improvement (3x faster)
- Dataverse API doesn't support $expand for all sections in single call
- User experience: faster loading times
**Tradeoffs:** Slightly more complex repository code, but worth the performance gain

### Decision 3: Client-Side Caching with 5-Minute Timeout
**Considered:** No caching, Server-side caching, Infinite client-side caching
**Chosen:** Client-side caching with 5-minute timeout
**Rationale:**
- Reduces API calls for repeated views
- 5-minute timeout balances freshness vs performance
- User can manually refresh to bypass cache
**Tradeoffs:** Stale data possible (mitigated by refresh button)

### Decision 4: Repository Interface in Domain Layer
**Considered:** Repository interface in infrastructure layer
**Chosen:** Repository interface in domain layer (IMetadataRepository)
**Rationale:**
- Dependency inversion (domain defines contract, infrastructure implements)
- Domain has zero infrastructure dependencies
- Easy to test with mocks
**Tradeoffs:** None (this is standard Clean Architecture pattern)

### Decision 5: ViewModels as Simple DTOs (No Behavior)
**Considered:** ViewModels with behavior methods
**Chosen:** ViewModels as simple DTOs (readonly interfaces)
**Rationale:**
- Clear separation: Domain = behavior, ViewModels = data shape for UI
- Mappers handle transformation only
- Simpler to serialize and send to webview
**Tradeoffs:** None (this is standard Clean Architecture pattern)

### Decision 6: Entity/Choice Tree Rendering in JavaScript (Not Component)
**Considered:** Creating reusable TreeViewComponent
**Chosen:** Custom tree rendering in panel JavaScript behavior
**Rationale:**
- Tree has specific requirements (icons, search, dual sections)
- Not reusable across other panels (metadata-specific)
- Simpler to implement custom rendering inline
**Tradeoffs:** Code is panel-specific (acceptable for unique UI)

### Decision 7: Detail Panel with Split Panel Behavior
**Considered:** Modal dialog for details, Separate panel for details
**Chosen:** Resizable split panel (middle + right) using SplitPanelBehavior
**Rationale:**
- Allows side-by-side viewing (table + details)
- User can resize split ratio
- Consistent with other panels (plugin traces, solution explorer)
**Tradeoffs:** More complex UI layout (acceptable for power users)

### Decision 8: Context Menu for Actions (Not Inline Buttons)
**Considered:** Inline action buttons in table rows
**Chosen:** Context menu (right-click) for actions
**Rationale:**
- Reduces visual clutter in tables
- Provides more actions without expanding table width
- Consistent with VS Code UX patterns
**Tradeoffs:** Slightly less discoverable (mitigated by tooltips)

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
- [ ] Slice 6 implemented and reviewed

### Final Approval
- [ ] All slices implemented
- [ ] Tests written and passing (npm test ✅)
- [ ] Manual testing completed
- [ ] Documentation updated (if new patterns)
- [ ] code-guardian final approval

**Status:** Pending
**Approver:** TBD
**Date:** TBD

---

## Open Questions

- [ ] Should we support entity metadata export to JSON/CSV? (Future enhancement)
- [ ] Should we support solution-aware filtering (show only solution components)? (Future enhancement)
- [ ] Should we cache metadata at workspace level or extension level? (Decided: Extension level with 5-minute timeout)
- [ ] Should detail panel always start hidden or remember last state? (Decided: Always hidden - fresh start per entity)
- [ ] Should we support global search across all entities (vs per-section search)? (Future enhancement)

---

## References

- Related features: Plugin Trace Viewer (uses similar 3-panel layout), Solution Explorer (uses tree navigation)
- External documentation: [Dataverse Web API Metadata Reference](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-metadata-operations)
- Design inspiration: VS Code Symbol Explorer, Power Apps Maker Portal entity designer
- Workflow guide: `.claude/workflows/DESIGN_WORKFLOW.md`
- Architecture guide: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- Panel guide: `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
