import type { ServiceEndpoint } from '../../domain/entities/ServiceEndpoint';
import type { ServiceEndpointViewModel } from '../viewModels/ServiceEndpointViewModel';
import type { ServiceEndpointMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps ServiceEndpoint domain entities to ViewModels.
 *
 * Follows the mapper pattern: transforms domain entities to presentation-ready data structures.
 * No business logic - just data transformation.
 */
export class ServiceEndpointViewModelMapper {
	/**
	 * Maps a domain ServiceEndpoint to ViewModel for UI display.
	 */
	public static toViewModel(endpoint: ServiceEndpoint): ServiceEndpointViewModel {
		return {
			id: endpoint.getId(),
			name: endpoint.getName(),
			description: endpoint.getDescription(),
			contract: endpoint.getContract().getName(),
			contractValue: endpoint.getContract().getValue(),
			authType: endpoint.getAuthType().getName(),
			authTypeValue: endpoint.getAuthType().getValue(),
			messageFormat: endpoint.getMessageFormat().getName(),
			messageFormatValue: endpoint.getMessageFormat().getValue(),
			userClaim: endpoint.getUserClaim().getName(),
			userClaimValue: endpoint.getUserClaim().getValue(),
			namespace: endpoint.isEventHub()
				? endpoint.getNamespaceAddress()
				: endpoint.getSolutionNamespace(),
			namespaceAddress: endpoint.getNamespaceAddress(),
			path: endpoint.getPath(),
			connectionMode: endpoint.getConnectionMode().getName(),
			connectionModeValue: endpoint.getConnectionMode().getValue(),
			sasKeyName: endpoint.getSasKeyName(),
			createdOn: endpoint.getCreatedOn().toISOString(),
			modifiedOn: endpoint.getModifiedOn().toISOString(),
			isManaged: endpoint.isInManagedState(),
			canUpdate: endpoint.canUpdate(),
			canDelete: endpoint.canDelete(),
		};
	}

	/**
	 * Maps multiple domain ServiceEndpoints to ViewModels.
	 */
	public static toViewModels(
		endpoints: readonly ServiceEndpoint[]
	): readonly ServiceEndpointViewModel[] {
		return endpoints.map((endpoint) => ServiceEndpointViewModelMapper.toViewModel(endpoint));
	}

	/**
	 * Maps a ServiceEndpoint entity to a tree item.
	 *
	 * @param endpoint - The ServiceEndpoint domain entity
	 * @param steps - Child step tree items (steps registered to this endpoint)
	 * @returns TreeItemViewModel for the service endpoint
	 */
	public toTreeItem(endpoint: ServiceEndpoint, steps: TreeItemViewModel[] = []): TreeItemViewModel {
		const metadata: ServiceEndpointMetadata = {
			type: 'serviceEndpoint',
			contract: endpoint.getContract().getName(),
			contractValue: endpoint.getContract().getValue(),
			authType: endpoint.getAuthType().getName(),
			messageFormat: endpoint.getMessageFormat().getName(),
			userClaim: endpoint.getUserClaim().getName(),
			namespace: endpoint.isEventHub()
				? endpoint.getNamespaceAddress()
				: endpoint.getSolutionNamespace(),
			path: endpoint.getPath(),
			description: endpoint.getDescription(),
			createdOn: endpoint.getCreatedOn().toISOString(),
			modifiedOn: endpoint.getModifiedOn().toISOString(),
			canUpdate: endpoint.canUpdate(),
			canDelete: endpoint.canDelete(),
		};

		return {
			id: endpoint.getId(),
			parentId: null,
			type: 'serviceEndpoint',
			name: endpoint.getName(),
			displayName: `(ServiceEndpoint) ${endpoint.getName()}`,
			icon: '🌐',
			metadata,
			isManaged: endpoint.isInManagedState(),
			children: steps,
		};
	}
}
