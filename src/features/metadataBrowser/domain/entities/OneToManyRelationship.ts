import { CascadeConfiguration } from '../valueObjects/CascadeConfiguration';

/**
 * Domain entity representing a one-to-many relationship in Dataverse.
 * Rich domain model with behavior methods.
 */
export class OneToManyRelationship {
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
            throw new Error('Relationship metadata ID cannot be empty');
        }

        if (!props.schemaName || props.schemaName.trim().length === 0) {
            throw new Error('Relationship schema name cannot be empty');
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
}
