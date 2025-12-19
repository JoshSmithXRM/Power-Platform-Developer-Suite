/**
 * Connection mode for Service Endpoint.
 *
 * Values from PRT (ServiceEndpointConnectionMode enum):
 * - Normal (1): Standard connection
 * - Federated (2): Federated connection (cross-organization)
 */
export class ServiceEndpointConnectionMode {
	public static readonly Normal = new ServiceEndpointConnectionMode(1, 'Normal');
	public static readonly Federated = new ServiceEndpointConnectionMode(2, 'Federated');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates ServiceEndpointConnectionMode from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): ServiceEndpointConnectionMode {
		switch (value) {
			case 1:
				return ServiceEndpointConnectionMode.Normal;
			case 2:
				return ServiceEndpointConnectionMode.Federated;
			default:
				throw new Error(`Invalid ServiceEndpointConnectionMode value: ${value}`);
		}
	}

	/**
	 * Returns all valid connection modes.
	 */
	public static all(): readonly ServiceEndpointConnectionMode[] {
		return [ServiceEndpointConnectionMode.Normal, ServiceEndpointConnectionMode.Federated];
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: ServiceEndpointConnectionMode): boolean {
		return this.value === other.value;
	}
}
