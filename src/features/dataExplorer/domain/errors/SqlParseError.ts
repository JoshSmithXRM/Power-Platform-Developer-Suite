import { DomainError } from '../../../../shared/domain/errors/DomainError';

/**
 * Domain Error: SQL Parse Error
 *
 * Thrown when SQL parsing fails due to syntax errors.
 * Includes position information for helpful error messages.
 */
export class SqlParseError extends DomainError {
	constructor(
		public readonly message: string,
		public readonly position: number,
		public readonly line: number,
		public readonly column: number,
		public readonly sql: string
	) {
		super(`SQL parse error at line ${line}, column ${column}: ${message}`);
	}

	/**
	 * Creates error with position calculated from character offset.
	 */
	public static atPosition(message: string, position: number, sql: string): SqlParseError {
		const { line, column } = SqlParseError.calculateLineColumn(position, sql);
		return new SqlParseError(message, position, line, column, sql);
	}

	/**
	 * Calculates line and column from character position.
	 */
	private static calculateLineColumn(
		position: number,
		sql: string
	): { line: number; column: number } {
		const beforePosition = sql.substring(0, position);
		const lines = beforePosition.split('\n');
		const line = lines.length;
		// istanbul ignore next - String.split() always returns at least one element
		const lastLine = lines[lines.length - 1] ?? '';
		const column = lastLine.length + 1;
		return { line, column };
	}

	/**
	 * Gets a snippet of the SQL around the error position.
	 */
	public getErrorContext(contextChars: number = 20): string {
		const start = Math.max(0, this.position - contextChars);
		const end = Math.min(this.sql.length, this.position + contextChars);
		const before = this.sql.substring(start, this.position);
		const after = this.sql.substring(this.position, end);
		return `${start > 0 ? '...' : ''}${before}[HERE]${after}${end < this.sql.length ? '...' : ''}`;
	}
}
