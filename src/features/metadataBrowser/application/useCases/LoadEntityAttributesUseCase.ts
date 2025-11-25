import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';
import { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { EntityAttributeViewModel } from '../viewModels/EntityAttributeViewModel';
import { EntityAttributeMapper } from '../mappers/EntityAttributeMapper';

/**
 * Use case that loads all attributes for a selected entity.
 * Orchestrates domain operations and maps to ViewModels.
 */
export class LoadEntityAttributesUseCase {
    constructor(
        private readonly repository: IEntityMetadataRepository,
        private readonly mapper: EntityAttributeMapper,
        private readonly logger: ILogger
    ) {}

    /**
     * Executes the use case to load entity attributes.
     * @param environmentId Power Platform environment GUID
     * @param logicalName The logical name of the entity
     * @returns Array of attribute ViewModels for display
     */
    public async execute(environmentId: string, logicalName: string): Promise<readonly EntityAttributeViewModel[]> {
        this.logger.info('Loading entity attributes', { environmentId, logicalName });

        try {
            const entityLogicalName = LogicalName.create(logicalName);
            const entity = await this.repository.getEntityWithAttributes(environmentId, entityLogicalName);

            this.logger.info('Loaded entity attributes', {
                logicalName,
                attributeCount: entity.attributes.length
            });

            const viewModels = this.mapper.toViewModels(entity.attributes);
            return viewModels;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to load entity attributes', normalizedError);
            throw normalizedError;
        }
    }
}
