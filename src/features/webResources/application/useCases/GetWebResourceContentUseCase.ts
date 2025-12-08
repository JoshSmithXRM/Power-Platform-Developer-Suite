import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Result of fetching web resource content.
 */
export interface WebResourceContentResult {
	/** Content as bytes (decoded from base64) */
	content: Uint8Array;
	/** File extension for language mode detection */
	fileExtension: string;
	/** Display name of the web resource */
	displayName: string;
	/** Web resource name (used for filename) */
	name: string;
	/** Last modification timestamp from server (for conflict detection) */
	modifiedOn: Date;
}

/**
 * Use case for fetching web resource content.
 * Retrieves base64-encoded content from Dataverse and decodes it.
 */
export class GetWebResourceContentUseCase {
	constructor(
		private readonly webResourceRepository: IWebResourceRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case to fetch web resource content.
	 *
	 * @param environmentId - Power Platform environment GUID
	 * @param webResourceId - Web resource GUID
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Web resource content as bytes with metadata
	 * @throws Error if web resource not found
	 */
	async execute(
		environmentId: string,
		webResourceId: string,
		cancellationToken?: ICancellationToken
	): Promise<WebResourceContentResult> {
		this.logger.info('GetWebResourceContentUseCase started', { environmentId, webResourceId });

		try {
			if (cancellationToken?.isCancellationRequested) {
				this.logger.info('GetWebResourceContentUseCase cancelled before execution');
				throw new OperationCancelledException();
			}

			// Fetch web resource metadata and content in parallel
			const [webResource, base64Content] = await Promise.all([
				this.webResourceRepository.findById(environmentId, webResourceId, cancellationToken),
				this.webResourceRepository.getContent(environmentId, webResourceId, cancellationToken)
			]);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.info('GetWebResourceContentUseCase cancelled after fetch');
				throw new OperationCancelledException();
			}

			if (webResource === null) {
				throw new Error(`Web resource not found: ${webResourceId}`);
			}

			// Decode base64 content to bytes
			const content = this.decodeBase64(base64Content);

			this.logger.info('GetWebResourceContentUseCase completed', {
				webResourceId,
				contentSize: content.length,
				fileExtension: webResource.getFileExtension()
			});

			return {
				content,
				fileExtension: webResource.getFileExtension(),
				displayName: webResource.displayName,
				name: webResource.name.getValue(),
				modifiedOn: webResource.modifiedOn
			};
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('GetWebResourceContentUseCase failed', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Decodes base64 string to Uint8Array.
	 * Works in both Node.js and browser environments.
	 */
	private decodeBase64(base64: string): Uint8Array {
		// Use Buffer in Node.js environment (VS Code extension host)
		const buffer = Buffer.from(base64, 'base64');
		return new Uint8Array(buffer);
	}
}
