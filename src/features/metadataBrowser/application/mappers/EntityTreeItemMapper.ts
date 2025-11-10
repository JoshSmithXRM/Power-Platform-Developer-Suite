import type { EntityMetadata } from '../../domain/entities/EntityMetadata';
import type { EntityTreeItemViewModel } from '../viewModels/EntityTreeItemViewModel';

/**
 * Maps EntityMetadata to EntityTreeItemViewModel.
 *
 * Transformation rules:
 * - displayName: entity.displayName || entity.logicalName.getValue()
 * - icon: "🏷️" if custom, "📋" if system
 */
export class EntityTreeItemMapper {
    public toViewModel(entity: EntityMetadata): EntityTreeItemViewModel {
        const logicalName = entity.logicalName.getValue();

        return {
            id: logicalName,
            displayName: entity.displayName || logicalName,
            logicalName,
            isCustom: entity.isCustomEntity,
            icon: entity.isCustomEntity ? '🏷️' : '📋'
        };
    }
}
