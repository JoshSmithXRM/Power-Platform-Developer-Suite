/**
 * Message format for Service Bus events.
 *
 * Values from PRT (MessageFormat enum):
 * - DotNet (1): .NET binary serialization
 * - Json (2): JSON format (recommended)
 * - Xml (3): XML format
 */
export class MessageFormat {
	public static readonly DotNet = new MessageFormat(1, '.NET Binary');
	public static readonly Json = new MessageFormat(2, 'JSON');
	public static readonly Xml = new MessageFormat(3, 'XML');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates MessageFormat from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): MessageFormat {
		switch (value) {
			case 1:
				return MessageFormat.DotNet;
			case 2:
				return MessageFormat.Json;
			case 3:
				return MessageFormat.Xml;
			default:
				throw new Error(`Invalid MessageFormat value: ${value}`);
		}
	}

	/**
	 * Returns all valid message formats.
	 */
	public static all(): readonly MessageFormat[] {
		return [MessageFormat.DotNet, MessageFormat.Json, MessageFormat.Xml];
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: MessageFormat): boolean {
		return this.value === other.value;
	}
}
