/**
 * Contract type for Service Endpoint.
 * Determines messaging pattern and protocol.
 *
 * Values from PRT (ServiceEndpointContract enum):
 * - OneWay (1): One-way messaging (legacy Service Bus)
 * - (2 not used)
 * - Rest (3): REST endpoint
 * - TwoWay (4): Request/response pattern (legacy Service Bus)
 * - Topic (5): Azure Service Bus Topic (pub/sub)
 * - Queue (6): Azure Service Bus Queue (one consumer)
 * - EventHub (7): Azure Event Hub
 * - WebHook (8): WebHook (handled by separate WebHook entity)
 */
export class ServiceEndpointContract {
	public static readonly OneWay = new ServiceEndpointContract(1, 'OneWay');
	// 2 = not used
	public static readonly Rest = new ServiceEndpointContract(3, 'Rest');
	public static readonly TwoWay = new ServiceEndpointContract(4, 'TwoWay');
	public static readonly Topic = new ServiceEndpointContract(5, 'Topic');
	public static readonly Queue = new ServiceEndpointContract(6, 'Queue');
	public static readonly EventHub = new ServiceEndpointContract(7, 'EventHub');
	// WebHook (8) handled by separate WebHook entity

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates ServiceEndpointContract from Dataverse numeric value.
	 * @throws Error if value is not recognized (including 2 and 8)
	 */
	public static fromValue(value: number): ServiceEndpointContract {
		switch (value) {
			case 1:
				return ServiceEndpointContract.OneWay;
			case 3:
				return ServiceEndpointContract.Rest;
			case 4:
				return ServiceEndpointContract.TwoWay;
			case 5:
				return ServiceEndpointContract.Topic;
			case 6:
				return ServiceEndpointContract.Queue;
			case 7:
				return ServiceEndpointContract.EventHub;
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
			ServiceEndpointContract.Rest,
			ServiceEndpointContract.TwoWay,
			ServiceEndpointContract.Topic,
			ServiceEndpointContract.Queue,
			ServiceEndpointContract.EventHub,
		];
	}

	/**
	 * Returns contract types commonly used (Queue, Topic, EventHub).
	 * Excludes legacy types (OneWay, TwoWay, Rest).
	 */
	public static common(): readonly ServiceEndpointContract[] {
		return [
			ServiceEndpointContract.Queue,
			ServiceEndpointContract.Topic,
			ServiceEndpointContract.EventHub,
		];
	}

	/**
	 * Returns true if this contract requires solution namespace.
	 * EventHub uses full namespace address instead.
	 */
	public requiresNamespace(): boolean {
		return this.value !== 7; // All except EventHub
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
