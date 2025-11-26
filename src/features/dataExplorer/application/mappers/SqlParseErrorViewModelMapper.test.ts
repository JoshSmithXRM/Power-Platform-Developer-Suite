import { SqlParseError } from '../../domain/errors/SqlParseError';
import { SqlParseErrorViewModelMapper } from './SqlParseErrorViewModelMapper';

describe('SqlParseErrorViewModelMapper', () => {
	let mapper: SqlParseErrorViewModelMapper;

	beforeEach(() => {
		mapper = new SqlParseErrorViewModelMapper();
	});

	describe('toViewModel', () => {
		it('should map SqlParseError to ViewModel with position info', () => {
			// Constructor: message, position, line, column, sql
			const error = new SqlParseError(
				'Unexpected token',
				10,
				1,
				11,
				'SELECT * FORM account'
			);

			const viewModel = mapper.toViewModel(error);

			expect(viewModel.message).toContain('Unexpected token');
			expect(viewModel.errorType).toBe('parse');
			expect(viewModel.position).toEqual({ line: 1, column: 11 });
			expect(viewModel.context).toBeDefined();
		});

		it('should include error context from SqlParseError', () => {
			const error = new SqlParseError(
				'Expected FROM',
				12,
				1,
				13,
				'SELECT name FORM account'
			);

			const viewModel = mapper.toViewModel(error);

			expect(viewModel.context).toContain('FORM');
		});

		it('should handle error at start of line', () => {
			const error = new SqlParseError(
				'Invalid keyword',
				0,
				1,
				1,
				'SELCT name FROM account'
			);

			const viewModel = mapper.toViewModel(error);

			expect(viewModel.position?.line).toBe(1);
			expect(viewModel.position?.column).toBe(1);
		});
	});

	describe('genericErrorToViewModel', () => {
		it('should map generic Error to execution error ViewModel', () => {
			const error = new Error('Network request failed');

			const viewModel = mapper.genericErrorToViewModel(error);

			expect(viewModel.message).toBe('Network request failed');
			expect(viewModel.errorType).toBe('execution');
			expect(viewModel.position).toBeUndefined();
			expect(viewModel.context).toBeUndefined();
		});

		it('should handle Error with empty message', () => {
			const error = new Error('');

			const viewModel = mapper.genericErrorToViewModel(error);

			expect(viewModel.message).toBe('');
			expect(viewModel.errorType).toBe('execution');
		});
	});

	describe('validationErrorToViewModel', () => {
		it('should create validation error ViewModel', () => {
			const viewModel = mapper.validationErrorToViewModel(
				'SQL query cannot be empty'
			);

			expect(viewModel.message).toBe('SQL query cannot be empty');
			expect(viewModel.errorType).toBe('validation');
			expect(viewModel.position).toBeUndefined();
			expect(viewModel.context).toBeUndefined();
		});

		it('should handle custom validation messages', () => {
			const viewModel = mapper.validationErrorToViewModel(
				'Query exceeds maximum length of 10000 characters'
			);

			expect(viewModel.message).toBe(
				'Query exceeds maximum length of 10000 characters'
			);
			expect(viewModel.errorType).toBe('validation');
		});
	});
});
