/**
 * Isolation mode for plugin assembly.
 * Determines execution context (sandbox isolation vs none).
 *
 * Values:
 * - None (1): No isolation, full trust
 * - Sandbox (2): Isolated execution environment (recommended)
 */
export class IsolationMode {
	public static readonly None = new IsolationMode(1, 'None');
	public static readonly Sandbox = new IsolationMode(2, 'Sandbox');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates IsolationMode from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): IsolationMode {
		switch (value) {
			case 1:
				return IsolationMode.None;
			case 2:
				return IsolationMode.Sandbox;
			default:
				throw new Error(`Invalid IsolationMode value: ${value}`);
		}
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: IsolationMode): boolean {
		return this.value === other.value;
	}
}
