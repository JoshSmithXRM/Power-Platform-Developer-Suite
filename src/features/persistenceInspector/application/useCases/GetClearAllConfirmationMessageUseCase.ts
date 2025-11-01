import { StorageInspectionService } from '../../domain/services/StorageInspectionService';

/**
 * Use case for getting confirmation message for clear all operation
 * Orchestrates only - no business logic
 */
export class GetClearAllConfirmationMessageUseCase {
	public constructor(
		private readonly storageInspectionService: StorageInspectionService
	) {}

	public async execute(): Promise<string> {
		// Orchestrate: get current collection
		const collection = await this.storageInspectionService.inspectStorage();

		// Orchestrate: get validation result with message
		const validation = collection.validateClearAllOperation();

		return validation.getConfirmationMessage();
	}
}
