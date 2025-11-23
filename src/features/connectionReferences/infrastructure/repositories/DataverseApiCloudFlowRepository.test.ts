import { DataverseApiCloudFlowRepository } from './DataverseApiCloudFlowRepository';
import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { CloudFlow } from '../../domain/entities/CloudFlow';

describe('DataverseApiCloudFlowRepository', () => {
	let repository: DataverseApiCloudFlowRepository;
	let mockApiService: jest.Mocked<IDataverseApiService>;
	let mockLogger: jest.Mocked<ILogger>;

	const mockClientData = JSON.stringify({
		properties: {
			connectionReferences: {
				'shared_office365': {
					connection: {
						connectionReferenceLogicalName: 'myorg_SharedOffice365'
					}
				}
			}
		}
	});

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

		repository = new DataverseApiCloudFlowRepository(mockApiService, mockLogger);
	});

	describe('findAll', () => {
		it('should fetch cloud flows and map to domain entities', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						workflowid: 'flow-1',
						name: 'My Test Flow',
						modifiedon: '2025-01-15T10:00:00Z',
						ismanaged: false,
						_createdby_value: 'user-1',
						createdby: {
							fullname: 'John Doe'
						}
					},
					{
						workflowid: 'flow-2',
						name: 'Another Flow',
						modifiedon: '2025-01-16T11:00:00Z',
						ismanaged: true,
						_createdby_value: 'user-2',
						createdby: {
							fullname: 'Jane Smith'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toBeInstanceOf(CloudFlow);
			expect(result[0]?.id).toBe('flow-1');
			expect(result[0]?.name).toBe('My Test Flow');
			expect(result[0]?.modifiedOn).toEqual(new Date('2025-01-15T10:00:00Z'));
			expect(result[0]?.isManaged).toBe(false);
			expect(result[0]?.createdBy).toBe('John Doe');
			expect(result[0]?.clientData).toBeNull();

			expect(result[1]).toBeInstanceOf(CloudFlow);
			expect(result[1]?.id).toBe('flow-2');
			expect(result[1]?.isManaged).toBe(true);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching cloud flows from Dataverse API',
				{ environmentId: 'env-123' }
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched cloud flows from Dataverse',
				{ environmentId: 'env-123', count: 2 }
			);
		});

		it('should handle empty cloud flows list', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(0);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched cloud flows from Dataverse',
				{ environmentId: 'env-123', count: 0 }
			);
		});

		it('should include clientdata when explicitly requested in select options', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						workflowid: 'flow-1',
						name: 'My Test Flow',
						modifiedon: '2025-01-15T10:00:00Z',
						ismanaged: false,
						_createdby_value: 'user-1',
						clientdata: mockClientData,
						createdby: {
							fullname: 'John Doe'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123', { select: ['workflowid', 'name', 'clientdata'] });

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.clientData).toBe(mockClientData);
			expect(result[0]?.hasClientData()).toBe(true);
		});

		it('should use default display name when name is null', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						workflowid: 'flow-1',
						name: null,
						modifiedon: '2025-01-15T10:00:00Z',
						ismanaged: false,
						_createdby_value: 'user-1',
						createdby: {
							fullname: 'John Doe'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe('Unnamed Flow');
		});

		it('should use default display name when name is empty string', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						workflowid: 'flow-1',
						name: '',
						modifiedon: '2025-01-15T10:00:00Z',
						ismanaged: false,
						_createdby_value: 'user-1',
						createdby: {
							fullname: 'John Doe'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe('Unnamed Flow');
		});

		it('should use default creator name when createdby is missing', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						workflowid: 'flow-1',
						name: 'My Test Flow',
						modifiedon: '2025-01-15T10:00:00Z',
						ismanaged: false,
						_createdby_value: 'user-1'
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.createdBy).toBe('Unknown User');
		});

		it('should use default creator name when createdby.fullname is missing', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						workflowid: 'flow-1',
						name: 'My Test Flow',
						modifiedon: '2025-01-15T10:00:00Z',
						ismanaged: false,
						_createdby_value: 'user-1',
						createdby: {}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.createdBy).toBe('Unknown User');
		});

		it('should use correct API endpoint with query parameters', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAll('env-123');

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\/api\/data\/v9\.2\/workflows\?.*\$select=.*\$filter=category%20eq%205.*\$orderby=name/),
				undefined
			);
		});

		it('should filter by category eq 5 for cloud flows only', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAll('env-123');

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\$filter=category%20eq%205/),
				undefined
			);
		});

		it('should expand createdby with fullname', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAll('env-123');

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\$expand=createdby\(\$select=fullname\)/),
				undefined
			);
		});

		it('should merge custom query options with defaults', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAll('env-123', { top: 50 });

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\$top=50/),
				undefined
			);
		});

		it('should pass cancellation token to API service', async () => {
			// Arrange
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};

			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAll('env-123', undefined, mockCancellationToken);

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/workflows'),
				mockCancellationToken
			);
		});

		it('should throw OperationCancelledException when cancelled before API call', async () => {
			// Arrange
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			// Act & Assert
			await expect(
				repository.findAll('env-123', undefined, mockCancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(mockApiService.get).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after API call', async () => {
			// Arrange
			let cancelled = false;
			const mockCancellationToken: ICancellationToken = {
				get isCancellationRequested() { return cancelled; },
				onCancellationRequested: jest.fn()
			};

			mockApiService.get.mockImplementation(async () => {
				cancelled = true;
				return { value: [] };
			});

			// Act & Assert
			await expect(
				repository.findAll('env-123', undefined, mockCancellationToken)
			).rejects.toThrow(OperationCancelledException);
		});

		it('should log and rethrow API service errors', async () => {
			// Arrange
			const error = new Error('Network error');
			mockApiService.get.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.findAll('env-123')).rejects.toThrow('Network error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch cloud flows from Dataverse API',
				error
			);
		});

		it('should handle authentication errors', async () => {
			// Arrange
			const error = new Error('401 Unauthorized');
			mockApiService.get.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.findAll('env-123')).rejects.toThrow('401 Unauthorized');

			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should handle multiple flows with mixed properties', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						workflowid: 'flow-1',
						name: 'Complete Flow',
						modifiedon: '2025-01-15T10:00:00Z',
						ismanaged: false,
						_createdby_value: 'user-1',
						createdby: {
							fullname: 'John Doe'
						}
					},
					{
						workflowid: 'flow-2',
						name: '',
						modifiedon: '2025-01-16T11:00:00Z',
						ismanaged: true,
						_createdby_value: 'user-2'
					},
					{
						workflowid: 'flow-3',
						name: 'Minimal Flow',
						modifiedon: '2025-01-17T12:00:00Z',
						ismanaged: false,
						_createdby_value: 'user-3',
						createdby: {
							fullname: 'Jane Smith'
						}
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0]?.clientData).toBeNull();
			expect(result[1]?.name).toBe('Unnamed Flow');
			expect(result[1]?.createdBy).toBe('Unknown User');
			expect(result[2]?.name).toBe('Minimal Flow');
		});

		it('should handle server errors gracefully', async () => {
			// Arrange
			const error = new Error('500 Internal Server Error');
			mockApiService.get.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.findAll('env-123')).rejects.toThrow('500 Internal Server Error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch cloud flows from Dataverse API',
				error
			);
		});

		it('should not include clientdata by default for performance', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAll('env-123');

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.not.stringMatching(/clientdata/),
				undefined
			);
		});
	});
});
