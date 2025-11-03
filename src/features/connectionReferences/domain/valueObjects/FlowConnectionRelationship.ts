/**
 * Type of relationship between a flow and connection reference.
 */
export type RelationshipType = 'flow-to-cr' | 'orphaned-flow' | 'orphaned-cr';

/**
 * FlowConnectionRelationship value object representing the relationship
 * between a cloud flow and a connection reference.
 *
 * Immutable value object that combines flow and connection reference data
 * for display in the UI.
 */
export class FlowConnectionRelationship {
	/**
	 * Creates a new FlowConnectionRelationship.
	 * @param flowId - Flow GUID (null for orphaned-cr)
	 * @param flowName - Flow display name (empty for orphaned-cr)
	 * @param connectionReferenceId - Connection reference GUID (null for orphaned-flow)
	 * @param connectionReferenceLogicalName - Connection reference logical name (empty for orphaned-flow)
	 * @param connectionReferenceDisplayName - Connection reference display name (empty for orphaned-flow)
	 * @param relationshipType - Type of relationship
	 * @param flowIsManaged - Whether the flow is managed (null for orphaned-cr)
	 * @param connectionReferenceIsManaged - Whether the connection reference is managed (null for orphaned-flow)
	 * @param flowModifiedOn - Flow last modified date (null for orphaned-cr)
	 * @param connectionReferenceModifiedOn - Connection reference last modified date (null for orphaned-flow)
	 */
	constructor(
		public readonly flowId: string | null,
		public readonly flowName: string,
		public readonly connectionReferenceId: string | null,
		public readonly connectionReferenceLogicalName: string,
		public readonly connectionReferenceDisplayName: string,
		public readonly relationshipType: RelationshipType,
		public readonly flowIsManaged: boolean | null,
		public readonly connectionReferenceIsManaged: boolean | null,
		public readonly flowModifiedOn: Date | null,
		public readonly connectionReferenceModifiedOn: Date | null
	) {}

	/**
	 * Determines if this is a valid flow-to-connection-reference relationship.
	 * @returns True if both flow and connection reference exist, false otherwise
	 */
	isValidRelationship(): boolean {
		return this.relationshipType === 'flow-to-cr';
	}

	/**
	 * Determines if this represents an orphaned flow (flow without connection reference).
	 * @returns True if flow exists but connection reference doesn't, false otherwise
	 */
	isOrphanedFlow(): boolean {
		return this.relationshipType === 'orphaned-flow';
	}

	/**
	 * Determines if this represents an orphaned connection reference (CR without flow).
	 * @returns True if connection reference exists but no flow uses it, false otherwise
	 */
	isOrphanedConnectionReference(): boolean {
		return this.relationshipType === 'orphaned-cr';
	}
}
