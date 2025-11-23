import { LogicalName } from '../valueObjects/LogicalName';
import { SchemaName } from '../valueObjects/SchemaName';

/**
 * Domain entity representing an alternate key in Dataverse.
 * Rich domain model with behavior methods.
 */
export class EntityKey {
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
}
