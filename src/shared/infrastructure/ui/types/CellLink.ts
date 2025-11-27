/**
 * Structured data for creating a clickable link in a table cell.
 *
 * Instead of passing pre-rendered HTML (XSS risk), we pass structured data
 * that the renderer uses to safely create DOM elements.
 *
 * @example
 * // In mapper:
 * {
 *   friendlyName: 'My Solution',
 *   friendlyNameLink: {
 *     command: 'openInMaker',
 *     commandData: { 'solution-id': '123' },
 *     className: 'solution-link'
 *   }
 * }
 *
 * // Renderer creates:
 * <a href="#" class="solution-link" data-command="openInMaker" data-solution-id="123">My Solution</a>
 */
export interface CellLink {
	/** Command to execute when link is clicked (maps to data-command attribute) */
	readonly command: string;

	/** Additional data attributes for the command (e.g., { 'solution-id': '123' } becomes data-solution-id="123") */
	readonly commandData: Readonly<Record<string, string>>;

	/** CSS class for styling the link */
	readonly className: string;

	/** Optional title/tooltip for the link (defaults to cell text if not provided) */
	readonly title?: string;
}

/**
 * Type guard to check if a value is a CellLink.
 */
export function isCellLink(value: unknown): value is CellLink {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return (
		typeof obj['command'] === 'string' &&
		typeof obj['commandData'] === 'object' &&
		obj['commandData'] !== null &&
		typeof obj['className'] === 'string'
	);
}
