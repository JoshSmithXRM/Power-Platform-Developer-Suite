type DataTypeValue = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined' | 'secret';

/**
 * Value object representing JavaScript data types for storage values.
 *
 * Provides runtime type detection for storage values to support
 * appropriate rendering in the UI.
 *
 * Supported Types:
 * - Primitives: string, number, boolean, null, undefined
 * - Complex: object, array
 * - Special: secret (for hidden values)
 *
 * WHY: Storage values can be any serializable type. This value object
 * classifies types for appropriate UI rendering and validation.
 */
export class DataType {
	private constructor(private readonly _value: DataTypeValue) {}

	public static fromValue(value: unknown): DataType {
		if (value === null) {
			return new DataType('null');
		}
		if (value === undefined) {
			return new DataType('undefined');
		}
		if (Array.isArray(value)) {
			return new DataType('array');
		}
		if (typeof value === 'object') {
			return new DataType('object');
		}
		if (typeof value === 'string') {
			return new DataType('string');
		}
		if (typeof value === 'number') {
			return new DataType('number');
		}
		if (typeof value === 'boolean') {
			return new DataType('boolean');
		}

		return new DataType('object');
	}

	public get value(): DataTypeValue {
		return this._value;
	}
}
