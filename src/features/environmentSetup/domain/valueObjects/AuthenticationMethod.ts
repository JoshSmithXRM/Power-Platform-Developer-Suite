/**
 * Value object representing an authentication method for Power Platform environments.
 *
 * Encapsulates business rules for different authentication methods supported by MSAL.
 *
 * Supported Methods:
 * - Interactive: Browser-based authentication (best for development)
 * - DeviceCode: Device code flow (for headless environments)
 * - ServicePrincipal: Client credentials flow (for automation)
 * - UsernamePassword: Resource owner password credentials (legacy/testing)
 *
 * Business Rules:
 * - Interactive/DeviceCode: No stored credentials required
 * - ServicePrincipal: Requires Client ID + Client Secret + Tenant ID
 * - UsernamePassword: Requires Username + Password
 *
 * Different auth methods have different requirements. This value object
 * encapsulates the logic for determining credential requirements.
 */
export enum AuthenticationMethodType {
	Interactive = 'Interactive',
	ServicePrincipal = 'ServicePrincipal',
	UsernamePassword = 'UsernamePassword',
	DeviceCode = 'DeviceCode'
}

export class AuthenticationMethod {
	private readonly type: AuthenticationMethodType;

	constructor(type: AuthenticationMethodType) {
		this.type = type;
	}

	public getType(): AuthenticationMethodType {
		return this.type;
	}

	/**
	 * Determines if this authentication method requires stored credentials.
	 *
	 * @returns {boolean} True if credentials must be stored in VS Code SecretStorage
	 */
	public requiresCredentials(): boolean {
		return this.requiresClientCredentials() || this.requiresUsernamePassword();
	}

	/**
	 * Determines if this method requires client credentials (Service Principal).
	 *
	 * Business Rule: Service Principal authentication uses client credentials flow,
	 * requiring Client ID and Client Secret.
	 *
	 * @returns {boolean} True for Service Principal method
	 */
	public requiresClientCredentials(): boolean {
		return this.type === AuthenticationMethodType.ServicePrincipal;
	}

	/**
	 * Determines if this method requires username and password.
	 *
	 * Business Rule: Username/Password auth uses resource owner password credentials flow.
	 *
	 * @returns {boolean} True for Username/Password method
	 */
	public requiresUsernamePassword(): boolean {
		return this.type === AuthenticationMethodType.UsernamePassword;
	}

	/**
	 * Determines if this is an interactive authentication flow.
	 *
	 * Interactive flows (browser-based, device code) don't require stored
	 * credentials. User authenticates interactively each time.
	 *
	 * @returns {boolean} True for Interactive or DeviceCode methods
	 */
	public isInteractiveFlow(): boolean {
		return this.type === AuthenticationMethodType.Interactive ||
			this.type === AuthenticationMethodType.DeviceCode;
	}

	public equals(other: AuthenticationMethod): boolean {
		return this.type === other.type;
	}

	public toString(): string {
		return this.type;
	}
}
