import { SqlParseError } from '../errors/SqlParseError';
import { KEYWORD_MAP, SqlComment, SqlToken } from '../valueObjects/SqlToken';

/**
 * Result of SQL lexical analysis.
 * Contains both tokens and comments for full source reconstruction.
 */
export interface SqlLexerResult {
	readonly tokens: SqlToken[];
	readonly comments: SqlComment[];
}

/**
 * Domain Service: SQL Lexer
 *
 * Tokenizes SQL strings for parsing.
 * Handles keywords, identifiers, strings, numbers, and operators.
 * Captures comments with positions for preservation during transpilation.
 *
 * Business Rules:
 * - Keywords are case-insensitive
 * - Identifiers can be quoted with square brackets [name] or double quotes "name"
 * - String literals use single quotes
 * - Line comments (--) and block comments are captured with positions
 */
export class SqlLexer {
	private position: number = 0;
	private readonly sql: string;
	private readonly comments: SqlComment[] = [];

	constructor(sql: string) {
		this.sql = sql;
	}

	/**
	 * Tokenizes the entire SQL string.
	 * Returns both tokens and comments for full source preservation.
	 */
	public tokenize(): SqlLexerResult {
		const tokens: SqlToken[] = [];

		while (!this.isAtEnd()) {
			this.skipWhitespaceAndCaptureComments();
			if (this.isAtEnd()) break;

			const token = this.nextToken();
			tokens.push(token);
		}

		tokens.push(new SqlToken('EOF', '', this.position));
		return { tokens, comments: this.comments };
	}

	/**
	 * Gets the next token from the input.
	 */
	private nextToken(): SqlToken {
		const startPosition = this.position;
		const char = this.peek();

		// Single-character tokens
		if (char === ',') {
			this.advance();
			return new SqlToken('COMMA', ',', startPosition);
		}
		if (char === '.') {
			this.advance();
			return new SqlToken('DOT', '.', startPosition);
		}
		if (char === '*') {
			this.advance();
			return new SqlToken('STAR', '*', startPosition);
		}
		if (char === '(') {
			this.advance();
			return new SqlToken('LPAREN', '(', startPosition);
		}
		if (char === ')') {
			this.advance();
			return new SqlToken('RPAREN', ')', startPosition);
		}

		// Operators
		if (char === '=') {
			this.advance();
			return new SqlToken('EQUALS', '=', startPosition);
		}
		if (char === '<') {
			this.advance();
			if (this.peek() === '=') {
				this.advance();
				return new SqlToken('LESS_THAN_OR_EQUAL', '<=', startPosition);
			}
			if (this.peek() === '>') {
				this.advance();
				return new SqlToken('NOT_EQUALS', '<>', startPosition);
			}
			return new SqlToken('LESS_THAN', '<', startPosition);
		}
		if (char === '>') {
			this.advance();
			if (this.peek() === '=') {
				this.advance();
				return new SqlToken('GREATER_THAN_OR_EQUAL', '>=', startPosition);
			}
			return new SqlToken('GREATER_THAN', '>', startPosition);
		}
		if (char === '!' && this.peekNext() === '=') {
			this.advance();
			this.advance();
			return new SqlToken('NOT_EQUALS', '!=', startPosition);
		}

		// String literals
		if (char === "'") {
			return this.readString();
		}

		// Quoted identifiers
		if (char === '[') {
			return this.readBracketedIdentifier();
		}
		if (char === '"') {
			return this.readQuotedIdentifier();
		}

		// Numbers
		if (this.isDigit(char) || (char === '-' && this.isDigit(this.peekNext()))) {
			return this.readNumber();
		}

		// Identifiers and keywords
		if (this.isIdentifierStart(char)) {
			return this.readIdentifierOrKeyword();
		}

		throw SqlParseError.atPosition(`Unexpected character: '${char}'`, startPosition, this.sql);
	}

	/**
	 * Reads a string literal enclosed in single quotes.
	 */
	private readString(): SqlToken {
		const startPosition = this.position;
		this.advance(); // consume opening quote

		let value = '';
		while (!this.isAtEnd()) {
			const char = this.peek();
			if (char === "'") {
				// Check for escaped quote ('')
				if (this.peekNext() === "'") {
					value += "'";
					this.advance();
					this.advance();
				} else {
					this.advance(); // consume closing quote
					return new SqlToken('STRING', value, startPosition);
				}
			} else {
				value += char;
				this.advance();
			}
		}

		throw SqlParseError.atPosition('Unterminated string literal', startPosition, this.sql);
	}

	/**
	 * Reads a bracketed identifier [name].
	 */
	private readBracketedIdentifier(): SqlToken {
		const startPosition = this.position;
		this.advance(); // consume [

		let value = '';
		while (!this.isAtEnd() && this.peek() !== ']') {
			value += this.peek();
			this.advance();
		}

		if (this.isAtEnd()) {
			throw SqlParseError.atPosition('Unterminated bracketed identifier', startPosition, this.sql);
		}

		this.advance(); // consume ]
		return new SqlToken('IDENTIFIER', value, startPosition);
	}

	/**
	 * Reads a double-quoted identifier "name".
	 */
	private readQuotedIdentifier(): SqlToken {
		const startPosition = this.position;
		this.advance(); // consume "

		let value = '';
		while (!this.isAtEnd() && this.peek() !== '"') {
			value += this.peek();
			this.advance();
		}

		if (this.isAtEnd()) {
			throw SqlParseError.atPosition('Unterminated quoted identifier', startPosition, this.sql);
		}

		this.advance(); // consume "
		return new SqlToken('IDENTIFIER', value, startPosition);
	}

	/**
	 * Reads a number (integer or decimal).
	 */
	private readNumber(): SqlToken {
		const startPosition = this.position;
		let value = '';

		// Handle negative sign
		if (this.peek() === '-') {
			value += '-';
			this.advance();
		}

		// Integer part
		while (!this.isAtEnd() && this.isDigit(this.peek())) {
			value += this.peek();
			this.advance();
		}

		// Decimal part
		if (this.peek() === '.' && this.isDigit(this.peekNext())) {
			value += '.';
			this.advance();
			while (!this.isAtEnd() && this.isDigit(this.peek())) {
				value += this.peek();
				this.advance();
			}
		}

		return new SqlToken('NUMBER', value, startPosition);
	}

	/**
	 * Reads an identifier or keyword.
	 * Preserves original casing in token value (important for aliases).
	 */
	private readIdentifierOrKeyword(): SqlToken {
		const startPosition = this.position;
		let value = '';

		while (!this.isAtEnd() && this.isIdentifierChar(this.peek())) {
			value += this.peek();
			this.advance();
		}

		// Check if it's a keyword (case-insensitive)
		const upperValue = value.toUpperCase();
		const keywordType = KEYWORD_MAP.get(upperValue);

		if (keywordType) {
			// Preserve original casing in value - important when keyword is used as alias
			return new SqlToken(keywordType, value, startPosition);
		}

		return new SqlToken('IDENTIFIER', value, startPosition);
	}

	/**
	 * Skips whitespace and captures comments with their positions.
	 * Comments are stored in the comments array for later association with AST nodes.
	 */
	private skipWhitespaceAndCaptureComments(): void {
		while (!this.isAtEnd()) {
			const char = this.peek();

			// Whitespace
			if (this.isWhitespace(char)) {
				this.advance();
				continue;
			}

			// Line comment: -- ...
			if (char === '-' && this.peekNext() === '-') {
				const startPosition = this.position;
				this.advance(); // consume first -
				this.advance(); // consume second -

				let commentText = '';
				while (!this.isAtEnd() && this.peek() !== '\n') {
					commentText += this.peek();
					this.advance();
				}

				// Store the comment with trimmed text
				const trimmedText = commentText.trim();
				if (trimmedText.length > 0) {
					this.comments.push(new SqlComment(trimmedText, startPosition, false));
				}
				continue;
			}

			// Block comment: /* ... */
			if (char === '/' && this.peekNext() === '*') {
				const startPosition = this.position;
				this.advance(); // consume /
				this.advance(); // consume *

				let commentText = '';
				while (!this.isAtEnd() && !(this.peek() === '*' && this.peekNext() === '/')) {
					commentText += this.peek();
					this.advance();
				}

				if (!this.isAtEnd()) {
					this.advance(); // consume *
					this.advance(); // consume /
				}

				// Store the comment with trimmed text
				const trimmedText = commentText.trim();
				if (trimmedText.length > 0) {
					this.comments.push(new SqlComment(trimmedText, startPosition, true));
				}
				continue;
			}

			break;
		}
	}

	private peek(): string {
		return this.sql[this.position] ?? '\0';
	}

	private peekNext(): string {
		return this.sql[this.position + 1] ?? '\0';
	}

	private advance(): void {
		this.position++;
	}

	private isAtEnd(): boolean {
		return this.position >= this.sql.length;
	}

	private isWhitespace(char: string): boolean {
		return char === ' ' || char === '\t' || char === '\n' || char === '\r';
	}

	private isDigit(char: string): boolean {
		return char >= '0' && char <= '9';
	}

	private isIdentifierStart(char: string): boolean {
		return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
	}

	private isIdentifierChar(char: string): boolean {
		return this.isIdentifierStart(char) || this.isDigit(char);
	}
}
