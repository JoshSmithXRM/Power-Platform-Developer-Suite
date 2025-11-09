/**
 * Domain entity representing a many-to-many relationship in Dataverse.
 * Rich domain model with behavior methods.
 */
export class ManyToManyRelationship {
    private constructor(
        public readonly metadataId: string,
        public readonly schemaName: string,
        public readonly entity1LogicalName: string,
        public readonly entity1IntersectAttribute: string,
        public readonly entity2LogicalName: string,
        public readonly entity2IntersectAttribute: string,
        public readonly intersectEntityName: string,
        public readonly isCustomRelationship: boolean,
        public readonly isManaged: boolean,
        public readonly entity1NavigationPropertyName: string | null,
        public readonly entity2NavigationPropertyName: string | null
    ) {}

    public static create(props: {
        metadataId: string;
        schemaName: string;
        entity1LogicalName: string;
        entity1IntersectAttribute: string;
        entity2LogicalName: string;
        entity2IntersectAttribute: string;
        intersectEntityName: string;
        isCustomRelationship: boolean;
        isManaged: boolean;
        entity1NavigationPropertyName?: string | null;
        entity2NavigationPropertyName?: string | null;
    }): ManyToManyRelationship {
        if (!props.metadataId || props.metadataId.trim().length === 0) {
            throw new Error('Relationship metadata ID cannot be empty');
        }

        if (!props.schemaName || props.schemaName.trim().length === 0) {
            throw new Error('Relationship schema name cannot be empty');
        }

        return new ManyToManyRelationship(
            props.metadataId,
            props.schemaName,
            props.entity1LogicalName,
            props.entity1IntersectAttribute,
            props.entity2LogicalName,
            props.entity2IntersectAttribute,
            props.intersectEntityName,
            props.isCustomRelationship,
            props.isManaged,
            props.entity1NavigationPropertyName ?? null,
            props.entity2NavigationPropertyName ?? null
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
     * Checks if this is a self-referential relationship.
     */
    public isSelfReferencing(): boolean {
        return this.entity1LogicalName === this.entity2LogicalName;
    }

    /**
     * Gets the other entity in the relationship.
     */
    public getOtherEntity(currentEntity: string): string | null {
        if (this.entity1LogicalName === currentEntity) {
            return this.entity2LogicalName;
        }
        if (this.entity2LogicalName === currentEntity) {
            return this.entity1LogicalName;
        }
        return null;
    }
}
