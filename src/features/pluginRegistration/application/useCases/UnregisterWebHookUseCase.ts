import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IWebHookRepository } from '../../domain/interfaces/IWebHookRepository';

/**
 * Use case for unregistering (deleting) a WebHook.
 *
 * Orchestration only - no business logic:
 * 1. Validate webhook exists and can be deleted
 * 2. Call repository to delete
 *
 * Note: Dataverse will reject deletion if the webhook has steps.
 * The error message will indicate this to the user.
 */
export class UnregisterWebHookUseCase {
	constructor(
		private readonly webHookRepository: IWebHookRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Unregister (delete) a WebHook.
	 *
	 * @param environmentId - Target environment
	 * @param webHookId - ID of the webhook to delete
	 * @param webHookName - Name of the webhook (for logging/messages)
	 * @throws Error if deletion fails (e.g., webhook has steps, webhook is managed)
	 */
	public async execute(
		environmentId: string,
		webHookId: string,
		webHookName: string
	): Promise<void> {
		this.logger.info('UnregisterWebHookUseCase started', {
			environmentId,
			webHookId,
			webHookName,
		});

		// Verify webhook exists
		const webHook = await this.webHookRepository.findById(environmentId, webHookId);
		if (webHook === null) {
			throw new Error(`WebHook not found: ${webHookName}`);
		}

		// Check if can delete (not managed)
		if (!webHook.canDelete()) {
			throw new Error(`Cannot unregister managed WebHook: ${webHookName}`);
		}

		// Delete the webhook
		// Note: Dataverse will reject if there are steps registered to this webhook
		await this.webHookRepository.delete(environmentId, webHookId);

		this.logger.info('UnregisterWebHookUseCase completed', {
			webHookId,
			webHookName,
		});
	}
}
