import * as vscode from 'vscode';

import { IStorageClearer } from '../../domain/interfaces/IStorageClearer';
import { PropertyPath } from '../../domain/valueObjects/PropertyPath';
import { ClearAllResult } from '../../domain/results/ClearAllResult';
import { ProtectedKeyPattern } from '../../domain/valueObjects/ProtectedKeyPattern';

/**
 * Infrastructure implementation of storage clearing using VS Code APIs
 * Provides write access to clear VS Code's global state and secret storage
 */
export class VsCodeStorageClearer implements IStorageClearer {
	public constructor(
		private readonly globalState: vscode.Memento,
		private readonly secrets: vscode.SecretStorage
	) {}

	/**
	 * Clears a global state key by setting it to undefined
	 * @param key - Global state key to clear
	 */
	public async clearGlobalStateKey(key: string): Promise<void> {
		await this.globalState.update(key, undefined);
	}

	/**
	 * Deletes a secret from VS Code secret storage
	 * @param key - Secret storage key to delete
	 */
	public async clearSecretKey(key: string): Promise<void> {
		await this.secrets.delete(key);
	}

	/**
	 * Clears a specific property within a global state value
	 * Supports nested paths like "settings.clientId"
	 * @param key - Global state key containing the property
	 * @param path - Dot-separated path to the property to clear
	 */
	public async clearGlobalStateProperty(
		key: string,
		path: PropertyPath
	): Promise<void> {
		const currentValue = this.globalState.get(key);

		if (currentValue === undefined) {
			throw new Error(`Key not found: ${key}`);
		}

		const updatedValue = this.deletePropertyAtPath(
			currentValue,
			path.segments
		);

		await this.globalState.update(key, updatedValue);
	}

	/**
	 * Clears all non-protected keys from global state
	 * Protected keys are preserved (e.g., environment configurations)
	 * @param protectedKeys - Array of key patterns to preserve
	 * @returns Result containing counts of cleared keys and any errors
	 */
	public async clearAllNonProtected(
		protectedKeys: string[]
	): Promise<ClearAllResult> {
		let clearedGlobalKeys = 0;
		const clearedSecretKeys = 0;
		const errors: Array<{ key: string; error: string }> = [];

		// Clear global state
		const globalKeys = this.globalState.keys();
		for (const key of globalKeys) {
			if (!this.isKeyProtected(key, protectedKeys)) {
				try {
					await this.clearGlobalStateKey(key);
					clearedGlobalKeys++;
				} catch (error) {
					errors.push({
						key,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
		}

		// Note: We don't clear secrets in "clear all" because we would need to
		// re-read the environments to get the secret keys, but we may have just
		// cleared other global state. For now, secrets are only cleared when
		// the specific entry is cleared.

		return new ClearAllResult(clearedGlobalKeys, clearedSecretKeys, errors);
	}

	/**
	 * Deletes a property at the specified path in an object/array
	 * Returns a new object with the property removed (immutable)
	 */
	private deletePropertyAtPath(
		obj: unknown,
		path: readonly string[]
	): unknown {
		if (path.length === 0) {
			return undefined;
		}

		if (typeof obj !== 'object' || obj === null) {
			throw new Error('Cannot delete property from non-object');
		}

		const [first, ...rest] = path;
		// Create a mutable copy - we know obj is an object or array at this point
		const copy = Array.isArray(obj) ? (obj.slice() as unknown[]) : { ...obj as object } as Record<string, unknown>;

		if (rest.length === 0) {
			if (Array.isArray(copy)) {
				copy.splice(parseInt(first), 1);
			} else {
				delete (copy as Record<string, unknown>)[first];
			}
		} else {
			const nested = (copy as Record<string, unknown>)[first];
			(copy as Record<string, unknown>)[first] = this.deletePropertyAtPath(
				nested,
				rest
			);
		}

		return copy;
	}

	/**
	 * Checks if a key matches any protected key pattern
	 * @param key - Storage key to check
	 * @param protectedKeys - Array of patterns to check against
	 * @returns True if key is protected, false otherwise
	 */
	private isKeyProtected(key: string, protectedKeys: string[]): boolean {
		return protectedKeys.some(pattern => {
			const protectedPattern = ProtectedKeyPattern.create(pattern);
			return protectedPattern.matches(key);
		});
	}
}
