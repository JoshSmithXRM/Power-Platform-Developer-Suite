import { DomainError } from '../../../../shared/domain/errors/DomainError';

/**
 * Domain Error: FetchXML Parse Error
 *
 * Thrown when FetchXML parsing fails due to syntax errors or invalid structure.
 * Includes position information for helpful error messages.
 */
export class FetchXmlParseError extends DomainError {
	constructor(
		public override readonly message: string,
		public readonly position: number,
		public readonly line: number,
		public readonly column: number,
		public readonly fetchXml: string
	) {
		super(`FetchXML parse error at line ${line}, column ${column}: ${message}`);
	}

	/**
	 * Creates error with position calculated from character offset.
	 */
	public static atPosition(message: string, position: number, fetchXml: string): FetchXmlParseError {
		const { line, column } = FetchXmlParseError.calculateLineColumn(position, fetchXml);
		return new FetchXmlParseError(message, position, line, column, fetchXml);
	}

	/**
	 * Creates error for missing required element.
	 */
	public static missingElement(elementName: string, fetchXml: string): FetchXmlParseError {
		return new FetchXmlParseError(
			`Missing required element: <${elementName}>`,
			0,
			1,
			1,
			fetchXml
		);
	}

	/**
	 * Creates error for missing required attribute.
	 */
	public static missingAttribute(
		elementName: string,
		attributeName: string,
		position: number,
		fetchXml: string
	): FetchXmlParseError {
		const { line, column } = FetchXmlParseError.calculateLineColumn(position, fetchXml);
		return new FetchXmlParseError(
			`Missing required attribute '${attributeName}' on <${elementName}>`,
			position,
			line,
			column,
			fetchXml
		);
	}

	/**
	 * Creates error for invalid operator.
	 */
	public static invalidOperator(
		operator: string,
		position: number,
		fetchXml: string
	): FetchXmlParseError {
		const { line, column } = FetchXmlParseError.calculateLineColumn(position, fetchXml);
		return new FetchXmlParseError(
			`Invalid operator: '${operator}'`,
			position,
			line,
			column,
			fetchXml
		);
	}

	/**
	 * Creates error for invalid XML structure.
	 */
	public static invalidStructure(message: string, fetchXml: string): FetchXmlParseError {
		return new FetchXmlParseError(message, 0, 1, 1, fetchXml);
	}

	/**
	 * Calculates line and column from character position.
	 */
	private static calculateLineColumn(
		position: number,
		fetchXml: string
	): { line: number; column: number } {
		const beforePosition = fetchXml.substring(0, position);
		const lines = beforePosition.split('\n');
		const line = lines.length;
		// istanbul ignore next - String.split() always returns at least one element
		const lastLine = lines[lines.length - 1] ?? '';
		const column = lastLine.length + 1;
		return { line, column };
	}

	/**
	 * Gets a snippet of the FetchXML around the error position.
	 */
	public getErrorContext(contextChars: number = 30): string {
		const start = Math.max(0, this.position - contextChars);
		const end = Math.min(this.fetchXml.length, this.position + contextChars);
		const before = this.fetchXml.substring(start, this.position);
		const after = this.fetchXml.substring(this.position, end);
		return `${start > 0 ? '...' : ''}${before}[HERE]${after}${end < this.fetchXml.length ? '...' : ''}`;
	}
}
