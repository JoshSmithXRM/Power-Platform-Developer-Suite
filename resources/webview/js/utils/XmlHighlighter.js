/**
 * Syntax highlights XML/FetchXML for display in webview panels.
 * Uses a lexer-based approach for accurate tokenization.
 * Follows the same pattern as JsonHighlighter and SqlHighlighter.
 */
export class XmlHighlighter {
	/**
	 * Converts XML text to syntax-highlighted HTML.
	 * @param {string} xml - The XML string to highlight
	 * @returns {string} HTML string with syntax highlighting
	 */
	static highlight(xml) {
		if (!xml || typeof xml !== 'string') {
			return '';
		}

		const tokens = this.tokenize(xml);
		return tokens.map(token => this.tokenToHtml(token)).join('');
	}

	/**
	 * Tokenizes XML string into an array of tokens.
	 * @param {string} xml - The XML string to tokenize
	 * @returns {Array<{type: string, value: string}>} Array of tokens
	 */
	static tokenize(xml) {
		const tokens = [];
		let position = 0;

		while (position < xml.length) {
			const char = xml[position];

			// XML Comment: <!-- -->
			if (xml.substring(position, position + 4) === '<!--') {
				let value = '<!--';
				position += 4;
				while (position < xml.length && xml.substring(position, position + 3) !== '-->') {
					value += xml[position];
					position++;
				}
				if (position < xml.length) {
					value += '-->';
					position += 3;
				}
				tokens.push({ type: 'comment', value });
				continue;
			}

			// CDATA section: <![CDATA[ ... ]]>
			if (xml.substring(position, position + 9) === '<![CDATA[') {
				let value = '<![CDATA[';
				position += 9;
				while (position < xml.length && xml.substring(position, position + 3) !== ']]>') {
					value += xml[position];
					position++;
				}
				if (position < xml.length) {
					value += ']]>';
					position += 3;
				}
				tokens.push({ type: 'cdata', value });
				continue;
			}

			// Processing instruction: <?xml ... ?>
			if (xml.substring(position, position + 2) === '<?') {
				let value = '<?';
				position += 2;
				while (position < xml.length && xml.substring(position, position + 2) !== '?>') {
					value += xml[position];
					position++;
				}
				if (position < xml.length) {
					value += '?>';
					position += 2;
				}
				tokens.push({ type: 'processing', value });
				continue;
			}

			// Closing tag: </tagname>
			if (xml.substring(position, position + 2) === '</') {
				tokens.push({ type: 'bracket', value: '</' });
				position += 2;

				// Tag name
				let tagName = '';
				while (position < xml.length && this.isNameChar(xml[position])) {
					tagName += xml[position];
					position++;
				}
				if (tagName) {
					tokens.push({ type: 'tag', value: tagName });
				}

				// Skip whitespace
				while (position < xml.length && this.isWhitespace(xml[position])) {
					tokens.push({ type: 'whitespace', value: xml[position] });
					position++;
				}

				// Closing bracket
				if (xml[position] === '>') {
					tokens.push({ type: 'bracket', value: '>' });
					position++;
				}
				continue;
			}

			// Opening tag or self-closing tag: <tagname ... > or <tagname ... />
			if (char === '<' && this.isNameStart(xml[position + 1])) {
				tokens.push({ type: 'bracket', value: '<' });
				position++;

				// Tag name
				let tagName = '';
				while (position < xml.length && this.isNameChar(xml[position])) {
					tagName += xml[position];
					position++;
				}
				if (tagName) {
					tokens.push({ type: 'tag', value: tagName });
				}

				// Attributes
				while (position < xml.length && xml[position] !== '>' && xml.substring(position, position + 2) !== '/>') {
					// Whitespace
					if (this.isWhitespace(xml[position])) {
						let ws = '';
						while (position < xml.length && this.isWhitespace(xml[position])) {
							ws += xml[position];
							position++;
						}
						tokens.push({ type: 'whitespace', value: ws });
						continue;
					}

					// Attribute name
					if (this.isNameStart(xml[position])) {
						let attrName = '';
						while (position < xml.length && this.isNameChar(xml[position])) {
							attrName += xml[position];
							position++;
						}
						tokens.push({ type: 'attribute', value: attrName });

						// Skip whitespace around =
						while (position < xml.length && this.isWhitespace(xml[position])) {
							tokens.push({ type: 'whitespace', value: xml[position] });
							position++;
						}

						// Equals sign
						if (xml[position] === '=') {
							tokens.push({ type: 'equals', value: '=' });
							position++;
						}

						// Skip whitespace after =
						while (position < xml.length && this.isWhitespace(xml[position])) {
							tokens.push({ type: 'whitespace', value: xml[position] });
							position++;
						}

						// Attribute value (quoted)
						if (xml[position] === '"' || xml[position] === "'") {
							const quote = xml[position];
							let attrValue = quote;
							position++;
							while (position < xml.length && xml[position] !== quote) {
								attrValue += xml[position];
								position++;
							}
							if (position < xml.length) {
								attrValue += quote;
								position++;
							}
							tokens.push({ type: 'string', value: attrValue });
						}
						continue;
					}

					// Unknown character in tag - skip it
					position++;
				}

				// Self-closing or closing bracket
				if (xml.substring(position, position + 2) === '/>') {
					tokens.push({ type: 'bracket', value: '/>' });
					position += 2;
				} else if (xml[position] === '>') {
					tokens.push({ type: 'bracket', value: '>' });
					position++;
				}
				continue;
			}

			// Text content (between tags)
			if (char !== '<') {
				let text = '';
				while (position < xml.length && xml[position] !== '<') {
					text += xml[position];
					position++;
				}
				// Only add non-whitespace text as content, whitespace as whitespace
				if (text.trim()) {
					tokens.push({ type: 'text', value: text });
				} else if (text) {
					tokens.push({ type: 'whitespace', value: text });
				}
				continue;
			}

			// Unknown - preserve it
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
			case 'tag':
				return `<span class="xml-tag">${escaped}</span>`;
			case 'attribute':
				return `<span class="xml-attribute">${escaped}</span>`;
			case 'string':
				return `<span class="xml-string">${escaped}</span>`;
			case 'bracket':
				return `<span class="xml-bracket">${escaped}</span>`;
			case 'equals':
				return `<span class="xml-equals">${escaped}</span>`;
			case 'comment':
				return `<span class="xml-comment">${escaped}</span>`;
			case 'cdata':
				return `<span class="xml-cdata">${escaped}</span>`;
			case 'processing':
				return `<span class="xml-processing">${escaped}</span>`;
			case 'text':
				return `<span class="xml-text">${escaped}</span>`;
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

	static isNameStart(char) {
		return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || char === ':';
	}

	static isNameChar(char) {
		return this.isNameStart(char) || (char >= '0' && char <= '9') || char === '-' || char === '.';
	}

	/**
	 * Returns CSS styles for XML syntax highlighting.
	 * Uses VS Code-like colors for dark theme.
	 * @returns {string} CSS styles
	 */
	static getStyles() {
		return `
			.xml-tag {
				color: #569CD6;
			}

			.xml-attribute {
				color: #9CDCFE;
			}

			.xml-string {
				color: #CE9178;
			}

			.xml-bracket {
				color: #808080;
			}

			.xml-equals {
				color: #D4D4D4;
			}

			.xml-comment {
				color: #6A9955;
				font-style: italic;
			}

			.xml-cdata {
				color: #D7BA7D;
			}

			.xml-processing {
				color: #C586C0;
			}

			.xml-text {
				color: #D4D4D4;
			}
		`;
	}
}
