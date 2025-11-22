import { DataverseApiConnectionReferenceRepository } from './DataverseApiConnectionReferenceRepository';
import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ConnectionReference } from '../../domain/entities/ConnectionReference';

describe('DataverseApiConnectionReferenceRepository', () => {
	let repository: DataverseApiConnectionReferenceRepository;
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

		repository = new DataverseApiConnectionReferenceRepository(mockApiService, mockLogger);
	});

	describe('findAll', () => {
		it('should fetch connection references and map to domain entities', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						connectionreferenceid: 'ref-1',
						connectionreferencelogicalname: 'myorg_SharedOffice365',
						connectionreferencedisplayname: 'Office 365 Connection',
						connectorid: 'connector-1',
						connectionid: 'connection-1',
						ismanaged: false,
						modifiedon: '2025-01-15T10:00:00Z'
					},
					{
						connectionreferenceid: 'ref-2',
						connectionreferencelogicalname: 'myorg_SharedSharePoint',
						connectionreferencedisplayname: 'SharePoint Connection',
						connectorid: 'connector-2',
						connectionid: null,
						ismanaged: true,
						modifiedon: '2025-01-16T11:00:00Z'
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toBeInstanceOf(ConnectionReference);
			expect(result[0]?.id).toBe('ref-1');
			expect(result[0]?.connectionReferenceLogicalName).toBe('myorg_SharedOffice365');
			expect(result[0]?.displayName).toBe('Office 365 Connection');
			expect(result[0]?.connectorId).toBe('connector-1');
			expect(result[0]?.connectionId).toBe('connection-1');
			expect(result[0]?.isManaged).toBe(false);
			expect(result[0]?.modifiedOn).toEqual(new Date('2025-01-15T10:00:00Z'));

			expect(result[1]).toBeInstanceOf(ConnectionReference);
			expect(result[1]?.id).toBe('ref-2');
			expect(result[1]?.connectionId).toBeNull();
			expect(result[1]?.isManaged).toBe(true);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching connection references from Dataverse API',
				{ environmentId: 'env-123' }
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched connection references from Dataverse',
				{ environmentId: 'env-123', count: 2 }
			);
		});

		it('should handle empty connection references list', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(0);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched connection references from Dataverse',
				{ environmentId: 'env-123', count: 0 }
			);
		});

		it('should use default display name when connectionreferencedisplayname is null', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						connectionreferenceid: 'ref-1',
						connectionreferencelogicalname: 'myorg_SharedOffice365',
						connectionreferencedisplayname: null,
						connectorid: null,
						connectionid: null,
						ismanaged: false,
						modifiedon: '2025-01-15T10:00:00Z'
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.displayName).toBe('Unnamed Connection Reference');
		});

		it('should use default display name when connectionreferencedisplayname is empty string', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						connectionreferenceid: 'ref-1',
						connectionreferencelogicalname: 'myorg_SharedOffice365',
						connectionreferencedisplayname: '',
						connectorid: null,
						connectionid: null,
						ismanaged: false,
						modifiedon: '2025-01-15T10:00:00Z'
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.displayName).toBe('Unnamed Connection Reference');
		});

		it('should use correct API endpoint with query parameters', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAll('env-123');

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\/api\/data\/v9\.2\/connectionreferences\?.*\$select=.*\$orderby=connectionreferencelogicalname/),
				undefined
			);
		});

		it('should merge custom query options with defaults', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAll('env-123', { top: 20 });

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\$top=20/),
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
				expect.any(String),
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
				'Failed to fetch connection references from Dataverse API',
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

		it('should handle multiple connection references with mixed states', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						connectionreferenceid: 'ref-1',
						connectionreferencelogicalname: 'connected_ref',
						connectionreferencedisplayname: 'Connected Reference',
						connectorid: 'conn-1',
						connectionid: 'connection-1',
						ismanaged: false,
						modifiedon: '2025-01-15T10:00:00Z'
					},
					{
						connectionreferenceid: 'ref-2',
						connectionreferencelogicalname: 'unconnected_ref',
						connectionreferencedisplayname: 'Unconnected Reference',
						connectorid: null,
						connectionid: null,
						ismanaged: false,
						modifiedon: '2025-01-16T11:00:00Z'
					},
					{
						connectionreferenceid: 'ref-3',
						connectionreferencelogicalname: 'managed_ref',
						connectionreferencedisplayname: 'Managed Reference',
						connectorid: 'conn-2',
						connectionid: 'connection-2',
						ismanaged: true,
						modifiedon: '2025-01-17T12:00:00Z'
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAll('env-123');

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0]?.hasConnection()).toBe(true);
			expect(result[1]?.hasConnection()).toBe(false);
			expect(result[2]?.isManaged).toBe(true);
		});

		it('should handle server errors gracefully', async () => {
			// Arrange
			const error = new Error('500 Internal Server Error');
			mockApiService.get.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.findAll('env-123')).rejects.toThrow('500 Internal Server Error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch connection references from Dataverse API',
				error
			);
		});
	});
});
