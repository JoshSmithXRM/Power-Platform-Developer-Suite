/**
 * View rendering for EnvironmentSelectorSection.
 * Generates HTML for environment dropdown selector.
 */

import type { EnvironmentOption } from '../types/EnvironmentSelectorTypes';

import { escapeHtml } from './htmlHelpers';

/**
 * Renders environment selector dropdown.
 * @param environments - Available environments
 * @param currentEnvironmentId - Currently selected environment ID
 * @param label - Label text for the selector
 * @returns HTML string with environment selector
 */
export function renderEnvironmentSelector(
	environments: ReadonlyArray<EnvironmentOption>,
	currentEnvironmentId: string | undefined,
	label: string
): string {
	if (environments.length === 0) {
		return '';
	}

	const options = environments.map(env => {
		const selected = env.id === currentEnvironmentId ? ' selected' : '';
		return `<option value="${escapeHtml(env.id)}"${selected}>${escapeHtml(env.name)}</option>`;
	}).join('');

	return `
		<div class="environment-selector">
			<label for="environmentSelect">${escapeHtml(label)}</label>
			<select id="environmentSelect">
				${options}
			</select>
		</div>
	`;
}
