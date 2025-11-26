import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IDataExplorerQueryRepository } from '../../domain/repositories/IDataExplorerQueryRepository';
import { SqlParseError } from '../../domain/errors/SqlParseError';
import { createTestQueryResult } from '../../../../shared/testing/factories/QueryResultFactory';

import { ExecuteSqlQueryUseCase } from './ExecuteSqlQueryUseCase';

describe('ExecuteSqlQueryUseCase', () => {
	let useCase: ExecuteSqlQueryUseCase;
	let mockRepository: jest.Mocked<IDataExplorerQueryRepository>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockRepository = {
			executeQuery: jest.fn(),
			executeQueryWithPaging: jest.fn(),
			getEntitySetName: jest.fn(),
		};

		mockLogger = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		useCase = new ExecuteSqlQueryUseCase(mockRepository, mockLogger);
	});

	describe('execute', () => {
		it('should parse SQL, transpile to FetchXML, and execute query', async () => {
			const queryResult = createTestQueryResult({
				rowCount: 2,
				executionTimeMs: 150,
			});

			mockRepository.getEntitySetName.mockResolvedValue('accounts');
			mockRepository.executeQuery.mockResolvedValue(queryResult);

			const result = await useCase.execute(
				'env-123',
				'SELECT name FROM account'
			);

			expect(mockRepository.getEntitySetName).toHaveBeenCalledWith(
				'env-123',
				'account'
			);
			expect(mockRepository.executeQuery).toHaveBeenCalledWith(
				'env-123',
				'accounts',
				expect.stringContaining('<fetch>'),
				undefined
			);
			expect(result.getRowCount()).toBe(2);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Executing SQL query',
				expect.any(Object)
			);
		});

		it('should handle SQL with WHERE clause', async () => {
			const queryResult = createTestQueryResult({ rowCount: 1 });

			mockRepository.getEntitySetName.mockResolvedValue('accounts');
			mockRepository.executeQuery.mockResolvedValue(queryResult);

			const result = await useCase.execute(
				'env-123',
				"SELECT name FROM account WHERE statecode = 0"
			);

			expect(result.getRowCount()).toBe(1);
			expect(mockRepository.executeQuery).toHaveBeenCalledWith(
				'env-123',
				'accounts',
				expect.stringContaining('<condition'),
				undefined
			);
		});

		it('should throw SqlParseError for invalid SQL', async () => {
			await expect(
				useCase.execute('env-123', 'INVALID SQL QUERY')
			).rejects.toThrow(SqlParseError);

			expect(mockRepository.executeQuery).not.toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should throw SqlParseError for empty SQL', async () => {
			await expect(
				useCase.execute('env-123', '')
			).rejects.toThrow(SqlParseError);

			expect(mockRepository.executeQuery).not.toHaveBeenCalled();
		});

		it('should log and rethrow repository errors', async () => {
			const error = new Error('API call failed');
			mockRepository.getEntitySetName.mockRejectedValue(error);

			await expect(
				useCase.execute('env-123', 'SELECT name FROM account')
			).rejects.toThrow('API call failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'SQL query execution failed',
				error
			);
		});
	});

	describe('transpileToFetchXml', () => {
		it('should return success with FetchXML for valid SQL', () => {
			const result = useCase.transpileToFetchXml(
				'SELECT name, revenue FROM account'
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.fetchXml).toContain('<fetch>');
				expect(result.fetchXml).toContain('<entity name="account"');
				expect(result.fetchXml).toContain('name="name"');
				expect(result.fetchXml).toContain('name="revenue"');
				expect(result.entityName).toBe('account');
				expect(result.hasRowLimit).toBe(false);
			}
		});

		it('should return error for invalid SQL', () => {
			const result = useCase.transpileToFetchXml('NOT A VALID SQL');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeInstanceOf(SqlParseError);
			}
		});

		it('should return error for empty SQL', () => {
			const result = useCase.transpileToFetchXml('');

			expect(result.success).toBe(false);
		});

		it('should handle SQL with ORDER BY', () => {
			const result = useCase.transpileToFetchXml(
				'SELECT name FROM account ORDER BY name'
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.fetchXml).toContain('<order');
			}
		});

		it('should handle SQL with TOP clause', () => {
			const result = useCase.transpileToFetchXml(
				'SELECT TOP 10 name FROM account'
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.fetchXml).toContain('top="10"');
				expect(result.hasRowLimit).toBe(true);
			}
		});

		it('should extract entity name correctly', () => {
			const contactResult = useCase.transpileToFetchXml(
				'SELECT fullname FROM contact'
			);
			expect(contactResult.success).toBe(true);
			if (contactResult.success) {
				expect(contactResult.entityName).toBe('contact');
			}

			const opportunityResult = useCase.transpileToFetchXml(
				'SELECT name FROM opportunity'
			);
			expect(opportunityResult.success).toBe(true);
			if (opportunityResult.success) {
				expect(opportunityResult.entityName).toBe('opportunity');
			}
		});

		it('should return error result for whitespace-only SQL', () => {
			const result = useCase.transpileToFetchXml('   \t\n   ');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeInstanceOf(SqlParseError);
			}
		});
	});

	describe('execute with AbortSignal', () => {
		it('should pass AbortSignal to repository', async () => {
			const queryResult = createTestQueryResult({ rowCount: 1 });
			const abortController = new AbortController();

			mockRepository.getEntitySetName.mockResolvedValue('accounts');
			mockRepository.executeQuery.mockResolvedValue(queryResult);

			await useCase.execute(
				'env-123',
				'SELECT name FROM account',
				abortController.signal
			);

			expect(mockRepository.executeQuery).toHaveBeenCalledWith(
				'env-123',
				'accounts',
				expect.any(String),
				abortController.signal
			);
		});
	});
});
