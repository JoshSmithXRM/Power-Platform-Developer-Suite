import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ValidationError } from '../../../../shared/domain/errors/ValidationError';
import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { Solution } from '../../domain/entities/Solution';
import { assertDefined, createMockDataverseApiService, createMockLogger } from '../../../../shared/testing';

import { DataverseApiSolutionRepository } from './DataverseApiSolutionRepository';

describe('DataverseApiSolutionRepository', () => {
	let repository: DataverseApiSolutionRepository;
	let mockApiService: jest.Mocked<IDataverseApiService>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockApiService = createMockDataverseApiService();
		mockLogger = createMockLogger();
		repository = new DataverseApiSolutionRepository(mockApiService, mockLogger);
	});

	describe('findAll', () => {
		it('should fetch solutions from Dataverse API and map to domain entities', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						uniquename: 'TestSolution',
						friendlyname: 'Test Solution',
						version: '1.0.0.0',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: '2024-01-15T10:00:00Z',
						description: 'Test description',
						publisherid: {
							friendlyname: 'Test Publisher'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/solutions?'),
				undefined
			);
			expect(result).toHaveLength(1);
			assertDefined(result[0]);
			expect(result[0]).toBeInstanceOf(Solution);
			expect(result[0].id).toBe('sol-1');
			expect(result[0].uniqueName).toBe('TestSolution');
			expect(result[0].friendlyName).toBe('Test Solution');
			expect(result[0].version).toBe('1.0.0.0');
			expect(result[0].isManaged).toBe(false);
			expect(result[0].publisherName).toBe('Test Publisher');
		});

		it('should handle null installedOn date', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						uniquename: 'Test',
						friendlyname: 'Test',
						version: '1.0',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: null,
						description: 'Test',
						publisherid: {
							friendlyname: 'Publisher'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			assertDefined(result[0]);
			expect(result[0].installedOn).toBeNull();
		});

		it('should handle null description', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						uniquename: 'Test',
						friendlyname: 'Test',
						version: '1.0',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: null,
						description: null,
						publisherid: {
							friendlyname: 'Publisher'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			assertDefined(result[0]);
			expect(result[0].description).toBe('');
		});

		it('should handle missing publisher friendly name', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						uniquename: 'Test',
						friendlyname: 'Test',
						version: '1.0',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: null,
						description: 'Test'
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			assertDefined(result[0]);
			expect(result[0].publisherName).toBe('Unknown');
		});

		it('should handle multiple solutions', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						uniquename: 'Solution1',
						friendlyname: 'Solution 1',
						version: '1.0',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: null,
						description: 'First',
						publisherid: { friendlyname: 'Publisher 1' }
					},
					{
						solutionid: 'sol-2',
						uniquename: 'Solution2',
						friendlyname: 'Solution 2',
						version: '2.0',
						ismanaged: true,
						_publisherid_value: 'pub-2',
						installedon: '2024-02-01T10:00:00Z',
						description: 'Second',
						publisherid: { friendlyname: 'Publisher 2' }
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			expect(result).toHaveLength(2);
			assertDefined(result[0]);
			expect(result[0].uniqueName).toBe('Solution1');
			assertDefined(result[1]);
			expect(result[1].uniqueName).toBe('Solution2');
		});

		it('should handle empty solution list', async () => {
			const mockResponse = { value: [] };

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123', undefined, undefined);

			expect(result).toHaveLength(0);
		});

		it('should throw ValidationError for invalid version format', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						uniquename: 'Test',
						friendlyname: 'Test',
						version: 'invalid',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: null,
						description: 'Test',
						publisherid: { friendlyname: 'Publisher' }
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
				expect.stringContaining('/api/data/v9.2/solutions'),
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
		});

		it('should throw OperationCancelledException if cancelled after API call', async () => {
			// Start with token not cancelled
			let cancelled = false;
			const mockCancellationToken: ICancellationToken = {
				get isCancellationRequested() { return cancelled; },
				onCancellationRequested: jest.fn()
			};

			const mockResponse = { value: [] };

			// Simulate cancellation after API call
			mockApiService.get.mockImplementation(async () => {
				cancelled = true;
				return mockResponse;
			});

			await expect(repository.findAll('env-123', undefined, mockCancellationToken))
				.rejects.toThrow(OperationCancelledException);
		});

		it('should log and rethrow API service errors', async () => {
			const error = new Error('API request failed');
			mockApiService.get.mockRejectedValue(error);

			await expect(repository.findAll('env-123', undefined, undefined)).rejects.toThrow('API request failed');

			expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch solutions from Dataverse API', error);
		});

		it('should log successful fetch', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						uniquename: 'Test',
						friendlyname: 'Test',
						version: '1.0',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: null,
						description: 'Test',
						publisherid: { friendlyname: 'Publisher' }
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			await repository.findAll('env-123', undefined, undefined);

			expect(mockLogger.debug).toHaveBeenCalledWith('Fetching solutions from Dataverse API', { environmentId: 'env-123' });
			expect(mockLogger.debug).toHaveBeenCalledWith('Fetched solutions from Dataverse', { environmentId: 'env-123', count: 1 });
		});

		it('should use correct Dataverse endpoint with query parameters', async () => {
			const mockResponse = { value: [] };
			mockApiService.get.mockResolvedValue(mockResponse);

			await repository.findAll('env-123', undefined, undefined);


			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/.*\$expand=.*\$orderby=.*/),
				undefined
			);
		});
	});

	describe('findAllForDropdown', () => {
		it('should fetch minimal solution data for dropdown', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						friendlyname: 'Test Solution',
						uniquename: 'TestSolution',
						version: '1.0.0.0',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: null,
						description: null,
						modifiedon: '2024-01-15T10:00:00Z',
						isvisible: true,
						isapimanaged: false,
						solutiontype: null
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAllForDropdown('env-123', undefined);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/solutions?'),
				undefined
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'sol-1',
				name: 'Test Solution',
				uniqueName: 'TestSolution'
			});
		});

		it('should filter to visible solutions only', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						friendlyname: 'Visible Solution',
						uniquename: 'VisibleSolution',
						version: '1.0.0.0',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: null,
						description: null,
						modifiedon: '2024-01-15T10:00:00Z',
						isvisible: true,
						isapimanaged: false,
						solutiontype: null
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			await repository.findAllForDropdown('env-123', undefined);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/.*\$filter=isvisible%20eq%20true.*/),
				undefined
			);
		});

		it('should select only required fields', async () => {
			const mockResponse = { value: [] };
			mockApiService.get.mockResolvedValue(mockResponse);

			await repository.findAllForDropdown('env-123', undefined);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/.*\$select=solutionid,friendlyname,uniquename.*/),
				undefined
			);
		});

		it('should handle multiple solutions', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						friendlyname: 'Solution 1',
						uniquename: 'Solution1',
						version: '1.0',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: null,
						description: null,
						modifiedon: '2024-01-15T10:00:00Z',
						isvisible: true,
						isapimanaged: false,
						solutiontype: null
					},
					{
						solutionid: 'sol-2',
						friendlyname: 'Solution 2',
						uniquename: 'Solution2',
						version: '2.0',
						ismanaged: true,
						_publisherid_value: 'pub-2',
						installedon: '2024-02-01T10:00:00Z',
						description: 'Test',
						modifiedon: '2024-02-01T10:00:00Z',
						isvisible: true,
						isapimanaged: false,
						solutiontype: null
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAllForDropdown('env-123', undefined);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				id: 'sol-1',
				name: 'Solution 1',
				uniqueName: 'Solution1'
			});
			expect(result[1]).toEqual({
				id: 'sol-2',
				name: 'Solution 2',
				uniqueName: 'Solution2'
			});
		});

		it('should handle empty solution list', async () => {
			const mockResponse = { value: [] };
			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAllForDropdown('env-123', undefined);

			expect(result).toHaveLength(0);
		});

		it('should throw OperationCancelledException if cancelled before API call', async () => {
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(repository.findAllForDropdown('env-123', mockCancellationToken))
				.rejects.toThrow(OperationCancelledException);

			expect(mockApiService.get).not.toHaveBeenCalled();
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

			await expect(repository.findAllForDropdown('env-123', mockCancellationToken))
				.rejects.toThrow(OperationCancelledException);
		});

		it('should log and rethrow API service errors', async () => {
			const error = new Error('API request failed');
			mockApiService.get.mockRejectedValue(error);

			await expect(repository.findAllForDropdown('env-123', undefined))
				.rejects.toThrow('API request failed');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch solutions for dropdown from Dataverse API',
				error
			);
		});

		it('should log successful fetch', async () => {
			const mockResponse = {
				value: [
					{
						solutionid: 'sol-1',
						friendlyname: 'Test',
						uniquename: 'Test',
						version: '1.0',
						ismanaged: false,
						_publisherid_value: 'pub-1',
						installedon: null,
						description: null,
						modifiedon: '2024-01-15T10:00:00Z',
						isvisible: true,
						isapimanaged: false,
						solutiontype: null
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			await repository.findAllForDropdown('env-123', undefined);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching solutions for dropdown from Dataverse API',
				{ environmentId: 'env-123' }
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched visible solutions for dropdown',
				{ environmentId: 'env-123', count: 1 }
			);
		});

		it('should pass cancellation token to API service', async () => {
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};

			const mockResponse = { value: [] };
			mockApiService.get.mockResolvedValue(mockResponse);

			await repository.findAllForDropdown('env-123', mockCancellationToken);

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/solutions'),
				mockCancellationToken
			);
		});
	});
});
