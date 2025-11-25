import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../domain/errors/OperationCancelledException';

/**
 * Utility for handling cancellation token checks in repositories and services.
 * Provides consistent cancellation handling across all infrastructure operations.
 */
export class CancellationHelper {
	/**
	 * Checks if cancellation has been requested and throws if so.
	 * @param cancellationToken Optional cancellation token to check
	 * @throws {OperationCancelledException} If cancellation has been requested
	 */
	static throwIfCancelled(cancellationToken?: ICancellationToken): void {
		if (cancellationToken?.isCancellationRequested) {
			throw new OperationCancelledException();
		}
	}
}
