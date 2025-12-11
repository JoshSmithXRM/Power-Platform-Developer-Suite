import { LogicalName } from '../valueObjects/LogicalName';
import { SchemaName } from '../valueObjects/SchemaName';
import { AttributeType } from '../valueObjects/AttributeType';
import { OptionSetMetadata } from '../valueObjects/OptionSetMetadata';

/**
 * Source type for calculated and rollup fields.
 * 0 = Simple (standard attribute)
 * 1 = Calculated (formula-based)
 * 2 = Rollup (aggregated from related records)
 */
export type SourceType = 0 | 1 | 2 | null;

/**
 * Raw DTO preserved for serialization.
 * This is the original API response before domain mapping.
 * Used by the serializer to show complete raw data in Metadata Browser.
 */
export type RawAttributeDto = Record<string, unknown>;

/**
 * Domain entity representing Dataverse attribute metadata.
 * Rich domain model with behavior methods (not anemic).
 */
export class AttributeMetadata {
    /**
     * Original raw DTO from API response.
     * Preserved for Raw Data tab display - contains ALL fields from Dataverse API.
     * Optional: only set when entity is created from repository with DTO.
     */
    private _rawDto: RawAttributeDto | null = null;

    private constructor(
        public readonly metadataId: string,
        public readonly logicalName: LogicalName,
        public readonly schemaName: SchemaName,
        public readonly displayName: string,
        public readonly description: string | null,
        public readonly attributeType: AttributeType,
        public readonly isCustomAttribute: boolean,
        public readonly isManaged: boolean,
        public readonly isPrimaryId: boolean,
        public readonly isPrimaryName: boolean,
        public readonly requiredLevel: 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended',
        // Type-specific properties
        public readonly maxLength: number | null,
        public readonly targets: readonly string[] | null,
        public readonly precision: number | null,
        public readonly minValue: number | null,
        public readonly maxValue: number | null,
        public readonly format: string | null,
        public readonly optionSet: OptionSetMetadata | null,
        // Validation flags
        public readonly isValidForCreate: boolean,
        public readonly isValidForUpdate: boolean,
        public readonly isValidForRead: boolean,
        public readonly isValidForForm: boolean,
        public readonly isValidForGrid: boolean,
        // Security
        public readonly isSecured: boolean,
        public readonly canBeSecuredForRead: boolean,
        public readonly canBeSecuredForCreate: boolean,
        public readonly canBeSecuredForUpdate: boolean,
        // Behavior
        public readonly isFilterable: boolean,
        public readonly isSearchable: boolean,
        public readonly isRetrievable: boolean,
        // Virtual field detection (CRITICAL for IntelliSense filtering)
        /** Parent attribute logical name. If set, this is a virtual field (e.g., "createdbyname" -> "createdby") */
        public readonly attributeOf: string | null,
        /** Whether this is a logical/computed attribute */
        public readonly isLogical: boolean,
        // Source and calculation
        /** 0=simple, 1=calculated, 2=rollup */
        public readonly sourceType: SourceType,
        public readonly formulaDefinition: string | null,
        // Versioning
        public readonly introducedVersion: string | null,
        public readonly deprecatedVersion: string | null
    ) {}

    public static create(props: {
        metadataId: string;
        logicalName: LogicalName;
        schemaName: SchemaName;
        displayName: string;
        description: string | null;
        attributeType: AttributeType;
        isCustomAttribute: boolean;
        isManaged: boolean;
        isPrimaryId: boolean;
        isPrimaryName: boolean;
        requiredLevel: 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended';
        maxLength?: number | null;
        targets?: readonly string[] | null;
        precision?: number | null;
        minValue?: number | null;
        maxValue?: number | null;
        format?: string | null;
        optionSet?: OptionSetMetadata | null;
        isValidForCreate?: boolean;
        isValidForUpdate?: boolean;
        isValidForRead?: boolean;
        isValidForForm?: boolean;
        isValidForGrid?: boolean;
        isSecured?: boolean;
        canBeSecuredForRead?: boolean;
        canBeSecuredForCreate?: boolean;
        canBeSecuredForUpdate?: boolean;
        isFilterable?: boolean;
        isSearchable?: boolean;
        isRetrievable?: boolean;
        // Virtual field detection
        attributeOf?: string | null;
        isLogical?: boolean;
        // Source and calculation
        sourceType?: SourceType;
        formulaDefinition?: string | null;
        // Versioning
        introducedVersion?: string | null;
        deprecatedVersion?: string | null;
    }): AttributeMetadata {
        if (!props.metadataId || props.metadataId.trim().length === 0) {
            throw new Error('Invalid AttributeMetadata: metadataId cannot be empty');
        }

        if (!props.displayName || props.displayName.trim().length === 0) {
            throw new Error('Invalid AttributeMetadata: displayName cannot be empty');
        }

        if (props.maxLength !== undefined && props.maxLength !== null && props.maxLength < 0) {
            throw new Error('Invalid AttributeMetadata: maxLength cannot be negative');
        }

        return new AttributeMetadata(
            props.metadataId,
            props.logicalName,
            props.schemaName,
            props.displayName,
            props.description,
            props.attributeType,
            props.isCustomAttribute,
            props.isManaged,
            props.isPrimaryId,
            props.isPrimaryName,
            props.requiredLevel,
            props.maxLength ?? null,
            props.targets ?? null,
            props.precision ?? null,
            props.minValue ?? null,
            props.maxValue ?? null,
            props.format ?? null,
            props.optionSet ?? null,
            props.isValidForCreate ?? true,
            props.isValidForUpdate ?? true,
            props.isValidForRead ?? true,
            props.isValidForForm ?? true,
            props.isValidForGrid ?? true,
            props.isSecured ?? false,
            props.canBeSecuredForRead ?? false,
            props.canBeSecuredForCreate ?? false,
            props.canBeSecuredForUpdate ?? false,
            props.isFilterable ?? false,
            props.isSearchable ?? false,
            props.isRetrievable ?? true,
            props.attributeOf ?? null,
            props.isLogical ?? false,
            props.sourceType ?? null,
            props.formulaDefinition ?? null,
            props.introducedVersion ?? null,
            props.deprecatedVersion ?? null
        );
    }

    // Behavior methods (rich domain model)

    /**
     * Checks if this attribute is required (system or application).
     */
    public isRequired(): boolean {
        return this.requiredLevel === 'SystemRequired' || this.requiredLevel === 'ApplicationRequired';
    }

    /**
     * Checks if this is a system attribute (not custom).
     */
    public isSystemAttribute(): boolean {
        return !this.isCustomAttribute;
    }

    /**
     * Checks if this is a lookup-type attribute.
     */
    public isLookup(): boolean {
        return this.attributeType.isLookup();
    }

    /**
     * Checks if this is a choice-type attribute.
     */
    public isChoice(): boolean {
        return this.attributeType.isChoice();
    }

    /**
     * Checks if this attribute has a max length constraint.
     */
    public hasMaxLength(): boolean {
        return this.maxLength !== null;
    }

    /**
     * Checks if this is a primary field (ID or Name).
     */
    public isPrimaryField(): boolean {
        return this.isPrimaryId || this.isPrimaryName;
    }

    /**
     * Checks if this attribute has lookup targets.
     */
    public hasTargets(): boolean {
        return this.targets !== null && this.targets.length > 0;
    }

    /**
     * Gets the count of lookup targets.
     */
    public getTargetCount(): number {
        return this.targets?.length || 0;
    }

    /**
     * Checks if this attribute has an option set (choice).
     */
    public hasOptionSet(): boolean {
        return this.optionSet !== null;
    }

    /**
     * Checks if this is a read-only attribute.
     */
    public isReadOnly(): boolean {
        return !this.isValidForCreate && !this.isValidForUpdate;
    }

    /**
     * Checks if this attribute can be used in forms.
     */
    public canBeUsedInForms(): boolean {
        return this.isValidForForm;
    }

    /**
     * Checks if this attribute has numeric constraints.
     */
    public hasNumericConstraints(): boolean {
        return this.minValue !== null || this.maxValue !== null || this.precision !== null;
    }

    // Virtual field detection methods (CRITICAL for IntelliSense filtering)

    /**
     * Checks if this is a virtual field (has a parent attribute).
     * Virtual fields like "createdbyname" have AttributeOf set to their parent ("createdby").
     * These fields should be hidden from SELECT and ORDER BY IntelliSense but shown in WHERE.
     */
    public isVirtualField(): boolean {
        return this.attributeOf !== null;
    }

    /**
     * Gets the parent attribute logical name for virtual fields.
     * Returns null if this is not a virtual field.
     */
    public getParentAttribute(): string | null {
        return this.attributeOf;
    }

    /**
     * Checks if this is a calculated field (formula-based).
     */
    public isCalculatedField(): boolean {
        return this.sourceType === 1;
    }

    /**
     * Checks if this is a rollup field (aggregated from related records).
     */
    public isRollupField(): boolean {
        return this.sourceType === 2;
    }

    /**
     * Checks if this field has a formula definition.
     */
    public hasFormula(): boolean {
        return this.formulaDefinition !== null;
    }

    /**
     * Checks if this attribute is deprecated.
     */
    public isDeprecated(): boolean {
        return this.deprecatedVersion !== null;
    }

    // Raw DTO preservation (for Metadata Browser Raw Data tab)

    /**
     * Sets the original raw DTO from API response.
     * Called by the mapper after creating the entity to preserve complete API data.
     */
    public setRawDto(dto: RawAttributeDto): void {
        this._rawDto = dto;
    }

    /**
     * Gets the original raw DTO if available.
     * Returns null if entity was created without preserving the DTO.
     */
    public getRawDto(): RawAttributeDto | null {
        return this._rawDto;
    }

    /**
     * Checks if raw DTO is available.
     */
    public hasRawDto(): boolean {
        return this._rawDto !== null;
    }
}
