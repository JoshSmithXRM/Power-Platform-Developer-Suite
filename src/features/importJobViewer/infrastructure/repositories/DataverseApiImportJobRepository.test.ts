import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ValidationError } from '../../../../shared/domain/errors/ValidationError';
import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ImportJob, ImportJobStatus } from '../../domain/entities/ImportJob';

import { DataverseApiImportJobRepository } from './DataverseApiImportJobRepository';

describe('DataverseApiImportJobRepository', () => {
	let repository: DataverseApiImportJobRepository;
	let mockApiService: jest.Mocked<IDataverseApiService>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockApiService = {
			get: jest.fn(),
			post: jest.fn(),
			patch: jest.fn(),
			delete: jest.fn(),
			batchDelete: jest.fn()
		};

		mockLogger = {
			trace: jest.fn(),
		debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		repository = new DataverseApiImportJobRepository(mockApiService, mockLogger);
	});

	describe('findAll', () => {
		it('should fetch import jobs from Dataverse API and map to domain entities', async () => {
			const mockResponse = {
				value: [
					{
						importjobid: 'job-1',
						name: 'Test Import',
						solutionname: 'TestSolution',
						createdon: '2024-01-15T10:00:00Z',
						startedon: '2024-01-15T10:00:00Z',
						completedon: '2024-01-15T11:00:00Z',
						progress: 100,
						_createdby_value: 'user-1',
						createdby: {
							fullname: 'Test User'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/importjobs?'),
				undefined
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toBeDefined();
			expect(result[0]).toBeInstanceOf(ImportJob);
			expect(result[0]!.id).toBe('job-1');
			expect(result[0]!.name).toBe('Test Import');
			expect(result[0]!.solutionName).toBe('TestSolution');
			expect(result[0]!.progress).toBe(100);
			expect(result[0]!.statusCode).toBe(ImportJobStatus.Completed);
			expect(result[0]!.createdBy).toBe('Test User');
		});

		it('should handle null completedOn date and derive InProgress status', async () => {
			const mockResponse = {
				value: [
					{
						importjobid: 'job-1',
						name: 'Test',
						solutionname: 'Solution',
						createdon: '2024-01-15T10:00:00Z',
						startedon: '2024-01-15T10:00:00Z',
						completedon: null,
						progress: 50,
						_createdby_value: 'user-1',
						createdby: {
							fullname: 'User'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			expect(result[0]).toBeDefined();
			expect(result[0]!.completedOn).toBeNull();
			expect(result[0]!.statusCode).toBe(ImportJobStatus.InProgress);
		});

		it('should handle missing job name with default value', async () => {
			const mockResponse = {
				value: [
					{
						importjobid: 'job-1',
						name: null,
						solutionname: 'Solution',
						createdon: '2024-01-15T10:00:00Z',
						startedon: '2024-01-15T10:00:00Z',
						completedon: null,
						progress: 0,
						_createdby_value: 'user-1',
						createdby: {
							fullname: 'User'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			expect(result[0]).toBeDefined();
			expect(result[0]!.name).toBe('Unnamed Import');
		});

		it('should handle missing solution name with default value', async () => {
			const mockResponse = {
				value: [
					{
						importjobid: 'job-1',
						name: 'Test',
						solutionname: null,
						createdon: '2024-01-15T10:00:00Z',
						startedon: '2024-01-15T10:00:00Z',
						completedon: null,
						progress: 0,
						_createdby_value: 'user-1',
						createdby: {
							fullname: 'User'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			expect(result[0]).toBeDefined();
			expect(result[0]!.solutionName).toBe('Unknown Solution');
		});

		it('should handle missing createdby fullname with default value', async () => {
			const mockResponse = {
				value: [
					{
						importjobid: 'job-1',
						name: 'Test',
						solutionname: 'Solution',
						createdon: '2024-01-15T10:00:00Z',
						startedon: '2024-01-15T10:00:00Z',
						completedon: null,
						progress: 0,
						_createdby_value: 'user-1'
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			expect(result[0]).toBeDefined();
			expect(result[0]!.createdBy).toBe('Unknown User');
		});

		it('should derive status from completedOn and progress', async () => {
			const testCases = [
				{ completedon: null, progress: 50, expected: ImportJobStatus.InProgress, description: 'null completedon -> InProgress' },
				{ completedon: '2024-01-15T11:00:00Z', progress: 100, expected: ImportJobStatus.Completed, description: 'completedon + 100% -> Completed' },
				{ completedon: '2024-01-15T11:00:00Z', progress: 75, expected: ImportJobStatus.Failed, description: 'completedon + <100% -> Failed' },
				{ completedon: '2024-01-15T11:00:00Z', progress: 0, expected: ImportJobStatus.Failed, description: 'completedon + 0% -> Failed' }
			];

			for (const testCase of testCases) {
				const mockResponse = {
					value: [
						{
							importjobid: 'job-1',
							name: 'Test',
							solutionname: 'Solution',
							createdon: '2024-01-15T10:00:00Z',
							startedon: '2024-01-15T10:00:00Z',
							completedon: testCase.completedon,
							progress: testCase.progress,
							_createdby_value: 'user-1',
							createdby: { fullname: 'User' }
						}
					]
				};

				mockApiService.get.mockResolvedValue(mockResponse);

				const result = await repository.findAll('env-123', undefined, undefined);

				expect(result[0]).toBeDefined();
				expect(result[0]!.statusCode).toBe(testCase.expected);
			}
		});

		it('should handle multiple import jobs', async () => {
			const mockResponse = {
				value: [
					{
						importjobid: 'job-1',
						name: 'Import 1',
						solutionname: 'Solution 1',
						createdon: '2024-01-15T10:00:00Z',
						startedon: '2024-01-15T10:00:00Z',
						completedon: null,
						progress: 50,
						_createdby_value: 'user-1',
						createdby: { fullname: 'User 1' }
					},
					{
						importjobid: 'job-2',
						name: 'Import 2',
						solutionname: 'Solution 2',
						createdon: '2024-01-16T10:00:00Z',
						startedon: '2024-01-16T10:00:00Z',
						completedon: '2024-01-16T11:00:00Z',
						progress: 100,
						_createdby_value: 'user-2',
						createdby: { fullname: 'User 2' }
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			expect(result).toHaveLength(2);
			expect(result[0]).toBeDefined();
			expect(result[0]!.name).toBe('Import 1');
			expect(result[1]).toBeDefined();
			expect(result[1]!.name).toBe('Import 2');
		});

		it('should handle empty job list', async () => {
			const mockResponse = { value: [] };

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			expect(result).toHaveLength(0);
		});

		it('should throw ValidationError for invalid progress value', async () => {
			const mockResponse = {
				value: [
					{
						importjobid: 'job-1',
						name: 'Test',
						solutionname: 'Solution',
						createdon: '2024-01-15T10:00:00Z',
						startedon: '2024-01-15T10:00:00Z',
						completedon: null,
						progress: 150,
						_createdby_value: 'user-1',
						createdby: { fullname: 'User' }
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			await expect(repository.findAll('env-123', undefined, undefined)).rejects.toThrow(ValidationError);
		});

		it('should pass cancellation token to API service', async () => {
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};

			const mockResponse = { value: [] };
			mockApiService.get.mockResolvedValue(mockResponse);

			await repository.findAll('env-123', undefined, mockCancellationToken);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.any(String),
				mockCancellationToken
			);
		});

		it('should throw OperationCancelledException if cancelled before API call', async () => {
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(repository.findAll('env-123', undefined, mockCancellationToken))
				.rejects.toThrow(OperationCancelledException);

			expect(mockApiService.get).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('Repository operation cancelled before API call');
		});

		it('should throw OperationCancelledException if cancelled after API call', async () => {
			let cancelled = false;
			const mockCancellationToken: ICancellationToken = {
				get isCancellationRequested() { return cancelled; },
				onCancellationRequested: jest.fn()
			};

			const mockResponse = { value: [] };

			mockApiService.get.mockImplementation(async () => {
				cancelled = true;
				return mockResponse;
			});

			await expect(repository.findAll('env-123', undefined, mockCancellationToken))
				.rejects.toThrow(OperationCancelledException);

			expect(mockLogger.debug).toHaveBeenCalledWith('Repository operation cancelled after API call');
		});

		it('should log and rethrow API service errors', async () => {
			const error = new Error('API request failed');
			mockApiService.get.mockRejectedValue(error);

			await expect(repository.findAll('env-123', undefined, undefined)).rejects.toThrow('API request failed');

			expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch import jobs from Dataverse API', error);
		});

		it('should log successful fetch', async () => {
			const mockResponse = {
				value: [
					{
						importjobid: 'job-1',
						name: 'Test',
						solutionname: 'Solution',
						createdon: '2024-01-15T10:00:00Z',
						startedon: '2024-01-15T10:00:00Z',
						completedon: null,
						progress: 0,
						_createdby_value: 'user-1',
						createdby: { fullname: 'User' }
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			await repository.findAll('env-123', undefined, undefined);

			expect(mockLogger.debug).toHaveBeenCalledWith('Fetching import jobs from Dataverse API', { environmentId: 'env-123' });
			expect(mockLogger.debug).toHaveBeenCalledWith('Fetched 1 import job(s) from Dataverse', { environmentId: 'env-123' });
		});

		it('should use correct Dataverse endpoint with query parameters', async () => {
			const mockResponse = { value: [] };
			mockApiService.get.mockResolvedValue(mockResponse);

			await repository.findAll('env-123', undefined, undefined);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/.*\$select=.*\$expand=.*\$orderby=.*/),
				undefined
			);
		});
	});

	describe('findByIdWithLog', () => {
		it('should fetch single import job with log data from Dataverse API', async () => {
			const mockDto = {
				importjobid: 'job-1',
				name: 'Test Import',
				solutionname: 'TestSolution',
				createdon: '2024-01-15T10:00:00Z',
				startedon: '2024-01-15T10:00:00Z',
				completedon: '2024-01-15T11:00:00Z',
				progress: 100,
				importcontext: null,
				operationcontext: null,
				data: '<importlog>Test log XML</importlog>',
				_createdby_value: 'user-1',
				createdby: {
					fullname: 'Test User'
				}
			};

			mockApiService.get.mockResolvedValue(mockDto);

			const result = await repository.findByIdWithLog('env-123', 'job-1', undefined, undefined);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/importjobs(job-1)?'),
				undefined
			);
			expect(result).toBeInstanceOf(ImportJob);
			expect(result.id).toBe('job-1');
			expect(result.name).toBe('Test Import');
			expect(result.solutionName).toBe('TestSolution');
			expect(result.hasLog()).toBe(true);
			expect(result.importLogXml).toBe('<importlog>Test log XML</importlog>');
		});

		it('should handle import job without log data', async () => {
			const mockDto = {
				importjobid: 'job-1',
				name: 'Test Import',
				solutionname: 'TestSolution',
				createdon: '2024-01-15T10:00:00Z',
				startedon: '2024-01-15T10:00:00Z',
				completedon: '2024-01-15T11:00:00Z',
				progress: 100,
				importcontext: null,
				operationcontext: null,
				_createdby_value: 'user-1',
				createdby: {
					fullname: 'Test User'
				}
			};

			mockApiService.get.mockResolvedValue(mockDto);

			const result = await repository.findByIdWithLog('env-123', 'job-1', undefined, undefined);

			expect(result.hasLog()).toBe(false);
			expect(result.importLogXml).toBeNull();
		});

		it('should handle missing job name with default value', async () => {
			const mockDto = {
				importjobid: 'job-1',
				name: null,
				solutionname: 'TestSolution',
				createdon: '2024-01-15T10:00:00Z',
				startedon: null,
				completedon: null,
				progress: 0,
				importcontext: null,
				operationcontext: null,
				data: '<log></log>',
				_createdby_value: 'user-1',
				createdby: {
					fullname: 'Test User'
				}
			};

			mockApiService.get.mockResolvedValue(mockDto);

			const result = await repository.findByIdWithLog('env-123', 'job-1', undefined, undefined);

			expect(result.name).toBe('Unnamed Import');
		});

		it('should handle missing solution name with default value', async () => {
			const mockDto = {
				importjobid: 'job-1',
				name: 'Test Import',
				solutionname: null,
				createdon: '2024-01-15T10:00:00Z',
				startedon: null,
				completedon: null,
				progress: 0,
				importcontext: null,
				operationcontext: null,
				data: null,
				_createdby_value: 'user-1',
				createdby: {
					fullname: 'Test User'
				}
			};

			mockApiService.get.mockResolvedValue(mockDto);

			const result = await repository.findByIdWithLog('env-123', 'job-1', undefined, undefined);

			expect(result.solutionName).toBe('Unknown Solution');
		});

		it('should handle missing createdby fullname with default value', async () => {
			const mockDto = {
				importjobid: 'job-1',
				name: 'Test Import',
				solutionname: 'TestSolution',
				createdon: '2024-01-15T10:00:00Z',
				startedon: null,
				completedon: null,
				progress: 0,
				importcontext: null,
				operationcontext: null,
				data: null,
				_createdby_value: 'user-1'
			};

			mockApiService.get.mockResolvedValue(mockDto);

			const result = await repository.findByIdWithLog('env-123', 'job-1', undefined, undefined);

			expect(result.createdBy).toBe('Unknown User');
		});

		it('should throw OperationCancelledException if cancelled before API call', async () => {
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(repository.findByIdWithLog('env-123', 'job-1', undefined, mockCancellationToken))
				.rejects.toThrow(OperationCancelledException);

			expect(mockApiService.get).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('Repository operation cancelled before API call');
		});

		it('should throw OperationCancelledException if cancelled after API call', async () => {
			let cancelled = false;
			const mockCancellationToken: ICancellationToken = {
				get isCancellationRequested() { return cancelled; },
				onCancellationRequested: jest.fn()
			};

			const mockDto = {
				importjobid: 'job-1',
				name: 'Test',
				solutionname: 'Solution',
				createdon: '2024-01-15T10:00:00Z',
				startedon: null,
				completedon: null,
				progress: 0,
				importcontext: null,
				operationcontext: null,
				data: null,
				_createdby_value: 'user-1',
				createdby: { fullname: 'User' }
			};

			mockApiService.get.mockImplementation(async () => {
				cancelled = true;
				return mockDto;
			});

			await expect(repository.findByIdWithLog('env-123', 'job-1', undefined, mockCancellationToken))
				.rejects.toThrow(OperationCancelledException);

			expect(mockLogger.debug).toHaveBeenCalledWith('Repository operation cancelled after API call');
		});

		it('should log and rethrow API service errors', async () => {
			const error = new Error('API request failed');
			mockApiService.get.mockRejectedValue(error);

			await expect(repository.findByIdWithLog('env-123', 'job-1', undefined, undefined))
				.rejects.toThrow('API request failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch import job with log from Dataverse API',
				error
			);
		});

		it('should log successful fetch with hasLog status', async () => {
			const mockDto = {
				importjobid: 'job-1',
				name: 'Test',
				solutionname: 'Solution',
				createdon: '2024-01-15T10:00:00Z',
				startedon: null,
				completedon: null,
				progress: 0,
				importcontext: null,
				operationcontext: null,
				data: '<log></log>',
				_createdby_value: 'user-1',
				createdby: { fullname: 'User' }
			};

			mockApiService.get.mockResolvedValue(mockDto);

			await repository.findByIdWithLog('env-123', 'job-1', undefined, undefined);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching import job with log from Dataverse API',
				{ environmentId: 'env-123', importJobId: 'job-1' }
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched import job with log from Dataverse',
				{ environmentId: 'env-123', importJobId: 'job-1', hasLog: true }
			);
		});

		it('should use correct endpoint with query parameters', async () => {
			const mockDto = {
				importjobid: 'job-1',
				name: 'Test',
				solutionname: 'Solution',
				createdon: '2024-01-15T10:00:00Z',
				startedon: null,
				completedon: null,
				progress: 0,
				importcontext: null,
				operationcontext: null,
				data: null,
				_createdby_value: 'user-1',
				createdby: { fullname: 'User' }
			};

			mockApiService.get.mockResolvedValue(mockDto);

			await repository.findByIdWithLog('env-123', 'job-1', undefined, undefined);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\/api\/data\/v9\.2\/importjobs\(job-1\)\?.*\$select=.*data.*\$expand=.*/),
				undefined
			);
		});

		it('should pass cancellation token to API service', async () => {
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};

			const mockDto = {
				importjobid: 'job-1',
				name: 'Test',
				solutionname: 'Solution',
				createdon: '2024-01-15T10:00:00Z',
				startedon: null,
				completedon: null,
				progress: 0,
				importcontext: null,
				operationcontext: null,
				data: null,
				_createdby_value: 'user-1',
				createdby: { fullname: 'User' }
			};

			mockApiService.get.mockResolvedValue(mockDto);

			await repository.findByIdWithLog('env-123', 'job-1', undefined, mockCancellationToken);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.any(String),
				mockCancellationToken
			);
		});
	});
});
