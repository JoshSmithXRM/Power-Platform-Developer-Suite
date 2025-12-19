import type { WebHook } from '../../domain/entities/WebHook';
import type { WebHookMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps WebHook domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class WebHookViewModelMapper {
	/**
	 * Maps a WebHook entity to a tree item.
	 *
	 * @param webHook - The WebHook domain entity
	 * @param steps - Child step tree items (steps registered to this webhook)
	 * @returns TreeItemViewModel for the webhook
	 */
	public toTreeItem(
		webHook: WebHook,
		steps: TreeItemViewModel[] = []
	): TreeItemViewModel {
		const metadata: WebHookMetadata = {
			type: 'webHook',
			url: webHook.getUrl(),
			authType: webHook.getAuthType().getName(),
			description: webHook.getDescription(),
			createdOn: webHook.getCreatedOn().toISOString(),
			modifiedOn: webHook.getModifiedOn().toISOString(),
			canUpdate: webHook.canUpdate(),
			canDelete: webHook.canDelete(),
		};

		return {
			id: webHook.getId(),
			parentId: null, // WebHooks are root-level items
			type: 'webHook',
			name: webHook.getName(),
			displayName: `(WebHook) ${webHook.getName()}`,
			icon: '🌐',
			metadata,
			isManaged: webHook.isInManagedState(),
			children: steps,
		};
	}
}
