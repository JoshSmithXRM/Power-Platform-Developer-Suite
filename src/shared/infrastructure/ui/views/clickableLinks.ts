/**
 * Shared utilities for rendering clickable links in data tables.
 * Provides consistent link rendering and event handler generation across all panels.
 */

import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';

/**
 * Renders a generic clickable link for data table cells.
 *
 * @param cssClass - CSS class for link styling and selection
 * @param entityId - ID to store in data-id attribute
 * @param displayText - Text to display (will be HTML-escaped)
 * @returns HTML anchor element as string
 */
export function renderDataTableLink(cssClass: string, entityId: string, displayText: string): string {
	const escapedText = escapeHtml(displayText);
	return `<a href="#" class="${cssClass}" data-id="${entityId}" title="${escapedText}">${escapedText}</a>`;
}

/**
 * Generates JavaScript for attaching click handlers to data table links.
 *
 * @param cssSelector - CSS selector for links (e.g., '.solution-link')
 * @param command - Webview command to send
 * @param dataKey - Key name for data payload (e.g., 'solutionId')
 * @returns JavaScript code snippet
 */
export function renderLinkClickHandler(
	cssSelector: string,
	command: string,
	dataKey: string
): string {
	return `
		document.querySelectorAll('${cssSelector}').forEach(link => {
			link.addEventListener('click', (e) => {
				e.preventDefault();
				const entityId = link.getAttribute('data-id');
				vscode.postMessage({
					command: '${command}',
					data: { ${dataKey}: entityId }
				});
			});
		});
	`;
}
