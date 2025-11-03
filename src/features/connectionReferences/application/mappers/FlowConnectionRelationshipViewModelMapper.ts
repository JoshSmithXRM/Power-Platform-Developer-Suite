import { FlowConnectionRelationship } from '../../domain/valueObjects/FlowConnectionRelationship';
import { FlowConnectionRelationshipViewModel } from '../viewModels/FlowConnectionRelationshipViewModel';
import { DateFormatter } from '../../../../shared/infrastructure/ui/utils/DateFormatter';

/**
 * Maps FlowConnectionRelationship value objects to FlowConnectionRelationshipViewModel presentation DTOs.
 */
export class FlowConnectionRelationshipViewModelMapper {
	/**
	 * Maps a single FlowConnectionRelationship to a ViewModel.
	 * @param relationship - FlowConnectionRelationship value object to convert
	 * @returns FlowConnectionRelationshipViewModel presentation object
	 */
	static toViewModel(relationship: FlowConnectionRelationship): FlowConnectionRelationshipViewModel {
		return {
			flowId: relationship.flowId ?? '',
			flowName: relationship.flowName,
			connectionReferenceId: relationship.connectionReferenceId ?? '',
			connectionReferenceLogicalName: relationship.connectionReferenceLogicalName,
			connectionReferenceDisplayName: relationship.connectionReferenceDisplayName,
			relationshipType: this.getRelationshipTypeLabel(relationship.relationshipType),
			flowIsManaged: relationship.flowIsManaged !== null
				? relationship.flowIsManaged ? 'Managed' : 'Unmanaged'
				: '',
			connectionReferenceIsManaged: relationship.connectionReferenceIsManaged !== null
				? relationship.connectionReferenceIsManaged ? 'Managed' : 'Unmanaged'
				: '',
			flowModifiedOn: DateFormatter.formatDate(relationship.flowModifiedOn),
			connectionReferenceModifiedOn: DateFormatter.formatDate(relationship.connectionReferenceModifiedOn)
		};
	}

	/**
	 * Maps an array of FlowConnectionRelationship value objects to ViewModels.
	 * @param relationships - Array of FlowConnectionRelationship value objects
	 * @param shouldSort - If true, sorts relationships using domain sorting rules before mapping
	 * @returns Array of view models
	 */
	static toViewModels(
		relationships: FlowConnectionRelationship[],
		shouldSort = false
	): FlowConnectionRelationshipViewModel[] {
		const relationshipsToMap = shouldSort
			? FlowConnectionRelationship.sort(relationships)
			: relationships;
		return relationshipsToMap.map((rel) => this.toViewModel(rel));
	}

	/**
	 * Gets user-friendly label for relationship type.
	 */
	private static getRelationshipTypeLabel(type: string): string {
		switch (type) {
			case 'flow-to-cr':
				return 'Valid';
			case 'orphaned-flow':
				return 'Missing CR';
			case 'orphaned-cr':
				return 'Unused CR';
			default:
				return 'Unknown';
		}
	}
}
