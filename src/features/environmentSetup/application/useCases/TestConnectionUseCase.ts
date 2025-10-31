import { IWhoAmIService } from '../../domain/interfaces/IWhoAmIService';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { ApplicationError } from '../errors/ApplicationError';

/**
 * Command Use Case: Test connection to Dataverse
 * Works with draft (unsaved) environment data
 */
export class TestConnectionUseCase {
	constructor(
		private readonly whoAmIService: IWhoAmIService | null
	) {}

	public async execute(request: TestConnectionRequest): Promise<TestConnectionResponse> {
		// Create temporary domain entity from draft data (NOT saved)
		const tempEnvironment = new Environment(
			EnvironmentId.generate(),
			new EnvironmentName(request.name),
			new DataverseUrl(request.dataverseUrl),
			new TenantId(request.tenantId),
			new AuthenticationMethod(request.authenticationMethod as AuthenticationMethodType),
			new ClientId(request.publicClientId),
			false,
			undefined,
			request.powerPlatformEnvironmentId,
			request.clientId ? new ClientId(request.clientId) : undefined,
			request.username
		);

		// Domain validation
		if (!tempEnvironment.canTestConnection()) {
			const validationResult = tempEnvironment.validateConfiguration();
			throw new ApplicationError(`Cannot test connection: ${validationResult.errors.join(', ')}`);
		}

		// Test connection using WhoAmI API
		if (!this.whoAmIService) {
			return {
				success: false,
				errorMessage: 'WhoAmI service not yet implemented'
			};
		}

		try {
			const whoAmIResponse = await this.whoAmIService.testConnection(
				tempEnvironment,
				request.clientSecret,
				request.password
			);

			return {
				success: true,
				userId: whoAmIResponse.userId,
				businessUnitId: whoAmIResponse.businessUnitId,
				organizationId: whoAmIResponse.organizationId
			};
		} catch (error) {
			return {
				success: false,
				errorMessage: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
}

export interface TestConnectionRequest {
	name: string;
	dataverseUrl: string;
	tenantId: string;
	authenticationMethod: string;
	publicClientId: string;
	powerPlatformEnvironmentId?: string;
	clientId?: string;
	clientSecret?: string;
	username?: string;
	password?: string;
}

export interface TestConnectionResponse {
	success: boolean;
	userId?: string;
	businessUnitId?: string;
	organizationId?: string;
	errorMessage?: string;
}
