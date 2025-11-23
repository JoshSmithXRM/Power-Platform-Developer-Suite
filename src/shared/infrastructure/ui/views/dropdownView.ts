import type { DropdownRenderConfig } from '../types/DropdownTypes';

import { escapeHtml } from './htmlHelpers';

/**
 * View rendering: Dropdown
 *
 * Generates HTML for dropdown button with menu.
 * Shared utility for all dropdown sections.
 */
export function renderDropdown(config: DropdownRenderConfig): string {
	const { id, label, icon, items, currentSelectionId, variant = 'default' } = config;

	const buttonClass = `dropdown-button dropdown-button--${variant}`;
	const iconHtml = icon ? `<span class="codicon codicon-${escapeHtml(icon)}"></span>` : '';

	const itemsHtml = items
		.map(item => {
			if (item.separator) {
				return '<div class="dropdown-separator"></div>';
			}

			const disabledClass = item.disabled ? ' dropdown-item--disabled' : '';
			const selectedClass = item.id === currentSelectionId ? ' dropdown-item--selected' : '';

			// Use simple Unicode checkmark if codicons don't work
			const checkmark =
				item.id === currentSelectionId
					? '<span style="color: var(--vscode-testing-iconPassed); font-size: 16px; width: 16px; display: inline-block; text-align: center;">✓</span>'
					: '<span class="dropdown-item-spacer"></span>';

			const itemIcon = item.icon
				? `<span class="codicon codicon-${escapeHtml(item.icon)}"></span>`
				: '';

			return `
			<div class="dropdown-item${disabledClass}${selectedClass}"
			     data-dropdown-id="${escapeHtml(id)}"
			     data-dropdown-item-id="${escapeHtml(item.id)}"
			     ${item.disabled ? 'data-disabled="true"' : ''}>
				${checkmark}
				${itemIcon}
				<span class="dropdown-item-label">${escapeHtml(item.label)}</span>
			</div>
		`;
		})
		.join('');

	return `
		<div class="dropdown" data-dropdown-id="${escapeHtml(id)}">
			<button class="${buttonClass}"
			        id="${escapeHtml(id)}"
			        data-dropdown-trigger="${escapeHtml(id)}">
				${iconHtml}
				<span class="dropdown-label">${escapeHtml(label)}</span>
				<span class="codicon codicon-chevron-down"></span>
			</button>
			<div class="dropdown-menu" data-dropdown-menu="${escapeHtml(id)}" style="display: none;">
				${itemsHtml}
			</div>
		</div>
	`;
}
