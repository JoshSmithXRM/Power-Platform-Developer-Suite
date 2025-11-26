/**
 * ViewModel for query execution errors.
 *
 * Provides user-friendly error display with position information
 * for parse errors and context snippets.
 */
export interface QueryErrorViewModel {
	/**
	 * Error message to display to the user.
	 */
	readonly message: string;

	/**
	 * Error type for styling (parse, execution, validation).
	 * - parse: SQL syntax error with position info
	 * - execution: Query failed during execution
	 * - validation: Input validation error
	 */
	readonly errorType: 'parse' | 'execution' | 'validation';

	/**
	 * Position information for parse errors.
	 * Only present for errorType: 'parse'.
	 */
	readonly position?: {
		readonly line: number;
		readonly column: number;
	};

	/**
	 * Context snippet showing error location.
	 * Only present for errorType: 'parse'.
	 */
	readonly context?: string;
}
