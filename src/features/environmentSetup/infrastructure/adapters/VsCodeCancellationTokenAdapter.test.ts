import * as vscode from 'vscode';

import { VsCodeCancellationTokenAdapter } from './VsCodeCancellationTokenAdapter';
import { IDisposable } from '../../domain/interfaces/ICancellationToken';

// Mock vscode module
jest.mock('vscode');

describe('VsCodeCancellationTokenAdapter', () => {
	let mockVsCodeToken: jest.Mocked<vscode.CancellationToken>;
	let mockDisposable: jest.Mocked<IDisposable>;
	let adapter: VsCodeCancellationTokenAdapter;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create a mock disposable
		mockDisposable = {
			dispose: jest.fn()
		} as unknown as jest.Mocked<IDisposable>;

		// Create a mock VS Code CancellationToken
		mockVsCodeToken = {
			isCancellationRequested: false,
			onCancellationRequested: jest.fn(() => mockDisposable)
		} as unknown as jest.Mocked<vscode.CancellationToken>;
	});

	describe('constructor', () => {
		it('should create adapter with VS Code token', () => {
			expect(() => {
				adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);
			}).not.toThrow();
		});

		it('should create instance of VsCodeCancellationTokenAdapter', () => {
			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);
			expect(adapter).toBeInstanceOf(VsCodeCancellationTokenAdapter);
		});
	});

	describe('isCancellationRequested getter', () => {
		it('should return false when cancellation not requested', () => {
			mockVsCodeToken.isCancellationRequested = false;
			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);

			expect(adapter.isCancellationRequested).toBe(false);
		});

		it('should return true when cancellation requested', () => {
			mockVsCodeToken.isCancellationRequested = true;
			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);

			expect(adapter.isCancellationRequested).toBe(true);
		});

		it('should reflect changes in underlying VS Code token', () => {
			mockVsCodeToken.isCancellationRequested = false;
			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);

			expect(adapter.isCancellationRequested).toBe(false);

			// Simulate cancellation request
			mockVsCodeToken.isCancellationRequested = true;

			expect(adapter.isCancellationRequested).toBe(true);

			// Simulate cancellation cleared
			mockVsCodeToken.isCancellationRequested = false;

			expect(adapter.isCancellationRequested).toBe(false);
		});
	});

	describe('onCancellationRequested method', () => {
		it('should delegate to VS Code token onCancellationRequested', () => {
			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);
			const listener = jest.fn();

			const result = adapter.onCancellationRequested(listener);

			expect(mockVsCodeToken.onCancellationRequested).toHaveBeenCalledWith(listener);
			expect(result).toBe(mockDisposable);
		});

		it('should return disposable from VS Code token', () => {
			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);
			const listener = jest.fn();

			const result = adapter.onCancellationRequested(listener);

			expect(result).toBeDefined();
			expect(result.dispose).toBeDefined();
		});

		it('should call listener when registered', () => {
			const mockListener = jest.fn();
			let capturedListener: ((value?: unknown) => void) | null = null;

			(mockVsCodeToken.onCancellationRequested as jest.Mock).mockImplementation(
				(listener: (value?: unknown) => void) => {
					capturedListener = listener;
					return mockDisposable;
				}
			);

			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);
			adapter.onCancellationRequested(mockListener);

			expect(capturedListener).not.toBeNull();

			// Trigger the captured listener
			if (capturedListener !== null) {
				(capturedListener as (value?: unknown) => void)();
			}

			expect(mockListener).toHaveBeenCalled();
		});

		it('should allow disposing the listener subscription', () => {
			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);
			const listener = jest.fn();

			const subscription = adapter.onCancellationRequested(listener);
			subscription.dispose();

			expect(mockDisposable.dispose).toHaveBeenCalled();
		});

		it('should register multiple listeners independently', () => {
			const listeners: Array<(value?: unknown) => void> = [];
			const disposables: IDisposable[] = [];

			(mockVsCodeToken.onCancellationRequested as jest.Mock).mockImplementation(
				(listener: (value?: unknown) => void) => {
					listeners.push(listener);
					return {
						dispose: jest.fn()
					};
				}
			);

			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);

			const listener1 = jest.fn();
			const listener2 = jest.fn();

			disposables.push(adapter.onCancellationRequested(listener1));
			disposables.push(adapter.onCancellationRequested(listener2));

			expect(listeners.length).toBe(2);

			// Trigger all listeners
			listeners.forEach(listener => listener());

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});

		it('should dispose individual listener without affecting others', () => {
			const listeners: Array<(value?: unknown) => void> = [];
			const disposables: jest.Mocked<IDisposable>[] = [];

			(mockVsCodeToken.onCancellationRequested as jest.Mock).mockImplementation(
				(listener: (value?: unknown) => void) => {
					listeners.push(listener);
					const disposable = {
						dispose: jest.fn()
					} as unknown as jest.Mocked<IDisposable>;
					disposables.push(disposable);
					return disposable;
				}
			);

			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);

			const listener1 = jest.fn();
			const listener2 = jest.fn();

			const subscription1 = adapter.onCancellationRequested(listener1);
			const subscription2 = adapter.onCancellationRequested(listener2);

			expect(listeners.length).toBe(2);

			// Dispose first listener
			subscription1.dispose();

			const disposable1 = disposables[0];
			if (disposable1) {
				expect(disposable1.dispose).toHaveBeenCalled();
			}

			// Trigger remaining listener
			listeners.forEach(listener => listener());

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);

			// Dispose second listener
			subscription2.dispose();

			const disposable2 = disposables[1];
			if (disposable2) {
				expect(disposable2.dispose).toHaveBeenCalled();
			}
		});
	});

	describe('adapter integration', () => {
		it('should work as ICancellationToken implementation', () => {
			const listener = jest.fn();
			(mockVsCodeToken.onCancellationRequested as jest.Mock).mockImplementation(
				(cb: (value?: unknown) => void) => {
					// Trigger callback immediately to simulate cancellation
					cb();
					return mockDisposable;
				}
			);

			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);

			// Should be able to check cancellation status
			expect(adapter.isCancellationRequested).toBeDefined();

			// Should be able to register listener
			const subscription = adapter.onCancellationRequested(listener);

			expect(listener).toHaveBeenCalled();

			// Should be able to dispose
			expect(subscription.dispose).toBeDefined();
		});

		it('should provide dependency inversion from vscode to domain', () => {
			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);

			// Adapter implements domain interface, not vscode interface
			expect(adapter).toHaveProperty('isCancellationRequested');
			expect(adapter).toHaveProperty('onCancellationRequested');

			// These are the domain interface properties, not VS Code specific
			const isCancellationRequested = adapter.isCancellationRequested;
			expect(typeof isCancellationRequested).toBe('boolean');

			const onCancellationRequested = adapter.onCancellationRequested;
			expect(typeof onCancellationRequested).toBe('function');
		});

		it('should check cancellation state and register listener in sequence', () => {
			const mockListener = jest.fn();

			adapter = new VsCodeCancellationTokenAdapter(mockVsCodeToken);

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
