import type { IPowerAppsAdminApiService } from '../../infrastructure/interfaces/IPowerAppsAdminApiService';

/**
 * Creates a fully mocked IPowerAppsAdminApiService for testing.
 * All methods are jest.fn() and need to be configured with mockResolvedValue/mockImplementation.
 *
 * @returns A jest-mocked Power Apps Admin API service
 *
 * @example
 * ```typescript
 * const mockApiService = createMockPowerAppsAdminApiService();
 * mockApiService.get.mockResolvedValue({ value: [] });
 * const repository = new PowerPlatformApiConnectionRepository(mockApiService, logger);
 * ```
 */
export function createMockPowerAppsAdminApiService(): jest.Mocked<IPowerAppsAdminApiService> {
	return {
		get: jest.fn()
	};
}
