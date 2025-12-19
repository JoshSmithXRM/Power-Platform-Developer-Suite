/**
 * Data structure for displaying Service Endpoints in the tree and detail panel.
 *
 * Mapped from domain ServiceEndpoint entity via ServiceEndpointViewModelMapper.
 */
export interface ServiceEndpointViewModel {
	readonly id: string;
	readonly name: string;
	readonly description: string | null;
	readonly contract: string;
	readonly contractValue: number;
	readonly authType: string;
	readonly authTypeValue: number;
	readonly messageFormat: string;
	readonly messageFormatValue: number;
	readonly userClaim: string;
	readonly userClaimValue: number;
	readonly namespace: string;
	readonly namespaceAddress: string;
	readonly path: string | null;
	readonly connectionMode: string;
	readonly connectionModeValue: number;
	readonly sasKeyName: string | null;
	readonly createdOn: string;
	readonly modifiedOn: string;
	readonly isManaged: boolean;
	readonly canUpdate: boolean;
	readonly canDelete: boolean;
}
