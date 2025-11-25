import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import type { ILogger } from '../../../infrastructure/logging/ILogger';
import {
	DeploymentSettings,
	type EnvironmentVariableEntry,
	type ConnectionReferenceEntry
} from '../../domain/entities/DeploymentSettings';
import type { IDeploymentSettingsRepository } from '../../domain/interfaces/IDeploymentSettingsRepository';

/**
 * Type guard to validate EnvironmentVariableEntry structure.
 */
function isEnvironmentVariableEntry(obj: unknown): obj is EnvironmentVariableEntry {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'SchemaName' in obj &&
		typeof obj.SchemaName === 'string' &&
		'Value' in obj &&
		typeof obj.Value === 'string'
	);
}

/**
 * Type guard to validate ConnectionReferenceEntry structure.
 */
function isConnectionReferenceEntry(obj: unknown): obj is ConnectionReferenceEntry {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'LogicalName' in obj &&
		typeof obj.LogicalName === 'string' &&
		'ConnectionId' in obj &&
		typeof obj.ConnectionId === 'string' &&
		'ConnectorId' in obj &&
		typeof obj.ConnectorId === 'string'
	);
}

/**
 * Infrastructure implementation of IDeploymentSettingsRepository using Node.js file system.
 */
export class FileSystemDeploymentSettingsRepository implements IDeploymentSettingsRepository {
	constructor(private readonly logger: ILogger) {}

	/**
	 * Reads deployment settings from a JSON file.
	 */
	async read(filePath: string): Promise<DeploymentSettings> {
		this.logger.debug('Reading deployment settings', { filePath });

		try {
			const content = await fs.readFile(filePath, 'utf-8');
			const json: unknown = JSON.parse(content);

			// Validate structure
			if (!json || typeof json !== 'object') {
				throw new Error('Cannot read deployment settings: file root must be a JSON object');
			}

			const jsonObj = json as Record<string, unknown>;

			// Validate and parse EnvironmentVariables array
			const environmentVariables: EnvironmentVariableEntry[] = [];
			if (Array.isArray(jsonObj['EnvironmentVariables'])) {
				for (let i = 0; i < jsonObj['EnvironmentVariables'].length; i++) {
					const entry: unknown = jsonObj['EnvironmentVariables'][i];
					if (!isEnvironmentVariableEntry(entry)) {
						throw new Error(
							`Cannot read deployment settings: invalid EnvironmentVariables entry at index ${i}, expected object with SchemaName and Value properties`
						);
					}
					environmentVariables.push(entry);
				}
			}

			// Validate and parse ConnectionReferences array
			const connectionReferences: ConnectionReferenceEntry[] = [];
			if (Array.isArray(jsonObj['ConnectionReferences'])) {
				for (let i = 0; i < jsonObj['ConnectionReferences'].length; i++) {
					const entry: unknown = jsonObj['ConnectionReferences'][i];
					if (!isConnectionReferenceEntry(entry)) {
						throw new Error(
							`Cannot read deployment settings: invalid ConnectionReferences entry at index ${i}, expected object with LogicalName, ConnectionId, and ConnectorId properties`
						);
					}
					connectionReferences.push(entry);
				}
			}

			this.logger.info('Deployment settings read successfully', {
				filePath,
				envVarCount: environmentVariables.length,
				connRefCount: connectionReferences.length
			});

			return new DeploymentSettings(environmentVariables, connectionReferences);
		} catch (error) {
			this.logger.error('Failed to read deployment settings', { filePath, error });
			throw error;
		}
	}

	/**
	 * Writes deployment settings to a JSON file with 4-space indentation.
	 */
	async write(filePath: string, settings: DeploymentSettings): Promise<void> {
		this.logger.debug('Writing deployment settings', { filePath });

		try {
			const json = {
				EnvironmentVariables: settings.environmentVariables,
				ConnectionReferences: settings.connectionReferences
			};

			const content = JSON.stringify(json, null, 4);
			await fs.writeFile(filePath, content, 'utf-8');

			this.logger.info('Deployment settings written successfully', {
				filePath,
				envVarCount: settings.environmentVariables.length,
				connRefCount: settings.connectionReferences.length
			});
		} catch (error) {
			this.logger.error('Failed to write deployment settings', { filePath, error });
			throw error;
		}
	}

	/**
	 * Checks if a file exists.
	 */
	async exists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Prompts user to select or create a deployment settings file.
	 */
	async promptForFilePath(suggestedName?: string, defaultUri?: string): Promise<string | undefined> {
		this.logger.debug('Prompting for deployment settings file path', { suggestedName, defaultUri });

		const options: vscode.SaveDialogOptions = {
			filters: {
				'Deployment Settings': ['json'],
				'All Files': ['*']
			},
			saveLabel: 'Select Deployment Settings File'
		};

		const baseUri = defaultUri
			? vscode.Uri.file(defaultUri)
			: vscode.workspace.workspaceFolders?.[0]?.uri;

		if (baseUri !== undefined) {
			// If suggested name provided, append it to default URI
			if (suggestedName !== undefined) {
				options.defaultUri = vscode.Uri.joinPath(baseUri, suggestedName);
			} else {
				options.defaultUri = baseUri;
			}
		} else if (suggestedName !== undefined) {
			// No workspace open - use suggested filename without path
			// VS Code will default to a reasonable location (e.g., user's home or last used)
			options.defaultUri = vscode.Uri.file(suggestedName);
		}

		const uri = await vscode.window.showSaveDialog(options);

		if (uri) {
			this.logger.info('User selected deployment settings file', { filePath: uri.fsPath });
			return uri.fsPath;
		}

		this.logger.debug('User cancelled deployment settings file selection');
		return undefined;
	}
}
