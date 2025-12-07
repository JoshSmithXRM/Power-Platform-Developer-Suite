/**
 * Value Objects: SQL Abstract Syntax Tree
 *
 * Represents the parsed structure of a SQL SELECT statement.
 * These are domain value objects - immutable and representing domain concepts.
 */

/**
 * Comparison operators in SQL WHERE clauses.
 */
export type SqlComparisonOperator = '=' | '<>' | '<' | '>' | '<=' | '>=';

/**
 * Logical operators for combining conditions.
 */
export type SqlLogicalOperator = 'AND' | 'OR';

/**
 * Sort direction for ORDER BY.
 */
export type SqlSortDirection = 'ASC' | 'DESC';

/**
 * JOIN types.
 */
export type SqlJoinType = 'INNER' | 'LEFT' | 'RIGHT';

/**
 * Aggregate function types.
 */
export type SqlAggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

/**
 * Column reference in SELECT clause.
 * Can be: column, table.column, *, or table.*
 */
export class SqlColumnRef {
	constructor(
		public readonly tableName: string | null,
		public readonly columnName: string,
		public readonly alias: string | null,
		public readonly isWildcard: boolean
	) {}

	public getFullName(): string {
		if (this.tableName) {
			return `${this.tableName}.${this.columnName}`;
		}
		return this.columnName;
	}
}

/**
 * Aggregate column expression in SELECT clause.
 * Examples: COUNT(*), COUNT(name), COUNT(DISTINCT name), SUM(revenue)
 */
export class SqlAggregateColumn {
	constructor(
		public readonly func: SqlAggregateFunction,
		public readonly column: SqlColumnRef | null, // null for COUNT(*)
		public readonly isDistinct: boolean,
		public readonly alias: string | null
	) {}

	/**
	 * Checks if this is COUNT(*) - counts all rows.
	 */
	public isCountAll(): boolean {
		return this.func === 'COUNT' && this.column === null;
	}

	/**
	 * Gets the column name for FetchXML transpilation.
	 * For COUNT(*), returns null. For others, returns the column name.
	 */
	public getColumnName(): string | null {
		if (this.column === null) {
			return null;
		}
		return this.column.columnName;
	}
}

/**
 * Represents either a regular column or an aggregate column in SELECT clause.
 */
export type SqlSelectColumn = SqlColumnRef | SqlAggregateColumn;

/**
 * Table reference in FROM clause.
 */
export class SqlTableRef {
	constructor(
		public readonly tableName: string,
		public readonly alias: string | null
	) {}

	public getEffectiveName(): string {
		return this.alias ?? this.tableName;
	}
}

/**
 * Literal value in SQL expression.
 */
export class SqlLiteral {
	constructor(
		public readonly value: string | number | null,
		public readonly type: 'string' | 'number' | 'null'
	) {}
}

/**
 * Base type for WHERE clause conditions.
 */
export type SqlCondition =
	| SqlComparisonCondition
	| SqlLikeCondition
	| SqlNullCondition
	| SqlInCondition
	| SqlLogicalCondition;

/**
 * Comparison condition: column op value
 */
export class SqlComparisonCondition {
	public readonly kind = 'comparison' as const;

	constructor(
		public readonly column: SqlColumnRef,
		public readonly operator: SqlComparisonOperator,
		public readonly value: SqlLiteral
	) {}
}

/**
 * LIKE condition: column LIKE pattern
 */
export class SqlLikeCondition {
	public readonly kind = 'like' as const;

	constructor(
		public readonly column: SqlColumnRef,
		public readonly pattern: string,
		public readonly isNegated: boolean
	) {}
}

/**
 * NULL condition: column IS [NOT] NULL
 */
export class SqlNullCondition {
	public readonly kind = 'null' as const;

	constructor(
		public readonly column: SqlColumnRef,
		public readonly isNegated: boolean
	) {}
}

/**
 * IN condition: column [NOT] IN (value1, value2, ...)
 */
export class SqlInCondition {
	public readonly kind = 'in' as const;

	constructor(
		public readonly column: SqlColumnRef,
		public readonly values: readonly SqlLiteral[],
		public readonly isNegated: boolean
	) {}
}

/**
 * Logical condition: condition AND/OR condition
 */
export class SqlLogicalCondition {
	public readonly kind = 'logical' as const;

	constructor(
		public readonly operator: SqlLogicalOperator,
		public readonly conditions: readonly SqlCondition[]
	) {}
}

/**
 * ORDER BY item.
 */
export class SqlOrderByItem {
	constructor(
		public readonly column: SqlColumnRef,
		public readonly direction: SqlSortDirection
	) {}
}

/**
 * JOIN clause.
 */
export class SqlJoin {
	constructor(
		public readonly type: SqlJoinType,
		public readonly table: SqlTableRef,
		public readonly leftColumn: SqlColumnRef,
		public readonly rightColumn: SqlColumnRef
	) {}
}

/**
 * Complete SQL SELECT statement AST.
 */
export class SqlSelectStatement {
	constructor(
		public readonly columns: readonly SqlSelectColumn[],
		public readonly from: SqlTableRef,
		public readonly joins: readonly SqlJoin[],
		public readonly where: SqlCondition | null,
		public readonly orderBy: readonly SqlOrderByItem[],
		public readonly top: number | null,
		public readonly distinct: boolean = false,
		public readonly groupBy: readonly SqlColumnRef[] = []
	) {}

	/**
	 * Gets the primary entity name (from FROM clause).
	 */
	public getEntityName(): string {
		return this.from.tableName;
	}

	/**
	 * Checks if this is a SELECT * query.
	 */
	public isSelectAll(): boolean {
		const firstColumn = this.columns[0];
		return (
			this.columns.length === 1 &&
			firstColumn !== undefined &&
			firstColumn instanceof SqlColumnRef &&
			firstColumn.isWildcard &&
			firstColumn.tableName === null
		);
	}

	/**
	 * Checks if this query contains aggregate functions.
	 */
	public hasAggregates(): boolean {
		return this.columns.some((col) => col instanceof SqlAggregateColumn);
	}

	/**
	 * Gets only the regular (non-aggregate) columns.
	 */
	public getRegularColumns(): readonly SqlColumnRef[] {
		return this.columns.filter((col): col is SqlColumnRef => col instanceof SqlColumnRef);
	}

	/**
	 * Gets only the aggregate columns.
	 */
	public getAggregateColumns(): readonly SqlAggregateColumn[] {
		return this.columns.filter((col): col is SqlAggregateColumn => col instanceof SqlAggregateColumn);
	}

	/**
	 * Gets all table/alias names referenced in the query.
	 */
	public getTableNames(): readonly string[] {
		const names: string[] = [this.from.getEffectiveName()];
		for (const join of this.joins) {
			names.push(join.table.getEffectiveName());
		}
		return names;
	}

	/**
	 * Checks if this query has a row limit (TOP or LIMIT clause).
	 * Used to warn users about potentially large result sets.
	 */
	public hasRowLimit(): boolean {
		return this.top !== null;
	}
}
