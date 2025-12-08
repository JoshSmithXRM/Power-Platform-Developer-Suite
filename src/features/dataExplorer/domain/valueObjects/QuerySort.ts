/**
 * Value Object: Query Sort
 *
 * Represents a sort order specification in a visual query.
 * Maps to a FetchXML `<order>` element.
 *
 * Immutable, validated value object.
 */

import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

/**
 * Represents a sort order in a visual query.
 */
export class QuerySort {
	/**
	 * Creates a sort specification with validation.
	 *
	 * @param attribute - Attribute name (required, cannot be empty)
	 * @param descending - True for descending, false for ascending
	 * @throws ValidationError if attribute is empty
	 */
	constructor(
		/** Attribute to sort by */
		public readonly attribute: string,
		/** Sort direction (true = descending, false = ascending) */
		public readonly descending: boolean
	) {
		const trimmedAttribute = attribute.trim();
		if (trimmedAttribute === '') {
			throw new ValidationError('QuerySort', 'attribute', attribute, 'cannot be empty');
		}
		this.attribute = trimmedAttribute;
	}

	/**
	 * Checks if this is an ascending sort.
	 */
	public isAscending(): boolean {
		return !this.descending;
	}

	/**
	 * Checks if this is a descending sort.
	 */
	public isDescending(): boolean {
		return this.descending;
	}

	/**
	 * Creates a copy with reversed direction.
	 */
	public reversed(): QuerySort {
		return new QuerySort(this.attribute, !this.descending);
	}

	/**
	 * Checks equality by value.
	 */
	public equals(other: QuerySort): boolean {
		return this.attribute === other.attribute && this.descending === other.descending;
	}

	/**
	 * Creates a string representation for debugging.
	 */
	public toString(): string {
		return `${this.attribute} ${this.descending ? 'DESC' : 'ASC'}`;
	}
}
