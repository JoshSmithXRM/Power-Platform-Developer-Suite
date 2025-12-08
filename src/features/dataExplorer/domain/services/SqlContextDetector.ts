/**
 * The type of SQL context at the cursor position.
 * Used to determine what type of completions to offer.
 *
 * - keyword: Suggest SQL keywords (filtered to context-appropriate ones)
 * - entity: Suggest Dataverse entity names
 * - attribute: Suggest attribute names for the specified entity
 * - none: No suggestions (e.g., inside string literal, unknown context)
 */
export type SqlCompletionContext =
	| { kind: 'keyword'; suggestedKeywords: readonly string[] }
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
 * - Inside string literal: no suggestions
 * - After FROM/JOIN: suggest entity names
 * - After SELECT/WHERE/ORDER BY/ON (when entity is known): suggest attributes
 * - At statement boundaries: suggest context-appropriate keywords
 */
export class SqlContextDetector {
	// =========================================================================
	// Keyword Groups - Context-appropriate suggestions
	// =========================================================================

	/** Keywords valid at the start of a new statement */
	private static readonly STATEMENT_START_KEYWORDS: readonly string[] = [
		'SELECT',
		'INSERT',
		'UPDATE',
		'DELETE',
	];

	/** Keywords valid in SELECT column list (before FROM) */
	private static readonly SELECT_COLUMN_KEYWORDS: readonly string[] = [
		'DISTINCT',
		'TOP',
		'FROM',
		// Aggregate functions
		'COUNT',
		'SUM',
		'AVG',
		'MIN',
		'MAX',
	];

	/** Keywords valid after FROM entity (clause starters) */
	private static readonly AFTER_FROM_ENTITY_KEYWORDS: readonly string[] = [
		'WHERE',
		'ORDER BY',
		'JOIN',
		'INNER JOIN',
		'LEFT JOIN',
		'RIGHT JOIN',
		'LEFT OUTER JOIN',
		'RIGHT OUTER JOIN',
		'GROUP BY',
		'AS',
	];

	/** Keywords valid after JOIN entity */
	private static readonly AFTER_JOIN_ENTITY_KEYWORDS: readonly string[] = ['ON', 'AS'];

	/** Keywords valid after a complete WHERE condition */
	private static readonly AFTER_WHERE_CONDITION_KEYWORDS: readonly string[] = [
		'AND',
		'OR',
		'ORDER BY',
		'GROUP BY',
	];

	/** Keywords valid in WHERE clause (operators and values) */
	private static readonly WHERE_OPERATOR_KEYWORDS: readonly string[] = [
		'IS',
		'IS NOT',
		'IN',
		'NOT IN',
		'LIKE',
		'NOT LIKE',
		'BETWEEN',
		'NULL',
		'NOT',
	];

	/** Keywords valid after ORDER BY attribute */
	private static readonly ORDER_BY_DIRECTION_KEYWORDS: readonly string[] = ['ASC', 'DESC'];

	/** Keywords valid after ORDER BY attribute with direction */
	private static readonly AFTER_ORDER_BY_COMPLETE_KEYWORDS: readonly string[] = [
		'LIMIT',
		// Can add more columns with comma (handled separately)
	];

	/** Keywords for INSERT statements */
	private static readonly INSERT_KEYWORDS: readonly string[] = ['INTO', 'VALUES'];

	/** Keywords for UPDATE statements */
	private static readonly UPDATE_KEYWORDS: readonly string[] = ['SET', 'WHERE'];

	/** Keywords for DELETE statements */
	private static readonly DELETE_KEYWORDS: readonly string[] = ['FROM', 'WHERE'];

	/**
	 * All SQL keywords - used for getKeywords() backward compatibility.
	 */
	private static readonly ALL_KEYWORDS: readonly string[] = [
		// SELECT query keywords
		'SELECT',
		'FROM',
		'WHERE',
		'AND',
		'OR',
		'ORDER BY',
		'TOP',
		'LIMIT',
		'JOIN',
		'INNER JOIN',
		'LEFT JOIN',
		'RIGHT JOIN',
		'LEFT OUTER JOIN',
		'RIGHT OUTER JOIN',
		'ON',
		'AS',
		'ASC',
		'DESC',
		'IS',
		'IS NOT',
		'NULL',
		'NOT',
		'NOT IN',
		'NOT LIKE',
		'IN',
		'LIKE',
		'BETWEEN',
		// Aggregate keywords (Phase 3)
		'COUNT',
		'SUM',
		'AVG',
		'MIN',
		'MAX',
		'GROUP BY',
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
	 * @returns The detected completion context with context-appropriate keywords
	 */
	public detectContext(sql: string, cursorOffset: number): SqlCompletionContext {
		const textBeforeCursor = sql.substring(0, cursorOffset);

		// FIRST: Check if we're inside a string literal - no suggestions
		if (this.isInsideStringLiteral(textBeforeCursor)) {
			return { kind: 'none' };
		}

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

		// Check for keyword position with context-aware suggestions
		const keywordContext = this.detectKeywordContext(upperText, sql);
		if (keywordContext !== null) {
			return { kind: 'keyword', suggestedKeywords: keywordContext };
		}

		return { kind: 'none' };
	}

	// =========================================================================
	// String Literal Detection
	// =========================================================================

	/**
	 * Checks if the cursor is inside a string literal.
	 * Counts unescaped single quotes - odd count means inside string.
	 */
	private isInsideStringLiteral(textBeforeCursor: string): boolean {
		let insideString = false;
		let i = 0;

		while (i < textBeforeCursor.length) {
			const char = textBeforeCursor[i];

			if (char === "'") {
				// Check for escaped quote ('')
				if (i + 1 < textBeforeCursor.length && textBeforeCursor[i + 1] === "'") {
					// Escaped quote - skip both characters
					i += 2;
					continue;
				}
				// Toggle string state
				insideString = !insideString;
			}
			i++;
		}

		return insideString;
	}

	// =========================================================================
	// Context-Aware Keyword Detection
	// =========================================================================

	/**
	 * Detects the keyword context and returns appropriate keywords to suggest.
	 * Returns null if not in a keyword position.
	 */
	private detectKeywordContext(
		upperTextBefore: string,
		fullSql: string
	): readonly string[] | null {
		const trimmed = upperTextBefore.trimEnd();
		const hasTrailingSpace = upperTextBefore.length > trimmed.length;

		// Start of document or after semicolon - statement start keywords
		if (trimmed === '' || trimmed.endsWith(';')) {
			return SqlContextDetector.STATEMENT_START_KEYWORDS;
		}

		// Check for partial keyword at start (user typing SELECT, INSERT, etc.)
		if (this.isTypingStatementKeyword(trimmed)) {
			return SqlContextDetector.STATEMENT_START_KEYWORDS;
		}

		// After SELECT but before FROM - suggest column keywords and FROM
		if (this.isInSelectClauseBeforeFrom(trimmed, fullSql)) {
			return SqlContextDetector.SELECT_COLUMN_KEYWORDS;
		}

		// After FROM entity - suggest WHERE, ORDER BY, JOIN, etc.
		if (this.isAfterFromEntity(trimmed)) {
			return SqlContextDetector.AFTER_FROM_ENTITY_KEYWORDS;
		}

		// After JOIN entity - suggest ON
		if (this.isAfterJoinEntity(trimmed)) {
			return SqlContextDetector.AFTER_JOIN_ENTITY_KEYWORDS;
		}

		// After complete WHERE condition (requires trailing space)
		if (hasTrailingSpace && this.isAfterWhereCondition(trimmed)) {
			return SqlContextDetector.AFTER_WHERE_CONDITION_KEYWORDS;
		}

		// After WHERE attribute with operator - suggest operator keywords
		if (this.isAfterWhereOperator(trimmed)) {
			return SqlContextDetector.WHERE_OPERATOR_KEYWORDS;
		}

		// After ORDER BY attribute with space - suggest ASC, DESC
		if (hasTrailingSpace && this.isAfterOrderByAttributeComplete(trimmed)) {
			return SqlContextDetector.ORDER_BY_DIRECTION_KEYWORDS;
		}

		// After ORDER BY attribute with direction - suggest LIMIT or more columns
		if (this.isAfterOrderByComplete(trimmed)) {
			return SqlContextDetector.AFTER_ORDER_BY_COMPLETE_KEYWORDS;
		}

		// INSERT statement keywords
		if (this.isInInsertStatement(trimmed)) {
			return SqlContextDetector.INSERT_KEYWORDS;
		}

		// UPDATE statement keywords
		if (this.isInUpdateStatement(trimmed)) {
			return SqlContextDetector.UPDATE_KEYWORDS;
		}

		// DELETE statement keywords
		if (this.isInDeleteStatement(trimmed)) {
			return SqlContextDetector.DELETE_KEYWORDS;
		}

		return null;
	}

	/**
	 * Checks if user is typing a statement-starting keyword at document start.
	 * Handles: "S", "SE", "SEL", "SELE", "SELEC" -> should suggest SELECT
	 */
	private isTypingStatementKeyword(trimmed: string): boolean {
		// Only applies at the very start (no semicolon before)
		if (trimmed.includes(';')) {
			// Check if we're after the last semicolon
			const afterLastSemicolon = trimmed.substring(trimmed.lastIndexOf(';') + 1).trim();
			if (afterLastSemicolon === '') {
				return false;
			}
			// Check if the text after semicolon is a partial keyword
			return this.isPartialStatementKeyword(afterLastSemicolon);
		}

		return this.isPartialStatementKeyword(trimmed);
	}

	/**
	 * Checks if text is a partial (incomplete) match for statement-starting keywords.
	 * Returns false for complete keywords like "SELECT" - they should trigger next context.
	 */
	private isPartialStatementKeyword(text: string): boolean {
		const upper = text.toUpperCase();
		// Must be a single word (no spaces) and match start of a statement keyword
		if (/\s/.test(text)) {
			return false;
		}
		// Must be partial - not a complete keyword
		if (SqlContextDetector.STATEMENT_START_KEYWORDS.includes(upper)) {
			return false;
		}
		return SqlContextDetector.STATEMENT_START_KEYWORDS.some(kw => kw.startsWith(upper));
	}

	/**
	 * Checks if we're in SELECT clause before FROM exists.
	 */
	private isInSelectClauseBeforeFrom(trimmed: string, fullSql: string): boolean {
		const hasSelect = /\bSELECT\b/i.test(trimmed);
		const hasFromBefore = /\bFROM\b/i.test(trimmed);
		const hasFromInFull = /\bFROM\b/i.test(fullSql);

		// We're after SELECT but FROM hasn't appeared yet in text before cursor
		// AND either FROM doesn't exist in full SQL, or we're before it
		return hasSelect && !hasFromBefore && !hasFromInFull;
	}

	/**
	 * Checks if cursor is after FROM entity (with possible alias).
	 * Matches: "FROM account", "FROM account a", "FROM account AS a"
	 */
	private isAfterFromEntity(trimmed: string): boolean {
		// Pattern: FROM word [AS] [word] followed by end or space
		// Must NOT be followed by WHERE, ORDER, JOIN already
		if (/\b(WHERE|ORDER|JOIN|INNER|LEFT|RIGHT)\b/i.test(trimmed)) {
			return false;
		}
		return /\bFROM\s+\w+(\s+AS\s+\w+|\s+\w+)?\s*$/i.test(trimmed);
	}

	/**
	 * Checks if cursor is after JOIN entity.
	 */
	private isAfterJoinEntity(trimmed: string): boolean {
		// Must have JOIN followed by entity, but not ON yet
		if (/\bON\b/i.test(trimmed.substring(trimmed.lastIndexOf('JOIN')))) {
			return false;
		}
		return /\bJOIN\s+\w+(\s+AS\s+\w+|\s+\w+)?\s*$/i.test(trimmed);
	}

	/**
	 * Checks if cursor is after a complete WHERE condition.
	 * Matches conditions like: "WHERE name = 'test'", "WHERE age > 18", "AND status = 1"
	 * Note: Called with trimmed text, so no trailing space. hasTrailingSpace check is separate.
	 */
	private isAfterWhereCondition(trimmed: string): boolean {
		// Pattern: (WHERE|AND|OR) attr operator value at end (no trailing space - we pass trimmed text)
		// Value can be: 'string', number, or NULL
		const conditionPattern =
			/\b(WHERE|AND|OR)\s+\w+\s*(=|!=|<>|<|>|<=|>=|LIKE|IN|IS(\s+NOT)?)\s*(\([^)]*\)|'[^']*'|\d+|NULL)$/i;
		return conditionPattern.test(trimmed);
	}

	/**
	 * Checks if cursor is after WHERE attribute with operator (needs value/keyword).
	 */
	private isAfterWhereOperator(trimmed: string): boolean {
		// Pattern: WHERE/AND/OR attr followed by nothing or partial operator
		return /\b(WHERE|AND|OR)\s+\w+\s+(=|!=|<>|<|>|<=|>=)?\s*$/i.test(trimmed);
	}

	/**
	 * Checks if cursor is after ORDER BY attribute WITH trailing space (needs ASC/DESC).
	 * Called only when hasTrailingSpace is true.
	 */
	private isAfterOrderByAttributeComplete(trimmed: string): boolean {
		// Must be after ORDER BY with attribute, but not have ASC/DESC yet
		const orderByIndex = trimmed.lastIndexOf('ORDER BY');
		if (orderByIndex === -1) {
			return false;
		}

		const afterOrderBy = trimmed.substring(orderByIndex + 8).trim();

		// Must have at least one attribute
		if (!/^\w+/.test(afterOrderBy)) {
			return false;
		}

		// Check if ends with attribute (not ASC/DESC)
		// Pattern: attr or attr, attr (comma-separated without direction yet)
		return /\w+$/.test(afterOrderBy) && !/\b(ASC|DESC)$/i.test(afterOrderBy);
	}

	/**
	 * Checks if cursor is after complete ORDER BY (attr + direction).
	 */
	private isAfterOrderByComplete(trimmed: string): boolean {
		return /\bORDER\s+BY\s+\w+(\s+(ASC|DESC))?\s*,?\s*$/i.test(trimmed) &&
			/\b(ASC|DESC)\s*$/i.test(trimmed);
	}

	/**
	 * Checks if we're in an INSERT statement.
	 */
	private isInInsertStatement(trimmed: string): boolean {
		return /\bINSERT\b/i.test(trimmed) && !/\bVALUES\b/i.test(trimmed);
	}

	/**
	 * Checks if we're in an UPDATE statement.
	 */
	private isInUpdateStatement(trimmed: string): boolean {
		return /\bUPDATE\s+\w+\s*$/i.test(trimmed);
	}

	/**
	 * Checks if we're in a DELETE statement.
	 */
	private isInDeleteStatement(trimmed: string): boolean {
		return /\bDELETE\b/i.test(trimmed) && !/\bFROM\b/i.test(trimmed);
	}

	/**
	 * Returns all SQL keywords for completion.
	 * Used for backward compatibility with existing code.
	 */
	public getKeywords(): readonly string[] {
		return SqlContextDetector.ALL_KEYWORDS;
	}

	/**
	 * Checks if cursor is positioned after FROM or JOIN keyword.
	 * Returns true for:
	 * - "FROM " → ready to type entity
	 * - "FROM acc" → typing partial entity name (VS Code filters)
	 * Returns false for:
	 * - "FROM account " → entity complete, ready for next clause
	 */
	private isAfterEntityKeyword(textBeforeCursor: string): boolean {
		const trimmed = textBeforeCursor.trimEnd();
		const hasTrailingSpace = textBeforeCursor.length > trimmed.length;

		// If text ends with FROM/JOIN (possibly with spaces), we're in entity context
		if (/\b(FROM|JOIN)\s*$/i.test(trimmed)) {
			return true;
		}

		// If text ends with FROM/JOIN + partial word (typing entity name)
		// AND there's no trailing space (still typing), we're in entity context
		if (!hasTrailingSpace && /\b(FROM|JOIN)\s+\w+$/i.test(trimmed)) {
			return true;
		}

		return false;
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
	 * Checks if cursor is in an ORDER BY clause (for attribute suggestions).
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

		// Not in attribute position if we have attribute + trailing space (ready for ASC/DESC)
		// This allows keyword context to suggest ASC/DESC
		if (/\w+\s+$/i.test(afterOrderBy)) {
			return false;
		}

		// We're in ORDER BY and haven't hit a terminal point
		return true;
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
