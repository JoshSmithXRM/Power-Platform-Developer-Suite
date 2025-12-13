import type { PluginType } from '../../domain/entities/PluginType';
import type { PluginTypeMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps PluginType domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class PluginTypeViewModelMapper {
	public toTreeItem(
		pluginType: PluginType,
		assemblyId: string,
		steps: TreeItemViewModel[]
	): TreeItemViewModel {
		const metadata: PluginTypeMetadata = {
			type: 'pluginType',
			typeName: pluginType.getName(),
			friendlyName: pluginType.getFriendlyName(),
			isWorkflowActivity: pluginType.isWorkflowActivity(),
			workflowActivityGroupName: pluginType.getWorkflowActivityGroupName(),
		};

		return {
			id: pluginType.getId(),
			parentId: assemblyId,
			type: 'pluginType',
			name: pluginType.getName(),
			displayName: pluginType.getName(),
			icon: pluginType.isWorkflowActivity() ? '🔶' : '🔌',
			metadata,
			isManaged: false,
			children: steps,
		};
	}
}
