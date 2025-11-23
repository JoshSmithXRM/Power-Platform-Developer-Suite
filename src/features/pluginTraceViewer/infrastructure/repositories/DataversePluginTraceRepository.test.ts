import { DataversePluginTraceRepository } from './DataversePluginTraceRepository';
import type { IDataverseApiService } from './../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from './../../../../infrastructure/logging/ILogger';
import { TraceFilter } from './../../domain/entities/TraceFilter';
import { TraceLevel } from './../../domain/valueObjects/TraceLevel';
import { createMockDataverseApiService, createMockLogger } from '../../../../shared/testing';

describe('DataversePluginTraceRepository', () => {
	let repository: DataversePluginTraceRepository;
	let mockApiService: jest.Mocked<IDataverseApiService>;
	let mockLogger: jest.Mocked<ILogger>;

	const mockTraceDto = {
		plugintracelogid: 'trace-1',
		createdon: '2025-01-01T10:00:00Z',
		typename: 'TestPlugin',
		primaryentity: 'account',
		messagename: 'Create',
		operationtype: 1,
		mode: 0,
		depth: 1,
		performanceexecutionduration: 100,
		performanceconstructorduration: 10,
		exceptiondetails: null,
		messageblock: null,
		configuration: null,
		secureconfiguration: null,
		correlationid: null,
		requestid: null,
		pluginstepid: null,
		persistencekey: null,
	};

	beforeEach(() => {
		mockApiService = createMockDataverseApiService();
		mockLogger = createMockLogger();
		repository = new DataversePluginTraceRepository(mockApiService, mockLogger);
	});

	describe('getTraces', () => {
		it('should fetch traces with filter', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({ top: 50 });

			mockApiService.get.mockResolvedValue({
				value: [mockTraceDto],
			});

			const traces = await repository.getTraces(environmentId, filter);

			expect(traces).toHaveLength(1);
			expect(traces[0]?.pluginName).toBe('TestPlugin');
			expect(mockApiService.get).toHaveBeenCalledWith(
				environmentId,
				expect.stringContaining('$top=50')
			);
		});

		it('should include OData filter if provided', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				pluginNameFilter: 'TestPlugin',
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			expect(mockApiService.get).toHaveBeenCalledWith(
				environmentId,
				expect.stringContaining('$filter=')
			);
			expect(mockApiService.get).toHaveBeenCalledWith(
				environmentId,
				expect.stringContaining('typename')
			);
		});

		it('should handle empty response', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.default();

			mockApiService.get.mockResolvedValue({ value: [] });

			const traces = await repository.getTraces(environmentId, filter);

			expect(traces).toHaveLength(0);
		});

		it('should log and rethrow on error', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.default();
			const error = new Error('API error');

			mockApiService.get.mockRejectedValue(error);

			await expect(
				repository.getTraces(environmentId, filter)
			).rejects.toThrow('API error');

			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	describe('getTraceById', () => {
		it('should fetch single trace by ID', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';

			mockApiService.get.mockResolvedValue(mockTraceDto);

			const trace = await repository.getTraceById(
				environmentId,
				traceId
			);

			expect(trace).not.toBeNull();
			expect(trace?.id).toBe('trace-1');
			expect(mockApiService.get).toHaveBeenCalledWith(
				environmentId,
				expect.stringContaining(traceId)
			);
		});

		it('should return null for 404 errors', async () => {
			const environmentId = 'env-123';
			const traceId = 'not-found';

			mockApiService.get.mockRejectedValue(new Error('404'));

			const trace = await repository.getTraceById(
				environmentId,
				traceId
			);

			expect(trace).toBeNull();
		});

		it('should log and rethrow on non-404 errors', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';
			const error = new Error('API error');

			mockApiService.get.mockRejectedValue(error);

			await expect(
				repository.getTraceById(environmentId, traceId)
			).rejects.toThrow('API error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch plugin trace from Dataverse',
				expect.any(Error)
			);
		});
	});

	describe('deleteTrace', () => {
		it('should delete single trace', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';

			mockApiService.delete.mockResolvedValue();

			await repository.deleteTrace(environmentId, traceId);

			expect(mockApiService.delete).toHaveBeenCalledWith(
				environmentId,
				expect.stringContaining(traceId)
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Deleted'),
				expect.objectContaining({})
			);
		});

		it('should log and rethrow on error', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-1';
			const error = new Error('Delete failed');

			mockApiService.delete.mockRejectedValue(error);

			await expect(
				repository.deleteTrace(environmentId, traceId)
			).rejects.toThrow('Delete failed');

			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	describe('deleteTraces', () => {
		it('should delete multiple traces', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];

			mockApiService.batchDelete.mockResolvedValue(3);

			const deletedCount = await repository.deleteTraces(
				environmentId,
				traceIds
			);

			expect(deletedCount).toBe(3);
			expect(mockApiService.batchDelete).toHaveBeenCalledTimes(1);
			expect(mockApiService.batchDelete).toHaveBeenCalledWith(
				environmentId,
				'plugintracelogs',
				traceIds
			);
		});

		it('should continue on partial failures', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];

			mockApiService.batchDelete.mockResolvedValue(2);

			const deletedCount = await repository.deleteTraces(
				environmentId,
				traceIds
			);

			expect(deletedCount).toBe(2);
		});

		it('should log errors and continue with remaining batches', async () => {
			const environmentId = 'env-123';
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			const error = new Error('Batch delete failed');

			mockApiService.batchDelete.mockRejectedValue(error);

			const deletedCount = await repository.deleteTraces(
				environmentId,
				traceIds
			);

			expect(deletedCount).toBe(0);
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Batch delete failed'),
				error
			);
		});
	});

	describe('deleteAllTraces', () => {
		it('should fetch and delete all traces', async () => {
			const environmentId = 'env-123';

			mockApiService.get.mockResolvedValue({
				value: [
					{ plugintracelogid: 'trace-1' },
					{ plugintracelogid: 'trace-2' },
				],
			});
			mockApiService.batchDelete.mockResolvedValue(2);

			const deletedCount =
				await repository.deleteAllTraces(environmentId);

			expect(deletedCount).toBe(2);
			expect(mockApiService.get).toHaveBeenCalledWith(
				environmentId,
				expect.stringContaining('$select=plugintracelogid')
			);
		});

		it('should log and rethrow on error', async () => {
			const environmentId = 'env-123';
			const error = new Error('API error');

			mockApiService.get.mockRejectedValue(error);

			await expect(
				repository.deleteAllTraces(environmentId)
			).rejects.toThrow('API error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to delete all plugin traces from Dataverse',
				expect.any(Error)
			);
		});
	});

	describe('deleteOldTraces', () => {
		it('should filter and delete old traces', async () => {
			const environmentId = 'env-123';
			const olderThanDays = 30;

			mockApiService.get.mockResolvedValue({
				value: [{ plugintracelogid: 'trace-old' }],
			});
			mockApiService.batchDelete.mockResolvedValue(1);

			const deletedCount = await repository.deleteOldTraces(
				environmentId,
				olderThanDays
			);

			expect(deletedCount).toBe(1);
			expect(mockApiService.get).toHaveBeenCalledWith(
				environmentId,
				expect.stringContaining('$filter=')
			);
		});

		it('should log and rethrow on error', async () => {
			const environmentId = 'env-123';
			const olderThanDays = 30;
			const error = new Error('API error');

			mockApiService.get.mockRejectedValue(error);

			await expect(
				repository.deleteOldTraces(environmentId, olderThanDays)
			).rejects.toThrow('API error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to delete old plugin traces from Dataverse',
				expect.any(Error)
			);
		});
	});

	describe('Query Options - $select combinations', () => {
		it('should use optimized $select fields for list view (excludes large text fields)', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.default();

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			expect(mockApiService.get).toHaveBeenCalledWith(
				environmentId,
				expect.stringContaining('$select=')
			);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('plugintracelogid');
			expect(callArg).toContain('typename');
			expect(callArg).toContain('exceptiondetails');
			expect(callArg).not.toContain('messageblock');
			expect(callArg).not.toContain('configuration');
			expect(callArg).not.toContain('secureconfiguration');
		});

		it('should use full $select fields for detail view (includes all fields)', async () => {
			const environmentId = 'env-123';
			const traceId = 'trace-123';

			mockApiService.get.mockResolvedValue(mockTraceDto);

			await repository.getTraceById(environmentId, traceId);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$select=');
			expect(callArg).toContain('messageblock');
			expect(callArg).toContain('configuration');
			expect(callArg).toContain('secureconfiguration');
			expect(callArg).toContain('profile');
			expect(callArg).toContain('performanceconstructorduration');
		});

		it('should use minimal $select for deleteAllTraces (only ID)', async () => {
			const environmentId = 'env-123';

			mockApiService.get.mockResolvedValue({
				value: [{ plugintracelogid: 'trace-1' }],
			});
			mockApiService.batchDelete.mockResolvedValue(1);

			await repository.deleteAllTraces(environmentId);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$select=plugintracelogid');
			expect(callArg).not.toContain('typename');
			expect(callArg).not.toContain('createdon');
		});
	});

	describe('Query Options - $filter combinations', () => {
		it('should build OData filter with single plugin name condition', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				pluginNameFilter: 'TestPlugin',
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$filter=');
			expect(callArg).toContain('typename');
		});

		it('should build OData filter with multiple AND conditions', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				pluginNameFilter: 'TestPlugin',
				entityNameFilter: 'account',
				messageNameFilter: 'Create',
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$filter=');
			expect(callArg).toMatch(/typename.*and.*primaryentity.*and.*messagename/i);
		});

		it('should handle date filter with ISO 8601 format', async () => {
			const environmentId = 'env-123';
			const fromDate = new Date('2025-01-01T00:00:00Z');
			const toDate = new Date('2025-01-31T23:59:59Z');
			const filter = TraceFilter.create({
				top: 100,
				createdOnFrom: fromDate,
				createdOnTo: toDate,
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$filter=');
			expect(callArg).toContain('createdon');
		});

		it('should handle duration range filter', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				durationMin: 100,
				durationMax: 5000,
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$filter=');
			expect(callArg).toContain('performanceexecutionduration');
		});

		it('should handle boolean filter (hasException)', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				hasExceptionFilter: true,
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$filter=');
			expect(callArg).toContain('exceptiondetails');
		});

		it('should handle correlation ID filter', async () => {
			const environmentId = 'env-123';
			const correlationId = 'abc123-def456-ghi789';
			const filter = TraceFilter.create({
				top: 100,
				correlationIdFilter: {
					getValue: () => correlationId,
					isEmpty: () => false,
					equals: jest.fn().mockReturnValue(true),
					value: correlationId
				},
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$filter=');
			expect(callArg).toContain('correlationid');
		});
	});

	describe('Query Options - $orderby combinations', () => {
		it('should apply default orderby (createdon desc)', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.default();

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$orderby=createdon desc');
		});

		it('should apply custom orderby (typename asc)', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				orderBy: 'typename asc',
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$orderby=typename asc');
		});

		it('should apply multiple field orderby', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				orderBy: 'typename asc,createdon desc',
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$orderby=typename asc,createdon desc');
		});
	});

	describe('Query Options - $top boundary conditions', () => {
		it('should handle minimum $top value (1)', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({ top: 1 });

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$top=1');
		});

		it('should handle typical $top value (100)', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({ top: 100 });

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$top=100');
		});

		it('should handle maximum $top value (5000)', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({ top: 5000 });

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$top=5000');
		});
	});

	describe('Query Options - Complex combinations', () => {
		it('should combine $select, $filter, $orderby, and $top', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 50,
				orderBy: 'createdon desc',
				pluginNameFilter: 'TestPlugin',
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$select=');
			expect(callArg).toContain('$filter=');
			expect(callArg).toContain('$orderby=');
			expect(callArg).toContain('$top=50');
		});

		it('should handle query with all filter types combined', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				orderBy: 'createdon desc',
				pluginNameFilter: 'TestPlugin',
				entityNameFilter: 'account',
				messageNameFilter: 'Create',
				createdOnFrom: new Date('2025-01-01'),
				createdOnTo: new Date('2025-01-31'),
				durationMin: 100,
				durationMax: 5000,
				hasExceptionFilter: true,
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$select=');
			expect(callArg).toContain('$filter=');
			expect(callArg).toContain('$orderby=');
			expect(callArg).toContain('$top=100');
		});
	});

	describe('OData URL encoding edge cases', () => {
		it('should handle special characters in filter values', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				pluginNameFilter: "Test'Plugin",
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$filter=');
		});

		it('should handle spaces in filter values', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				pluginNameFilter: 'Test Plugin Name',
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$filter=');
		});

		it('should handle ampersand in filter values', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				entityNameFilter: 'sales&marketing',
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$filter=');
		});

		it('should handle percent sign in filter values', async () => {
			const environmentId = 'env-123';
			const filter = TraceFilter.create({
				top: 100,
				pluginNameFilter: '100% Complete',
			});

			mockApiService.get.mockResolvedValue({ value: [] });

			await repository.getTraces(environmentId, filter);

			const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
			expect(callArg).toContain('$filter=');
		});
	});

	describe('getTraceLevel', () => {
		it('should fetch trace level setting', async () => {
			const environmentId = 'env-123';

			mockApiService.get.mockResolvedValue({
				value: [{ plugintracelogsetting: 2 }],
			});

			const level = await repository.getTraceLevel(environmentId);

			expect(level).toBe(TraceLevel.All);
			expect(mockApiService.get).toHaveBeenCalledWith(
				environmentId,
				expect.stringContaining('organizations')
			);
		});

		it('should throw if organization not found', async () => {
			const environmentId = 'env-123';

			mockApiService.get.mockResolvedValue({ value: [] });

			await expect(
				repository.getTraceLevel(environmentId)
			).rejects.toThrow('Organization settings not found');
		});

		it('should log and rethrow on API error', async () => {
			const environmentId = 'env-123';
			const error = new Error('API error');

			mockApiService.get.mockRejectedValue(error);

			await expect(
				repository.getTraceLevel(environmentId)
			).rejects.toThrow('API error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch trace level from Dataverse',
				expect.any(Error)
			);
		});
	});

	describe('setTraceLevel', () => {
		it('should update trace level setting', async () => {
			const environmentId = 'env-123';
			const level = TraceLevel.All;

			mockApiService.get.mockResolvedValue({
				value: [{ organizationid: 'org-123' }],
			});
			mockApiService.patch.mockResolvedValue({});

			await repository.setTraceLevel(environmentId, level);

			expect(mockApiService.patch).toHaveBeenCalledWith(
				environmentId,
				expect.stringContaining('org-123'),
				{ plugintracelogsetting: 2 }
			);
		});

		it('should throw if organization not found', async () => {
			const environmentId = 'env-123';
			const level = TraceLevel.All;

			mockApiService.get.mockResolvedValue({ value: [] });

			await expect(
				repository.setTraceLevel(environmentId, level)
			).rejects.toThrow('Organization not found');
		});

		it('should log and rethrow on API error', async () => {
			const environmentId = 'env-123';
			const level = TraceLevel.All;
			const error = new Error('API error');

			mockApiService.get.mockRejectedValue(error);

			await expect(
				repository.setTraceLevel(environmentId, level)
			).rejects.toThrow('API error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to set trace level in Dataverse',
				expect.any(Error)
			);
		});
	});
});
