/**
 * Binding type for Custom API.
 * Determines how the API is bound to entities.
 *
 * Values:
 * - Global (0): Not bound to any entity
 * - Entity (1): Bound to a specific entity
 * - EntityCollection (2): Bound to a collection of entities
 */
export class BindingType {
	public static readonly Global = new BindingType(0, 'Global');
	public static readonly Entity = new BindingType(1, 'Entity');
	public static readonly EntityCollection = new BindingType(2, 'EntityCollection');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates BindingType from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): BindingType {
		switch (value) {
			case 0:
				return BindingType.Global;
			case 1:
				return BindingType.Entity;
			case 2:
				return BindingType.EntityCollection;
			default:
				throw new Error(`Invalid BindingType value: ${value}`);
		}
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	/**
	 * Returns true if this binding type requires a bound entity logical name.
	 */
	public requiresBoundEntity(): boolean {
		return this.value === 1 || this.value === 2;
	}

	public equals(other: BindingType): boolean {
		return this.value === other.value;
	}
}
