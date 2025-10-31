/**
 * HTML utility functions for safe HTML generation in webviews.
 *
 * This module provides utilities for generating HTML with automatic XSS protection.
 * All functions work in Node.js Extension Host context (no DOM available).
 */

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Works in Node.js Extension Host context.
 *
 * @param text - Text to escape (null/undefined returns empty string)
 * @returns Escaped HTML-safe string
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(text: string | null | undefined): string {
	if (text == null) {
		return '';
	}

	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Marker interface for trusted HTML that should not be escaped.
 */
interface RawHtml {
	__html: string;
}

/**
 * Type guard to check if a value is RawHtml.
 */
function isRawHtml(value: unknown): value is RawHtml {
	return typeof value === 'object' && value !== null && '__html' in value;
}

/**
 * Marks HTML as trusted and prevents escaping.
 * USE SPARINGLY - only for HTML from other view functions.
 *
 * @param html - Trusted HTML string
 * @returns RawHtml marker object
 *
 * @example
 * const header = renderHeader();
 * html`<div>${raw(header)}</div>`  // Don't escape header HTML
 */
export function raw(html: string): RawHtml {
	return { __html: html };
}

/**
 * Tagged template literal for HTML with automatic escaping.
 * Interpolated values are automatically escaped unless wrapped with raw().
 *
 * @param strings - Template string parts
 * @param values - Interpolated values (auto-escaped)
 * @returns HTML string with escaped values
 *
 * @example
 * const userInput = '<script>alert("xss")</script>';
 * html`<div>${userInput}</div>`
 * // Returns: '<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>'
 *
 * @example
 * const items = ['Apple', 'Banana', 'Orange'];
 * html`<ul>${items.map(item => html`<li>${item}</li>`)}</ul>`
 * // Auto-flattens arrays from .map()
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): RawHtml {
	let result = strings[0];

	for (let i = 0; i < values.length; i++) {
		const value = values[i];

		if (isRawHtml(value)) {
			// Don't escape raw HTML
			result += value.__html;
		} else if (Array.isArray(value)) {
			// Handle arrays from .map() - join without separators
			result += value.map(v => {
				if (isRawHtml(v)) {
					return v.__html;
				}
				return escapeHtml(String(v));
			}).join('');
		} else if (value === null || value === undefined) {
			// Skip null/undefined - don't add anything
		} else {
			// Escape regular values
			result += escapeHtml(String(value));
		}

		result += strings[i + 1];
	}

	// Return as RawHtml so nested calls don't double-escape
	return raw(result);
}

/**
 * Utility function to render arrays of HTML elements.
 * Useful for .map() operations with type safety.
 *
 * @param items - Array of items to render
 * @param fn - Function to render each item (can return string or RawHtml)
 * @returns RawHtml with joined results
 *
 * @example
 * const items = ['Apple', 'Banana', 'Orange'];
 * html`<ul>${each(items, item => html`<li>${item}</li>`)}</ul>`
 */
export function each<T>(items: T[], fn: (item: T, index: number) => string | RawHtml): RawHtml {
	return raw(items.map((item, index) => {
		const result = fn(item, index);
		if (isRawHtml(result)) {
			return result.__html;
		}
		return result;
	}).join(''));
}

/**
 * Utility function to create an HTML fragment from multiple elements.
 *
 * @param parts - HTML strings to combine
 * @returns RawHtml with combined parts
 *
 * @example
 * const page = fragment(
 *   renderHeader(),
 *   renderContent(),
 *   renderFooter()
 * );
 */
export function fragment(...parts: string[]): RawHtml {
	return raw(parts.join(''));
}

/**
 * Utility function to create HTML attributes from an object.
 * Filters out falsy values and handles boolean attributes correctly.
 *
 * @param attributes - Attribute key-value pairs
 * @returns RawHtml with space-separated attributes
 *
 * @example
 * html`<input ${attrs({ type: 'text', required: true, disabled: false })} />`
 * // Returns: <input type="text" required />
 *
 * @example
 * html`<div ${attrs({ class: 'container', 'data-id': '123' })}></div>`
 * // Returns: <div class="container" data-id="123"></div>
 */
export function attrs(attributes: Record<string, string | number | boolean | null | undefined>): RawHtml {
	const parts: string[] = [];

	for (const [key, value] of Object.entries(attributes)) {
		if (value === null || value === undefined || value === false) {
			// Skip falsy values
			continue;
		}

		if (value === true) {
			// Boolean attribute (e.g., required, disabled)
			parts.push(key);
		} else {
			// Regular attribute with escaped value
			parts.push(`${key}="${escapeHtml(String(value))}"`);
		}
	}

	return raw(parts.join(' '));
}

/**
 * Escapes HTML attribute values.
 * Alias for escapeHtml - attributes need the same escaping as content.
 *
 * @param text - Text to escape
 * @returns Escaped attribute-safe string
 */
export function escapeAttribute(text: string | null | undefined): string {
	return escapeHtml(text);
}
