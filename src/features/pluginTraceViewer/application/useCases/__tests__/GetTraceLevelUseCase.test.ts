import { GetTraceLevelUseCase } from '../GetTraceLevelUseCase';
import type { IPluginTraceRepository } from '../../../domain/repositories/IPluginTraceRepository';
import type { ILogger } from '../../../../../infrastructure/logging/ILogger';
import { TraceLevel } from '../../../domain/valueObjects/TraceLevel';

describe('GetTraceLevelUseCase', () => {
	let useCase: GetTraceLevelUseCase;
	let mockRepository: jest.Mocked<IPluginTraceRepository>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockRepository = {
			getTraces: jest.fn(),
			getTraceById: jest.fn(),
			deleteTrace: jest.fn(),
			deleteTraces: jest.fn(),
			deleteAllTraces: jest.fn(),
			deleteOldTraces: jest.fn(),
			getTraceLevel: jest.fn(),
			setTraceLevel: jest.fn(),
		};

		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		useCase = new GetTraceLevelUseCase(mockRepository, mockLogger);
	});

	describe('execute', () => {
		it('should retrieve trace level successfully', async () => {
			const environmentId = 'env-123';
			const expectedLevel = TraceLevel.All;

			mockRepository.getTraceLevel.mockResolvedValue(expectedLevel);

			const result = await useCase.execute(environmentId);

			expect(result).toEqual(expectedLevel);
			expect(mockRepository.getTraceLevel).toHaveBeenCalledWith(
				environmentId
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'GetTraceLevelUseCase: Getting trace level',
				{ environmentId }
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				`GetTraceLevelUseCase: Retrieved trace level: ${expectedLevel}`,
				{ environmentId }
			);
		});

		it('should log error and rethrow when repository fails', async () => {
			const environmentId = 'env-123';
			const error = new Error('Repository error');

			mockRepository.getTraceLevel.mockRejectedValue(error);

			await expect(useCase.execute(environmentId)).rejects.toThrow(
				'Repository error'
			);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'GetTraceLevelUseCase: Failed to get trace level',
				error
			);
		});

		it('should handle different trace levels', async () => {
			const environmentId = 'env-123';

			for (const level of [
				TraceLevel.Off,
				TraceLevel.Exception,
				TraceLevel.All,
			]) {
				mockRepository.getTraceLevel.mockResolvedValue(level);

				const result = await useCase.execute(environmentId);

				expect(result).toEqual(level);
			}
		});
	});
});
