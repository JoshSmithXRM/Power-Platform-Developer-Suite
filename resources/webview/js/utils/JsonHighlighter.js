/**
 * Syntax highlights JSON for display in webview panels.
 * Creates colored HTML with proper formatting for keys, values, strings, numbers, booleans, and null.
 */
export class JsonHighlighter {
	/**
	 * Converts a JSON object to syntax-highlighted HTML.
	 * @param {object} json - The JSON object to highlight
	 * @param {number} indent - Number of spaces for indentation (default: 2)
	 * @returns {string} HTML string with syntax highlighting (without wrapping pre tag)
	 */
	static highlight(json, indent = 2) {
		const jsonString = JSON.stringify(json, null, indent);

		// Apply syntax highlighting using regex patterns
		const highlighted = jsonString
			// String values (but not keys)
			.replace(/: ("(?:[^"\\]|\\.)*")/g, ': <span class="json-string">$1</span>')
			// Numbers
			.replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
			// Booleans
			.replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
			// Null
			.replace(/: (null)/g, ': <span class="json-null">$1</span>')
			// Keys (property names)
			.replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:');

		return highlighted;
	}

	/**
	 * Returns CSS styles for JSON syntax highlighting.
	 * Uses descendant selectors for higher specificity than container color.
	 * Uses hardcoded colors since VS Code semantic token variables aren't reliably available in webviews.
	 * @returns {string} CSS styles
	 */
	static getStyles() {
		return `
			/* Use descendant selectors for higher specificity */
			.raw-data-display .json-key {
				color: #9CDCFE;
			}

			.raw-data-display .json-string {
				color: #CE9178;
			}

			.raw-data-display .json-number {
				color: #B5CEA8;
			}

			.raw-data-display .json-boolean {
				color: #569CD6;
			}

			.raw-data-display .json-null {
				color: #569CD6;
			}
		`;
	}
}
