import * as vscode from 'vscode';

import { VsCodeCancellationTokenAdapter } from './VsCodeCancellationTokenAdapter';

// Mock vscode module before importing
jest.mock('vscode', () => ({
	CancellationToken: jest.fn()
}), { virtual: true });

describe('VsCodeCancellationTokenAdapter', () => {
	let adapter: VsCodeCancellationTokenAdapter;
	let mockVsCodeToken: jest.Mocked<vscode.CancellationToken>;
	let mockDisposable: jest.Mocked<vscode.Disposable>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock the disposable
		mockDisposable = {
			dispose: jest.fn()
		} as unknown as jest.Mocked<vscode.Disposable>;

		// Mock the VS Code CancellationToken
		mockVsCodeToken = {
			isCancellationRequested: false,
			onCancellationRequested: jest.fn(() => mockDisposable)
		} as unknown as jest.Mocked<vscode.CancellationToken>;

		adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);
	});

	describe('constructor', () => {
		it('should create adapter with VS Code cancellation token', () => {
			expect(adapter).toBeDefined();
			expect(adapter).toBeInstanceOf(VsCodeCancellationTokenAdapter);
		});
	});

	describe('isCancellationRequested', () => {
		it('should return false when cancellation is not requested', () => {
			mockVsCodeToken.isCancellationRequested = false;

			expect(adapter.isCancellationRequested).toBe(false);
		});

		it('should return true when cancellation has been requested', () => {
			mockVsCodeToken.isCancellationRequested = true;

			expect(adapter.isCancellationRequested).toBe(true);
		});

		it('should reflect changes in cancellation state', () => {
			mockVsCodeToken.isCancellationRequested = false;
			expect(adapter.isCancellationRequested).toBe(false);

			mockVsCodeToken.isCancellationRequested = true;
			expect(adapter.isCancellationRequested).toBe(true);

			mockVsCodeToken.isCancellationRequested = false;
			expect(adapter.isCancellationRequested).toBe(false);
		});
	});

	describe('onCancellationRequested', () => {
		it('should register a listener and return disposable', () => {
			const mockListener = jest.fn();

			const result = adapter.onCancellationRequested(mockListener);

			expect(mockVsCodeToken.onCancellationRequested).toHaveBeenCalledWith(mockListener);
			expect(result).toBe(mockDisposable);
		});

		it('should register listener that gets called on cancellation', () => {
			const mockListener = jest.fn();

			adapter.onCancellationRequested(mockListener);

			expect(mockVsCodeToken.onCancellationRequested).toHaveBeenCalledWith(mockListener);
		});

		it('should return disposable that can be disposed', () => {
			const mockListener = jest.fn();

			const disposable = adapter.onCancellationRequested(mockListener);
			disposable.dispose();

			expect(mockDisposable.dispose).toHaveBeenCalled();
		});

		it('should support multiple listeners', () => {
			const listener1 = jest.fn();
			const listener2 = jest.fn();

			adapter.onCancellationRequested(listener1);
			adapter.onCancellationRequested(listener2);

			expect(mockVsCodeToken.onCancellationRequested).toHaveBeenCalledTimes(2);
			expect(mockVsCodeToken.onCancellationRequested).toHaveBeenNthCalledWith(1, listener1);
			expect(mockVsCodeToken.onCancellationRequested).toHaveBeenNthCalledWith(2, listener2);
		});

		it('should allow disposing individual listeners independently', () => {
			const listener1 = jest.fn();
			const listener2 = jest.fn();

			const mockDisposable2 = {
				dispose: jest.fn()
			} as unknown as jest.Mocked<vscode.Disposable>;

			const onCancellationRequestedMock = jest
				.fn()
				.mockReturnValueOnce(mockDisposable)
				.mockReturnValueOnce(mockDisposable2);

			adapter = new VsCodeCancellationTokenAdapter({
				isCancellationRequested: false,
				onCancellationRequested: onCancellationRequestedMock
			} as unknown as vscode.CancellationToken);

			const disposable1 = adapter.onCancellationRequested(listener1);
			const disposable2 = adapter.onCancellationRequested(listener2);

			disposable1.dispose();
			disposable2.dispose();

			expect(mockDisposable.dispose).toHaveBeenCalled();
			expect(mockDisposable2.dispose).toHaveBeenCalled();
		});

		it('should handle listener function being called', () => {
			const mockListener = jest.fn();

			adapter.onCancellationRequested(mockListener);

			// Simulate the listener being invoked
			const passedListener = (mockVsCodeToken.onCancellationRequested as jest.Mock).mock.calls[0][0];
			passedListener();

			expect(mockListener).toHaveBeenCalled();
		});
	});

	describe('integration', () => {
		it('should work as ICancellationToken interface implementation', () => {
			const mockListener = jest.fn();

			// Should implement the interface contract
			expect(typeof adapter.isCancellationRequested).toBe('boolean');
			expect(typeof adapter.onCancellationRequested).toBe('function');

			const disposable = adapter.onCancellationRequested(mockListener);
			expect(disposable).toBeDefined();
			expect(typeof disposable.dispose).toBe('function');
		});

		it('should allow checking cancellation state and registering listener in sequence', () => {
			const mockListener = jest.fn();

			// Check initial state
			expect(adapter.isCancellationRequested).toBe(false);

			// Register listener
			const disposable = adapter.onCancellationRequested(mockListener);
			expect(mockVsCodeToken.onCancellationRequested).toHaveBeenCalledWith(mockListener);

			// Simulate cancellation request
			mockVsCodeToken.isCancellationRequested = true;
			expect(adapter.isCancellationRequested).toBe(true);

			// Dispose listener
			disposable.dispose();
			expect(mockDisposable.dispose).toHaveBeenCalled();
		});
	});
});
