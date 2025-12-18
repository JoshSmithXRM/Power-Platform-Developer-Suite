import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IWebHookRepository, RegisterWebHookInput } from '../../domain/interfaces/IWebHookRepository';

/**
 * Use case for registering a new WebHook.
 *
 * Orchestration with URL validation:
 * 1. Validate URL uses HTTPS
 * 2. Call repository to create webhook
 */
export class RegisterWebHookUseCase {
	constructor(
		private readonly webHookRepository: IWebHookRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Register a new WebHook.
	 *
	 * @param environmentId - Target environment
	 * @param input - WebHook registration input
	 * @returns The ID of the created WebHook
	 * @throws Error if URL is not HTTPS
	 */
	public async execute(
		environmentId: string,
		input: RegisterWebHookInput
	): Promise<string> {
		this.logger.info('RegisterWebHookUseCase started', {
			environmentId,
			name: input.name,
			url: input.url,
			authType: input.authType,
		});

		// Validate URL uses HTTPS
		this.validateUrl(input.url);

		// Register the webhook
		const webHookId = await this.webHookRepository.register(environmentId, input);

		this.logger.info('RegisterWebHookUseCase completed', {
			webHookId,
			name: input.name,
		});

		return webHookId;
	}

	private validateUrl(url: string): void {
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== 'https:') {
				throw new Error('WebHook URL must use HTTPS protocol');
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes('HTTPS')) {
				throw error;
			}
			throw new Error(`Invalid WebHook URL: ${url}`);
		}
	}
}
