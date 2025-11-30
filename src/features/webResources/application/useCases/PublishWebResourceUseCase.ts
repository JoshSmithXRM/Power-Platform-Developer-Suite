import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Use case for publishing web resources.
 * Orchestrates repository calls to publish single or multiple web resources.
 */
export class PublishWebResourceUseCase {
	constructor(
		private readonly webResourceRepository: IWebResourceRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Publishes a single web resource.
	 *
	 * @param environmentId - Power Platform environment GUID
	 * @param webResourceId - Web resource GUID
	 * @param cancellationToken - Optional token to cancel the operation
	 */
	async execute(
		environmentId: string,
		webResourceId: string,
		cancellationToken?: ICancellationToken
	): Promise<void> {
		this.logger.info('PublishWebResourceUseCase started', { environmentId, webResourceId });

		try {
			this.throwIfCancelled(cancellationToken, 'before publish');

			await this.webResourceRepository.publish(environmentId, webResourceId, cancellationToken);

			this.throwIfCancelled(cancellationToken, 'after publish');

			this.logger.info('PublishWebResourceUseCase completed', { webResourceId });
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('PublishWebResourceUseCase failed', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Publishes multiple web resources at once.
	 *
	 * @param environmentId - Power Platform environment GUID
	 * @param webResourceIds - Array of web resource GUIDs
	 * @param cancellationToken - Optional token to cancel the operation
	 */
	async executeMultiple(
		environmentId: string,
		webResourceIds: string[],
		cancellationToken?: ICancellationToken
	): Promise<void> {
		if (webResourceIds.length === 0) {
			this.logger.info('PublishWebResourceUseCase: No web resources to publish');
			return;
		}

		this.logger.info('PublishWebResourceUseCase started (multiple)', {
			environmentId,
			count: webResourceIds.length
		});

		try {
			this.throwIfCancelled(cancellationToken, 'before publish');

			await this.webResourceRepository.publishMultiple(
				environmentId,
				webResourceIds,
				cancellationToken
			);

			this.throwIfCancelled(cancellationToken, 'after publish');

			this.logger.info('PublishWebResourceUseCase completed (multiple)', {
				count: webResourceIds.length
			});
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('PublishWebResourceUseCase failed (multiple)', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Publishes all customizations in the environment using PublishAllXml.
	 * This publishes ALL solution components, not just web resources.
	 *
	 * @param environmentId - Power Platform environment GUID
	 * @param cancellationToken - Optional token to cancel the operation
	 */
	async executeAll(
		environmentId: string,
		cancellationToken?: ICancellationToken
	): Promise<void> {
		this.logger.info('PublishWebResourceUseCase started (all)', { environmentId });

		try {
			this.throwIfCancelled(cancellationToken, 'before publish all');

			await this.webResourceRepository.publishAll(environmentId, cancellationToken);

			this.throwIfCancelled(cancellationToken, 'after publish all');

			this.logger.info('PublishWebResourceUseCase completed (all)');
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('PublishWebResourceUseCase failed (all)', normalizedError);
			throw normalizedError;
		}
	}

	private throwIfCancelled(cancellationToken: ICancellationToken | undefined, context: string): void {
		if (cancellationToken?.isCancellationRequested) {
			this.logger.info(`PublishWebResourceUseCase cancelled ${context}`);
			throw new OperationCancelledException();
		}
	}
}
