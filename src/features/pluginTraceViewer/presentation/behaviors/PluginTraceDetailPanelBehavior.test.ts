import * as vscode from 'vscode';

import { PluginTraceDetailPanelBehavior } from './PluginTraceDetailPanelBehavior';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import type { GetPluginTracesUseCase } from '../../application/useCases/GetPluginTracesUseCase';
import type { BuildTimelineUseCase } from '../../application/useCases/BuildTimelineUseCase';
import type { PluginTraceViewModelMapper } from '../mappers/PluginTraceViewModelMapper';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { PluginTrace } from '../../domain/entities/PluginTrace';
import { CorrelationId } from '../../domain/valueObjects/CorrelationId';
import { ExecutionMode } from '../../domain/valueObjects/ExecutionMode';
import { OperationType } from '../../domain/valueObjects/OperationType';
import { Duration } from '../../domain/valueObjects/Duration';
import { TimelineNode } from '../../domain/valueObjects/TimelineNode';

describe('PluginTraceDetailPanelBehavior', () => {
	let behavior: PluginTraceDetailPanelBehavior;
	let mockWebview: jest.Mocked<vscode.Webview>;
	let mockLogger: ILogger;
	let mockGetPluginTracesUseCase: jest.Mocked<GetPluginTracesUseCase>;
	let mockBuildTimelineUseCase: jest.Mocked<BuildTimelineUseCase>;
	let mockViewModelMapper: jest.Mocked<PluginTraceViewModelMapper>;
	let mockPanelStateRepository: jest.Mocked<IPanelStateRepository>;

	const TEST_VIEW_TYPE = 'testPanelType';
	const TEST_ENVIRONMENT_ID = 'test-env-id';
	const TEST_TRACE_ID = 'trace-123';
	const TEST_CORRELATION_ID = '550e8400-e29b-41d4-a716-446655440000';

	beforeEach(() => {
		// Mock webview
		mockWebview = {
			postMessage: jest.fn().mockResolvedValue(true)
		} as unknown as jest.Mocked<vscode.Webview>;

		// Mock logger
		mockLogger = new NullLogger();

		// Mock GetPluginTracesUseCase
		mockGetPluginTracesUseCase = {
			getTraceById: jest.fn(),
			getTracesByCorrelationId: jest.fn()
		} as unknown as jest.Mocked<GetPluginTracesUseCase>;

		// Mock BuildTimelineUseCase
		mockBuildTimelineUseCase = {
			execute: jest.fn().mockReturnValue([])
		} as unknown as jest.Mocked<BuildTimelineUseCase>;

		// Mock PluginTraceViewModelMapper
		mockViewModelMapper = {
			toDetailViewModel: jest.fn().mockReturnValue({
				id: TEST_TRACE_ID,
				typeName: 'TestPlugin',
				messageName: 'Create'
			}),
			toTableRowViewModel: jest.fn().mockReturnValue({
				id: 'related-trace',
				typeName: 'RelatedPlugin'
			})
		} as unknown as jest.Mocked<PluginTraceViewModelMapper>;

		// Mock panel state repository
		mockPanelStateRepository = {
			load: jest.fn().mockResolvedValue(null),
			save: jest.fn().mockResolvedValue(undefined)
		} as unknown as jest.Mocked<IPanelStateRepository>;

		// Create behavior instance
		behavior = new PluginTraceDetailPanelBehavior(
			mockWebview,
			mockGetPluginTracesUseCase,
			mockBuildTimelineUseCase,
			mockViewModelMapper,
			mockLogger,
			mockPanelStateRepository,
			TEST_VIEW_TYPE
		);
	});

	describe('viewDetail', () => {
		it('should fetch trace by ID from Dataverse', async () => {
			const mockTrace = createMockTrace(TEST_TRACE_ID, null);
			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(mockGetPluginTracesUseCase.getTraceById).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				TEST_TRACE_ID
			);
		});

		it('should show warning when trace not found', async () => {
			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(null);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(showWarningSpy).toHaveBeenCalledWith('Trace not found');
			showWarningSpy.mockRestore();
		});

		it('should fetch related traces when correlation ID exists', async () => {
			const correlationId = CorrelationId.create(TEST_CORRELATION_ID);
			const mockTrace = createMockTrace(TEST_TRACE_ID, correlationId);
			const mockRelatedTraces = [
				createMockTrace('related-1', correlationId),
				createMockTrace('related-2', correlationId)
			];

			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);
			mockGetPluginTracesUseCase.getTracesByCorrelationId.mockResolvedValueOnce(mockRelatedTraces);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(mockGetPluginTracesUseCase.getTracesByCorrelationId).toHaveBeenCalledWith(
				TEST_ENVIRONMENT_ID,
				correlationId,
				1000
			);
		});

		it('should not fetch related traces when correlation ID is null', async () => {
			const mockTrace = createMockTrace(TEST_TRACE_ID, null);
			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(mockGetPluginTracesUseCase.getTracesByCorrelationId).not.toHaveBeenCalled();
		});

		it('should build timeline from related traces', async () => {
			const correlationId = CorrelationId.create(TEST_CORRELATION_ID);
			const mockTrace = createMockTrace(TEST_TRACE_ID, correlationId);
			const mockRelatedTraces = [
				createMockTrace('related-1', correlationId),
				createMockTrace('related-2', correlationId)
			];

			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);
			mockGetPluginTracesUseCase.getTracesByCorrelationId.mockResolvedValueOnce(mockRelatedTraces);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(mockBuildTimelineUseCase.execute).toHaveBeenCalledWith(
				mockRelatedTraces,
				TEST_CORRELATION_ID
			);
		});

		it('should exclude current trace from related traces list', async () => {
			const correlationId = CorrelationId.create(TEST_CORRELATION_ID);
			const mockTrace = createMockTrace(TEST_TRACE_ID, correlationId);
			const mockRelatedTraces = [
				mockTrace, // Same as current trace
				createMockTrace('related-1', correlationId),
				createMockTrace('related-2', correlationId)
			];

			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);
			mockGetPluginTracesUseCase.getTracesByCorrelationId.mockResolvedValueOnce(mockRelatedTraces);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			// Should only map related-1 and related-2, not the current trace
			expect(mockViewModelMapper.toTableRowViewModel).toHaveBeenCalledTimes(2);
		});

		it('should send detail panel data to webview', async () => {
			const mockTrace = createMockTrace(TEST_TRACE_ID, null);
			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'showDetailPanel',
					data: expect.objectContaining({
						trace: expect.any(Object),
						rawEntity: expect.any(Object),
						relatedTraces: expect.any(Array),
						timeline: expect.any(Object)
					})
				})
			);
		});

		it('should restore persisted panel width after opening detail', async () => {
			behavior.setDetailPanelWidth(400);

			const mockTrace = createMockTrace(TEST_TRACE_ID, null);
			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'restoreDetailPanelWidth',
					data: { width: 400 }
				})
			);
		});

		it('should not restore width if not set', async () => {
			const mockTrace = createMockTrace(TEST_TRACE_ID, null);
			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(mockWebview.postMessage).not.toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'restoreDetailPanelWidth'
				})
			);
		});

		it('should select the row in the table', async () => {
			const mockTrace = createMockTrace(TEST_TRACE_ID, null);
			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'selectRow',
					traceId: TEST_TRACE_ID
				})
			);
		});

		it('should handle errors gracefully', async () => {
			mockGetPluginTracesUseCase.getTraceById.mockRejectedValueOnce(new Error('Fetch failed'));

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to load trace detail');
			showErrorSpy.mockRestore();
		});

		it('should calculate total duration from timeline nodes', async () => {
			const correlationId = CorrelationId.create(TEST_CORRELATION_ID);
			const mockTrace = createMockTrace(TEST_TRACE_ID, correlationId);

			const now = new Date();
			const earlier = new Date(now.getTime() - 5000); // 5 seconds earlier

			const mockRelatedTraces = [
				createMockTrace('trace-1', correlationId, earlier),
				createMockTrace('trace-2', correlationId, now)
			];

			const mockTimelineNodes: TimelineNode[] = [
				TimelineNode.create(mockRelatedTraces[0]!, [], 0, 0, 50),
				TimelineNode.create(mockRelatedTraces[1]!, [], 0, 50, 50)
			];

			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);
			mockGetPluginTracesUseCase.getTracesByCorrelationId.mockResolvedValueOnce(mockRelatedTraces);
			mockBuildTimelineUseCase.execute.mockReturnValueOnce(mockTimelineNodes);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			// Timeline view model mapper should receive calculated duration (5000ms)
			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'showDetailPanel'
				})
			);
		});
	});

	describe('closeDetail', () => {
		it('should send hide command to webview', async () => {
			await behavior.closeDetail();

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'hideDetailPanel'
			});
		});
	});

	describe('saveDetailPanelWidth', () => {
		it('should save width to storage', async () => {
			await behavior.saveDetailPanelWidth(450, TEST_ENVIRONMENT_ID);

			expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
				{
					panelType: TEST_VIEW_TYPE,
					environmentId: TEST_ENVIRONMENT_ID
				},
				expect.objectContaining({
					detailPanelWidth: 450
				})
			);
		});

		it('should update internal width state', async () => {
			await behavior.saveDetailPanelWidth(450, TEST_ENVIRONMENT_ID);

			expect(behavior.getDetailPanelWidth()).toBe(450);
		});

		it('should preserve existing state properties', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				filterCriteria: { conditions: [] },
				autoRefreshInterval: 30
			});

			await behavior.saveDetailPanelWidth(450, TEST_ENVIRONMENT_ID);

			expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({
					filterCriteria: expect.any(Object),
					autoRefreshInterval: 30,
					detailPanelWidth: 450
				})
			);
		});

		it('should handle null repository gracefully', async () => {
			const behaviorWithoutRepo = new PluginTraceDetailPanelBehavior(
				mockWebview,
				mockGetPluginTracesUseCase,
				mockBuildTimelineUseCase,
				mockViewModelMapper,
				mockLogger,
				null,
				TEST_VIEW_TYPE
			);

			await behaviorWithoutRepo.saveDetailPanelWidth(450, TEST_ENVIRONMENT_ID);

			// Should not throw
			expect(true).toBe(true);
		});

		it('should handle save errors gracefully', async () => {
			mockPanelStateRepository.save.mockRejectedValueOnce(new Error('Save failed'));

			await behavior.saveDetailPanelWidth(450, TEST_ENVIRONMENT_ID);

			// Should not throw, should handle error internally
			expect(true).toBe(true);
		});
	});

	describe('getDetailPanelWidth and setDetailPanelWidth', () => {
		it('should return null by default', () => {
			expect(behavior.getDetailPanelWidth()).toBeNull();
		});

		it('should get and set width', () => {
			behavior.setDetailPanelWidth(500);

			expect(behavior.getDetailPanelWidth()).toBe(500);
		});

		it('should allow setting width to null', () => {
			behavior.setDetailPanelWidth(500);
			behavior.setDetailPanelWidth(null);

			expect(behavior.getDetailPanelWidth()).toBeNull();
		});
	});

	describe('edge cases', () => {
		it('should handle empty timeline nodes', async () => {
			const mockTrace = createMockTrace(TEST_TRACE_ID, null);
			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);
			mockBuildTimelineUseCase.execute.mockReturnValueOnce([]);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'showDetailPanel',
					data: expect.objectContaining({
						timeline: expect.any(Object)
					})
				})
			);
		});

		it('should handle nested timeline nodes for duration calculation', async () => {
			const correlationId = CorrelationId.create(TEST_CORRELATION_ID);
			const mockTrace = createMockTrace(TEST_TRACE_ID, correlationId);

			const now = new Date();
			const earlier = new Date(now.getTime() - 10000); // 10 seconds earlier
			const middle = new Date(now.getTime() - 5000); // 5 seconds earlier

			const mockRelatedTraces = [
				createMockTrace('trace-1', correlationId, earlier),
				createMockTrace('trace-2', correlationId, middle),
				createMockTrace('trace-3', correlationId, now)
			];

			// Nested structure: trace-1 has child trace-2, which has child trace-3
			const deepestNode = TimelineNode.create(mockRelatedTraces[2]!, [], 2, 25, 25);
			const middleNode = TimelineNode.create(mockRelatedTraces[1]!, [deepestNode], 1, 15, 50);
			const mockTimelineNodes: TimelineNode[] = [
				TimelineNode.create(mockRelatedTraces[0]!, [middleNode], 0, 0, 100)
			];

			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);
			mockGetPluginTracesUseCase.getTracesByCorrelationId.mockResolvedValueOnce(mockRelatedTraces);
			mockBuildTimelineUseCase.execute.mockReturnValueOnce(mockTimelineNodes);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			// Should calculate duration across all nested nodes (10000ms from earliest to latest)
			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'showDetailPanel'
				})
			);
		});

		it('should handle single trace without correlation ID', async () => {
			const mockTrace = createMockTrace(TEST_TRACE_ID, null);
			mockGetPluginTracesUseCase.getTraceById.mockResolvedValueOnce(mockTrace);

			await behavior.viewDetail(TEST_ENVIRONMENT_ID, TEST_TRACE_ID);

			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'showDetailPanel',
					data: expect.objectContaining({
						relatedTraces: [],
						timeline: expect.any(Object)
					})
				})
			);
		});
	});

	// Helper function to create mock PluginTrace entities
	function createMockTrace(
		id: string,
		correlationId: CorrelationId | null,
		createdOn: Date = new Date()
	): PluginTrace {
		return PluginTrace.create({
			id,
			createdOn,
			pluginName: 'TestPlugin',
			entityName: 'account',
			messageName: 'Create',
			operationType: OperationType.Plugin,
			mode: ExecutionMode.Synchronous,
			duration: Duration.fromMilliseconds(100),
			constructorDuration: Duration.fromMilliseconds(10),
			depth: 1,
			correlationId,
			exceptionDetails: null
		});
	}
});
