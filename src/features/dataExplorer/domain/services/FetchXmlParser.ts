/**
 * Domain Service: FetchXML Parser
 *
 * Parses a FetchXML string into a VisualQuery domain object.
 * Uses regex-based parsing consistent with existing transpilers.
 *
 * Supported FetchXML Elements:
 * - <fetch top="..." distinct="..."> - query options
 * - <entity name="..."> - main entity
 * - <attribute name="..." alias="..."> - column selection
 * - <all-attributes /> - select all columns
 * - <filter type="and|or"> - filter groups (including nested)
 * - <condition attribute="..." operator="..." value="..."> - conditions
 *   - <value> child elements for IN operator
 * - <order attribute="..." descending="..."> - sorting
 *
 * NOT Supported (Phase 2):
 * - <link-entity> - joins
 * - aggregate="true" and groupby - aggregates
 */

import { FetchXmlParseError } from '../errors/FetchXmlParseError';
import {
	type FetchXmlConditionOperator,
	isValidOperator,
} from '../valueObjects/FetchXmlOperator';
import { QueryColumn } from '../valueObjects/QueryColumn';
import { QueryCondition } from '../valueObjects/QueryCondition';
import {
	type FilterGroupType,
	QueryFilterGroup,
} from '../valueObjects/QueryFilterGroup';
import { QuerySort } from '../valueObjects/QuerySort';
import {
	type ColumnSelection,
	VisualQuery,
} from '../valueObjects/VisualQuery';

/**
 * Parses FetchXML strings into VisualQuery domain objects.
 */
export class FetchXmlParser {
	/**
	 * Parses FetchXML string into a VisualQuery.
	 *
	 * @param fetchXml - The FetchXML string to parse
	 * @returns VisualQuery domain object
	 * @throws FetchXmlParseError if parsing fails
	 */
	public parse(fetchXml: string): VisualQuery {
		const trimmed = fetchXml.trim();

		if (trimmed === '') {
			throw FetchXmlParseError.invalidStructure('FetchXML cannot be empty', fetchXml);
		}

		// Validate basic structure
		if (!/<fetch[\s>]/i.test(trimmed)) {
			throw FetchXmlParseError.missingElement('fetch', fetchXml);
		}

		// Extract fetch element attributes
		const { top, distinct } = this.extractFetchAttributes(trimmed);

		// Extract entity name
		const entityName = this.extractEntityName(trimmed, fetchXml);

		// Extract columns
		const columns = this.extractColumns(trimmed);

		// Extract filter
		const filter = this.extractFilter(trimmed, fetchXml);

		// Extract orders
		const sorts = this.extractOrders(trimmed);

		return new VisualQuery(entityName, columns, filter, sorts, top, distinct);
	}

	/**
	 * Extracts fetch element attributes (top, distinct).
	 */
	private extractFetchAttributes(xml: string): { top: number | null; distinct: boolean } {
		const topStr = this.extractAttribute(xml, 'fetch', 'top');
		const top = topStr !== undefined ? parseInt(topStr, 10) : null;

		const distinctStr = this.extractAttribute(xml, 'fetch', 'distinct');
		const distinct = distinctStr?.toLowerCase() === 'true';

		return { top: top !== null && !isNaN(top) ? top : null, distinct };
	}

	/**
	 * Extracts the entity name from the FetchXML.
	 */
	private extractEntityName(xml: string, fetchXml: string): string {
		const entityName = this.extractAttribute(xml, 'entity', 'name');
		if (entityName === undefined || entityName.trim() === '') {
			throw FetchXmlParseError.missingElement('entity', fetchXml);
		}
		return entityName;
	}

	/**
	 * Extracts columns from the FetchXML.
	 */
	private extractColumns(xml: string): ColumnSelection {
		// Get content of main entity (before link-entities)
		const entityMatch = xml.match(/<entity[^>]*>([\s\S]*?)(?:<link-entity|<\/entity>)/i);
		const entityContent = entityMatch?.[1] ?? '';

		// Check for all-attributes
		if (/<all-attributes\s*\/?>/i.test(entityContent)) {
			return { kind: 'all' };
		}

		// Parse individual attributes
		const columns: QueryColumn[] = [];
		const attrPattern = /<attribute\s+([^>]*?)(?:\/>|>)/gi;
		let match;

		while ((match = attrPattern.exec(entityContent)) !== null) {
			const attrString = match[1] ?? '';
			const name = this.extractAttrValue(attrString, 'name');
			const alias = this.extractAttrValue(attrString, 'alias');

			if (name !== undefined && name.trim() !== '') {
				columns.push(new QueryColumn(name, alias ?? null));
			}
		}

		// If no columns found, treat as all columns
		if (columns.length === 0) {
			return { kind: 'all' };
		}

		return { kind: 'specific', columns };
	}

	/**
	 * Extracts filter from the FetchXML.
	 */
	private extractFilter(xml: string, fetchXml: string): QueryFilterGroup | null {
		// Find the first filter element in the main entity
		const filterMatch = xml.match(/<filter([^>]*)>([\s\S]*?)<\/filter>/i);

		if (filterMatch === null) {
			return null;
		}

		const attrString = filterMatch[1] ?? '';
		const content = filterMatch[2] ?? '';
		const filterStartIndex = filterMatch.index ?? 0;

		const filterType = (this.extractAttrValue(attrString, 'type')?.toLowerCase() ?? 'and') as FilterGroupType;

		// Parse conditions
		const conditions = this.parseConditions(content, filterStartIndex, fetchXml);

		// Parse nested filter groups
		const nestedGroups = this.parseNestedFilters(content, filterStartIndex, fetchXml);

		if (conditions.length === 0 && nestedGroups.length === 0) {
			return null;
		}

		return new QueryFilterGroup(filterType, conditions, nestedGroups);
	}

	/**
	 * Parses conditions from filter content.
	 */
	private parseConditions(
		content: string,
		contentOffset: number,
		fetchXml: string
	): QueryCondition[] {
		const conditions: QueryCondition[] = [];

		// Match conditions that are NOT inside nested <filter> elements
		// This is a simplified approach - for complex nested filters, we handle them separately
		const conditionPattern = /<condition\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/condition>)/gi;
		let match;

		while ((match = conditionPattern.exec(content)) !== null) {
			const attrString = match[1] ?? '';
			const innerContent = match[2];
			const position = contentOffset + match.index;

			const attribute = this.extractAttrValue(attrString, 'attribute');
			const operatorStr = this.extractAttrValue(attrString, 'operator');
			const value = this.extractAttrValue(attrString, 'value');

			if (attribute === undefined || attribute.trim() === '') {
				throw FetchXmlParseError.missingAttribute('condition', 'attribute', position, fetchXml);
			}

			if (operatorStr === undefined || operatorStr.trim() === '') {
				throw FetchXmlParseError.missingAttribute('condition', 'operator', position, fetchXml);
			}

			if (!isValidOperator(operatorStr)) {
				throw FetchXmlParseError.invalidOperator(operatorStr, position, fetchXml);
			}

			const operator: FetchXmlConditionOperator = operatorStr;

			// Determine the value based on operator type
			const conditionValue = this.parseConditionValue(operator, value, innerContent);

			conditions.push(new QueryCondition(attribute, operator, conditionValue));
		}

		return conditions;
	}

	/**
	 * Parses the value for a condition based on operator type.
	 */
	private parseConditionValue(
		operator: FetchXmlConditionOperator,
		valueAttr: string | undefined,
		innerContent: string | undefined
	): string | string[] | null {
		// Null operators don't need values
		if (operator === 'null' || operator === 'not-null') {
			return null;
		}

		// IN/NOT IN operators use <value> children
		if (operator === 'in' || operator === 'not-in') {
			if (innerContent !== undefined) {
				const values = this.parseConditionValues(innerContent);
				if (values.length > 0) {
					return values;
				}
			}
			// Fallback to value attribute if no child elements
			if (valueAttr !== undefined) {
				return [valueAttr];
			}
			return [];
		}

		// Other operators use value attribute
		return valueAttr ?? '';
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
	 * Parses nested filter groups.
	 */
	private parseNestedFilters(
		content: string,
		contentOffset: number,
		fetchXml: string
	): QueryFilterGroup[] {
		const nestedGroups: QueryFilterGroup[] = [];

		// Find nested <filter> elements (filters inside the current filter)
		const nestedFilterPattern = /<filter([^>]*)>([\s\S]*?)<\/filter>/gi;
		let match;

		while ((match = nestedFilterPattern.exec(content)) !== null) {
			const attrString = match[1] ?? '';
			const nestedContent = match[2] ?? '';
			const nestedOffset = contentOffset + match.index;

			const filterType = (this.extractAttrValue(attrString, 'type')?.toLowerCase() ?? 'and') as FilterGroupType;

			// Parse conditions in nested filter
			const conditions = this.parseConditions(nestedContent, nestedOffset, fetchXml);

			// Recursively parse nested groups (for deeply nested filters)
			const deeperGroups = this.parseNestedFilters(nestedContent, nestedOffset, fetchXml);

			if (conditions.length > 0 || deeperGroups.length > 0) {
				nestedGroups.push(new QueryFilterGroup(filterType, conditions, deeperGroups));
			}
		}

		return nestedGroups;
	}

	/**
	 * Extracts order elements from the FetchXML.
	 */
	private extractOrders(xml: string): QuerySort[] {
		const sorts: QuerySort[] = [];
		const orderPattern = /<order\s+([^>]*?)\/?>/gi;
		let match;

		while ((match = orderPattern.exec(xml)) !== null) {
			const attrString = match[1] ?? '';
			const attribute = this.extractAttrValue(attrString, 'attribute');
			const descendingStr = this.extractAttrValue(attrString, 'descending');

			if (attribute !== undefined && attribute.trim() !== '') {
				const descending = descendingStr?.toLowerCase() === 'true';
				sorts.push(new QuerySort(attribute, descending));
			}
		}

		return sorts;
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
	 * Extracts an attribute value from an attribute string.
	 */
	private extractAttrValue(attrString: string, name: string): string | undefined {
		const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i');
		const match = attrString.match(pattern);
		return match?.[1];
	}
}
