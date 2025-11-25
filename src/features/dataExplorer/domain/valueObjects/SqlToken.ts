/**
 * Value Object: SQL Token Type
 *
 * Represents the type of a token in SQL lexical analysis.
 */
export type SqlTokenType =
	// Keywords
	| 'SELECT'
	| 'FROM'
	| 'WHERE'
	| 'AND'
	| 'OR'
	| 'ORDER'
	| 'BY'
	| 'ASC'
	| 'DESC'
	| 'TOP'
	| 'LIMIT'
	| 'IS'
	| 'NULL'
	| 'NOT'
	| 'IN'
	| 'LIKE'
	| 'JOIN'
	| 'INNER'
	| 'LEFT'
	| 'RIGHT'
	| 'OUTER'
	| 'ON'
	| 'AS'
	// Operators
	| 'EQUALS' // =
	| 'NOT_EQUALS' // <> or !=
	| 'LESS_THAN' // <
	| 'GREATER_THAN' // >
	| 'LESS_THAN_OR_EQUAL' // <=
	| 'GREATER_THAN_OR_EQUAL' // >=
	// Punctuation
	| 'COMMA'
	| 'DOT'
	| 'STAR'
	| 'LPAREN'
	| 'RPAREN'
	// Literals
	| 'IDENTIFIER'
	| 'STRING'
	| 'NUMBER'
	// Special
	| 'EOF';

/**
 * Value Object: SQL Token
 *
 * Represents a single token from SQL lexical analysis.
 * Immutable with position information for error reporting.
 */
export class SqlToken {
	constructor(
		public readonly type: SqlTokenType,
		public readonly value: string,
		public readonly position: number
	) {}

	/**
	 * Checks if this token is a specific type.
	 */
	public is(type: SqlTokenType): boolean {
		return this.type === type;
	}

	/**
	 * Checks if this token is one of the specified types.
	 */
	public isOneOf(...types: SqlTokenType[]): boolean {
		return types.includes(this.type);
	}

	/**
	 * Checks if this token is a keyword.
	 */
	public isKeyword(): boolean {
		return SQL_KEYWORDS.has(this.type);
	}

	/**
	 * Checks if this token is a comparison operator.
	 */
	public isComparisonOperator(): boolean {
		return COMPARISON_OPERATORS.has(this.type);
	}
}

/**
 * Set of SQL keyword token types.
 */
const SQL_KEYWORDS = new Set<SqlTokenType>([
	'SELECT',
	'FROM',
	'WHERE',
	'AND',
	'OR',
	'ORDER',
	'BY',
	'ASC',
	'DESC',
	'TOP',
	'LIMIT',
	'IS',
	'NULL',
	'NOT',
	'IN',
	'LIKE',
	'JOIN',
	'INNER',
	'LEFT',
	'RIGHT',
	'OUTER',
	'ON',
	'AS',
]);

/**
 * Set of comparison operator token types.
 */
const COMPARISON_OPERATORS = new Set<SqlTokenType>([
	'EQUALS',
	'NOT_EQUALS',
	'LESS_THAN',
	'GREATER_THAN',
	'LESS_THAN_OR_EQUAL',
	'GREATER_THAN_OR_EQUAL',
]);

/**
 * Map of keyword strings to token types.
 */
export const KEYWORD_MAP: ReadonlyMap<string, SqlTokenType> = new Map([
	['SELECT', 'SELECT'],
	['FROM', 'FROM'],
	['WHERE', 'WHERE'],
	['AND', 'AND'],
	['OR', 'OR'],
	['ORDER', 'ORDER'],
	['BY', 'BY'],
	['ASC', 'ASC'],
	['DESC', 'DESC'],
	['TOP', 'TOP'],
	['LIMIT', 'LIMIT'],
	['IS', 'IS'],
	['NULL', 'NULL'],
	['NOT', 'NOT'],
	['IN', 'IN'],
	['LIKE', 'LIKE'],
	['JOIN', 'JOIN'],
	['INNER', 'INNER'],
	['LEFT', 'LEFT'],
	['RIGHT', 'RIGHT'],
	['OUTER', 'OUTER'],
	['ON', 'ON'],
	['AS', 'AS'],
]);
