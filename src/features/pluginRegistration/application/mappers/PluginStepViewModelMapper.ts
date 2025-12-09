import type { PluginStep } from '../../domain/entities/PluginStep';
import type { StepMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps PluginStep domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class PluginStepViewModelMapper {
	public toTreeItem(
		step: PluginStep,
		pluginTypeId: string,
		images: TreeItemViewModel[]
	): TreeItemViewModel {
		const entityDisplay = step.getPrimaryEntityLogicalName() ?? 'none';

		const metadata: StepMetadata = {
			type: 'step',
			messageName: step.getMessageName(),
			primaryEntityLogicalName: step.getPrimaryEntityLogicalName(),
			stage: step.getStage().getName(),
			mode: step.getMode().getName(),
			rank: step.getRank(),
			isEnabled: step.isEnabled(),
			filteringAttributes: step.getFilteringAttributesArray(),
			executionOrder: step.getExecutionOrder(),
			createdOn: step.getCreatedOn().toISOString(),
			canEnable: step.canEnable(),
			canDisable: step.canDisable(),
			canDelete: step.canDelete(),
		};

		return {
			id: step.getId(),
			parentId: pluginTypeId,
			type: 'step',
			name: step.getName(),
			displayName: `${step.getMessageName()}: ${entityDisplay}`,
			icon: step.isEnabled() ? 'symbol-event' : 'circle-slash',
			metadata,
			isManaged: step.isInManagedState(),
			children: images,
		};
	}
}
