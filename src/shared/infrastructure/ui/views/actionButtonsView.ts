/**
 * View rendering for ActionButtonsSection.
 * Generates HTML for action buttons (toolbar, footer, etc.).
 */

import type { ButtonConfig } from '../types/ButtonConfig';

import { escapeHtml } from './htmlHelpers';

/**
 * Renders action buttons.
 * @param buttons - Button configurations
 * @param position - Optional button container alignment
 * @returns HTML string with buttons
 */
export function renderActionButtons(
	buttons: ReadonlyArray<ButtonConfig>,
	position?: 'left' | 'right' | 'center'
): string {
	if (buttons.length === 0) {
		return '';
	}

	const alignmentClass = position ? `align-${position}` : '';

	return `
		<div class="action-buttons ${alignmentClass}">
			${buttons.map(btn => renderButton(btn)).join('\n')}
		</div>
	`;
}

/**
 * Renders a single button.
 */
function renderButton(button: ButtonConfig): string {
	const variantClass = button.variant ? `btn-${button.variant}` : 'btn-default';
	const disabledAttr = button.disabled ? ' disabled' : '';
	const icon = button.icon ? `<span class="btn-icon">${escapeHtml(button.icon)}</span>` : '';

	return `
		<button
			id="${escapeHtml(button.id)}"
			class="btn ${variantClass}"${disabledAttr}
		>
			${icon}
			<span class="btn-label">${escapeHtml(button.label)}</span>
		</button>
	`;
}
