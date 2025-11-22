import { IEnvironmentRepository } from '../../features/environmentSetup/domain/interfaces/IEnvironmentRepository';
import { MsalAuthenticationService } from '../../features/environmentSetup/infrastructure/services/MsalAuthenticationService';
import { Environment } from '../../features/environmentSetup/domain/entities/Environment';

/**
 * Factory functions shared across multiple features.
 * Provides common data access patterns for environment selection and API service configuration.
 */
export class SharedFactories {
	public readonly getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>;
	public readonly getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>;
	public readonly dataverseApiServiceFactory: {
		getAccessToken: (envId: string) => Promise<string>;
		getDataverseUrl: (envId: string) => Promise<string>;
	};

	constructor(
		private readonly environmentRepository: IEnvironmentRepository,
		private readonly authService: MsalAuthenticationService
	) {
		this.getEnvironments = this.createGetEnvironments();
		this.getEnvironmentById = this.createGetEnvironmentById();
		this.dataverseApiServiceFactory = this.createDataverseApiServiceFactory();
	}

	/**
	 * Creates a factory function for getting all environments.
	 * Returns simplified environment data for quick picks and panels.
	 */
	private createGetEnvironments(): () => Promise<Array<{ id: string; name: string; url: string }>> {
		return async () => {
			const environments = await this.environmentRepository.getAll();
			return environments.map(env => ({
				id: env.getId().getValue(),
				name: env.getName().getValue(),
				url: env.getDataverseUrl().getValue()
			}));
		};
	}

	/**
	 * Creates a factory function for getting environment details by ID.
	 * Shared across Solution Explorer and Import Job Viewer panels.
	 */
	private createGetEnvironmentById(): (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null> {
		return async (envId: string) => {
			const environments = await this.environmentRepository.getAll();
			const environment = environments.find(env => env.getId().getValue() === envId);
			if (!environment) {
				return null;
			}
			return {
				id: envId,
				name: environment.getName().getValue(),
				powerPlatformEnvironmentId: environment.getPowerPlatformEnvironmentId()
			};
		};
	}

	/**
	 * Creates factory functions for DataverseApiService to access tokens and URLs.
	 * Encapsulates environment lookup and credential retrieval logic for shared API services.
	 */
	private createDataverseApiServiceFactory(): {
		getAccessToken: (envId: string) => Promise<string>;
		getDataverseUrl: (envId: string) => Promise<string>;
	} {
		const getEnvironmentByIdInternal = async (envId: string): Promise<Environment> => {
			const environments = await this.environmentRepository.getAll();
			const environment = environments.find(env => env.getId().getValue() === envId);
			if (!environment) {
				throw new Error(`Environment not found: ${envId}`);
			}
			return environment;
		};

		return {
			getAccessToken: async (envId: string): Promise<string> => {
				const environment = await getEnvironmentByIdInternal(envId);
				const authMethod = environment.getAuthenticationMethod();
				let clientSecret: string | undefined;
				let password: string | undefined;

				if (authMethod.requiresClientCredentials()) {
					clientSecret = await this.environmentRepository.getClientSecret(environment.getClientId()?.getValue() || '');
				}

				if (authMethod.requiresUsernamePassword()) {
					password = await this.environmentRepository.getPassword(environment.getUsername() || '');
				}

				return this.authService.getAccessTokenForEnvironment(environment, clientSecret, password, undefined, undefined);
			},
			getDataverseUrl: async (envId: string): Promise<string> => {
				const environment = await getEnvironmentByIdInternal(envId);
				return environment.getDataverseUrl().getValue();
			}
		};
	}
}
