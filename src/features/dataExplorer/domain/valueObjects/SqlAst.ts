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
	/** Optional trailing comment (e.g., "-- account name" after "name,") */
	public trailingComment?: string;

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
	/** Optional trailing comment */
	public trailingComment?: string;

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
	/** Optional trailing comment */
	public trailingComment?: string;

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
	/** Optional trailing comment */
	public trailingComment?: string;

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
	/** Optional trailing comment */
	public trailingComment?: string;

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
	/** Optional trailing comment */
	public trailingComment?: string;

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
	/** Optional trailing comment */
	public trailingComment?: string;

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
	/** Optional trailing comment */
	public trailingComment?: string;

	constructor(
		public readonly operator: SqlLogicalOperator,
		public readonly conditions: readonly SqlCondition[]
	) {}
}

/**
 * ORDER BY item.
 */
export class SqlOrderByItem {
	/** Optional trailing comment */
	public trailingComment?: string;

	constructor(
		public readonly column: SqlColumnRef,
		public readonly direction: SqlSortDirection
	) {}
}

/**
 * JOIN clause.
 */
export class SqlJoin {
	/** Optional trailing comment */
	public trailingComment?: string;

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
	/** Comments that appear before the SELECT keyword */
	public leadingComments: string[] = [];

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

	/**
	 * Creates a new statement with additional columns added.
	 * Used for virtual column transformation - adds parent columns for virtual fields.
	 */
	public withAdditionalColumns(additionalColumns: string[]): SqlSelectStatement {
		if (additionalColumns.length === 0) {
			return this;
		}

		// Create new column refs for the additional columns
		const newColumns: SqlSelectColumn[] = [
			...this.columns,
			...additionalColumns.map(name => new SqlColumnRef(null, name, null, false)),
		];

		const newStatement = new SqlSelectStatement(
			newColumns,
			this.from,
			this.joins,
			this.where,
			this.orderBy,
			this.top,
			this.distinct,
			this.groupBy
		);
		newStatement.leadingComments = this.leadingComments;
		return newStatement;
	}

	/**
	 * Creates a new statement with virtual columns replaced by their parent columns.
	 * Used for transparent virtual column transformation.
	 *
	 * @param virtualToParent - Map of virtual column names to parent column names (case-insensitive keys)
	 */
	public withVirtualColumnsReplaced(virtualToParent: Map<string, string>): SqlSelectStatement {
		if (virtualToParent.size === 0) {
			return this;
		}

		const seenParents = new Set<string>();
		const newColumns: SqlSelectColumn[] = [];

		for (const col of this.columns) {
			if (col instanceof SqlColumnRef && !col.isWildcard) {
				const colLower = col.columnName.toLowerCase();
				const parentName = virtualToParent.get(colLower);

				if (parentName !== undefined) {
					// This is a virtual column - replace with parent (if not already added)
					const parentLower = parentName.toLowerCase();
					if (!seenParents.has(parentLower)) {
						seenParents.add(parentLower);
						newColumns.push(new SqlColumnRef(col.tableName, parentName, null, false));
					}
				} else {
					// Regular column - keep as-is
					newColumns.push(col);
					seenParents.add(colLower);
				}
			} else {
				// Aggregate or wildcard - keep as-is
				newColumns.push(col);
			}
		}

		const newStatement = new SqlSelectStatement(
			newColumns,
			this.from,
			this.joins,
			this.where,
			this.orderBy,
			this.top,
			this.distinct,
			this.groupBy
		);
		newStatement.leadingComments = this.leadingComments;
		return newStatement;
	}
}
