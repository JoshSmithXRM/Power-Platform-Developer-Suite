import type { ICancellationToken } from '../../domain/interfaces/ICancellationToken';

/**
 * Creates a mock cancellation token for testing.
 *
 * @param isCancelled - Whether the token should be in a cancelled state
 * @returns A mock cancellation token
 *
 * @example
 * ```typescript
 * const token = createMockCancellationToken(false);
 * await useCase.execute(environmentId, token);
 * ```
 */
export function createMockCancellationToken(isCancelled: boolean = false): ICancellationToken {
	return {
		isCancellationRequested: isCancelled,
		onCancellationRequested: jest.fn()
	};
}

/**
 * Creates a dynamic cancellation token that can be cancelled programmatically during a test.
 *
 * @returns An object containing the token and a function to cancel it
 *
 * @example
 * ```typescript
 * const { token, cancel } = createDynamicCancellationToken();
 * mockRepository.find.mockImplementation(async () => {
 *   cancel();
 *   return data;
 * });
 * await expect(useCase.execute(token)).rejects.toThrow(OperationCancelledException);
 * ```
 */
export function createDynamicCancellationToken(): {
	token: ICancellationToken;
	cancel: () => void;
} {
	let cancelled = false;

	const token: ICancellationToken = {
		get isCancellationRequested() {
			return cancelled;
		},
		onCancellationRequested: jest.fn()
	};

	const cancel = (): void => {
		cancelled = true;
	};

	return { token, cancel };
}
