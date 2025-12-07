/**
 * The type of FetchXML context at the cursor position.
 * Used to determine what type of completions to offer.
 *
 * - element: Suggest valid child elements based on parent
 * - attribute-name: Suggest valid attribute names for current element
 * - attribute-value: Suggest values for the current attribute
 * - none: No suggestions (e.g., inside text content, unknown context)
 */
export type FetchXmlCompletionContext =
	| { kind: 'element'; parentElement: string | null; suggestedElements: readonly string[] }
	| { kind: 'attribute-name'; element: string; suggestedAttributes: readonly string[] }
	| { kind: 'attribute-value'; element: string; attribute: string; entityContext: string | null }
	| { kind: 'none' };

/**
 * Tracks the current position within FetchXML elements.
 * Used to determine entity context for attribute suggestions.
 */
export interface FetchXmlElementContext {
	/** The current element tag name (e.g., 'entity', 'attribute', 'filter') */
	element: string;
	/** The entity name if we're inside an entity or link-entity element */
	entityName: string | null;
}

/**
 * Domain Service: FetchXML Context Detector
 *
 * Analyzes FetchXML text and cursor position to determine what type
 * of completions should be offered. This is pure domain logic with
 * no external dependencies.
 *
 * Business Rules:
 * - Inside `<entity name="...">`: suggest entity names
 * - Inside `<attribute name="...">`: suggest attribute names for current entity
 * - Inside `<condition attribute="...">`: suggest attribute names
 * - Inside `<condition operator="...">`: suggest operators
 * - After `<`: suggest valid child elements based on parent
 * - Inside element tag: suggest valid attributes for that element
 */
export class FetchXmlContextDetector {
	// =========================================================================
	// FetchXML Element Hierarchy - Valid children for each element
	// =========================================================================

	/** Elements valid at root level (inside fetch) */
	private static readonly FETCH_CHILDREN: readonly string[] = ['entity'];

	/** Elements valid inside <entity> */
	private static readonly ENTITY_CHILDREN: readonly string[] = [
		'attribute',
		'all-attributes',
		'order',
		'filter',
		'link-entity',
	];

	/** Elements valid inside <link-entity> (same as entity) */
	private static readonly LINK_ENTITY_CHILDREN: readonly string[] = [
		'attribute',
		'all-attributes',
		'order',
		'filter',
		'link-entity',
	];

	/** Elements valid inside <filter> */
	private static readonly FILTER_CHILDREN: readonly string[] = ['condition', 'filter'];

	// =========================================================================
	// FetchXML Attribute Definitions - Valid attributes for each element
	// =========================================================================

	/** Attributes for <fetch> element */
	private static readonly FETCH_ATTRIBUTES: readonly string[] = [
		'version',
		'mapping',
		'output-format',
		'count',
		'page',
		'paging-cookie',
		'top',
		'distinct',
		'aggregate',
		'no-lock',
		'returntotalrecordcount',
	];

	/** Attributes for <entity> element */
	private static readonly ENTITY_ATTRIBUTES: readonly string[] = ['name', 'enableprefiltering'];

	/** Attributes for <attribute> element */
	private static readonly ATTRIBUTE_ATTRIBUTES: readonly string[] = [
		'name',
		'alias',
		'aggregate',
		'groupby',
		'distinct',
		'dategrouping',
	];

	/** Attributes for <order> element */
	private static readonly ORDER_ATTRIBUTES: readonly string[] = [
		'attribute',
		'alias',
		'descending',
	];

	/** Attributes for <filter> element */
	private static readonly FILTER_ATTRIBUTES: readonly string[] = ['type', 'isquickfindfields'];

	/** Attributes for <condition> element */
	private static readonly CONDITION_ATTRIBUTES: readonly string[] = [
		'attribute',
		'operator',
		'value',
		'entityname',
		'column',
		'aggregate',
	];

	/** Attributes for <link-entity> element */
	private static readonly LINK_ENTITY_ATTRIBUTES: readonly string[] = [
		'name',
		'from',
		'to',
		'alias',
		'link-type',
		'visible',
		'intersect',
		'enableprefiltering',
	];

	// =========================================================================
	// FetchXML Operators - Condition operators
	// =========================================================================

	/** All supported condition operators */
	public static readonly CONDITION_OPERATORS: readonly string[] = [
		// Comparison operators
		'eq',
		'ne',
		'gt',
		'ge',
		'lt',
		'le',
		// String operators
		'like',
		'not-like',
		'begins-with',
		'not-begin-with',
		'ends-with',
		'not-end-with',
		// Collection operators
		'in',
		'not-in',
		'between',
		'not-between',
		// Null operators
		'null',
		'not-null',
		// Date operators
		'today',
		'yesterday',
		'tomorrow',
		'this-week',
		'this-month',
		'this-year',
		'this-fiscal-year',
		'this-fiscal-period',
		'last-week',
		'last-month',
		'last-year',
		'last-x-days',
		'last-x-weeks',
		'last-x-months',
		'last-x-years',
		'next-week',
		'next-month',
		'next-year',
		'next-x-days',
		'next-x-weeks',
		'next-x-months',
		'next-x-years',
		'olderthan-x-days',
		'olderthan-x-weeks',
		'olderthan-x-months',
		'olderthan-x-years',
		'on',
		'on-or-before',
		'on-or-after',
		// User operators
		'eq-userid',
		'ne-userid',
		'eq-userteams',
		'eq-useroruserteams',
		'eq-useroruserhierarchy',
		'eq-useroruserhierarchyandteams',
		'eq-businessid',
		'ne-businessid',
		// Hierarchy operators
		'above',
		'under',
		'not-under',
		'eq-or-above',
		'eq-or-under',
		// Other operators
		'contain-values',
		'not-contain-values',
	];

	// =========================================================================
	// Filter Type Values
	// =========================================================================

	/** Valid values for filter type attribute */
	public static readonly FILTER_TYPES: readonly string[] = ['and', 'or'];

	/** Valid values for link-type attribute */
	public static readonly LINK_TYPES: readonly string[] = ['inner', 'outer', 'natural', 'any', 'not any', 'all', 'not all', 'exists', 'not exists'];

	/** Valid values for boolean attributes */
	public static readonly BOOLEAN_VALUES: readonly string[] = ['true', 'false'];

	/** Valid values for aggregate attribute */
	public static readonly AGGREGATE_FUNCTIONS: readonly string[] = [
		'count',
		'countcolumn',
		'sum',
		'avg',
		'min',
		'max',
	];

	/** Valid values for dategrouping attribute */
	public static readonly DATE_GROUPINGS: readonly string[] = [
		'day',
		'week',
		'month',
		'quarter',
		'year',
		'fiscal-period',
		'fiscal-year',
	];

	// =========================================================================
	// Public API
	// =========================================================================

	/**
	 * Detects the completion context based on FetchXML text and cursor position.
	 *
	 * @param xml - The full FetchXML text
	 * @param cursorOffset - Character offset of cursor in the text
	 * @returns The detected completion context
	 */
	public detectContext(xml: string, cursorOffset: number): FetchXmlCompletionContext {
		const textBeforeCursor = xml.substring(0, cursorOffset);

		// Check if we're inside a string (attribute value) - handle separately
		const attrValueContext = this.detectAttributeValueContext(textBeforeCursor);
		if (attrValueContext !== null) {
			return attrValueContext;
		}

		// Check if we're typing an attribute name (inside an element tag)
		const attrNameContext = this.detectAttributeNameContext(textBeforeCursor);
		if (attrNameContext !== null) {
			return attrNameContext;
		}

		// Check if we're after < (element start)
		const elementContext = this.detectElementContext(textBeforeCursor);
		if (elementContext !== null) {
			return elementContext;
		}

		return { kind: 'none' };
	}

	/**
	 * Extracts the current entity context from FetchXML.
	 * Walks through the element hierarchy to find the nearest entity or link-entity.
	 *
	 * @param xml - The FetchXML text up to cursor
	 * @returns The entity logical name if found, null otherwise
	 */
	public extractEntityContext(xml: string): string | null {
		// Find the most recent unclosed entity or link-entity element
		const entityStack: string[] = [];

		// Match all opening and closing entity/link-entity tags
		const tagPattern = /<(\/?)(?:entity|link-entity)(?:\s+[^>]*name\s*=\s*["']([^"']*)["'])?[^>]*>/gi;
		let match: RegExpExecArray | null;

		while ((match = tagPattern.exec(xml)) !== null) {
			const isClosing = match[1] === '/';
			const entityName = match[2];

			if (isClosing) {
				// Pop the last entity from stack
				entityStack.pop();
			} else if (entityName !== undefined && entityName !== '') {
				// Push entity name onto stack
				entityStack.push(entityName);
			}
		}

		// Return the topmost (most recent) entity in the stack
		const topEntity = entityStack[entityStack.length - 1];
		return topEntity !== undefined ? topEntity : null;
	}

	// =========================================================================
	// Context Detection Methods
	// =========================================================================

	/**
	 * Detects if cursor is in an attribute value position.
	 * Returns attribute-value context with element, attribute name, and entity context.
	 */
	private detectAttributeValueContext(textBeforeCursor: string): FetchXmlCompletionContext | null {
		// Check if we're inside an attribute value (after ="  and not closed)
		// Pattern: <element ... attr="partial
		const attrValuePattern = /<(\w[\w-]*)\s+[^>]*?(\w[\w-]*)\s*=\s*"([^"]*)$/;
		const match = attrValuePattern.exec(textBeforeCursor);

		if (match === null) {
			return null;
		}

		const element = match[1];
		const attribute = match[2];

		// Type safety: regex groups should always exist when match succeeds
		if (element === undefined || attribute === undefined) {
			return null;
		}

		const entityContext = this.extractEntityContext(textBeforeCursor);

		return {
			kind: 'attribute-value',
			element,
			attribute,
			entityContext,
		};
	}

	/**
	 * Detects if cursor is in an attribute name position.
	 * Returns the element name and suggested attributes.
	 */
	private detectAttributeNameContext(textBeforeCursor: string): FetchXmlCompletionContext | null {
		// Check if we're inside an element tag after the element name
		// Pattern: <element ... (space after element name or existing attribute)
		// Not inside an attribute value (no unclosed quote)

		// First, check we're in an unclosed tag
		const lastOpenBracket = textBeforeCursor.lastIndexOf('<');
		if (lastOpenBracket === -1) {
			return null;
		}

		const tagContent = textBeforeCursor.substring(lastOpenBracket);

		// If tag is closed or is a closing tag, not in attribute context
		if (tagContent.includes('>') || tagContent.startsWith('</')) {
			return null;
		}

		// Check for unclosed attribute value (inside quotes)
		const quoteCount = (tagContent.match(/"/g) ?? []).length;
		if (quoteCount % 2 === 1) {
			// Inside an attribute value
			return null;
		}

		// Extract element name from the tag
		const elementMatch = /<(\w[\w-]*)/.exec(tagContent);
		if (elementMatch === null) {
			return null;
		}

		const element = elementMatch[1];

		// Type safety: regex group should always exist when match succeeds
		if (element === undefined) {
			return null;
		}

		// Check if we're positioned after a space (ready to type attribute)
		// Must have whitespace after element name - NOT just end of string
		// (end of string means we're still typing the element name)
		const afterElementPattern = /<\w[\w-]*\s/;
		if (!afterElementPattern.test(tagContent)) {
			return null;
		}

		// Get suggested attributes for this element
		const suggestedAttributes = this.getAttributesForElement(element);

		// Filter out attributes already present
		const existingAttrs = this.extractExistingAttributes(tagContent);
		const filteredAttributes = suggestedAttributes.filter(
			attr => !existingAttrs.includes(attr.toLowerCase())
		);

		return {
			kind: 'attribute-name',
			element,
			suggestedAttributes: filteredAttributes,
		};
	}

	/**
	 * Detects if cursor is in an element start position (after <).
	 */
	private detectElementContext(textBeforeCursor: string): FetchXmlCompletionContext | null {
		// Check if cursor is right after < or <partial
		const elementStartPattern = /<(\w*)$/;
		const match = elementStartPattern.exec(textBeforeCursor);

		if (match === null) {
			return null;
		}

		// Find the parent element to determine valid children
		const parentElement = this.findParentElement(textBeforeCursor.substring(0, textBeforeCursor.length - match[0].length));
		const suggestedElements = this.getChildElementsForParent(parentElement);

		return {
			kind: 'element',
			parentElement,
			suggestedElements,
		};
	}

	// =========================================================================
	// Helper Methods
	// =========================================================================

	/**
	 * Gets valid attribute names for an element.
	 */
	private getAttributesForElement(element: string): readonly string[] {
		const lowerElement = element.toLowerCase();

		switch (lowerElement) {
			case 'fetch':
				return FetchXmlContextDetector.FETCH_ATTRIBUTES;
			case 'entity':
				return FetchXmlContextDetector.ENTITY_ATTRIBUTES;
			case 'attribute':
				return FetchXmlContextDetector.ATTRIBUTE_ATTRIBUTES;
			case 'order':
				return FetchXmlContextDetector.ORDER_ATTRIBUTES;
			case 'filter':
				return FetchXmlContextDetector.FILTER_ATTRIBUTES;
			case 'condition':
				return FetchXmlContextDetector.CONDITION_ATTRIBUTES;
			case 'link-entity':
				return FetchXmlContextDetector.LINK_ENTITY_ATTRIBUTES;
			case 'all-attributes':
				return []; // No attributes
			default:
				return [];
		}
	}

	/**
	 * Gets valid child elements for a parent element.
	 */
	private getChildElementsForParent(parentElement: string | null): readonly string[] {
		if (parentElement === null) {
			// Root level - only fetch is valid
			return ['fetch'];
		}

		const lowerParent = parentElement.toLowerCase();

		switch (lowerParent) {
			case 'fetch':
				return FetchXmlContextDetector.FETCH_CHILDREN;
			case 'entity':
				return FetchXmlContextDetector.ENTITY_CHILDREN;
			case 'link-entity':
				return FetchXmlContextDetector.LINK_ENTITY_CHILDREN;
			case 'filter':
				return FetchXmlContextDetector.FILTER_CHILDREN;
			default:
				return [];
		}
	}

	/**
	 * Finds the parent element by parsing unclosed tags.
	 */
	private findParentElement(textBeforeCursor: string): string | null {
		const elementStack: string[] = [];

		// Match opening and closing tags
		// Opening: <element or <element attr="value"
		// Closing: </element>
		// Self-closing: <element ... />
		// Pattern breakdown:
		// - < literal open bracket
		// - (\/?) capture group 1: optional / for closing tags
		// - (\w[\w-]*) capture group 2: element name
		// - (?:\s[^>]*)? non-capturing: optional attributes (space followed by non-> chars)
		// - \/? optional / for self-closing (detected via endsWith)
		// - > literal close bracket
		const tagPattern = /<(\/?)(\w[\w-]*)(?:\s[^>]*)?\/?>/g;
		let match: RegExpExecArray | null;

		while ((match = tagPattern.exec(textBeforeCursor)) !== null) {
			const isClosing = match[1] === '/';
			const elementName = match[2];
			const isSelfClosing = match[0].endsWith('/>');

			if (isClosing) {
				// Pop from stack
				elementStack.pop();
			} else if (!isSelfClosing && elementName !== undefined) {
				// Push to stack (only non-self-closing tags)
				elementStack.push(elementName);
			}
		}

		const topElement = elementStack[elementStack.length - 1];
		return topElement !== undefined ? topElement : null;
	}

	/**
	 * Extracts attribute names already present in a tag.
	 */
	private extractExistingAttributes(tagContent: string): string[] {
		const attrPattern = /(\w[\w-]*)\s*=/g;
		const attrs: string[] = [];
		let match: RegExpExecArray | null;

		while ((match = attrPattern.exec(tagContent)) !== null) {
			const attrName = match[1];
			if (attrName !== undefined) {
				attrs.push(attrName.toLowerCase());
			}
		}

		return attrs;
	}

	// =========================================================================
	// Utility Methods for Use Cases
	// =========================================================================

	/**
	 * Returns all condition operators.
	 */
	public getOperators(): readonly string[] {
		return FetchXmlContextDetector.CONDITION_OPERATORS;
	}

	/**
	 * Returns filter type values.
	 */
	public getFilterTypes(): readonly string[] {
		return FetchXmlContextDetector.FILTER_TYPES;
	}

	/**
	 * Returns link type values.
	 */
	public getLinkTypes(): readonly string[] {
		return FetchXmlContextDetector.LINK_TYPES;
	}

	/**
	 * Returns boolean values.
	 */
	public getBooleanValues(): readonly string[] {
		return FetchXmlContextDetector.BOOLEAN_VALUES;
	}

	/**
	 * Returns aggregate functions.
	 */
	public getAggregateFunctions(): readonly string[] {
		return FetchXmlContextDetector.AGGREGATE_FUNCTIONS;
	}

	/**
	 * Returns date grouping values.
	 */
	public getDateGroupings(): readonly string[] {
		return FetchXmlContextDetector.DATE_GROUPINGS;
	}
}
