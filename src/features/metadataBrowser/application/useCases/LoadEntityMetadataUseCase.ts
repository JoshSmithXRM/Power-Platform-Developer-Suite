import type { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import type { EntityMetadata } from '../../domain/entities/EntityMetadata';
import type { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import type { EntityKey } from '../../domain/entities/EntityKey';
import type { SecurityPrivilege } from '../../domain/entities/SecurityPrivilege';
import type { OneToManyRelationship } from '../../domain/entities/OneToManyRelationship';
import type { ManyToManyRelationship } from '../../domain/entities/ManyToManyRelationship';
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
 * 3. Sort data before mapping
 * 4. Map to ViewModels
 * 5. Return all ViewModels
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
        const sortedAttributes = this.sortAttributes(entity.attributes);
        const sortedKeys = this.sortKeys(entity.keys);
        const sortedPrivileges = this.sortPrivileges(entity.privileges);
        const sortedOneToMany = this.sortRelationships(entity.oneToManyRelationships);
        const sortedManyToOne = this.sortRelationships(entity.manyToOneRelationships);
        const sortedManyToMany = this.sortManyToManyRelationships(entity.manyToManyRelationships);

        const attributeVMs = sortedAttributes.map(attr => this.attributeRowMapper.toViewModel(attr));
        const keyVMs = sortedKeys.map(key => this.keyRowMapper.toViewModel(key));
        const privilegeVMs = sortedPrivileges.map(priv => this.privilegeRowMapper.toViewModel(priv));

        // Map relationships after sorting
        const oneToManyVMs = sortedOneToMany.map(rel => this.relationshipRowMapper.toOneToManyViewModel(rel));
        const manyToOneVMs = sortedManyToOne.map(rel => this.relationshipRowMapper.toManyToOneViewModel(rel));
        const manyToManyVMs = sortedManyToMany.map(rel => this.relationshipRowMapper.toManyToManyViewModel(rel));

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

    private sortAttributes(attributes: readonly AttributeMetadata[]): AttributeMetadata[] {
        return [...attributes].sort((a, b) =>
            (a.displayName || a.logicalName.getValue()).localeCompare(
                b.displayName || b.logicalName.getValue()
            )
        );
    }

    private sortKeys(keys: readonly EntityKey[]): EntityKey[] {
        return [...keys].sort((a, b) =>
            a.logicalName.getValue().localeCompare(b.logicalName.getValue())
        );
    }

    private sortPrivileges(privileges: readonly SecurityPrivilege[]): SecurityPrivilege[] {
        return [...privileges].sort((a, b) => a.name.localeCompare(b.name));
    }

    private sortRelationships(relationships: readonly OneToManyRelationship[]): OneToManyRelationship[] {
        return [...relationships].sort((a, b) => a.schemaName.localeCompare(b.schemaName));
    }

    private sortManyToManyRelationships(relationships: readonly ManyToManyRelationship[]): ManyToManyRelationship[] {
        return [...relationships].sort((a, b) => a.schemaName.localeCompare(b.schemaName));
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
