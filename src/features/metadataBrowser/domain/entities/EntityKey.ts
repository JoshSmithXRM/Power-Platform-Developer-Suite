import { LogicalName } from '../valueObjects/LogicalName';
import { SchemaName } from '../valueObjects/SchemaName';

/**
 * Raw DTO preserved for serialization.
 * This is the original API response before domain mapping.
 * Used by the serializer to show complete raw data in Metadata Browser.
 */
export type RawEntityKeyDto = Record<string, unknown>;

/**
 * Domain entity representing an alternate key in Dataverse.
 * Rich domain model with behavior methods.
 */
export class EntityKey {
    /**
     * Original raw DTO from API response.
     * Preserved for Raw Data tab display - contains ALL fields from Dataverse API.
     */
    private _rawDto: RawEntityKeyDto | null = null;

    private constructor(
        public readonly metadataId: string,
        public readonly logicalName: LogicalName,
        public readonly schemaName: SchemaName,
        public readonly displayName: string,
        public readonly entityLogicalName: string,
        public readonly keyAttributes: readonly string[],
        public readonly isManaged: boolean,
        public readonly entityKeyIndexStatus: string | null
    ) {}

    public static create(props: {
        metadataId: string;
        logicalName: LogicalName;
        schemaName: SchemaName;
        displayName: string;
        entityLogicalName: string;
        keyAttributes: readonly string[];
        isManaged: boolean;
        entityKeyIndexStatus?: string | null;
    }): EntityKey {
        if (!props.metadataId || props.metadataId.trim().length === 0) {
            throw new Error('Invalid EntityKey: metadataId cannot be empty');
        }

        if (!props.displayName || props.displayName.trim().length === 0) {
            throw new Error('Invalid EntityKey: displayName cannot be empty');
        }

        if (!props.keyAttributes || props.keyAttributes.length === 0) {
            throw new Error('Invalid EntityKey: must have at least one attribute');
        }

        return new EntityKey(
            props.metadataId,
            props.logicalName,
            props.schemaName,
            props.displayName,
            props.entityLogicalName,
            props.keyAttributes,
            props.isManaged,
            props.entityKeyIndexStatus ?? null
        );
    }

    // Behavior methods

    /**
     * Checks if this is a composite key (multiple attributes).
     */
    public isCompositeKey(): boolean {
        return this.keyAttributes.length > 1;
    }

    /**
     * Checks if this key is active and ready to use.
     */
    public isActive(): boolean {
        return this.entityKeyIndexStatus === 'Active';
    }

    /**
     * Gets the count of attributes in this key.
     */
    public getAttributeCount(): number {
        return this.keyAttributes.length;
    }

    /**
     * Checks if this key includes a specific attribute.
     */
    public includesAttribute(attributeName: string): boolean {
        return this.keyAttributes.includes(attributeName);
    }

    // Raw DTO preservation (for Metadata Browser Raw Data tab)

    /**
     * Sets the original raw DTO from API response.
     * Called by the mapper after creating the entity to preserve complete API data.
     */
    public setRawDto(dto: RawEntityKeyDto): void {
        this._rawDto = dto;
    }

    /**
     * Gets the original raw DTO if available.
     * Returns null if entity was created without preserving the DTO.
     */
    public getRawDto(): RawEntityKeyDto | null {
        return this._rawDto;
    }

    /**
     * Checks if raw DTO is available.
     */
    public hasRawDto(): boolean {
        return this._rawDto !== null;
    }
}
