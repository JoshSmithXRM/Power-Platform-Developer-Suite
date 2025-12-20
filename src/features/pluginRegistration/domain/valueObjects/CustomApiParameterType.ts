/**
 * Parameter type for Custom API request parameters and response properties.
 * Determines the data type of the parameter.
 *
 * Values:
 * - Boolean (0): True/false value
 * - DateTime (1): Date and time value
 * - Decimal (2): Decimal number
 * - Entity (3): Full entity record
 * - EntityCollection (4): Collection of entity records
 * - EntityReference (5): Reference to an entity (ID + logical name)
 * - Float (6): Floating point number
 * - Integer (7): Integer number
 * - Money (8): Currency value
 * - Picklist (9): Option set value
 * - String (10): Text value
 * - StringArray (11): Array of text values
 * - Guid (12): Unique identifier
 */
export class CustomApiParameterType {
	public static readonly Boolean = new CustomApiParameterType(0, 'Boolean');
	public static readonly DateTime = new CustomApiParameterType(1, 'DateTime');
	public static readonly Decimal = new CustomApiParameterType(2, 'Decimal');
	public static readonly Entity = new CustomApiParameterType(3, 'Entity');
	public static readonly EntityCollection = new CustomApiParameterType(4, 'EntityCollection');
	public static readonly EntityReference = new CustomApiParameterType(5, 'EntityReference');
	public static readonly Float = new CustomApiParameterType(6, 'Float');
	public static readonly Integer = new CustomApiParameterType(7, 'Integer');
	public static readonly Money = new CustomApiParameterType(8, 'Money');
	public static readonly Picklist = new CustomApiParameterType(9, 'Picklist');
	public static readonly String = new CustomApiParameterType(10, 'String');
	public static readonly StringArray = new CustomApiParameterType(11, 'StringArray');
	public static readonly Guid = new CustomApiParameterType(12, 'Guid');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates CustomApiParameterType from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): CustomApiParameterType {
		switch (value) {
			case 0:
				return CustomApiParameterType.Boolean;
			case 1:
				return CustomApiParameterType.DateTime;
			case 2:
				return CustomApiParameterType.Decimal;
			case 3:
				return CustomApiParameterType.Entity;
			case 4:
				return CustomApiParameterType.EntityCollection;
			case 5:
				return CustomApiParameterType.EntityReference;
			case 6:
				return CustomApiParameterType.Float;
			case 7:
				return CustomApiParameterType.Integer;
			case 8:
				return CustomApiParameterType.Money;
			case 9:
				return CustomApiParameterType.Picklist;
			case 10:
				return CustomApiParameterType.String;
			case 11:
				return CustomApiParameterType.StringArray;
			case 12:
				return CustomApiParameterType.Guid;
			default:
				throw new Error(`Invalid CustomApiParameterType value: ${value}`);
		}
	}

	/**
	 * Returns all available parameter types.
	 */
	public static getAll(): readonly CustomApiParameterType[] {
		return [
			CustomApiParameterType.Boolean,
			CustomApiParameterType.DateTime,
			CustomApiParameterType.Decimal,
			CustomApiParameterType.Entity,
			CustomApiParameterType.EntityCollection,
			CustomApiParameterType.EntityReference,
			CustomApiParameterType.Float,
			CustomApiParameterType.Integer,
			CustomApiParameterType.Money,
			CustomApiParameterType.Picklist,
			CustomApiParameterType.String,
			CustomApiParameterType.StringArray,
			CustomApiParameterType.Guid
		];
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	/**
	 * Returns true if this parameter type requires a logical entity name.
	 * Entity, EntityCollection, and EntityReference types require specifying
	 * the entity type they reference.
	 */
	public requiresEntityLogicalName(): boolean {
		return this.value === 3 || this.value === 4 || this.value === 5;
	}

	public equals(other: CustomApiParameterType): boolean {
		return this.value === other.value;
	}
}
