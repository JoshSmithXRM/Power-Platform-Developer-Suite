import { EntityMetadata } from '../../domain/entities/EntityMetadata';
import { EntityTreeItemViewModel } from '../viewModels/EntityTreeItemViewModel';

/**
 * Mapper that transforms EntityMetadata domain entities into EntityTreeItemViewModel DTOs.
 * Handles presentation formatting (display values, computed properties).
 */
export class EntityTreeItemMapper {
    /**
     * Maps a domain entity to a ViewModel for tree display.
     */
    public toViewModel(entity: EntityMetadata): EntityTreeItemViewModel {
        return {
            logicalName: entity.logicalName.getValue(),
            displayName: entity.displayName,
            schemaName: entity.schemaName.getValue(),
            isCustomEntity: entity.isCustomEntity,
            attributeCount: entity.getAttributeCount()
        };
    }

    /**
     * Maps multiple domain entities to ViewModels.
     */
    public toViewModels(entities: readonly EntityMetadata[]): readonly EntityTreeItemViewModel[] {
        return entities.map(entity => this.toViewModel(entity));
    }
}
