import type { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { EntityTreeItemMapper } from '../mappers/EntityTreeItemMapper';
import { ChoiceTreeItemMapper } from '../mappers/ChoiceTreeItemMapper';
import type { EntityTreeItemViewModel } from '../viewModels/EntityTreeItemViewModel';
import type { ChoiceTreeItemViewModel } from '../viewModels/ChoiceTreeItemViewModel';

/**
 * Loads metadata tree (entities and choices) for an environment.
 *
 * Orchestration:
 * 1. Fetch all entities from repository
 * 2. Fetch all global choices from repository
 * 3. Map to tree item ViewModels
 * 4. Return ViewModels
 *
 * Note: Sorting is handled by the presentation layer, not here.
 */
export class LoadMetadataTreeUseCase {
    constructor(
        private readonly repository: IEntityMetadataRepository,
        private readonly entityTreeItemMapper: EntityTreeItemMapper,
        private readonly choiceTreeItemMapper: ChoiceTreeItemMapper,
        private readonly logger: ILogger
    ) {}

    public async execute(environmentId: string): Promise<LoadMetadataTreeResponse> {
        this.logger.debug('Loading metadata tree', { environmentId });

        try {
            // Fetch entities and choices in parallel
            const [entities, choices] = await Promise.all([
                this.repository.getAllEntities(environmentId),
                this.repository.getAllGlobalChoices(environmentId)
            ]);

            // Map to ViewModels
            const entityViewModels = entities.map(e =>
                this.entityTreeItemMapper.toViewModel(e)
            );
            const choiceViewModels = choices.map(c =>
                this.choiceTreeItemMapper.toViewModel(c)
            );

            this.logger.info('Metadata tree loaded', {
                entityCount: entityViewModels.length,
                choiceCount: choiceViewModels.length
            });

            return {
                entities: entityViewModels,
                choices: choiceViewModels
            };
        } catch (error: unknown) {
            this.logger.error('Failed to load metadata tree', error);
            throw error;
        }
    }
}

export interface LoadMetadataTreeResponse {
    readonly entities: readonly EntityTreeItemViewModel[];
    readonly choices: readonly ChoiceTreeItemViewModel[];
}
