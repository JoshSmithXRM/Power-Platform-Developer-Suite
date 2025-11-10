import type { AttributeMetadata } from '../../domain/entities/AttributeMetadata';

/**
 * ViewModel for displaying attribute in table.
 * Simple DTO for presentation layer.
 */
export interface AttributeRowViewModel {
    /** Unique identifier (same as logicalName) */
    readonly id: string;

    /** Display name (hyperlink) */
    readonly displayName: string;

    /** Logical name (plain text) */
    readonly logicalName: string;

    /** Attribute type (String, Integer, Lookup, etc.) */
    readonly type: string;

    /** Required level (None, ApplicationRequired, SystemRequired) */
    readonly required: string;

    /** Max length (number string or "-" if N/A) */
    readonly maxLength: string;

    /** Whether display name should be hyperlink */
    readonly isLinkable: boolean;

    /** Raw metadata for detail panel (passed as-is) */
    readonly metadata: AttributeMetadata;
}
