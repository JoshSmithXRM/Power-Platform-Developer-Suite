/**
 * Contract type for Service Endpoint.
 * Determines messaging pattern and protocol.
 *
 * Values from Dataverse serviceendpoint_contract OptionSet:
 * @see https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/serviceendpoint
 *
 * - OneWay (1): One-way messaging (legacy Service Bus)
 * - Queue (2): Azure Service Bus Queue
 * - Rest (3): REST endpoint
 * - TwoWay (4): Request/response pattern (legacy Service Bus)
 * - Topic (5): Azure Service Bus Topic (pub/sub)
 * - QueuePersistent (6): Azure Service Bus Queue (Persistent)
 * - EventHub (7): Azure Event Hub
 * - WebHook (8): WebHook (handled by separate WebHook entity)
 * - EventGrid (9): Azure Event Grid
 * - ManagedDataLake (10): Managed Data Lake
 * - ContainerStorage (11): Azure Container Storage
 */
export class ServiceEndpointContract {
	public static readonly OneWay = new ServiceEndpointContract(1, 'OneWay');
	public static readonly Queue = new ServiceEndpointContract(2, 'Queue');
	public static readonly Rest = new ServiceEndpointContract(3, 'Rest');
	public static readonly TwoWay = new ServiceEndpointContract(4, 'TwoWay');
	public static readonly Topic = new ServiceEndpointContract(5, 'Topic');
	public static readonly QueuePersistent = new ServiceEndpointContract(6, 'Queue (Persistent)');
	public static readonly EventHub = new ServiceEndpointContract(7, 'EventHub');
	// WebHook (8) handled by separate WebHook entity
	public static readonly EventGrid = new ServiceEndpointContract(9, 'Event Grid');
	public static readonly ManagedDataLake = new ServiceEndpointContract(10, 'Managed Data Lake');
	public static readonly ContainerStorage = new ServiceEndpointContract(11, 'Container Storage');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates ServiceEndpointContract from Dataverse numeric value.
	 * @throws Error if value is not recognized (including 8 which is WebHook)
	 */
	public static fromValue(value: number): ServiceEndpointContract {
		switch (value) {
			case 1:
				return ServiceEndpointContract.OneWay;
			case 2:
				return ServiceEndpointContract.Queue;
			case 3:
				return ServiceEndpointContract.Rest;
			case 4:
				return ServiceEndpointContract.TwoWay;
			case 5:
				return ServiceEndpointContract.Topic;
			case 6:
				return ServiceEndpointContract.QueuePersistent;
			case 7:
				return ServiceEndpointContract.EventHub;
			case 9:
				return ServiceEndpointContract.EventGrid;
			case 10:
				return ServiceEndpointContract.ManagedDataLake;
			case 11:
				return ServiceEndpointContract.ContainerStorage;
			default:
				throw new Error(`Invalid ServiceEndpointContract value: ${value}`);
		}
	}

	/**
	 * Returns all valid contract types (excludes WebHook).
	 */
	public static all(): readonly ServiceEndpointContract[] {
		return [
			ServiceEndpointContract.OneWay,
			ServiceEndpointContract.Queue,
			ServiceEndpointContract.Rest,
			ServiceEndpointContract.TwoWay,
			ServiceEndpointContract.Topic,
			ServiceEndpointContract.QueuePersistent,
			ServiceEndpointContract.EventHub,
			ServiceEndpointContract.EventGrid,
			ServiceEndpointContract.ManagedDataLake,
			ServiceEndpointContract.ContainerStorage,
		];
	}

	/**
	 * Returns contract types commonly used for registration.
	 * Excludes legacy types (OneWay, TwoWay, Rest) and system-managed types.
	 */
	public static common(): readonly ServiceEndpointContract[] {
		return [
			ServiceEndpointContract.Queue,
			ServiceEndpointContract.Topic,
			ServiceEndpointContract.EventHub,
			ServiceEndpointContract.EventGrid,
		];
	}

	/**
	 * Returns true if this contract requires solution namespace.
	 * EventHub and newer types use full namespace address instead.
	 */
	public requiresNamespace(): boolean {
		// Queue, Topic, and legacy types need namespace
		// EventHub, EventGrid, ManagedDataLake, ContainerStorage use full address
		return this.value <= 6 && this.value !== 3; // Excludes Rest which uses URL
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: ServiceEndpointContract): boolean {
		return this.value === other.value;
	}
}
