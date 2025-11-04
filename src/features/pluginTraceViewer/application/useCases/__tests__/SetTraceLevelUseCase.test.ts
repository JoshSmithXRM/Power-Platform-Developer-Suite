import { SetTraceLevelUseCase } from '../SetTraceLevelUseCase';
import type { IPluginTraceRepository } from '../../../domain/repositories/IPluginTraceRepository';
import type { ILogger } from '../../../../../infrastructure/logging/ILogger';
import { TraceLevel } from '../../../domain/valueObjects/TraceLevel';

describe('SetTraceLevelUseCase', () => {
	let useCase: SetTraceLevelUseCase;
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

		useCase = new SetTraceLevelUseCase(mockRepository, mockLogger);
	});

	describe('execute', () => {
		it('should set trace level successfully', async () => {
			const environmentId = 'env-123';
			const level = TraceLevel.All;

			mockRepository.setTraceLevel.mockResolvedValue();

			await useCase.execute(environmentId, level);

			expect(mockRepository.setTraceLevel).toHaveBeenCalledWith(
				environmentId,
				level
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				`SetTraceLevelUseCase: Setting trace level to ${level}`,
				{ environmentId }
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				`SetTraceLevelUseCase: Successfully set trace level to ${level}`,
				{ environmentId }
			);
		});

		it('should log error and rethrow when repository fails', async () => {
			const environmentId = 'env-123';
			const level = TraceLevel.Exception;
			const error = new Error('Repository error');

			mockRepository.setTraceLevel.mockRejectedValue(error);

			await expect(
				useCase.execute(environmentId, level)
			).rejects.toThrow('Repository error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'SetTraceLevelUseCase: Failed to set trace level',
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
				mockRepository.setTraceLevel.mockResolvedValue();

				await useCase.execute(environmentId, level);

				expect(mockRepository.setTraceLevel).toHaveBeenCalledWith(
					environmentId,
					level
				);
			}
		});
	});
});
