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
				throw new Error('Invalid deployment settings file: root must be an object');
			}

			const jsonObj = json as Record<string, unknown>;
			const environmentVariables = (Array.isArray(jsonObj.EnvironmentVariables)
				? jsonObj.EnvironmentVariables
				: []) as EnvironmentVariableEntry[];
			const connectionReferences = (Array.isArray(jsonObj.ConnectionReferences)
				? jsonObj.ConnectionReferences
				: []) as ConnectionReferenceEntry[];

			this.logger.info('Deployment settings read successfully', {
				filePath,
				envVarCount: environmentVariables.length,
				connRefCount: connectionReferences.length
			});

			return new DeploymentSettings(environmentVariables, connectionReferences);
		} catch (error) {
			this.logger.error(`Failed to read deployment settings from ${filePath}`, error);
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
			this.logger.error(`Failed to write deployment settings to ${filePath}`, error);
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
			defaultUri: defaultUri
				? vscode.Uri.file(defaultUri)
				: vscode.workspace.workspaceFolders?.[0]?.uri,
			filters: {
				'Deployment Settings': ['json'],
				'All Files': ['*']
			},
			saveLabel: 'Select Deployment Settings File'
		};

		// If suggested name provided, append it to default URI
		if (suggestedName && options.defaultUri) {
			options.defaultUri = vscode.Uri.joinPath(options.defaultUri, suggestedName);
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
