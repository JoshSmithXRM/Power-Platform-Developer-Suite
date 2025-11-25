import { SqlParseError } from '../../domain/errors/SqlParseError';
import type { QueryErrorViewModel } from '../viewModels/QueryErrorViewModel';

/**
 * Mapper: SqlParseError → QueryErrorViewModel
 *
 * Transforms domain error to user-friendly ViewModel.
 */
export class SqlParseErrorViewModelMapper {
	/**
	 * Maps SqlParseError to ViewModel with position and context.
	 *
	 * @param error - Domain SQL parse error
	 * @returns ViewModel with error details and position info
	 */
	public toViewModel(error: SqlParseError): QueryErrorViewModel {
		return {
			message: error.message,
			errorType: 'parse',
			position: {
				line: error.line,
				column: error.column,
			},
			context: error.getErrorContext(30),
		};
	}

	/**
	 * Maps generic Error to ViewModel.
	 *
	 * @param error - Generic JavaScript error
	 * @returns ViewModel without position info
	 */
	public genericErrorToViewModel(error: Error): QueryErrorViewModel {
		return {
			message: error.message,
			errorType: 'execution',
		};
	}

	/**
	 * Maps validation error to ViewModel.
	 *
	 * @param message - Validation error message
	 * @returns ViewModel with validation error type
	 */
	public validationErrorToViewModel(message: string): QueryErrorViewModel {
		return {
			message,
			errorType: 'validation',
		};
	}
}
