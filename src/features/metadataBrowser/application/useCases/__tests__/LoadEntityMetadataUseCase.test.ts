import { LoadEntityMetadataUseCase } from '../LoadEntityMetadataUseCase';
import { IEntityMetadataRepository } from '../../../domain/repositories/IEntityMetadataRepository';
import { EntityTreeItemMapper } from '../../mappers/EntityTreeItemMapper';
import { AttributeRowMapper } from '../../mappers/AttributeRowMapper';
import { KeyRowMapper } from '../../mappers/KeyRowMapper';
import { RelationshipRowMapper } from '../../mappers/RelationshipRowMapper';
import { PrivilegeRowMapper } from '../../mappers/PrivilegeRowMapper';
import { ILogger } from '../../../../../infrastructure/logging/ILogger';
import { EntityMetadata } from '../../../domain/entities/EntityMetadata';
import { AttributeMetadata } from '../../../domain/entities/AttributeMetadata';
import { OneToManyRelationship } from '../../../domain/entities/OneToManyRelationship';
import { ManyToManyRelationship } from '../../../domain/entities/ManyToManyRelationship';
import { EntityKey } from '../../../domain/entities/EntityKey';
import { SecurityPrivilege } from '../../../domain/entities/SecurityPrivilege';
import { LogicalName } from '../../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../../domain/valueObjects/SchemaName';
import { AttributeType } from '../../../domain/valueObjects/AttributeType';
import { CascadeConfiguration } from '../../../domain/valueObjects/CascadeConfiguration';
import { NullLogger } from '../../../../../infrastructure/logging/NullLogger';

describe('LoadEntityMetadataUseCase', () => {
    let repository: jest.Mocked<IEntityMetadataRepository>;
    let entityTreeItemMapper: jest.Mocked<EntityTreeItemMapper>;
    let attributeRowMapper: jest.Mocked<AttributeRowMapper>;
    let keyRowMapper: jest.Mocked<KeyRowMapper>;
    let relationshipRowMapper: jest.Mocked<RelationshipRowMapper>;
    let privilegeRowMapper: jest.Mocked<PrivilegeRowMapper>;
    let logger: ILogger;
    let useCase: LoadEntityMetadataUseCase;

    const createTestAttribute = (logicalName: string, displayName: string): AttributeMetadata => {
        return AttributeMetadata.create({
            metadataId: `attr-${logicalName}`,
            logicalName: LogicalName.create(logicalName),
            schemaName: SchemaName.create(logicalName.charAt(0).toUpperCase() + logicalName.slice(1)),
            displayName,
            description: null,
            attributeType: AttributeType.create('StringType'),
            isCustomAttribute: false,
            isManaged: true,
            isPrimaryId: false,
            isPrimaryName: false,
            requiredLevel: 'None'
        });
    };

    const createTestRelationship = (schemaName: string): OneToManyRelationship => {
        return OneToManyRelationship.create({
            metadataId: `rel-${schemaName}`,
            schemaName,
            referencingEntity: 'account',
            referencedEntity: 'contact',
            referencingAttribute: 'parentcustomerid',
            referencedAttribute: 'contactid',
            relationshipType: 'OneToManyRelationship',
            isCustomRelationship: false,
            isManaged: false,
            cascadeConfiguration: CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Cascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
                archive: null,
                rollupView: null
            })
        });
    };

    const createTestManyToManyRelationship = (schemaName: string): ManyToManyRelationship => {
        return ManyToManyRelationship.create({
            metadataId: `m2m-${schemaName}`,
            schemaName,
            entity1LogicalName: 'account',
            entity2LogicalName: 'contact',
            intersectEntityName: 'accountcontact',
            entity1IntersectAttribute: 'accountid',
            entity2IntersectAttribute: 'contactid',
            isCustomRelationship: false,
            isManaged: false
        });
    };

    const createTestKey = (logicalName: string): EntityKey => {
        return EntityKey.create({
            metadataId: `key-${logicalName}`,
            logicalName: LogicalName.create(logicalName),
            schemaName: SchemaName.create(logicalName.charAt(0).toUpperCase() + logicalName.slice(1)),
            displayName: logicalName,
            entityLogicalName: 'account',
            keyAttributes: ['accountid'],
            isManaged: false,
            entityKeyIndexStatus: 'Active'
        });
    };

    const createTestPrivilege = (name: string, privilegeType: number): SecurityPrivilege => {
        return SecurityPrivilege.create({
            privilegeId: `priv-${name}`,
            name,
            privilegeType,
            canBeBasic: true,
            canBeLocal: true,
            canBeDeep: true,
            canBeGlobal: true
        });
    };

    const createTestEntity = (
        attributes: AttributeMetadata[],
        oneToManyRels: OneToManyRelationship[] = [],
        manyToOneRels: OneToManyRelationship[] = [],
        manyToManyRels: ManyToManyRelationship[] = [],
        keys: EntityKey[] = [],
        privileges: SecurityPrivilege[] = []
    ): EntityMetadata => {
        return EntityMetadata.create({
            metadataId: 'entity-123',
            logicalName: LogicalName.create('account'),
            schemaName: SchemaName.create('Account'),
            displayName: 'Account',
            pluralName: 'Accounts',
            description: null,
            isCustomEntity: false,
            isManaged: true,
            ownershipType: 'UserOwned',
            attributes,
            oneToManyRelationships: oneToManyRels,
            manyToOneRelationships: manyToOneRels,
            manyToManyRelationships: manyToManyRels,
            keys,
            privileges
        });
    };

    beforeEach(() => {
        repository = {
            getAllEntities: jest.fn(),
            getEntityWithAttributes: jest.fn(),
            getAllGlobalChoices: jest.fn(),
            getGlobalChoiceWithOptions: jest.fn(),
            clearCache: jest.fn()
        };

        entityTreeItemMapper = {
            toViewModel: jest.fn()
        } as unknown as jest.Mocked<EntityTreeItemMapper>;

        attributeRowMapper = {
            toViewModel: jest.fn()
        } as unknown as jest.Mocked<AttributeRowMapper>;

        keyRowMapper = {
            toViewModel: jest.fn()
        } as unknown as jest.Mocked<KeyRowMapper>;

        relationshipRowMapper = {
            toOneToManyViewModel: jest.fn(),
            toManyToOneViewModel: jest.fn(),
            toManyToManyViewModel: jest.fn()
        } as unknown as jest.Mocked<RelationshipRowMapper>;

        privilegeRowMapper = {
            toViewModel: jest.fn()
        } as unknown as jest.Mocked<PrivilegeRowMapper>;

        logger = new NullLogger();
        jest.spyOn(logger, 'debug');
        jest.spyOn(logger, 'info');
        jest.spyOn(logger, 'error');

        useCase = new LoadEntityMetadataUseCase(
            repository,
            entityTreeItemMapper,
            attributeRowMapper,
            keyRowMapper,
            relationshipRowMapper,
            privilegeRowMapper,
            logger
        );
    });

    describe('execute', () => {
        it('should load entity metadata and map all tabs to view models', async () => {
            const attributes = [createTestAttribute('name', 'Account Name')];
            const keys = [createTestKey('key1')];
            const privileges = [createTestPrivilege('prvRead', 2)];
            const entity = createTestEntity(attributes, [], [], [], keys, privileges);

            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            attributeRowMapper.toViewModel.mockReturnValue({ logicalName: 'name' } as never);
            keyRowMapper.toViewModel.mockReturnValue({ logicalName: 'key1' } as never);
            privilegeRowMapper.toViewModel.mockReturnValue({ name: 'prvRead' } as never);

            const result = await useCase.execute('env-123', 'account');

            expect(result).toBeDefined();
            expect(result.entity).toBeDefined();
            expect(result.attributes).toHaveLength(1);
            expect(result.keys).toHaveLength(1);
            expect(result.privileges).toHaveLength(1);
            expect(repository.getEntityWithAttributes).toHaveBeenCalledWith(
                'env-123',
                expect.objectContaining({ value: 'account' })
            );
        });

        it('should map all attributes without sorting', async () => {
            const attr1 = createTestAttribute('zebra', 'Zebra Field');
            const attr2 = createTestAttribute('alpha', 'Alpha Field');
            const attr3 = createTestAttribute('middle', 'Middle Field');
            const entity = createTestEntity([attr1, attr2, attr3]);

            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            attributeRowMapper.toViewModel.mockImplementation((attr) => ({ logicalName: attr.logicalName.getValue() } as never));

            const result = await useCase.execute('env-123', 'account');

            // Verify all attributes were mapped (order not guaranteed)
            expect(result.attributes).toHaveLength(3);
            expect(attributeRowMapper.toViewModel).toHaveBeenCalledTimes(3);
            expect(attributeRowMapper.toViewModel).toHaveBeenCalledWith(attr1);
            expect(attributeRowMapper.toViewModel).toHaveBeenCalledWith(attr2);
            expect(attributeRowMapper.toViewModel).toHaveBeenCalledWith(attr3);
        });

        it('should map all keys without sorting', async () => {
            const key1 = createTestKey('zebra_key');
            const key2 = createTestKey('alpha_key');
            const key3 = createTestKey('middle_key');
            const entity = createTestEntity([], [], [], [], [key1, key2, key3]);

            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            keyRowMapper.toViewModel.mockImplementation((key) => ({ logicalName: key.logicalName.getValue() } as never));

            const result = await useCase.execute('env-123', 'account');

            // Verify all keys were mapped (order not guaranteed)
            expect(result.keys).toHaveLength(3);
            expect(keyRowMapper.toViewModel).toHaveBeenCalledTimes(3);
            expect(keyRowMapper.toViewModel).toHaveBeenCalledWith(key1);
            expect(keyRowMapper.toViewModel).toHaveBeenCalledWith(key2);
            expect(keyRowMapper.toViewModel).toHaveBeenCalledWith(key3);
        });

        it('should map all privileges without sorting', async () => {
            const priv1 = createTestPrivilege('prvWrite', 3);
            const priv2 = createTestPrivilege('prvCreate', 1);
            const priv3 = createTestPrivilege('prvRead', 2);
            const entity = createTestEntity([], [], [], [], [], [priv1, priv2, priv3]);

            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            privilegeRowMapper.toViewModel.mockImplementation((priv) => ({ name: priv.name } as never));

            const result = await useCase.execute('env-123', 'account');

            // Verify all privileges were mapped (order not guaranteed)
            expect(result.privileges).toHaveLength(3);
            expect(privilegeRowMapper.toViewModel).toHaveBeenCalledTimes(3);
            expect(privilegeRowMapper.toViewModel).toHaveBeenCalledWith(priv1);
            expect(privilegeRowMapper.toViewModel).toHaveBeenCalledWith(priv2);
            expect(privilegeRowMapper.toViewModel).toHaveBeenCalledWith(priv3);
        });

        it('should map one-to-many relationships with correct mapper method', async () => {
            const rel1 = createTestRelationship('account_contact_1');
            const rel2 = createTestRelationship('account_contact_2');
            const entity = createTestEntity([], [rel1, rel2]);

            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            relationshipRowMapper.toOneToManyViewModel.mockImplementation((rel) => ({ name: rel.schemaName } as never));

            const result = await useCase.execute('env-123', 'account');

            expect(relationshipRowMapper.toOneToManyViewModel).toHaveBeenCalledTimes(2);
            expect(result.oneToManyRelationships).toHaveLength(2);
        });

        it('should map many-to-one relationships with correct mapper method', async () => {
            const rel1 = createTestRelationship('contact_account_1');
            const rel2 = createTestRelationship('contact_account_2');
            const entity = createTestEntity([], [], [rel1, rel2]);

            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            relationshipRowMapper.toManyToOneViewModel.mockImplementation((rel) => ({ name: rel.schemaName } as never));

            const result = await useCase.execute('env-123', 'account');

            expect(relationshipRowMapper.toManyToOneViewModel).toHaveBeenCalledTimes(2);
            expect(result.manyToOneRelationships).toHaveLength(2);
        });

        it('should map many-to-many relationships with correct mapper method', async () => {
            const rel1 = createTestManyToManyRelationship('accountcontact_rel1');
            const rel2 = createTestManyToManyRelationship('accountcontact_rel2');
            const entity = createTestEntity([], [], [], [rel1, rel2]);

            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            relationshipRowMapper.toManyToManyViewModel.mockImplementation((rel) => ({ name: rel.schemaName } as never));

            const result = await useCase.execute('env-123', 'account');

            expect(relationshipRowMapper.toManyToManyViewModel).toHaveBeenCalledTimes(2);
            expect(result.manyToManyRelationships).toHaveLength(2);
        });

        it('should log debug message at start with correct parameters', async () => {
            const entity = createTestEntity([]);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);

            await useCase.execute('env-456', 'contact');

            expect(logger.debug).toHaveBeenCalledWith('Loading entity metadata', {
                environmentId: 'env-456',
                logicalName: 'contact'
            });
        });

        it('should log info message with counts on successful completion', async () => {
            const attributes = [createTestAttribute('name', 'Name'), createTestAttribute('email', 'Email')];
            const keys = [createTestKey('key1')];
            const privileges = [createTestPrivilege('prvRead', 2), createTestPrivilege('prvWrite', 3)];
            const oneToMany = [createTestRelationship('rel1')];
            const manyToOne = [createTestRelationship('rel2'), createTestRelationship('rel3')];
            const manyToMany = [createTestManyToManyRelationship('rel4')];
            const entity = createTestEntity(attributes, oneToMany, manyToOne, manyToMany, keys, privileges);

            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            attributeRowMapper.toViewModel.mockReturnValue({} as never);
            keyRowMapper.toViewModel.mockReturnValue({} as never);
            privilegeRowMapper.toViewModel.mockReturnValue({} as never);
            relationshipRowMapper.toOneToManyViewModel.mockReturnValue({} as never);
            relationshipRowMapper.toManyToOneViewModel.mockReturnValue({} as never);
            relationshipRowMapper.toManyToManyViewModel.mockReturnValue({} as never);

            await useCase.execute('env-123', 'account');

            expect(logger.info).toHaveBeenCalledWith('Entity metadata loaded', {
                logicalName: 'account',
                attributeCount: 2,
                keyCount: 1,
                oneToManyCount: 1,
                manyToOneCount: 2,
                manyToManyCount: 1,
                privilegeCount: 2
            });
        });

        it('should handle entity with no attributes, keys, or relationships', async () => {
            const entity = createTestEntity([]);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);

            const result = await useCase.execute('env-123', 'account');

            expect(result.attributes).toEqual([]);
            expect(result.keys).toEqual([]);
            expect(result.oneToManyRelationships).toEqual([]);
            expect(result.manyToOneRelationships).toEqual([]);
            expect(result.manyToManyRelationships).toEqual([]);
            expect(result.privileges).toEqual([]);
        });

        it('should log error and rethrow when repository fails', async () => {
            const error = new Error('Repository failure');
            repository.getEntityWithAttributes.mockRejectedValue(error);

            await expect(useCase.execute('env-123', 'account')).rejects.toThrow('Repository failure');

            expect(logger.error).toHaveBeenCalledWith('Failed to load entity metadata', error);
        });

        it('should throw error when invalid logical name is provided', async () => {
            await expect(useCase.execute('env-123', 'Invalid-Name')).rejects.toThrow();

            expect(repository.getEntityWithAttributes).not.toHaveBeenCalled();
        });

        it('should create LogicalName from string parameter', async () => {
            const entity = createTestEntity([]);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);

            await useCase.execute('env-123', 'cr9a7_customentity');

            const callArgs = repository.getEntityWithAttributes.mock.calls[0];
            expect(callArgs).toBeDefined();
            expect(callArgs![1]).toBeInstanceOf(LogicalName);
            expect(callArgs![1].getValue()).toBe('cr9a7_customentity');
        });

        it('should call all mappers with correct data', async () => {
            const attr = createTestAttribute('name', 'Name');
            const key = createTestKey('key1');
            const priv = createTestPrivilege('prvRead', 2);
            const entity = createTestEntity([attr], [], [], [], [key], [priv]);

            repository.getEntityWithAttributes.mockResolvedValue(entity);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            attributeRowMapper.toViewModel.mockReturnValue({} as never);
            keyRowMapper.toViewModel.mockReturnValue({} as never);
            privilegeRowMapper.toViewModel.mockReturnValue({} as never);

            await useCase.execute('env-123', 'account');

            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledWith(entity);
            expect(attributeRowMapper.toViewModel).toHaveBeenCalledWith(attr);
            expect(keyRowMapper.toViewModel).toHaveBeenCalledWith(key);
            expect(privilegeRowMapper.toViewModel).toHaveBeenCalledWith(priv);
        });
    });
});
