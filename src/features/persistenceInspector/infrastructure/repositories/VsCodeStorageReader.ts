import * as vscode from 'vscode';

import { IStorageReader } from '../../domain/interfaces/IStorageReader';
import { EnvironmentConnectionDto } from '../../../environmentSetup/infrastructure/dtos/EnvironmentConnectionDto';

/**
 * Infrastructure implementation of storage reading using VS Code APIs
 * Provides read access to VS Code's global state and secret storage
 */
export class VsCodeStorageReader implements IStorageReader {
	private static readonly ENVIRONMENTS_KEY = 'power-platform-dev-suite-environments';
	private static readonly SECRET_PREFIX_CLIENT = 'power-platform-dev-suite-secret-';
	private static readonly SECRET_PREFIX_PASSWORD = 'power-platform-dev-suite-password-';

	public constructor(
		private readonly globalState: vscode.Memento,
		private readonly secrets: vscode.SecretStorage
	) {}

	/**
	 * Reads all entries from VS Code global state storage
	 * @returns Map of all key-value pairs in global state
	 */
	public async readAllGlobalState(): Promise<Map<string, unknown>> {
		const entries = new Map<string, unknown>();
		const keys = this.globalState.keys();

		for (const key of keys) {
			const value = this.globalState.get(key);
			entries.set(key, value);
		}

		return entries;
	}

	/**
	 * Reads all secret storage keys by inspecting environment configurations
	 * Derives secret keys from clientId and username patterns in stored environments
	 * @returns Array of secret storage keys
	 */
	public async readAllSecretKeys(): Promise<string[]> {
		const secretKeys: string[] = [];

		// Read environments from globalState
		const environments = this.globalState.get<EnvironmentConnectionDto[]>(
			VsCodeStorageReader.ENVIRONMENTS_KEY,
			[]
		);

		// Extract secret keys based on clientId and username patterns
		for (const env of environments) {
			if (env.settings.clientId) {
				secretKeys.push(`${VsCodeStorageReader.SECRET_PREFIX_CLIENT}${env.settings.clientId}`);
			}
			if (env.settings.username) {
				secretKeys.push(`${VsCodeStorageReader.SECRET_PREFIX_PASSWORD}${env.settings.username}`);
			}
		}

		return secretKeys;
	}

	/**
	 * Reveals the actual value of a secret from VS Code secret storage
	 * WARNING: This exposes sensitive data - use only for debugging/inspection
	 * @param key - Secret storage key to reveal
	 * @returns Secret value, or undefined if not found
	 */
	public async revealSecret(key: string): Promise<string | undefined> {
		return await this.secrets.get(key);
	}
}
