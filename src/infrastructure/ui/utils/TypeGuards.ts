/**
 * Runtime type guards for webview messages.
 *
 * These type guards provide runtime validation for messages received from webviews,
 * ensuring type safety at the boundary between client-side JavaScript and TypeScript.
 */

/**
 * Base message structure from webview.
 */
export interface WebviewMessage<T = unknown> {
	command: string;
	data?: T;
}

/**
 * Type guard for basic webview messages.
 *
 * @param message - Unknown message from webview
 * @returns True if message has command string
 */
export function isWebviewMessage(message: unknown): message is WebviewMessage {
	return (
		typeof message === 'object' &&
		message !== null &&
		'command' in message &&
		typeof (message as WebviewMessage).command === 'string'
	);
}

/**
 * Valid authentication methods for environment setup.
 */
export const AUTHENTICATION_METHODS = [
	'Interactive',
	'ServicePrincipal',
	'UsernamePassword',
	'DeviceCode'
] as const;

export type AuthenticationMethod = typeof AUTHENTICATION_METHODS[number];

/**
 * Save environment message from webview.
 */
export interface SaveEnvironmentMessage {
	command: 'save';
	data: {
		name: string;
		dataverseUrl: string;
		tenantId: string;
		authenticationMethod: AuthenticationMethod;
		publicClientId: string;
		environmentId?: string;
		clientId?: string;
		clientSecret?: string;
		username?: string;
		password?: string;
	};
}

/**
 * Type guard for save environment message with enum validation.
 *
 * @param message - Unknown message from webview
 * @returns True if message is valid SaveEnvironmentMessage
 */
export function isSaveEnvironmentMessage(message: unknown): message is SaveEnvironmentMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'save') {
		return false;
	}

	const data = message.data;

	if (typeof data !== 'object' || data === null) {
		return false;
	}

	// Type-safe field validation
	const hasRequiredFields = (
		'name' in data &&
		typeof data.name === 'string' &&
		'dataverseUrl' in data &&
		typeof data.dataverseUrl === 'string' &&
		'tenantId' in data &&
		typeof data.tenantId === 'string' &&
		'authenticationMethod' in data &&
		typeof data.authenticationMethod === 'string' &&
		'publicClientId' in data &&
		typeof data.publicClientId === 'string'
	);

	if (!hasRequiredFields) {
		return false;
	}

	// Validate authenticationMethod is a valid enum value
	return AUTHENTICATION_METHODS.includes(data.authenticationMethod as AuthenticationMethod);
}

/**
 * Test connection message from webview.
 * Sends same environment data as save for connection testing.
 */
export interface TestConnectionMessage {
	command: 'test-connection';
	data: {
		name: string;
		dataverseUrl: string;
		tenantId: string;
		authenticationMethod: AuthenticationMethod;
		publicClientId: string;
		powerPlatformEnvironmentId?: string;
		clientId?: string;
		clientSecret?: string;
		username?: string;
		password?: string;
	};
}

/**
 * Type guard for test connection message with full validation.
 *
 * @param message - Unknown message from webview
 * @returns True if message is test connection command with valid data
 */
export function isTestConnectionMessage(message: unknown): message is TestConnectionMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'test-connection') {
		return false;
	}

	const data = message.data;

	if (typeof data !== 'object' || data === null) {
		return false;
	}

	// Validate required fields same as save
	if (!('name' in data && typeof data.name === 'string')) {
		return false;
	}

	if (!('dataverseUrl' in data && typeof data.dataverseUrl === 'string')) {
		return false;
	}

	if (!('tenantId' in data && typeof data.tenantId === 'string')) {
		return false;
	}

	if (!('authenticationMethod' in data && typeof data.authenticationMethod === 'string')) {
		return false;
	}

	if (!('publicClientId' in data && typeof data.publicClientId === 'string')) {
		return false;
	}

	// Validate authenticationMethod is a valid enum value
	return AUTHENTICATION_METHODS.includes(data.authenticationMethod as AuthenticationMethod);
}

/**
 * Delete environment message from webview.
 */
export interface DeleteEnvironmentMessage {
	command: 'delete-environment';
	data?: never;
}

/**
 * Type guard for delete environment message.
 *
 * @param message - Unknown message from webview
 * @returns True if message is delete-environment command
 */
export function isDeleteEnvironmentMessage(message: unknown): message is DeleteEnvironmentMessage {
	return isWebviewMessage(message) && message.command === 'delete-environment';
}

/**
 * Discover environment ID message from webview.
 * Sends environment connection data to discover the Power Platform Environment ID via BAP API.
 */
export interface DiscoverEnvironmentIdMessage {
	command: 'discover-environment-id';
	data: {
		name: string;
		dataverseUrl: string;
		tenantId: string;
		authenticationMethod: AuthenticationMethod;
		publicClientId: string;
		clientId?: string;
		clientSecret?: string;
		username?: string;
		password?: string;
	};
}

/**
 * Type guard for discover environment ID message with validation.
 *
 * @param message - Unknown message from webview
 * @returns True if message is discover-environment-id command with valid data
 */
export function isDiscoverEnvironmentIdMessage(message: unknown): message is DiscoverEnvironmentIdMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'discover-environment-id') {
		return false;
	}

	const data = message.data;

	if (typeof data !== 'object' || data === null) {
		return false;
	}

	// Validate required fields for discovery
	if (!('name' in data && typeof data.name === 'string')) {
		return false;
	}

	if (!('dataverseUrl' in data && typeof data.dataverseUrl === 'string')) {
		return false;
	}

	if (!('tenantId' in data && typeof data.tenantId === 'string')) {
		return false;
	}

	if (!('authenticationMethod' in data && typeof data.authenticationMethod === 'string')) {
		return false;
	}

	if (!('publicClientId' in data && typeof data.publicClientId === 'string')) {
		return false;
	}

	// Validate authenticationMethod is a valid enum value
	return AUTHENTICATION_METHODS.includes(data.authenticationMethod as AuthenticationMethod);
}

/**
 * Check unique name message from webview.
 */
export interface CheckUniqueNameMessage {
	command: 'validate-name';
	data: {
		name: string;
		currentId?: string;
	};
}

/**
 * Type guard for check unique name message.
 *
 * @param message - Unknown message from webview
 * @returns True if message is valid CheckUniqueNameMessage
 */
export function isCheckUniqueNameMessage(message: unknown): message is CheckUniqueNameMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'validate-name') {
		return false;
	}

	const data = message.data;

	return (
		typeof data === 'object' &&
		data !== null &&
		'name' in data &&
		typeof data.name === 'string'
	);
}
