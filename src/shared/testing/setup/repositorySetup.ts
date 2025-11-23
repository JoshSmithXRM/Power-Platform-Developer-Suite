import type { IEnvironmentRepository } from '../../../features/environmentSetup/domain/interfaces/IEnvironmentRepository';
import type { ISolutionRepository } from '../../../features/solutionExplorer/domain/interfaces/ISolutionRepository';
import type { IPluginTraceRepository } from '../../../features/pluginTraceViewer/domain/repositories/IPluginTraceRepository';
import type { ISolutionComponentRepository } from '../../domain/interfaces/ISolutionComponentRepository';
import type { IDomainEventPublisher } from '../../../features/environmentSetup/application/interfaces/IDomainEventPublisher';

/**
 * Creates a fully mocked IEnvironmentRepository for testing.
 * All methods are jest.fn() and need to be configured with mockResolvedValue/mockImplementation.
 *
 * @returns A jest-mocked environment repository
 *
 * @example
 * ```typescript
 * const mockRepository = createMockEnvironmentRepository();
 * mockRepository.getById.mockResolvedValue(testEnvironment);
 * ```
 */
export function createMockEnvironmentRepository(): jest.Mocked<IEnvironmentRepository> {
	return {
		getAll: jest.fn(),
		getById: jest.fn(),
		getByName: jest.fn(),
		getActive: jest.fn(),
		save: jest.fn(),
		delete: jest.fn(),
		isNameUnique: jest.fn(),
		getClientSecret: jest.fn(),
		getPassword: jest.fn(),
		deleteSecrets: jest.fn()
	};
}

/**
 * Creates a fully mocked ISolutionRepository for testing.
 *
 * @returns A jest-mocked solution repository
 *
 * @example
 * ```typescript
 * const mockRepository = createMockSolutionRepository();
 * mockRepository.findAll.mockResolvedValue([solution1, solution2]);
 * ```
 */
export function createMockSolutionRepository(): jest.Mocked<ISolutionRepository> {
	return {
		findAll: jest.fn(),
		findAllForDropdown: jest.fn()
	};
}

/**
 * Creates a fully mocked IPluginTraceRepository for testing.
 *
 * @returns A jest-mocked plugin trace repository
 *
 * @example
 * ```typescript
 * const mockRepository = createMockPluginTraceRepository();
 * mockRepository.getTraces.mockResolvedValue([trace1, trace2]);
 * ```
 */
export function createMockPluginTraceRepository(): jest.Mocked<IPluginTraceRepository> {
	return {
		getTraces: jest.fn(),
		getTraceById: jest.fn(),
		deleteTrace: jest.fn(),
		deleteTraces: jest.fn(),
		deleteAllTraces: jest.fn(),
		deleteOldTraces: jest.fn(),
		getTraceLevel: jest.fn(),
		setTraceLevel: jest.fn()
	};
}

/**
 * Creates a fully mocked ISolutionComponentRepository for testing.
 *
 * @returns A jest-mocked solution component repository
 *
 * @example
 * ```typescript
 * const mockRepository = createMockSolutionComponentRepository();
 * mockRepository.findComponentIdsBySolution.mockResolvedValue(['id1', 'id2']);
 * ```
 */
export function createMockSolutionComponentRepository(): jest.Mocked<ISolutionComponentRepository> {
	return {
		findComponentIdsBySolution: jest.fn(),
		getObjectTypeCode: jest.fn()
	};
}

/**
 * Creates a fully mocked IDomainEventPublisher for testing.
 *
 * @returns A jest-mocked domain event publisher
 *
 * @example
 * ```typescript
 * const mockPublisher = createMockDomainEventPublisher();
 * expect(mockPublisher.publish).toHaveBeenCalledWith(
 *   expect.objectContaining({ type: 'EnvironmentCreated' })
 * );
 * ```
 */
export function createMockDomainEventPublisher(): jest.Mocked<IDomainEventPublisher> {
	return {
		publish: jest.fn(),
		subscribe: jest.fn()
	};
}
