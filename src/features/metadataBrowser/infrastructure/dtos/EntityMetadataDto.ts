/**
 * Label structure from Dataverse API.
 */
export interface LocalizedLabel {
    Label: string;
    LanguageCode: number;
    IsManaged: boolean;
    MetadataId: string;
    HasChanged: null | boolean;
}

export interface LabelMetadata {
    LocalizedLabels: LocalizedLabel[];
    UserLocalizedLabel: LocalizedLabel | null;
}

export interface ManagedProperty<T> {
    Value: T;
    CanBeChanged: boolean;
    ManagedPropertyLogicalName: string;
}

/**
 * DTO representing entity metadata from Dataverse Web API.
 * Maps directly to the JSON structure returned by the API.
 */
export interface EntityMetadataDto {
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    DisplayName?: LabelMetadata;
    DisplayCollectionName?: LabelMetadata;
    Description?: LabelMetadata;
    IsCustomEntity?: boolean;
    IsManaged?: boolean;
    OwnershipType?: string;
    PrimaryIdAttribute?: string;
    PrimaryNameAttribute?: string;
    PrimaryImageAttribute?: string;
    EntitySetName?: string;
    ObjectTypeCode?: number;
    IsActivity?: boolean;
    HasNotes?: boolean;
    HasActivities?: boolean;
    IsValidForAdvancedFind?: boolean;
    IsAuditEnabled?: ManagedProperty<boolean>;
    IsValidForQueue?: ManagedProperty<boolean>;
    Attributes?: AttributeMetadataDto[];
    OneToManyRelationships?: OneToManyRelationshipDto[];
    ManyToOneRelationships?: OneToManyRelationshipDto[];
    ManyToManyRelationships?: ManyToManyRelationshipDto[];
    Keys?: EntityKeyDto[];
    Privileges?: SecurityPrivilegeDto[];
}

/**
 * DTO representing attribute metadata from Dataverse Web API.
 */
export interface AttributeMetadataDto {
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    DisplayName?: LabelMetadata;
    Description?: LabelMetadata;
    AttributeType?: string;
    AttributeTypeName?: { Value: string };
    IsCustomAttribute?: boolean;
    IsManaged?: boolean;
    IsPrimaryId?: boolean;
    IsPrimaryName?: boolean;
    RequiredLevel?: ManagedProperty<string>;
    // Type-specific properties
    MaxLength?: number;
    Targets?: string[];
    Precision?: number;
    MinValue?: number;
    MaxValue?: number;
    Format?: string;
    OptionSet?: OptionSetMetadataDto;
    GlobalOptionSet?: GlobalOptionSetReferenceDto;
    // Validation flags
    IsValidForCreate?: boolean;
    IsValidForUpdate?: boolean;
    IsValidForRead?: boolean;
    IsValidForForm?: boolean;
    IsValidForGrid?: boolean;
    // Security
    IsSecured?: boolean;
    CanBeSecuredForRead?: boolean;
    CanBeSecuredForCreate?: boolean;
    CanBeSecuredForUpdate?: boolean;
    // Behavior
    IsFilterable?: boolean;
    IsSearchable?: boolean;
    IsRetrievable?: boolean;
}

/**
 * DTO representing option set (choice) metadata.
 */
export interface OptionSetMetadataDto {
    Name?: string;
    IsGlobal?: boolean;
    OptionSetType?: string;
    Options?: OptionMetadataDto[];
}

export interface OptionMetadataDto {
    Value: number;
    Label?: LabelMetadata;
    Description?: LabelMetadata;
    Color?: string;
}

export interface GlobalOptionSetReferenceDto {
    Name: string;
}

/**
 * DTO representing global option set (global choice) definition from Dataverse API.
 */
export interface GlobalOptionSetDefinitionDto {
    MetadataId: string;
    Name: string;
    DisplayName?: LabelMetadata;
    Description?: LabelMetadata;
    IsCustomOptionSet?: boolean;
    IsGlobal?: boolean;
    IsManaged?: boolean;
    OptionSetType?: string;
    Options?: OptionMetadataDto[];
}

/**
 * DTO representing cascade configuration.
 */
export interface CascadeConfigurationDto {
    Assign: string;
    Delete: string;
    Merge: string;
    Reparent: string;
    Share: string;
    Unshare: string;
    Archive?: string;
    RollupView?: string;
}

/**
 * DTO representing one-to-many relationship metadata.
 */
export interface OneToManyRelationshipDto {
    MetadataId: string;
    SchemaName: string;
    ReferencedEntity: string;
    ReferencedAttribute: string;
    ReferencingEntity: string;
    ReferencingAttribute: string;
    IsCustomRelationship: boolean;
    IsManaged: boolean;
    RelationshipType: string;
    CascadeConfiguration: CascadeConfigurationDto;
    ReferencedEntityNavigationPropertyName?: string;
    ReferencingEntityNavigationPropertyName?: string;
    IsHierarchical?: boolean;
    SecurityTypes?: string;
}

/**
 * DTO representing many-to-many relationship metadata.
 */
export interface ManyToManyRelationshipDto {
    MetadataId: string;
    SchemaName: string;
    Entity1LogicalName: string;
    Entity1IntersectAttribute: string;
    Entity2LogicalName: string;
    Entity2IntersectAttribute: string;
    IntersectEntityName: string;
    IsCustomRelationship: boolean;
    IsManaged: boolean;
    Entity1NavigationPropertyName?: string;
    Entity2NavigationPropertyName?: string;
}

/**
 * DTO representing entity key (alternate key) metadata.
 */
export interface EntityKeyDto {
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    DisplayName?: LabelMetadata;
    EntityLogicalName: string;
    KeyAttributes: string[];
    IsManaged: boolean;
    EntityKeyIndexStatus?: string;
}

/**
 * DTO representing security privilege metadata.
 */
export interface SecurityPrivilegeDto {
    PrivilegeId: string;
    Name: string;
    PrivilegeType: number;
    CanBeBasic: boolean;
    CanBeLocal: boolean;
    CanBeDeep: boolean;
    CanBeGlobal: boolean;
    CanBeEntityReference?: boolean;
    CanBeParentEntityReference?: boolean;
}
