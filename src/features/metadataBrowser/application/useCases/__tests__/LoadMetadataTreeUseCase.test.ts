import { LoadMetadataTreeUseCase } from '../LoadMetadataTreeUseCase';
import { IEntityMetadataRepository } from '../../../domain/repositories/IEntityMetadataRepository';
import { EntityTreeItemMapper } from '../../mappers/EntityTreeItemMapper';
import { ChoiceTreeItemMapper } from '../../mappers/ChoiceTreeItemMapper';
import { ILogger } from '../../../../../infrastructure/logging/ILogger';
import { EntityMetadata } from '../../../domain/entities/EntityMetadata';
import { OptionSetMetadata } from '../../../domain/valueObjects/OptionSetMetadata';
import { LogicalName } from '../../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../../domain/valueObjects/SchemaName';
import { NullLogger } from '../../../../../infrastructure/logging/NullLogger';

describe('LoadMetadataTreeUseCase', () => {
    let repository: jest.Mocked<IEntityMetadataRepository>;
    let entityTreeItemMapper: jest.Mocked<EntityTreeItemMapper>;
    let choiceTreeItemMapper: jest.Mocked<ChoiceTreeItemMapper>;
    let logger: ILogger;
    let useCase: LoadMetadataTreeUseCase;

    const createTestEntity = (logicalName: string, displayName: string): EntityMetadata => {
        // SchemaName must be alphanumeric with underscores, no spaces
        const schemaName = displayName.replace(/\s+/g, '');
        return EntityMetadata.create({
            metadataId: `entity-${logicalName}`,
            logicalName: LogicalName.create(logicalName),
            schemaName: SchemaName.create(schemaName),
            displayName,
            pluralName: `${displayName}s`,
            description: null,
            isCustomEntity: false,
            isManaged: true,
            ownershipType: 'UserOwned',
            attributes: []
        });
    };

    const createTestChoice = (name: string, displayName: string | null): OptionSetMetadata => {
        return OptionSetMetadata.create({
            name,
            displayName,
            isGlobal: true,
            isCustom: false,
            options: []
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

        choiceTreeItemMapper = {
            toViewModel: jest.fn()
        } as unknown as jest.Mocked<ChoiceTreeItemMapper>;

        logger = new NullLogger();
        jest.spyOn(logger, 'debug');
        jest.spyOn(logger, 'info');
        jest.spyOn(logger, 'error');

        useCase = new LoadMetadataTreeUseCase(
            repository,
            entityTreeItemMapper,
            choiceTreeItemMapper,
            logger
        );
    });

    describe('execute', () => {
        it('should load metadata tree and map to view models', async () => {
            const entities = [createTestEntity('account', 'Account')];
            const choices = [createTestChoice('statuscode', 'Status Code')];

            repository.getAllEntities.mockResolvedValue(entities);
            repository.getAllGlobalChoices.mockResolvedValue(choices);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'statuscode' } as never);

            const result = await useCase.execute('env-123');

            expect(result).toBeDefined();
            expect(result.entities).toHaveLength(1);
            expect(result.choices).toHaveLength(1);
            expect(repository.getAllEntities).toHaveBeenCalledWith('env-123');
            expect(repository.getAllGlobalChoices).toHaveBeenCalledWith('env-123');
        });

        it('should fetch entities and choices in parallel', async () => {
            const entities = [createTestEntity('account', 'Account')];
            const choices = [createTestChoice('statuscode', 'Status Code')];

            repository.getAllEntities.mockResolvedValue(entities);
            repository.getAllGlobalChoices.mockResolvedValue(choices);
            entityTreeItemMapper.toViewModel.mockReturnValue({ logicalName: 'account' } as never);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'statuscode' } as never);

            await useCase.execute('env-123');

            // Both should be called (parallel execution)
            expect(repository.getAllEntities).toHaveBeenCalledWith('env-123');
            expect(repository.getAllGlobalChoices).toHaveBeenCalledWith('env-123');
        });

        it('should map all entities without sorting', async () => {
            const entity1 = createTestEntity('account', 'Zebra Account');
            const entity2 = createTestEntity('contact', 'Alpha Contact');
            const entity3 = createTestEntity('lead', 'Middle Lead');

            repository.getAllEntities.mockResolvedValue([entity1, entity2, entity3]);
            repository.getAllGlobalChoices.mockResolvedValue([]);
            entityTreeItemMapper.toViewModel.mockImplementation((e) => ({ displayName: e.displayName } as never));

            const result = await useCase.execute('env-123');

            // Verify all entities were mapped (order not guaranteed)
            expect(result.entities).toHaveLength(3);
            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledTimes(3);
            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledWith(entity1);
            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledWith(entity2);
            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledWith(entity3);
        });

        it('should map all choices without sorting', async () => {
            const choice1 = createTestChoice('choice1', 'Zebra Choice');
            const choice2 = createTestChoice('choice2', 'Alpha Choice');
            const choice3 = createTestChoice('choice3', 'Middle Choice');

            repository.getAllEntities.mockResolvedValue([]);
            repository.getAllGlobalChoices.mockResolvedValue([choice1, choice2, choice3]);
            choiceTreeItemMapper.toViewModel.mockImplementation((c) => ({ displayName: c.displayName } as never));

            const result = await useCase.execute('env-123');

            // Verify all choices were mapped (order not guaranteed)
            expect(result.choices).toHaveLength(3);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledTimes(3);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledWith(choice1);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledWith(choice2);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledWith(choice3);
        });

        it('should map choices with null display name', async () => {
            const choice1 = createTestChoice('zebra_choice', null);
            const choice2 = createTestChoice('alpha_choice', null);
            const choice3 = createTestChoice('middle_choice', 'Middle Choice');

            repository.getAllEntities.mockResolvedValue([]);
            repository.getAllGlobalChoices.mockResolvedValue([choice1, choice2, choice3]);
            choiceTreeItemMapper.toViewModel.mockImplementation((c) => ({ name: c.name } as never));

            const result = await useCase.execute('env-123');

            // Verify all choices were mapped (order not guaranteed)
            expect(result.choices).toHaveLength(3);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledTimes(3);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledWith(choice1);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledWith(choice2);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledWith(choice3);
        });

        it('should handle empty entities and choices', async () => {
            repository.getAllEntities.mockResolvedValue([]);
            repository.getAllGlobalChoices.mockResolvedValue([]);

            const result = await useCase.execute('env-123');

            expect(result.entities).toEqual([]);
            expect(result.choices).toEqual([]);
            expect(entityTreeItemMapper.toViewModel).not.toHaveBeenCalled();
            expect(choiceTreeItemMapper.toViewModel).not.toHaveBeenCalled();
        });

        it('should log debug message at start', async () => {
            repository.getAllEntities.mockResolvedValue([]);
            repository.getAllGlobalChoices.mockResolvedValue([]);

            await useCase.execute('env-456');

            expect(logger.debug).toHaveBeenCalledWith('Loading metadata tree', {
                environmentId: 'env-456'
            });
        });

        it('should log info message with counts on successful completion', async () => {
            const entities = [
                createTestEntity('account', 'Account'),
                createTestEntity('contact', 'Contact')
            ];
            const choices = [
                createTestChoice('statuscode', 'Status Code'),
                createTestChoice('statecode', 'State Code'),
                createTestChoice('priority', 'Priority')
            ];

            repository.getAllEntities.mockResolvedValue(entities);
            repository.getAllGlobalChoices.mockResolvedValue(choices);
            entityTreeItemMapper.toViewModel.mockReturnValue({} as never);
            choiceTreeItemMapper.toViewModel.mockReturnValue({} as never);

            await useCase.execute('env-123');

            expect(logger.info).toHaveBeenCalledWith('Metadata tree loaded', {
                entityCount: 2,
                choiceCount: 3
            });
        });

        it('should log error and rethrow when repository fails', async () => {
            const error = new Error('Repository failure');
            repository.getAllEntities.mockRejectedValue(error);
            repository.getAllGlobalChoices.mockResolvedValue([]);

            await expect(useCase.execute('env-123')).rejects.toThrow('Repository failure');

            expect(logger.error).toHaveBeenCalledWith('Failed to load metadata tree', error);
        });

        it('should log error when getAllGlobalChoices fails', async () => {
            const error = new Error('Choices repository failure');
            repository.getAllEntities.mockResolvedValue([]);
            repository.getAllGlobalChoices.mockRejectedValue(error);

            await expect(useCase.execute('env-123')).rejects.toThrow('Choices repository failure');

            expect(logger.error).toHaveBeenCalledWith('Failed to load metadata tree', error);
        });

        it('should call mappers with correct data', async () => {
            const entity = createTestEntity('account', 'Account');
            const choice = createTestChoice('statuscode', 'Status Code');

            repository.getAllEntities.mockResolvedValue([entity]);
            repository.getAllGlobalChoices.mockResolvedValue([choice]);
            entityTreeItemMapper.toViewModel.mockReturnValue({} as never);
            choiceTreeItemMapper.toViewModel.mockReturnValue({} as never);

            await useCase.execute('env-123');

            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledWith(entity);
            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledTimes(1);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledWith(choice);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledTimes(1);
        });

        it('should map all entities regardless of count', async () => {
            const entities = [
                createTestEntity('zebra', 'Z Entity'),
                createTestEntity('alpha', 'A Entity'),
                createTestEntity('middle', 'M Entity'),
                createTestEntity('beta', 'B Entity')
            ];

            repository.getAllEntities.mockResolvedValue(entities);
            repository.getAllGlobalChoices.mockResolvedValue([]);
            entityTreeItemMapper.toViewModel.mockImplementation((e) => ({ displayName: e.displayName } as never));

            const result = await useCase.execute('env-123');

            expect(result.entities).toHaveLength(4);
            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledTimes(4);
            entities.forEach(entity => {
                expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledWith(entity);
            });
        });

        it('should map entities with varying case', async () => {
            const entities = [
                createTestEntity('entity1', 'zebra'),
                createTestEntity('entity2', 'Alpha'),
                createTestEntity('entity3', 'BETA')
            ];

            repository.getAllEntities.mockResolvedValue(entities);
            repository.getAllGlobalChoices.mockResolvedValue([]);
            entityTreeItemMapper.toViewModel.mockImplementation((e) => ({ displayName: e.displayName } as never));

            const result = await useCase.execute('env-123');

            expect(result.entities).toHaveLength(3);
            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledTimes(3);
            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledWith(entities[0]);
            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledWith(entities[1]);
            expect(entityTreeItemMapper.toViewModel).toHaveBeenCalledWith(entities[2]);
        });
    });
});
