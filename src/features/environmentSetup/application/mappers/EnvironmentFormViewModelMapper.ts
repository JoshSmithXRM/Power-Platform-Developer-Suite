import { Environment } from '../../domain/entities/Environment';
import { EnvironmentFormViewModel } from '../viewModels/EnvironmentFormViewModel';

/**
 * Maps Environment entity to form ViewModel
 */
export class EnvironmentFormViewModelMapper {
	public toFormViewModel(
		environment: Environment,
		hasStoredClientSecret = false,
		hasStoredPassword = false
	): EnvironmentFormViewModel {
		const authMethod = environment.getAuthenticationMethod();
		const powerPlatformEnvironmentId = environment.getPowerPlatformEnvironmentId();
		const clientId = environment.getClientId()?.getValue();
		const username = environment.getUsername();

		const result: EnvironmentFormViewModel = {
			id: environment.getId().getValue(),
			name: environment.getName().getValue(),
			dataverseUrl: environment.getDataverseUrl().getValue(),
			tenantId: environment.getTenantId().getValue() || '',
			authenticationMethod: authMethod.toString(),
			publicClientId: environment.getPublicClientId().getValue(),
			hasStoredClientSecret,
			hasStoredPassword,
			isExisting: true,
			requiredFields: this.getRequiredFields(authMethod.toString()),
			...(powerPlatformEnvironmentId !== undefined && { powerPlatformEnvironmentId }),
			...(clientId !== undefined && { clientId }),
			...(hasStoredClientSecret && { clientSecretPlaceholder: '••••••••• (stored)' }),
			...(username !== undefined && { username }),
			...(hasStoredPassword && { passwordPlaceholder: '••••••••• (stored)' })
		};

		return result;
	}

	private getRequiredFields(authMethod: string): string[] {
		const baseFields = ['name', 'dataverseUrl', 'publicClientId', 'authenticationMethod'];

		if (authMethod === 'ServicePrincipal') {
			return [...baseFields, 'tenantId', 'clientId', 'clientSecret'];
		} else if (authMethod === 'UsernamePassword') {
			return [...baseFields, 'username', 'password'];
		}

		return baseFields;
	}
}
