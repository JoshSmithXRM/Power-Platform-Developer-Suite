import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IWebHookRepository } from '../../domain/interfaces/IWebHookRepository';
import type { WebHook } from '../../domain/entities/WebHook';

/**
 * Use case for loading all WebHooks in an environment.
 *
 * Orchestration only - no business logic:
 * 1. Call repository to fetch webhooks
 */
export class LoadWebHooksUseCase {
	constructor(
		private readonly webHookRepository: IWebHookRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Load all WebHooks in the environment.
	 *
	 * @param environmentId - Target environment
	 * @returns All WebHooks
	 */
	public async execute(environmentId: string): Promise<readonly WebHook[]> {
		this.logger.info('LoadWebHooksUseCase started', {
			environmentId,
		});

		const startTime = Date.now();
		const webHooks = await this.webHookRepository.findAll(environmentId);

		this.logger.info('LoadWebHooksUseCase completed', {
			count: webHooks.length,
			totalMs: Date.now() - startTime,
		});

		return webHooks;
	}
}
