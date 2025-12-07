/**
 * Value Object: Query Column
 *
 * Represents a column selection in a visual query.
 * Maps to a FetchXML `<attribute>` element.
 *
 * Immutable, validated value object following domain patterns.
 */

import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

/**
 * Represents a column in a visual query.
 */
export class QueryColumn {
	/**
	 * Creates a QueryColumn with validation.
	 *
	 * @param name - Column logical name (required, cannot be empty)
	 * @param alias - Optional alias for the column
	 * @param width - Optional display width in pixels
	 * @throws ValidationError if name is empty
	 */
	constructor(
		/** Column logical name (attribute name in FetchXML) */
		public readonly name: string,
		/** Optional alias for the column */
		public readonly alias: string | null = null,
		/** Optional width for display (UI hint from layoutxml) */
		public readonly width: number | null = null
	) {
		const trimmedName = name.trim();
		if (trimmedName === '') {
			throw new ValidationError('QueryColumn', 'name', name, 'cannot be empty');
		}

		this.name = trimmedName;
		this.alias = alias?.trim() || null;
		this.width = width !== null && width > 0 ? width : null;
	}

	/**
	 * Creates a copy with a different alias.
	 *
	 * @param alias - New alias (or null to remove alias)
	 * @returns New QueryColumn with updated alias
	 */
	public withAlias(alias: string | null): QueryColumn {
		return new QueryColumn(this.name, alias, this.width);
	}

	/**
	 * Creates a copy with a different width.
	 *
	 * @param width - New width (or null to remove width)
	 * @returns New QueryColumn with updated width
	 */
	public withWidth(width: number | null): QueryColumn {
		return new QueryColumn(this.name, this.alias, width);
	}

	/**
	 * Checks if this column has an alias.
	 */
	public hasAlias(): boolean {
		return this.alias !== null;
	}

	/**
	 * Gets the effective name (alias if present, otherwise column name).
	 */
	public getEffectiveName(): string {
		return this.alias ?? this.name;
	}

	/**
	 * Checks equality by value.
	 *
	 * Two columns are equal if they have the same name, alias, and width.
	 */
	public equals(other: QueryColumn): boolean {
		return (
			this.name === other.name &&
			this.alias === other.alias &&
			this.width === other.width
		);
	}

	/**
	 * Creates a string representation for debugging.
	 */
	public toString(): string {
		if (this.alias !== null) {
			return `${this.name} AS ${this.alias}`;
		}
		return this.name;
	}
}
