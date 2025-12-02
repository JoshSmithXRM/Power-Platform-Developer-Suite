import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import { WebResource } from '../../domain/entities/WebResource';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Error thrown when attempting to edit a non-editable web resource.
 * This applies to binary resource types (PNG, JPG, GIF, ICO, XAP).
 * Note: Managed text-based resources ARE editable (supports hotfix scenarios).
 */
export class ManagedWebResourceError extends Error {
	constructor(webResourceId: string) {
		super(`Cannot edit web resource (binary type not supported): ${webResourceId}`);
		this.name = 'ManagedWebResourceError';
	}
}

/**
 * Use case for updating web resource content.
 * Orchestrates validation and repository update.
 */
export class UpdateWebResourceUseCase {
	constructor(
		private readonly webResourceRepository: IWebResourceRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case to update web resource content.
	 *
	 * @param environmentId - Power Platform environment GUID
	 * @param webResourceId - Web resource GUID
	 * @param content - New content as bytes
	 * @param cancellationToken - Optional token to cancel the operation
	 * @throws ManagedWebResourceError if web resource is managed
	 * @throws Error if web resource not found
	 */
	async execute(
		environmentId: string,
		webResourceId: string,
		content: Uint8Array,
		cancellationToken?: ICancellationToken
	): Promise<void> {
		this.logger.info('UpdateWebResourceUseCase started', { environmentId, webResourceId, contentSize: content.length });

		try {
			this.throwIfCancelled(cancellationToken, 'before execution');

			await this.fetchAndValidate(environmentId, webResourceId, cancellationToken);

			const base64Content = Buffer.from(content).toString('base64');

			await this.webResourceRepository.updateContent(environmentId, webResourceId, base64Content, cancellationToken);

			this.throwIfCancelled(cancellationToken, 'after update');

			this.logger.info('UpdateWebResourceUseCase completed', { webResourceId, contentSize: content.length });
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('UpdateWebResourceUseCase failed', normalizedError);
			throw normalizedError;
		}
	}

	private async fetchAndValidate(
		environmentId: string,
		webResourceId: string,
		cancellationToken?: ICancellationToken
	): Promise<WebResource> {
		const webResource = await this.webResourceRepository.findById(environmentId, webResourceId, cancellationToken);

		this.throwIfCancelled(cancellationToken, 'after fetch');

		if (webResource === null) {
			throw new Error(`Web resource not found: ${webResourceId}`);
		}

		if (!webResource.canEdit()) {
			throw new ManagedWebResourceError(webResourceId);
		}

		return webResource;
	}

	private throwIfCancelled(cancellationToken: ICancellationToken | undefined, context: string): void {
		if (cancellationToken?.isCancellationRequested) {
			this.logger.info('UpdateWebResourceUseCase cancelled', { context });
			throw new OperationCancelledException();
		}
	}
}
