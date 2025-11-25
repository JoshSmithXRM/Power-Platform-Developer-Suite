import { LogicalName } from '../valueObjects/LogicalName';
import { SchemaName } from '../valueObjects/SchemaName';

import { AttributeMetadata } from './AttributeMetadata';
import { OneToManyRelationship } from './OneToManyRelationship';
import { ManyToManyRelationship } from './ManyToManyRelationship';
import { EntityKey } from './EntityKey';
import { SecurityPrivilege } from './SecurityPrivilege';

/**
 * Domain entity representing Dataverse entity metadata.
 * Rich domain model with behavior methods (not anemic).
 */
export class EntityMetadata {
    private constructor(
        public readonly metadataId: string,
        public readonly logicalName: LogicalName,
        public readonly schemaName: SchemaName,
        public readonly displayName: string,
        public readonly pluralName: string,
        public readonly description: string | null,
        public readonly isCustomEntity: boolean,
        public readonly isManaged: boolean,
        public readonly ownershipType: 'UserOwned' | 'OrganizationOwned' | 'TeamOwned' | 'None',
        public readonly attributes: readonly AttributeMetadata[],
        // Primary attributes
        public readonly primaryIdAttribute: string | null,
        public readonly primaryNameAttribute: string | null,
        public readonly primaryImageAttribute: string | null,
        // Entity identification
        public readonly entitySetName: string | null,
        public readonly objectTypeCode: number | null,
        // Capabilities
        public readonly isActivity: boolean,
        public readonly hasNotes: boolean,
        public readonly hasActivities: boolean,
        public readonly isValidForAdvancedFind: boolean,
        public readonly isAuditEnabled: boolean,
        public readonly isValidForQueue: boolean,
        // Relationships
        public readonly oneToManyRelationships: readonly OneToManyRelationship[],
        public readonly manyToOneRelationships: readonly OneToManyRelationship[],
        public readonly manyToManyRelationships: readonly ManyToManyRelationship[],
        // Keys
        public readonly keys: readonly EntityKey[],
        // Privileges
        public readonly privileges: readonly SecurityPrivilege[]
    ) {}

    public static create(props: {
        metadataId: string;
        logicalName: LogicalName;
        schemaName: SchemaName;
        displayName: string;
        pluralName: string;
        description: string | null;
        isCustomEntity: boolean;
        isManaged: boolean;
        ownershipType: 'UserOwned' | 'OrganizationOwned' | 'TeamOwned' | 'None';
        attributes: readonly AttributeMetadata[];
        primaryIdAttribute?: string | null;
        primaryNameAttribute?: string | null;
        primaryImageAttribute?: string | null;
        entitySetName?: string | null;
        objectTypeCode?: number | null;
        isActivity?: boolean;
        hasNotes?: boolean;
        hasActivities?: boolean;
        isValidForAdvancedFind?: boolean;
        isAuditEnabled?: boolean;
        isValidForQueue?: boolean;
        oneToManyRelationships?: readonly OneToManyRelationship[];
        manyToOneRelationships?: readonly OneToManyRelationship[];
        manyToManyRelationships?: readonly ManyToManyRelationship[];
        keys?: readonly EntityKey[];
        privileges?: readonly SecurityPrivilege[];
    }): EntityMetadata {
        if (!props.metadataId || props.metadataId.trim().length === 0) {
            throw new Error('Invalid EntityMetadata: metadataId cannot be empty');
        }

        if (!props.displayName || props.displayName.trim().length === 0) {
            throw new Error('Invalid EntityMetadata: displayName cannot be empty');
        }

        if (!props.pluralName || props.pluralName.trim().length === 0) {
            throw new Error('Invalid EntityMetadata: pluralName cannot be empty');
        }

        return new EntityMetadata(
            props.metadataId,
            props.logicalName,
            props.schemaName,
            props.displayName,
            props.pluralName,
            props.description,
            props.isCustomEntity,
            props.isManaged,
            props.ownershipType,
            props.attributes,
            props.primaryIdAttribute ?? null,
            props.primaryNameAttribute ?? null,
            props.primaryImageAttribute ?? null,
            props.entitySetName ?? null,
            props.objectTypeCode ?? null,
            props.isActivity ?? false,
            props.hasNotes ?? false,
            props.hasActivities ?? false,
            props.isValidForAdvancedFind ?? true,
            props.isAuditEnabled ?? false,
            props.isValidForQueue ?? false,
            props.oneToManyRelationships ?? [],
            props.manyToOneRelationships ?? [],
            props.manyToManyRelationships ?? [],
            props.keys ?? [],
            props.privileges ?? []
        );
    }

    // Behavior methods (rich domain model)

    /**
     * Checks if this is a system entity (not custom).
     */
    public isSystemEntity(): boolean {
        return !this.isCustomEntity;
    }

    /**
     * Checks if this entity has attributes.
     */
    public hasAttributes(): boolean {
        return this.attributes.length > 0;
    }

    /**
     * Gets the count of attributes.
     */
    public getAttributeCount(): number {
        return this.attributes.length;
    }

    /**
     * Finds an attribute by logical name.
     */
    public findAttributeByLogicalName(logicalName: LogicalName): AttributeMetadata | null {
        return this.attributes.find(attr => attr.logicalName.equals(logicalName)) || null;
    }

    /**
     * Gets all attributes of a specific type.
     */
    public getAttributesByType(typeName: string): readonly AttributeMetadata[] {
        return this.attributes.filter(attr => attr.attributeType.getValue() === typeName);
    }

    /**
     * Gets all required attributes.
     */
    public getRequiredAttributes(): readonly AttributeMetadata[] {
        return this.attributes.filter(attr => attr.isRequired());
    }

    /**
     * Gets all lookup attributes.
     */
    public getLookupAttributes(): readonly AttributeMetadata[] {
        return this.attributes.filter(attr => attr.isLookup());
    }

    /**
     * Gets all custom attributes (not system).
     */
    public getCustomAttributes(): readonly AttributeMetadata[] {
        return this.attributes.filter(attr => !attr.isSystemAttribute());
    }

    /**
     * Checks if this entity has relationships.
     */
    public hasRelationships(): boolean {
        return this.oneToManyRelationships.length > 0 ||
               this.manyToOneRelationships.length > 0 ||
               this.manyToManyRelationships.length > 0;
    }

    /**
     * Gets total count of all relationships.
     */
    public getRelationshipCount(): number {
        return this.oneToManyRelationships.length +
               this.manyToOneRelationships.length +
               this.manyToManyRelationships.length;
    }

    /**
     * Checks if this entity has alternate keys.
     */
    public hasKeys(): boolean {
        return this.keys.length > 0;
    }

    /**
     * Gets the primary ID attribute metadata.
     */
    public getPrimaryIdAttributeMetadata(): AttributeMetadata | null {
        if (!this.primaryIdAttribute) {
            return null;
        }
        const logicalName = LogicalName.create(this.primaryIdAttribute);
        return this.findAttributeByLogicalName(logicalName);
    }

    /**
     * Gets the primary name attribute metadata.
     */
    public getPrimaryNameAttributeMetadata(): AttributeMetadata | null {
        if (!this.primaryNameAttribute) {
            return null;
        }
        const logicalName = LogicalName.create(this.primaryNameAttribute);
        return this.findAttributeByLogicalName(logicalName);
    }

    /**
     * Checks if this entity supports notes (annotations).
     */
    public supportsNotes(): boolean {
        return this.hasNotes;
    }

    /**
     * Checks if this entity supports activities.
     */
    public supportsActivities(): boolean {
        return this.hasActivities;
    }

    /**
     * Gets all custom relationships.
     */
    public getCustomRelationships(): {
        oneToMany: readonly OneToManyRelationship[];
        manyToOne: readonly OneToManyRelationship[];
        manyToMany: readonly ManyToManyRelationship[];
    } {
        return {
            oneToMany: this.oneToManyRelationships.filter(r => r.isCustomRelationship),
            manyToOne: this.manyToOneRelationships.filter(r => r.isCustomRelationship),
            manyToMany: this.manyToManyRelationships.filter(r => r.isCustomRelationship)
        };
    }

    /**
     * Gets all active alternate keys.
     */
    public getActiveKeys(): readonly EntityKey[] {
        return this.keys.filter(k => k.isActive());
    }
}
