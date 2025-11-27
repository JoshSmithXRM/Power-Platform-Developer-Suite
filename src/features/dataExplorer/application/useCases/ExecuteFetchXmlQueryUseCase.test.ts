import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IDataExplorerQueryRepository } from '../../domain/repositories/IDataExplorerQueryRepository';
import { FetchXmlValidationError } from '../../domain/errors/FetchXmlValidationError';
import { createTestQueryResult } from '../../../../shared/testing/factories/QueryResultFactory';

import { ExecuteFetchXmlQueryUseCase } from './ExecuteFetchXmlQueryUseCase';

describe('ExecuteFetchXmlQueryUseCase', () => {
	let useCase: ExecuteFetchXmlQueryUseCase;
	let mockRepository: jest.Mocked<IDataExplorerQueryRepository>;
	let mockLogger: jest.Mocked<ILogger>;

	const validFetchXml = `
		<fetch>
			<entity name="account">
				<attribute name="name" />
				<attribute name="accountid" />
			</entity>
		</fetch>
	`;

	const validFetchXmlWithFilter = `
		<fetch>
			<entity name="account">
				<attribute name="name" />
				<filter>
					<condition attribute="statecode" operator="eq" value="0" />
				</filter>
			</entity>
		</fetch>
	`;

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

		useCase = new ExecuteFetchXmlQueryUseCase(mockRepository, mockLogger);
	});

	describe('execute', () => {
		it('should validate FetchXML and execute query', async () => {
			const queryResult = createTestQueryResult({
				rowCount: 2,
				executionTimeMs: 150,
			});

			mockRepository.getEntitySetName.mockResolvedValue('accounts');
			mockRepository.executeQuery.mockResolvedValue(queryResult);

			const result = await useCase.execute('env-123', validFetchXml);

			expect(mockRepository.getEntitySetName).toHaveBeenCalledWith(
				'env-123',
				'account'
			);
			expect(mockRepository.executeQuery).toHaveBeenCalledWith(
				'env-123',
				'accounts',
				validFetchXml,
				undefined
			);
			expect(result.getRowCount()).toBe(2);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Executing FetchXML query',
				expect.any(Object)
			);
		});

		it('should handle FetchXML with filter conditions', async () => {
			const queryResult = createTestQueryResult({ rowCount: 1 });

			mockRepository.getEntitySetName.mockResolvedValue('accounts');
			mockRepository.executeQuery.mockResolvedValue(queryResult);

			const result = await useCase.execute('env-123', validFetchXmlWithFilter);

			expect(result.getRowCount()).toBe(1);
			expect(mockRepository.executeQuery).toHaveBeenCalledWith(
				'env-123',
				'accounts',
				validFetchXmlWithFilter,
				undefined
			);
		});

		it('should throw FetchXmlValidationError for invalid FetchXML', async () => {
			const invalidFetchXml = '<invalid>not valid</invalid>';

			await expect(
				useCase.execute('env-123', invalidFetchXml)
			).rejects.toThrow(FetchXmlValidationError);

			expect(mockRepository.executeQuery).not.toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should throw FetchXmlValidationError for empty FetchXML', async () => {
			await expect(
				useCase.execute('env-123', '')
			).rejects.toThrow(FetchXmlValidationError);

			expect(mockRepository.executeQuery).not.toHaveBeenCalled();
		});

		it('should throw FetchXmlValidationError for FetchXML without entity', async () => {
			const noEntityFetchXml = '<fetch></fetch>';

			await expect(
				useCase.execute('env-123', noEntityFetchXml)
			).rejects.toThrow(FetchXmlValidationError);

			expect(mockRepository.executeQuery).not.toHaveBeenCalled();
		});

		it('should throw FetchXmlValidationError when entity name cannot be extracted', async () => {
			// FetchXML with entity but missing name attribute
			const missingNameFetchXml = '<fetch><entity></entity></fetch>';

			await expect(
				useCase.execute('env-123', missingNameFetchXml)
			).rejects.toThrow(FetchXmlValidationError);

			expect(mockRepository.executeQuery).not.toHaveBeenCalled();
		});

		it('should log and rethrow repository errors', async () => {
			const error = new Error('API call failed');
			mockRepository.getEntitySetName.mockRejectedValue(error);

			await expect(
				useCase.execute('env-123', validFetchXml)
			).rejects.toThrow('API call failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'FetchXML query execution failed',
				error
			);
		});

		it('should pass AbortSignal to repository', async () => {
			const queryResult = createTestQueryResult({ rowCount: 1 });
			const abortController = new AbortController();

			mockRepository.getEntitySetName.mockResolvedValue('accounts');
			mockRepository.executeQuery.mockResolvedValue(queryResult);

			await useCase.execute(
				'env-123',
				validFetchXml,
				abortController.signal
			);

			expect(mockRepository.executeQuery).toHaveBeenCalledWith(
				'env-123',
				'accounts',
				validFetchXml,
				abortController.signal
			);
		});
	});

	describe('transpileToSql', () => {
		it('should return success with SQL for valid FetchXML', () => {
			const result = useCase.transpileToSql(validFetchXml);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.sql).toContain('SELECT');
				expect(result.sql).toContain('FROM account');
				expect(result.entityName).toBe('account');
				expect(result.warnings).toEqual([]);
			}
		});

		it('should return error for invalid FetchXML', () => {
			const result = useCase.transpileToSql('<invalid>not valid</invalid>');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});

		it('should return error for empty FetchXML', () => {
			const result = useCase.transpileToSql('');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('FetchXML cannot be empty');
			}
		});

		it('should include warnings for unsupported features', () => {
			const aggregateFetchXml = `
				<fetch aggregate="true">
					<entity name="account">
						<attribute name="name" />
					</entity>
				</fetch>
			`;

			const result = useCase.transpileToSql(aggregateFetchXml);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.warnings.length).toBeGreaterThan(0);
				expect(result.warnings.some(w => w.feature === 'aggregate')).toBe(true);
			}
		});

		it('should handle FetchXML with TOP clause', () => {
			const topFetchXml = `
				<fetch top="10">
					<entity name="account">
						<attribute name="name" />
					</entity>
				</fetch>
			`;

			const result = useCase.transpileToSql(topFetchXml);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.sql).toContain('TOP 10');
			}
		});

		it('should handle FetchXML with ORDER BY', () => {
			const orderedFetchXml = `
				<fetch>
					<entity name="account">
						<attribute name="name" />
						<order attribute="name" descending="false" />
					</entity>
				</fetch>
			`;

			const result = useCase.transpileToSql(orderedFetchXml);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.sql).toContain('ORDER BY');
				expect(result.sql).toContain('name ASC');
			}
		});

		it('should extract entity name correctly for different entities', () => {
			const contactFetchXml = `
				<fetch>
					<entity name="contact">
						<attribute name="fullname" />
					</entity>
				</fetch>
			`;

			const result = useCase.transpileToSql(contactFetchXml);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entityName).toBe('contact');
			}
		});
	});

	describe('validate', () => {
		it('should return valid for correct FetchXML', () => {
			const result = useCase.validate(validFetchXml);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should return invalid with errors for incorrect FetchXML', () => {
			const result = useCase.validate('<invalid>not valid</invalid>');

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should return invalid for empty FetchXML', () => {
			const result = useCase.validate('');

			expect(result.isValid).toBe(false);
			expect(result.errors[0]?.message).toBe('FetchXML cannot be empty');
		});

		it('should return invalid for FetchXML without entity element', () => {
			const result = useCase.validate('<fetch></fetch>');

			expect(result.isValid).toBe(false);
			expect(result.errors.some(e => e.message.includes('entity'))).toBe(true);
		});

		it('should return invalid for malformed XML', () => {
			const result = useCase.validate('<fetch><entity name="account"></fetch>');

			expect(result.isValid).toBe(false);
		});
	});
});
