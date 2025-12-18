import { WebHookAuthType } from '../valueObjects/WebHookAuthType';

/**
 * WebHook entity representing a Dataverse Service Endpoint with WebHook contract.
 *
 * WebHooks allow Dataverse to send HTTP requests to external URLs when events occur.
 * They can be used as event handlers for plugin steps instead of plugin assemblies.
 *
 * Stored in Dataverse as `serviceendpoint` with `contract = 8` (WebHook type).
 */
export class WebHook {
	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly url: string,
		private readonly authType: WebHookAuthType,
		private readonly description: string | null,
		private readonly createdOn: Date,
		private readonly modifiedOn: Date,
		private readonly isManaged: boolean
	) {}

	// ============================================================
	// Business Rules
	// ============================================================

	/**
	 * WebHooks can always be updated regardless of managed state.
	 */
	public canUpdate(): boolean {
		return true;
	}

	/**
	 * WebHooks can only be deleted if they are not managed.
	 */
	public canDelete(): boolean {
		return !this.isManaged;
	}

	/**
	 * Validates that the URL uses HTTPS protocol.
	 * Required for WebHook endpoints in Dataverse.
	 */
	public hasValidUrl(): boolean {
		try {
			const parsed = new URL(this.url);
			return parsed.protocol === 'https:';
		} catch {
			return false;
		}
	}

	// ============================================================
	// Getters
	// ============================================================

	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getUrl(): string {
		return this.url;
	}

	public getAuthType(): WebHookAuthType {
		return this.authType;
	}

	public getDescription(): string | null {
		return this.description;
	}

	public getCreatedOn(): Date {
		return this.createdOn;
	}

	public getModifiedOn(): Date {
		return this.modifiedOn;
	}

	public isInManagedState(): boolean {
		return this.isManaged;
	}
}
