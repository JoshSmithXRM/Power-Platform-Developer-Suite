import { ExportTracesUseCase } from './ExportTracesUseCase';
import type { IPluginTraceExporter } from './../../domain/repositories/IPluginTraceExporter';
import type { ILogger } from './../../../../infrastructure/logging/ILogger';
import { PluginTrace } from './../../domain/entities/PluginTrace';
import { Duration } from './../../domain/valueObjects/Duration';
import { ExecutionMode } from './../../domain/valueObjects/ExecutionMode';
import { OperationType } from './../../domain/valueObjects/OperationType';

describe('ExportTracesUseCase', () => {
	let useCase: ExportTracesUseCase;
	let mockExporter: jest.Mocked<IPluginTraceExporter>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockExporter = {
			exportToCsv: jest.fn(),
			exportToJson: jest.fn(),
			saveToFile: jest.fn(),
		};

		mockLogger = {
			trace: jest.fn(),
		debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		useCase = new ExportTracesUseCase(mockExporter, mockLogger);
	});

	const createMockTrace = (): PluginTrace => {
		return PluginTrace.create({
			id: 'trace-1',
			createdOn: new Date(),
			pluginName: 'TestPlugin',
			entityName: 'account',
			messageName: 'Create',
			operationType: OperationType.Plugin,
			mode: ExecutionMode.Synchronous,
			duration: Duration.fromMilliseconds(100),
			constructorDuration: Duration.fromMilliseconds(10),
		});
	};

	describe('exportToCsv', () => {
		it('should export traces to CSV successfully', async () => {
			const traces = [createMockTrace()];
			const filename = 'traces.csv';
			const csvContent = 'id,name\ntrace-1,TestPlugin';
			const savedPath = '/path/to/traces.csv';

			mockExporter.exportToCsv.mockReturnValue(csvContent);
			mockExporter.saveToFile.mockResolvedValue(savedPath);

			const result = await useCase.exportToCsv(traces, filename);

			expect(result).toBe(savedPath);
			expect(mockExporter.exportToCsv).toHaveBeenCalledWith(traces);
			expect(mockExporter.saveToFile).toHaveBeenCalledWith(
				csvContent,
				filename
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'ExportTracesUseCase: Exporting traces to CSV',
				{ count: traces.length, suggestedFilename: filename }
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'ExportTracesUseCase: Successfully exported to CSV',
				{ filePath: savedPath }
			);
		});

		it('should handle empty trace array', async () => {
			const traces: PluginTrace[] = [];
			const filename = 'empty.csv';
			const csvContent = 'id,name';
			const savedPath = '/path/to/empty.csv';

			mockExporter.exportToCsv.mockReturnValue(csvContent);
			mockExporter.saveToFile.mockResolvedValue(savedPath);

			const result = await useCase.exportToCsv(traces, filename);

			expect(result).toBe(savedPath);
		});

		it('should log error and rethrow when export fails', async () => {
			const traces = [createMockTrace()];
			const filename = 'traces.csv';
			const error = new Error('Export failed');

			mockExporter.exportToCsv.mockImplementation(() => {
				throw error;
			});

			await expect(
				useCase.exportToCsv(traces, filename)
			).rejects.toThrow('Export failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'ExportTracesUseCase: Failed to export to CSV',
				error
			);
		});

		it('should log error and rethrow when save fails', async () => {
			const traces = [createMockTrace()];
			const filename = 'traces.csv';
			const csvContent = 'id,name';
			const error = new Error('Save failed');

			mockExporter.exportToCsv.mockReturnValue(csvContent);
			mockExporter.saveToFile.mockRejectedValue(error);

			await expect(
				useCase.exportToCsv(traces, filename)
			).rejects.toThrow('Save failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'ExportTracesUseCase: Failed to export to CSV',
				error
			);
		});
	});

	describe('exportToJson', () => {
		it('should export traces to JSON successfully', async () => {
			const traces = [createMockTrace()];
			const filename = 'traces.json';
			const jsonContent = JSON.stringify([{ id: 'trace-1' }]);
			const savedPath = '/path/to/traces.json';

			mockExporter.exportToJson.mockReturnValue(jsonContent);
			mockExporter.saveToFile.mockResolvedValue(savedPath);

			const result = await useCase.exportToJson(traces, filename);

			expect(result).toBe(savedPath);
			expect(mockExporter.exportToJson).toHaveBeenCalledWith(traces);
			expect(mockExporter.saveToFile).toHaveBeenCalledWith(
				jsonContent,
				filename
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'ExportTracesUseCase: Exporting traces to JSON',
				{ count: traces.length, suggestedFilename: filename }
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'ExportTracesUseCase: Successfully exported to JSON',
				{ filePath: savedPath }
			);
		});

		it('should handle empty trace array', async () => {
			const traces: PluginTrace[] = [];
			const filename = 'empty.json';
			const jsonContent = '[]';
			const savedPath = '/path/to/empty.json';

			mockExporter.exportToJson.mockReturnValue(jsonContent);
			mockExporter.saveToFile.mockResolvedValue(savedPath);

			const result = await useCase.exportToJson(traces, filename);

			expect(result).toBe(savedPath);
		});

		it('should log error and rethrow when export fails', async () => {
			const traces = [createMockTrace()];
			const filename = 'traces.json';
			const error = new Error('Export failed');

			mockExporter.exportToJson.mockImplementation(() => {
				throw error;
			});

			await expect(
				useCase.exportToJson(traces, filename)
			).rejects.toThrow('Export failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'ExportTracesUseCase: Failed to export to JSON',
				error
			);
		});

		it('should log error and rethrow when save fails', async () => {
			const traces = [createMockTrace()];
			const filename = 'traces.json';
			const jsonContent = '[]';
			const error = new Error('Save failed');

			mockExporter.exportToJson.mockReturnValue(jsonContent);
			mockExporter.saveToFile.mockRejectedValue(error);

			await expect(
				useCase.exportToJson(traces, filename)
			).rejects.toThrow('Save failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'ExportTracesUseCase: Failed to export to JSON',
				error
			);
		});
	});
});
