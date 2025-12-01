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
	/** Sort order for display in UI. Lower numbers appear first. */
	sortOrder?: number;
	/** Whether this is the default environment opened on tool clicks. */
	isDefault?: boolean;
}

export interface PowerPlatformSettingsDto {
	tenantId: string;
	dataverseUrl: string;
	authenticationMethod: 'ServicePrincipal' | 'Interactive' | 'UsernamePassword' | 'DeviceCode';
	clientId?: string;
	username?: string;
	publicClientId: string;
}
