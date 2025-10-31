import { Environment } from '../../domain/entities/Environment';
import { EnvironmentFormViewModel } from '../viewModels/EnvironmentFormViewModel';

/**
 * Maps Environment entity to form ViewModel
 */
export class EnvironmentFormViewModelMapper {
	public toFormViewModel(
		environment: Environment,
		hasStoredClientSecret: boolean = false,
		hasStoredPassword: boolean = false
	): EnvironmentFormViewModel {
		const authMethod = environment.getAuthenticationMethod();

		return {
			id: environment.getId().getValue(),
			name: environment.getName().getValue(),
			dataverseUrl: environment.getDataverseUrl().getValue(),
			tenantId: environment.getTenantId().getValue(),
			authenticationMethod: authMethod.toString(),
			publicClientId: environment.getPublicClientId().getValue(),
			powerPlatformEnvironmentId: environment.getPowerPlatformEnvironmentId(),

			// Service Principal
			clientId: environment.getClientId()?.getValue(),
			clientSecretPlaceholder: hasStoredClientSecret ? '••••••••• (stored)' : undefined,
			hasStoredClientSecret,

			// Username/Password
			username: environment.getUsername(),
			passwordPlaceholder: hasStoredPassword ? '••••••••• (stored)' : undefined,
			hasStoredPassword,

			// UI state
			isExisting: true,
			requiredFields: this.getRequiredFields(authMethod.toString())
		};
	}

	private getRequiredFields(authMethod: string): string[] {
		const baseFields = ['name', 'dataverseUrl', 'tenantId', 'publicClientId', 'authenticationMethod'];

		if (authMethod === 'ServicePrincipal') {
			return [...baseFields, 'clientId', 'clientSecret'];
		} else if (authMethod === 'UsernamePassword') {
			return [...baseFields, 'username', 'password'];
		}

		return baseFields;
	}
}
