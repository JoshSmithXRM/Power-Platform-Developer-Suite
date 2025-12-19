/**
 * Authentication type for WebHook endpoints (serviceendpoint with contract=8).
 * Determines how the WebHook authenticates with the target URL.
 *
 * Values from PRT (ServiceEndpointAuthType enum):
 * - 1 = ACS (legacy Service Bus - deprecated)
 * - 2 = SASKey (Service Bus only)
 * - 3 = SASToken (Service Bus only)
 * - 4 = WebhookKey (WebHook)
 * - 5 = HttpHeader (WebHook)
 * - 6 = HttpQueryString (WebHook)
 *
 * Valid for WebHooks: WebhookKey (4), HttpHeader (5), HttpQueryString (6)
 * Service Bus types (1-3) are handled for loading but should not be used for webhooks.
 */
export class WebHookAuthType {
	// Service Bus auth types (for loading existing records, not for webhook registration)
	public static readonly ACS = new WebHookAuthType(1, 'ACS', true);
	public static readonly SASKey = new WebHookAuthType(2, 'SASKey', true);
	public static readonly SASToken = new WebHookAuthType(3, 'SASToken', true);

	// WebHook auth types (valid for webhook registration)
	public static readonly WebhookKey = new WebHookAuthType(4, 'WebhookKey', false);
	public static readonly HttpHeader = new WebHookAuthType(5, 'HttpHeader', false);
	public static readonly HttpQueryString = new WebHookAuthType(6, 'HttpQueryString', false);

	private constructor(
		private readonly value: number,
		private readonly name: string,
		private readonly isServiceBusType: boolean
	) {}

	/**
	 * Creates WebHookAuthType from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): WebHookAuthType {
		switch (value) {
			case 1:
				return WebHookAuthType.ACS;
			case 2:
				return WebHookAuthType.SASKey;
			case 3:
				return WebHookAuthType.SASToken;
			case 4:
				return WebHookAuthType.WebhookKey;
			case 5:
				return WebHookAuthType.HttpHeader;
			case 6:
				return WebHookAuthType.HttpQueryString;
			default:
				throw new Error(`Invalid WebHookAuthType value: ${value}`);
		}
	}

	/**
	 * Returns all valid authentication types for WebHook registration.
	 * Excludes Service Bus types (ACS, SASKey, SASToken).
	 */
	public static allForWebHook(): readonly WebHookAuthType[] {
		return [
			WebHookAuthType.WebhookKey,
			WebHookAuthType.HttpHeader,
			WebHookAuthType.HttpQueryString,
		];
	}

	/**
	 * Returns all authentication types (including Service Bus types).
	 * Use allForWebHook() when populating dropdown options.
	 */
	public static all(): readonly WebHookAuthType[] {
		return [
			WebHookAuthType.ACS,
			WebHookAuthType.SASKey,
			WebHookAuthType.SASToken,
			WebHookAuthType.WebhookKey,
			WebHookAuthType.HttpHeader,
			WebHookAuthType.HttpQueryString,
		];
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	/**
	 * Returns true if this is a Service Bus authentication type.
	 * Service Bus types should not be used for WebHook registration.
	 */
	public isForServiceBus(): boolean {
		return this.isServiceBusType;
	}

	/**
	 * Returns true if this authentication type requires an auth value.
	 * All WebHook types require an auth value.
	 */
	public requiresAuthValue(): boolean {
		return !this.isServiceBusType;
	}

	/**
	 * Returns all valid authentication types for Service Bus endpoints.
	 * Excludes WebHook types (WebhookKey, HttpHeader, HttpQueryString).
	 */
	public static allForServiceBus(): readonly WebHookAuthType[] {
		return [
			WebHookAuthType.ACS,
			WebHookAuthType.SASKey,
			WebHookAuthType.SASToken,
		];
	}

	/**
	 * Returns true if this auth type requires SAS key name + key.
	 * Only SASKey (2) requires these fields.
	 */
	public requiresSasKey(): boolean {
		return this.value === 2;
	}

	/**
	 * Returns true if this auth type requires SAS token.
	 * Only SASToken (3) requires this field.
	 */
	public requiresSasToken(): boolean {
		return this.value === 3;
	}

	public equals(other: WebHookAuthType): boolean {
		return this.value === other.value;
	}
}
