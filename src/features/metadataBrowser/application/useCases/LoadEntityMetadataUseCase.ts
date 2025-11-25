import type { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import type { EntityMetadata } from '../../domain/entities/EntityMetadata';
import { EntityTreeItemMapper } from '../mappers/EntityTreeItemMapper';
import { AttributeRowMapper } from '../mappers/AttributeRowMapper';
import { KeyRowMapper } from '../mappers/KeyRowMapper';
import { RelationshipRowMapper } from '../mappers/RelationshipRowMapper';
import { PrivilegeRowMapper } from '../mappers/PrivilegeRowMapper';
import type { EntityTreeItemViewModel } from '../viewModels/EntityTreeItemViewModel';
import type { AttributeRowViewModel } from '../viewModels/AttributeRowViewModel';
import type { KeyRowViewModel } from '../viewModels/KeyRowViewModel';
import type { RelationshipRowViewModel } from '../viewModels/RelationshipRowViewModel';
import type { PrivilegeRowViewModel } from '../viewModels/PrivilegeRowViewModel';

/**
 * Loads complete entity metadata including all tabs.
 *
 * Orchestration:
 * 1. Fetch entity metadata from repository (includes all relationships, keys, etc.)
 * 2. Extract data for each tab
 * 3. Map to ViewModels
 * 4. Return all ViewModels
 *
 * Note: Sorting is handled by the presentation layer, not here.
 */
export class LoadEntityMetadataUseCase {
    constructor(
        private readonly repository: IEntityMetadataRepository,
        private readonly entityTreeItemMapper: EntityTreeItemMapper,
        private readonly attributeRowMapper: AttributeRowMapper,
        private readonly keyRowMapper: KeyRowMapper,
        private readonly relationshipRowMapper: RelationshipRowMapper,
        private readonly privilegeRowMapper: PrivilegeRowMapper,
        private readonly logger: ILogger
    ) {}

    public async execute(
        environmentId: string,
        logicalName: string
    ): Promise<LoadEntityMetadataResponse> {
        this.logger.debug('Loading entity metadata', { environmentId, logicalName });

        try {
            const entity = await this.repository.getEntityWithAttributes(
                environmentId,
                LogicalName.create(logicalName)
            );

            const viewModels = this.mapEntityToViewModels(entity);

            this.logger.info('Entity metadata loaded', {
                logicalName,
                attributeCount: viewModels.attributes.length,
                keyCount: viewModels.keys.length,
                oneToManyCount: viewModels.oneToManyRelationships.length,
                manyToOneCount: viewModels.manyToOneRelationships.length,
                manyToManyCount: viewModels.manyToManyRelationships.length,
                privilegeCount: viewModels.privileges.length
            });

            return viewModels;
        } catch (error: unknown) {
            this.logger.error('Failed to load entity metadata', error);
            throw error;
        }
    }

    private mapEntityToViewModels(entity: EntityMetadata): LoadEntityMetadataResponse {
        const attributeVMs = entity.attributes.map(attr => this.attributeRowMapper.toViewModel(attr));
        const keyVMs = entity.keys.map(key => this.keyRowMapper.toViewModel(key));
        const privilegeVMs = entity.privileges.map(priv => this.privilegeRowMapper.toViewModel(priv));

        const oneToManyVMs = entity.oneToManyRelationships.map(rel =>
            this.relationshipRowMapper.toOneToManyViewModel(rel)
        );
        const manyToOneVMs = entity.manyToOneRelationships.map(rel =>
            this.relationshipRowMapper.toManyToOneViewModel(rel)
        );
        const manyToManyVMs = entity.manyToManyRelationships.map(rel =>
            this.relationshipRowMapper.toManyToManyViewModel(rel)
        );

        return {
            entity: this.entityTreeItemMapper.toViewModel(entity),
            attributes: attributeVMs,
            keys: keyVMs,
            oneToManyRelationships: oneToManyVMs,
            manyToOneRelationships: manyToOneVMs,
            manyToManyRelationships: manyToManyVMs,
            privileges: privilegeVMs
        };
    }
}

export interface LoadEntityMetadataResponse {
    readonly entity: EntityTreeItemViewModel;
    readonly attributes: readonly AttributeRowViewModel[];
    readonly keys: readonly KeyRowViewModel[];
    readonly oneToManyRelationships: readonly RelationshipRowViewModel[];
    readonly manyToOneRelationships: readonly RelationshipRowViewModel[];
    readonly manyToManyRelationships: readonly RelationshipRowViewModel[];
    readonly privileges: readonly PrivilegeRowViewModel[];
}
