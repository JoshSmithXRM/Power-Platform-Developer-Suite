import { DataTableConfig } from '../DataTablePanel';
import { VsCodeCancellationTokenAdapter } from '../../adapters/VsCodeCancellationTokenAdapter';
import { OperationCancelledException } from '../../../domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ISafePanel } from '../panels/ISafePanel';

import { IDataLoader } from './IDataLoader';
import { DataBehavior } from './DataBehavior';

jest.mock('vscode', () => ({
	CancellationTokenSource: jest.fn().mockImplementation(() => ({
		token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
		cancel: jest.fn(),
		dispose: jest.fn()
	}))
}), { virtual: true });

// Mock ISafePanel with only the methods needed for testing
interface MockSafePanel {
	postMessage: jest.Mock;
	disposed: boolean;
	abortSignal: AbortSignal;
}

describe('DataBehavior', () => {
	let panelMock: MockSafePanel;
	let dataLoaderMock: jest.Mocked<IDataLoader>;
	let loggerMock: jest.Mocked<ILogger>;
	let config: DataTableConfig;
	let behavior: DataBehavior;

	beforeEach(() => {
		jest.clearAllMocks();

		panelMock = {
			postMessage: jest.fn().mockResolvedValue(true),
			disposed: false,
			abortSignal: new AbortController().signal
		};

		dataLoaderMock = {
			load: jest.fn()
		};

		loggerMock = {
			trace: jest.fn(),
		debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		config = {
			viewType: 'test-panel',
			title: 'Test Panel',
			dataCommand: 'testData',
			defaultSortColumn: 'name',
			defaultSortDirection: 'asc',
			columns: [],
			searchPlaceholder: 'Search...',
			noDataMessage: 'No data',
			enableSearch: true,
			enableSolutionFilter: false,
			toolbarButtons: []
		};

		// Cast is safe: MockSafePanel implements all ISafePanel methods used by DataBehavior
		behavior = new DataBehavior(panelMock as unknown as ISafePanel, config, dataLoaderMock, loggerMock);
	});

	describe('initialize', () => {
		it('should load data on initialization', async () => {
			const testData = [{ id: '1', name: 'Test' }];
			dataLoaderMock.load.mockResolvedValue(testData);

			await behavior.initialize();

			expect(dataLoaderMock.load).toHaveBeenCalled();
			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'loading'
			});
			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'testData',
				data: testData
			});
			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'loaded'
			});
		});
	});

	describe('loadData', () => {
		it('should post loading message before loading data', async () => {
			const testData = [{ id: '1', name: 'Test' }];
			dataLoaderMock.load.mockResolvedValue(testData);

			await behavior.loadData();

			const loadingCall = panelMock.postMessage.mock.calls.find(
				(call) => call[0].command === 'loading'
			);
			expect(loadingCall).toBeDefined();
		});

		it('should send data to webview after successful load', async () => {
			const testData = [{ id: '1', name: 'Test' }];
			dataLoaderMock.load.mockResolvedValue(testData);

			await behavior.loadData();

			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'testData',
				data: testData
			});
		});

		it('should post loaded message after loading completes', async () => {
			const testData = [{ id: '1', name: 'Test' }];
			dataLoaderMock.load.mockResolvedValue(testData);

			await behavior.loadData();

			const loadedCall = panelMock.postMessage.mock.calls.find(
				(call) => call[0].command === 'loaded'
			);
			expect(loadedCall).toBeDefined();
		});

		it('should handle empty data array', async () => {
			dataLoaderMock.load.mockResolvedValue([]);

			await behavior.loadData();

			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'testData',
				data: []
			});
		});

		it('should handle errors from data loader', async () => {
			const error = new Error('Load failed');
			dataLoaderMock.load.mockRejectedValue(error);

			await behavior.loadData();

			expect(loggerMock.error).toHaveBeenCalledWith('Failed to load data', error);
			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'error',
				error: 'Load failed'
			});
		});

		it('should not log OperationCancelledException errors', async () => {
			const error = new OperationCancelledException();
			dataLoaderMock.load.mockRejectedValue(error);

			await behavior.loadData();

			expect(loggerMock.error).not.toHaveBeenCalled();
			expect(panelMock.postMessage).not.toHaveBeenCalledWith(
				expect.objectContaining({ command: 'error' })
			);
		});

		it('should post loaded message even on error', async () => {
			const error = new Error('Load failed');
			dataLoaderMock.load.mockRejectedValue(error);

			await behavior.loadData();

			const loadedCall = panelMock.postMessage.mock.calls.find(
				(call) => call[0].command === 'loaded'
			);
			expect(loadedCall).toBeDefined();
		});

		it('should pass cancellation token to data loader', async () => {
			dataLoaderMock.load.mockResolvedValue([]);

			await behavior.loadData();

			expect(dataLoaderMock.load).toHaveBeenCalledWith(
				expect.any(VsCodeCancellationTokenAdapter)
			);
		});

		it('should not send data if operation was cancelled', async () => {
			const testData = [{ id: '1', name: 'Test' }];

			dataLoaderMock.load.mockImplementation(async (token) => {
				// Simulate cancellation during load
				Object.defineProperty(token, 'isCancellationRequested', { value: true });
				return testData;
			});

			await behavior.loadData();

			const dataCall = panelMock.postMessage.mock.calls.find(
				(call) => call[0].command === 'testData'
			);
			expect(dataCall).toBeUndefined();
		});
	});

	describe('sendData', () => {
		it('should send data with configured data command', () => {
			const testData = [{ id: '1', name: 'Test' }];

			behavior.sendData(testData);

			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'testData',
				data: testData
			});
		});
	});

	describe('setLoading', () => {
		it('should post loading message when set to true', () => {
			behavior.setLoading(true);

			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'loading'
			});
		});

		it('should post loaded message when set to false', () => {
			behavior.setLoading(false);

			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'loaded'
			});
		});
	});

	describe('handleError', () => {
		it('should post error message with Error object message', () => {
			const error = new Error('Test error');

			behavior.handleError(error);

			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'error',
				error: 'Test error'
			});
		});

		it('should post error message with string error', () => {
			behavior.handleError('String error');

			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'error',
				error: 'String error'
			});
		});

		it('should convert non-Error objects to string', () => {
			behavior.handleError({ custom: 'error' });

			expect(panelMock.postMessage).toHaveBeenCalledWith({
				command: 'error',
				error: '[object Object]'
			});
		});
	});

	describe('dispose', () => {
		it('should cancel and dispose cancellation token on dispose', async () => {
			const vscode = jest.requireMock('vscode');
			const mockTokenSource = {
				token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
				cancel: jest.fn(),
				dispose: jest.fn()
			};
			vscode.CancellationTokenSource.mockImplementation(() => mockTokenSource);

			// Cast is safe: MockWebview implements all Webview methods used by DataBehavior
			const newBehavior = new DataBehavior(panelMock as unknown as ISafePanel, config, dataLoaderMock, loggerMock);
			dataLoaderMock.load.mockResolvedValue([]);

			// Trigger token creation
			await newBehavior.loadData();

			newBehavior.dispose();

			expect(mockTokenSource.cancel).toHaveBeenCalled();
			expect(mockTokenSource.dispose).toHaveBeenCalled();
		});

		it('should handle dispose when no token exists', () => {
			expect(() => behavior.dispose()).not.toThrow();
		});
	});

	describe('cancellation token management', () => {
		it('should cancel previous operation when starting new load', async () => {
			const vscode = jest.requireMock('vscode');
			const firstTokenSource = {
				token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
				cancel: jest.fn(),
				dispose: jest.fn()
			};
			const secondTokenSource = {
				token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
				cancel: jest.fn(),
				dispose: jest.fn()
			};

			let callCount = 0;
			vscode.CancellationTokenSource.mockImplementation(() => {
				callCount++;
				return callCount === 1 ? firstTokenSource : secondTokenSource;
			});

			// Cast is safe: MockWebview implements all Webview methods used by DataBehavior
			const newBehavior = new DataBehavior(panelMock as unknown as ISafePanel, config, dataLoaderMock, loggerMock);
			dataLoaderMock.load.mockResolvedValue([]);

			// First load
			await newBehavior.loadData();

			// Second load should cancel first token
			await newBehavior.loadData();

			expect(firstTokenSource.cancel).toHaveBeenCalled();
			expect(firstTokenSource.dispose).toHaveBeenCalled();
		});
	});
});
