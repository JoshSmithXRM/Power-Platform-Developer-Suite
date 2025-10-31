/**
 * AuthenticationMethod value object
 * Business rules encoded for each auth method
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
	 * Business rule: ServicePrincipal and UsernamePassword require credentials
	 */
	public requiresCredentials(): boolean {
		return this.requiresClientCredentials() || this.requiresUsernamePassword();
	}

	/**
	 * Business rule: ServicePrincipal requires client credentials
	 */
	public requiresClientCredentials(): boolean {
		return this.type === AuthenticationMethodType.ServicePrincipal;
	}

	/**
	 * Business rule: UsernamePassword requires username/password
	 */
	public requiresUsernamePassword(): boolean {
		return this.type === AuthenticationMethodType.UsernamePassword;
	}

	/**
	 * Business rule: Interactive and DeviceCode don't require stored credentials
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
