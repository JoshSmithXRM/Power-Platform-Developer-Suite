/**
 * Runtime type guards for webview messages.
 *
 * These type guards provide runtime validation for messages received from webviews,
 * ensuring type safety at the boundary between client-side JavaScript and TypeScript.
 */

import { AuthenticationMethodType } from '../../../features/environmentSetup/domain/valueObjects/AuthenticationMethod';
import type { WebviewMessage } from '../../../shared/infrastructure/ui/types/WebviewMessage';
import { isWebviewMessage } from '../../../shared/infrastructure/ui/types/WebviewMessage';

export type { WebviewMessage };
export { isWebviewMessage };

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

/**
 * Type guard for DeleteEnvironmentMessage with command validation.
 *
 * Validates message structure for deleting a Power Platform environment.
 * This is a simple message with no required data payload.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches DeleteEnvironmentMessage structure
 */
export function isDeleteEnvironmentMessage(message: unknown): message is DeleteEnvironmentMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	return message.command === 'delete-environment';
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

/**
 * Type guard for CheckUniqueNameMessage with multi-property validation.
 *
 * Validates message structure for checking if an environment name is unique.
 * Optional currentId allows validation during editing (excludes current entry from uniqueness check).
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches CheckUniqueNameMessage structure
 */
export function isCheckUniqueNameMessage(message: unknown): message is CheckUniqueNameMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'validate-name') {
		return false;
	}

	const data = message.data;

	if (typeof data !== 'object' || data === null) {
		return false;
	}

	// Validate required property exists and has correct type before asserting
	const hasValidName =
		'name' in data &&
		typeof (data as { name: unknown }).name === 'string';

	return hasValidName;
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

	// Validate properties exist and have correct types before asserting
	const hasValidLevel =
		'level' in message &&
		typeof (message as { level: unknown }).level === 'string' &&
		['debug', 'info', 'warn', 'error'].includes((message as { level: string }).level);

	const hasValidMessage =
		'message' in message &&
		typeof (message as { message: unknown }).message === 'string';

	const hasValidComponentName =
		'componentName' in message &&
		typeof (message as { componentName: unknown }).componentName === 'string';

	const hasValidTimestamp =
		'timestamp' in message &&
		typeof (message as { timestamp: unknown }).timestamp === 'string';

	return hasValidLevel && hasValidMessage && hasValidComponentName && hasValidTimestamp;
}

export interface RefreshDataMessage {
	command: 'refresh';
}

/**
 * Type guard for RefreshDataMessage with command validation.
 *
 * Validates message structure for refreshing UI data in the webview.
 * This is a simple message with no required data payload.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches RefreshDataMessage structure
 */
export function isRefreshDataMessage(message: unknown): message is RefreshDataMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	return message.command === 'refresh';
}

export interface EnvironmentChangedMessage {
	command: 'environmentChanged';
	data: {
		environmentId: string;
	};
}

/**
 * Type guard for EnvironmentChangedMessage with multi-property validation.
 *
 * Validates message structure when Power Platform environment changes externally.
 * Used to sync webview state with extension changes to active environment.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches EnvironmentChangedMessage structure
 */
export function isEnvironmentChangedMessage(message: unknown): message is EnvironmentChangedMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'environmentChanged') {
		return false;
	}

	const data = message.data;

	if (typeof data !== 'object' || data === null) {
		return false;
	}

	// Validate property exists and has correct type before asserting
	const hasValidEnvironmentId =
		'environmentId' in data &&
		typeof (data as { environmentId: unknown }).environmentId === 'string';

	return hasValidEnvironmentId;
}

export interface EnvironmentChangeMessage {
	command: 'environmentChange';
	data: {
		environmentId: string;
	};
}

/**
 * Type guard for EnvironmentChangeMessage with multi-property validation.
 *
 * Validates message structure when user initiates environment change in webview.
 * Signals selection of a different Power Platform environment context.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches EnvironmentChangeMessage structure
 */
export function isEnvironmentChangeMessage(message: unknown): message is EnvironmentChangeMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'environmentChange') {
		return false;
	}

	const data = message.data;

	if (typeof data !== 'object' || data === null) {
		return false;
	}

	// Validate property exists and has correct type before asserting
	const hasValidEnvironmentId =
		'environmentId' in data &&
		typeof (data as { environmentId: unknown }).environmentId === 'string';

	return hasValidEnvironmentId;
}

export interface RevealSecretMessage {
	command: 'revealSecret';
	key: string;
}

/**
 * Type guard for RevealSecretMessage with multi-property validation.
 *
 * Validates message structure for revealing masked secret values in webview.
 * Used to display sensitive configuration values (passwords, API keys) on demand.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches RevealSecretMessage structure
 */
export function isRevealSecretMessage(message: unknown): message is RevealSecretMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'revealSecret') {
		return false;
	}

	// Validate property exists and has correct type before asserting
	const hasValidKey =
		'key' in message &&
		typeof (message as { key: unknown }).key === 'string';

	return hasValidKey;
}

export interface ClearEntryMessage {
	command: 'clearEntry';
	key: string;
}

/**
 * Type guard for ClearEntryMessage with multi-property validation.
 *
 * Validates message structure for clearing an entire entry from deployment settings.
 * Removes the entry and all its properties from storage.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches ClearEntryMessage structure
 */
export function isClearEntryMessage(message: unknown): message is ClearEntryMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'clearEntry') {
		return false;
	}

	// Validate property exists and has correct type before asserting
	const hasValidKey =
		'key' in message &&
		typeof (message as { key: unknown }).key === 'string';

	return hasValidKey;
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

	// Validate properties exist and have correct types before asserting
	const hasValidKey =
		'key' in message &&
		typeof (message as { key: unknown }).key === 'string';

	const hasValidPath =
		'path' in message &&
		typeof (message as { path: unknown }).path === 'string';

	return hasValidKey && hasValidPath;
}

export interface ViewImportJobMessage {
	command: 'viewImportJob';
	data: {
		importJobId: string;
	};
}

/**
 * Type guard for ViewImportJobMessage with multi-property validation.
 *
 * Validates message structure for viewing import job details in Dataverse.
 * Opens import job record in Power Apps maker portal to view import logs and results.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches ViewImportJobMessage structure
 */
export function isViewImportJobMessage(message: unknown): message is ViewImportJobMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'viewImportJob') {
		return false;
	}

	const data = message.data;

	if (typeof data !== 'object' || data === null) {
		return false;
	}

	// Validate property exists and has correct type before asserting
	const hasValidImportJobId =
		'importJobId' in data &&
		typeof (data as { importJobId: unknown }).importJobId === 'string';

	return hasValidImportJobId;
}

export interface OpenInMakerMessage {
	command: 'openInMaker';
	data: {
		solutionId: string;
	};
}

/**
 * Type guard for OpenInMakerMessage with multi-property validation.
 *
 * Validates message structure for opening a solution in Power Apps maker portal.
 * Navigates to solution editor to view or modify solution components.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches OpenInMakerMessage structure
 */
export function isOpenInMakerMessage(message: unknown): message is OpenInMakerMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'openInMaker') {
		return false;
	}

	const data = message.data;

	if (typeof data !== 'object' || data === null) {
		return false;
	}

	// Validate property exists and has correct type before asserting
	const hasValidSolutionId =
		'solutionId' in data &&
		typeof (data as { solutionId: unknown }).solutionId === 'string';

	return hasValidSolutionId;
}

export interface OpenFlowMessage {
	command: 'openFlow';
	data: {
		flowId: string;
	};
}

/**
 * Type guard for OpenFlowMessage with multi-property validation.
 *
 * Validates message structure for opening a cloud flow in Power Automate.
 * Displays flow details and execution history in Power Automate maker portal.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches OpenFlowMessage structure
 */
export function isOpenFlowMessage(message: unknown): message is OpenFlowMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'openFlow') {
		return false;
	}

	const data = message.data;

	if (typeof data !== 'object' || data === null) {
		return false;
	}

	// Validate property exists and has correct type before asserting
	const hasValidFlowId =
		'flowId' in data &&
		typeof (data as { flowId: unknown }).flowId === 'string';

	return hasValidFlowId;
}

export interface SolutionChangedMessage {
	command: 'solutionChanged';
	data: {
		solutionId: string;
	};
}

/**
 * Type guard for SolutionChangedMessage with multi-property validation.
 *
 * Validates message structure when a Power Platform solution changes externally.
 * Used to sync webview state with extension changes to active solution context.
 *
 * @param message - Unknown message from webview to validate
 * @returns True if message matches SolutionChangedMessage structure
 */
export function isSolutionChangedMessage(message: unknown): message is SolutionChangedMessage {
	if (!isWebviewMessage(message)) {
		return false;
	}

	if (message.command !== 'solutionChanged') {
		return false;
	}

	const data = message.data;

	if (typeof data !== 'object' || data === null) {
		return false;
	}

	// Validate property exists and has correct type before asserting
	const hasValidSolutionId =
		'solutionId' in data &&
		typeof (data as { solutionId: unknown }).solutionId === 'string';

	return hasValidSolutionId;
}
