/**
 * Authentication type for WebHook endpoints.
 * Determines how the WebHook authenticates with the target URL.
 *
 * Values:
 * - None (1): No authentication required
 * - HttpHeader (2): Authentication via HTTP header
 * - WebhookKey (3): Authentication via webhook key parameter
 * - HttpQueryString (4): Authentication via query string parameter
 * - AADSASKey (5): Azure AD SAS Key authentication
 */
export class WebHookAuthType {
	public static readonly None = new WebHookAuthType(1, 'None');
	public static readonly HttpHeader = new WebHookAuthType(2, 'HttpHeader');
	public static readonly WebhookKey = new WebHookAuthType(3, 'WebhookKey');
	public static readonly HttpQueryString = new WebHookAuthType(4, 'HttpQueryString');
	public static readonly AADSASKey = new WebHookAuthType(5, 'AADSASKey');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates WebHookAuthType from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): WebHookAuthType {
		switch (value) {
			case 1:
				return WebHookAuthType.None;
			case 2:
				return WebHookAuthType.HttpHeader;
			case 3:
				return WebHookAuthType.WebhookKey;
			case 4:
				return WebHookAuthType.HttpQueryString;
			case 5:
				return WebHookAuthType.AADSASKey;
			default:
				throw new Error(`Invalid WebHookAuthType value: ${value}`);
		}
	}

	/**
	 * Returns all valid authentication types.
	 */
	public static all(): readonly WebHookAuthType[] {
		return [
			WebHookAuthType.None,
			WebHookAuthType.HttpHeader,
			WebHookAuthType.WebhookKey,
			WebHookAuthType.HttpQueryString,
			WebHookAuthType.AADSASKey,
		];
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	/**
	 * Returns true if this authentication type requires an auth value.
	 * All types except None require an auth value.
	 */
	public requiresAuthValue(): boolean {
		return this.value !== 1;
	}

	/**
	 * Returns true if this is the None authentication type.
	 */
	public isNone(): boolean {
		return this.value === 1;
	}

	public equals(other: WebHookAuthType): boolean {
		return this.value === other.value;
	}
}
