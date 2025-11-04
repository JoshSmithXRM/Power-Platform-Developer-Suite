import type { SolutionViewModel } from '../../application/viewModels/SolutionViewModel';
import { renderDataTableLink } from '../../../../shared/infrastructure/ui/views/clickableLinks';

/**
 * View model with HTML-enhanced solution friendly name for rendering.
 */
export interface SolutionViewModelWithHtml extends SolutionViewModel {
	readonly friendlyNameHtml: string;
}

/**
 * Renders a clickable solution link HTML string.
 * @param solutionId - GUID of the solution
 * @param friendlyName - Display name of the solution
 * @returns HTML anchor element as string
 */
export function renderSolutionLink(solutionId: string, friendlyName: string): string {
	return renderDataTableLink('solution-link', solutionId, friendlyName);
}

/**
 * Enhances view models with HTML for clickable solution friendly names.
 * @param viewModels - Array of SolutionViewModel objects
 * @returns Array with friendlyNameHtml property added
 */
export function enhanceViewModelsWithSolutionLinks(
	viewModels: SolutionViewModel[]
): SolutionViewModelWithHtml[] {
	return viewModels.map(vm => ({
		...vm,
		friendlyNameHtml: renderSolutionLink(vm.id, vm.friendlyName)
	}));
}
