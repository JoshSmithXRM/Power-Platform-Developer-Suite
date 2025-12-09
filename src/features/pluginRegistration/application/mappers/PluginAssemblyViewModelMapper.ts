import type { PluginAssembly } from '../../domain/entities/PluginAssembly';
import type { AssemblyMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps PluginAssembly domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class PluginAssemblyViewModelMapper {
	public toTreeItem(
		assembly: PluginAssembly,
		pluginTypes: TreeItemViewModel[],
		activeStepCount: number,
		parentPackageId: string | null = null
	): TreeItemViewModel {
		const metadata: AssemblyMetadata = {
			type: 'assembly',
			version: assembly.getVersion(),
			isolationMode: assembly.getIsolationMode().getName(),
			sourceType: assembly.getSourceType().getName(),
			createdOn: assembly.getCreatedOn().toISOString(),
			modifiedOn: assembly.getModifiedOn().toISOString(),
			canUpdate: assembly.canUpdate(),
			canDelete: assembly.canDelete(activeStepCount),
		};

		return {
			id: assembly.getId(),
			parentId: parentPackageId,
			type: 'assembly',
			name: assembly.getName(),
			displayName: `${assembly.getName()} (${assembly.getDisplayVersion()})`,
			icon: '⚙️',
			metadata,
			isManaged: assembly.isInManagedState(),
			children: pluginTypes,
		};
	}
}
