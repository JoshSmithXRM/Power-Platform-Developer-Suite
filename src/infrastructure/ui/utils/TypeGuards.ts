/**
 * Runtime type guards for webview messages.
 *
 * These type guards provide runtime validation for messages received from webviews,
 * ensuring type safety at the boundary between client-side JavaScript and TypeScript.
 */

import { AuthenticationMethodType } from '../../../features/environmentSetup/domain/valueObjects/AuthenticationMethod';

/**
 * Base message structure from webview.
 */
export interface WebviewMessage<T = unknown> {
	command: string;
	data?: T;
}

/**
 * Type guard for basic webview messages.
 * Narrows type without assertions for safer runtime validation.
 *
 * @param message - Unknown message from webview
 * @returns True if message has command string
 */
export function isWebviewMessage(message: unknown): message is WebviewMessage {
	if (typeof message !== 'object' || message === null) {
		return false;
	}

	const obj = message as Record<string, unknown>;
	return 'command' in obj && typeof obj.command === 'string';
}

/**
 * Valid authentication methods for environment setup.
 * Uses the domain enum values for single source of truth.
 */
export const AUTHENTICATION_METHODS: readonly AuthenticationMethodType[] = [
	AuthenticationMethodType.Interactive,
	AuthenticationMethodType.ServicePrincipal,
	AuthenticationMethodType.UsernamePassword,
	AuthenticationMethodType.DeviceCode
] as const;

/**
 * Type guard for authentication method validation.
 * Validates that a value is a valid AuthenticationMethodType enum member.
 * Type narrowing ensures value is string before array includes check.
 *
 * @param value - Unknown value to validate
 * @returns True if value is valid AuthenticationMethodType
 */
function isValidAuthMethod(value: unknown): value is AuthenticationMethodType {
	if (typeof value !== 'string') {
		return false;
	}
	// Value is narrowed to string, safe to use in includes
	return AUTHENTICATION_METHODS.includes(value as AuthenticationMethodType);
}

/**
 * Save environment message from webview.
 */
export interface SaveEnvironmentMessage {
	command: 'save-environment';
	data: {
		name: string;
		dataverseUrl: string;
		tenantId: string;
		authenticationMethod: AuthenticationMethodType;
		publicClientId: string;
		powerPlatformEnvironmentId?: string;
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

	if (message.command !== 'save-environment') {
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

	// Validate authenticationMethod is a valid enum value using type guard
	return isValidAuthMethod(data.authenticationMethod);
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
		authenticationMethod: AuthenticationMethodType;
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

	// Validate authenticationMethod is a valid enum value using type guard
	return isValidAuthMethod(data.authenticationMethod);
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
		authenticationMethod: AuthenticationMethodType;
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

	// Validate authenticationMethod is a valid enum value using type guard
	return isValidAuthMethod(data.authenticationMethod);
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

/**
 * Valid log levels for webview logging.
 */
export type WebviewLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Webview log message sent from webview to extension host.
 * Used to bridge webview console logs to the extension's OutputChannel.
 */
export interface WebviewLogMessage {
	command: 'webview-log';
	level: WebviewLogLevel;
	message: string;
	componentName: string;
	data?: unknown;
	timestamp: string;
}

/**
 * Type guard for webview log message.
 *
 * @param message - Unknown message from webview
 * @returns True if message is valid WebviewLogMessage
 */
export function isWebviewLogMessage(message: unknown): message is WebviewLogMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'webview-log') {
		return false;
	}

	const msg = message as WebviewLogMessage;

	return (
		typeof msg.level === 'string' &&
		['debug', 'info', 'warn', 'error'].includes(msg.level) &&
		typeof msg.message === 'string' &&
		typeof msg.componentName === 'string' &&
		typeof msg.timestamp === 'string'
	);
}

/**
 * Refresh data message from DataTable webviews.
 */
export interface RefreshDataMessage {
	command: 'refresh';
}

/**
 * Type guard for refresh data message.
 *
 * @param message - Unknown message from webview
 * @returns True if message is refresh command
 */
export function isRefreshDataMessage(message: unknown): message is RefreshDataMessage {
	return isWebviewMessage(message) && message.command === 'refresh';
}

/**
 * Environment changed message from DataTable webviews.
 */
export interface EnvironmentChangedMessage {
	command: 'environmentChanged';
	data: {
		environmentId: string;
	};
}

/**
 * Type guard for environment changed message.
 *
 * @param message - Unknown message from webview
 * @returns True if message is environmentChanged command with valid environmentId
 */
export function isEnvironmentChangedMessage(message: unknown): message is EnvironmentChangedMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'environmentChanged') {
		return false;
	}

	const data = message.data;

	return (
		typeof data === 'object' &&
		data !== null &&
		'environmentId' in data &&
		typeof (data as { environmentId: string }).environmentId === 'string'
	);
}
