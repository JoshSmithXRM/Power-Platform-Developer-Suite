/**
 * View rendering for SolutionFilterSection.
 * Generates HTML for solution dropdown filter.
 */

import { escapeHtml } from './htmlHelpers';

export interface SolutionOption {
	readonly id: string;
	readonly name: string;
	readonly uniqueName: string;
}

/**
 * Renders solution filter dropdown.
 * @param solutions - Available solutions
 * @param currentSolutionId - Currently selected solution ID
 * @param label - Label text for the filter
 * @param includeAllOption - Whether to include an "All" option for showing all items
 * @returns HTML string with solution filter
 */
export function renderSolutionFilter(
	solutions: ReadonlyArray<SolutionOption>,
	currentSolutionId: string | undefined,
	label: string,
	includeAllOption = true
): string {
	if (solutions.length === 0) {
		return '';
	}

	const allOption = includeAllOption
		? `<option value=""${!currentSolutionId ? ' selected' : ''}>All Solutions</option>`
		: '';

	const options = solutions.map(solution => {
		const selected = solution.id === currentSolutionId ? ' selected' : '';
		return `<option value="${escapeHtml(solution.id)}"${selected}>${escapeHtml(solution.name)}</option>`;
	}).join('');

	return `
		<div class="solution-filter">
			<label for="solutionSelect">${escapeHtml(label)}</label>
			<select id="solutionSelect">
				${allOption}
				${options}
			</select>
		</div>
	`;
}
