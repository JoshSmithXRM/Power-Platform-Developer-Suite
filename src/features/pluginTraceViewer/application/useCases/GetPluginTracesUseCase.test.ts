import { GetPluginTracesUseCase } from './GetPluginTracesUseCase';
import { PluginTrace } from './../../domain/entities/PluginTrace';
import { TraceFilter } from './../../domain/entities/TraceFilter';
import { Duration } from './../../domain/valueObjects/Duration';
import { ExecutionMode } from './../../domain/valueObjects/ExecutionMode';
import { OperationType } from './../../domain/valueObjects/OperationType';
import { createMockPluginTraceRepository, createMockLogger } from '../../../../shared/testing';

describe('GetPluginTracesUseCase', () => {
	let useCase: GetPluginTracesUseCase;
	let mockRepository: ReturnType<typeof createMockPluginTraceRepository>;
	let mockLogger: ReturnType<typeof createMockLogger>;

	beforeEach(() => {
		mockRepository = createMockPluginTraceRepository();
		mockLogger = createMockLogger();

		useCase = new GetPluginTracesUseCase(mockRepository, mockLogger);
	});

	describe('execute', () => {
		it('should retrieve traces with default filter when no filter provided', async () => {
			const environmentId = 'env-123';
			const mockTraces: PluginTrace[] = [
				PluginTrace.create({
					id: 'trace-1',
					createdOn: new Date(),
					pluginName: 'TestPlugin',
					entityName: 'account',
					messageName: 'Create',
					operationType: OperationType.Plugin,
					mode: ExecutionMode.Synchronous,
					duration: Duration.fromMilliseconds(100),
					constructorDuration: Duration.fromMilliseconds(10),
				}),
			];

			mockRepository.getTraces.mockResolvedValue(mockTraces);

			const result = await useCase.execute(environmentId);

			expect(result).toEqual(mockTraces);
			expect(mockRepository.getTraces).toHaveBeenCalledWith(
				environmentId,
				expect.any(TraceFilter)
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'GetPluginTracesUseCase: Starting trace retrieval',
				expect.objectContaining({})
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				`GetPluginTracesUseCase: Retrieved ${mockTraces.length} traces`,
				{ environmentId }
			);
		});

		it('should retrieve traces with provided filter', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 50,
				orderBy: 'createdon asc',
			});
			const mockTraces: PluginTrace[] = [];

			mockRepository.getTraces.mockResolvedValue(mockTraces);

			const result = await useCase.execute(environmentId, filter);

			expect(result).toEqual(mockTraces);
			expect(mockRepository.getTraces).toHaveBeenCalledWith(
				environmentId,
				filter
			);
		});

		it('should log error and rethrow when repository fails', async () => {
			const environmentId = 'env-123';
			const error = new Error('Repository error');

			mockRepository.getTraces.mockRejectedValue(error);

			await expect(useCase.execute(environmentId)).rejects.toThrow(
				'Repository error'
			);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'GetPluginTracesUseCase: Failed to retrieve traces',
				error
			);
		});

		it('should return empty array when no traces found', async () => {
			const environmentId = 'env-123';
			mockRepository.getTraces.mockResolvedValue([]);

			const result = await useCase.execute(environmentId);

			expect(result).toEqual([]);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'GetPluginTracesUseCase: Retrieved 0 traces',
				{ environmentId }
			);
		});
	});
});
