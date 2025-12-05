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
	 * Uses REGION detection rather than exact position matching.
	 */
	private isAfterAttributeKeyword(textBeforeCursor: string, fullSql: string): boolean {
		const upperTextBefore = textBeforeCursor.toUpperCase();
		const upperFullSql = fullSql.toUpperCase();

		// Must have FROM clause to know the entity
		if (!/\bFROM\s+\w+/i.test(fullSql)) {
			return false;
		}

		// Region 1: SELECT column list (between SELECT and FROM)
		if (this.isInSelectColumnList(upperTextBefore, upperFullSql)) {
			return true;
		}

		// Region 2: WHERE clause (after WHERE/AND/OR, before operator)
		if (this.isInWhereClause(upperTextBefore)) {
			return true;
		}

		// Region 3: ORDER BY clause
		if (this.isInOrderByClause(upperTextBefore)) {
			return true;
		}

		return false;
	}

	/**
	 * Checks if cursor is in the SELECT column list (between SELECT and FROM).
	 */
	private isInSelectColumnList(upperTextBefore: string, upperFullSql: string): boolean {
		// Must have SELECT before cursor
		const selectIndex = upperTextBefore.lastIndexOf('SELECT');
		if (selectIndex === -1) {
			return false;
		}

		// Check if FROM appears AFTER cursor position in the full SQL
		// This handles: "SELECT na|me FROM account" - cursor before FROM
		const fromIndexInFull = upperFullSql.indexOf('FROM', selectIndex);
		if (fromIndexInFull === -1) {
			return false;
		}

		// Cursor is in SELECT list if FROM hasn't appeared yet in textBeforeCursor
		const fromIndexBefore = upperTextBefore.indexOf('FROM', selectIndex);
		if (fromIndexBefore === -1) {
			// No FROM before cursor - we're in SELECT column list
			// Make sure we're past "SELECT " (at least 7 chars after SELECT)
			return upperTextBefore.length > selectIndex + 6;
		}

		return false;
	}

	/**
	 * Checks if cursor is in a WHERE clause attribute position.
	 * This is after WHERE/AND/OR and before an operator (=, <, >, etc.)
	 */
	private isInWhereClause(upperTextBefore: string): boolean {
		// Find the last WHERE, AND, or OR
		const whereMatch = upperTextBefore.match(/\b(WHERE|AND|OR)\s+(\w*)$/i);
		if (whereMatch) {
			// We're right after WHERE/AND/OR, possibly with partial attribute typed
			return true;
		}

		// Also check if we're typing after WHERE/AND/OR with some content
		// Pattern: WHERE/AND/OR followed by word characters (partial attribute)
		const contextMatch = upperTextBefore.match(/\b(WHERE|AND|OR)\s+\w*$/i);
		if (contextMatch) {
			return true;
		}

		return false;
	}

	/**
	 * Checks if cursor is in an ORDER BY clause.
	 */
	private isInOrderByClause(upperTextBefore: string): boolean {
		// Find ORDER BY
		const orderByIndex = upperTextBefore.lastIndexOf('ORDER BY');
		if (orderByIndex === -1) {
			return false;
		}

		const afterOrderBy = upperTextBefore.substring(orderByIndex + 8); // "ORDER BY".length = 8

		// Check if we're in a position to type an attribute:
		// - Right after ORDER BY: "ORDER BY |"
		// - After comma: "ORDER BY name, |"
		// - Typing partial: "ORDER BY na|" or "ORDER BY name, ac|"

		// Not in attribute position if we just completed a sort direction
		if (/\b(ASC|DESC)\s*$/i.test(afterOrderBy)) {
			return false;
		}

		// We're in ORDER BY and haven't hit a terminal point
		return true;
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
