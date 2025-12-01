import { DataverseApiSolutionComponentRepository } from './DataverseApiSolutionComponentRepository';
import { IDataverseApiService } from '../interfaces/IDataverseApiService';
import { ILogger } from '../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../domain/errors/OperationCancelledException';
import { createMockDataverseApiService, createMockLogger } from '../../testing';

describe('DataverseApiSolutionComponentRepository', () => {
	let repository: DataverseApiSolutionComponentRepository;
	let mockApiService: jest.Mocked<IDataverseApiService>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockApiService = createMockDataverseApiService();
		mockLogger = createMockLogger();
		repository = new DataverseApiSolutionComponentRepository(mockApiService, mockLogger);
	});

	describe('getObjectTypeCode', () => {
		it('should fetch ObjectTypeCode for entity logical name', async () => {
			// Arrange
			const mockResponse = {
				value: [
					{
						ObjectTypeCode: 10051,
						LogicalName: 'connectionreference'
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			// Act
			const result = await repository.getObjectTypeCode('env-123', 'connectionreference');

			// Assert
			expect(result).toBe(10051);
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\/api\/data\/v9\.2\/EntityDefinitions\?.*\$filter=LogicalName%20eq%20'connectionreference'/),
				undefined
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching ObjectTypeCode from Dataverse API',
				{ environmentId: 'env-123', entityLogicalName: 'connectionreference' }
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched ObjectTypeCode',
				{ environmentId: 'env-123', entityLogicalName: 'connectionreference', objectTypeCode: 10051 }
			);
		});

		it('should return null when entity logical name not found', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			const result = await repository.getObjectTypeCode('env-123', 'nonexistent');

			// Assert
			expect(result).toBeNull();
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'No entity definition found for logical name',
				{ entityLogicalName: 'nonexistent' }
			);
		});

		it('should return null when response value array is empty after query', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			const result = await repository.getObjectTypeCode('env-123', 'test');

			// Assert
			expect(result).toBeNull();
		});

		it('should use correct API endpoint with filter', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.getObjectTypeCode('env-123', 'account');

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\/api\/data\/v9\.2\/EntityDefinitions\?.*\$select=ObjectTypeCode,LogicalName.*\$filter=LogicalName%20eq%20'account'/),
				undefined
			);
		});

		it('should merge custom query options with defaults', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			await repository.getObjectTypeCode('env-123', 'account', { top: 1 });

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\$top=1/),
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
			await repository.getObjectTypeCode('env-123', 'account', undefined, mockCancellationToken);

			// Assert
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/EntityDefinitions'),
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
				repository.getObjectTypeCode('env-123', 'account', undefined, mockCancellationToken)
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
				repository.getObjectTypeCode('env-123', 'account', undefined, mockCancellationToken)
			).rejects.toThrow(OperationCancelledException);
		});

		it('should log and rethrow API service errors', async () => {
			// Arrange
			const error = new Error('Network error');
			mockApiService.get.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.getObjectTypeCode('env-123', 'account')).rejects.toThrow('Network error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch ObjectTypeCode from Dataverse API',
				error
			);
		});

		it('should handle authentication errors', async () => {
			// Arrange
			const error = new Error('401 Unauthorized');
			mockApiService.get.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.getObjectTypeCode('env-123', 'account')).rejects.toThrow('401 Unauthorized');

			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should fetch ObjectTypeCode for different entity types', async () => {
			// Arrange
			const testCases = [
				{ logicalName: 'account', objectTypeCode: 1 },
				{ logicalName: 'contact', objectTypeCode: 2 },
				{ logicalName: 'connectionreference', objectTypeCode: 10051 },
				{ logicalName: 'workflow', objectTypeCode: 4703 }
			];

			for (const testCase of testCases) {
				mockApiService.get.mockResolvedValue({
					value: [{ ObjectTypeCode: testCase.objectTypeCode, LogicalName: testCase.logicalName }]
				});

				// Act
				const result = await repository.getObjectTypeCode('env-123', testCase.logicalName);

				// Assert
				expect(result).toBe(testCase.objectTypeCode);
			}
		});
	});

	describe('findComponentIdsBySolution', () => {
		it('should fetch component IDs for solution and entity type', async () => {
			// Arrange
			const mockEntityDefResponse = {
				value: [{ ObjectTypeCode: 10051, LogicalName: 'connectionreference' }]
			};

			const mockSolutionComponentsResponse = {
				value: [
					{
						solutioncomponentid: 'comp-1',
						objectid: 'ref-1',
						componenttype: 10051,
						_solutionid_value: 'sol-123'
					},
					{
						solutioncomponentid: 'comp-2',
						objectid: 'ref-2',
						componenttype: 10051,
						_solutionid_value: 'sol-123'
					}
				]
			};

			mockApiService.get
				.mockResolvedValueOnce(mockEntityDefResponse)
				.mockResolvedValueOnce(mockSolutionComponentsResponse);

			// Act
			const result = await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'connectionreference'
			);

			// Assert
			expect(result).toEqual(['ref-1', 'ref-2']);
			expect(mockApiService.get).toHaveBeenCalledTimes(2);
			expect(mockApiService.get).toHaveBeenNthCalledWith(
				1,
				'env-123',
				expect.stringMatching(/\/api\/data\/v9\.2\/EntityDefinitions\?.*\$filter=LogicalName%20eq%20'connectionreference'/),
				undefined
			);
			expect(mockApiService.get).toHaveBeenNthCalledWith(
				2,
				'env-123',
				expect.stringMatching(/\/api\/data\/v9\.2\/solutioncomponents\?.*\$filter=_solutionid_value%20eq%20sol-123%20and%20componenttype%20eq%2010051/),
				undefined
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched solution components from Dataverse',
				{ environmentId: 'env-123', solutionId: 'sol-123', entityLogicalName: 'connectionreference', componentType: 10051, count: 2, pages: 1 }
			);
		});

		it('should return empty array when ObjectTypeCode is null', async () => {
			// Arrange
			mockApiService.get.mockResolvedValue({ value: [] });

			// Act
			const result = await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'nonexistent'
			);

			// Assert
			expect(result).toEqual([]);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Cannot fetch solution components - no ObjectTypeCode',
				{ entityLogicalName: 'nonexistent' }
			);
			expect(mockApiService.get).toHaveBeenCalledTimes(1);
		});

		it('should handle empty solution components list', async () => {
			// Arrange
			const mockEntityDefResponse = {
				value: [{ ObjectTypeCode: 10051, LogicalName: 'connectionreference' }]
			};

			mockApiService.get
				.mockResolvedValueOnce(mockEntityDefResponse)
				.mockResolvedValueOnce({ value: [] });

			// Act
			const result = await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'connectionreference'
			);

			// Assert
			expect(result).toEqual([]);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetched solution components from Dataverse',
				{ environmentId: 'env-123', solutionId: 'sol-123', entityLogicalName: 'connectionreference', componentType: 10051, count: 0, pages: 1 }
			);
		});

		it('should use correct solution component filter', async () => {
			// Arrange
			const mockEntityDefResponse = {
				value: [{ ObjectTypeCode: 10051, LogicalName: 'connectionreference' }]
			};

			mockApiService.get
				.mockResolvedValueOnce(mockEntityDefResponse)
				.mockResolvedValueOnce({ value: [] });

			// Act
			await repository.findComponentIdsBySolution(
				'env-123',
				'sol-456',
				'connectionreference'
			);

			// Assert
			expect(mockApiService.get).toHaveBeenNthCalledWith(
				2,
				'env-123',
				expect.stringMatching(/\$filter=_solutionid_value%20eq%20sol-456%20and%20componenttype%20eq%2010051/),
				undefined
			);
		});

		it('should merge custom query options with defaults', async () => {
			// Arrange
			const mockEntityDefResponse = {
				value: [{ ObjectTypeCode: 10051, LogicalName: 'connectionreference' }]
			};

			mockApiService.get
				.mockResolvedValueOnce(mockEntityDefResponse)
				.mockResolvedValueOnce({ value: [] });

			// Act
			await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'connectionreference',
				{ top: 100 }
			);

			// Assert
			expect(mockApiService.get).toHaveBeenNthCalledWith(
				2,
				'env-123',
				expect.stringMatching(/\$top=100/),
				undefined
			);
		});

		it('should pass cancellation token to both API calls', async () => {
			// Arrange
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};

			const mockEntityDefResponse = {
				value: [{ ObjectTypeCode: 10051, LogicalName: 'connectionreference' }]
			};

			mockApiService.get
				.mockResolvedValueOnce(mockEntityDefResponse)
				.mockResolvedValueOnce({ value: [] });

			// Act
			await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'connectionreference',
				undefined,
				mockCancellationToken
			);

			// Assert
			expect(mockApiService.get).toHaveBeenNthCalledWith(
				1,
				'env-123',
				expect.stringContaining('/api/data/v9.2/EntityDefinitions'),
				mockCancellationToken
			);
			expect(mockApiService.get).toHaveBeenNthCalledWith(
				2,
				'env-123',
				expect.stringContaining('/api/data/v9.2/solutioncomponents'),
				mockCancellationToken
			);
		});

		it('should throw OperationCancelledException when cancelled before first API call', async () => {
			// Arrange
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			// Act & Assert
			await expect(
				repository.findComponentIdsBySolution(
					'env-123',
					'sol-123',
					'connectionreference',
					undefined,
					mockCancellationToken
				)
			).rejects.toThrow(OperationCancelledException);

			expect(mockApiService.get).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after first API call', async () => {
			// Arrange
			let cancelled = false;
			const mockCancellationToken: ICancellationToken = {
				get isCancellationRequested() { return cancelled; },
				onCancellationRequested: jest.fn()
			};

			const mockEntityDefResponse = {
				value: [{ ObjectTypeCode: 10051, LogicalName: 'connectionreference' }]
			};

			mockApiService.get.mockImplementation(async () => {
				cancelled = true;
				return mockEntityDefResponse;
			});

			// Act & Assert
			await expect(
				repository.findComponentIdsBySolution(
					'env-123',
					'sol-123',
					'connectionreference',
					undefined,
					mockCancellationToken
				)
			).rejects.toThrow(OperationCancelledException);

			expect(mockApiService.get).toHaveBeenCalledTimes(1);
		});

		it('should throw OperationCancelledException when cancelled before second API call', async () => {
			// Arrange
			let cancelled = false;
			const mockCancellationToken: ICancellationToken = {
				get isCancellationRequested() { return cancelled; },
				onCancellationRequested: jest.fn()
			};

			const mockEntityDefResponse = {
				value: [{ ObjectTypeCode: 10051, LogicalName: 'connectionreference' }]
			};

			mockApiService.get
				.mockResolvedValueOnce(mockEntityDefResponse)
				.mockImplementation(async () => {
					cancelled = true;
					return { value: [] };
				});

			// Act & Assert
			await expect(
				repository.findComponentIdsBySolution(
					'env-123',
					'sol-123',
					'connectionreference',
					undefined,
					mockCancellationToken
				)
			).rejects.toThrow(OperationCancelledException);
		});

		it('should log and rethrow API service errors from getObjectTypeCode', async () => {
			// Arrange
			const error = new Error('Network error');
			mockApiService.get.mockRejectedValue(error);

			// Act & Assert
			await expect(
				repository.findComponentIdsBySolution('env-123', 'sol-123', 'connectionreference')
			).rejects.toThrow('Network error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch ObjectTypeCode from Dataverse API',
				error
			);
		});

		it('should log and rethrow API service errors from solution components query', async () => {
			// Arrange
			const mockEntityDefResponse = {
				value: [{ ObjectTypeCode: 10051, LogicalName: 'connectionreference' }]
			};

			const error = new Error('Network error');

			mockApiService.get
				.mockResolvedValueOnce(mockEntityDefResponse)
				.mockRejectedValueOnce(error);

			// Act & Assert
			await expect(
				repository.findComponentIdsBySolution('env-123', 'sol-123', 'connectionreference')
			).rejects.toThrow('Network error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch solution components from Dataverse API',
				error
			);
		});

		it('should handle multiple component IDs correctly', async () => {
			// Arrange
			const mockEntityDefResponse = {
				value: [{ ObjectTypeCode: 10051, LogicalName: 'connectionreference' }]
			};

			const mockSolutionComponentsResponse = {
				value: [
					{
						solutioncomponentid: 'comp-1',
						objectid: 'ref-1',
						componenttype: 10051,
						_solutionid_value: 'sol-123'
					},
					{
						solutioncomponentid: 'comp-2',
						objectid: 'ref-2',
						componenttype: 10051,
						_solutionid_value: 'sol-123'
					},
					{
						solutioncomponentid: 'comp-3',
						objectid: 'ref-3',
						componenttype: 10051,
						_solutionid_value: 'sol-123'
					}
				]
			};

			mockApiService.get
				.mockResolvedValueOnce(mockEntityDefResponse)
				.mockResolvedValueOnce(mockSolutionComponentsResponse);

			// Act
			const result = await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'connectionreference'
			);

			// Assert
			expect(result).toEqual(['ref-1', 'ref-2', 'ref-3']);
			expect(result).toHaveLength(3);
		});

		it('should log debug messages for both API calls', async () => {
			// Arrange
			const mockEntityDefResponse = {
				value: [{ ObjectTypeCode: 10051, LogicalName: 'connectionreference' }]
			};

			mockApiService.get
				.mockResolvedValueOnce(mockEntityDefResponse)
				.mockResolvedValueOnce({ value: [] });

			// Act
			await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'connectionreference'
			);

			// Assert
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching solution component IDs from Dataverse API',
				{ environmentId: 'env-123', solutionId: 'sol-123', entityLogicalName: 'connectionreference' }
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching ObjectTypeCode from Dataverse API',
				{ environmentId: 'env-123', entityLogicalName: 'connectionreference' }
			);
		});

		it('should use standard component type 61 for webresource without querying EntityDefinitions', async () => {
			// Arrange
			const mockSolutionComponentsResponse = {
				value: [
					{
						solutioncomponentid: 'comp-1',
						objectid: 'wr-1',
						componenttype: 61,
						_solutionid_value: 'sol-123'
					},
					{
						solutioncomponentid: 'comp-2',
						objectid: 'wr-2',
						componenttype: 61,
						_solutionid_value: 'sol-123'
					}
				]
			};

			// Only one API call for solutioncomponents (no EntityDefinitions call)
			mockApiService.get.mockResolvedValueOnce(mockSolutionComponentsResponse);

			// Act
			const result = await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'webresource'
			);

			// Assert
			expect(result).toEqual(['wr-1', 'wr-2']);
			expect(mockApiService.get).toHaveBeenCalledTimes(1);
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/\/api\/data\/v9\.2\/solutioncomponents\?.*componenttype%20eq%2061/),
				undefined
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Using standard component type code',
				{ entityLogicalName: 'webresource', componentType: 61 }
			);
		});

		it('should use standard component type 29 for workflow without querying EntityDefinitions', async () => {
			// Arrange
			mockApiService.get.mockResolvedValueOnce({ value: [] });

			// Act
			await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'workflow'
			);

			// Assert - only solutioncomponents call, no EntityDefinitions
			expect(mockApiService.get).toHaveBeenCalledTimes(1);
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringMatching(/componenttype%20eq%2029/),
				undefined
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Using standard component type code',
				{ entityLogicalName: 'workflow', componentType: 29 }
			);
		});

		it('should follow @odata.nextLink to fetch ALL component IDs (pagination)', async () => {
			// Arrange - simulate Dataverse returning paginated results
			// This is the bug: Dataverse defaults to 5000 records per page
			// Without pagination, we only get the first page
			const page1Response = {
				value: [
					{ solutioncomponentid: 'comp-1', objectid: 'wr-1', componenttype: 61, _solutionid_value: 'sol-123' },
					{ solutioncomponentid: 'comp-2', objectid: 'wr-2', componenttype: 61, _solutionid_value: 'sol-123' },
					{ solutioncomponentid: 'comp-3', objectid: 'wr-3', componenttype: 61, _solutionid_value: 'sol-123' }
				],
				'@odata.nextLink': 'https://org.crm.dynamics.com/api/data/v9.2/solutioncomponents?$skiptoken=page2'
			};

			const page2Response = {
				value: [
					{ solutioncomponentid: 'comp-4', objectid: 'wr-4', componenttype: 61, _solutionid_value: 'sol-123' },
					{ solutioncomponentid: 'comp-5', objectid: 'wr-5', componenttype: 61, _solutionid_value: 'sol-123' }
				],
				'@odata.nextLink': 'https://org.crm.dynamics.com/api/data/v9.2/solutioncomponents?$skiptoken=page3'
			};

			const page3Response = {
				value: [
					{ solutioncomponentid: 'comp-6', objectid: 'wr-6', componenttype: 61, _solutionid_value: 'sol-123' }
				]
				// No nextLink = last page
			};

			mockApiService.get
				.mockResolvedValueOnce(page1Response)
				.mockResolvedValueOnce(page2Response)
				.mockResolvedValueOnce(page3Response);

			// Act
			const result = await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'webresource'
			);

			// Assert - should have ALL 6 component IDs from ALL 3 pages
			expect(result).toEqual(['wr-1', 'wr-2', 'wr-3', 'wr-4', 'wr-5', 'wr-6']);
			expect(result).toHaveLength(6);

			// Should have made 3 API calls (one per page)
			expect(mockApiService.get).toHaveBeenCalledTimes(3);
		});

		it('should handle single page response (no nextLink)', async () => {
			// Arrange - response without nextLink means single page
			const singlePageResponse = {
				value: [
					{ solutioncomponentid: 'comp-1', objectid: 'wr-1', componenttype: 61, _solutionid_value: 'sol-123' },
					{ solutioncomponentid: 'comp-2', objectid: 'wr-2', componenttype: 61, _solutionid_value: 'sol-123' }
				]
				// No @odata.nextLink
			};

			mockApiService.get.mockResolvedValueOnce(singlePageResponse);

			// Act
			const result = await repository.findComponentIdsBySolution(
				'env-123',
				'sol-123',
				'webresource'
			);

			// Assert
			expect(result).toEqual(['wr-1', 'wr-2']);
			expect(mockApiService.get).toHaveBeenCalledTimes(1);
		});
	});
});
