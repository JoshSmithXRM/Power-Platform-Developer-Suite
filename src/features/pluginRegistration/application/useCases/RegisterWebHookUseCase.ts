import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IWebHookRepository, RegisterWebHookInput } from '../../domain/interfaces/IWebHookRepository';

/**
 * Use case for registering a new WebHook.
 *
 * Orchestration with URL validation:
 * 1. Validate URL is well-formed absolute URL (matches PRT behavior)
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
	 * @throws Error if URL is not valid
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

		// Validate URL is well-formed (matches PRT: Uri.IsWellFormedUriString)
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
