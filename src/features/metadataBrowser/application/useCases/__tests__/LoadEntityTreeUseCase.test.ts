import { LoadEntityTreeUseCase } from '../LoadEntityTreeUseCase';
import { IEntityMetadataRepository } from '../../../domain/repositories/IEntityMetadataRepository';
import { EntityTreeItemMapper } from '../../mappers/EntityTreeItemMapper';
import { ILogger } from '../../../../../infrastructure/logging/ILogger';
import { EntityMetadata } from '../../../domain/entities/EntityMetadata';
import { LogicalName } from '../../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../../domain/valueObjects/SchemaName';
import { EntityTreeItemViewModel } from '../../viewModels/EntityTreeItemViewModel';
import { NullLogger } from '../../../../../infrastructure/logging/NullLogger';

describe('LoadEntityTreeUseCase', () => {
    let repository: jest.Mocked<IEntityMetadataRepository>;
    let mapper: jest.Mocked<EntityTreeItemMapper>;
    let logger: ILogger;
    let useCase: LoadEntityTreeUseCase;

    const createTestEntity = (logicalName: string): EntityMetadata => {
        return EntityMetadata.create({
            metadataId: `entity-${logicalName}`,
            logicalName: LogicalName.create(logicalName),
            schemaName: SchemaName.create(logicalName.charAt(0).toUpperCase() + logicalName.slice(1)),
            displayName: logicalName,
            pluralName: `${logicalName}s`,
            description: null,
            isCustomEntity: false,
            isManaged: true,
            ownershipType: 'UserOwned',
            attributes: []
        });
    };

    const createTestViewModel = (logicalName: string): EntityTreeItemViewModel => {
        return {
            logicalName,
            schemaName: logicalName.charAt(0).toUpperCase() + logicalName.slice(1),
            displayName: logicalName,
            isCustomEntity: false,
            attributeCount: 0
        };
    };

    beforeEach(() => {
        repository = {
            getAllEntities: jest.fn(),
            getEntityWithAttributes: jest.fn()
        };

        mapper = {
            toViewModels: jest.fn()
        } as unknown as jest.Mocked<EntityTreeItemMapper>;

        logger = new NullLogger();
        jest.spyOn(logger, 'info');
        jest.spyOn(logger, 'error');

        useCase = new LoadEntityTreeUseCase(repository, mapper, logger);
    });

    describe('execute', () => {
        it('should load entities and map to view models', async () => {
            const entities = [
                createTestEntity('account'),
                createTestEntity('contact')
            ];
            const viewModels = [
                createTestViewModel('account'),
                createTestViewModel('contact')
            ];

            repository.getAllEntities.mockResolvedValue(entities);
            mapper.toViewModels.mockReturnValue(viewModels);

            const result = await useCase.execute('env-123');

            expect(result).toBe(viewModels);
            expect(repository.getAllEntities).toHaveBeenCalledWith('env-123');
            expect(mapper.toViewModels).toHaveBeenCalledWith(entities);
        });

        it('should log start of operation', async () => {
            repository.getAllEntities.mockResolvedValue([]);
            mapper.toViewModels.mockReturnValue([]);

            await useCase.execute('env-123');

            expect(logger.info).toHaveBeenCalledWith('Loading entity tree', { environmentId: 'env-123' });
        });

        it('should log successful completion with count', async () => {
            const entities = [createTestEntity('account'), createTestEntity('contact')];
            repository.getAllEntities.mockResolvedValue(entities);
            mapper.toViewModels.mockReturnValue([]);

            await useCase.execute('env-123');

            expect(logger.info).toHaveBeenCalledWith('Loaded entity metadata', { count: 2 });
        });

        it('should handle empty entity list', async () => {
            repository.getAllEntities.mockResolvedValue([]);
            mapper.toViewModels.mockReturnValue([]);

            const result = await useCase.execute('env-123');

            expect(result).toEqual([]);
            expect(logger.info).toHaveBeenCalledWith('Loaded entity metadata', { count: 0 });
        });

        it('should log error and rethrow when repository fails', async () => {
            const error = new Error('Repository failure');
            repository.getAllEntities.mockRejectedValue(error);

            await expect(useCase.execute('env-123')).rejects.toThrow('Repository failure');

            expect(logger.error).toHaveBeenCalledWith('Failed to load entity tree', error);
        });

        it('should normalize non-Error objects before logging', async () => {
            const errorObject = { message: 'Custom error', code: 'ERR_CUSTOM' };
            repository.getAllEntities.mockRejectedValue(errorObject);

            await expect(useCase.execute('env-123')).rejects.toThrow();

            expect(logger.error).toHaveBeenCalled();
            const loggedError = (logger.error as jest.Mock).mock.calls[0][1];
            expect(loggedError).toBeInstanceOf(Error);
        });

        it('should call repository with correct environment ID', async () => {
            repository.getAllEntities.mockResolvedValue([]);
            mapper.toViewModels.mockReturnValue([]);

            await useCase.execute('test-env-456');

            expect(repository.getAllEntities).toHaveBeenCalledWith('test-env-456');
        });

        it('should pass entities to mapper for transformation', async () => {
            const entities = [createTestEntity('account')];
            repository.getAllEntities.mockResolvedValue(entities);
            mapper.toViewModels.mockReturnValue([]);

            await useCase.execute('env-123');

            expect(mapper.toViewModels).toHaveBeenCalledWith(entities);
            expect(mapper.toViewModels).toHaveBeenCalledTimes(1);
        });

        it('should return exact result from mapper', async () => {
            const viewModels = [
                createTestViewModel('account'),
                createTestViewModel('contact'),
                createTestViewModel('lead')
            ];

            repository.getAllEntities.mockResolvedValue([]);
            mapper.toViewModels.mockReturnValue(viewModels);

            const result = await useCase.execute('env-123');

            expect(result).toBe(viewModels);
            expect(result).toHaveLength(3);
        });
    });
});
