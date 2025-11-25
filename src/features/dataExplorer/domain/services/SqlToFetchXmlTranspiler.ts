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
		lines.push(`  <entity name="${statement.from.tableName}">`);

		// Attributes (columns)
		this.transpileColumns(statement.columns, lines);

		// Link entities (JOINs)
		for (const join of statement.joins) {
			this.transpileJoin(join, lines);
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
	 */
	private transpileColumns(columns: readonly SqlColumnRef[], lines: string[]): void {
		for (const column of columns) {
			if (column.isWildcard && column.tableName === null) {
				// SELECT *
				lines.push('    <all-attributes />');
			} else if (!column.isWildcard) {
				// Regular column - only include non-qualified columns in main entity
				if (column.tableName === null) {
					const attrName = this.normalizeAttributeName(column.columnName);
					if (column.alias) {
						lines.push(`    <attribute name="${attrName}" alias="${column.alias}" />`);
					} else {
						lines.push(`    <attribute name="${attrName}" />`);
					}
				}
			}
			// table.* and table.column are handled in link-entity
		}
	}

	/**
	 * Transpiles a JOIN to FetchXML link-entity.
	 */
	private transpileJoin(join: SqlJoin, lines: string[]): void {
		const linkType = join.type === 'LEFT' ? 'outer' : 'inner';

		// Determine from/to based on join condition
		// The "from" attribute is the field in the link-entity (target table)
		// The "to" attribute is the field in the parent entity
		const from = this.normalizeAttributeName(join.rightColumn.columnName);
		const to = this.normalizeAttributeName(join.leftColumn.columnName);

		const aliasAttr = join.table.alias ? ` alias="${join.table.alias}"` : '';

		lines.push(`    <link-entity name="${join.table.tableName}" from="${from}" to="${to}" link-type="${linkType}"${aliasAttr}>`);
		lines.push('    </link-entity>');
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
}
