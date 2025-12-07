/**
 * Entity: Visual Query
 *
 * Root aggregate for the Visual Query Builder.
 * Represents a complete query that can be converted to/from FetchXML.
 *
 * Immutable with builder methods that return new instances.
 */

import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

import { QueryColumn } from './QueryColumn';
import { QueryFilterGroup } from './QueryFilterGroup';
import { QuerySort } from './QuerySort';

/**
 * Column selection type - either all columns or specific columns.
 * Discriminated union prevents invalid states.
 */
export type ColumnSelection =
	| { readonly kind: 'all' }
	| { readonly kind: 'specific'; readonly columns: readonly QueryColumn[] };

/**
 * Represents a complete visual query.
 */
export class VisualQuery {
	/**
	 * Creates a VisualQuery with validation.
	 *
	 * @param entityName - Entity logical name (required, cannot be empty)
	 * @param columns - Column selection (defaults to all)
	 * @param filter - Optional filter group
	 * @param sorts - Optional sort orders
	 * @param top - Optional row limit
	 * @param distinct - Whether to return distinct rows
	 * @throws ValidationError if entityName is empty
	 */
	constructor(
		/** Entity logical name */
		public readonly entityName: string,
		/** Column selection (all or specific) */
		public readonly columns: ColumnSelection = { kind: 'all' },
		/** Filter (null = no filter) */
		public readonly filter: QueryFilterGroup | null = null,
		/** Sort orders */
		public readonly sorts: readonly QuerySort[] = [],
		/** Row limit (null = no limit) */
		public readonly top: number | null = null,
		/** Whether to return distinct rows */
		public readonly distinct: boolean = false
	) {
		const trimmedEntityName = entityName.trim();
		if (trimmedEntityName === '') {
			throw new ValidationError('VisualQuery', 'entityName', entityName, 'cannot be empty');
		}

		this.entityName = trimmedEntityName;
		this.top = top !== null && top > 0 ? top : null;
	}

	// =========================================================================
	// Builder Methods (return new instance)
	// =========================================================================

	/**
	 * Creates a copy with different columns.
	 */
	public withColumns(columns: ColumnSelection): VisualQuery {
		return new VisualQuery(
			this.entityName,
			columns,
			this.filter,
			this.sorts,
			this.top,
			this.distinct
		);
	}

	/**
	 * Creates a copy selecting all columns.
	 */
	public withAllColumns(): VisualQuery {
		return this.withColumns({ kind: 'all' });
	}

	/**
	 * Creates a copy selecting specific columns.
	 */
	public withSpecificColumns(columns: readonly QueryColumn[]): VisualQuery {
		return this.withColumns({ kind: 'specific', columns: [...columns] });
	}

	/**
	 * Creates a copy with an additional column (for specific selection).
	 * If currently selecting all, switches to specific selection with the new column.
	 */
	public withAddedColumn(column: QueryColumn): VisualQuery {
		if (this.columns.kind === 'all') {
			return this.withColumns({ kind: 'specific', columns: [column] });
		}
		return this.withColumns({
			kind: 'specific',
			columns: [...this.columns.columns, column],
		});
	}

	/**
	 * Creates a copy with different filter.
	 */
	public withFilter(filter: QueryFilterGroup | null): VisualQuery {
		return new VisualQuery(
			this.entityName,
			this.columns,
			filter,
			this.sorts,
			this.top,
			this.distinct
		);
	}

	/**
	 * Creates a copy with different sorts.
	 */
	public withSorts(sorts: readonly QuerySort[]): VisualQuery {
		return new VisualQuery(
			this.entityName,
			this.columns,
			this.filter,
			[...sorts],
			this.top,
			this.distinct
		);
	}

	/**
	 * Creates a copy with an additional sort.
	 */
	public withAddedSort(sort: QuerySort): VisualQuery {
		return this.withSorts([...this.sorts, sort]);
	}

	/**
	 * Creates a copy with different row limit.
	 */
	public withTop(top: number | null): VisualQuery {
		const validTop = top !== null && top > 0 ? top : null;
		return new VisualQuery(
			this.entityName,
			this.columns,
			this.filter,
			this.sorts,
			validTop,
			this.distinct
		);
	}

	/**
	 * Creates a copy with different distinct setting.
	 */
	public withDistinct(distinct: boolean): VisualQuery {
		return new VisualQuery(
			this.entityName,
			this.columns,
			this.filter,
			this.sorts,
			this.top,
			distinct
		);
	}

	/**
	 * Creates a copy with different entity name.
	 * Clears columns and filter since they may not apply to new entity.
	 */
	public withEntity(entityName: string): VisualQuery {
		const trimmedEntityName = entityName.trim();
		if (trimmedEntityName === '') {
			throw new ValidationError('VisualQuery', 'entityName', entityName, 'cannot be empty');
		}
		return new VisualQuery(
			trimmedEntityName,
			{ kind: 'all' },
			null,
			[],
			this.top,
			this.distinct
		);
	}

	// =========================================================================
	// Query Methods
	// =========================================================================

	/**
	 * Checks if this is a SELECT * query.
	 */
	public isSelectAll(): boolean {
		return this.columns.kind === 'all';
	}

	/**
	 * Checks if this query has any filters.
	 */
	public hasFilter(): boolean {
		return this.filter !== null && !this.filter.isEmpty();
	}

	/**
	 * Checks if this query has sorting.
	 */
	public hasSorting(): boolean {
		return this.sorts.length > 0;
	}

	/**
	 * Checks if this query has a row limit.
	 */
	public hasTop(): boolean {
		return this.top !== null;
	}

	/**
	 * Gets the list of selected column names.
	 * Returns empty array for SELECT *.
	 */
	public getColumnNames(): readonly string[] {
		if (this.columns.kind === 'all') {
			return [];
		}
		return this.columns.columns.map(col => col.name);
	}

	/**
	 * Gets the column count.
	 * Returns 0 for SELECT * (unknown count).
	 */
	public getColumnCount(): number {
		if (this.columns.kind === 'all') {
			return 0;
		}
		return this.columns.columns.length;
	}

	/**
	 * Gets the condition count (including nested).
	 */
	public getConditionCount(): number {
		if (this.filter === null) {
			return 0;
		}
		return this.filter.getTotalConditionCount();
	}

	/**
	 * Creates a string representation for debugging.
	 */
	public toString(): string {
		const parts: string[] = [`SELECT`];

		if (this.distinct) {
			parts.push('DISTINCT');
		}

		if (this.top !== null) {
			parts.push(`TOP ${this.top}`);
		}

		if (this.columns.kind === 'all') {
			parts.push('*');
		} else {
			parts.push(this.columns.columns.map(c => c.toString()).join(', '));
		}

		parts.push(`FROM ${this.entityName}`);

		if (this.filter !== null && !this.filter.isEmpty()) {
			parts.push(`WHERE ${this.filter.toString()}`);
		}

		if (this.sorts.length > 0) {
			parts.push(`ORDER BY ${this.sorts.map(s => s.toString()).join(', ')}`);
		}

		return parts.join(' ');
	}
}
