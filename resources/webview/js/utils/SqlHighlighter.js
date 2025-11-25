/**
 * Syntax highlights SQL for display in webview panels.
 * Uses a lexer-based approach for accurate tokenization.
 * Follows the same pattern as JsonHighlighter.
 */
export class SqlHighlighter {
	/**
	 * SQL keywords that should be highlighted.
	 */
	static KEYWORDS = new Set([
		'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER', 'BY', 'ASC', 'DESC',
		'TOP', 'LIMIT', 'IS', 'NULL', 'NOT', 'IN', 'LIKE', 'JOIN', 'INNER',
		'LEFT', 'RIGHT', 'OUTER', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM',
		'AVG', 'MIN', 'MAX', 'GROUP', 'HAVING', 'UNION', 'ALL', 'EXISTS',
		'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CROSS', 'FULL'
	]);

	/**
	 * Converts SQL text to syntax-highlighted HTML.
	 * @param {string} sql - The SQL string to highlight
	 * @returns {string} HTML string with syntax highlighting
	 */
	static highlight(sql) {
		if (!sql || typeof sql !== 'string') {
			return '';
		}

		const tokens = this.tokenize(sql);
		return tokens.map(token => this.tokenToHtml(token)).join('');
	}

	/**
	 * Tokenizes SQL string into an array of tokens.
	 * @param {string} sql - The SQL string to tokenize
	 * @returns {Array<{type: string, value: string}>} Array of tokens
	 */
	static tokenize(sql) {
		const tokens = [];
		let position = 0;

		while (position < sql.length) {
			const char = sql[position];

			// Whitespace - preserve it
			if (this.isWhitespace(char)) {
				let value = '';
				while (position < sql.length && this.isWhitespace(sql[position])) {
					value += sql[position];
					position++;
				}
				tokens.push({ type: 'whitespace', value });
				continue;
			}

			// Line comment: --
			if (char === '-' && sql[position + 1] === '-') {
				let value = '--';
				position += 2;
				while (position < sql.length && sql[position] !== '\n') {
					value += sql[position];
					position++;
				}
				tokens.push({ type: 'comment', value });
				continue;
			}

			// Block comment: /* */
			if (char === '/' && sql[position + 1] === '*') {
				let value = '/*';
				position += 2;
				while (position < sql.length && !(sql[position] === '*' && sql[position + 1] === '/')) {
					value += sql[position];
					position++;
				}
				if (position < sql.length) {
					value += '*/';
					position += 2;
				}
				tokens.push({ type: 'comment', value });
				continue;
			}

			// String literals (single quotes)
			if (char === "'") {
				let value = "'";
				position++;
				while (position < sql.length) {
					if (sql[position] === "'") {
						value += "'";
						position++;
						// Check for escaped quote ''
						if (sql[position] === "'") {
							value += "'";
							position++;
						} else {
							break;
						}
					} else {
						value += sql[position];
						position++;
					}
				}
				tokens.push({ type: 'string', value });
				continue;
			}

			// Bracketed identifiers [name]
			if (char === '[') {
				let value = '[';
				position++;
				while (position < sql.length && sql[position] !== ']') {
					value += sql[position];
					position++;
				}
				if (position < sql.length) {
					value += ']';
					position++;
				}
				tokens.push({ type: 'identifier', value });
				continue;
			}

			// Double-quoted identifiers "name"
			if (char === '"') {
				let value = '"';
				position++;
				while (position < sql.length && sql[position] !== '"') {
					value += sql[position];
					position++;
				}
				if (position < sql.length) {
					value += '"';
					position++;
				}
				tokens.push({ type: 'identifier', value });
				continue;
			}

			// Numbers
			if (this.isDigit(char) || (char === '-' && this.isDigit(sql[position + 1]))) {
				let value = '';
				if (char === '-') {
					value += '-';
					position++;
				}
				while (position < sql.length && this.isDigit(sql[position])) {
					value += sql[position];
					position++;
				}
				// Decimal part
				if (sql[position] === '.' && this.isDigit(sql[position + 1])) {
					value += '.';
					position++;
					while (position < sql.length && this.isDigit(sql[position])) {
						value += sql[position];
						position++;
					}
				}
				tokens.push({ type: 'number', value });
				continue;
			}

			// Operators
			if (this.isOperator(char)) {
				let value = char;
				position++;
				// Handle multi-character operators
				if ((char === '<' || char === '>' || char === '!') && sql[position] === '=') {
					value += '=';
					position++;
				} else if (char === '<' && sql[position] === '>') {
					value += '>';
					position++;
				}
				tokens.push({ type: 'operator', value });
				continue;
			}

			// Punctuation
			if (this.isPunctuation(char)) {
				tokens.push({ type: 'punctuation', value: char });
				position++;
				continue;
			}

			// Identifiers and keywords
			if (this.isIdentifierStart(char)) {
				let value = '';
				while (position < sql.length && this.isIdentifierChar(sql[position])) {
					value += sql[position];
					position++;
				}
				const upperValue = value.toUpperCase();
				if (this.KEYWORDS.has(upperValue)) {
					tokens.push({ type: 'keyword', value });
				} else {
					tokens.push({ type: 'identifier', value });
				}
				continue;
			}

			// Unknown character - preserve it
			tokens.push({ type: 'unknown', value: char });
			position++;
		}

		return tokens;
	}

	/**
	 * Converts a token to HTML with appropriate CSS class.
	 * @param {{type: string, value: string}} token - The token to convert
	 * @returns {string} HTML string
	 */
	static tokenToHtml(token) {
		const escaped = this.escapeHtml(token.value);

		switch (token.type) {
			case 'keyword':
				return `<span class="sql-keyword">${escaped}</span>`;
			case 'string':
				return `<span class="sql-string">${escaped}</span>`;
			case 'number':
				return `<span class="sql-number">${escaped}</span>`;
			case 'comment':
				return `<span class="sql-comment">${escaped}</span>`;
			case 'operator':
				return `<span class="sql-operator">${escaped}</span>`;
			case 'identifier':
				return `<span class="sql-identifier">${escaped}</span>`;
			case 'punctuation':
				return `<span class="sql-punctuation">${escaped}</span>`;
			default:
				return escaped;
		}
	}

	/**
	 * Escapes HTML special characters.
	 * @param {string} str - String to escape
	 * @returns {string} Escaped string
	 */
	static escapeHtml(str) {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	static isWhitespace(char) {
		return char === ' ' || char === '\t' || char === '\n' || char === '\r';
	}

	static isDigit(char) {
		return char >= '0' && char <= '9';
	}

	static isIdentifierStart(char) {
		return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
	}

	static isIdentifierChar(char) {
		return this.isIdentifierStart(char) || this.isDigit(char);
	}

	static isOperator(char) {
		return '=<>!'.includes(char);
	}

	static isPunctuation(char) {
		return ',.*()'.includes(char);
	}

	/**
	 * Returns CSS styles for SQL syntax highlighting.
	 * Uses VS Code-like colors for dark theme.
	 * @returns {string} CSS styles
	 */
	static getStyles() {
		return `
			.sql-keyword {
				color: #569CD6;
				font-weight: 600;
			}

			.sql-string {
				color: #CE9178;
			}

			.sql-number {
				color: #B5CEA8;
			}

			.sql-comment {
				color: #6A9955;
				font-style: italic;
			}

			.sql-operator {
				color: #D4D4D4;
			}

			.sql-identifier {
				color: #9CDCFE;
			}

			.sql-punctuation {
				color: #D4D4D4;
			}
		`;
	}
}
