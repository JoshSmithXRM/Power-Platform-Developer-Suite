import { DomainError } from './DomainError';

/**
 * Exception thrown when an operation is cancelled by the user or system.
 * Used to distinguish cancellation from other error conditions.
 */
export class OperationCancelledException extends DomainError {
	constructor(message = 'Operation was cancelled') {
		super(message);
	}
}
