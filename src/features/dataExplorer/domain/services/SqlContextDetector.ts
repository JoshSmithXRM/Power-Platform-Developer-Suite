/**
 * The type of SQL context at the cursor position.
 * Used to determine what type of completions to offer.
 */
export type SqlCompletionContext =
	| { kind: 'keyword' }
	| { kind: 'entity' }
	| { kind: 'attribute'; entityName: string }
	| { kind: 'none' };

/**
 * Domain Service: SQL Context Detector
 *
 * Analyzes SQL text and cursor position to determine what type
 * of completions should be offered. This is pure domain logic
 * with no external dependencies.
 *
 * Business Rules:
 * - After FROM/JOIN: suggest entity names
 * - After SELECT/WHERE/ORDER BY/ON (when entity is known): suggest attributes
 * - At statement start or after semicolon: suggest keywords
 */
export class SqlContextDetector {
	/**
	 * SQL keywords for completion.
	 * Includes INSERT, UPDATE, DELETE for Phase 4 support.
	 */
	private static readonly KEYWORDS: readonly string[] = [
		// SELECT query keywords
		'SELECT',
		'FROM',
		'WHERE',
		'AND',
		'OR',
		'ORDER',
		'BY',
		'TOP',
		'LIMIT',
		'JOIN',
		'INNER',
		'LEFT',
		'RIGHT',
		'OUTER',
		'ON',
		'AS',
		'ASC',
		'DESC',
		'IS',
		'NULL',
		'NOT',
		'IN',
		'LIKE',
		// Aggregate keywords (Phase 3)
		'COUNT',
		'SUM',
		'AVG',
		'MIN',
		'MAX',
		'GROUP',
		'HAVING',
		'DISTINCT',
		// Data modification keywords (Phase 4)
		'INSERT',
		'INTO',
		'VALUES',
		'UPDATE',
		'SET',
		'DELETE',
	];

	/**
	 * Detects the completion context based on SQL text and cursor position.
	 *
	 * @param sql - The full SQL text
	 * @param cursorOffset - Character offset of cursor in the text
	 * @returns The detected completion context
	 */
	public detectContext(sql: string, cursorOffset: number): SqlCompletionContext {
		const textBeforeCursor = sql.substring(0, cursorOffset);
		const upperText = textBeforeCursor.toUpperCase();

		// Check if we're after FROM or JOIN (entity context)
		if (this.isAfterEntityKeyword(upperText)) {
			return { kind: 'entity' };
		}

		// Check if we're in an attribute context
		const entityName = this.extractEntityName(sql);
		if (entityName !== null && this.isAfterAttributeKeyword(upperText, sql)) {
			return { kind: 'attribute', entityName: entityName.toLowerCase() };
		}

		// Check if we're at a keyword position
		if (this.isKeywordPosition(upperText)) {
			return { kind: 'keyword' };
		}

		return { kind: 'none' };
	}

	/**
	 * Returns SQL keywords for completion.
	 */
	public getKeywords(): readonly string[] {
		return SqlContextDetector.KEYWORDS;
	}

	/**
	 * Checks if cursor is positioned after FROM or JOIN keyword.
	 */
	private isAfterEntityKeyword(textBeforeCursor: string): boolean {
		const trimmed = textBeforeCursor.trimEnd();
		return /\b(FROM|JOIN)\s*$/i.test(trimmed);
	}

	/**
	 * Checks if cursor is positioned where attributes should be suggested.
	 */
	private isAfterAttributeKeyword(textBeforeCursor: string, fullSql: string): boolean {
		const upperText = textBeforeCursor.toUpperCase();

		// Must have FROM clause to know the entity
		if (!/\bFROM\s+\w+/i.test(fullSql)) {
			return false;
		}

		// After SELECT (before FROM)
		if (/\bSELECT\s+$/i.test(upperText)) {
			return true;
		}

		// After comma in SELECT list (before FROM)
		if (/\bSELECT\s+.+,\s*$/i.test(textBeforeCursor) && !upperText.includes('FROM')) {
			return true;
		}

		// After WHERE, AND, OR (comparison context) - note: use original text for trailing whitespace check
		if (/\b(WHERE|AND|OR)\s+$/i.test(textBeforeCursor)) {
			return true;
		}

		// After ORDER BY
		if (/\bORDER\s+BY\s+$/i.test(textBeforeCursor)) {
			return true;
		}

		// After comma in ORDER BY
		if (/\bORDER\s+BY\s+.+,\s*$/i.test(textBeforeCursor)) {
			return true;
		}

		return false;
	}

	/**
	 * Checks if cursor is at a position where keywords should be suggested.
	 */
	private isKeywordPosition(textBeforeCursor: string): boolean {
		const trimmed = textBeforeCursor.trimEnd();

		// Start of document
		if (trimmed === '') {
			return true;
		}

		// After semicolon (new statement)
		if (trimmed.endsWith(';')) {
			return true;
		}

		// After entity name in FROM clause
		if (/\bFROM\s+\w+\s+$/i.test(trimmed)) {
			return true;
		}

		// After complete WHERE condition
		if (/\bWHERE\s+\w+\s*(=|<|>|<=|>=|<>|!=)\s*('[^']*'|\d+)\s+$/i.test(trimmed)) {
			return true;
		}

		return false;
	}

	/**
	 * Extracts the main entity name from a SQL query.
	 * Looks for FROM clause to determine the main entity.
	 */
	private extractEntityName(sql: string): string | null {
		// Match: FROM entityname or FROM entityname alias
		const match = sql.match(/\bFROM\s+(\w+)/i);
		return match?.[1] ?? null;
	}
}
