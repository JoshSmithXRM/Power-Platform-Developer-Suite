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
			tenantId: environment.getTenantId().getValue() || '', // Empty string if not provided (UI will handle)
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
		// Base fields (tenant ID optional for Interactive/DeviceCode/UsernamePassword)
		const baseFields = ['name', 'dataverseUrl', 'publicClientId', 'authenticationMethod'];

		if (authMethod === 'ServicePrincipal') {
			// ServicePrincipal requires tenant ID (MSAL limitation)
			return [...baseFields, 'tenantId', 'clientId', 'clientSecret'];
		} else if (authMethod === 'UsernamePassword') {
			return [...baseFields, 'username', 'password'];
		}

		// Interactive and DeviceCode - tenant ID is optional
		return baseFields;
	}
}
