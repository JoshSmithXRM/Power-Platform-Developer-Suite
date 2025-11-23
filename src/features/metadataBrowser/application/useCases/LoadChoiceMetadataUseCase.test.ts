import { LoadChoiceMetadataUseCase } from './LoadChoiceMetadataUseCase';
import { IEntityMetadataRepository } from './../../domain/repositories/IEntityMetadataRepository';
import { ChoiceTreeItemMapper } from './../mappers/ChoiceTreeItemMapper';
import { ChoiceValueRowMapper } from './../mappers/ChoiceValueRowMapper';
import { ILogger } from './../../../../infrastructure/logging/ILogger';
import { OptionSetMetadata, OptionMetadata } from './../../domain/valueObjects/OptionSetMetadata';
import { NullLogger } from './../../../../infrastructure/logging/NullLogger';

describe('LoadChoiceMetadataUseCase', () => {
    let repository: jest.Mocked<IEntityMetadataRepository>;
    let choiceTreeItemMapper: jest.Mocked<ChoiceTreeItemMapper>;
    let choiceValueRowMapper: jest.Mocked<ChoiceValueRowMapper>;
    let logger: ILogger;
    let useCase: LoadChoiceMetadataUseCase;

    const createTestOption = (value: number, label: string): OptionMetadata => {
        return OptionMetadata.create({
            value,
            label,
            description: null,
            color: null
        });
    };

    const createTestChoice = (name: string, options: OptionMetadata[]): OptionSetMetadata => {
        return OptionSetMetadata.create({
            name,
            displayName: name,
            isGlobal: true,
            isCustom: false,
            options
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

        choiceTreeItemMapper = {
            toViewModel: jest.fn()
        } as jest.Mocked<ChoiceTreeItemMapper>;

        choiceValueRowMapper = {
            toViewModel: jest.fn()
        } as jest.Mocked<ChoiceValueRowMapper>;

        logger = new NullLogger();
        jest.spyOn(logger, 'debug');
        jest.spyOn(logger, 'info');
        jest.spyOn(logger, 'error');

        useCase = new LoadChoiceMetadataUseCase(
            repository,
            choiceTreeItemMapper,
            choiceValueRowMapper,
            logger
        );
    });

    describe('execute', () => {
        it('should load choice metadata and map to view models', async () => {
            const options = [
                createTestOption(1, 'Active'),
                createTestOption(2, 'Inactive')
            ];
            const choice = createTestChoice('statuscode', options);

            repository.getGlobalChoiceWithOptions.mockResolvedValue(choice);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'statuscode' } as never);
            choiceValueRowMapper.toViewModel.mockImplementation((opt) => ({ value: opt.value } as never));

            const result = await useCase.execute('env-123', 'statuscode');

            expect(result).toBeDefined();
            expect(result.choice).toBeDefined();
            expect(result.choiceValues).toHaveLength(2);
            expect(repository.getGlobalChoiceWithOptions).toHaveBeenCalledWith('env-123', 'statuscode');
        });

        it('should map all choice values without sorting', async () => {
            const option1 = createTestOption(1, 'Zebra');
            const option2 = createTestOption(2, 'Alpha');
            const option3 = createTestOption(3, 'Middle');
            const choice = createTestChoice('testchoice', [option1, option2, option3]);

            repository.getGlobalChoiceWithOptions.mockResolvedValue(choice);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'testchoice' } as never);
            choiceValueRowMapper.toViewModel.mockImplementation((opt) => ({ label: opt.label } as never));

            const result = await useCase.execute('env-123', 'testchoice');

            // Verify all values were mapped (order not guaranteed)
            expect(result.choiceValues).toHaveLength(3);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledTimes(3);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(option1);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(option2);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(option3);
        });

        it('should handle choice with empty options', async () => {
            const choice = createTestChoice('emptychoice', []);

            repository.getGlobalChoiceWithOptions.mockResolvedValue(choice);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'emptychoice' } as never);

            const result = await useCase.execute('env-123', 'emptychoice');

            expect(result.choiceValues).toEqual([]);
            expect(choiceValueRowMapper.toViewModel).not.toHaveBeenCalled();
        });

        it('should log debug message at start', async () => {
            const choice = createTestChoice('testchoice', []);
            repository.getGlobalChoiceWithOptions.mockResolvedValue(choice);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'testchoice' } as never);

            await useCase.execute('env-456', 'testchoice');

            expect(logger.debug).toHaveBeenCalledWith('Loading choice metadata', {
                environmentId: 'env-456',
                name: 'testchoice'
            });
        });

        it('should log info message with value count on successful completion', async () => {
            const options = [
                createTestOption(1, 'Option 1'),
                createTestOption(2, 'Option 2'),
                createTestOption(3, 'Option 3')
            ];
            const choice = createTestChoice('testchoice', options);

            repository.getGlobalChoiceWithOptions.mockResolvedValue(choice);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'testchoice' } as never);
            choiceValueRowMapper.toViewModel.mockReturnValue({} as never);

            await useCase.execute('env-123', 'testchoice');

            expect(logger.info).toHaveBeenCalledWith('Choice metadata loaded', {
                name: 'testchoice',
                valueCount: 3
            });
        });

        it('should log error and rethrow when repository fails', async () => {
            const error = new Error('Repository failure');
            repository.getGlobalChoiceWithOptions.mockRejectedValue(error);

            await expect(useCase.execute('env-123', 'testchoice')).rejects.toThrow('Repository failure');

            expect(logger.error).toHaveBeenCalledWith('Failed to load choice metadata', error);
        });

        it('should call repository with correct parameters', async () => {
            const choice = createTestChoice('testchoice', []);
            repository.getGlobalChoiceWithOptions.mockResolvedValue(choice);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'testchoice' } as never);

            await useCase.execute('test-env-789', 'customchoice');

            expect(repository.getGlobalChoiceWithOptions).toHaveBeenCalledWith('test-env-789', 'customchoice');
            expect(repository.getGlobalChoiceWithOptions).toHaveBeenCalledTimes(1);
        });

        it('should call mappers with correct data', async () => {
            const options = [createTestOption(1, 'Option 1')];
            const choice = createTestChoice('testchoice', options);

            repository.getGlobalChoiceWithOptions.mockResolvedValue(choice);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'testchoice' } as never);
            choiceValueRowMapper.toViewModel.mockReturnValue({} as never);

            await useCase.execute('env-123', 'testchoice');

            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledWith(choice);
            expect(choiceTreeItemMapper.toViewModel).toHaveBeenCalledTimes(1);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(options[0]);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledTimes(1);
        });

        it('should map all options regardless of count', async () => {
            const options = [
                createTestOption(10, 'Z Option'),
                createTestOption(20, 'A Option'),
                createTestOption(30, 'M Option'),
                createTestOption(40, 'B Option'),
                createTestOption(50, 'Y Option')
            ];
            const choice = createTestChoice('testchoice', options);

            repository.getGlobalChoiceWithOptions.mockResolvedValue(choice);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'testchoice' } as never);
            choiceValueRowMapper.toViewModel.mockImplementation((opt) => ({ label: opt.label } as never));

            const result = await useCase.execute('env-123', 'testchoice');

            // Verify all values were mapped (order not guaranteed)
            expect(result.choiceValues).toHaveLength(5);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledTimes(5);
            options.forEach(option => {
                expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(option);
            });
        });

        it('should map options with varying case', async () => {
            const options = [
                createTestOption(1, 'zebra'),
                createTestOption(2, 'Alpha'),
                createTestOption(3, 'BETA')
            ];
            const choice = createTestChoice('testchoice', options);

            repository.getGlobalChoiceWithOptions.mockResolvedValue(choice);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'testchoice' } as never);
            choiceValueRowMapper.toViewModel.mockImplementation((opt) => ({ label: opt.label } as never));

            const result = await useCase.execute('env-123', 'testchoice');

            // Verify all options were mapped (order not guaranteed)
            expect(result.choiceValues).toHaveLength(3);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledTimes(3);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(options[0]);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(options[1]);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(options[2]);
        });

        it('should map all options to view models', async () => {
            const options = [
                createTestOption(3, 'C'),
                createTestOption(1, 'A'),
                createTestOption(2, 'B')
            ];
            const choice = createTestChoice('testchoice', options);

            repository.getGlobalChoiceWithOptions.mockResolvedValue(choice);
            choiceTreeItemMapper.toViewModel.mockReturnValue({ name: 'testchoice' } as never);
            choiceValueRowMapper.toViewModel.mockImplementation((opt) => ({ label: opt.label, value: opt.value } as never));

            const result = await useCase.execute('env-123', 'testchoice');

            expect(result.choiceValues).toHaveLength(3);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledTimes(3);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(options[0]);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(options[1]);
            expect(choiceValueRowMapper.toViewModel).toHaveBeenCalledWith(options[2]);
        });
    });
});
