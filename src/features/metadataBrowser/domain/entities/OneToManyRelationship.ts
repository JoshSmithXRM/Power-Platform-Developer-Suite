import { CascadeConfiguration } from '../valueObjects/CascadeConfiguration';

/**
 * Raw DTO preserved for serialization.
 * This is the original API response before domain mapping.
 * Used by the serializer to show complete raw data in Metadata Browser.
 */
export type RawOneToManyRelationshipDto = Record<string, unknown>;

/**
 * Domain entity representing a one-to-many relationship in Dataverse.
 * Rich domain model with behavior methods.
 */
export class OneToManyRelationship {
    /**
     * Original raw DTO from API response.
     * Preserved for Raw Data tab display - contains ALL fields from Dataverse API.
     */
    private _rawDto: RawOneToManyRelationshipDto | null = null;

    private constructor(
        public readonly metadataId: string,
        public readonly schemaName: string,
        public readonly referencedEntity: string,
        public readonly referencedAttribute: string,
        public readonly referencingEntity: string,
        public readonly referencingAttribute: string,
        public readonly isCustomRelationship: boolean,
        public readonly isManaged: boolean,
        public readonly relationshipType: string,
        public readonly cascadeConfiguration: CascadeConfiguration,
        public readonly referencedEntityNavigationPropertyName: string | null,
        public readonly referencingEntityNavigationPropertyName: string | null,
        public readonly isHierarchical: boolean,
        public readonly securityTypes: string | null
    ) {}

    public static create(props: {
        metadataId: string;
        schemaName: string;
        referencedEntity: string;
        referencedAttribute: string;
        referencingEntity: string;
        referencingAttribute: string;
        isCustomRelationship: boolean;
        isManaged: boolean;
        relationshipType: string;
        cascadeConfiguration: CascadeConfiguration;
        referencedEntityNavigationPropertyName?: string | null;
        referencingEntityNavigationPropertyName?: string | null;
        isHierarchical?: boolean;
        securityTypes?: string | null;
    }): OneToManyRelationship {
        if (!props.metadataId || props.metadataId.trim().length === 0) {
            throw new Error('Invalid OneToManyRelationship: metadataId cannot be empty');
        }

        if (!props.schemaName || props.schemaName.trim().length === 0) {
            throw new Error('Invalid OneToManyRelationship: schemaName cannot be empty');
        }

        return new OneToManyRelationship(
            props.metadataId,
            props.schemaName,
            props.referencedEntity,
            props.referencedAttribute,
            props.referencingEntity,
            props.referencingAttribute,
            props.isCustomRelationship,
            props.isManaged,
            props.relationshipType,
            props.cascadeConfiguration,
            props.referencedEntityNavigationPropertyName ?? null,
            props.referencingEntityNavigationPropertyName ?? null,
            props.isHierarchical ?? false,
            props.securityTypes ?? null
        );
    }

    // Behavior methods

    /**
     * Checks if this is a system relationship (not custom).
     */
    public isSystemRelationship(): boolean {
        return !this.isCustomRelationship;
    }

    /**
     * Checks if this relationship will cascade deletes.
     */
    public willCascadeDelete(): boolean {
        return this.cascadeConfiguration.willCascadeDelete();
    }

    /**
     * Checks if this is a self-referential relationship (hierarchical).
     */
    public isSelfReferencing(): boolean {
        return this.referencedEntity === this.referencingEntity;
    }

    // Raw DTO preservation (for Metadata Browser Raw Data tab)

    /**
     * Sets the original raw DTO from API response.
     * Called by the mapper after creating the entity to preserve complete API data.
     */
    public setRawDto(dto: RawOneToManyRelationshipDto): void {
        this._rawDto = dto;
    }

    /**
     * Gets the original raw DTO if available.
     * Returns null if entity was created without preserving the DTO.
     */
    public getRawDto(): RawOneToManyRelationshipDto | null {
        return this._rawDto;
    }

    /**
     * Checks if raw DTO is available.
     */
    public hasRawDto(): boolean {
        return this._rawDto !== null;
    }
}
