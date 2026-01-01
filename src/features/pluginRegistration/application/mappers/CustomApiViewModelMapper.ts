import type { CustomApi } from '../../domain/entities/CustomApi';
import type {
	CustomApiMetadata,
	CustomApiEntityMetadata,
	CustomApiPluginMetadata,
	TreeItemViewModel,
} from '../viewModels/TreeItemViewModel';

/**
 * Maps CustomApi domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 *
 * Tree structure (like PRT):
 * Custom API
 * └── (Entity) {BoundEntityLogicalName}  ← Only if bound to entity
 *     └── (Plugin) {PluginTypeName}      ← Label only, NOT expandable
 */
export class CustomApiViewModelMapper {
	/**
	 * Maps a Custom API to a TreeItemViewModel for tree display.
	 *
	 * @param customApi - The Custom API entity
	 * @param requestParameterCount - Number of request parameters
	 * @param responsePropertyCount - Number of response properties
	 */
	public toTreeItem(
		customApi: CustomApi,
		requestParameterCount: number,
		responsePropertyCount: number
	): TreeItemViewModel {
		const customApiId = customApi.getId();
		const boundEntityLogicalName = customApi.getBoundEntityLogicalName();
		const pluginTypeName = customApi.getPluginTypeName();

		const metadata: CustomApiMetadata = {
			type: 'customApi',
			uniqueName: customApi.getUniqueName(),
			description: customApi.getDescription(),
			isFunction: customApi.getIsFunction(),
			isPrivate: customApi.getIsPrivate(),
			bindingType: customApi.getBindingType().getName(),
			boundEntityLogicalName,
			allowedProcessing: customApi.getAllowedCustomProcessingStepType().getName(),
			pluginTypeName,
			requestParameterCount,
			responsePropertyCount,
			createdOn: customApi.getCreatedOn().toISOString(),
			modifiedOn: customApi.getModifiedOn().toISOString(),
			canUpdate: customApi.canUpdate(),
			canDelete: customApi.canDelete(),
		};

		// Build display name with parameter count badge: [2→1]
		const paramBadge = `[${requestParameterCount}→${responsePropertyCount}]`;
		const displayName = `(Custom API) ${customApi.getDisplayName()} - ${customApi.getUniqueName()} ${paramBadge}`;

		// Build children hierarchy: Entity (if bound) → Plugin (if has implementation)
		const children = this.buildCustomApiChildren(
			customApiId,
			boundEntityLogicalName,
			pluginTypeName
		);

		return {
			id: customApiId,
			parentId: null, // Custom APIs are root-level nodes
			type: 'customApi',
			name: customApi.getName(),
			displayName,
			icon: '📨',
			metadata,
			isManaged: customApi.isInManagedState(),
			children,
		};
	}

	/**
	 * Builds child nodes for Custom API.
	 * Structure: Entity (if bound) → Plugin (if has implementation)
	 * These are label-only nodes (not expandable beyond plugin).
	 */
	private buildCustomApiChildren(
		customApiId: string,
		boundEntityLogicalName: string | null,
		pluginTypeName: string | null
	): TreeItemViewModel[] {
		// No bound entity and no plugin → no children
		if (boundEntityLogicalName === null && pluginTypeName === null) {
			return [];
		}

		// Has bound entity → entity node with optional plugin child
		if (boundEntityLogicalName !== null) {
			const entityNodeId = `customApi:${customApiId}:entity:${boundEntityLogicalName}`;
			const entityChildren: TreeItemViewModel[] = [];

			// Add plugin as child of entity (if has implementation)
			if (pluginTypeName !== null) {
				entityChildren.push(this.createPluginNode(customApiId, entityNodeId, pluginTypeName));
			}

			const entityMetadata: CustomApiEntityMetadata = {
				type: 'customApiEntity',
				customApiId,
				entityLogicalName: boundEntityLogicalName,
			};

			return [
				{
					id: entityNodeId,
					parentId: customApiId,
					type: 'customApiEntity',
					name: boundEntityLogicalName,
					displayName: `(Entity) ${boundEntityLogicalName}`,
					icon: '📋',
					metadata: entityMetadata,
					isManaged: false, // Grouping node
					children: entityChildren,
				},
			];
		}

		// No bound entity but has plugin → plugin directly under Custom API
		if (pluginTypeName !== null) {
			return [this.createPluginNode(customApiId, customApiId, pluginTypeName)];
		}

		return [];
	}

	/**
	 * Creates a plugin label node (NOT expandable - no steps shown here).
	 */
	private createPluginNode(
		customApiId: string,
		parentId: string,
		pluginTypeName: string
	): TreeItemViewModel {
		const pluginNodeId = `customApi:${customApiId}:plugin:${pluginTypeName}`;

		const pluginMetadata: CustomApiPluginMetadata = {
			type: 'customApiPlugin',
			customApiId,
			pluginTypeName,
		};

		return {
			id: pluginNodeId,
			parentId,
			type: 'customApiPlugin',
			name: pluginTypeName,
			displayName: `(Plugin) ${pluginTypeName}`,
			icon: '🔌',
			metadata: pluginMetadata,
			isManaged: false, // Label node
			children: [], // NOT expandable - no steps here (view in Assembly View)
		};
	}
}
