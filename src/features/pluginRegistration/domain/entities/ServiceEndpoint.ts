import { ServiceEndpointContract } from '../valueObjects/ServiceEndpointContract';
import { ServiceEndpointConnectionMode } from '../valueObjects/ServiceEndpointConnectionMode';
import { WebHookAuthType } from '../valueObjects/WebHookAuthType';
import { MessageFormat } from '../valueObjects/MessageFormat';
import { UserClaimType } from '../valueObjects/UserClaimType';

/**
 * Service Endpoint entity representing Azure Service Bus integration.
 *
 * Stored in Dataverse as `serviceendpoint` with contract != 8 (not WebHook).
 * Service Bus endpoints send Dataverse events to Azure messaging infrastructure.
 *
 * Business Rules:
 * - Contract determines required fields (Queue/Topic needs namespace, EventHub needs full URL)
 * - Auth type determines which credential fields are required
 * - Managed endpoints cannot be deleted
 * - All endpoints can be updated regardless of managed state
 */
export class ServiceEndpoint {
	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly description: string | null,
		private readonly solutionNamespace: string,
		private readonly namespaceAddress: string,
		private readonly path: string | null,
		private readonly contract: ServiceEndpointContract,
		private readonly connectionMode: ServiceEndpointConnectionMode,
		private readonly authType: WebHookAuthType,
		private readonly sasKeyName: string | null,
		private readonly messageFormat: MessageFormat,
		private readonly userClaim: UserClaimType,
		private readonly createdOn: Date,
		private readonly modifiedOn: Date,
		private readonly isManaged: boolean
	) {
		this.validateInvariants();
	}

	// ============================================================
	// Business Rules / Validation
	// ============================================================

	/**
	 * Validates business rules on construction.
	 * Throws if invariants violated.
	 */
	private validateInvariants(): void {
		// Contract-specific validation: Non-EventHub contracts require namespace
		if (this.contract.requiresNamespace() && !this.solutionNamespace) {
			throw new Error('Solution namespace required for Queue/Topic/OneWay/TwoWay/Rest contracts');
		}

		// Auth type validation: SASKey requires key name
		if (this.authType.requiresSasKey() && !this.sasKeyName) {
			throw new Error('SAS Key Name required for SASKey auth type');
		}
	}

	/**
	 * Service endpoints can always be updated regardless of managed state.
	 */
	public canUpdate(): boolean {
		return true;
	}

	/**
	 * Service endpoints can only be deleted if they are not managed.
	 */
	public canDelete(): boolean {
		return !this.isManaged;
	}

	/**
	 * Checks if this endpoint uses EventHub contract.
	 */
	public isEventHub(): boolean {
		return this.contract.equals(ServiceEndpointContract.EventHub);
	}

	/**
	 * Checks if this endpoint uses Queue or Topic contract.
	 * These are the modern, commonly used Service Bus contracts.
	 */
	public isQueueOrTopic(): boolean {
		return (
			this.contract.equals(ServiceEndpointContract.Queue) ||
			this.contract.equals(ServiceEndpointContract.QueuePersistent) ||
			this.contract.equals(ServiceEndpointContract.Topic)
		);
	}

	/**
	 * Checks if this endpoint uses legacy Service Bus contract (OneWay/TwoWay).
	 */
	public isLegacyServiceBus(): boolean {
		return (
			this.contract.equals(ServiceEndpointContract.OneWay) ||
			this.contract.equals(ServiceEndpointContract.TwoWay)
		);
	}

	// ============================================================
	// Getters (NO business logic in getters)
	// ============================================================

	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getDescription(): string | null {
		return this.description;
	}

	public getSolutionNamespace(): string {
		return this.solutionNamespace;
	}

	public getNamespaceAddress(): string {
		return this.namespaceAddress;
	}

	public getPath(): string | null {
		return this.path;
	}

	public getContract(): ServiceEndpointContract {
		return this.contract;
	}

	public getConnectionMode(): ServiceEndpointConnectionMode {
		return this.connectionMode;
	}

	public getAuthType(): WebHookAuthType {
		return this.authType;
	}

	public getSasKeyName(): string | null {
		return this.sasKeyName;
	}

	public getMessageFormat(): MessageFormat {
		return this.messageFormat;
	}

	public getUserClaim(): UserClaimType {
		return this.userClaim;
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
