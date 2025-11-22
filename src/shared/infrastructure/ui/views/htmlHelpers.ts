/**
 * HTML utility functions for view rendering.
 * Provides safe HTML generation helpers.
 */

import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';

export { escapeHtml };

/**
 * Generates CSS class string from conditional classes.
 * @param classes - Object with class names as keys and boolean conditions as values
 * @returns Space-separated class string
 *
 * @example
 * ```typescript
 * classNames({ 'active': isActive, 'disabled': isDisabled })
 * // Returns: "active" (if isActive=true, isDisabled=false)
 * ```
 */
export function classNames(classes: Record<string, boolean>): string {
	return Object.entries(classes)
		.filter(([_, condition]) => condition)
		.map(([className]) => className)
		.join(' ');
}

/**
 * Generates HTML attribute string from object.
 * @param attrs - Object with attribute names as keys and values
 * @returns Space-separated attribute string
 *
 * @example
 * ```typescript
 * attributes({ 'data-id': '123', 'aria-label': 'Close' })
 * // Returns: 'data-id="123" aria-label="Close"'
 * ```
 */
export function attributes(attrs: Record<string, string | number | boolean | undefined>): string {
	return Object.entries(attrs)
		.filter(([_, value]) => value !== undefined)
		.map(([key, value]) => {
			if (typeof value === 'boolean') {
				return value ? key : '';
			}
			return `${key}="${escapeHtml(String(value))}"`;
		})
		.filter(attr => attr !== '')
		.join(' ');
}
