/**
 * ViewModel for editing environment in form
 * Credentials shown as placeholders when editing existing
 */
export interface EnvironmentFormViewModel {
	id: string;
	name: string;
	dataverseUrl: string;
	tenantId: string;
	authenticationMethod: string;
	publicClientId: string;
	powerPlatformEnvironmentId?: string;

	// Service Principal fields
	clientId?: string;
	clientSecretPlaceholder?: string;
	hasStoredClientSecret: boolean;

	// Username/Password fields
	username?: string;
	passwordPlaceholder?: string;
	hasStoredPassword: boolean;

	// UI state
	isExisting: boolean;
	requiredFields: string[];
}
