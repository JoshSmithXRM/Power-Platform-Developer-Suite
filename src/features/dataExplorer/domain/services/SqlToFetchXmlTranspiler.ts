import {
	SqlColumnRef,
	SqlComparisonCondition,
	SqlCondition,
	SqlInCondition,
	SqlJoin,
	SqlLikeCondition,
	SqlLiteral,
	SqlLogicalCondition,
	SqlNullCondition,
	SqlOrderByItem,
	SqlSelectStatement,
	SqlTableRef,
} from '../valueObjects/SqlAst';

/**
 * Domain Service: SQL to FetchXML Transpiler
 *
 * Converts a parsed SQL AST to FetchXML format for Dataverse execution.
 *
 * Business Rules:
 * - SQL comparison operators map to FetchXML operators
 * - LIKE patterns with wildcards map to like, begins-with, ends-with
 * - JOINs map to link-entity elements
 * - AND/OR map to filter type attribute
 * - String values are XML-escaped
 */
export class SqlToFetchXmlTranspiler {
	/**
	 * Transpiles a SQL AST to FetchXML string.
	 */
	public transpile(statement: SqlSelectStatement): string {
		const lines: string[] = [];

		// <fetch> element with optional top
		if (statement.top !== null) {
			lines.push(`<fetch top="${statement.top}">`);
		} else {
			lines.push('<fetch>');
		}

		// <entity> element
		const entityName = this.normalizeEntityName(statement.from.tableName);
		lines.push(`  <entity name="${entityName}">`);

		// Attributes (columns)
		this.transpileColumns(statement.columns, statement.from, lines);

		// Link entities (JOINs)
		for (const join of statement.joins) {
			this.transpileJoin(join, statement.columns, lines);
		}

		// Filter (WHERE)
		if (statement.where !== null) {
			this.transpileCondition(statement.where, lines, '    ');
		}

		// Order (ORDER BY)
		for (const orderItem of statement.orderBy) {
			this.transpileOrderBy(orderItem, lines);
		}

		lines.push('  </entity>');
		lines.push('</fetch>');

		return lines.join('\n');
	}

	/**
	 * Transpiles SELECT columns to FetchXML attributes.
	 * Includes columns that belong to the main entity (unqualified or matching alias).
	 */
	private transpileColumns(
		columns: readonly SqlColumnRef[],
		mainEntity: SqlTableRef,
		lines: string[]
	): void {
		for (const column of columns) {
			if (column.isWildcard && column.tableName === null) {
				// SELECT *
				lines.push('    <all-attributes />');
			} else if (column.isWildcard && this.isMainEntityColumn(column.tableName, mainEntity)) {
				// SELECT c.* where c is main entity alias
				lines.push('    <all-attributes />');
			} else if (!column.isWildcard) {
				// Include column if it belongs to the main entity
				if (this.isMainEntityColumn(column.tableName, mainEntity)) {
					const attrName = this.normalizeAttributeName(column.columnName);
					if (column.alias) {
						lines.push(`    <attribute name="${attrName}" alias="${column.alias}" />`);
					} else {
						lines.push(`    <attribute name="${attrName}" />`);
					}
				}
			}
			// Columns from link-entities would need to be added inside the link-entity element
		}
	}

	/**
	 * Checks if a column table reference belongs to the main entity.
	 * Returns true if tableName is null (unqualified) or matches the main entity's alias/name.
	 */
	private isMainEntityColumn(tableName: string | null, mainEntity: SqlTableRef): boolean {
		if (tableName === null) {
			return true;
		}
		// Check against alias first, then table name
		if (mainEntity.alias && tableName.toLowerCase() === mainEntity.alias.toLowerCase()) {
			return true;
		}
		return tableName.toLowerCase() === mainEntity.tableName.toLowerCase();
	}

	/**
	 * Transpiles a JOIN to FetchXML link-entity.
	 * Intelligently determines from/to based on which column belongs to which table.
	 * Includes columns that belong to this link-entity.
	 */
	private transpileJoin(
		join: SqlJoin,
		columns: readonly SqlColumnRef[],
		lines: string[]
	): void {
		const linkType = join.type === 'LEFT' ? 'outer' : 'inner';

		// Determine which column is from the link-entity vs parent entity
		// by checking the table aliases
		let fromColumn: string;
		let toColumn: string;

		const leftIsLinkEntity = this.isJoinTableColumn(join.leftColumn.tableName, join.table);
		const rightIsLinkEntity = this.isJoinTableColumn(join.rightColumn.tableName, join.table);

		if (leftIsLinkEntity && !rightIsLinkEntity) {
			// LEFT column is from link-entity, RIGHT is from parent
			fromColumn = join.leftColumn.columnName;
			toColumn = join.rightColumn.columnName;
		} else if (rightIsLinkEntity && !leftIsLinkEntity) {
			// RIGHT column is from link-entity, LEFT is from parent
			fromColumn = join.rightColumn.columnName;
			toColumn = join.leftColumn.columnName;
		} else {
			// Can't determine - fall back to original behavior (right=from, left=to)
			fromColumn = join.rightColumn.columnName;
			toColumn = join.leftColumn.columnName;
		}

		const from = this.normalizeAttributeName(fromColumn);
		const to = this.normalizeAttributeName(toColumn);
		const aliasAttr = join.table.alias ? ` alias="${join.table.alias}"` : '';
		const linkEntityName = this.normalizeEntityName(join.table.tableName);

		lines.push(`    <link-entity name="${linkEntityName}" from="${from}" to="${to}" link-type="${linkType}"${aliasAttr}>`);

		// Add columns that belong to this link-entity
		for (const column of columns) {
			if (this.isJoinTableColumn(column.tableName, join.table)) {
				if (column.isWildcard) {
					lines.push('      <all-attributes />');
				} else {
					const attrName = this.normalizeAttributeName(column.columnName);
					if (column.alias) {
						lines.push(`      <attribute name="${attrName}" alias="${column.alias}" />`);
					} else {
						lines.push(`      <attribute name="${attrName}" />`);
					}
				}
			}
		}

		lines.push('    </link-entity>');
	}

	/**
	 * Checks if a column table reference belongs to the join table.
	 */
	private isJoinTableColumn(tableName: string | null, joinTable: SqlTableRef): boolean {
		if (tableName === null) {
			return false;
		}
		// Check against alias first, then table name
		if (joinTable.alias && tableName.toLowerCase() === joinTable.alias.toLowerCase()) {
			return true;
		}
		return tableName.toLowerCase() === joinTable.tableName.toLowerCase();
	}

	/**
	 * Transpiles a WHERE condition to FetchXML filter.
	 */
	private transpileCondition(condition: SqlCondition, lines: string[], indent: string): void {
		switch (condition.kind) {
			case 'comparison':
				this.transpileComparison(condition, lines, indent);
				break;
			case 'like':
				this.transpileLike(condition, lines, indent);
				break;
			case 'null':
				this.transpileNull(condition, lines, indent);
				break;
			case 'in':
				this.transpileIn(condition, lines, indent);
				break;
			case 'logical':
				this.transpileLogical(condition, lines, indent);
				break;
		}
	}

	/**
	 * Transpiles a comparison condition.
	 */
	private transpileComparison(condition: SqlComparisonCondition, lines: string[], indent: string): void {
		const operator = this.mapComparisonOperator(condition.operator);
		const value = this.formatValue(condition.value);
		const attr = this.normalizeAttributeName(condition.column.columnName);

		if (condition.column.tableName) {
			// Qualified column - would need to be in link-entity filter
			// For now, just use the column name
			lines.push(
				`${indent}<filter>`,
				`${indent}  <condition attribute="${attr}" operator="${operator}" value="${value}" />`,
				`${indent}</filter>`
			);
		} else {
			lines.push(
				`${indent}<filter>`,
				`${indent}  <condition attribute="${attr}" operator="${operator}" value="${value}" />`,
				`${indent}</filter>`
			);
		}
	}

	/**
	 * Transpiles a LIKE condition.
	 */
	private transpileLike(condition: SqlLikeCondition, lines: string[], indent: string): void {
		const pattern = condition.pattern;
		const attr = this.normalizeAttributeName(condition.column.columnName);

		// Determine operator based on pattern
		let operator: string;
		let value: string;

		if (pattern.startsWith('%') && pattern.endsWith('%')) {
			// %value% -> like
			operator = condition.isNegated ? 'not-like' : 'like';
			value = pattern;
		} else if (pattern.startsWith('%')) {
			// %value -> ends-with
			operator = condition.isNegated ? 'not-end-with' : 'ends-with';
			value = pattern.substring(1);
		} else if (pattern.endsWith('%')) {
			// value% -> begins-with
			operator = condition.isNegated ? 'not-begin-with' : 'begins-with';
			value = pattern.substring(0, pattern.length - 1);
		} else {
			// No wildcards -> like (FetchXML will handle)
			operator = condition.isNegated ? 'not-like' : 'like';
			value = pattern;
		}

		lines.push(
			`${indent}<filter>`,
			`${indent}  <condition attribute="${attr}" operator="${operator}" value="${this.escapeXml(value)}" />`,
			`${indent}</filter>`
		);
	}

	/**
	 * Transpiles an IS NULL condition.
	 */
	private transpileNull(condition: SqlNullCondition, lines: string[], indent: string): void {
		const operator = condition.isNegated ? 'not-null' : 'null';
		const attr = this.normalizeAttributeName(condition.column.columnName);

		lines.push(
			`${indent}<filter>`,
			`${indent}  <condition attribute="${attr}" operator="${operator}" />`,
			`${indent}</filter>`
		);
	}

	/**
	 * Transpiles an IN condition.
	 */
	private transpileIn(condition: SqlInCondition, lines: string[], indent: string): void {
		const operator = condition.isNegated ? 'not-in' : 'in';
		const attr = this.normalizeAttributeName(condition.column.columnName);

		lines.push(`${indent}<filter>`);
		lines.push(`${indent}  <condition attribute="${attr}" operator="${operator}">`);

		for (const value of condition.values) {
			lines.push(`${indent}    <value>${this.formatValue(value)}</value>`);
		}

		lines.push(`${indent}  </condition>`);
		lines.push(`${indent}</filter>`);
	}

	/**
	 * Transpiles a logical (AND/OR) condition.
	 */
	private transpileLogical(condition: SqlLogicalCondition, lines: string[], indent: string): void {
		const filterType = condition.operator === 'OR' ? 'or' : 'and';

		lines.push(`${indent}<filter type="${filterType}">`);

		for (const child of condition.conditions) {
			this.transpileConditionInner(child, lines, indent + '  ');
		}

		lines.push(`${indent}</filter>`);
	}

	/**
	 * Transpiles a condition without wrapping filter (for nested conditions).
	 */
	private transpileConditionInner(condition: SqlCondition, lines: string[], indent: string): void {
		switch (condition.kind) {
			case 'comparison': {
				const operator = this.mapComparisonOperator(condition.operator);
				const value = this.formatValue(condition.value);
				const attr = this.normalizeAttributeName(condition.column.columnName);
				lines.push(`${indent}<condition attribute="${attr}" operator="${operator}" value="${value}" />`);
				break;
			}
			case 'like': {
				const pattern = condition.pattern;
				const attr = this.normalizeAttributeName(condition.column.columnName);
				let op: string;
				let val: string;

				if (pattern.startsWith('%') && pattern.endsWith('%')) {
					op = condition.isNegated ? 'not-like' : 'like';
					val = pattern;
				} else if (pattern.startsWith('%')) {
					op = condition.isNegated ? 'not-end-with' : 'ends-with';
					val = pattern.substring(1);
				} else if (pattern.endsWith('%')) {
					op = condition.isNegated ? 'not-begin-with' : 'begins-with';
					val = pattern.substring(0, pattern.length - 1);
				} else {
					op = condition.isNegated ? 'not-like' : 'like';
					val = pattern;
				}
				lines.push(`${indent}<condition attribute="${attr}" operator="${op}" value="${this.escapeXml(val)}" />`);
				break;
			}
			case 'null': {
				const op = condition.isNegated ? 'not-null' : 'null';
				const attr = this.normalizeAttributeName(condition.column.columnName);
				lines.push(`${indent}<condition attribute="${attr}" operator="${op}" />`);
				break;
			}
			case 'in': {
				const op = condition.isNegated ? 'not-in' : 'in';
				const attr = this.normalizeAttributeName(condition.column.columnName);
				lines.push(`${indent}<condition attribute="${attr}" operator="${op}">`);
				for (const v of condition.values) {
					lines.push(`${indent}  <value>${this.formatValue(v)}</value>`);
				}
				lines.push(`${indent}</condition>`);
				break;
			}
			case 'logical': {
				// Nested logical condition
				const type = condition.operator === 'OR' ? 'or' : 'and';
				lines.push(`${indent}<filter type="${type}">`);
				for (const child of condition.conditions) {
					this.transpileConditionInner(child, lines, indent + '  ');
				}
				lines.push(`${indent}</filter>`);
				break;
			}
		}
	}

	/**
	 * Transpiles an ORDER BY item.
	 */
	private transpileOrderBy(orderItem: SqlOrderByItem, lines: string[]): void {
		const descending = orderItem.direction === 'DESC' ? 'true' : 'false';
		const attr = this.normalizeAttributeName(orderItem.column.columnName);
		lines.push(`    <order attribute="${attr}" descending="${descending}" />`);
	}

	/**
	 * Maps SQL comparison operator to FetchXML operator.
	 */
	private mapComparisonOperator(op: string): string {
		switch (op) {
			case '=':
				return 'eq';
			case '<>':
				return 'ne';
			case '<':
				return 'lt';
			case '>':
				return 'gt';
			case '<=':
				return 'le';
			case '>=':
				return 'ge';
			default:
				return 'eq';
		}
	}

	/**
	 * Formats a literal value for FetchXML.
	 */
	private formatValue(literal: SqlLiteral): string {
		if (literal.type === 'null') {
			return '';
		}
		if (literal.type === 'string') {
			return this.escapeXml(String(literal.value));
		}
		return String(literal.value);
	}

	/**
	 * Escapes special XML characters.
	 */
	private escapeXml(value: string): string {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}

	/**
	 * Normalizes an attribute name for Dataverse.
	 * Dataverse attribute names are always lowercase.
	 */
	private normalizeAttributeName(name: string): string {
		return name.toLowerCase();
	}

	/**
	 * Normalizes an entity name for Dataverse.
	 * Dataverse entity logical names are always lowercase.
	 */
	private normalizeEntityName(name: string): string {
		return name.toLowerCase();
	}
}
