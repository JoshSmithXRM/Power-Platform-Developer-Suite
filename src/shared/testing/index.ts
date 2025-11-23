/**
 * Shared testing utilities for test data factories and assertions.
 * Centralizes common test utilities to reduce duplication across test files.
 */

// Assertions
export { assertDefined } from './assertions/assertDefined';

// Factories
export {
	createTestEnvironment,
	createTestServicePrincipalEnvironment,
	createTestUsernamePasswordEnvironment
} from './factories/EnvironmentFactory';

export {
	createTestPluginTrace,
	createTestFailedPluginTrace,
	createTestAsyncPluginTrace,
	createTestRelatedPluginTrace,
	createTestNestedPluginTrace
} from './factories/PluginTraceFactory';

export {
	createTestSolution,
	createTestDefaultSolution,
	createTestManagedSolution
} from './factories/SolutionFactory';

export {
	createTestConnectionReference,
	createTestConnectionReferenceWithoutConnection,
	createTestManagedConnectionReference
} from './factories/ConnectionReferenceFactory';

export {
	createTestEnvironmentVariable,
	createTestEnvironmentVariableWithOverride,
	createTestSecretEnvironmentVariable,
	createTestJsonEnvironmentVariable,
	createTestManagedEnvironmentVariable
} from './factories/EnvironmentVariableFactory';
