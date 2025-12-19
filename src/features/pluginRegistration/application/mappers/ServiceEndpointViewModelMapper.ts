import type { ServiceEndpoint } from '../../domain/entities/ServiceEndpoint';
import type { ServiceEndpointViewModel } from '../viewModels/ServiceEndpointViewModel';

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
}
