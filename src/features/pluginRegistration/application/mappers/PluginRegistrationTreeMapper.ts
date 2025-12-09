import type { PluginAssembly } from '../../domain/entities/PluginAssembly';
import type { PluginPackage } from '../../domain/entities/PluginPackage';
import type { PluginStep } from '../../domain/entities/PluginStep';
import type { PluginType } from '../../domain/entities/PluginType';
import type { StepImage } from '../../domain/entities/StepImage';
import type { TreeItemViewModel } from '../viewModels/TreeItemViewModel';
import { PluginAssemblyViewModelMapper } from './PluginAssemblyViewModelMapper';
import { PluginPackageViewModelMapper } from './PluginPackageViewModelMapper';
import { PluginStepViewModelMapper } from './PluginStepViewModelMapper';
import { PluginTypeViewModelMapper } from './PluginTypeViewModelMapper';
import { StepImageViewModelMapper } from './StepImageViewModelMapper';

/**
 * Helper type for assembly tree nodes (reused in packages and standalone).
 */
export type AssemblyTreeNode = {
	assembly: PluginAssembly;
	pluginTypes: ReadonlyArray<{
		pluginType: PluginType;
		steps: ReadonlyArray<{
			step: PluginStep;
			images: ReadonlyArray<StepImage>;
		}>;
	}>;
};

/**
 * Helper type for package tree nodes.
 */
export type PackageTreeNode = {
	package: PluginPackage;
	assemblies: ReadonlyArray<AssemblyTreeNode>;
};

/**
 * Orchestrates all mappers to build tree ViewModels.
 */
export class PluginRegistrationTreeMapper {
	private readonly packageMapper: PluginPackageViewModelMapper;
	private readonly assemblyMapper: PluginAssemblyViewModelMapper;
	private readonly pluginTypeMapper: PluginTypeViewModelMapper;
	private readonly stepMapper: PluginStepViewModelMapper;
	private readonly imageMapper: StepImageViewModelMapper;

	constructor() {
		this.packageMapper = new PluginPackageViewModelMapper();
		this.assemblyMapper = new PluginAssemblyViewModelMapper();
		this.pluginTypeMapper = new PluginTypeViewModelMapper();
		this.stepMapper = new PluginStepViewModelMapper();
		this.imageMapper = new StepImageViewModelMapper();
	}

	/**
	 * Converts domain tree to ViewModels.
	 * Returns array with packages first, then standalone assemblies.
	 */
	public toTreeItems(
		packages: ReadonlyArray<PackageTreeNode>,
		standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>
	): TreeItemViewModel[] {
		const items: TreeItemViewModel[] = [];

		// 1. Map packages with their assemblies
		for (const packageNode of packages) {
			const assemblyItems = this.mapAssemblyNodes(
				packageNode.assemblies,
				packageNode.package.getId()
			);

			items.push(
				this.packageMapper.toTreeItem(
					packageNode.package,
					assemblyItems,
					packageNode.assemblies.length
				)
			);
		}

		// 2. Map standalone assemblies (no parent)
		const standaloneItems = this.mapAssemblyNodes(standaloneAssemblies, null);
		items.push(...standaloneItems);

		return items;
	}

	private mapAssemblyNodes(
		assemblies: ReadonlyArray<AssemblyTreeNode>,
		parentPackageId: string | null
	): TreeItemViewModel[] {
		return assemblies.map((assemblyNode) => {
			const pluginTypeItems = assemblyNode.pluginTypes.map((pluginTypeNode) => {
				const stepItems = pluginTypeNode.steps.map((stepNode) => {
					const imageItems = stepNode.images.map((image) =>
						this.imageMapper.toTreeItem(image, stepNode.step.getId())
					);

					return this.stepMapper.toTreeItem(
						stepNode.step,
						pluginTypeNode.pluginType.getId(),
						imageItems
					);
				});

				return this.pluginTypeMapper.toTreeItem(
					pluginTypeNode.pluginType,
					assemblyNode.assembly.getId(),
					stepItems
				);
			});

			const activeStepCount = this.countActiveSteps(assemblyNode);

			return this.assemblyMapper.toTreeItem(
				assemblyNode.assembly,
				pluginTypeItems,
				activeStepCount,
				parentPackageId
			);
		});
	}

	private countActiveSteps(assemblyNode: AssemblyTreeNode): number {
		let count = 0;
		for (const pluginTypeNode of assemblyNode.pluginTypes) {
			for (const stepNode of pluginTypeNode.steps) {
				if (stepNode.step.isEnabled()) {
					count++;
				}
			}
		}
		return count;
	}
}
