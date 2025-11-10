import type { OneToManyRelationship } from '../../domain/entities/OneToManyRelationship';
import type { ManyToManyRelationship } from '../../domain/entities/ManyToManyRelationship';

/**
 * ViewModel for displaying relationship in table.
 * Simple DTO for presentation layer.
 */
export interface RelationshipRowViewModel {
    /** Unique identifier (same as name) */
    readonly id: string;

    /** Relationship schema name (hyperlink to detail) */
    readonly name: string;

    /** Relationship type (1:N, N:1, or N:N) */
    readonly type: '1:N' | 'N:1' | 'N:N';

    /** Related entity display (hyperlink for 1:N/N:1, both entities for N:N) */
    readonly relatedEntity: string;

    /** Referencing attribute or intersect entity */
    readonly referencingAttribute: string;

    /** Navigation type ("entity" for 1:N/N:1, "quickPick" for N:N) */
    readonly navigationType: 'entity' | 'quickPick';

    /** For navigation: entity logical name(s) */
    readonly navigationTarget: string | string[];

    /** Whether name should be hyperlink */
    readonly isLinkable: boolean;

    /** Raw metadata for detail panel */
    readonly metadata: OneToManyRelationship | ManyToManyRelationship;
}
