import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Use case for getting confirmation message for clear all operation
 * Generates user-friendly confirmation message with counts of clearable/protected entries
 */
export class GetClearAllConfirmationMessageUseCase {
	public constructor(
		private readonly storageInspectionService: StorageInspectionService,
		private readonly logger: ILogger
	) {}

	/**
	 * Generates confirmation message for clear all operation
	 * @returns Formatted message describing what will be cleared
	 */
	public async execute(): Promise<string> {
		this.logger.debug('GetClearAllConfirmationMessageUseCase: Generating confirmation message');

		try {
			// Orchestrate: get current collection
			const collection = await this.storageInspectionService.inspectStorage();

			// Orchestrate: get validation result with message
			const validation = collection.validateClearAllOperation();

			const message = validation.getConfirmationMessage();

			this.logger.debug('Confirmation message generated');

			return message;
		} catch (error) {
			this.logger.error('GetClearAllConfirmationMessageUseCase: Failed to generate confirmation', error);
			throw error;
		}
	}
}
