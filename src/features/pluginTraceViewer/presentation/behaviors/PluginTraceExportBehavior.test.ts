import * as vscode from 'vscode';

import { PluginTraceExportBehavior } from './PluginTraceExportBehavior';
import type { ExportTracesUseCase } from '../../application/useCases/ExportTracesUseCase';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { PluginTrace } from '../../domain/entities/PluginTrace';
import { ExecutionMode } from '../../domain/valueObjects/ExecutionMode';
import { OperationType } from '../../domain/valueObjects/OperationType';
import { Duration } from '../../domain/valueObjects/Duration';
import type { ExportFormat } from '../../domain/types/ExportFormat';
import { assertDefined } from '../../../../shared/testing';

describe('PluginTraceExportBehavior', () => {
	let behavior: PluginTraceExportBehavior;
	let mockExportTracesUseCase: jest.Mocked<ExportTracesUseCase>;
	let mockLogger: ILogger;

	const createTestTrace = (id: string, pluginName: string): PluginTrace => {
		return PluginTrace.create({
			id,
			createdOn: new Date('2024-01-15T10:30:00Z'),
			pluginName,
			entityName: 'Account',
			messageName: 'Create',
			operationType: OperationType.Plugin,
			mode: ExecutionMode.Synchronous,
			duration: Duration.fromMilliseconds(150),
			constructorDuration: Duration.fromMilliseconds(10),
			stage: 20,
			depth: 1,
			exceptionDetails: null,
			messageBlock: 'Test message',
			configuration: null,
			secureConfiguration: null,
			correlationId: null,
			requestId: null,
			pluginStepId: null,
			persistenceKey: null,
			organizationId: null,
			profile: null,
			isSystemCreated: false,
			createdBy: null,
			createdOnBehalfBy: null
		});
	};

	beforeEach(() => {
		// Mock export use case
		mockExportTracesUseCase = {
			exportToCsv: jest.fn().mockResolvedValue('/path/to/export.csv'),
			exportToJson: jest.fn().mockResolvedValue('/path/to/export.json')
		} as unknown as jest.Mocked<ExportTracesUseCase>;

		// Mock logger
		mockLogger = new NullLogger();

		// Create behavior instance
		behavior = new PluginTraceExportBehavior(
			mockExportTracesUseCase,
			mockLogger
		);

		// Reset all mocks
		jest.clearAllMocks();
	});

	describe('exportTraces - CSV format', () => {
		it('should export selected traces to CSV format', async () => {
			const traces = [
				createTestTrace('trace-1', 'Plugin1'),
				createTestTrace('trace-2', 'Plugin2'),
				createTestTrace('trace-3', 'Plugin3')
			];
			const traceIds = ['trace-1', 'trace-2'];
			const format: ExportFormat = 'csv';

			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(mockExportTracesUseCase.exportToCsv).toHaveBeenCalledWith(
				[traces[0], traces[1]],
				expect.stringMatching(/^plugin-traces-.*\.csv$/)
			);
			expect(showInfoSpy).toHaveBeenCalledWith('Exported 2 trace(s) as CSV');
			showInfoSpy.mockRestore();
		});

		it('should generate timestamped filename for CSV export', async () => {
			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'csv';

			const beforeExport = new Date();
			await behavior.exportTraces(traces, traceIds, format);
			const afterExport = new Date();

			expect(mockExportTracesUseCase.exportToCsv).toHaveBeenCalledTimes(1);
			const [, filename] = mockExportTracesUseCase.exportToCsv.mock.calls[0]! as [readonly PluginTrace[], string];

			// Filename format: plugin-traces-YYYY-MM-DDTHH-MM-SS.csv
			expect(filename).toMatch(/^plugin-traces-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);

			// Extract timestamp from filename (format: 2024-01-15T10-30-00)
			const timestampMatch = filename.match(/plugin-traces-(.*)\.csv/);
			const timestampStr = timestampMatch![1]!;
			// Parse YYYY-MM-DDTHH-MM-SS
			const parts = timestampStr.split('T');
			const dateParts = parts[0]!.split('-');
			const timeParts = parts[1]!.split('-');

			const year = parseInt(dateParts[0]!);
			const month = parseInt(dateParts[1]!) - 1; // JS months are 0-indexed
			const day = parseInt(dateParts[2]!);
			const hour = parseInt(timeParts[0]!);
			const minute = parseInt(timeParts[1]!);

			expect(year).toBe(beforeExport.getUTCFullYear());
			expect(month).toBe(beforeExport.getUTCMonth());
			expect(day).toBeGreaterThanOrEqual(beforeExport.getUTCDate());
			expect(day).toBeLessThanOrEqual(afterExport.getUTCDate());
			expect(hour).toBeGreaterThanOrEqual(0);
			expect(hour).toBeLessThanOrEqual(23);
			expect(minute).toBeGreaterThanOrEqual(0);
			expect(minute).toBeLessThanOrEqual(59);
		});

		it('should export all traces when all IDs are provided', async () => {
			const traces = [
				createTestTrace('trace-1', 'Plugin1'),
				createTestTrace('trace-2', 'Plugin2'),
				createTestTrace('trace-3', 'Plugin3')
			];
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			const format: ExportFormat = 'csv';

			await behavior.exportTraces(traces, traceIds, format);

			expect(mockExportTracesUseCase.exportToCsv).toHaveBeenCalledWith(
				traces,
				expect.stringMatching(/.+/)
			);
		});
	});

	describe('exportTraces - JSON format', () => {
		it('should export selected traces to JSON format', async () => {
			const traces = [
				createTestTrace('trace-1', 'Plugin1'),
				createTestTrace('trace-2', 'Plugin2'),
				createTestTrace('trace-3', 'Plugin3')
			];
			const traceIds = ['trace-1', 'trace-3'];
			const format: ExportFormat = 'json';

			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(mockExportTracesUseCase.exportToJson).toHaveBeenCalledWith(
				[traces[0], traces[2]],
				expect.stringMatching(/^plugin-traces-.*\.json$/)
			);
			expect(showInfoSpy).toHaveBeenCalledWith('Exported 2 trace(s) as JSON');
			showInfoSpy.mockRestore();
		});

		it('should generate timestamped filename for JSON export', async () => {
			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'json';

			await behavior.exportTraces(traces, traceIds, format);

			expect(mockExportTracesUseCase.exportToJson).toHaveBeenCalledTimes(1);
			const [, filename] = mockExportTracesUseCase.exportToJson.mock.calls[0]! as [readonly PluginTrace[], string];

			// Filename format: plugin-traces-YYYY-MM-DDTHH-MM-SS.json
			expect(filename).toMatch(/^plugin-traces-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
		});
	});

	describe('exportTraces - filtering behavior', () => {
		it('should filter traces by provided IDs', async () => {
			const traces = [
				createTestTrace('trace-1', 'Plugin1'),
				createTestTrace('trace-2', 'Plugin2'),
				createTestTrace('trace-3', 'Plugin3'),
				createTestTrace('trace-4', 'Plugin4')
			];
			const traceIds = ['trace-2', 'trace-4'];
			const format: ExportFormat = 'csv';

			await behavior.exportTraces(traces, traceIds, format);

			const [exportedTraces] = mockExportTracesUseCase.exportToCsv.mock.calls[0]! as [readonly PluginTrace[], string];
			expect(exportedTraces).toHaveLength(2);
			assertDefined(exportedTraces[0]);
			expect(exportedTraces[0].id).toBe('trace-2');
			assertDefined(exportedTraces[1]);
			expect(exportedTraces[1].id).toBe('trace-4');
		});

		it('should handle IDs in different order than traces array', async () => {
			const traces = [
				createTestTrace('trace-1', 'Plugin1'),
				createTestTrace('trace-2', 'Plugin2'),
				createTestTrace('trace-3', 'Plugin3')
			];
			const traceIds = ['trace-3', 'trace-1']; // Reversed order
			const format: ExportFormat = 'json';

			await behavior.exportTraces(traces, traceIds, format);

			const [exportedTraces] = mockExportTracesUseCase.exportToJson.mock.calls[0]! as [readonly PluginTrace[], string];
			expect(exportedTraces).toHaveLength(2);
			// Should maintain order from original traces array
			assertDefined(exportedTraces[0]);
			expect(exportedTraces[0].id).toBe('trace-1');
			assertDefined(exportedTraces[1]);
			expect(exportedTraces[1].id).toBe('trace-3');
		});

		it('should ignore non-existent trace IDs', async () => {
			const traces = [
				createTestTrace('trace-1', 'Plugin1'),
				createTestTrace('trace-2', 'Plugin2')
			];
			const traceIds = ['trace-1', 'trace-99', 'trace-2', 'trace-100'];
			const format: ExportFormat = 'csv';

			await behavior.exportTraces(traces, traceIds, format);

			const [exportedTraces] = mockExportTracesUseCase.exportToCsv.mock.calls[0]! as [readonly PluginTrace[], string];
			expect(exportedTraces).toHaveLength(2);
			assertDefined(exportedTraces[0]);
			expect(exportedTraces[0].id).toBe('trace-1');
			assertDefined(exportedTraces[1]);
			expect(exportedTraces[1].id).toBe('trace-2');
		});
	});

	describe('exportTraces - edge cases', () => {
		it('should show warning when no traces are selected for export', async () => {
			const traces = [
				createTestTrace('trace-1', 'Plugin1'),
				createTestTrace('trace-2', 'Plugin2')
			];
			const traceIds: string[] = [];
			const format: ExportFormat = 'csv';

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(showWarningSpy).toHaveBeenCalledWith('No traces selected for export');
			expect(mockExportTracesUseCase.exportToCsv).not.toHaveBeenCalled();
			expect(mockExportTracesUseCase.exportToJson).not.toHaveBeenCalled();
			showWarningSpy.mockRestore();
		});

		it('should show warning when trace IDs do not match any traces', async () => {
			const traces = [
				createTestTrace('trace-1', 'Plugin1'),
				createTestTrace('trace-2', 'Plugin2')
			];
			const traceIds = ['trace-99', 'trace-100'];
			const format: ExportFormat = 'json';

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(showWarningSpy).toHaveBeenCalledWith('No traces selected for export');
			expect(mockExportTracesUseCase.exportToJson).not.toHaveBeenCalled();
			showWarningSpy.mockRestore();
		});

		it('should handle empty traces array gracefully', async () => {
			const traces: readonly PluginTrace[] = [];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'csv';

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(showWarningSpy).toHaveBeenCalledWith('No traces selected for export');
			expect(mockExportTracesUseCase.exportToCsv).not.toHaveBeenCalled();
			showWarningSpy.mockRestore();
		});

		it('should handle single trace export', async () => {
			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'json';

			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(mockExportTracesUseCase.exportToJson).toHaveBeenCalledWith(
				traces,
				expect.stringMatching(/.+/)
			);
			expect(showInfoSpy).toHaveBeenCalledWith('Exported 1 trace(s) as JSON');
			showInfoSpy.mockRestore();
		});
	});

	describe('exportTraces - special characters in trace data', () => {
		it('should handle traces with special characters in plugin names', async () => {
			const traces = [
				createTestTrace('trace-1', 'Plugin<Script>Test'),
				createTestTrace('trace-2', 'Plugin"Quotes"Test'),
				createTestTrace('trace-3', 'Plugin,Comma,Test')
			];
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			const format: ExportFormat = 'csv';

			await behavior.exportTraces(traces, traceIds, format);

			expect(mockExportTracesUseCase.exportToCsv).toHaveBeenCalledWith(
				traces,
				expect.stringMatching(/.+/)
			);
		});

		it('should handle traces with unicode characters', async () => {
			const traces = [
				createTestTrace('trace-1', 'Plugin日本語'),
				createTestTrace('trace-2', 'Plugin🎉Emoji'),
				createTestTrace('trace-3', 'ПлагинКириллица')
			];
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			const format: ExportFormat = 'json';

			await behavior.exportTraces(traces, traceIds, format);

			expect(mockExportTracesUseCase.exportToJson).toHaveBeenCalledWith(
				traces,
				expect.stringMatching(/.+/)
			);
		});
	});

	describe('exportTraces - large dataset handling', () => {
		it('should handle exporting large number of traces', async () => {
			const traces: PluginTrace[] = [];
			const traceIds: string[] = [];

			// Create 1000 traces
			for (let i = 0; i < 1000; i++) {
				const trace = createTestTrace(`trace-${i}`, `Plugin${i}`);
				traces.push(trace);
				traceIds.push(`trace-${i}`);
			}

			const format: ExportFormat = 'csv';

			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(mockExportTracesUseCase.exportToCsv).toHaveBeenCalledWith(
				traces,
				expect.stringMatching(/.+/)
			);
			expect(showInfoSpy).toHaveBeenCalledWith('Exported 1000 trace(s) as CSV');
			showInfoSpy.mockRestore();
		});

		it('should handle filtering large dataset efficiently', async () => {
			const traces: PluginTrace[] = [];
			const traceIds: string[] = [];

			// Create 10000 traces but only export 100
			for (let i = 0; i < 10000; i++) {
				const trace = createTestTrace(`trace-${i}`, `Plugin${i}`);
				traces.push(trace);
				if (i % 100 === 0) {
					traceIds.push(`trace-${i}`);
				}
			}

			const format: ExportFormat = 'json';

			await behavior.exportTraces(traces, traceIds, format);

			const [exportedTraces] = mockExportTracesUseCase.exportToJson.mock.calls[0]! as [readonly PluginTrace[], string];
			expect(exportedTraces).toHaveLength(100);
		});
	});

	describe('exportTraces - user cancellation handling', () => {
		it('should handle user cancellation gracefully for CSV export', async () => {
			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'csv';

			mockExportTracesUseCase.exportToCsv.mockRejectedValueOnce(
				new Error('Export cancelled by user')
			);

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(showErrorSpy).not.toHaveBeenCalled();
			showErrorSpy.mockRestore();
		});

		it('should handle user cancellation gracefully for JSON export', async () => {
			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'json';

			mockExportTracesUseCase.exportToJson.mockRejectedValueOnce(
				new Error('Export cancelled by user')
			);

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(showErrorSpy).not.toHaveBeenCalled();
			showErrorSpy.mockRestore();
		});

		it('should not show success message when user cancels export', async () => {
			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'csv';

			mockExportTracesUseCase.exportToCsv.mockRejectedValueOnce(
				new Error('Export cancelled by user')
			);

			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(showInfoSpy).not.toHaveBeenCalled();
			showInfoSpy.mockRestore();
		});
	});

	describe('exportTraces - error handling', () => {
		it('should show error message when CSV export fails', async () => {
			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'csv';

			mockExportTracesUseCase.exportToCsv.mockRejectedValueOnce(
				new Error('Failed to write file')
			);

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to export traces');
			showErrorSpy.mockRestore();
		});

		it('should show error message when JSON export fails', async () => {
			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'json';

			mockExportTracesUseCase.exportToJson.mockRejectedValueOnce(
				new Error('Failed to write file')
			);

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to export traces');
			showErrorSpy.mockRestore();
		});

		it('should handle non-Error exceptions gracefully', async () => {
			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'csv';

			mockExportTracesUseCase.exportToCsv.mockRejectedValueOnce('String error');

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to export traces');
			showErrorSpy.mockRestore();
		});

		it('should distinguish between cancellation and actual errors', async () => {
			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'csv';

			// First test cancellation
			mockExportTracesUseCase.exportToCsv.mockRejectedValueOnce(
				new Error('Operation cancelled by user')
			);

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.exportTraces(traces, traceIds, format);
			expect(showErrorSpy).not.toHaveBeenCalled();

			// Then test actual error
			mockExportTracesUseCase.exportToCsv.mockRejectedValueOnce(
				new Error('Disk full')
			);

			await behavior.exportTraces(traces, traceIds, format);
			expect(showErrorSpy).toHaveBeenCalledWith('Failed to export traces');

			showErrorSpy.mockRestore();
		});
	});

	describe('exportTraces - logging', () => {
		it('should log export operation with trace count and format', async () => {
			const mockLoggerWithSpy = {
				info: jest.fn(),
				debug: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				trace: jest.fn()
			};

			const behaviorWithLogger = new PluginTraceExportBehavior(
				mockExportTracesUseCase,
				mockLoggerWithSpy
			);

			const traces = [
				createTestTrace('trace-1', 'Plugin1'),
				createTestTrace('trace-2', 'Plugin2')
			];
			const traceIds = ['trace-1', 'trace-2'];
			const format: ExportFormat = 'csv';

			await behaviorWithLogger.exportTraces(traces, traceIds, format);

			expect(mockLoggerWithSpy.info).toHaveBeenCalledWith(
				'Exporting traces',
				{ count: 2, format: 'csv' }
			);
		});

		it('should log debug message when user cancels export', async () => {
			const mockLoggerWithSpy = {
				info: jest.fn(),
				debug: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				trace: jest.fn()
			};

			const behaviorWithLogger = new PluginTraceExportBehavior(
				mockExportTracesUseCase,
				mockLoggerWithSpy
			);

			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'json';

			mockExportTracesUseCase.exportToJson.mockRejectedValueOnce(
				new Error('Export cancelled by user')
			);

			await behaviorWithLogger.exportTraces(traces, traceIds, format);

			expect(mockLoggerWithSpy.debug).toHaveBeenCalledWith('Export cancelled by user');
		});

		it('should log error when export fails', async () => {
			const mockLoggerWithSpy = {
				info: jest.fn(),
				debug: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				trace: jest.fn()
			};

			const behaviorWithLogger = new PluginTraceExportBehavior(
				mockExportTracesUseCase,
				mockLoggerWithSpy
			);

			const traces = [createTestTrace('trace-1', 'Plugin1')];
			const traceIds = ['trace-1'];
			const format: ExportFormat = 'csv';

			const exportError = new Error('Failed to write file');
			mockExportTracesUseCase.exportToCsv.mockRejectedValueOnce(exportError);

			await behaviorWithLogger.exportTraces(traces, traceIds, format);

			expect(mockLoggerWithSpy.error).toHaveBeenCalledWith(
				'Failed to export traces',
				exportError
			);
		});
	});
});
