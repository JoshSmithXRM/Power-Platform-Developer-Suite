/**
 * Shared test setup utilities for common beforeEach patterns.
 * Reduces duplication by providing reusable mock setup functions.
 */

// Logger setup
export { createMockLogger, createNullLogger } from './loggerSetup';

// Cancellation token setup
export {
	createMockCancellationToken,
	createDynamicCancellationToken
} from './cancellationTokenSetup';

// Dataverse API service setup
export { createMockDataverseApiService } from './dataverseApiServiceSetup';

// Repository setup
export {
	createMockEnvironmentRepository,
	createMockSolutionRepository,
	createMockPluginTraceRepository,
	createMockSolutionComponentRepository,
	createMockDomainEventPublisher
} from './repositorySetup';
