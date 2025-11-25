import { GetPluginTracesUseCase } from './GetPluginTracesUseCase';
import { PluginTrace } from './../../domain/entities/PluginTrace';
import { TraceFilter } from './../../domain/entities/TraceFilter';
import { CorrelationId } from './../../domain/valueObjects/CorrelationId';
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
				'Retrieved plugin traces',
				{ environmentId, count: mockTraces.length }
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
				'Retrieved plugin traces',
				{ environmentId, count: 0 }
			);
		});
	});

	describe('getTraceById', () => {
		it('should retrieve a single trace by ID', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-456';
			const mockTrace = PluginTrace.create({
				id: traceId,
				createdOn: new Date(),
				pluginName: 'TestPlugin',
				entityName: 'account',
				messageName: 'Update',
				operationType: OperationType.Plugin,
				mode: ExecutionMode.Synchronous,
				duration: Duration.fromMilliseconds(150),
				constructorDuration: Duration.fromMilliseconds(15),
			});

			mockRepository.getTraceById.mockResolvedValue(mockTrace);

			const result = await useCase.getTraceById(environmentId, traceId);

			expect(result).toBe(mockTrace);
			expect(mockRepository.getTraceById).toHaveBeenCalledWith(environmentId, traceId);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching single plugin trace',
				{ environmentId, traceId }
			);
		});

		it('should return null when trace not found', async () => {
			const environmentId = 'env-123';
			const traceId = 'nonexistent';

			mockRepository.getTraceById.mockResolvedValue(null);

			const result = await useCase.getTraceById(environmentId, traceId);

			expect(result).toBeNull();
			expect(mockRepository.getTraceById).toHaveBeenCalledWith(environmentId, traceId);
		});
	});

	describe('getTracesByCorrelationId', () => {
		it('should retrieve traces by correlation ID with default top limit', async () => {
			const environmentId = 'env-123';
			const correlationId = CorrelationId.create('corr-789');
			const mockTraces = [
				PluginTrace.create({
					id: 'trace-1',
					createdOn: new Date(),
					pluginName: 'Plugin1',
					entityName: 'account',
					messageName: 'Create',
					operationType: OperationType.Plugin,
					mode: ExecutionMode.Synchronous,
					duration: Duration.fromMilliseconds(100),
					constructorDuration: Duration.fromMilliseconds(10),
				}),
				PluginTrace.create({
					id: 'trace-2',
					createdOn: new Date(),
					pluginName: 'Plugin2',
					entityName: 'account',
					messageName: 'Update',
					operationType: OperationType.Plugin,
					mode: ExecutionMode.Synchronous,
					duration: Duration.fromMilliseconds(50),
					constructorDuration: Duration.fromMilliseconds(5),
				}),
			];

			mockRepository.getTraces.mockResolvedValue(mockTraces);

			const result = await useCase.getTracesByCorrelationId(environmentId, correlationId);

			expect(result).toEqual(mockTraces);
			expect(mockRepository.getTraces).toHaveBeenCalledWith(
				environmentId,
				expect.objectContaining({
					top: 1000,
					orderBy: 'createdon asc'
				})
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching traces by correlationId (unfiltered)',
				{ environmentId, correlationId: 'corr-789' }
			);
		});

		it('should retrieve traces by correlation ID with custom top limit', async () => {
			const environmentId = 'env-123';
			const correlationId = CorrelationId.create('corr-789');
			const customTop = 500;

			mockRepository.getTraces.mockResolvedValue([]);

			await useCase.getTracesByCorrelationId(environmentId, correlationId, customTop);

			expect(mockRepository.getTraces).toHaveBeenCalledWith(
				environmentId,
				expect.objectContaining({
					top: customTop,
					orderBy: 'createdon asc'
				})
			);
		});

		it('should create filter with only correlation ID and no other filters', async () => {
			const environmentId = 'env-123';
			const correlationId = CorrelationId.create('corr-999');

			mockRepository.getTraces.mockResolvedValue([]);

			await useCase.getTracesByCorrelationId(environmentId, correlationId);

			// Verify filter was created with ONLY correlationIdFilter
			const callArgs = mockRepository.getTraces.mock.calls[0];
			const passedFilter = callArgs![1] as TraceFilter;

			expect(passedFilter.correlationIdFilter).toBe(correlationId);
			expect(passedFilter.top).toBe(1000);
			expect(passedFilter.orderBy).toBe('createdon asc');
		});

		it('should return empty array when no related traces found', async () => {
			const environmentId = 'env-123';
			const correlationId = CorrelationId.create('corr-empty');

			mockRepository.getTraces.mockResolvedValue([]);

			const result = await useCase.getTracesByCorrelationId(environmentId, correlationId);

			expect(result).toEqual([]);
		});
	});
});
