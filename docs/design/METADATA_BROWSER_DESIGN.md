# Metadata Browser - Technical Design

**Status:** Draft
**Date:** 2025-11-04
**Complexity:** Complex

---

## Overview

**User Problem:** Power Platform developers need to browse and inspect metadata (entities, attributes, relationships, keys, privileges, choices) but must switch to web browser, losing context from their IDE.

**Solution:** Read-only Metadata Browser panel in VS Code with three-panel layout: Tree view (left) showing Tables and Choices, Tabbed content (middle) showing details, and Detail view (right) for properties/JSON.

**Value:** Keeps developers in IDE context, enables faster metadata lookup, reduces context switching, and provides quick copy of logical names for development.

---

## Requirements

### Functional Requirements
- [ ] Three-panel layout: Tree (left), Tabs (middle), Details (right)
- [ ] Left panel: Searchable tree of Tables and Choices with custom/system icons
- [ ] Quick filters (collapsed by default): Custom/System, Managed/Unmanaged
- [ ] Filter state persisted per environment
- [ ] Middle panel for Tables: Attributes, Keys, Relationships, Privileges tabs
- [ ] Middle panel for Choices: Choice values display
- [ ] Right panel (hidden by default): Properties and Raw JSON tabs
- [ ] Context menu: View Details, Copy Logical Name, Open in Maker, Navigate to Related Entity
- [ ] Top actions: Environment selector, Refresh, Open in Maker
- [ ] Search/filter/sort on all data tables

### Non-Functional Requirements
- [ ] Read-only (no mutations)
- [ ] Fast client-side search/filter (no server round-trips)
- [ ] Responsive layout (panels resizable)
- [ ] HTML extracted to view files (no HTML in TypeScript)
- [ ] Follow Clean Architecture (domain → application → infrastructure → presentation)

### Success Criteria
- [ ] User can browse entity metadata without leaving VS Code
- [ ] User can quickly find and copy logical names
- [ ] User can filter by custom/system and managed/unmanaged
- [ ] User can view relationships and navigate to related entities
- [ ] Filter preferences persist across sessions

---

## Implementation Slices (Vertical Slicing)

> **Key Principle:** Build working software in 30-60 minute increments. Each slice goes through all layers.

### MVP Slice (Slice 1): "User can view list of entities with basic attributes"
**Goal:** Simplest possible end-to-end functionality (walking skeleton) - proves entire stack

**Domain:**
- EntityMetadata entity (id, logicalName, displayName, isCustomEntity only)
- Basic behavior: isCustom(), getDisplayName()
- IMetadataRepository interface (findAllEntities)

**Application:**
- ListEntitiesUseCase (basic list)
- EntityMetadataViewModel (id, logicalName, displayName, isCustom)
- EntityMetadataViewModelMapper

**Infrastructure:**
- DataverseMetadataRepository.findAllEntities()
- Basic API call: GET /EntityDefinitions?$select=MetadataId,LogicalName,DisplayName,IsCustomEntity

**Presentation:**
- MetadataBrowserPanel (singleton pattern)
- Simple left panel tree with entity names
- Middle panel showing "Select an entity to view attributes"
- HTML in metadataBrowserView.ts

**Result:** WORKING FEATURE ✅ (user sees entity list in tree, can select, sees message)
**Time:** ~60 minutes

---

### Slice 2: "User can view attributes for selected entity"
**Builds on:** Slice 1

**Domain:**
- AttributeMetadata entity (logicalName, displayName, attributeType, isCustomAttribute)
- Add EntityMetadata.attributes: readonly AttributeMetadata[]
- Basic behavior: getAttributeType(), isCustom()

**Application:**
- GetEntityWithAttributesUseCase (fetches entity + attributes)
- AttributeMetadataViewModel
- AttributeMetadataViewModelMapper

**Infrastructure:**
- Update DataverseMetadataRepository.findEntityById(logicalName)
- API: GET /EntityDefinitions(LogicalName='...')?$expand=Attributes

**Presentation:**
- Add Attributes tab in middle panel
- Data table with columns: Display Name, Logical Name, Type, Custom
- Wire up entity selection → load attributes

**Result:** ENHANCED FEATURE ✅ (user clicks entity, sees attributes in table)
**Time:** ~45 minutes

---

### Slice 3: "User can search/filter entity tree"
**Builds on:** Slice 2

**Domain:**
- Add EntityMetadata.matchesSearchTerm(term: string): boolean
- Search checks logicalName and displayName (case-insensitive)

**Application:**
- Add SearchEntitiesUseCase (filters entities client-side)
- Add searchTerm to ViewModels

**Infrastructure:**
- (no changes - filtering happens client-side)

**Presentation:**
- Add search input above tree
- Wire up search → filter tree items
- Show "No matches" when empty

**Result:** USER CAN SEARCH ENTITIES ✅
**Time:** ~30 minutes

---

### Slice 4: "User can filter by Custom/System"
**Builds on:** Slice 3

**Domain:**
- Add FilterOptions value object (showCustom: boolean, showSystem: boolean)
- Add EntityMetadata.matchesFilter(options: FilterOptions): boolean

**Application:**
- Extend SearchEntitiesUseCase to accept FilterOptions
- Add filterOptions to ViewModels

**Infrastructure:**
- (no changes - filtering happens client-side)

**Presentation:**
- Add Quick Filters section (collapsed by default)
- Checkboxes: Custom, System
- Wire up filter changes → refresh tree

**Result:** USER CAN FILTER BY CUSTOM/SYSTEM ✅
**Time:** ~30 minutes

---

### Slice 5: "User can view keys for selected entity"
**Builds on:** Slice 4

**Domain:**
- KeyMetadata entity (logicalName, displayName, keyAttributes: string[])
- Add EntityMetadata.keys: readonly KeyMetadata[]

**Application:**
- Extend GetEntityWithAttributesUseCase → GetEntityWithDetailsUseCase
- Add KeyMetadataViewModel, KeyMetadataViewModelMapper

**Infrastructure:**
- Update repository to expand Keys
- API: GET /EntityDefinitions(LogicalName='...')?$expand=Attributes,Keys

**Presentation:**
- Add Keys tab in middle panel
- Data table with columns: Display Name, Logical Name, Key Attributes

**Result:** USER CAN VIEW KEYS ✅
**Time:** ~30 minutes

---

### Slice 6: "User can view relationships for selected entity"
**Builds on:** Slice 5

**Domain:**
- RelationshipMetadata entity (schemaName, referencedEntity, referencingEntity, type)
- Types: OneToMany, ManyToOne, ManyToMany
- Add EntityMetadata.relationships: readonly RelationshipMetadata[]
- Behavior: isOneToMany(), isManyToMany(), getRelatedEntityName()

**Application:**
- Extend GetEntityWithDetailsUseCase
- RelationshipMetadataViewModel, mapper

**Infrastructure:**
- Update repository to expand Relationships
- API: GET /EntityDefinitions(LogicalName='...')?$expand=OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships

**Presentation:**
- Add Relationships tab in middle panel
- Data table: Schema Name, Type, Related Entity, Referencing/Referenced Attributes

**Result:** USER CAN VIEW RELATIONSHIPS ✅
**Time:** ~45 minutes

---

### Slice 7: "User can view privileges for selected entity"
**Builds on:** Slice 6

**Domain:**
- PrivilegeMetadata entity (name, privilegeId, privilegeType)
- Add EntityMetadata.privileges: readonly PrivilegeMetadata[]

**Application:**
- Extend GetEntityWithDetailsUseCase
- PrivilegeMetadataViewModel, mapper

**Infrastructure:**
- Update repository to expand Privileges
- API: GET /EntityDefinitions(LogicalName='...')?$expand=Privileges

**Presentation:**
- Add Privileges tab in middle panel
- Data table: Name, Type

**Result:** USER CAN VIEW PRIVILEGES ✅
**Time:** ~30 minutes

---

### Slice 8: "User can view choices (global option sets)"
**Builds on:** Slice 7

**Domain:**
- ChoiceMetadata entity (name, displayName, isCustom, options: ChoiceOption[])
- ChoiceOption value object (value: number, label: string, color?: string)
- Add IMetadataRepository.findAllChoices()

**Application:**
- ListChoicesUseCase
- ChoiceMetadataViewModel, mapper

**Infrastructure:**
- DataverseMetadataRepository.findAllChoices()
- API: GET /GlobalOptionSetDefinitions

**Presentation:**
- Add Choices to tree (separate section)
- Middle panel shows choice options table (columns: Value, Label)

**Result:** USER CAN VIEW CHOICES ✅
**Time:** ~45 minutes

---

### Slice 9: "User can view detail panel (Properties + Raw JSON)"
**Builds on:** Slice 8

**Domain:**
- Add EntityMetadata.getRawMetadata(): object (returns all metadata fields)
- Add AttributeMetadata.getRawMetadata(): object

**Application:**
- Add GetEntityRawMetadataQuery (returns raw object for JSON display)

**Infrastructure:**
- (no changes - data already available)

**Presentation:**
- Add right panel (hidden by default)
- Context menu: "View Details" → shows right panel
- Two tabs: Properties (formatted key-value), Raw Data (JSON)
- Close button to hide right panel

**Result:** USER CAN VIEW DETAIL PANEL ✅
**Time:** ~30 minutes

---

### Slice 10: "User can copy logical names"
**Builds on:** Slice 9

**Domain:**
- (no changes)

**Application:**
- (no changes)

**Infrastructure:**
- (no changes)

**Presentation:**
- Context menu: "Copy Logical Name" → copies to clipboard
- Show notification: "Copied to clipboard"

**Result:** USER CAN COPY LOGICAL NAMES ✅
**Time:** ~15 minutes

---

### Slice 11: "User can open in Maker (entity-specific URL)"
**Builds on:** Slice 10

**Domain:**
- Add EntityMetadata.getMakerUrl(environmentUrl: string): string

**Application:**
- (no changes)

**Infrastructure:**
- (no changes)

**Presentation:**
- Context menu: "Open in Maker" → opens browser to entity in Maker
- Top action: "Open in Maker" → opens entity list in Maker

**Result:** USER CAN OPEN IN MAKER ✅
**Time:** ~15 minutes

---

### Slice 12: "User can navigate to related entity from relationship"
**Builds on:** Slice 11

**Domain:**
- Add RelationshipMetadata.getRelatedEntityLogicalName(): string

**Application:**
- (no changes)

**Infrastructure:**
- (no changes)

**Presentation:**
- Context menu on relationship row: "Navigate to Related Entity"
- Updates tree selection and loads related entity

**Result:** USER CAN NAVIGATE TO RELATED ENTITY ✅
**Time:** ~20 minutes

---

### Slice 13: "Filter state persists per environment"
**Builds on:** Slice 12

**Domain:**
- FilterPreferences entity (environmentId, showCustom, showSystem, showManaged, showUnmanaged)
- IFilterPreferencesRepository interface

**Application:**
- SaveFilterPreferencesCommand
- LoadFilterPreferencesQuery

**Infrastructure:**
- VSCodeStorageFilterPreferencesRepository (uses globalState)

**Presentation:**
- On filter change → save preferences
- On environment change → load preferences

**Result:** FILTER STATE PERSISTS ✅
**Time:** ~30 minutes

---

### Slice 14: "User can filter by Managed/Unmanaged"
**Builds on:** Slice 13

**Domain:**
- Add isManaged field to EntityMetadata, AttributeMetadata, ChoiceMetadata
- Update FilterOptions to include showManaged, showUnmanaged

**Application:**
- Update SearchEntitiesUseCase, SearchChoicesUseCase

**Infrastructure:**
- Update API queries to select IsManaged field

**Presentation:**
- Add Managed/Unmanaged checkboxes to Quick Filters

**Result:** USER CAN FILTER BY MANAGED/UNMANAGED ✅
**Time:** ~30 minutes

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - MetadataBrowserPanel orchestrates use cases              │
│ - Maps ViewModels → webview messages                       │
│ - HTML extracted to metadataBrowserView.ts                 │
│ - NO business logic                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - Use cases orchestrate domain entities (NO business logic)│
│ - ViewModels are DTOs (no behavior)                        │
│ - Mappers transform domain → ViewModel                     │
│ - Logging at use case boundaries                            │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - Rich entities: EntityMetadata, AttributeMetadata, etc.   │
│ - Value objects: FilterOptions, ChoiceOption, etc.         │
│ - Repository interfaces (domain defines contracts)         │
│ - Business logic: isCustom(), matchesFilter(), etc.        │
│ - ZERO external dependencies, NO logging                   │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - DataverseMetadataRepository implements IMetadataRepository│
│ - Calls Dataverse Web API for EntityDefinitions            │
│ - Maps API DTOs → Domain entities                          │
│ - VSCodeStorageFilterPreferencesRepository                 │
│ - Logging for API calls                                     │
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

> **Note:** Type contracts reviewed and approved by typescript-pro with branded types, union types, and discriminated unions for maximum type safety.

#### Branded Types (Prevent Wrong String Types)

```typescript
// Prevents passing wrong string types (e.g., passing environmentId where logicalName expected)
export type EntityLogicalName = string & { readonly __brand: 'EntityLogicalName' };
export type EnvironmentId = string & { readonly __brand: 'EnvironmentId' };

// Type guards for runtime validation at domain boundaries
export function isEntityLogicalName(value: string): value is EntityLogicalName {
  return typeof value === 'string' && value.length > 0 && /^[a-z_][a-z0-9_]*$/.test(value);
}

export function isEnvironmentId(value: string): value is EnvironmentId {
  return typeof value === 'string' && value.length > 0;
}
```

#### Union Types (Exhaustive Type Checking)

```typescript
// Attribute types (exhaustive - enables switch exhaustiveness checking)
export type AttributeType =
  | 'String'
  | 'Integer'
  | 'Boolean'
  | 'DateTime'
  | 'Decimal'
  | 'Money'
  | 'Lookup'
  | 'Picklist'
  | 'MultiSelectPicklist'
  | 'Memo'
  | 'Owner'
  | 'Customer'
  | 'Status'
  | 'State'
  | 'Uniqueidentifier';

// Type guard validates API data at repository boundary
export function isAttributeType(value: string): value is AttributeType {
  const validTypes: AttributeType[] = [
    'String', 'Integer', 'Boolean', 'DateTime', 'Decimal', 'Money',
    'Lookup', 'Picklist', 'MultiSelectPicklist', 'Memo', 'Owner',
    'Customer', 'Status', 'State', 'Uniqueidentifier'
  ];
  return validTypes.includes(value as AttributeType);
}

// Relationship types (exhaustive)
export type RelationshipType = 'OneToMany' | 'ManyToOne' | 'ManyToMany';

export function isRelationshipType(value: string): value is RelationshipType {
  return value === 'OneToMany' || value === 'ManyToOne' || value === 'ManyToMany';
}
```

#### Entities

```typescript
// Rich entity with BEHAVIOR (not anemic)
export class EntityMetadata {
  private constructor(
    private readonly metadataId: string,
    private readonly logicalName: EntityLogicalName, // ✅ Branded type
    private readonly displayName: string,
    private readonly isCustomEntity: boolean,
    private readonly isManaged: boolean,
    private readonly attributes: readonly AttributeMetadata[],
    private readonly keys: readonly KeyMetadata[],
    private readonly relationships: readonly RelationshipMetadata[],
    private readonly privileges: readonly PrivilegeMetadata[]
  ) {}

  // Rich behavior (business logic belongs here)
  public isCustom(): boolean {
    return this.isCustomEntity;
  }

  public isSystem(): boolean {
    return !this.isCustomEntity;
  }

  public matchesSearchTerm(term: string): boolean {
    if (!term.trim()) return true;
    const lowerTerm = term.toLowerCase();
    return (
      this.logicalName.toLowerCase().includes(lowerTerm) ||
      this.displayName.toLowerCase().includes(lowerTerm)
    );
  }

  public matchesFilter(options: FilterOptions): boolean {
    return FilterOptionsHelper.matches(options, this.isCustomEntity, this.isManaged);
  }

  public getMakerUrl(environmentUrl: string): string {
    return `${environmentUrl}/tools/solution/entities/${this.logicalName}`;
  }

  public getAttributeCount(): number {
    return this.attributes.length;
  }

  public getCustomAttributeCount(): number {
    return this.attributes.filter(a => a.isCustom()).length;
  }

  public getRawMetadata(): object {
    return {
      metadataId: this.metadataId,
      logicalName: this.logicalName,
      displayName: this.displayName,
      isCustomEntity: this.isCustomEntity,
      isManaged: this.isManaged,
      attributeCount: this.attributes.length,
      keyCount: this.keys.length,
      relationshipCount: this.relationships.length,
      privilegeCount: this.privileges.length
    };
  }

  // Factory method with validation
  public static create(params: {
    metadataId: string;
    logicalName: string;
    displayName: string;
    isCustomEntity: boolean;
    isManaged: boolean;
    attributes?: readonly AttributeMetadata[];
    keys?: readonly KeyMetadata[];
    relationships?: readonly RelationshipMetadata[];
    privileges?: readonly PrivilegeMetadata[];
  }): EntityMetadata {
    if (!params.metadataId?.trim()) {
      throw new Error('MetadataId is required');
    }
    if (!isEntityLogicalName(params.logicalName)) {
      throw new Error(`Invalid entity logical name: ${params.logicalName}`);
    }
    if (!params.displayName?.trim()) {
      throw new Error('DisplayName is required');
    }

    return new EntityMetadata(
      params.metadataId,
      params.logicalName as EntityLogicalName,
      params.displayName,
      params.isCustomEntity,
      params.isManaged,
      params.attributes ?? [],
      params.keys ?? [],
      params.relationships ?? [],
      params.privileges ?? []
    );
  }

  // Getters for immutable access
  public getMetadataId(): string { return this.metadataId; }
  public getLogicalName(): EntityLogicalName { return this.logicalName; }
  public getDisplayName(): string { return this.displayName; }
  public getIsManaged(): boolean { return this.isManaged; }
  public getAttributes(): readonly AttributeMetadata[] { return this.attributes; }
  public getKeys(): readonly KeyMetadata[] { return this.keys; }
  public getRelationships(): readonly RelationshipMetadata[] { return this.relationships; }
  public getPrivileges(): readonly PrivilegeMetadata[] { return this.privileges; }
}
```

```typescript
export class AttributeMetadata {
  private constructor(
    private readonly logicalName: string,
    private readonly displayName: string,
    private readonly attributeType: AttributeType, // ✅ Union type (not string)
    private readonly isCustomAttribute: boolean,
    private readonly isManaged: boolean,
    private readonly isPrimaryId: boolean,
    private readonly isPrimaryName: boolean,
    private readonly isValidForCreate: boolean,
    private readonly isValidForUpdate: boolean,
    private readonly isValidForRead: boolean,
    private readonly requiredLevel: string,
    private readonly maxLength: number | undefined // ✅ undefined (not optional with ?)
  ) {}

  public isCustom(): boolean {
    return this.isCustomAttribute;
  }

  public isSystem(): boolean {
    return !this.isCustomAttribute;
  }

  public isPrimary(): boolean {
    return this.isPrimaryId || this.isPrimaryName;
  }

  public isRequired(): boolean {
    return this.requiredLevel === 'ApplicationRequired' || this.requiredLevel === 'SystemRequired';
  }

  public isReadOnly(): boolean {
    return !this.isValidForCreate && !this.isValidForUpdate;
  }

  public getAttributeTypeDisplay(): string {
    // Format attribute type for display (exhaustive switch ensures all types handled)
    const typeMap: Record<AttributeType, string> = {
      'String': 'Single Line of Text',
      'Integer': 'Whole Number',
      'Boolean': 'Yes/No',
      'DateTime': 'Date and Time',
      'Decimal': 'Decimal Number',
      'Money': 'Currency',
      'Lookup': 'Lookup',
      'Picklist': 'Choice',
      'MultiSelectPicklist': 'Choices',
      'Memo': 'Multiple Lines of Text',
      'Owner': 'Owner',
      'Customer': 'Customer',
      'Status': 'Status',
      'State': 'Status Reason',
      'Uniqueidentifier': 'Unique Identifier'
    };
    return typeMap[this.attributeType];
  }

  public getRawMetadata(): object {
    return {
      logicalName: this.logicalName,
      displayName: this.displayName,
      attributeType: this.attributeType,
      isCustomAttribute: this.isCustomAttribute,
      isManaged: this.isManaged,
      isPrimaryId: this.isPrimaryId,
      isPrimaryName: this.isPrimaryName,
      requiredLevel: this.requiredLevel,
      maxLength: this.maxLength
    };
  }

  public static create(params: {
    logicalName: string;
    displayName: string;
    attributeType: string; // string in, AttributeType out (validated)
    isCustomAttribute: boolean;
    isManaged: boolean;
    isPrimaryId?: boolean;
    isPrimaryName?: boolean;
    isValidForCreate?: boolean;
    isValidForUpdate?: boolean;
    isValidForRead?: boolean;
    requiredLevel?: string;
    maxLength?: number;
  }): AttributeMetadata {
    if (!params.logicalName?.trim()) {
      throw new Error('LogicalName is required');
    }
    if (!params.displayName?.trim()) {
      throw new Error('DisplayName is required');
    }
    if (!isAttributeType(params.attributeType)) {
      throw new Error(`Invalid attribute type: ${params.attributeType}`);
    }

    return new AttributeMetadata(
      params.logicalName,
      params.displayName,
      params.attributeType, // ✅ Type guard ensured it's AttributeType
      params.isCustomAttribute,
      params.isManaged,
      params.isPrimaryId ?? false,
      params.isPrimaryName ?? false,
      params.isValidForCreate ?? true,
      params.isValidForUpdate ?? true,
      params.isValidForRead ?? true,
      params.requiredLevel ?? 'None',
      params.maxLength // ✅ undefined if not provided
    );
  }

  public getLogicalName(): string { return this.logicalName; }
  public getDisplayName(): string { return this.displayName; }
  public getAttributeType(): AttributeType { return this.attributeType; }
  public getIsManaged(): boolean { return this.isManaged; }
  public getRequiredLevel(): string { return this.requiredLevel; }
  public getMaxLength(): number | undefined { return this.maxLength; }
}
```

```typescript
export class KeyMetadata {
  private constructor(
    private readonly logicalName: string,
    private readonly displayName: string,
    private readonly keyAttributes: readonly string[]
  ) {}

  public getAttributeCount(): number {
    return this.keyAttributes.length;
  }

  public getAttributesDisplay(): string {
    return this.keyAttributes.join(', ');
  }

  public static create(params: {
    logicalName: string;
    displayName: string;
    keyAttributes: readonly string[];
  }): KeyMetadata {
    if (!params.logicalName?.trim()) {
      throw new ValidationError('KeyMetadata', 'logicalName', params.logicalName, 'LogicalName is required');
    }
    if (!params.keyAttributes || params.keyAttributes.length === 0) {
      throw new ValidationError('KeyMetadata', 'keyAttributes', params.keyAttributes, 'At least one key attribute is required');
    }

    return new KeyMetadata(
      params.logicalName,
      params.displayName,
      params.keyAttributes
    );
  }

  public getLogicalName(): string { return this.logicalName; }
  public getDisplayName(): string { return this.displayName; }
  public getKeyAttributes(): readonly string[] { return this.keyAttributes; }
}
```

```typescript
export class RelationshipMetadata {
  private constructor(
    private readonly schemaName: string,
    private readonly relationshipType: RelationshipType, // ✅ Union type (not string)
    private readonly referencedEntity: EntityLogicalName, // ✅ Branded type
    private readonly referencingEntity: EntityLogicalName, // ✅ Branded type
    private readonly referencedAttribute: string | undefined,
    private readonly referencingAttribute: string | undefined
  ) {}

  public isOneToMany(): boolean {
    return this.relationshipType === 'OneToMany';
  }

  public isManyToOne(): boolean {
    return this.relationshipType === 'ManyToOne';
  }

  public isManyToMany(): boolean {
    return this.relationshipType === 'ManyToMany';
  }

  public getRelatedEntityName(fromEntity: EntityLogicalName): EntityLogicalName {
    // For the current entity, return the "other" entity in the relationship
    return fromEntity === this.referencedEntity
      ? this.referencingEntity
      : this.referencedEntity;
  }

  public getRelationshipTypeDisplay(): string {
    // Exhaustive switch - TypeScript ensures all cases handled
    switch (this.relationshipType) {
      case 'OneToMany': return '1:N';
      case 'ManyToOne': return 'N:1';
      case 'ManyToMany': return 'N:N';
    }
  }

  public static create(params: {
    schemaName: string;
    relationshipType: string; // string in, RelationshipType out (validated)
    referencedEntity: string;
    referencingEntity: string;
    referencedAttribute?: string;
    referencingAttribute?: string;
  }): RelationshipMetadata {
    if (!params.schemaName?.trim()) {
      throw new Error('SchemaName is required');
    }
    if (!isRelationshipType(params.relationshipType)) {
      throw new Error(`Invalid relationship type: ${params.relationshipType}`);
    }
    if (!isEntityLogicalName(params.referencedEntity)) {
      throw new Error(`Invalid referenced entity: ${params.referencedEntity}`);
    }
    if (!isEntityLogicalName(params.referencingEntity)) {
      throw new Error(`Invalid referencing entity: ${params.referencingEntity}`);
    }

    return new RelationshipMetadata(
      params.schemaName,
      params.relationshipType, // ✅ Type guard ensured it's RelationshipType
      params.referencedEntity as EntityLogicalName,
      params.referencingEntity as EntityLogicalName,
      params.referencedAttribute,
      params.referencingAttribute
    );
  }

  public getSchemaName(): string { return this.schemaName; }
  public getRelationshipType(): RelationshipType { return this.relationshipType; }
  public getReferencedEntity(): EntityLogicalName { return this.referencedEntity; }
  public getReferencingEntity(): EntityLogicalName { return this.referencingEntity; }
  public getReferencedAttribute(): string | undefined { return this.referencedAttribute; }
  public getReferencingAttribute(): string | undefined { return this.referencingAttribute; }
}
```

```typescript
export class PrivilegeMetadata {
  private constructor(
    private readonly name: string,
    private readonly privilegeId: string,
    private readonly privilegeType: PrivilegeType
  ) {}

  public getPrivilegeTypeDisplay(): string {
    switch (this.privilegeType) {
      case PrivilegeType.Create: return 'Create';
      case PrivilegeType.Read: return 'Read';
      case PrivilegeType.Write: return 'Write';
      case PrivilegeType.Delete: return 'Delete';
      case PrivilegeType.Assign: return 'Assign';
      case PrivilegeType.Share: return 'Share';
      case PrivilegeType.Append: return 'Append';
      case PrivilegeType.AppendTo: return 'AppendTo';
    }
  }

  public static create(params: {
    name: string;
    privilegeId: string;
    privilegeType: PrivilegeType;
  }): PrivilegeMetadata {
    if (!params.name?.trim()) {
      throw new ValidationError('PrivilegeMetadata', 'name', params.name, 'Name is required');
    }

    return new PrivilegeMetadata(
      params.name,
      params.privilegeId,
      params.privilegeType
    );
  }

  public getName(): string { return this.name; }
  public getPrivilegeId(): string { return this.privilegeId; }
  public getPrivilegeType(): PrivilegeType { return this.privilegeType; }
}
```

```typescript
export class ChoiceMetadata {
  private constructor(
    private readonly name: string,
    private readonly displayName: string,
    private readonly isCustom: boolean,
    private readonly isManaged: boolean,
    private readonly options: readonly ChoiceOption[]
  ) {}

  public isGlobal(): boolean {
    return true; // All ChoiceMetadata instances are global option sets
  }

  public matchesSearchTerm(term: string): boolean {
    if (!term.trim()) return true;
    const lowerTerm = term.toLowerCase();
    return (
      this.name.toLowerCase().includes(lowerTerm) ||
      this.displayName.toLowerCase().includes(lowerTerm)
    );
  }

  public matchesFilter(options: FilterOptions): boolean {
    if (!options.getShowCustom() && this.isCustom) return false;
    if (!options.getShowSystem() && !this.isCustom) return false;
    if (!options.getShowManaged() && this.isManaged) return false;
    if (!options.getShowUnmanaged() && !this.isManaged) return false;
    return true;
  }

  public getOptionCount(): number {
    return this.options.length;
  }

  public static create(params: {
    name: string;
    displayName: string;
    isCustom: boolean;
    isManaged: boolean;
    options: readonly ChoiceOption[];
  }): ChoiceMetadata {
    if (!params.name?.trim()) {
      throw new ValidationError('ChoiceMetadata', 'name', params.name, 'Name is required');
    }

    return new ChoiceMetadata(
      params.name,
      params.displayName,
      params.isCustom,
      params.isManaged,
      params.options
    );
  }

  public getName(): string { return this.name; }
  public getDisplayName(): string { return this.displayName; }
  public getIsCustom(): boolean { return this.isCustom; }
  public getIsManaged(): boolean { return this.isManaged; }
  public getOptions(): readonly ChoiceOption[] { return this.options; }
}
```

#### Value Objects

```typescript
// ✅ Discriminated union - makes impossible states impossible
// Cannot be both custom-only AND system-only (mutually exclusive)
export type FilterOptions =
  | { type: 'all' }
  | { type: 'custom-only' }
  | { type: 'system-only' }
  | { type: 'managed-only' }
  | { type: 'unmanaged-only' };

// Helper for creating filter options
export class FilterOptionsFactory {
  public static all(): FilterOptions {
    return { type: 'all' };
  }

  public static customOnly(): FilterOptions {
    return { type: 'custom-only' };
  }

  public static systemOnly(): FilterOptions {
    return { type: 'system-only' };
  }

  public static managedOnly(): FilterOptions {
    return { type: 'managed-only' };
  }

  public static unmanagedOnly(): FilterOptions {
    return { type: 'unmanaged-only' };
  }
}

// Helper for matching logic (used by entities)
export class FilterOptionsHelper {
  public static matches(
    filter: FilterOptions,
    isCustom: boolean,
    isManaged: boolean
  ): boolean {
    // Exhaustive switch - TypeScript ensures all cases handled
    switch (filter.type) {
      case 'all':
        return true;
      case 'custom-only':
        return isCustom;
      case 'system-only':
        return !isCustom;
      case 'managed-only':
        return isManaged;
      case 'unmanaged-only':
        return !isManaged;
    }
  }
}
```

```typescript
// ✅ ChoiceOption as value object (not interface)
export class ChoiceOption {
  private constructor(
    private readonly value: number,
    private readonly label: string,
    private readonly color: string | undefined
  ) {}

  public static create(params: {
    value: number;
    label: string;
    color?: string;
  }): ChoiceOption {
    if (!params.label?.trim()) {
      throw new Error('Label is required');
    }

    return new ChoiceOption(
      params.value,
      params.label,
      params.color
    );
  }

  public getValue(): number { return this.value; }
  public getLabel(): string { return this.label; }
  public getColor(): string | undefined { return this.color; }
}
```

#### Repository Interfaces

```typescript
// Domain defines the contract (uses branded types for type safety)
export interface IMetadataRepository {
  /**
   * Retrieves all entity definitions (basic fields only).
   * Does NOT include attributes, keys, relationships, privileges.
   */
  findAllEntities(environmentId: EnvironmentId): Promise<readonly EntityMetadata[]>;

  /**
   * Retrieves a single entity definition WITH all related metadata.
   * Includes attributes, keys, relationships, privileges.
   *
   * @returns EntityMetadata if found, null if not found (NOT undefined)
   */
  findEntityByLogicalName(
    environmentId: EnvironmentId,
    logicalName: EntityLogicalName
  ): Promise<EntityMetadata | null>;

  /**
   * Retrieves all global option sets (choices).
   */
  findAllChoices(environmentId: EnvironmentId): Promise<readonly ChoiceMetadata[]>;

  /**
   * Retrieves a single choice by logical name.
   *
   * @returns ChoiceMetadata if found, null if not found (NOT undefined)
   */
  findChoiceByLogicalName(
    environmentId: EnvironmentId,
    logicalName: string
  ): Promise<ChoiceMetadata | null>;
}
```

```typescript
export interface IFilterPreferencesRepository {
  /**
   * Saves filter preferences for a specific environment.
   */
  saveFilterPreferences(
    environmentId: EnvironmentId,
    filterOptions: FilterOptions
  ): Promise<void>;

  /**
   * Loads filter preferences for a specific environment.
   *
   * @returns FilterOptions if found, null if not found (NOT undefined - use FilterOptionsFactory.all() as default)
   */
  loadFilterPreferences(
    environmentId: EnvironmentId
  ): Promise<FilterOptions | null>;
}
```

---

### Application Layer Types

#### Use Cases

```typescript
export class ListEntitiesUseCase {
  constructor(
    private readonly metadataRepository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(params: {
    environmentId: string;
    searchTerm?: string;
    filterOptions?: FilterOptions;
  }): Promise<readonly EntityMetadata[]> {
    this.logger.info('ListEntitiesUseCase: Starting', { environmentId: params.environmentId });

    const allEntities = await this.metadataRepository.findAllEntities(params.environmentId);

    // Filter by search term
    let filtered = allEntities;
    if (params.searchTerm) {
      filtered = filtered.filter(e => e.matchesSearchTerm(params.searchTerm!));
    }

    // Filter by options
    if (params.filterOptions) {
      filtered = filtered.filter(e => e.matchesFilter(params.filterOptions!));
    }

    this.logger.info('ListEntitiesUseCase: Completed', {
      total: allEntities.length,
      filtered: filtered.length
    });

    return filtered;
  }
}
```

```typescript
export class GetEntityWithDetailsUseCase {
  constructor(
    private readonly metadataRepository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(params: {
    environmentId: string;
    logicalName: string;
  }): Promise<EntityMetadata | null> {
    this.logger.info('GetEntityWithDetailsUseCase: Starting', params);

    const entity = await this.metadataRepository.findEntityById(
      params.environmentId,
      params.logicalName
    );

    if (!entity) {
      this.logger.warn('GetEntityWithDetailsUseCase: Entity not found', params);
      return null;
    }

    this.logger.info('GetEntityWithDetailsUseCase: Completed', {
      logicalName: params.logicalName,
      attributeCount: entity.getAttributeCount()
    });

    return entity;
  }
}
```

```typescript
export class ListChoicesUseCase {
  constructor(
    private readonly metadataRepository: IMetadataRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(params: {
    environmentId: string;
    searchTerm?: string;
    filterOptions?: FilterOptions;
  }): Promise<readonly ChoiceMetadata[]> {
    this.logger.info('ListChoicesUseCase: Starting', { environmentId: params.environmentId });

    const allChoices = await this.metadataRepository.findAllChoices(params.environmentId);

    // Filter by search term
    let filtered = allChoices;
    if (params.searchTerm) {
      filtered = filtered.filter(c => c.matchesSearchTerm(params.searchTerm!));
    }

    // Filter by options
    if (params.filterOptions) {
      filtered = filtered.filter(c => c.matchesFilter(params.filterOptions!));
    }

    this.logger.info('ListChoicesUseCase: Completed', {
      total: allChoices.length,
      filtered: filtered.length
    });

    return filtered;
  }
}
```

```typescript
export class SaveFilterPreferencesCommand {
  constructor(
    private readonly preferencesRepository: IFilterPreferencesRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(params: {
    environmentId: string;
    filterOptions: FilterOptions;
  }): Promise<void> {
    this.logger.info('SaveFilterPreferencesCommand: Saving', params);

    await this.preferencesRepository.save(
      params.environmentId,
      params.filterOptions
    );

    this.logger.info('SaveFilterPreferencesCommand: Completed');
  }
}
```

```typescript
export class LoadFilterPreferencesQuery {
  constructor(
    private readonly preferencesRepository: IFilterPreferencesRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(params: {
    environmentId: string;
  }): Promise<FilterOptions> {
    this.logger.info('LoadFilterPreferencesQuery: Loading', params);

    const options = await this.preferencesRepository.load(params.environmentId);

    this.logger.info('LoadFilterPreferencesQuery: Completed');

    return options;
  }
}
```

#### ViewModels

```typescript
// DTO for presentation (NO behavior)
export interface EntityMetadataViewModel {
  readonly metadataId: string;
  readonly logicalName: string;
  readonly displayName: string;
  readonly isCustom: boolean;
  readonly isManaged: boolean;
  readonly attributeCount: number;
  readonly customAttributeCount: number;
}

export interface AttributeMetadataViewModel {
  readonly logicalName: string;
  readonly displayName: string;
  readonly attributeType: string;
  readonly isCustom: boolean;
  readonly isManaged: boolean;
  readonly isPrimary: boolean;
  readonly isRequired: boolean;
  readonly isReadOnly: boolean;
  readonly maxLength?: number;
}

export interface KeyMetadataViewModel {
  readonly logicalName: string;
  readonly displayName: string;
  readonly keyAttributes: string;
  readonly attributeCount: number;
}

export interface RelationshipMetadataViewModel {
  readonly schemaName: string;
  readonly relationshipType: string;
  readonly referencedEntity: string;
  readonly referencingEntity: string;
  readonly referencedAttribute?: string;
  readonly referencingAttribute?: string;
}

export interface PrivilegeMetadataViewModel {
  readonly name: string;
  readonly privilegeId: string;
  readonly privilegeType: string;
}

export interface ChoiceMetadataViewModel {
  readonly name: string;
  readonly displayName: string;
  readonly isCustom: boolean;
  readonly isManaged: boolean;
  readonly optionCount: number;
}

export interface ChoiceOptionViewModel {
  readonly value: number;
  readonly label: string;
  readonly color?: string;
}

export interface FilterOptionsViewModel {
  readonly showCustom: boolean;
  readonly showSystem: boolean;
  readonly showManaged: boolean;
  readonly showUnmanaged: boolean;
}
```

#### Mappers

```typescript
export class EntityMetadataViewModelMapper {
  // Transform only (NO sorting params, NO business logic)
  public toViewModel(entity: EntityMetadata): EntityMetadataViewModel {
    return {
      metadataId: entity.getMetadataId(),
      logicalName: entity.getLogicalName(),
      displayName: entity.getDisplayName(),
      isCustom: entity.isCustom(),
      isManaged: entity.getIsManaged(),
      attributeCount: entity.getAttributeCount(),
      customAttributeCount: entity.getCustomAttributeCount()
    };
  }

  public toViewModels(entities: readonly EntityMetadata[]): EntityMetadataViewModel[] {
    return entities.map(e => this.toViewModel(e));
  }
}
```

```typescript
export class AttributeMetadataViewModelMapper {
  public toViewModel(attribute: AttributeMetadata): AttributeMetadataViewModel {
    return {
      logicalName: attribute.getLogicalName(),
      displayName: attribute.getDisplayName(),
      attributeType: attribute.getAttributeTypeDisplay(),
      isCustom: attribute.isCustom(),
      isManaged: attribute.getIsManaged(),
      isPrimary: attribute.isPrimary(),
      isRequired: attribute.isRequired(),
      isReadOnly: attribute.isReadOnly(),
      maxLength: attribute.getMaxLength()
    };
  }

  public toViewModels(attributes: readonly AttributeMetadata[]): AttributeMetadataViewModel[] {
    return attributes.map(a => this.toViewModel(a));
  }
}
```

```typescript
export class KeyMetadataViewModelMapper {
  public toViewModel(key: KeyMetadata): KeyMetadataViewModel {
    return {
      logicalName: key.getLogicalName(),
      displayName: key.getDisplayName(),
      keyAttributes: key.getAttributesDisplay(),
      attributeCount: key.getAttributeCount()
    };
  }

  public toViewModels(keys: readonly KeyMetadata[]): KeyMetadataViewModel[] {
    return keys.map(k => this.toViewModel(k));
  }
}
```

```typescript
export class RelationshipMetadataViewModelMapper {
  public toViewModel(relationship: RelationshipMetadata): RelationshipMetadataViewModel {
    return {
      schemaName: relationship.getSchemaName(),
      relationshipType: relationship.getRelationshipTypeDisplay(),
      referencedEntity: relationship.getReferencedEntity(),
      referencingEntity: relationship.getReferencingEntity(),
      referencedAttribute: relationship.getReferencedAttribute(),
      referencingAttribute: relationship.getReferencingAttribute()
    };
  }

  public toViewModels(relationships: readonly RelationshipMetadata[]): RelationshipMetadataViewModel[] {
    return relationships.map(r => this.toViewModel(r));
  }
}
```

```typescript
export class PrivilegeMetadataViewModelMapper {
  public toViewModel(privilege: PrivilegeMetadata): PrivilegeMetadataViewModel {
    return {
      name: privilege.getName(),
      privilegeId: privilege.getPrivilegeId(),
      privilegeType: privilege.getPrivilegeTypeDisplay()
    };
  }

  public toViewModels(privileges: readonly PrivilegeMetadata[]): PrivilegeMetadataViewModel[] {
    return privileges.map(p => this.toViewModel(p));
  }
}
```

```typescript
export class ChoiceMetadataViewModelMapper {
  public toViewModel(choice: ChoiceMetadata): ChoiceMetadataViewModel {
    return {
      name: choice.getName(),
      displayName: choice.getDisplayName(),
      isCustom: choice.getIsCustom(),
      isManaged: choice.getIsManaged(),
      optionCount: choice.getOptionCount()
    };
  }

  public toViewModels(choices: readonly ChoiceMetadata[]): ChoiceMetadataViewModel[] {
    return choices.map(c => this.toViewModel(c));
  }
}
```

```typescript
export class ChoiceOptionViewModelMapper {
  public toViewModel(option: ChoiceOption): ChoiceOptionViewModel {
    return {
      value: option.getValue(),
      label: option.getLabel(),
      color: option.getColor()
    };
  }

  public toViewModels(options: readonly ChoiceOption[]): ChoiceOptionViewModel[] {
    return options.map(o => this.toViewModel(o));
  }
}
```

```typescript
export class FilterOptionsViewModelMapper {
  public toViewModel(options: FilterOptions): FilterOptionsViewModel {
    return {
      showCustom: options.getShowCustom(),
      showSystem: options.getShowSystem(),
      showManaged: options.getShowManaged(),
      showUnmanaged: options.getShowUnmanaged()
    };
  }

  public fromViewModel(vm: FilterOptionsViewModel): FilterOptions {
    return FilterOptions.create({
      showCustom: vm.showCustom,
      showSystem: vm.showSystem,
      showManaged: vm.showManaged,
      showUnmanaged: vm.showUnmanaged
    });
  }
}
```

---

### Infrastructure Layer Types

#### Repository Implementation

```typescript
export class DataverseMetadataRepository implements IMetadataRepository {
  constructor(
    private readonly dataverseApiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  public async findAllEntities(environmentId: string): Promise<readonly EntityMetadata[]> {
    this.logger.debug('DataverseMetadataRepository: Fetching all entities', { environmentId });

    const endpoint = '/api/data/v9.2/EntityDefinitions';
    const params = {
      $select: 'MetadataId,LogicalName,DisplayName,IsCustomEntity,IsManaged'
    };

    const response = await this.dataverseApiService.get<EntityDefinitionDto[]>(
      environmentId,
      endpoint,
      params
    );

    const entities = response.map(dto => this.mapEntityDtoToDomain(dto));

    this.logger.debug('DataverseMetadataRepository: Fetched entities', {
      count: entities.length
    });

    return entities;
  }

  public async findEntityById(
    environmentId: string,
    logicalName: string
  ): Promise<EntityMetadata | null> {
    this.logger.debug('DataverseMetadataRepository: Fetching entity by ID', {
      environmentId,
      logicalName
    });

    const endpoint = `/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')`;
    const params = {
      $expand: 'Attributes,Keys,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships,Privileges'
    };

    try {
      const response = await this.dataverseApiService.get<EntityDefinitionWithDetailsDto>(
        environmentId,
        endpoint,
        params
      );

      const entity = this.mapEntityWithDetailsDtoToDomain(response);

      this.logger.debug('DataverseMetadataRepository: Fetched entity', {
        logicalName,
        attributeCount: entity.getAttributeCount()
      });

      return entity;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        this.logger.warn('DataverseMetadataRepository: Entity not found', { logicalName });
        return null;
      }
      throw error;
    }
  }

  public async findAllChoices(environmentId: string): Promise<readonly ChoiceMetadata[]> {
    this.logger.debug('DataverseMetadataRepository: Fetching all choices', { environmentId });

    const endpoint = '/api/data/v9.2/GlobalOptionSetDefinitions';

    const response = await this.dataverseApiService.get<GlobalOptionSetDefinitionDto[]>(
      environmentId,
      endpoint
    );

    const choices = response.map(dto => this.mapChoiceDtoToDomain(dto));

    this.logger.debug('DataverseMetadataRepository: Fetched choices', {
      count: choices.length
    });

    return choices;
  }

  private mapEntityDtoToDomain(dto: EntityDefinitionDto): EntityMetadata {
    return EntityMetadata.create({
      metadataId: dto.MetadataId,
      logicalName: dto.LogicalName,
      displayName: dto.DisplayName?.UserLocalizedLabel?.Label ?? dto.LogicalName,
      isCustomEntity: dto.IsCustomEntity ?? false,
      isManaged: dto.IsManaged ?? false
    });
  }

  private mapEntityWithDetailsDtoToDomain(dto: EntityDefinitionWithDetailsDto): EntityMetadata {
    const attributes = (dto.Attributes ?? []).map(a => this.mapAttributeDtoToDomain(a));
    const keys = (dto.Keys ?? []).map(k => this.mapKeyDtoToDomain(k));
    const relationships = [
      ...(dto.OneToManyRelationships ?? []).map(r => this.mapRelationshipDtoToDomain(r, RelationshipType.OneToMany)),
      ...(dto.ManyToOneRelationships ?? []).map(r => this.mapRelationshipDtoToDomain(r, RelationshipType.ManyToOne)),
      ...(dto.ManyToManyRelationships ?? []).map(r => this.mapRelationshipDtoToDomain(r, RelationshipType.ManyToMany))
    ];
    const privileges = (dto.Privileges ?? []).map(p => this.mapPrivilegeDtoToDomain(p));

    return EntityMetadata.create({
      metadataId: dto.MetadataId,
      logicalName: dto.LogicalName,
      displayName: dto.DisplayName?.UserLocalizedLabel?.Label ?? dto.LogicalName,
      isCustomEntity: dto.IsCustomEntity ?? false,
      isManaged: dto.IsManaged ?? false,
      attributes,
      keys,
      relationships,
      privileges
    });
  }

  private mapAttributeDtoToDomain(dto: AttributeMetadataDto): AttributeMetadata {
    return AttributeMetadata.create({
      logicalName: dto.LogicalName,
      displayName: dto.DisplayName?.UserLocalizedLabel?.Label ?? dto.LogicalName,
      attributeType: dto.AttributeType,
      isCustomAttribute: dto.IsCustomAttribute ?? false,
      isManaged: dto.IsManaged ?? false,
      isPrimaryId: dto.IsPrimaryId ?? false,
      isPrimaryName: dto.IsPrimaryName ?? false,
      isValidForCreate: dto.IsValidForCreate ?? true,
      isValidForUpdate: dto.IsValidForUpdate ?? true,
      isValidForRead: dto.IsValidForRead ?? true,
      requiredLevel: dto.RequiredLevel?.Value ?? 'None',
      maxLength: dto.MaxLength
    });
  }

  private mapKeyDtoToDomain(dto: KeyMetadataDto): KeyMetadata {
    return KeyMetadata.create({
      logicalName: dto.LogicalName,
      displayName: dto.DisplayName?.UserLocalizedLabel?.Label ?? dto.LogicalName,
      keyAttributes: dto.KeyAttributes ?? []
    });
  }

  private mapRelationshipDtoToDomain(
    dto: RelationshipMetadataDto,
    type: RelationshipType
  ): RelationshipMetadata {
    return RelationshipMetadata.create({
      schemaName: dto.SchemaName,
      relationshipType: type,
      referencedEntity: dto.ReferencedEntity,
      referencingEntity: dto.ReferencingEntity,
      referencedAttribute: dto.ReferencedAttribute,
      referencingAttribute: dto.ReferencingAttribute
    });
  }

  private mapPrivilegeDtoToDomain(dto: PrivilegeMetadataDto): PrivilegeMetadata {
    return PrivilegeMetadata.create({
      name: dto.Name,
      privilegeId: dto.PrivilegeId,
      privilegeType: this.mapPrivilegeType(dto.PrivilegeType)
    });
  }

  private mapChoiceDtoToDomain(dto: GlobalOptionSetDefinitionDto): ChoiceMetadata {
    const options = (dto.Options ?? []).map(o =>
      ChoiceOption.create({
        value: o.Value,
        label: o.Label?.UserLocalizedLabel?.Label ?? o.Value.toString(),
        color: o.Color
      })
    );

    return ChoiceMetadata.create({
      name: dto.Name,
      displayName: dto.DisplayName?.UserLocalizedLabel?.Label ?? dto.Name,
      isCustom: dto.IsCustomOptionSet ?? false,
      isManaged: dto.IsManaged ?? false,
      options
    });
  }

  private mapPrivilegeType(typeValue: number): PrivilegeType {
    // Map Dataverse privilege type numbers to enum
    switch (typeValue) {
      case 0: return PrivilegeType.Create;
      case 1: return PrivilegeType.Read;
      case 2: return PrivilegeType.Write;
      case 3: return PrivilegeType.Delete;
      case 4: return PrivilegeType.Assign;
      case 5: return PrivilegeType.Share;
      case 6: return PrivilegeType.Append;
      case 7: return PrivilegeType.AppendTo;
      default: return PrivilegeType.Read;
    }
  }

  private isNotFoundError(error: unknown): boolean {
    return error instanceof Error && error.message.includes('404');
  }
}
```

```typescript
export class VSCodeStorageFilterPreferencesRepository implements IFilterPreferencesRepository {
  private readonly STORAGE_KEY_PREFIX = 'metadataBrowser.filterPreferences';

  constructor(
    private readonly globalState: vscode.Memento,
    private readonly logger: ILogger
  ) {}

  public async save(environmentId: string, options: FilterOptions): Promise<void> {
    const key = this.getStorageKey(environmentId);
    const value = {
      showCustom: options.getShowCustom(),
      showSystem: options.getShowSystem(),
      showManaged: options.getShowManaged(),
      showUnmanaged: options.getShowUnmanaged()
    };

    this.logger.debug('VSCodeStorageFilterPreferencesRepository: Saving preferences', {
      environmentId,
      key,
      value
    });

    await this.globalState.update(key, value);
  }

  public async load(environmentId: string): Promise<FilterOptions> {
    const key = this.getStorageKey(environmentId);
    const value = this.globalState.get<FilterOptionsViewModel>(key);

    this.logger.debug('VSCodeStorageFilterPreferencesRepository: Loading preferences', {
      environmentId,
      key,
      found: !!value
    });

    if (!value) {
      return FilterOptions.createDefault();
    }

    return FilterOptions.create({
      showCustom: value.showCustom,
      showSystem: value.showSystem,
      showManaged: value.showManaged,
      showUnmanaged: value.showUnmanaged
    });
  }

  private getStorageKey(environmentId: string): string {
    return `${this.STORAGE_KEY_PREFIX}.${environmentId}`;
  }
}
```

#### API DTOs

```typescript
// Infrastructure layer DTOs (match Dataverse API responses)
interface EntityDefinitionDto {
  MetadataId: string;
  LogicalName: string;
  DisplayName?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  IsCustomEntity?: boolean;
  IsManaged?: boolean;
}

interface EntityDefinitionWithDetailsDto extends EntityDefinitionDto {
  Attributes?: AttributeMetadataDto[];
  Keys?: KeyMetadataDto[];
  OneToManyRelationships?: RelationshipMetadataDto[];
  ManyToOneRelationships?: RelationshipMetadataDto[];
  ManyToManyRelationships?: RelationshipMetadataDto[];
  Privileges?: PrivilegeMetadataDto[];
}

interface AttributeMetadataDto {
  LogicalName: string;
  DisplayName?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  AttributeType: string;
  IsCustomAttribute?: boolean;
  IsManaged?: boolean;
  IsPrimaryId?: boolean;
  IsPrimaryName?: boolean;
  IsValidForCreate?: boolean;
  IsValidForUpdate?: boolean;
  IsValidForRead?: boolean;
  RequiredLevel?: {
    Value: string;
  };
  MaxLength?: number;
}

interface KeyMetadataDto {
  LogicalName: string;
  DisplayName?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  KeyAttributes?: string[];
}

interface RelationshipMetadataDto {
  SchemaName: string;
  ReferencedEntity: string;
  ReferencingEntity: string;
  ReferencedAttribute?: string;
  ReferencingAttribute?: string;
}

interface PrivilegeMetadataDto {
  Name: string;
  PrivilegeId: string;
  PrivilegeType: number;
}

interface GlobalOptionSetDefinitionDto {
  Name: string;
  DisplayName?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  IsCustomOptionSet?: boolean;
  IsManaged?: boolean;
  Options?: OptionMetadataDto[];
}

interface OptionMetadataDto {
  Value: number;
  Label?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  Color?: string;
}
```

---

### Presentation Layer Types

#### Panel

```typescript
export class MetadataBrowserPanel {
  private static currentPanel: MetadataBrowserPanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly listEntitiesUseCase: ListEntitiesUseCase,
    private readonly getEntityWithDetailsUseCase: GetEntityWithDetailsUseCase,
    private readonly listChoicesUseCase: ListChoicesUseCase,
    private readonly saveFilterPreferencesCommand: SaveFilterPreferencesCommand,
    private readonly loadFilterPreferencesQuery: LoadFilterPreferencesQuery,
    private readonly entityMapper: EntityMetadataViewModelMapper,
    private readonly attributeMapper: AttributeMetadataViewModelMapper,
    private readonly keyMapper: KeyMetadataViewModelMapper,
    private readonly relationshipMapper: RelationshipMetadataViewModelMapper,
    private readonly privilegeMapper: PrivilegeMetadataViewModelMapper,
    private readonly choiceMapper: ChoiceMetadataViewModelMapper,
    private readonly choiceOptionMapper: ChoiceOptionViewModelMapper,
    private readonly filterOptionsMapper: FilterOptionsViewModelMapper,
    private readonly logger: ILogger,
    private readonly extensionUri: vscode.Uri
  ) {
    this.logger.info('MetadataBrowserPanel: Initialized');

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      null,
      this.disposables
    );

    this.panel.webview.html = this.getHtmlContent();
  }

  // Singleton factory (VS Code standard pattern)
  public static createOrShow(
    extensionUri: vscode.Uri,
    listEntitiesUseCase: ListEntitiesUseCase,
    getEntityWithDetailsUseCase: GetEntityWithDetailsUseCase,
    listChoicesUseCase: ListChoicesUseCase,
    saveFilterPreferencesCommand: SaveFilterPreferencesCommand,
    loadFilterPreferencesQuery: LoadFilterPreferencesQuery,
    entityMapper: EntityMetadataViewModelMapper,
    attributeMapper: AttributeMetadataViewModelMapper,
    keyMapper: KeyMetadataViewModelMapper,
    relationshipMapper: RelationshipMetadataViewModelMapper,
    privilegeMapper: PrivilegeMetadataViewModelMapper,
    choiceMapper: ChoiceMetadataViewModelMapper,
    choiceOptionMapper: ChoiceOptionViewModelMapper,
    filterOptionsMapper: FilterOptionsViewModelMapper,
    logger: ILogger
  ): MetadataBrowserPanel {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (MetadataBrowserPanel.currentPanel) {
      MetadataBrowserPanel.currentPanel.panel.reveal(column);
      return MetadataBrowserPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'metadataBrowser',
      'Metadata Browser',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')]
      }
    );

    MetadataBrowserPanel.currentPanel = new MetadataBrowserPanel(
      panel,
      listEntitiesUseCase,
      getEntityWithDetailsUseCase,
      listChoicesUseCase,
      saveFilterPreferencesCommand,
      loadFilterPreferencesQuery,
      entityMapper,
      attributeMapper,
      keyMapper,
      relationshipMapper,
      privilegeMapper,
      choiceMapper,
      choiceOptionMapper,
      filterOptionsMapper,
      logger,
      extensionUri
    );

    return MetadataBrowserPanel.currentPanel;
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!this.isWebviewMessage(message)) {
      this.logger.warn('MetadataBrowserPanel: Invalid message received', message);
      return;
    }

    this.logger.debug(`MetadataBrowserPanel: Handling command: ${message.command}`);

    try {
      switch (message.command) {
        case 'load-entities':
          await this.handleLoadEntities(message);
          break;
        case 'load-entity-details':
          await this.handleLoadEntityDetails(message);
          break;
        case 'load-choices':
          await this.handleLoadChoices(message);
          break;
        case 'save-filter-preferences':
          await this.handleSaveFilterPreferences(message);
          break;
        case 'load-filter-preferences':
          await this.handleLoadFilterPreferences(message);
          break;
        case 'copy-logical-name':
          await this.handleCopyLogicalName(message);
          break;
        case 'open-in-maker':
          await this.handleOpenInMaker(message);
          break;
        case 'webview-log':
          this.handleWebviewLog(message);
          break;
        default:
          this.logger.warn('MetadataBrowserPanel: Unknown command', message);
      }
    } catch (error) {
      this.logger.error(`MetadataBrowserPanel: Error handling command ${message.command}`, error);
      await this.sendMessage({
        command: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleLoadEntities(message: LoadEntitiesMessage): Promise<void> {
    this.logger.info('MetadataBrowserPanel: Loading entities', {
      environmentId: message.environmentId
    });

    const entities = await this.listEntitiesUseCase.execute({
      environmentId: message.environmentId,
      searchTerm: message.searchTerm,
      filterOptions: message.filterOptions
        ? this.filterOptionsMapper.fromViewModel(message.filterOptions)
        : undefined
    });

    const viewModels = this.entityMapper.toViewModels(entities);

    await this.sendMessage({
      command: 'entities-loaded',
      entities: viewModels
    });

    this.logger.info('MetadataBrowserPanel: Entities loaded', {
      count: viewModels.length
    });
  }

  private async handleLoadEntityDetails(message: LoadEntityDetailsMessage): Promise<void> {
    this.logger.info('MetadataBrowserPanel: Loading entity details', {
      logicalName: message.logicalName
    });

    const entity = await this.getEntityWithDetailsUseCase.execute({
      environmentId: message.environmentId,
      logicalName: message.logicalName
    });

    if (!entity) {
      await this.sendMessage({
        command: 'error',
        message: 'Entity not found'
      });
      return;
    }

    const entityViewModel = this.entityMapper.toViewModel(entity);
    const attributeViewModels = this.attributeMapper.toViewModels(entity.getAttributes());
    const keyViewModels = this.keyMapper.toViewModels(entity.getKeys());
    const relationshipViewModels = this.relationshipMapper.toViewModels(entity.getRelationships());
    const privilegeViewModels = this.privilegeMapper.toViewModels(entity.getPrivileges());

    await this.sendMessage({
      command: 'entity-details-loaded',
      entity: entityViewModel,
      attributes: attributeViewModels,
      keys: keyViewModels,
      relationships: relationshipViewModels,
      privileges: privilegeViewModels
    });

    this.logger.info('MetadataBrowserPanel: Entity details loaded');
  }

  private async handleLoadChoices(message: LoadChoicesMessage): Promise<void> {
    this.logger.info('MetadataBrowserPanel: Loading choices');

    const choices = await this.listChoicesUseCase.execute({
      environmentId: message.environmentId,
      searchTerm: message.searchTerm,
      filterOptions: message.filterOptions
        ? this.filterOptionsMapper.fromViewModel(message.filterOptions)
        : undefined
    });

    const viewModels = this.choiceMapper.toViewModels(choices);

    await this.sendMessage({
      command: 'choices-loaded',
      choices: viewModels
    });

    this.logger.info('MetadataBrowserPanel: Choices loaded', {
      count: viewModels.length
    });
  }

  private async handleSaveFilterPreferences(message: SaveFilterPreferencesMessage): Promise<void> {
    this.logger.info('MetadataBrowserPanel: Saving filter preferences');

    const filterOptions = this.filterOptionsMapper.fromViewModel(message.filterOptions);

    await this.saveFilterPreferencesCommand.execute({
      environmentId: message.environmentId,
      filterOptions
    });

    this.logger.info('MetadataBrowserPanel: Filter preferences saved');
  }

  private async handleLoadFilterPreferences(message: LoadFilterPreferencesMessage): Promise<void> {
    this.logger.info('MetadataBrowserPanel: Loading filter preferences');

    const filterOptions = await this.loadFilterPreferencesQuery.execute({
      environmentId: message.environmentId
    });

    const viewModel = this.filterOptionsMapper.toViewModel(filterOptions);

    await this.sendMessage({
      command: 'filter-preferences-loaded',
      filterOptions: viewModel
    });

    this.logger.info('MetadataBrowserPanel: Filter preferences loaded');
  }

  private async handleCopyLogicalName(message: CopyLogicalNameMessage): Promise<void> {
    this.logger.info('MetadataBrowserPanel: Copying logical name', {
      logicalName: message.logicalName
    });

    await vscode.env.clipboard.writeText(message.logicalName);
    await vscode.window.showInformationMessage('Logical name copied to clipboard');
  }

  private async handleOpenInMaker(message: OpenInMakerMessage): Promise<void> {
    this.logger.info('MetadataBrowserPanel: Opening in Maker', {
      url: message.url
    });

    await vscode.env.openExternal(vscode.Uri.parse(message.url));
  }

  private handleWebviewLog(message: WebviewLogMessage): void {
    const logMessage = `[Webview:MetadataBrowser] ${message.message}`;
    this.logger[message.level](logMessage);
  }

  private async sendMessage(message: unknown): Promise<void> {
    await this.panel.webview.postMessage(message);
  }

  private getHtmlContent(): string {
    return renderMetadataBrowserView(this.panel.webview, this.extensionUri);
  }

  private isWebviewMessage(message: unknown): message is WebviewMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      'command' in message &&
      typeof (message as { command: unknown }).command === 'string'
    );
  }

  private dispose(): void {
    this.logger.info('MetadataBrowserPanel: Disposing');

    MetadataBrowserPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
```

#### Webview Message Types

```typescript
// Message types for webview communication
type WebviewMessage =
  | LoadEntitiesMessage
  | LoadEntityDetailsMessage
  | LoadChoicesMessage
  | SaveFilterPreferencesMessage
  | LoadFilterPreferencesMessage
  | CopyLogicalNameMessage
  | OpenInMakerMessage
  | WebviewLogMessage;

interface LoadEntitiesMessage {
  command: 'load-entities';
  environmentId: string;
  searchTerm?: string;
  filterOptions?: FilterOptionsViewModel;
}

interface LoadEntityDetailsMessage {
  command: 'load-entity-details';
  environmentId: string;
  logicalName: string;
}

interface LoadChoicesMessage {
  command: 'load-choices';
  environmentId: string;
  searchTerm?: string;
  filterOptions?: FilterOptionsViewModel;
}

interface SaveFilterPreferencesMessage {
  command: 'save-filter-preferences';
  environmentId: string;
  filterOptions: FilterOptionsViewModel;
}

interface LoadFilterPreferencesMessage {
  command: 'load-filter-preferences';
  environmentId: string;
}

interface CopyLogicalNameMessage {
  command: 'copy-logical-name';
  logicalName: string;
}

interface OpenInMakerMessage {
  command: 'open-in-maker';
  url: string;
}

interface WebviewLogMessage {
  command: 'webview-log';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}
```

---

## File Structure

```
src/features/metadataBrowser/
├── domain/
│   ├── entities/
│   │   ├── EntityMetadata.ts                # Rich model with behavior
│   │   ├── EntityMetadata.test.ts
│   │   ├── AttributeMetadata.ts
│   │   ├── AttributeMetadata.test.ts
│   │   ├── KeyMetadata.ts
│   │   ├── KeyMetadata.test.ts
│   │   ├── RelationshipMetadata.ts
│   │   ├── RelationshipMetadata.test.ts
│   │   ├── PrivilegeMetadata.ts
│   │   ├── PrivilegeMetadata.test.ts
│   │   ├── ChoiceMetadata.ts
│   │   └── ChoiceMetadata.test.ts
│   ├── valueObjects/
│   │   ├── FilterOptions.ts
│   │   ├── FilterOptions.test.ts
│   │   ├── ChoiceOption.ts
│   │   ├── ChoiceOption.test.ts
│   │   ├── RelationshipType.ts
│   │   └── PrivilegeType.ts
│   └── interfaces/
│       ├── IMetadataRepository.ts
│       └── IFilterPreferencesRepository.ts
│
├── application/
│   ├── useCases/
│   │   ├── ListEntitiesUseCase.ts
│   │   ├── ListEntitiesUseCase.test.ts
│   │   ├── GetEntityWithDetailsUseCase.ts
│   │   ├── GetEntityWithDetailsUseCase.test.ts
│   │   ├── ListChoicesUseCase.ts
│   │   ├── ListChoicesUseCase.test.ts
│   │   ├── SaveFilterPreferencesCommand.ts
│   │   ├── SaveFilterPreferencesCommand.test.ts
│   │   ├── LoadFilterPreferencesQuery.ts
│   │   └── LoadFilterPreferencesQuery.test.ts
│   ├── viewModels/
│   │   ├── EntityMetadataViewModel.ts
│   │   ├── AttributeMetadataViewModel.ts
│   │   ├── KeyMetadataViewModel.ts
│   │   ├── RelationshipMetadataViewModel.ts
│   │   ├── PrivilegeMetadataViewModel.ts
│   │   ├── ChoiceMetadataViewModel.ts
│   │   ├── ChoiceOptionViewModel.ts
│   │   └── FilterOptionsViewModel.ts
│   └── mappers/
│       ├── EntityMetadataViewModelMapper.ts
│       ├── EntityMetadataViewModelMapper.test.ts
│       ├── AttributeMetadataViewModelMapper.ts
│       ├── KeyMetadataViewModelMapper.ts
│       ├── RelationshipMetadataViewModelMapper.ts
│       ├── PrivilegeMetadataViewModelMapper.ts
│       ├── ChoiceMetadataViewModelMapper.ts
│       ├── ChoiceOptionViewModelMapper.ts
│       └── FilterOptionsViewModelMapper.ts
│
├── infrastructure/
│   ├── repositories/
│   │   ├── DataverseMetadataRepository.ts
│   │   ├── DataverseMetadataRepository.test.ts
│   │   ├── VSCodeStorageFilterPreferencesRepository.ts
│   │   └── VSCodeStorageFilterPreferencesRepository.test.ts
│   └── dtos/
│       ├── EntityDefinitionDto.ts
│       ├── AttributeMetadataDto.ts
│       ├── KeyMetadataDto.ts
│       ├── RelationshipMetadataDto.ts
│       ├── PrivilegeMetadataDto.ts
│       └── GlobalOptionSetDefinitionDto.ts
│
└── presentation/
    ├── panels/
    │   └── MetadataBrowserPanel.ts
    └── views/
        └── metadataBrowserView.ts             # HTML generation

resources/webview/
├── css/
│   └── metadataBrowser.css                    # Three-panel layout styles
└── js/
    └── metadataBrowser.js                     # Client-side tree/table interactions
```

**New Files:** 60+ files (14 domain entities + tests, 5 use cases + tests, 8 ViewModels, 8 mappers, 2 repositories + tests, 6 DTOs, 1 panel, 1 view, 2 webview resources)
**Modified Files:** 1 (extension.ts for command registration)
**Total:** 60+ files for this feature

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

```typescript
// Test all entity behavior
describe('EntityMetadata', () => {
  describe('isCustom', () => {
    it('should return true for custom entities', () => {
      const entity = EntityMetadata.create({
        metadataId: 'guid',
        logicalName: 'new_customentity',
        displayName: 'Custom Entity',
        isCustomEntity: true,
        isManaged: false
      });
      expect(entity.isCustom()).toBe(true);
    });

    it('should return false for system entities', () => {
      const entity = EntityMetadata.create({
        metadataId: 'guid',
        logicalName: 'account',
        displayName: 'Account',
        isCustomEntity: false,
        isManaged: true
      });
      expect(entity.isCustom()).toBe(false);
    });
  });

  describe('matchesSearchTerm', () => {
    it('should match logical name', () => {
      const entity = EntityMetadata.create({
        metadataId: 'guid',
        logicalName: 'account',
        displayName: 'Account',
        isCustomEntity: false,
        isManaged: true
      });
      expect(entity.matchesSearchTerm('acc')).toBe(true);
    });

    it('should match display name', () => {
      const entity = EntityMetadata.create({
        metadataId: 'guid',
        logicalName: 'account',
        displayName: 'Account',
        isCustomEntity: false,
        isManaged: true
      });
      expect(entity.matchesSearchTerm('Account')).toBe(true);
    });

    it('should be case-insensitive', () => {
      const entity = EntityMetadata.create({
        metadataId: 'guid',
        logicalName: 'account',
        displayName: 'Account',
        isCustomEntity: false,
        isManaged: true
      });
      expect(entity.matchesSearchTerm('ACCOUNT')).toBe(true);
    });

    it('should return true for empty search term', () => {
      const entity = EntityMetadata.create({
        metadataId: 'guid',
        logicalName: 'account',
        displayName: 'Account',
        isCustomEntity: false,
        isManaged: true
      });
      expect(entity.matchesSearchTerm('')).toBe(true);
    });
  });

  describe('matchesFilter', () => {
    it('should filter out custom when showCustom is false', () => {
      const entity = EntityMetadata.create({
        metadataId: 'guid',
        logicalName: 'new_custom',
        displayName: 'Custom',
        isCustomEntity: true,
        isManaged: false
      });
      const filter = FilterOptions.create({
        showCustom: false,
        showSystem: true,
        showManaged: true,
        showUnmanaged: true
      });
      expect(entity.matchesFilter(filter)).toBe(false);
    });

    it('should include system when showSystem is true', () => {
      const entity = EntityMetadata.create({
        metadataId: 'guid',
        logicalName: 'account',
        displayName: 'Account',
        isCustomEntity: false,
        isManaged: true
      });
      const filter = FilterOptions.create({
        showCustom: true,
        showSystem: true,
        showManaged: true,
        showUnmanaged: true
      });
      expect(entity.matchesFilter(filter)).toBe(true);
    });
  });

  describe('getMakerUrl', () => {
    it('should construct correct Maker URL', () => {
      const entity = EntityMetadata.create({
        metadataId: 'guid',
        logicalName: 'account',
        displayName: 'Account',
        isCustomEntity: false,
        isManaged: true
      });
      const url = entity.getMakerUrl('https://org.crm.dynamics.com');
      expect(url).toBe('https://org.crm.dynamics.com/tools/solution/entities/account');
    });
  });

  describe('create', () => {
    it('should throw ValidationError for empty metadataId', () => {
      expect(() =>
        EntityMetadata.create({
          metadataId: '',
          logicalName: 'account',
          displayName: 'Account',
          isCustomEntity: false,
          isManaged: true
        })
      ).toThrow('MetadataId is required');
    });

    it('should throw ValidationError for empty logicalName', () => {
      expect(() =>
        EntityMetadata.create({
          metadataId: 'guid',
          logicalName: '',
          displayName: 'Account',
          isCustomEntity: false,
          isManaged: true
        })
      ).toThrow('LogicalName is required');
    });
  });
});
```

### Application Tests (Target: 90% coverage)

```typescript
// Test use case orchestration
describe('ListEntitiesUseCase', () => {
  let useCase: ListEntitiesUseCase;
  let mockRepository: jest.Mocked<IMetadataRepository>;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockRepository = {
      findAllEntities: jest.fn(),
      findEntityById: jest.fn(),
      findAllChoices: jest.fn()
    };
    mockLogger = new NullLogger();
    useCase = new ListEntitiesUseCase(mockRepository, mockLogger);
  });

  it('should return all entities when no filters applied', async () => {
    const entity1 = EntityMetadata.create({
      metadataId: 'guid1',
      logicalName: 'account',
      displayName: 'Account',
      isCustomEntity: false,
      isManaged: true
    });
    const entity2 = EntityMetadata.create({
      metadataId: 'guid2',
      logicalName: 'new_custom',
      displayName: 'Custom',
      isCustomEntity: true,
      isManaged: false
    });
    mockRepository.findAllEntities.mockResolvedValue([entity1, entity2]);

    const result = await useCase.execute({ environmentId: 'env1' });

    expect(result).toHaveLength(2);
    expect(mockRepository.findAllEntities).toHaveBeenCalledWith('env1');
  });

  it('should filter by search term', async () => {
    const entity1 = EntityMetadata.create({
      metadataId: 'guid1',
      logicalName: 'account',
      displayName: 'Account',
      isCustomEntity: false,
      isManaged: true
    });
    const entity2 = EntityMetadata.create({
      metadataId: 'guid2',
      logicalName: 'contact',
      displayName: 'Contact',
      isCustomEntity: false,
      isManaged: true
    });
    mockRepository.findAllEntities.mockResolvedValue([entity1, entity2]);

    const result = await useCase.execute({
      environmentId: 'env1',
      searchTerm: 'account'
    });

    expect(result).toHaveLength(1);
    expect(result[0].getLogicalName()).toBe('account');
  });

  it('should filter by custom/system', async () => {
    const entity1 = EntityMetadata.create({
      metadataId: 'guid1',
      logicalName: 'account',
      displayName: 'Account',
      isCustomEntity: false,
      isManaged: true
    });
    const entity2 = EntityMetadata.create({
      metadataId: 'guid2',
      logicalName: 'new_custom',
      displayName: 'Custom',
      isCustomEntity: true,
      isManaged: false
    });
    mockRepository.findAllEntities.mockResolvedValue([entity1, entity2]);

    const result = await useCase.execute({
      environmentId: 'env1',
      filterOptions: FilterOptions.create({
        showCustom: true,
        showSystem: false,
        showManaged: true,
        showUnmanaged: true
      })
    });

    expect(result).toHaveLength(1);
    expect(result[0].getLogicalName()).toBe('new_custom');
  });
});
```

### Infrastructure Tests (Optional - only for complex logic)

```typescript
describe('DataverseMetadataRepository', () => {
  let repository: DataverseMetadataRepository;
  let mockApiService: jest.Mocked<IDataverseApiService>;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockApiService = {
      get: jest.fn()
    } as any;
    mockLogger = new NullLogger();
    repository = new DataverseMetadataRepository(mockApiService, mockLogger);
  });

  describe('findAllEntities', () => {
    it('should map API DTOs to domain entities', async () => {
      const apiResponse = [
        {
          MetadataId: 'guid1',
          LogicalName: 'account',
          DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
          IsCustomEntity: false,
          IsManaged: true
        }
      ];
      mockApiService.get.mockResolvedValue(apiResponse);

      const result = await repository.findAllEntities('env1');

      expect(result).toHaveLength(1);
      expect(result[0].getLogicalName()).toBe('account');
      expect(mockApiService.get).toHaveBeenCalledWith(
        'env1',
        '/api/data/v9.2/EntityDefinitions',
        { $select: 'MetadataId,LogicalName,DisplayName,IsCustomEntity,IsManaged' }
      );
    });
  });
});
```

### Manual Testing Scenarios

1. **Happy path:** User opens Metadata Browser, selects environment, views entity list, clicks entity, sees attributes
2. **Search:** User types "account" in search, sees filtered results
3. **Filter:** User unchecks "System", sees only custom entities
4. **Tabs:** User switches between Attributes/Keys/Relationships/Privileges tabs
5. **Choices:** User selects Choices in tree, sees choice options
6. **Copy:** User right-clicks entity, copies logical name
7. **Maker:** User right-clicks entity, opens in Maker (browser opens)
8. **Persistence:** User changes filters, closes panel, reopens, filters are restored
9. **Error case:** Network error when fetching metadata (user sees error message)
10. **Edge case:** Entity with no attributes/keys/relationships (empty tables shown)

---

## Dependencies & Prerequisites

### External Dependencies
- [ ] VS Code APIs: vscode.window.createWebviewPanel, vscode.env.clipboard, vscode.Memento
- [ ] NPM packages: None (all dependencies already in project)
- [ ] Dataverse APIs:
  - GET /api/data/v9.2/EntityDefinitions
  - GET /api/data/v9.2/EntityDefinitions(LogicalName='...')
  - GET /api/data/v9.2/GlobalOptionSetDefinitions

### Internal Prerequisites
- [ ] IDataverseApiService (already exists in shared infrastructure)
- [ ] ILogger interface (already exists)
- [ ] Environment selection mechanism (already exists)
- [ ] Authentication service (already exists)

### Breaking Changes
- [ ] None

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
- [ ] Panels use use cases only (NO business logic)
- [ ] HTML extracted to separate view files
- [ ] Dependencies point inward (pres → app → domain)
- [ ] Logging for user actions

**Type Safety:**
- [ ] No `any` types without explicit justification
- [ ] Explicit return types on all public methods
- [ ] Proper null handling (no `!` assertions)
- [ ] Type guards for runtime safety

---

## Key Architectural Decisions

> **Note:** This section is populated AFTER final approval. During iteration, architect review findings go in separate files under `docs/design/reviews/`.

---

## Review & Approval

### Design Phase
- [ ] clean-architecture-guardian design review (all layers)
- [ ] typescript-pro type contract review
- [ ] Human approval of design

### Implementation Phase (per slice)
- [ ] Slice 1 implemented and reviewed
- [ ] Slice 2 implemented and reviewed
- [ ] Slice 3 implemented and reviewed
- [ ] Slice 4 implemented and reviewed
- [ ] Slice 5 implemented and reviewed
- [ ] Slice 6 implemented and reviewed
- [ ] Slice 7 implemented and reviewed
- [ ] Slice 8 implemented and reviewed
- [ ] Slice 9 implemented and reviewed
- [ ] Slice 10 implemented and reviewed
- [ ] Slice 11 implemented and reviewed
- [ ] Slice 12 implemented and reviewed
- [ ] Slice 13 implemented and reviewed
- [ ] Slice 14 implemented and reviewed

### Final Approval
- [ ] All slices implemented
- [ ] Tests written and passing (npm test ✅)
- [ ] Manual testing completed
- [ ] Documentation updated (if new patterns)
- [ ] clean-architecture-guardian final approval

**Status:** Pending
**Approver:** TBD
**Date:** TBD

---

## Open Questions

- [ ] Should we cache metadata responses to reduce API calls?
- [ ] Should we implement lazy loading for large entity lists (virtualization)?
- [ ] Should we support local/picklist option sets (not just global)?
- [ ] Should detail panel be collapsible or fixed width?

---

## References

- Related features: Environment Setup (environment selection), Plugin Trace Viewer (three-panel layout)
- External documentation:
  - [Dataverse Web API - EntityMetadata](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/entitymetadata)
  - [Dataverse Web API - AttributeMetadata](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/attributemetadata)
  - [Dataverse Web API - GlobalOptionSetDefinition](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/globaloptionsetdefinition)
- Design inspiration: VS Code's built-in metadata explorer patterns
- Workflow guide: `.claude/workflows/DESIGN_WORKFLOW.md`
