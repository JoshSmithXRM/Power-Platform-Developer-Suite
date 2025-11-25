import type { OneToManyRelationship } from '../../domain/entities/OneToManyRelationship';
import type { ManyToManyRelationship } from '../../domain/entities/ManyToManyRelationship';
import type { RelationshipRowViewModel } from '../viewModels/RelationshipRowViewModel';

/**
 * Maps relationship entities to RelationshipRowViewModel.
 *
 * Transformation rules:
 * - 1:N/N:1: Single related entity (navigable)
 * - N:N: "entity1 ↔ entity2" format (quick pick navigation)
 */
export class RelationshipRowMapper {
    public toOneToManyViewModel(
        relationship: OneToManyRelationship
    ): RelationshipRowViewModel {
        return {
            id: relationship.schemaName,
            name: relationship.schemaName,
            type: '1:N',
            relatedEntity: relationship.referencingEntity,
            referencingAttribute: relationship.referencingAttribute,
            navigationType: 'entity',
            navigationTarget: relationship.referencingEntity,
            isLinkable: true,
            metadata: relationship
        };
    }

    public toManyToOneViewModel(
        relationship: OneToManyRelationship
    ): RelationshipRowViewModel {
        return {
            id: relationship.schemaName,
            name: relationship.schemaName,
            type: 'N:1',
            relatedEntity: relationship.referencedEntity,
            referencingAttribute: relationship.referencingAttribute,
            navigationType: 'entity',
            navigationTarget: relationship.referencedEntity,
            isLinkable: true,
            metadata: relationship
        };
    }

    public toManyToManyViewModel(
        relationship: ManyToManyRelationship
    ): RelationshipRowViewModel {
        return {
            id: relationship.schemaName,
            name: relationship.schemaName,
            type: 'N:N',
            relatedEntity: `${relationship.entity1LogicalName} ↔ ${relationship.entity2LogicalName}`,
            referencingAttribute: relationship.intersectEntityName,
            navigationType: 'quickPick',
            navigationTarget: [relationship.entity1LogicalName, relationship.entity2LogicalName],
            isLinkable: true,
            metadata: relationship
        };
    }
}
