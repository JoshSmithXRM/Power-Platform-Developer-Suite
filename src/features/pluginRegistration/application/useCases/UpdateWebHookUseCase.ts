import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IWebHookRepository, UpdateWebHookInput } from '../../domain/interfaces/IWebHookRepository';

/**
 * Use case for updating an existing WebHook.
 *
 * Orchestration with URL validation:
 * 1. Verify webhook exists
 * 2. Validate URL if provided
 * 3. Call repository to update
 */
export class UpdateWebHookUseCase {
	constructor(
		private readonly webHookRepository: IWebHookRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Update an existing WebHook.
	 *
	 * @param environmentId - Target environment
	 * @param webHookId - ID of the webhook to update
	 * @param webHookName - Name of the webhook (for logging/messages)
	 * @param input - Fields to update
	 * @throws Error if webhook not found or URL is invalid
	 */
	public async execute(
		environmentId: string,
		webHookId: string,
		webHookName: string,
		input: UpdateWebHookInput
	): Promise<void> {
		this.logger.info('UpdateWebHookUseCase started', {
			environmentId,
			webHookId,
			webHookName,
		});

		// Verify webhook exists
		const webHook = await this.webHookRepository.findById(environmentId, webHookId);
		if (webHook === null) {
			throw new Error(`WebHook not found: ${webHookName}`);
		}

		// Validate URL if being updated
		if (input.url !== undefined) {
			this.validateUrl(input.url);
		}

		// Update the webhook
		await this.webHookRepository.update(environmentId, webHookId, input);

		this.logger.info('UpdateWebHookUseCase completed', {
			webHookId,
			webHookName,
		});
	}

	private validateUrl(url: string): void {
		try {
			const parsed = new URL(url);
			// Only allow http and https protocols (matches PRT behavior)
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				throw new Error('Endpoint URL should be valid.');
			}
		} catch (error) {
			if (error instanceof Error && error.message === 'Endpoint URL should be valid.') {
				throw error;
			}
			throw new Error('Endpoint URL should be valid.');
		}
	}
}
