import type { ICancellationToken, IDisposable } from '../../domain/interfaces/ICancellationToken';
import { CompositeCancellationToken } from './CompositeCancellationToken';

describe('CompositeCancellationToken', () => {
	let composite: CompositeCancellationToken;

	function createMockToken(
		isCancelled: boolean = false,
		onCancellationImpl?: (listener: () => void) => IDisposable
	): ICancellationToken {
		const listeners: Array<() => void> = [];
		const disposables: IDisposable[] = [];

		return {
			isCancellationRequested: isCancelled,
			onCancellationRequested: onCancellationImpl ?? ((listener: () => void): IDisposable => {
				listeners.push(listener);
				const disposable = {
					dispose: jest.fn(() => {
						const idx = listeners.indexOf(listener);
						if (idx >= 0) listeners.splice(idx, 1);
					})
				};
				disposables.push(disposable);
				return disposable;
			})
		};
	}

	describe('constructor', () => {
		it('should create composite with no tokens', () => {
			composite = new CompositeCancellationToken();

			expect(composite).toBeDefined();
			expect(composite).toBeInstanceOf(CompositeCancellationToken);
		});

		it('should create composite with single token', () => {
			const token = createMockToken();
			composite = new CompositeCancellationToken(token);

			expect(composite).toBeDefined();
		});

		it('should create composite with multiple tokens', () => {
			const token1 = createMockToken();
			const token2 = createMockToken();
			composite = new CompositeCancellationToken(token1, token2);

			expect(composite).toBeDefined();
		});
	});

	describe('isCancellationRequested', () => {
		it('should return false when no tokens are provided', () => {
			composite = new CompositeCancellationToken();

			expect(composite.isCancellationRequested).toBe(false);
		});

		it('should return false when single token is not cancelled', () => {
			const token = createMockToken(false);
			composite = new CompositeCancellationToken(token);

			expect(composite.isCancellationRequested).toBe(false);
		});

		it('should return true when single token is cancelled', () => {
			const token = createMockToken(true);
			composite = new CompositeCancellationToken(token);

			expect(composite.isCancellationRequested).toBe(true);
		});

		it('should return false when all tokens are not cancelled', () => {
			const token1 = createMockToken(false);
			const token2 = createMockToken(false);
			const token3 = createMockToken(false);
			composite = new CompositeCancellationToken(token1, token2, token3);

			expect(composite.isCancellationRequested).toBe(false);
		});

		it('should return true when ANY token is cancelled', () => {
			const token1 = createMockToken(false);
			const token2 = createMockToken(true);
			const token3 = createMockToken(false);
			composite = new CompositeCancellationToken(token1, token2, token3);

			expect(composite.isCancellationRequested).toBe(true);
		});

		it('should return true when all tokens are cancelled', () => {
			const token1 = createMockToken(true);
			const token2 = createMockToken(true);
			composite = new CompositeCancellationToken(token1, token2);

			expect(composite.isCancellationRequested).toBe(true);
		});

		it('should return true when first token is cancelled', () => {
			const token1 = createMockToken(true);
			const token2 = createMockToken(false);
			composite = new CompositeCancellationToken(token1, token2);

			expect(composite.isCancellationRequested).toBe(true);
		});

		it('should return true when last token is cancelled', () => {
			const token1 = createMockToken(false);
			const token2 = createMockToken(true);
			composite = new CompositeCancellationToken(token1, token2);

			expect(composite.isCancellationRequested).toBe(true);
		});
	});

	describe('onCancellationRequested', () => {
		it('should register listener with all tokens', () => {
			const token1 = createMockToken();
			const token2 = createMockToken();
			const spy1 = jest.spyOn(token1, 'onCancellationRequested');
			const spy2 = jest.spyOn(token2, 'onCancellationRequested');

			composite = new CompositeCancellationToken(token1, token2);
			const listener = jest.fn();

			composite.onCancellationRequested(listener);

			expect(spy1).toHaveBeenCalledWith(listener);
			expect(spy2).toHaveBeenCalledWith(listener);
		});

		it('should return composite disposable', () => {
			const token1 = createMockToken();
			const token2 = createMockToken();
			composite = new CompositeCancellationToken(token1, token2);
			const listener = jest.fn();

			const disposable = composite.onCancellationRequested(listener);

			expect(disposable).toBeDefined();
			expect(typeof disposable.dispose).toBe('function');
		});

		it('should dispose all underlying disposables when disposed', () => {
			const disposeMock1 = jest.fn();
			const disposeMock2 = jest.fn();

			const token1 = createMockToken(false, () => ({ dispose: disposeMock1 }));
			const token2 = createMockToken(false, () => ({ dispose: disposeMock2 }));

			composite = new CompositeCancellationToken(token1, token2);
			const listener = jest.fn();

			const disposable = composite.onCancellationRequested(listener);
			disposable.dispose();

			expect(disposeMock1).toHaveBeenCalled();
			expect(disposeMock2).toHaveBeenCalled();
		});

		it('should work with empty token list', () => {
			composite = new CompositeCancellationToken();
			const listener = jest.fn();

			const disposable = composite.onCancellationRequested(listener);

			expect(disposable).toBeDefined();
			expect(() => disposable.dispose()).not.toThrow();
		});
	});

	describe('integration', () => {
		it('should work as ICancellationToken interface implementation', () => {
			const token1 = createMockToken();
			const token2 = createMockToken();
			composite = new CompositeCancellationToken(token1, token2);
			const mockListener = jest.fn();

			// Should implement the interface contract
			expect(typeof composite.isCancellationRequested).toBe('boolean');
			expect(typeof composite.onCancellationRequested).toBe('function');

			const disposable = composite.onCancellationRequested(mockListener);
			expect(disposable).toBeDefined();
			expect(typeof disposable.dispose).toBe('function');
		});

		it('should combine panel and operation level tokens', () => {
			// Simulate combining panel-level and operation-level cancellation
			const panelToken = createMockToken(false);
			const operationToken = createMockToken(false);

			composite = new CompositeCancellationToken(panelToken, operationToken);

			// Neither cancelled
			expect(composite.isCancellationRequested).toBe(false);

			// Operation cancelled (user changed filter)
			(operationToken as { isCancellationRequested: boolean }).isCancellationRequested = true;
			expect(composite.isCancellationRequested).toBe(true);
		});

		it('should detect panel disposal cancellation', () => {
			// Simulate panel disposal cancelling all operations
			const panelToken = createMockToken(false);
			const operationToken = createMockToken(false);

			composite = new CompositeCancellationToken(panelToken, operationToken);

			expect(composite.isCancellationRequested).toBe(false);

			// Panel disposed
			(panelToken as { isCancellationRequested: boolean }).isCancellationRequested = true;
			expect(composite.isCancellationRequested).toBe(true);
		});
	});
});
