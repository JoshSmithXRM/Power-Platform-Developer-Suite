import type { ILogger } from '../../../../../infrastructure/logging/ILogger';
import { PluginTrace } from '../../../domain/entities/PluginTrace';
import { Duration } from '../../../domain/valueObjects/Duration';
import { ExecutionMode } from '../../../domain/valueObjects/ExecutionMode';
import { OperationType } from '../../../domain/valueObjects/OperationType';
import { CorrelationId } from '../../../domain/valueObjects/CorrelationId';

jest.mock('vscode', () => ({
	window: {
		showSaveDialog: jest.fn(),
	},
	Uri: {
		file: jest.fn((path: string) => ({ fsPath: path })),
	},
}), { virtual: true });

jest.mock('fs/promises', () => ({
	writeFile: jest.fn(),
}));

import { FileSystemPluginTraceExporter } from '../FileSystemPluginTraceExporter';

describe('FileSystemPluginTraceExporter', () => {
	let exporter: FileSystemPluginTraceExporter;
	let mockLogger: jest.Mocked<ILogger>;

	const createMockTrace = (overrides?: Partial<PluginTrace>): PluginTrace => {
		return PluginTrace.create({
			id: 'trace-1',
			createdOn: new Date('2025-01-01T10:00:00Z'),
			pluginName: 'TestPlugin',
			entityName: 'account',
			messageName: 'Create',
			operationType: OperationType.Plugin,
			mode: ExecutionMode.Synchronous,
			duration: Duration.fromMilliseconds(100),
			constructorDuration: Duration.fromMilliseconds(10),
			exceptionDetails: null,
			messageBlock: 'Test message',
			configuration: '{"key": "value"}',
			...overrides,
		});
	};

	beforeEach(() => {
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		exporter = new FileSystemPluginTraceExporter(mockLogger);
	});

	describe('exportToCsv', () => {
		it('should export traces to CSV format', () => {
			const traces = [createMockTrace()];

			const csv = exporter.exportToCsv(traces);

			expect(csv).toContain('ID,Created On,Plugin Name');
			expect(csv).toContain('trace-1');
			expect(csv).toContain('TestPlugin');
			expect(csv).toContain('account');
		});

		it('should escape CSV fields with commas', () => {
			const traces = [
				createMockTrace({
					pluginName: 'Test, Plugin',
				}),
			];

			const csv = exporter.exportToCsv(traces);

			expect(csv).toContain('"Test, Plugin"');
		});

		it('should escape CSV fields with quotes', () => {
			const traces = [
				createMockTrace({
					pluginName: 'Test "Plugin"',
				}),
			];

			const csv = exporter.exportToCsv(traces);

			expect(csv).toContain('"Test ""Plugin"""');
		});

		it('should handle empty trace array', () => {
			const csv = exporter.exportToCsv([]);

			expect(csv).toContain('ID,Created On,Plugin Name');
			expect(csv.split('\n')).toHaveLength(1); // Only headers
		});

		it('should include exception status', () => {
			const traces = [
				createMockTrace({
					exceptionDetails: 'Test exception',
				}),
			];

			const csv = exporter.exportToCsv(traces);

			expect(csv).toContain('Exception');
			expect(csv).toContain('Test exception');
		});

		it('should include correlation ID', () => {
			const traces = [
				createMockTrace({
					correlationId: CorrelationId.create('corr-123'),
				}),
			];

			const csv = exporter.exportToCsv(traces);

			expect(csv).toContain('corr-123');
		});

		it('should handle null entity name', () => {
			const traces = [
				createMockTrace({
					entityName: null,
				}),
			];

			const csv = exporter.exportToCsv(traces);

			const lines = csv.split('\n');
			expect(lines.length).toBeGreaterThan(1);
		});
	});

	describe('exportToJson', () => {
		it('should export traces to JSON format', () => {
			const traces = [createMockTrace()];

			const json = exporter.exportToJson(traces);
			const parsed = JSON.parse(json);

			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed[0]?.id).toBe('trace-1');
			expect(parsed[0]?.pluginName).toBe('TestPlugin');
			expect(parsed[0]?.entityName).toBe('account');
		});

		it('should pretty-print JSON', () => {
			const traces = [createMockTrace()];

			const json = exporter.exportToJson(traces);

			expect(json).toContain('\n');
			expect(json).toContain('  ');
		});

		it('should handle empty trace array', () => {
			const json = exporter.exportToJson([]);
			const parsed = JSON.parse(json);

			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed).toHaveLength(0);
		});

		it('should include status field', () => {
			const successTrace = createMockTrace({
				exceptionDetails: null,
			});
			const failureTrace = createMockTrace({
				id: 'trace-2',
				exceptionDetails: 'Test exception',
			});

			const json = exporter.exportToJson([
				successTrace,
				failureTrace,
			]);
			const parsed = JSON.parse(json);

			expect(parsed[0]?.status).toBe('Success');
			expect(parsed[1]?.status).toBe('Exception');
		});

		it('should include duration in milliseconds', () => {
			const traces = [
				createMockTrace({
					duration: Duration.fromMilliseconds(250),
					constructorDuration: Duration.fromMilliseconds(50),
				}),
			];

			const json = exporter.exportToJson(traces);
			const parsed = JSON.parse(json);

			expect(parsed[0]?.duration).toBe(250);
			expect(parsed[0]?.constructorDuration).toBe(50);
		});

		it('should include correlation ID', () => {
			const traces = [
				createMockTrace({
					correlationId: CorrelationId.create('corr-123'),
				}),
			];

			const json = exporter.exportToJson(traces);
			const parsed = JSON.parse(json);

			expect(parsed[0]?.correlationId).toBe('corr-123');
		});

		it('should include null values for optional fields', () => {
			const traces = [
				createMockTrace({
					entityName: null,
					exceptionDetails: null,
					messageBlock: null,
					configuration: null,
					correlationId: null,
				}),
			];

			const json = exporter.exportToJson(traces);
			const parsed = JSON.parse(json);

			expect(parsed[0]?.entityName).toBeNull();
			expect(parsed[0]?.exceptionDetails).toBeNull();
		});
	});

	describe('saveToFile', () => {
		it('should save content to file', async () => {
			const content = 'test content';
			const filename = 'test.csv';

			await expect(
				exporter.saveToFile(content, filename)
			).rejects.toThrow('Save dialog cancelled');
		});
	});
});
