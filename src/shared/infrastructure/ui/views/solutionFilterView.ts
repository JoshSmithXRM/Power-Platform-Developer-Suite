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
 *
 * The Default Solution (which exists in every Dataverse environment) acts as the
 * "show all" option since it contains all unmanaged customizations.
 *
 * @param solutions - Available solutions from the API (should include Default Solution)
 * @param currentSolutionId - Currently selected solution ID (defaults to Default Solution)
 * @param label - Label text for the filter
 * @returns HTML string with solution filter
 */
export function renderSolutionFilter(
	solutions: ReadonlyArray<SolutionOption>,
	currentSolutionId: string | undefined,
	label: string
): string {
	if (solutions.length === 0) {
		return '';
	}

	const options = solutions.map(solution => {
		const selected = solution.id === currentSolutionId ? ' selected' : '';
		return `<option value="${escapeHtml(solution.id)}"${selected}>${escapeHtml(solution.name)}</option>`;
	}).join('');

	return `
		<div class="solution-filter">
			<label for="solutionSelect">${escapeHtml(label)}</label>
			<select id="solutionSelect">
				${options}
			</select>
		</div>
	`;
}
