type DataTypeValue = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined' | 'secret';

/**
 * Value object representing data type
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
