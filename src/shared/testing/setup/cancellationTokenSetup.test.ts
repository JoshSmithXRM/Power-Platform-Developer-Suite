/**
 * Unit tests for cancellationTokenSetup
 */

import { createMockCancellationToken, createDynamicCancellationToken } from './cancellationTokenSetup';

describe('cancellationTokenSetup', () => {
	describe('createMockCancellationToken', () => {
		it('should create a token with isCancellationRequested set to false by default', () => {
			const token = createMockCancellationToken();

			expect(token.isCancellationRequested).toBe(false);
		});

		it('should create a token with isCancellationRequested set to false when explicitly passed false', () => {
			const token = createMockCancellationToken(false);

			expect(token.isCancellationRequested).toBe(false);
		});

		it('should create a token with isCancellationRequested set to true when passed true', () => {
			const token = createMockCancellationToken(true);

			expect(token.isCancellationRequested).toBe(true);
		});

		it('should have a mocked onCancellationRequested function', () => {
			const token = createMockCancellationToken();

			expect(token.onCancellationRequested).toBeDefined();
			expect(typeof token.onCancellationRequested).toBe('function');
		});

		it('should have onCancellationRequested as a jest mock function', () => {
			const token = createMockCancellationToken();

			expect(jest.isMockFunction(token.onCancellationRequested)).toBe(true);
		});

		it('should allow onCancellationRequested to be called without error', () => {
			const token = createMockCancellationToken();
			const mockListener = jest.fn();

			expect(() => {
				token.onCancellationRequested(mockListener);
			}).not.toThrow();
		});

		it('should track calls to onCancellationRequested', () => {
			const token = createMockCancellationToken();
			const mockListener = jest.fn();

			token.onCancellationRequested(mockListener);
			token.onCancellationRequested(mockListener);

			expect(token.onCancellationRequested).toHaveBeenCalledTimes(2);
			expect(token.onCancellationRequested).toHaveBeenCalledWith(mockListener);
		});

		it('should create independent token instances', () => {
			const token1 = createMockCancellationToken(true);
			const token2 = createMockCancellationToken(false);

			expect(token1.isCancellationRequested).toBe(true);
			expect(token2.isCancellationRequested).toBe(false);
			expect(token1.onCancellationRequested).not.toBe(token2.onCancellationRequested);
		});
	});

	describe('createDynamicCancellationToken', () => {
		it('should return an object with token and cancel properties', () => {
			const result = createDynamicCancellationToken();

			expect(result).toHaveProperty('token');
			expect(result).toHaveProperty('cancel');
		});

		it('should create a token with isCancellationRequested initially false', () => {
			const { token } = createDynamicCancellationToken();

			expect(token.isCancellationRequested).toBe(false);
		});

		it('should allow the token to be cancelled via the cancel function', () => {
			const { token, cancel } = createDynamicCancellationToken();

			expect(token.isCancellationRequested).toBe(false);
			cancel();
			expect(token.isCancellationRequested).toBe(true);
		});

		it('should maintain cancelled state after cancel is called', () => {
			const { token, cancel } = createDynamicCancellationToken();

			cancel();
			expect(token.isCancellationRequested).toBe(true);
			expect(token.isCancellationRequested).toBe(true);
		});

		it('should allow multiple cancel calls without error', () => {
			const { cancel } = createDynamicCancellationToken();

			expect(() => {
				cancel();
				cancel();
				cancel();
			}).not.toThrow();
		});

		it('should have a mocked onCancellationRequested function', () => {
			const { token } = createDynamicCancellationToken();

			expect(token.onCancellationRequested).toBeDefined();
			expect(typeof token.onCancellationRequested).toBe('function');
		});

		it('should have onCancellationRequested as a jest mock function', () => {
			const { token } = createDynamicCancellationToken();

			expect(jest.isMockFunction(token.onCancellationRequested)).toBe(true);
		});

		it('should allow onCancellationRequested to be called without error', () => {
			const { token } = createDynamicCancellationToken();
			const mockListener = jest.fn();

			expect(() => {
				token.onCancellationRequested(mockListener);
			}).not.toThrow();
		});

		it('should track calls to onCancellationRequested', () => {
			const { token } = createDynamicCancellationToken();
			const mockListener = jest.fn();

			token.onCancellationRequested(mockListener);
			token.onCancellationRequested(mockListener);

			expect(token.onCancellationRequested).toHaveBeenCalledTimes(2);
			expect(token.onCancellationRequested).toHaveBeenCalledWith(mockListener);
		});

		it('should create independent dynamic token instances', () => {
			const { token: token1, cancel: cancel1 } = createDynamicCancellationToken();
			const { token: token2, cancel: cancel2 } = createDynamicCancellationToken();

			cancel1();
			expect(token1.isCancellationRequested).toBe(true);
			expect(token2.isCancellationRequested).toBe(false);

			cancel2();
			expect(token2.isCancellationRequested).toBe(true);
		});

		it('should allow isCancellationRequested to be checked as a getter property', () => {
			const { token, cancel } = createDynamicCancellationToken();

			const requested1 = token.isCancellationRequested;
			cancel();
			const requested2 = token.isCancellationRequested;

			expect(requested1).toBe(false);
			expect(requested2).toBe(true);
		});

		it('should support checking cancellation state in a loop before cancel', () => {
			const { token, cancel } = createDynamicCancellationToken();
			const states: boolean[] = [];

			states.push(token.isCancellationRequested);
			states.push(token.isCancellationRequested);
			cancel();
			states.push(token.isCancellationRequested);
			states.push(token.isCancellationRequested);

			expect(states).toEqual([false, false, true, true]);
		});

		it('should be usable in a real-world scenario where cancel is called during iteration', () => {
			const { token, cancel } = createDynamicCancellationToken();
			const results: boolean[] = [];

			for (let i = 0; i < 5; i++) {
				results.push(token.isCancellationRequested);
				if (i === 2) {
					cancel();
				}
			}

			expect(results).toEqual([false, false, false, true, true]);
		});
	});

	describe('Integration scenarios', () => {
		it('should use mock token in a simple operation', () => {
			const token = createMockCancellationToken(false);
			const operation = (cancellationToken: ReturnType<typeof createMockCancellationToken>) => {
				return !cancellationToken.isCancellationRequested;
			};

			expect(operation(token)).toBe(true);
		});

		it('should use mock token in a cancelled operation', () => {
			const token = createMockCancellationToken(true);
			const operation = (cancellationToken: ReturnType<typeof createMockCancellationToken>) => {
				return !cancellationToken.isCancellationRequested;
			};

			expect(operation(token)).toBe(false);
		});

		it('should use dynamic token in an operation that gets cancelled mid-execution', () => {
			const { token, cancel } = createDynamicCancellationToken();
			let executionPhase = 0;

			// Simulate a multi-phase operation
			if (!token.isCancellationRequested) {
				executionPhase = 1;
			}

			cancel();

			if (token.isCancellationRequested) {
				executionPhase = 0;
			}

			expect(executionPhase).toBe(0);
		});

		it('should properly model a cancellable async-like operation flow', async () => {
			const { token, cancel } = createDynamicCancellationToken();
			const phases: number[] = [];

			// Phase 1: initial check
			if (!token.isCancellationRequested) {
				phases.push(1);
				// Simulate some async work
				await new Promise(resolve => setTimeout(resolve, 0));
			}

			// Phase 2: check again, cancel is called
			cancel();
			if (token.isCancellationRequested) {
				phases.push(2);
			}

			// Phase 3: should not execute
			if (!token.isCancellationRequested) {
				phases.push(3);
			}

			expect(phases).toEqual([1, 2]);
		});
	});
});
