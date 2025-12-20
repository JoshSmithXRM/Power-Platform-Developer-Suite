import type { PluginAssembly } from '../../domain/entities/PluginAssembly';
import type { PluginPackage } from '../../domain/entities/PluginPackage';
import type { PluginStep } from '../../domain/entities/PluginStep';
import type { PluginType } from '../../domain/entities/PluginType';
import type { StepImage } from '../../domain/entities/StepImage';
import type { WebHook } from '../../domain/entities/WebHook';
import type { ServiceEndpoint } from '../../domain/entities/ServiceEndpoint';
import type { DataProvider } from '../../domain/entities/DataProvider';
import type { CustomApiTreeNode } from '../useCases/LoadPluginRegistrationTreeUseCase';
import type { TreeItemViewModel } from '../viewModels/TreeItemViewModel';

import { PluginAssemblyViewModelMapper } from './PluginAssemblyViewModelMapper';
import { PluginPackageViewModelMapper } from './PluginPackageViewModelMapper';
import { PluginStepViewModelMapper } from './PluginStepViewModelMapper';
import { PluginTypeViewModelMapper } from './PluginTypeViewModelMapper';
import { StepImageViewModelMapper } from './StepImageViewModelMapper';
import { WebHookViewModelMapper } from './WebHookViewModelMapper';
import { ServiceEndpointViewModelMapper } from './ServiceEndpointViewModelMapper';
import { DataProviderViewModelMapper } from './DataProviderViewModelMapper';
import { CustomApiViewModelMapper } from './CustomApiViewModelMapper';

/**
 * Helper interface for assembly tree nodes (reused in packages and standalone).
 */
export interface AssemblyTreeNode {
	assembly: PluginAssembly;
	pluginTypes: ReadonlyArray<{
		pluginType: PluginType;
		steps: ReadonlyArray<{
			step: PluginStep;
			images: ReadonlyArray<StepImage>;
		}>;
	}>;
}

/**
 * Helper interface for package tree nodes.
 */
export interface PackageTreeNode {
	package: PluginPackage;
	assemblies: ReadonlyArray<AssemblyTreeNode>;
}

/**
 * Orchestrates all mappers to build tree ViewModels.
 */
export class PluginRegistrationTreeMapper {
	private readonly packageMapper: PluginPackageViewModelMapper;
	private readonly assemblyMapper: PluginAssemblyViewModelMapper;
	private readonly pluginTypeMapper: PluginTypeViewModelMapper;
	private readonly stepMapper: PluginStepViewModelMapper;
	private readonly imageMapper: StepImageViewModelMapper;
	private readonly webHookMapper: WebHookViewModelMapper;
	private readonly serviceEndpointMapper: ServiceEndpointViewModelMapper;
	private readonly dataProviderMapper: DataProviderViewModelMapper;
	private readonly customApiMapper: CustomApiViewModelMapper;

	constructor() {
		this.packageMapper = new PluginPackageViewModelMapper();
		this.assemblyMapper = new PluginAssemblyViewModelMapper();
		this.pluginTypeMapper = new PluginTypeViewModelMapper();
		this.stepMapper = new PluginStepViewModelMapper();
		this.imageMapper = new StepImageViewModelMapper();
		this.webHookMapper = new WebHookViewModelMapper();
		this.serviceEndpointMapper = new ServiceEndpointViewModelMapper();
		this.dataProviderMapper = new DataProviderViewModelMapper();
		this.customApiMapper = new CustomApiViewModelMapper();
	}

	/**
	 * Converts domain tree to ViewModels.
	 * Returns array with packages first, then standalone assemblies, then webhooks, then service endpoints,
	 * then data providers, then custom APIs.
	 */
	public toTreeItems(
		packages: ReadonlyArray<PackageTreeNode>,
		standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>,
		webHooks: ReadonlyArray<WebHook> = [],
		serviceEndpoints: ReadonlyArray<ServiceEndpoint> = [],
		dataProviders: ReadonlyArray<DataProvider> = [],
		customApis: ReadonlyArray<CustomApiTreeNode> = []
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

		// 3. Map webhooks (root-level, no children initially)
		for (const webHook of webHooks) {
			items.push(this.webHookMapper.toTreeItem(webHook));
		}

		// 4. Map service endpoints (root-level, no children initially)
		for (const endpoint of serviceEndpoints) {
			items.push(this.serviceEndpointMapper.toTreeItem(endpoint));
		}

		// 5. Map data providers (root-level, no children)
		for (const dataProvider of dataProviders) {
			items.push(this.dataProviderMapper.toTreeItem(dataProvider));
		}

		// 6. Map custom APIs (root-level, no children - parameters managed in modal)
		for (const customApiNode of customApis) {
			items.push(
				this.customApiMapper.toTreeItem(
					customApiNode.customApi,
					customApiNode.requestParameterCount,
					customApiNode.responsePropertyCount
				)
			);
		}

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
