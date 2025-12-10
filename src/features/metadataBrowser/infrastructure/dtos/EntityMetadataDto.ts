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
 * COMPLETE: All 107 entity-level fields from Dataverse API.
 */
export interface EntityMetadataDto {
    // Core identifiers
    '@odata.context'?: string;
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    CollectionSchemaName?: string;
    LogicalCollectionName?: string;
    EntitySetName?: string;
    ExternalName?: string | null;
    ExternalCollectionName?: string | null;
    DisplayName?: LabelMetadata;
    DisplayCollectionName?: LabelMetadata;
    Description?: LabelMetadata;

    // Primary fields
    PrimaryIdAttribute?: string;
    PrimaryNameAttribute?: string;
    PrimaryImageAttribute?: string;
    PrimaryKey?: string;
    ObjectTypeCode?: number;

    // Ownership
    OwnershipType?: string;
    OwnerId?: string;
    OwnerIdType?: string;
    OwningBusinessUnit?: string;

    // Entity type flags
    IsCustomEntity?: boolean;
    IsManaged?: boolean;
    IsActivity?: boolean;
    IsActivityParty?: boolean;
    IsIntersect?: boolean;
    IsLogicalEntity?: boolean;
    IsChildEntity?: boolean;
    IsBPFEntity?: boolean;
    IsPrivate?: boolean;
    TableType?: string;

    // Feature flags
    HasNotes?: boolean;
    HasActivities?: boolean;
    HasEmailAddresses?: boolean;
    HasFeedback?: boolean;
    IsConnectionsEnabled?: boolean;
    IsDocumentManagementEnabled?: boolean;
    IsOneNoteIntegrationEnabled?: boolean;
    IsKnowledgeManagementEnabled?: boolean;
    IsSLAEnabled?: boolean;
    IsInteractionCentricEnabled?: boolean;
    IsBusinessProcessEnabled?: boolean;
    IsMSTeamsIntegrationEnabled?: boolean;
    IsDocumentRecommendationsEnabled?: boolean;

    // Audit and tracking
    IsAuditEnabled?: ManagedProperty<boolean>;
    IsRetrieveAuditEnabled?: boolean;
    IsRetrieveMultipleAuditEnabled?: boolean;
    ChangeTrackingEnabled?: boolean;
    SyncToExternalSearchIndex?: boolean;

    // Forms and views
    IsQuickCreateEnabled?: boolean;
    IsReadingPaneEnabled?: boolean;
    IsEnabledForCharts?: boolean;
    IsEnabledForTrace?: boolean;
    IsEnabledForExternalChannels?: boolean;
    IsMailMergeEnabled?: boolean;
    IsDuplicateDetectionEnabled?: boolean;
    IsImportable?: boolean;
    IsMappable?: boolean;
    IsStateModelAware?: boolean;
    EnforceStateTransitions?: boolean;

    // Mobile
    IsAvailableOffline?: boolean;
    IsVisibleInMobile?: boolean;
    IsVisibleInMobileClient?: boolean;
    IsReadOnlyInMobileClient?: boolean;
    IsOfflineInMobileClient?: boolean;
    MobileOfflineFilters?: string;

    // Advanced find and queues
    IsValidForAdvancedFind?: ManagedProperty<boolean>;
    IsValidForQueue?: ManagedProperty<boolean>;

    // Customization capabilities
    IsCustomizable?: ManagedProperty<boolean>;
    IsRenameable?: ManagedProperty<boolean>;
    CanModifyAdditionalSettings?: ManagedProperty<boolean>;
    CanCreateAttributes?: ManagedProperty<boolean>;
    CanCreateForms?: ManagedProperty<boolean>;
    CanCreateViews?: ManagedProperty<boolean>;
    CanCreateCharts?: ManagedProperty<boolean>;
    CanBeInManyToMany?: ManagedProperty<boolean>;
    CanBePrimaryEntityInRelationship?: ManagedProperty<boolean>;
    CanBeRelatedEntityInRelationship?: ManagedProperty<boolean>;
    CanBeInCustomEntityAssociation?: ManagedProperty<boolean>;
    CanChangeHierarchicalRelationship?: ManagedProperty<boolean>;
    CanChangeTrackingBeEnabled?: ManagedProperty<boolean>;
    CanEnableSyncToExternalSearchIndex?: ManagedProperty<boolean>;
    CanTriggerWorkflow?: boolean;

    // Clustering and partitioning
    ClusterMode?: string;
    CanChangeClusterMode?: boolean;
    AutoReplicateClusterRecords?: boolean;
    DefaultToLocalPartition?: boolean;

    // Retention and archival
    IsArchivalEnabled?: boolean;
    IsRetentionEnabled?: boolean;

    // Data provider
    DataProviderId?: string | null;
    DataSourceId?: string | null;
    SettingOf?: string | null;

    // Help and icons
    EntityHelpUrl?: string | null;
    EntityHelpUrlEnabled?: boolean;
    EntityColor?: string | null;
    IconLargeName?: string | null;
    IconMediumName?: string | null;
    IconSmallName?: string | null;
    IconVectorName?: string | null;

    // Versioning and lifecycle
    HasChanged?: boolean | null;
    IntroducedVersion?: string;
    CreatedOn?: string;
    ModifiedOn?: string;
    DaysSinceRecordLastModified?: number;

    // Concurrency
    IsOptimisticConcurrencyEnabled?: boolean;
    IsAIRUpdated?: boolean;
    IsSolutionAware?: boolean;

    // Teams
    AutoCreateAccessTeams?: boolean;
    AutoRouteToOwnerQueue?: boolean;

    // Reporting
    ReportViewName?: string | null;
    RecurrenceBaseEntityLogicalName?: string | null;
    UsesBusinessDataLabelTable?: boolean;

    // Activity-specific
    ActivityTypeMask?: number;

    // Additional settings
    Settings?: unknown[];

    // Related metadata collections
    Attributes?: AttributeMetadataDto[];
    OneToManyRelationships?: OneToManyRelationshipDto[];
    ManyToOneRelationships?: OneToManyRelationshipDto[];
    ManyToManyRelationships?: ManyToManyRelationshipDto[];
    Keys?: EntityKeyDto[];
    Privileges?: SecurityPrivilegeDto[];
}

/**
 * DTO representing attribute metadata from Dataverse Web API.
 * Maps directly to the JSON structure returned by the Metadata API.
 */
export interface AttributeMetadataDto {
    // Core identifiers
    MetadataId: string;
    LogicalName: string;
    SchemaName: string;
    DisplayName?: LabelMetadata;
    Description?: LabelMetadata;
    AttributeType?: string;
    AttributeTypeName?: { Value: string };

    // Virtual field detection (CRITICAL for IntelliSense filtering)
    /** Parent attribute logical name. If set, this is a virtual field (e.g., "createdbyname" -> "createdby") */
    AttributeOf?: string | null;
    /** Whether this is a logical/computed attribute (virtual fields have IsLogical=true) */
    IsLogical?: boolean;

    // OData discriminator (useful for type-specific handling)
    '@odata.type'?: string;
    /** Whether this attribute can be used in OData queries */
    IsValidODataAttribute?: boolean;

    // Ownership and customization
    IsCustomAttribute?: boolean;
    IsManaged?: boolean;
    IsPrimaryId?: boolean;
    IsPrimaryName?: boolean;
    RequiredLevel?: ManagedProperty<string>;

    // Type-specific properties (common)
    MaxLength?: number;
    Targets?: string[];
    Precision?: number;
    MinValue?: number;
    MaxValue?: number;
    Format?: string;
    FormatName?: { Value: string };
    ImeMode?: string;
    OptionSet?: OptionSetMetadataDto;
    GlobalOptionSet?: GlobalOptionSetReferenceDto;

    // String-specific
    YomiOf?: string | null;
    IsLocalizable?: boolean;
    DatabaseLength?: number;

    // DateTime-specific
    DateTimeBehavior?: { Value: string };
    CanChangeDateTimeBehavior?: ManagedProperty<boolean>;
    MinSupportedValue?: string;
    MaxSupportedValue?: string;

    // Boolean-specific
    DefaultValue?: boolean;

    // Money-specific
    PrecisionSource?: number;
    CalculationOf?: string | null;
    IsBaseCurrency?: boolean;

    // Image-specific
    IsPrimaryImage?: boolean;
    MaxHeight?: number;
    MaxWidth?: number;
    MaxSizeInKB?: number;
    CanStoreFullImage?: boolean;

    // EntityName-specific
    IsEntityReferenceStored?: boolean;

    // Validation flags
    IsValidForCreate?: boolean;
    IsValidForUpdate?: boolean;
    IsValidForRead?: boolean;
    IsValidForForm?: boolean;
    IsValidForGrid?: boolean;
    IsRequiredForForm?: boolean;

    // Security
    IsSecured?: boolean;
    CanBeSecuredForRead?: boolean;
    CanBeSecuredForCreate?: boolean;
    CanBeSecuredForUpdate?: boolean;

    // Behavior
    IsFilterable?: boolean;
    IsSearchable?: boolean;
    IsRetrievable?: boolean;

    // Versioning and lifecycle
    HasChanged?: boolean | null;
    IntroducedVersion?: string | null;
    DeprecatedVersion?: string | null;
    CreatedOn?: string;
    ModifiedOn?: string;

    // Column and schema info
    ColumnNumber?: number;
    EntityLogicalName?: string;
    ExternalName?: string | null;
    LinkedAttributeId?: string | null;
    InheritsFrom?: string | null;

    // Source and calculation
    /** 0=simple, 1=calculated, 2=rollup */
    SourceType?: number | null;
    SourceTypeMask?: number;
    FormulaDefinition?: string | null;
    AutoNumberFormat?: string;
    IsDataSourceSecret?: boolean;

    // Managed properties (complex objects with CanBeChanged)
    IsAuditEnabled?: ManagedProperty<boolean>;
    IsGlobalFilterEnabled?: ManagedProperty<boolean>;
    IsSortableEnabled?: ManagedProperty<boolean>;
    IsCustomizable?: ManagedProperty<boolean>;
    IsRenameable?: ManagedProperty<boolean>;
    IsValidForAdvancedFind?: ManagedProperty<boolean>;
    CanModifyAdditionalSettings?: ManagedProperty<boolean>;

    // Picklist-specific
    DefaultFormValue?: number;
    ParentPicklistLogicalName?: string | null;
    ChildPicklistLogicalNames?: string[];

    // Additional settings
    Settings?: unknown[];
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
 * DTO representing associated menu configuration.
 */
export interface AssociatedMenuConfigurationDto {
    Behavior?: string;
    Group?: string;
    Label?: LabelMetadata;
    Order?: number;
    QueryApi?: string;
    ViewId?: string;
    AvailableOffline?: boolean;
    Icon?: string;
    IsCustomizable?: boolean;
    MenuId?: string;
}

/**
 * DTO representing one-to-many relationship metadata.
 * COMPLETE: All 25 fields from Dataverse API.
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
    // Additional fields
    AssociatedMenuConfiguration?: AssociatedMenuConfigurationDto;
    DenormalizedAttributeName?: string | null;
    EntityKey?: string | null;
    HasChanged?: boolean | null;
    IntroducedVersion?: string;
    IsCustomizable?: ManagedProperty<boolean>;
    IsDenormalizedLookup?: boolean;
    IsRelationshipAttributeDenormalized?: boolean;
    IsValidForAdvancedFind?: ManagedProperty<boolean>;
    RelationshipAttributes?: unknown[];
    RelationshipBehavior?: number;
}

/**
 * DTO representing many-to-many relationship metadata.
 * COMPLETE: All 19 fields from Dataverse API.
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
    // Additional fields
    Entity1AssociatedMenuConfiguration?: AssociatedMenuConfigurationDto;
    Entity2AssociatedMenuConfiguration?: AssociatedMenuConfigurationDto;
    HasChanged?: boolean | null;
    IntroducedVersion?: string;
    IsCustomizable?: ManagedProperty<boolean>;
    IsValidForAdvancedFind?: ManagedProperty<boolean>;
    RelationshipType?: string;
    SecurityTypes?: string;
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
 * Note: PrivilegeType can be string or number depending on entity type.
 * Most entities return number (0-8), but some system entities (e.g., PrincipalObjectAttributeAccess)
 * return string values ("Create", "Read", etc.).
 * COMPLETE: All 10 fields from Dataverse API.
 */
export interface SecurityPrivilegeDto {
    PrivilegeId: string;
    Name: string;
    PrivilegeType: number | string;
    CanBeBasic: boolean;
    CanBeLocal: boolean;
    CanBeDeep: boolean;
    CanBeGlobal: boolean;
    CanBeEntityReference?: boolean;
    CanBeParentEntityReference?: boolean;
    CanBeRecordFilter?: boolean;
}
