import { LoadEntityAttributesUseCase } from '../LoadEntityAttributesUseCase';
import { IEntityMetadataRepository } from '../../../domain/repositories/IEntityMetadataRepository';
import { EntityAttributeMapper } from '../../mappers/EntityAttributeMapper';
import { ILogger } from '../../../../../infrastructure/logging/ILogger';
import { EntityMetadata } from '../../../domain/entities/EntityMetadata';
import { AttributeMetadata } from '../../../domain/entities/AttributeMetadata';
import { LogicalName } from '../../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../../domain/valueObjects/SchemaName';
import { AttributeType } from '../../../domain/valueObjects/AttributeType';
import { EntityAttributeViewModel } from '../../viewModels/EntityAttributeViewModel';
import { NullLogger } from '../../../../../infrastructure/logging/NullLogger';

describe('LoadEntityAttributesUseCase', () => {
    let repository: jest.Mocked<IEntityMetadataRepository>;
    let mapper: jest.Mocked<EntityAttributeMapper>;
    let logger: ILogger;
    let useCase: LoadEntityAttributesUseCase;

    const createTestAttribute = (logicalName: string): AttributeMetadata => {
        return AttributeMetadata.create({
            metadataId: `attr-${logicalName}`,
            logicalName: LogicalName.create(logicalName),
            schemaName: SchemaName.create(logicalName.charAt(0).toUpperCase() + logicalName.slice(1)),
            displayName: logicalName,
            description: null,
            attributeType: AttributeType.create('StringType'),
            isCustomAttribute: false,
            isManaged: true,
            isPrimaryId: false,
            isPrimaryName: false,
            requiredLevel: 'None'
        });
    };

    const createTestEntity = (attributes: AttributeMetadata[]): EntityMetadata => {
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
            attributes
        });
    };

    const createTestViewModel = (logicalName: string): EntityAttributeViewModel => {
        return {
            logicalName,
            schemaName: logicalName.charAt(0).toUpperCase() + logicalName.slice(1),
            displayName: logicalName,
            attributeType: 'StringType',
            attributeTypeDisplay: 'String',
            isRequired: false,
            requiredLevel: 'None',
            requiredLevelDisplay: 'None',
            isCustomAttribute: false,
            isPrimaryId: false,
            isPrimaryName: false,
            maxLength: null,
            targets: null
        };
    };

    beforeEach(() => {
        repository = {
            getAllEntities: jest.fn(),
            getEntityWithAttributes: jest.fn()
        };

        mapper = {
            toViewModels: jest.fn()
        } as unknown as jest.Mocked<EntityAttributeMapper>;

        logger = new NullLogger();
        jest.spyOn(logger, 'info');
        jest.spyOn(logger, 'error');

        useCase = new LoadEntityAttributesUseCase(repository, mapper, logger);
    });

    describe('execute', () => {
        it('should load entity attributes and map to view models', async () => {
            const attributes = [
                createTestAttribute('name'),
                createTestAttribute('email')
            ];
            const entity = createTestEntity(attributes);
            const viewModels = [
                createTestViewModel('name'),
                createTestViewModel('email')
            ];

            repository.getEntityWithAttributes.mockResolvedValue(entity);
            mapper.toViewModels.mockReturnValue(viewModels);

            const result = await useCase.execute('env-123', 'account');

            expect(result).toBe(viewModels);
            expect(repository.getEntityWithAttributes).toHaveBeenCalledWith(
                'env-123',
                expect.objectContaining({ value: 'account' })
            );
            expect(mapper.toViewModels).toHaveBeenCalledWith(attributes);
        });

        it('should create LogicalName from string parameter', async () => {
            const entity = createTestEntity([]);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            mapper.toViewModels.mockReturnValue([]);

            await useCase.execute('env-123', 'contact');

            const callArgs = repository.getEntityWithAttributes.mock.calls[0];
            expect(callArgs).toBeDefined();
            expect(callArgs![1]).toBeInstanceOf(LogicalName);
            expect(callArgs![1].getValue()).toBe('contact');
        });

        it('should log start of operation', async () => {
            const entity = createTestEntity([]);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            mapper.toViewModels.mockReturnValue([]);

            await useCase.execute('env-123', 'account');

            expect(logger.info).toHaveBeenCalledWith('Loading entity attributes', {
                environmentId: 'env-123',
                logicalName: 'account'
            });
        });

        it('should log successful completion with attribute count', async () => {
            const attributes = [
                createTestAttribute('name'),
                createTestAttribute('email'),
                createTestAttribute('phone')
            ];
            const entity = createTestEntity(attributes);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            mapper.toViewModels.mockReturnValue([]);

            await useCase.execute('env-123', 'account');

            expect(logger.info).toHaveBeenCalledWith('Loaded entity attributes', {
                logicalName: 'account',
                attributeCount: 3
            });
        });

        it('should handle entity with no attributes', async () => {
            const entity = createTestEntity([]);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            mapper.toViewModels.mockReturnValue([]);

            const result = await useCase.execute('env-123', 'account');

            expect(result).toEqual([]);
            expect(logger.info).toHaveBeenCalledWith('Loaded entity attributes', {
                logicalName: 'account',
                attributeCount: 0
            });
        });

        it('should log error and rethrow when repository fails', async () => {
            const error = new Error('Repository failure');
            repository.getEntityWithAttributes.mockRejectedValue(error);

            await expect(useCase.execute('env-123', 'account')).rejects.toThrow('Repository failure');

            expect(logger.error).toHaveBeenCalledWith('Failed to load entity attributes', error);
        });

        it('should normalize non-Error objects before logging', async () => {
            const errorObject = { message: 'Custom error', code: 'ERR_CUSTOM' };
            repository.getEntityWithAttributes.mockRejectedValue(errorObject);

            await expect(useCase.execute('env-123', 'account')).rejects.toThrow();

            expect(logger.error).toHaveBeenCalled();
            const loggedError = (logger.error as jest.Mock).mock.calls[0][1];
            expect(loggedError).toBeInstanceOf(Error);
        });

        it('should throw error when invalid logical name is provided', async () => {
            await expect(useCase.execute('env-123', 'Invalid-Name')).rejects.toThrow();

            expect(repository.getEntityWithAttributes).not.toHaveBeenCalled();
            expect(mapper.toViewModels).not.toHaveBeenCalled();
        });

        it('should call repository with correct parameters', async () => {
            const entity = createTestEntity([]);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            mapper.toViewModels.mockReturnValue([]);

            await useCase.execute('test-env-456', 'contact');

            expect(repository.getEntityWithAttributes).toHaveBeenCalledWith(
                'test-env-456',
                expect.any(LogicalName)
            );
        });

        it('should pass attributes to mapper for transformation', async () => {
            const attributes = [createTestAttribute('name')];
            const entity = createTestEntity(attributes);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            mapper.toViewModels.mockReturnValue([]);

            await useCase.execute('env-123', 'account');

            expect(mapper.toViewModels).toHaveBeenCalledWith(attributes);
            expect(mapper.toViewModels).toHaveBeenCalledTimes(1);
        });

        it('should return exact result from mapper', async () => {
            const viewModels = [
                createTestViewModel('name'),
                createTestViewModel('email'),
                createTestViewModel('phone'),
                createTestViewModel('address')
            ];

            const entity = createTestEntity([]);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            mapper.toViewModels.mockReturnValue(viewModels);

            const result = await useCase.execute('env-123', 'account');

            expect(result).toBe(viewModels);
            expect(result).toHaveLength(4);
        });

        it('should handle different entity logical names', async () => {
            const entity = createTestEntity([]);
            repository.getEntityWithAttributes.mockResolvedValue(entity);
            mapper.toViewModels.mockReturnValue([]);

            await useCase.execute('env-123', 'cr9a7_customentity');

            const callArgs = repository.getEntityWithAttributes.mock.calls[0];
            expect(callArgs).toBeDefined();
            expect(callArgs![1].getValue()).toBe('cr9a7_customentity');
        });
    });
});
