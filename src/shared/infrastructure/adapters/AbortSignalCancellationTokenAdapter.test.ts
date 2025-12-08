import { AbortSignalCancellationTokenAdapter } from './AbortSignalCancellationTokenAdapter';

describe('AbortSignalCancellationTokenAdapter', () => {
	let adapter: AbortSignalCancellationTokenAdapter;
	let abortController: AbortController;

	beforeEach(() => {
		abortController = new AbortController();
		adapter = new AbortSignalCancellationTokenAdapter(abortController.signal);
	});

	describe('constructor', () => {
		it('should create adapter with AbortSignal', () => {
			expect(adapter).toBeDefined();
			expect(adapter).toBeInstanceOf(AbortSignalCancellationTokenAdapter);
		});
	});

	describe('isCancellationRequested', () => {
		it('should return false when signal is not aborted', () => {
			expect(adapter.isCancellationRequested).toBe(false);
		});

		it('should return true when signal has been aborted', () => {
			abortController.abort();

			expect(adapter.isCancellationRequested).toBe(true);
		});

		it('should reflect changes in abort state', () => {
			expect(adapter.isCancellationRequested).toBe(false);

			abortController.abort();

			expect(adapter.isCancellationRequested).toBe(true);
		});
	});

	describe('onCancellationRequested', () => {
		it('should register a listener and return disposable', () => {
			const mockListener = jest.fn();

			const result = adapter.onCancellationRequested(mockListener);

			expect(result).toBeDefined();
			expect(typeof result.dispose).toBe('function');
		});

		it('should call listener when signal is aborted', () => {
			const mockListener = jest.fn();

			adapter.onCancellationRequested(mockListener);
			abortController.abort();

			expect(mockListener).toHaveBeenCalled();
		});

		it('should call listener synchronously if signal is already aborted', () => {
			abortController.abort();
			const alreadyAbortedAdapter = new AbortSignalCancellationTokenAdapter(abortController.signal);
			const mockListener = jest.fn();

			alreadyAbortedAdapter.onCancellationRequested(mockListener);

			expect(mockListener).toHaveBeenCalled();
		});

		it('should return no-op disposable if signal is already aborted', () => {
			abortController.abort();
			const alreadyAbortedAdapter = new AbortSignalCancellationTokenAdapter(abortController.signal);
			const mockListener = jest.fn();

			const disposable = alreadyAbortedAdapter.onCancellationRequested(mockListener);

			// Dispose should not throw
			expect(() => disposable.dispose()).not.toThrow();
		});

		it('should not call disposed listener when signal is aborted', () => {
			const mockListener = jest.fn();

			const disposable = adapter.onCancellationRequested(mockListener);
			disposable.dispose();
			abortController.abort();

			expect(mockListener).not.toHaveBeenCalled();
		});

		it('should support multiple listeners', () => {
			const listener1 = jest.fn();
			const listener2 = jest.fn();

			adapter.onCancellationRequested(listener1);
			adapter.onCancellationRequested(listener2);
			abortController.abort();

			expect(listener1).toHaveBeenCalled();
			expect(listener2).toHaveBeenCalled();
		});

		it('should allow disposing individual listeners independently', () => {
			const listener1 = jest.fn();
			const listener2 = jest.fn();

			const disposable1 = adapter.onCancellationRequested(listener1);
			adapter.onCancellationRequested(listener2);

			disposable1.dispose();
			abortController.abort();

			expect(listener1).not.toHaveBeenCalled();
			expect(listener2).toHaveBeenCalled();
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
			expect(mockListener).not.toHaveBeenCalled();

			// Trigger cancellation
			abortController.abort();
			expect(adapter.isCancellationRequested).toBe(true);
			expect(mockListener).toHaveBeenCalled();

			// Dispose listener
			expect(() => disposable.dispose()).not.toThrow();
		});

		it('should work with typical panel disposal pattern', () => {
			// Simulate: panel creates adapter, registers cleanup, then disposes
			const cleanup = jest.fn();

			adapter.onCancellationRequested(cleanup);

			// Simulate panel dispose
			abortController.abort();

			expect(cleanup).toHaveBeenCalledTimes(1);
		});
	});
});
