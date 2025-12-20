import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	ICustomApiRepository,
	UpdateCustomApiInput,
} from '../../domain/interfaces/ICustomApiRepository';

/**
 * Use case for updating an existing Custom API.
 *
 * Orchestration only - no business logic:
 * 1. Call repository to update Custom API
 *
 * Note: Some properties cannot be changed after creation:
 * - name, uniqueName, bindingType, boundEntityLogicalName, isFunction
 * These are enforced by the Dataverse API.
 */
export class UpdateCustomApiUseCase {
	constructor(
		private readonly customApiRepository: ICustomApiRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Update an existing Custom API.
	 *
	 * @param environmentId - Target environment
	 * @param customApiId - ID of the Custom API to update
	 * @param input - Custom API update input (only changed fields)
	 */
	public async execute(
		environmentId: string,
		customApiId: string,
		input: UpdateCustomApiInput
	): Promise<void> {
		this.logger.info('UpdateCustomApiUseCase started', {
			environmentId,
			customApiId,
			fieldsToUpdate: Object.keys(input).filter(
				(k) => input[k as keyof UpdateCustomApiInput] !== undefined
			),
		});

		await this.customApiRepository.update(environmentId, customApiId, input);

		this.logger.info('UpdateCustomApiUseCase completed', {
			customApiId,
		});
	}
}
