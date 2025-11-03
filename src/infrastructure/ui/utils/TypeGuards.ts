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
 * Narrows type without assertions for safer runtime validation.
 */
export function isWebviewMessage(message: unknown): message is WebviewMessage {
	if (typeof message !== 'object' || message === null) {
		return false;
	}

	const obj = message as Record<string, unknown>;
	return 'command' in obj && typeof obj['command'] === 'string';
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
 * Type narrowing ensures value is string before array includes check.
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
 * Type guard for SaveEnvironmentMessage with multi-property validation.
 *
 * Validates message structure and all required fields for saving Power Platform
 * environment configuration. Ensures authentication method is valid enum value.
 * Optional properties (clientId, clientSecret, username, password) are validated
 * elsewhere based on authentication method selected.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches SaveEnvironmentMessage structure
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

	return isValidAuthMethod(data.authenticationMethod);
}

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
 * Type guard for TestConnectionMessage with multi-property validation.
 *
 * Validates message structure for testing Power Platform environment connection
 * before saving. Uses same validation rules as SaveEnvironmentMessage since
 * connection testing requires same credential structure.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches TestConnectionMessage structure
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

	return isValidAuthMethod(data.authenticationMethod);
}

export interface DeleteEnvironmentMessage {
	command: 'delete-environment';
	data?: never;
}

export function isDeleteEnvironmentMessage(message: unknown): message is DeleteEnvironmentMessage {
	return isWebviewMessage(message) && message.command === 'delete-environment';
}

/**
 * Discovers Power Platform Environment ID via BAP API.
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
 * Type guard for DiscoverEnvironmentIdMessage with multi-property validation.
 *
 * Validates message structure for discovering Power Platform environment GUID
 * from Dataverse URL via Business Application Platform (BAP) API. Requires
 * authentication credentials to query BAP API for environment metadata.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches DiscoverEnvironmentIdMessage structure
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

	return isValidAuthMethod(data.authenticationMethod);
}

export interface CheckUniqueNameMessage {
	command: 'validate-name';
	data: {
		name: string;
		currentId?: string;
	};
}

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

export type WebviewLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Bridges webview console logs to the extension's OutputChannel.
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
 * Type guard for WebviewLogMessage with multi-property validation.
 *
 * Validates message structure for routing webview console logs to VS Code
 * OutputChannel. Webviews run in isolated JavaScript context, so this message
 * bridge enables centralized logging through extension's logging infrastructure.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches WebviewLogMessage structure
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

export interface RefreshDataMessage {
	command: 'refresh';
}

export function isRefreshDataMessage(message: unknown): message is RefreshDataMessage {
	return isWebviewMessage(message) && message.command === 'refresh';
}

export interface EnvironmentChangedMessage {
	command: 'environmentChanged';
	data: {
		environmentId: string;
	};
}

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

export interface RevealSecretMessage {
	command: 'revealSecret';
	key: string;
}

export function isRevealSecretMessage(message: unknown): message is RevealSecretMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'revealSecret') {
		return false;
	}

	return 'key' in message && typeof (message as { key: string }).key === 'string';
}

export interface ClearEntryMessage {
	command: 'clearEntry';
	key: string;
}

export function isClearEntryMessage(message: unknown): message is ClearEntryMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'clearEntry') {
		return false;
	}

	return 'key' in message && typeof (message as { key: string }).key === 'string';
}

export interface ClearPropertyMessage {
	command: 'clearProperty';
	key: string;
	path: string;
}

/**
 * Type guard for ClearPropertyMessage with multi-property validation.
 *
 * Validates message structure for clearing nested properties in deployment settings.
 * Used for removing specific connection or environment variable values while preserving
 * the entry structure (e.g., clear connectionId but keep connectionReferenceLogicalName).
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches ClearPropertyMessage structure
 */
export function isClearPropertyMessage(message: unknown): message is ClearPropertyMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'clearProperty') {
		return false;
	}

	const msg = message as unknown as { key?: unknown; path?: unknown };
	return (
		'key' in message &&
		typeof msg.key === 'string' &&
		'path' in message &&
		typeof msg.path === 'string'
	);
}

export interface ViewImportJobMessage {
	command: 'viewImportJob';
	data: {
		importJobId: string;
	};
}

export function isViewImportJobMessage(message: unknown): message is ViewImportJobMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'viewImportJob') {
		return false;
	}

	const data = message.data;

	return (
		typeof data === 'object' &&
		data !== null &&
		'importJobId' in data &&
		typeof (data as { importJobId: string }).importJobId === 'string'
	);
}

export interface OpenInMakerMessage {
	command: 'openInMaker';
	data: {
		solutionId: string;
	};
}

export function isOpenInMakerMessage(message: unknown): message is OpenInMakerMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'openInMaker') {
		return false;
	}

	const data = message.data;

	return (
		typeof data === 'object' &&
		data !== null &&
		'solutionId' in data &&
		typeof (data as { solutionId: string }).solutionId === 'string'
	);
}

export interface OpenFlowMessage {
	command: 'openFlow';
	data: {
		flowId: string;
	};
}

export function isOpenFlowMessage(message: unknown): message is OpenFlowMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'openFlow') {
		return false;
	}

	const data = message.data;

	return (
		typeof data === 'object' &&
		data !== null &&
		'flowId' in data &&
		typeof (data as { flowId: string }).flowId === 'string'
	);
}

export interface SolutionChangedMessage {
	command: 'solutionChanged';
	data: {
		solutionId: string;
	};
}

export function isSolutionChangedMessage(message: unknown): message is SolutionChangedMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'solutionChanged') {
		return false;
	}

	const data = message.data;

	return (
		typeof data === 'object' &&
		data !== null &&
		'solutionId' in data &&
		typeof (data as { solutionId: string }).solutionId === 'string'
	);
}
