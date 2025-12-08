/**
 * Domain Service: FetchXML Generator
 *
 * Generates a FetchXML string from a VisualQuery domain object.
 * Produces well-formatted, human-readable FetchXML.
 *
 * Output Characteristics:
 * - Proper indentation (2 spaces)
 * - XML-escaped values
 * - Self-closing tags where appropriate
 * - Consistent attribute ordering
 */

import { QueryCondition } from '../valueObjects/QueryCondition';
import { QueryFilterGroup } from '../valueObjects/QueryFilterGroup';
import { type ColumnSelection, VisualQuery } from '../valueObjects/VisualQuery';

/**
 * Generates FetchXML strings from VisualQuery domain objects.
 */
export class FetchXmlGenerator {
	/** Indentation string (2 spaces) */
	private static readonly INDENT = '  ';

	/**
	 * Generates FetchXML from a VisualQuery.
	 *
	 * @param query - The VisualQuery to generate FetchXML from
	 * @returns Well-formatted FetchXML string
	 */
	public generate(query: VisualQuery): string {
		const lines: string[] = [];

		// Generate <fetch> opening tag
		lines.push(this.generateFetchOpen(query));

		// Generate <entity> with content
		const entityIndent = FetchXmlGenerator.INDENT;
		lines.push(`${entityIndent}<entity name="${this.escapeXml(query.entityName)}">`);

		// Generate columns
		const columnIndent = entityIndent + FetchXmlGenerator.INDENT;
		lines.push(...this.generateColumns(query.columns, columnIndent));

		// Generate filter
		if (query.filter !== null && !query.filter.isEmpty()) {
			lines.push(...this.generateFilter(query.filter, columnIndent));
		}

		// Generate orders
		lines.push(...this.generateOrders(query.sorts, columnIndent));

		// Close entity and fetch
		lines.push(`${entityIndent}</entity>`);
		lines.push('</fetch>');

		return lines.join('\n');
	}

	/**
	 * Generates the opening <fetch> tag with attributes.
	 */
	private generateFetchOpen(query: VisualQuery): string {
		const attrs: string[] = [];

		if (query.top !== null) {
			attrs.push(`top="${query.top}"`);
		}

		if (query.distinct) {
			attrs.push('distinct="true"');
		}

		if (attrs.length > 0) {
			return `<fetch ${attrs.join(' ')}>`;
		}

		return '<fetch>';
	}

	/**
	 * Generates column elements.
	 */
	private generateColumns(columns: ColumnSelection, indent: string): string[] {
		if (columns.kind === 'all') {
			return [`${indent}<all-attributes />`];
		}

		const lines: string[] = [];

		for (const column of columns.columns) {
			if (column.alias !== null) {
				lines.push(
					`${indent}<attribute name="${this.escapeXml(column.name)}" alias="${this.escapeXml(column.alias)}" />`
				);
			} else {
				lines.push(`${indent}<attribute name="${this.escapeXml(column.name)}" />`);
			}
		}

		return lines;
	}

	/**
	 * Generates filter element with conditions.
	 */
	private generateFilter(filter: QueryFilterGroup, indent: string): string[] {
		const lines: string[] = [];

		// Opening filter tag
		lines.push(`${indent}<filter type="${filter.type}">`);

		const conditionIndent = indent + FetchXmlGenerator.INDENT;

		// Generate conditions
		for (const condition of filter.conditions) {
			lines.push(...this.generateCondition(condition, conditionIndent));
		}

		// Generate nested filter groups
		for (const nestedGroup of filter.nestedGroups) {
			lines.push(...this.generateFilter(nestedGroup, conditionIndent));
		}

		// Closing filter tag
		lines.push(`${indent}</filter>`);

		return lines;
	}

	/**
	 * Generates a condition element.
	 */
	private generateCondition(condition: QueryCondition, indent: string): string[] {
		const lines: string[] = [];

		// Build base attributes
		let attrs = `attribute="${this.escapeXml(condition.attribute)}" operator="${condition.operator}"`;

		// Handle different value types
		if (condition.value === null) {
			// Null operators - self-closing tag
			lines.push(`${indent}<condition ${attrs} />`);
		} else if (Array.isArray(condition.value)) {
			// IN/NOT IN operators - nested value elements
			lines.push(`${indent}<condition ${attrs}>`);
			const valueIndent = indent + FetchXmlGenerator.INDENT;
			for (const value of condition.value) {
				lines.push(`${valueIndent}<value>${this.escapeXml(value)}</value>`);
			}
			lines.push(`${indent}</condition>`);
		} else {
			// Single value operators
			attrs += ` value="${this.escapeXml(condition.value)}"`;
			lines.push(`${indent}<condition ${attrs} />`);
		}

		return lines;
	}

	/**
	 * Generates order elements.
	 */
	private generateOrders(sorts: readonly import('../valueObjects/QuerySort').QuerySort[], indent: string): string[] {
		const lines: string[] = [];

		for (const sort of sorts) {
			const attrs = `attribute="${this.escapeXml(sort.attribute)}" descending="${sort.descending}"`;
			lines.push(`${indent}<order ${attrs} />`);
		}

		return lines;
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
}
