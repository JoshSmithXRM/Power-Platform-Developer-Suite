/**
 * Domain Service: FetchXML Validator
 *
 * Validates FetchXML syntax and structure for Dataverse queries.
 * Uses string-based parsing to avoid external dependencies in domain layer.
 *
 * Business Rules:
 * - FetchXML must be well-formed XML
 * - Root element must be <fetch>
 * - Must have at least one <entity> child
 * - Known elements and attributes are validated
 */

/**
 * Result of FetchXML validation.
 */
export interface FetchXmlValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly FetchXmlValidationError[];
}

/**
 * Validation error with position information when available.
 */
export interface FetchXmlValidationError {
	readonly message: string;
	readonly line?: number;
	readonly column?: number;
}

/**
 * Valid FetchXML element names.
 */
const VALID_ELEMENTS = new Set([
	'fetch',
	'entity',
	'attribute',
	'all-attributes',
	'filter',
	'condition',
	'link-entity',
	'order',
	'value',
]);

/**
 * Required attributes for specific elements.
 * Note: 'order' is handled separately due to context-dependent requirements
 * (uses 'attribute' in regular queries, 'alias' in aggregate queries).
 */
const REQUIRED_ATTRIBUTES: Record<string, string[]> = {
	entity: ['name'],
	attribute: ['name'],
	condition: ['attribute', 'operator'],
	'link-entity': ['name', 'from', 'to'],
};

/**
 * Validates FetchXML strings for correctness and structure.
 */
export class FetchXmlValidator {
	/**
	 * Validates a FetchXML string.
	 *
	 * @param fetchXml - The FetchXML string to validate
	 * @returns Validation result with errors if any
	 */
	public validate(fetchXml: string): FetchXmlValidationResult {
		const errors: FetchXmlValidationError[] = [];

		// Check for empty input
		const trimmed = fetchXml.trim();
		if (trimmed === '') {
			return {
				isValid: false,
				errors: [{ message: 'FetchXML cannot be empty' }],
			};
		}

		// Strip XML comments for validation (but keep original for line numbers)
		const withoutComments = this.stripXmlComments(trimmed);

		// Check basic XML structure (on comment-stripped version)
		const structureErrors = this.validateXmlStructure(withoutComments);
		if (structureErrors.length > 0) {
			return { isValid: false, errors: structureErrors };
		}

		// Extract and validate root element (skip leading whitespace after comment removal)
		const rootMatch = withoutComments.trim().match(/^<(\w+)[\s>]/);
		if (!rootMatch || rootMatch[1]?.toLowerCase() !== 'fetch') {
			const foundTag = rootMatch ? rootMatch[1] : 'unknown';
			errors.push({
				message: `Root element must be <fetch>, found <${foundTag}>`,
				line: 1,
			});
			return { isValid: false, errors };
		}

		// Check for <entity> element
		if (!this.hasElement(withoutComments, 'entity')) {
			errors.push({
				message: 'FetchXML must have at least one <entity> element',
			});
		}

		// Validate all elements
		this.validateElements(withoutComments, errors);

		// Validate required attributes
		this.validateRequiredAttributes(withoutComments, errors);

		// Validate order elements (context-dependent on aggregate mode)
		this.validateOrderElements(withoutComments, errors);

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Strips XML comments from the input string.
	 * Handles single-line and multi-line comments.
	 */
	private stripXmlComments(xml: string): string {
		// XML comment pattern: <!-- ... -->
		// Use non-greedy match and handle multi-line with [\s\S]
		return xml.replace(/<!--[\s\S]*?-->/g, '');
	}

	/**
	 * Checks if this is an aggregate query (fetch has aggregate='true').
	 */
	private isAggregateQuery(xml: string): boolean {
		const fetchPattern = /<fetch[^>]*>/i;
		const fetchMatch = xml.match(fetchPattern);
		if (!fetchMatch) {
			return false;
		}

		const fetchTag = fetchMatch[0];
		return /aggregate\s*=\s*['"]true['"]/i.test(fetchTag);
	}

	/**
	 * Validates order elements based on query context.
	 * - Regular queries: order requires 'attribute'
	 * - Aggregate queries: order requires 'alias', cannot have 'attribute'
	 */
	private validateOrderElements(
		xml: string,
		errors: FetchXmlValidationError[]
	): void {
		const isAggregate = this.isAggregateQuery(xml);
		const orderPattern = /<order([^>]*?)(\/?>)/gi;
		let match;

		while ((match = orderPattern.exec(xml)) !== null) {
			const attributeString = match[1] ?? '';
			const lineNumber = this.getLineNumber(xml, match.index);

			const hasAttribute = /\battribute\s*=\s*["']/i.test(attributeString);
			const hasAlias = /\balias\s*=\s*["']/i.test(attributeString);

			if (isAggregate) {
				// Aggregate query: must use alias, cannot use attribute
				if (hasAttribute) {
					errors.push({
						message:
							'<order> element in aggregate query must use "alias" not "attribute"',
						line: lineNumber,
					});
				} else if (!hasAlias) {
					errors.push({
						message:
							'<order> element in aggregate query must have an "alias" attribute',
						line: lineNumber,
					});
				}
			} else {
				// Regular query: must use attribute
				if (!hasAttribute) {
					errors.push({
						message: '<order> element must have an "attribute" attribute',
						line: lineNumber,
					});
				}
			}
		}
	}

	/**
	 * Validates basic XML structure (matching tags, proper nesting).
	 */
	private validateXmlStructure(
		xml: string
	): readonly FetchXmlValidationError[] {
		const errors: FetchXmlValidationError[] = [];
		const tagStack: Array<{ name: string; line: number }> = [];
		const lines = xml.split('\n');

		let lineNumber = 0;
		for (const line of lines) {
			lineNumber++;

			// Find all tags in this line
			const tagPattern = /<\/?([a-zA-Z][\w-]*)[^>]*\/?>/g;
			let match;

			while ((match = tagPattern.exec(line)) !== null) {
				const fullTag = match[0];
				const tagName = match[1]?.toLowerCase();

				if (!tagName) {
					continue;
				}

				// Self-closing tag
				if (fullTag.endsWith('/>')) {
					// Valid, no stack operation needed
					continue;
				}

				// Closing tag
				if (fullTag.startsWith('</')) {
					const lastOpen = tagStack.pop();
					if (!lastOpen) {
						errors.push({
							message: `Unexpected closing tag </${tagName}>`,
							line: lineNumber,
						});
					} else if (lastOpen.name !== tagName) {
						errors.push({
							message: `Mismatched tags: expected </${lastOpen.name}>, found </${tagName}>`,
							line: lineNumber,
						});
					}
					continue;
				}

				// Opening tag
				tagStack.push({ name: tagName, line: lineNumber });
			}
		}

		// Check for unclosed tags
		for (const unclosed of tagStack) {
			errors.push({
				message: `Unclosed tag <${unclosed.name}>`,
				line: unclosed.line,
			});
		}

		// Check for basic XML syntax errors
		if (this.hasUnmatchedBrackets(xml)) {
			errors.push({
				message: 'Invalid XML syntax: unmatched angle brackets',
			});
		}

		return errors;
	}

	/**
	 * Checks for unmatched angle brackets.
	 */
	private hasUnmatchedBrackets(xml: string): boolean {
		// Simple check: count < and > outside of strings/CDATA
		// This is a basic heuristic, not a full parser
		let depth = 0;
		let inString = false;
		let stringChar = '';

		for (let i = 0; i < xml.length; i++) {
			const char = xml[i];
			const prevChar = i > 0 ? xml[i - 1] : '';

			// Handle string literals in attributes
			if (!inString && (char === '"' || char === "'")) {
				inString = true;
				stringChar = char;
			} else if (inString && char === stringChar && prevChar !== '\\') {
				inString = false;
			}

			if (!inString) {
				if (char === '<') {
					depth++;
				} else if (char === '>') {
					depth--;
					if (depth < 0) {
						return true; // More closing than opening
					}
				}
			}
		}

		return depth !== 0;
	}

	/**
	 * Checks if the XML contains a specific element.
	 */
	private hasElement(xml: string, elementName: string): boolean {
		const pattern = new RegExp(`<${elementName}[\\s>]`, 'i');
		return pattern.test(xml);
	}

	/**
	 * Validates all element names in the FetchXML.
	 */
	private validateElements(
		xml: string,
		errors: FetchXmlValidationError[]
	): void {
		// Extract all element names
		const elementPattern = /<([a-zA-Z][\w-]*)[\s>/]/g;
		let match;

		while ((match = elementPattern.exec(xml)) !== null) {
			const elementName = match[1]?.toLowerCase();
			if (elementName && !VALID_ELEMENTS.has(elementName)) {
				// Find line number
				const lineNumber = this.getLineNumber(xml, match.index);
				errors.push({
					message: `Unknown FetchXML element: <${elementName}>`,
					line: lineNumber,
				});
			}
		}
	}

	/**
	 * Validates required attributes for specific elements.
	 */
	private validateRequiredAttributes(
		xml: string,
		errors: FetchXmlValidationError[]
	): void {
		for (const [elementName, requiredAttrs] of Object.entries(
			REQUIRED_ATTRIBUTES
		)) {
			// Find all instances of this element
			const elementPattern = new RegExp(
				`<${elementName}([^>]*?)(/?>)`,
				'gi'
			);
			let match;

			while ((match = elementPattern.exec(xml)) !== null) {
				const attributeString = match[1] ?? '';
				const lineNumber = this.getLineNumber(xml, match.index);

				for (const attr of requiredAttrs) {
					// Check if attribute exists (handles name="value" or name='value')
					const attrPattern = new RegExp(`\\b${attr}\\s*=\\s*["']`, 'i');
					if (!attrPattern.test(attributeString)) {
						errors.push({
							message: `<${elementName}> element must have a "${attr}" attribute`,
							line: lineNumber,
						});
					}
				}
			}
		}
	}

	/**
	 * Gets the line number for a position in the string.
	 */
	private getLineNumber(str: string, position: number): number {
		const substring = str.substring(0, position);
		return (substring.match(/\n/g) ?? []).length + 1;
	}
}
