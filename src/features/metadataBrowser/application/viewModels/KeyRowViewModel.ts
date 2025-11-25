import type { EntityKey } from '../../domain/entities/EntityKey';

/**
 * ViewModel for displaying entity key in table.
 * Simple DTO for presentation layer.
 */
export interface KeyRowViewModel {
    /** Unique identifier (same as name) */
    readonly id: string;

    /** Key name (hyperlink) */
    readonly name: string;

    /** Key type (Primary or Alternate) */
    readonly type: string;

    /** Comma-separated list of key attributes */
    readonly keyAttributes: string;

    /** Whether name should be hyperlink */
    readonly isLinkable: boolean;

    /** Raw metadata for detail panel */
    readonly metadata: EntityKey;
}
