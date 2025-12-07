/**
 * Domain Service: FetchXML to SQL Transpiler
 *
 * Converts FetchXML to SQL for display and editing.
 * Provides reverse transpilation with warnings for unsupported features.
 *
 * Business Rules:
 * - FetchXML elements map to SQL clauses
 * - Unsupported features generate warnings but don't block transpilation
 * - Output SQL is a best-effort representation
 */

/**
 * Result of FetchXML to SQL transpilation.
 */
export interface FetchXmlToSqlResult {
	readonly success: boolean;
	readonly sql: string;
	readonly warnings: readonly TranspilationWarning[];
	readonly error?: string;
}

/**
 * Warning for FetchXML features that cannot be fully represented in SQL.
 */
export interface TranspilationWarning {
	readonly message: string;
	readonly feature: string;
}

/**
 * Parsed attribute from FetchXML.
 */
interface ParsedAttribute {
	name: string;
	alias?: string | undefined;
	tableAlias?: string | undefined;
	/** Aggregate function: count, countcolumn, sum, avg, min, max */
	aggregate?: string | undefined;
	/** Whether this column is used for GROUP BY */
	groupby?: boolean | undefined;
	/** Whether DISTINCT is applied to this aggregate */
	distinct?: boolean | undefined;
}

/**
 * Parsed link-entity from FetchXML.
 */
interface ParsedLinkEntity {
	name: string;
	from: string;
	to: string;
	alias?: string | undefined;
	linkType: string;
	attributes: ParsedAttribute[];
}

/**
 * Parsed condition from FetchXML.
 */
interface ParsedCondition {
	attribute: string;
	operator: string;
	value?: string;
	values?: string[];
}

/**
 * Parsed filter from FetchXML.
 * Note: Nested filters are not supported due to regex parsing limitations.
 * All conditions are flattened into a single AND/OR group.
 */
interface ParsedFilter {
	type: 'and' | 'or';
	conditions: ParsedCondition[];
}

/**
 * Parsed order from FetchXML.
 */
interface ParsedOrder {
	attribute: string;
	descending: boolean;
}

/**
 * Transpiles FetchXML to SQL strings.
 */
export class FetchXmlToSqlTranspiler {
	/**
	 * Transpiles FetchXML to SQL.
	 *
	 * @param fetchXml - The FetchXML string to transpile
	 * @returns Transpilation result with SQL and any warnings
	 */
	public transpile(fetchXml: string): FetchXmlToSqlResult {
		const warnings: TranspilationWarning[] = [];

		try {
			const trimmed = fetchXml.trim();
			if (trimmed === '') {
				return {
					success: false,
					sql: '',
					warnings: [],
					error: 'FetchXML cannot be empty',
				};
			}

			// Check for unsupported features (paging only now - we support aggregates)
			this.checkUnsupportedFeatures(trimmed, warnings);

			// Parse fetch element attributes
			const top = this.extractAttribute(trimmed, 'fetch', 'top');
			const distinctStr = this.extractAttribute(trimmed, 'fetch', 'distinct');
			const distinct = distinctStr?.toLowerCase() === 'true';

			// Parse entity
			const entityName = this.extractAttribute(trimmed, 'entity', 'name');
			if (!entityName) {
				return {
					success: false,
					sql: '',
					warnings,
					error: 'Could not find entity name in FetchXML',
				};
			}

			// Parse attributes
			const hasAllAttributes = this.hasAllAttributes(trimmed);
			const attributes = hasAllAttributes
				? []
				: this.parseAttributes(trimmed);

			// Parse link-entities
			const linkEntities = this.parseLinkEntities(trimmed);

			// Parse filters
			const filter = this.parseFilter(trimmed);

			// Parse orders
			const orders = this.parseOrders(trimmed);

			// Build SQL
			const sql = this.buildSql({
				entityName,
				top,
				distinct,
				hasAllAttributes,
				attributes,
				linkEntities,
				filter,
				orders,
			});

			return {
				success: true,
				sql,
				warnings,
			};
		} catch (error) {
			return {
				success: false,
				sql: '',
				warnings,
				error: error instanceof Error ? error.message : 'Transpilation failed',
			};
		}
	}

	/**
	 * Checks for FetchXML features that cannot be fully represented in SQL.
	 */
	private checkUnsupportedFeatures(
		fetchXml: string,
		warnings: TranspilationWarning[]
	): void {
		// Check for paging - this is genuinely unsupported
		if (
			this.hasAttribute(fetchXml, 'fetch', 'page') ||
			this.hasAttribute(fetchXml, 'fetch', 'paging-cookie')
		) {
			warnings.push({
				message:
					'Paging is handled differently in SQL. Only TOP clause is supported.',
				feature: 'paging',
			});
		}

		// Check for count attribute on fetch - will be converted to TOP
		if (this.hasAttribute(fetchXml, 'fetch', 'count')) {
			warnings.push({
				message: 'Count attribute will be converted to TOP.',
				feature: 'count',
			});
		}

		// Note: aggregate, distinct, groupby, and aggregate functions are now supported
	}

	/**
	 * Checks if an element has a specific attribute.
	 */
	private hasAttribute(
		xml: string,
		elementName: string,
		attributeName: string
	): boolean {
		const pattern = new RegExp(
			`<${elementName}[^>]*\\s${attributeName}\\s*=`,
			'i'
		);
		return pattern.test(xml);
	}

	/**
	 * Extracts an attribute value from an element.
	 */
	private extractAttribute(
		xml: string,
		elementName: string,
		attributeName: string
	): string | undefined {
		const pattern = new RegExp(
			`<${elementName}[^>]*\\s${attributeName}\\s*=\\s*["']([^"']+)["']`,
			'i'
		);
		const match = xml.match(pattern);
		return match?.[1];
	}

	/**
	 * Checks if an entity or link-entity has all-attributes.
	 */
	private hasAllAttributes(xml: string): boolean {
		// Check for all-attributes directly in entity (not in link-entity)
		const entityMatch = xml.match(
			/<entity[^>]*>([\s\S]*?)(?:<link-entity|<\/entity>)/i
		);
		if (entityMatch) {
			return /<all-attributes\s*\/?>/i.test(entityMatch[1] ?? '');
		}
		return /<all-attributes\s*\/?>/i.test(xml);
	}

	/**
	 * Parses attribute elements from the main entity.
	 */
	private parseAttributes(xml: string): ParsedAttribute[] {
		const attributes: ParsedAttribute[] = [];

		// Get content of main entity (before link-entities)
		const entityMatch = xml.match(
			/<entity[^>]*>([\s\S]*?)(?:<link-entity|<\/entity>)/i
		);
		const entityContent = entityMatch?.[1] ?? '';

		// Parse attribute elements
		const attrPattern =
			/<attribute\s+([^>]*?)(?:\/>|>)/gi;
		let match;

		while ((match = attrPattern.exec(entityContent)) !== null) {
			const attrString = match[1] ?? '';
			const name = this.extractAttrValue(attrString, 'name');
			const alias = this.extractAttrValue(attrString, 'alias');
			const aggregate = this.extractAttrValue(attrString, 'aggregate');
			const groupbyStr = this.extractAttrValue(attrString, 'groupby');
			const distinctStr = this.extractAttrValue(attrString, 'distinct');

			if (name) {
				attributes.push({
					name,
					alias,
					aggregate,
					groupby: groupbyStr?.toLowerCase() === 'true',
					distinct: distinctStr?.toLowerCase() === 'true',
				});
			}
		}

		return attributes;
	}

	/**
	 * Extracts attribute value from an attribute string.
	 */
	private extractAttrValue(
		attrString: string,
		attrName: string
	): string | undefined {
		// Try double-quoted value first, then single-quoted
		// This correctly handles apostrophes in double-quoted values like value="O'Brien"
		const doubleQuotePattern = new RegExp(
			`${attrName}\\s*=\\s*"([^"]*)"`,
			'i'
		);
		const doubleMatch = attrString.match(doubleQuotePattern);
		if (doubleMatch) {
			return doubleMatch[1];
		}

		const singleQuotePattern = new RegExp(
			`${attrName}\\s*=\\s*'([^']*)'`,
			'i'
		);
		const singleMatch = attrString.match(singleQuotePattern);
		return singleMatch?.[1];
	}

	/**
	 * Parses link-entity elements.
	 */
	private parseLinkEntities(xml: string): ParsedLinkEntity[] {
		const linkEntities: ParsedLinkEntity[] = [];

		// Find all link-entity elements (simplified - doesn't handle nesting)
		const linkPattern =
			/<link-entity\s+([^>]*)>([\s\S]*?)<\/link-entity>/gi;
		let match;

		while ((match = linkPattern.exec(xml)) !== null) {
			const attrString = match[1] ?? '';
			const content = match[2] ?? '';

			const name = this.extractAttrValue(attrString, 'name');
			const from = this.extractAttrValue(attrString, 'from');
			const to = this.extractAttrValue(attrString, 'to');
			const alias = this.extractAttrValue(attrString, 'alias');
			const linkType = this.extractAttrValue(attrString, 'link-type') ?? 'inner';

			if (name && from && to) {
				// Parse attributes within link-entity
				const attributes = this.parseLinkEntityAttributes(content);

				linkEntities.push({
					name,
					from,
					to,
					alias,
					linkType,
					attributes,
				});
			}
		}

		return linkEntities;
	}

	/**
	 * Parses attributes within a link-entity.
	 */
	private parseLinkEntityAttributes(content: string): ParsedAttribute[] {
		const attributes: ParsedAttribute[] = [];

		// Check for all-attributes
		if (/<all-attributes\s*\/?>/i.test(content)) {
			// Return empty to indicate SELECT * for this entity
			return [];
		}

		const attrPattern = /<attribute\s+([^>]*?)(?:\/>|>)/gi;
		let match;

		while ((match = attrPattern.exec(content)) !== null) {
			const attrString = match[1] ?? '';
			const name = this.extractAttrValue(attrString, 'name');
			const alias = this.extractAttrValue(attrString, 'alias');

			if (name) {
				attributes.push({ name, alias });
			}
		}

		return attributes;
	}

	/**
	 * Parses filter element from FetchXML.
	 * Note: Nested filters are flattened - all conditions are extracted
	 * and joined with the parent filter's type (AND/OR).
	 */
	private parseFilter(xml: string): ParsedFilter | null {
		// Find the first filter element in the main entity
		const filterMatch = xml.match(
			/<filter([^>]*)>([\s\S]*)<\/filter>/i
		);

		if (!filterMatch) {
			return null;
		}

		const attrString = filterMatch[1] ?? '';
		const content = filterMatch[2] ?? '';

		const filterType =
			(this.extractAttrValue(attrString, 'type')?.toLowerCase() as
				| 'and'
				| 'or') ?? 'and';

		// Parse all conditions (including those in nested filters)
		const conditions = this.parseConditions(content);

		return {
			type: filterType,
			conditions,
		};
	}

	/**
	 * Parses condition elements.
	 */
	private parseConditions(content: string): ParsedCondition[] {
		const conditions: ParsedCondition[] = [];

		// Parse simple conditions (not inside nested filters)
		const conditionPattern =
			/<condition\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/condition>)/gi;
		let match;

		while ((match = conditionPattern.exec(content)) !== null) {
			const attrString = match[1] ?? '';
			const innerContent = match[2];

			const attribute = this.extractAttrValue(attrString, 'attribute');
			const operator = this.extractAttrValue(attrString, 'operator');
			const value = this.extractAttrValue(attrString, 'value');

			if (attribute && operator) {
				const condition: ParsedCondition = { attribute, operator };

				if (value !== undefined) {
					condition.value = value;
				}

				// Parse values for IN operator
				if (innerContent) {
					const values = this.parseConditionValues(innerContent);
					if (values.length > 0) {
						condition.values = values;
					}
				}

				conditions.push(condition);
			}
		}

		return conditions;
	}

	/**
	 * Parses value elements inside a condition.
	 */
	private parseConditionValues(content: string): string[] {
		const values: string[] = [];
		const valuePattern = /<value[^>]*>([^<]*)<\/value>/gi;
		let match;

		while ((match = valuePattern.exec(content)) !== null) {
			const value = match[1];
			if (value !== undefined) {
				values.push(value);
			}
		}

		return values;
	}

	/**
	 * Parses order elements.
	 */
	private parseOrders(xml: string): ParsedOrder[] {
		const orders: ParsedOrder[] = [];
		const orderPattern = /<order\s+([^>]*?)\/?>/gi;
		let match;

		while ((match = orderPattern.exec(xml)) !== null) {
			const attrString = match[1] ?? '';
			const attribute = this.extractAttrValue(attrString, 'attribute');
			const descendingStr = this.extractAttrValue(attrString, 'descending');

			if (attribute) {
				orders.push({
					attribute,
					descending: descendingStr?.toLowerCase() === 'true',
				});
			}
		}

		return orders;
	}

	/**
	 * Builds SQL from parsed FetchXML components.
	 */
	private buildSql(params: {
		entityName: string;
		top?: string | undefined;
		distinct?: boolean | undefined;
		hasAllAttributes: boolean;
		attributes: ParsedAttribute[];
		linkEntities: ParsedLinkEntity[];
		filter: ParsedFilter | null;
		orders: ParsedOrder[];
	}): string {
		const parts: string[] = [];

		// SELECT clause with optional DISTINCT
		if (params.distinct) {
			parts.push('SELECT DISTINCT');
		} else {
			parts.push('SELECT');
		}

		if (params.top) {
			parts.push(`TOP ${params.top}`);
		}

		// Columns (may include aggregate functions)
		const columns = this.buildColumnList(params);
		parts.push(columns);

		// FROM clause
		parts.push(`FROM ${params.entityName}`);

		// JOINs
		for (const link of params.linkEntities) {
			const joinType = link.linkType === 'outer' ? 'LEFT JOIN' : 'JOIN';
			const aliasClause = link.alias ? ` ${link.alias}` : '';
			parts.push(
				`${joinType} ${link.name}${aliasClause} ON ${link.alias ?? link.name}.${link.from} = ${params.entityName}.${link.to}`
			);
		}

		// WHERE clause
		if (params.filter) {
			const whereClause = this.buildWhereClause(params.filter);
			if (whereClause) {
				parts.push(`WHERE ${whereClause}`);
			}
		}

		// GROUP BY clause - include columns marked with groupby=true
		const groupByColumns = params.attributes.filter((attr) => attr.groupby);
		if (groupByColumns.length > 0) {
			const groupByList = groupByColumns.map((attr) => attr.name).join(', ');
			parts.push(`GROUP BY ${groupByList}`);
		}

		// ORDER BY clause
		if (params.orders.length > 0) {
			const orderClauses = params.orders.map(
				(o) => `${o.attribute} ${o.descending ? 'DESC' : 'ASC'}`
			);
			parts.push(`ORDER BY ${orderClauses.join(', ')}`);
		}

		return parts.join(' ');
	}

	/**
	 * Builds the column list for SELECT.
	 * Handles regular columns and aggregate functions.
	 */
	private buildColumnList(params: {
		hasAllAttributes: boolean;
		attributes: ParsedAttribute[];
		linkEntities: ParsedLinkEntity[];
	}): string {
		if (params.hasAllAttributes && params.linkEntities.length === 0) {
			return '*';
		}

		const columns: string[] = [];

		// Main entity columns
		if (params.hasAllAttributes) {
			columns.push('*');
		} else {
			for (const attr of params.attributes) {
				const columnExpr = this.buildColumnExpression(attr);
				columns.push(columnExpr);
			}
		}

		// Link entity columns
		for (const link of params.linkEntities) {
			const prefix = link.alias ?? link.name;
			if (link.attributes.length === 0) {
				columns.push(`${prefix}.*`);
			} else {
				for (const attr of link.attributes) {
					const col = `${prefix}.${attr.name}`;
					if (attr.alias) {
						columns.push(`${col} AS ${attr.alias}`);
					} else {
						columns.push(col);
					}
				}
			}
		}

		return columns.length > 0 ? columns.join(', ') : '*';
	}

	/**
	 * Builds a single column expression, wrapping in aggregate function if needed.
	 */
	private buildColumnExpression(attr: ParsedAttribute): string {
		let expr: string;

		if (attr.aggregate) {
			// Build aggregate function expression
			expr = this.buildAggregateExpression(attr);
		} else {
			// Regular column reference
			expr = attr.name;
		}

		// Add alias if present
		if (attr.alias) {
			return `${expr} AS ${attr.alias}`;
		}

		return expr;
	}

	/**
	 * Builds an aggregate function expression.
	 * Maps FetchXML aggregate types to SQL aggregate functions.
	 */
	private buildAggregateExpression(attr: ParsedAttribute): string {
		const aggType = attr.aggregate?.toLowerCase();
		const distinctKeyword = attr.distinct ? 'DISTINCT ' : '';

		switch (aggType) {
			case 'count':
				// In FetchXML, aggregate="count" is used for COUNT(*)
				// The column name is just a placeholder (usually the primary key)
				return 'COUNT(*)';

			case 'countcolumn':
				// COUNT(column) - counts non-null values
				return `COUNT(${distinctKeyword}${attr.name})`;

			case 'sum':
				return `SUM(${distinctKeyword}${attr.name})`;

			case 'avg':
				return `AVG(${distinctKeyword}${attr.name})`;

			case 'min':
				return `MIN(${attr.name})`;

			case 'max':
				return `MAX(${attr.name})`;

			default:
				// Unknown aggregate, just use the column name
				return attr.name;
		}
	}

	/**
	 * Builds WHERE clause from filter.
	 */
	private buildWhereClause(filter: ParsedFilter): string {
		const parts: string[] = [];

		// Build conditions
		for (const condition of filter.conditions) {
			const conditionSql = this.buildConditionSql(condition);
			if (conditionSql) {
				parts.push(conditionSql);
			}
		}

		const connector = filter.type === 'or' ? ' OR ' : ' AND ';
		return parts.join(connector);
	}

	/**
	 * Builds SQL for a single condition.
	 */
	private buildConditionSql(condition: ParsedCondition): string {
		const attr = condition.attribute;
		const op = condition.operator.toLowerCase();
		const value = condition.value;

		switch (op) {
			case 'eq':
				return `${attr} = ${this.formatValue(value)}`;
			case 'ne':
				return `${attr} <> ${this.formatValue(value)}`;
			case 'lt':
				return `${attr} < ${this.formatValue(value)}`;
			case 'le':
				return `${attr} <= ${this.formatValue(value)}`;
			case 'gt':
				return `${attr} > ${this.formatValue(value)}`;
			case 'ge':
				return `${attr} >= ${this.formatValue(value)}`;
			case 'like':
				return `${attr} LIKE ${this.formatValue(value)}`;
			case 'not-like':
				return `${attr} NOT LIKE ${this.formatValue(value)}`;
			case 'begins-with':
				return `${attr} LIKE ${this.formatValue((value ?? '') + '%')}`;
			case 'not-begin-with':
				return `${attr} NOT LIKE ${this.formatValue((value ?? '') + '%')}`;
			case 'ends-with':
				return `${attr} LIKE ${this.formatValue('%' + (value ?? ''))}`;
			case 'not-end-with':
				return `${attr} NOT LIKE ${this.formatValue('%' + (value ?? ''))}`;
			case 'null':
				return `${attr} IS NULL`;
			case 'not-null':
				return `${attr} IS NOT NULL`;
			case 'in':
				if (condition.values && condition.values.length > 0) {
					const vals = condition.values.map((v) => this.formatValue(v)).join(', ');
					return `${attr} IN (${vals})`;
				}
				return `${attr} IN (${this.formatValue(value)})`;
			case 'not-in':
				if (condition.values && condition.values.length > 0) {
					const vals = condition.values.map((v) => this.formatValue(v)).join(', ');
					return `${attr} NOT IN (${vals})`;
				}
				return `${attr} NOT IN (${this.formatValue(value)})`;
			default:
				// For unknown operators, try a basic format
				return `${attr} ${op.toUpperCase()} ${this.formatValue(value)}`;
		}
	}

	/**
	 * Formats a value for SQL output.
	 */
	private formatValue(value: string | undefined): string {
		if (value === undefined) {
			return "''";
		}

		// Check if it's a number
		if (/^-?\d+(\.\d+)?$/.test(value)) {
			return value;
		}

		// Escape single quotes and wrap in quotes
		return `'${value.replace(/'/g, "''")}'`;
	}
}
