import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';
import { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import { EntityTreeItemViewModel } from '../viewModels/EntityTreeItemViewModel';
import { EntityTreeItemMapper } from '../mappers/EntityTreeItemMapper';

/**
 * Use case that loads all entity metadata for tree navigation.
 * Orchestrates domain operations and maps to ViewModels.
 */
export class LoadEntityTreeUseCase {
    constructor(
        private readonly repository: IEntityMetadataRepository,
        private readonly mapper: EntityTreeItemMapper,
        private readonly logger: ILogger
    ) {}

    /**
     * Executes the use case to load entity tree data.
     * @param environmentId Power Platform environment GUID
     * @returns Array of entity tree items for display
     */
    public async execute(environmentId: string): Promise<readonly EntityTreeItemViewModel[]> {
        this.logger.info('Loading entity tree', { environmentId });

        try {
            const entities = await this.repository.getAllEntities(environmentId);
            this.logger.info('Loaded entity metadata', { count: entities.length });

            const viewModels = this.mapper.toViewModels(entities);
            return viewModels;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to load entity tree', normalizedError);
            throw normalizedError;
        }
    }
}
