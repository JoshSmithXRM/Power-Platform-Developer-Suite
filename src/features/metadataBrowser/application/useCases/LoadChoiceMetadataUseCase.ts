import type { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ChoiceTreeItemMapper } from '../mappers/ChoiceTreeItemMapper';
import { ChoiceValueRowMapper } from '../mappers/ChoiceValueRowMapper';
import type { ChoiceTreeItemViewModel } from '../viewModels/ChoiceTreeItemViewModel';
import type { ChoiceValueRowViewModel } from '../viewModels/ChoiceValueRowViewModel';

/**
 * Loads global choice metadata.
 *
 * Orchestration:
 * 1. Fetch choice metadata from repository
 * 2. Map to ViewModels
 * 3. Return ViewModels
 *
 * Note: Sorting is handled by the presentation layer, not here.
 */
export class LoadChoiceMetadataUseCase {
    constructor(
        private readonly repository: IEntityMetadataRepository,
        private readonly choiceTreeItemMapper: ChoiceTreeItemMapper,
        private readonly choiceValueRowMapper: ChoiceValueRowMapper,
        private readonly logger: ILogger
    ) {}

    public async execute(
        environmentId: string,
        name: string
    ): Promise<LoadChoiceMetadataResponse> {
        this.logger.debug('Loading choice metadata', { environmentId, name });

        try {
            // Fetch choice metadata
            const choice = await this.repository.getGlobalChoiceWithOptions(
                environmentId,
                name
            );

            // Map to ViewModels
            const choiceVM = this.choiceTreeItemMapper.toViewModel(choice);
            const valueVMs = choice.options.map(val =>
                this.choiceValueRowMapper.toViewModel(val)
            );

            this.logger.info('Choice metadata loaded', {
                name,
                valueCount: valueVMs.length
            });

            return {
                choice: choiceVM,
                choiceValues: valueVMs
            };
        } catch (error: unknown) {
            this.logger.error('Failed to load choice metadata', error);
            throw error;
        }
    }
}

export interface LoadChoiceMetadataResponse {
    readonly choice: ChoiceTreeItemViewModel;
    readonly choiceValues: readonly ChoiceValueRowViewModel[];
}
