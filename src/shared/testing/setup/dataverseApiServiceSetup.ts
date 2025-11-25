import type { IDataverseApiService } from '../../infrastructure/interfaces/IDataverseApiService';

/**
 * Creates a fully mocked IDataverseApiService for testing.
 * All methods are jest.fn() and need to be configured with mockResolvedValue/mockImplementation.
 *
 * @returns A jest-mocked Dataverse API service
 *
 * @example
 * ```typescript
 * const mockApiService = createMockDataverseApiService();
 * mockApiService.get.mockResolvedValue({ value: [] });
 * const repository = new DataverseApiSolutionRepository(mockApiService, logger);
 * ```
 */
export function createMockDataverseApiService(): jest.Mocked<IDataverseApiService> {
	return {
		get: jest.fn(),
		post: jest.fn(),
		patch: jest.fn(),
		delete: jest.fn(),
		batchDelete: jest.fn()
	};
}
