import type { FlowConnectionRelationshipViewModel } from '../../application/viewModels/FlowConnectionRelationshipViewModel';
import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';

export interface FlowConnectionRelationshipViewModelWithHtml extends FlowConnectionRelationshipViewModel {
	readonly flowNameHtml: string;
}

/**
 * Renders a clickable flow link HTML string using data-command pattern.
 * @param flowId - GUID of the flow
 * @param flowName - Display name of the flow
 * @returns HTML anchor element as string
 */
export function renderFlowLink(flowId: string, flowName: string): string {
	const escapedId = escapeHtml(flowId);
	const escapedName = escapeHtml(flowName);
	return `<a href="#" class="flow-link" data-command="openFlow" data-flow-id="${escapedId}">${escapedName}</a>`;
}

/**
 * Enhances view models with HTML for clickable flow names.
 * @param viewModels - Array of FlowConnectionRelationshipViewModel objects
 * @returns Array with flowNameHtml property added
 */
export function enhanceViewModelsWithFlowLinks(
	viewModels: FlowConnectionRelationshipViewModel[]
): FlowConnectionRelationshipViewModelWithHtml[] {
	return viewModels.map(vm => ({
		...vm,
		flowNameHtml: vm.flowId
			? renderFlowLink(vm.flowId, vm.flowName ?? 'Unknown')
			: escapeHtml(vm.flowName ?? 'Unknown')
	}));
}
