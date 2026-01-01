import type { CustomApi } from '../../domain/entities/CustomApi';
import type { CustomApiMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps CustomApi domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class CustomApiViewModelMapper {
	/**
	 * Maps a Custom API to a TreeItemViewModel for tree display.
	 *
	 * @param customApi - The Custom API entity
	 * @param requestParameterCount - Number of request parameters
	 * @param responsePropertyCount - Number of response properties
	 */
	public toTreeItem(
		customApi: CustomApi,
		requestParameterCount: number,
		responsePropertyCount: number
	): TreeItemViewModel {
		const metadata: CustomApiMetadata = {
			type: 'customApi',
			uniqueName: customApi.getUniqueName(),
			description: customApi.getDescription(),
			isFunction: customApi.getIsFunction(),
			isPrivate: customApi.getIsPrivate(),
			bindingType: customApi.getBindingType().getName(),
			boundEntityLogicalName: customApi.getBoundEntityLogicalName(),
			allowedProcessing: customApi.getAllowedCustomProcessingStepType().getName(),
			pluginTypeName: customApi.getPluginTypeName(),
			requestParameterCount,
			responsePropertyCount,
			createdOn: customApi.getCreatedOn().toISOString(),
			modifiedOn: customApi.getModifiedOn().toISOString(),
			canUpdate: customApi.canUpdate(),
			canDelete: customApi.canDelete(),
		};

		// Build display name with parameter count badge: [2→1]
		const paramBadge = `[${requestParameterCount}→${responsePropertyCount}]`;
		const displayName = `(Custom API) ${customApi.getDisplayName()} - ${customApi.getUniqueName()} ${paramBadge}`;

		return {
			id: customApi.getId(),
			parentId: null, // Custom APIs are root-level nodes
			type: 'customApi',
			name: customApi.getName(),
			displayName,
			icon: '🎯',
			metadata,
			isManaged: customApi.isInManagedState(),
			children: [], // No children - parameters are managed in modal
		};
	}
}
