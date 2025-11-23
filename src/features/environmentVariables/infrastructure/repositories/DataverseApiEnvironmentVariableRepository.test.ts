import { DataverseApiEnvironmentVariableRepository } from './DataverseApiEnvironmentVariableRepository';
import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';

describe('DataverseApiEnvironmentVariableRepository', () => {
	let repository: DataverseApiEnvironmentVariableRepository;
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

		repository = new DataverseApiEnvironmentVariableRepository(mockApiService, mockLogger);
	});

	describe('findAllDefinitions', () => {
		it('should fetch all environment variable definitions successfully', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						environmentvariabledefinitionid: 'def-1',
						schemaname: 'myorg_TestVar',
						displayname: 'Test Variable',
						type: 100000000,
						defaultvalue: 'default-value',
						ismanaged: false,
						description: 'Test description',
						modifiedon: '2025-01-15T10:00:00Z'
					},
					{
						environmentvariabledefinitionid: 'def-2',
						schemaname: 'myorg_AnotherVar',
						displayname: 'Another Variable',
						type: 100000001,
						defaultvalue: null,
						ismanaged: true,
						description: null,
						modifiedon: '2025-01-16T11:00:00Z'
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAllDefinitions('env-123');

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				environmentvariabledefinitionid: 'def-1',
				schemaname: 'myorg_TestVar',
				displayname: 'Test Variable',
				type: 100000000,
				defaultvalue: 'default-value',
				ismanaged: false,
				description: 'Test description',
				modifiedon: '2025-01-15T10:00:00Z'
			});
			expect(result[1]).toEqual({
				environmentvariabledefinitionid: 'def-2',
				schemaname: 'myorg_AnotherVar',
				displayname: 'Another Variable',
				type: 100000001,
				defaultvalue: null,
				ismanaged: true,
				description: null,
				modifiedon: '2025-01-16T11:00:00Z'
			});
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching environment variable definitions from Dataverse API',
				{ environmentId: 'env-123' }
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched environment variable definitions from Dataverse',
				{ environmentId: 'env-123', count: 2 }
			);
		});

		it('should handle empty definitions list', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			const result = await repository.findAllDefinitions('env-123');

			// Assert
			expect(result).toHaveLength(0);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched environment variable definitions from Dataverse',
				{ environmentId: 'env-123', count: 0 }
			);
		});

		it('should use correct API endpoint with query parameters', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAllDefinitions('env-123');

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\/api\/data\/v9\.2\/environmentvariabledefinitions\?.*\$select=.*\$orderby=schemaname/),
				undefined
			);
		});

		it('should merge custom query options with defaults', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAllDefinitions('env-123', { top: 10 });

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\$top=10/),
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
			await repository.findAllDefinitions('env-123', undefined, mockCancellationToken);

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/environmentvariabledefinitions'),
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
				repository.findAllDefinitions('env-123', undefined, mockCancellationToken)
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
				repository.findAllDefinitions('env-123', undefined, mockCancellationToken)
			).rejects.toThrow(OperationCancelledException);
		});

		it('should log and rethrow API service errors', async () => {
			// Arrange
			const error = new Error('Network error');
			mockApiService.get.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.findAllDefinitions('env-123')).rejects.toThrow('Network error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch environment variable definitions from Dataverse API',
				error
			);
		});

		it('should handle authentication errors', async () => {
			// Arrange
			const error = new Error('401 Unauthorized');
			mockApiService.get.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.findAllDefinitions('env-123')).rejects.toThrow('401 Unauthorized');

			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	describe('findAllValues', () => {
		it('should fetch all environment variable values successfully', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						environmentvariablevalueid: 'val-1',
						_environmentvariabledefinitionid_value: 'def-1',
						value: 'production-value'
					},
					{
						environmentvariablevalueid: 'val-2',
						_environmentvariabledefinitionid_value: 'def-2',
						value: 'test-value'
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAllValues('env-123');

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				environmentvariablevalueid: 'val-1',
				_environmentvariabledefinitionid_value: 'def-1',
				value: 'production-value'
			});
			expect(result[1]).toEqual({
				environmentvariablevalueid: 'val-2',
				_environmentvariabledefinitionid_value: 'def-2',
				value: 'test-value'
			});
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching environment variable values from Dataverse API',
				{ environmentId: 'env-123' }
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched environment variable values from Dataverse',
				{ environmentId: 'env-123', count: 2 }
			);
		});

		it('should handle empty values list', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			const result = await repository.findAllValues('env-123');

			// Assert
			expect(result).toHaveLength(0);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched environment variable values from Dataverse',
				{ environmentId: 'env-123', count: 0 }
			);
		});

		it('should use correct API endpoint with query parameters', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAllValues('env-123');

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\/api\/data\/v9\.2\/environmentvariablevalues\?.*\$select=/),
				undefined
			);
		});

		it('should merge custom query options with defaults', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.findAllValues('env-123', { filter: 'value ne null' });

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\$filter=value%20ne%20null/),
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
			await repository.findAllValues('env-123', undefined, mockCancellationToken);

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/environmentvariablevalues'),
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
				repository.findAllValues('env-123', undefined, mockCancellationToken)
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
				repository.findAllValues('env-123', undefined, mockCancellationToken)
			).rejects.toThrow(OperationCancelledException);
		});

		it('should log and rethrow API service errors', async () => {
			// Arrange
			const error = new Error('Network error');
			mockApiService.get.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.findAllValues('env-123')).rejects.toThrow('Network error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch environment variable values from Dataverse API',
				error
			);
		});

		it('should handle null values in response', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						environmentvariablevalueid: 'val-1',
						_environmentvariabledefinitionid_value: 'def-1',
						value: null
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.findAllValues('env-123');

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.value).toBeNull();
		});
	});
});
