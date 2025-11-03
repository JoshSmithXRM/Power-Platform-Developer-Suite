import type { ImportJobViewModel } from '../../application/viewModels/ImportJobViewModel';
import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';

/**
 * View model with HTML-enhanced solution name for rendering.
 */
export interface ImportJobViewModelWithHtml extends ImportJobViewModel {
	readonly solutionNameHtml: string;
	readonly statusClass: string;
}

/**
 * Maps import job status to CSS class for styling.
 * @param status - Import job status string
 * @returns CSS class name for status coloring
 */
function getStatusClass(status: string): string {
	const statusLower = status.toLowerCase();
	if (statusLower.includes('completed')) {
		return 'status-completed';
	} else if (statusLower.includes('failed')) {
		return 'status-failed';
	} else if (statusLower.includes('progress')) {
		return 'status-in-progress';
	}
	return '';
}

/**
 * Renders a clickable import job link HTML string.
 * @param jobId - GUID of the import job
 * @param solutionName - Display name of the solution
 * @returns HTML anchor element as string
 */
export function renderImportJobLink(jobId: string, solutionName: string): string {
	return `<a href="#" class="job-link" data-job-id="${jobId}">${escapeHtml(solutionName)}</a>`;
}

/**
 * Enhances view models with HTML for clickable solution names and status styling.
 * @param viewModels - Array of ImportJobViewModel objects
 * @returns Array with solutionNameHtml and statusClass properties added
 */
export function enhanceViewModelsWithImportJobLinks(
	viewModels: ImportJobViewModel[]
): ImportJobViewModelWithHtml[] {
	return viewModels.map(vm => ({
		...vm,
		solutionNameHtml: renderImportJobLink(vm.id, vm.solutionName),
		statusClass: getStatusClass(vm.status)
	}));
}
