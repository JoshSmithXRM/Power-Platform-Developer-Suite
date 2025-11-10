import type { SecurityPrivilege } from '../../domain/entities/SecurityPrivilege';

/**
 * ViewModel for displaying security privilege in table.
 * Simple DTO for presentation layer.
 */
export interface PrivilegeRowViewModel {
    /** Unique identifier (same as privilegeId) */
    readonly id: string;

    /** Privilege name (hyperlink) */
    readonly name: string;

    /** Privilege type (Create, Read, Write, Delete, etc.) */
    readonly privilegeType: string;

    /** Available depth levels (e.g., "Basic, Local, Global") */
    readonly depths: string;

    /** Whether name should be hyperlink */
    readonly isLinkable: boolean;

    /** Raw metadata for detail panel */
    readonly metadata: SecurityPrivilege;
}
