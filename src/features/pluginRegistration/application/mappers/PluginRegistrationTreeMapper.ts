import type { PluginAssembly } from '../../domain/entities/PluginAssembly';
import type { PluginPackage } from '../../domain/entities/PluginPackage';
import type { PluginStep } from '../../domain/entities/PluginStep';
import type { PluginType } from '../../domain/entities/PluginType';
import type { StepImage } from '../../domain/entities/StepImage';
import type { WebHook } from '../../domain/entities/WebHook';
import type { ServiceEndpoint } from '../../domain/entities/ServiceEndpoint';
import type { DataProvider } from '../../domain/entities/DataProvider';
import type { CustomApiTreeNode } from '../useCases/LoadPluginRegistrationTreeUseCase';

/**
 * Context for building service endpoint step trees.
 */
export interface ServiceEndpointStepContext {
	readonly stepsByServiceEndpointId: Map<string, readonly PluginStep[]>;
	readonly imagesByStepId: Map<string, readonly StepImage[]>;
}
import type {
	TreeItemViewModel,
	SdkMessageMetadata,
	EntityGroupMetadata,
} from '../viewModels/TreeItemViewModel';
import { TreeViewMode } from '../enums/TreeViewMode';

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
 * Internal interface for step extraction with context.
 */
interface StepWithContext {
	readonly step: PluginStep;
	readonly images: ReadonlyArray<StepImage>;
	readonly pluginTypeId: string;
}

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
	 * Converts domain tree to ViewModels based on view mode.
	 *
	 * @param viewMode - Display mode (Assembly or Message)
	 * @param packages - Package tree nodes
	 * @param standaloneAssemblies - Standalone assembly tree nodes
	 * @param webHooks - WebHooks (root-level in Assembly view only)
	 * @param serviceEndpoints - Service endpoints (root-level in Assembly view only)
	 * @param dataProviders - Data providers (root-level in Assembly view only)
	 * @param customApis - Custom APIs (root-level in Message view only)
	 * @param stepContext - Context for building service endpoint step trees
	 * @returns Tree items for rendering
	 */
	public toTreeItems(
		viewMode: TreeViewMode,
		packages: ReadonlyArray<PackageTreeNode>,
		standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>,
		webHooks: ReadonlyArray<WebHook> = [],
		serviceEndpoints: ReadonlyArray<ServiceEndpoint> = [],
		dataProviders: ReadonlyArray<DataProvider> = [],
		customApis: ReadonlyArray<CustomApiTreeNode> = [],
		stepContext?: ServiceEndpointStepContext
	): TreeItemViewModel[] {
		switch (viewMode) {
			case TreeViewMode.Message:
				return this.buildMessageViewTree(packages, standaloneAssemblies, customApis);
			case TreeViewMode.Entity:
				return this.buildEntityViewTree(packages, standaloneAssemblies);
			case TreeViewMode.Assembly:
			default:
				return this.buildAssemblyViewTree(
					packages,
					standaloneAssemblies,
					webHooks,
					serviceEndpoints,
					dataProviders,
					stepContext
				);
		}
	}

	/**
	 * Builds Assembly View tree (default).
	 * Hierarchy: Packages -> Assemblies -> PluginTypes -> Steps -> Images
	 * Plus WebHooks, ServiceEndpoints, DataProviders at root.
	 * NOTE: Custom APIs are NOT shown in Assembly View - they appear in Message View only.
	 */
	private buildAssemblyViewTree(
		packages: ReadonlyArray<PackageTreeNode>,
		standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>,
		webHooks: ReadonlyArray<WebHook>,
		serviceEndpoints: ReadonlyArray<ServiceEndpoint>,
		dataProviders: ReadonlyArray<DataProvider>,
		stepContext?: ServiceEndpointStepContext
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

		// 3. Map webhooks with their steps
		for (const webHook of webHooks) {
			const stepItems = this.buildServiceEndpointStepChildren(webHook.getId(), stepContext);
			items.push(this.webHookMapper.toTreeItem(webHook, stepItems));
		}

		// 4. Map service endpoints with their steps
		for (const endpoint of serviceEndpoints) {
			const stepItems = this.buildServiceEndpointStepChildren(endpoint.getId(), stepContext);
			items.push(this.serviceEndpointMapper.toTreeItem(endpoint, stepItems));
		}

		// 5. Map data providers (root-level, no children)
		for (const dataProvider of dataProviders) {
			items.push(this.dataProviderMapper.toTreeItem(dataProvider));
		}

		// NOTE: Custom APIs are NOT in Assembly View - they appear in Message View only

		return items;
	}

	/**
	 * Builds step children for a service endpoint (WebHook or ServiceEndpoint).
	 */
	private buildServiceEndpointStepChildren(
		serviceEndpointId: string,
		stepContext?: ServiceEndpointStepContext
	): TreeItemViewModel[] {
		if (!stepContext) {
			return [];
		}

		const steps = stepContext.stepsByServiceEndpointId.get(serviceEndpointId) ?? [];
		return steps.map((step) => {
			const images = stepContext.imagesByStepId.get(step.getId()) ?? [];
			const imageItems = images.map((image) =>
				this.imageMapper.toTreeItem(image, step.getId())
			);
			return this.stepMapper.toTreeItem(step, serviceEndpointId, imageItems);
		});
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

	// ============================================================================
	// Message View Methods
	// ============================================================================

	/**
	 * Builds Message View tree.
	 * Hierarchy: Custom APIs (root) -> Messages -> Entities -> Steps -> Images
	 * Custom APIs appear ONLY in this view (not Assembly or Entity views).
	 */
	private buildMessageViewTree(
		packages: ReadonlyArray<PackageTreeNode>,
		standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>,
		customApis: ReadonlyArray<CustomApiTreeNode>
	): TreeItemViewModel[] {
		const items: TreeItemViewModel[] = [];

		// 1. Map custom APIs at root (same as Assembly view)
		for (const customApiNode of customApis) {
			items.push(
				this.customApiMapper.toTreeItem(
					customApiNode.customApi,
					customApiNode.requestParameterCount,
					customApiNode.responsePropertyCount
				)
			);
		}

		// 2. Extract all steps from assembly hierarchy
		const stepsWithContext = this.extractAllSteps(packages, standaloneAssemblies);

		// 3. Group steps by message and entity
		const groupedSteps = this.groupStepsByMessageAndEntity(stepsWithContext);

		// 4. Build message and entity nodes
		const messageItems = this.buildMessageNodes(groupedSteps);
		items.push(...messageItems);

		return items;
	}

	/**
	 * Extracts all steps from packages and standalone assemblies.
	 */
	private extractAllSteps(
		packages: ReadonlyArray<PackageTreeNode>,
		standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>
	): StepWithContext[] {
		const steps: StepWithContext[] = [];

		// Extract from packages
		for (const packageNode of packages) {
			for (const assemblyNode of packageNode.assemblies) {
				this.extractStepsFromAssembly(assemblyNode, steps);
			}
		}

		// Extract from standalone assemblies
		for (const assemblyNode of standaloneAssemblies) {
			this.extractStepsFromAssembly(assemblyNode, steps);
		}

		return steps;
	}

	/**
	 * Extracts steps from a single assembly node.
	 */
	private extractStepsFromAssembly(
		assemblyNode: AssemblyTreeNode,
		steps: StepWithContext[]
	): void {
		for (const pluginTypeNode of assemblyNode.pluginTypes) {
			for (const stepNode of pluginTypeNode.steps) {
				steps.push({
					step: stepNode.step,
					images: stepNode.images,
					pluginTypeId: pluginTypeNode.pluginType.getId(),
				});
			}
		}
	}

	/**
	 * Groups steps by message name, then by entity (if applicable).
	 * Returns: Map<messageName, Map<entityName | null, StepWithContext[]>>
	 */
	private groupStepsByMessageAndEntity(
		steps: StepWithContext[]
	): Map<string, Map<string | null, StepWithContext[]>> {
		const grouped = new Map<string, Map<string | null, StepWithContext[]>>();

		for (const stepCtx of steps) {
			const messageName = stepCtx.step.getMessageName();
			const entityName = stepCtx.step.getPrimaryEntityLogicalName();

			if (!grouped.has(messageName)) {
				grouped.set(messageName, new Map());
			}

			const entityMap = grouped.get(messageName)!;
			if (!entityMap.has(entityName)) {
				entityMap.set(entityName, []);
			}

			entityMap.get(entityName)!.push(stepCtx);
		}

		return grouped;
	}

	/**
	 * Builds message and entity tree nodes from grouped steps.
	 */
	private buildMessageNodes(
		groupedSteps: Map<string, Map<string | null, StepWithContext[]>>
	): TreeItemViewModel[] {
		const items: TreeItemViewModel[] = [];

		// Sort messages alphabetically
		const sortedMessages = [...groupedSteps.keys()].sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' })
		);

		for (const messageName of sortedMessages) {
			const entityMap = groupedSteps.get(messageName)!;
			const messageNodeId = `msg:${messageName}`;

			// Count total steps for this message
			let totalStepCount = 0;
			for (const entitySteps of entityMap.values()) {
				totalStepCount += entitySteps.length;
			}

			// Check if any step has an entity
			const hasEntityGroups = [...entityMap.keys()].some((e) => e !== null);

			// Build children (entity nodes or direct steps)
			const messageChildren = this.buildMessageChildren(
				messageNodeId,
				messageName,
				entityMap
			);

			// Skip messages with no visible children
			if (messageChildren.length === 0) {
				continue;
			}

			// Create message metadata
			const messageMetadata: SdkMessageMetadata = {
				type: 'sdkMessage',
				messageName,
				stepCount: totalStepCount,
				hasEntityGroups,
			};

			// Create message node
			const messageNode: TreeItemViewModel = {
				id: messageNodeId,
				parentId: null,
				type: 'sdkMessage',
				name: messageName,
				displayName: `${messageName} (${totalStepCount})`,
				icon: '📨', // Message icon
				metadata: messageMetadata,
				isManaged: false, // Message nodes are grouping nodes, not managed
				children: messageChildren,
			};

			items.push(messageNode);
		}

		return items;
	}

	/**
	 * Builds children for a message node (entity groups or direct steps).
	 */
	private buildMessageChildren(
		messageNodeId: string,
		messageName: string,
		entityMap: Map<string | null, StepWithContext[]>
	): TreeItemViewModel[] {
		const children: TreeItemViewModel[] = [];

		// Sort entities alphabetically (null entities last)
		const sortedEntities = [...entityMap.keys()].sort((a, b) => {
			if (a === null) return 1;
			if (b === null) return -1;
			return a.localeCompare(b, undefined, { sensitivity: 'base' });
		});

		for (const entityName of sortedEntities) {
			const stepsWithContext = entityMap.get(entityName)!;

			if (entityName === null) {
				// Steps without entity go directly under message
				for (const stepCtx of stepsWithContext) {
					const imageItems = stepCtx.images.map((image) =>
						this.imageMapper.toTreeItem(image, stepCtx.step.getId())
					);

					// Create step with message as parent
					const stepItem = this.createStepForMessageView(
						stepCtx.step,
						messageNodeId,
						imageItems
					);
					children.push(stepItem);
				}
			} else {
				// Create entity group node
				const entityNodeId = `msg:${messageName}:entity:${entityName}`;

				const entityMetadata: EntityGroupMetadata = {
					type: 'entityGroup',
					messageName,
					entityLogicalName: entityName,
					stepCount: stepsWithContext.length,
				};

				// Build step children for this entity
				const entityStepItems: TreeItemViewModel[] = [];
				for (const stepCtx of stepsWithContext) {
					const imageItems = stepCtx.images.map((image) =>
						this.imageMapper.toTreeItem(image, stepCtx.step.getId())
					);

					const stepItem = this.createStepForMessageView(
						stepCtx.step,
						entityNodeId,
						imageItems
					);
					entityStepItems.push(stepItem);
				}

				const entityNode: TreeItemViewModel = {
					id: entityNodeId,
					parentId: messageNodeId,
					type: 'entityGroup',
					name: entityName,
					displayName: `${entityName} (${stepsWithContext.length})`,
					icon: '📋', // Entity icon
					metadata: entityMetadata,
					isManaged: false, // Entity nodes are grouping nodes
					children: entityStepItems,
				};

				children.push(entityNode);
			}
		}

		return children;
	}

	/**
	 * Creates a step tree item for Message View with the given parent ID.
	 */
	private createStepForMessageView(
		step: PluginStep,
		parentId: string,
		images: TreeItemViewModel[]
	): TreeItemViewModel {
		// Reuse step mapper logic but override parentId
		const baseStepItem = this.stepMapper.toTreeItem(step, parentId, images);

		// Return with updated parentId
		return {
			...baseStepItem,
			parentId,
		};
	}

	// ============================================================================
	// Entity View Methods
	// ============================================================================

	/**
	 * Builds Entity View tree.
	 * Hierarchy: Entities -> Messages -> Steps -> Images
	 * Custom APIs are NOT shown in Entity View (they appear only in Message View).
	 */
	private buildEntityViewTree(
		packages: ReadonlyArray<PackageTreeNode>,
		standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>
	): TreeItemViewModel[] {
		const items: TreeItemViewModel[] = [];

		// 1. Extract all steps from assembly hierarchy
		const stepsWithContext = this.extractAllSteps(packages, standaloneAssemblies);

		// 2. Group steps by entity and message
		const groupedSteps = this.groupStepsByEntityAndMessage(stepsWithContext);

		// 3. Build entity and message nodes
		const entityItems = this.buildEntityNodes(groupedSteps);
		items.push(...entityItems);

		return items;
	}

	/**
	 * Groups steps by entity name (primary), then by message name.
	 * Returns: Map<entityName, Map<messageName, StepWithContext[]>>
	 */
	private groupStepsByEntityAndMessage(
		steps: StepWithContext[]
	): Map<string, Map<string, StepWithContext[]>> {
		const grouped = new Map<string, Map<string, StepWithContext[]>>();

		for (const stepCtx of steps) {
			// Use 'none' for steps without entity (global operations)
			const entityName = stepCtx.step.getPrimaryEntityLogicalName() ?? 'none';
			const messageName = stepCtx.step.getMessageName();

			if (!grouped.has(entityName)) {
				grouped.set(entityName, new Map());
			}

			const messageMap = grouped.get(entityName)!;
			if (!messageMap.has(messageName)) {
				messageMap.set(messageName, []);
			}

			messageMap.get(messageName)!.push(stepCtx);
		}

		return grouped;
	}

	/**
	 * Builds entity and message tree nodes from grouped steps.
	 */
	private buildEntityNodes(
		groupedSteps: Map<string, Map<string, StepWithContext[]>>
	): TreeItemViewModel[] {
		const items: TreeItemViewModel[] = [];

		// Sort entities alphabetically ('none' last for global operations)
		const sortedEntities = [...groupedSteps.keys()].sort((a, b) => {
			if (a === 'none') return 1;
			if (b === 'none') return -1;
			return a.localeCompare(b, undefined, { sensitivity: 'base' });
		});

		for (const entityName of sortedEntities) {
			const messageMap = groupedSteps.get(entityName)!;
			const entityNodeId = `entity:${entityName}`;

			// Count total steps for this entity
			let totalStepCount = 0;
			for (const messageSteps of messageMap.values()) {
				totalStepCount += messageSteps.length;
			}

			// Build message children
			const entityChildren = this.buildEntityChildren(entityNodeId, entityName, messageMap);

			// Skip entities with no visible children
			if (entityChildren.length === 0) {
				continue;
			}

			// Create entity metadata
			const entityMetadata: EntityGroupMetadata = {
				type: 'entityGroup',
				messageName: '', // Not applicable at entity level
				entityLogicalName: entityName === 'none' ? null : entityName,
				stepCount: totalStepCount,
			};

			// Create entity node
			const displayName =
				entityName === 'none' ? `(Global) (${totalStepCount})` : `${entityName} (${totalStepCount})`;

			const entityNode: TreeItemViewModel = {
				id: entityNodeId,
				parentId: null,
				type: 'entityGroup',
				name: entityName,
				displayName,
				icon: '📋', // Entity icon
				metadata: entityMetadata,
				isManaged: false, // Entity nodes are grouping nodes
				children: entityChildren,
			};

			items.push(entityNode);
		}

		return items;
	}

	/**
	 * Builds children for an entity node (message groups with steps).
	 */
	private buildEntityChildren(
		entityNodeId: string,
		entityName: string,
		messageMap: Map<string, StepWithContext[]>
	): TreeItemViewModel[] {
		const children: TreeItemViewModel[] = [];

		// Sort messages alphabetically
		const sortedMessages = [...messageMap.keys()].sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' })
		);

		for (const messageName of sortedMessages) {
			const stepsWithContext = messageMap.get(messageName)!;

			// Skip messages with no steps
			if (stepsWithContext.length === 0) {
				continue;
			}

			const messageNodeId = `entity:${entityName}:msg:${messageName}`;

			const messageMetadata: SdkMessageMetadata = {
				type: 'sdkMessage',
				messageName,
				stepCount: stepsWithContext.length,
				hasEntityGroups: false, // Not applicable under entity
			};

			// Build step children for this message
			const messageStepItems: TreeItemViewModel[] = [];
			for (const stepCtx of stepsWithContext) {
				const imageItems = stepCtx.images.map((image) =>
					this.imageMapper.toTreeItem(image, stepCtx.step.getId())
				);

				const stepItem = this.createStepForMessageView(stepCtx.step, messageNodeId, imageItems);
				messageStepItems.push(stepItem);
			}

			const messageNode: TreeItemViewModel = {
				id: messageNodeId,
				parentId: entityNodeId,
				type: 'sdkMessage',
				name: messageName,
				displayName: `${messageName} (${stepsWithContext.length})`,
				icon: '📨', // Message icon
				metadata: messageMetadata,
				isManaged: false, // Message nodes are grouping nodes
				children: messageStepItems,
			};

			children.push(messageNode);
		}

		return children;
	}
}
