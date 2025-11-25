/**
 * ViewModel for editing environment in form
 * Credentials shown as placeholders when editing existing
 * Readonly ensures immutability - ViewModels are snapshots, not mutable state
 */
export interface EnvironmentFormViewModel {
	readonly id: string;
	readonly name: string;
	readonly dataverseUrl: string;
	readonly tenantId: string;
	readonly authenticationMethod: string;
	readonly publicClientId: string;
	readonly powerPlatformEnvironmentId?: string;

	// Service Principal fields
	readonly clientId?: string;
	readonly clientSecretPlaceholder?: string;
	readonly hasStoredClientSecret: boolean;

	// Username/Password fields
	readonly username?: string;
	readonly passwordPlaceholder?: string;
	readonly hasStoredPassword: boolean;

	// UI state
	readonly isExisting: boolean;
	readonly requiredFields: readonly string[];
}
