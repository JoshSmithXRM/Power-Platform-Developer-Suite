import type { FlowConnectionRelationship } from '../valueObjects/FlowConnectionRelationship';

/**
 * Domain service for managing collections of FlowConnectionRelationship value objects.
 */
export class FlowConnectionRelationshipCollectionService {
	/**
	 * Sorts relationships by flow name, then connection reference logical name (defensive copy).
	 * @param relationships - Array of FlowConnectionRelationship to sort
	 * @returns New sorted array
	 */
	sort(relationships: FlowConnectionRelationship[]): FlowConnectionRelationship[] {
		return [...relationships].sort((a, b) => {
			// Sort by flow name first
			const flowCompare = a.flowName.localeCompare(b.flowName);
			if (flowCompare !== 0) {
				return flowCompare;
			}
			// Then by connection reference logical name
			return a.connectionReferenceLogicalName.localeCompare(b.connectionReferenceLogicalName);
		});
	}
}
