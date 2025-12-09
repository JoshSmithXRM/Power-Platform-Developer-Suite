import type { PluginPackage } from '../../domain/entities/PluginPackage';
import type { PackageMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps PluginPackage domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class PluginPackageViewModelMapper {
	public toTreeItem(
		pkg: PluginPackage,
		assemblies: TreeItemViewModel[],
		assemblyCount: number
	): TreeItemViewModel {
		const metadata: PackageMetadata = {
			type: 'package',
			uniqueName: pkg.getUniqueName(),
			version: pkg.getVersion(),
			createdOn: pkg.getCreatedOn().toISOString(),
			modifiedOn: pkg.getModifiedOn().toISOString(),
			canUpdate: pkg.canUpdate(),
			canDelete: pkg.canDelete(assemblyCount),
		};

		return {
			id: pkg.getId(),
			parentId: null,
			type: 'package',
			name: pkg.getName(),
			displayName: `${pkg.getName()} (${pkg.getDisplayVersion()})`,
			icon: '📦',
			metadata,
			isManaged: pkg.isInManagedState(),
			children: assemblies,
		};
	}
}
