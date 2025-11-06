import type { SaveEnvironmentRequest } from '../../application/useCases/SaveEnvironmentUseCase';
import type { TestConnectionRequest } from '../../application/useCases/TestConnectionUseCase';
import type { DiscoverEnvironmentIdRequest } from '../../application/useCases/DiscoverEnvironmentIdUseCase';

/**
 * Type guard for save environment data.
 */
export function isSaveEnvironmentData(data: unknown): data is SaveEnvironmentRequest {
	return (
		typeof data === 'object' &&
		data !== null &&
		'name' in data &&
		'dataverseUrl' in data &&
		'tenantId' in data &&
		'authenticationMethod' in data &&
		'publicClientId' in data
	);
}

/**
 * Type guard for test connection data.
 */
export function isTestConnectionData(data: unknown): data is TestConnectionRequest {
	return (
		typeof data === 'object' &&
		data !== null &&
		'name' in data &&
		'dataverseUrl' in data &&
		'tenantId' in data &&
		'authenticationMethod' in data &&
		'publicClientId' in data
	);
}

/**
 * Type guard for discover environment ID data.
 */
export function isDiscoverEnvironmentIdData(data: unknown): data is DiscoverEnvironmentIdRequest {
	return (
		typeof data === 'object' &&
		data !== null &&
		'name' in data &&
		'dataverseUrl' in data &&
		'tenantId' in data &&
		'authenticationMethod' in data &&
		'publicClientId' in data
	);
}

/**
 * Type guard for validate name data.
 */
export function isValidateNameData(data: unknown): data is { name: string } {
	return (
		typeof data === 'object' &&
		data !== null &&
		'name' in data &&
		typeof (data as { name: string }).name === 'string'
	);
}
