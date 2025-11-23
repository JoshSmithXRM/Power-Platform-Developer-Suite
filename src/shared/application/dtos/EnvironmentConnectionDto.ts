/**
 * DTO matching VS Code globalState storage format
 * Preserves backwards compatibility with existing data
 */
export interface EnvironmentConnectionDto {
	id: string;
	name: string;
	settings: PowerPlatformSettingsDto;
	isActive: boolean;
	lastUsed?: string;
	environmentId?: string;
}

export interface PowerPlatformSettingsDto {
	tenantId: string;
	dataverseUrl: string;
	authenticationMethod: 'ServicePrincipal' | 'Interactive' | 'UsernamePassword' | 'DeviceCode';
	clientId?: string;
	username?: string;
	publicClientId: string;
}
